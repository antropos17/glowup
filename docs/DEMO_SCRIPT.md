# 7-day demo — script

Status: draft v1, 2026-11-22. The 7-day grid and the Day 1 design are done. Day 1 is implemented in `content/cards/day1.json`, Day 2 in `content/cards/day2.json`, Day 3 in `content/cards/day3.json`, Day 4 in `content/cards/day4.json`. Days 5–7 are to be written directly in the engine format.

This file is the design-level description in English. Russian strings in «quotes» are in-game text: copy them verbatim into content.

## 0. Demo assumptions

Set by the Scenario chat where the brainstorm left a question open. The authors have not confirmed them yet.

1. One hero: Andrey (Андрей), 40. A heroine is added later on the same template.
2. One crush: Alina (Алина), a former classmate. Occasion: a class reunion on day 30.
3. Andrey has 5 problems: fitness, skin, teeth, style (old glasses and clothes), smoking.
4. Alina's small taste: she dislikes beards. Andrey has a patchy beard.
5. No real money in the demo. Gold is only earned; items state their exact effect.
6. The demo cuts off on day 7 with «Продолжение следует».
7. All numbers (stats, prices, odds) are starting values for balancing.

## 1. Stats: scenario names and engine names

The scenario uses "higher is better" (0 bad, 100 good). The engine stores a problem level that is inverted (100 neglected, 0 solved). On screen the player sees "how solved".

| Scenario | Engine | Conversion |
|---|---|---|
| `fit` 15 | problem `weight` 85 | `fit +3` becomes `{ "problem": "weight", "add": -3 }` |
| `skin` 25 | problem `skin` 75 | |
| `teeth` 30 | problem `teeth` 70 | |
| `style` 20 | problem `style` 80 | |
| `care` 35 | problem `care` 65 | drives hair grooming on the picture (proposed) |
| `conf` 20 | problem `conf` 80 | drives posture on the picture (proposed) |
| `sym` 0 | stat `affinity` | hidden from the player |
| `energy` | `energy` | 20 on days 1–3, 10 afterwards, set in `balance.json` |
| `gold` 100 | `coins` | set in `balance.json` |
| `smoke_free` | counter | `{ "counter": "smoke_free", "set": 1 }` |
| "tomorrow energy −1" | `tomorrow` effect | `{ "tomorrow": [{ "stat": "energy", "add": -1 }] }` |
| flag | `{ "flag": "d1_smoked" }` | a flag remembers the day it was set |
| day and slot | `"when": { "days": [1, 1], "parts": ["evening"] }` | |
| "often / sometimes" | weighted outcomes with a `hint` label | often 3, sometimes 1 |
| plus-button action | card with `"kind": "action"` | |

The chance scale: start 3%. It is computed from solved problems, `affinity` and matched tastes. A reason line sits next to it, for example «−4: Алина прочитала и не ответила». Random outcomes are labelled in words on the card: часто, иногда, редко.

## 2. Day structure

- Four parts in the player's local time: morning, day, evening, night. The game day starts at 06:00; night after midnight belongs to the previous day.
- Each part has mandatory story cards and the plus button with actions.
- Always free: chat, feed, mirror, conversations.
- Every choice leaves a flag. Later cards check flags and refer to them.
- Day end: day card, day timelapse, 50 gold and a mini-gift.

## 3. Seven-day grid

### Day 1. The invitation («Приглашение»)
- Core: the class chat announces a reunion in 30 days. First mirror, the "before" frame.
- Choices: where to start, whether to write to Alina, the cigarette on the balcony.
- Trap: «сода с лимоном отбеливает зубы» in the feed.
- Alina: reads the message and stays silent.
- Day ends on: «Прочитано в 23:41. Ответа нет».

### Day 2. Mum's number («Мамин номер»)
- Core: mum gives the number of a "good dermatologist": polyclinic, third floor. Appointment for tomorrow.
- Choices: the park for free or a gym pass for gold.
- Trap: the miracle tea from the feed; two days of lower energy afterwards.
- Hint: a note on neighbour Aunt Zina's door, «Крем брать только в аптеке на Садовой». Noticed only if Andrey left home in the morning.
- Alina: silent. In the evening she posts a photo from the coffee shop «Зерно».
- Day ends on: mum writes «Кабинет не перепутай, там их два».

### Day 3. The wrong door («Не та дверь»)
Design agreed with the author on 2026-11-23 (`DECISIONS.md` rows 9–12). "Decided" items are confirmed; "proposed" items came from the same discussion and are the default for `/write-day 3`.

- Core: the polyclinic. An arrow with the number 12 on the floor by the lift. Two offices on the floor: 12 (the doctor) and 12А (a cosmetologist with a promo).
- When: the visit arrives in the morning if `d2_derm_slot` = `morning`, in the day part if it is `day`.
- The door, step 1 (proposed): the wrong door is an honest temptation, not an attention quiz. Office 12 has a queue; 12А has a sign «Кожа. Без очереди». The choice of door is free.
  - On time: Andrey gets into 12 almost at once.
  - `d2_late` with the morning slot: he is late, the doctor took the next patient. Wait in the queue (costs energy, about 3) or walk into 12А now.
  - `d2_asked_office`: the door of 12 shows the surname mum named, and the card text recalls «в соседнем какие-то акции», so 12А looks suspicious.
- The door, step 2 (proposed): inside 12А the cosmetologist offers the "promo cleaning". The button carries honest odds in words (часто: раздражение на два дня, иногда: ничего). Andrey can stand up and leave; leaving costs time, the doctor is then reached only through the queue. No coins are taken for a harmful result without the odds shown.
- Office 12 (decided): a 10-day care course, skin −3 each morning, as a modifier. If the acne patches from the Day 2 gift are on, the doctor says not to use them for now (proposed).
- Office 12А: the promo cleaning makes skin worse for two days.
- Skipped day (decided): if Day 3 is skipped entirely, Andrey went to office 12 and the course started. The neutral choice of the door card is "office 12".
- Day 2 hangovers shown in the morning (proposed): `d2_tea` gives −2 energy with a line «Чай действует»; `d2_gym` gives +2 energy with a line.
- Smoking (proposed): a craving card on the polyclinic porch while waiting. It closes the Day 2 gap: `smoke_free` advances or resets here, and a cigarette worsens `care`.
- Alina (decided): the first like has a visible cause. With two or more useful actions over days 1–3 (`d1_run`, `d1_clean`, counter `useful`) an evening card offers to post a photo. Posted: the like arrives at night, `affinity` +5, reason line «+5: Алина лайкнула твоё фото». Vitya's comment under the photo can depend on `d1_said_coming`, `d1_joked`, `d1_lurked` (proposed).
- Day ends on: the like notification, or, without a photo, meeting Aunt Zina in the stairwell (a different line with `d2_saw_note`).
- Last day of doubled energy. The Day 3 day card says so in advance: «Завтра сил будет вдвое меньше» (proposed), so day 4 is not a surprise.

### Day 4. Normal energy («Обычная энергия»)
Design agreed with the author on 2026-11-23 (`DECISIONS.md` rows 13–16). "Decided" items are confirmed; "proposed" items came from the same discussion and are the default for `/write-day 4`.

- Core: energy is halved (10 instead of 20) and the player cannot do everything. This is the theme of the day.
- Willpower costs energy (decided): there is no error chance at zero energy. Resisting a temptation is a choice with an energy cost written on the button; giving in is free and is the neutral choice of its card. Rough budget (proposed): run 4, side job 4, not overeating 2, not smoking 2–3, so a full "clean" day does not fit into 10.
- No energy floor (decided): `d2_tea` (−2, its second day) and `d3_late` (−4) stack; a player can start the day with 4 energy. Every card keeps a free choice.
- Morning (proposed): the first card explains the halved energy in one line. Lines that explain the hangovers: «Чай действует» for the tea, «Проспал» for `d3_late`, the gym pass +2. The doctor's course worked its first morning: a mirror line such as «Мазь щиплет, значит работает». With `d3_cleaning` = `bad` the mirror shows the second day of red cheeks.
- Event: Vitya invites Andrey to a barbecue in the evening. Staying home must not be the "right" answer (proposed): both ways cost something.
  - Went: two temptations in a row, the meat and the cigarette by the grill where everyone smokes. Passing both cleanly costs about 5 energy. Andrey gets into the photo.
  - Stayed home: fewer temptations and no photo. With `d1_one_pie` the pies in the fridge call in the evening. Without pies (decided): a quiet scene, a call from mum, so the evening is not empty.
  - Vitya's lines pay off `d1_joked` («Ну что, в дверь пролез?») and `d3_posted` («Модель наша пришла»).
- Smoking (proposed): the first strong craving, its strength follows the counter `smoke_free`.
  - Not quitting (`d3_smoked`): an ordinary craving, cheap to resist, small reward.
  - Second or third smoke-free day: a strong craving, resisting costs 3 energy and doubles the confidence gain.
  - `d1_half`: a third option «выкурить четверть», a half-measure for 1 energy.
  - A cigarette worsens `care` and resets `smoke_free`; resisting improves `care` and advances it.
- Alina (decided): she reacts to Vitya's barbecue photo in the class chat.
  - Andrey is in the frame and held back: her reaction under the photo, `affinity` +2 or +3, reason line «Алина отметила фото с шашлыков».
  - Andrey is in the frame with five skewers: Vitya's caption jokes, Alina is silent.
  - Andrey is not there: she puts a fire emoji under Vitya's photo. A light sting, nothing more.
- Skipped day: Andrey stayed home, smoked as usual, and the pies (if any) were eaten; nothing is posted and nothing is sent to Alina.
- Day ends on: Vitya posts barbecue photos in the class chat.

### Day 5. The neighbour («Соседка»)
- Core: Aunt Zina asks for help with bags or a shelf. If helped, she names the cream and the pharmacy on Sadovaya.
- Pharmacy: the neighbour's cream (cheap, the real solution) and a premium cream (pricier, effect and cap stated).
- Teeth: dental cleaning if booked on Day 1.
- Alina: first cold message about the reunion.
- Day ends on: her message waits for a reply until morning.

### Day 6. The first conversation («Первый разговор»)
- Core: replying to Alina. Three options, the set depends on confidence. A 3–4 line dialogue.
- Taste hint: Alina jokes about a bearded classmate: «Борода вообще не моё».
- Style: the optician for a new frame, or the market with Vitya for a shirt.
- Trap: a "trendy look" from the feed lowers style.
- Day ends on: «Ладно, мне пора. Увидимся на встрече, наверное».

### Day 7. The chance meeting («Случайная встреча»)
- Morning: if the beard hint was received, the choice "shave or keep".
- Day: Andrey walks into the coffee shop «Зерно» and runs into Alina.
- Scene: a look, a greeting, 2–3 choices. Flags from the whole week fire: smoked today, skin, beard, clothes, confidence, the barbecue, the first message.
- Alina reacts indirectly: «Ты какой-то другой. Прикольно выглядишь».
- Evening: her message in one of three tones. Then «Продолжение следует».
- Demo end screen: 7-day timelapse, stats, good and bad decisions, a card, a referral link. Buttons «Сообщить о полной версии» and «Закрыть» are equal. No shop on this screen.

## 4. Day 1 design (implemented)

The authoritative version is `content/cards/day1.json`. This section records intent and the flags later days depend on.

| Card | Part | What happens | Flags set |
|---|---|---|---|
| K1-01 Class chat | morning | Oksana announces the reunion, Alina says «Я буду». Reply, joke, or lurk | `d1_said_coming`, `d1_joked`, `d1_lurked` |
| K1-02 Mirror | morning | The list of problems. The "before" frame is saved automatically | none |
| K1-03 Mum calls | day | Tell her the plan, say "all fine", or complain | `d1_mom_knows`, `d1_mom_dark`, `d1_mom_pies` |
| Plus actions | day onward | Run in the park (4), shower and clean shirt (2), book the dentist (1), lie on the sofa (0) | `d1_run`, `d1_clean`, `d1_dentist_booked`, `d1_couch` |
| K1-04 Mum's pies | evening | Only if `d1_mom_pies`. Eat five, eat one, refuse | `d1_ate_pies`, `d1_one_pie`, `d1_refused_pies` |
| K1-05 Alina's profile | evening | Plain hello, flirty line, like only, close | `d1_wrote_plain`, `d1_wrote_flirty`, `d1_liked_only`, `d1_no_contact` |
| K1-06 Balcony cigarette | evening | Smoke, smoke half, gum instead | `d1_smoked`, `d1_half`, `d1_no_smoke` |
| K1-07 Feed | night | Miracle tea post (save), soda-and-lemon post (try) | `d1_tea_saved`, `d1_soda_teeth` |
| K1-08 Read receipt | night | «Алина была в сети в 23:41. Ответа нет». The chance scale appears: 3% | none |
| K1-09 Sleep | night | Sleep now, or phone until three | `d1_late` |

Neutral choice per story card, taken when the card is skipped (free, no requirements, smallest consequences): K1-01 `lurk`, K1-02 `ok`, K1-03 `fine`, K1-04 `one`, K1-05 `close`, K1-06 `smoke`, K1-07a `scroll`, K1-07b `scroll`, K1-08 `ok`, K1-08c `ok`, K1-08b `ok`. A fully skipped Day 1 therefore runs K1-01, K1-02, K1-03, K1-05, K1-06, K1-07a, K1-07b, K1-08b and leaves `d1_lurked`, `d1_mirror`, `d1_mom_dark`, `d1_no_contact`, `d1_half`, `chance_shown`; Day 2 then goes through K2-01c and the evening call K2-06. K1-06 `half` (care +1) was chosen over `smoke` (care +2) by the builder; the authors may prefer `smoke` as "the usual".

Day 1 card: hero frame, stat changes, 2–3 key decisions. Reward: 50 gold and gum (removes one cigarette craving once). Line for tomorrow: «Утром: сообщение от мамы».

Changes the Production chat made while implementing (all proposed):
- A story card waits for the player until the end of its day; a player arriving in the evening gets the morning cards first.
- Plus actions are available in the day, evening and night.
- Sleep is an action in the night menu. It closes the day and shows the day card.
- Feed posts arrive as two night cards and then live in the feed tab.
- Outcome texts were written by the Production chat where the script only gave an effect. The Scenario side still has to review them.

## 5. How Day 1 pays off later

Every Day 1 flag must be used by a later card. Write these into days 2–7.

| Flag | Day | Payoff |
|---|---|---|
| `d1_mom_knows` | 2 | Mum sends the dermatologist's number in the morning |
| `d1_mom_dark` | 2 | Mum calls back in the evening; the polyclinic slot moves to the afternoon of day 3 |
| `d1_mom_pies` | 2 | Mum sends the number and asks «Пирожки доел?» |
| `d1_ate_pies` | 2 | Mirror: «Пирожки никуда не делись» |
| `d1_one_pie` | 4 | Pies in the fridge become a temptation on a hungry evening |
| `d1_refused_pies` | 5 | Mum tells Aunt Zina her son is pulling himself together; the neighbour helps more readily |
| `d1_said_coming` | 5 | Alina: «Видела, ты написал, что придёшь» |
| `d1_joked` | 4 | Vitya brings up the door joke at the barbecue |
| `d1_lurked` | 5 | Alina: «Ты один в чате не ответил» |
| `d1_run`, `d1_clean` | 3 | Count toward the useful actions needed for the first like |
| `d1_couch` | 2 | Mirror: «Понедельник наступил» |
| `d1_dentist_booked` | 5 | Dental cleaning, teeth improve noticeably |
| `d1_soda_teeth` | 5 | Dentist: «Содой тёрли? Не надо так»; the cleaning gives less |
| `d1_wrote_plain` | 5 | Her message opens with «Видела твоё сообщение, замоталась» |
| `d1_wrote_flirty` | 6 | Alina recalls: «Ты мне, кстати, странное писал» |
| `d1_liked_only`, `d1_no_contact` | 5 | Alina writes from Oksana's list: «Оксана просила узнать, ты идёшь?» |
| `d1_smoked` | 4 | Normal craving, quitting is harder |
| `d1_half` | 4 | A new option appears: «выкурить четверть» |
| `d1_no_smoke` | 4 | Strong craving, but holding out doubles the confidence gain |
| `d1_tea_saved` | 2 | The feed shows «Заказать чудо-чай» |
| `d1_late` | 2 | Morning card «Проспал», the morning part is shorter |

## 5a. Demo economy (proposed, 2026-11-22)

Coins are earned only. Goal: a week of income buys about half of the shop, so every purchase is a choice. Numbers are starting values for balancing. Implemented in `content/items.json`, `content/cards/side-jobs.json` and `content/balance.json` (`energyCap` raised 20 → 24 so the gym pass works on boosted days 1–3).

Income over days 1–7:

| Source | Amount | Notes |
|---|---|---|
| Start | 100 | `startCoins` |
| Day reward | 50 × 6 = 300 | days 1–6; the day 7 reward arrives after the demo ends |
| Side job `A-job` | 20–30 per day, up to ~210 | costs 4 energy, once a day, day and evening |
| Total | ~400 without the job, ~610 at most | |

Spending (total 720):

| Item | Price | Effect (engine units) | Once |
|---|---|---|---|
| `gym_pass` Абонемент в зал | 150 | +2 energy each morning and weight −1 each morning, 7 days | no |
| `cream_premium` Крем «Сияние» | 220 | skin −3 each morning, 5 days (−15 total) | yes |
| `cream_zina` Крем с Садовой | 40, paid in the Day 5 pharmacy card | skin −2 each morning, 10 days (−20 total) | not sold in the shop |
| `frame` Новая оправа | 150 | style −12, conf −2, round glasses | yes |
| `haircut` Стрижка у барбера | 70 + 2 energy | care −6, conf −2 | yes |
| `shirt` Новая рубашка | 90 | style −6, blue shirt | yes |

Rules:
- `cream_zina` has no shop price. The Day 5 pharmacy card sells it with `"cost": { "coins": 40 }` and `{ "item": "cream_zina", "add": 1 }`. The quest solution is cheaper and stronger than the premium cream, but slower.
- A bought item sets the flag `bought_<id>`, so later cards can react («Новая оправа тебе идёт»).
- Not done: a paid course does not pause while the player is away (proposed red line in `docs/DESIGN.md` section 12).

## 5b. Day 2 design (implemented)

The authoritative version is `content/cards/day2.json`. Written 2026-11-22; the texts are not reviewed by the authors yet. Story cards are listed in display order.

| Card | Part | What happens | Condition | Flags set |
|---|---|---|---|---|
| K2-00 Overslept | morning | «Будильник звонил три раза». Get up or snooze; both lose the morning | `d1_late` | `d2_overslept` |
| K2-01a Mum's number | morning | Mum found a dermatologist: polyclinic, third floor, tomorrow at 10:00 | not `d1_mom_dark`, not `d1_mom_pies` | `d2_derm_slot` = `morning` |
| K2-01b Mum's number | morning | Same number plus «Пирожки доел?»; the honest answer depends on K1-04 | `d1_mom_pies` | `d2_derm_slot` = `morning` |
| K2-01c Message from mum | morning | «Андрюша, вечером позвоню. Не пропадай» (keeps Day 1's teaser true) | `d1_mom_dark` | none |
| K2-02a Mirror | morning | «Пирожки никуда не делись» | `d1_ate_pies` | none |
| K2-02b Mirror | morning | «Понедельник наступил» | `d1_couch` | none |
| K2-03 For bread | morning | Go to the shop or stay home. Going out in the morning without oversleeping shows Aunt Zina's note | none | `d2_saw_note` |
| K2-04 Park or gym | day | Park run (4 energy, random) or gym pass (150 coins + 3 energy for the first workout; the same pass as the shop item `gym_pass`, section 5a: +2 energy and weight −1 every morning, 7 days, skipped days included), or decide later | none | `d2_park`, `d2_gym`; counter `useful` +1 |
| K2-05a Feed: miracle tea | day | The saved post: order for 30 coins (energy −2 on days 3 and 4) or delete it | `d1_tea_saved` | `d2_tea` |
| K2-05b Feed: miracle tea | day | The ad again: order or scroll | not `d1_tea_saved` | `d2_tea` |
| K2-06 Mum calls back | evening | Same number, slot moved to 15:00 | `d1_mom_dark` | `d2_derm_slot` = `day` |
| K2-07 Photo from «Зерно» | evening | Alina posts a coffee photo. Like, remember the place, write «Классное место!» (affinity −1 if Day 1 message is still unanswered), scroll | none | `d2_liked_photo`, `d2_zerno_known`, `d2_wrote_zerno` |
| K2-08 Online | night | «Алина была в сети. Ответа нет», status line from `status_online_no_reply` | any message sent to Alina | none |
| K2-09 Mum | night | Day ends on «Кабинет не перепутай, там их два». Asking which one gives the doctor's name and «в соседнем какие-то акции» | none | `d2_asked_office` |

Plus actions on day 2 (day, evening, night): park run (4, counter `useful`), shower and fresh T-shirt (2, care −5, counter `useful`), brush teeth by the timer (1, teeth −1), lie on the sofa (0, conf +1). Sleep (night) closes the day; «Посидеть в телефоне до трёх» sets `d2_late` and −4 energy tomorrow.

Neutral choice per story card (free, no requirements, smallest consequences), taken by the auto-resolve of a skipped day (implemented 2026-11-23, marked `"neutral": true` in the file): K2-00 `up`, K2-01a `ok`, K2-01b `topic`, K2-01c `ok`, K2-02a `belly`, K2-02b `ignore`, K2-03 `home`, K2-04 `later`, K2-05a `delete`, K2-05b `scroll`, K2-06 `ok`, K2-07 `scroll`, K2-08 `ok`, K2-09 `ok`.

Day 2 card: reward 50 gold and acne patches (`acne_patch`, skin −3 once). Line for tomorrow: «Завтра: поликлиника, третий этаж».

Day 1 payoffs done on day 2: `d1_mom_knows` (K2-01a), `d1_mom_dark` (K2-01c, K2-06), `d1_mom_pies` (K2-01b), `d1_ate_pies` (K2-02a, K2-01b), `d1_couch` (K2-02b), `d1_tea_saved` (K2-05a), `d1_late` (K2-00, and no note in K2-03).

### How Day 2 pays off later

| Flag | Day | Payoff |
|---|---|---|
| `d2_overslept` | 2 | K2-03: Andrey rushes and misses Aunt Zina's note |
| `d2_derm_slot` | 3 | `morning`: polyclinic at 10:00; `day`: at 15:00 (from `d1_mom_dark`) |
| `d2_late` | 3 | With `d2_derm_slot` = `morning`, Andrey is late for the doctor |
| `d2_asked_office` | 3 | Andrey knows the doctor's name and that the promo is next door, so office 12А looks suspicious |
| counter `useful` | 3 | With `d1_run` and `d1_clean`, counts toward the two useful actions for the first like |
| `d2_park`, `d2_gym` | 4 | The training choice; `d2_gym` also carries the gym pass modifier `gym` (same as the shop item, section 5a) |
| `d2_tea` | 3–4 | Energy −2 each morning applies by itself; Day 7 can recall the tea |
| `d2_saw_note` | 5 | Aunt Zina's cream: Andrey already knows the pharmacy on Sadovaya |
| `d2_liked_photo` | 5 | Alina's first message can mention the like |
| `d2_wrote_zerno` | 5 | Alina's first message can answer «Классное место!» |
| `d2_zerno_known` | 7 | Andrey goes to «Зерно» knowing it is her place |

Engine notes for days 3+:
- The first like on day 3 needs "two useful actions over three days": `Cond` has no sum, so express it with `any`/`not`, for example `{ "counter": "useful", "gte": 2 }` or `not(any(not d1_run, counter useful < 1))`.
- `smoke_free` is not advanced on day 2: there is no smoking card that day. Day 3 continues the count on the polyclinic porch (section 5c).
- K2-04 never charges twice for the pass: the buy choice needs `bought_gym_pass` unset (the shop sets this flag, and so does the card); with the flag set the card offers `gym_have` (3 energy, the workout only; a pass still in the bag is activated). In the shop a pass or cream whose course is running shows «Уже действует» and cannot be bought or applied.
- The gym pass in K2-04 is the shop pass (section 5a): same price, same modifier `gym`. With `energyCap` 24 its +2 energy works on day 3 as well (20 + 2). On day 2 a player has 150–180 coins, so the 150-coin pass is affordable in K2-04, at the cost of nearly all savings.

## 5c. Day 3 design (implemented)

The authoritative version is `content/cards/day3.json`. Written 2026-11-23 from `DECISIONS.md` rows 9–12 and section 3; the texts are not reviewed by the authors yet. Story cards are listed in display order.

"Visit time" below means: from the morning when `d2_derm_slot` is `morning` or missing, from the day part when it is `day`. "Late" means `d2_late` together with the morning slot; with the 15:00 slot Andrey is never late.

| Card | Part | What happens | Condition | Flags set |
|---|---|---|---|---|
| K3-00a Tea works | morning | «Чудо-чай всё ещё действует: сегодня на 2 энергии меньше». A line only: the energy was already taken by Day 2's `tomorrow` effect | `d2_tea` | none |
| K3-00b Gym pass works | morning | «Абонемент в зал работает: с утра +2 энергии». A line only | `d2_gym`, or the shop pass bought on an earlier day and no longer in the bag | none |
| K3-01 Packing | morning | Mum: take the insurance card, dress decently. Tidy up (1 energy, care −2, counter `useful` +1) or go as is | none | none |
| K3-02 Polyclinic porch | visit time | Two men smoke by the bin and offer one. Smoke (care +2), gum (uses the Day 1 gift), or «Спасибо, бросаю» (1 energy, conf −1); not smoking gives care −2 | none | `d3_smoked` or `d3_no_smoke`; counter `smoke_free` |
| K3-03a Third floor | visit time | Two doors: 12 with a queue, 12А «Кожа. Без очереди». On time: 12 is free and almost immediate | on time, not `d2_asked_office` | `d3_door` = `12` or `12a` |
| K3-03b Third floor | visit time | Same, plus the doctor's name on door 12 and mum's «в соседнем какие-то акции» | on time, `d2_asked_office` | `d3_door` |
| K3-03c Third floor | visit time | Late: the doctor took the next patient. The queue to 12 costs 3 energy (an effect, the choice is free), or walk into 12А | late, not `d2_asked_office` | `d3_door` |
| K3-03d Third floor | visit time | Late, with the doctor's name and mum's words | late, `d2_asked_office` | `d3_door` |
| K3-04 Office 12А | visit time | The cosmetologist offers the promo cleaning for 40 coins. The button shows «часто: раздражение на два дня, иногда: ничего». Either way the doctor is then reached through the queue: −3 energy, stated in the card text | `d3_door` = `12a` | `d3_cleaning` = `bad` or `none` |
| K3-05 Office 12 | visit time | Galina Petrovna starts the course. With the patches in the bag Andrey can ask about them: «Пока идёт курс, не клеить» | `d3_door` = `12`, or K3-04 was played | `d3_course` |
| K3-06 Photo | evening | Offered only with two or more useful actions over days 1–3. Post (conf −2, a feed post, Vitya's comment by the Day 1 chat choice) or keep it | `d1_run` + `d1_clean` + counter `useful` ≥ 2 | `d3_posted` |
| K3-07 Like | night | «Алина оценила ваше фото»: `affinity` +5, reason «Алина лайкнула твоё фото», a status line in the chat (`status_liked_photo`) | `d3_posted` | `d3_alina_liked` |
| K3-08 Aunt Zina | night | Met on the stairs with the bin. With `d2_saw_note` the hello line mentions the note and Andrey can ask about it; she does not explain it yet | no `d3_posted` | `d3_met_zina`, `d3_asked_note` |

Numbers:
- Doctor's course: modifier `derm_course`, skin −3 on each of 10 mornings (days 4–13), skipped days included. Free.
- Promo cleaning: 40 coins. Often (3 of 4): skin +6 now, removed on the morning of day 5, so the face is worse on days 3 and 4. Sometimes (1 of 4): nothing. The course starts the same day either way.
- The photo condition has no sum in `Cond`; it is `any` of: `useful` ≥ 2; `d1_run` and `d1_clean`; `d1_run` and `useful` ≥ 1; `d1_clean` and `useful` ≥ 1 ("and" is written as `not(any(not a, not b))`). The doctor visit to office 12 counts as one useful action (author decision, 2026-11-23): every K3-05 outcome adds 1 to `useful`. Day 3 actions that count: K3-01 `neat`, `A3-run`, `A3-clean`. The card arrives as soon as the condition holds, also later in the evening or at night.

Smoking count: `smoke_free` is days without a cigarette. Day 2 has no smoking card and is counted as the day before it: smoke-free after Day 1 `quit`, a smoking day otherwise. So on Day 3 not smoking sets the counter to 3 after `d1_no_smoke` and to 1 after `d1_smoked` or `d1_half`; a cigarette sets it to 0. `d1_half` has no separate Day 3 option.

Plus actions on day 3 (day, evening, night): park run (4, weight −3 or −1, counter `useful`), shower and clean T-shirt (2, care −5, counter `useful`), teeth by the timer (1, teeth −1), sofa (0, conf +1). Sleep (night) closes the day; «Посидеть в телефоне до трёх» sets `d3_late` and −4 energy on day 4.

Neutral choice per story card (marked `"neutral": true`): K3-00a `ok`, K3-00b `ok`, K3-01 `asis`, K3-02 `smoke`, K3-03a–d `office12` (on the late variants it takes 3 energy as an effect), K3-04 `leave`, K3-05 `take`, K3-06 `keep`, K3-07 `ok`, K3-08 `hello`. A fully skipped Day 3 therefore runs K3-01, K3-02, K3-03x, K3-05, K3-06 if it is on offer, K3-08: Andrey smokes, goes to office 12, the course starts (`DECISIONS.md` row 10, the agreed exception to "a neutral choice does not start a course"), nothing is posted, no coins are spent, nothing is written to Alina.

Day 3 card: reward 50 gold and dental floss (`floss`, teeth −1 once). Line for tomorrow: «Завтра сил будет вдвое меньше».

Earlier flags paid off on day 3: `d2_derm_slot` (visit time), `d2_late` (K3-03c/d), `d2_asked_office` (K3-03b/d), `d2_tea` (K3-00a), `d2_gym` (K3-00b), `d2_saw_note` (K3-08), counter `useful`, `d1_run`, `d1_clean` (K3-06), `d1_said_coming`, `d1_joked`, `d1_lurked` (Vitya's comment in K3-06), `d1_no_smoke` (K3-02 count), the Day 1 gift `gum` and the Day 2 gift `acne_patch` (K3-02, K3-05).

### How Day 3 pays off later

| Flag | Day | Payoff |
|---|---|---|
| `d3_door` | 3 | Opens K3-04 (`12a`) or K3-05 (`12`) |
| `d3_cleaning` | 3, 4 | `bad`: the doctor comments on the red cheeks (K3-05); the Day 4 mirror can mention them (proposed) |
| `d3_course` | 5 | The pharmacy and Aunt Zina's cream know that a course is already running (`DECISIONS.md` row 12: the cream must give something else) |
| `d3_smoked`, `d3_no_smoke`, counter `smoke_free` | 4 | Strength of the Day 4 craving; the counter goes on from here |
| `d3_posted` | 3, 4 | Opens K3-07; Vitya can refer to the photo at the barbecue (proposed) |
| `d3_alina_liked` | 4, 5 | Day 4 "likes on a good day" is then the second like; her first message can follow from it |
| `d3_met_zina` | 5 | Aunt Zina already greeted him on the stairs before asking for help |
| `d3_asked_note` | 5 | «Зайдёшь как-нибудь, расскажу»: she keeps the promise and names the cream |
| `d3_late` | 4 | Morning «Проспал» on the first half-energy day |

Engine notes for days 4+ (nothing in `src/` was changed):
- A card's `parts` are fixed, so "morning or day depending on a flag" is written as `parts: ["morning"]` plus `any(not slot = day, not part = morning)`. Side effect: a visit card auto-played on a skipped day is filed under the morning in the journal even for the 15:00 slot.
- `Cond` cannot ask whether a modifier is active. K3-00b infers the gym pass from flags and the bag; a pass bought earlier and applied on the morning of day 3 before the card is read shows the line one day early.
- The doctor's «не клеить» about the patches is a line only: nothing stops the player from applying them, and nothing reacts if they do.
- A neutral choice cannot have `cost`, so the queue price on the late door card is an effect and is written into the button label instead of the cost badge.
- The reason line shows the chance delta. The like is `affinity` +5, which is +5 on the scale except at the 1% floor.

## 5d. Day 4 design (implemented)

The authoritative version is `content/cards/day4.json`. Written 2026-11-23 from `DECISIONS.md` rows 13–16 and section 3; the texts are not reviewed by the authors yet. Story cards are listed in display order.

"Ordinary" below means the counter `smoke_free` is 0 on the evening of day 4, "strong" means it is 1 or more. "Pass running" is the same inference as K3-00b: `d2_gym`, or the shop pass bought on an earlier day and no longer in the bag.

| Card | Part | What happens | Condition | Flags set |
|---|---|---|---|---|
| K4-00 Normal energy | morning | One line: energy is halved, 10 a day, and resisting a temptation costs energy with the price on the button | none | none |
| K4-00a Tea works | morning | «Чудо-чай действует последний день»: −2 energy, already taken by Day 2's `tomorrow` chain. A line only | `d2_tea` | none |
| K4-00b Overslept | morning | «Проспал»: −4 energy, already taken by Day 3's `tomorrow` effect. A line only | `d3_late` | none |
| K4-00c Gym pass works | morning | +2 energy. A line only | pass running | none |
| K4-01a Mirror | morning | The first morning of the doctor's course: «Мазь щиплет, значит работает» | `d3_course`, `d3_cleaning` not `bad` | none |
| K4-01b Mirror | morning | The same, plus the second day of red cheeks from office 12А | `d3_course`, `d3_cleaning` = `bad` | none |
| K4-02 Barbecue at Vitya's | day | Vitya invites; the card warns that there will be a lot of meat and everyone smokes. «Буду» (conf −1) or «Не сегодня» | none | `d4_went` or `d4_home` |
| K4-03a At the grill | evening | Vitya: «Модель наша пришла!» Then the meat: one skewer and vegetables (2 energy, conf −1) or eat like everyone (weight +2) | `d4_went`, `d3_posted` | `d4_meat_held` or `d4_feast` |
| K4-03b At the grill | evening | Vitya: «Ну что, в дверь пролез?» Same choices | `d4_went`, no `d3_posted`, `d1_joked` | same |
| K4-03c At the grill | evening | Vitya: «Андрюха! А я думал, не придёшь». Same choices | `d4_went`, neither flag | same |
| K4-04a Cigarette at the grill | evening | Ordinary craving. Resist (2 energy), the quarter (1 energy, only with `d1_half`), gum (uses the item), or smoke | `d4_went`, ordinary | `d4_no_smoke`, `d4_quarter` or `d4_smoked`; counter `smoke_free` |
| K4-04b Cigarette at the grill | evening | Strong craving. Resisting costs 3 energy and gives twice the confidence | `d4_went`, strong | same |
| K4-05 Pies in the fridge | evening | Mum's pies from Day 1. Close the fridge (2 energy, conf −1) or finish them (weight +2) | `d4_home`, `d1_one_pie` | `d4_pies_held` or `d4_ate_pies` |
| K4-06 Mum calls | evening | The quiet evening of `DECISIONS.md` row 15: «Ты чего дома? Витя же звал. Мазь мажешь?» Tell her about the day (conf −1) or answer «Мажу, мам». Nothing gets worse | `d4_home`, no `d1_one_pie` | `d4_mom_talked` |
| K4-07a Balcony | evening | The craving at home, ordinary. Same four choices as K4-04a | `d4_home`, ordinary | as K4-04a |
| K4-07b Balcony | evening | The craving at home, strong | `d4_home`, strong | as K4-04a |
| K4-08a Class chat | night | Vitya posts the barbecue photos; Andrey is in the third one with one skewer. «Алина отметила фото»: `affinity` +3, reason «Алина отметила фото с шашлыков», a status line in the chat (`status_bbq_photo`). With `d3_alina_liked` the outcome says it is the second in two days | `d4_went`, `d4_meat_held` | `d4_alina_reacted` |
| K4-08b Class chat | night | Vitya's caption: «Андрюха и его пять шампуров. Шестой в кадр не влез». The chat laughs, Alina is online and silent. Answer with a smiley (conf −1) or put the phone down | `d4_went`, no `d4_meat_held` | none |
| K4-08c Class chat | night | The photos without Andrey; Alina puts a fire under Vitya's first photo. Like Vitya's post or put the phone down. No `affinity` change | no `d4_went` | none |

Energy prices (decision 13: no dice, the price is on the button, giving in is free): park run 4, gym workout 4, side job 4 (`A-job`), one skewer instead of five 2, closing the fridge 2, not smoking 2 (ordinary) or 3 (strong), the quarter 1, shower 2, teeth 1. A "clean" barbecue day — run, side job, the meat and the cigarette — costs 12 with an ordinary craving and 13 with a strong one, against 10 energy (12 with the gym pass, 8, 6 or 4 with the Day 2 tea and a late Day 3 night). A choice the player cannot afford is shown disabled with «Не хватает энергии»; every temptation card keeps the free "give in" choice, and the gum from the Day 1 gift is a free way to resist once.

Smoking count: `smoke_free` stays "days without a cigarette". It arrives from Day 3 as 0 (smoked), 1 (first smoke-free day) or 3 (smoke-free since Day 1). On Day 4: resisting or the gum adds 1 (so 1, 2 or 4) and gives care −2; a cigarette sets it to 0 and gives care +2; the quarter also sets it to 0 (a quarter is still a cigarette, and the visible «Без сигарет: N дней» line must not lie) with care +1. Resisting gives conf −1 on the ordinary card and conf −2 on the strong one; the gum gives no confidence. Each craving card is closed by its own flags (`d4_smoked`, `d4_no_smoke`, `d4_quarter`), otherwise the other strength would be offered as soon as the counter moved.

Alina (decision 16): she reacts only to the photo. +3 is below the +5 of the first like. Smoking at the grill does not change her reaction; the meat does, because it is what the photo shows.

Plus actions on day 4 (day, evening, night): park run (4, weight −3 or −1, counter `useful`; the text recalls `d2_park`), gym workout (4, weight −3, no random outcome, counter `useful`; only while the pass is running), shower and clean T-shirt (2, care −5, counter `useful`), teeth by the timer (1, teeth −1), sofa (0, conf +1). Sleep (night) closes the day; «Посидеть в телефоне до трёх» sets `d4_late` and −4 energy on day 5.

Neutral choice per story card (marked `"neutral": true`): K4-00 `ok`, K4-00a `ok`, K4-00b `up`, K4-00c `ok`, K4-01a `ok`, K4-01b `ok`, K4-02 `home`, K4-03a–c `feast`, K4-04a/b `smoke`, K4-05 `eat`, K4-06 `calm`, K4-07a/b `smoke`, K4-08a `ok`, K4-08b `ok`, K4-08c `ok`. A fully skipped Day 4 therefore runs K4-00, the hangover lines that apply, the mirror, K4-02, K4-05 or K4-06, K4-07a or K4-07b, K4-08c: Andrey stays home, finishes the pies if there are any, smokes as usual (`smoke_free` 0), is not in the photo; nothing is posted, no coins are spent, nothing is written to Alina and `affinity` does not move.

Day 4 card: reward 50 gold and gum (`gum`, the same item as the Day 1 gift). Line for tomorrow: «Завтра: соседка тётя Зина просит помочь».

Earlier flags paid off on day 4: `d1_one_pie` (K4-05), `d1_joked` (K4-03b), `d1_half` (the quarter), `d1_no_smoke` (the "fourth day" line of the strong card), `d1_smoked` (the «всё как обычно» line of the ordinary card), `d2_tea` (K4-00a), `d2_gym` (K4-00c, `A4-gym`), `d2_park` (`A4-run`), `d3_late` (K4-00b), `d3_course` and `d3_cleaning` (mirror), `d3_posted` (K4-03a), `d3_alina_liked` (K4-08a), `d3_smoked` / `d3_no_smoke` through the counter `smoke_free`, the Day 1 gift `gum`. No Day 4 payoff was moved. One change of meaning against section 5: the strength of the craving follows the counter, not the Day 1 flag, so a player who quit on Day 1 and smoked on Day 3 gets the ordinary craving.

### How Day 4 pays off later

| Flag | Day | Payoff |
|---|---|---|
| `d4_went`, `d4_home` | 4, 7 | Open the evening and the night cards; the Day 7 scene can recall the barbecue |
| `d4_meat_held`, `d4_feast` | 4, 6 | Choose the night chat card; Vitya at the market can recall the skewers (proposed) |
| `d4_alina_reacted` | 5 | Alina's first message can follow from the photo she marked |
| `d4_smoked`, `d4_no_smoke`, `d4_quarter`, counter `smoke_free` | 5–7 | The next craving and the Day 7 "smoked today" check; the quarter can become a cheaper step toward quitting (proposed) |
| `d4_ate_pies`, `d4_pies_held` | 5 | Mum asks about the pies when she talks to Aunt Zina; the Day 5 mirror can mention them (proposed) |
| `d4_mom_talked` | 5 | Mum tells Aunt Zina her son is on a course, so the neighbour knows about the doctor (proposed) |
| `d4_late` | 5 | Morning «Проспал» on a 10-energy day |

Engine notes for days 5+ (nothing in `src/` was changed):
- A card's text is fixed, so every text variant is a separate card: three «У мангала», four craving cards, three «Чат класса». Their choices are copies and must be edited together.
- The halved energy needs no content: `balance.json` has `energyPerDay` 10 and `earlyBoost` for days 1–3. The tea's second day is the nested `tomorrow` from K2-05; Day 4 only shows the line.
- `Cond` cannot ask whether a modifier is active, so K4-00c and `A4-gym` infer the gym pass from flags and the bag, with the K3-00b limit: a pass bought on day 3 and applied on the morning of day 4 before the card is read shows the line (and the gym action) a day early.
- A choice cannot show its effect anywhere except its label, so the quarter's label carries it: «Выкурить четверть: вреда вдвое меньше».
- `fill()` only inserts the nominative name, so texts avoid «от {crush}» and «{hero} нет».

## 6. Sample phrase bank for Alina

Situation `alina_cold_hello`, used from day 5. One variant is picked at random.

1. «Привет.»
2. «Привет, Андрей.»
3. «О, привет.»
4. «Привет. Давно не слышались.»
5. «Здравствуй.»
6. «А, привет.»
7. «Привет, да.»
8. «Привет. Чего хотел?»
9. «Привет. Я на работе, отвечу позже.»
10. «Привет. Узнала, да.»

Banks of the same size are needed for: seen-no-reply, like, cold question, neutral reply, warm reply, indirect compliment, jab, goodbye.

## 7. Questions for the authors

1. Confirm or change the assumptions in section 0.
2. Is a heroine needed in the demo from the start, or Andrey only?
3. Should the demo include real payments?
4. Skipped part of the day: decided 2026-11-22 (`docs/DECISIONS.md` row 3) and built 2026-11-23. A story card waits until the end of its day, then resolves with its neutral option.
5. The script says the chance scale "swings a lot"; the engine moves it by 1–2 points per action. Which events should move it strongly, and by how much?
