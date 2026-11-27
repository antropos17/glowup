# Vertical shorts «Краш за 30»

Three vertical ads for TikTok / Reels / Shorts, built as HyperFrames compositions (2026-11-27).
Each folder is a standalone project: `index.html`, `assets/` (hero SVGs, fonts, music, sound effects).
Rendered mp4 files live outside the repo: `X:\Projects 2027\Glowup promo\shorts\` (not committed).

Format: 1080×1920, 30 fps, stereo AAC, Russian voice-over (ElevenLabs). Palette and fonts follow `docs/AD_30S.md`
(Unbounded titles, Golos Text body, `#F4EFE6` / `#22212A` / `#FF5436`). Accent text on the light
background uses the darker `#D23A1C` to reach 3:1 contrast; `#FF5436` stays on buttons and the dark end card.
Key text sits between 250 and 1540 px vertically; the lower half carries the phone, the outcome rows,
stamps and the before/after bodies.

Motion style (2026-11-27, "dopamine" pass): every change lands with a hit. Shared GSAP helpers in each
`index.html`: `pop` (overshoot pop-in), `slam` (stamp drop), `shake`, `bounce`, `flash` (full-frame white),
`roll` (rolling number on HUD bars), `burst` (deterministic particles) and `badge` («−3» / «+1» burst-in).
Something moves at least every ~0.7 s; each hit has a sound effect. The whole frame punches
(scale 1.02) on every second beat of the music and harder (up to 1.06) on every hit sound; the beat grid
was measured from each `music.mp3` (chat 114.75 bpm, feed 123, pov 144.75).

### Voice-over (ElevenLabs)

`assets/vo/*.mp3`: voice «Max - Alive and Emotional» (shared library, young male, id `Uv3rf12Omd9Asyv54Bqw`),
model `eleven_v3`, `language_code` ru, stability 0.5, similarity 0.8; each line levelled to −12 LUFS. Lines and
start times are the `vo-*` audio tags in each `index.html`. Music sits at volume 0.3, about 10 dB under the voice. The API key stays outside the repo.

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
| chat | funky live band groove, slap bass, real drums, brass stabs, cheeky playful, 115 bpm | 51 s | from 30 s, 18 s |
| feed | comedic funk, bouncy live drums, clavinet, quirky horns, meme energy, 120 bpm | 34 s | from 13.5 s, 20 s |
| pov | energetic indie rock, live drums, driving guitars, triumphant hype, 130 bpm | 55 s | from 8 s, 20 s (the louder section lands near the before/after) |

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
| 5–12 | A finger hops between the replies (every 0.65 s, each reply bounces) and never presses |
| 12–15 | «А ты бы что ответил?», «1, 2 или 3? Пиши в комментариях», numbers pulse |
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

End card in all three: hero portrait, «Краш за 30», «Демо — в канале». No prices, timers,
store badges, reviews or winning promises.

## Live shorts (Higgsfield), 2026-11-27

`live-1` (pilot; `live-2` … `live-5` wait for the pilot's approval): a live-action Андрей, generated on
higgsfield.ai, speaks to camera as the voice of the game's makers, the game cuts in over his voice, then the end card.
Everything live in these shorts is AI-generated (portrait, footage, the hero's voice and lip sync).
**When publishing on TikTok, switch on the "AI-generated content" label.** He is not a real player and gives no review.

Footage is not in git (`.gitignore`: `promo/shorts/live-*/assets/*.mp4`). It lives in
`X:\Projects 2027\Glowup promo\live\`; to render, copy it into the short's `assets/` under the same name
(`live-1-talk.mp4` → `promo/shorts/live-1/assets/live-1-talk.mp4`).

### The hero

Higgsfield Soul 2.0, 9:16, 2K, moodboard «Warm ambient», batch of 4, picked variant 3 (free generations):

> Candid smartphone photo, vertical. An ordinary, likeable man around 40, friendly and dignified. Light skin, short brown
> hair with a receding hairline, short patchy uneven beard, thick black rectangular glasses with a small piece of white tape
> wrapped around one temple arm near the hinge. A bit overweight, fully clothed: a plain faded grey crew-neck t-shirt that
> covers the belly, grey sweatpants. Kind, slightly tired eyes, a hint of a self-ironic smile. Sitting on a worn sofa in a
> small cozy apartment in the evening, warm lamp light. Clean natural skin, no bruises, no bandages, no tape on the face.
> Realistic, not a model, not a celebrity. Waist-up medium shot.

A first batch without "fully clothed" and the tape on the temple came out mocking (bare belly, a bandage on the nose)
and was dropped.

### live-1 — «Глоуап за 30 дней — теперь игра» (16.5 s)

Footage `live-1-talk.mp4`: Seedance 2.5, start frame = the portrait, 10 s, 9:16, 720p, Unlimited mode (0 credits),
the model's own audio (voice and lip sync come from the same generation):

> The same man sits on the sofa in the same cozy room, looks straight into the camera and talks to the viewer in Russian,
> warm, friendly and a little self-ironic, like a casual vlog. He says exactly, in Russian: «Тренд „глоуап за 30 дней“
> знаете? Мы сделали из него игру. Тридцать настоящих дней, каждый выбор считается. Демо — в канале.» Clear natural lip
> sync, mature male voice of a man around 40, calm pace. Smartphone selfie-style framing, subtle natural motion, warm
> evening lamp light. No music, no on-screen text, no subtitles, no logos.

| Time | On screen | Heard |
|---|---|---|
| 0–2.8 | Андрей to camera, caption «Тренд «глоуап за 30 дней» знаете?» | his line (file 1.0–3.8 s) |
| 2.8–7.3 | Day 1 mirror, six problems, «Андрей смотрит в зеркало. 30 дней.» (K1-02); captions «Мы сделали из него игру.», «Тридцать настоящих дней,», «каждый выбор считается.» | his voice goes on under the game |
| 7.3–11.3 | «Каждый день — выбор», «Рука сама тянется к пачке.» → «Убрать пачку, взять жвачку» → «Пачка в ящике, жвачка во рту.», Уверенность +1 (K1-06) | music, sound effects |
| 11.3–13 | Андрей again, caption «Демо — в канале.» | his line (file 8.3–10.04 s) |
| 13–16.5 | End card «Краш за 30», «Демо — в канале» | music |

Captions follow the script the model was given; Ruslan listened to the take and accepted it. Phrase times were
measured from the pauses (`ffmpeg silencedetect`), not from a transcript. Music and sound effects are pov's.

## Assumptions to confirm

- The Day 7 look: clothes, frame and shave are what Day 6–7 cards really give (shirt `#4A6FA5`, V-neck,
  round frame, no beard); the problem levels behind it are invented for the ad (`tools/hero.ts`).
- The tea post compresses two days: the Day 1 post is saved, the outcome line is the Day 2 order (K2-05b).
- «Краш за 30» is still a draft name (`docs/NAME_AND_PROMO.md`).
- The audio was measured (≈ −15 LUFS, true peak ≤ −1.4 dBFS), not listened to. Tracks were picked by search query and loudness profile only: listen before publishing.
- Check that the HeyGen catalog music and the Epidemic Sound effects are cleared for paid ads and creator posts on your plans.
