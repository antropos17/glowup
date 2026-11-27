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
