// Telegram bot logic: wishlist with creator codes. Pure module with no Deno or Supabase imports,
// so Vitest can run it; index.ts wires it to Deno.serve and the database.
//
// The bot answers through the webhook response (Telegram runs the method named in the reply body),
// so this code never needs the bot token.

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
  welcome: 'Привет! Это «Краш за 30»: игра о том, как за месяц привести героя в форму и понравиться человеку.\n\nПервый день уже можно сыграть. Ты в списке: когда выйдет продолжение, бот напишет.',
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

function sameSecret(a: string, b: string) {
  if (!a || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

interface Message { chat?: { id?: number; type?: string }; from?: { id?: number }; text?: string }

/** Handles one webhook call. `secretHeader` is the X-Telegram-Bot-Api-Secret-Token header value. */
export async function handleWebhook(secretHeader: string | null, update: unknown, store: BotStore, env: BotEnv): Promise<WebhookResult> {
  if (!sameSecret(env.secret, secretHeader ?? '')) return { status: 401 };
  const msg = (update as { message?: Message } | null)?.message;
  const chatId = msg?.chat?.id, userId = msg?.from?.id;
  // only private chats with a text message; anything else is acknowledged and ignored
  if (msg?.chat?.type !== 'private' || typeof chatId !== 'number' || typeof userId !== 'number' || typeof msg.text !== 'string') return { status: 200 };

  const [head = '', ...args] = msg.text.trim().split(/\s+/);
  const command = head.startsWith('/') ? head.slice(1).split('@')[0].toLowerCase() : '';
  const isAdmin = env.adminIds.includes(userId);
  const reply = (text: string, withPlay = false): WebhookResult => ({
    status: 200,
    body: {
      method: 'sendMessage', chat_id: chatId, text,
      ...(withPlay ? { reply_markup: { inline_keyboard: [[{ text: BOT_TEXT.play, web_app: { url: env.miniAppUrl } }]] } } : {}),
    },
  });

  if (command === 'start') {
    const raw = args[0] ? normCode(args[0]) : '';
    const known = CODE.test(raw) ? await store.findCode(raw) : null;
    await store.addToWishlist(userId, known?.code ?? null);
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

  return reply(BOT_TEXT.other, true);
}
