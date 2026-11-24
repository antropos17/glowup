# UI/UX audit — game screens of «30 дней»

Date: 2026-11-24. Branch `claude/ui-pass-cards-190ede`, after commit `2ee3601` (card motion, lifted choice sheet).
Method: a scripted playthrough of all 7 demo days in Chromium at 360×640 (also 320×568 and 390×844 for the sheet checks),
with page scrollbars hidden to match phone overlay scrollbars. Tap targets are `getBoundingClientRect` sizes. Contrast is
the WCAG 2.x ratio computed from the CSS tokens in `src/styles/game.css` (AA: 4.5:1 for text, 3:1 for large text and for
icons/UI parts; "large" = 24px, or 18.66px bold).

"Fact" means measured. "Taste" means a judgement that a designer may reasonably disagree with.
Not implemented here; Part A of the pass only touched card motion and the height of the choice sheet.

Screens covered: card, outcome, «Чем заняться» menu, journal, chat, feed, shop, mirror, day-end card, «Продолжение
следует», the frozen game after the demo. **There is no hero-pick screen in the game** (finding 11).

| # | Finding | Where | Proposed fix | Size | Kind |
|---|---|---|---|---|---|
| 1 | White text on mint is 3.15:1, below 4.5:1 for 15px/600 text. It is the main action of the game: «Что дальше», «Понятно», «Применить». | `.game button.primary`, `.game button.use` (`--mint` #10A391 on #FFF) | Use `--mint-deep` (#0A7468, 5.66:1 with white) as the button fill and keep `--mint` for the key shadow and accents, or darken `--mint` to about #0B8577. Colour decision for the authors. | M | Fact |
| 2 | The day-end card scrolls at 360×640 on days 2, 4, 6 and 7: «Понятно» ends at 634–701px on a 640px screen. The compact rules that make it fit 320×568 only apply under 600px height. | `@media (max-height: 600px)` block for `.sheet:has(.daycard)` | Apply the same compact rules up to `max-height: 700px`, then re-measure days 1–7 at 360×640 and 320×568. | S | Fact |
| 3 | Several buttons are under 44×44px: card/menu close `.x` 34×34; timelapse chips `.seg button` 31px tall (mirror and demo end); «Начать заново» `.end-restart` 113×26; «Итоги демо» in `.frozen` 98×31. | `.x`, `.seg button`, `.game button.end-restart`, `.game .frozen button` | Grow the hit area without changing the look: a transparent `::before` with negative inset, as `.snd` already does, or `min-height: 44px` where there is room. | S | Fact |
| 4 | The ✕ on a story card is labelled «Отложить» only for screen readers; visually it is a plain close cross, so the player cannot tell that the card is postponed rather than dismissed, nor where it comes back. | `CardSheet` → `.x` with `aria-label="Отложить"` | Show the word next to the icon on story cards («Отложить ✕»), or a one-line hint in the journal when a postponed card is waiting. | S | Taste |
| 5 | Header and hero take the top 216px of 640 (34%) on every tab; on the journal the bars panel takes another 76px, leaving 290px (216–506) for reading. The hero block repeats on tabs where it adds nothing (shop, feed). | `.top`, `.hero`, `.bars` in `Game.tsx` | Collapse the hero to one line (portrait 44px, chance, energy, coins) on tabs other than the journal, or shrink it as `.screen` scrolls. | M | Taste (heights are measured) |
| 6 | Small green deltas are below 4.5:1: `+N` on the day card 3.60:1 (white), `+N` in the hero chance line 3.10:1 (tile), both 12.5px. | `.delta-row b[data-dir='up']`, `.chance-why[data-dir='up'] b` (`--good` #1B9A5E) | Darken `--good` to about #13784A (≥4.5:1 on white and on tile). | S | Fact |
| 7 | Raspberry is used for small text below 4.5:1: the countdown «30» on tile 3.67:1 (17px bold, not "large"); the hero's chat bubble and the calendar's «день» label, white on raspberry, 4.27:1 at 15px and 11px. | `.countdown b`, `.bubble[data-from='hero']`, `.leaf-head` | Raise the countdown number to 19px bold (counts as large), or darken raspberry for text only (about #C42A5A). | S | Fact |
| 8 | The «+» in its rest state (day closed) shows a white icon on #B9CBD0: 1.68:1, below 3:1 for icons, yet the button still works and opens the "day is over" sheet. | `.game button.plus[data-rest]` | Use `--ink-soft` for the icon on the grey fill, or a darker grey fill. | S | Fact |
| 9 | Sheets disappear instantly on close («Вернуться в журнал», ✕, tap on the scrim) and tabs switch with no transition, while sheets now enter with motion. The asymmetry reads as abrupt. | `setSheet(null)` in `Game.tsx`; `.screen` | A 150ms fade/slide-out with delayed unmount that ignores the closing sheet's pointer events, so input is never blocked; a 120ms fade on `.screen` when the tab changes. Keep both off under `prefers-reduced-motion`. | M | Taste |
| 10 | The timelapse chips wrap into two rows of 4 at 360px on the demo end screen (8 frames), and will wrap further in the 30-day game. Together with finding 3 they are small, dense targets. | `Timelapse` → `.seg` | A horizontal scroll strip of chips, or a slider/scrubber under the mirror. | M | Taste |
| 11 | There is no hero-pick screen in the game: `content` has one archetype and the game starts straight into the journal. Hero choice is a promise of the concept («the player picks a hero»). | `Game.tsx` (`fresh()` uses `content.archetypes[0]`) | Product decision first: for the demo either keep one hero and say so, or add a pick screen when a second archetype exists. | L | Fact (absent) |
| 12 | The day-end card and «Пока тебя не было» stay docked to the bottom while choice and outcome sheets now float lifted above the nav on phones taller than 600px. This is deliberate (the summaries need the height), but the two sheet styles now coexist. | `.scrim:not(:has(.daycard, .missed))` in `game.css` | After finding 2 is fixed, try the lifted style for the day card on 390×844 and taller, where it has room; keep it docked on short phones. | S | Taste |

## Checked and fine

- No horizontal overflow on any screen at 320, 360 and 390px wide.
- All 100 choice cards of the playthrough have their last choice on screen or reachable by scrolling the sheet, at all three sizes.
- The sound toggle `.snd` looks 28×26 but its `::before` makes the hit area 44×44.
- The raised «+» (top of its ring at 565px) leaves the end of a scrolled tab visible: content ends at 566px at 360×640; content passes under it only mid-scroll.
- Secondary text (`--ink-soft`) passes: 6.07:1 on white, 5.22:1 on tile, 4.86:1 on the morning header.
