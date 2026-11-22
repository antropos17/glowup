# 7-day demo — script

Status: draft v1, 2026-11-22. The 7-day grid and the Day 1 design are done. Day 1 is already implemented in `content/cards/day1.json`. Days 2–7 are to be written directly in the engine format.

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
- Core: the polyclinic. An arrow with the number 12 on the floor by the lift. Two offices on the floor: 12 (the doctor) and 12А (a cosmetologist with a promo).
- Fork: office 12 gives a 10-day care course, skin improves slowly and steadily. Office 12А gives a "promo cleaning" and skin is worse for two days.
- Last day of doubled energy.
- Alina: first like if two useful actions were done over three days. Otherwise silence.
- Day ends on: the like notification, or meeting Aunt Zina in the stairwell.

### Day 4. Normal energy («Обычная энергия»)
- Core: energy is halved, the player has to prioritise.
- Event: Vitya invites Andrey to a barbecue. Go and eat everything, go and hold back, or stay home.
- Smoking: first strong craving if Andrey is quitting.
- At zero energy actions carry an error chance, and the chance is shown.
- Alina: likes on a good day, silent on a bad one.
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
4. Skipped part of the day: the prototype makes the story card wait until the end of the day. Confirm or choose "resolve with a neutral option".
5. The script says the chance scale "swings a lot"; the engine moves it by 1–2 points per action. Which events should move it strongly, and by how much?
