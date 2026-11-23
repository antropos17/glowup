# 7-day demo — script

Status: draft v1, 2026-11-22. The 7-day grid and the Day 1 design are done. Day 1 is implemented in `content/cards/day1.json`, Day 2 in `content/cards/day2.json`, Day 3 in `content/cards/day3.json`, Day 4 in `content/cards/day4.json`, Day 5 in `content/cards/day5.json`, Day 6 in `content/cards/day6.json`. Day 7 is to be written directly in the engine format.

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
Design agreed with the author on 2026-11-23 (`DECISIONS.md` rows 17–19). "Decided" items are confirmed; "proposed" items came from the same discussion and are the default for `/write-day 5`.

- Core: Aunt Zina asks for help with bags or a shelf. Kindness costs energy, as temptations did on Day 4 (proposed prices: bags 2, shelf 4; energy is 10 a day).
- The cream from Sadovaya (decided): a shaving cream for problem skin. Aunt Zina used to buy it for her late husband («у него тоже всё лицо цвело»). It does not treat acne. Its payoff is on Day 7: with the cream the shave goes cleanly, without it shaving over acne leaves the face red before «Зерно». Honest `limits` line: «Прыщи не лечит. С ним бритьё не раздражает кожу». It is no longer a skin course; the doctor's course (Day 3) and the shop's «Сияние» remain the two skin treatments.
- How Andrey gets the cream (proposed):
  - Helped Aunt Zina: she gives him her spare tube for free and names the pharmacy.
  - Did not help, but saw the note (`d2_saw_note`) or asked about it (`d3_asked_note`): he goes to the pharmacy himself and pays 40 coins. Attention pays off.
  - Did not help and knows nothing: no cream today.
  - `d1_refused_pies` or `d4_pies_held`: Aunt Zina greets him with «мать говорит, ты за себя взялся» and asks for the smaller favour.
- Pharmacy: the shaving cream (40 coins) and the premium skin cream already sold in the shop (effect and cap stated). With `d3_course` the pharmacist knows the doctor's course is running and does not sell a second skin course on top.
- Teeth (decided): the dental cleaning is free, by the insurance policy, and costs energy only. Only for the player who booked on Day 1 (`d1_dentist_booked`). With `d1_soda_teeth` the dentist grumbles («Содой тёрли? Не надо так») and the cleaning gives less. A player who did not book cannot fix teeth inside the demo except by brushing: an honest consequence of Day 1 (proposed: one line says so, without rubbing it in).
- Alina (proposed structure): her first message is built from two parts, so the variants do not multiply.
  - The opening depends on Day 1: `d1_wrote_plain` «Видела твоё сообщение, замоталась»; `d1_wrote_flirty` dry, no mention of it (it pays off on Day 6); `d1_liked_only` or `d1_no_contact` «Оксана просила узнать, ты идёшь?»; plus one line by the class chat: `d1_said_coming` «Видела, ты написал, что придёшь», `d1_lurked` «Ты один в чате не ответил».
  - The question about the reunion comes from a bank of about 10 phrasings.
  - Earlier likes and reactions (`d2_liked_photo`, `d3_alina_liked`, `d4_alina_reacted`) do not change the text: they were already paid through `affinity`, and she never names what changed. `d2_wrote_zerno` may add a short answer to «Классное место!».
  - The first message gives `affinity` +6 to everyone (decision 4); the cause is visible: she wrote.
- Night (decided): the message comes late and has one button, «Ответишь утром». The reply belongs to Day 6.
- Skipped day (decided for the dentist, proposed for the rest): Andrey went to the cleaning himself if it was booked; he greeted Aunt Zina and did not help, so no cream; the message from Alina still arrives and waits.
- Day ends on: her message waits for a reply until morning.

### Day 6. The first conversation («Первый разговор»)
- Core (decided, `DECISIONS.md` rows 20–21): replying to Alina's Day 5 question «Тебя записывать?». The conversation is stretched over the day.
- Morning (decided): the reply. Three buttons, each label is the exact message.
  - Dry, «Да, записывай.»: answers and closes the talk. `affinity` 0.
  - Plain with a question back, for example «Да, записывай. Сама-то идёшь?»: `affinity` +5.
  - The third depends on confidence: with enough confidence a short joke, `affinity` +8; with low confidence a long four-line excuse, `affinity` −5. The threshold is not fixed yet: the session reports what share of engine paths has the joke open and proposes a value.
  - No «не приду», no «пока не знаю». After the reply the chat shows «прочитано».
  - `d5_late` (proposed): he replies by noon instead of the morning; Alina adds «Долго ты» in the evening.
- Day (from the grid): style. The optician for a new frame, or the market with Vitya for a shirt. `d4_meat_held` / `d4_feast` (proposed): Vitya recalls the skewers at the market.
- Trap (decided, row 23): a "trendy look" from the feed lowers style and is free, put together from his own wardrobe. Nothing is bought.
- Evening (decided): Alina answers and there is a short live exchange.
  - After the dry reply: only «Ок, записала» and the goodbye, no second fork.
  - After the plain reply or the joke: a second, smaller fork worth up to `affinity` +3. Good and bad together stay inside row 4 (good reply +5 to +8, bad −5 for the day).
  - Taste hint for everyone, whatever the reply (proposed): she jokes about a bearded classmate, «Борода вообще не моё», for example under a photo in the class chat. Sets `d6_beard_hint`.
  - `d1_wrote_flirty`: «Ты мне, кстати, странное писал». Owning it plainly repairs; another line of the same kind is the bad reply.
  - `d2_wrote_zerno` (proposed): she mentions she is at «Зерно» on Saturdays, the bridge to Day 7.
  - `d1_lurked` (proposed): Andrey can finally answer in the class chat.
  - The four Day 5 openings set the tone of her evening lines: `d1_wrote_plain` warmest; `d1_wrote_flirty` dry until the "strange message" beat; from Oksana's list with no class-chat answer, business-like until he asks something back; with `d1_said_coming`, a confirmation.
- Night: the craving (strength from `d5_smoked` / `d5_no_smoke` and counter `smoke_free`), sleep.
- Day ends on: «Ладно, мне пора. Увидимся на встрече, наверное».
- Skipped day (decided, row 22): Andrey sent the dry reply himself; in the evening «Ок, записала» and the goodbye. No bonus, no penalty. The neutral choice of the reply card is the dry one, although it writes to the crush.

### Day 7. The chance meeting («Случайная встреча»)
- Morning (decided, `DECISIONS.md` row 24): the choice "shave or keep" is open to everyone; the Day 6 beard hint (`d6_beard_hint`) only tells the player what Alina likes. With the shaving cream from Sadovaya (Day 5) the shave goes cleanly; without it the face is red and irritated for the meeting (decision 17).
- Morning, the shave card: three buttons. With `cream_zina`: clean shave, flag `shaved`, effect `look: { facial: "none" }`. Without the cream: `shaved` too, `look: { facial: "none", razorBurn: true }`, a flag for the red face, confidence slightly worse. Keep the stubble: the neutral choice, nothing changes. The card quotes «Борода вообще не моё» only for a player with `d6_beard_hint`. The cream is not sold this morning. `d6_late` puts «Проспал» before the shave.
- Day, the craving at the door of «Зерно» (decided, row 30): it replaces the night balcony card of earlier days. Hold, gum, quarter (for the player on that path) or smoke; the result is the "smoked today" check of the scene.
- Day, the meeting (decided, row 29): everyone meets Alina; nobody can skip it. The entrance text has two variants: he knew the place (`d2_zerno_known`, or he heard the Saturday line on Day 6) or he walked in by chance.
- Scene, three choices:
  1. The entrance. She sits at the window table. «Подойти и поздороваться» / «Кивнуть и встать в очередь» (neutral) / «Сделать вид, что не заметил» (minus).
  2. Her line and his answer (decided, row 32). The line depends on the number of visible changes: 0–1 «О, привет. Ты тут какими судьбами?»; 2–3 «Ты какой-то другой»; 4 or more «Ты какой-то другой. Прикольно выглядишь». His answer: a short «Спасибо» with a question back (plus), a shrug (0, neutral), a long explanation about the doctor and the gym (minus). Thresholds are confirmed after the session counts the share of players per group on engine paths.
  3. One thread from the week, by priority (decided, row 31): «Ты мне, кстати, странное писал» for `d1_wrote_flirty` with `d6_reply` = `dry` or `excuse` (answers as in K6-06f: own +3, again −5, shrug 0); «Петь не будешь?» for `d6_reply` = `joke`; «Видела вас у Вити» for `d4_went`; otherwise a neutral question about the class reunion.
- Visible changes (she never names them): clean shave (`shaved` without razor burn), clothes (`bought_shirt` or `bought_frame`), teeth (`d5_cleaned`), skin (`d3_course`), no tobacco smell (did not smoke today). The trendy look (`d6_trend`) without a bought shirt is not counted; she glances at the jacket, no penalty.
- Evening (decided, row 33): her message in one of three tones, warm, even or dry, chosen only by the scene (the entrance and the two answers). One button, no reply. Then «Продолжение следует».
- Affinity range of the day: about −6 to +10 (`DECISIONS.md` row 4).
- Skipped day (decided, row 34): the meeting happened by itself. Andrey did not shave, nodded, exchanged a few words; the even tone in the evening; no bonus, no penalty.
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
| `cream_zina` Крем с Садовой | 40 in the Day 5 pharmacy card (K5-03), or free from Aunt Zina (K5-02) | none by itself: a shaving cream for problem skin, no `onUse`, no course (decision 17). With it in the bag the Day 7 shave goes cleanly; without it the face is red before «Зерно» | not sold in the shop; at most one tube |
| `frame` Новая оправа | 150 | style −12, conf −2, round glasses | yes |
| `haircut` Стрижка у барбера | 70 + 2 energy | care −6, conf −2 | yes |
| `shirt` Новая рубашка | 90 | style −6, blue shirt | yes |

Rules:
- `cream_zina` has no shop price. The Day 5 pharmacy card sells it with `"cost": { "coins": 40 }` and `{ "item": "cream_zina", "add": 1 }`; Aunt Zina gives the same tube for help. It is not a skin treatment: the doctor's course (free) and «Сияние» (220) are the two skin treatments. The bag shows it without «Применить», because it has no `onUse`.
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

## 5e. Day 5 design (implemented)

The authoritative version is `content/cards/day5.json`. Written 2026-11-23 from `DECISIONS.md` rows 17–19 and section 3; the texts are not reviewed by the authors yet. Story cards are listed in display order.

"Kind" below means `d1_refused_pies` or `d4_pies_held`. "Knows the note" means `d2_saw_note` or `d3_asked_note`. "Ordinary" means the counter `smoke_free` is 0 when the craving card arrives, "strong" means it is 1 or more.

| Card | Part | What happens | Condition | Flags set |
|---|---|---|---|---|
| K5-00 Overslept | morning | «Проспал»: −4 energy, already taken by Day 4's `tomorrow` effect. A line only | `d4_late` | none |
| K5-01 Mirror | morning | The second morning of the doctor's course (the course started on Day 3, so Day 5 is its second morning, not the third). With `d3_cleaning` = `bad` the outcome says the red cheeks are gone | `d3_course` | none |
| K5-02a–c Aunt Zina | morning | She asks to fix the shelf: 4 energy. Three openings: `a` she promised to tell about the note (`d3_asked_note`), `b` met on the stairs on Day 3 (`d3_met_zina`), `c` neither. Help: the spare tube for free, she names the pharmacy and says what the cream is for; her line repeats what mum told her (`d4_mom_talked`, `d4_ate_pies`). Hello: no help | not kind | `d5_helped_zina` = `shelf`, `d5_cream` = `gift`; or `d5_no_help` |
| K5-02d–f Aunt Zina | morning | «Мать говорит, ты за себя взялся»: she asks only to carry the bags, 2 energy. Same three openings, same reward | kind | `d5_helped_zina` = `bags`, `d5_cream` = `gift`; or `d5_no_help` |
| K5-03 Pharmacy on Sadovaya | day | The pharmacist names the cream, its price and what it does not do. Buy for 40 coins or leave. With `d3_course` she adds that she sells no second acne cream on top of the doctor's course (a line, not a mechanic) | `d5_no_help`, knows the note, no tube in the bag | `d5_cream` = `bought` |
| K5-04 Dentist | day | The free cleaning by the insurance policy. One choice; the 3 energy are an effect, so it is always open. Teeth −15; with `d1_soda_teeth` the dentist grumbles and it is −10. «Два часа не курить и не есть» | `d1_dentist_booked` | `d5_cleaned` = `full` or `soda` |
| K5-04n Dentist | day | A tooth aches from cold water; the nearest free slot is in a week. One light line, one button | no `d1_dentist_booked` | `d5_dentist_later` |
| K5-05a Dentist's porch | day | The craving right after the cleaning, ordinary. Resist (2 energy), the quarter (1 energy, only with `d1_half`), gum (uses the item), or smoke. Smoking here also takes back part of the cleaning: teeth +2 (the quarter +1), said in the card text | `d5_cleaned`, ordinary | `d5_no_smoke`, `d5_quarter` or `d5_smoked`; counter `smoke_free` |
| K5-05b Dentist's porch | day | The same, strong: resisting costs 3 energy and gives twice the confidence | `d5_cleaned`, strong | same |
| K5-06a–c Mum calls | evening | Aunt Zina phoned her: `a` he fixed the shelf, `b` he carried the bags, `c` «здороваешься и бежишь». Tell about the day (conf −1) or «Всё хорошо, мам»; the calm answer brings up the pies (`d4_ate_pies`, `d4_pies_held`). Nothing gets worse | `d5_helped_zina` = `shelf` / `bags`, or `d5_no_help` | none |
| K5-07a Balcony | evening | The craving at home for those without a cleaning, ordinary. Same four choices, no teeth effect | no `d5_cleaned`, ordinary | as K5-05a |
| K5-07b Balcony | evening | The same, strong | no `d5_cleaned`, strong | as K5-05a |
| K5-08a Alina writes | night | Her first message opens the card: «Привет. Видела твоё сообщение, замоталась.» One button, «Читать дальше»: the class-chat line and the answer about «Зерно» follow into the chat | `d1_wrote_plain` | `d5_alina_wrote` |
| K5-08d Alina writes | night | No message from Andrey on Day 1 but `d1_said_coming`: the opening is «Привет. Оксана собирает список на встречу.» instead of «…ты идёшь?», so she does not ask what she already saw in the class chat (added 2026-11-23) | `d1_said_coming`, no Day 1 message | `d5_alina_wrote` |
| K5-08b Alina writes | night | Dry opening with no mention of his message: «Привет, Андрей.» | `d1_wrote_flirty` | `d5_alina_wrote` |
| K5-08c Alina writes | night | «Привет. Оксана просила узнать, ты идёшь?» | neither Day 1 message (`d1_liked_only`, `d1_no_contact`) | `d5_alina_wrote` |
| K5-09 The question | night | The question about the reunion from the bank `alina_reunion_question` (10 phrasings). One button, «Ответишь утром» (decision 19): `affinity` +6 for everyone, reason «Алина написала первой». The day ends here | `d5_alina_wrote` | none |

Her message is built from parts in `content/chat.json`, each a separate chat bubble: the opening (`alina_first_plain`, `alina_first_dry`, `alina_first_oksana`, one phrasing each), then the class-chat line (`alina_first_coming` «Видела, ты написал, что придёшь.» with `d1_said_coming`, `alina_first_lurked` «Ты один в чате не ответил.» with `d1_lurked`, nothing after the door joke), then `alina_first_zerno` «Про «Зерно»: да, место хорошее.» with `d2_wrote_zerno`, then the question. `d2_liked_photo`, `d3_alina_liked` and `d4_alina_reacted` change nothing in her text. Nothing is written to her on Day 5: no `write` effect and no `chat` card.

Energy prices (decision 13 rules, as on Day 4): the shelf 4, the bags 2, the cleaning 3 (an effect on a free choice), not smoking 2 (ordinary) or 3 (strong), the quarter 1, park run 4, gym workout 4, side job 4, shower 2, teeth 1. A "clean" booked day — the shelf, the cleaning, a strong craving, a run and the side job — costs 18 against 10 energy (12 with the gym pass, 6 after a late Day 4 night). Every card keeps a free choice; the gum is a free way to resist once.

The cream (decision 17): `cream_zina` has no `onUse`, no modifier and no price; the bag lists it without «Применить». A player holds at most one tube: K5-03 needs `d5_no_help` and an empty slot, and a helper never sees the pharmacy card. A player who neither helped nor knows the note gets no pharmacy card and no line that teases the cream. Day 7 reads the item, `{ "item": "cream_zina" }` (and may take it with `{ "item": "cream_zina", "add": -1 }` when the shave happens); `d5_cream` only says how he got it (`gift` or `bought`), for texts.

Smoking count: `smoke_free` arrives from Day 4 as 0, 1, 2 or 4. Resisting or the gum adds 1 (1, 2, 3 or 5) and gives care −2; a cigarette sets it to 0 with care +2; the quarter sets it to 0 with care +1. Resisting gives conf −1 on the ordinary card and conf −2 on the strong one. The Day 4 strength rule is reused unchanged. One craving card a day: on the porch for a player who had the cleaning, on the balcony for everyone else; each is closed by its own flags.

Plus actions on day 5 (day, evening, night): park run (4, weight −3 or −1, counter `useful`), gym workout (4, weight −3, only while the pass is running), shower and clean T-shirt (2, care −5, counter `useful`), teeth by the timer (1, teeth −1), sofa (0, conf +1). Sleep (night) closes the day; «Посидеть в телефоне до трёх» sets `d5_late` and −4 energy on day 6.

Neutral choice per story card (marked `"neutral": true`): K5-00 `up`, K5-01 `ok`, K5-02a–f `hello`, K5-03 `skip`, K5-04 `go` (the agreed exception of decision 18: it takes 3 energy as an effect and improves teeth), K5-04n `book`, K5-05a/b `smoke`, K5-06a–c `calm`, K5-07a/b `smoke`, K5-08a–c `read`, K5-09 `morning`. A fully skipped Day 5 therefore runs K5-00 if it applies, K5-01, K5-02x, K5-03 if he knows the note, K5-04 and K5-05x (booked) or K5-04n, K5-06c, K5-07x (not booked), K5-08x, K5-09: Andrey says hello and does not help, buys nothing, goes to the cleaning if it was booked, smokes as usual (`smoke_free` 0), and Alina's message arrives and waits with its +6. No coins are spent and nothing is sent to Alina.

Day 5 card: reward 50 gold and dental floss (`floss`, the same item as the Day 3 gift). Line for tomorrow: «Утром: ответить Алине».

Longest morning chain: three cards (K5-00, K5-01, K5-02x), against five on Day 4. The gym pass has no morning line on Day 5: it was explained on days 3 and 4.

Earlier flags paid off on day 5: `d1_refused_pies` and `d4_pies_held` (the smaller favour), `d3_met_zina` and `d3_asked_note` (her opening), `d2_saw_note` and `d3_asked_note` (the pharmacy), `d3_course` (the mirror, the pharmacist), `d3_cleaning` (the mirror), `d1_dentist_booked` and `d1_soda_teeth` (the dentist), `d1_half` (the quarter), `d4_late` (K5-00), `d4_mom_talked` and `d4_ate_pies` (Aunt Zina's line), `d4_ate_pies` and `d4_pies_held` (mum's call), `d2_gym` (`A5-gym`), counter `smoke_free`, `d1_wrote_plain`, `d1_wrote_flirty` (its Day 5 half: the dry opening; «Ты мне, кстати, странное писал» stays on Day 6), `d1_liked_only`, `d1_no_contact`, `d1_said_coming`, `d1_lurked`, `d2_wrote_zerno`. Not paid on purpose: `d2_liked_photo`, `d3_alina_liked`, `d4_alina_reacted` (section 3: they were paid through `affinity`). No Day 5 payoff was moved.

### How Day 5 pays off later

| Flag | Day | Payoff |
|---|---|---|
| `d5_alina_wrote` | 6 | Opens the reply: the Day 6 morning starts from her question; the last line in the chat is the phrase to answer |
| item `cream_zina` | 7 | The shave: with the tube in the bag it goes cleanly, without it the face is red before «Зерно» (decision 17). Day 7 checks `{ "item": "cream_zina" }` |
| `d5_cream` | 7 | `gift` or `bought`: one word in the shave text («тёти-Зинин крем» / «крем с Садовой») |
| `d5_helped_zina`, `d5_no_help` | 5, 6 | Choose mum's call and the pharmacy card; Aunt Zina can greet him differently on the stairs later (proposed) |
| `d5_cleaned` | 7 | The smile in «Зерно»: `full` or `soda`; the Day 7 scene counts clean teeth |
| `d5_dentist_later` | 12 | The cleaning he booked on Day 5, outside the demo |
| `d5_dentist_moved` | 12, outside the demo | Booked players may put the cleaning off (choice `move` on K5-04, added 2026-11-23 on the author's word): no energy spent, teeth unchanged, the evening craving comes on the balcony instead of the porch |
| `d5_smoked`, `d5_no_smoke`, `d5_quarter`, counter `smoke_free` | 6, 7 | The next craving and the Day 7 "smoked today" check |
| `d5_late` | 6 | Morning «Проспал»: he reread her message until three |

Engine notes for days 6+ (nothing in `src/` was changed):
- A card with `says` shows only the last phrase of the crush, and a card's text is fixed. So a message built from parts takes two cards: K5-08x opens with the first bubble, its only button sends the middle bubbles, K5-09 opens with the question. Decision 19 asks for one card with one button; the day has two cards with one button each, and the second is «Ответишь утром». One card would need the engine to show several fresh bubbles on a card.
- The outcome text of K5-08x cannot quote the random question, and `fill()` has only the nominative name, so texts avoid «от {crush}».
- `Cond` cannot ask whether a modifier is active: `A5-gym` infers the gym pass as K3-00b does, with the same limit.
- A neutral choice cannot have `cost`, so the cleaning's energy is an effect and is written into the button label («−3 энергии») instead of the cost badge. With less than 3 energy it takes what is left.
- `useItem()` would consume an item without `onUse` and do nothing; the UI never offers it (the «Применить» button needs `onUse`), so the tube stays in the bag until Day 7.
- The chat bubbles of Day 5 carry no time stamps; "late" is said by the night part only.

## 5f. Day 6 design (implemented)

The authoritative version is `content/cards/day6.json`. Written 2026-11-23 from `DECISIONS.md` rows 20–24 and section 3; the texts are not reviewed by the authors yet. Story cards are listed in display order.

"Tone" below is the Day 5 opening: warm (`d1_wrote_plain`), flirty (`d1_wrote_flirty`), list (no Day 1 message, `d1_said_coming`), oksana (no Day 1 message, no `d1_said_coming`). "Ordinary" means the counter `smoke_free` is 0 when the craving card arrives, "strong" means it is 1 or more.

| Card | Part | What happens | Condition | Flags set |
|---|---|---|---|---|
| K6-00 Overslept | morning | «Проспал»: −4 energy, already taken by Day 5's `tomorrow` effect, and the reply goes out by noon. A line only | `d5_late` | none |
| K6-01 Her question waits | morning | The reply. Each label is the exact message, sent with `write`. Dry «Да, записывай.» (0, neutral). Plain «Да, записывай. А кто ещё из наших будет?» (+5). Third button by confidence: the joke «Записывай. Обещаю не петь, как на выпускном.» (+8) or the four-line excuse (−5). After the reply the chat shows a status line «Алина прочитала сообщение в 09:12.»; with `d5_late` the time is around noon | `d5_alina_wrote` | `d6_reply` = `dry`, `plain`, `joke` or `excuse` |
| K6-02 A look from the feed | day | The trap (decision 23): a stylist's post, «рубашка поверх худи, штаны подвернуть, носки напоказ». Put it together from his own wardrobe (free, style +4) or scroll | none | `d6_trend` |
| K6-03a–c Market or optician | day | Vitya calls and recalls the barbecue: `a` one skewer (`d4_meat_held`), `b` five skewers (`d4_feast`), `c` «На шашлыки не пришёл». The shirt at the market for 90 coins (style −6, the blue shirt) or the frame at the optician for 150 (style −12, conf −2, round glasses): the shop's items at the shop's prices, one purchase on the card. Free: go along and buy nothing (conf −1). With `d6_trend` Vitya comments on the look | none | `bought_shirt` + `d6_shirt`, or `bought_frame` + `d6_frame` |
| K6-04 Class chat | evening | Oksana posts a photo of bearded Gromov; Alina: «Громов, это ты или геолог? Борода вообще не моё». She is online and jokes in the class chat while the private chat is silent. Every choice gives the hint: the notebook line, the revealed taste `no_beard`, the feed post. With `d1_lurked` Andrey can at last write in the class chat (conf −2) | none | `d6_beard_hint`, `d6_chat_spoke` |
| K6-05d Alina answered | evening | After the dry reply: «Ок, записала.» One button. No fork | `d6_reply` = `dry` | `d6_answered`, `d6_talked` |
| K6-05e Alina answered | evening | After the excuse: «Поняла. Записала.» One button. No fork | `d6_reply` = `excuse` | `d6_answered`, `d6_talked` |
| K6-05p Alina answered | evening | After the plain reply: «Записала. Почти все наши, даже Громов обещал.» The button sends her tone line: warm, from the bank `alina_tone_warm`; list, «Ты и в чате писал, что придёшь. Теперь официально.»; oksana, «А я думала, ответишь одним словом.» | `d6_reply` = `plain`, not flirty | `d6_answered` |
| K6-05j Alina answered | evening | After the joke: «Записала. А жаль: пел ты ужасно, зато громко.» Tone lines as above, except oksana stays business-like because he asked nothing back: «Оксане передам, что ты в списке.» | `d6_reply` = `joke`, not flirty | `d6_answered` |
| K6-05pf, K6-05jf Alina answered | evening | Flirty tone, dry: «Записала. Почти все.» / «Записала. Не пой.» No tone line | `d6_reply` = `plain` / `joke`, `d1_wrote_flirty` | `d6_answered` |
| K6-06 Alina asks | evening | The second fork: «А сам как? Сто лет тебя не слышала.» (bank of 10). Open answer with a question back +3, short answer with a question back +1, «Нормально.» 0 (neutral). With `d2_wrote_zerno` she adds «Я, кстати, по субботам в «Зерне». Раз уж тебе место понравилось.» | `d6_reply` = `plain` or `joke`, not flirty | `d6_talk` = `open`, `work` or `short`; `d6_talked` |
| K6-06f Alina remembered | evening | The second fork for the flirty tone: «Ты мне, кстати, странное писал.» Owning it +3 («Проехали. Но сердечки пока придержи.»), «Писал. Бывает.» 0 (neutral), one more heart −5 («Ясно.»). The Saturday line follows the first two | `d6_reply` = `plain` or `joke`, `d1_wrote_flirty` | `d6_talk` = `owned`, `shrug` or `repeat`; `d6_talked` |
| K6-07 Alina says goodbye | evening | «Ладно, мне пора. Увидимся на встрече, наверное.» (bank of 10 close phrasings). One button. The evening ends here | `d6_talked` | `d6_bye` |
| K6-08a Balcony | night | The craving, ordinary. Resist (2 energy), the quarter (1 energy, only with `d1_half`), gum (uses the item), or smoke. With `d5_quarter` the texts remember yesterday's quarter | ordinary | `d6_no_smoke`, `d6_quarter` or `d6_smoked`; counter `smoke_free` |
| K6-08b Balcony | night | The same, strong: resisting costs 3 energy and gives twice the confidence | strong | same |

Chance budget (decision 4): the reply moves `affinity` when it is sent (0, +5, +8 or −5, with its reason line), the second fork when it is answered (up to +3; −5 only for the second heart). Over the whole day Alina gives between −5 and +11: −5 the excuse; 0 dry, or plain with the second heart; +3 the joke with the second heart; +5, +6, +8 plain; +8, +9, +11 the joke. Measured on 600 random engine runs of Day 6 after random days 1–5: minimum −5, maximum +11, every choice of the day taken at least once. Her lines never name what Andrey changed.

The confidence threshold. The joke is open at `conf` ≤ 75 (5 points better than the start, 6% on the «Уверенность» bar), the excuse above it. The value sits in one card, K6-01: the joke's `requires` is `{ "problem": "conf", "lte": 75 }` and the excuse's is the `not` of the same condition; change both numbers together. `conf` on the morning of Day 6, from engine runs of days 1–5 (start 80): all five days skipped 90; neutral choices and the sofa every day 85; random choices and actions (400 runs) 68–84, median 76; random with each day skipped at 30% median 80; a diligent player 66–67, 62–63 with the haircut and the frame from the shop. Share with the joke open at 75: skipped and lazy 0%, random 50%, random with skips 16%, diligent 100%. One step either way: at 74 the random share is 39%, at 76 it is 63%.

Prices. Coins when the market card opens, from 600 runs: minimum 90, 10th percentile 200, median 310, 90th percentile 390; 100% can pay for the shirt (90), 98% for the frame (150), 74% could pay for both (240). The card sells one of them; the other stays in the shop. A player who skipped all five days has 100 coins: the shirt is on offer, the frame is shown disabled with «Не хватает монет». The trap costs nothing and gives nothing (decision 23).

Smoking count: `smoke_free` arrives from Day 5 as 0, 1, 2, 3 or 5. Resisting or the gum adds 1 and gives care −2; a cigarette sets it to 0 with care +2; the quarter sets it to 0 with care +1. Resisting gives conf −1 on the ordinary card and conf −2 on the strong one. One craving card, at night, closed by its own flags.

Plus actions on day 6 (day, evening, night): park run (4, weight −3 or −1, counter `useful`), gym workout (4, weight −3, only while the pass is running), shower and clean T-shirt (2, care −5, counter `useful`), teeth by the timer (1, teeth −1), sofa (0, conf +1). Sleep (night) closes the day; «Посидеть в телефоне до трёх» sets `d6_late` and −4 energy on day 7.

Neutral choice per story card (marked `"neutral": true`): K6-00 `up`, K6-01 `dry` (the agreed exception of decision 22: it writes to the crush), K6-02 `scroll`, K6-03a–c and K6-03ao–co `home`, K6-04 `scroll`, K6-05x `read`, K6-06 `short`, K6-06f `shrug`, K6-07 `ok`, K6-08a/b `smoke`. A fully skipped Day 6 therefore runs K6-00 if it applies, K6-01, K6-02, K6-03x, K6-04, K6-05d, K6-07, K6-08x: Andrey sends «Да, записывай.», buys nothing, scrolls the class chat and still gets the beard hint, reads «Ок, записала.» (plus the «Долго ты» line after a late night) and the goodbye, smokes as usual. No coins are spent and `affinity` does not move. The same holds when Day 5 was skipped as well: her message arrived by itself with its +6, and his reply follows.

Day 6 card: reward 50 gold and gum (`gum`). Line for tomorrow: «Завтра суббота. Кофейня «Зерно»».

Earlier flags paid off on day 6: `d5_alina_wrote` (K6-01), `d5_late` (K6-00, the noon read receipt, her «Долго ты» line from the bank `alina_long`), `d1_wrote_plain`, `d1_said_coming`, `d1_liked_only`, `d1_no_contact` (her tone), `d1_wrote_flirty` (dry answers and the «странное писал» fork), `d2_wrote_zerno` (Saturdays at «Зерно»), `d1_lurked` (the class chat), `d4_meat_held`, `d4_feast` (Vitya), `d5_quarter`, `d5_smoked`, `d5_no_smoke` through the counter `smoke_free` (the balcony), `d1_half` (the quarter), `d2_gym` (`A6-gym`).

Where the implementation differs from section 3, and why:
- The plain reply asks «А кто ещё из наших будет?» instead of the grid's example «Сама-то идёшь?»: Alina wrote «Я буду» in the class chat on Day 1 (K1-01).
- The «странное писал» beat and the Saturday line exist only in the live exchange (after the plain reply or the joke). After the dry reply or the excuse there is no fork (section 3, decision 22), so a flirty player who answers dryly gets only her dry tone on Day 6; the callback is left for Day 7 (table below).
- «Долго ты» comes after her answer, not before it: a card with `says` opens on the answer.
- The joke invents a detail of the past: Andrey sang at the graduation party, badly and loudly.

### How Day 6 pays off later

| Flag | Day | Payoff |
|---|---|---|
| `d6_reply` | 6, 7 | Chooses her evening answer; in «Зерно» she can pick up the thread («Петь не будешь?» after the joke) |
| `d6_talk` | 6, 7 | Chooses the goodbye outcome; the tone of her Day 7 evening message (`open` and `owned` warm, `repeat` cold) |
| `d6_answered`, `d6_talked`, `d6_bye` | 6 | Order of the evening cards |
| `d6_beard_hint` | 7 | The morning "shave or keep" card can quote her line; the choice itself is open to everyone (decision 24). The taste `no_beard` is already revealed in the chat tab |
| `d6_trend` | 6, 7 | Vitya's line at the market; the clothes Andrey wears into «Зерно» (the look stays on unless a shirt was bought) |
| `d6_shirt`, `d6_frame`, `bought_shirt`, `bought_frame` | 7 | The "clothes" check of the «Зерно» scene; the shop no longer sells the item |
| `d6_chat_spoke` | 7 | The class chat is no longer silent about him: Oksana or Vitya can tag him under the next post (proposed) |
| `d6_smoked`, `d6_no_smoke`, `d6_quarter`, counter `smoke_free` | 7 | The "smoked today" check of the meeting |
| `d6_late` | 7 | Morning «Проспал» before the shave |
| `d1_wrote_flirty` with `d6_reply` = `dry` or `excuse` | 7 | The «странное писал» callback this player has not had yet (proposed) |

Engine notes for day 7 (nothing in `src/` was changed):
- A story card cannot be a `chat` card (those are drawn from the random deck), so what Andrey sends is a `write` effect with the same string as the label. The two must be edited together; a test compares them.
- A card with `says` shows only that phrase, and a card's text is fixed. So her evening takes three cards on the live path (answer, question, goodbye) and two on the dry one, each opening on one bubble; the tone line and the «Долго ты» line go into the chat from the first button and are only retold in the outcome text when they come from a bank.
- One card cannot show different buttons by a number without two conditions, so the threshold is written twice in K6-01 (`lte` and its `not`).
- The reason line and the day card attribute the chance change to the choice that made it, so the reply's `affinity` is applied in the morning, when the message is sent, not when she answers.
- `fill()` has only the nominative name: texts avoid «от {crush}», «сообщение {hero}».
- K6-03ao, K6-03bo, K6-03co (added 2026-11-23): the same call from Vitya for a player who already owns both the shirt and the frame. No prices in the text, two choices (`look` «Съездить за компанию», `home` neutral). K6-03a–c require that at least one of the two is not bought; the `o` variants require both and `not seen` of their selling card, so buying the second item on the card does not bring the call again.
- K6-00 names no energy number in its outcome: with a gym pass the morning has 8 energy, not 6.
- The market card buys the shop's shirt or frame by copying the item's `onUse` effects and setting `bought_<id>`; if `content/items.json` changes, K6-03a–c must change with it (a test compares the prices, not the effects).
- The trendy look is not undone by a new shirt: `style` simply moves by both numbers.
- On a 320×568 screen the market card with a disabled button fills the whole sheet; a longer text there would push the last button out of reach.

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
