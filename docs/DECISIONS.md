# Author decisions

Decisions confirmed by Ruslan in the coordinator chat. They override "proposed" and "open" items in `DESIGN.md`, `DEMO_SCRIPT.md` and `HANDOFF.md`. Newest first.

## 2026-11-23 — Day 6 «Первый разговор»

| # | Question | Decision |
|---|---|---|
| 20 | The reply to Alina | Three buttons, each label is the exact message Andrey sends. Dry («Да, записывай.»): the chance does not move. Plain with a question back: +5. The third depends on confidence: with enough confidence a short joke, +8; with low confidence a long excuse, −5. There is no «не приду» and no evasive answer. The confidence threshold is chosen after the Day 6 session reports, from engine paths, what share of players has the joke open. |
| 21 | When the conversation happens | It is stretched over the day. Andrey replies in the morning and sees «прочитано»; Alina answers in the evening, with a short live exchange that ends on «Ладно, мне пора. Увидимся на встрече, наверное». |
| 22 | Day 6 skipped entirely | Andrey sent the dry reply himself; in the evening she writes «Ок, записала» and the goodbye. No bonus and no penalty. This is an exception to "a neutral choice does not write to the crush": a day of silence on a direct question would be worse than any reply. |
| 23 | The "trendy look" trap | Free. Andrey puts the look together from his own wardrobe; nothing is bought, so the rule "the exact effect of a purchase is visible before paying" is not touched. |
| 24 | The Day 7 shave | Open to everyone. The beard hint only tells the player what Alina likes; it does not gate the choice. |
| 25 | The joke threshold | `conf` ≤ 75 stays (K6-01, written twice: `lte` and its negation). |
| 26 | The joke invents a past | Kept: Andrey sang at the graduation, badly and loudly. Day 7 and later days may refer to it. |
| 27 | «Ты мне, кстати, странное писал» after the dry reply or the excuse | Not given on Day 6. Row 22 stands: only the short answer and the goodbye. The line moves to Day 7 for that player. |
| 28 | Saturday at «Зерно» | Stays as written: only the player who reached the live exchange hears it. |

The full Day 6 design is in `DEMO_SCRIPT.md`, sections 3 and 5f. Rows 20–24 were confirmed before the day was written; rows 25–28 answer the questions of the session that wrote it.

## 2026-11-23 — Day 5 «Соседка»

| # | Question | Decision |
|---|---|---|
| 17 | What the cream from Sadovaya gives (closes row 12) | It is a shaving cream for problem skin, not a skin course. It does not treat acne. With it the Day 7 shave goes cleanly; without it shaving over acne leaves the face irritated before the meeting in «Зерно». The `cream_zina` item in `content/items.json` (today: skin −2 for 10 days) is rewritten when Day 5 is written. |
| 18 | The dentist | The cleaning is free, by the insurance policy, and costs energy only. It is available only to the player who booked on Day 1. If Day 5 is skipped entirely, Andrey went to the cleaning himself, as he went to the doctor on a skipped Day 3. |
| 19 | Alina's night message | One button, «Ответишь утром». There is no reply at night; the reply belongs to Day 6. |

The full Day 5 design is in `DEMO_SCRIPT.md`, section 3. Items there marked "proposed" came from the same discussion and were not objected to; rows 17–19 were confirmed explicitly.

## 2026-11-23 — Day 4 «Обычная энергия»

| # | Question | Decision |
|---|---|---|
| 13 | Mistakes at zero energy | No error chance and no dice. Resisting a temptation costs energy, the price is written on the button, and giving in is free. This replaces the grid line "at zero energy actions carry an error chance". The free "give in" choice is also the neutral choice for a skipped day. |
| 14 | Energy floor | None. Hangovers stack honestly (miracle tea −2, late night −4 can leave 4 energy for the day); every card keeps a free choice. |
| 15 | Stayed home, no pies in the fridge | That player gets a quiet evening scene: a call from mum. The evening must not be empty. |
| 16 | Alina on Day 4 | She reacts to Vitya's barbecue photo in the class chat, a visible cause, not a hidden "good day" rule. |

The full Day 4 design is in `DEMO_SCRIPT.md`, section 3. Items there marked "proposed" came from the same discussion and were not objected to; rows 13–16 were confirmed explicitly.

## 2026-11-23 — Day 3 «Не та дверь»

| # | Question | Decision |
|---|---|---|
| 9 | Alina's first like | It has a visible cause. With two or more useful actions over days 1–3 an evening card offers to post a photo; if Andrey posts, the like arrives at night and the reason line reads «+5: Алина лайкнула твоё фото». It never arrives by a hidden rule. |
| 10 | Day 3 skipped entirely | Andrey went to office 12 by himself and the doctor's course started. The skip is already paid for by the regress of the problems. |
| 11 | Strength of the doctor's course | Skin −3 each morning for 10 days (the demo sees 4 of them, −12 by day 7). |
| 12 | Cream from Sadovaya (`cream_zina`, day 5) | It must give something other than a second skin course of the same kind. What exactly is open; decide when Day 5 is written. Its current effect in `content/items.json` (skin −2 for 10 days) is to be replaced then.  Closed by row 17. |

The full Day 3 design is in `DEMO_SCRIPT.md`, section 3. Items there marked "proposed" came from the same discussion and were not objected to, but only rows 9–12 were confirmed explicitly.

## 2026-11-22

| # | Question | Decision |
|---|---|---|
| 1 | Hero in the 7-day demo | Andrey only. No hero selection screen and no heroine texts in the demo; she is added after the demo on the same template. |
| 2 | Real-money purchases in the demo | None. Coins are only earned in the game. `verify-purchase` stays off. |
| 3 | A whole day skipped | The story resolves itself neutrally: skipped story cards are played automatically with their calmest option, and the player sees a short «пока тебя не было» summary. Problems still regress as today. Story days do not shift. |
| 4 | Chance scale swings | Plus-menu actions move the chance by 1–2 points. Story beats with Alina move it more through `affinity`: seen-no-reply −4, first like +5, first message +6, good reply +5 to +8, bad reply −5. |
| 5 | Smoking | No seventh problem. Smoking works through `care` («Уход и запах»): a cigarette worsens it, smoke-free days improve it. The `smoke_free` counter is shown to the player. |
| 6 | Red lines (`DESIGN.md` section 12) | All confirmed, with one change in row 7. |
| 7 | Courses while the player is away | A cream course or a gym pass keeps working on skipped days (its daily effect still applies). This replaces the red line "a paid course pauses while the player is away". |
| 8 | After «Продолжение следует» | The game freezes: mirror, chat, feed and journal open read-only, the timelapse can be shared, and there is a «Начать заново» button. Progress is kept for the full version. No free play after day 7. |

## What these decisions require

Built:

- Row 3 (2026-11-23): `"neutral": true` on one choice of every story card, checked by `validate.ts`; `syncClock()` auto-plays the story cards a day still has when the clock ends it; the «Пока тебя не было» summary is shown once on the next visit, before the day cards and before the demo end screen. Days 1 and 2 are marked; days 3–7 must mark the neutral choice as they are written (`/write-day` says so). Format and rules: `docs/CONTENT_FORMAT.en.md`, "Skipped story cards". Neutral lists: `docs/DEMO_SCRIPT.md` sections 4 and 5b.

Not built yet on 2026-11-22:

- Row 4: Day 1 `affinity` steps should be re-checked against these sizes; days 2–7 are written with them.
- Row 5: Day 1 cigarette card and later smoking cards need `care` effects; the UI needs a visible `smoke_free` counter.
- Row 8: the demo end screen needs the read-only state behind «Закрыть» and the «Начать заново» button.
- `DEMO_SCRIPT.md` section 0, assumption 3 still says "5 problems with smoking"; the engine has 6 (`weight`, `skin`, `teeth`, `style`, `care`, `conf`). Row 5 settles it in favour of the engine.
