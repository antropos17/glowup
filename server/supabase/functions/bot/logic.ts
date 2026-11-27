// Telegram bot logic: wishlist with creator codes (v1) plus the v2 menu, reviews, vote link, channel post queue
// and broadcasts. Pure module with no Deno or Supabase imports, so Vitest can run it; index.ts wires it to
// Deno.serve, the database and the Telegram Bot API.
//
// The bot answers through the webhook response (Telegram runs the method named in the reply body).
// v1 never needs the bot token. v2 needs it (answerCallbackQuery, posting to the group and the channel,
// broadcasts) and is switched on only when index.ts passes a Telegram client, that is, when the token is set.
// Without the token the bot behaves exactly like v1.

/** A creator code as stored in `author_codes`. */
export interface AuthorCode { code: string; title: string; ownerId: number | null }
/** A creator code with the number of wishlist people who came by it. */
export interface CodeCount extends AuthorCode { count: number }

export interface BotStore {
  findCode(code: string): Promise<AuthorCode | null>;
  /** Adds the person if absent. An existing row is never changed: the first code stays. Returns true when added. */
  addToWishlist(userId: number, code: string | null): Promise<boolean>;
  /** Every code with its count, including codes nobody came by. */
  codeCounts(): Promise<CodeCount[]>;
  wishlistTotal(): Promise<number>;
  /** Returns false when the code already exists. */
  addCode(code: AuthorCode): Promise<boolean>;
}

export interface BotEnv {
  /** value Telegram sends in X-Telegram-Bot-Api-Secret-Token, set with setWebhook */
  secret: string;
  miniAppUrl: string;
  adminIds: number[];
  /** bot username without @, for the ready link in the /addcode answer */
  botUsername?: string;
}

export interface WebhookResult { status: number; body?: Record<string, unknown> }

/** Player-facing texts of the bot. */
export const BOT_TEXT = {
  welcome: 'Привет! Это «Краш за 30 дней»: игра о том, как за месяц привести героя в форму и понравиться человеку.\n\nПервый день уже можно сыграть. Ты в списке: когда выйдет продолжение, бот напишет.',
  play: 'Играть день 1',
  other: 'Кнопка ниже открывает первый день игры.',
  statsNone: 'Статистика доступна только авторам кодов.',
  statsOwner: (rows: CodeCount[]) =>
    ['Пришли по твоим кодам:', ...rows.map((r) => `${r.code} (${r.title}): ${r.count}`), `Всего: ${sum(rows)}`].join('\n'),
  statsAdmin: (rows: CodeCount[], total: number) =>
    [
      'Коды авторов:',
      ...(rows.length ? rows.map((r) => `${r.code} (${r.title}): ${r.count}`) : ['пока нет']),
      `По кодам: ${sum(rows)}`,
      `Всего в списке: ${total}`,
    ].join('\n'),
  adminOnly: 'Эта команда только для администратора.',
  addUsage: 'Формат: /addcode <код> <название> [id владельца]\nКод: латиница, цифры, _ и -, до 32 символов.',
  addBadCode: 'Код может состоять из латиницы, цифр, _ и -, до 32 символов.',
  addExists: (code: string) => `Код ${code} уже есть.`,
  added: (c: AuthorCode, bot = '<бот>') => `Код ${c.code} добавлен: ${c.title}${c.ownerId ? `, владелец ${c.ownerId}` : ''}.\nСсылка: t.me/${bot}?start=${c.code}`,
};

const sum = (rows: CodeCount[]) => rows.reduce((n, r) => n + r.count, 0);
/** Telegram allows A-Z, a-z, 0-9, _ and - in a start parameter; codes are kept in lower case */
const CODE = /^[a-z0-9_-]{1,32}$/;
const normCode = (raw: string) => raw.toLowerCase();

/** Parses the comma-separated ADMIN_TG_IDS value. */
export function parseAdminIds(raw: string | undefined): number[] {
  return (raw ?? '').split(',').map((s) => s.trim()).filter((s) => /^\d+$/.test(s)).map(Number);
}

/** Constant-time comparison; an empty expected value never matches. */
export function sameSecret(a: string, b: string) {
  if (!a || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

interface User { id?: number; first_name?: string }
interface Message {
  chat?: { id?: number; type?: string }; from?: User; text?: string;
  caption?: string; photo?: { file_id?: string }[];
}
interface CallbackQuery { id?: string; from?: User; message?: { chat?: { id?: number; type?: string } }; data?: string }

/** Handles one webhook call. `secretHeader` is the X-Telegram-Bot-Api-Secret-Token header value. */
export async function handleWebhook(
  secretHeader: string | null, update: unknown, store: BotStore, env: BotEnv, ext?: BotExt,
): Promise<WebhookResult> {
  if (!sameSecret(env.secret, secretHeader ?? '')) return { status: 401 };
  const v2: V2 | null = ext?.tg ? { store: ext.store, tg: ext.tg, now: ext.now ?? (() => new Date()) } : null;

  const cq = (update as { callback_query?: CallbackQuery } | null)?.callback_query;
  if (cq) return v2 ? handleCallback(cq, env, v2) : { status: 200 };

  const msg = (update as { message?: Message } | null)?.message;
  const chatId = msg?.chat?.id, userId = msg?.from?.id;
  // only private chats with a text message (v2 also takes pictures); anything else is acknowledged and ignored
  if (msg?.chat?.type !== 'private' || typeof chatId !== 'number' || typeof userId !== 'number') return { status: 200 };
  if (typeof msg.text !== 'string' && !v2) return { status: 200 };

  const raw = msg.text ?? msg.caption ?? '';
  const [head = '', ...args] = raw.trim().split(/\s+/);
  const command = head.startsWith('/') ? head.slice(1).split('@')[0].toLowerCase() : '';
  const isAdmin = env.adminIds.includes(userId);
  const reply = (text: string, withPlay = false): WebhookResult => ({
    status: 200,
    body: {
      method: 'sendMessage', chat_id: chatId, text,
      ...(withPlay ? { reply_markup: v2 ? menuKeyboard(env) : { inline_keyboard: [[{ text: BOT_TEXT.play, web_app: { url: env.miniAppUrl } }]] } } : {}),
    },
  });

  // any command cancels an unfinished review
  if (v2 && command) await v2.store.clearSession(userId);

  if (command === 'start') {
    const raw = args[0] ? normCode(args[0]) : '';
    const known = CODE.test(raw) ? await store.findCode(raw) : null;
    await store.addToWishlist(userId, known?.code ?? null);
    // writing /start again means the person is reachable: a broadcast may try them again
    if (v2) await v2.store.unblock(userId);
    return reply(BOT_TEXT.welcome, true);
  }

  if (command === 'stats') {
    const rows = await store.codeCounts();
    if (isAdmin) return reply(BOT_TEXT.statsAdmin(rows, await store.wishlistTotal()));
    const own = rows.filter((r) => r.ownerId === userId);
    return reply(own.length ? BOT_TEXT.statsOwner(own) : BOT_TEXT.statsNone);
  }

  if (command === 'addcode') {
    if (!isAdmin) return reply(BOT_TEXT.adminOnly);
    // the owner id is the last argument when it is a number and a title stands before it
    const ownerId = args.length >= 3 && /^\d+$/.test(args.at(-1)!) ? Number(args.at(-1)) : null;
    const titleParts = args.slice(1, ownerId === null ? undefined : -1);
    if (!args[0] || !titleParts.length) return reply(BOT_TEXT.addUsage);
    const code = normCode(args[0]);
    if (!CODE.test(code)) return reply(BOT_TEXT.addBadCode);
    const entry: AuthorCode = { code, title: titleParts.join(' ').slice(0, 100), ownerId };
    return reply((await store.addCode(entry)) ? BOT_TEXT.added(entry, env.botUsername || undefined) : BOT_TEXT.addExists(code));
  }

  if (ext && ADMIN_COMMANDS.has(command)) {
    if (!isAdmin) return reply(BOT_TEXT.adminOnly);
    if (!v2) return reply(V2_TEXT.noToken);
    return adminCommand(command, raw, msg, chatId, userId, env, v2);
  }

  if (v2 && !command) {
    const s = await liveSession(v2, userId);
    if (s?.state === 'await_content') return takeContent(msg, chatId, userId, s, v2);
    if (s?.state === 'await_visibility') return say(chatId, V2_TEXT.reviewPickButton);
  }

  return v2 ? reply(V2_TEXT.menuHint, true) : reply(BOT_TEXT.other, true);
}

// ====================================================================================================
// v2: menu, reviews, vote link, channel posts, broadcasts
// ====================================================================================================

/** Telegram places of the project (checked through the Bot API on 2026-11-27). */
export const TG = {
  /** community group @glowup30chat, a forum */
  group: -1006027132870,
  reviewThread: 3,
  bugThread: 4,
  channel: '@glowupchallenge30',
  channelUrl: 'https://t.me/glowupchallenge30',
  chatUrl: 'https://t.me/glowup30chat',
};

export const LIMITS = {
  /** reviews and bug reports one person may deliver in 24 hours */
  reviewsPerDay: 3,
  /** an unfinished review older than this is dropped */
  sessionTtlMs: 30 * 60_000,
  /** text of a review; a picture caption must also fit Telegram's 1024 with the header */
  reviewText: 3000,
  reviewCaption: 900,
  broadcastText: 4000,
  /** at most 25 messages a second: Telegram's free limit is about 30 (core.telegram.org/bots/faq) */
  sendIntervalMs: 40,
  /** a scheduler run starts no new send after this; Free-plan Edge Functions stop at 150 s wall clock */
  tickBudgetMs: 40_000,
  /** a run holds the broadcast this long; a crashed run is resumed by a later one after it */
  broadcastLeaseMs: 120_000,
  recipientPage: 100,
  /** progress is saved after this many recipients: a crash repeats at most this many messages */
  saveEvery: 20,
  postsPerTick: 10,
};

export type ReviewKind = 'review' | 'bug';
export type Visibility = 'public' | 'authors';
/** An unfinished review in `bot_sessions`. */
export interface Session { state: 'await_content' | 'await_visibility'; kind: ReviewKind; text: string; photo: string | null; updatedAt: Date }
export interface Review { userId: number; kind: ReviewKind; visibility: Visibility; text: string; photo: string | null }
export interface ChannelPost { id: number; text: string; photo: string | null; publishAt: Date }
export type PostResult = { status: 'sent'; messageId: number | null } | { status: 'failed'; error: string };
export interface Broadcast {
  id: number; adminId: number; text: string; status: 'draft' | 'running' | 'done' | 'cancelled';
  /** everyone up to this Telegram id has been handled */
  cursor: number; sent: number; blocked: number; failed: number; leaseUntil: Date | null;
}

export interface ExtStore {
  getSession(userId: number): Promise<Session | null>;
  setSession(userId: number, s: Session): Promise<void>;
  clearSession(userId: number): Promise<void>;
  reviewsSince(userId: number, since: Date): Promise<number>;
  addReview(r: Review): Promise<void>;
  /** When the person joined the wishlist, null when absent. */
  wishlistSince(userId: number): Promise<Date | null>;
  unblock(userId: number): Promise<void>;
  getSetting(key: string): Promise<string | null>;
  /** null removes the key */
  setSetting(key: string, value: string | null): Promise<void>;
  addPost(p: Omit<ChannelPost, 'id'>): Promise<number>;
  /** queued posts, earliest first */
  queuedPosts(limit: number): Promise<ChannelPost[]>;
  /** Removes a queued post; false when it is absent or already sent. */
  deletePost(id: number): Promise<boolean>;
  /** queued posts with publishAt <= now, earliest first */
  duePosts(now: Date, limit: number): Promise<ChannelPost[]>;
  /** queued → sending; false when another run took it */
  claimPost(id: number): Promise<boolean>;
  finishPost(id: number, r: PostResult): Promise<void>;
  /** wishlist people not marked as blocked */
  recipientCount(): Promise<number>;
  createBroadcast(adminId: number, text: string): Promise<number>;
  getBroadcast(id: number): Promise<Broadcast | null>;
  runningBroadcast(): Promise<Broadcast | null>;
  /** draft → running; false when it is not a draft or another broadcast is running */
  startBroadcast(id: number): Promise<boolean>;
  /** draft → cancelled; false when it is not a draft */
  cancelBroadcast(id: number): Promise<boolean>;
  /** The running broadcast if no other run holds it; sets its lease. */
  claimBroadcast(now: Date, leaseUntil: Date): Promise<Broadcast | null>;
  /** recipient ids greater than `cursor`, ascending, blocked people skipped */
  recipientsAfter(cursor: number, limit: number): Promise<number[]>;
  markBlocked(userId: number): Promise<void>;
  /** writes status, cursor, counts and lease */
  saveBroadcast(b: Broadcast): Promise<void>;
}

/** Result of a Bot API call. `retryAfter` is in seconds (HTTP 429). */
export interface TgResult { ok: boolean; status: number; retryAfter?: number; description?: string; messageId?: number }
/** Bot API client. Never throws: a network error comes back as `{ ok: false, status: 0 }`. */
export interface TelegramApi { call(method: string, params: Record<string, unknown>): Promise<TgResult> }

export interface BotExt {
  store: ExtStore;
  /** null when TELEGRAM_BOT_TOKEN is missing: the bot then behaves exactly like v1 */
  tg: TelegramApi | null;
  now?: () => Date;
}
interface V2 { store: ExtStore; tg: TelegramApi; now: () => Date }

/** Labels of the v2 buttons. */
export const MENU = {
  play: '▶️ Играть день 1',
  vote: '🗳 Голосование',
  review: '✍️ Отзыв или баг',
  links: '💬 Канал и чат',
  reward: '🎁 Моя награда',
  kindReview: '💬 Отзыв',
  kindBug: '🐞 Баг',
  publish: '📢 Опубликовать в чате',
  authors: '🔒 Только авторам',
  cancel: 'Отмена',
  channel: '📣 Канал',
  chat: '💬 Чат',
  voteGo: '🗳 Голосовать',
  bcPlay: '▶️ Играть',
  bcSend: 'Отправить',
};

const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
/** Times the admins type and read are Baku time, UTC+4 without daylight saving. */
const BAKU_MS = 4 * 3600_000;
const baku = (d: Date) => new Date(d.getTime() + BAKU_MS);
const pad = (n: number) => String(n).padStart(2, '0');
export const fmtDay = (d: Date) => { const b = baku(d); return `${b.getUTCDate()} ${MONTHS[b.getUTCMonth()]} ${b.getUTCFullYear()}`; };
export const fmtTime = (d: Date) => {
  const b = baku(d);
  return `${pad(b.getUTCDate())}.${pad(b.getUTCMonth() + 1)}.${b.getUTCFullYear()} ${pad(b.getUTCHours())}:${pad(b.getUTCMinutes())}`;
};

/** Texts of v2. Player-facing ones first, then the admin ones. */
export const V2_TEXT = {
  menuHint: 'Вот что тут есть:',
  links: 'Новости и посты — в канале. Поговорить с игроками и авторами — в чате.',
  voteOn: 'Сейчас в канале идёт голосование: от него зависит, что авторы напишут дальше.',
  voteOff: 'Сейчас голосования нет. Новое объявим в канале.',
  rewardIn: (since: Date) =>
    `Ты в списке с ${fmtDay(since)}. Когда выйдет продолжение, бот напишет сюда.\n\n` +
    'Для тех, кто в списке, в игре запланирована награда: косметика для героя, то есть что-то для внешнего вида. ' +
    'Она не даёт монет и энергии и не влияет на шанс понравиться. Дату пока не называем.',
  rewardOut: 'Тебя пока нет в списке. Нажми /start, и бот запомнит тебя.',
  reviewAsk: 'Что хочешь прислать?',
  reviewWrite: (k: ReviewKind) => k === 'bug'
    ? 'Опиши баг одним сообщением: что делал и что пошло не так. Можно прислать скриншот с подписью.'
    : 'Напиши отзыв одним сообщением. Можно прислать скриншот с подписью.',
  reviewNeedContent: 'Пришли текст или картинку одним сообщением.',
  reviewTooLong: `Слишком длинно: до ${LIMITS.reviewText} знаков в тексте и до ${LIMITS.reviewCaption} в подписи к картинке.`,
  reviewChoose: (k: ReviewKind) =>
    'Как отправить?\n\n' +
    `«Опубликовать в чате»: сообщение появится в чате @glowup30chat, в теме «${k === 'bug' ? 'Баги' : 'Отзывы'}». ` +
    'Его увидят все участники чата. Из твоего профиля будет видно только имя, без ника.\n\n' +
    '«Только авторам»: прочитают только авторы игры, в чат ничего не попадёт.',
  reviewPickButton: 'Выбери кнопку под сообщением выше: «Опубликовать в чате», «Только авторам» или «Отмена».',
  reviewDonePublic: 'Спасибо! Сообщение опубликовано в чате.',
  reviewDoneAuthors: 'Спасибо! Авторы прочитают.',
  reviewCancelled: 'Отменено, ничего не отправлено.',
  reviewExpired: 'Эта форма уже закрыта. Нажми «Отзыв или баг» ещё раз.',
  reviewFailed: 'Не получилось отправить. Попробуй ещё раз чуть позже.',
  reviewCap: `На сегодня всё: можно присылать до ${LIMITS.reviewsPerDay} отзывов или багов в сутки. Спасибо, что пишешь!`,
  /** first line of a delivered review; the name is the Telegram first name only */
  header: (k: ReviewKind, v: Visibility, name: string, userId: number) =>
    v === 'public'
      ? `${k === 'bug' ? '🐞 Баг' : '💬 Отзыв'} · ${name}`
      : `🔒 ${k === 'bug' ? 'Баг' : 'Отзыв'}, только для авторов · ${name} · id ${userId}`,
  noName: 'без имени',

  // admin
  noToken: 'Эта функция включится, когда в секретах функции появится TELEGRAM_BOT_TOKEN (docs/TELEGRAM.md, раздел «Deploy v2»).',
  voteUsage: 'Формат: /setvote <ссылка на пост с опросом, https://t.me/…> или /setvote off',
  voteSet: (url: string) => `Голосование: кнопка ведёт на ${url}`,
  voteCleared: 'Голосование выключено.',
  postUsage: 'Формат: /post ГГГГ-ММ-ДД ЧЧ:ММ текст (время Баку). Можно прислать картинку с такой подписью.',
  postBadTime: 'Не понял дату или время. Пример: /post 2026-12-01 10:00 текст',
  postTooLong: 'Слишком длинно: до 4096 знаков, с картинкой до 1024.',
  postQueued: (id: number, at: Date) => `Пост №${id} в очереди на ${fmtTime(at)} (Баку).`,
  postsNone: 'Очередь постов пуста.',
  postsList: (rows: ChannelPost[]) =>
    ['Ближайшие посты (время Баку):', ...rows.map((p) =>
      `№${p.id} · ${fmtTime(p.publishAt)}${p.photo ? ' · картинка' : ''} · ${preview(p.text)}`)].join('\n'),
  delUsage: 'Формат: /delpost <номер>',
  deleted: (id: number) => `Пост №${id} убран из очереди.`,
  notDeleted: (id: number) => `Поста №${id} нет в очереди: его нет или он уже вышел.`,
  bcUsage: 'Формат: /broadcast текст. Сначала покажу, как это увидят люди, и спрошу подтверждение.',
  bcTooLong: `Слишком длинно: до ${LIMITS.broadcastText} знаков.`,
  bcBusy: 'Уже идёт другая рассылка. Вторую можно запустить, когда первая закончится.',
  bcPreview: (n: number) => `Сообщение выше — предпросмотр. Получателей: ${n} (без тех, кто заблокировал бота). Отправить?`,
  bcStale: 'Эта рассылка уже запущена или отменена.',
  bcStarted: (id: number, n: number) =>
    `Рассылка №${id} запущена: ${n} получателей, до 25 сообщений в секунду. Первые уйдут в течение минуты, итог пришлю сюда.`,
  bcCancelled: 'Рассылка отменена, никто ничего не получил.',
  bcDone: (b: Broadcast) => `Рассылка №${b.id} готова. Отправлено: ${b.sent}, заблокировали бота: ${b.blocked}, ошибки: ${b.failed}.`,
};

const preview = (t: string) => { const s = t.replace(/\s+/g, ' ').trim(); return s.length > 40 ? `${s.slice(0, 40)}…` : s || '(без текста)'; };
const ADMIN_COMMANDS = new Set(['setvote', 'post', 'posts', 'delpost', 'broadcast']);
const VOTE_URL = /^https:\/\/t\.me\/\S+$/;

type Markup = { inline_keyboard: Record<string, unknown>[][] };
const say = (chatId: number, text: string, markup?: Markup): WebhookResult =>
  ({ status: 200, body: { method: 'sendMessage', chat_id: chatId, text, ...(markup ? { reply_markup: markup } : {}) } });
const cb = (text: string, data: string) => ({ text, callback_data: data });
const link = (text: string, url: string) => ({ text, url });

export function menuKeyboard(env: BotEnv): Markup {
  return {
    inline_keyboard: [
      [{ text: MENU.play, web_app: { url: env.miniAppUrl } }],
      [cb(MENU.vote, 'm:vote'), cb(MENU.review, 'm:review')],
      [cb(MENU.links, 'm:links'), cb(MENU.reward, 'm:reward')],
    ],
  };
}
const linksKeyboard: Markup = { inline_keyboard: [[link(MENU.channel, TG.channelUrl), link(MENU.chat, TG.chatUrl)]] };
const broadcastKeyboard = (env: BotEnv): Markup => ({ inline_keyboard: [[{ text: MENU.bcPlay, web_app: { url: env.miniAppUrl } }]] });

async function liveSession(v2: V2, userId: number): Promise<Session | null> {
  const s = await v2.store.getSession(userId);
  if (s && v2.now().getTime() - s.updatedAt.getTime() > LIMITS.sessionTtlMs) {
    await v2.store.clearSession(userId);
    return null;
  }
  return s;
}

const capReached = async (v2: V2, userId: number) =>
  (await v2.store.reviewsSince(userId, new Date(v2.now().getTime() - 24 * 3600_000))) >= LIMITS.reviewsPerDay;

const displayName = (u?: User) => (u?.first_name ?? '').replace(/\s+/g, ' ').trim().slice(0, 64) || V2_TEXT.noName;

/** Sends a text, or a picture with the text as its caption. */
function sendContent(tg: TelegramApi, chatId: number | string, text: string, photo: string | null, threadId?: number) {
  const thread = threadId === undefined ? {} : { message_thread_id: threadId };
  return photo
    ? tg.call('sendPhoto', { chat_id: chatId, photo, ...(text ? { caption: text } : {}), ...thread })
    : tg.call('sendMessage', { chat_id: chatId, text, ...thread });
}

async function takeContent(msg: Message, chatId: number, userId: number, s: Session, v2: V2): Promise<WebhookResult> {
  const photo = msg.photo?.at(-1)?.file_id ?? null;
  const text = ((photo ? msg.caption : msg.text) ?? '').trim();
  if (!photo && !text) return say(chatId, V2_TEXT.reviewNeedContent);
  if (text.length > (photo ? LIMITS.reviewCaption : LIMITS.reviewText)) return say(chatId, V2_TEXT.reviewTooLong);
  await v2.store.setSession(userId, { state: 'await_visibility', kind: s.kind, text, photo, updatedAt: v2.now() });
  return say(chatId, V2_TEXT.reviewChoose(s.kind), {
    inline_keyboard: [[cb(MENU.publish, 'r:pub')], [cb(MENU.authors, 'r:auth')], [cb(MENU.cancel, 'r:cancel')]],
  });
}

/** Delivers a finished review. True when it reached the group, or at least one admin. */
async function deliver(v2: V2, env: BotEnv, s: Session, visibility: Visibility, userId: number, from?: User) {
  const head = V2_TEXT.header(s.kind, visibility, displayName(from), userId);
  const text = s.text ? `${head}\n\n${s.text}` : head;
  if (visibility === 'public') {
    return (await sendContent(v2.tg, TG.group, text, s.photo, s.kind === 'bug' ? TG.bugThread : TG.reviewThread)).ok;
  }
  let any = false;
  for (const id of env.adminIds) if ((await sendContent(v2.tg, id, text, s.photo)).ok) any = true;
  return any;
}

async function handleCallback(cq: CallbackQuery, env: BotEnv, v2: V2): Promise<WebhookResult> {
  // stop the button's loading spinner; the answer itself comes as a new message
  if (typeof cq.id === 'string') await v2.tg.call('answerCallbackQuery', { callback_query_id: cq.id });
  const userId = cq.from?.id, chatId = cq.message?.chat?.id;
  if (cq.message?.chat?.type !== 'private' || typeof userId !== 'number' || typeof chatId !== 'number') return { status: 200 };
  const [area, action, arg] = (cq.data ?? '').split(':');
  const { store } = v2;

  if (area === 'm') {
    // a menu button cancels an unfinished review
    await store.clearSession(userId);
    if (action === 'vote') {
      const url = await store.getSetting('vote_url');
      return url
        ? say(chatId, V2_TEXT.voteOn, { inline_keyboard: [[link(MENU.voteGo, url)]] })
        : say(chatId, V2_TEXT.voteOff, { inline_keyboard: [[link(MENU.channel, TG.channelUrl)]] });
    }
    if (action === 'review') {
      if (await capReached(v2, userId)) return say(chatId, V2_TEXT.reviewCap);
      return say(chatId, V2_TEXT.reviewAsk, { inline_keyboard: [[cb(MENU.kindReview, 'r:review'), cb(MENU.kindBug, 'r:bug')]] });
    }
    if (action === 'links') return say(chatId, V2_TEXT.links, linksKeyboard);
    if (action === 'reward') {
      const since = await store.wishlistSince(userId);
      return say(chatId, since ? V2_TEXT.rewardIn(since) : V2_TEXT.rewardOut);
    }
    return { status: 200 };
  }

  if (area === 'r') {
    if (action === 'review' || action === 'bug') {
      if (await capReached(v2, userId)) return say(chatId, V2_TEXT.reviewCap);
      await store.setSession(userId, { state: 'await_content', kind: action, text: '', photo: null, updatedAt: v2.now() });
      return say(chatId, V2_TEXT.reviewWrite(action));
    }
    if (action === 'cancel') {
      await store.clearSession(userId);
      return say(chatId, V2_TEXT.reviewCancelled);
    }
    if (action === 'pub' || action === 'auth') {
      const s = await liveSession(v2, userId);
      if (s?.state !== 'await_visibility') return say(chatId, V2_TEXT.reviewExpired);
      if (await capReached(v2, userId)) {
        await store.clearSession(userId);
        return say(chatId, V2_TEXT.reviewCap);
      }
      const visibility: Visibility = action === 'pub' ? 'public' : 'authors';
      // on failure the unfinished review stays, so the same button can be pressed again
      if (!(await deliver(v2, env, s, visibility, userId, cq.from))) return say(chatId, V2_TEXT.reviewFailed);
      await store.addReview({ userId, kind: s.kind, visibility, text: s.text, photo: s.photo });
      await store.clearSession(userId);
      return say(chatId, visibility === 'public' ? V2_TEXT.reviewDonePublic : V2_TEXT.reviewDoneAuthors);
    }
    return { status: 200 };
  }

  if (area === 'b' && env.adminIds.includes(userId) && /^\d+$/.test(arg ?? '')) {
    const id = Number(arg);
    const b = await store.getBroadcast(id);
    if (b?.status !== 'draft') return say(chatId, V2_TEXT.bcStale);
    if (action === 'no') return say(chatId, (await store.cancelBroadcast(id)) ? V2_TEXT.bcCancelled : V2_TEXT.bcStale);
    if (action === 'go') {
      if ((await store.runningBroadcast()) || !(await store.startBroadcast(id))) return say(chatId, V2_TEXT.bcBusy);
      return say(chatId, V2_TEXT.bcStarted(id, await store.recipientCount()));
    }
  }
  return { status: 200 };
}

/** Turns «2026-12-01 10:00» in Baku time into a Date; null for an impossible date. */
export function parseBakuTime(date: string, time: string): Date | null {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date), t = /^(\d{1,2}):(\d{2})$/.exec(time);
  if (!d || !t) return null;
  const [y, mo, day, h, mi] = [d[1], d[2], d[3], t[1], t[2]].map(Number);
  if (h > 23 || mi > 59) return null;
  const at = new Date(Date.UTC(y, mo - 1, day, h, mi) - BAKU_MS);
  const b = baku(at);
  return b.getUTCFullYear() === y && b.getUTCMonth() === mo - 1 && b.getUTCDate() === day ? at : null;
}

async function adminCommand(
  command: string, raw: string, msg: Message, chatId: number, adminId: number, env: BotEnv, v2: V2,
): Promise<WebhookResult> {
  const { store } = v2;
  // everything after the command, line breaks kept
  const rest = raw.trim().replace(/^\S+\s*/, '');

  if (command === 'setvote') {
    if (rest === 'off') {
      await store.setSetting('vote_url', null);
      return say(chatId, V2_TEXT.voteCleared);
    }
    if (!VOTE_URL.test(rest)) return say(chatId, V2_TEXT.voteUsage);
    await store.setSetting('vote_url', rest);
    return say(chatId, V2_TEXT.voteSet(rest));
  }

  if (command === 'post') {
    const photo = msg.photo?.at(-1)?.file_id ?? null;
    const m = /^(\S+)\s+(\S+)(?:\s+([\s\S]*))?$/.exec(rest);
    const text = (m?.[3] ?? '').trim();
    if (!m || (!text && !photo)) return say(chatId, V2_TEXT.postUsage);
    const at = parseBakuTime(m[1], m[2]);
    if (!at) return say(chatId, V2_TEXT.postBadTime);
    if (text.length > (photo ? 1024 : 4096)) return say(chatId, V2_TEXT.postTooLong);
    const id = await store.addPost({ text, photo, publishAt: at });
    return say(chatId, V2_TEXT.postQueued(id, at));
  }

  if (command === 'posts') {
    const rows = await store.queuedPosts(10);
    return say(chatId, rows.length ? V2_TEXT.postsList(rows) : V2_TEXT.postsNone);
  }

  if (command === 'delpost') {
    if (!/^\d+$/.test(rest)) return say(chatId, V2_TEXT.delUsage);
    const id = Number(rest);
    return say(chatId, (await store.deletePost(id)) ? V2_TEXT.deleted(id) : V2_TEXT.notDeleted(id));
  }

  // broadcast
  if (!rest) return say(chatId, V2_TEXT.bcUsage);
  if (rest.length > LIMITS.broadcastText) return say(chatId, V2_TEXT.bcTooLong);
  if (await store.runningBroadcast()) return say(chatId, V2_TEXT.bcBusy);
  const id = await store.createBroadcast(adminId, rest);
  // the preview is the exact message people will get
  await v2.tg.call('sendMessage', { chat_id: chatId, text: rest, reply_markup: broadcastKeyboard(env) });
  return say(chatId, V2_TEXT.bcPreview(await store.recipientCount()), {
    inline_keyboard: [[cb(MENU.bcSend, `b:go:${id}`), cb(MENU.cancel, `b:no:${id}`)]],
  });
}

// ---------- scheduler run: due channel posts, then a chunk of the running broadcast ----------

export interface TickDeps {
  store: ExtStore;
  /** null without the bot token: the run does nothing */
  tg: TelegramApi | null;
  env: BotEnv;
  /** milliseconds, Date.now in production */
  now: () => number;
  sleep: (ms: number) => Promise<void>;
}
export interface TickReport {
  posts: { sent: number; failed: number };
  broadcast: { id: number; sent: number; blocked: number; failed: number; done: boolean } | null;
  skipped?: string;
}

/** Handles one scheduler call. `secretHeader` is the X-Cron-Secret header value. */
export async function handleTick(secretHeader: string | null, cronSecret: string, d: TickDeps): Promise<{ status: number; body?: TickReport }> {
  if (!sameSecret(cronSecret, secretHeader ?? '')) return { status: 401 };
  const empty: TickReport = { posts: { sent: 0, failed: 0 }, broadcast: null };
  if (!d.tg) return { status: 200, body: { ...empty, skipped: 'no bot token' } };
  const tg = d.tg;
  return { status: 200, body: { posts: await runPosts(d, tg), broadcast: await runBroadcast(d, tg) } };
}

async function runPosts(d: TickDeps, tg: TelegramApi) {
  const counts = { sent: 0, failed: 0 };
  for (const p of await d.store.duePosts(new Date(d.now()), LIMITS.postsPerTick)) {
    // a post another run already took is skipped; a failed post is marked and not retried
    if (!(await d.store.claimPost(p.id))) continue;
    const r = await sendContent(tg, TG.channel, p.text, p.photo);
    await d.store.finishPost(p.id, r.ok
      ? { status: 'sent', messageId: r.messageId ?? null }
      : { status: 'failed', error: `${r.status} ${r.description ?? ''}`.trim().slice(0, 300) });
    counts[r.ok ? 'sent' : 'failed']++;
  }
  return counts;
}

async function runBroadcast(d: TickDeps, tg: TelegramApi): Promise<TickReport['broadcast']> {
  const start = d.now();
  const b = await d.store.claimBroadcast(new Date(start), new Date(start + LIMITS.broadcastLeaseMs));
  if (!b) return null;
  const left = () => LIMITS.tickBudgetMs - (d.now() - start);
  const markup = broadcastKeyboard(d.env);
  let lastSend = -Infinity, unsaved = 0, done = false;

  chunks: while (left() > 0) {
    const ids = await d.store.recipientsAfter(b.cursor, LIMITS.recipientPage);
    if (!ids.length) { done = true; break; }
    for (const id of ids) {
      let r: TgResult;
      for (let attempt = 1; ; attempt++) {
        if (left() <= 0) break chunks;
        const wait = lastSend + LIMITS.sendIntervalMs - d.now();
        if (wait > 0) await d.sleep(wait);
        lastSend = d.now();
        r = await tg.call('sendMessage', { chat_id: id, text: b.text, reply_markup: markup });
        if (r.status !== 429 || attempt >= 3) break;
        const pause = (r.retryAfter ?? 1) * 1000;
        // too long to wait in this run: the same person is tried first in the next one
        if (pause >= left()) break chunks;
        await d.sleep(pause);
      }
      if (r.ok) b.sent++;
      else if (r.status === 403) { b.blocked++; await d.store.markBlocked(id); } // blocked the bot or deleted the account
      else b.failed++;
      b.cursor = id;
      if (++unsaved >= LIMITS.saveEvery) { await d.store.saveBroadcast(b); unsaved = 0; }
    }
  }

  if (done) b.status = 'done';
  b.leaseUntil = null;
  await d.store.saveBroadcast(b);
  if (done) await tg.call('sendMessage', { chat_id: b.adminId, text: V2_TEXT.bcDone(b) });
  return { id: b.id, sent: b.sent, blocked: b.blocked, failed: b.failed, done };
}
