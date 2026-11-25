# Content format — writing scenario that runs in the game as is

English guide to the content format. It follows the Russian `docs/CONTENT_FORMAT.md` (the Production chat's original) and was checked line by line against `src/engine/types.ts`, `src/engine/validate.ts` and `src/engine/game.ts` on 2026-11-22. If this guide disagrees with the code, the code wins.

The scenario lives in `content/` as JSON. The engine reads the files as they are; no code changes are needed. After edits run `npm run check:content`: it finds broken references and cards a player could get stuck on.

All text values are player-facing and stay Russian.

## Files

| File | Contents |
|---|---|
| `balance.json` | Game numbers: days, energy, start chance and its cap, how many days are written (`contentDays`), demo length (`demoDays`, not above `contentDays`) |
| `days.json` | One entry per day: title, gift for the day, the «what happens tomorrow» line |
| `problems.json` | Problem templates: weight, skin, teeth and so on |
| `archetypes.json` | Heroes: look and problem set (at least 5) |
| `crushes.json` | Crushes and their pool of hidden tastes |
| `tastes.json` | Tastes: what must be true for a taste to count in the player's favour |
| `items.json` | Items: shop goods and gifts |
| `chat.json` | Crush phrases by situation, about 10 variants each |
| `hints.json` | Hints that land in the notebook |
| `rumors.json` | Rumours for the feed: `{ "id": { "text": "…", "source": "…" } }` |
| `cards/*.json` | Cards. Any number of files, each holds an array. Files are merged; inside a file the order is kept |

## Card

```json
{
  "id": "e_mom_derm",
  "kind": "event",
  "title": "Мама звонит",
  "speaker": "Мама",
  "text": "«Я нашла телефон дерматолога. Запиши, пока не забыл».",
  "when": { "days": [1, 6], "parts": ["morning", "day"], "requires": [{ "problem": "skin", "gte": 30 }] },
  "choices": [
    {
      "id": "book",
      "label": "Записаться на завтра",
      "cost": { "energy": 2, "coins": 50 },
      "outcomes": [
        { "text": "Запись на завтра, 11:30.", "effects": [{ "hint": "derm_number" }, { "queue": "q_derm_visit", "inDays": 1 }] }
      ]
    },
    {
      "id": "later",
      "label": "Сказать «ага, позвоню»",
      "outcomes": [{ "text": "{hero} возвращается к сериалу.", "effects": [{ "flag": "brushed_mom_off" }] }]
    }
  ]
}
```

Card fields: `id`, `kind`, `title`, `text`, `choices` are required. `speaker` (who is talking), `says` and `when` are optional.

`says` is a situation key from `chat.json`: the crush writes that phrase into the chat when the card opens.

### Card kinds (`kind`)

| Kind | When it arrives |
|---|---|
| `story` | The narrow tree, the crush line. Served first as soon as day and conditions match, in file order. Needs `when.days` or `when.requires`, otherwise the check fails |
| `event` | The wide deck. Drawn at random by `weight` among eligible cards |
| `chat` | A fork in the correspondence. Drawn from the same deck as `event`. The chosen option's `label` goes into the chat as the hero's message |
| `quest` | A quest step. Never drawn on its own; a `queue` effect schedules it. The check fails if no card queues it |
| `action` | A plus-menu action: run, shower, sleep. The player picks it from the menu |

On the plus button the game serves queued quest steps first, then story cards in file order. When nothing mandatory is left, the «Чем заняться» menu opens: actions and, if the deck has eligible cards, the line «посмотреть, что происходит вокруг». The deck (`event` and `chat`) gives at most `balance.cardsPerPart` cards per part of the day; story, quest and action cards do not count.

Story waits for the player: a morning story card also arrives in the day and evening of the same day if the player comes in late. For every other kind `parts` means exactly those parts.

An action with one choice runs straight from the menu. An action with several choices opens as a normal card (sleep works this way).

### When a card can appear (`when`)

- `days`: from which day to which day, inclusive, within 1–30.
- `parts`: which parts of the day: `morning` (06–12), `day` (12–18), `evening` (18–23), `night` (23–06, still the previous game day).
- `requires`: conditions, all must hold.
- `weight`: deck weight, default 1. Weight 3 appears three times as often.
- `cooldownDays`: after how many days the card may appear again. Without it the card appears once per game.

### No-dead-ends rule

Every card except `action` needs at least one choice with no cost and no requirements. The content check enforces this, so a player never hits a wall, even with zero energy and coins. Actions are exempt: the player picks them from the menu.

### Choices

- `requires`: a choice whose conditions fail is hidden.
- `cost`: `{ "energy": n, "coins": n }`. A choice the player cannot afford is shown but cannot be picked.
- `neutral`: `true` on the calmest choice of a `story` card, the one with the smallest consequences. The engine takes it when the player skipped the card (see "Skipped story cards"). Every story card needs exactly one, and it must have no `cost` and no `requires`; the content check enforces this. Other card kinds do not use it.

```json
{ "id": "scroll", "neutral": true, "label": "Пролистать", "outcomes": [{ "text": "Пост остался в ленте." }] }
```

## Outcomes

A choice can have several outcomes. First those whose `if` conditions hold are kept, then one is picked by `weight` (default 1). If no outcome fits, the last outcome in the list is used.

Two optional fields:

- `hint`: two or three words about the outcome. If at least two outcomes fit and at least one has a `hint`, the player sees honest odds in words under the button: «часто: смеются, иногда: тишина». The word comes from the weights: from 60% «часто», from 25% «иногда», below that «редко». Outcomes without `hint` show as «иначе».
- `why`: the reason next to the chance scale if the chance changed: «−2: Сообщение с сердечком». Without `why` the card title is shown.

"The obvious solution can hurt":

```json
"outcomes": [
  { "weight": 3, "text": "От мази стало хуже.", "effects": [{ "problem": "skin", "add": 10 }, { "flag": "derm_failed" }] },
  { "weight": 2, "text": "Воспаление стало спадать.", "effects": [{ "problem": "skin", "add": -14 }] }
]
```

"A tired hero slips":

```json
"outcomes": [
  { "if": [{ "stat": "energy", "lte": 1 }], "text": "Сил спорить с собой не осталось.", "effects": [{ "problem": "weight", "add": 5 }] },
  { "if": [{ "stat": "energy", "gte": 2 }], "text": "Получилось пройти мимо.", "effects": [{ "problem": "weight", "add": -2 }] }
]
```

## Conditions

Used in `when.requires`, `choice.requires`, `outcome.if` and in tastes. Numbers accept `eq`, `gte` (at least), `lte` (at most); several in one condition must all hold.

| Condition | Meaning |
|---|---|
| `{ "flag": "lied_to_mom" }` | Flag is set |
| `{ "flag": "lied_to_mom", "set": false }` | Flag is not set |
| `{ "flag": "mood", "eq": "angry" }` | Flag is set and has this value |
| `{ "flagAge": "lied_to_mom", "gte": 2 }` | Flag was set at least 2 days ago |
| `{ "problem": "skin", "gte": 30 }` | Problem level: 100 neglected, 0 solved |
| `{ "stat": "energy", "lte": 1 }` | `energy`, `coins`, `chance`, `affinity`, `day`, `streak` |
| `{ "counter": "smoke_free", "gte": 3 }` | Counter value; a missing counter is 0 |
| `{ "modifier": "gym", "gte": 2 }` | Modifier with this `id` is running: from the morning after it was set through its last morning (`fromDay < day <= fromDay + days`); on the day it is set it is not running yet. `eq`/`gte`/`lte` compare the days it has left, the mornings after today on which it still works (`fromDay + days - day`: `days - 1` on its first day, 0 on its last; no end without `days`). Without a comparison: just running. `"set": false`: not running. The checker wants some card or item to set a modifier with this `id` |
| `{ "item": "cream" }` | Item is in the inventory; `"gte": 2` asks for at least two |
| `{ "part": ["night"] }` | Current part of the day |
| `{ "gender": "f" }` | Hero's gender |
| `{ "archetype": ["andrey"] }` | Hero's archetype |
| `{ "taste": "glasses", "revealed": true }` | The crush has this taste and the player already knows it. Without `revealed` only "has the taste" is checked |
| `{ "seen": "c01_reply" }` | Card has been played |
| `{ "any": [ ... ] }` | One of the conditions is enough |
| `{ "count": [ ... ], "gte": 2 }` | How many of the listed conditions hold: at least `gte`, at most `lte` (one or both). The list must not be empty; the checker also checks every condition inside |
| `{ "not": { ... } }` | Condition does not hold |

## Effects

| Effect | What it does |
|---|---|
| `{ "problem": "skin", "add": -12 }` | Negative heals, positive worsens. Clamped to 0–100; ignored if the hero lacks this problem |
| `{ "stat": "energy", "add": 2 }` | `energy` (0 to `energyCap`), `coins` (not below 0), `affinity` (the crush's attitude, −40 to 60) |
| `{ "flag": "lied_to_mom" }` | Sets a flag and remembers the day. Optional `"value"`: number, string or boolean, default `true` |
| `{ "unflag": "lied_to_mom" }` | Removes a flag |
| `{ "counter": "smoke_free", "add": 1 }` | Changes a counter. `"set": 1` sets it instead |
| `{ "tomorrow": [{ "stat": "energy", "add": -1 }] }` | The effects inside apply next morning, after the day's energy is set |
| `{ "item": "cream", "add": 1 }` | Gives or takes an item |
| `{ "look": { "hair": "buzz" } }` | One-off look change: haircut, dye, new clothes. Overrides what problems draw |
| `{ "queue": "q_derm_visit", "inDays": 1, "part": "day" }` | Schedules a card. `inDays` defaults to 0. With `part` it waits for that part; on a later day it arrives in any part |
| `{ "chat": "warm" }` | The crush writes a phrase from situation `warm` in `chat.json` |
| `{ "write": "Привет!" }` | The hero writes to the crush |
| `{ "hint": "derm_number" }` | Hint into the notebook, once |
| `{ "rumor": "soda" }` | Rumour into the feed, once |
| `{ "reveal": "glasses" }` | Reveals a hidden taste, if the crush has it |
| `{ "modifier": { ... } }` | Lasting change, see below |
| `{ "log": "Строка в журнал" }` | Journal entry only |
| `{ "closeDay": true }` | Ends the day now: hero frame, day card, reward. Applied after the choice's other effects. Sleep works this way |

A modifier:

```json
{ "modifier": { "id": "gym_pass", "title": "Абонемент в зал", "energyPerDay": 1, "days": 10,
                "daily": [{ "problem": "weight", "add": -2 }] } }
```

`energyPerDay` adds to each morning's energy, `daily` changes problems each morning, `days` is the number of mornings it works, starting the morning after it was set (without it, to the end of the game). A modifier with the same `id` replaces the old one.

### The chance to be liked

It cannot be set directly. The engine computes it: `balance.chanceBase` + share of solved problems × `balance.chanceFromProblems` + `affinity` + bonuses of matched tastes, rounded and kept between 1 and `balance.chanceCap`. "Solved" is measured against the starting level of each problem. The formula can therefore be shown to the player as it is.

## Service flags and keys

- Flag `chance_shown` opens the chance scale on screen. From day 2 the scale is always visible.
- Flag `chance_note` with a string value shows a line under the scale: `{ "flag": "chance_note", "value": "Алина пока не знает, что ты существуешь" }`.
- Situations in `chat.json` whose key starts with `status_` are not the crush's words but a service line in the chat: «была в сети в 23:41, ответа нет».
- Phrases in a situation are not repeated until all of them have been used.

## Day end

The day ends by itself at 06:00, or earlier through a `closeDay` effect. At that moment the game saves the hero frame for the timelapse and shows the day card: stat changes, up to three key decisions, the reward and the line about tomorrow.

A day counts as played if the player made at least one choice or used an item. A played day gives `balance.dayCoins` coins, the gift from `days.json` and +1 to `streak`. A skipped day gives nothing, resets `streak` and worsens every problem by its `regress`.

```json
{ "day": 1, "title": "Приглашение", "gift": "gum", "teaser": "Утром: сообщение от мамы" }
```

### Skipped story cards

Author decision 3 in `docs/DECISIONS.md`: a skipped day does not break the story. When the clock ends a day (06:00) and the player has not ended it with sleep, every `story` card of that day that is still waiting is played automatically with its `neutral` choice:

- Cards go in file order, and eligibility is re-checked after each one, so a neutral choice that sets a flag opens the later cards gated by that flag. Cards of every part of the day count, also a card left open on the screen.
- The outcome is picked as usual (conditions, weights, the seeded roll), its effects apply and the card is marked as seen. A `closeDay` effect inside a neutral outcome is ignored, the clock closes the day.
- Each card is written to the journal with the kind `auto`, under its own part of the day, and to `state.missed`. On the next visit the player sees «Пока тебя не было»: card titles and outcome texts grouped by day, one button «Понятно». The summary comes before the day cards and before «Продолжение следует».
- It is not the player's decision: nothing goes to `history`, and the day does not become played. A fully skipped day still gives no reward, resets `streak` and worsens problems by `regress`. A partly played day keeps its reward, only the remaining cards are resolved.
- Only `story` cards are auto-played. Actions (sleep included), events and chat forks are not. A `quest` step queued for a skipped day stays in the queue and comes first on the next visit.

When writing a neutral choice, assume the player never saw the card: it must not spend coins, send a message to the crush or start a course on the player's behalf, and its outcome text must read well in the summary without the card text.

When the demo days run out (`balance.demoDays`), the game shows «Продолжение следует». `contentDays` is how many days have written content: `check:content` rejects a card whose `when.days` end after it, and `demoDays` above it. On the dev page, `?full` in the URL lifts the cut-off to `contentDays`. On day 30 the verdict is rolled against the chance.

## Memory

A flag remembers the day it was set. Any text may use:

- `{hero}`: hero's name
- `{crush}`: crush's name
- `{day:lied_to_mom}`: the day the flag was set

Example: `«Ты на {day:brushed_mom_off}-й день обещал позвонить врачу»`. A card with such text needs a condition on that flag, otherwise a question mark is shown instead of the day.

## Problems and look

A problem level from 0 to 100 changes the hero's picture by itself. The link is set in `problems.json`:

```json
{ "id": "skin", "title": "Кожа", "bar": "Кожа", "icon": "drop", "regress": 2,
  "look": [{ "param": "acne", "at0": 0, "at100": 100 }] }
```

- `bar`: the label of the bar on screen.
- `regress`: how much worse it gets per skipped day.
- `look`: which numeric look parameter the problem drives, interpolated from `at0` (solved) to `at100` (neglected).
- `stages` (optional, not used yet): discrete steps, `[{ "below": 40, "set": { "glasses": "thin" } }]`. The step with the smallest `below` that is not lower than the level applies.

The current problems are `weight`, `skin`, `teeth`, `style`, `care` (drives `hairCare`), `conf` (drives `posture`). Smell and smoking are not visible on the picture.

Numeric look parameters: `weight` (0 thin, 50 in shape, 100 heavy), `acne`, `teeth`, `hairCare`, `posture`, `tired`, `mood` (from 60 the hero smiles with teeth), `clothesCare`.

Enumerated parameters, changed with the `look` effect:

- `hair`: `bald`, `receding`, `buzz`, `short`, `side`, `messy`, `curly`, `long`, `bob`, `ponytail`, `bun`
- `glasses`: `none`, `thick`, `taped` (thick frame with tape), `thin`, `round`
- `facial`: `none`, `stubble`, `patchy`, `beard`
- `neckline`: `wide`, `crew`, `v`, `collar`, `hood`, `lapel`
- `bottom`: `sweats`, `jeans`, `trousers`, `skirt`
- colours as `#RRGGBB`: `hairColor`, `topColor`, `bottomColor`, `shoeColor`
- `skin`: skin tone 0 to 4
- `piercing`: `true` or `false`

## Heroes, crushes, tastes

- An archetype needs at least 5 problems, and at least one crush of the opposite gender must exist.
- A crush gets `tasteCount` tastes drawn at random from `tastePool` at the start of a game.
- A taste adds `bonus` to the chance while all its `wants` conditions hold.

## Items

```json
{ "id": "cream", "title": "Крем от соседки", "blurb": "Мажется на ночь.", "icon": "tube",
  "price": { "coins": 40 },
  "limits": "Убирает часть прыщей. Всю кожу один тюбик не вылечит.",
  "onUse": [{ "problem": "skin", "add": -12 }], "energy": 0 }
```

`limits` is mandatory. It is the plain-language note the player sees before buying: what the item does not guarantee. `energy` is the energy cost of using it. For real-money goods use `"price": { "iap": "product_code" }` instead of `coins`. An item without `price` is not sold; it can only be received as a day gift or through an `item` effect.

## Icons

`plus`, `close`, `check`, `up`, `down`, `bolt`, `coin`, `heart`, `mirror`, `chat`, `feed`, `bag`, `sunrise`, `sun`, `sunset`, `moon`, `drop`, `dumbbell`, `tooth`, `scissors`, `shirt`, `spine`, `tube`, `bulb`, `clock`, `flame`, `lock`, `gum`, `note`.

## Not supported by the engine yet

- Sending photos in the chat.
- Multiple languages: texts are Russian only.
- Real-money purchases: the format and a server stub exist, store verification does not.
- Buttons directly inside the feed: a post's choice is made through a card, and the post reaches the feed through a `rumor` effect.
- Referral link and the «Сообщить о полной версии» button on the demo end screen.
- Hero selection: the game starts as Andrey.
