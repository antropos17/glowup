# Week 2 grid (days 8–14) and the demo cut-off

Status: draft v1, 2026-11-24, for the authors to read and approve. Nothing here is written into `content/` or `src/` yet. After approval, days are written one at a time with `/write-day <n>`, which takes its per-day design from Part A.

Labels used below:
- **[A …]**: taken from the authors' docs; the citation names the file and section or decision row.
- **[P]**: proposal of this document, not confirmed.

Card names are English working titles. Russian in «quotes» is existing game text, quoted, not new text.

Facts this grid relies on (checked in the files on 2026-11-24):
- Fiction calendar: Day 6 ends on «Завтра суббота», so Day 7 is Saturday, Day 8 Sunday, Day 14 Saturday. The engine has no weekdays; only texts carry them.
- Energy 10 a day from Day 4 on (`content/balance.json`). Day reward 50 coins (`dayCoins`).
- The gym pass bought in K2-04 runs mornings 3–9 (modifier `gym`, 7 days, `content/items.json`); a pass applied on day X runs to morning X+7.
- The doctor's course runs mornings 4–13 (`derm_course`, 10 days, `DEMO_SCRIPT.md` 5c).
- The side job `A-job` is limited to days 1–7 (`content/cards/side-jobs.json` line 7). Actions are per-day copies (`A7-run`, `A7-gym`, …).
- `shaved` is a plain flag; the taste `no_beard` reads it for +8 chance (`content/tastes.json`). Nothing removes it today.
- Day 7 ends with her message in one of three tones, `d7_msg` = `warm` / `even` / `dry` (15% / 70% / 15% of random runs, `DECISIONS.md` row 40), no reply, and the teaser «До встречи выпускников 23 дня».

---

# Part A. Grid for days 8–14

## A1. The arc of week 2

| | Week 1 (days 1–7) | Week 2 (days 8–14) |
|---|---|---|
| Crush line | Ignoring, first like, first message, first talk, chance meeting [A `DESIGN.md` §3 "arc"] | From her one-way message to a light back-and-forth; ends with the first meeting that is not by chance [P] |
| Hero line | Start of every fix: doctor, dentist, cream, clothes, first smoke-free days | The novelty wears off: the gym pass ends (day 9), the stubble grows back (day 8), the doctor's course ends (day 13). Keeping habits without help is the theme [P] |
| Fixed beat | Day 1 | Day 10 [A `DESIGN.md` §5 "four fixed story beats: days 1, 10, 20 and 30", proposed there] |

Where Day 7 leaves each kind of player, and where Day 14 takes them [P]:

| Day 7 tone (`d7_msg`) | Week 2 for this player | Day 14 ends on |
|---|---|---|
| `warm` | She keeps writing; on Day 12 she asks for his help with the reunion music and names Saturday at «Зерно» | A planned coffee with her: the first meeting by agreement |
| `even` | She answers when he writes; Day 12 is a short question, no plan | He decides himself to go to «Зерно»; she is there, a short talk |
| `dry` | She answers briefly or not at all on bad days [A `DESIGN.md` §3 "on a bad day the crush may not write at all"]; the class chat (day 10) is the way back | He may go to «Зерно»; she is with a friend, a hello and two lines. Light, recoverable |

Every day ends on one beat (the "Day ends on" line in A2). Day 14's teaser counts down: «До встречи выпускников 16 дней» is the pattern [P].

## A2. Day by day

Common to every day of week 2 [A `DEMO_SCRIPT.md` 5d–5g pattern]:
- Plus actions (day, evening, night): park run 4, gym workout 4 (only while a pass runs), shower 2, teeth 1, sofa 0, side job 4 (needs `A-job` extended to day 14). Sleep closes the day; «Посидеть в телефоне до трёх» sets `d<n>_late` and −4 energy tomorrow.
- One craving card a day, ordinary (`smoke_free` 0) or strong (1+), the four choices of K6-08a/b (hold 2/3 energy, quarter 1 with `d1_half`, gum, smoke as neutral) [A decision 13, `DEMO_SCRIPT.md` 5f]. Where it sits moves with the day's story.
- Every story card has a free neutral choice; giving in to a temptation is free and neutral [A decision 13]. No purchase offer on a card that follows a failure [A decision 6, `DESIGN.md` §12].
- She never names what changed [A `DESIGN.md` §3].
- `affinity` steps stay inside decision 4: small beats ±2–3, a good reply +5 to +8, a bad one −5.

### Day 8 (Sunday). The morning after («Утро после», working)
Leans on: `weight`, `conf`, `care` (stubble). Chance: −2 … +3.

| Part | Card | Situation and choice | Src |
|---|---|---|---|
| morning | K8-00 Overslept | Only if Day 7 gets a «до трёх» option; today K7-sleep has one button, so no card | [P] |
| morning | K8-01 Stubble | For `shaved`: the stubble is back. Shave again (with `cream_zina`: clean; without: razor burn, as K7-01) or keep it (neutral: `unflag shaved`, `look.facial` = `stubble`). For `d7_red`: the redness is gone | [P] |
| morning | K8-02a/e/d Her message, morning | He can answer her Day 7 evening message now. `warm`: plain answer with a question back +3, short «И тебе.» 0 (neutral), a long wall of text −2. `even`: question back +2 / short 0 / no answer 0 (neutral). `dry`: short answer 0 / leave it 0 (neutral) / a second message right after the first −2 | [P]; tone from [A decision 33] |
| day | K8-03 Sunday lunch at mum's | Pies again. Payoffs: `d1_ate_pies`, `d4_ate_pies` («опять пять?»), `d1_refused_pies`, `d4_pies_held` (she bakes fewer). One pie and salad (2 energy, conf −1) or eat like everyone (weight +2, neutral). Mum's line reuses `d4_mom_talked` / Day 5 call | [P], pies pattern [A `DEMO_SCRIPT.md` §5] |
| day | K8-04 Mum notices | One line, indirect, by visible changes (the Day 7 count): «Ты какой-то бодрый». No choice beyond «Спасибо, мам» | [P] |
| evening | K8-05 Her answer | Only if he wrote on K8-02. One chat bubble by tone; a one-button card | [P] |
| evening | K8-06 Vitya | «Ну что, видел её?» — knows from the class chat. Text by `d7_met` (`ignore`: «Говорят, ты от неё прятался»), `d7_thread` = `song`. Tell (conf −1) or «Да так» (neutral) | [P] |
| night | Craving | Balcony, per common rule | [A] |

Quest steps: none. Feed: none. Day ends on: her answer, or «Прочитано» for the dry tone without an answer [P].
Coins: in 50 (+ job). Out: none.
Skipped day: no shave (stubble back), no message to her, pies eaten, smoked. `affinity` 0.

### Day 9 (Monday). The pass ran out («Абонемент кончился», working)
Leans on: `weight`. Chance: 0.

| Part | Card | Situation and choice | Src |
|---|---|---|---|
| morning | K9-00 Last gym morning | For a pass started on Day 2: «Абонемент: последний день». A line only | [P] |
| morning | K9-01 Scales | A plateau: «Весы стоят третий день». Explains in one line that weight drops slower now. No choice | [P] |
| day | K9-02 Renew or not | For pass holders: renew for 150 (the shop item, same effects) / Vitya's free morning runs (queues K10-run, 4 energy each, weight −2) / decide later (neutral). Without a pass: only Vitya's runs or «Потом» | [P]; pass from [A `DEMO_SCRIPT.md` 5a] |
| day | K9-03 Feed: fat burner | Trap, echo of the Day 2 tea: «Жиросжигатель: минус 3 кг за неделю», 60 coins. Odds on the button: часто ничего, иногда −2 energy for two days. With `d2_tea`: «Как тот чай?» | [P]; traps [A `DESIGN.md` §4 "rumours … can harm"] |
| evening | K9-04 Class chat: Oksana | Oksana announces a "then and now" slideshow for the reunion: one old photo and one fresh, by Tuesday evening. Queues K10-02. With `d6_chat_spoke` she tags him by name | [P]; pays `d6_chat_spoke` |
| evening | Alina | Silent. No card. A status line «Алина была в сети» only for `warm` | [A `DESIGN.md` §3] |
| night | Craving | Balcony | [A] |

Quest steps: K10-run (Vitya's runs, days 10–14 mornings, if chosen). Feed: K9-03. Day ends on: Oksana's «Жду фото до завтра» [P].
Coins: in 50 (+ job). Out: 150 (renew, optional), 60 (trap, optional).
Skipped day: pass not renewed, trap scrolled, smoked.

### Day 10 (Tuesday). Then and now («Тогда и сейчас», working). Fixed beat
Leans on: `conf`, `style`. Chance: 0 … +4.

| Part | Card | Situation and choice | Src |
|---|---|---|---|
| morning | K10-run Vitya at the park | Quest step if chosen on Day 9: run (4 energy, weight −2) or «Не сегодня» (neutral) | [P] |
| morning | K10-01 The old album | Mum's album: the graduation photo. With `d6_reply` = `joke`: he is the one singing in it. Pick the photo (one button) | [P]; pays the invented past [A decision 26] |
| day | K10-02 Send to Oksana | Old photo and a fresh selfie (2 energy, conf −2), old photo only (neutral), nothing. With `d3_posted`: «Одно фото ты уже выкладывал» (easier: 1 energy) | [P] |
| evening | K10-03a/b/c Slideshow preview | Oksana posts the drafts in the class chat. Alina reacts by the number of visible changes (Day 7 list plus `bought_haircut`), only to a fresh photo: 0–1 a like, 2–3 «Андрей, ты?», 4+ a fire. `affinity` +2 / +3 / +4, reason line names the reaction. No fresh photo: she reacts to Vitya's, no change | [P]; count condition [A decision 39] |
| evening | K10-04 Karaoke | For `d6_reply` = `joke` or `d7_thread` = `song`: Vitya writes «На встрече поёт Андрей». Laugh it off (neutral) or promise one song (conf −1, sets `d10_will_sing`) | [P] |
| night | Craving | Balcony | [A] |

Quest steps: K10-run. Chat: none private. Feed: the slideshow draft as a feed post. Day ends on: «Осталось двадцать дней» from Oksana [P].
Coins: in 50 (+ job). Out: none.
Skipped day: old photo only, no reaction from her, no song promised. A midpoint "now" frame for the timelapse is taken today [P; `DESIGN.md` §10 timelapse].

### Day 11 (Wednesday). Aunt Zina's nephew («Племянник», working)
Leans on: `care`, `style`. Chance: 0.

| Part | Card | Situation and choice | Src |
|---|---|---|---|
| morning | K11-01a/b/c Aunt Zina on the stairs | `a` `d5_helped_zina`: she sends him to her nephew, a barber on Sadovaya. `b` `d5_cream` = `bought`: she heard he found the pharmacy, same tip. `c` `d5_no_help` without cream: a hello and «Зарос ты». The tip is the hidden solution | [P]; "obvious fails, hidden works" [A `DESIGN.md` §2] |
| day | K11-02 Feed: salon «Люкс» | The obvious solution: a trendy cut for 150. Odds on the button: часто «не твоё» (care −6, style +4), иногда fine (care −6). The trap costs coins, unlike the Day 6 look | [P] |
| day | K11-03 The barber | With the tip: the shop's `haircut` (care −6, conf −2, 2 energy) for 70, the shop price; without the tip: not offered on a card, the shop still sells it. Free: «Потом» | [P]; item [A `DEMO_SCRIPT.md` 5a] |
| evening | K11-04 Pizza | A hungry evening: delivery promo. Cook (2 energy) or order (weight +2, 20 coins, neutral is "eat what's in the fridge", weight +1) | [P] |
| evening | K11-05 Mum calls | Aunt Zina reported again; light, no stakes | [P] |
| night | Craving | Balcony. With `smoke_free` ≥ 7: K11-06 «Неделя без сигарет», care −3, a line | [P] |

Quest steps: none. Feed: K11-02. Day ends on: the mirror with the haircut, or Aunt Zina's «Ну, как знаешь» [P].
Coins: in 50 (+ job). Out: 70 or 150, 20.
Skipped day: no haircut, the fridge, smoked.

### Day 12 (Thursday). The second cleaning («Вторая чистка», working)
Leans on: `teeth`. Chance: −2 … +5.

| Part | Card | Situation and choice | Src |
|---|---|---|---|
| morning | K12-01 Dentist | For `d5_dentist_later` or `d5_dentist_moved`: the free cleaning, 3 energy as an effect, teeth −15; −10 with `d1_soda_teeth`. Neutral is «go», as K5-04 | [A `DEMO_SCRIPT.md` 5e table: `d5_dentist_later` → 12; decision 18] |
| morning | K12-01c Check-up | For `d5_cleaned`: a check-up line; with `d5_smoked` «Курили сразу после чистки?» | [P] |
| day | K12-02 Dentist's porch | The craving right after the cleaning (the K5-05 rule: smoking takes back teeth +2). Others get the craving at night | [A K5-05a/b pattern] |
| day | K12-03w/e Alina asks | `warm`: Oksana put her on the music; «Ты же у нас певец» (with `d6_reply` = `joke`) or «Посоветуешь что-нибудь?». Help with a list (+3, sets `d12_helped_music`, she names «в субботу в «Зерне» обсудим»), short answer +1, «Не силён в этом» 0 (neutral). `even`: one plain question about the reunion, +2 / 0. `dry`: no card | [P] |
| evening | K12-04 Feed: whitening strips | Trap, echo of the soda: 40 coins. Odds: часто чувствительность (teeth +2 for two days), иногда ничего. With `d1_soda_teeth`: «Уже пробовал содой» | [P] |
| night | Craving | Balcony (if not on the porch) | [A] |

Quest steps: K12-01 needs no queue (gated by flags). Chat fork: K12-03. Day ends on: her last chat line, or «Прочитано» [P].
Coins: in 50 (+ job). Out: 40 (trap, optional).
Skipped day: the cleaning happens (as decision 18), a short neutral answer to her.

### Day 13 (Friday). The course ends («Конец курса», working)
Leans on: `skin`, `weight`, `care`. Chance: 0.

| Part | Card | Situation and choice | Src |
|---|---|---|---|
| morning | K13-01 Last tube | `d3_course` with `flagAge` ≥ 10: the last morning of the course. The mirror line names nothing new; queues K13-02 | [P]; course [A decision 11] |
| day | K13-02 Control visit | Galina Petrovna: «Дальше сами»: wash, don't squeeze. Go (2 energy, skin −2) or «Позвоню потом» (neutral). No product is sold here; «Сияние» stays in the shop | [P]; no upsell [A decision 6] |
| evening | K13-03a/b/c Vitya's birthday | Cake and the grill again. `a` `d4_meat_held`, `b` `d4_feast`, `c` `d4_home` («в этот раз придёшь?»). Go: the cake (one slice 2 energy / the lot weight +2, neutral) and the craving moves here. Stay home: quiet evening, mum calls | [P]; [A decision 15 "the evening must not be empty"] |
| evening | K13-04 Vitya's toast | For `d1_joked`: the door joke once more, now about the reunion. One button | [P] |
| night | K13-05 Saturday tip | For a player without `d2_zerno_known` and without `d12_helped_music`: Vitya mentions «Алина, говорят, по субботам в «Зерне»». One button | [P] |
| night | Craving | Balcony, unless it was at the birthday | [A] |

Quest steps: K13-02. Day ends on: «Завтра суббота» [P].
Coins: in 50 (+ job). Out: none on cards. Optional shop: «Сияние» 220 now that the course is over.
Skipped day: the control visit postponed, stayed home, smoked.

### Day 14 (Saturday). Not by chance («Не случайно», working)
Leans on: `conf`, plus every visible change. Chance: −4 … +8.

| Part | Card | Situation and choice | Src |
|---|---|---|---|
| morning | K14-01 Stubble | As K8-01 | [P] |
| morning | K14-02 Half-time mirror | «Половина пути»: the full-body mirror, the day-1 frame beside today's. No choice | [P]; before/after [A `DESIGN.md` §8–10] |
| day | K14-03 Go to «Зерно»? | `d12_helped_music`: she is waiting, one button «Пойти». Others: go (conf −1) or stay home (neutral). Unlike Day 7, this meeting can be skipped: it is not by chance | [P] |
| day | K14-04 Craving at the door | As K7-02a/b | [A decision 30] |
| day | K14-05p/c/f The table | `p` planned: she has a list of songs; one question from her, answers +3 / 0 / −2. `c` came on his own (`even`): she is with her laptop, a short talk, +2 / 0 / −2. `f` (`dry`): she is with a friend, a hello, +1 / 0 / −2. Her line by visible changes, Day 7 thresholds | [P]; thresholds [A decision 35] |
| evening | K14-06 Her message | Only after the table: one bubble by how it went, one button | [P] |
| night | Craving, sleep | As usual. Sleep teaser «До встречи выпускников 16 дней» | [P] |

Quest steps: none. Chat: K14-06. Day ends on: her message, or a photo from «Зерно» in the feed without him (home) [P].
Coins: in 50 (+ job). Out: none (each pays for their own coffee; no paying for her) [P; affinity cannot be bought, `DESIGN.md` §6].
Skipped day: he stayed home, no message from her, `affinity` 0.

## A3. Coins of week 2

| | Amount | Notes |
|---|---|---|
| Coins on the morning of day 8 | ~150–400 | Day 6 median 310 before the market card (`DEMO_SCRIPT.md` 5f) minus a shirt or frame, plus days 6–7 rewards and jobs; estimate, to be measured |
| Day rewards | 350 | 7 × 50 |
| Side job | up to 210 | only if `A-job` is extended |
| Sinks on cards | 150 pass, 70 haircut, 150 salon trap, 60 + 40 traps, 20 pizza | all optional |
| Sinks in the shop | 220 «Сияние», 90 / 150 the unbought shirt or frame | |

Goal kept from 5a: a week of income buys about half of what is on offer [A `DEMO_SCRIPT.md` 5a].

## A4. Flags

### Earlier flags paid off in week 2
Every name below is set in `content/cards/day1.json`…`day7.json` (checked by grep on 2026-11-24).

| Flag | Set on | Read before | Week 2 payoff |
|---|---|---|---|
| `d7_msg` | 7 | 7 | 8 (her message, reply), 9, 12, 14 (tone of the week) |
| `d7_met` | 7 | 7 | 8 (Vitya: «ты от неё прятался» for `ignore`) |
| `d7_thread` | 7 | 7 | 8, 10 (`song`: karaoke) |
| `d7_line` | 7 | 7 | 14 (her line compares with Saturday last week) [P] |
| `shaved`, `d7_red` | 7 | 7 | 8, 14 (stubble back, redness gone) |
| `d6_reply` | 6 | 6, 7 | 10 (the singer in the photo), 12 («Ты же у нас певец») |
| `d6_chat_spoke` | 6 | never | 9 (Oksana tags him) |
| `d6_shirt`, `d6_frame` | 6 | never | 8 (mum notices, via the count), 10 (fresh photo) |
| `d6_beard_hint` | 6 | 7 | 8, 14 (the stubble card quotes her) |
| `d5_dentist_later` | 5 | never | 12 (the cleaning) |
| `d5_dentist_moved` | 5 | never | 12 (the cleaning) |
| `d5_cleaned`, `d5_smoked` | 5 | 5, 7 | 12 (check-up) |
| `d5_helped_zina`, `d5_no_help`, `d5_cream` | 5 | 5, 7 / never | 11 (Aunt Zina's tip) |
| `d4_mom_talked` | 4 | 5 | 8 (mum's lunch line) |
| `d4_ate_pies`, `d4_pies_held` | 4 | 5 | 8 (pies again) |
| `d4_meat_held`, `d4_feast`, `d4_home`, `d4_went` | 4 | 4, 6, 7 | 13 (Vitya's birthday) |
| `d4_alina_reacted` | 4 | never | not paid on purpose: paid through `affinity` [A `DEMO_SCRIPT.md` 5e] |
| `d3_course` | 3 | 4, 5, 7 | 13 (`flagAge` ≥ 10: the course ends) |
| `d3_posted` | 3 | 3, 4 | 10 (one photo already posted) |
| `d2_tea` | 2 | 3, 4 | 9 (the fat burner) [A `DEMO_SCRIPT.md` 5b: "Day 7 can recall the tea", not done on Day 7] |
| `d2_gym`, `bought_gym_pass` | 2 | 3–7 | 9 (the pass ends) |
| `d2_zerno_known`, `d2_wrote_zerno` | 2 | 7 | 13, 14 (Saturday at «Зерно») |
| `d2_liked_photo` | 2 | never | not paid on purpose, as above |
| `d1_ate_pies`, `d1_refused_pies`, `d1_one_pie` | 1 | 2, 4, 5 | 8 (Sunday lunch) |
| `d1_soda_teeth` | 1 | 5 | 12 (the cleaning, the strips) |
| `d1_joked` | 1 | 3, 4 | 13 (the toast) |
| `d1_half` | 1 | 4–7 | 8–14 (the quarter on every craving) |
| `d1_mom_knows` | 1 | never directly | not needed: Day 2 reads its absence |
| counters `smoke_free`, `useful` | 1–7 | 3–7 | every craving; 11 (a week without cigarettes) |
| item `cream_zina` | 5 | 7 | 8, 14 (shaving again) |

### New flags planned in week 2 [P]

| Flag | Values | Set by | Read on |
|---|---|---|---|
| `d8_replied` | `warm`, `short`, `long`, `none` | K8-02 | 8 (her answer), 12 |
| `d8_lunch` | `held`, `ate` | K8-03 | 11 (mum's call), 13 |
| `d8_late` … `d14_late` | true | sleep «до трёх» | next morning |
| `d9_pass` | `renewed`, `vitya`, `none` | K9-02 | 9–14 (gym action, K10-run) |
| `d9_burner` | true | K9-03 | 10–11 (energy line) |
| `d10_photo` | `both`, `old`, `none` | K10-02 | 10 (her reaction), 14 |
| `d10_will_sing` | true | K10-04 | days 15–30 (reunion) |
| `d11_cut` | `barber`, `salon` | K11-02/03 | 14 (visible change), counts as `bought_haircut` |
| `d12_cleaned` | `full`, `soda` | K12-01 | 14 (visible change: teeth) |
| `d12_helped_music` | true | K12-03w | 13, 14 (the planned coffee) |
| `d12_strips` | true | K12-04 | 13 (sensitivity line) |
| `d13_course_done` | true | K13-02 | days 15+ (skin maintenance) |
| `d13_bday` | `held`, `cake`, `home` | K13-03 | 14 (Vitya's line) |
| `d14_met` | `planned`, `came`, `home` | K14-03 | 15+ |
| counter `d14_scene` | −2 … +2 | K14-05 | 14 (her evening message), as `d7_scene` |

## A5. Engine gaps for week 2

| Gap | Where | Needed for |
|---|---|---|
| `Cond` cannot ask whether a modifier is running | `Cond` in `src/engine/types.ts`, `eligible()` in `src/engine/game.ts` | K9-00/K9-02 for a pass applied later than bought (already noted in `DEMO_SCRIPT.md` 5c–5f). `flagAge` covers the doctor's course, which starts the day `d3_course` is set |
| A card shows one fresh crush bubble only | `says` handling in `openCard()`, `src/engine/game.ts` | K8-05, K12-03: two cards per exchange, as Day 5/6 did |
| No private photo to the crush | no effect in `types.ts`, no UI | `DESIGN.md` §3 "the player can send photos"; Day 10 goes through the class chat instead |
| A demo save cannot resume into the full game | `syncClock()` returns early on `demoOver` (`game.ts` 159) and the clock counts from `startedAt` | Decision 8 "progress is kept for the full version": see Part B |

Content prerequisites (no engine work): extend `A-job` beyond day 7; per-day action copies `A8-*` … `A14-*`; `days.json` entries 8–14 and the Day 7 gift; stubble regrowth is content (`unflag shaved`, `look.facial` = `stubble`).

## A6. Open questions for the authors

1. Day 10 is a fixed story beat ("then and now" photo for the slideshow): yes or another event?
2. On Day 8 Andrey may answer her Day 7 message (Day 7 had no reply by decision 33): OK?
3. Stubble grows back and shaving becomes a choice again on days 8 and 14: OK, or once shaved, stays shaved?
4. Week 2 ends on Day 14 with a planned coffee for the warm tone: too early, or right?
5. A second small taste of Alina in week 2 (`DESIGN.md` §3 "few, tiny"): add one, and which?
6. Vitya's free morning runs as the alternative to renewing the pass: OK?
7. Three paid traps in one week (fat burner, salon, strips): keep all, or one?
8. Day 7 gift for the full game: which item?
9. Should Day 7 sleep get «Посидеть в телефоне до трёх» in the full game?
10. A new shop item for week 2 (for example perfume for `care`): needed?

### Answers (Ruslan, 2026-11-24)

| # | Answer | What it means for the grid |
|---|---|---|
| 1 | Yes | Day 10 stays the fixed "then and now" beat |
| 2 | OK | K8-02a/e/d and K8-05 stay as planned |
| 3 | It grows back | K8-01 and the Day 14 shave choice stay; keeping the stubble does `unflag shaved`, `look.facial` = `stubble` |
| 4 | Right | Week 2 ends on Day 14 with the planned coffee |
| 5 | Not for now | No second taste of Alina in week 2 |
| 6 | OK | Vitya's free morning runs are the alternative to renewing the pass |
| 7 | Keep all | Fat burner, salon and strips all stay |
| 8 | "Decide yourself and propose" | Open. Proposed by the main chat, not yet confirmed: `acne_patch` (existing item, given once on Day 2; `gum` and `floss` already repeat) |
| 9 | Yes | K7-sleep gets «Посидеть в телефоне до трёх» (`d7_late`), which makes K8-00 Overslept a real card. The engine has no demo/full condition (Part B2), so the button would also show in the demo; whether that is acceptable is not yet confirmed |
| 10 | Yes, perfume | A new `care` item for week 2. Day, price, effect and Russian texts are not set yet; Day 8 has no spending, so not on Day 8 |

---

# Part B. Keeping the demo ending on Day 7

## B1. How the cut-off works now

| What | Where |
|---|---|
| The number | `content/balance.json` line 3, `"contentDays": 7`; type `Balance.contentDays`, `src/engine/types.ts` line 204 |
| The cut-off | `syncClock()`, `src/engine/game.ts` line 172: when the clock ends a day and `s.day >= contentDays` (`demoDays` since Option 2 landed), it sets `demoOver` and stops. The day is closed first (`closeDay`, line 170), so the Day 7 reward of 50 coins is paid and the gift from `days.json` would be too |
| Frozen state | `game.ts` line 159 (`syncClock` returns early on `demoOver`) and line 306 (`over()`: no cards are drawn) |
| End screen | `src/ui/Game.tsx` lines 164–179: missed summary, then the last day card, then `DemoEnd`; after «Закрыть» the game is read-only (`frozen`, line 179). Line 721 prints `DEMO_END.written(contentDays, days)`, text in `src/ui/ru.ts` lines 51–53 |
| Check | `src/engine/validate.ts` line 110: `contentDays` ≤ `days` |
| Content that assumes the end | `content/cards/day7.json` `K7-sleep`: one button, no «до трёх»; `content/days.json` lines 38–42: Day 7 has no gift; `content/cards/side-jobs.json` line 7: `A-job` days 1–7 |
| Tests | `tests/engine.test.ts` line 19 (`full` with `contentDays` 30 to play past the end), lines 150–155 (end after the last written day), line 1432 (`contentDays` is 7), lines 1689 and 1697 (demo ends on Day 7) |

Finding: `contentDays` already is the demo length, not "the days that are written". Cards for day 8+ (`when.days` [8, 8]) never become eligible because the game stops at line 172 first. Adding `day8.json` does not move the ending unless `contentDays` is changed. All cards are bundled regardless (`src/content/index.ts` line 14, `import.meta.glob`).

## B2. Options

| | Option 1. Keep `contentDays` as the cut-off | Option 2. Separate `demoDays` | Option 3. Demo build flag and a separate bundle |
|---|---|---|---|
| Idea | Change nothing; write days 8+ into `content/cards/`, keep `contentDays` 7; test week 2 with the `full` override | `balance.demoDays` (7) is the cut-off; `contentDays` means written days (14) and is checked against the cards | A build-time flag picks the demo or the full game; the demo bundle loads only `day1`–`day7` |
| Files | none (docs only) | `src/engine/types.ts` (Balance), `content/balance.json`, `game.ts` line 172, `Game.tsx` line 721, `validate.ts` line 110 (+ `demoDays` ≤ `contentDays`, card days ≤ `contentDays`), a dev switch in `src/ui/Kit.tsx` or a URL flag to play past 7 | `vite.config.ts` (`define`), `src/content/index.ts` (glob by flag), `package.json` (`build:demo`, `build:full`), `balance` override per build |
| `K7-sleep` | Unchanged | Unchanged for both; a «до трёх» choice needs a demo/full condition (an engine gap) or stays out | Can differ: the full bundle may carry its own copy |
| Day 7 gift | If added, demo players see it on the Day 7 card, then it waits in the frozen bag | Same as option 1 | Demo `days.json` keeps no gift; full has one (two files to keep in step) |
| Existing saves | Unaffected | Unaffected for the demo. Releasing the full game needs a resume step: clear `demoOver` when `day` < cut-off and rebase `startedAt`, otherwise the real-time clock auto-skips every day since the save | Same as option 2 |
| Tests | No change; week 2 tests use `full` (line 19) | Lines 19, 150–155, 1432 switch to `demoDays`; new test: day 8 cards are unreachable in the demo | Every test file runs against one bundle; a second run for the other |
| Bundle | Days 8+ ship inside the demo (595 kB today, days 5–7 are 70–105 kB of JSON each; estimate) | Same | Demo stays as small as today |
| Size | 0 lines | ~20–30 lines + tests | ~60–100 lines, two artefacts to verify per change |

## B3. Recommendation

Option 2. One explicit number for the demo length stops the ending depending on an accident of naming, lets `check:content` verify that written days have content, and gives a switch to play week 2 on the dev page. It is small and touches only the files listed.

Option 1 is enough to start `/write-day 8` today with no code change; Option 2 should land before week 2 is played on the dev page. Option 3 is worth it only if the demo bundle size or spoilers matter to the testers.

Separate from all options: resuming a demo save in the full game (rebase `startedAt`) is an open engine task tied to decision 8.

---

# Part C. Days as written

## C1. Day 8 (written 2026-11-25, texts await the authors' review)

File: `content/cards/day8.json` (26 cards: 20 story, 6 action). Also touched: `A-job` days 1–8 (`content/cards/side-jobs.json`), `content/days.json` day 8 («Утро после», working title; gift `floss`; teaser «Завтра понедельник. Оксана что-то затевает в чате»), `content/chat.json` (`alina_d8_warm`, `alina_d8_even`, `alina_d8_short`, `alina_d8_long`, 10 phrasings each), `content/balance.json` `contentDays` 8 (`demoDays` stays 7). Russian texts for review: `docs/review/day8-texts.md`.

Day 7 changes, from answers 8 and 9, to be confirmed on review (both are visible in the demo):
- `K7-sleep` gets «Посидеть в телефоне до трёх»: `d7_late`, −4 energy tomorrow, text of the Day 5 late night («К трём часам ночи её сообщение перечитано раз двадцать…»). In the demo the penalty never applies: the demo ends after Day 7.
- `content/days.json` Day 7 gets `"gift": "acne_patch"`. In the demo it lands in the bag on the Day 7 card, after which the game is frozen.

Cards in display order:

| Part | Card | Shown when | Choices (neutral in bold) |
|---|---|---|---|
| morning | K8-00 Проспал | `d7_late` | **up** |
| morning | K8-01a / K8-01b Щетина | `shaved`; a: with `d7_red` (redness gone), b: without | cream (`cream_zina`) / bare (no cream: `d8_red`, razor burn, conf +2) / **keep** (`unflag shaved`, facial `stubble`; quotes her for `d6_beard_hint`) |
| morning | K8-02a / e / d Её сообщение | `d7_msg` = warm / even / dry | warm: ask +3 / short 0 / long −2 / **none**; even: ask +2 / short 0 / **none**; dry: short 0 / **none** / double −2 |
| day | K8-03a / b / c Обед у мамы | a: ate pies (`d4_ate_pies` or `d1_ate_pies`, not `d4_pies_held`), b: `d4_pies_held` or `d1_refused_pies`, c: otherwise | held (2 energy, conf −1) / **ate** (weight +2) |
| day | K8-04 Мама присматривается | after lunch, at least 2 of 5 visible changes | **thanks**; mum's line by `d4_mom_talked`, else `d5_helped_zina`, else pies to take home |
| evening | K8-05w / e / s / l Алина ответила | w: warm reply in the warm tone, e: warm reply in the even tone, s: short reply (warm or even), l: long reply (warm) | **ok** (one chat bubble) |
| evening | K8-05d Алина в сети | dry tone and he wrote (short or double) | **ok** («была в сети… Ответа нет») |
| evening | K8-06a / b / c Витя пишет | a: `d7_met` = ignore, b: `d7_thread` = song, c: otherwise | tell (conf −1) / **shrug** |
| night | K8-07a / b Балкон | `smoke_free` 0 / ≥ 1 | hold (2 / 3 energy) / quarter (`d1_half`) / gum / **smoke** |
| day–night | A8-run, A8-gym, A8-clean, A8-teeth, A8-couch, A-job | plus menu, as on Day 7 | — |
| night | K8-sleep | | sleep / late (`d8_late`, −4 tomorrow) |

Visible changes for K8-04 (the Day 7 count, as of Sunday): a clean shave today (`shaved` and not `d8_red`), `bought_shirt` or `bought_frame`, `d5_cleaned`, `d3_course`, `smoke_free` ≥ 1.

Day ends on: her answer (K8-05w/e/s/l), «была в сети… Ответа нет» for the dry tone after he wrote (K8-05d), otherwise on Vitya and the balcony.

Affinity on Day 8: −2 … +3 (K8-02 only). Chance can move more: keeping the stubble removes `shaved`, which costs the `no_beard` taste bonus (8) for a player who has that taste; this follows answer 3.

Skipped day (neutral choices): K8-00 `up`, K8-01a/b `keep`, K8-02a/e/d `none`, K8-03a/b/c `ate`, K8-04 `thanks`, K8-05x `ok` (never reached: no message), K8-06a/b/c `shrug`, K8-07a/b `smoke`. Result: the stubble back, no message to her, the pies eaten, smoked, `affinity` 0.

### Day 8 flags

| Flag | Values | Set by | Read on |
|---|---|---|---|
| `d8_replied` | `warm` (answered with a question), `short`, `long` (warm: the long text; dry: the second message), `none` | K8-02 | 8 (K8-05), 12 |
| `d8_answered` | true | K8-05 | 8 (K8-05 once, K8-sleep text) |
| `d8_red` | true | K8-01 bare | 8 (K8-04 count), 14 (shave) |
| `d8_lunch` | `held`, `ate` | K8-03 | 8 (K8-04), 11, 13 |
| `d8_smoked`, `d8_no_smoke`, `d8_quarter` | true | K8-07 | 8 (K8-07 once), 9 (craving texts) |
| `d8_late` | true | K8-sleep late | 9 (morning) |
| `shaved` | set / removed | K8-01 | 8 (K8-04), taste `no_beard`, 14 |

Earlier flags paid off on Day 8: `d7_late` (K8-00), `shaved`, `d7_red`, `d6_beard_hint`, item `cream_zina` (K8-01), `d7_msg` (K8-02, K8-05), `d1_ate_pies`, `d1_refused_pies`, `d4_ate_pies`, `d4_pies_held` (K8-03), `bought_shirt`, `bought_frame`, `d5_cleaned`, `d3_course`, `d4_mom_talked`, `d5_helped_zina` (K8-04), `d7_met`, `d7_thread` (K8-06), `d7_quarter`, `d1_half`, item `gum`, counter `smoke_free` (K8-07), `d2_gym`, `bought_gym_pass` (A8-gym). `d1_one_pie` is read only through `d4_*` (Day 4 sets those only for one-pie players).

Differences from the A2 grid, for the authors:
- Warm tone: the grid made «И тебе.» neutral, but a neutral choice must not write to her (the skipped day sends nothing). Warm got a fourth choice, «Пока не отвечать», as the neutral one; «И тебе.» stays at 0.
- Dry tone: she does not answer on Day 8 even when he writes (K8-05d, «была в сети… Ответа нет»); the grid's «Прочитано» line appears in the morning, under his message.
- K8-01 is shown only to players who shaved on Day 7; the others still have their stubble and get no card.
- K8-04 is shown only with 2 or more visible changes; mum's `d4_mom_talked` / Day 5 line lives inside it, so a player with fewer changes does not hear it.
- `d7_red` stays as Day 7 history; the new `d8_red` marks a red face on Sunday.

## C2. Day 9 (written 2026-11-25, texts await the authors' review)

File: `content/cards/day9.json` (18 cards: 12 story, 6 action). Also touched: `A-job` days 1–9 (`content/cards/side-jobs.json`), `content/days.json` day 9 («Абонемент кончился», working title; gift `gum`; teaser «Завтра вторник. Фото «тогда и сейчас»»), `content/chat.json` (`status_online`, 10 variants, a status line without «Ответа нет»), `content/balance.json` `contentDays` 9 (`demoDays` stays 7). Russian texts for review: `docs/review/day9-texts.md`. No change to days 1–8.

Cards in display order:

| Part | Card | Shown when | Choices (neutral in bold) |
|---|---|---|---|
| morning | K9-late Проспал | `d8_late` | **up** |
| morning | K9-00 Абонемент | `d2_gym` (see the gap below) | **ok** («Абонемент: последний день») |
| morning | K9-01 Весы | always | **ok**; the line by `weight` ≤ 78 (slower now) or ≥ 79 (nothing moved it yet) |
| day | K9-02a Продлить? | `d2_gym` | renew (150 coins, the shop pass modifier: 7 mornings from Day 10) / vitya / **later** |
| day | K9-02b Витя предлагает | no `d2_gym` | vitya / **later** |
| day | K9-03a / b Лента: жиросжигатель | a: `d2_tea` («Как тот чай?»), b: without | order (60 coins; часто: ничего, иногда: слабость, −2 energy tomorrow and the day after) / **scroll** |
| evening | K9-05w Алина в сети | `d7_msg` = warm | **ok** (status line `status_online`) |
| evening | K9-04a / b Чат класса | a: `d6_chat_spoke` (Oksana tags him), b: without | promise (conf −1) / **scroll** |
| night | K9-06a / b Балкон | `smoke_free` 0 / ≥ 1 | hold (2 / 3 energy) / quarter (`d1_half`) / gum / **smoke** |
| day–night | A9-run, A9-gym, A9-clean, A9-teeth, A9-couch, A-job | plus menu, as on Day 8 | — |
| night | K9-sleep | | sleep / late (`d9_late`, −4 tomorrow) |

Day ends on: Oksana's «Жду фото до завтра» (K9-04a/b), then the balcony. Affinity on Day 9: 0 (no card changes it).

Skipped day (neutral choices): K9-late `up`, K9-00 `ok`, K9-01 `ok`, K9-02a/b `later`, K9-03a/b `scroll`, K9-05w `ok`, K9-04a/b `scroll`, K9-06a/b `smoke`. Result: the pass not renewed, no runs with Vitya, the burner scrolled, no promise to Oksana, smoked, `affinity` 0.

### Day 9 flags

| Flag | Values | Set by | Read on |
|---|---|---|---|
| `d9_pass` | `renewed`, `vitya`, `none` | K9-02a/b | 9 (A9-gym text), 10–14 (gym action, Vitya's runs) |
| `d9_burner` | true | K9-03 order | 10–11 (energy line) |
| `d9_oksana` | `promised` | K9-04 promise | 10 (K10-02, the photo) |
| `d9_smoked`, `d9_no_smoke`, `d9_quarter` | true | K9-06 | 9 (K9-06 once), 10 (craving texts) |
| `d9_late` | true | K9-sleep late | 10 (morning) |

Earlier flags paid off on Day 9: `d8_late` (K9-late), `d2_gym` (K9-00, K9-02a/b), `d2_gym`, `bought_gym_pass`, item `gym_pass` (A9-gym, the Day 8 gate), `d2_tea` (K9-03a), `d7_msg` (K9-05w), `d6_chat_spoke` (K9-04a), `d8_quarter`, `d1_half`, item `gum`, counter `smoke_free` (K9-06).

Engine gap A5, as met on Day 9:
- The grid wants K9-00 and the renew choice of K9-02 for everyone whose gym pass ends on Day 9, and the gym action only while a pass runs.
- `Cond` cannot ask whether the modifier `gym` is running or when it was applied. Only the Day 2 card fixes the start day: `d2_gym` is set on Day 2 by K2-04 (bought there, or the shop pass used there), so that pass runs mornings 3–9. A shop pass used on another day sets no flag at use; `bought_gym_pass` keeps only the purchase day.
- Content-only variant used: K9-00 and K9-02a read `d2_gym`; everyone else gets K9-02b (Vitya or later). A player whose shop pass runs from another day gets no «последний день» line and can still buy a pass in the shop. A9-gym keeps the Day 8 gate (a pass ever used), so it shows on Day 9 for every past pass holder.
- Proposed engine change, not made: a condition `{ modifier: 'gym', daysLeft?: Cmp }` read from `GameState.modifiers`, which would let K9-00 say «последний день» exactly and hide A9-gym once the pass is over.

Differences from the A2 grid, for the authors:
- K9-02 «Vitya's runs» does not queue K10-run: Day 10 is not written and a queue needs an existing card. The choice sets `d9_pass` = `vitya`; Day 10 should read it.
- K9-04 does not queue K10-02: a Day 10 story card comes by schedule anyway. The promise sets `d9_oksana`.
- The overslept card is named `K9-late` (the grid gives K9-00 to the last gym morning).
- Alina's status line is a one-button card (K9-05w) because a status line in chat needs a card's `says`.

## C3. Day 10 (written 2026-11-25, texts await the authors' review)

File: `content/cards/day10.json` (20 cards: 14 story, 6 action). Also touched: `A-job` days 1–10 (`content/cards/side-jobs.json`), `content/days.json` day 10 («Тогда и сейчас», working title; gift `acne_patch`; teaser «Завтра среда. Тётя Зина ждёт на лестнице»), `content/chat.json` (`status_d10_like`, `status_d10_you`, `status_d10_fire`, 10 variants each), `content/rumors.json` (`slideshow`, the feed post), `content/balance.json` `contentDays` 10 (`demoDays` stays 7). Russian texts for review: `docs/review/day10-texts.md`. No change to days 1–9.

Cards in display order:

| Part | Card | Shown when | Choices (neutral in bold) |
|---|---|---|---|
| morning | K10-late Проспал | `d9_late` | **up** |
| morning | K10-run Витя у подъезда | `d9_pass` = `vitya` | run (4 energy, weight −2; a heavier line with `d9_burner`) / **skip** |
| morning | K10-01a / b Старый альбом | a: `d6_reply` = `joke` (he is the one singing), b: otherwise | **pick** |
| day | K10-02a / b Фото для Оксаны | a: `d9_oksana` = `promised` («ты обещал!»), b: without | both (2 energy, conf −2) or, with `d3_posted`, both_easy (1 energy, conf −2) / **old** / none; sets `d10_photo` |
| evening | K10-03a / b / c Черновик слайд-шоу | `d10_photo` = `both`; visible changes 0–1 / 2–3 / 4+ | **ok**: affinity +2 / +3 / +4, her reaction as a status line in her chat, rumor `slideshow` |
| evening | K10-03d / e Черновик слайд-шоу | `d10_photo` = `old` / `none` | **ok**: she likes Vitya's photo, no change; rumor `slideshow` |
| evening | K10-04 Витя пишет | `d6_reply` = `joke` or `d7_thread` = `song` | promise (conf −1, `d10_will_sing`) / **laugh** |
| night | K10-05a / b Балкон | `smoke_free` 0 / ≥ 1 | hold (2 / 3 energy) / quarter (`d1_half`) / gum / **smoke** |
| day–night | A10-run, A10-gym, A10-clean, A10-teeth, A10-couch, A-job | plus menu, as on Day 9 | — |
| night | K10-sleep | | sleep (Oksana: «Осталось двадцать дней!») / late (`d10_late`, −4 tomorrow) |

Visible changes for K10-03 (the Day 8 list plus the haircut, decision 39): `shaved`, `bought_shirt` or `bought_frame`, `d5_cleaned`, `d3_course`, `smoke_free` ≥ 1, `bought_haircut`.

Day ends on: Oksana's «Осталось двадцать дней!» in the sleep line. Affinity on Day 10: 0 … +4 (K10-03a/b/c only).

Skipped day (neutral choices): K10-late `up`, K10-run `skip`, K10-01a/b `pick`, K10-02a/b `old`, K10-03d `ok`, K10-04 `laugh`, K10-05a/b `smoke`. Result: no run, the old photo only, no reaction from her, no song promised, smoked, `affinity` 0.

### Day 10 flags

| Flag | Values | Set by | Read on |
|---|---|---|---|
| `d10_photo` | `both`, `old`, `none` | K10-02a/b | 10 (K10-03), 14 |
| `d10_will_sing` | true | K10-04 promise | days 15–30 (reunion) |
| `d10_smoked`, `d10_no_smoke`, `d10_quarter` | true | K10-05 | 10 (K10-05 once), 11 (craving texts) |
| `d10_late` | true | K10-sleep late | 11 (morning) |

Earlier flags paid off on Day 10: `d9_late` (K10-late), `d9_pass`, `d9_burner` (K10-run, A10-gym), `d6_reply` (K10-01, K10-04), `d9_oksana` (K10-02a/b), `d3_posted` (K10-02), `shaved`, `bought_shirt`, `bought_frame`, `d5_cleaned`, `d3_course`, `bought_haircut`, counter `smoke_free` (K10-03), `d7_thread` (K10-04), `d9_quarter`, `d1_half`, item `gum` (K10-05), `bought_gym_pass`, item `gym_pass` (A10-gym).

Engine gap A5, as met on Day 10:
- The gym action should show only while a pass runs. The Day 2 pass (`d2_gym`) ended on Day 9, so it no longer opens the gym. A10-gym reads `d9_pass` = `renewed`, or a shop pass bought on days 3–9 and already used (`flagAge` of `bought_gym_pass` 1–7, no `gym_pass` in the bag). A shop pass bought on Day 2 but used later, or used more than a day after purchase, is approximated by the purchase day; the proposed `{ modifier: 'gym' }` condition (C2) would make it exact.

Differences from the A2 grid, for the authors:
- Her reaction is not a crush message: the `alina_*` keys render as her bubbles, and only keys starting with `status_` render as a status line. The reaction happens in the class chat, so it goes to her chat as a status line (`status_d10_like`, `status_d10_you`, `status_d10_fire`) by the `chat` effect of the choice, not by the card's `says`: a card with `says` replaces its own text with her line, which would hide «Оксана выложила черновик».
- «No fresh photo: she reacts to Vitya's» became two cards, K10-03d (old photo only) and K10-03e (nothing sent), because their texts differ.
- K10-run is a story card on Day 10 read from `d9_pass`, not a queued quest step (Day 9 queues nothing). Days 11–14 should repeat it the same way.
- `d9_burner` is read in K10-run only (a heavier line); the −2 energy itself already comes from the Day 9 `tomorrow` effect.
- The midpoint timelapse frame needs no content: every closed day already takes a frame.

## C4. Day 11 (written 2026-11-25, texts await the authors' review)

File: `content/cards/day11.json` (23 cards: 17 story, 6 action). Also touched: `A-job` days 1–11 (`content/cards/side-jobs.json`), `content/days.json` day 11 («Племянник», working title; gift `floss`; teaser «Завтра четверг. Улыбка из ленты и кресло стоматолога»), `content/hints.json` (`barber_gosha`), `content/rumors.json` (`salon_lux`, the feed post), `content/balance.json` `contentDays` 11 (`demoDays` stays 7). No new chat situations: Alina does not appear on Day 11 (chance 0 by the grid). Russian texts for review: `docs/review/day11-texts.md`. No change to days 1–10.

Cards in display order:

| Part | Card | Shown when | Choices (neutral in bold) |
|---|---|---|---|
| morning | K11-late Проспал | `d10_late` | **up** |
| morning | K11-run Витя у подъезда | `d9_pass` = `vitya` | run (4 energy, weight −2; a heavier line with `d9_burner`) / **skip** |
| morning | K11-01h Тётя Зина на лестнице | `bought_haircut` (a shop haircut before Day 11) | **thanks** (she takes it for her nephew's work) |
| morning | K11-01a Тётя Зина на лестнице | `d5_helped_zina` (shelf or bags), no haircut | note (hint `barber_gosha`, `d11_tip` = `noted`) / **nod** (`d11_tip` = `heard`) |
| morning | K11-01b Тётя Зина на лестнице | `d5_no_help`, `d5_cream` = `bought`, no haircut | as K11-01a; she heard at the pharmacy that he found the cream |
| morning | K11-01c Тётя Зина на лестнице | `d5_no_help`, cream not bought, no haircut | **hello** («Зарос ты, Андрюша»; no tip) |
| day | K11-02 Лента: салон «Люкс» | no haircut (neither `d11_cut` nor `bought_haircut`) | book (150 coins; часто «не твоё»: care −6, style +4; иногда «вышло нормально»: care −6; `d11_cut` = `salon`, `d11_salon` = `odd` / `fine`) / **scroll**; rumor `salon_lux` on every choice |
| day | K11-03 Барбершоп на Садовой | `d11_tip`, no haircut | cut (70 coins, 2 energy: care −6, conf −2, the shop haircut's effect; sets `bought_haircut` and `d11_cut` = `barber`) / **later** |
| evening | K11-04 Пицца | always | cook (2 energy, weight −1) / order (20 coins, weight +2) / **fridge** (weight +1) |
| evening | K11-05 Мама звонит | always | **talk**: Aunt Zina reported the haircut (barber or shop), the salon, the tip, or «зарос»; plus a line by `d8_lunch` (`held` / otherwise) |
| evening | K11-08a / b Зеркало | `d11_cut` = `barber` / `salon` (b: line by `d11_salon`) | **ok** |
| evening | K11-08c Тётя Зина | `d11_tip`, no haircut | **later** («Не дошёл до Гоши? Ну, как знаешь») |
| night | K11-06a / q / b Балкон | yesterday: `d10_smoked` (or no Day 10 flag) / `d10_quarter` / `d10_no_smoke` | hold (2 / 2 / 3 energy) / quarter (`d1_half`) / gum / **smoke**; card and outcome texts name yesterday's result |
| night | K11-07 Неделя без сигарет | `d11_no_smoke` and `smoke_free` ≥ 7 | **ok** (care −3) |
| day–night | A11-run, A11-gym, A11-clean, A11-teeth, A11-couch, A-job | plus menu, as on Day 10 | — |
| night | K11-sleep | | sleep / late (`d11_late`, −4 tomorrow) |

Day ends on: the mirror with the haircut (K11-08a/b) or Aunt Zina's «Ну, как знаешь» (K11-08c); a player without the tip and without a haircut ends the evening on mum's call. Then the balcony. Affinity on Day 11: 0 (no card changes it).

Skipped day (neutral choices): K11-late `up`, K11-run `skip`, K11-01h `thanks`, K11-01a/b `nod`, K11-01c `hello`, K11-02 `scroll`, K11-03 `later`, K11-04 `fridge`, K11-05 `talk`, K11-08c `later`, K11-06a/q/b `smoke`. Result: the tip heard (if she gave it), no haircut, the fridge, smoked, no coins spent, `affinity` 0.

### Day 11 flags

| Flag | Values | Set by | Read on |
|---|---|---|---|
| `d11_tip` | `noted`, `heard` | K11-01a/b | 11 (K11-03, K11-05, K11-08c) |
| `d11_cut` | `barber`, `salon` | K11-03 cut / K11-02 book | 11 (K11-05, K11-08a/b), 14 (visible change) |
| `d11_salon` | `odd`, `fine` | K11-02 book | 11 (K11-08b) |
| `bought_haircut` | true | K11-03 cut (same flag as the shop purchase) | 11 (K11-01h, K11-02, K11-03), the shop (`once`), the visible-change counts |
| `d11_smoked`, `d11_no_smoke`, `d11_quarter` | true | K11-06 | 11 (K11-06 once, K11-07), 12 (craving texts) |
| `d11_late` | true | K11-sleep late | 12 (morning) |

Earlier flags paid off on Day 11: `d10_late` (K11-late), `d9_pass`, `d9_burner` (K11-run, A11-gym), `d5_helped_zina`, `d5_no_help`, `d5_cream` (K11-01a/b/c), `bought_haircut` (K11-01h, K11-02, K11-03, K11-05, K11-08c), `d8_lunch` (K11-05), `d10_smoked`, `d10_no_smoke`, `d10_quarter`, `d1_half`, item `gum`, counter `smoke_free` (K11-06, K11-07), `bought_gym_pass`, item `gym_pass` (A11-gym).

Engine gap A5, as met on Day 11: A11-gym uses the Day 10 workaround unchanged: `d9_pass` = `renewed`, or a shop pass bought and already used with `flagAge` of `bought_gym_pass` 1–7 (on Day 11 that is a purchase on days 4–10). The proposed `{ modifier: 'gym' }` condition (C2) would make it exact.

Differences from the A2 grid, for the authors:
- K11-01h is new: a player who already bought the haircut in the shop gets Aunt Zina recognising her nephew's work instead of the tip; the salon and the barber are not shown to him.
- K11-03 is shown only with the tip and without a haircut today (the salon or the shop); a player who chose the salon does not get a second haircut offer.
- The barber sets `bought_haircut` (the same haircut as the shop item, so the shop shows it sold out and the visible-change counts see it). The salon sets only `d11_cut` = `salon`; whether Day 14 should count the salon cut as a visible change is open.
- Cooking costs 2 energy as in the grid and also gives weight −1 (the grid named no effect); the fridge (neutral) is weight +1, ordering weight +2 for 20 coins.
- Mum's call also reads `d8_lunch`, as A4 planned (11, mum's call).
- The day's end beat (mirror / «Ну, как знаешь») is in the evening, before the night balcony, as Day 9 did with Oksana's line.
- The craving is split by yesterday's result (K11-06a/q/b) so each Day 10 branch has its own card text; the grid's «Неделя без сигарет» card is K11-07 (K11-06 is the balcony).
- The perfume (answer 10) is not added on Day 11: its day, price and texts are still open.
