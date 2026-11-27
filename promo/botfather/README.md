# BotFather kit for @glowupchallenge30bot

Ruslan pastes these into BotFather himself (`/mybots` → the bot → Edit Bot). Texts are proposals for his review; the limits were counted with `node` on 2026-11-27.

## Name (Edit Name, up to 64 characters)

```
Краш за 30 дней
```

## About (Edit About, up to 120 characters; 109 used)

```
Игра о том, как за 30 дней привести героя в форму и понравиться крашу. Первый день можно сыграть прямо здесь.
```

## Description (Edit Description, up to 512 characters; 385 UTF-16 units)

Shown in an empty chat with the bot, above the «Старт» button.

```
«Краш за 30 дней» — игра о герое, у которого есть месяц, чтобы привести себя в форму и понравиться человеку.

Что умеет бот:
▶️ открыть первый день игры прямо в Telegram;
🗳 позвать на голосование, от которого зависит, что авторы напишут дальше;
✍️ принять отзыв или баг: в общий чат или только авторам;
🎁 записать тебя в список: когда выйдет продолжение, бот напишет.

Нажми «Старт».
```

## Description picture (Edit Description Picture, 640×360)

`promo/botfather/description.png`, drawn in code by `promo/botfather/make.ts` (run `npx tsx promo/botfather/make.ts`; the SVG source is `description.svg`).

## Commands (Edit Commands)

Paste as one message:

```
start - Меню и первый день игры
```

`/stats` (creator codes) and the admin commands (`/addcode`, `/setvote`, `/post`, `/posts`, `/delpost`, `/broadcast`) stay out of the public list on purpose: they are for creators and the authors only.
