import { describe, expect, it } from 'vitest';
import { BOT_TEXT, handleWebhook, parseAdminIds, type AuthorCode, type BotEnv, type BotStore } from '../server/supabase/functions/bot/logic';

const SECRET = 'test-secret-123';
const ADMIN = 1000, OWNER = 2000, STRANGER = 3000;
const env: BotEnv = { secret: SECRET, miniAppUrl: 'https://example.test/glowup/?demo=1', adminIds: [ADMIN], botUsername: 'test_bot' };

/** In-memory twin of the two tables in 0002_bot_wishlist.sql. */
function memoryStore() {
  const codes = new Map<string, AuthorCode>();
  const wishlist = new Map<number, string | null>();
  const store: BotStore = {
    async findCode(code) { return codes.get(code) ?? null; },
    async addToWishlist(userId, code) {
      if (wishlist.has(userId)) return false;
      wishlist.set(userId, code);
      return true;
    },
    async codeCounts() {
      return [...codes.values()].map((c) => ({ ...c, count: [...wishlist.values()].filter((v) => v === c.code).length }));
    },
    async wishlistTotal() { return wishlist.size; },
    async addCode(c) {
      if (codes.has(c.code)) return false;
      codes.set(c.code, c);
      return true;
    },
  };
  return { store, codes, wishlist };
}

const update = (from: number, text: string) => ({ update_id: 1, message: { message_id: 1, chat: { id: from, type: 'private' }, from: { id: from }, text } });
const send = (s: BotStore, from: number, text: string, secret: string | null = SECRET) => handleWebhook(secret, update(from, text), s, env);
const text = (r: { body?: Record<string, unknown> }) => r.body?.text as string;

function seeded() {
  const m = memoryStore();
  m.codes.set('masha', { code: 'masha', title: 'Канал Маши', ownerId: OWNER });
  m.codes.set('masha_tt', { code: 'masha_tt', title: 'TikTok Маши', ownerId: OWNER });
  m.codes.set('lena', { code: 'lena', title: 'Лена', ownerId: null });
  return m;
}

describe('bot /start', () => {
  it('with a known code records the person with that code and offers the Mini App', async () => {
    const m = seeded();
    const r = await send(m.store, 11, '/start masha');
    expect(r.status).toBe(200);
    expect(m.wishlist.get(11)).toBe('masha');
    expect(r.body).toMatchObject({ method: 'sendMessage', chat_id: 11, text: BOT_TEXT.welcome });
    expect(r.body?.reply_markup).toEqual({ inline_keyboard: [[{ text: BOT_TEXT.play, web_app: { url: env.miniAppUrl } }]] });
  });

  it('reads the code case-insensitively', async () => {
    const m = seeded();
    await send(m.store, 11, '/start MASHA');
    expect(m.wishlist.get(11)).toBe('masha');
  });

  it('without a code records the person with no code', async () => {
    const m = seeded();
    const r = await send(m.store, 12, '/start');
    expect(m.wishlist.has(12)).toBe(true);
    expect(m.wishlist.get(12)).toBeNull();
    expect(text(r)).toBe(BOT_TEXT.welcome);
  });

  it('with an unknown or malformed code records the person with no code', async () => {
    const m = seeded();
    await send(m.store, 13, '/start nobody');
    await send(m.store, 14, '/start bad%code');
    expect(m.wishlist.get(13)).toBeNull();
    expect(m.wishlist.get(14)).toBeNull();
  });

  it('again with another code keeps the first code and adds no row', async () => {
    const m = seeded();
    await send(m.store, 15, '/start masha');
    const r = await send(m.store, 15, '/start lena');
    expect(m.wishlist.get(15)).toBe('masha');
    expect(m.wishlist.size).toBe(1);
    expect(text(r)).toBe(BOT_TEXT.welcome);
  });

  it('accepts /start@botname as well', async () => {
    const m = seeded();
    await send(m.store, 16, '/start@test_bot lena');
    expect(m.wishlist.get(16)).toBe('lena');
  });
});

describe('bot /stats', () => {
  async function filled() {
    const m = seeded();
    await send(m.store, 21, '/start masha');
    await send(m.store, 22, '/start masha');
    await send(m.store, 23, '/start masha_tt');
    await send(m.store, 24, '/start lena');
    await send(m.store, 25, '/start');
    return m;
  }

  it('shows an owner the counts of their own codes only', async () => {
    const m = await filled();
    const t = text(await send(m.store, OWNER, '/stats'));
    expect(t).toBe(['Пришли по твоим кодам:', 'masha (Канал Маши): 2', 'masha_tt (TikTok Маши): 1', 'Всего: 3'].join('\n'));
    expect(t).not.toContain('lena');
  });

  it('shows the admin every code and the overall total', async () => {
    const m = await filled();
    const t = text(await send(m.store, ADMIN, '/stats'));
    expect(t).toContain('masha (Канал Маши): 2');
    expect(t).toContain('lena (Лена): 1');
    expect(t).toContain('По кодам: 4');
    expect(t).toContain('Всего в списке: 5');
  });

  it('refuses a stranger', async () => {
    const m = await filled();
    const r = await send(m.store, STRANGER, '/stats');
    expect(text(r)).toBe(BOT_TEXT.statsNone);
    expect(r.body?.reply_markup).toBeUndefined();
  });
});

describe('bot /addcode', () => {
  it('refuses anyone but the admin and changes nothing', async () => {
    const m = seeded();
    const r = await send(m.store, OWNER, '/addcode newone Новый канал');
    expect(text(r)).toBe(BOT_TEXT.adminOnly);
    expect(m.codes.has('newone')).toBe(false);
  });

  it('lets the admin add a code with a title of several words and an owner id', async () => {
    const m = seeded();
    const r = await send(m.store, ADMIN, '/addcode Vlad-01 Канал Влада 4242');
    expect(m.codes.get('vlad-01')).toEqual({ code: 'vlad-01', title: 'Канал Влада', ownerId: 4242 });
    expect(text(r)).toContain('t.me/test_bot?start=vlad-01');
  });

  it('adds a code without an owner, rejects a bad or taken code and a missing title', async () => {
    const m = seeded();
    await send(m.store, ADMIN, '/addcode solo Сам по себе');
    expect(m.codes.get('solo')?.ownerId).toBeNull();
    expect(text(await send(m.store, ADMIN, '/addcode bad.code Название'))).toBe(BOT_TEXT.addBadCode);
    expect(text(await send(m.store, ADMIN, `/addcode ${'a'.repeat(33)} Название`))).toBe(BOT_TEXT.addBadCode);
    expect(text(await send(m.store, ADMIN, '/addcode masha Ещё раз'))).toBe(BOT_TEXT.addExists('masha'));
    expect(text(await send(m.store, ADMIN, '/addcode onlycode'))).toBe(BOT_TEXT.addUsage);
  });
});

describe('bot webhook', () => {
  it('rejects a wrong or missing secret and touches nothing', async () => {
    const m = seeded();
    expect((await send(m.store, 31, '/start masha', 'wrong-secret-12')).status).toBe(401);
    expect((await send(m.store, 31, '/start masha', null)).status).toBe(401);
    expect(m.wishlist.size).toBe(0);
  });

  it('rejects every call when no secret is configured', async () => {
    const m = seeded();
    expect((await handleWebhook('', update(31, '/start'), m.store, { ...env, secret: '' })).status).toBe(401);
  });

  it('ignores group chats and updates without text', async () => {
    const m = seeded();
    const group = { message: { chat: { id: -5, type: 'group' }, from: { id: 41 }, text: '/start masha' } };
    expect(await handleWebhook(SECRET, group, m.store, env)).toEqual({ status: 200 });
    expect(await handleWebhook(SECRET, { edited_message: {} }, m.store, env)).toEqual({ status: 200 });
    expect(m.wishlist.size).toBe(0);
  });

  it('parses ADMIN_TG_IDS', () => {
    expect(parseAdminIds(' 1, 22 ,x,,333')).toEqual([1, 22, 333]);
    expect(parseAdminIds(undefined)).toEqual([]);
  });
});

// ====================================================================================================
// v2: menu, reviews, vote link, channel posts, broadcasts
// ====================================================================================================

import {
  LIMITS, MENU, TG, V2_TEXT, WELCOME_PICTURE, esc, handleTick, menuKeyboard, parseBakuTime,
  type Broadcast, type ChannelPost, type ExtStore, type PostResult, type Review, type Session, type TelegramApi, type TgResult,
} from '../server/supabase/functions/bot/logic';

const CRON = 'cron-secret-456';
const START = Date.UTC(2026, 10, 27, 8, 0); // 27 Nov 2026, 12:00 in Baku

/** The v1 tables plus an in-memory twin of 0003_bot_v2.sql, a fake Bot API and a fake clock. */
function world() {
  const m = seeded();
  let t = START;
  const joined = new Map<number, Date>();
  const store: BotStore = {
    ...m.store,
    async addToWishlist(userId, code) {
      const added = await m.store.addToWishlist(userId, code);
      if (added) joined.set(userId, new Date(t));
      return added;
    },
  };
  const sessions = new Map<number, Session>();
  const reviews: (Review & { at: number })[] = [];
  const settings = new Map<string, string>();
  const posts: (ChannelPost & { status: string; result?: PostResult })[] = [];
  const broadcasts: Broadcast[] = [];
  const blocked = new Set<number>();
  const recipients = () => [...m.wishlist.keys()].filter((id) => !blocked.has(id)).sort((a, b) => a - b);

  const ext: ExtStore = {
    async getSession(u) { return sessions.get(u) ?? null; },
    async setSession(u, s) { sessions.set(u, s); },
    async clearSession(u) { sessions.delete(u); },
    async reviewsSince(u, since) { return reviews.filter((r) => r.userId === u && r.at >= since.getTime()).length; },
    async addReview(r) { reviews.push({ ...r, at: t }); },
    async wishlistSince(u) { return m.wishlist.has(u) ? joined.get(u) ?? null : null; },
    async unblock(u) { blocked.delete(u); },
    async getSetting(k) { return settings.get(k) ?? null; },
    async setSetting(k, v) { if (v === null) settings.delete(k); else settings.set(k, v); },
    async addPost(p) { const id = posts.length + 1; posts.push({ ...p, id, status: 'queued' }); return id; },
    async queuedPosts(limit) { return posts.filter((p) => p.status === 'queued').sort((a, b) => +a.publishAt - +b.publishAt).slice(0, limit); },
    async deletePost(id) {
      const p = posts.find((x) => x.id === id && x.status === 'queued');
      if (p) p.status = 'deleted';
      return !!p;
    },
    async duePosts(now, limit) { return (await ext.queuedPosts(99)).filter((p) => +p.publishAt <= +now).slice(0, limit); },
    async claimPost(id) {
      const p = posts.find((x) => x.id === id && x.status === 'queued');
      if (p) p.status = 'sending';
      return !!p;
    },
    async finishPost(id, r) { const p = posts.find((x) => x.id === id)!; p.status = r.status; p.result = r; },
    async recipientCount() { return recipients().length; },
    async createBroadcast(adminId, text) {
      const id = broadcasts.length + 1;
      broadcasts.push({ id, adminId, text, status: 'draft', cursor: 0, sent: 0, blocked: 0, failed: 0, leaseUntil: null });
      return id;
    },
    async getBroadcast(id) { const b = broadcasts.find((x) => x.id === id); return b ? { ...b } : null; },
    async runningBroadcast() { const b = broadcasts.find((x) => x.status === 'running'); return b ? { ...b } : null; },
    async startBroadcast(id) {
      const b = broadcasts.find((x) => x.id === id);
      if (!b || b.status !== 'draft' || broadcasts.some((x) => x.status === 'running')) return false;
      b.status = 'running';
      return true;
    },
    async cancelBroadcast(id) {
      const b = broadcasts.find((x) => x.id === id && x.status === 'draft');
      if (b) b.status = 'cancelled';
      return !!b;
    },
    async claimBroadcast(now, leaseUntil) {
      const b = broadcasts.find((x) => x.status === 'running' && (!x.leaseUntil || +x.leaseUntil < +now));
      if (!b) return null;
      b.leaseUntil = leaseUntil;
      return { ...b };
    },
    async recipientsAfter(cursor, limit) { return recipients().filter((id) => id > cursor).slice(0, limit); },
    async markBlocked(u) { blocked.add(u); },
    async saveBroadcast(b) { Object.assign(broadcasts.find((x) => x.id === b.id)!, b); },
  };

  const calls: { method: string; params: Record<string, unknown>; at: number }[] = [];
  /** queued answers per chat id; anything else succeeds */
  const answers = new Map<number | string, TgResult[]>();
  const tg: TelegramApi = {
    async call(method, params) {
      calls.push({ method, params, at: t });
      t += 5; // a Bot API round trip
      return answers.get(params.chat_id as number)?.shift() ?? { ok: true, status: 200, messageId: calls.length };
    },
  };

  const from = (id: number) => ({ id, first_name: 'Аня', last_name: 'Смирнова', username: 'anya_s' });
  const msg = (id: number, extra: Record<string, unknown>) =>
    ({ update_id: 1, message: { message_id: 1, chat: { id, type: 'private' }, from: from(id), ...extra } });
  const w = {
    m, store, ext, tg, calls, answers, sessions, reviews, settings, posts, broadcasts, blocked,
    get now() { return t; },
    advance(ms: number) { t += ms; },
    ext2: { store: ext, tg, now: () => new Date(t) },
    send: (id: number, text: string) => handleWebhook(SECRET, msg(id, { text }), store, env, w.ext2),
    photo: (id: number, caption?: string) =>
      handleWebhook(SECRET, msg(id, { photo: [{ file_id: 'small' }, { file_id: `big-${id}` }], ...(caption ? { caption } : {}) }), store, env, w.ext2),
    tap: (id: number, data: string, chatType = 'private') =>
      handleWebhook(SECRET, { update_id: 2, callback_query: { id: `cq-${id}`, from: from(id), message: { chat: { id, type: chatType } }, data } }, store, env, w.ext2),
    tick: (secret: string | null = CRON, withTg = true) =>
      handleTick(secret, CRON, { store: ext, tg: withTg ? tg : null, env, now: () => t, sleep: async (ms) => { t += ms; } }),
    /** Bot API calls other than answerCallbackQuery */
    sent: () => calls.filter((c) => c.method !== 'answerCallbackQuery'),
  };
  return w;
}
type World = ReturnType<typeof world>;

const buttons = (r: { body?: Record<string, unknown> }) =>
  ((r.body?.reply_markup as { inline_keyboard?: { text: string; callback_data?: string; url?: string }[][] })?.inline_keyboard ?? []).flat();

describe('bot v2 menu', () => {
  it('/start shows the greeting with the five menu buttons and still records the code', async () => {
    const w = world();
    const r = await w.send(11, '/start masha');
    expect(w.m.wishlist.get(11)).toBe('masha');
    expect(text(r)).toBe(V2_TEXT.welcome);
    expect(r.body).toMatchObject({ parse_mode: 'HTML', link_preview_options: { url: WELCOME_PICTURE, show_above_text: true } });
    expect(r.body?.reply_markup).toEqual(menuKeyboard(env));
    expect(buttons(r).map((b) => b.text)).toEqual([MENU.play, MENU.vote, MENU.review, MENU.links, MENU.reward]);
    expect(buttons(r)[0]).toMatchObject({ web_app: { url: env.miniAppUrl } });
  });

  it('answers any unknown text with the menu', async () => {
    const w = world();
    const r = await w.send(11, 'привет');
    expect(text(r)).toBe(V2_TEXT.menuHint);
    expect(r.body?.reply_markup).toEqual(menuKeyboard(env));
  });

  it('answers every button press and links the channel and the chat', async () => {
    const w = world();
    const r = await w.tap(11, 'm:links');
    expect(w.calls[0]).toMatchObject({ method: 'answerCallbackQuery', params: { callback_query_id: 'cq-11' } });
    expect(text(r)).toBe(V2_TEXT.links);
    expect(buttons(r).map((b) => b.url)).toEqual([TG.channelUrl, TG.chatUrl]);
  });

  it('«Моя награда» says since when the person is listed and promises only a cosmetic', async () => {
    const w = world();
    await w.send(11, '/start');
    const t = text(await w.tap(11, 'm:reward'));
    expect(t).toContain('27 ноября 2026');
    expect(t).toContain('косметику');
    expect(t).not.toMatch(/Stars|звёзд|купи|бонус|\d+ монет/i);
    expect(text(await w.tap(12, 'm:reward'))).toBe(V2_TEXT.rewardOut);
  });

  it('ignores a button pressed outside a private chat', async () => {
    const w = world();
    expect(await w.tap(11, 'm:links', 'supergroup')).toEqual({ status: 200 });
  });
});

describe('bot v2 vote link', () => {
  it('has no vote until an admin sets a t.me link, and none again after /setvote off', async () => {
    const w = world();
    const off = await w.tap(11, 'm:vote');
    expect(text(off)).toBe(V2_TEXT.voteOff);
    expect(buttons(off)[0].url).toBe(TG.channelUrl);

    expect(text(await w.send(OWNER, '/setvote https://t.me/glowupchallenge30/5'))).toBe(BOT_TEXT.adminOnly);
    expect(text(await w.send(ADMIN, '/setvote https://evil.example/x'))).toBe(V2_TEXT.voteUsage);
    expect(w.settings.size).toBe(0);

    await w.send(ADMIN, '/setvote https://t.me/glowupchallenge30/5');
    const on = await w.tap(11, 'm:vote');
    expect(text(on)).toBe(V2_TEXT.voteOn);
    expect(buttons(on)).toEqual([{ text: MENU.voteGo, url: 'https://t.me/glowupchallenge30/5' }]);

    expect(text(await w.send(ADMIN, '/setvote off'))).toBe(V2_TEXT.voteCleared);
    expect(text(await w.tap(11, 'm:vote'))).toBe(V2_TEXT.voteOff);
  });
});

describe('bot v2 review or bug', () => {
  async function upToChoice(w: World, id: number, kind: 'review' | 'bug', content: () => Promise<{ body?: Record<string, unknown> }>) {
    const ask = await w.tap(id, 'm:review');
    expect(text(ask)).toBe(V2_TEXT.reviewAsk);
    expect(buttons(ask).map((b) => b.callback_data)).toEqual(['r:review', 'r:bug']);
    expect(text(await w.tap(id, `r:${kind}`))).toBe(V2_TEXT.reviewWrite(kind));
    const choice = await content();
    expect(text(choice)).toBe(V2_TEXT.reviewChoose(kind));
    expect(buttons(choice).map((b) => b.callback_data)).toEqual(['r:pub', 'r:auth', 'r:cancel']);
    return choice;
  }

  it('warns that a published review is visible to everyone before anything is sent', async () => {
    const w = world();
    await upToChoice(w, 11, 'review', () => w.send(11, 'Классная игра'));
    expect(V2_TEXT.reviewChoose('review')).toContain('Увидят все участники');
    expect(V2_TEXT.reviewChoose('review')).toContain('«Отзывы»');
    expect(w.sent()).toEqual([]);
  });

  it('«Опубликовать» posts a review to topic 3 of the group with the first name only', async () => {
    const w = world();
    await upToChoice(w, 11, 'review', () => w.send(11, 'Классная игра'));
    const r = await w.tap(11, 'r:pub');
    expect(text(r)).toBe(V2_TEXT.reviewDonePublic);
    expect(w.sent()).toEqual([{ method: 'sendMessage', at: expect.any(Number), params: {
      chat_id: TG.group, message_thread_id: 3, parse_mode: 'HTML', text: '<b>💬 Отзыв</b> · Аня\n<blockquote>Классная игра</blockquote>',
    } }]);
    expect(w.sent()[0].params.text as string).not.toMatch(/Смирнова|anya_s|11/);
    expect(w.reviews).toMatchObject([{ userId: 11, kind: 'review', visibility: 'public', text: 'Классная игра', photo: null }]);
    expect(w.sessions.size).toBe(0);
  });

  it('a published bug with a screenshot goes to topic 4 as a photo', async () => {
    const w = world();
    await upToChoice(w, 11, 'bug', () => w.photo(11, 'Кнопка не жмётся'));
    await w.tap(11, 'r:pub');
    expect(w.sent()).toEqual([{ method: 'sendPhoto', at: expect.any(Number), params: {
      chat_id: TG.group, message_thread_id: 4, parse_mode: 'HTML', photo: 'big-11', caption: '<b>🐞 Баг</b> · Аня\n<blockquote>Кнопка не жмётся</blockquote>',
    } }]);
  });

  it('escapes the person’s text and name, so nothing they type becomes markup', async () => {
    const w = world();
    await w.tap(11, 'r:review');
    await w.send(11, '<b>жирно</b> & <a href="x">ссылка</a>');
    await handleWebhook(SECRET, { callback_query: { id: 'q', from: { id: 11, first_name: '<i>Аня</i>' }, message: { chat: { id: 11, type: 'private' } }, data: 'r:pub' } }, w.store, env, w.ext2);
    expect(w.sent()[0].params.text).toBe(
      '<b>💬 Отзыв</b> · &lt;i&gt;Аня&lt;/i&gt;\n<blockquote>&lt;b&gt;жирно&lt;/b&gt; &amp; &lt;a href="x"&gt;ссылка&lt;/a&gt;</blockquote>');
    expect(esc('a<b>&c')).toBe('a&lt;b&gt;&amp;c');
  });

  it('«Только авторам» reaches the admins in private and nothing reaches the group', async () => {
    const w = world();
    await upToChoice(w, 11, 'bug', () => w.photo(11));
    expect(text(await w.tap(11, 'r:auth'))).toBe(V2_TEXT.reviewDoneAuthors);
    const sent = w.sent();
    expect(sent.map((c) => c.params.chat_id)).toEqual(env.adminIds);
    expect(sent[0]).toMatchObject({ method: 'sendPhoto', params: { photo: 'big-11', parse_mode: 'HTML', caption: '<b>🔒 Баг, только авторам</b> · Аня · id 11' } });
    expect(sent.some((c) => c.params.chat_id === TG.group)).toBe(false);
    expect(w.reviews).toMatchObject([{ kind: 'bug', visibility: 'authors', text: '', photo: 'big-11' }]);
  });

  it('cancel, a menu button or a command drops the unfinished review and sends nothing', async () => {
    const w = world();
    await upToChoice(w, 11, 'review', () => w.send(11, 'текст'));
    expect(text(await w.tap(11, 'r:cancel'))).toBe(V2_TEXT.reviewCancelled);
    expect(text(await w.tap(11, 'r:pub'))).toBe(V2_TEXT.reviewExpired);

    await upToChoice(w, 11, 'review', () => w.send(11, 'текст'));
    await w.tap(11, 'm:links');
    expect(text(await w.tap(11, 'r:pub'))).toBe(V2_TEXT.reviewExpired);

    await w.tap(11, 'r:review');
    await w.send(11, '/start');
    expect(text(await w.send(11, 'это уже не отзыв'))).toBe(V2_TEXT.menuHint);
    expect(w.sent()).toEqual([]);
    expect(w.reviews).toEqual([]);
  });

  it('asks again for an empty, too long or non-text message, and for a button while choosing', async () => {
    const w = world();
    await w.tap(11, 'r:review');
    const sticker = await handleWebhook(SECRET, { message: { chat: { id: 11, type: 'private' }, from: { id: 11 }, sticker: {} } }, w.store, env, w.ext2);
    expect(text(sticker)).toBe(V2_TEXT.reviewNeedContent);
    expect(text(await w.send(11, 'я'.repeat(LIMITS.reviewText + 1)))).toBe(V2_TEXT.reviewTooLong);
    expect(text(await w.photo(11, 'я'.repeat(LIMITS.reviewCaption + 1)))).toBe(V2_TEXT.reviewTooLong);
    await w.send(11, 'нормально');
    expect(text(await w.send(11, 'ещё текст'))).toBe(V2_TEXT.reviewPickButton);
  });

  it('drops an unfinished review after 30 minutes', async () => {
    const w = world();
    await w.tap(11, 'r:review');
    w.advance(LIMITS.sessionTtlMs + 1);
    expect(text(await w.send(11, 'поздно'))).toBe(V2_TEXT.menuHint);
    expect(w.sessions.size).toBe(0);
  });

  it('keeps the review when delivery fails, so the button works again', async () => {
    const w = world();
    await upToChoice(w, 11, 'review', () => w.send(11, 'текст'));
    w.answers.set(TG.group, [{ ok: false, status: 400, description: 'Bad Request: not enough rights' }]);
    expect(text(await w.tap(11, 'r:pub'))).toBe(V2_TEXT.reviewFailed);
    expect(w.reviews).toEqual([]);
    expect(text(await w.tap(11, 'r:pub'))).toBe(V2_TEXT.reviewDonePublic);
    expect(w.reviews).toHaveLength(1);
  });

  it('allows three reviews a day per person, then refuses until 24 hours pass', async () => {
    const w = world();
    for (let i = 0; i < LIMITS.reviewsPerDay; i++) {
      await w.tap(11, 'r:review');
      await w.send(11, `отзыв ${i}`);
      await w.tap(11, 'r:auth');
    }
    expect(w.reviews).toHaveLength(3);
    expect(text(await w.tap(11, 'm:review'))).toBe(V2_TEXT.reviewCap);
    expect(text(await w.tap(11, 'r:review'))).toBe(V2_TEXT.reviewCap);
    expect(text(await w.tap(12, 'm:review'))).toBe(V2_TEXT.reviewAsk); // another person is not affected
    w.advance(24 * 3600_000);
    expect(text(await w.tap(11, 'm:review'))).toBe(V2_TEXT.reviewAsk);
  });
});

describe('bot v2 channel post queue', () => {
  it('reads admin times as Baku time and rejects impossible dates', () => {
    expect(parseBakuTime('2026-12-01', '10:00')?.toISOString()).toBe('2026-12-01T06:00:00.000Z');
    expect(parseBakuTime('2026-02-30', '10:00')).toBeNull();
    expect(parseBakuTime('2026-12-01', '24:00')).toBeNull();
    expect(parseBakuTime('01.12.2026', '10:00')).toBeNull();
  });

  it('is admin only and checks the format', async () => {
    const w = world();
    expect(text(await w.send(OWNER, '/post 2026-11-27 13:00 текст'))).toBe(BOT_TEXT.adminOnly);
    expect(text(await w.send(ADMIN, '/post завтра'))).toBe(V2_TEXT.postUsage);
    expect(text(await w.send(ADMIN, '/post 2026-11-31 13:00 текст'))).toBe(V2_TEXT.postBadTime);
    expect(text(await w.send(ADMIN, `/post 2026-11-27 13:00 ${'я'.repeat(4097)}`))).toBe(V2_TEXT.postTooLong);
    expect(w.posts).toEqual([]);
  });

  it('posts a due item once, leaves an item that is not due, and lists and removes queued items', async () => {
    const w = world();
    const q = await w.send(ADMIN, '/post 2026-11-27 13:00 День 2 уже скоро!\nЖдите.');
    expect(text(q)).toBe(V2_TEXT.postQueued(1, new Date(Date.UTC(2026, 10, 27, 9, 0))));
    await w.send(ADMIN, '/post 2026-11-28 13:00 завтрашний пост');
    await w.send(ADMIN, '/post 2026-11-29 13:00 лишний пост');
    expect(text(await w.send(ADMIN, '/posts'))).toBe(
      'Ближайшие посты (время Баку):\n№1 · 27.11.2026 13:00 · День 2 уже скоро! Ждите.\n№2 · 28.11.2026 13:00 · завтрашний пост\n№3 · 29.11.2026 13:00 · лишний пост');
    expect(text(await w.send(ADMIN, '/delpost 3'))).toBe(V2_TEXT.deleted(3));
    expect(text(await w.send(ADMIN, '/delpost 3'))).toBe(V2_TEXT.notDeleted(3));

    // 12:00 in Baku: nothing is due
    expect((await w.tick()).body?.posts).toEqual({ sent: 0, failed: 0 });
    expect(w.sent()).toEqual([]);

    w.advance(3600_000); // 13:00
    expect((await w.tick()).body?.posts).toEqual({ sent: 1, failed: 0 });
    expect(w.sent()).toMatchObject([{ method: 'sendMessage', params: { chat_id: TG.channel, text: 'День 2 уже скоро!\nЖдите.' } }]);
    expect(w.posts[0]).toMatchObject({ status: 'sent', result: { status: 'sent', messageId: 1 } });

    // already posted: a later run does not post it again; the next one waits for its own time
    await w.tick();
    expect(w.sent()).toHaveLength(1);
    expect(w.posts[1].status).toBe('queued');
    expect(text(await w.send(ADMIN, '/delpost 1'))).toBe(V2_TEXT.notDeleted(1));
  });

  it('posts a picture with a caption, and marks a failed post without retrying it', async () => {
    const w = world();
    await w.photo(ADMIN, '/post 2026-11-27 11:00 Новая картинка');
    await w.send(ADMIN, '/post 2026-11-27 11:30 второй');
    w.answers.set(TG.channel, [{ ok: true, status: 200, messageId: 77 }, { ok: false, status: 403, description: 'Forbidden: bot is not a member of the channel chat' }]);
    expect((await w.tick()).body?.posts).toEqual({ sent: 1, failed: 1 });
    expect(w.sent()[0]).toMatchObject({ method: 'sendPhoto', params: { chat_id: TG.channel, photo: `big-${ADMIN}`, caption: 'Новая картинка' } });
    expect(w.posts[1]).toMatchObject({ status: 'failed', result: { status: 'failed', error: '403 Forbidden: bot is not a member of the channel chat' } });
    await w.tick();
    expect(w.sent()).toHaveLength(2);
  });
});

describe('bot v2 broadcast', () => {
  async function listed(w: World, ids: number[]) {
    for (const id of ids) await w.store.addToWishlist(id, null);
  }

  it('is admin only, shows the exact message as a preview with the recipient count and sends nothing yet', async () => {
    const w = world();
    await listed(w, [21, 22, 23]);
    expect(text(await w.send(OWNER, '/broadcast Привет'))).toBe(BOT_TEXT.adminOnly);
    expect(text(await w.send(ADMIN, '/broadcast'))).toBe(V2_TEXT.bcUsage);
    expect(text(await w.send(ADMIN, `/broadcast ${'я'.repeat(LIMITS.broadcastText + 1)}`))).toBe(V2_TEXT.bcTooLong);

    const r = await w.send(ADMIN, '/broadcast Вышел день 2!\nЗаходи.');
    expect(w.sent()).toEqual([{ method: 'sendMessage', at: expect.any(Number), params: {
      chat_id: ADMIN, text: 'Вышел день 2!\nЗаходи.', reply_markup: { inline_keyboard: [[{ text: MENU.bcPlay, web_app: { url: env.miniAppUrl } }]] },
    } }]);
    expect(text(r)).toBe(V2_TEXT.bcPreview(3));
    expect(buttons(r).map((b) => b.callback_data)).toEqual(['b:go:1', 'b:no:1']);
    expect(w.broadcasts[0].status).toBe('draft');
    await w.tick();
    expect(w.sent()).toHaveLength(1);
  });

  it('sends after the confirm at no more than 25 messages a second, marks blocked people and reports the counts', async () => {
    const w = world();
    await listed(w, [21, 22, 23, 24, 25]);
    await w.send(ADMIN, '/broadcast Вышел день 2!');
    expect(await w.tap(STRANGER, 'b:go:1')).toEqual({ status: 200 }); // not an admin: nothing happens
    expect(text(await w.tap(ADMIN, 'b:go:1'))).toBe(V2_TEXT.bcStarted(1, 5));
    w.answers.set(22, [{ ok: false, status: 403, description: 'Forbidden: bot was blocked by the user' }]);
    w.answers.set(24, [{ ok: false, status: 400, description: 'Bad Request: chat not found' }]);
    const before = w.calls.length;

    expect((await w.tick()).body?.broadcast).toEqual({ id: 1, sent: 3, blocked: 1, failed: 1, done: true });
    const sends = w.calls.slice(before, before + 5);
    expect(sends.map((c) => c.params.chat_id)).toEqual([21, 22, 23, 24, 25]);
    for (let i = 1; i < sends.length; i++) expect(sends[i].at - sends[i - 1].at).toBeGreaterThanOrEqual(LIMITS.sendIntervalMs);
    expect(w.calls.at(-1)?.params).toEqual({ chat_id: ADMIN, text: 'Рассылка №1 готова. Отправлено: 3, заблокировали бота: 1, ошибки: 1.' });
    expect(w.broadcasts[0].status).toBe('done');
    expect(w.blocked).toEqual(new Set([22]));

    // the next broadcast skips the blocked person; a new /start brings them back
    await w.send(ADMIN, '/broadcast Второй');
    expect(text(await w.tap(ADMIN, 'b:go:2'))).toBe(V2_TEXT.bcStarted(2, 4));
    await w.send(22, '/start');
    expect(w.blocked.size).toBe(0);
  });

  it('refuses a second broadcast while one is running, and a second confirm of the same one', async () => {
    const w = world();
    await listed(w, [21]);
    await w.send(ADMIN, '/broadcast Первая');
    await w.send(ADMIN, '/broadcast Вторая');
    await w.tap(ADMIN, 'b:go:1');
    expect(text(await w.tap(ADMIN, 'b:go:1'))).toBe(V2_TEXT.bcStale);
    expect(text(await w.tap(ADMIN, 'b:go:2'))).toBe(V2_TEXT.bcBusy);
    expect(text(await w.send(ADMIN, '/broadcast Третья'))).toBe(V2_TEXT.bcBusy);
    expect(w.broadcasts.map((b) => b.status)).toEqual(['running', 'draft']);
  });

  it('cancel sends nothing', async () => {
    const w = world();
    await listed(w, [21]);
    await w.send(ADMIN, '/broadcast Текст');
    expect(text(await w.tap(ADMIN, 'b:no:1'))).toBe(V2_TEXT.bcCancelled);
    expect(text(await w.tap(ADMIN, 'b:go:1'))).toBe(V2_TEXT.bcStale);
    await w.tick();
    expect(w.sent()).toHaveLength(1); // the preview only
  });

  it('continues over several runs from the stored position without sending anyone twice', async () => {
    const w = world();
    const ids = Array.from({ length: 1200 }, (_, i) => 10_000 + i);
    await listed(w, ids);
    await w.send(ADMIN, '/broadcast Большая рассылка');
    await w.tap(ADMIN, 'b:go:1');
    const first = (await w.tick()).body?.broadcast;
    expect(first?.done).toBe(false);
    expect(first!.sent).toBeGreaterThan(500);
    expect(first!.sent).toBeLessThan(1200);
    expect(w.broadcasts[0].leaseUntil).toBeNull();
    w.advance(60_000);
    expect((await w.tick()).body?.broadcast).toMatchObject({ sent: 1200, done: true });
    const got = w.calls.filter((c) => c.params.text === 'Большая рассылка' && c.params.chat_id !== ADMIN).map((c) => c.params.chat_id);
    expect(got).toEqual(ids);
  });

  it('waits out a 429 and sends to the same person again', async () => {
    const w = world();
    await listed(w, [21, 22]);
    await w.send(ADMIN, '/broadcast Текст');
    await w.tap(ADMIN, 'b:go:1');
    w.answers.set(21, [{ ok: false, status: 429, retryAfter: 3 }]);
    const t0 = w.now;
    expect((await w.tick()).body?.broadcast).toEqual({ id: 1, sent: 2, blocked: 0, failed: 0, done: true });
    expect(w.calls.filter((c) => c.params.chat_id === 21)).toHaveLength(2);
    expect(w.now - t0).toBeGreaterThanOrEqual(3000);
  });

  it('a run skips a broadcast another run holds', async () => {
    const w = world();
    await listed(w, [21]);
    await w.send(ADMIN, '/broadcast Текст');
    await w.tap(ADMIN, 'b:go:1');
    w.broadcasts[0].leaseUntil = new Date(w.now + 60_000);
    expect((await w.tick()).body?.broadcast).toBeNull();
  });
});

describe('bot v2 without the bot token', () => {
  const noToken = (w: World) => ({ store: w.ext, tg: null });

  it('/start, unknown text, /stats and /addcode answer exactly as v1', async () => {
    const w = world();
    const go = (id: number, t: string) => handleWebhook(SECRET, update(id, t), w.store, env, noToken(w));
    const r = await go(11, '/start masha');
    expect(w.m.wishlist.get(11)).toBe('masha');
    expect(r.body).toEqual({ method: 'sendMessage', chat_id: 11, text: BOT_TEXT.welcome,
      reply_markup: { inline_keyboard: [[{ text: BOT_TEXT.play, web_app: { url: env.miniAppUrl } }]] } });
    expect(text(await go(11, 'привет'))).toBe(BOT_TEXT.other);
    expect(text(await go(ADMIN, '/stats'))).toContain('Всего в списке: 1');
    expect(text(await go(ADMIN, '/addcode nt Без токена'))).toContain('Код nt добавлен');
  });

  it('tells the admin the new features need the token and ignores buttons and pictures', async () => {
    const w = world();
    for (const c of ['/broadcast Привет', '/post 2026-12-01 10:00 текст', '/posts', '/delpost 1', '/setvote off']) {
      expect(text(await handleWebhook(SECRET, update(ADMIN, c), w.store, env, noToken(w)))).toBe(V2_TEXT.noToken);
    }
    expect(text(await handleWebhook(SECRET, update(OWNER, '/broadcast Привет'), w.store, env, noToken(w)))).toBe(BOT_TEXT.adminOnly);
    const cbq = { callback_query: { id: 'x', from: { id: 11 }, message: { chat: { id: 11, type: 'private' } }, data: 'm:links' } };
    expect(await handleWebhook(SECRET, cbq, w.store, env, noToken(w))).toEqual({ status: 200 });
    const pic = { message: { chat: { id: 11, type: 'private' }, from: { id: 11 }, photo: [{ file_id: 'p' }] } };
    expect(await handleWebhook(SECRET, pic, w.store, env, noToken(w))).toEqual({ status: 200 });
    expect(w.calls).toEqual([]);
    expect(w.broadcasts).toEqual([]);
  });

  it('the scheduler run does nothing, and a wrong scheduler secret is refused', async () => {
    const w = world();
    await w.send(ADMIN, '/post 2026-11-27 11:00 пост');
    expect((await w.tick(CRON, false)).body?.skipped).toBe('no bot token');
    expect(w.posts[0].status).toBe('queued');
    expect((await w.tick('wrong')).status).toBe(401);
    expect((await w.tick(null)).status).toBe(401);
    expect(w.posts[0].status).toBe('queued');
  });
});
