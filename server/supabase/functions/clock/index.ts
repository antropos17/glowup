// GET /clock → { now } в миллисекундах. Игра сверяет с этим часы устройства.
Deno.serve(() => Response.json({ now: Date.now() }, { headers: { 'cache-control': 'no-store' } }));
