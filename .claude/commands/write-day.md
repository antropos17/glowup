---
description: Write one day of the 7-day demo as engine-ready content
argument-hint: <day number 2-7>
---

<context>
The demo script is in docs/DEMO_SCRIPT.md: section 3 is the 7-day grid, section 5 lists how Day 1 flags must pay off. The schema is defined by src/engine/types.ts and checked by src/engine/validate.ts; docs/CONTENT_FORMAT.en.md is the guide. Earlier days are in content/cards/.
</context>

<task>
Write Day $ARGUMENTS of the demo.

1. Read docs/DEMO_SCRIPT.md, src/engine/types.ts and every existing file in content/cards/. Read them in parallel.
2. List the flags set on earlier days and the payoffs the script assigns to Day $ARGUMENTS.
3. Create content/cards/day$ARGUMENTS.json with every card of that day: story cards in display order, actions, quest steps, chat forks, feed posts.
4. Add what the cards reference to content/chat.json, content/hints.json, content/rumors.json and content/items.json.
5. Every new crush situation in content/chat.json gets about 10 phrasing variants.
6. Run npx tsc --noEmit, npm test and npm run check:content. Fix content errors until all three pass.
7. Play the day at phone width (Playwright MCP if connected, otherwise npm run dev and describe the manual path).
8. Update docs/progress.json and append the day's flag table and its list of neutral choices to docs/DEMO_SCRIPT.md.
</task>

<constraints>
- All player-facing text is Russian, in the tone of Day 1: light, short lines, «ёлочки» quotes. Reason and comment in English.
- Every card has at least one choice with no cost and no requirements.
- Every story card has exactly one choice marked `"neutral": true`: the calmest one, free, no requirements, smallest consequences. It is played automatically if the player skips the card, so it must not spend coins, write to the crush or start a course, and its outcome text must make sense in the «Пока тебя не было» summary. The check fails without it.
- Every flag set on this day is either used on this day or listed with its planned payoff day.
- Every earlier-day flag that the script pays off on this day is checked by a card.
- The crush reacts indirectly and never names what the hero changed.
- Random outcomes carry a word label: часто, иногда, редко.
- Items state their exact effect and a `limits` line. No purchase offers on failure moments.
- Change content files and docs only. If the engine lacks something the day needs, stop and describe the gap instead of editing src/.
- Scope is the whole day: all four parts of the day, not only the morning.
</constraints>

<done_criteria>
- content/cards/day$ARGUMENTS.json exists and all three checks pass.
- Morning, day, evening and night each have at least one story card or action.
- The day ends on the beat the grid names for it.
- A Russian summary for the authors: cards written, flags set, flags paid off, texts they should review, open questions.
</done_criteria>
