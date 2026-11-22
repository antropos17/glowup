# Handoff: claude.ai chats → Claude Code

Written 2026-11-22 by the Scenario chat. Read this first.

## What this pack is

Everything needed to continue the project in Claude Code without the claude.ai chats: design, demo script, content format, state, pending questions. It was assembled from:

| Source | What it held |
|---|---|
| Chat "Scenario" (brainstorm) | 20 design questions, the 7-day grid, Day 1 design, shared context file |
| Chat "Production" («Продакшн», also called "Code and assets") | The game repo `glowup`: engine, hero art, screens, server stub, Day 1 prototype, content format |
| Chat "Ad" («30-секундный рекламный ролик») | A 30-second vertical ad as a HyperFrames/OpenMotion project |
| Project docs | `claude/CLAUDE.md`, `claude/game-design-brainstorm.md`, `claude/demo-7-days.md`, `claude/формат-контента.md`, `claude/ad-30s.md` |

Limits of this pack:
- The pack author could read the other chats' summaries and excerpts, not the repository. Statements about code below are what the Production chat reported. Verify them against the files.
- The code itself ships separately as `glowup-30.zip`, produced by the Production chat. This pack is unzipped on top of it.
- The ad project ships separately as `30-days-ad-openmotion-project.zip` plus `30-days-ad.mp4`, produced by the Ad chat.

## State of the game (reported)

Done:
- Playable Day 1 from the demo script: 10 story cards (K1-01 to K1-08 with variants) and 5 actions.
- Plus menu, odds in words on cards, reason line next to the chance scale, sleep, day card with hero frame, 50 coins and gum, timelapse in the mirror («До», «День 1», «Сейчас»), the «Продолжение следует» screen.
- 20 engine tests pass, content check passes, the day was played by hand at phone width.
- Buttons under the phone frame fast-forward time for testing.
- A published prototype page exists on claude.ai: «30 дней: прототип первого дня».

Not done:
- Days 2–7 of the demo.
- Buttons inside the feed (choices on a post go through a card).
- Referral link and the «Сообщить о полной версии» button on the demo end screen.
- Hero selection screen (the game starts as Andrey), photos in chat.
- Capacitor is not connected. The server is not deployed; the game uses the device clock.
- Store purchase verification is not written. `verify-purchase` must stay off until it is.

## Decisions by Ruslan in the Production chat (2026-11-22)

- Build: web app with a store wrapper (Capacitor).
- Hero: portrait in play, full body only in the mirror and in before/after.
- Backend: logic and content on device, thin server for time, save copy and purchase verification (Supabase).

## Pending between the former chats

Questions from Production to Scenario, with the Scenario side's answers:

1. Day 1 is already in `content/cards/day1.json`; write days 2–7 directly in the engine format.
   Answer: agreed.
2. Confirm: `care` drives hair grooming, `conf` drives posture.
   Answer: agreed as a proposal. Smell has no visual, so `care` showing as grooming is the closest fit.
3. Review the Day 1 outcome texts that Production wrote where the script gave only an effect.
   Answer: not reviewed yet. First task candidate: list those texts for the authors to approve or edit.
4. Story card order in a file equals display order.
   Answer: noted.
5. The chance scale moves 1–2 points per action; the script wanted strong swings.
   Answer (proposed): keep small moves for actions and give story beats with the crush larger `affinity` steps, for example seen-no-reply −4, first like +5, first message +6, good reply +5 to +8, bad reply −5. Authors to confirm the sizes.

Questions waiting for the authors: `docs/DESIGN.md` section 13 and `docs/DEMO_SCRIPT.md` section 7.

## What to do next

1. Unzip `glowup-30.zip`, unzip this pack on top, run the checks from `docs/prompts/01-first-session.md`.
2. Put the repo under git if it is not yet.
3. Write Day 2 with `/write-day 2`, play it, then continue day by day to Day 7.
4. After Day 7: demo end screen (timelapse, decisions, referral link, notify button), then Capacitor.

## Housekeeping in the claude.ai project

The project root holds duplicates of three docs (`CLAUDE.md`, `demo-7-days.md`, `формат-контента.md`). The root `CLAUDE.md` and `формат-контента.md` are outdated; the `claude/` versions are current. After the move to Claude Code the repo `docs/` folder becomes the single source.
