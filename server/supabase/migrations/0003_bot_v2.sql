-- Telegram bot v2: menu state, reviews, vote link, channel post queue, broadcasts. Steps in docs/TELEGRAM.md, "Deploy v2".
-- Personal data stays minimal: Telegram user ids and what people chose to send. No names or usernames are stored;
-- a published review shows the first name taken from the Telegram update at the moment of sending.
-- Only the bot function (service role key) reads and writes these tables.

-- a person who blocked the bot (HTTP 403 on a broadcast) is skipped next time; a new /start clears the mark
alter table public.wishlist add column blocked_at timestamptz;

-- one unfinished review or bug report per person; a /start, any command or a menu button removes it
create table public.bot_sessions (
  tg_user_id    bigint primary key,
  state         text not null check (state in ('await_content', 'await_visibility')),
  kind          text not null check (kind in ('review', 'bug')),
  body          text not null default '',
  photo_file_id text,
  updated_at    timestamptz not null default now()
);

-- every review or bug that was delivered, to the chat or to the authors only
create table public.reviews (
  id            bigint generated always as identity primary key,
  tg_user_id    bigint not null,
  kind          text not null check (kind in ('review', 'bug')),
  visibility    text not null check (visibility in ('public', 'authors')),
  body          text not null default '',
  photo_file_id text,
  created_at    timestamptz not null default now()
);
-- the daily cap counts a person's reviews of the last 24 hours
create index reviews_user_time on public.reviews (tg_user_id, created_at);

-- small key-value settings; today only 'vote_url', the link to the current poll post in the channel
create table public.bot_settings (
  key        text primary key,
  value      text not null,
  updated_at timestamptz not null default now()
);

-- the channel post queue; the scheduler posts what is due and marks it, a failed post is not retried
create table public.channel_posts (
  id         bigint generated always as identity primary key,
  body       text not null default '',
  -- a Telegram file_id (a picture sent with /post) or an https URL (a row added by SQL)
  photo      text,
  publish_at timestamptz not null,
  status     text not null default 'queued' check (status in ('queued', 'sending', 'sent', 'failed')),
  error      text,
  message_id bigint,
  sent_at    timestamptz,
  created_at timestamptz not null default now()
);
create index channel_posts_due on public.channel_posts (publish_at) where status = 'queued';

-- broadcasts to the wishlist; the scheduler sends them in chunks and continues from cursor_tg_id
create table public.broadcasts (
  id           bigint generated always as identity primary key,
  admin_tg_id  bigint not null,
  body         text not null,
  status       text not null default 'draft' check (status in ('draft', 'running', 'done', 'cancelled')),
  -- recipients go in ascending tg_user_id order; everyone up to this id has been handled
  cursor_tg_id bigint not null default 0,
  sent         int not null default 0,
  blocked      int not null default 0,
  failed       int not null default 0,
  -- a scheduler run holds the broadcast until this time, so two runs never send the same chunk
  lease_until  timestamptz,
  created_at   timestamptz not null default now(),
  finished_at  timestamptz
);
-- at most one running broadcast: a second start fails with a unique violation
create unique index broadcasts_one_running on public.broadcasts ((true)) where status = 'running';

-- RLS on and no policies: anon and authenticated get nothing, the service role bypasses RLS
alter table public.bot_sessions enable row level security;
alter table public.reviews enable row level security;
alter table public.bot_settings enable row level security;
alter table public.channel_posts enable row level security;
alter table public.broadcasts enable row level security;
revoke all on public.bot_sessions, public.reviews, public.bot_settings, public.channel_posts, public.broadcasts
  from anon, authenticated;
