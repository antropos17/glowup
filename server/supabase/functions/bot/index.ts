// POST /bot: Telegram webhook of the wishlist bot. Deploy with --no-verify-jwt: Telegram sends no Supabase JWT,
// the X-Telegram-Bot-Api-Secret-Token header is checked instead (logic.ts). Steps: docs/TELEGRAM.md.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { handleWebhook, parseAdminIds, type BotStore, type CodeCount } from './logic.ts';

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

const env = {
  secret: Deno.env.get('TELEGRAM_WEBHOOK_SECRET') ?? '',
  miniAppUrl: Deno.env.get('MINI_APP_URL') ?? '',
  adminIds: parseAdminIds(Deno.env.get('ADMIN_TG_IDS')),
  botUsername: Deno.env.get('BOT_USERNAME') ?? '',
};

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response(null, { status: 405 });
  let update: unknown = null;
  try { update = await req.json(); } catch { /* not JSON: handled as an empty update after the secret check */ }
  try {
    const r = await handleWebhook(req.headers.get('X-Telegram-Bot-Api-Secret-Token'), update, store, env);
    return r.body ? Response.json(r.body, { status: r.status }) : new Response(null, { status: r.status });
  } catch (e) {
    // a database error: Telegram retries the update later; the wishlist insert is safe to repeat
    console.error('bot update failed', e instanceof Error ? e.message : e);
    return new Response(null, { status: 500 });
  }
});
