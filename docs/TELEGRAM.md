# Telegram: wishlist bot and the 1-day Mini App

Status on 2026-11-27: deployed. Bot [@glowupchallenge30bot](https://t.me/glowupchallenge30bot); Supabase project `glowup`, ref `mfpdgdiycjavoaoinvsz` (Frankfurt, free plan, org «antropos17's Org»); webhook and the «Играть» menu button set. The channel of the project is `t.me/glowupchallenge30`. Local secrets live outside the repository in `X:secrets` (`glowup-bot-token.txt`, `glowup-webhook-secret.txt`, `glowup-supabase-db-password.txt`, `glowup-bot.env`). The Mini App mode (`?demo=1`, back-to-chat button) reaches GitHub Pages only once this branch is merged and pushed.

Bot v2 (button menu, reviews to the community group, vote link, scheduled channel posts, broadcasts) is written and unit-tested, not deployed: see "Deploy v2" below.

## What runs where

| Piece | Where | Notes |
|---|---|---|
| Mini App | GitHub Pages, `https://antropos17.github.io/glowup/?demo=1` | The same `dist/index.html`. `?demo=1` cuts the demo after Day 1. Inside Telegram the page loads the Telegram SDK, calls `ready()` and `expand()`, shows the game alone and adds a «back to chat» button on the demo end screen. Outside Telegram nothing changes. |
| Bot | Supabase Edge Function `bot` (`server/supabase/functions/bot/`) | `POST /bot`: Telegram webhook. `POST /bot/tick`: the scheduler run (v2). `logic.ts` is the pure logic (Vitest: `tests/bot.test.ts`), `index.ts` wires it to the database and the Bot API. |
| Data | Supabase Postgres, migrations `0002_bot_wishlist.sql` and `0003_bot_v2.sql` | Tables below. RLS on, no policies: only the service role reads and writes. |
| Scheduler (v2) | `pg_cron` + `pg_net` in the same Postgres | Calls `/bot/tick` every minute. Set up by hand, "Deploy v2" step 6. |

The bot answers through the webhook response (`{"method":"sendMessage", …}` in the reply body). v1 (`/start`, `/stats`, `/addcode`) never needs the bot token. v2 (the button menu, reviews, the vote link, channel posts, broadcasts) needs it as the function secret `TELEGRAM_BOT_TOKEN`: it answers button presses (`answerCallbackQuery`), posts to the group and the channel, and sends broadcasts. **Without that secret the bot behaves exactly like v1**: the greeting has the play button only, buttons and pictures are ignored, and the admin commands of v2 answer the admin with one line saying the token is missing. The token is read only in `index.ts`, kept inside the Bot API client and never logged; a network error is reported as a fixed text, because Deno's fetch error message can contain the request URL with the token.

### Tables

| Table | From | Contents |
|---|---|---|
| `author_codes` | 0002 | creator code, title, owner's Telegram id, date |
| `wishlist` | 0002, 0003 | Telegram user id, first creator code, date; `blocked_at` (0003): set when a broadcast got HTTP 403, cleared by a new `/start` |
| view `author_code_stats` | 0002 | people per code |
| `bot_sessions` | 0003 | one unfinished review per person: kind, text, picture `file_id`, time. Dropped by a command, a menu button, «Отмена», delivery, or after 30 minutes |
| `reviews` | 0003 | every delivered review or bug: user id, kind, `public` or `authors`, text, picture `file_id`, time. No names are stored |
| `bot_settings` | 0003 | key-value; today only `vote_url` |
| `channel_posts` | 0003 | the channel queue: text, picture (`file_id` or https URL), `publish_at`, status `queued` → `sending` → `sent` / `failed`, error, `message_id` |
| `broadcasts` | 0003 | text, admin, status `draft` → `running` → `done` (or `cancelled`), `cursor_tg_id`, counts sent / blocked / failed, `lease_until`. A unique index allows one `running` broadcast at a time |

Creator link: `https://t.me/<bot_username>?start=<code>`. Bot usernames always end in `bot`; `t.me/glowupchallenge30` is a channel or group name, not a bot username, unless BotFather says otherwise.

## The 1-day funnel (`?demo=1` only)

`?demo=1` is also the funnel for TikTok traffic (`src/funnel.ts`, `src/ui/Funnel.tsx`, `src/styles/funnel.css`). Only this exact value turns it on; no `?demo`, `?demo=7` and `?full` keep the game as before.

- Intro: four short screens before the hero pick, skippable, shown once (`localStorage` key `glowup.introSeen`).
- Day 1 beats: animated pictures for the class chat invite, the mirror, the first message (or the like) and the first look at the chance; the Day 1 card rows come in one by one. Off under `prefers-reduced-motion`.
- The demo ends as soon as the player goes to sleep on Day 1 (the 7-day demo still waits for the next morning). Then: the day card, a cliffhanger (the crush's status from the night card, «in four days the phone rings and it is her» — true on every path, K5-08a…d — and Days 2–7 from `content/days.json` with blurred teasers), then the end screen.
- End screen outside Telegram: «Записаться в вишлист» opens `https://t.me/glowupchallenge30bot?start=<code>`, the code taken from `?ref=` or `?code=` (sanitized to `[a-z0-9_]`, max 32), or plain `?start`. Inside Telegram: «already on the list», «Позвать друга» (the Telegram share picker with the bot link) and «Вернуться в чат». The two main buttons are equal.
- Creator link for TikTok: `https://antropos17.github.io/glowup/?demo=1&ref=<code>`; the code must also exist in the bot (`/addcode`) to be counted.

## Bot commands

- `/start [code]`: adds the person to the wishlist. A known code is attached on the first `/start` and kept forever; a repeat `/start` changes nothing; an unknown code is ignored. Answers with a greeting and the «Играть день 1» button (`web_app` → `MINI_APP_URL`); in v2 with the whole button menu. In v2 a new `/start` also clears the "blocked the bot" mark and any command drops an unfinished review.
- `/stats`: a code owner sees the counts of their codes; an admin (`ADMIN_TG_IDS`) sees every code and the total; anyone else gets a short refusal.
- `/addcode <code> <title> [owner id]`: admin only. Code: Latin letters, digits, `_`, `-`, up to 32 characters, stored in lower case. The title may have several words; a trailing number is the owner's Telegram id.

Only private chats are answered. Any other text gets a short line and the play button (v1) or the menu (v2).

### v2: the button menu (needs `TELEGRAM_BOT_TOKEN` and `callback_query` in the webhook)

The v2 greeting is its own short text in HTML (bold title) with the picture `promo/botfather/description.png` shown above it as a link preview from `raw.githubusercontent.com/antropos17/glowup/main/…`. The picture appears only after the branch is merged and pushed to `main`; until then, or if GitHub does not answer, the greeting arrives without it. Messages that show the person's own text (published reviews, reviews to the authors) use HTML with that text escaped and quoted in a `<blockquote>`; channel posts and broadcasts go out as plain text.

Under the greeting and under any unknown text:

| Button | What happens |
|---|---|
| ▶️ Играть день 1 | `web_app` → `MINI_APP_URL`, as in v1 |
| 🗳 Голосование | The authors run the vote themselves as a native Telegram poll in the channel and give the bot its link with `/setvote`. The button answers with a «Голосовать» link to that post, or, with no current vote, a line that the next one will be announced in the channel. A vote changes nothing for a particular player (DECISIONS.md, decision 6): it only steers what the authors write next. |
| ✍️ Отзыв или баг | «Отзыв» or «Баг» → one message: text, or a picture with an optional caption → before anything is sent, the bot says a published message is seen by everyone in the chat → «Опубликовать в чате» posts it to `@glowup30chat` (`-1006027132870`), topic «Отзывы» (thread 3) or «Баги» (thread 4), signed with the Telegram **first name only** (no last name, username or id); «Только авторам» sends it in private to every id in `ADMIN_TG_IDS`, signed with the first name and the user id; «Отмена» sends nothing. Limit: 3 delivered reviews or bugs per person in 24 hours; text up to 3000 characters, a caption up to 900. If delivery fails, the bot says so and the same button can be pressed again. |
| 💬 Канал и чат | links to `t.me/glowupchallenge30` and `t.me/glowup30chat` |
| 🎁 Моя награда | "you are on the list since <date>; the bot will write when the sequel is out; a cosmetic reward for the hero is planned for people on the list, it gives no coins or energy and does not touch the chance; no date yet". Nothing else is promised. |

### v2: admin commands (`ADMIN_TG_IDS` only)

Times are Baku time (UTC+4).

- `/setvote <https://t.me/…>`: the link of the current vote post. `/setvote off` removes it.
- `/post YYYY-MM-DD HH:MM <text>`: adds a channel post to the queue. To post a picture, send the picture with this command as its caption (caption up to 1024 characters, text up to 4096). Rows can also be added by SQL with `photo` as an https URL.
- `/posts`: the next 10 queued posts. `/delpost <number>`: removes a queued post.
- `/broadcast <text>`: the bot sends the admin the exact message people will get (with a «▶️ Играть» button), then the number of recipients and «Отправить» / «Отмена». Nothing is sent before «Отправить». A second broadcast is refused while one runs. When it ends, the admin gets: sent, blocked the bot, failed.

### v2: scheduler and its limits

Choice: Supabase Cron (`pg_cron`) with `pg_net`, calling `POST /bot/tick` every minute with the header `X-Cron-Secret` (the function secret `CRON_SECRET`, also kept in Supabase Vault). This is the pattern of the Supabase guide "Scheduling Edge Functions" (checked through Context7 on 2026-11-27). Both extensions are available on the Free plan.

Each run:
1. posts every due channel post (up to 10 a run, so at most one minute late): `queued` → `sending` before the send, so two runs never post the same item; then `sent` with the message id, or `failed` with the Bot API error. A failed post is never retried; fix it and add it again.
2. continues the running broadcast: at most 25 messages a second (one send every 40 ms; Telegram's free limit is about 30 a second, core.telegram.org/bots/faq). A 429 is waited out (`retry_after`) and the same person is tried again, up to 3 attempts; if the wait does not fit the run, the next run starts with that person. 403 (blocked the bot, deleted account) marks `wishlist.blocked_at` and is skipped next time. Any other error counts as failed and moves on.

Time limit: a run starts no new send after **40 seconds**, far below the Free-plan Edge Function wall-clock limit (150 s, 400 s on paid plans; the Supabase "Edge Functions limits" page, from memory: Context7 did not return that page, recheck it). The position (`cursor_tg_id`) is saved every 20 recipients and at the end of the run, so a crash repeats at most 20 messages. A run holds the broadcast with `lease_until` = now + 120 s; a crashed run is resumed by a later one after the lease. Throughput: about 1000 messages a minute at best, less with a slow Bot API (each send waits for its answer). Invocations: 1440 a day, about 44 000 a month, well inside the Free plan's 500 000.

The `pg_net` timeout in step 6 is 60 s, longer than a run (40 s plus the post sends), so `pg_net` never gives up on a run that is still working.

## Deploy, step by step (PowerShell)

You need: a Supabase account, Node.js (for `npx supabase`), the bot created in BotFather, and the token saved in a local file outside the repository. Run everything from the repository root. Never paste the token into a chat, a commit or a screenshot.

### 1. Supabase project

Create a project at https://supabase.com/dashboard (any region close to the players, for example Frankfurt). Note its reference id: the `xxxx` in `https://xxxx.supabase.co`.

```powershell
npx supabase login
```

```powershell
$ref = '<project-ref>'
```

```powershell
npx supabase link --project-ref $ref --workdir server
```

### 2. Database

```powershell
npx supabase db push --linked --workdir server
```

This applies both migrations: `0001_init.sql` (the save and purchase tables of the game, unused for now) and `0002_bot_wishlist.sql`.

### 3. Secrets of the function

Your own Telegram id goes into `ADMIN_TG_IDS` (several ids: comma-separated). To find it before the webhook is set: write anything to the bot, then

```powershell
$token = (Get-Content -Raw '<path-to-token-file>').Trim()
```

```powershell
(Invoke-RestMethod "https://api.telegram.org/bot$token/getUpdates").result | ForEach-Object { $_.message.from.id }
```

Generate the webhook secret (Telegram allows `A-Z a-z 0-9 _ -`, hex fits):

```powershell
$b = New-Object byte[] 32; [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b); $secret = ($b | ForEach-Object { $_.ToString('x2') }) -join ''
```

```powershell
npx supabase secrets set --workdir server --project-ref $ref "TELEGRAM_WEBHOOK_SECRET=$secret" "MINI_APP_URL=https://antropos17.github.io/glowup/?demo=1" "ADMIN_TG_IDS=<your-id>" "BOT_USERNAME=<bot_username>"
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided to every function by Supabase; do not set them.

### 4. Deploy the function

Telegram sends no Supabase JWT, so JWT verification is off for this function; the secret header protects it instead.

```powershell
npx supabase functions deploy bot --no-verify-jwt --use-api --workdir server --project-ref $ref
```

### 5. Point Telegram at the function

Same PowerShell window (it still has `$token`, `$secret`, `$ref`):

```powershell
Invoke-RestMethod -Method Post -Uri "https://api.telegram.org/bot$token/setWebhook" -ContentType 'application/json' -Body (@{ url = "https://$ref.supabase.co/functions/v1/bot"; secret_token = $secret; allowed_updates = @('message'); drop_pending_updates = $true } | ConvertTo-Json)
```

Check: `pending_update_count` should be 0 and there should be no `last_error_message`.

```powershell
Invoke-RestMethod "https://api.telegram.org/bot$token/getWebhookInfo" | Select-Object -ExpandProperty result
```

### 6. Menu button and Mini App address

Either in BotFather: `/mybots` → the bot → Bot Settings → Menu Button → send the URL `https://antropos17.github.io/glowup/?demo=1` → send the button title (for example «Играть»).

Or with the API (UTF-8 body, so the Russian title survives Windows PowerShell 5.1):

```powershell
$body = @{ menu_button = @{ type = 'web_app'; text = 'Играть'; web_app = @{ url = 'https://antropos17.github.io/glowup/?demo=1' } } } | ConvertTo-Json -Depth 4
```

```powershell
Invoke-RestMethod -Method Post -Uri "https://api.telegram.org/bot$token/setChatMenuButton" -ContentType 'application/json; charset=utf-8' -Body ([Text.Encoding]::UTF8.GetBytes($body))
```

Optional: BotFather → Bot Settings → Configure Mini App → Enable Mini App, same URL. This adds an «Open app» button to the bot profile.

### 7. First creator code and a smoke test

In the bot chat, from the admin account:

```
/addcode test Проверка
/start test
/stats
```

`/stats` should show `test (Проверка): 1` only if this account was not on the list yet: the first `/start` keeps its code forever. Then open the play button: the game should fill the screen, without the showcase page around it.

When done, close the PowerShell window so `$token` is gone.

## Deploy v2 (PowerShell)

Written on 2026-11-27; nothing below has been run. Every step marked **[Ruslan]** needs Ruslan's direct yes and is done by him or under his eyes. The order matters: until step 5 the deployed function behaves exactly like v1, so steps 1–4 can be done at any pace without breaking the live bot. Run from the repository root, after the v2 branch is merged.

Open one PowerShell window and load the values (paths to your own files in `X:\secrets`; never paste the token itself into a chat, a commit or a screenshot):

```powershell
$ref = 'mfpdgdiycjavoaoinvsz'
```

```powershell
$token = (Get-Content -Raw '<path-to-token-file>').Trim()
```

```powershell
$secret = (Get-Content -Raw '<path-to-webhook-secret-file>').Trim()
```

1. **[Ruslan] Database.** Applies `0003_bot_v2.sql` (new tables, `wishlist.blocked_at`). `0001` and `0002` are already applied and are skipped.

   ```powershell
   npx supabase db push --linked --workdir server
   ```

2. **[Ruslan] Deploy the function.** Without `TELEGRAM_BOT_TOKEN` it still answers exactly like v1.

   ```powershell
   npx supabase functions deploy bot --no-verify-jwt --use-api --workdir server --project-ref $ref
   ```

3. **[Ruslan] Webhook with button presses.** Same URL and secret as before, plus `callback_query`:

   ```powershell
   Invoke-RestMethod -Method Post -Uri "https://api.telegram.org/bot$token/setWebhook" -ContentType 'application/json' -Body (@{ url = "https://$ref.supabase.co/functions/v1/bot"; secret_token = $secret; allowed_updates = @('message', 'callback_query') } | ConvertTo-Json)
   ```

   Check: `allowed_updates` shows both, no `last_error_message`.

   ```powershell
   Invoke-RestMethod "https://api.telegram.org/bot$token/getWebhookInfo" | Select-Object -ExpandProperty result
   ```

4. **[Ruslan] Rights in Telegram.** In the channel `t.me/glowupchallenge30`: Administrators → add `@glowupchallenge30bot` with the right «Публикация сообщений» (Post messages) only. In `@glowup30chat` the bot is already an admin; check that it may send messages in the topics «Отзывы» and «Баги».

5. **[Ruslan] Secrets: the bot token and the scheduler secret.** This switches v2 on. Generate the scheduler secret and save it next to the other secrets in `X:\secrets`, outside the repository:

   ```powershell
   $b = New-Object byte[] 32; [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b); $cron = ($b | ForEach-Object { $_.ToString('x2') }) -join ''
   ```

   ```powershell
   npx supabase secrets set --workdir server --project-ref $ref "TELEGRAM_BOT_TOKEN=$token" "CRON_SECRET=$cron"
   ```

   Supabase hands new secrets to the function without a redeploy; if `/start` still shows only the play button after a minute, repeat step 2. To switch v2 off again: `npx supabase secrets unset --workdir server --project-ref $ref TELEGRAM_BOT_TOKEN`.

6. **[Ruslan] Scheduler.** Supabase dashboard → SQL Editor, replace `<CRON_SECRET>` with the value of `$cron` (print it with `$cron` in the same window) and run once. The secret and the URL go into Supabase Vault, so the job text holds neither.

   ```sql
   create extension if not exists pg_cron;
   create extension if not exists pg_net;
   select vault.create_secret('https://mfpdgdiycjavoaoinvsz.supabase.co/functions/v1/bot/tick', 'bot_tick_url');
   select vault.create_secret('<CRON_SECRET>', 'bot_cron_secret');
   select cron.schedule('glowup-bot-tick', '* * * * *', $$
     select net.http_post(
       url := (select decrypted_secret from vault.decrypted_secrets where name = 'bot_tick_url'),
       headers := jsonb_build_object(
         'Content-Type', 'application/json',
         'X-Cron-Secret', (select decrypted_secret from vault.decrypted_secrets where name = 'bot_cron_secret')),
       body := '{}'::jsonb,
       timeout_milliseconds := 60000
     );
   $$);
   ```

   Check after two minutes: the runs succeed and the function answers 200 with `{"posts":…,"broadcast":…}`.

   ```sql
   select status, return_message, start_time from cron.job_run_details order by start_time desc limit 5;
   select status_code, content, created from net._http_response order by created desc limit 5;
   ```

   To stop the scheduler: `select cron.unschedule('glowup-bot-tick');`.

7. **[Ruslan] BotFather.** Name, about, description, description picture and the command list from `promo/botfather/README.md` (picture: `promo/botfather/description.png`).

8. **[Ruslan] Live smoke test** in a real Telegram client on a phone, from the admin account and from a second, non-admin account:
   - [ ] `/start` shows the greeting and five buttons; «▶️ Играть день 1» opens the game.
   - [ ] Every button answers at once, without a long loading spinner.
   - [ ] «💬 Канал и чат» opens both.
   - [ ] «🎁 Моя награда» shows the date you joined and the cosmetic line.
   - [ ] «🗳 Голосование» says there is no vote; after `/setvote <link to a poll post>` it shows «Голосовать» with that link; `/setvote off` hides it again.
   - [ ] Second account: a review with «Опубликовать в чате» appears in topic «Отзывы» with the first name only; a bug with a screenshot appears in «Баги» as a photo.
   - [ ] Second account: «Только авторам» reaches the admin in private and nothing appears in the group.
   - [ ] The fourth review within 24 hours is refused.
   - [ ] `/post <today, two minutes ahead> Тест` (and a picture with such a caption): both appear in the channel within a minute of the time; `/posts` no longer lists them. Delete the test posts in the channel afterwards.
   - [ ] `/broadcast Тест` with a wishlist of 1–2 test people (on a live list, do this only with a real message): preview, «Отправить», delivery, the final count to the admin.
   - [ ] Second account blocks the bot, run another broadcast: the count shows 1 blocked; unblock and `/start`: the next broadcast reaches it again.
   - [ ] `/stats` and `/addcode` answer as before.

When done, close the PowerShell window so `$token`, `$secret` and `$cron` are gone.

## Not checked yet

- v2 (2026-11-27): only the pure logic in `logic.ts` is tested (Vitest, with an in-memory store, a fake Bot API and a fake clock). `index.ts` (the database queries of 0003, the Bot API client, the `/tick` route), the migration `0003_bot_v2.sql`, the cron SQL and everything in a real Telegram client are untested. Deno is not installed on the development machine, so `index.ts` was not type-checked either.
- v1: only `logic.ts` is covered by tests; `index.ts` (database calls) has no automated test and is checked only by the live bot.
- The Mini App was tested in Chromium with a stub `window.Telegram.WebApp`, not in a real Telegram client or on a phone.
- Save after closing and reopening the Mini App relies on the WebView keeping `localStorage` for `antropos17.github.io`. Telegram clients normally keep it, but a client or the OS may clear WebView data.

## Out of scope

Bonus for a code, friend referrals, creator payouts, purchases and Telegram Stars (`verify-purchase` stays off), any reward that touches coins, energy, affinity or the chance, the "small bonus" for the wishlist (not decided), polls run by the bot itself, moderation tools, a post editor UI, channel design.
