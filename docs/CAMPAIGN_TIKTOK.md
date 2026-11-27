# TikTok campaign plan: «Краш за 30», 4 weeks

Status: **accepted by Ruslan on 2026-11-27**. Nothing in it is published or sent yet. Related: `docs/NAME_AND_PROMO.md` (name, creator outreach, referral; draft), `docs/TELEGRAM.md` (bot and Mini App), `promo/shorts/README.md` (ready shorts).

Marks: **F** fact (checked in code or docs), **H** hypothesis, **T** taste. Every numeric target is a hypothesis: there is no data yet. Recompute the targets after week 1.

## 0. Inputs (Ruslan, 2026-11-27)

| Input | Answer |
|---|---|
| Market and language | Russia and the CIS, videos in Russian |
| Paid budget | up to $100 for tests |
| Duration | 4 weeks, 2026-11-30 to 2026-12-27, no fixed date |
| Time | 15+ hours a week |

Not decided by the authors, so not promised to anyone: the name (the bot still greets with «30 дней»), a bonus for a viewer who comes by a code, money or a share for creators.

## 1. Objective

Primary: **300 people in the bot wishlist in 4 weeks, at least half of them by creator codes (H).**

What the campaign must teach us: which source brings people more cheaply (our own channel or creators), and which video format leads people to the bot best.

## 2. Key messages

Core message (Ruslan's words): the hero says it himself, on camera: «Мы сделали игру по мотивам тренда «глоуап за 30 дней». Теперь в это можно сыграть. Демо — в канале».

| Message | Proof | Type |
|---|---|---|
| A game made from a trend you have already seen | the 30-day glow-up trend exists on TikTok and YouTube | F (web search 2026-11-27, `NAME_AND_PROMO.md`) |
| 30 real days, like a real challenge | days open by real local time | F |
| You can lose, and that is fine | light tone, no promise of winning | F (`CLAUDE.md`) |
| You choose what to reply to the crush | the chat has three reply buttons | F |

Call to action everywhere: **«Демо в канале».**

## 3. Funnel

| # | Step | What we count | Source | Measurable now |
|---|---|---|---|---|
| 1 | Video in the feed | views, completion, comments | TikTok Studio | yes |
| 2 | Profile visit | profile views | TikTok Studio | yes |
| 3 | Link in the TikTok bio goes to the channel `t.me/glowupchallenge30` | channel joins | Telegram channel statistics | **check** the subscriber threshold for statistics |
| 3a | Pinned channel post: «Играть демо» → bot | visits to the bot | `/stats` by the code in the post link | yes |
| 4 | `/start <code>` → wishlist | new people and their first code (kept forever, F) | `/stats`, Supabase `wishlist.created_at` | yes |
| 5 | «Играть день 1» | did the person open the Mini App | none | **no** |
| 6 | End of Day 1 | did they reach «Ты в списке…» | none | **no** |
| 7 | After that | they wait for the sequel. There is no broadcast, though the screen says «Бот напишет» (F) | none | not built |

Source tracking without bot changes: the weekly code (`tt-w1`, `tt-w2`, …) sits in the link of the pinned channel post; change the link every Monday. At this stage almost all new channel subscribers come from TikTok (H), so the weekly code covers them. Per-video tracking is not possible.

Creators: their link goes straight to the bot with their code, otherwise their share cannot be counted. A channel link cannot carry a code (F: channel links have no `start` parameter), so creators are advised to use the bot link.

## 4. Creator codes

**Who:** micro creators with 5–50k followers (H: they answer unpaid more often), kind tone, Russia and the CIS. The four segments of `NAME_AND_PROMO.md`: before/after glow-up challenges, relationships and dating, BitLife-type let's plays, self-care and gym. 40 letters in 4 weeks.

**What we can honestly offer in the demo stage:**
- a ready series with the hook «день 12, ответит ли она?»;
- their own code with a live count in `/stats`;
- early access to Day 8 and later, only after the texts are reviewed (they are not yet, F);
- their name in the credits, only if Ruslan decides so (no credits screen exists).

**Not promised:** money, a share, a bonus for viewers. None of these is decided or built (F).

**Order for the first 5–10 creators:**
1. The first 2–3 are people Ruslan knows: they test the whole chain. Then 5–7 cold contacts.
2. Ruslan sends the letter himself, from the template in `NAME_AND_PROMO.md` with the name «Краш за 30».
3. The creator agrees → writes `/start` to the bot → Ruslan finds their id (the newest row in Supabase `wishlist`) → `/addcode <nick> <Name> <id>` → the bot replies with the link; Ruslan forwards it. The owner must be set at once: a repeated `/addcode` on the same code is refused and there is no "change owner" command (F).
4. The creator puts the link in their bio or a pinned comment and checks `/stats` themselves.
5. After 72 hours Ruslan records their views (from the creator's screenshot) and the `/stats` count in the creator table.

## 5. Pace and calendar

On 15+ hours a week: 5 videos in week 1, then 7 a week (H). 26 videos in total.

| Kind | Per week (weeks 2–4) | How |
|---|---|---|
| **Hero on camera**: live frame, Andrey says the core message, game inserts, end card «Демо в канале» | 2 | main format |
| «Что ответить крашу?»: the game chat and three options, «пиши 1/2/3» | 3 | the cheapest format, collects comments (H); ends with «демо в канале» |
| Follow-up «вы выбрали 2, вот что ответила Алина» | 1 | the series hook; ends with «демо в канале» |
| Drawn (HyperFrames) | 1 | the three ready shorts already end on «Демо — в канале» (F, `promo/shorts/README.md`) |

| Week | Videos | Creators | Code in the pinned post | Other |
|---|---|---|---|---|
| 1 (30.11–06.12) | 3 drawn (ready) + 2 hero on camera | 10 letters, 2–3 known creators with codes | `tt-w1` | funnel check on a phone |
| 2 (07–13.12) | 3 «ответ» + 1 follow-up + 2 hero + 1 drawn | 15 more letters | `tt-w2` | first recompute of the targets |
| 3 (14–20.12) | the same, double the best format | 15 more letters, follow-ups to those who answered | `tt-w3` | **$100:** the 2 best videos, $50 each via Promote, bot links `ad-a` / `ad-b` |
| 4 (21–27.12) | the same, pre-New Year themes (T) | creator results | `tt-w4` | final report, decision on paying creators |

If the session making the live shorts has not added the «по мотивам тренда» line yet, pass it on through the main chat.

## 6. Measurement

| Metric | Target (H) | Source | How often |
|---|---|---|---|
| **Primary: people in the wishlist** | cumulative: week 1 ≥20, week 2 ≥60, week 3 ≥150, week 4 ≥300 | `/stats` (admin), SQL by day and code in Supabase | glance daily, review on Mondays |
| Share of people by creator codes | ≥50% | `/stats` | Monday |
| Wishlist people per 1000 views | ≥3 | Supabase ÷ TikTok Studio | Monday |
| Median views of an own video at 72 h | ≥1000 by week 4 | TikTok Studio | Monday |
| Creators: written / answered / posted with a code | 40 / ≥8 / ≥5 | creator table + `/stats` | Monday |
| Cost per person in the paid test | ≤$0.5; above $1 the test is not extended | Promote + `ad-*` codes | end of week 3 |

### What cannot be measured now, and what it needs

| Gap | What to build |
|---|---|
| Mini App opens and the end of Day 1 | a small events table and `opened` / `day1_done` writes from the Mini App, checked by `initData` (separate session) |
| The promise «Бот напишет, когда выйдет продолжение» | a broadcast to the wishlist; it needs the bot token as a function secret (F: not built) |
| Which video brought a person | not possible; weekly codes only |
| Clicks on the bio link | depend on the TikTok account type; check |

## 7. Risks

| Risk | Mitigation |
|---|---|
| In Russia TikTok may not show new videos, and Promote may not reach a Russian audience (H: so it was from 2022; not checked now) | on day 1 ask someone with a Russian SIM to find our video. If it is not visible, TikTok works for the CIS and Russia moves to other platforms (outside this plan) |
| The bio link may not be clickable on a personal account with few followers (H) | check; if so, switch to a business account, or put the channel name as text and pin a comment with the link |
| The bot greets with «Это «30 дней»», the videos say «Краш за 30» (F) | decide the name or change the bot greeting (one line, only with Ruslan's yes) |
| The Mini App was never checked in a real Telegram client on a phone (F, `TELEGRAM.md`) | walk the whole funnel before the first video of week 1 |
| Day 1 follows real local time (F); a person who arrives at night may see something odd | check during the funnel walk |
| The channel has no pinned post with a button to the bot, people get lost at step 3a | make the pinned post before the first video (Ruslan publishes it) |
| Creators do not respond without money | 40 letters instead of 10; decide on payment at the end of week 3 |
| Russian advertising law: a paid integration must be labelled and registered (erid) (F); barter may count too | ask a lawyer before the first payment or barter |
| TikTok rules: a realistic AI person on camera needs the AI-generated label (F, TikTok rules; check the current wording) | the "AI-generated" label on every Higgsfield video and every video with the ElevenLabs voice. No fake engagement, no reviews from our own accounts, no promise like «точно понравишься» |

## 8. First three days

| Day | What to do |
|---|---|
| Fri 27.11 | check whether a video is visible from Russia; check that the bio link is clickable; `/addcode tt-w1 …`; put the channel link in the TikTok bio; draft the pinned channel post with `t.me/glowupchallenge30bot?start=tt-w1` (Ruslan publishes) |
| Sat 28.11 | walk the funnel on a phone: TikTok → channel → bot → «Играть день 1» → end of the day; build the table of 40 creators (nick, segment, followers, tone, contact); decide the bot greeting |
| Sun 29.11 | captions and the AI label for the 5 videos of week 1, scheduled; send the first 10 letters (Ruslan himself) |
