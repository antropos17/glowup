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
- Status on 2026-11-25: Days 1–7 are in the game; the 7-day demo is content-complete. Days 8–10, the first days past the demo, are written (playable on the dev page with `?full`; texts await review). The authors have reviewed the texts of Day 1 only. Current status lives in `docs/progress.json`.
- The docs were assembled from three claude.ai chats ("Scenario", "Production", "Ad") by a session that did not see the code. On 2026-11-22 this file and `docs/CONTENT_FORMAT.en.md` were checked against the code; other docs (`HANDOFF.md`, `DEMO_SCRIPT.md`, `DESIGN.md`) are still reports to verify.
</context>

<stack>
Checked against `package.json` on 2026-11-22:
- TypeScript 7, Preact 11, Vite 8 with `vite-plugin-singlefile`. Build output is a single `dist/index.html`.
- Tests: Vitest 5. Content validation: `scripts/check-content.ts`, run with `tsx`.
- Fonts: Golos Text and Unbounded from `@fontsource-variable`.
- Store wrapper: Capacitor (planned, not in `package.json`).
- Thin server: Supabase scaffold in `server/supabase/` (edge functions `clock`, `sync`, `verify-purchase`, migration `0001_init.sql`). Not deployed. `verify-purchase` throws on store verification by design and must stay disabled until it is implemented.
</stack>

<commands>
```
npm install
npm run dev            # asset showcase page with the game in a phone frame
npm test               # engine tests (143/143 on 2026-11-25)
npm run check:content  # scenario validation: broken refs, dead-end cards
npm run build          # typecheck, then single-file dist/index.html
npx tsc --noEmit       # typecheck
```
</commands>

<repo_map>
| Path | Contents |
|---|---|
| `content/` | Scenario as JSON. The engine reads it as is. Each day lives in `content/cards/day<n>.json` (days 1–10 on 2026-11-25; the demo stops after `balance.demoDays` = 7, `contentDays` = 10 counts the written days), side jobs in `content/cards/side-jobs.json` |
| `src/engine/` | Headless core. `types.ts` (content and state schema), `validate.ts` (content rules), `game.ts` (cards, effects, chance, day end), `clock.ts` (day parts from local time), `save.ts` |
| `src/art/` | Hero drawn in code from layers (`avatar.ts`, portrait and full body) and icons (`icons.ts`) |
| `src/ui/` | `Game.tsx` (game screens), `Kit.tsx` (asset showcase, the page `main.tsx` renders), `ru.ts` (UI strings), `bits.tsx`, `sound.ts` (sound playback and the mute flag) |
| `assets/sounds/` | Eight mp3 sound effects inlined into the build; `README.md` there has the earshot command for each |
| `src/styles/` | `game.css`, `kit.css`, `fonts.css` |
| `src/content/` | Loader that bundles `content/` |
| `server/supabase/` | Supabase scaffold, not deployed |
| `tests/engine.test.ts` | Engine tests: clock, content check, the flow of each day (1–10), day transition, economy, skipped story, queued quest step |
| `scripts/check-content.ts` | Content checker |
| `docs/` | Design, demo script, content format (`CONTENT_FORMAT.md` Russian original, `CONTENT_FORMAT.en.md` English guide), handoff notes, progress |
</repo_map>

<content_rules>
- Source of truth for the content schema: `src/engine/types.ts` and `src/engine/validate.ts`, behaviour in `src/engine/game.ts`. `docs/CONTENT_FORMAT.en.md` was checked against them on 2026-11-22; update it when the schema changes.
- Problems in the engine: `weight`, `skin`, `teeth`, `style`, `care`, `conf`. Smoking is not a problem; it lives in flags and counters.
- Problem levels are inverted relative to the scenario docs: in the engine 100 = neglected, 0 = solved. The scenario docs use "higher is better". The mapping table is in `docs/DEMO_SCRIPT.md`.
- Every card except `action` needs at least one choice with no cost and no requirements (no dead ends).
- Flags use Latin snake case: `d<day>_<what_happened>`, for example `d1_wrote_plain`.
- "Chance to be liked" is computed by the engine and never set directly. Move it through solved problems, `affinity` and matched tastes.
- Crush chat is fully scripted, no LLM at runtime. About 10 phrasing variants per situation in `content/chat.json` (on 2026-11-25 it holds 46 situations of Days 1–10 with 1 to 10 lines each).
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
- `docs/DEMO_SCRIPT.md`: 7-day grid, the design of each day (sections 4 and 5b–5g), the demo economy (5a), how Day 1 flags pay off later.
- `docs/DECISIONS.md`: numbered decisions of the authors.
- `docs/CONTENT_FORMAT.en.md`: how to write cards, conditions, effects.
- `docs/AD_30S.md`: the 30-second ad project.
- `docs/progress.json`: machine-readable status.
- `docs/prompts/01-first-session.md`: the first prompt to run.
- `.claude/commands/write-day.md`: `/write-day <n>` writes one demo day.
</docs>
