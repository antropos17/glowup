# Game sounds

Eight short sounds, one per event. `src/ui/sound.ts` loads and plays them; `src/ui/Game.tsx` decides when.
They were picked by numbers first; the author then listened to all of them on the showcase page
(`npm run dev`, block «Звуки») on 2026-11-23, approved seven and replaced the card-open sound (a whoosh,
`whoosh/sweep`) with the marimba note below, chosen by ear out of four candidates.

| File | Event | Plays when |
|---|---|---|
| `tap.mp3` | tap | any button of the game, unless a sound below already answered that tap |
| `open.mp3` | a card or sheet opens | the plus button, «Что дальше», an action or event that opens a card |
| `up.mp3` | the chance went up | a choice whose result shows a positive chance change |
| `down.mp3` | the chance went down | a choice whose result shows a negative chance change |
| `coins.mp3` | coins received or spent | a shop purchase; a choice that changes the coin count |
| `message.mp3` | a line from the crush | a choice that adds a crush line to the chat (status lines included) |
| `dayend.mp3` | the day is closed | the choice that puts the hero to sleep |
| `away.mp3` | «Пока тебя не было» | the summary of skipped story cards appears |

One tap plays one sound. When a choice does several things the order is: day closed, chance moved, crush line,
coins. The chance sounds follow the screen: while the chance is still hidden on Day 1, a choice that moves it
plays the plain tap.

## How they were made

Tool: [earshot](https://github.com/Leonxlnx/earshot) 1.0.0, commit `7a7f7c5c70d4a763a1eca4b3666af7c77e313f97`,
core install only (numpy, scipy, soundfile, soxr, numba; no listening models, no network at render time).
The same command with the same seed gives the same samples.

```
earshot make "a very short soft neutral tap"            --sound tap/tone        --seed 2 --mono -o tap.wav
earshot make "a soft warm single note"                   --sound notify/single   --theme soft --pitch C5 --seed 1 --mono -o open.wav
earshot make "a soft gentle success"                    --sound success/fifth   --theme soft --seed 0 --mono -o up.wav
earshot make "a soft gentle muted tone"                 --sound error/fall      --theme soft --pitch A4 --seed 0 --mono -o down.wav
earshot make "a soft small coin"                        --sound coin/soft       --theme soft --seed 1 --mono -o coins.wav
earshot make "a soft message received"                  --sound receive/cork    --seed 2 --mono -o message.wav
earshot make "a calm soft slow two-note ending, low"    --sound notify/pair     --theme soft --dur 1.3 --seed 2 --mono -o dayend.wav
earshot make "a soft neutral notification"              --sound notify/mid_wood --seed 2 --mono -o away.wav
```

Then, with ffmpeg and ffprobe on PATH and the Python of the earshot environment:

```
python assets/sounds/finish.py <folder with the eight wav files>
```

`finish.py` cuts each sound to its longest allowed length with an 80 ms fade out (the card-open note rings
for 2 s as rendered and is cut to 0.45 s), brings it to −18 LUFS
(momentary max, earshot's own meter) unless the peak would pass −3.6 dBFS, and writes mono mp3, 44.1 kHz,
64 kbit/s. mp3 because it decodes in iOS Safari and Android Chrome alike.

## What the designs are

| File | earshot design | In its catalogue's words |
|---|---|---|
| `tap.mp3` | `tap/tone` | a soft rounded tactile tap, a key-like thock with a faint note in it |
| `open.mp3` | `notify/single` | one clear ringing note (marimba, C5) |
| `up.mp3` | `success/fifth` | two notes a fifth apart rising (marimba, C5) |
| `down.mp3` | `error/fall` | two low notes falling by a minor third, a muted negative tone (marimba, A4) |
| `coins.mp3` | `coin/soft` | one small high note with a faint octave above (marimba) |
| `message.mp3` | `receive/cork` | a small cork popped out of a bottle, a short hollow plop |
| `dayend.mp3` | `notify/pair` | two notes falling by a major third, a gentle two-note call (marimba, C5) |
| `away.mp3` | `notify/mid_wood` | a struck bell notification chime |

How they were chosen, without ears: three takes of two or three designs per event; a design had to keep most of
its energy above 400 Hz (a phone speaker plays little below that, which ruled out the low finger thumps and
`error/fall` at its default C4), then the take with the lowest crest factor (the softest attack) won. `up`
rises, `down` and `dayend` fall but at different speeds, `message` and `away` are not marimba at all. `open` and
`coins` are both a single marimba note; `open` is the plain C5, `coins` has an octave above it.

## Measured (the mp3 files, decoded again)

| File | Length | Peak | Loudness (momentary max) | Size |
|---|---|---|---|---|
| `tap.mp3` | 0.11 s | −4.0 dBFS | −25.9 LUFS | 1 461 B |
| `open.mp3` | 0.45 s | −9.3 dBFS | −18.4 LUFS | 4 178 B |
| `up.mp3` | 0.90 s | −7.0 dBFS | −18.4 LUFS | 7 731 B |
| `down.mp3` | 0.39 s | −8.0 dBFS | −18.4 LUFS | 3 551 B |
| `coins.mp3` | 0.70 s | −7.1 dBFS | −18.4 LUFS | 6 059 B |
| `message.mp3` | 0.38 s | −5.0 dBFS | −18.5 LUFS | 3 551 B |
| `dayend.mp3` | 1.28 s | −8.3 dBFS | −18.4 LUFS | 10 656 B |
| `away.mp3` | 0.30 s | −4.0 dBFS | −18.9 LUFS | 2 924 B |

Total 40 111 bytes; inlined as base64 they take about 53.5 kB of `dist/index.html`.
The tap reads 7 dB lower because the meter averages over 400 ms and the tap lasts 110 ms; its peak is held at
the ceiling like the rest.

## Licence

earshot's code is MIT. Its README says about the output: "Everything earshot renders (`make`, `sfx`, `kit`,
`forge`) belongs to whoever rendered it: free for any use, commercial too, without credit." The learned designs
come from public-domain recordings: "all CC0 or an explicit public-domain dedication", credited in the
`CREDITS.md` files under `earshot/data/` in that repository; "CC0 asks for no credit".
