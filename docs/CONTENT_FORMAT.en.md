# Content format — writing scenario that runs in the game as is

English translation of the Production chat's «Формат контента» (project doc of 2026-11-22), plus later additions recorded in the shared contract. The schema in `src/engine/types.ts` and the checks in `src/engine/validate.ts` are the source of truth; if this guide disagrees with them, they win. A Russian `docs/CONTENT_FORMAT.md` may exist in the repo and may be newer.

The scenario lives in `content/` as JSON. The engine reads the files as they are; no code changes are needed. After edits run `npm run check:content`: it finds broken references and cards a player could get stuck on.

All text values are player-facing and stay Russian.

## Files

| File | Contents |
|---|---|
| `balance.json` | Game numbers: days, energy per day, chance cap |
| `problems.json` | Problem templates: acne, weight, teeth and so on |
| `archetypes.json` | Heroes: look and problem set (at least 5) |
| `crushes.json` | Crushes and their pool of hidden tastes |
| `tastes.json` | Tastes: what must be true for a taste to count in the player's favour |
| `items.json` | Shop items |
| `chat.json` | Crush phrases by situation, about 10 variants each |
| `hints.json` | Hints that land in the notebook automatically |
| `rumors.json` | Rumours for the feed |
| `cards/*.json` | Cards. Any number of files, each holds an array |

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

### Card kinds (`kind`)

| Kind | When it arrives |
|---|---|
| `story` | The narrow tree, the crush line. Served first as soon as day and conditions match. Order in the file equals display order |
| `event` | The wide deck. Drawn at random by weight among eligible cards |
| `quest` | A quest step. Never drawn on its own; a `queue` effect schedules it |
| `chat` | A fork in the correspondence. The chosen option goes into the chat as the hero's message |
| `action` | A plus-menu action (added for Day 1) |

On the plus button the game serves queued steps first, then story, then the deck. The deck gives at most `balance.cardsPerPart` cards per part of the day.

A card may carry `says`: a situation key from `chat.json`. The crush writes that phrase when the card opens.

### When a card can appear (`when`)

- `days`: from which day to which day, inclusive.
- `parts`: which parts of the day: `morning`, `day`, `evening`, `night`.
- `requires`: conditions, all must hold.
- `weight`: deck weight, default 1. Weight 3 appears three times as often.
- `cooldownDays`: after how many days the card may appear again. Without it the card appears once per game.

### No-dead-ends rule

Every card needs at least one choice with no cost and no requirements. The content check enforces this, so a player never hits a wall, even with zero energy and coins.

## Outcomes

A choice can have several outcomes. First those whose `if` conditions hold are kept, then one is picked by `weight`. An outcome can carry a `hint` label shown to the player in words (часто, иногда, редко).

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

Used in `when.requires`, `choice.requires`, `outcome.if` and in tastes. Numbers accept `eq`, `gte` (at least), `lte` (at most).

| Condition | Meaning |
|---|---|
| `{ "flag": "lied_to_mom" }` | Flag is set |
| `{ "flag": "lied_to_mom", "set": false }` | Flag is not set |
| `{ "flagAge": "lied_to_mom", "gte": 2 }` | Flag was set at least 2 days ago |
| `{ "problem": "skin", "gte": 30 }` | Problem level: 100 neglected, 0 solved |
| `{ "stat": "energy", "lte": 1 }` | `energy`, `coins`, `chance`, `affinity`, `day`, `streak` |
| `{ "counter": "smoke_free", "gte": 3 }` | Counter value |
| `{ "item": "cream" }` | Item is in the inventory |
| `{ "part": ["night"] }` | Current part of the day |
| `{ "gender": "f" }` | Hero's gender |
| `{ "archetype": ["andrey"] }` | Hero's archetype |
| `{ "taste": "glasses", "revealed": true }` | The crush has this taste and the player already knows it |
| `{ "seen": "c01_reply" }` | Card has been played |
| `{ "any": [ ... ] }` | One of the conditions is enough |
| `{ "not": { ... } }` | Condition does not hold |

## Effects

| Effect | What it does |
|---|---|
| `{ "problem": "skin", "add": -12 }` | Negative heals, positive worsens |
| `{ "stat": "energy", "add": 2 }` | `energy`, `coins`, `affinity` (the crush's attitude) |
| `{ "flag": "lied_to_mom" }` | Sets a flag and remembers the day |
| `{ "unflag": "lied_to_mom" }` | Removes a flag |
| `{ "counter": "smoke_free", "set": 1 }` | Sets a counter |
| `{ "tomorrow": [{ "stat": "energy", "add": -1 }] }` | Applies effects at the start of the next day |
| `{ "item": "cream", "add": 1 }` | Gives or takes an item |
| `{ "look": { "hair": "buzz" } }` | One-off look change: haircut, dye, new clothes |
| `{ "queue": "q_derm_visit", "inDays": 1, "part": "day" }` | Schedules a quest step |
| `{ "chat": "warm" }` | The crush writes a phrase from situation `warm` in `chat.json` |
| `{ "write": "Привет!" }` | The hero writes to the crush |
| `{ "hint": "derm_number" }` | Hint into the notebook |
| `{ "rumor": "soda_teeth" }` | Rumour into the feed |
| `{ "reveal": "glasses" }` | Reveals a hidden taste of the crush |
| `{ "modifier": { ... } }` | Lasting change, for example a gym pass |
| `{ "log": "Строка в журнал" }` | Journal entry only |

The chance to be liked cannot be changed directly. It is computed: start 3%, share of solved problems, `affinity` and matched tastes, capped by `balance.chanceCap`. The formula can therefore be shown to the player as it is.

## Memory

A flag remembers the day it was set. Any text may use:

- `{hero}`: hero's name
- `{crush}`: crush's name
- `{day:lied_to_mom}`: the day the flag was set

Example: `«Ты на {day:brushed_mom_off}-й день обещал позвонить врачу»`. A card with such text needs a condition on that flag, otherwise a question mark is shown instead of the day.

## Problems and look

A problem level from 0 to 100 changes the hero's picture by itself. The link is set in `problems.json`:

```json
{ "id": "skin", "title": "Прыщи", "bar": "Кожа", "icon": "drop", "regress": 4,
  "look": [{ "param": "acne", "at0": 0, "at100": 100 }] }
```

- `regress`: how much worse it gets per skipped day.
- `look`: which look parameter the problem drives.

There are no discrete stages: the hero is drawn in code and numeric parameters change smoothly. Pimples disappear one by one (16 dots).

Numeric look parameters: `weight` (0 thin, 50 in shape, 100 heavy), `acne`, `teeth`, `hairCare`, `posture`, `tired`, `mood`, `clothesCare`.

Enumerated parameters, changed with the `look` effect:

- `hair`: `bald`, `receding`, `buzz`, `short`, `side`, `messy`, `curly`, `long`, `bob`, `ponytail`, `bun`
- `glasses`: `none`, `thick`, `taped`, `thin`, `round`
- `facial`: `none`, `stubble`, `patchy`, `beard`
- `neckline`: `wide`, `crew`, `v`, `collar`, `hood`, `lapel`
- `bottom`: `sweats`, `jeans`, `trousers`, `skirt`
- colours as `#RRGGBB`: `hairColor`, `topColor`, `bottomColor`, `shoeColor`
- `skin`: skin tone 0 to 4

Smell and smoking are not visible on the picture.

## Items

```json
{ "id": "cream", "title": "Крем от соседки", "blurb": "Мажется на ночь.", "icon": "tube",
  "price": { "coins": 40 },
  "limits": "Убирает часть прыщей. Всю кожу один тюбик не вылечит.",
  "onUse": [{ "problem": "skin", "add": -12 }] }
```

`limits` is mandatory. It is the plain-language note the player sees before buying: what the item does not guarantee. For real-money goods use `"price": { "iap": "product_code" }` instead of `coins`.

## Icons

`plus`, `close`, `check`, `up`, `down`, `bolt`, `coin`, `heart`, `mirror`, `chat`, `feed`, `bag`, `sunrise`, `sun`, `sunset`, `moon`, `drop`, `dumbbell`, `tooth`, `scissors`, `shirt`, `spine`, `tube`, `bulb`, `clock`, `flame`, `lock`, `note`.

## Not supported by the engine yet

- Sending photos in the chat.
- Multiple languages: texts are Russian only.
- Real-money purchases: the format and a server stub exist, store verification does not.
- Sleep as a separate limiting mechanic: today it is a regular problem `sleep` plus night cards.
- Buttons directly inside the feed: a post's choice is made through a card.
