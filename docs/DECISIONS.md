# Author decisions

Decisions confirmed by Ruslan in the coordinator chat. They override "proposed" and "open" items in `DESIGN.md`, `DEMO_SCRIPT.md` and `HANDOFF.md`. Newest first.

## 2026-11-23 — Day 3 «Не та дверь»

| # | Question | Decision |
|---|---|---|
| 9 | Alina's first like | It has a visible cause. With two or more useful actions over days 1–3 an evening card offers to post a photo; if Andrey posts, the like arrives at night and the reason line reads «+5: Алина лайкнула твоё фото». It never arrives by a hidden rule. |
| 10 | Day 3 skipped entirely | Andrey went to office 12 by himself and the doctor's course started. The skip is already paid for by the regress of the problems. |
| 11 | Strength of the doctor's course | Skin −3 each morning for 10 days (the demo sees 4 of them, −12 by day 7). |
| 12 | Cream from Sadovaya (`cream_zina`, day 5) | It must give something other than a second skin course of the same kind. What exactly is open; decide when Day 5 is written. Its current effect in `content/items.json` (skin −2 for 10 days) is to be replaced then. |

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

Not built yet on 2026-11-22:

- Row 3 needs an engine feature: a way to mark the neutral choice of a story card (for example `"neutral": true` on a choice) and auto-play of skipped story cards on the next visit, plus the summary screen. Every story card of days 1–7 then needs its neutral choice marked.
- Row 4: Day 1 `affinity` steps should be re-checked against these sizes; days 2–7 are written with them.
- Row 5: Day 1 cigarette card and later smoking cards need `care` effects; the UI needs a visible `smoke_free` counter.
- Row 8: the demo end screen needs the read-only state behind «Закрыть» and the «Начать заново» button.
- `DEMO_SCRIPT.md` section 0, assumption 3 still says "5 problems with smoking"; the engine has 6 (`weight`, `skin`, `teeth`, `style`, `care`, `conf`). Row 5 settles it in favour of the engine.
