# CLAUDE.md — "30 Days" (RU title: «30 дней»)

Mobile life-sim in the spirit of BitLife. The player picks a hero with appearance problems and has 30 real days to get them in shape and win over a crush. Claude.ai project name: «Игра понравиться человеку».

<language_policy>
- Think, plan, read and write in English: reasoning, documentation, code identifiers, code comments, commit messages, test names, PR text.
- Player-facing text is Russian only. That covers every text field in `content/**/*.json` (`title`, `text`, `label`, outcome `text`, `hint`, chat phrases, rumors, hints, item `blurb` and `limits`) and every UI string in `src/ui/`.
- Keep Russian game text exactly as written: same wording, same «ёлочки» quotes, same tone. Change it only when the task asks for it.
- Replies to the authors (chat answers, summaries, questions) are in Russian: concise, structured, step by step.
- Existing Russian comments and error strings in code: translate to English only inside a file you are already editing for another reason.
</language_policy>

<context>
- Authors: Ruslan (developer, solo builder) and a friend (ideas, scenario). Both read Russian.
- Current goal: a 7-day demo. It is the first 7 days of the full 30-day game, with full presentation and mechanics, ending on «Продолжение следует».
- Status on 2026-11-22: Day 1 is playable in the prototype. Days 2–7 are not written yet.
- Everything in this pack was assembled from three claude.ai chats ("Scenario", "Production", "Ad") and the project docs. The pack author did not see the repository itself, so treat every statement about code as a report to verify.
</context>

<stack>
Reported by the Production chat, verify against `package.json`:
- TypeScript, Preact, Vite. Build output is a single `dist/index.html`.
- Tests: Vitest. Content validation: `scripts/check-content.ts`.
- Store wrapper: Capacitor (planned, not connected).
- Thin server: Supabase scaffold in `server/` (time, save copy, purchase verification). Not deployed. Store receipt verification is not implemented and must stay disabled until it is.
</stack>

<commands>
```
npm install
npm run dev            # game + asset showcase in the browser
npm test               # engine tests (20 reported passing)
npm run check:content  # scenario validation: broken refs, dead-end cards
npm run build          # single-file dist/index.html
npx tsc --noEmit       # typecheck
```
</commands>

<repo_map>
| Path | Contents |
|---|---|
| `content/` | Scenario as JSON. The engine reads it as is. Day 1 lives in `content/cards/day1.json` |
| `src/engine/` | Headless core: clock, energy, story, action menu, deck, flags, counters, "tomorrow" effects, day end, chance |
| `src/art/` | Hero drawn in code from layers (portrait and full body) and icons |
| `src/ui/` | Game screens and the asset showcase |
| `src/content/` | Loader that bundles `content/` |
| `server/` | Supabase scaffold, not deployed |
| `tests/` | Engine tests and a Day 1 playthrough |
| `scripts/check-content.ts` | Content checker |
| `docs/` | Design, demo script, content format, handoff notes, progress |
</repo_map>

<content_rules>
- Source of truth for the content schema: `src/engine/types.ts` and `src/engine/validate.ts`. `docs/CONTENT_FORMAT.en.md` is a translated guide and can lag behind.
- Problem levels are inverted relative to the scenario docs: in the engine 100 = neglected, 0 = solved. The scenario docs use "higher is better". The mapping table is in `docs/DEMO_SCRIPT.md`.
- Every card needs at least one choice with no cost and no requirements (no dead ends).
- Flags use Latin snake case: `d<day>_<what_happened>`, for example `d1_wrote_plain`.
- "Chance to be liked" is computed by the engine and never set directly. Move it through solved problems, `affinity` and matched tastes.
- Crush chat is fully scripted, no LLM at runtime. About 10 phrasing variants per situation in `content/chat.json`.
- Every shop item has a mandatory `limits` line shown before purchase.
</content_rules>

<design_constraints>
Decided by the authors:
- 30 real days, not shortened and not extended. Day parts follow the player's local time: morning, day, evening, night.
- Crush affinity, time and the final result cannot be bought.
- Light, not too realistic tone. Losing must not feel heavy.
- The demo looks like a finished game, not a rough cut.
- Web app with a store wrapper. Portrait in play, full body only in the mirror and in before/after. Logic on device, thin server.

Proposed, not yet confirmed by the authors (keep unless they say otherwise):
- Exact effect of every purchase is visible before paying.
- No purchase offers at a moment of failure, a skipped day or a loss.
- Leaving is as easy as continuing: equal buttons, no guilt copy.
- No hidden or per-player odds, no fake scarcity, no resetting timers, no near-miss framing, no autoplay of the next item.

When you justify a mechanic, separate fact, hypothesis and taste. Do not claim "this works because of psychology" without a cited source.
</design_constraints>

<workflow>
- Read the relevant files before stating anything about them. Statements in `docs/` about code are reports from chat sessions.
- Run independent reads and searches in parallel.
- Track state in git and in `docs/progress.json`. Update the file when a day or a task changes status.
- Verify before reporting done: `npx tsc --noEmit`, `npm test`, `npm run check:content`, then a playthrough at phone width.
- Ask before destructive or bypassing actions: `--no-verify`, force-push, history rewrite, deleting content files.
- Keep scope minimal: implement what the task names. New abstractions, refactors and extra features need a request.
- Scope applies to every item named in a task, for example "all cards of Day 2", not only the first one.
</workflow>

<tools>
MCP servers seen on Ruslan's machine (confirm with `/mcp`):
- Context7: current docs for Preact, Vite, Capacitor, Supabase.
- Playwright MCP: phone-width playthroughs and screenshots.
- Desktop Commander: local files and processes.
- unityMCP: present but unused, the game is a web app.
</tools>

<docs>
- `docs/HANDOFF.md`: where things stand, who decided what, pending answers. Read first.
- `docs/DESIGN.md`: all brainstorm decisions for the 30-day game.
- `docs/DEMO_SCRIPT.md`: 7-day grid, Day 1 design, how Day 1 flags pay off later.
- `docs/CONTENT_FORMAT.en.md`: how to write cards, conditions, effects.
- `docs/AD_30S.md`: the 30-second ad project.
- `docs/progress.json`: machine-readable status.
- `docs/prompts/01-first-session.md`: the first prompt to run.
- `.claude/commands/write-day.md`: `/write-day <n>` writes one demo day.
</docs>
