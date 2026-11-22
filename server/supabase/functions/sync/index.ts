// POST /sync { runId?, state, baseVersion } → сохраняет копию сейва.
// Заготовка, не развёрнута. Проверки ниже закрывают два простых способа обмана:
// перевод часов вперёд и откат к старому сейву.
import { createClient } from 'npm:@supabase/supabase-js@2';

const DAY = 86_400_000, DAY_START_HOUR = 6;
const gameDay = (ms: number, tz: number) => Math.floor((ms + tz * 60_000 - DAY_START_HOUR * 3_600_000) / DAY);

Deno.serve(async (req) => {
  const auth = req.headers.get('Authorization') ?? '';
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: user } = await admin.auth.getUser(auth.replace('Bearer ', ''));
  if (!user?.user) return new Response('нужен вход', { status: 401 });
  const { runId, state, baseVersion } = await req.json();

  if (!runId) {
    // новое прохождение: время старта ставит база, не клиент
    const { data, error } = await admin.from('runs').insert({
      player_id: user.user.id, seed: state.seed, archetype_id: state.archetypeId,
      tz_offset_min: state.tzOffsetMin, state,
    }).select('id, version, started_at').single();
    if (error) return new Response(error.message, { status: 400 });
    return Response.json({ runId: data.id, version: data.version, startedAt: Date.parse(data.started_at) });
  }

  const { data: run } = await admin.from('runs').select('*').eq('id', runId).eq('player_id', user.user.id).single();
  if (!run) return new Response('нет такого прохождения', { status: 404 });
  if (run.version !== baseVersion) return Response.json({ conflict: run.state, version: run.version }, { status: 409 });

  // день в сейве не может обогнать день по серверным часам
  const started = Date.parse(run.started_at);
  const serverDay = gameDay(Date.now(), run.tz_offset_min) - gameDay(started, run.tz_offset_min) + 1;
  if (state.day > serverDay) return new Response('время в сейве убежало вперёд', { status: 422 });
  if (state.day < run.state.day) return new Response('сейв старее серверного', { status: 422 });

  const { data, error } = await admin.from('runs').update({
    state: { ...state, startedAt: started }, version: run.version + 1, updated_at: new Date().toISOString(),
    finished_at: state.verdict ? new Date().toISOString() : null, liked: state.verdict?.liked ?? null,
  }).eq('id', runId).eq('version', baseVersion).select('version').single();
  if (error) return new Response(error.message, { status: 409 });
  return Response.json({ version: data.version });
});
