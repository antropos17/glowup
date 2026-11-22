# Author decisions

Decisions confirmed by Ruslan in the coordinator chat. They override "proposed" and "open" items in `DESIGN.md`, `DEMO_SCRIPT.md` and `HANDOFF.md`. Newest first.

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
