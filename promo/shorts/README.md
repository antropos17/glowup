# Vertical shorts «Краш за 30»

Three vertical ads for TikTok / Reels / Shorts, built as HyperFrames compositions (2026-11-27).
Each folder is a standalone project: `index.html`, `assets/` (hero SVGs, fonts, music, sound effects).
Rendered mp4 files live outside the repo: `X:\Projects 2027\Glowup promo\shorts\` (not committed).

Format: 1080×1920, 30 fps, stereo AAC, no voice-over. Palette and fonts follow `docs/AD_30S.md`
(Unbounded titles, Golos Text body, `#F4EFE6` / `#22212A` / `#FF5436`). Accent text on the light
background uses the darker `#D23A1C` to reach 3:1 contrast; `#FF5436` stays on buttons and the dark end card.
Key text sits between 290 and 1500 px vertically.

## Rebuild

```
npx tsx promo/shorts/tools/hero.ts        # hero and crush SVGs from src/art/avatar.ts + engine currentLook
```

### Music (HeyGen catalog, via the media-use audio engine, signed in with `hyperframes auth login`)

Request `{"lines":[],"bgm":{"mode":"retrieve","query":"<mood>"}}` run from the short's folder with
`plugin-cli.mjs --script <skills>/media-use/audio/scripts/audio.mjs --request req.json --out meta.json --only bgm`,
then cut to length with a 1.2 s fade-out into `assets/music.mp3`:

| Short | Query | Source length | Cut |
|---|---|---|---|
| chat | light playful pop, curious anticipation, plucky synth, soft beat, 110 bpm | 56 s | from 8 s, 18 s (the louder section lands near the question at 12 s) |
| feed | quirky funny upbeat ukulele pop with claps, comedic, 120 bpm | 30 s | from 0, 20 s |
| pov | uplifting motivational pop, builds to bright energetic drop, transformation, 120 bpm | 57 s | from 0, 20 s |

### Sound effects (Higgsfield, Epidemic Sound catalog)

`assets/sfx/`: `message` (UI notification, message), `tap-a` / `tap-b` (UI click, bubbly / simple select),
`stamp` (rubber stamp on document), `wrong` (funny wrong-answer buzz), `plus` (level-up, positive, short),
`whoosh-a` / `whoosh-b` (fast swipe through air 01 / 02). The licence for ads follows the Higgsfield plan.

Render (HyperFrames CLI 0.9.102, run inside each short's folder), then level the audio to about −15 LUFS:

```
hyperframes render --quality delivery -o "X:/Projects 2027/Glowup promo/shorts/krash30-chat.mp4"
ffmpeg -i krash30-chat.mp4 -c:v copy -af loudnorm=I=-15:TP=-1.5:LRA=11 -ar 48000 -c:a aac -b:a 192k out.mp4
```

`hyperframes` means `node <skills>/hyperframes/scripts/plugin-cli.mjs --cli-version 0.9.102`.
`hyperframes check` passes with no errors; the remaining warnings are the single-file structure
(no sub-compositions), the strict TikTok right-rail/bottom safe zone and a few lines a little under
the reading-time floor.

## Storyboards

Game lines are quoted from `content/` (card ids in brackets). Chips show the in-game bars, where
a problem going up is a bar going down.

### chat — «Ответит или нет?» (18 s)

| Time | On screen |
|---|---|
| 0–1 | Title «Ответит или нет?», chat with Алина, «в сети», her line «Привет. Оксана собирает список на встречу.» (`alina_first_list`) |
| 1–4 | «Места в кафе считают заранее. Тебя записывать?» (`alina_reunion_question`), hint «Что нажмёшь, то и уйдёт, слово в слово.» (K6-01) |
| 4–7 | Three replies from K6-01 numbered 1–3: «Да, записывай. А кто ещё из наших будет?», «Записывай. Обещаю не петь, как на выпускном.», «Да, записывай.» |
| 7.5–12.5 | A finger wavers between the replies and never presses |
| 12.5–15 | «А ты бы что ответил?», «1, 2 или 3? Пиши в комментариях», numbers pulse |
| 15–18 | End card |

### feed — «Совет из ленты» (20 s)

| Time | Post | Outcome | Chip / verdict |
|---|---|---|---|
| 0–5.3 | «Сода с лимоном отбеливают зубы за вечер». (K1-07b), tap «Попробовать» | «Зубы скрипят и ноют от холодной воды. Белее не стали.» | Зубы −3 / «Не работает» |
| 5.3–10.6 | «Чудо-чай: минус 5 кг за неделю». (K1-07a), tap «Сохранить» | «Весы показали минус килограмм, к утру он вернулся.» (K2-05b) | Энергия −2 / «Мимо» |
| 10.6–15.9 | «Главный образ осени: рубашка поверх худи, штаны подвернуть, носки напоказ». (K6-02), tap «Собрать образ из своего шкафа» | «В зеркале не стилист с миллионом подписчиков, а Андрей в двух слоях не того размера.» | Стиль −4 / «Не то» |
| 15.9–17.7 | «Не всё из ленты работает» | | |
| 17.7–20 | End card | | |

### pov — «POV: встреча выпускников через 30 дней» (20 s)

| Time | On screen |
|---|---|
| 0–4.5 | Title, Day 1 mirror with the full-body hero, the six problem titles from `problems.json`, «Андрей смотрит в зеркало. 30 дней.» (K1-02) |
| 4.5–8 | «Каждый день — выбор». «Рука сама тянется к пачке.» → «Убрать пачку, взять жвачку» → «Пачка в ящике, жвачка во рту.», Уверенность +1 (K1-06) |
| 8–11.5 | «Что дальше?» → «Пробежка в парке» → «Три круга по парку. Ноги гудят, голова ясная.», Форма +3 (A1-run) |
| 11.5–15.5 | «День 1» next to «День 7», «А до встречи ещё 23 дня» |
| 15.5–17.5 | «Победа не гарантирована», «30 реальных дней. Каждый выбор считается.» |
| 17.5–20 | End card |

End card in all three: hero portrait, «Краш за 30», «Демо на 7 дней — играй бесплатно». No prices, timers,
store badges, reviews or winning promises.

## Assumptions to confirm

- The Day 7 look: clothes, frame and shave are what Day 6–7 cards really give (shirt `#4A6FA5`, V-neck,
  round frame, no beard); the problem levels behind it are invented for the ad (`tools/hero.ts`).
- The tea post compresses two days: the Day 1 post is saved, the outcome line is the Day 2 order (K2-05b).
- «Краш за 30» is still a draft name (`docs/NAME_AND_PROMO.md`).
- The audio was measured (≈ −15 LUFS, true peak ≤ −1.4 dBFS), not listened to. Tracks were picked by search query and loudness profile only: listen before publishing.
- Check that the HeyGen catalog music and the Epidemic Sound effects are cleared for paid ads and creator posts on your plans.
