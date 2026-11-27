# BotFather kit for @glowupchallenge30bot

The texts of the bot profile (`/mybots` → the bot → Edit Bot); only the authors change them in BotFather. State on 2026-11-27, 18:02, as reported by the main game chat (not checked from this repository): the name and the description below are already set, the description being the earlier text with the new name in its first line; About is unchanged. The limits were counted with `node` on 2026-11-27.

## Name (Edit Name, up to 64 characters)

```
Glow Up: челлендж 30 дней
```

## About (Edit About, up to 120 characters; 109 used)

```
Игра о том, как за 30 дней привести героя в форму и понравиться крашу. Первый день можно сыграть прямо здесь.
```

## Description (Edit Description, up to 512 characters; 395 UTF-16 units)

Shown in an empty chat with the bot, above the «Старт» button.

```
«Glow Up: челлендж 30 дней» — игра о герое, у которого есть месяц, чтобы привести себя в форму и понравиться человеку.

Что умеет бот:
▶️ открыть первый день игры прямо в Telegram;
🗳 позвать на голосование, от которого зависит, что авторы напишут дальше;
✍️ принять отзыв или баг: в общий чат или только авторам;
🎁 записать тебя в список: когда выйдет продолжение, бот напишет.

Нажми «Старт».
```

## Description picture (Edit Description Picture, 640×360)

`promo/botfather/description.png`, drawn in code by `promo/botfather/make.ts` (run `npx tsx promo/botfather/make.ts`; the SVG source is `description.svg`). Redrawn with the new name on 2026-11-27 and **not uploaded to BotFather yet**: the main game chat or Ruslan uploads it.

## Commands (Edit Commands)

Paste as one message:

```
start - Меню и первый день игры
```

`/stats` (creator codes) and the admin commands (`/addcode`, `/setvote`, `/post`, `/posts`, `/delpost`, `/broadcast`) stay out of the public list on purpose: they are for creators and the authors only.
