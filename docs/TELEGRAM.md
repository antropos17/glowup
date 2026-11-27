# Telegram: wishlist bot and the 1-day Mini App

Status on 2026-11-27: deployed. Bot [@glowupchallenge30bot](https://t.me/glowupchallenge30bot); Supabase project `glowup`, ref `mfpdgdiycjavoaoinvsz` (Frankfurt, free plan, org «antropos17's Org»); webhook and the «Играть» menu button set. The channel of the project is `t.me/glowupchallenge30`. Local secrets live outside the repository in `X:secrets` (`glowup-bot-token.txt`, `glowup-webhook-secret.txt`, `glowup-supabase-db-password.txt`, `glowup-bot.env`). The Mini App mode (`?demo=1`, back-to-chat button) reaches GitHub Pages only once this branch is merged and pushed.

## What runs where

| Piece | Where | Notes |
|---|---|---|
| Mini App | GitHub Pages, `https://antropos17.github.io/glowup/?demo=1` | The same `dist/index.html`. `?demo=1` cuts the demo after Day 1. Inside Telegram the page loads the Telegram SDK, calls `ready()` and `expand()`, shows the game alone and adds a «back to chat» button on the demo end screen. Outside Telegram nothing changes. |
| Bot | Supabase Edge Function `bot` (`server/supabase/functions/bot/`) | Telegram webhook. `logic.ts` is the pure logic (Vitest: `tests/bot.test.ts`), `index.ts` wires it to the database. |
| Data | Supabase Postgres, migration `0002_bot_wishlist.sql` | `wishlist` (Telegram user id, first creator code, date), `author_codes` (code, title, owner id, date), view `author_code_stats`. RLS on, no policies: only the service role reads and writes. |

The bot answers through the webhook response (`{"method":"sendMessage", …}` in the reply body), so the function never needs the bot token. The token is used only on your machine for `setWebhook` and the menu button, below. A future "the sequel is out" broadcast will need the token as a function secret; that is not built.

Creator link: `https://t.me/<bot_username>?start=<code>`. Bot usernames always end in `bot`; `t.me/glowupchallenge30` is a channel or group name, not a bot username, unless BotFather says otherwise.

## Bot commands

- `/start [code]`: adds the person to the wishlist. A known code is attached on the first `/start` and kept forever; a repeat `/start` changes nothing; an unknown code is ignored. Answers with a greeting and the «Играть день 1» button (`web_app` → `MINI_APP_URL`).
- `/stats`: a code owner sees the counts of their codes; an admin (`ADMIN_TG_IDS`) sees every code and the total; anyone else gets a short refusal.
- `/addcode <code> <title> [owner id]`: admin only. Code: Latin letters, digits, `_`, `-`, up to 32 characters, stored in lower case. The title may have several words; a trailing number is the owner's Telegram id.

Only private chats are answered. Any other text gets a short line and the play button.

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

## Not checked yet

- The function was never run on Deno or Supabase: only `logic.ts` is covered by tests; `index.ts` (database calls) is untested.
- The Mini App was tested in Chromium with a stub `window.Telegram.WebApp`, not in a real Telegram client or on a phone.
- Save after closing and reopening the Mini App relies on the WebView keeping `localStorage` for `antropos17.github.io`. Telegram clients normally keep it, but a client or the OS may clear WebView data.

## Out of scope

Bonus for a code, friend referrals, creator payouts, broadcasts, purchases (`verify-purchase` stays off), channel design.
