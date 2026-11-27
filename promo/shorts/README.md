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

`live-1` (pilot) and `live-2` … `live-5`: a live-action Андрей, generated on
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
| 13–16.5 | End card «Краш за 30 дней», «Демо — в канале» | music |

Captions follow the script the model was given; Ruslan listened to the take and accepted it. Phrase times were
measured from the pauses (`ffmpeg silencedetect`), not from a transcript. Music and sound effects are pov's.

### live-2 … live-5: shared recipe

The start frames are Nano Banana Pro stills in Unlimited mode with the hero portrait as the reference image (same face,
glasses with the taped temple, grey t-shirt), one per location. Each speech take is Seedance 2.5, start frame = that still,
10 s, 9:16, 720p, Unlimited mode (0 credits), with the model's own voice and lip sync. Every take opens on the
hero to camera with a hook caption (`.say.hook`, slammed in), then game cards from `content/` cut in over his voice,
then he comes back for «Демо — в канале», then the end card «Краш за 30 дней». Captions follow the script the model was
given; phrase times come from the pauses (`silencedetect` and an RMS envelope), not from a transcript.
Music: live-2 and live-4 use feed's track, live-3 chat's, live-5 pov's; sound effects as above.

### live-2 — «Двадцать пирожков» (16.6 s)

> The same man stands in the same small kitchen next to the big enamel pot full of pirozhki, holding one pie up to the
> camera, and talks to the viewer in Russian, cheerful and self-ironic, like a funny casual vlog. He grins, points at
> himself, then lifts the pie and shrugs with comic helplessness. He says exactly, in Russian: «Это я — тот самый скуф.
> Мама принесла двадцать пирожков. Сколько съем — решаешь ты. Демо — в канале.» (+ the lip-sync, voice, framing and
> "no music, no text" lines of live-1)

| Time | On screen | Heard |
|---|---|---|
| 0–4.6 | Андрей with a pie, «Это я — тот самый скуф.», «Мама принесла двадцать пирожков.» | his lines (file 0.8–5.0 s) |
| 4.6–11.4 | K1-04 «Мама с пирожками»: «Мама на пороге с кастрюлей. «Двадцать штук, с картошкой. Ешь, пока горячие».», its three choices; caption «Сколько съем — решаешь ты.»; «Съесть пять» → «Пять пирожков. Ремень стал теснее.», Форма −2; «Вежливо отказаться» → «Мама: «Ты заболел?»», Уверенность −1 | his voice, then music |
| 11.4–13.1 | Андрей, «Демо — в канале.» | his line (file 8.3–10.04 s) |
| 13.1–16.6 | End card | music |

### live-3 — «Втягиваю живот» (15.5 s)

> The same man stands sideways in front of the same bathroom mirror … First he dramatically sucks in his belly and
> holds his breath with a proud face, then exhales with a loud puff, the belly comes back, and he laughs at himself,
> then turns to the camera. He says exactly, in Russian: «Втягиваю живот… Десять секунд — мой рекорд. Я тот самый
> скуф из игры: тридцать дней, и каждый выбор считается. Демо — в канале.»

| Time | On screen | Heard |
|---|---|---|
| 0–4.6 | Андрей at the mirror with puffed cheeks, «Втягиваю живот…», «Десять секунд — мой рекорд.» | his lines (file 0.1–3.3 s), the exhale |
| 4.6–11 | K2-02a «Зеркало»: «Утро, зеркало. Пирожки никуда не делись.»; «Втянуть живот» → «Живот продержался десять секунд.»; «Пообещать себе салат» → «Зеркало не поверило, но промолчало.»; then A1-couch «Лечь на диван «до понедельника»» → «Диван оказался сильнее.», Уверенность −1; captions «Я тот самый скуф из игры:», «тридцать дней, и каждый выбор считается.» | his voice, then music |
| 11–11.94 | Андрей, «Демо — в канале.» | his line (file 9.1–10.04 s) |
| 11.94–15.5 | End card | music |

The take is odd: his belly sticks out while he holds his breath and goes flat after the exhale (the reverse of the
prompt), and he "speaks" the first lines with puffed cheeks. Regenerate it (free) if that reads wrong.

### live-4 — «Сода с лимоном» (16 s)

> The same man stands at the same kitchen counter with the glass of fizzy soda water and the lemon, the phone with a
> beauty video leaning nearby … He stirs the glass with a spoon with a confident face, takes a sip and rinses, then
> winces comically, touches his cheek and shakes his head, laughing at himself. He says exactly, in Russian: «Сода с
> лимоном: зубы белые за вечер. Проверяю… Ай! Не работает. В игре проверишь всё сам. Демо — в канале.»

| Time | On screen | Heard |
|---|---|---|
| 0–3 | Андрей stirs the glass, «Сода с лимоном: зубы белые за вечер.», «Проверяю…» | his lines |
| 3–5 | K1-07b «Лента: сода с лимоном», «Сода с лимоном отбеливают зубы за вечер», tap «Попробовать» | he drinks |
| 5–6.95 | Андрей winces, holds his cheek, «Ай! Не работает.» | his line |
| 6.95–11.4 | «Попробовать» → «Зубы скрипят и ноют от холодной воды. Белее не стали.», Зубы −3; caption «В игре проверишь всё сам.»; then K1-07a «Лента: чудо-чай», «Чудо-чай: минус 5 кг за неделю», «Сохранить» → «Чай пришёл через час. Вкус сена, весь вечер бегом в туалет.» (K2-05b, first two sentences), Энергия −2 | his voice, then music |
| 11.4–12.54 | Андрей, «Демо — в канале.» | his line (file 8.9–10.04 s) |
| 12.54–16 | End card | music |

The tea post compresses two days, as in feed.

### live-5 — «Колет в боку» (15.6 s)

> The same man in the same grey hoodie stands on the same autumn park path, out of breath after jogging … He points at
> himself with a grin, then grabs his side with a comic wince, catches his breath, straightens up and laughs. He says
> exactly, in Russian: «Это я, скуф, первый круг в парке. Колет в боку! Тридцать реальных дней — и каждый выбор
> считается. Демо — в канале.»

| Time | On screen | Heard |
|---|---|---|
| 0–2.5 | Андрей points at himself, «Это я, скуф,», «первый круг в парке.» | his lines |
| 2.5–3.6 | A1-run, tap «Пробежка в парке» | music |
| 3.6–5.4 | Андрей folds over holding his side, «Колет в боку!» | his line |
| 5.4–11 | Both A1-run outcomes with their in-game hints: «закололо в боку» → «Закололо в боку, вторую половину пришлось идти шагом.», Форма +1; «получилось» → «Три круга по парку. Ноги гудят, голова ясная.», Форма +3; captions «Тридцать реальных дней —», «и каждый выбор считается.» | his voice, then music |
| 11–12.09 | Андрей, «Демо — в канале.» | his line (file 8.95–10.04 s) |
| 12.09–15.6 | End card | music |

The «Утро» label on the run card is the ad's own (A1-run is a day action without a card title).

## Assumptions to confirm

- The Day 7 look: clothes, frame and shave are what Day 6–7 cards really give (shirt `#4A6FA5`, V-neck,
  round frame, no beard); the problem levels behind it are invented for the ad (`tools/hero.ts`).
- The tea post compresses two days: the Day 1 post is saved, the outcome line is the Day 2 order (K2-05b).
- «Краш за 30» is still a draft name (`docs/NAME_AND_PROMO.md`).
- The audio was measured (≈ −15 LUFS, true peak ≤ −1.4 dBFS), not listened to. Tracks were picked by search query and loudness profile only: listen before publishing.
- Check that the HeyGen catalog music and the Epidemic Sound effects are cleared for paid ads and creator posts on your plans.

## Live shorts v2 (Higgsfield), 2026-11-27

Four ~21 s shorts in the same recipe as `live-1` … `live-5`, but faster and absurd: each opens on a 0.7–0.8 s cold open
of the absurd peak of its take with a slammed caption, the hero (same AI-generated Андрей) says as the makers «мы
сделали игру…», game cards from `content/` cut in for 1–1.5 s with their text verbatim, and the end card shows
«Краш за 30 дней», «Демо — в канале» and the channel nick `glowupchallenge30` as text (until 1000 followers TikTok
gives no profile link). The same AI label rule applies: **switch on the "AI-generated content" label when publishing.**

Each take is Seedance 2.5, start frame = the location still of `live-2` … `live-5` (Nano Banana Pro), 20 s, 9:16,
720p, Unlimited mode (0 credits), the model's own voice and lip sync. Prompts follow the `seedance-clean` structure
(timed HARD CUTs, FOV in degrees, light in Kelvin, positive locks); the full texts are in
`X:\Projects 2027\Glowup promo\live\v2-prompts\`. Footage lives in `X:\Projects 2027\Glowup promo\live\`
(`v2-<name>-talk.mp4`); copy it into `promo/shorts/live-v2-<name>/assets/` to render. Finished files:
`X:\Projects 2027\Glowup promo\shorts\krash30-v2-<name>.mp4` with a frame sheet `krash30-v2-<name>-sheet.jpg`.
Captions follow the script the model was given; phrase times come from an RMS envelope of the take (speech band
250–3500 Hz), not from a transcript. Nobody has listened to the takes yet.

### live-v2-park — «Меня обогнала бабушка» (21 s)

Take: he jogs to camera, an old woman with a tartan trolley overtakes him, pigeons fly up, he folds over; selfie end.
Lines: «Мы сделали игру про скуфа. Скуф — это я. Первый круг!» / «Колет в боку!» / «Меня обогнала бабушка. Побегу
ли я завтра — решаешь ты. Демо — в канале.» Music: pov's.

| Time | On screen | Heard |
|---|---|---|
| 0–0.8 | cold open: she passes him, «Меня обогнала бабушка.» | take 5.9–6.7 |
| 0.8–5.3 | Андрей jogs to camera, «Мы сделали игру про скуфа.», «Скуф — это я.», «Первый круг!» | his lines (take 0.2–4.7) |
| 5.3–6.5 | День 1, A1-run: tap «Пробежка в парке» | music |
| 6.5–10.3 | she overtakes him, «Колет в боку!»; she walks on, he stands bent | take 6.8–8.6, 9.0–11.0 |
| 10.3–11.8 | День 1, A1-run «закололо в боку»: «Закололо в боку, вторую половину пришлось идти шагом.», Форма +1 | music |
| 11.8–15.8 | selfie, she is small behind him: «Меня обогнала бабушка.», «Побегу ли я завтра — решаешь ты.» | his lines (take 13.95–17.95) |
| 15.8–17.2 | День 5, A5-run «получилось»: «Три круга по парку. На третьем обогнал собачника с таксой.», Форма +3 | music |
| 17.2–18.2 | «Демо — в канале.» | his line (take 18.75–19.75) |
| 18.2–21 | end card with the nick | music |

The Форма percentages (15→16, 21→24) are invented for the ad, as in v1; the deltas are the cards' own.

### live-v2-pies — «Я на диете» (21 s)

Take: he holds up a plate with one cucumber slice; his mother's arm stacks enamel pots of pirozhki into a tower of six,
the ginger cat jumps on top, the tower falls, pies roll, he stuffs one whole; he talks with his mouth full. Lines:
«Мы сделали игру. Я в ней главный скуф. Я на диете.» / «Мама принесла двадцать пирожков. Сколько съем — решаешь ты.
Демо — в канале.» Music: feed's.

| Time | On screen | Heard |
|---|---|---|
| 0–0.7 | cold open: the tower with the cat topples, «Я на диете.» | take 9.5–10.2 |
| 0.7–4.2 | Андрей with the cucumber plate: «Мы сделали игру.», «Я в ней главный скуф.», «Я на диете.» | his lines (take 0.15–3.65) |
| 4.2–5.4 | День 1, K1-04 «Мама с пирожками»: «Мама на пороге с кастрюлей. «Двадцать штук, с картошкой. Ешь, пока горячие».», its three choices, tap «Съесть пять» | music |
| 5.4–11 | jump cuts: pots ×2, ×4, ×6, the cat lands, the tower falls, he stuffs a pie | take 4.0–4.9, 6.7–7.9, 8.0–8.9, 9.3–11.9 |
| 11–12.6 | «Съесть пять» → «Пять пирожков. Ремень стал теснее.», Форма −2 | music |
| 12.6–18.3 | mouth full: «Мама принесла двадцать пирожков.», «Сколько съем — решаешь ты.», «Демо — в канале.» | his lines (take 14.25–19.95) |
| 18.3–21 | end card with the nick | music |

The ×2/×4/×6 counters are ad graphics, not game text.

### live-v2-mirror — «Втягиваю живот» (20.6 s)

Take: sideways at the mirror he sucks in his belly, close-up of the belt straining, the whole belt snaps off, flies
across the bathroom into the sink and knocks the toothbrush cup over; he holds up the torn belt to camera. The prompt
asked for the buckle alone; the model sent the whole belt, which reads fine. Lines: «Втягиваю живот.» / «Десять
секунд — мой рекорд. Мы сделали игру: тридцать дней, и каждый выбор считается. Демо — в канале.» Music: chat's.

| Time | On screen | Heard |
|---|---|---|
| 0–0.8 | cold open: the belt in the air, «Втягиваю живот.» | take 4.9–5.7 |
| 0.8–7.6 | at the mirror «Втягиваю живот.»; the belt strains; it flies, the cup falls into the sink | his line, the creak and clatter (take 1.2–3.0, 3.0–4.6, 4.6–8.0) |
| 7.6–8.8 | День 2, K2-02a «Зеркало»: «Утро, зеркало. Пирожки никуда не делись.», tap «Втянуть живот» | music |
| 8.8–10.7 | the torn belt to camera: «Десять секунд — мой рекорд.» | his line (take 11.6–13.5) |
| 10.7–12 | «Втянуть живот» → «Живот продержался десять секунд.» | music |
| 12–17.6 | «Мы сделали игру:», «тридцать дней, и каждый выбор считается.», «Демо — в канале.» | his lines (take 14.0–19.6) |
| 17.6–20.6 | end card with the nick | music |

### live-v2-soda — «Сода с лимоном» (20.5 s)

Take: a spoon of soda over the lemon juice; the glass shoots a foam column as tall as the cabinets, foam floods the
counter and the phone; he sips anyway, foam moustache, «Ай!»; he wipes the phone and talks to camera. Lines: «Сода с
лимоном. Зубы белые за вечер.» / «Ай!» / «Не работает. Мы сделали игру — проверяй там, а не на себе. Демо — в
канале.» Music: feed's.

| Time | On screen | Heard |
|---|---|---|
| 0–0.8 | cold open: the foam column, «Сода с лимоном.» | take 3.8–4.6 |
| 0.8–3.4 | the spoon over the glass: «Сода с лимоном.», «Зубы белые за вечер.» | his lines (take 0.3–2.9) |
| 3.4–4.6 | День 1, K1-07b «Лента: сода с лимоном»: «Сода с лимоном отбеливают зубы за вечер», tap «Попробовать» | music |
| 4.6–11 | the eruption; he sips the foam, «Ай!» | take 3.4–7.2, 8.2–10.8 |
| 11–12.5 | «Зубы скрипят и ноют от холодной воды. Белее не стали.», Зубы −3 | music |
| 12.5–17.5 | foam moustache, wet phone: «Не работает.», «Мы сделали игру —», «проверяй там, а не на себе.», «Демо — в канале.» | his lines (take 14.7–19.7) |
| 17.5–20.5 | end card with the nick | music |

The Зубы percentage (30→27) is the ad's own, as in live-4; the −3 is the card's.
