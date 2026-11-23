import { describe, expect, it } from 'vitest';
import { content } from '../src/content';
import { slotAt, msToNextPart } from '../src/engine/clock';
import {
  actionsFor, chance, check, choicesFor, choose, currentLook, dayEnergy, draw, drawStory,
  buy, courseActive, markMissedSeen, newGame, oddsFor, soldOut, startLook, syncClock, useItem,
} from '../src/engine/game';
import { validateContent } from '../src/engine/validate';
import type { Content, GameState } from '../src/engine/types';

const H = 3_600_000;
// 1 июня 2026, 09:00 по Баку (UTC+4)
const TZ = 240;
const START = Date.UTC(2026, 5, 1, 5, 0);
const at = (hour: number) => START + (hour - 9) * H;
const start = (seed = 7, now = START) => newGame(content, { seed, now, tzOffsetMin: TZ, archetypeId: 'andrey' });
/** тот же контент, но будто написаны все 30 дней: чтобы проверить переход в день 2 */
const full: Content = { ...content, balance: { ...content.balance, contentDays: 30 } };

const pick = (s: GameState, card: string, choice: string, c = content) => choose(c, s, card, choice).state;
/** сыграть сюжет до конца текущего времени суток, выбирая указанные варианты или первый доступный */
function story(s: GameState, picks: Record<string, string> = {}, c = content): GameState {
  for (let i = 0; i < 20; i++) {
    const d = drawStory(c, s);
    s = d.state;
    if (!d.card) break;
    const id = picks[d.card.id] ?? choicesFor(c, s, d.card).find((x) => x.affordable)!.choice.id;
    s = pick(s, d.card.id, id, c);
  }
  return s;
}
/** весь день 1 до ночи включительно, без сна */
function day1(picks: Record<string, string> = {}, c = content): GameState {
  let s = story(start(), picks, c);
  for (const h of [13, 19, 23.5]) s = story(syncClock(c, s, at(h)), picks, c);
  return s;
}

describe('время', () => {
  it('делит сутки на утро, день, вечер и ночь по поясу игрока', () => {
    const slot = (h: number) => slotAt(START, at(h), TZ);
    expect(slot(9)).toMatchObject({ day: 1, part: 'morning' });
    expect(slot(13)).toMatchObject({ day: 1, part: 'day' });
    expect(slot(19)).toMatchObject({ day: 1, part: 'evening' });
    expect(slot(23.5)).toMatchObject({ day: 1, part: 'night' });
    // ночь после полуночи ещё принадлежит вчерашнему дню
    expect(slot(27)).toMatchObject({ day: 1, part: 'night' });
    expect(slot(30)).toMatchObject({ day: 2, part: 'morning' });
  });
  it('считает время до смены времени суток', () => expect(msToNextPart(START, TZ)).toBe(3 * H));
  it('тот же момент в другом поясе даёт другое время суток', () => {
    expect(slotAt(START, START, -300).part).toBe('night'); // Торонто, 00:00
  });
});

describe('контент', () => {
  it('проходит проверку', () => expect(validateContent(content)).toEqual([]));
});

describe('день 1', () => {
  it('стартует как в сценарии: 20 энергии, 100 монет, шесть показателей', () => {
    const s = start();
    expect(s.energy).toBe(20);
    expect(s.coins).toBe(100);
    expect(Object.keys(s.problems)).toHaveLength(6);
    expect(dayEnergy(content, s, 4)).toBe(10);
    expect(s.crushId).toBe('alina');
    expect(s.revealed).toHaveLength(0);
  });
  it('утро: чат класса, потом зеркало, и открытая карточка не меняется после перезапуска', () => {
    let d = drawStory(content, start());
    expect(d.card?.id).toBe('K1-01');
    expect(drawStory(content, d.state).card?.id).toBe('K1-01');
    d = drawStory(content, pick(d.state, 'K1-01', 'coming'));
    expect(d.card?.id).toBe('K1-02');
  });
  it('сюжет ждёт игрока: кто зашёл вечером, начинает с утренней карточки', () => {
    expect(drawStory(content, start(7, at(19))).card?.id).toBe('K1-01');
  });
  it('шансы на карточке названы словами', () => {
    const joke = content.cards.find((c) => c.id === 'K1-01')!.choices.find((c) => c.id === 'joke')!;
    expect(oddsFor(content, start(), joke)).toEqual([{ word: 'часто', hint: 'смеются' }, { word: 'иногда', hint: 'тишина' }]);
  });
  it('мама приезжает с пирожками только если ей пожаловались', () => {
    const seen = (s: GameState) => Object.keys(s.seen);
    expect(seen(day1({ 'K1-03': 'complain' }))).toContain('K1-04');
    expect(seen(day1({ 'K1-03': 'tell' }))).not.toContain('K1-04');
  });
  it('действия по плюсу доступны днём, стоят энергию и не повторяются', () => {
    let s = story(start());
    expect(actionsFor(content, s)).toHaveLength(0);          // утром меню пустое
    s = story(syncClock(content, s, at(13)));
    expect(actionsFor(content, s).map((c) => c.id)).toEqual(['A1-run', 'A1-clean', 'A1-dentist', 'A1-couch', 'A-job']);
    const before = s.energy;
    s = pick(s, 'A1-run', 'go');
    expect(s.energy).toBe(before - 4);
    expect(s.flags.d1_run).toBeDefined();
    expect(actionsFor(content, s).map((c) => c.id)).not.toContain('A1-run');
  });
  it('шкала шанса открывается ночью, и чат получает «прочитано»', () => {
    const s = day1({ 'K1-05': 'plain' });
    expect(s.flags.chance_shown).toBeDefined();
    expect(s.chat.map((m) => m.from)).toEqual(['hero', 'crush']);
    expect(s.chat[1].status).toBe(true);
    expect(day1({ 'K1-05': 'close' }).flags.chance_note.value).toContain('не знает');
  });
  it('сообщение с сердечком снижает шанс, и причина записана', () => {
    const s = day1({ 'K1-05': 'flirty' });
    expect(s.affinity).toBe(-2);
    expect(s.history.find((h) => h.card === 'K1-05')!.chanceDelta).toBeLessThan(0);
  });
  it('сон закрывает день: кадр, 50 монет и жвачка, и награда не выдаётся дважды', () => {
    let s = day1();
    expect(actionsFor(content, s).map((c) => c.id)).toContain('K1-09');
    s = pick(s, 'K1-09', 'sleep');
    expect(s.closedDay).toBe(1);
    expect(s.summaries).toHaveLength(1);
    expect(s.summaries[0]).toMatchObject({ day: 1, played: true, coins: 50, gift: 'gum' });
    expect(s.coins).toBe(150);
    expect(s.items.gum).toBe(1);
    expect(draw(content, s).card).toBeNull();
    expect(actionsFor(content, s)).toHaveLength(0);
    const next = syncClock(content, s, at(33));
    expect(next.coins).toBe(150);
    expect(next.summaries).toHaveLength(1);
  });
  it('после написанных дней идёт «продолжение следует»', () => {
    const last = content.balance.contentDays;
    expect(syncClock(content, day1(), at(9 + 24 * (last - 1))).demoOver).toBeUndefined();
    const s = syncClock(content, day1(), at(9 + 24 * last));
    expect(s.demoOver).toBe(true);
    expect(s.day).toBe(last);
    expect(draw(content, s).card).toBeNull();
  });
  it('одно зерно даёт одно и то же прохождение', () => {
    expect(day1().log).toEqual(day1().log);
  });
});

/** день 1 со сном, затем день 2 по частям суток до ночи включительно */
function day2(p1: Record<string, string> = {}, p2: Record<string, string> = {}, sleep = 'sleep'): GameState {
  let s = pick(day1(p1), 'K1-09', sleep);
  for (const h of [33, 37, 43, 47.5]) s = story(syncClock(content, s, at(h)), p2);
  return s;
}

describe('день 2', () => {
  const seen = (s: GameState) => Object.keys(s.seen);
  it('мама даёт номер утром, если ей рассказали, и вечером, если сказали «нормально»', () => {
    const told = day2({ 'K1-03': 'tell' });
    expect(seen(told)).toContain('K2-01a');
    expect(told.flags.d2_derm_slot.value).toBe('morning');
    const dark = day2({ 'K1-03': 'fine' });
    expect(seen(dark)).toEqual(expect.arrayContaining(['K2-01c', 'K2-06']));
    expect(seen(dark)).not.toContain('K2-01a');
    expect(dark.flags.d2_derm_slot.value).toBe('day');
    expect(dark.hints).toContain('derm_number_late');
  });
  it('пирожки: мама спрашивает, зеркало помнит', () => {
    const s = day2({ 'K1-03': 'complain', 'K1-04': 'five' });
    expect(seen(s)).toEqual(expect.arrayContaining(['K2-01b', 'K2-02a']));
  });
  it('проспал: записку тёти Зины не заметить', () => {
    const late = day2({}, { 'K2-03': 'shop' }, 'late');
    expect(seen(late)).toContain('K2-00');
    expect(late.hints).not.toContain('zina_note');
    expect(day2({}, { 'K2-03': 'shop' }).hints).toContain('zina_note');
  });
  it('чудо-чай: заказ из сохранённого поста, энергия ниже два следующих дня', () => {
    let s = day2({ 'K1-07a': 'save' }, { 'K2-05a': 'order' });
    expect(seen(s)).toContain('K2-05a');
    expect(s.flags.d2_tea).toBeDefined();
    s = syncClock(full, pick(s, 'K2-sleep', 'sleep', full), at(57));
    expect(s.energy).toBe(20 - 2);
    s = syncClock(full, s, at(81));
    expect(s.energy).toBe(10 - 2);
  });
  it('день кончается маминым «Кабинет не перепутай»', () => {
    const s = day2();
    expect(s.log.filter((l) => l.kind === 'story').at(-1)!.title).toBe('Мама');
    expect(seen(s).at(-1)).toBe('K2-09');
    expect(actionsFor(content, s).map((c) => c.id)).toContain('K2-sleep');
  });
});

/** days 1 and 2 with sleep, then day 3 part by part up to the night; `sleep2` is how day 2 ended */
function day3(p1: Record<string, string> = {}, p2: Record<string, string> = {}, p3: Record<string, string> = {}, sleep2 = 'sleep'): GameState {
  let s = pick(day2(p1, p2), 'K2-sleep', sleep2);
  for (const h of [57, 61, 67, 71.5]) s = story(syncClock(content, s, at(h)), p3);
  return s;
}

describe('день 3', () => {
  const seen = (s: GameState) => Object.keys(s.seen);
  const d3 = (s: GameState) => seen(s).filter((id) => id.startsWith('K3-'));
  const card = (id: string) => content.cards.find((c) => c.id === id)!;
  const skinRegress = content.problems.find((p) => p.id === 'skin')!.regress;
  /** quiet day 2: no tea, no run, mum does not name the office */
  const QUIET2 = { 'K2-04': 'later', 'K2-05a': 'delete', 'K2-09': 'ok' };
  /** the morning of day 3 after a quiet day 2 */
  const morning3 = (p1: Record<string, string> = {}, p2: Record<string, string> = QUIET2, sleep2 = 'sleep') =>
    syncClock(content, pick(day2(p1, p2), 'K2-sleep', sleep2), at(57));
  /** the same morning, already at the door card */
  const atDoor = (s: GameState) => pick(pick(s, 'K3-01', 'asis'), 'K3-02', 'smoke');

  it('on time: straight into office 12, and the door card depends on whether mum was asked', () => {
    const plain = day3({}, QUIET2);
    expect(d3(plain)).toEqual(expect.arrayContaining(['K3-01', 'K3-02', 'K3-03a', 'K3-05']));
    expect(d3(plain)).not.toContain('K3-04');
    expect(plain.flags.d3_door.value).toBe('12');
    const asked = day3({}, { ...QUIET2, 'K2-09': 'ask' });
    expect(d3(asked)).toContain('K3-03b');
    expect(d3(asked)).not.toContain('K3-03a');
    expect(card('K3-03b').text).toContain('Галина Петровна');
    expect(card('K3-03b').text).toContain('в соседнем какие-то акции');
    // arriving on time costs nothing
    const door = atDoor(morning3());
    expect(pick(door, 'K3-03a', 'office12').energy).toBe(door.energy);
  });
  it('late for the morning slot: the queue costs 3 energy as an effect, so the choice is always open', () => {
    const s = atDoor(morning3({}, QUIET2, 'late'));
    const open = drawStory(content, s);
    expect(open.card?.id).toBe('K3-03c');
    const queue = open.card!.choices.find((c) => c.id === 'office12')!;
    expect(queue.cost).toBeUndefined();
    expect(queue.label).toContain('−3 энергии');
    const after = pick(open.state, 'K3-03c', 'office12');
    expect(after.energy).toBe(s.energy - 3);
    expect(drawStory(content, after).card?.id).toBe('K3-05');
    // with no energy left the neutral choice still works
    expect(pick({ ...open.state, energy: 0 }, 'K3-03c', 'office12').energy).toBe(0);
    expect(d3(day3({}, { ...QUIET2, 'K2-09': 'ask' }, {}, 'late'))).toContain('K3-03d');
  });
  it('the 15:00 slot: the visit waits for the day part, and staying up late does not make him late', () => {
    let s = morning3({ 'K1-03': 'fine' }, QUIET2, 'late');
    expect(s.flags.d2_derm_slot.value).toBe('day');
    s = story(s, { 'K3-01': 'asis' });
    expect(d3(s)).toEqual(['K3-01']);                          // the morning has only the packing card
    s = story(syncClock(content, s, at(61)));
    expect(d3(s)).toEqual(['K3-01', 'K3-02', 'K3-03a', 'K3-05']);
  });
  it('a missing slot flag counts as the morning slot', () => {
    const s = morning3();
    delete s.flags.d2_derm_slot;
    expect(d3(story(s))).toEqual(expect.arrayContaining(['K3-03a', 'K3-05']));
  });
  it('office 12 starts the course: skin −3 on each of ten mornings, −12 by day 7', () => {
    const s = day3({}, QUIET2);
    expect(s.modifiers.find((m) => m.id === 'derm_course')).toMatchObject({ days: 10, daily: [{ problem: 'skin', add: -3 }] });
    expect(s.flags.d3_course).toBeDefined();
    expect(s.hints).toContain('derm_course');
    const slept = pick(s, 'K3-sleep', 'sleep', full);
    const on = (day: number) => syncClock(full, slept, at(9 + 24 * (day - 1)));
    // days 4–6 are skipped here, so each of them also adds the skin regress at its end
    expect(on(4).problems.skin).toBe(slept.problems.skin - 3);
    expect(on(7).problems.skin).toBe(slept.problems.skin - 12 + 3 * skinRegress);
    expect(on(13).modifiers.some((m) => m.id === 'derm_course')).toBe(true);    // the tenth morning
    expect(on(14).modifiers.some((m) => m.id === 'derm_course')).toBe(false);
  });
  it('the doctor answers about the patches only when they are in the bag', () => {
    const ids = (s: GameState) => choicesFor(content, s, card('K3-05')).map((x) => x.choice.id);
    const s = day3({}, QUIET2);
    expect(s.items.acne_patch).toBe(1);
    expect(ids(s)).toEqual(['take', 'patch']);
    expect(ids({ ...s, items: {} })).toEqual(['take']);
    const door = pick(atDoor(morning3()), 'K3-03a', 'office12');
    expect(pick(door, 'K3-05', 'patch').modifiers.map((m) => m.id)).toContain('derm_course');
  });
  it('12А: leaving costs no coins and still leads to the doctor through the queue', () => {
    const s = pick(atDoor(morning3()), 'K3-03a', 'office12a');
    expect(drawStory(content, s).card?.id).toBe('K3-04');
    const left = pick(s, 'K3-04', 'leave');
    expect(left.coins).toBe(s.coins);
    expect(left.energy).toBe(s.energy - 3);
    expect(left.problems.skin).toBe(s.problems.skin);
    expect(drawStory(content, left).card?.id).toBe('K3-05');
    expect(pick(left, 'K3-05', 'take').modifiers.map((m) => m.id)).toContain('derm_course');
  });
  it('12А: the cleaning shows its odds in words, costs 40 coins, and the irritation lasts two days', () => {
    const clean = card('K3-04').choices.find((c) => c.id === 'clean')!;
    expect(clean.cost).toEqual({ coins: 40 });
    const results = new Set<string>();
    for (let seed = 1; seed <= 40 && results.size < 2; seed++) {
      const s = pick(atDoor({ ...morning3({}, QUIET2, 'late'), seed }), 'K3-03c', 'office12a');
      expect(oddsFor(content, s, clean)).toEqual([{ word: 'часто', hint: 'раздражение на два дня' }, { word: 'иногда', hint: 'ничего' }]);
      const done = pick(s, 'K3-04', 'clean');
      const result = done.flags.d3_cleaning.value as string;
      if (results.has(result)) continue;
      results.add(result);
      const rash = result === 'bad' ? 6 : 0;
      expect(done.coins).toBe(s.coins - 40);
      expect(done.energy).toBe(s.energy - 3);
      expect(done.problems.skin).toBe(s.problems.skin + rash);
      // the doctor is still reached, and the course starts either way
      const treated = pick(done, 'K3-05', 'take', full);
      expect(treated.modifiers.map((m) => m.id)).toContain('derm_course');
      const slept = pick(syncClock(full, treated, at(71.5)), 'K3-sleep', 'sleep', full);
      const day4 = syncClock(full, slept, at(81)).problems.skin;
      expect(day4).toBe(slept.problems.skin - 3);              // still irritated, the course has begun
      expect(syncClock(full, slept, at(105)).problems.skin).toBe(day4 + skinRegress - 3 - rash);   // gone by the morning of day 5
    }
    expect([...results].sort()).toEqual(['bad', 'none']);
  });
  it('the photo card needs two useful actions over days 1–3, in every combination', () => {
    const requires = card('K3-06').when!.requires!;
    const base = syncClock(content, morning3(), at(67));
    for (const run of [false, true]) for (const clean of [false, true]) for (const useful of [0, 1, 2, 3]) {
      const s: GameState = structuredClone(base);
      delete s.flags.d1_run; delete s.flags.d1_clean;
      if (run) s.flags.d1_run = { value: true, day: 1 };
      if (clean) s.flags.d1_clean = { value: true, day: 1 };
      s.counters.useful = useful;
      const offered = requires.every((x) => check(content, s, x));
      expect(offered, `run ${run}, clean ${clean}, useful ${useful}`).toBe(Number(run) + Number(clean) + useful >= 2);
    }
    // a missing counter is zero
    const none: GameState = structuredClone(base);
    delete none.counters.useful;
    expect(requires.every((x) => check(content, none, x))).toBe(false);
  });
  it('the doctor visit counts as a useful action, and one more on day 3 brings the photo card', () => {
    let s = story(syncClock(content, story(morning3(), { 'K3-01': 'asis' }), at(67)));
    expect(s.counters.useful).toBe(1);                         // the visit to office 12 alone
    expect(drawStory(content, s).card).toBeNull();             // one action is not enough
    s = pick(s, 'A3-clean', 'go');
    expect(s.counters.useful).toBe(2);
    expect(drawStory(content, s).card?.id).toBe('K3-06');
  });
  it('photo posted: the like arrives at night with its reason, as a notification and not her words', () => {
    const P2 = { ...QUIET2, 'K2-04': 'park' };
    const P3 = { 'K3-01': 'neat', 'K3-06': 'post' };
    const s = day3({}, P2, P3);
    expect(s.flags.d3_posted).toBeDefined();
    expect(d3(s).at(-1)).toBe('K3-07');
    expect(d3(s)).not.toContain('K3-08');
    expect(s.lastChange).toEqual({ delta: 5, why: 'Алина лайкнула твоё фото' });
    expect(s.flags.d3_alina_liked).toBeDefined();
    expect(s.chat.at(-1)).toMatchObject({ day: 3, from: 'crush', status: true });
    expect(content.chat.status_liked_photo).toHaveLength(10);
    expect(s.chat.filter((m) => m.day === 3 && m.from === 'hero')).toEqual([]);
    expect(s.rumors.map((r) => r.id)).toContain('my_photo');
    // Vitya's comment follows the Day 1 chat choice
    const comment = (k: string) => day3({ 'K1-01': k }, P2, P3).log.find((l) => l.day === 3 && l.title === 'Фото')!.text;
    expect(comment('coming')).toContain('верю, что придёшь');
    expect(comment('joke')).toContain('пролезаешь');
    expect(comment('lurk')).toContain('в чате молчишь');
  });
  it('no photo: the day ends on Aunt Zina, with a different line if the note was seen', () => {
    const few = day3({}, QUIET2, { 'K3-01': 'asis' });
    expect(d3(few)).not.toContain('K3-06');
    expect(d3(few).at(-1)).toBe('K3-08');
    expect(few.affinity).toBe(day2({}, QUIET2).affinity);
    const line = (s: GameState) => s.log.find((l) => l.day === 3 && l.title === 'Тётя Зина')!.text;
    expect(few.flags.d2_saw_note).toBeDefined();               // default Day 2 goes to the shop and sees the note
    expect(line(few)).toContain('записка');
    expect(line(day3({}, { ...QUIET2, 'K2-03': 'home' }, { 'K3-01': 'asis' }))).toContain('Ну-ну');
    expect(choicesFor(content, { ...few, flags: {} }, card('K3-08')).map((x) => x.choice.id)).toEqual(['hello']);
    // offered and declined: still Aunt Zina, no like
    const kept = day3({}, { ...QUIET2, 'K2-04': 'park' }, { 'K3-01': 'neat', 'K3-06': 'keep' });
    expect(d3(kept).slice(-2)).toEqual(['K3-06', 'K3-08']);
    expect(kept.flags.d3_alina_liked).toBeUndefined();
    // she does not hand out the Day 5 cream yet
    expect(kept.items.cream_zina).toBeUndefined();
    expect(kept.hints.filter((h) => h.includes('cream'))).toEqual([]);
    expect(actionsFor(content, kept).map((c) => c.id)).toContain('K3-sleep');
  });
  it('smoking goes through care and the smoke_free counter', () => {
    const porch = (p1: Record<string, string>) => {
      const s = pick(morning3(p1), 'K3-01', 'asis');
      expect(drawStory(content, s).card?.id).toBe('K3-02');
      return s;
    };
    const quit = porch({ 'K1-06': 'quit' });
    expect(quit.counters.smoke_free).toBe(1);
    const smoked = pick(quit, 'K3-02', 'smoke');
    expect(smoked.counters.smoke_free).toBe(0);
    expect(smoked.problems.care).toBe(quit.problems.care + 2);
    const held = pick(quit, 'K3-02', 'hold');
    expect(held.counters.smoke_free).toBe(3);                  // days 1, 2 and 3
    expect(held.problems.care).toBe(quit.problems.care - 2);
    expect(held.energy).toBe(quit.energy - 1);
    const smoker = porch({ 'K1-06': 'smoke' });
    const gum = pick(smoker, 'K3-02', 'gum');
    expect(gum.counters.smoke_free).toBe(1);                   // the first smoke-free day
    expect(gum.items.gum).toBe(0);
    expect(gum.energy).toBe(smoker.energy);
    expect(choicesFor(content, gum, card('K3-02')).map((x) => x.choice.id)).toEqual(['smoke', 'hold']);
  });
  it('morning lines explain the tea and the gym pass without charging twice', () => {
    const tea = morning3({}, { ...QUIET2, 'K2-05a': 'order' });
    expect(tea.energy).toBe(20 - 2);
    expect(drawStory(content, tea).card?.id).toBe('K3-00a');
    expect(pick(tea, 'K3-00a', 'ok').energy).toBe(20 - 2);
    expect(d3(day3({}, QUIET2))).not.toContain('K3-00a');
    // the pass bought in the Day 2 card
    const rich = { ...syncClock(content, story(syncClock(content, pick(day1(), 'K1-09', 'sleep'), at(33))), at(37)), coins: 500 };
    const gym = syncClock(content, pick(syncClock(content, pick(rich, 'K2-04', 'gym'), at(47.5)), 'K2-sleep', 'sleep'), at(57));
    expect(gym.energy).toBe(22);
    expect(drawStory(content, gym).card?.id).toBe('K3-00b');
    expect(pick(gym, 'K3-00b', 'ok').energy).toBe(22);
    // bought in the shop and applied on an earlier day: the same line; still in the bag: no line
    const quiet = morning3();
    const bought: GameState = { ...quiet, flags: { ...quiet.flags, bought_gym_pass: { value: true, day: 1 } } };
    expect(drawStory(content, quiet).card?.id).toBe('K3-01');
    expect(drawStory(content, bought).card?.id).toBe('K3-00b');
    expect(drawStory(content, { ...bought, items: { ...quiet.items, gym_pass: 1 } }).card?.id).toBe('K3-01');
  });
  it('plus actions and sleep: staying up costs four energy on the first half-energy day', () => {
    const s = day3({}, QUIET2);
    expect(actionsFor(content, s).map((c) => c.id)).toEqual(['A3-run', 'A3-clean', 'A3-teeth', 'A3-couch', 'K3-sleep']);
    const late = syncClock(full, pick(s, 'K3-sleep', 'late', full), at(81));
    expect(late.flags.d3_late).toBeDefined();
    expect(late.energy).toBe(10 - 4);
    expect(content.days.find((d) => d.day === 3)!.teaser).toBe('Завтра сил будет вдвое меньше');
  });
  it('day 3 closes with its frame and gift, and the demo goes on to day 4', () => {
    const s = syncClock(content, pick(day3({}, QUIET2), 'K3-sleep', 'sleep'), at(81));
    expect(s.demoOver).toBeUndefined();
    expect(s.day).toBe(4);
    expect(s.summaries.map((d) => [d.day, d.played])).toEqual([[1, true], [2, true], [3, true]]);
    expect(s.summaries[2].gift).toBe('floss');
    expect(s.items.floss).toBe(1);
  });
  it('a fully skipped Day 3 after played days 1–2: office 12, the course started, nothing posted or spent', () => {
    for (const p1 of [{}, { 'K1-03': 'fine' }] as Record<string, string>[]) for (const sleep2 of ['sleep', 'late']) {
      const before = pick(day2(p1, { ...QUIET2, 'K2-04': 'park' }), 'K2-sleep', sleep2, full);
      before.counters.useful = 2;                              // the photo card is on offer
      const s = syncClock(full, before, at(81));
      const where = `${JSON.stringify(p1)} ${sleep2}`;
      expect(s.day, where).toBe(4);
      expect(s.flags.d3_door.value, where).toBe('12');
      expect(d3(s), where).toEqual(expect.arrayContaining(['K3-01', 'K3-02', 'K3-05', 'K3-06', 'K3-08']));
      expect(d3(s), where).not.toContain('K3-04');
      expect(d3(s), where).not.toContain('K3-07');
      expect(s.modifiers.map((m) => m.id), where).toContain('derm_course');
      expect(s.problems.skin, where).toBe(before.problems.skin + skinRegress - 3);
      expect(s.flags.d3_posted, where).toBeUndefined();
      expect(s.affinity, where).toBe(before.affinity);
      expect(s.coins, where).toBe(before.coins);
      expect(s.chat.filter((m) => m.day === 3), where).toEqual([]);
      expect(s.counters.smoke_free ?? 0, where).toBe(0);
      expect(s.summaries[2], where).toMatchObject({ day: 3, played: false, coins: 0 });
      expect(s.history.some((h) => h.day === 3), where).toBe(false);
      // «Пока тебя не было» lists the day's cards in order, each with its neutral outcome
      const missed = s.missed!.at(-1)!;
      expect(missed.day, where).toBe(3);
      expect(missed.items.map((i) => i.title), where).toEqual(['Сборы', 'Крыльцо поликлиники', 'Третий этаж', 'Кабинет 12', 'Фото', 'Тётя Зина']);
      expect(missed.items.find((i) => i.title === 'Кабинет 12')!.text, where).toContain('Курс начат');
      expect(missed.items.find((i) => i.title === 'Фото')!.text, where).toBe('Фото осталось в телефоне.');
    }
  });
});

describe('день 4', () => {
  const seen = (s: GameState) => Object.keys(s.seen);
  const d4 = (s: GameState) => seen(s).filter((id) => id.startsWith('K4-'));
  const card = (id: string) => content.cards.find((c) => c.id === id)!;
  const ids = (s: GameState, id: string) => choicesFor(content, s, card(id)).map((x) => x.choice.id);
  const open = (s: GameState, id: string) => choicesFor(content, s, card(id)).filter((x) => x.affordable).map((x) => x.choice.id);
  /** quiet days 2 and 3: no tea, no pass, no photo; Andrey smokes on the porch */
  const Q2 = { 'K2-04': 'later', 'K2-05a': 'delete', 'K2-09': 'ok' };
  const Q3 = { 'K3-01': 'asis', 'K3-02': 'smoke' };
  const morning4 = (p1: Record<string, string> = {}, p2: Record<string, string> = Q2, p3: Record<string, string> = Q3, sleep3 = 'sleep') =>
    syncClock(content, pick(day3(p1, p2, p3), 'K3-sleep', sleep3), at(81));
  /** day 4 played through the morning and the day part, standing at the start of the evening */
  const evening4 = (p4: Record<string, string>, p1: Record<string, string> = {}, p3: Record<string, string> = Q3) => {
    const s = story(syncClock(content, story(morning4(p1, Q2, p3), p4), at(85)), p4);
    return syncClock(content, s, at(91));
  };
  const night4 = (s: GameState, p4: Record<string, string> = {}) => story(syncClock(content, story(s, p4), at(95.5)), p4);
  const QUIT = { 'K1-06': 'quit' };
  const HALF = { 'K1-06': 'half' };
  const PIES = { 'K1-03': 'complain', 'K1-04': 'one' };

  it('morning energy: 10, and the tea and the late night stack down to 4 with a line for each', () => {
    for (const tea of [false, true]) for (const late of [false, true]) {
      const where = `tea ${tea}, late ${late}`;
      const s = morning4({}, { ...Q2, 'K2-05a': tea ? 'order' : 'delete' }, Q3, late ? 'late' : 'sleep');
      const energy = 10 - (tea ? 2 : 0) - (late ? 4 : 0);
      expect(s.energy, where).toBe(energy);
      expect(drawStory(content, s).card?.id, where).toBe('K4-00');     // the halved energy is said first
      const after = story(s);
      expect(d4(after), where).toEqual(['K4-00', ...(tea ? ['K4-00a'] : []), ...(late ? ['K4-00b'] : []), 'K4-01a']);
      expect(after.energy, where).toBe(energy);                         // the lines charge nothing
      // the tea is over on day 5: its second and last day was day 4
      const next = syncClock(full, pick(night4(syncClock(content, after, at(91)), { 'K4-02': 'home' }), 'K4-sleep', 'sleep', full), at(105));
      expect(next.energy, where).toBe(10);
    }
    expect(card('K4-00').text).toContain('вдвое меньше');
  });
  it('the gym pass line: +2 energy in the morning, shown only when the pass is running', () => {
    const quiet = pick(morning4(), 'K4-00', 'ok');
    expect(drawStory(content, quiet).card?.id).toBe('K4-01a');
    const bought: GameState = { ...quiet, flags: { ...quiet.flags, bought_gym_pass: { value: true, day: 2 } } };
    expect(drawStory(content, bought).card?.id).toBe('K4-00c');
    expect(drawStory(content, { ...bought, items: { ...quiet.items, gym_pass: 1 } }).card?.id).toBe('K4-01a');
    // bought in the Day 2 card: 10 + 2 on the morning of day 4
    const rich = { ...syncClock(content, story(syncClock(content, pick(day1(), 'K1-09', 'sleep'), at(33))), at(37)), coins: 500 };
    let s = pick(story(syncClock(content, story(pick(rich, 'K2-04', 'gym'), Q2), at(47.5)), Q2), 'K2-sleep', 'sleep');
    for (const h of [57, 61, 67, 71.5]) s = story(syncClock(content, s, at(h)), Q3);
    s = syncClock(content, pick(s, 'K3-sleep', 'sleep'), at(81));
    expect(s.energy).toBe(12);
    expect(d4(story(s))).toContain('K4-00c');
    expect(actionsFor(content, syncClock(content, story(s), at(85))).map((c) => c.id)).toContain('A4-gym');
  });
  it('the mirror: the course worked its first morning, and the promo cleaning shows for the second day', () => {
    const s = pick(morning4(), 'K4-00', 'ok');
    expect(card('K4-01a').text).toContain('Мазь щиплет');
    const red: GameState = { ...s, flags: { ...s.flags, d3_cleaning: { value: 'bad', day: 3 } } };
    expect(drawStory(content, red).card?.id).toBe('K4-01b');
    expect(drawStory(content, pick(red, 'K4-01b', 'ok')).card).toBeNull();
    // skin −3 from the course on this first morning
    const before = pick(day3({}, Q2, Q3), 'K3-sleep', 'sleep');
    expect(morning4().problems.skin).toBe(before.problems.skin - 3);
  });
  it('the barbecue fork: going brings the meat and the cigarette, staying home brings a quiet evening', () => {
    const invite = syncClock(content, story(morning4()), at(85));
    expect(drawStory(content, invite).card?.id).toBe('K4-02');
    expect(card('K4-02').choices.find((ch) => ch.neutral)!.id).toBe('home');
    const went = story(evening4({ 'K4-02': 'go' }), { 'K4-03c': 'feast', 'K4-04a': 'smoke' });
    expect(d4(went).slice(-3)).toEqual(['K4-02', 'K4-03c', 'K4-04a']);
    expect(went.flags.d4_went).toBeDefined();
    const home = story(evening4({ 'K4-02': 'home' }), { 'K4-06': 'calm', 'K4-07a': 'smoke' });
    expect(d4(home).slice(-3)).toEqual(['K4-02', 'K4-06', 'K4-07a']);
    expect(home.flags.d4_home).toBeDefined();
    expect(home.flags.d4_went).toBeUndefined();
  });
  it('Vitya greets by what Andrey did earlier: the photo, the door joke, or neither', () => {
    const s = evening4({ 'K4-02': 'go' });
    expect(drawStory(content, s).card?.id).toBe('K4-03c');
    const flagged = (...names: string[]): GameState => ({ ...s, flags: { ...s.flags, ...Object.fromEntries(names.map((n) => [n, { value: true, day: 1 }])) } });
    expect(drawStory(content, flagged('d1_joked')).card?.id).toBe('K4-03b');
    expect(card('K4-03b').text).toContain('«Ну что, в дверь пролез?»');
    expect(drawStory(content, flagged('d3_posted')).card?.id).toBe('K4-03a');
    expect(drawStory(content, flagged('d3_posted', 'd1_joked')).card?.id).toBe('K4-03a');
    expect(card('K4-03a').text).toContain('«Модель наша пришла!»');
    // one greeting only: after the meat card the next one is the cigarette
    expect(drawStory(content, pick(flagged('d1_joked'), 'K4-03b', 'feast')).card?.id).toBe('K4-04a');
  });
  it('willpower costs energy: without it only giving in is open, and the card still has a way out', () => {
    const meat = evening4({ 'K4-02': 'go' });
    const broke: GameState = { ...meat, energy: 1 };
    expect(ids(broke, 'K4-03c')).toEqual(['hold', 'feast']);            // the paid choice stays visible with its price
    expect(open(broke, 'K4-03c')).toEqual(['feast']);
    expect(() => choose(content, broke, 'K4-03c', 'hold')).toThrow();
    const fed = pick(broke, 'K4-03c', 'feast');
    expect(fed.energy).toBe(1);
    expect(fed.problems.weight).toBe(broke.problems.weight + 2);
    // the cigarette on the same empty tank: the gift gum is the only free way to hold out
    expect(drawStory(content, fed).card?.id).toBe('K4-04a');
    expect(open(fed, 'K4-04a')).toEqual(['gum', 'smoke']);
    expect(open({ ...fed, items: { ...fed.items, gum: 0 } }, 'K4-04a')).toEqual(['smoke']);
    // with enough energy both are open and the price is taken
    const held = pick({ ...meat, energy: 4 }, 'K4-03c', 'hold');
    expect(held.energy).toBe(2);
    expect(held.problems.weight).toBe(meat.problems.weight);
    expect(held.flags.d4_meat_held).toBeDefined();
    expect(open(held, 'K4-04a')).toEqual(['hold', 'gum', 'smoke']);
    expect(pick(held, 'K4-04a', 'hold').energy).toBe(0);
    // every temptation: resisting costs energy, giving in is the free neutral choice
    for (const id of ['K4-03a', 'K4-03b', 'K4-03c', 'K4-04a', 'K4-04b', 'K4-05', 'K4-07a', 'K4-07b']) {
      const c = card(id);
      expect(c.choices.find((ch) => ch.id === 'hold')!.cost?.energy, id).toBeGreaterThan(0);
      const neutral = c.choices.find((ch) => ch.neutral)!;
      expect(['feast', 'smoke', 'eat'], id).toContain(neutral.id);
      expect(neutral.cost, id).toBeUndefined();
    }
  });
  it('a clean day does not fit into 10 energy', () => {
    const cost = (id: string, choice: string) => card(id).choices.find((ch) => ch.id === choice)!.cost!.energy!;
    const clean = cost('A4-run', 'go') + cost('A-job', 'go') + cost('K4-03c', 'hold') + cost('K4-04a', 'hold');
    expect(clean).toBe(12);
    expect(clean).toBeGreaterThan(dayEnergy(content, start(), 4));
  });
  it('the craving follows smoke_free: ordinary at 0, strong from 1, and the quarter only after the Day 1 half', () => {
    const atCraving = (p1: Record<string, string>, p3: Record<string, string>) => pick(evening4({ 'K4-02': 'go' }, p1, p3), 'K4-03c', 'feast');
    // counter 0: ordinary, 2 energy, one step of confidence
    const smoker = atCraving({}, Q3);
    expect(smoker.counters.smoke_free ?? 0).toBe(0);
    expect(drawStory(content, smoker).card?.id).toBe('K4-04a');
    expect(ids(smoker, 'K4-04a')).toEqual(['hold', 'gum', 'smoke']);
    const h0 = pick(smoker, 'K4-04a', 'hold');
    expect([smoker.energy - h0.energy, smoker.problems.conf - h0.problems.conf, smoker.problems.care - h0.problems.care]).toEqual([2, 1, 2]);
    // counter 1 and counter 3: strong, 3 energy, double the confidence
    for (const [p1, n] of [[{}, 1], [QUIT, 3]] as [Record<string, string>, number][]) {
      const s = atCraving(p1, { ...Q3, 'K3-02': 'hold' });
      expect(s.counters.smoke_free).toBe(n);
      expect(drawStory(content, s).card?.id).toBe('K4-04b');
      const h = pick(s, 'K4-04b', 'hold');
      expect([s.energy - h.energy, s.problems.conf - h.problems.conf, s.problems.care - h.problems.care], `counter ${n}`).toEqual([3, 2, 2]);
      expect(h.log.at(-1)!.text, `counter ${n}`).toContain(n === 3 ? 'Четвёртый день без табака' : 'Второй день без табака');
    }
    // the Day 1 half-measure: a quarter for 1 energy with half the damage; it is still a cigarette
    const half = atCraving(HALF, { ...Q3, 'K3-02': 'hold' });
    expect(ids(half, 'K4-04b')).toEqual(['hold', 'quarter', 'gum', 'smoke']);
    const q = pick(half, 'K4-04b', 'quarter');
    expect([half.energy - q.energy, q.problems.care - half.problems.care, q.counters.smoke_free]).toEqual([1, 1, 0]);
    expect(pick(half, 'K4-04b', 'smoke').problems.care - half.problems.care).toBe(2);
    expect(q.flags.d4_quarter).toBeDefined();
  });
  it('smoke_free is right after every smoking path, at the barbecue and at home, and the craving comes once', () => {
    for (const place of ['bbq', 'home'] as const) for (const [p1, p3, n] of [[{}, Q3, 0], [HALF, { ...Q3, 'K3-02': 'hold' }, 1], [QUIT, { ...Q3, 'K3-02': 'hold' }, 3]] as [Record<string, string>, Record<string, string>, number][]) {
      const evening = evening4({ 'K4-02': place === 'bbq' ? 'go' : 'home' }, p1, p3);
      const s = place === 'bbq' ? pick(evening, 'K4-03c', 'hold') : pick(evening, 'K4-06', 'calm');
      const id = `K4-0${place === 'bbq' ? 4 : 7}${n === 0 ? 'a' : 'b'}`;
      const where = `${place}, counter ${n}`;
      expect(drawStory(content, s).card?.id, where).toBe(id);
      expect(s.counters.smoke_free ?? 0, where).toBe(n);
      const after = { smoke: 0, hold: n + 1, gum: n + 1, ...(p1 === HALF ? { quarter: 0 } : {}) };
      for (const [choice, counter] of Object.entries(after)) {
        const r = pick(s, id, choice);
        expect(r.counters.smoke_free, `${where}, ${choice}`).toBe(counter);
        expect(r.problems.care - s.problems.care, `${where}, ${choice}`).toBe(({ smoke: 2, hold: -2, gum: -2, quarter: 1 } as Record<string, number>)[choice]);
        // the other strength of the same card must not follow once the counter has moved
        expect(drawStory(content, r).card, `${where}, ${choice}`).toBeNull();
        expect(Object.keys(r.flags).filter((f) => ['d4_smoked', 'd4_no_smoke', 'd4_quarter'].includes(f)), `${where}, ${choice}`).toHaveLength(1);
      }
      expect(pick(s, id, 'gum').items.gum, where).toBe(0);
      expect(card(id).choices.find((ch) => ch.neutral)!.id, where).toBe('smoke');
    }
  });
  it('stayed home: the pies call if there are any, otherwise mum does, and her call punishes nothing', () => {
    const pies = evening4({ 'K4-02': 'home' }, PIES);
    expect(drawStory(content, pies).card?.id).toBe('K4-05');
    const ate = pick(pies, 'K4-05', 'eat');
    expect(ate.problems.weight).toBe(pies.problems.weight + 2);
    expect(ate.energy).toBe(pies.energy);
    const held = pick(pies, 'K4-05', 'hold');
    expect([pies.energy - held.energy, held.problems.weight - pies.problems.weight]).toEqual([2, 0]);
    expect(open({ ...pies, energy: 1 }, 'K4-05')).toEqual(['eat']);
    expect(drawStory(content, held).card?.id).toBe('K4-07a');           // then the balcony
    expect(d4(story(held))).not.toContain('K4-06');

    const quiet = evening4({ 'K4-02': 'home' });
    expect(drawStory(content, quiet).card?.id).toBe('K4-06');
    for (const choice of ['talk', 'calm']) {
      const r = pick(quiet, 'K4-06', choice);
      for (const p of Object.keys(quiet.problems)) expect(r.problems[p], `${choice} ${p}`).toBeLessThanOrEqual(quiet.problems[p]);
      expect(r.energy).toBe(quiet.energy);
      expect(r.affinity).toBe(quiet.affinity);
    }
    expect(d4(story(quiet))).not.toContain('K4-05');
  });
  it('the day ends on Vitya’s photos, and Alina reacts to the photo: three outcomes', () => {
    // in the frame with one skewer: a notification, +3, below the +5 of the first like
    const held = night4(evening4({ 'K4-02': 'go' }), { 'K4-03c': 'hold', 'K4-04a': 'smoke' });
    expect(d4(held).at(-1)).toBe('K4-08a');
    expect(held.affinity).toBe(3);
    expect(held.lastChange).toEqual({ delta: 3, why: 'Алина отметила фото с шашлыков' });
    const msg = held.chat.at(-1)!;
    expect(msg).toMatchObject({ day: 4, from: 'crush', status: true });
    expect(content.chat.status_bbq_photo).toContain(msg.text);
    expect(content.chat.status_bbq_photo).toHaveLength(10);
    expect(held.flags.d4_alina_reacted).toBeDefined();
    expect(held.rumors.map((r) => r.id)).toContain('bbq_held');
    // five skewers: Vitya jokes, she is silent
    const feast = night4(evening4({ 'K4-02': 'go' }), { 'K4-03c': 'feast', 'K4-04a': 'smoke', 'K4-08b': 'ok' });
    expect(d4(feast).at(-1)).toBe('K4-08b');
    expect(card('K4-08b').text).toContain('пять шампуров');
    expect(feast.affinity).toBe(0);
    expect(feast.chat.filter((m) => m.day === 4)).toEqual([]);
    expect(feast.flags.d4_alina_reacted).toBeUndefined();
    // not there: her fire goes to Vitya's photo; a sting, no loss
    const away = night4(evening4({ 'K4-02': 'home' }), { 'K4-06': 'calm', 'K4-07a': 'smoke', 'K4-08c': 'ok' });
    expect(d4(away).at(-1)).toBe('K4-08c');
    expect(card('K4-08c').text).toContain('огонёк');
    expect(away.affinity).toBe(0);
    expect(away.chat.filter((m) => m.day === 4)).toEqual([]);
    expect(away.log.filter((l) => l.kind === 'story').at(-1)!.title).toBe('Чат класса');
    // the second like in two days gets its own line
    const liked: GameState = { ...syncClock(content, story(evening4({ 'K4-02': 'go' }), { 'K4-03c': 'hold', 'K4-04a': 'smoke' }), at(95.5)) };
    liked.flags = { ...liked.flags, d3_alina_liked: { value: true, day: 3 } };
    expect(choose(content, liked, 'K4-08a', 'ok').outcome.text).toContain('Второе за два дня');
  });
  it('plus actions and sleep: the run remembers the park, the gym needs the pass, staying up costs four', () => {
    const s = night4(evening4({ 'K4-02': 'home' }), { 'K4-06': 'calm', 'K4-07a': 'smoke', 'K4-08c': 'ok' });
    expect(actionsFor(content, s).map((c) => c.id)).toEqual(['A4-run', 'A4-clean', 'A4-teeth', 'A4-couch', 'K4-sleep']);
    const day = syncClock(content, story(morning4()), at(85));
    expect(actionsFor(content, day).map((c) => c.id)).toEqual(['A4-run', 'A4-clean', 'A4-teeth', 'A4-couch', 'A-job']);
    const ran = choose(content, { ...day, flags: { ...day.flags, d2_park: { value: true, day: 2 } } }, 'A4-run', 'go');
    expect(ran.outcome.text).toMatch(/[Зз]наком/);
    expect(ran.state.counters.useful).toBe((day.counters.useful ?? 0) + 1);
    expect(oddsFor(content, day, card('A4-run').choices[0]).map((o) => o.word)).toEqual(['часто', 'иногда']);
    const late = syncClock(full, pick(s, 'K4-sleep', 'late', full), at(105));
    expect(late.flags.d4_late).toBeDefined();
    expect(late.energy).toBe(10 - 4);
  });
  it('day 4 closes with its frame and gift, and the demo goes on to day 5', () => {
    const played = night4(evening4({ 'K4-02': 'home' }), { 'K4-06': 'calm', 'K4-07a': 'smoke', 'K4-08c': 'ok' });
    const s = syncClock(content, pick(played, 'K4-sleep', 'sleep'), at(105));
    expect(s.demoOver).toBeUndefined();
    expect(s.day).toBe(5);
    expect(s.summaries.map((d) => [d.day, d.played])).toEqual([[1, true], [2, true], [3, true], [4, true]]);
    expect(s.summaries[3].gift).toBe('gum');
    expect(content.days.find((d) => d.day === 4)).toMatchObject({ title: 'Обычная энергия', teaser: 'Завтра: соседка тётя Зина просит помочь' });
  });
  it('a fully skipped Day 4 after played days 1–3: stayed home, smoked as usual, ate the pies if any, nothing sent or spent', () => {
    for (const [p1, pies] of [[{}, false], [PIES, true]] as [Record<string, string>, boolean][]) for (const sleep3 of ['sleep', 'late']) {
      const where = `pies ${pies}, ${sleep3}`;
      const before = pick(day3(p1, { ...Q2, 'K2-05a': 'order' }, { ...Q3, 'K3-02': 'hold' }), 'K3-sleep', sleep3, full);
      expect(before.counters.smoke_free, where).toBe(1);
      const s = syncClock(full, before, at(105));
      expect(s.day, where).toBe(5);
      expect(d4(s), where).toEqual(['K4-00', 'K4-00a', ...(sleep3 === 'late' ? ['K4-00b'] : []), 'K4-01a', 'K4-02', pies ? 'K4-05' : 'K4-06', 'K4-07b', 'K4-08c']);
      expect(s.flags.d4_home, where).toBeDefined();
      expect(s.flags.d4_went, where).toBeUndefined();
      expect(s.flags.d4_smoked, where).toBeDefined();
      expect(s.counters.smoke_free, where).toBe(0);
      expect(!!s.flags.d4_ate_pies, where).toBe(pies);
      expect(s.affinity, where).toBe(before.affinity);
      expect(s.coins, where).toBe(before.coins);
      expect(s.chat.filter((m) => m.day === 4), where).toEqual([]);
      expect(s.rumors.map((r) => r.id), where).toContain('bbq_away');
      expect(s.summaries[3], where).toMatchObject({ day: 4, played: false, coins: 0 });
      expect(s.history.some((h) => h.day === 4), where).toBe(false);
      const missed = s.missed!.at(-1)!;
      expect(missed.day, where).toBe(4);
      expect(missed.items.map((i) => i.title), where).toEqual([
        'Обычная энергия', 'Чай действует', ...(sleep3 === 'late' ? ['Проспал'] : []), 'Зеркало', 'Шашлыки у Вити',
        pies ? 'Пирожки в холодильнике' : 'Звонок мамы', 'Балкон', 'Чат класса',
      ]);
      expect(missed.items.at(-1)!.text, where).toContain('в кадр не попал');
      // the same skip after a smoking Day 3: a fourth, unplayed frame, and the demo goes on to day 5
      const end = syncClock(content, pick(day3(p1, Q2, Q3), 'K3-sleep', sleep3), at(105));
      expect(end.demoOver, where).toBeUndefined();
      expect(end.day, where).toBe(5);
      expect(end.summaries.map((d) => d.played), where).toEqual([true, true, true, false]);
      expect(end.counters.smoke_free ?? 0, where).toBe(0);
    }
  });
});

/** days 1–3 with sleep, then day 4 part by part up to the night; `sleep3` is how day 3 ended */
function day4(p1: Record<string, string> = {}, p2: Record<string, string> = {}, p3: Record<string, string> = {}, p4: Record<string, string> = {}, sleep3 = 'sleep'): GameState {
  let s = pick(day3(p1, p2, p3), 'K3-sleep', sleep3);
  for (const h of [81, 85, 91, 95.5]) s = story(syncClock(content, s, at(h)), p4);
  return s;
}

describe('день 5', () => {
  const d5 = (s: GameState) => Object.keys(s.seen).filter((id) => id.startsWith('K5-'));
  const card = (id: string) => content.cards.find((c) => c.id === id)!;
  const ids = (s: GameState, id: string) => choicesFor(content, s, card(id)).map((x) => x.choice.id);
  const open = (s: GameState, id: string) => choicesFor(content, s, card(id)).filter((x) => x.affordable).map((x) => x.choice.id);
  const next = (s: GameState) => drawStory(content, s).card?.id;
  /** quiet days 2–4: no tea, no pass, no photo, stayed home and smoked */
  const Q2 = { 'K2-04': 'later', 'K2-05a': 'delete', 'K2-09': 'ok' };
  const Q3 = { 'K3-01': 'asis', 'K3-02': 'smoke' };
  const Q4 = { 'K4-02': 'home', 'K4-06': 'calm', 'K4-07a': 'smoke', 'K4-08c': 'ok' };
  type Patch = { on?: Record<string, string | boolean>; off?: string[]; counters?: Record<string, number>; items?: Record<string, number>; energy?: number; coins?: number };
  /** the same state with flags of earlier days switched, so one played week covers every branch */
  const patch = (s: GameState, p: Patch): GameState => {
    const flags = { ...s.flags };
    for (const f of p.off ?? []) delete flags[f];
    for (const [k, value] of Object.entries(p.on ?? {})) flags[k] = { value, day: Number(k[1]) };
    return { ...s, flags, counters: { ...s.counters, ...p.counters }, items: { ...s.items, ...p.items }, energy: p.energy ?? s.energy, coins: p.coins ?? s.coins };
  };
  /** the night of day 4 on the quiet path: said «Я приду», wrote plainly, saw the note, met Aunt Zina, smokes, did not book the dentist */
  let cache: GameState | undefined;
  const eve = () => (cache ??= day4({}, Q2, Q3, Q4));
  const morning5 = (p: Patch = {}, sleep4 = 'sleep') => patch(syncClock(content, pick(eve(), 'K4-sleep', sleep4), at(105)), p);
  const HELLO = { 'K5-02a': 'hello', 'K5-02b': 'hello', 'K5-02c': 'hello', 'K5-02d': 'hello', 'K5-02e': 'hello', 'K5-02f': 'hello' };
  /** free choices everywhere: hello, no cream, a cigarette, «Всё хорошо, мам» */
  const LAZY = { ...HELLO, 'K5-03': 'skip', 'K5-05a': 'smoke', 'K5-05b': 'smoke', 'K5-06a': 'calm', 'K5-06b': 'calm', 'K5-06c': 'calm', 'K5-07a': 'smoke', 'K5-07b': 'smoke' };
  const toDay = (s: GameState, p: Record<string, string> = LAZY) => syncClock(content, story(s, p), at(109));
  const toEvening = (s: GameState, p: Record<string, string> = LAZY) => syncClock(content, story(toDay(s, p), p), at(115));
  const toNight = (s: GameState, p: Record<string, string> = LAZY) => syncClock(content, story(toEvening(s, p), p), at(119.5));
  const BOOKED: Patch = { on: { d1_dentist_booked: true }, off: ['d1_soda_teeth'] };

  it('the base week is what the other tests assume', () => {
    const s = morning5();
    for (const f of ['d1_said_coming', 'd1_wrote_plain', 'd1_soda_teeth', 'd2_saw_note', 'd3_met_zina', 'd3_course', 'd4_home']) expect(s.flags[f], f).toBeDefined();
    for (const f of ['d1_dentist_booked', 'd3_asked_note', 'd1_refused_pies', 'd4_pies_held', 'd2_wrote_zerno']) expect(s.flags[f], f).toBeUndefined();
    expect([s.day, s.part, s.energy, s.counters.smoke_free ?? 0]).toEqual([5, 'morning', 10, 0]);
  });
  it('the morning is short: the mirror and Aunt Zina, plus «Проспал» after a late night', () => {
    expect(d5(story(morning5()))).toEqual(['K5-01', 'K5-02b']);
    const late = morning5({}, 'late');
    expect(late.energy).toBe(6);
    expect(next(late)).toBe('K5-00');
    const after = story(late, HELLO);
    expect(d5(after)).toEqual(['K5-00', 'K5-01', 'K5-02b']);          // the longest morning chain is three cards
    expect(after.energy).toBe(6);                                      // the line charges nothing
    expect(card('K5-01').text).toContain('Второе утро курса');
    const red = pick(morning5({ on: { d3_cleaning: 'bad' } }), 'K5-01', 'ok');
    expect(red.log.at(-1)!.text).toContain('Краснота после кабинета 12А сошла');
  });
  it('Aunt Zina: the shelf for 4 energy, or the bags for 2 when mum said he pulled himself together', () => {
    const s = pick(morning5(), 'K5-01', 'ok');
    const cost = (id: string) => card(id).choices.find((ch) => ch.id === 'help')!.cost!.energy;
    expect(next(s)).toBe('K5-02b');
    expect(next(patch(s, { on: { d3_asked_note: true } }))).toBe('K5-02a');
    expect(next(patch(s, { off: ['d3_met_zina'] }))).toBe('K5-02c');
    expect(card('K5-02a').text).toContain('про записку спрашивал');
    for (const kind of ['d1_refused_pies', 'd4_pies_held']) {
      expect(next(patch(s, { on: { [kind]: true, d3_asked_note: true } })), kind).toBe('K5-02d');
      expect(next(patch(s, { on: { [kind]: true } })), kind).toBe('K5-02e');
      expect(next(patch(s, { on: { [kind]: true }, off: ['d3_met_zina'] })), kind).toBe('K5-02f');
    }
    for (const id of ['K5-02a', 'K5-02b', 'K5-02c']) { expect(cost(id), id).toBe(4); expect(card(id).text, id).toContain('Полка'); }
    for (const id of ['K5-02d', 'K5-02e', 'K5-02f']) { expect(cost(id), id).toBe(2); expect(card(id).text, id).toContain('Мать говорит, ты за себя взялся'); }
    // kindness costs energy; without it only the hello is open, and the hello is the neutral choice
    expect(open({ ...s, energy: 3 }, 'K5-02b')).toEqual(['hello']);
    expect(ids({ ...s, energy: 3 }, 'K5-02b')).toEqual(['help', 'hello']);
    expect(open(patch(s, { on: { d4_pies_held: true }, energy: 2 }), 'K5-02e')).toEqual(['help', 'hello']);
    for (const id of ['K5-02a', 'K5-02b', 'K5-02c', 'K5-02d', 'K5-02e', 'K5-02f']) expect(card(id).choices.find((ch) => ch.neutral)!.id, id).toBe('hello');
    // one meeting only
    expect(next(pick(s, 'K5-02b', 'hello'))).toBeUndefined();
    expect(next(pick(s, 'K5-02b', 'help'))).toBeUndefined();
    // she repeats what mum told her
    const told = (on: Record<string, boolean>) => choose(content, patch(s, { on }), 'K5-02b', 'help').outcome.text;
    expect(told({ d4_mom_talked: true })).toContain('ты у врача лечишься');
    expect(told({ d4_ate_pies: true })).toContain('пирожки ты доел');
  });
  it('three ways to the cream: a free tube for help, 40 coins for knowing the note, nothing otherwise, and never two tubes', () => {
    const zina = pick(morning5(), 'K5-01', 'ok');
    // helped: the spare tube, no pharmacy card afterwards
    const helped = pick(zina, 'K5-02b', 'help');
    expect([zina.energy - helped.energy, helped.items.cream_zina, helped.coins]).toEqual([4, 1, zina.coins]);
    expect(helped.flags.d5_helped_zina.value).toBe('shelf');
    expect(helped.flags.d5_cream.value).toBe('gift');
    expect(helped.hints).toContain('zina_cream');
    expect(helped.log.at(-1)!.text).toContain('в аптеке на Садовой');
    const helpedNight = toNight(helped);
    expect(d5(helpedNight)).not.toContain('K5-03');
    expect(helpedNight.items.cream_zina).toBe(1);
    expect(pick(patch(zina, { on: { d4_pies_held: true } }), 'K5-02e', 'help').flags.d5_helped_zina.value).toBe('bags');
    // did not help but knows the note (saw it on Day 2 or asked on Day 3): the pharmacy, 40 coins, or leave it
    for (const p of [{}, { on: { d3_asked_note: true }, off: ['d2_saw_note'] }] as Patch[]) {
      const s = patch(zina, p);
      const hello = toDay(pick(s, next(s)!, 'hello'));
      expect(hello.items.cream_zina).toBeUndefined();
      expect(next(hello)).toBe('K5-03');
      expect(card('K5-03').text).toContain('Прыщи не лечит');
      expect(card('K5-03').choices.find((ch) => ch.id === 'buy')!.cost).toEqual({ coins: 40 });
      expect(card('K5-03').choices.find((ch) => ch.neutral)!.id).toBe('skip');
      const bought = pick(hello, 'K5-03', 'buy');
      expect([hello.coins - bought.coins, bought.items.cream_zina, bought.flags.d5_cream.value]).toEqual([40, 1, 'bought']);
      expect(bought.log.at(-1)!.text).toContain('Курс у врача?');
      expect(d5(toNight(bought)).filter((id) => id === 'K5-03')).toHaveLength(1);
      expect(toNight(bought).items.cream_zina).toBe(1);
      const left = pick(hello, 'K5-03', 'skip');
      expect([left.coins, left.items.cream_zina]).toEqual([hello.coins, undefined]);
      expect(open({ ...hello, coins: 39 }, 'K5-03')).toEqual(['skip']);
    }
    // did not help and knows nothing: no pharmacy card, no cream, nothing about it in the notebook
    const blind = patch(zina, { off: ['d2_saw_note'] });
    const none = toNight(pick(blind, 'K5-02b', 'hello'));
    expect(d5(none)).not.toContain('K5-03');
    expect(none.items.cream_zina).toBeUndefined();
    expect(none.hints).not.toContain('zina_cream');
    expect(choose(content, blind, 'K5-02b', 'hello').outcome.text).not.toMatch(/Садов|крем|записк/i);
  });
  it('the cream from Sadovaya is a shaving cream: no course, no «Применить», skin moves only by the doctor’s course', () => {
    const item = content.items.find((x) => x.id === 'cream_zina')!;
    expect(item.onUse).toBeUndefined();                                // the bag shows «Применить» only for items with onUse
    expect(item.price).toBeUndefined();
    expect(item.limits).toBe('Прыщи не лечит. С ним бритьё не раздражает кожу.');
    const zina = pick(morning5(), 'K5-01', 'ok');
    const withCream = pick(story(toNight(pick(zina, 'K5-02b', 'help'))), 'K5-sleep', 'sleep', full);
    const without = pick(story(toNight(pick(zina, 'K5-02b', 'hello'))), 'K5-sleep', 'sleep', full);
    expect(withCream.problems.skin).toBe(without.problems.skin);
    expect(withCream.modifiers.map((m) => m.id)).toEqual(['derm_course']);
    expect(courseActive(withCream, item)).toBe(false);
    const day6 = syncClock(full, withCream, at(129));
    expect(day6.problems.skin).toBe(withCream.problems.skin - 3);
    expect(day6.items.cream_zina).toBe(1);                             // it waits in the bag for the Day 7 shave
  });
  it('the dentist: a free cleaning for the booked, less after the soda, and a slot in a week for the rest', () => {
    const at5 = (p: Patch) => toDay(morning5(p));
    const booked = at5(BOOKED);
    expect(next(booked)).toBe('K5-03');                                // the pharmacy first: the base path knows the note
    const chair = pick(booked, 'K5-03', 'skip');
    expect(next(chair)).toBe('K5-04');
    expect(ids(chair, 'K5-04')).toEqual(['go', 'move']);
    expect(card('K5-04').choices[0]).toMatchObject({ neutral: true });
    expect(card('K5-04').choices[0].cost).toBeUndefined();
    const clean = choose(content, chair, 'K5-04', 'go');
    expect([chair.problems.teeth - clean.state.problems.teeth, chair.energy - clean.state.energy, clean.state.coins]).toEqual([15, 3, chair.coins]);
    expect(clean.state.flags.d5_cleaned.value).toBe('full');
    expect(clean.outcome.text).toContain('Два часа не курить');
    // an empty tank does not close the door: the energy is an effect, not a cost
    expect(pick({ ...chair, energy: 1 }, 'K5-04', 'go').energy).toBe(0);
    // the cleaning can be put off: no energy spent, teeth as they were, and the evening craving comes at home
    const moved = pick(chair, 'K5-04', 'move');
    expect([moved.problems.teeth, moved.energy, moved.coins]).toEqual([chair.problems.teeth, chair.energy, chair.coins]);
    expect(moved.flags.d5_dentist_moved).toBeDefined();
    expect(moved.flags.d5_cleaned).toBeUndefined();
    expect(next(moved) ?? '').not.toMatch(/^K5-05/);   // no porch craving without the cleaning
    // the soda from Day 1: the dentist grumbles and the cleaning gives less
    const soda = choose(content, patch(chair, { on: { d1_soda_teeth: true } }), 'K5-04', 'go');
    expect(soda.outcome.text).toContain('Содой тёрли? Не надо так');
    expect(chair.problems.teeth - soda.state.problems.teeth).toBe(10);
    expect(soda.state.flags.d5_cleaned.value).toBe('soda');
    // not booked: one line, no teeth change, no second dentist card
    const none = pick(at5({}), 'K5-03', 'skip');
    expect(next(none)).toBe('K5-04n');
    expect(card('K5-04n').text).toContain('через неделю');
    const later = pick(none, 'K5-04n', 'book');
    expect([later.problems.teeth, later.energy, later.coins]).toEqual([none.problems.teeth, none.energy, none.coins]);
    expect(later.flags.d5_cleaned).toBeUndefined();
    expect(next(later)).toBeUndefined();
    expect(d5(toNight(later))).not.toContain('K5-04');
  });
  it('one priced craving a day: on the dentist’s porch after the cleaning, on the balcony otherwise, and smoke_free is right on every path', () => {
    for (const place of ['porch', 'balcony'] as const) for (const [n, half] of [[0, false], [0, true], [1, false], [2, true], [4, false]] as [number, boolean][]) {
      const where = `${place}, counter ${n}${half ? ', half' : ''}`;
      const p: Patch = { ...(place === 'porch' ? BOOKED : {}), counters: { smoke_free: n }, items: { gum: 1 }, on: { ...(place === 'porch' ? BOOKED.on : {}), ...(half ? { d1_half: true } : {}) } };
      const id = `K5-0${place === 'porch' ? 5 : 7}${n === 0 ? 'a' : 'b'}`;
      const before = place === 'porch'
        ? pick(pick(toDay(morning5(p)), 'K5-03', 'skip'), 'K5-04', 'go')
        : pick(toEvening(morning5(p)), 'K5-06c', 'calm');
      expect(next(before), where).toBe(id);
      expect(ids(before, id), where).toEqual(['hold', ...(half ? ['quarter'] : []), 'gum', 'smoke']);
      const smokeTeeth = place === 'porch' ? 2 : 0;
      const after: Record<string, [number, number, number, number, number]> = {
        //        counter, care, conf, energy, teeth
        hold: [n + 1, -2, n === 0 ? -1 : -2, n === 0 ? 2 : 3, 0],
        gum: [n + 1, -2, 0, 0, 0],
        smoke: [0, 2, 0, 0, smokeTeeth],
        ...(half ? { quarter: [0, 1, 0, 1, smokeTeeth / 2] as [number, number, number, number, number] } : {}),
      };
      for (const [choice, [counter, care, conf, energy, teeth]] of Object.entries(after)) {
        const r = pick(before, id, choice);
        const w = `${where}, ${choice}`;
        expect(r.counters.smoke_free, w).toBe(counter);
        expect([r.problems.care - before.problems.care, r.problems.conf - before.problems.conf, before.energy - r.energy, r.problems.teeth - before.problems.teeth], w).toEqual([care, conf, energy, teeth]);
        // the other strength must not follow once the counter has moved, and the other place has no craving
        const rest = d5(toNight(r)).filter((x) => /^K5-0[57][ab]$/.test(x));
        expect(rest, w).toEqual([id]);
        expect(Object.keys(r.flags).filter((f) => ['d5_smoked', 'd5_no_smoke', 'd5_quarter'].includes(f)), w).toHaveLength(1);
      }
      expect(card(id).choices.find((ch) => ch.neutral)!.id, where).toBe('smoke');
      expect(card(id).choices.find((ch) => ch.neutral)!.cost, where).toBeUndefined();
      expect(open({ ...before, energy: 0, items: { ...before.items, gum: 0 } }, id), where).toEqual(['smoke']);
      const word = ({ 0: 'Первый', 1: 'Второй', 2: 'Третий', 4: 'Пятый' } as Record<number, string>)[n];
      expect(choose(content, before, id, 'hold').outcome.text, where).toContain(`${word} день без табака`);
    }
    expect(card('K5-05a').text).toContain('часть чистки насмарку');
  });
  it('mum calls in the evening and knows from Aunt Zina whether he helped; her call punishes nothing', () => {
    const zina = pick(morning5(), 'K5-01', 'ok');
    expect(next(toEvening(pick(zina, 'K5-02b', 'help')))).toBe('K5-06a');
    expect(next(toEvening(pick(patch(zina, { on: { d4_pies_held: true } }), 'K5-02e', 'help')))).toBe('K5-06b');
    const evening = toEvening(pick(zina, 'K5-02b', 'hello'));
    expect(next(evening)).toBe('K5-06c');
    for (const choice of ['talk', 'calm']) {
      const r = pick(evening, 'K5-06c', choice);
      for (const p of Object.keys(evening.problems)) expect(r.problems[p], `${choice} ${p}`).toBeLessThanOrEqual(evening.problems[p]);
      expect([r.energy, r.affinity, r.coins]).toEqual([evening.energy, evening.affinity, evening.coins]);
    }
    expect(choose(content, patch(evening, { on: { d4_ate_pies: true } }), 'K5-06c', 'calm').outcome.text).toContain('Пирожки доел? Напеку ещё');
    expect(choose(content, patch(evening, { on: { d4_pies_held: true } }), 'K5-06c', 'calm').outcome.text).toContain('Ты точно не заболел?');
  });
  it('Alina writes first: the opening follows Day 1, then the class-chat line, then a question from the bank', () => {
    const night = toNight(morning5());
    const D1 = ['d1_wrote_plain', 'd1_wrote_flirty', 'd1_liked_only', 'd1_no_contact', 'd1_said_coming', 'd1_lurked', 'd1_joked'];
    const with1 = (...on: string[]) => patch(night, { off: D1, on: Object.fromEntries(on.map((f) => [f, true])) });
    const hers = (s: GameState) => s.chat.filter((m) => m.day === 5).map((m) => m.text);
    const OPENING: [string, string, string][] = [
      ['d1_wrote_plain', 'K5-08a', 'Привет. Видела твоё сообщение, замоталась.'],
      ['d1_wrote_flirty', 'K5-08b', 'Привет, Андрей.'],
      ['d1_liked_only', 'K5-08c', 'Привет. Оксана просила узнать, ты идёшь?'],
      ['d1_no_contact', 'K5-08c', 'Привет. Оксана просила узнать, ты идёшь?'],
    ];
    const CLASS: [string, string | undefined][] = [['d1_said_coming', 'Видела, ты написал, что придёшь.'], ['d1_lurked', 'Ты один в чате не ответил.'], ['d1_joked', undefined]];
    for (const [f1, id0, opening0] of OPENING) for (const [f2, line] of CLASS) {
      // no message from Andrey, but «Я приду» in the class chat: she does not ask what she already knows
      const listed = id0 === 'K5-08c' && f2 === 'd1_said_coming';
      const id = listed ? 'K5-08d' : id0;
      const opening = listed ? 'Привет. Оксана собирает список на встречу.' : opening0;
      const where = `${f1} + ${f2}`;
      const d = drawStory(content, with1(f1, f2));
      expect(d.card?.id, where).toBe(id);
      expect(hers(d.state), where).toEqual([opening]);                 // the opening is said when the card opens
      expect(ids(d.state, id), where).toEqual(['read']);
      const read = choose(content, d.state, id, 'read');
      expect(hers(read.state), where).toEqual([opening, ...(line ? [line] : [])]);
      expect(read.chanceDelta, where).toBe(0);
      const q = drawStory(content, read.state);
      expect(q.card?.id, where).toBe('K5-09');
      expect(content.chat.alina_reunion_question, where).toContain(hers(q.state).at(-1));
      expect(hers(q.state), where).toHaveLength(line ? 3 : 2);
      expect(q.state.chat.filter((m) => m.day === 5).every((m) => m.from === 'crush' && !m.status), where).toBe(true);
    }
    expect(content.chat.alina_reunion_question).toHaveLength(10);
    expect(hers(drawStory(content, with1('d1_wrote_flirty', 'd1_joked')).state).join(' ')).not.toMatch(/сообщени/);
    // «Классное место!» from Day 2 gets a short answer; earlier likes and reactions change nothing in her text
    const zerno = patch(with1('d1_wrote_plain', 'd1_said_coming'), { on: { d2_wrote_zerno: true, d2_liked_photo: true, d3_alina_liked: true, d4_alina_reacted: true } });
    const z = drawStory(content, zerno);
    expect(hers(pick(z.state, 'K5-08a', 'read'))).toEqual(['Привет. Видела твоё сообщение, замоталась.', 'Видела, ты написал, что придёшь.', 'Про «Зерно»: да, место хорошее.']);
    const liked = patch(with1('d1_wrote_plain', 'd1_said_coming'), { on: { d2_liked_photo: true, d3_alina_liked: true, d4_alina_reacted: true } });
    const l = drawStory(content, liked);
    expect(hers(pick(l.state, 'K5-08a', 'read'))).toEqual(hers(pick(drawStory(content, with1('d1_wrote_plain', 'd1_said_coming')).state, 'K5-08a', 'read')));
  });
  it('the night card has one button, «Ответишь утром»: +6 for everyone with its reason, and no reply on Day 5', () => {
    const question = card('K5-09');
    expect(question.choices).toHaveLength(1);
    expect(question.choices[0]).toMatchObject({ id: 'morning', label: 'Ответишь утром', neutral: true });
    for (const f of ['d1_wrote_plain', 'd1_wrote_flirty', 'd1_liked_only', 'd1_no_contact']) {
      const night = patch(toNight(morning5()), { off: ['d1_wrote_plain'], on: { [f]: true } });
      const opened = drawStory(content, pick(drawStory(content, night).state, drawStory(content, night).card!.id, 'read'));
      expect(opened.card?.id, f).toBe('K5-09');
      const r = choose(content, opened.state, 'K5-09', 'morning');
      expect(r.state.affinity - night.affinity, f).toBe(6);
      expect(r.chanceDelta, f).toBe(6);
      expect(r.state.lastChange, f).toEqual({ delta: 6, why: 'Алина написала первой' });
      expect(r.state.chat.filter((m) => m.day === 5 && m.from === 'hero'), f).toEqual([]);
      expect(next(r.state), f).toBeUndefined();                        // the day ends on this beat
      expect(r.state.flags.d5_alina_wrote, f).toBeDefined();
    }
    expect(content.cards.filter((c) => c.id.startsWith('K5-')).some((c) => c.kind === 'chat' || c.choices.some((ch) => ch.outcomes.some((o) => o.effects?.some((e) => 'write' in e))))).toBe(false);
  });
  it('plus actions and sleep: the gym needs the pass, staying up costs four, and day 6 follows with five frames', () => {
    const night = story(toNight(morning5()));
    expect(actionsFor(content, night).map((c) => c.id)).toEqual(['A5-run', 'A5-clean', 'A5-teeth', 'A5-couch', 'K5-sleep']);
    const day = toDay(morning5());
    expect(actionsFor(content, day).map((c) => c.id)).toEqual(['A5-run', 'A5-clean', 'A5-teeth', 'A5-couch', 'A-job']);
    expect(actionsFor(content, patch(day, { on: { d2_gym: true } })).map((c) => c.id)).toContain('A5-gym');
    expect(oddsFor(content, day, card('A5-run').choices[0]).map((o) => o.word)).toEqual(['часто', 'иногда']);
    const late = syncClock(full, pick(night, 'K5-sleep', 'late', full), at(129));
    expect(late.flags.d5_late).toBeDefined();
    expect([late.day, late.energy]).toEqual([6, 10 - 4]);
    const end = syncClock(content, pick(night, 'K5-sleep', 'sleep'), at(129));
    expect(end.demoOver).toBeUndefined();
    expect(end.day).toBe(6);
    expect(end.summaries.map((d) => [d.day, d.played])).toEqual([[1, true], [2, true], [3, true], [4, true], [5, true]]);
    expect(end.summaries[4].gift).toBe('floss');
    expect(content.days.find((d) => d.day === 5)).toMatchObject({ title: 'Соседка', teaser: 'Утром: ответить Алине' });
    // every part of the day has something to do
    for (const part of ['morning', 'day', 'evening', 'night']) expect(content.cards.some((c) => c.id.startsWith('K5-') && c.kind === 'story' && c.when!.parts!.includes(part as 'day')), part).toBe(true);
  });
  it('a fully skipped Day 5 after played days 1–4: the cleaning if booked, hello and no cream, a cigarette, and her message waits with its +6', () => {
    for (const booked of [false, true]) for (const sleep4 of ['sleep', 'late']) {
      const where = `booked ${booked}, ${sleep4}`;
      const before = patch(pick(eve(), 'K4-sleep', sleep4, full), { ...(booked ? BOOKED : {}), counters: { smoke_free: 2 } });
      const s = syncClock(full, before, at(129));
      expect(s.day, where).toBe(6);
      expect(d5(s), where).toEqual([
        ...(sleep4 === 'late' ? ['K5-00'] : []), 'K5-01', 'K5-02b', 'K5-03',
        ...(booked ? ['K5-04', 'K5-05b', 'K5-06c'] : ['K5-04n', 'K5-06c', 'K5-07b']), 'K5-08a', 'K5-09',
      ]);
      expect(s.flags.d5_no_help, where).toBeDefined();
      expect(s.items.cream_zina, where).toBeUndefined();
      expect(s.coins, where).toBe(before.coins);
      expect(s.flags.d5_smoked, where).toBeDefined();
      expect(s.counters.smoke_free, where).toBe(0);
      const teeth = content.problems.find((p) => p.id === 'teeth')!.regress;
      expect(s.problems.teeth, where).toBe(before.problems.teeth + teeth + (booked ? -15 + 2 : 0));
      expect(s.flags.d5_cleaned?.value, where).toBe(booked ? 'full' : undefined);
      expect(s.affinity, where).toBe(before.affinity + 6);
      const msgs = s.chat.filter((m) => m.day === 5);
      expect(msgs.map((m) => m.from), where).toEqual(['crush', 'crush', 'crush']);
      expect(msgs[0].text, where).toBe('Привет. Видела твоё сообщение, замоталась.');
      expect(content.chat.alina_reunion_question, where).toContain(msgs[2].text);
      expect(s.summaries[4], where).toMatchObject({ day: 5, played: false, coins: 0 });
      expect(s.history.some((h) => h.day === 5), where).toBe(false);
      const missed = s.missed!.at(-1)!;
      expect(missed.day, where).toBe(5);
      expect(missed.items.map((i) => i.title), where).toEqual([
        ...(sleep4 === 'late' ? ['Проспал'] : []), 'Зеркало', 'Тётя Зина', 'Аптека на Садовой', 'Стоматолог',
        ...(booked ? ['Крыльцо стоматологии', 'Звонок мамы'] : ['Звонок мамы', 'Балкон']), 'Алина пишет', 'Вопрос про встречу',
      ]);
      expect(missed.items.at(-1)!.text, where).toContain('ответит утром');
    }
  });
});

describe('день 6', () => {
  const d6 = (s: GameState) => Object.keys(s.seen).filter((id) => id.startsWith('K6-'));
  const card = (id: string) => content.cards.find((c) => c.id === id)!;
  const ids = (s: GameState, id: string) => choicesFor(content, s, card(id)).map((x) => x.choice.id);
  const next = (s: GameState) => drawStory(content, s).card?.id;
  const Q2 = { 'K2-04': 'later', 'K2-05a': 'delete', 'K2-09': 'ok' };
  const Q3 = { 'K3-01': 'asis', 'K3-02': 'smoke' };
  const Q4 = { 'K4-02': 'home', 'K4-06': 'calm', 'K4-07a': 'smoke', 'K4-08c': 'ok' };
  const Q5 = { 'K5-02b': 'hello', 'K5-03': 'skip', 'K5-06c': 'calm', 'K5-07a': 'smoke' };
  /** free and quiet choices of Day 6: no trap, nothing bought, a cigarette */
  const Q6: Record<string, string> = { 'K6-00': 'up', 'K6-02': 'scroll', 'K6-03a': 'home', 'K6-03b': 'home', 'K6-03c': 'home', 'K6-04': 'scroll', 'K6-08a': 'smoke', 'K6-08b': 'smoke' };
  type Patch = { on?: Record<string, string | boolean>; off?: string[]; counters?: Record<string, number>; items?: Record<string, number>; energy?: number; coins?: number; conf?: number };
  /** the same state with flags of earlier days switched, so one played week covers every branch */
  const patch = (s: GameState, p: Patch): GameState => {
    const flags = { ...s.flags };
    for (const f of p.off ?? []) delete flags[f];
    for (const [k, value] of Object.entries(p.on ?? {})) flags[k] = { value, day: Number(k[1]) };
    return {
      ...s, flags, counters: { ...s.counters, ...p.counters }, items: { ...s.items, ...p.items }, energy: p.energy ?? s.energy, coins: p.coins ?? s.coins,
      problems: p.conf === undefined ? s.problems : { ...s.problems, conf: p.conf },
    };
  };
  /** the night of day 5 on the quiet path: said «Я приду», wrote plainly on Day 1, stayed home on Day 4, smokes */
  let cache: GameState | undefined;
  const night5 = () => (cache ??= [105, 109, 115, 119.5].reduce((s, h) => story(syncClock(content, s, at(h)), Q5), pick(day4({}, Q2, Q3, Q4), 'K4-sleep', 'sleep')));
  const morning6 = (p: Patch = {}, sleep5 = 'sleep') => patch(syncClock(content, pick(night5(), 'K5-sleep', sleep5), at(129)), p);
  const D1 = ['d1_wrote_plain', 'd1_wrote_flirty', 'd1_liked_only', 'd1_no_contact', 'd1_said_coming', 'd1_lurked', 'd1_joked'];
  const with1 = (s: GameState, ...on: string[]) => patch(s, { off: D1, on: Object.fromEntries(on.map((f) => [f, true])) });
  /** the confidence the reply needs: the joke is open at 75 and below */
  const CONF: Record<string, number> = { dry: 80, plain: 80, excuse: 80, joke: 70 };
  /** reply in the morning, a quiet day, then the evening begins */
  const evening = (s: GameState, reply: string, p: Record<string, string> = {}) => {
    const picks = { ...Q6, 'K6-01': reply, ...p };
    const day = syncClock(content, story(patch(s, { conf: CONF[reply] }), picks), at(133));
    return syncClock(content, story(day, picks), at(139));
  };
  const said = (s: GameState) => s.chat.filter((m) => m.day === 6);
  const hers = (s: GameState) => said(s).filter((m) => m.from === 'crush' && !m.status).map((m) => m.text);
  const bank = (key: string) => content.chat[key];
  const BYE = 'Ладно, мне пора. Увидимся на встрече, наверное.';

  it('the morning starts from her question; after a late night «Проспал» comes first and the reply waits', () => {
    const s = morning6();
    expect([s.day, s.part, s.energy]).toEqual([6, 'morning', 10]);
    expect(s.flags.d5_alina_wrote).toBeDefined();
    expect(next(s)).toBe('K6-01');
    const late = morning6({}, 'late');
    expect(late.energy).toBe(6);
    expect(next(late)).toBe('K6-00');
    expect(next(pick(late, 'K6-00', 'up'))).toBe('K6-01');
    expect(pick(late, 'K6-00', 'up').energy).toBe(6);                  // the line charges nothing
    expect(d6(story(morning6(), { 'K6-01': 'dry' }))).toEqual(['K6-01']);
  });
  it('the reply: three buttons, each label is the message; the joke or the excuse by confidence, never both', () => {
    const reply = card('K6-01');
    for (let conf = 0; conf <= 100; conf++) {
      const shown = ids(morning6({ conf }), 'K6-01');
      expect(shown, `conf ${conf}`).toEqual(conf <= 75 ? ['plain', 'joke', 'dry'] : ['plain', 'excuse', 'dry']);
    }
    // the threshold lives in one card: the joke asks for conf <= N and the excuse is its negation
    const need = (id: string) => reply.choices.find((ch) => ch.id === id)!.requires;
    expect(need('joke')).toEqual([{ problem: 'conf', lte: 75 }]);
    expect(need('excuse')).toEqual([{ not: { problem: 'conf', lte: 75 } }]);
    expect(reply.choices.find((ch) => ch.neutral)!.id).toBe('dry');
    expect(reply.choices.map((ch) => ch.label).join(' ')).not.toMatch(/не приду|не знаю/i);
    const WANT: [string, number, string | undefined][] = [['dry', 0, undefined], ['plain', 5, 'Ответил и спросил в ответ'], ['joke', 8, 'Шутка про выпускной'], ['excuse', -5, 'Длинное оправдание']];
    for (const [id, add, why] of WANT) for (const sleep5 of ['sleep', 'late']) {
      const where = `${id} ${sleep5}`;
      const before = morning6({ conf: CONF[id] }, sleep5);
      const start6 = sleep5 === 'late' ? pick(before, 'K6-00', 'up') : before;
      const r = choose(content, start6, 'K6-01', id);
      const label = reply.choices.find((ch) => ch.id === id)!.label;
      expect(said(r.state).map((m) => [m.from, !!m.status]), where).toEqual([['hero', false], ['crush', true]]);
      expect(said(r.state)[0].text, where).toBe(label);                 // what the button says is what is sent
      expect(bank(sleep5 === 'late' ? 'status_reply_read_noon' : 'status_reply_read'), where).toContain(said(r.state)[1].text);
      expect(r.state.affinity - start6.affinity, where).toBe(add);
      expect(r.chanceDelta, where).toBe(add);
      if (why) expect(r.state.lastChange, where).toEqual({ delta: add, why });
      expect(r.state.flags.d6_reply.value, where).toBe(id);
      expect(next(r.state), where).toBeUndefined();                     // nothing more until the day part
    }
    expect(bank('status_reply_read')).toHaveLength(10);
    expect(bank('status_reply_read_noon')).toHaveLength(10);
    expect(pick(morning6({}, 'late'), 'K6-00', 'up').log.at(-1)!.text).toContain('Встал к одиннадцати');
    expect(choose(content, pick(morning6({}, 'late'), 'K6-00', 'up'), 'K6-01', 'dry').outcome.text).toContain('ближе к полудню');
  });
  it('the trendy look from the feed is free, buys nothing and makes style worse', () => {
    const day = syncClock(content, pick(morning6(), 'K6-01', 'dry'), at(133));
    expect(next(day)).toBe('K6-02');
    expect(card('K6-02').choices.every((ch) => !ch.cost)).toBe(true);
    const worn = pick(day, 'K6-02', 'wear');
    expect(worn.problems.style - day.problems.style).toBe(4);
    expect([worn.coins, worn.items]).toEqual([day.coins, day.items]);
    expect(worn.flags.d6_trend).toBeDefined();
    const kept = pick(day, 'K6-02', 'scroll');
    expect(kept.problems).toEqual(day.problems);
    expect(kept.flags.d6_trend).toBeUndefined();
  });
  it('the market with Vitya or the optician: shop prices, one purchase, Vitya recalls the skewers', () => {
    const day = (p: Patch = {}) => pick(syncClock(content, pick(morning6(p), 'K6-01', 'dry'), at(133)), 'K6-02', 'scroll');
    expect(next(day())).toBe('K6-03c');                                 // stayed home on Day 4
    expect(next(day({ off: ['d4_home'], on: { d4_went: true, d4_meat_held: true } }))).toBe('K6-03a');
    expect(next(day({ off: ['d4_home'], on: { d4_went: true, d4_feast: true } }))).toBe('K6-03b');
    expect(card('K6-03a').text).toContain('один шампур');
    expect(card('K6-03b').text).toContain('пяти шампуров');
    expect(card('K6-03c').text).toContain('На шашлыки ты не пришёл');
    const price = (id: string) => content.items.find((i) => i.id === id)!.price!.coins;
    for (const id of ['K6-03a', 'K6-03b', 'K6-03c']) {
      const cost = (ch: string) => card(id).choices.find((x) => x.id === ch)!.cost;
      expect(cost('shirt'), id).toEqual({ coins: price('shirt') });
      expect(cost('frame'), id).toEqual({ coins: price('frame') });
      expect(card(id).text, id).toContain('Рубашка на рынке 90 монет: стиль +6');
      expect(card(id).text, id).toContain('Оправа в оптике 150 монет: стиль +12, уверенность +2');
      expect(card(id).choices.map((ch) => ch.id), id).toEqual(['shirt', 'frame', 'look', 'home']);
    }
    const s = day();
    expect(s.coins).toBeGreaterThanOrEqual(150);
    const shirt = pick(s, 'K6-03c', 'shirt');
    expect([shirt.coins - s.coins, shirt.problems.style - s.problems.style]).toEqual([-90, -6]);
    expect(soldOut(shirt, content.items.find((i) => i.id === 'shirt')!)).toBe(true);
    expect(currentLook(content, shirt).topColor).toBe('#4A6FA5');
    const frame = pick(s, 'K6-03c', 'frame');
    expect([frame.coins - s.coins, frame.problems.style - s.problems.style, frame.problems.conf - s.problems.conf]).toEqual([-150, -12, -2]);
    expect(soldOut(frame, content.items.find((i) => i.id === 'frame')!)).toBe(true);
    expect(currentLook(content, frame).glasses).toBe('round');
    expect(next(shirt)).toBeUndefined();                                // one purchase on the card; the other stays in the shop
    const look = pick(s, 'K6-03c', 'look');
    expect([look.coins, look.problems.conf - s.problems.conf]).toEqual([s.coins, -1]);
    const home = pick(s, 'K6-03c', 'home');
    expect([home.coins, home.problems]).toEqual([s.coins, s.problems]);
    // already bought in the shop: the card does not sell it twice
    expect(ids(patch(s, { on: { bought_shirt: true, bought_frame: true } }), 'K6-03c')).toEqual(['look', 'home']);
    // a poor player sees the price and a free way out
    expect(choicesFor(content, patch(s, { coins: 100 }), card('K6-03c')).map((x) => [x.choice.id, x.affordable])).toEqual([['shirt', true], ['frame', false], ['look', true], ['home', true]]);
    // Vitya sees the trendy look
    const trendy = pick(syncClock(content, pick(morning6(), 'K6-01', 'dry'), at(133)), 'K6-02', 'wear');
    expect(choose(content, trendy, 'K6-03c', 'shirt').outcome.text).toContain('Это что, так модно?');
    expect(choose(content, s, 'K6-03c', 'shirt').outcome.text).not.toContain('модно');
  });
  it('the class chat in the evening: the beard hint reaches everyone, and the silent one can finally answer', () => {
    for (const reply of ['dry', 'plain', 'joke', 'excuse']) {
      const day = syncClock(content, story(patch(morning6(), { conf: CONF[reply] }), { ...Q6, 'K6-01': reply }), at(133));
      const e = syncClock(content, story(day, { 'K6-02': 'scroll', 'K6-03c': 'home' }), at(139));
      expect(next(e), reply).toBe('K6-04');                             // she jokes in the class chat before she answers him
      expect(ids(e, 'K6-04'), reply).toEqual(['smile', 'scroll']);
      for (const id of ['smile', 'scroll']) {
        const s = pick(e, 'K6-04', id);
        expect(s.flags.d6_beard_hint, `${reply} ${id}`).toBeDefined();
        expect(s.revealed, `${reply} ${id}`).toEqual(['no_beard']);
        expect(s.hints, `${reply} ${id}`).toContain('alina_beard');
        expect(s.affinity, `${reply} ${id}`).toBe(e.affinity);
      }
    }
    expect(card('K6-04').text).toContain('Борода вообще не моё');
    const day = syncClock(content, story(with1(morning6(), 'd1_no_contact', 'd1_lurked'), { ...Q6, 'K6-01': 'dry' }), at(133));
    const lurker = syncClock(content, story(day, Q6), at(139));
    expect(ids(lurker, 'K6-04')).toEqual(['speak', 'smile', 'scroll']);
    const spoke = pick(lurker, 'K6-04', 'speak');
    expect(spoke.problems.conf - lurker.problems.conf).toBe(-2);
    expect(spoke.flags.d6_chat_spoke).toBeDefined();
    expect(spoke.flags.d6_beard_hint).toBeDefined();
  });
  it('after the dry reply: «Ок, записала» and the goodbye, no fork; after the excuse a cool answer and the goodbye', () => {
    for (const [reply, id, line] of [['dry', 'K6-05d', 'Ок, записала.'], ['excuse', 'K6-05e', 'Поняла. Записала.']]) for (const sleep5 of ['sleep', 'late']) for (const f of ['d1_wrote_plain', 'd1_wrote_flirty', 'd1_no_contact']) {
      const where = `${reply} ${sleep5} ${f}`;
      const e = pick(evening(with1(morning6({ on: { d2_wrote_zerno: true } }, sleep5), f, 'd1_joked'), reply), 'K6-04', 'scroll');
      const a = drawStory(content, e);
      expect(a.card?.id, where).toBe(id);
      expect(hers(a.state), where).toEqual([line]);
      expect(ids(a.state, id), where).toEqual(['read']);
      const read = pick(a.state, id, 'read');
      if (sleep5 === 'late') expect(bank('alina_long'), where).toContain(hers(read).at(-1));
      expect(hers(read), where).toHaveLength(sleep5 === 'late' ? 2 : 1);
      const bye = drawStory(content, read);
      expect(bye.card?.id, where).toBe('K6-07');                        // no second fork
      expect(bank('alina_goodbye'), where).toContain(hers(bye.state).at(-1));
      const end = pick(bye.state, 'K6-07', 'ok');
      expect(end.affinity, where).toBe(e.affinity);                     // the evening itself moves nothing
      expect(next(end), where).toBeUndefined();                         // the evening ends on the goodbye
      expect(said(end).filter((m) => m.from === 'hero'), where).toHaveLength(1);
    }
    expect(bank('alina_goodbye')).toHaveLength(10);
    expect(bank('alina_goodbye')[0]).toBe(BYE);
    expect(bank('alina_goodbye').every((x) => x.endsWith('наверное.') && /пора|побежала|убегаю/.test(x))).toBe(true);
    expect(bank('alina_long')).toHaveLength(10);
  });
  it('after the plain reply or the joke: her tone follows the Day 5 opening, then a smaller fork, then the goodbye', () => {
    const TONE: [string, string[], string, string | undefined, string | undefined][] = [
      ['warm', ['d1_wrote_plain', 'd1_joked'], '', 'bank:alina_tone_warm', 'bank:alina_tone_warm'],
      ['list', ['d1_liked_only', 'd1_said_coming'], '', 'Ты и в чате писал, что придёшь. Теперь официально.', 'Ты и в чате писал, что придёшь. Теперь официально.'],
      ['oksana', ['d1_no_contact', 'd1_lurked'], '', 'А я думала, ответишь одним словом.', 'Оксане передам, что ты в списке.'],
      ['flirty', ['d1_wrote_flirty', 'd1_joked'], 'f', undefined, undefined],
    ];
    const FIRST: Record<string, string> = { p: 'Записала. Почти все наши, даже Громов обещал.', j: 'Записала. А жаль: пел ты ужасно, зато громко.', pf: 'Записала. Почти все.', jf: 'Записала. Не пой.' };
    for (const [tone, flags, suffix, afterPlain, afterJoke] of TONE) for (const reply of ['plain', 'joke']) for (const sleep5 of ['sleep', 'late']) {
      const where = `${tone} ${reply} ${sleep5}`;
      const key = reply[0] + suffix;
      const e = pick(evening(with1(morning6({}, sleep5), ...flags), reply), 'K6-04', 'scroll');
      const a = drawStory(content, e);
      expect(a.card?.id, where).toBe(`K6-05${key}`);
      expect(hers(a.state), where).toEqual([FIRST[key]]);
      const read = choose(content, a.state, `K6-05${key}`, 'read');
      expect(read.chanceDelta, where).toBe(0);
      const rest = hers(read.state).slice(1);
      const want = reply === 'plain' ? afterPlain : afterJoke;
      expect(rest, where).toHaveLength((want ? 1 : 0) + (sleep5 === 'late' ? 1 : 0));
      if (sleep5 === 'late') expect(bank('alina_long'), where).toContain(rest.at(-1));
      if (want?.startsWith('bank:')) expect(bank(want.slice(5)), where).toContain(rest[0]);
      else if (want) expect(rest[0], where).toBe(want);
      const fork = drawStory(content, read.state);
      expect(fork.card?.id, where).toBe(tone === 'flirty' ? 'K6-06f' : 'K6-06');
      if (tone === 'flirty') expect(hers(fork.state).at(-1), where).toBe('Ты мне, кстати, странное писал.');
      else expect(bank('alina_live_question'), where).toContain(hers(fork.state).at(-1));
    }
    expect(bank('alina_tone_warm')).toHaveLength(10);
    expect(bank('alina_live_question')).toHaveLength(10);
    // she never names what he changed
    expect(Object.entries(content.chat).filter(([k]) => /^alina_(ok|answer|long|tone|live|zerno|strange|goodbye)/.test(k)).flatMap(([, v]) => v).join(' ')).not.toMatch(/похуде|кож|зуб|очк|рубашк|побри|бород|курил|выгляд/i);
  });
  it('the live fork gives +3, +1 or 0; the «странное писал» fork repairs with +3 or costs −5; «Зерно» on Saturdays for the one who wrote', () => {
    const at6 = (flags: string[], reply: string, p: Patch = {}) => {
      const e = pick(evening(with1(morning6(p), ...flags), reply), 'K6-04', 'scroll');
      const a = drawStory(content, e);
      return drawStory(content, pick(a.state, a.card!.id, 'read')).state;
    };
    const LIVE: [string, number, string, string][] = [['open', 3, 'open', 'Звучит серьёзно. Я нормально: работа, кот, по выходным кофе.'], ['work', 1, 'work', 'Тоже работаю. Нормально.'], ['short', 0, 'short', 'Ну и хорошо.']];
    const live = at6(['d1_wrote_plain', 'd1_said_coming'], 'plain');
    expect(ids(live, 'K6-06')).toEqual(['open', 'work', 'short']);
    expect(card('K6-06').choices.find((ch) => ch.neutral)!.id).toBe('short');
    for (const [id, add, value, line] of LIVE) for (const zerno of [false, true]) {
      const where = `${id} zerno ${zerno}`;
      const s = at6(['d1_wrote_plain', 'd1_said_coming'], 'joke', zerno ? { on: { d2_wrote_zerno: true } } : {});
      const r = choose(content, s, 'K6-06', id);
      expect(r.state.affinity - s.affinity, where).toBe(add);
      expect(r.state.flags.d6_talk.value, where).toBe(value);
      const tail = said(r.state).slice(said(s).length);
      expect(tail.map((m) => m.from), where).toEqual(['hero', 'crush', ...(zerno ? ['crush'] : [])]);
      expect(tail[0].text, where).toBe(card('K6-06').choices.find((ch) => ch.id === id)!.label);
      expect(tail[1].text, where).toBe(line);
      if (zerno) expect(tail[2].text, where).toBe('Я, кстати, по субботам в «Зерне». Раз уж тебе место понравилось.');
      const bye = drawStory(content, r.state);
      expect(bye.card?.id, where).toBe('K6-07');
      expect(bank('alina_goodbye'), where).toContain(hers(bye.state).at(-1));
      const end = choose(content, bye.state, 'K6-07', 'ok');
      expect(end.outcome.text, where).toContain('Первый разговор за много лет');
      expect(next(end.state), where).toBeUndefined();
    }
    const STRANGE: [string, number, string, string][] = [['own', 3, 'owned', 'Проехали. Но сердечки пока придержи.'], ['shrug', 0, 'shrug', 'Бывает.'], ['again', -5, 'repeat', 'Ясно.']];
    const strange = at6(['d1_wrote_flirty', 'd1_lurked'], 'plain');
    expect(ids(strange, 'K6-06f')).toEqual(['own', 'again', 'shrug']);
    expect(card('K6-06f').choices.find((ch) => ch.neutral)!.id).toBe('shrug');
    for (const [id, add, value, line] of STRANGE) {
      const s = at6(['d1_wrote_flirty', 'd1_lurked'], 'joke', { on: { d2_wrote_zerno: true } });
      const r = choose(content, s, 'K6-06f', id);
      expect(r.state.affinity - s.affinity, id).toBe(add);
      expect(r.state.flags.d6_talk.value, id).toBe(value);
      const tail = said(r.state).slice(said(s).length).map((m) => m.text);
      expect(tail.slice(0, 2), id).toEqual([card('K6-06f').choices.find((ch) => ch.id === id)!.label, line]);
      expect(tail.length, id).toBe(id === 'again' ? 2 : 3);             // no «Зерно» after a second heart
      expect(next(r.state), id).toBe('K6-07');
      const end = choose(content, drawStory(content, r.state).state, 'K6-07', 'ok');
      if (id === 'again') expect(end.outcome.text).toContain('После второго сердечка');
    }
    expect(choose(content, strange, 'K6-06f', 'own').state.lastChange).toEqual({ delta: 3, why: 'Признал неловкое сообщение' });
  });
  it('over the whole day Alina moves the chance between −5 and +11', () => {
    const totals: number[] = [];
    for (const flags of [['d1_wrote_plain', 'd1_said_coming'], ['d1_wrote_flirty', 'd1_joked'], ['d1_no_contact', 'd1_lurked'], ['d1_liked_only', 'd1_said_coming']]) {
      for (const reply of ['dry', 'plain', 'joke', 'excuse']) for (const second of ['open', 'work', 'short', 'own', 'again', 'shrug']) {
        const m = with1(morning6({ on: { d2_wrote_zerno: true } }), ...flags);
        let s = pick(evening(m, reply), 'K6-04', 'smile');
        for (let i = 0; i < 4; i++) {
          const d = drawStory(content, s);
          if (!d.card) break;
          const shown = ids(d.state, d.card.id);
          s = pick(d.state, d.card.id, shown.includes(second) ? second : shown.find((x) => x === 'read' || x === 'ok') ?? shown.at(-1)!);
        }
        expect(s.flags.d6_bye, `${flags} ${reply} ${second}`).toBeDefined();
        totals.push(s.affinity - m.affinity);
      }
    }
    expect([Math.min(...totals), Math.max(...totals)]).toEqual([-5, 11]);
  });
  it('the night craving follows the counter, and yesterday’s quarter is remembered', () => {
    const night = (p: Patch = {}) => {
      let s = pick(evening(morning6(p), 'dry'), 'K6-04', 'scroll');
      s = story(s, {});                                                 // «Ок, записала» and the goodbye
      return syncClock(content, s, at(143.5));
    };
    const a = night();
    expect(next(a)).toBe('K6-08a');
    expect(ids(patch(a, { items: { gum: 0 } }), 'K6-08a')).toEqual(['hold', 'smoke']);   // the quarter needs Day 1's half, the gum needs a gum
    const held = choose(content, a, 'K6-08a', 'hold');
    expect([held.state.energy - a.energy, held.state.counters.smoke_free, held.state.problems.care - a.problems.care, held.state.problems.conf - a.problems.conf]).toEqual([-2, 1, -2, -1]);
    expect(held.state.flags.d6_no_smoke).toBeDefined();
    expect(next(held.state)).toBeUndefined();                           // the strong card is not offered once the counter moved
    const q = night({ on: { d1_half: true, d5_quarter: true }, off: ['d5_smoked'], items: { gum: 1 } });
    expect(ids(q, 'K6-08a')).toEqual(['hold', 'quarter', 'gum', 'smoke']);
    expect(choose(content, q, 'K6-08a', 'hold').outcome.text).toContain('Вчера была четверть, сегодня ни одной');
    expect(choose(content, q, 'K6-08a', 'smoke').outcome.text).toContain('Вчера была четверть, сегодня целая');
    expect(choose(content, a, 'K6-08a', 'smoke').outcome.text).toContain('Как вчера и позавчера');
    const quarter = pick(q, 'K6-08a', 'quarter');
    expect([quarter.energy - q.energy, quarter.counters.smoke_free, quarter.problems.care - q.problems.care]).toEqual([-1, 0, 1]);
    const gum = pick(q, 'K6-08a', 'gum');
    expect([gum.items.gum, gum.counters.smoke_free, gum.energy]).toEqual([0, 1, q.energy]);
    for (const [free, word] of [[1, 'Второй'], [2, 'Третий'], [3, 'Четвёртый'], [5, 'Шестой']] as [number, string][]) {
      const b = night({ counters: { smoke_free: free }, off: ['d5_smoked'], on: { d5_no_smoke: true } });
      expect(next(b), word).toBe('K6-08b');
      const r = choose(content, b, 'K6-08b', 'hold');
      expect(r.outcome.text, word).toContain(`${word} день без табака`);
      expect([r.state.energy - b.energy, r.state.counters.smoke_free, r.state.problems.conf - b.problems.conf], word).toEqual([-3, free + 1, -2]);
      const smoked = pick(b, 'K6-08b', 'smoke');
      expect([smoked.counters.smoke_free, smoked.problems.care - b.problems.care], word).toEqual([0, 2]);
      expect(smoked.flags.d6_smoked, word).toBeDefined();
      expect(next(smoked), word).toBeUndefined();
    }
  });
  it('plus actions and sleep: staying up costs four, and the demo ends after day 6 with six frames', () => {
    let night = pick(evening(morning6(), 'dry'), 'K6-04', 'scroll');
    night = story(syncClock(content, story(night, {}), at(143.5)), Q6);
    expect(actionsFor(content, night).map((c) => c.id)).toEqual(['A6-run', 'A6-clean', 'A6-teeth', 'A6-couch', 'K6-sleep']);
    const day = syncClock(content, pick(morning6(), 'K6-01', 'dry'), at(133));
    expect(actionsFor(content, day).map((c) => c.id)).toEqual(['A-job', 'A6-run', 'A6-clean', 'A6-teeth', 'A6-couch'].sort((x, y) => content.cards.findIndex((c) => c.id === x) - content.cards.findIndex((c) => c.id === y)));
    expect(actionsFor(content, patch(day, { on: { d2_gym: true } })).map((c) => c.id)).toContain('A6-gym');
    expect(oddsFor(content, day, card('A6-run').choices[0]).map((o) => o.word)).toEqual(['часто', 'иногда']);
    const late = syncClock(full, pick(night, 'K6-sleep', 'late', full), at(153));
    expect(late.flags.d6_late).toBeDefined();
    expect([late.day, late.energy]).toEqual([7, 10 - 4]);
    expect(content.balance.contentDays).toBe(6);
    const end = syncClock(content, pick(night, 'K6-sleep', 'sleep'), at(153));
    expect(end.demoOver).toBe(true);
    expect(end.day).toBe(6);
    expect(end.summaries.map((d) => [d.day, d.played])).toEqual([[1, true], [2, true], [3, true], [4, true], [5, true], [6, true]]);
    expect(end.summaries[5].gift).toBe('gum');
    expect(content.days.find((d) => d.day === 6)).toMatchObject({ title: 'Первый разговор', teaser: 'Завтра суббота. Кофейня «Зерно»' });
    for (const part of ['morning', 'day', 'evening', 'night']) expect(content.cards.some((c) => c.id.startsWith('K6-') && c.kind === 'story' && c.when!.parts!.includes(part as 'day')), part).toBe(true);
  });
  it('a fully skipped Day 6: the dry reply went by itself, «Ок, записала», the goodbye, the beard hint, and the chance did not move', () => {
    const TITLES = ['Её вопрос ждёт', 'Образ из ленты', 'Рынок или оптика', 'Чат класса', 'Алина ответила', 'Алина прощается', 'Балкон'];
    for (const sleep5 of ['sleep', 'late']) {
      const before = pick(night5(), 'K5-sleep', sleep5, full);
      const s = syncClock(full, before, at(153));
      expect(s.day, sleep5).toBe(7);
      expect(d6(s), sleep5).toEqual([...(sleep5 === 'late' ? ['K6-00'] : []), 'K6-01', 'K6-02', 'K6-03c', 'K6-04', 'K6-05d', 'K6-07', 'K6-08a']);
      expect(s.affinity, sleep5).toBe(before.affinity);
      expect(s.coins, sleep5).toBe(before.coins);
      expect(s.flags.d6_reply.value, sleep5).toBe('dry');
      expect(s.flags.d6_beard_hint, sleep5).toBeDefined();
      expect(s.flags.d6_bye, sleep5).toBeDefined();
      expect(s.flags.d6_trend, sleep5).toBeUndefined();
      expect(s.problems.style, sleep5).toBe(before.problems.style + content.problems.find((p) => p.id === 'style')!.regress);
      const msgs = said(s);
      expect(msgs.map((m) => [m.from, !!m.status]), sleep5).toEqual([['hero', false], ['crush', true], ['crush', false], ...(sleep5 === 'late' ? [['crush', false]] : []), ['crush', false]]);
      expect(msgs[0].text, sleep5).toBe('Да, записывай.');
      expect(msgs[2].text, sleep5).toBe('Ок, записала.');
      if (sleep5 === 'late') expect(bank('alina_long'), sleep5).toContain(msgs[3].text);
      expect(bank('alina_goodbye'), sleep5).toContain(msgs.at(-1)!.text);
      expect(s.summaries[5], sleep5).toMatchObject({ day: 6, played: false, coins: 0 });
      expect(s.history.some((h) => h.day === 6), sleep5).toBe(false);
      const missed = s.missed!.at(-1)!;
      expect(missed.day, sleep5).toBe(6);
      expect(missed.items.map((i) => i.title), sleep5).toEqual([...(sleep5 === 'late' ? ['Проспал'] : []), ...TITLES]);
      expect(missed.items.find((i) => i.title === 'Её вопрос ждёт')!.text, sleep5).toContain('ответил коротко');
      expect(missed.items.find((i) => i.title === 'Чат класса')!.text, sleep5).toContain('Борода вообще не моё');
    }
    // days 5 and 6 both skipped: her message arrived by itself, and so did his reply
    const before = pick(day4({}, Q2, Q3, Q4), 'K4-sleep', 'sleep', full);
    const s = syncClock(full, before, at(153));
    expect(s.day).toBe(7);
    expect(s.flags.d5_alina_wrote).toBeDefined();
    expect(d6(s)).toEqual(['K6-01', 'K6-02', 'K6-03c', 'K6-04', 'K6-05d', 'K6-07', 'K6-08a']);
    expect(s.affinity).toBe(before.affinity + 6);                       // the Day 5 message only
    expect(said(s).filter((m) => !m.status).map((m) => m.from)).toEqual(['hero', 'crush', 'crush']);
    expect(s.flags.d6_beard_hint).toBeDefined();
    expect(s.missed!.map((m) => m.day)).toEqual([5, 6]);
    expect(s.missed!.at(-1)!.items.map((i) => i.title)).toEqual(TITLES);
  });
  it('every flag set on Day 6 is read on Day 6 or is on the Day 7 list', () => {
    const day7 = ['d6_reply', 'd6_talk', 'd6_trend', 'd6_shirt', 'd6_frame', 'bought_shirt', 'bought_frame', 'd6_beard_hint', 'd6_chat_spoke', 'd6_smoked', 'd6_no_smoke', 'd6_quarter', 'd6_late', 'd6_bye', 'd6_answered', 'd6_talked'];
    const mine = content.cards.filter((c) => /^[KA]6-/.test(c.id));
    const set = new Set(mine.flatMap((c) => c.choices.flatMap((ch) => ch.outcomes.flatMap((o) => (o.effects ?? []).flatMap((e) => ('flag' in e ? [e.flag] : []))))));
    expect([...set].filter((f) => !day7.includes(f))).toEqual([]);
  });
});

describe('переход в следующий день', () => {
  it('бросил курить и засиделся: завтра энергии меньше на 1 и на 4', () => {
    let s = day1({ 'K1-06': 'quit' }, full);
    expect(s.counters.smoke_free).toBe(1);
    s = pick(s, 'K1-09', 'late', full);
    s = syncClock(full, s, at(33));
    expect(s.day).toBe(2);
    expect(s.energy).toBe(20 - 1 - 4);
    expect(s.pending).toHaveLength(0);
  });
  it('пропущенный день: показатели хуже, награды нет', () => {
    const s = syncClock(full, start(), at(33));
    expect(s.day).toBe(2);
    expect(s.problems.care).toBeGreaterThan(65);
    expect(s.coins).toBe(100);
    expect(s.summaries[0].played).toBe(false);
    expect(s.log.at(-1)).toMatchObject({ kind: 'miss', text: 'Без тебя Андрей провёл день как раньше.' });
  });
  it('a skipped day card lists every bar that got worse, even when the percent stays at 0', () => {
    // Day 1 skipped: every level rises above its start, so "percent solved" is 0 before and after
    const d1 = syncClock(full, start(), at(33)).summaries[0];
    expect(d1.bars.every((b) => b.from === 0 && b.to === 0)).toBe(true);
    expect(d1.bars.filter((b) => b.drift === 'worse').map((b) => b.id)).toEqual(content.problems.filter((p) => p.regress > 0).map((p) => p.id));
    // Day 2 skipped after a played Day 1: whatever really got worse is visible one way or the other
    const before = syncClock(full, pick(day1({}, full), 'K1-09', 'sleep', full), at(33));
    const after = syncClock(full, before, at(57));
    const d2 = after.summaries[1];
    for (const b of d2.bars) {
      if (after.problems[b.id] > before.dayStart[b.id]) expect(b.to < b.from || b.drift === 'worse', b.id).toBe(true);
      else expect(b.drift).not.toBe('worse');
    }
    expect(d2.bars.some((b) => b.to < b.from)).toBe(true);
    // a played day with visible changes carries no drift marks
    expect(before.summaries[0].bars.filter((b) => b.to !== b.from).every((b) => b.drift === undefined)).toBe(true);
  });
  it('шанс растёт от решённых проблем и не доходит до 100', () => {
    const s = start();
    const low = chance(content, s);
    for (const id of Object.keys(s.problems)) s.problems[id] = 0;
    s.affinity = 60;
    expect(chance(content, s)).toBeGreaterThan(low);
    expect(chance(content, s)).toBeLessThanOrEqual(content.balance.chanceCap);
  });
  it('внешность следует за показателями', () => {
    const s = start();
    expect(currentLook(content, s).acne).toBe(75);
    s.problems.skin = 0;
    expect(currentLook(content, s).acne).toBe(0);
    expect(startLook(content, s).acne).toBe(75);
  });
  it('на 30-й день выносится вердикт', () => {
    const s = syncClock(full, start(), START + 31 * 24 * H);
    expect(s.verdict).toBeDefined();
    expect(s.verdict!.chance).toBeLessThanOrEqual(content.balance.chanceCap);
  });
});

describe('economy', () => {
  const item = (id: string) => content.items.find((x) => x.id === id)!;
  const rich = (s: GameState) => ({ ...s, coins: 1000 });

  it('a once-only item sells once and stays sold after use', () => {
    let s = buy(content, rich(start()), 'frame');
    expect(() => buy(content, s, 'frame')).toThrow();
    s = useItem(content, s, 'frame');
    expect(s.items.frame).toBe(0);
    expect(soldOut(s, item('frame'))).toBe(true);
    expect(currentLook(content, s).glasses).toBe('round');
    expect(() => buy(content, s, 'frame')).toThrow();
  });
  it('the gym pass adds energy and fitness from the next morning', () => {
    let s = useItem(content, buy(content, rich(start()), 'gym_pass'), 'gym_pass');
    const weight = s.problems.weight;
    s = syncClock(full, pick(syncClock(full, s, at(23.5)), 'K1-09', 'sleep', full), at(33));
    expect(s.day).toBe(2);
    expect(s.energy).toBe(content.balance.energyPerDay * content.balance.earlyBoost.factor + 2);
    expect(s.problems.weight).toBe(weight - 1);
  });
  it('a 7-day gym pass works for exactly seven mornings', () => {
    const s = useItem(content, buy(content, rich(start()), 'gym_pass'), 'gym_pass');
    const morning = (day: number) => syncClock(full, s, at(9 + 24 * (day - 1)));
    // a skipped Day 3 starts the doctor's course by itself, so only the pass is watched here
    const gym = (x: GameState) => x.modifiers.filter((m) => m.id === 'gym');
    for (let day = 2; day <= 8; day++) expect(gym(morning(day))).toHaveLength(1);
    expect(morning(8).energy).toBe(content.balance.energyPerDay + 2);
    expect(gym(morning(9))).toEqual([]);
    expect(morning(9).energy).toBe(content.balance.energyPerDay);
  });
  it('the side job pays coins for energy, once a day', () => {
    let s = syncClock(content, start(), at(13));
    const { coins, energy } = s;
    s = pick(s, 'A-job', 'go');
    expect([coins + 20, coins + 30]).toContain(s.coins);
    expect(s.energy).toBe(energy - 4);
    expect(actionsFor(content, s).map((c) => c.id)).not.toContain('A-job');
  });
  it('the side job comes back the next day', () => {
    let s = pick(syncClock(content, start(), at(13)), 'A-job', 'go');
    s = pick(syncClock(content, s, at(23.5)), 'K1-09', 'sleep');
    expect(actionsFor(content, syncClock(content, s, at(33))).map((c) => c.id)).not.toContain('A-job'); // morning
    s = syncClock(content, s, at(37));
    expect(actionsFor(content, s).map((c) => c.id)).toContain('A-job');
    expect(actionsFor(content, pick(s, 'A-job', 'go')).map((c) => c.id)).not.toContain('A-job');
  });
  it('the Day 2 card sells the same gym pass as the shop, and never twice', () => {
    const card = content.cards.find((c) => c.id === 'K2-04')!;
    const ids = (s: GameState) => choicesFor(content, s, card).map((x) => x.choice.id);
    const gymChoice = card.choices.find((c) => c.id === 'gym')!;
    const fromItem = item('gym_pass').onUse!.find((e) => 'modifier' in e);
    expect(gymChoice.cost?.coins).toBe(item('gym_pass').price?.coins);
    expect(gymChoice.outcomes[0].effects!.find((e) => 'modifier' in e)).toEqual(fromItem);

    const s0 = rich(start());
    expect(ids(s0)).toEqual(['park', 'gym', 'later']);
    // bought in the card: the shop shows the course as running and will not apply a second one
    const viaCard = pick(s0, 'K2-04', 'gym');
    expect(viaCard.coins).toBe(s0.coins - item('gym_pass').price!.coins!);
    expect(viaCard.modifiers.map((m) => m.id)).toEqual(['gym']);
    expect(courseActive(viaCard, item('gym_pass'))).toBe(true);
    expect(() => useItem(content, buy(content, viaCard, 'gym_pass'), 'gym_pass')).toThrow();
    // bought in the shop and still in the bag: the card activates it instead of charging again
    const inBag = buy(content, s0, 'gym_pass');
    expect(ids(inBag)).toEqual(['park', 'gym_have', 'later']);
    const used = pick(inBag, 'K2-04', 'gym_have');
    expect(used.coins).toBe(inBag.coins);
    expect(used.items.gym_pass).toBe(0);
    expect(used.modifiers.map((m) => m.id)).toEqual(['gym']);
    // bought and already applied: the card is only a workout, the course keeps its start day
    const running = { ...useItem(content, inBag, 'gym_pass'), day: 2 };
    const trained = pick(running, 'K2-04', 'gym_have');
    expect(trained.coins).toBe(running.coins);
    expect(trained.modifiers).toEqual(running.modifiers);
  });
  it('a full week of income does not cover everything in the shop', () => {
    const b = content.balance;
    const maxIncome = b.startCoins + b.dayCoins * 6 + 30 * 7;
    const shop = content.items.reduce((a, x) => a + (x.price?.coins ?? 0), 0);
    expect(shop).toBeGreaterThan(maxIncome);
  });
});

describe('skipped story resolves itself', () => {
  const seen = (s: GameState) => Object.keys(s.seen);
  const storyIds = (day: number) => content.cards.filter((c) => c.kind === 'story' && c.when?.days?.[0] === day).map((c) => c.id);
  const neutralOf = (id: string) => content.cards.find((c) => c.id === id)!.choices.find((ch) => ch.neutral)!;
  /** Day 1 played to the end with sleep, then nobody opens the game until the morning of day 3 */
  const skipDay2 = (p1: Record<string, string> = {}) => syncClock(full, pick(day1(p1, full), 'K1-09', 'sleep', full), at(57));

  it('every story card has one free neutral choice, and the checker catches a missing one', () => {
    const broken: Content = { ...content, cards: content.cards.map((c) => (c.id === 'K1-01' ? { ...c, choices: c.choices.map(({ neutral: _, ...ch }) => ch) } : c)) };
    expect(validateContent(broken).join('\n')).toContain('K1-01');
    const paid: Content = { ...content, cards: content.cards.map((c) => (c.id === 'K1-01' ? { ...c, choices: c.choices.map((ch) => (ch.neutral ? { ...ch, cost: { energy: 1 } } : ch)) } : c)) };
    expect(validateContent(paid).join('\n')).toContain('neutral choice must be free');
  });
  it('a fully skipped Day 2 after a played Day 1 plays its story with neutral choices', () => {
    const s = skipDay2();
    expect(s.day).toBe(3);
    // Day 1 defaults: told mum, saved the tea post, wrote to Alina
    expect(seen(s).filter((id) => id.startsWith('K2-'))).toEqual(['K2-01a', 'K2-03', 'K2-04', 'K2-05a', 'K2-07', 'K2-08', 'K2-09']);
    expect(s.flags.d2_derm_slot.value).toBe('morning');
    expect(s.hints).toContain('derm_number');
    expect(s.hints).not.toContain('zina_note');                  // K2-03 `home`, not `shop`
    expect(s.modifiers).toEqual([]);                             // K2-04 `later`: no gym pass bought for the player
    expect(s.log.filter((l) => l.kind === 'auto').map((l) => l.text)).toContain(neutralOf('K2-09').outcomes[0].text);
    expect(s.missed).toEqual([{ day: 2, items: s.log.filter((l) => l.kind === 'auto').map(({ title, text }) => ({ title, text })) }]);
    expect(s.history.some((h) => h.day === 2)).toBe(false);      // not the player's decisions
    expect(s.current).toBeUndefined();
  });
  it('a card gated by a flag from an earlier neutral choice is handled in order', () => {
    // «всё нормально» on Day 1 → morning message, then the evening call that gives the number
    const dark = skipDay2({ 'K1-03': 'fine' });
    const order = seen(dark).filter((id) => id.startsWith('K2-'));
    expect(order.indexOf('K2-01c')).toBeGreaterThanOrEqual(0);
    expect(order.indexOf('K2-06')).toBeGreaterThan(order.indexOf('K2-01c'));
    expect(dark.flags.d2_derm_slot.value).toBe('day');
    // inside one skipped day: K1-05 `close` sets d1_no_contact, which opens the night card K1-08b
    const d1 = syncClock(full, start(), at(33));
    expect(seen(d1)).toEqual(['K1-01', 'K1-02', 'K1-03', 'K1-05', 'K1-06', 'K1-07a', 'K1-07b', 'K1-08b']);
    expect(d1.flags.chance_shown).toBeDefined();
    expect(d1.log.find((l) => l.title === 'Чат класса')).toMatchObject({ day: 1, part: 'morning', kind: 'auto' });
  });
  it('the day still counts as skipped: no coins, regress applied, streak 0', () => {
    const before = pick(day1({}, full), 'K1-09', 'sleep', full);
    expect(before.streak).toBe(1);
    const s = skipDay2();
    expect(s.coins).toBe(before.coins);
    expect(s.streak).toBe(0);
    expect(s.playedDays).toEqual([1]);
    expect(s.summaries[1]).toMatchObject({ day: 2, played: false, coins: 0 });
    expect(s.summaries[1].picks).toEqual([]);
    for (const def of content.problems.filter((p) => p.regress > 0 && p.id !== 'conf')) {
      expect(s.problems[def.id]).toBe(Math.min(100, before.problems[def.id] + def.regress));
    }
    expect(s.log.at(-1)!.kind).toBe('miss');
  });
  it('a partly played day auto-plays only the remaining cards, including one left open', () => {
    let s = story(syncClock(full, pick(day1({}, full), 'K1-09', 'sleep', full), at(33)), { 'K2-03': 'shop' }, full);
    const playedMorning = seen(s).filter((id) => id.startsWith('K2-'));
    expect(playedMorning).toEqual(['K2-01a', 'K2-03']);
    // the day card is opened and left on the screen
    const open = drawStory(full, syncClock(full, s, at(37)));
    expect(open.card?.id).toBe('K2-04');
    s = syncClock(full, open.state, at(57));
    expect(s.missed).toHaveLength(1);
    expect(s.missed![0].items.map((i) => i.title)).toHaveLength(storyIds(2).filter((id) => id in s.seen).length - playedMorning.length);
    expect(s.log.filter((l) => l.day === 2 && l.kind === 'story')).toHaveLength(2);
    expect(s.hints).toContain('zina_note');                      // the player's own choice is kept
    expect(s.summaries[1]).toMatchObject({ day: 2, played: true, coins: content.balance.dayCoins });
    expect(s.current).toBeUndefined();
  });
  it('the same seed gives the same result', () => {
    const run = (seed: number) => syncClock(full, start(seed), at(57));
    expect(run(7)).toEqual(run(7));
    expect(run(7).rolls).toBeGreaterThan(start(7).rolls);
  });
  it('two skipped days in a row both resolve', () => {
    const s = syncClock(full, start(), at(57));
    expect(s.day).toBe(3);
    expect(s.missed!.map((m) => m.day)).toEqual([1, 2]);
    // Day 1 neutral `fine` → mum calls back in the evening of Day 2
    expect(seen(s)).toEqual(expect.arrayContaining(['K1-08b', 'K2-01c', 'K2-06', 'K2-09']));
    expect(seen(s)).not.toContain('K2-08');                      // nobody wrote to Alina
    expect(s.flags.d2_derm_slot.value).toBe('day');
    expect(s.summaries.map((d) => d.played)).toEqual([false, false]);
    expect(markMissedSeen(s).missed).toBeUndefined();
  });
  it('sleep is not auto-played, and a day the player closed is left alone', () => {
    const slept = pick(day1(), 'K1-09', 'sleep');
    expect(syncClock(full, slept, at(33)).missed).toBeUndefined();
    const s = syncClock(full, start(), at(33));
    expect(seen(s)).not.toContain('K1-09');
    expect(s.flags.d1_late).toBeUndefined();
  });
  it('a quest step queued for a skipped day stays in the queue', () => {
    const quest: Content = {
      ...full,
      cards: [...full.cards, { id: 'Q-test', kind: 'quest', title: 'Q', text: '', choices: [{ id: 'ok', label: 'ok', outcomes: [{ text: 'done' }] }] }],
    };
    const queued: GameState = { ...start(), queue: [{ cardId: 'Q-test', day: 1 }] };
    const s = syncClock(quest, queued, at(33));
    expect(s.queue).toEqual([{ cardId: 'Q-test', day: 1 }]);
    expect(seen(s)).not.toContain('Q-test');
    expect(drawStory(quest, s).card?.id).toBe('Q-test');
  });
});

describe('queued quest step', () => {
  const quest: Content = {
    ...full,
    cards: [...full.cards, { id: 'Q-test', kind: 'quest', title: 'Q', text: '', choices: [{ id: 'ok', label: 'ok', outcomes: [{ text: 'done' }] }] }],
  };
  const queued = (): GameState => ({ ...start(), queue: [{ cardId: 'Q-test', day: 1 }] });

  it('comes before the story, survives a reload while open, and is consumed by the choice', () => {
    const open = drawStory(quest, queued());
    expect(open.card?.id).toBe('Q-test');
    expect(open.state.current).toBe('Q-test');
    // reload: the saved state still shows the same card
    expect(drawStory(quest, structuredClone(open.state)).card?.id).toBe('Q-test');
    const done = pick(open.state, 'Q-test', 'ok', quest);
    expect(done.queue).toEqual([]);
    expect(drawStory(quest, done).card?.id).toBe('K1-01');
  });
  it('opened and left unanswered, it comes back after the part of the day changes', () => {
    const open = drawStory(quest, queued());
    const later = syncClock(quest, open.state, at(13));
    expect(later.part).toBe('day');
    expect(later.current).toBeUndefined();
    expect(drawStory(quest, later).card?.id).toBe('Q-test');
  });
  it('opened and left unanswered, it comes back after a skipped day', () => {
    const open = drawStory(quest, queued());
    const next = syncClock(quest, open.state, at(33));
    expect(next.day).toBe(2);
    expect(next.queue).toEqual([{ cardId: 'Q-test', day: 1 }]);
    expect(Object.keys(next.seen)).not.toContain('Q-test');
    expect(drawStory(quest, next).card?.id).toBe('Q-test');
  });
  it('a step that queues itself again keeps only the new entry', () => {
    const loop: Content = {
      ...quest,
      cards: quest.cards.map((c) => (c.id === 'Q-test' ? { ...c, choices: [{ id: 'ok', label: 'ok', outcomes: [{ text: 'done', effects: [{ queue: 'Q-test', inDays: 1 }] }] }] } : c)),
    };
    const done = pick(drawStory(loop, queued()).state, 'Q-test', 'ok', loop);
    expect(done.queue).toEqual([{ cardId: 'Q-test', day: 2 }]);
  });
});
