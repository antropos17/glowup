// POST /bot: Telegram webhook of the wishlist bot. Deploy with --no-verify-jwt: Telegram sends no Supabase JWT,
// the X-Telegram-Bot-Api-Secret-Token header is checked instead (logic.ts). Steps: docs/TELEGRAM.md.
// POST /bot/tick: the scheduler (pg_cron + pg_net, every minute), checked by the X-Cron-Secret header.
import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  handleTick, handleWebhook, parseAdminIds,
  type Broadcast, type BotStore, type ChannelPost, type CodeCount, type ExtStore, type Session, type TelegramApi,
} from './logic.ts';

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });

const store: BotStore = {
  async findCode(code) {
    const { data, error } = await db.from('author_codes').select('code, title, owner_tg_id').eq('code', code).maybeSingle();
    if (error) throw error;
    return data && { code: data.code, title: data.title, ownerId: data.owner_tg_id };
  },
  async addToWishlist(userId, code) {
    // an existing row stays as it is: the first code is kept, a repeat /start adds nothing
    const { data, error } = await db.from('wishlist')
      .upsert({ tg_user_id: userId, author_code: code }, { onConflict: 'tg_user_id', ignoreDuplicates: true })
      .select('tg_user_id');
    if (error) throw error;
    return (data?.length ?? 0) > 0;
  },
  async codeCounts() {
    const { data, error } = await db.from('author_code_stats').select('code, title, owner_tg_id, people').order('code');
    if (error) throw error;
    return (data ?? []).map((r): CodeCount => ({ code: r.code, title: r.title, ownerId: r.owner_tg_id, count: r.people }));
  },
  async wishlistTotal() {
    const { count, error } = await db.from('wishlist').select('tg_user_id', { count: 'exact', head: true });
    if (error) throw error;
    return count ?? 0;
  },
  async addCode(c) {
    const { error } = await db.from('author_codes').insert({ code: c.code, title: c.title, owner_tg_id: c.ownerId });
    if (error?.code === '23505') return false; // unique violation: the code exists
    if (error) throw error;
    return true;
  },
};

// ---------- v2 tables (0003_bot_v2.sql) ----------

/** Throws the database error, if any, and returns the data (rows are untyped: the client has no generated types). */
// deno-lint-ignore no-explicit-any
function ok(r: { data: any; error: unknown }): any {
  if (r.error) throw r.error;
  return r.data;
}
const iso = (d: Date) => d.toISOString();
type PostRow = { id: number; body: string; photo: string | null; publish_at: string };
const toPost = (r: PostRow): ChannelPost => ({ id: r.id, text: r.body, photo: r.photo, publishAt: new Date(r.publish_at) });
type BcRow = {
  id: number; admin_tg_id: number; body: string; status: Broadcast['status']; cursor_tg_id: number;
  sent: number; blocked: number; failed: number; lease_until: string | null;
};
const toBc = (r: BcRow): Broadcast => ({
  id: r.id, adminId: r.admin_tg_id, text: r.body, status: r.status, cursor: r.cursor_tg_id,
  sent: r.sent, blocked: r.blocked, failed: r.failed, leaseUntil: r.lease_until ? new Date(r.lease_until) : null,
});

const ext: ExtStore = {
  async getSession(userId) {
    const r = ok(await db.from('bot_sessions').select('state, kind, body, photo_file_id, updated_at').eq('tg_user_id', userId).maybeSingle());
    return r && { state: r.state, kind: r.kind, text: r.body, photo: r.photo_file_id, updatedAt: new Date(r.updated_at) } as Session;
  },
  async setSession(userId, s) {
    ok(await db.from('bot_sessions').upsert({
      tg_user_id: userId, state: s.state, kind: s.kind, body: s.text, photo_file_id: s.photo, updated_at: iso(s.updatedAt),
    }, { onConflict: 'tg_user_id' }));
  },
  async clearSession(userId) { ok(await db.from('bot_sessions').delete().eq('tg_user_id', userId)); },
  async reviewsSince(userId, since) {
    const r = await db.from('reviews').select('id', { count: 'exact', head: true }).eq('tg_user_id', userId).gte('created_at', iso(since));
    if (r.error) throw r.error;
    return r.count ?? 0;
  },
  async addReview(v) {
    ok(await db.from('reviews').insert({ tg_user_id: v.userId, kind: v.kind, visibility: v.visibility, body: v.text, photo_file_id: v.photo }));
  },
  async wishlistSince(userId) {
    const r = ok(await db.from('wishlist').select('created_at').eq('tg_user_id', userId).maybeSingle());
    return r ? new Date(r.created_at) : null;
  },
  async unblock(userId) {
    ok(await db.from('wishlist').update({ blocked_at: null }).eq('tg_user_id', userId).not('blocked_at', 'is', null));
  },
  async getSetting(key) {
    const r = ok(await db.from('bot_settings').select('value').eq('key', key).maybeSingle());
    return r?.value ?? null;
  },
  async setSetting(key, value) {
    if (value === null) ok(await db.from('bot_settings').delete().eq('key', key));
    else ok(await db.from('bot_settings').upsert({ key, value, updated_at: iso(new Date()) }, { onConflict: 'key' }));
  },
  async addPost(p) {
    const r = ok(await db.from('channel_posts').insert({ body: p.text, photo: p.photo, publish_at: iso(p.publishAt) }).select('id').single());
    return r.id;
  },
  async queuedPosts(limit) {
    const r = ok(await db.from('channel_posts').select('id, body, photo, publish_at').eq('status', 'queued').order('publish_at').limit(limit));
    return (r ?? []).map(toPost);
  },
  async deletePost(id) {
    const r = ok(await db.from('channel_posts').delete().eq('id', id).eq('status', 'queued').select('id'));
    return (r?.length ?? 0) > 0;
  },
  async duePosts(now, limit) {
    const r = ok(await db.from('channel_posts').select('id, body, photo, publish_at')
      .eq('status', 'queued').lte('publish_at', iso(now)).order('publish_at').limit(limit));
    return (r ?? []).map(toPost);
  },
  async claimPost(id) {
    const r = ok(await db.from('channel_posts').update({ status: 'sending' }).eq('id', id).eq('status', 'queued').select('id'));
    return (r?.length ?? 0) > 0;
  },
  async finishPost(id, res) {
    ok(await db.from('channel_posts').update(res.status === 'sent'
      ? { status: 'sent', message_id: res.messageId, sent_at: iso(new Date()), error: null }
      : { status: 'failed', error: res.error }).eq('id', id));
  },
  async recipientCount() {
    const r = await db.from('wishlist').select('tg_user_id', { count: 'exact', head: true }).is('blocked_at', null);
    if (r.error) throw r.error;
    return r.count ?? 0;
  },
  async createBroadcast(adminId, text) {
    return ok(await db.from('broadcasts').insert({ admin_tg_id: adminId, body: text }).select('id').single()).id;
  },
  async getBroadcast(id) {
    const r = ok(await db.from('broadcasts').select('*').eq('id', id).maybeSingle());
    return r && toBc(r);
  },
  async runningBroadcast() {
    const r = ok(await db.from('broadcasts').select('*').eq('status', 'running').maybeSingle());
    return r && toBc(r);
  },
  async startBroadcast(id) {
    const r = await db.from('broadcasts').update({ status: 'running' }).eq('id', id).eq('status', 'draft').select('id');
    if (r.error?.code === '23505') return false; // broadcasts_one_running: another one is running
    return (ok(r)?.length ?? 0) > 0;
  },
  async cancelBroadcast(id) {
    const r = ok(await db.from('broadcasts').update({ status: 'cancelled', finished_at: iso(new Date()) }).eq('id', id).eq('status', 'draft').select('id'));
    return (r?.length ?? 0) > 0;
  },
  async claimBroadcast(now, leaseUntil) {
    const r = ok(await db.from('broadcasts').update({ lease_until: iso(leaseUntil) })
      .eq('status', 'running').or(`lease_until.is.null,lease_until.lt."${iso(now)}"`).select('*').maybeSingle());
    return r && toBc(r);
  },
  async recipientsAfter(cursor, limit) {
    const r = ok(await db.from('wishlist').select('tg_user_id').is('blocked_at', null).gt('tg_user_id', cursor).order('tg_user_id').limit(limit));
    return (r ?? []).map((x: { tg_user_id: number }) => x.tg_user_id);
  },
  async markBlocked(userId) {
    ok(await db.from('wishlist').update({ blocked_at: iso(new Date()) }).eq('tg_user_id', userId));
  },
  async saveBroadcast(b) {
    ok(await db.from('broadcasts').update({
      status: b.status, cursor_tg_id: b.cursor, sent: b.sent, blocked: b.blocked, failed: b.failed,
      lease_until: b.leaseUntil ? iso(b.leaseUntil) : null, ...(b.status === 'done' ? { finished_at: iso(new Date()) } : {}),
    }).eq('id', b.id));
  },
};

// ---------- Telegram Bot API client ----------

/** The token stays inside this closure: it is never logged and never put into an error text or a result. */
function telegram(token: string): TelegramApi {
  return {
    async call(method, params) {
      try {
        const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(params),
        });
        const j = await res.json().catch(() => ({})) as {
          ok?: boolean; description?: string; parameters?: { retry_after?: number }; result?: { message_id?: number };
        };
        return {
          ok: res.ok && j.ok === true, status: res.status, description: j.description,
          retryAfter: j.parameters?.retry_after, messageId: j.result?.message_id,
        };
      } catch {
        // a fetch error message may contain the request URL, and with it the token: report a fixed text only
        return { ok: false, status: 0, description: 'network error' };
      }
    },
  };
}

const token = Deno.env.get('TELEGRAM_BOT_TOKEN') ?? '';
const tg = token ? telegram(token) : null;
const cronSecret = Deno.env.get('CRON_SECRET') ?? '';

const env = {
  secret: Deno.env.get('TELEGRAM_WEBHOOK_SECRET') ?? '',
  miniAppUrl: Deno.env.get('MINI_APP_URL') ?? '',
  adminIds: parseAdminIds(Deno.env.get('ADMIN_TG_IDS')),
  botUsername: Deno.env.get('BOT_USERNAME') ?? '',
};

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response(null, { status: 405 });
  if (new URL(req.url).pathname.endsWith('/tick')) {
    try {
      const r = await handleTick(req.headers.get('X-Cron-Secret'), cronSecret, {
        store: ext, tg, env, now: Date.now, sleep: (ms) => new Promise((ok) => setTimeout(ok, ms)),
      });
      return r.body ? Response.json(r.body, { status: r.status }) : new Response(null, { status: r.status });
    } catch (e) {
      // the next run continues from the stored cursor
      console.error('bot tick failed', e instanceof Error ? e.message : e);
      return new Response(null, { status: 500 });
    }
  }
  let update: unknown = null;
  try { update = await req.json(); } catch { /* not JSON: handled as an empty update after the secret check */ }
  try {
    const r = await handleWebhook(req.headers.get('X-Telegram-Bot-Api-Secret-Token'), update, store, env, { store: ext, tg });
    return r.body ? Response.json(r.body, { status: r.status }) : new Response(null, { status: r.status });
  } catch (e) {
    // a database error: Telegram retries the update later; the wishlist insert is safe to repeat
    console.error('bot update failed', e instanceof Error ? e.message : e);
    return new Response(null, { status: 500 });
  }
});
