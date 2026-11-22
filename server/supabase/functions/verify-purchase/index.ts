// POST /verify-purchase { store, productId, token, runId } → что начислить.
// Заготовка. Проверка токена в Google Play и App Store не написана:
// без неё эту функцию включать нельзя, иначе предметы можно будет получать бесплатно.
import { createClient } from 'npm:@supabase/supabase-js@2';

/** что даёт каждый товар. Должно совпадать с price.iap в content/items.json */
const PRODUCTS: Record<string, { itemId: string } | { coins: number }> = {
  cream_premium_1: { itemId: 'premium_cream' },
};

async function verifyWithStore(_store: string, _productId: string, _token: string): Promise<boolean> {
  // TODO: Google Play Developer API (purchases.products.get) и App Store Server API
  throw new Error('проверка в сторе не подключена');
}

Deno.serve(async (req) => {
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: user } = await admin.auth.getUser((req.headers.get('Authorization') ?? '').replace('Bearer ', ''));
  if (!user?.user) return new Response('нужен вход', { status: 401 });
  const { store, productId, token, runId } = await req.json();
  const grant = PRODUCTS[productId];
  if (!grant) return new Response('нет такого товара', { status: 400 });
  if (!(await verifyWithStore(store, productId, token))) return new Response('покупка не подтверждена', { status: 402 });
  // token уникален: повторная отправка той же покупки упадёт здесь
  const { error } = await admin.from('purchases').insert({ player_id: user.user.id, run_id: runId, store, product_id: productId, token, granted: grant });
  if (error) return new Response('покупка уже зачтена', { status: 409 });
  return Response.json(grant);
});
