-- Тонкий сервер игры. Заготовка, не развёрнута.
-- Сервер делает три вещи: отдаёт честное время, хранит копию сейва, подтверждает покупки.
-- Вся логика хода остаётся на устройстве.

create table public.runs (
  id            uuid primary key default gen_random_uuid(),
  player_id     uuid not null references auth.users (id) on delete cascade,
  seed          integer not null,
  archetype_id  text not null,
  tz_offset_min integer not null,
  -- время старта ставит сервер. Клиент прислать его не может, поэтому перевод часов ничего не даёт
  started_at    timestamptz not null default now(),
  state         jsonb not null,
  version       integer not null default 1,
  updated_at    timestamptz not null default now(),
  finished_at   timestamptz,
  liked         boolean
);
create index runs_player on public.runs (player_id, started_at desc);

create table public.purchases (
  id          uuid primary key default gen_random_uuid(),
  player_id   uuid not null references auth.users (id) on delete cascade,
  run_id      uuid references public.runs (id) on delete set null,
  store       text not null check (store in ('google', 'apple')),
  product_id  text not null,
  -- токен покупки из стора. Уникален, чтобы одну покупку нельзя было зачесть дважды
  token       text not null unique,
  granted     jsonb not null,
  verified_at timestamptz not null default now()
);

alter table public.runs enable row level security;
alter table public.purchases enable row level security;

-- игрок читает только свои прохождения. Пишут в таблицы только функции с ключом сервиса
create policy "свои прохождения" on public.runs for select using (auth.uid() = player_id);
create policy "свои покупки" on public.purchases for select using (auth.uid() = player_id);
