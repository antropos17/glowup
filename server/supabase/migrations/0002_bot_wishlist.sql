-- Telegram bot: wishlist and creator codes. Not deployed yet; steps in docs/TELEGRAM.md.
-- Minimal personal data: only the Telegram user id, no names or usernames.
-- Only the bot function (service role key) reads and writes these tables.

create table public.author_codes (
  code        text primary key check (code ~ '^[a-z0-9_-]{1,32}$'),
  title       text not null,
  owner_tg_id bigint,
  created_at  timestamptz not null default now()
);
create index author_codes_owner on public.author_codes (owner_tg_id);

create table public.wishlist (
  tg_user_id  bigint primary key,
  -- the code the person came by on their first /start; never overwritten
  author_code text references public.author_codes (code) on update cascade on delete set null,
  created_at  timestamptz not null default now()
);
create index wishlist_code on public.wishlist (author_code);

-- RLS on and no policies: anon and authenticated get nothing, the service role bypasses RLS
alter table public.author_codes enable row level security;
alter table public.wishlist enable row level security;
revoke all on public.author_codes, public.wishlist from anon, authenticated;

-- people per code, codes nobody came by included. security_invoker makes the view obey the tables' RLS
create view public.author_code_stats with (security_invoker = on) as
  select c.code, c.title, c.owner_tg_id, count(w.tg_user_id)::int as people
  from public.author_codes c left join public.wishlist w on w.author_code = c.code
  group by c.code, c.title, c.owner_tg_id;
revoke all on public.author_code_stats from anon, authenticated;
