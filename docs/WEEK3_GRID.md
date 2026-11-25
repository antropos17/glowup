# Week 3 grid (days 15–21)

Status: v1, 2026-11-25. Ruslan answered the open questions on 2026-11-25 («Все по рекомендации», A6 answers); the day rows below follow those answers. Days 15 and 16 are written (Part C below); days 17–21 are not. After approval, days are written one at a time with `/write-day <n>`, which takes its per-day design from Part A.

Labels used below:
- **[F]**: fact, checked in the repo files on 2026-11-25 (the file is named).
- **[A …]**: taken from the authors' docs or answers; the citation names the file and section or decision row.
- **[P]**: proposal of this document, not confirmed.
- **[T]**: taste: a judgement about tone or pacing, not a fact and not a rule.

Card names are English working titles. Russian in «quotes» is either existing game text (quoted) or marked **draft**: a sample line for the executor, not final text.

Facts this grid relies on (checked in the files on 2026-11-25):
- Fiction calendar [F]: Day 6 ends on «Завтра суббота», so Day 7 and Day 14 are Saturdays, Day 1 was a Sunday. Week 3 is Sunday 15 to Saturday 21. Day 30 falls on a Monday (see A6, question 15). The engine has no weekdays; only texts carry them.
- Balance [F, `content/balance.json`]: energy 10 a day, day reward 50 coins, `contentDays` 14, `demoDays` 7. Side job `A-job` [F, `content/cards/side-jobs.json`]: days 1–14, 4 energy, 30 coins (3 in 4) or 20, once a day.
- Shop [F, `content/items.json`]: gym pass 150 (7 mornings from the next one), «Сияние» 220 (once), frame 150, shirt 90, haircut 70 (once, 2 energy). Gifts without a price: `gum`, `acne_patch`, `floss`, `cream_zina`. Day gifts of week 2 cycle `floss`, `gum`, `acne_patch` [F, `content/days.json`].
- The renewed pass [F, `content/cards/day9.json` K9-02a]: applied on Day 9, so it runs mornings 10–16. The Day 10–14 gym actions read `d9_pass` = `renewed` with no end; copied unchanged into week 3 they would keep the gym open forever (A5, gap 1).
- Vitya's runs [F, `day9.json` K9-02a/b]: «бегай со мной по утрам, в семь у подъезда», no end date. K-run cards exist on days 10–14.
- Day 14 promises that week 3 must keep [F, `content/cards/day14.json`]:
  - K14-06c (`d13_bday` = `home`): Vitya kept a slice of cake, «В понедельник занесу» → Day 16.
  - K14-05s: for `d10_photo` = `old` / `none` she asked «Пришлёшь?» (the "now" photo for Oksana).
  - K14-05cq «Помогу тебе»: she wrote him into Oksana's list for the chairs («Стулья. Их всегда не хватает»). No flag records this choice; it is `d14_met` = `came`, `d7_msg` ≠ `dry`, counter `d14_scene` ≥ 1 (A5, gap 6).
  - K14-05pq: the planned table picked the songs; «Оксане отправлю вечером».
  - K14-05cq names what Oksana gave her: «музыка, слайды, зал». The venue is not chosen in the text yet. «Еда за свой счёт» is said about the reunion.
  - Her friend Даша: «мы вместе работаем». Alina is at «Зерно» on Saturday mornings [F, hint `zerno_saturday`].
  - Sleep line: «До встречи выпускников шестнадцать дней».
- Fixed story beats [A `DESIGN.md` §5, proposed there: days 1, 10, 20, 30; Day 10 confirmed by answer 1 of the week 2 grid]. Day 20 is in week 3; Ruslan accepted it as the week 3 fixed beat (A6 answer 1).

---

# Part A. Grid for days 15–21

## A1. The arc of week 3

Where the player stands on the morning of Day 15:

| Line | State after Day 14 | Label |
|---|---|---|
| Crush | One meeting by chance (Day 7) and one by choice (Day 14) or a Saturday at home. Her evening message `d14_msg` = `warm` / `even` / `dry`, or none for those at home. The tone of Day 7 (`d7_msg`) still colours everything | [F] |
| Reunion | 16 days left. Oksana runs it: music and slides with Alina, the venue open. The player may already be on the music (planned table) or the chairs (K14-05cq) | [F] |
| Hero | The fixes have run their course: the doctor's course ended on Day 13, the dentist is done (Day 5 or 12), the Day 2 pass ended on Day 9, the renewed pass ends on Day 16. The haircut is done or not (Day 11) | [F] |
| Habits | `smoke_free` can be at 14 on Day 15 for a player who held every day; the shave grows back every week (days 8, 14) | [F] |

What week 3 is about [P]:

| | Week 2 (days 8–14) | Week 3 (days 15–21) |
|---|---|---|
| Crush line | From her one-way message to the first meeting by choice | From the reunion as a topic to the reunion as a shared job: the organisers' chat «Оргкомитет», the setup evening on Day 20, and for the warm player the first meeting that is not about the reunion (Day 21) |
| Hero line | The novelty wears off; keep habits without help | Get ready to be seen by everyone: the "now" photo, the graduation suit, the song, the smell. Week 3 swaps "fix a problem" for "show up as you are now" |
| Temptations | Fat burner, salon, strips (three traps) | One paid trap (a cologne), plus social ones: the cake, the bar, smokers at the venue door |
| Fixed beat | Day 10 «Тогда и сейчас» | Day 20 «Десять дней»: the setup at the venue, the class sees the slideshow, the microphone test, a minute alone with her |

How it differs from week 2 [T]: week 2 was private (mum, Aunt Zina, the dentist, one coffee); week 3 is social: the class gets a face again (Oksana, Vitya, Gromov, Alina together). Losing ground in week 3 is still light: every Alina beat has a neutral that sends nothing, and the organisers' chat is open to anyone who volunteers on Day 15, so the dry player has a way back, as the class chat was in week 2.

What it hands to week 4 [P]: the program of the reunion (who sings, whose slide, who carries chairs), the outfit (suit, shirt or as is), the perfume or not, her week-3 message (`d20_msg`, `d21_msg`), the fourth Saturday (Day 28), Sunday lunches 22 and 29, the taste reveal planned near the end [A `DESIGN.md` §3 "on day 29 it turns out…"].

Week tone [P]. Week 2 split everything by `d7_msg`. Week 3 splits by `d15_tone`, set once on Day 15 by the Alina card every player gets (K15-06*), from Day 14:

| Day 14 state | `d15_tone` |
|---|---|
| `d14_msg` = `warm` | `warm` |
| `d14_msg` = `even` and `d7_msg` = `warm` | `warm` |
| `d14_msg` = `even`, otherwise | `even` |
| `d14_msg` = `dry` | `dry` |
| `d14_met` = `home` and `d12_helped_music` (she waited with the list) | `even` (K15-06m: she asks whether he is all right) |
| `d14_met` = `home`, otherwise | one step down from `d7_msg` for `warm` (→ `even`); `even` stays `even`; `dry` stays `dry` |

The share of players in each tone is to be measured on engine runs when Day 15 is written (A6, question 4).

## A2. Day by day

Common to every day of week 3 [F pattern of days 8–14, unchanged]:
- Plus actions (day, evening, night): `A<n>-run`, `A<n>-gym` (only while a pass runs: the new modifier condition, A6 answer 18; exact shape: see `src/engine/types.ts` after the gym-condition task lands; fallback A5 gap 1), `A<n>-clean`, `A<n>-teeth`, `A<n>-couch`, and `A-job` extended to day 21. Sleep closes the day; «Посидеть в телефоне до трёх» sets `d<n>_late` and −4 energy tomorrow; next morning `K<n>-late` «Проспал».
- K-run «Витя у подъезда» every morning for `d9_pass` = `vitya` (run 4 energy, weight −2, `useful` +1 / **skip**) [A6 answer 13]. The `d9_burner` lines stop: a week later nobody remembers the capsules [T].
- One craving a day, split by yesterday's result (`d<n-1>_smoked` or no flag / `_quarter` / `_no_smoke`): hold 2 / 2 / 3 energy, quarter 1 (`d1_half`), gum, **smoke**. Where it sits moves with the story (Day 19 bar door, Day 20 venue door, Day 21 «Зерно» door) [A decision 13, decision 30 pattern].
- Every story card has a free neutral; a neutral never writes to her (except where a decision says otherwise, as decision 22). No purchase offer on a card that follows a failure [A decision 6].
- She never names what changed [A `DESIGN.md` §3]. Affinity steps inside decision 4.
- Gifts continue the week 2 cycle [P]: 15 `gum`, 16 `acne_patch`, 17 `floss`, 18 `gum`, 19 `acne_patch`, 20 `floss`, 21 `gum`.

### Day 15 (Sunday). The organisers («Оргкомитет», working)
Leans on: `skin`, `weight`, `conf`. Chance: −2 … +3. Fixed beat: none.

Cards in display order [P]. Neutral in **bold**.

| Part | Card | Shown when | Situation and choices | Sets |
|---|---|---|---|---|
| morning | K15-late Проспал | `d14_late` | **up** | — |
| morning | K15-run Витя у подъезда | `d9_pass` = `vitya` | Sunday run; draft «Витя: «В воскресенье бежим длинный круг»». run (4 energy, weight −2, `useful` +1) / **skip** | — |
| morning | K15-01a / b Прыщ | a: `d13_course_done`; b: otherwise | One new pimple on the chin, two days after the course. a quotes Galina Petrovna («руками не трогать», existing K13-02 text); b: the control visit was put off («Позвоню потом»). wash (1 energy, skin −1) / patch (requires item `acne_patch`; item −1, skin −3) / **squeeze** (skin +3; draft hint «часто: краснеет»). No purchase choice: this is a small failure moment | `d15_pimple` = `washed` / `patch` / `squeezed` |
| day | K15-02a / b Обед у мамы | a: `d8_lunch` = `held` (she baked fewer, a salad on the table); b: `ate` | The Sunday ritual [A6 answer 5]. Mum's line, first that applies: `bought_haircut` («Подстригся! Совсем другое дело», draft), `smoke_free` ≥ 7 («И куревом не пахнет», draft), otherwise pies to take home. one pie and salad (2 energy, conf −1) / **eat** (weight +2) | `d15_lunch` = `held` / `ate` |
| day | K15-03m Алина добавила тебя | `d14_met` = `planned` | Alina adds him to the chat «Оргкомитет» (Oksana, Alina, Vitya, him): draft «Добавила тебя: ты же у нас музыка». **ok** | `d15_team` = `music` |
| day | K15-03c Алина добавила тебя | `d14_met` = `came`, `d7_msg` ≠ `dry`, counter `d14_scene` ≥ 1 | Same chat; draft «Ты обещал стулья. Добавила, не отвертишься». **ok** | `d15_team` = `chairs` |
| day | K15-04 Чат класса | no `d15_team` | Oksana in «11-Б навсегда»: draft «Нужны руки: стулья, проектор, звук. Кто может?». With `d9_oksana` she names him. volunteer «Я могу» (conf −1; he lands in «Оргкомитет») / **scroll** | `d15_team` = `volunteer` |
| day | K15-05a / b Фото «сейчас» | `d10_photo` = `old` or `none`; a: he went on Day 14 and saw the slideshow (she asked «Пришлёшь?»); b: otherwise (Oksana reminds in the chat) | Second chance for the Day 10 photo. selfie (2 energy, conf −2; with `d3_posted` 1 energy, as K10-02) / **later**. No reaction today: the slide is seen on Day 20 | `d15_photo` = `fresh` |
| evening | K15-06w {crush} пишет | `d15_tone` rule = `warm` (A1) | Her first message that is not about the reunion. With `d12_helped_music`: draft «После твоего списка всё остальное кажется скучным. Что слушаешь сейчас?»; otherwise draft «Как воскресенье? У меня сериал и пицца». Labels are his exact messages: plain answer with a question back (+3) / «Да так, ничего» (0) / a long story about his week (−2) / **later** (no message, 0) | `d15_tone` = `warm`; `d15_reply` = `ask` / `short` / `long` / `later` |
| evening | K15-06m {crush} пишет | `d14_met` = `home`, `d12_helped_music` | Draft «Список я Оксане сама отправила. У тебя всё нормально?». «Прости, не выбрался. Как список?» (+2) / «Да, всё норм» (0) / **later** (0). Light: no guilt copy | `d15_tone` = `even`; `d15_reply` = `sorry` / `short` / `later` |
| evening | K15-06e {crush} в «Оргкомитете» | `d15_tone` rule = `even`, not K15-06m | With `d15_team`: her group message, draft «Всем спасибо, кто вписался!», and a like under his «Я могу» or the add. Without: a status line in the class chat. **ok**, 0 | `d15_tone` = `even` |
| evening | K15-06d {crush} в сети | `d15_tone` rule = `dry` | Status line (`status_online`, exists). **ok**, 0 | `d15_tone` = `dry` |
| evening | K15-07w / m {crush} ответила | `d15_reply` = `ask` (w) / `sorry` (m) | One bubble (two-card rule, A5 gap 5). w: she answers his question back; m: draft «Нормально. Пять песен из двадцати выбрали, остальное в пятницу». **ok** | — |
| night | K15-08a / q / b Балкон | yesterday `d14_smoked` (or no Day 14 flag) / `d14_quarter` / `d14_no_smoke` | as common | `d15_smoked` / `d15_no_smoke` / `d15_quarter` |
| night | K15-09 Две недели без сигарет | `d15_no_smoke` and `smoke_free` ≥ 14 | **ok** (care −3), as K11-07 | — |
| day–night | A15-run, A15-gym, A15-clean, A15-teeth, A15-couch, A-job | plus menu | as Day 14; A15-gym requires the modifier `gym` to be running (new condition, see `src/engine/types.ts` after the gym-condition task lands; fallback A5 gap 1) | — |
| night | K15-sleep | | sleep (draft «До встречи выпускников пятнадцать дней») / late (`d15_late`) | `d15_late` |

Content prerequisites for Day 15: `A-job` days 1–15; `content/days.json` day 15 (title, gift `gum`, draft teaser «Завтра понедельник. Оксана раздаёт задания»); chat situations for K15-06w (two openers), K15-06m, K15-06e, K15-07w (by his question), K15-07m, 10 phrasings each; `balance.contentDays` 15.

Day ends on: her answer (K15-07w/m), her group «спасибо» (K15-06e), or «была в сети» (dry); then the balcony.
Earlier flags read: `d14_late`, `d9_pass`, `d13_course_done`, item `acne_patch`, `d8_lunch`, `bought_haircut`, `smoke_free`, `d14_met`, `d7_msg`, counter `d14_scene`, `d9_oksana`, `d10_photo`, `d3_posted`, `d14_msg`, `d12_helped_music`, `d14_smoked` / `d14_quarter` / `d14_no_smoke`, `d1_half`, item `gum`.
Problems: skin −3 … +3, weight −2 … +2, conf −4 … 0, care −5 … +2. Affinity −2 … +3. Coins: in 50 (+ job); out none.
Skipped day: up, no run, the pimple squeezed, the pies eaten, the team add accepted (it is her action), no volunteer, no photo, no message to her, smoked. `affinity` 0. `d15_tone` is set by whichever K15-06 card plays.

### Day 16 (Monday). The slice of cake («Кусок торта», working)
Leans on: `weight`. Chance: 0.

| Part | Card | Situation and choices | Src |
|---|---|---|---|
| morning | K16-00 Абонемент: последний день | Shown when the modifier `gym` has its last morning today (new condition, `daysLeft` 0 or its equivalent, see `src/engine/types.ts` after the gym-condition task lands): the renewed pass (mornings 10–16) and any shop pass alike. Fallback without the condition: `d9_pass` = `renewed` only | [F] date, [A6 answer 18] card |
| morning | K16-01a Витя с тортом | `d13_bday` = `home`: Vitya at the door (or at the run) with the slice he promised. eat half (1 energy) / give it to Aunt Zina (free, `d16_cake` = `zina`) / **eat** (weight +1) | [F] K14-06c promise |
| morning | K16-01b Витя | `d13_bday` = `held` / `cake`: one line at the run or by message, no choice | [P] |
| day | K16-02 Оргкомитет: задания | `d15_team`: Oksana hands out the jobs: `music` five songs with Alina by Thursday; `chairs` / `volunteer` chairs and the projector on Friday. The venue and time are named (A6, question 3). **ok** | [P] |
| day | K16-02x Чат класса | no `d15_team`: Oksana posts the venue and «в пятницу кто может — помогите». **ok** | [P] |
| evening | K16-03 Продлить? | After K16-00: renew (150 coins, the shop pass) / Vitya's runs (if not already) / **later**. Not a failure moment, so the offer is allowed | [P], as K9-02a |
| night | Craving | Balcony | common |

Reads: `d9_pass`, `d13_bday`, `d15_team`. Sets: `d16_cake` (`half`, `zina`, `ate`), `d16_pass` (`renewed`, `vitya`, `none`). Day ends on: the job from Oksana [P].
Problems: weight −2 … +1. Affinity 0. Coins: in 50 (+ job); out 150 (optional).
Skipped day: the slice eaten, the pass not renewed, the job noted, smoked.

### Day 17 (Tuesday). The smell («Запах», working)
Leans on: `care`, `style`. Chance: 0.

| Part | Card | Situation and choices | Src |
|---|---|---|---|
| day | K17-01 Лента: одеколон «Альфа» | The obvious solution for smell, 60 coins. Odds on the button: часто «слишком резко» (care +2 today), иногда «нормально» (care −1). **scroll**. The week's only paid trap (A6 answer 9) | [A6 answer 9]; "obvious fails" [A `DESIGN.md` §2] |
| day | K17-02a / b / s Аптека на Садовой | Aunt Zina at the pharmacy where the cream came from. a: `d5_helped_zina` or `d16_cake` = `zina` (warm hello); b: otherwise; both for `smoke_free` ≥ 1. She sniffs: draft «Табаком не пахнет. Уже полдела». She gives a tester of the pharmacy's eau de toilette (care −2, free). buy the bottle (120 coins, A6 question 7) / **later**. Variant s (`smoke_free` 0, he smoked yesterday): draft «Куришь всё-таки? Духи табак не перебьют»; tester only, **no purchase choice** (the card states a failure) | [P]; hidden solution: no smoke + clean shirt |
| day | K17-03 Гоша выглянул | `d11_tip`, no `bought_haircut`, no `d11_cut`: the barber next door. cut (70 coins, 2 energy, the shop haircut effects, sets `bought_haircut`) / **later** | [P]; pays `d11_tip` |
| evening | K17-04 Оргкомитет: двадцать песен | `d15_team` = `music`: Alina sends the twenty songs to cut to five. **ok** (no affinity) | [P] |
| evening | K17-05w {crush} в сети | `d15_tone` = `warm`: status line only. A quiet day [A `DESIGN.md` §3] | [P] |
| night | Craving | Balcony | common |

Reads: `d5_helped_zina`, `d5_cream` (the cream line), `d16_cake`, `smoke_free`, `d11_tip`, `d11_cut`, `bought_haircut`, `d15_team`, `d15_tone`. Sets: `d17_alpha` (`odd`, `fine`), `bought_perfume` (if sold on a card, set by its effect), `d17_tester`. Day ends on: Aunt Zina's line [P].
Problems: care −8 … +2, conf −2 … 0. Affinity 0. Coins: in 50 (+ job); out 60, 120, 70 (all optional).
Skipped day: the cologne scrolled, the tester taken, no bottle, no haircut, smoked.

### Day 18 (Wednesday). The graduation suit («Костюм с выпускного», working)
Leans on: `weight`, `style`, `conf`. Chance: −2 … +3.

| Part | Card | Situation and choices | Src |
|---|---|---|---|
| morning | K18-01 Дресс-код | Oksana in the class chat: «как на выпускном» (draft). **ok** | [P] |
| day | K18-02f / t / n Примерка | The suit from the graduation photo (Day 10 album; the tie askew on his slide, K14-05s). By weight, thresholds measured on engine runs (A6, question 10): f fits (conf −3), t tight (line only), n does not close (line only: draft «До встречи двенадцать дней. Время есть»). One button each, no purchase offer on t or n | [P] |
| evening | K18-03w {crush} пишет | `d15_tone` = `warm`: draft «Примерила платье с выпускного. Не влезла 😅 Ты как?». By `d18_suit`: f «Влез, сам в шоке» (+2) / t, n «Не влез. Повод купить новый» (+3) / «Нормально» (0) / **later** | [P] |
| evening | K18-03e {crush} в «Оргкомитете» | `d15_tone` = `even`, `d15_team`: a plain question «Ты будешь в костюме?» (draft): answer (+2) / **later** | [P] |
| evening | K18-04w / e Её ответ | after an answer: one bubble. **ok** | two-card rule |
| night | Craving | Balcony | common |

Reads: `d15_tone`, `d15_team`, `weight`, `d10_photo` (only for the tie line). Sets: `d18_suit` (`fits`, `tight`, `no`), `d18_reply`. Day ends on: her answer, or the suit on the hanger [P].
Problems: conf −3 … 0. Affinity 0 … +3 (no minus answer: she jokes about herself, a mean reply would be out of tone [T]). Coins: in 50 (+ job); out none on cards; the shirt (90) stays in the shop, not offered here.
Skipped day: the suit tried (the card is one button), no answer to her, smoked.

### Day 19 (Thursday). The song («Песня», working)
Leans on: `conf`, `weight`. Chance: 0.

| Part | Card | Situation and choices | Src |
|---|---|---|---|
| morning | K19-01p Программа | `d10_will_sing`: Vitya: Oksana put him in the program, a song after the slideshow. With `d6_reply` = `joke`: «как на выпускном». practise at home (2 energy, conf −2) / ask Oksana to drop it (0, no penalty: draft «Громов споёт, переживём») / **later** (stays promised) | [P]; pays `d10_will_sing` |
| morning | K19-01g Громов с гитарой | no `d10_will_sing`: Vitya: draft «Громов хочет петь с гитарой. Спасай встречу». promise one song (conf −1) / **laugh** | [P] |
| day | K19-02 Пять песен | `d15_team` = `music`: the final five with Alina in the chat; the first one is his pick (with `d14_scene` ≥ 1 on the planned table, she reminds him of Gromov dropping the table). **ok**, 0 | [P]; pays the Day 14 list |
| evening | K19-03 Витя: футбол | Vitya at the bar: go (conf −1) / **home** (quiet evening, Vitya sends the score: the evening is not empty [A decision 15]) | [P] |
| evening | K19-04 Бар | after go: one beer and a salad (2 energy) / **the lot** (weight +2). The craving moves to the bar door (smokers with Vitya) | [P] |
| night | Craving | Balcony, unless at the bar | common |

Reads: `d10_will_sing`, `d6_reply`, `d15_team`, counter `d14_scene`. Sets: `d19_sing` (`practice`, `out`, `promised`; unset = still the old promise), `d19_bar` (`held`, `lot`, `home`). Day ends on: the score from Vitya or the bar [P].
Problems: weight 0 … +2, conf −3 … 0. Affinity 0. Coins: in 50 (+ job); out none (each pays for himself; the bar costs nothing on the card [P], to keep the day free).
Skipped day: the promise kept as it was, stayed home, smoked.

### Day 20 (Friday). Ten days («Десять дней», working). Fixed beat
Leans on: `conf` and every visible change. Chance: −2 … +5.

Visible changes for K20-05v [P]: the Day 14 list (a shave: `shaved` and not `d14_red`; `bought_shirt` or `bought_frame`; `d5_cleaned` or `d12_cleaned`; `d3_course`; no cigarette today; `bought_haircut`) plus `d18_suit` = `fits`, plus `bought_perfume` on a day without a cigarette (A6 answer 8), plus `d11_salon` = `fine` (A6 answer 16; `d11_salon` = `odd` is not counted). With up to nine conditions the Day 7 thresholds (4+ / 2–3 / 0–1) are to be re-measured on engine runs before Day 20 is written.

Fixed beat [A6 answer 1]: Oksana gathers whoever can help at the venue on Friday evening: chairs, projector, sound. Everyone is invited; only the entrance differs (`d15_team` expected / others free to come). Going can be skipped (it is a chore, not a chance meeting).

| Part | Card | Situation and choices | Src |
|---|---|---|---|
| morning | K20-01 Оксана | Everyone: draft «Сегодня в семь, помогаем с залом». **ok** | [P] |
| evening | K20-02t / o Пятница, семь | t: `d15_team` (Oksana counts on him); o: otherwise. go (conf −1) / **home** | [P] |
| evening | K20-03a / q / b У двери | went; the craving before going in, split by Day 19 | common |
| evening | K20-04c Стулья | `d15_team` = `chairs` / `volunteer`, or anyone who went: carrying chairs with Vitya and Gromov (Gromov is a comic foil, never a rival: A6 answer 12). **ok** (one line; the chairs promise kept) | [P] |
| evening | K20-05v / x Слайд-шоу на экране | went. v: `d10_photo` = `both` or `d15_photo`: his slide on the big screen; the class reacts, Alina's line by visible changes (Day 14 list plus `d18_suit` = `fits`, the perfume on a no-smoke day and the salon cut `fine`, list above), compared with `d14_line`. x: no fresh photo: «тогда» only, Oksana: draft «Андрей, ну где «сейчас»?» **ok**, affinity 0 (the line is the reward) | [P] |
| evening | K20-06 Микрофон | went. Sound check; Vitya hands him the mic. `d19_sing` = `practice`: one line, well (conf −2, affinity +2). promised or old promise, no practice: sing anyway (+1, the class laughs with him) / **pass the mic**. `out` or no promise: Gromov sings, a line only | [P] |
| evening | K20-07w / e / d Последние | went. Packing the projector, a minute alone with her. Question by `d15_tone`: w personal (draft «Зачем ты вообще вписался?»), e about the reunion, d short («Спасибо за стулья»). good +3 / +2 / +1, **short** 0, bad −2; counter `d20_scene` +1 / 0 / −1 | [P] |
| evening | K20-08w / e / d {crush} пишет | went; by `d20_scene` (≥ 1 / 0 / ≤ −1). **ok** | as K14-07 |
| evening | K20-08h Лента | `d20_went` not set: a photo of the hall with chairs in rows, draft «Справились!», and Vitya's video. **ok**. No guilt copy | [P] |
| night | Craving | Balcony, for those at home | common |

Reads: `d15_team`, `d10_photo`, `d15_photo`, the visible-change list, `d14_line`, `d18_suit`, `bought_perfume` (if sold), `d19_sing`, `d10_will_sing`, `d15_tone`. Sets: `d20_went`, `d20_line` (`nice`, `other`, `plain`), counter `d20_scene`, `d20_msg` (`warm`, `even`, `dry`). Day ends on: her message, or the feed photo [P].
Problems: conf −3 … 0, care by the craving. Affinity −2 … +5 (mic +2, question +3 or −2). Coins: in 50 (+ job); out none.
Skipped day: stayed home, the feed post, no message from her, `affinity` 0.

### Day 21 (Saturday). The third Saturday («Третья суббота», working)
Leans on: `conf`, `care` (stubble), plus visible changes. Chance: −2 … +3.

| Part | Card | Situation and choices | Src |
|---|---|---|---|
| morning | K21-01a / b Щетина | `shaved`; a: `d14_red`, b: without. As K14-01 (cream / bare `d21_red` / **keep**); quotes her for `d6_beard_hint` | [F] pattern, answer 3 of week 2 |
| morning | K21-02w {crush} пишет | `d20_msg` = `warm`: draft «Я в «Зерне» до двенадцати. Потом хочу пройтись по парку. Составишь компанию?». With `d9_pass` = `vitya` or `useful` high: «вы же с Витей там бегаете». yes (conf −1) / **later** | [A6 answer 14] |
| day | K21-03o Суббота | not invited (or invited and «later»): go to «Зерно» (conf −1) / **home**, as K14-03t | [F] her Saturdays |
| day | K21-04a / q / b У двери «Зерна» | went; craving split by Day 20 | common |
| day | K21-05w Парк | invited and went: a walk, the first meeting not about the reunion. Her question about him (runs, the week), +3 / 0 / −2; counter `d21_scene` | [P] |
| day | K21-05c / f «Зерно» | came on his own: c (not `dry`): a short talk +2 / 0 / −2; f (`d15_tone` = `dry`): with Даша, a hello +1 / 0 / −2 | as K14-05c/f |
| evening | K21-06w / e / d {crush} пишет | went; by `d21_scene` | as K14-07 |
| evening | K21-06h Лента | stayed home: her Saturday photo | as K14-07h |
| evening | K21-07 Оксана | Everyone: draft «Девять дней! Программа готова»; the program names him by `d19_sing` and `d15_team`. **ok** | [P] |
| night | Craving, sleep | Sleep draft «До встречи выпускников девять дней» | |

Reads: `shaved`, `d14_red`, `d6_beard_hint`, item `cream_zina`, `d20_msg`, `d9_pass`, counter `useful`, `d15_tone`, `d19_sing`, `d15_team`. Sets: `d21_red`, `d21_met` (`invited`, `came`, `home`), counter `d21_scene`, `d21_msg`. Day ends on: her message, or the program from Oksana [P].
Problems: conf −2 … +2. Affinity −2 … +3. Coins: in 50 (+ job); out none (the perfume is sold on Day 17 only; a repeat offer on Day 21 is not decided).
Skipped day: kept the stubble, stayed home, the feed post, smoked, `affinity` 0.

## A3. Coins of week 3

| | Amount | Notes |
|---|---|---|
| Coins on the morning of Day 15 | ~250–600 | estimate: start 100, 14 × 50 day rewards, jobs, minus week 1–2 purchases; to be measured on engine runs when Day 15 is written |
| Day rewards | 350 | 7 × 50 |
| Side job | up to ~200 | `A-job` extended to Day 21, about 28 a day on average, 4 energy |
| Sinks on cards | 150 pass renewal (16), 60 cologne trap (17), 120 perfume (17, on a card, A6 answer 7), 70 barber for `d11_tip` without a cut (17) | all optional |
| Sinks in the shop | 220 «Сияние», 150 pass, 90 shirt, 150 frame, 70 haircut (unbought ones) | unchanged |

On cards a week costs at most 400; income is 350–550. The week 2 goal holds: a week of income buys about half of what is on offer [A `DEMO_SCRIPT.md` 5a]. Nothing on a card buys affinity, time or the result: the perfume moves `care` only, the outfit `style`/`conf` only [A `DESIGN.md` §6].

## A4. Flags

### Earlier flags still waiting for a payoff

Every name below is set in `content/cards/day1.json`…`day14.json` with the values shown (checked with a script over all card files on 2026-11-25). "Read on" lists the days that read it today.

| Flag | Values | Set on | Read on | Week 3 payoff, or why not |
|---|---|---|---|---|
| `d14_late` | true | 14 | — | 15 (K15-late) |
| `d14_met` | `planned`, `came`, `home` | 14 | 14 | 15 (K15-03m/c team, K15-06m), via `d15_tone` all week |
| `d14_msg` | `warm`, `even`, `dry` | 14 | 14 | 15 (`d15_tone`) |
| `d14_line` | `nice`, `other`, `plain` | 14 | 14 | 20 (K20-05v compares her line with Day 14, as Day 14 read `d7_line`) |
| `d14_red` | true | 14 | 14 | 21 (K21-01a, as `d8_red` on 14) |
| `d14_smoked`, `d14_no_smoke`, `d14_quarter` | true | 14 | 14 | 15 (K15-08 craving texts) |
| counter `d14_scene` | −1 … +1 | 14 | 14 | 15 (K15-03c: the chairs promise), 19 (K19-02 line) |
| `d13_course_done` | true | 13 | 13 | 15 (K15-01a quotes Galina Petrovna) |
| `d13_bday` | `held`, `cake`, `home` | 13 | 13, 14 | 16 (K16-01a/b: the promised slice) |
| `d12_helped_music` | true | 12 | 13, 14 | 15 (K15-06m, K15-06w opener), 19 (K19-02), 30 (the music) |
| `d10_will_sing` | true | 10 | — | 19 (K19-01p), 20 (K20-06), weeks 4+ (the reunion itself) |
| `d10_photo` | `both`, `old`, `none` | 10 | 10, 14 | 15 (K15-05), 20 (K20-05) |
| `d11_tip` | `noted`, `heard` | 11 | 11 | 17 (K17-03 Gosha) for players without a haircut |
| `d11_cut`, `d11_salon` | `barber`/`salon`; `odd`/`fine` | 11 | 11, 14 / 11 | 17 (K17-03 is hidden for any cut); 15+ counts the salon cut only for `d11_salon` = `fine` (A6 answer 16) |
| `d9_pass` | `renewed`, `vitya`, `none` | 9 | 9–14 | 15–21 (K-run, A-gym), 16 (K16-00: the renewed pass ends) |
| `d9_oksana` | `promised` | 9 | 10 | 15 (K15-04 Oksana names him) |
| `d8_lunch` | `held`, `ate` | 8 | 8, 11 | 15 (K15-02a/b) |
| `d8_replied` | `warm`, `short`, `long`, `none` | 8 | 8 | never read (A6 answer 17): its effect is already in `affinity`, and a message from two weeks ago is stale by Day 15 [T] |
| `d7_msg` | `warm`, `even`, `dry` | 7 | 7–9, 12, 14 | 15 (`d15_tone`, K15-03c) |
| `d6_reply` | `plain`, `joke`, `excuse`, `dry` | 6 | 6, 7, 10, 12 | 19 (`joke`: «как на выпускном») |
| `d6_beard_hint` | true | 6 | 7, 8, 14 | 21 (K21-01) |
| `d5_helped_zina`, `d5_no_help`, `d5_cream` | `shelf`/`bags`; true; `gift`/`bought` | 5 | 5, 7, 8, 11 | 17 (K17-02a/b) |
| `d3_posted` | true | 3 | 3, 4, 10 | 15 (K15-05 cheaper selfie) |
| `d3_course` | true | 3 | 4–14 | 20, 21 (still one of the visible changes) |
| `shaved`, item `cream_zina` | true | 7, 8, 14 | 7, 8, 10, 14 | 21 (K21-01), 20 (count) |
| `bought_haircut`, `bought_shirt`, `bought_frame`, `d5_cleaned`, `d12_cleaned` | | 5–12 | up to 14 | 15 (mum), 20, 21 (count) |
| counter `useful` | | 1–14 | 3 | 21 (K21-02w line), weeks 4+ (the breakdown after the finale [A `DESIGN.md` §9]) |
| counter `smoke_free`, `d1_half`, item `gum` | | | every day | every craving; 15 (K15-09), 17 (Aunt Zina) |
| `d12_reply` | `list`, `short`, `pass`, `later`, `answer` | 12 | 12 | not needed: `d12_helped_music` and `affinity` carry it |
| `d13_went` | true | 13 | 13 | not needed: `d13_bday` carries it |
| `d12_strips`, `d13_zerno_reply`, `d13_zerno_tip`, `d7_line`, `d7_met`, `d7_thread`, `d8_red`, `d9_burner` | | 7–13 | paid on 8–14 | done; no week 3 payoff planned |
| `d6_talk`, `d6_trend`, `d6_shirt`, `d6_frame`, `d3_smoked`, `d3_no_smoke`, `d1_mirror`, `d1_mom_knows` | | 1–6 | own day or never | not needed: superseded (`bought_*`, `smoke_free`) or read by absence |
| `d4_alina_reacted`, `d2_liked_photo` | | 2, 4 | never | not paid on purpose: paid through `affinity` [A `DEMO_SCRIPT.md` 5e] |

### New flags planned in week 3 [P]

| Flag | Values | Set by | Read on |
|---|---|---|---|
| `d15_late` … `d21_late` | true | sleep «до трёх» | next morning |
| `d15_smoked` / `_no_smoke` / `_quarter` … `d21_*` | true | the day's craving | that day (once), next day (texts) |
| `d15_pimple` | `washed`, `patch`, `squeezed` | K15-01 | 16 (one line in the mirror or none) [P] |
| `d15_lunch` | `held`, `ate` | K15-02 | weeks 4+ (Sunday 22) |
| `d15_team` | `music`, `chairs`, `volunteer` | K15-03m/c, K15-04 | 16, 17, 18, 19, 20, 21 |
| `d15_photo` | `fresh` | K15-05 | 20 (the slide) |
| `d15_tone` | `warm`, `even`, `dry` | K15-06* | 16–21 (every Alina card) |
| `d15_reply` | `ask`, `short`, `long`, `sorry`, `later` | K15-06w/m | 15 (K15-07) |
| `d16_cake` | `half`, `zina`, `ate` | K16-01a | 17 (Aunt Zina) |
| `d16_pass` | `renewed`, `vitya`, `none` | K16-03 | 17–23 (A-gym, K-run) |
| `d17_alpha` | `odd`, `fine` | K17-01 | 17 (one line) |
| `d17_tester` | true | K17-02 | 20 (smell line) |
| `bought_perfume` | true | K17-02 buy (card effect), same name the shop would set | 20, 21, weeks 4+ |
| `d18_suit` | `fits`, `tight`, `no` | K18-02 | 18 (her message), 20 (count), weeks 4+ (outfit) |
| `d18_reply` | `answer`, `joke`, `short`, `later` | K18-03 | 18 (K18-04) |
| `d19_sing` | `practice`, `out`, `promised` | K19-01p/g | 20 (mic), 21 (program), 30 |
| `d19_bar` | `held`, `lot`, `home` | K19-03/04 | 20 (Vitya's line) |
| `d20_went` | true | K20-02 | 20, 21 |
| `d20_line` | `nice`, `other`, `plain` | K20-05v | weeks 4+ |
| counter `d20_scene` | −1 … +1 | K20-07 | 20 (K20-08) |
| `d20_msg` | `warm`, `even`, `dry` | K20-08 | 21 (invitation), weeks 4+ |
| `d21_red` | true | K21-01 bare | 21 (count), weeks 4+ |
| `d21_met` | `invited`, `came`, `home` | K21-02/03 | 21, weeks 4+ |
| counter `d21_scene` | −1 … +1 | K21-05 | 21 (K21-06) |
| `d21_msg` | `warm`, `even`, `dry` | K21-06 | weeks 4+ |

## A5. Engine gaps for week 3

| # | Gap | Where | Needed for | Content workaround | Acceptable? |
|---|---|---|---|---|---|
| 1 | `Cond` cannot ask whether a modifier runs or how many mornings it has left | `Cond` in `src/engine/types.ts`, `check()` in `src/engine/game.ts` (modifiers are already in `GameState.modifiers` with `fromDay` and `days`) | K16-00 «последний день» for any pass, A15–A21-gym | Renewed pass: `d9_pass` = `renewed` **and** `flagAge` of `d9_pass` ≤ 7 (the flag is set only on Day 9, so this ends on Day 16; without the age check the Day 10–14 copy keeps the gym open forever). Shop pass: purchase day as today (`flagAge` of `bought_gym_pass` 1–7, no `gym_pass` in the bag), wrong for a pass used days after purchase. A Day 16 renewal sets `d16_pass` and needs its own age check | Works, but every gym card of days 15–30 carries a growing `any` of special cases, and K16-00 cannot speak to shop-pass players |
| 2 | Shop items cannot be gated by day or flag | `Item` in `types.ts`, the shop in `src/ui/Game.tsx` | The perfume (A6 answer 7): in `items.json` with a price it is on sale from Day 1, in the demo too | Sell it on a card choice (K17-02, cost 120, effects `care` −6 and `{ flag: 'bought_perfume' }`); decided by A6 answer 7 | Yes. A shop listing would need a field such as `fromDay` on `Item`; not requested |
| 3 | An item's effect cannot depend on state | `onUse` is a flat list | "Perfume does not cover smoke" | The interaction lives in cards: the visible-change count reads `bought_perfume` and no cigarette today; the honest `limits` / button text says it | Yes |
| 4 | No derived value: the week tone is not stored | — | `d15_tone` | K15-06w/m/e/d set `d15_tone` in every choice, neutral included, so a skipped day sets it too. The four cards must have mutually exclusive `requires` | Yes |
| 5 | A card shows one fresh crush bubble | `says` in `openCard()`, `game.ts` | Every two-line exchange (K15-06/07, K18-03/04) | Two cards, question in one part, her answer later, as days 8, 12 | Yes |
| 6 | A choice is remembered only if it sets a flag | — | K14-05cq «Помогу тебе» (the chairs) set no flag | `d14_met` = `came`, `d7_msg` ≠ `dry`, counter `d14_scene` ≥ 1 identifies it (counters persist). Week 3 cards set an explicit flag on every choice that later days read | Yes, but fragile; flagged for the executor |
| 7 | A card cannot open the «Зеркало» tab | UI | Day 18 suit fitting, Day 21 | Text cards, as K14-02 | Yes |
| 8 | No weekday in the engine | — | Every teaser | Texts only, as weeks 1–2 | Yes |
| 9 | One speaker per card | `speaker` | Day 20 group scene | A chain of short cards (K20-04 … K20-07), as Day 7 and Day 14 | Yes |

Decision on gap 1 (A6 answer 18, 2026-11-25): **fixed in the engine before `/write-day 15`**, by a separate gym-condition task. Week 3 gym cards (A15–A21-gym, K16-00) use the new modifier condition; its exact shape: see `src/engine/types.ts` after the gym-condition task lands. The workaround in the gap 1 row stays as the fallback if that task does not land. The reasoning that led to the recommendation: Reasons: (a) the workaround stops being uniform in week 3: the renewed pass ends on Day 16, a Day 16 renewal starts a third case, and a shop pass bought on days 8–20 keeps the approximation; (b) every remaining day 15–30 copies the gym card, so the cost of the workaround grows with each day while the fix is paid once; (c) the change is local: one `Cond` variant `{ modifier: string; set?: boolean; daysLeft?: Cmp }`, one branch in `check()`, one rule in `validate.ts`, a test. This is an engine change and needs the authors' word (standing rule: content days do not change the engine), so it is A6 question 18. If the answer is no, week 3 uses the workaround in the gap 1 row and K16-00 speaks only to `d9_pass` = `renewed`.

## A6. Open questions for the authors

Each line: the question, the recommended answer **in bold**, and what changes with the other answer.

1. Day 20 is the fixed beat of week 3: the Friday setup at the venue, everyone invited (slideshow on the screen, microphone test, a minute alone with her)? **Yes.** If no: Day 20 is an ordinary day, the slideshow and the song wait for Day 30, and week 3 has no in-person Alina beat except Day 21.
2. The organisers' chat «Оргкомитет»: Alina adds the music and chairs players on Day 15; anyone else can volunteer in the class chat. **Yes.** If no: the Day 14 help pays off only on Day 20 and Day 30, and Alina's week 3 contact is private chat only.
3. The venue: a café next to the old school («Еда за свой счёт» on Day 14 fits a café), name to be chosen by the authors. **Café; name by Ruslan, working «кафе у школы».** If the school hall instead: the Day 14 food line should be reread, and Day 20 becomes the school.
4. The week tone `d15_tone` from Day 14 (table in A1; staying home lowers only the warm tone). **Yes.** If no: week 3 keeps splitting by `d7_msg`, and Day 14 matters only for its own evening.
5. Sunday lunch at mum's as a weekly ritual (days 8, 15, then 22, 29). **Yes.** If once only: Day 15 day part gets Aunt Zina instead, and K17-02 moves earlier.
6. The pimple on Day 15: the skin can still flare after the course; the neutral (squeeze) is skin +3. **Yes.** If no: `d13_course_done` pays only in mum's line, and Day 15 has no skin card.
7. The perfume (answer 10 of week 2): sold on a card at the pharmacy on Sadovaya on Day 17, 120 coins, `care` −6, once, honest line «табак не перебивает», not offered to a player who smoked yesterday (`smoke_free` 0). **Yes, on a card.** If it must be in the shop: an engine field to hide it before Day 17 (A5 gap 2), otherwise demo players see it from Day 1.
8. Does the perfume count as a visible change at the Day 20 slideshow and on Day 21, on a day without a cigarette? **Yes, only without a cigarette.** If no: it moves `care` only, and her lines ignore it.
9. One paid trap in week 3 (the cologne «Альфа», 60 coins) instead of three in week 2. **One.** If more: add a protein-bar trap on Day 19 (weight) or a whitening repeat.
10. The graduation suit on Day 18 fits by a weight threshold (measured so that about a third of random players fit), with no purchase offer after «не влез». **Yes.** If no: the outfit is decided on Day 30 only, and Day 18 needs another beat.
11. The song: on Day 19 the promiser can practise or back out with no penalty; a non-promiser can promise when Gromov threatens to sing. **Yes.** If the promise is binding: no back-out choice, and K20-06 always has him sing.
12. Gromov is a comic foil (beard, guitar, wants the microphone), not a rival for Alina. **Foil.** If a rival: a new line through weeks 3–4 and a heavier tone, against "losing must not feel heavy".
13. Vitya's free runs go on every morning of week 3, Sunday included. **Yes.** If no: K-run stops on Day 14 or on Sundays, and the runs live only in the plus menu.
14. Day 21: the warm player after a good Friday gets her invitation for a walk in the park, the first meeting not about the reunion. **Yes.** If too early: Day 21 is «Зерно» for everyone, as Day 14, and the walk moves to week 4.
15. Day 30 falls on a Monday by the text calendar (Day 7 Saturday). Keep Monday evening for the reunion? **Keep, say «в понедельник» in Oksana's Day 16 post.** If another weekday or none: Day 16 names no weekday, and the reunion texts in week 4 avoid one.
16. Does the salon cut count as a visible change from week 3? **Only `d11_salon` = `fine`.** If yes for both: one more condition in the Day 20 and 21 counts; if no: unchanged from Day 14.
17. Should `d8_replied` ever be read? **No.** If yes: one line in K15-06w quoting his Day 8 reply.
18. The gym condition `{ modifier: 'gym', daysLeft? }`: fix the engine now, before Day 15? **Yes, a separate small engine task.** If no: week 3 keeps the workaround in A5 gap 1.
19. «Находки с телефона»: in the project card this means notes from playing on a real phone, not a game idea. Is there anything from the phone that should change week 3 (for example the number of cards: Day 14 has 31 story cards)? **List them separately; this grid does not wait for them.** If they include "too many cards a day": week 3 cuts the optional lines first (K16-01b, K17-05w, K21-07).

### Answers (Ruslan, 2026-11-25)

Ruslan accepted every recommendation in one phrase, «Все по рекомендации», not question by question.

| # | Answer | What it means for the grid |
|---|---|---|
| 1 | Yes | Day 20 «Десять дней» is the fixed beat of week 3: the Friday setup at the venue, everyone invited |
| 2 | Yes | «Оргкомитет» stays: Alina adds the music and chairs players on Day 15 (K15-03m/c), anyone else volunteers (K15-04) |
| 3 | Café | The venue is a café next to the old school; the name stays the working «кафе у школы» until Ruslan names it |
| 4 | Yes | `d15_tone` is set on Day 15 by the A1 table; staying home lowers only the warm tone |
| 5 | Yes | Sunday lunch at mum's is weekly: days 8, 15, 22, 29 (K15-02a/b) |
| 6 | Yes | K15-01a/b stays; the neutral «squeeze» is skin +3 |
| 7 | Yes, on a card | The perfume is sold on K17-02 at the pharmacy: 120 coins, `care` −6, once, «табак не перебивает», not offered with `smoke_free` 0; not in the shop |
| 8 | Yes | `bought_perfume` counts as a visible change on Days 20 and 21, only on a day without a cigarette |
| 9 | One | The cologne «Альфа» (60 coins, Day 17) is the only paid trap of week 3 |
| 10 | Yes | K18-02f/t/n by a weight threshold measured for about a third of random players to fit; no purchase offer after «тесно» or «не влез» |
| 11 | Yes | K19-01p allows practise or back out with no penalty; K19-01g lets a non-promiser promise |
| 12 | Foil | Gromov is a comic foil (beard, guitar, the microphone), never a rival for Alina |
| 13 | Yes | K-run continues every morning of week 3, Sunday included |
| 14 | Yes | K21-02w: after `d20_msg` = `warm` she invites him for a walk in the park |
| 15 | Keep Monday | The reunion is on Monday evening, Day 30; Oksana's Day 16 post says «в понедельник» |
| 16 | Only `fine` | From Day 15 the salon cut counts as a visible change only for `d11_salon` = `fine` |
| 17 | No | `d8_replied` is never read again |
| 18 | Yes | The gym condition is added to the engine by a separate task before Day 15; week 3 gym cards use it (exact shape in `src/engine/types.ts` after it lands), A5 gap 1 workaround is the fallback |
| 19 | List separately | No phone notes have been given; the grid does not wait for them |

## A7. Docs that disagree with the content

The content wins in each case; the grid above follows the content.

| Doc says | Content has | Where |
|---|---|---|
| `d8_replied` is read nowhere (week 3 brief); `WEEK2_GRID.md` A4: read on 8 and 12 | Read on Day 8 only (K8-05); Day 12 does not read it (C5 says so) | `content/cards/day8.json`, `day12.json` |
| `WEEK2_GRID.md` A2 Day 9: Vitya's runs on mornings of days 10–14 | K9-02a/b promise runs «по утрам» with no end; K-run exists on 10–14 only because only those days are written | `content/cards/day9.json` |
| `WEEK2_GRID.md` C3–C7: the gym action reads `d9_pass` = `renewed` | Correct for days 10–14 only: the renewed pass is a 7-day modifier applied on Day 9 (mornings 10–16); the condition has no end | `day10.json` … `day14.json` A-gym |
| `WEEK2_GRID.md` A4: `d11_cut` "counts as `bought_haircut`" | The barber sets both; the salon sets only `d11_cut` = `salon` | `content/cards/day11.json` |
| `DESIGN.md` §5: fixed beats on days 1, 10, 20, 30 (proposed) | Day 10 confirmed (week 2 answer 1); Day 20 confirmed for week 3 (A6 answer 1) | A6 answer 1 |
| «Phone findings» listed as an undecided game idea (week 3 brief) | The project card means notes from playing on a real phone | `C:\Users\murtu\.claude\project-cards\14-glowup.md` |

---

# Part C. Days as written

## C. Day 15 as written

Written 2026-11-25 in `content/cards/day15.json` (26 story cards, 6 actions); `contentDays` 15, `demoDays` 7; `A-job` days 1–15; day entry «Оргкомитет», gift `gum`, teaser «Завтра понедельник. Оксана раздаёт задания». Texts and deviations for review: `docs/review/day15-texts.md`. The engine was not changed.

Cards in display order:

| Part | Card | Shown when | Choices (neutral in bold) | Sets |
|---|---|---|---|---|
| morning | K15-late | `d14_late` | **up** | — |
| morning | K15-run | `d9_pass` = `vitya` | run (4 energy, weight −2, `useful` +1) / **skip** | — |
| morning | K15-01a / b / c | a: `d13_course_done`; b: seen K13-02, no `d13_course_done`; c: never saw K13-02 | wash (1 energy, skin −1) / patch (item `acne_patch`, skin −3) / **squeeze** (часто skin +3, иногда +1) | `d15_pimple` = `washed` / `patch` / `squeezed` |
| day | K15-02a / b | a: `d8_lunch` = `held`; b: otherwise | held (2 energy, conf −1) / **ate** (weight +2); mum's line by `bought_haircut`, then `smoke_free` ≥ 7, else pies | `d15_lunch` = `held` / `ate` |
| day | K15-03m | `d14_met` = `planned` | **ok** | `d15_team` = `music` |
| day | K15-03c | `d14_met` = `came`, `d7_msg` ≠ `dry`, counter `d14_scene` ≥ 1 | **ok** | `d15_team` = `chairs` |
| day | K15-04a / b | no `d15_team`; a: `d9_oksana`, b: without | volunteer (conf −1) / **scroll** | `d15_team` = `volunteer` |
| day | K15-05a / b | `d10_photo` = `old` / `none`; a: seen K14-05s, b: otherwise | selfie (2 energy, or 1 with `d3_posted`; conf −2) / **later** | `d15_photo` = `fresh` |
| evening | K15-06wm / ws | tone warm; wm: `d12_helped_music`, ws: without | ask (+3) / short (0) / long (−2) / **later** (0); his exact words go to the chat | `d15_tone` = `warm`, `d15_reply` |
| evening | K15-06m | `d14_met` = `home`, `d12_helped_music` | sorry (+2) / short (0) / **later** | `d15_tone` = `even`, `d15_reply` |
| evening | K15-06et / ec | tone even, not K15-06m; et: `d15_team`, ec: without | **ok** (status line) | `d15_tone` = `even` |
| evening | K15-06d | tone dry | **ok** (`status_online`) | `d15_tone` = `dry` |
| evening | K15-07wm / ws / m | `d15_reply` = `ask` (by opener) / `sorry` | **ok**, her answer | — |
| night | K15-08a / q / b | the Day 14 result | hold / quarter / gum / **smoke** | `d15_smoked` / `d15_quarter` / `d15_no_smoke` |
| night | K15-09 | `d15_no_smoke`, `smoke_free` ≥ 14 | **ok** (care −3) | — |
| plus | A15-run, A15-gym (`{ modifier: 'gym' }`), A15-clean, A15-teeth, A15-couch, A-job | | as Day 14 | — |
| night | K15-sleep | | sleep / late | `d15_late` |

The tone rule as conditions (exactly one evening card fits any flag combination; a test checks all 512):
- warm: `d14_met` ≠ `home` and (`d14_msg` = `warm`, or `d14_msg` = `even` and `d7_msg` = `warm`);
- missed (K15-06m, even): `d14_met` = `home` and `d12_helped_music`;
- dry: `d14_met` ≠ `home` and `d14_msg` = `dry`, or `d14_met` = `home`, no `d12_helped_music`, `d7_msg` = `dry`;
- even: everything else (including Saturday at home with `d7_msg` `warm` or `even`, and a missing `d14_msg`).

Measured shares of `d15_tone` on engine runs (Days 1–15 from a new game, Day 15 evening): 2000 players choosing uniformly among affordable story choices (sleep «до трёх» one night in five): warm 398 (19.9 %), even 1116 (55.8 %), dry 486 (24.3 %). A player who takes only neutral choices lands in even (stayed home on Day 14, `d7_msg` not dry). The simulation was a throwaway test file, not kept in the repo.

Flags set on Day 15 and what later days can rely on:

| Flag | Values | Always set? | For |
|---|---|---|---|
| `d15_tone` | `warm`, `even`, `dry` | yes, by every evening card including a skipped day | 16–21: every Alina card |
| `d15_team` | `music`, `chairs`, `volunteer` | only for the team; unset = not in «Оргкомитет» | 16–21 |
| `d15_reply` | `ask`, `short`, `long`, `later` (warm); `sorry`, `short`, `later` (missed) | only for K15-06wm/ws/m | read on 15 (K15-07), K15-sleep |
| `d15_photo` | `fresh` | only after a selfie | 20 (the slide: `d10_photo` = `both` or `d15_photo`) |
| `d15_pimple` | `washed`, `patch`, `squeezed` | yes (every player gets K15-01a/b/c) | 16 (one mirror line) |
| `d15_lunch` | `held`, `ate` | yes | Sunday 22 |
| `d15_smoked` / `d15_no_smoke` / `d15_quarter` | true | yes (one balcony card a night) | 16 craving texts |
| `d15_late` | true | only for «до трёх» | 16 morning |

Earlier flags read on Day 15: `d14_late`, `d14_met`, `d14_msg`, `d14_smoked` / `d14_no_smoke` / `d14_quarter`, counter `d14_scene`, `d13_course_done`, seen `K13-02`, seen `K14-05s`, `d12_helped_music`, `d10_photo`, `d9_pass`, `d9_oksana`, `d8_lunch`, `d7_msg`, `d3_posted`, `bought_haircut`, counter `smoke_free`, `d1_half`, items `acne_patch` and `gum`, modifier `gym`. `d8_replied` is not read (answer 17).

## D. Day 16 as written

Written 2026-11-25 in `content/cards/day16.json` (13 story cards, 6 actions); `contentDays` 16, `demoDays` 7; `A-job` days 1–16; day entry «Кусок торта», gift `acne_patch`, teaser «Завтра вторник. Аптека на Садовой». Texts and deviations for review: `docs/review/day16-texts.md`. The engine was not changed; no new chat situations.

Cards in display order:

| Part | Card | Shown when | Choices (neutral in bold) | Sets |
|---|---|---|---|---|
| morning | K16-late | `d15_late` | **up** | — |
| morning | K16-run | `d9_pass` = `vitya` | run (4 energy, weight −2, `useful` +1) / **skip** | — |
| morning | K16-00 | `{ modifier: 'gym', eq: 0 }`: the last morning of any pass (the renewed pass of Day 9, a shop pass used on Day 9) | **ok** | — |
| morning | K16-01a | `d13_bday` not `held` / `cake` (as K14-06c) | half (1 energy, conf −1) / zina (free) / **eat** (weight +1) | `d16_cake` = `half` / `zina` / `ate` |
| morning | K16-01h / k | `d13_bday` = `held` / `cake` | **ok** (Vitya's message) | — |
| day | K16-02m | `d15_team` = `music` | **ok** (five songs with Alina by Thursday) | — |
| day | K16-02c | `d15_team` = `chairs` / `volunteer` | **ok** (chairs and projector with Vitya, Friday at seven) | — |
| day | K16-02x | no `d15_team` | **ok** (class chat: the venue, «в пятницу вечером готовим зал») | — |
| evening | K16-03 | `{ modifier: 'gym', eq: 0 }` | renew (150 coins: the shop pass modifier, mornings 17–23) / vitya (hidden for `d9_pass` = `vitya`) / **later** | `d16_pass` = `renewed` / `vitya` / `none` |
| night | K16-04a / q / b | the Day 15 result (`d15_smoked` or none / `d15_quarter` / `d15_no_smoke`) | hold / quarter / gum / **smoke** | `d16_smoked` / `d16_quarter` / `d16_no_smoke` |
| plus | A16-run, A16-gym (`{ any: [{ modifier: 'gym' }, { flag: 'd16_pass', eq: 'renewed' }] }`), A16-clean, A16-teeth, A16-couch, A-job | | as Day 15; the gym's last-day line by `{ modifier: 'gym', eq: 0 }` | — |
| night | K16-sleep | | sleep («До встречи выпускников четырнадцать дней») / late (line by `d15_team`) | `d16_late` |

Every K16-02 card names the reunion «в понедельник через две недели, в семь, в кафе у школы» (answers 3 and 15). Exactly one K16-01 card fits every `d13_bday` value and exactly one K16-02 card fits every `d15_team` value (tests).

The gym in numbers (engine semantics of `{ modifier }`: running on mornings `fromDay + 1 … fromDay + days`, days left = `fromDay + days − day`): the renewed pass of Day 9 has 0 days left on Day 16, so K16-00, K16-03 and the last-day gym line show; without a renewal `{ modifier: 'gym' }` is false from Day 17; with a renewal on Day 16 it runs on Days 17–23 (6 days left on Day 17, 0 on Day 23).

Flags set on Day 16 and what later days can rely on:

| Flag | Values | Always set? | For |
|---|---|---|---|
| `d16_cake` | `half`, `zina`, `ate` | only for K16-01a (stayed home on Day 13); unset for `held` / `cake` | 17 (K17-02a: `zina` is the warm hello) |
| `d16_pass` | `renewed`, `vitya`, `none` | only for players whose pass ended on Day 16 (K16-03; a skipped day sets `none`) | 17+: K-run should read `d9_pass` = `vitya` **or** `d16_pass` = `vitya`; the gym reads `{ modifier: 'gym' }`, not this flag |
| `d16_smoked` / `d16_no_smoke` / `d16_quarter` | true | yes (one balcony card a night) | 17 craving texts |
| `d16_late` | true | only for «до трёх» | 17 morning |

Earlier flags read on Day 16: `d15_late`, `d15_team`, `d15_smoked` / `d15_no_smoke` / `d15_quarter`, `d13_bday`, `d9_pass`, `d1_half`, counter `smoke_free`, item `gum`, modifier `gym`. Not read on Day 16: `d15_tone` (no Alina card today), `d15_pimple` (grid allowed none), `d15_photo`, `d15_lunch`, `d15_reply`.
