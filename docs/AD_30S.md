# 30-second ad — project notes

Source: chat "Ad" and project doc `claude/ad-30s.md`, 2026-11-22. The ad files are not in this pack: `30-days-ad.mp4` and `30-days-ad-openmotion-project.zip` were delivered in that chat.

## What it is

A vertical ad for TikTok, Reels and Shorts built as a HyperFrames composition (OpenMotion native format): `index.html`, `assets/`, a notes file. It follows the demo script: reunion invitation, mirror, daily choices, a feed trap, 30-day progress, an unanswered question at the end. On-screen titles and music, no voice-over.

## Format

- Canvas 1080 × 1920, 30 fps, 30.0 s, stereo.
- Fonts: Unbounded (titles), Onest (UI), both with Cyrillic, OFL, in `assets/fonts/`.
- Colours: background `#F4EFE6`, text `#22212A`, accent `#FF5436`, plus `#17A56B`, minus `#E5484D`, chance scale `#3B5BFF`.
- Hero drawn in code: `assets/hero.js`, `Hero.draw(look)`, with the same parameter names as the content format. It is a stand-in; the real layer engine from `src/art/` can replace it.
- Key text sits between 250 and 1540 px vertically to stay clear of the TikTok UI.
- Music is synthesised by `tools/make_music.py` at 120 bpm; scene changes sit on beats.

## Storyboard

| Time | Scene | Title (Russian, on screen) |
|---|---|---|
| 0–4 s | Class chat, reunion in 30 days | «У Андрея 30 дней» |
| 4–8 s | Mirror and six problem labels | «Андрею 40» → «Список длинный» |
| 8–14 s | Three Day 1 cards: cigarette, run, mum's pies | «Каждый день выбор» |
| 14–18 s | Soda-and-lemon post, teeth −3, Alina silent | «Совет из ленты. Верить?» → «Не каждому» |
| 18–24 s | 30-day timelapse, stats grow, chance swings | «30 реальных дней» |
| 24–27.5 s | Day 1 and Day 30 side by side, scale turns into a question mark | «Понравится он Алине?», «Победа не гарантирована» |
| 27.5–30 s | End card | «30 ДНЕЙ», «Скоро: демо на 7 дней» |

## Assumptions made for the ad

- The title «30 дней» and the line «Скоро: демо на 7 дней» are working versions.
- Days 8–30 are not scripted: the haircut on day 12, the shirt on day 18 and all numbers after day 7 are invented for the ad.
- Left out on purpose: prices, discounts, timers, reviews, store badges and any promise of winning.

## Render

- In OpenMotion Studio: import the ZIP, export MP4.
- Without Studio, from the project folder: `npx hyperframes@0.9.7 render . -o 30-days-ad.mp4` (Node.js 22.18+, FFmpeg, Chrome).
- The audio was checked by level only, not by ear. Listen before publishing.
