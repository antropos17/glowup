import { describe, expect, it } from 'vitest';
import { content } from '../src/content';
import { slotAt, msToNextPart } from '../src/engine/clock';
import {
  actionsFor, chance, check, choicesFor, choose, currentLook, dayEnergy, draw, drawStory,
  buy, courseActive, markMissedSeen, newGame, oddsFor, soldOut, startLook, syncClock, useItem,
} from '../src/engine/game';
import { validateContent } from '../src/engine/validate';
import type { Content, GameState, Modifier } from '../src/engine/types';
import { portraitSvg, type Look } from '../src/art/avatar';

const H = 3_600_000;
// 1 июня 2026, 09:00 по Баку (UTC+4)
const TZ = 240;
const START = Date.UTC(2026, 5, 1, 5, 0);
const at = (hour: number) => START + (hour - 9) * H;
const start = (seed = 7, now = START) => newGame(content, { seed, now, tzOffsetMin: TZ, archetypeId: 'andrey' });
/** тот же контент, но будто написаны все 30 дней: чтобы проверить переход в день 2 */
const full: Content = { ...content, balance: { ...content.balance, demoDays: 30 } };

const pick = (s: GameState, card: string, choice: string, c = content) => choose(c, s, card, choice).state;
/** the gym pass modifier, as the shop item and the Day 9 renewal set it */
const GYM = (content.items.find((x) => x.id === 'gym_pass')!.onUse![0] as { modifier: Modifier }).modifier;
/** the state with a gym pass set on `fromDay` (it works from the next morning) */
const passFrom = (s: GameState, fromDay: number): GameState => ({ ...s, modifiers: [...s.modifiers.filter((m) => m.id !== 'gym'), { ...GYM, fromDay }] });
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

describe('the count condition', () => {
  const s = { ...start(), flags: { a: { value: true, day: 1 }, b: { value: true, day: 1 } } };
  const three = [{ flag: 'a' }, { flag: 'b' }, { flag: 'c' }];            // two of three hold
  const n = (x: object) => check(content, s, x as never);
  it('counts the conditions that hold, below, at and above each bound', () => {
    expect([1, 2, 3].map((k) => n({ count: three, gte: k }))).toEqual([true, true, false]);
    expect([1, 2, 3].map((k) => n({ count: three, lte: k }))).toEqual([false, true, true]);
    expect([n({ count: three, gte: 2, lte: 2 }), n({ count: three, gte: 1, lte: 1 }), n({ count: three, gte: 3, lte: 3 })]).toEqual([true, false, false]);
  });
  it('works with nested conditions', () => {
    const nested = [{ any: [{ flag: 'c' }, { flag: 'a' }] }, { not: { flag: 'b' } }, { count: three, gte: 2 }];   // true, false, true
    expect([n({ count: nested, gte: 2 }), n({ count: nested, gte: 3 }), n({ not: { count: nested, lte: 1 } })]).toEqual([true, false, true]);
  });
  it('the checker wants a non-empty list, a bound, and valid conditions inside', () => {
    const withCond = (x: object) => validateContent({ ...content, tastes: [{ id: 'no_beard', title: 'x', bonus: 0, wants: [x as never] }] });
    expect(withCond({ count: [{ flag: 'a' }], gte: 1 })).toEqual([]);
    expect(withCond({ count: [], gte: 1 }).join()).toContain('empty list');
    expect(withCond({ count: [{ flag: 'a' }] }).join()).toContain('needs gte or lte');
    expect(withCond({ count: [{ problem: 'nope' }], gte: 1 }).join()).toContain('nope');
  });
});

describe('the modifier condition', () => {
  const on = (day: number, fromDay?: number): GameState => {
    const s: GameState = { ...start(), day, part: 'evening' };
    return fromDay === undefined ? s : passFrom(s, fromDay);
  };
  const n = (s: GameState, x: object) => check(content, s, x as never);
  const gymOpen = (s: GameState) => actionsFor(full, s).some((c) => c.id === `A${s.day}-gym`);
  it('holds from the morning after the modifier is set through its last day, not before and not after', () => {
    expect([10, 11, 17, 18].map((d) => n(on(d, 10), { modifier: 'gym' }))).toEqual([false, true, true, false]);
    expect([10, 11, 17, 18].map((d) => n(on(d, 10), { modifier: 'gym', set: false }))).toEqual([true, false, false, true]);
    expect([n(on(12), { modifier: 'gym' }), n(on(12, 10), { modifier: 'derm_course' })]).toEqual([false, false]);
  });
  it('compares the days left: days - 1 on the first day, 0 on the last, no end without days', () => {
    const left = (d: number, x: object) => n(on(d, 10), { modifier: 'gym', ...x });
    expect([left(11, { eq: 6 }), left(11, { gte: 6 }), left(11, { gte: 7 }), left(11, { lte: 5 })]).toEqual([true, true, false, false]);
    expect([left(17, { eq: 0 }), left(17, { lte: 0 }), left(16, { lte: 0 }), left(16, { eq: 1 })]).toEqual([true, true, false, true]);
    expect(left(10, { gte: 0 })).toBe(false);                                     // the day it is set does not count
    const endless: GameState = { ...on(25), modifiers: [{ id: 'gym', title: 'x', fromDay: 2 }] };
    expect([n(endless, { modifier: 'gym', gte: 100 }), n(endless, { modifier: 'gym', lte: 100 })]).toEqual([true, false]);
  });
  it('the gym of Days 10–14 is open with the pass renewed on Day 9 and closed without a pass', () => {
    const renewed = (d: number) => ({ ...on(d, 9), flags: { d9_pass: { value: 'renewed', day: 9 } } });
    expect([10, 11, 12, 13, 14].map((d) => gymOpen(renewed(d)))).toEqual([true, true, true, true, true]);
    expect([10, 11, 12, 13, 14].map((d) => gymOpen(on(d)))).toEqual([false, false, false, false, false]);
    expect([10, 11, 12, 13, 14].map((d) => gymOpen(on(d, 2)))).toEqual([false, false, false, false, false]);   // the Day 2 pass ended on Day 9
  });
  it('a shop pass used on a day opens the gym for exactly its seven days, on the real clock', () => {
    const run = (useDay: number) => {
      const used = useItem(full, buy(full, { ...start(), day: useDay, coins: 500 }, 'gym_pass'), 'gym_pass');
      const days: Record<number, [boolean, boolean]> = {};
      let s = used;
      for (let d = useDay; d <= 18; d++) {
        s = syncClock(full, s, at(9 + 24 * (d - 1) + 10));                         // the evening of day d
        days[d] = [n(s, { modifier: 'gym' }), d >= 10 && d <= 14 && gymOpen(s)];
      }
      return days;
    };
    const six = run(6);
    expect(Object.entries(six).filter(([, v]) => v[0]).map(([d]) => +d)).toEqual([7, 8, 9, 10, 11, 12, 13]);
    expect([10, 11, 12, 13, 14].map((d) => six[d][1])).toEqual([true, true, true, true, false]);
    const twelve = run(12);
    expect([12, 13, 14].map((d) => twelve[d][1])).toEqual([false, true, true]);
    expect(Object.entries(twelve).filter(([, v]) => v[0]).map(([d]) => +d)).toEqual([13, 14, 15, 16, 17, 18]);
  });
  it('the checker rejects an unknown modifier name', () => {
    const withCond = (x: object) => validateContent({ ...content, tastes: [{ id: 'no_beard', title: 'x', bonus: 0, wants: [x as never] }] });
    expect(withCond({ modifier: 'gym', gte: 1 })).toEqual([]);
    expect(withCond({ modifier: 'sauna' }).join()).toContain('no modifier «sauna»');
    expect(withCond({ not: { modifier: 'sauna' } }).join()).toContain('sauna');
  });
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
    const last = content.balance.demoDays;
    expect(syncClock(content, day1(), at(9 + 24 * (last - 1))).demoOver).toBeUndefined();
    const s = syncClock(content, day1(), at(9 + 24 * last));
    expect(s.demoOver).toBe(true);
    expect(s.day).toBe(last);
    expect(draw(content, s).card).toBeNull();
  });
  describe('demoDays cut-off', () => {
    const k1 = content.cards.find((c) => c.id === 'K1-01')!;
    const after = content.balance.contentDays + 1;
    const unwritten = { ...k1, id: `K${after}-test`, when: { ...k1.when, days: [after, after] as [number, number] } };
    const week2 = (ids: string[]) => ids.filter((id) => /^[KA](8|9)-/.test(id));
    it('with Days 8–15 written, the demo still ends after Day 7 with «Продолжение следует» and never draws a later card', () => {
      expect([content.balance.demoDays, content.balance.contentDays]).toEqual([7, 15]);
      expect(content.cards.filter((c) => /^[KA]9-/.test(c.id)).length).toBeGreaterThan(15);
      const s = syncClock(content, start(), at(9 + 24 * 9));
      expect([s.demoOver, s.day]).toEqual([true, 7]);
      expect(week2(Object.keys(s.seen))).toEqual([]);
      expect(drawStory(content, s).card).toBeNull();
      expect(actionsFor(content, s)).toEqual([]);
      const lifted: Content = { ...content, balance: { ...content.balance, demoDays: 8 } };
      const s8 = syncClock(lifted, start(), at(9 + 24 * 9));
      expect([s8.demoOver, s8.day]).toEqual([true, 8]);
      expect(week2(Object.keys(s8.seen))).toContain('K8-02e');
      expect(Object.keys(s8.seen).filter((id) => id.startsWith('K9-'))).toEqual([]);
      const s9 = syncClock({ ...content, balance: { ...content.balance, demoDays: 9 } }, start(), at(9 + 24 * 9));
      expect([s9.demoOver, s9.day]).toEqual([true, 9]);
      expect(Object.keys(s9.seen)).toContain('K9-01');
      expect(content.cards.filter((c) => /^[KA]12-/.test(c.id)).length).toBeGreaterThan(20);
      expect(content.cards.filter((c) => /^[KA]13-/.test(c.id)).length).toBeGreaterThan(20);
      expect(content.cards.filter((c) => /^[KA]14-/.test(c.id)).length).toBeGreaterThan(20);
      expect(content.cards.filter((c) => /^[KA]15-/.test(c.id)).length).toBeGreaterThan(20);
      expect(Object.keys(s.seen).filter((id) => /^K1[0-5]-/.test(id))).toEqual([]);
    });
    it('validation rejects demoDays above contentDays', () => {
      expect(validateContent({ ...content, balance: { ...content.balance, demoDays: after } }).join('\n')).toContain('demoDays');
    });
    it('validation rejects a card whose days go past contentDays', () => {
      expect(validateContent({ ...content, cards: [...content.cards, unwritten] }).join('\n')).toContain(unwritten.id);
    });
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
    expect(pick(late, 'K6-00', 'up').log.at(-1)!.text).not.toMatch(/Сил|d/);   // no energy number in the text: a gym pass changes it
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
    expect(card('K6-03c').text).toContain('На шашлыки не пришёл');
    const price = (id: string) => content.items.find((i) => i.id === id)!.price!.coins;
    for (const id of ['K6-03a', 'K6-03b', 'K6-03c']) {
      const cost = (ch: string) => card(id).choices.find((x) => x.id === ch)!.cost;
      expect(cost('shirt'), id).toEqual({ coins: price('shirt') });
      expect(cost('frame'), id).toEqual({ coins: price('frame') });
      expect(card(id).text, id).toContain('Рубашка: 90 монет, стиль +6');
      expect(card(id).text, id).toContain('Оправа в оптике: 150 монет, стиль +12, уверенность +2');
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
    // both bought before the card: a variant without prices, and it never follows the selling card
    const owned = day({ on: { bought_shirt: true, bought_frame: true } });
    expect(next(owned)).toBe('K6-03co');
    expect(next(day({ off: ['d4_home'], on: { d4_went: true, d4_meat_held: true, bought_shirt: true, bought_frame: true } }))).toBe('K6-03ao');
    expect(next(day({ off: ['d4_home'], on: { d4_went: true, d4_feast: true, bought_shirt: true, bought_frame: true } }))).toBe('K6-03bo');
    for (const id of ['K6-03ao', 'K6-03bo', 'K6-03co']) {
      expect(card(id).text, id).not.toMatch(/монет|стиль +/);
      expect(card(id).choices.map((ch) => ch.id), id).toEqual(['look', 'home']);
    }
    expect(next(pick(owned, 'K6-03co', 'home'))).toBeUndefined();
    expect(next(pick(patch(s, { on: { bought_shirt: true } }), 'K6-03c', 'frame'))).toBeUndefined();
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
  it('plus actions and sleep: staying up costs four, and after day 6 the week goes on to day 7', () => {
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
    expect(content.balance.demoDays).toBe(7);
    const end = syncClock(content, pick(night, 'K6-sleep', 'sleep'), at(153));
    expect(end.demoOver).toBeUndefined();
    expect(end.day).toBe(7);
    expect(end.summaries.map((d) => [d.day, d.played])).toEqual([[1, true], [2, true], [3, true], [4, true], [5, true], [6, true]]);
    expect(end.summaries[5].gift).toBe('gum');
    expect(content.days.find((d) => d.day === 6)).toMatchObject({ title: 'Первый разговор', teaser: 'Завтра суббота. Кофейня «Зерно»' });
    for (const part of ['morning', 'day', 'evening', 'night']) expect(content.cards.some((c) => c.id.startsWith('K6-') && c.kind === 'story' && c.when!.parts!.includes(part as 'day')), part).toBe(true);
  });
  it('staying up rereads the talk (d6_talk) or only her short «Записала»; both close the day the same way', () => {
    let night = pick(evening(morning6(), 'dry'), 'K6-04', 'scroll');
    night = story(syncClock(content, story(night, {}), at(143.5)), Q6);
    const late = card('K6-sleep').choices.find((c) => c.id === 'late')!;
    expect(late.outcomes[0].effects).toEqual(late.outcomes[1].effects);
    const quiet = choose(content, night, 'K6-sleep', 'late');
    expect(night.flags.d6_talk).toBeUndefined();                     // the dry reply: no K6-06, no d6_talk
    expect(quiet.outcome.text).toBe('К трём часам ночи её «Записала» перечитано раз сорок. Новых букв там не прибавилось. Завтра на четыре энергии меньше.');
    for (const talk of ['open', 'work', 'short', 'owned', 'repeat', 'shrug']) {
      const r = choose(content, patch(night, { on: { d6_talk: talk } }), 'K6-sleep', 'late');
      expect(r.outcome.text, talk).toBe('К трём часам ночи переписка перечитана от первого слова до последнего. Завтра на четыре энергии меньше.');
      expect([syncClock(full, r.state, at(153)).day, r.state.flags.d6_late !== undefined], talk).toEqual([7, true]);
    }
    expect(syncClock(full, quiet.state, at(153)).day).toBe(7);
    expect(quiet.state.flags.d6_late).toBeDefined();
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

  describe('день 7', () => {
    /** the night of day 6 on the quiet path: dry reply, nothing bought, a cigarette on the balcony */
    let n6: GameState | undefined;
    const night6 = () => (n6 ??= story(syncClock(content, story(pick(evening(morning6(), 'dry'), 'K6-04', 'scroll'), {}), at(143.5)), Q6));
    /** flags of the visible changes and the threads are switched per test */
    const CH = ['shaved', 'd7_red', 'bought_shirt', 'bought_frame', 'd5_cleaned', 'd3_course', 'd6_trend', 'd4_went', 'd1_wrote_flirty', 'd2_zerno_known', 'd2_wrote_zerno'];
    const morning7 = (p: Patch = {}, sleep6 = 'sleep') => patch(syncClock(content, pick(night6(), 'K6-sleep', sleep6), at(153)), { ...p, off: [...CH, ...(p.off ?? [])] });
    /** quiet choices of Day 7: keep the stubble, smoke, nod, shrug, the neutral thread answer */
    const Q7: Record<string, string> = { 'K7-01a': 'keep', 'K7-01b': 'keep', 'K7-02a': 'smoke', 'K7-02b': 'smoke', 'K7-03a': 'nod', 'K7-03b': 'nod', 'K7-04a': 'shrug', 'K7-04b': 'shrug', 'K7-04c': 'shrug', 'K7-05a': 'shrug', 'K7-05b': 'no', 'K7-05c': 'fine', 'K7-05d': 'see' };
    const play7 = (s: GameState, p: Record<string, string> = {}) => [157, 163, 167.5].reduce((x, h) => story(syncClock(content, x, at(h)), { ...Q7, ...p }), story(s, { ...Q7, ...p }));
    const d7 = (s: GameState) => Object.keys(s.seen).filter((id) => id.startsWith('K7-'));
    const her7 = (s: GameState) => s.chat.filter((m) => m.day === 7 && m.from === 'crush').map((m) => m.text);
    /** morning played quietly, the day part opens on the craving at the door */
    const door = (p: Patch = {}) => syncClock(content, story(morning7(p), Q7), at(157));

    it('the morning: «Проспал» after a late night, then the razor; the cream gives a clean shave, without it the face is red', () => {
      expect(next(morning7({}, 'late'))).toBe('K7-00b');
      expect(next(morning7())).toBe('K7-01a');
      expect(next(morning7({ off: ['d6_beard_hint'] }))).toBe('K7-01b');
      expect(card('K7-01a').text).toContain('«Борода вообще не моё»');
      expect(card('K7-01b').text).not.toContain('Борода');
      expect(ids(morning7({ items: { cream_zina: 1 } }), 'K7-01a')).toEqual(['cream', 'keep']);
      expect(ids(morning7({ items: { cream_zina: 0 } }), 'K7-01a')).toEqual(['bare', 'keep']);
      const clean = pick(morning7({ items: { cream_zina: 1 } }), 'K7-01a', 'cream');
      expect([!!clean.flags.shaved, !!clean.flags.d7_red, clean.lookPatch.facial, clean.lookPatch.razorBurn]).toEqual([true, false, 'none', undefined]);
      expect([clean.problems.conf, clean.items.cream_zina]).toEqual([morning7({ items: { cream_zina: 1 } }).problems.conf, 1]);   // no confidence from the cream, and the tube stays
      const s0 = morning7({ items: { cream_zina: 0 } });
      const red = pick(s0, 'K7-01a', 'bare');
      expect([!!red.flags.shaved, !!red.flags.d7_red, red.lookPatch.facial, red.lookPatch.razorBurn]).toEqual([true, true, 'none', true]);
      expect(red.problems.conf).toBeGreaterThan(s0.problems.conf);
      expect(red.affinity).toBe(s0.affinity);                       // shaving pays only through the taste no_beard
      expect(chance(content, red)).toBeGreaterThan(chance(content, s0));
      const kept = pick(s0, 'K7-01a', 'keep');
      expect([kept.flags.shaved, kept.lookPatch.facial]).toEqual([undefined, undefined]);
    });
    it('split texts: the cream by where it came from, the long talk by training, «Проспал» by the Day 6 talk', () => {
      const fits = (s: GameState, cardId: string, choiceId: string) =>
        card(cardId).choices.find((c) => c.id === choiceId)!.outcomes.filter((o) => (o.if ?? []).every((x) => check(content, s, x)));
      const text = (s: GameState, cardId: string, choiceId: string) => choose(content, s, cardId, choiceId).outcome.text;
      // the cream: from Aunt Zina or from the pharmacy, same effects
      const zina = morning7({ items: { cream_zina: 1 }, on: { d5_helped_zina: true } });
      const shop = morning7({ items: { cream_zina: 1 }, off: ['d5_helped_zina'] });
      for (const id of ['K7-01a', 'K7-01b']) {
        expect(text(zina, id, 'cream'), id).toMatch(/^Крем тёти Зины пахнет аптекой и мятой\./);
        expect(text(shop, id, 'cream'), id).toMatch(/^Крем с Садовой пахнет аптекой и мятой\./);
        const [a, b] = card(id).choices.find((c) => c.id === 'cream')!.outcomes;
        expect(a.effects, id).toEqual(b.effects);
        expect(a.why, id).toBe(b.why);
        for (const s of [zina, shop]) expect(fits(s, id, 'cream'), id).toHaveLength(1);
      }
      expect([pick(zina, 'K7-01a', 'cream').lookPatch, pick(shop, 'K7-01a', 'cream').lookPatch]).toEqual([{ facial: 'none' }, { facial: 'none' }]);
      // the long talk: the park only for a player who trained
      const TRAIN_FLAGS = ['d1_run', 'd2_park', 'd2_gym'];
      const TRAIN_CARDS = ['A4-run', 'A5-run', 'A6-run', 'A4-gym', 'A5-gym', 'A6-gym'];
      const lazy = (() => { const s = morning7({ off: TRAIN_FLAGS }); const seen = { ...s.seen }; for (const id of TRAIN_CARDS) delete seen[id]; return { ...s, seen }; })();
      const trained = [...TRAIN_FLAGS.map((f) => morning7({ off: TRAIN_FLAGS, on: { [f]: true } })), ...TRAIN_CARDS.map((id) => ({ ...lazy, seen: { ...lazy.seen, [id]: 5 } }))];
      for (const id of ['K7-04b', 'K7-04c']) {
        const long = card(id).choices.find((c) => c.id === 'long')!;
        expect(long.label, id).toBe('Рассказать про врача и про всё остальное');
        expect(long.outcomes[0].effects, id).toEqual(long.outcomes[1].effects);
        expect(text(lazy, id, 'long'), id).toMatch(/перешёл к планам на жизнь и где-то на третьем пункте/);
        for (const s of trained) expect(text(s, id, 'long'), id).toMatch(/перешёл к спорту и где-то на втором круге по парку/);
        // every combination of the nine training marks gives exactly one outcome
        for (let m = 0; m < 512; m++) {
          const flags = { ...lazy.flags }, seen = { ...lazy.seen };
          TRAIN_FLAGS.forEach((f, i) => { if (m & (1 << i)) flags[f] = { value: true, day: 2 }; });
          TRAIN_CARDS.forEach((c, i) => { if (m & (1 << (i + 3))) seen[c] = 5; });
          expect(fits({ ...lazy, flags, seen }, id, 'long'), `${id} ${m}`).toHaveLength(1);
        }
      }
      // «Проспал»: the talk (d6_talk, any value) or only her short «Записала»; never both, nothing without d6_late
      const late = morning7({}, 'late');
      expect(late.flags.d6_talk).toBeUndefined();                    // the quiet path: dry reply, «Ок, записала.»
      expect(next(late)).toBe('K7-00b');
      expect(card('K7-00b').text).toBe('Вчера до трёх ночи перечитывал её «Записала», как будто там было что-то ещё. Суббота началась ближе к полудню, и сил сегодня меньше обычного.');
      expect(card('K7-00a').text).toBe('Вчерашний разговор перечитан до трёх ночи. Суббота началась ближе к полудню, и сил сегодня меньше обычного.');
      const eligible7 = (s: GameState) => ['K7-00a', 'K7-00b'].filter((id) => card(id).when!.requires!.every((x) => check(content, s, x)));
      for (const talk of ['open', 'work', 'short', 'owned', 'repeat', 'shrug']) {
        const s = morning7({ on: { d6_talk: talk } }, 'late');
        expect(next(s), talk).toBe('K7-00a');
        expect(eligible7(s), talk).toEqual(['K7-00a']);
        expect(eligible7(morning7({ on: { d6_talk: talk } })), talk).toEqual([]);
      }
      expect(eligible7(late)).toEqual(['K7-00b']);
      expect(eligible7(morning7())).toEqual([]);
      expect(JSON.stringify(card('K7-00a').choices)).toBe(JSON.stringify(card('K7-00b').choices));
    });
    it('the craving moves to the door of «Зерно» and keeps the prices of the balcony', () => {
      expect(next(door())).toBe('K7-02a');
      expect(next(door({ counters: { smoke_free: 2 } }))).toBe('K7-02b');
      const cost = (id: string) => card(id).choices.map((c) => [c.id, c.cost?.energy ?? 0]);
      expect(cost('K7-02a')).toEqual([['hold', 2], ['quarter', 1], ['gum', 0], ['smoke', 0]]);
      expect(cost('K7-02b')).toEqual([['hold', 3], ['quarter', 1], ['gum', 0], ['smoke', 0]]);
      for (const id of ['K7-02a', 'K7-02b']) expect(card(id).text).toContain('кофейни');
      const held = pick(door({ counters: { smoke_free: 2 } }), 'K7-02b', 'hold');
      expect([held.counters.smoke_free, !!held.flags.d7_no_smoke]).toEqual([3, true]);
      expect(pick(door(), 'K7-02a', 'smoke').flags.d7_smoked).toBeDefined();
    });
    it('everyone meets her; the entrance knows whether he knew the place', () => {
      const inside = (p: Patch = {}) => pick(door(p), 'K7-02a', 'smoke');
      expect(next(inside())).toBe('K7-03b');
      expect(next(inside({ on: { d2_zerno_known: true } }))).toBe('K7-03a');
      expect(next(inside({ on: { d2_wrote_zerno: true } }))).toBe('K7-03a');
      const s = inside();
      expect(ids(s, 'K7-03b')).toEqual(['hello', 'nod', 'ignore']);
      expect(['hello', 'nod', 'ignore'].map((id) => pick(s, 'K7-03b', id).affinity - s.affinity)).toEqual([3, 0, -2]);
      expect(d7(play7(morning7()))).toEqual(['K7-01a', 'K7-02a', 'K7-03b', 'K7-04a', 'K7-05d', 'K7-06e']);
    });
    it('her line follows the number of visible changes, and the trendy look alone is not one', () => {
      const LINE: Record<string, string> = { plain: 'K7-04a', other: 'K7-04b', nice: 'K7-04c' };
      const lineOf = (p: Patch, shave: string, smoke: string) => {
        const s = play7(morning7(p), { 'K7-01a': shave, 'K7-02a': smoke });
        return Object.keys(LINE).find((k) => LINE[k] in s.seen);
      };
      const crs = (n: number) => ({ cream_zina: n });
      expect(lineOf({}, 'keep', 'smoke')).toBe('plain');                                                  // 0
      expect(lineOf({ on: { d3_course: true } }, 'keep', 'smoke')).toBe('plain');                          // 1
      expect(lineOf({ on: { d3_course: true } }, 'keep', 'hold')).toBe('other');                           // 2: no tobacco today
      expect(lineOf({ on: { d3_course: true, bought_frame: true }, items: crs(1) }, 'cream', 'smoke')).toBe('other'); // 3
      expect(lineOf({ on: { d3_course: true, bought_frame: true }, items: crs(1) }, 'cream', 'hold')).toBe('nice');   // 4
      expect(lineOf({ on: { d3_course: true, bought_shirt: true, d5_cleaned: 'full' }, items: crs(1) }, 'cream', 'hold')).toBe('nice'); // 5
      expect(lineOf({ on: { d3_course: true, bought_frame: true }, items: crs(0) }, 'bare', 'hold')).toBe('other');   // a red face is not a clean shave
      expect(lineOf({ on: { d3_course: true, d6_trend: true } }, 'keep', 'smoke')).toBe('plain');                      // the trendy look is not clothes
      const trend = play7(morning7({ on: { d6_trend: true } }));
      expect(trend.log.find((l) => l.title === 'Кофейня «Зерно»')!.text).toContain('рубашке поверх худи');
      for (const id of Object.values(LINE)) expect(card(id).choices.map((c) => c.id)).toEqual(['good', 'shrug', 'long']);
    });
    it('one thread per player, by priority: the strange message, the song, the barbecue, the reunion', () => {
      const thread = (p: Patch) => d7(play7(morning7(p))).find((id) => id.startsWith('K7-05'));
      const flirty: Patch = { on: { d1_wrote_flirty: true, d6_reply: 'dry', d4_went: true } };
      expect(thread(flirty)).toBe('K7-05a');
      expect(thread({ on: { d1_wrote_flirty: true, d6_reply: 'excuse' } })).toBe('K7-05a');
      expect(thread({ on: { d1_wrote_flirty: true, d6_reply: 'plain', d4_went: true } })).toBe('K7-05c'); // answered on Day 6 already
      expect(thread({ on: { d6_reply: 'joke', d4_went: true } })).toBe('K7-05b');
      expect(thread({ on: { d4_went: true } })).toBe('K7-05c');
      expect(thread({})).toBe('K7-05d');
      let s = pick(door(flirty), 'K7-02a', 'smoke');
      s = pick(pick(s, 'K7-03b', 'nod'), 'K7-04a', 'shrug');
      expect(next(s)).toBe('K7-05a');
      expect(['own', 'shrug', 'again'].map((id) => pick(s, 'K7-05a', id).affinity - s.affinity)).toEqual([3, 0, -2]);
    });
    it('the evening message: three tones chosen only by the scene, one button, about ten phrasings each', () => {
      const tone = (p: Record<string, string>, s0 = morning7()) => {
        const s = play7(s0, p);
        return [s.flags.d7_msg.value, her7(s).at(-1)];
      };
      const [w, wl] = tone({ 'K7-03b': 'hello', 'K7-04a': 'good', 'K7-05d': 'wit' });
      const [e, el] = tone({});
      const [d, dl] = tone({ 'K7-03b': 'ignore', 'K7-04a': 'long' });
      expect([w, e, d]).toEqual(['warm', 'even', 'dry']);
      // the dry boundary is −2: one minus answer (−1) still gives the even tone, two give the dry one
      expect(tone({ 'K7-03b': 'ignore' })[0]).toBe('even');
      expect(tone({ 'K7-05d': 'moan' })[0]).toBe('even');
      expect(tone({ 'K7-04a': 'long', 'K7-05d': 'moan' })[0]).toBe('dry');
      expect(tone({ 'K7-03b': 'ignore', 'K7-04a': 'long', 'K7-05d': 'moan' })[0]).toBe('dry');
      expect(tone({ 'K7-03b': 'hello', 'K7-04a': 'long' })[0]).toBe('even');
      expect(bank('alina_d7_warm')).toContain(wl);
      expect(bank('alina_d7_even')).toContain(el);
      expect(bank('alina_d7_dry')).toContain(dl);
      const rich = morning7(); rich.affinity = 40;                  // a high chance before the scene does not choose the tone
      expect(tone({}, rich)[0]).toBe('even');
      for (const key of ['alina_d7_warm', 'alina_d7_even', 'alina_d7_dry']) expect(bank(key)).toHaveLength(10);
      for (const id of ['K7-06w', 'K7-06e', 'K7-06d']) expect(card(id).choices.map((c) => c.id)).toEqual(['ok']);
    });
    it('over the scene Alina moves the chance between −6 and +10 on every thread, by every path, and sleep ends the demo with seven frames', () => {
      // every entrance × answer × thread answer; the three line cards K7-04a/b/c carry the same +4 / 0 / −2
      const THREADS: [string, Patch][] = [['K7-05a', { on: { d1_wrote_flirty: true, d6_reply: 'dry' } }], ['K7-05b', { on: { d6_reply: 'joke' } }], ['K7-05c', { on: { d4_went: true } }], ['K7-05d', {}]];
      const range: Record<string, number[]> = {};
      let best: GameState | undefined;
      for (const [th, p] of THREADS) {
        const s0 = morning7(p);
        const deltas: number[] = [];
        for (const a of ids(s0, 'K7-03b')) for (const b of card('K7-04a').choices.map((c) => c.id)) for (const c of card(th).choices.map((x) => x.id)) {
          const s = play7(s0, { 'K7-03b': a, 'K7-04a': b, [th]: c });
          expect(th in s.seen, th).toBe(true);
          deltas.push(s.affinity - s0.affinity);
          if (s.affinity - s0.affinity === 10) best = s;
        }
        range[th] = [Math.min(...deltas), Math.max(...deltas), deltas.length];
      }
      expect(range).toEqual({ 'K7-05a': [-6, 10, 27], 'K7-05b': [-6, 10, 27], 'K7-05c': [-6, 10, 27], 'K7-05d': [-6, 10, 27] });
      best = best!;
      expect(actionsFor(content, best).map((c) => c.id)).toEqual(['A7-run', 'A7-clean', 'A7-teeth', 'A7-couch', 'K7-sleep']);
      expect(card('K7-sleep').choices.map((c) => c.id)).toEqual(['sleep', 'late']);
      const end = syncClock(content, pick(best, 'K7-sleep', 'sleep'), at(177));
      expect([end.demoOver, end.day]).toEqual([true, 7]);
      expect(end.summaries.map((x) => x.played)).toEqual([true, true, true, true, true, true, true]);
      for (const part of ['morning', 'day', 'evening', 'night']) expect(content.cards.some((c) => /^[KA]7-/.test(c.id) && c.when!.parts!.includes(part as 'day')), part).toBe(true);
    });
    it('a fully skipped Day 7: no shave, a nod, a shrug, the even tone, and the chance did not move', () => {
      for (const sleep6 of ['sleep', 'late']) {
        const before = syncClock(content, pick(night6(), 'K6-sleep', sleep6), at(153));
        const s = syncClock(content, before, at(177));
        expect(s.demoOver, sleep6).toBe(true);
        expect(d7(s), sleep6).toEqual([...(sleep6 === 'late' ? ['K7-00b'] : []), 'K7-01a', 'K7-02a', 'K7-03b', 'K7-04a', 'K7-05d', 'K7-06e']);
        expect(s.affinity, sleep6).toBe(before.affinity);
        expect(s.flags.shaved, sleep6).toBeUndefined();
        expect([s.flags.d7_met.value, s.flags.d7_msg.value], sleep6).toEqual(['nod', 'even']);
        expect(bank('alina_d7_even'), sleep6).toContain(her7(s).at(-1));
        expect(s.summaries[6], sleep6).toMatchObject({ day: 7, played: false, coins: 0 });
        expect(s.missed!.at(-1)!.items.map((i) => i.title), sleep6).toEqual([...(sleep6 === 'late' ? ['Проспал'] : []), 'Бритва', 'У двери «Зерна»', 'Кофейня «Зерно»', 'Алина у окна', 'Про встречу', 'Алина пишет']);
      }
    });
    it('every flag set on Day 7 is read on Day 7, and every earlier flag of the brief is checked', () => {
      const mine = content.cards.filter((c) => /^[KA]7-/.test(c.id));
      const json = JSON.stringify(mine);
      const read = (f: string) => json.includes(`{"flag":"${f}"`);
      const set = new Set(mine.flatMap((c) => c.choices.flatMap((ch) => ch.outcomes.flatMap((o) => (o.effects ?? []).flatMap((e) => ('flag' in e ? [e.flag] : []))))));
      expect([...set].filter((f) => !read(f))).toEqual([]);
      for (const f of ['d6_late', 'd6_beard_hint', 'd1_half', 'd2_zerno_known', 'd2_wrote_zerno', 'bought_shirt', 'bought_frame', 'd6_trend', 'd5_cleaned', 'd3_course', 'd1_wrote_flirty', 'd6_reply', 'd4_went']) expect(read(f), f).toBe(true);
      for (const x of ['{"item":"cream_zina"}', '{"item":"gum"}', '"counter":"smoke_free"']) expect(json).toContain(x);
    });

    describe('день 8', () => {
      /** Day 8 is past the demo: the clock may cross Day 7 only with the cut-off lifted */
      const full8: Content = { ...content, balance: { ...content.balance, demoDays: 8 } };
      /** quiet choices of Day 8: keep the stubble, no answer, eat like everyone, «Да так», a cigarette */
      const Q8: Record<string, string> = {
        'K8-00': 'up', 'K8-01a': 'keep', 'K8-01b': 'keep', 'K8-02a': 'none', 'K8-02e': 'none', 'K8-02d': 'none',
        'K8-03a': 'ate', 'K8-03b': 'ate', 'K8-03c': 'ate', 'K8-04': 'thanks', 'K8-05w': 'ok', 'K8-05e': 'ok', 'K8-05s': 'ok', 'K8-05l': 'ok', 'K8-05d': 'ok',
        'K8-06a': 'shrug', 'K8-06b': 'shrug', 'K8-06c': 'shrug', 'K8-07a': 'smoke', 'K8-07b': 'smoke',
      };
      /** the quiet Day 7 (no shave, a nod, the even tone), then sleep or stay up */
      let n7: GameState | undefined;
      const night7 = () => (n7 ??= play7(morning7()));
      const PIES = ['d1_ate_pies', 'd1_refused_pies', 'd1_one_pie', 'd4_ate_pies', 'd4_pies_held'];
      const morning8 = (p: Patch = {}, sleep7 = 'sleep') => patch(syncClock(full8, pick(night7(), 'K7-sleep', sleep7), at(177)), { ...p, off: [...PIES, ...(p.off ?? [])] });
      const play = (s: GameState, p: Record<string, string>, hours: number[]) => hours.reduce((x, h) => story(syncClock(full8, x, at(h)), { ...Q8, ...p }), story(s, { ...Q8, ...p }));
      /** from the morning to the night, story only */
      const play8 = (s: GameState, p: Record<string, string> = {}) => play(s, p, [181, 187, 191.5]);
      const d8 = (s: GameState) => Object.keys(s.seen).filter((id) => id.startsWith('K8-'));
      const her8 = (s: GameState) => s.chat.filter((m) => m.day === 8 && m.from === 'crush');
      const his8 = (s: GameState) => s.chat.filter((m) => m.day === 8 && m.from === 'hero').map((m) => m.text);

      it('Day 7 now has «до трёх» and a gift; a late Saturday makes «Проспал» on Sunday with four energy less', () => {
        expect(card('K7-sleep').choices.find((c) => c.id === 'late')!.label).toBe('Посидеть в телефоне до трёх');
        const saturday = syncClock(full8, pick(night7(), 'K7-sleep', 'sleep'), at(177));
        expect(saturday.summaries[6]).toMatchObject({ day: 7, played: true, gift: 'acne_patch' });
        expect([saturday.day, saturday.energy]).toEqual([8, 10]);
        const late = morning8({}, 'late');
        expect(late.flags.d7_late).toBeDefined();
        expect([late.day, late.energy]).toEqual([8, 10 - 4]);
        expect(next(late)).toBe('K8-00');
        expect(next(morning8())).toBe('K8-02e');                       // no shave yesterday, no stubble card
        expect(content.days.find((d) => d.day === 7)).toMatchObject({ gift: 'acne_patch', teaser: 'До встречи выпускников 23 дня' });
      });
      it('the stubble is back for the shaved: the cream shaves clean, without it the face is red again, keeping it is neutral', () => {
        const shaved = (p: Patch = {}) => morning8({ ...p, on: { shaved: true, ...p.on } });
        expect(next(shaved())).toBe('K8-01b');
        expect(next(shaved({ on: { d7_red: true } }))).toBe('K8-01a');
        expect(card('K8-01a').text).toContain('Краснота за ночь сошла');
        expect(ids(shaved({ items: { cream_zina: 1 } }), 'K8-01b')).toEqual(['cream', 'keep']);
        expect(ids(shaved({ items: { cream_zina: 0 } }), 'K8-01b')).toEqual(['bare', 'keep']);
        const clean = pick(shaved({ items: { cream_zina: 1 }, on: { d7_red: true } }), 'K8-01a', 'cream');
        expect([!!clean.flags.shaved, !!clean.flags.d8_red, clean.lookPatch.facial, clean.lookPatch.razorBurn]).toEqual([true, false, 'none', false]);
        const s0 = shaved({ items: { cream_zina: 0 } });
        const red = pick(s0, 'K8-01b', 'bare');
        expect([!!red.flags.shaved, !!red.flags.d8_red, red.lookPatch.facial, red.lookPatch.razorBurn]).toEqual([true, true, 'none', true]);
        expect(red.problems.conf - s0.problems.conf).toBe(2);
        const kept = choose(content, shaved({ on: { d6_beard_hint: true } }), 'K8-01b', 'keep');
        expect([kept.state.flags.shaved, kept.state.lookPatch.facial, kept.state.lookPatch.razorBurn]).toEqual([undefined, 'stubble', false]);
        expect(kept.outcome.text).toContain('«Борода вообще не моё»');
        expect(choose(content, shaved({ off: ['d6_beard_hint'] }), 'K8-01b', 'keep').outcome.text).not.toContain('Борода');
        expect(kept.state.affinity).toBe(s0.affinity);
        expect(chance(content, kept.state)).toBeLessThanOrEqual(chance(content, shaved({ on: { d6_beard_hint: true } })));
      });
      it('her message by tone: warm +3 / 0 / −2 / no answer, even +2 / 0 / no answer, dry 0 / no answer / −2; no answer is neutral', () => {
        const TONE: Record<string, [string, string[], number[]]> = {
          warm: ['K8-02a', ['ask', 'short', 'long', 'none'], [3, 0, -2, 0]],
          even: ['K8-02e', ['ask', 'short', 'none'], [2, 0, 0]],
          dry: ['K8-02d', ['short', 'none', 'double'], [0, 0, -2]],
        };
        for (const [tone, [id, choices, deltas]] of Object.entries(TONE)) {
          const s = morning8({ on: { d7_msg: tone } });
          expect(next(s), tone).toBe(id);
          expect(ids(s, id), tone).toEqual(choices);
          expect(choices.map((c) => pick(s, id, c).affinity - s.affinity), tone).toEqual(deltas);
          expect(card(id).choices.find((c) => c.neutral)!.id, tone).toBe('none');
          const quiet = pick(s, id, 'none');
          expect([quiet.flags.d8_replied.value, his8(quiet)], tone).toEqual(['none', []]);
          for (const c of choices.filter((x) => x !== 'none')) {
            const sent = pick(s, id, c);
            expect(his8(sent)[0], `${tone} ${c}`).toBe(card(id).choices.find((x) => x.id === c)!.label);
            expect(content.chat.status_reply_read, `${tone} ${c}`).toContain(her8(sent).at(-1)!.text);
          }
        }
        expect(his8(pick(morning8({ on: { d7_msg: 'dry' } }), 'K8-02d', 'double'))).toHaveLength(2);
      });
      it('her answer in the evening follows the tone and the reply: one bubble, one button; no answer, no card', () => {
        const ANSWER: [string, string, string | undefined, string | undefined][] = [
          ['warm', 'ask', 'K8-05w', 'alina_d8_warm'], ['warm', 'short', 'K8-05s', 'alina_d8_short'], ['warm', 'long', 'K8-05l', 'alina_d8_long'], ['warm', 'none', undefined, undefined],
          ['even', 'ask', 'K8-05e', 'alina_d8_even'], ['even', 'short', 'K8-05s', 'alina_d8_short'], ['even', 'none', undefined, undefined],
          ['dry', 'short', 'K8-05d', 'status_online_no_reply'], ['dry', 'double', 'K8-05d', 'status_online_no_reply'], ['dry', 'none', undefined, undefined],
        ];
        const MSG: Record<string, string> = { warm: 'K8-02a', even: 'K8-02e', dry: 'K8-02d' };
        for (const [tone, reply, answer, key] of ANSWER) {
          const s = play8(morning8({ on: { d7_msg: tone } }), { [MSG[tone]]: reply });
          const fives = d8(s).filter((id) => id.startsWith('K8-05'));
          expect(fives, `${tone} ${reply}`).toEqual(answer ? [answer] : []);
          if (key) expect(content.chat[key], `${tone} ${reply}`).toContain(her8(s).at(-1)!.text);
          if (key === 'status_online_no_reply') expect(her8(s).at(-1)!.status, `${tone} ${reply}`).toBe(true);
          expect(!!s.flags.d8_answered, `${tone} ${reply}`).toBe(!!answer);
        }
        for (const key of ['alina_d8_warm', 'alina_d8_even', 'alina_d8_short', 'alina_d8_long']) expect(bank(key), key).toHaveLength(10);
        for (const id of ['K8-05w', 'K8-05e', 'K8-05s', 'K8-05l', 'K8-05d']) expect(card(id).choices.map((c) => c.id), id).toEqual(['ok']);
      });
      it('Sunday lunch: the pies by their history, one pie costs two energy; mum notices two visible changes', () => {
        const lunch = (p: Patch = {}) => syncClock(full8, story(morning8(p), Q8), at(181));
        expect(next(lunch())).toBe('K8-03c');
        expect(next(lunch({ on: { d1_ate_pies: true } }))).toBe('K8-03a');
        expect(next(lunch({ on: { d1_one_pie: true, d4_ate_pies: true } }))).toBe('K8-03a');
        expect(next(lunch({ on: { d1_one_pie: true, d4_pies_held: true } }))).toBe('K8-03b');
        expect(next(lunch({ on: { d1_refused_pies: true } }))).toBe('K8-03b');
        expect(card('K8-03a').text).toContain('«Опять пять?»');
        const s = lunch();
        const held = pick(s, 'K8-03c', 'held');
        expect([s.energy - held.energy, held.problems.conf - s.problems.conf, held.problems.weight - s.problems.weight, held.flags.d8_lunch.value]).toEqual([2, -1, 0, 'held']);
        const ate = pick(s, 'K8-03c', 'ate');
        expect([s.energy - ate.energy, ate.problems.weight - s.problems.weight, ate.flags.d8_lunch.value]).toEqual([0, 2, 'ate']);
        expect(card('K8-03c').choices.find((c) => c.neutral)!.id).toBe('ate');
        // mum: two of the visible changes, never named
        expect(next(pick(lunch({ on: { d3_course: true } }), 'K8-03c', 'ate'))).toBeUndefined();
        const two = pick(lunch({ on: { d3_course: true, d5_cleaned: 'full' } }), 'K8-03c', 'ate');
        expect(next(two)).toBe('K8-04');
        expect(next(pick(lunch({ on: { d3_course: true }, counters: { smoke_free: 2 } }), 'K8-03c', 'ate'))).toBe('K8-04');
        expect(card('K8-04').text).toContain('«Ты какой-то бодрый»');
        const line = (p: Patch) => choose(content, patch(two, p), 'K8-04', 'thanks').outcome.text;
        expect(line({ on: { d4_mom_talked: true } })).toContain('звонить стал по-другому');
        expect(line({ off: ['d4_mom_talked'], on: { d5_helped_zina: 'shelf' } })).toContain('Зина говорит');
        expect(line({ off: ['d4_mom_talked', 'd5_helped_zina'] })).toContain('пирожков');
      });
      it('Vitya in the evening knows from the class chat: hiding, the song, or just the meeting; telling helps confidence', () => {
        const vitya = (p: Patch) => d8(play8(morning8(p))).find((id) => id.startsWith('K8-06'));
        expect(vitya({ on: { d7_met: 'ignore', d7_thread: 'song' } })).toBe('K8-06a');
        expect(vitya({ on: { d7_met: 'hello', d7_thread: 'song' } })).toBe('K8-06b');
        expect(vitya({ on: { d7_met: 'nod', d7_thread: 'reunion' } })).toBe('K8-06c');
        expect(card('K8-06a').text).toContain('прятался');
        const evening = syncClock(full8, play(morning8(), {}, [181]), at(187));
        expect(next(evening)).toBe('K8-06c');
        expect(ids(evening, 'K8-06c')).toEqual(['tell', 'shrug']);
        expect(pick(evening, 'K8-06c', 'tell').problems.conf - evening.problems.conf).toBe(-1);
        expect(pick(evening, 'K8-06c', 'shrug').problems).toEqual(evening.problems);
      });
      it('the night: the craving on the balcony, the plus actions, and sleep; staying up costs four and Day 8 ends the lifted demo', () => {
        const night = (p: Patch = {}) => patch(play(morning8(), {}, [181, 187, 191.5]), p);
        const before = (p: Patch) => { const s = night(p); const flags = { ...s.flags }; for (const f of ['d8_smoked', 'd8_no_smoke', 'd8_quarter']) delete flags[f]; const seen = { ...s.seen }; delete seen['K8-07a']; return { ...s, flags, seen }; };
        expect(next(before({ counters: { smoke_free: 0 } }))).toBe('K8-07a');
        expect(next(before({ counters: { smoke_free: 7 } }))).toBe('K8-07b');
        const cost = (id: string) => card(id).choices.map((c) => [c.id, c.cost?.energy ?? 0]);
        expect(cost('K8-07a')).toEqual([['hold', 2], ['quarter', 1], ['gum', 0], ['smoke', 0]]);
        expect(cost('K8-07b')).toEqual([['hold', 3], ['quarter', 1], ['gum', 0], ['smoke', 0]]);
        const r = choose(content, before({ counters: { smoke_free: 7 } }), 'K8-07b', 'hold');
        expect([r.outcome.text.includes('Восьмой день без табака'), r.state.counters.smoke_free]).toEqual([true, 8]);
        expect(choose(content, before({ counters: { smoke_free: 0 }, on: { d7_quarter: true } }), 'K8-07a', 'hold').outcome.text).toContain('Вчера была четверть');
        const s = night();
        expect(s.flags.d8_smoked).toBeDefined();
        expect(actionsFor(content, s).map((c) => c.id)).toEqual(['A8-run', 'A8-clean', 'A8-teeth', 'A8-couch', 'K8-sleep']);
        const day = syncClock(full8, story(morning8(), Q8), at(181));
        expect(actionsFor(content, day).map((c) => c.id)).toContain('A-job');
        expect(actionsFor(content, patch(day, { on: { d2_gym: true } })).map((c) => c.id)).toContain('A8-gym');
        expect(card('K8-sleep').choices.map((c) => c.id)).toEqual(['sleep', 'late']);
        const end = syncClock(full8, pick(s, 'K8-sleep', 'sleep'), at(201));
        expect([end.demoOver, end.day]).toEqual([true, 8]);
        expect(end.summaries[7]).toMatchObject({ day: 8, played: true, gift: 'floss' });
        expect(content.days.find((d) => d.day === 8)).toMatchObject({ title: 'Утро после', gift: 'floss' });
        const late = pick(s, 'K8-sleep', 'late');
        expect(late.flags.d8_late).toBeDefined();
        expect(syncClock(full, late, at(201)).energy).toBe(10 - 4);
        for (const part of ['morning', 'day', 'evening', 'night']) expect(content.cards.some((c) => c.id.startsWith('K8-') && c.kind === 'story' && c.when!.parts!.includes(part as 'day')), part).toBe(true);
      });
      it('a fully skipped Day 8: the stubble back, no message, the pies eaten, smoked, and affinity 0', () => {
        for (const tone of ['warm', 'even', 'dry']) {
          const s0 = morning8({ on: { d7_msg: tone, shaved: true } });
          const s = syncClock(full8, s0, at(201));
          expect([s.demoOver, s.day], tone).toEqual([true, 8]);
          expect([s.flags.shaved, s.lookPatch.facial], tone).toEqual([undefined, 'stubble']);
          expect([s.flags.d8_replied.value, his8(s), s.flags.d8_answered], tone).toEqual(['none', [], undefined]);
          expect([s.flags.d8_lunch.value, !!s.flags.d8_smoked], tone).toEqual(['ate', true]);
          expect(s.affinity - s0.affinity, tone).toBe(0);
          expect(s.summaries[7], tone).toMatchObject({ day: 8, played: false, coins: 0 });
          expect(s.missed!.at(-1)!.items.map((i) => i.title), tone).toEqual(['Щетина', 'Её сообщение', 'Обед у мамы', 'Витя пишет', 'Балкон']);
        }
      });
      it('every flag set on Day 8 is read on Day 8 or waits for the next morning, and every earlier flag of the grid is checked', () => {
        const mine = content.cards.filter((c) => /^[KA]8-/.test(c.id));
        // conditions only: card requirements, choice requirements and outcome `if`, not the effects that set the flags
        const json = JSON.stringify(mine.map((c) => [c.when?.requires, c.choices.map((ch) => [ch.requires, ch.outcomes.map((o) => o.if)])]));
        const read = (f: string) => json.includes(`{"flag":"${f}"`);
        const set = new Set(mine.flatMap((c) => c.choices.flatMap((ch) => ch.outcomes.flatMap((o) => (o.effects ?? []).flatMap((e) => ('flag' in e ? [e.flag] : []))))));
        expect([...set].filter((f) => !read(f))).toEqual(['d8_late']);           // the Day 9 morning, like d7_late on Day 8
        for (const f of ['d7_late', 'shaved', 'd7_red', 'd6_beard_hint', 'd7_msg', 'd7_met', 'd7_thread', 'd1_ate_pies', 'd1_refused_pies', 'd4_ate_pies', 'd4_pies_held', 'd4_mom_talked', 'd5_helped_zina', 'bought_shirt', 'bought_frame', 'd5_cleaned', 'd3_course', 'd1_half', 'd7_quarter', 'd2_gym', 'bought_gym_pass']) expect(read(f), f).toBe(true);
        for (const x of ['{"item":"cream_zina"}', '{"item":"gum"}', '"counter":"smoke_free"']) expect(json).toContain(x);
      });

      describe('день 9', () => {
        /** Day 9 is past the demo too: the clock may cross Day 8 only with the cut-off lifted to 9 */
        const full9: Content = { ...content, balance: { ...content.balance, demoDays: 9 } };
        /** quiet choices of Day 9: decide later, scroll the feed and the chat, a cigarette */
        const Q9: Record<string, string> = {
          'K9-late': 'up', 'K9-00': 'ok', 'K9-01': 'ok', 'K9-02a': 'later', 'K9-02b': 'later', 'K9-03a': 'scroll', 'K9-03b': 'scroll',
          'K9-05w': 'ok', 'K9-04a': 'scroll', 'K9-04b': 'scroll', 'K9-06a': 'smoke', 'K9-06b': 'smoke',
        };
        /** the quiet Sunday (no answer, pies, «Да так», a cigarette), then sleep or stay up */
        let n8: GameState | undefined;
        const night8 = () => (n8 ??= play8(morning8()));
        const morning9 = (p: Patch = {}, sleep8 = 'sleep') => patch(syncClock(full9, pick(night8(), 'K8-sleep', sleep8), at(201)), p);
        const play9 = (s: GameState, p: Record<string, string> = {}, hours = [205, 211, 215.5]) =>
          hours.reduce((x, h) => story(syncClock(full9, x, at(h)), { ...Q9, ...p }), story(s, { ...Q9, ...p }));
        const d9 = (s: GameState) => Object.keys(s.seen).filter((id) => id.startsWith('K9-'));
        const weighing = (s: GameState, weight: number) => ({ ...s, problems: { ...s.problems, weight } });
        /** the day part of Monday after the quiet morning */
        const day9 = (p: Patch = {}) => syncClock(full9, story(morning9(p), Q9), at(205));

        it('Monday morning: overslept after a late Sunday, the last gym morning for a Day 2 pass, the scales for everyone', () => {
          const s = morning9();
          expect([s.day, s.part, s.energy]).toEqual([9, 'morning', 10]);
          expect(next(s)).toBe('K9-01');
          const late = morning9({}, 'late');
          expect(late.flags.d8_late).toBeDefined();
          expect([next(late), late.energy]).toEqual(['K9-late', 10 - 4]);
          expect(next(morning9({ on: { d2_gym: true } }))).toBe('K9-00');
          expect(card('K9-00').text).toContain('«Абонемент: последний день»');
          expect(card('K9-01').text).toContain('Весы стоят третий день');
          expect(card('K9-01').choices.map((c) => c.id)).toEqual(['ok']);
          expect(choose(content, weighing(s, 70), 'K9-01', 'ok').outcome.text).toContain('уходят быстро');
          expect(choose(content, weighing(s, 85), 'K9-01', 'ok').outcome.text).toContain('почти ничего не двигало');
          expect(d9(play9(morning9({ on: { d2_gym: true } }, 'late'), {}, []))).toEqual(['K9-late', 'K9-00', 'K9-01']);
        });
        it('renew or not: a Day 2 pass may be renewed for 150 or swapped for free runs with Vitya; without a pass only Vitya; later is neutral', () => {
          const holder = day9({ on: { d2_gym: true }, coins: 300 });
          expect(next(holder)).toBe('K9-02a');
          expect(ids(holder, 'K9-02a')).toEqual(['renew', 'vitya', 'later']);
          expect(card('K9-02a').choices.find((c) => c.neutral)!.id).toBe('later');
          const renewed = pick(holder, 'K9-02a', 'renew');
          expect([holder.coins - renewed.coins, renewed.flags.d9_pass.value]).toEqual([150, 'renewed']);
          expect(renewed.modifiers.filter((m) => m.id === 'gym').map((m) => [m.fromDay, m.days, m.energyPerDay])).toEqual([[9, 7, 2]]);
          expect(pick(holder, 'K9-02a', 'vitya').flags.d9_pass.value).toBe('vitya');
          expect(pick(holder, 'K9-02a', 'vitya').coins).toBe(holder.coins);
          expect(pick(holder, 'K9-02a', 'later').flags.d9_pass.value).toBe('none');
          const none = day9();
          expect(next(none)).toBe('K9-02b');
          expect(ids(none, 'K9-02b')).toEqual(['vitya', 'later']);
          expect(pick(none, 'K9-02b', 'vitya').flags.d9_pass.value).toBe('vitya');
          expect(actionsFor(content, none).map((c) => c.id)).not.toContain('A9-gym');
          expect(actionsFor(content, holder).map((c) => c.id)).toContain('A9-gym');
          expect(choose(content, renewed, 'A9-gym', 'go').outcome.text).toContain('Продлённый абонемент');
          expect(choose(content, holder, 'A9-gym', 'go').outcome.text).toContain('Приходи ещё');
        });
        it('the fat burner in the feed: 60 coins, often nothing, sometimes two weak days; the Day 2 tea is recalled', () => {
          const feed = (p: Patch = {}) => pick(day9({ coins: 300, ...p }), 'K9-02b', 'later');
          const s = feed();
          expect(next(s)).toBe('K9-03b');
          expect(next(feed({ on: { d2_tea: true } }))).toBe('K9-03a');
          expect(card('K9-03a').text).toContain('«Как тот чай?»');
          expect(card('K9-03b').text).toContain('«Жиросжигатель: минус 3 кг за неделю»');
          const order = card('K9-03b').choices.find((c) => c.id === 'order')!;
          expect(order.cost).toEqual({ coins: 60 });
          expect(oddsFor(content, s, order)).toEqual([{ word: 'часто', hint: 'ничего' }, { word: 'иногда', hint: 'слабость' }]);
          expect(card('K9-03b').choices.find((c) => c.neutral)!.id).toBe('scroll');
          const r = pick(s, 'K9-03b', 'order');
          expect([s.coins - r.coins, !!r.flags.d9_burner]).toEqual([60, true]);
          expect(pick(s, 'K9-03b', 'scroll').coins).toBe(s.coins);
        });
        it('the evening: Oksana announces the slideshow and tags him if he spoke in the chat; Alina is only «в сети» for the warm tone', () => {
          const evening = (p: Patch = {}) => syncClock(full9, play9(morning9(p), {}, [205]), at(211));
          expect(next(evening())).toBe('K9-04b');
          expect(next(evening({ on: { d6_chat_spoke: true } }))).toBe('K9-04a');
          expect(card('K9-04a').text).toContain('{hero}, тебя тоже касается');
          for (const id of ['K9-04a', 'K9-04b']) expect(card(id).text, id).toContain('Жду фото до завтра');
          const s = evening();
          const promised = pick(s, 'K9-04b', 'promise');
          expect([promised.flags.d9_oksana.value, promised.problems.conf - s.problems.conf]).toEqual(['promised', -1]);
          expect(pick(s, 'K9-04b', 'scroll').flags.d9_oksana).toBeUndefined();
          for (const tone of ['warm', 'even', 'dry']) {
            const m9 = morning9({ on: { d7_msg: tone } });
            const e = play9(m9, {}, [205, 211]);
            const her = e.chat.filter((m) => m.day === 9 && m.from === 'crush');
            expect(d9(e).filter((id) => /^K9-0[45]/.test(id)), tone).toEqual(tone === 'warm' ? ['K9-05w', 'K9-04b'] : ['K9-04b']);
            expect(her.map((m) => m.status), tone).toEqual(tone === 'warm' ? [true] : []);
            if (tone === 'warm') expect(bank('status_online')).toContain(her[0].text);
            expect(e.affinity, tone).toBe(m9.affinity);
          }
          expect(bank('status_online')).toHaveLength(10);
        });
        it('the night: the craving on the balcony, the plus actions, and sleep; Day 9 ends the lifted demo with its gift', () => {
          const night = (p: Patch = {}) => patch(play9(morning9()), p);
          const before = (p: Patch) => { const s = night(p); const flags = { ...s.flags }; for (const f of ['d9_smoked', 'd9_no_smoke', 'd9_quarter']) delete flags[f]; const seen = { ...s.seen }; delete seen['K9-06a']; return { ...s, flags, seen }; };
          expect(next(before({ counters: { smoke_free: 0 } }))).toBe('K9-06a');
          expect(next(before({ counters: { smoke_free: 8 } }))).toBe('K9-06b');
          const cost = (id: string) => card(id).choices.map((c) => [c.id, c.cost?.energy ?? 0]);
          expect(cost('K9-06a')).toEqual([['hold', 2], ['quarter', 1], ['gum', 0], ['smoke', 0]]);
          expect(cost('K9-06b')).toEqual([['hold', 3], ['quarter', 1], ['gum', 0], ['smoke', 0]]);
          const r = choose(content, before({ counters: { smoke_free: 8 } }), 'K9-06b', 'hold');
          expect([r.outcome.text.includes('Девятый день без табака'), r.state.counters.smoke_free]).toEqual([true, 9]);
          expect(choose(content, before({ counters: { smoke_free: 0 }, on: { d8_quarter: true } }), 'K9-06a', 'hold').outcome.text).toContain('Вчера была четверть');
          const s = night();
          expect(s.flags.d9_smoked).toBeDefined();
          expect(actionsFor(content, s).map((c) => c.id)).toEqual(['A9-run', 'A9-clean', 'A9-teeth', 'A9-couch', 'K9-sleep']);
          expect(actionsFor(content, day9()).map((c) => c.id)).toContain('A-job');
          expect(card('K9-sleep').choices.map((c) => c.id)).toEqual(['sleep', 'late']);
          const end = syncClock(full9, pick(s, 'K9-sleep', 'sleep'), at(225));
          expect([end.demoOver, end.day]).toEqual([true, 9]);
          expect(end.summaries[8]).toMatchObject({ day: 9, played: true, gift: 'gum' });
          expect(content.days.find((d) => d.day === 9)).toMatchObject({ title: 'Абонемент кончился', gift: 'gum' });
          const late = pick(s, 'K9-sleep', 'late');
          expect(late.flags.d9_late).toBeDefined();
          expect(syncClock(full, late, at(225)).energy).toBe(10 - 4);
          for (const part of ['morning', 'day', 'evening', 'night']) expect(content.cards.some((c) => c.id.startsWith('K9-') && c.kind === 'story' && c.when!.parts!.includes(part as 'day')), part).toBe(true);
        });
        it('a fully skipped Day 9: the pass not renewed, the burner scrolled, smoked, and affinity 0', () => {
          for (const tone of ['warm', 'even']) {
            const s0 = morning9({ on: { d7_msg: tone, d2_gym: true } });
            const s = syncClock(full9, s0, at(225));
            expect([s.demoOver, s.day], tone).toEqual([true, 9]);
            expect([s.flags.d9_pass.value, s.flags.d9_burner, s.flags.d9_oksana, !!s.flags.d9_smoked], tone).toEqual(['none', undefined, undefined, true]);
            expect(s.modifiers.filter((m) => m.id === 'gym'), tone).toEqual([]);
            expect(s.affinity - s0.affinity, tone).toBe(0);
            expect(s.summaries[8], tone).toMatchObject({ day: 9, played: false, coins: 0 });
            const titles = ['Абонемент', 'Весы', 'Продлить?', 'Лента: жиросжигатель', ...(tone === 'warm' ? ['Алина в сети'] : []), 'Чат класса', 'Балкон'];
            expect(s.missed!.at(-1)!.items.map((i) => i.title), tone).toEqual(titles);
          }
        });
        it('every flag set on Day 9 is read on Day 9 or has a planned payoff, and every earlier flag of the grid is checked', () => {
          const mine = content.cards.filter((c) => /^[KA]9-/.test(c.id));
          const json = JSON.stringify(mine.map((c) => [c.when?.requires, c.choices.map((ch) => [ch.requires, ch.outcomes.map((o) => o.if)])]));
          const read = (f: string) => json.includes(`{"flag":"${f}"`);
          const set = new Set(mine.flatMap((c) => c.choices.flatMap((ch) => ch.outcomes.flatMap((o) => (o.effects ?? []).flatMap((e) => ('flag' in e ? [e.flag] : []))))));
          // d9_burner: days 10–11 (energy line), d9_oksana: K10-02 (the photo), d9_late: the Day 10 morning
          expect([...set].filter((f) => !read(f)).sort()).toEqual(['d9_burner', 'd9_late', 'd9_oksana']);
          for (const f of ['d8_late', 'd2_gym', 'bought_gym_pass', 'd2_tea', 'd6_chat_spoke', 'd7_msg', 'd8_quarter', 'd1_half', 'd9_pass']) expect(read(f), f).toBe(true);
          for (const x of ['{"item":"gum"}', '"counter":"smoke_free"']) expect(json).toContain(x);
        });

        describe('день 10', () => {
          /** Day 10 is past the demo too: the clock may cross Day 9 only with the cut-off lifted to 10 */
          const full10: Content = { ...content, balance: { ...content.balance, demoDays: 10 } };
          /** quiet choices of Day 10: not today, the old photo only, close the chat, laugh, a cigarette */
          const Q10: Record<string, string> = {
            'K10-late': 'up', 'K10-run': 'skip', 'K10-01a': 'pick', 'K10-01b': 'pick', 'K10-02a': 'old', 'K10-02b': 'old',
            'K10-03a': 'ok', 'K10-03b': 'ok', 'K10-03c': 'ok', 'K10-03d': 'ok', 'K10-03e': 'ok', 'K10-04': 'laugh', 'K10-05a': 'smoke', 'K10-05b': 'smoke',
          };
          /** the visible changes the slideshow counts, all off, so each test turns on what it needs */
          const LOOKS = ['shaved', 'bought_shirt', 'bought_frame', 'd5_cleaned', 'd3_course', 'bought_haircut'];
          /** the quiet Monday, then sleep or stay up */
          let n9: GameState | undefined;
          const night9 = () => (n9 ??= play9(morning9()));
          const morning10 = (p: Patch = {}, sleep9 = 'sleep') =>
            patch(syncClock(full10, pick(night9(), 'K9-sleep', sleep9), at(225)), { ...p, off: ['d6_reply', 'd7_thread', 'd3_posted', ...LOOKS, ...(p.off ?? [])] });
          const play10 = (s: GameState, p: Record<string, string> = {}, hours = [229, 235, 239.5]) =>
            hours.reduce((x, h) => story(syncClock(full10, x, at(h)), { ...Q10, ...p }), story(s, { ...Q10, ...p }));
          const d10 = (s: GameState) => Object.keys(s.seen).filter((id) => id.startsWith('K10-'));
          /** the day part of Tuesday after the quiet morning */
          const day10 = (p: Patch = {}) => syncClock(full10, story(morning10(p), Q10), at(229));
          /** the evening of Tuesday with the photo already sent */
          const evening10 = (p: Patch = {}) => syncClock(full10, story(day10(p), Q10), at(235));
          const flagged = (s: GameState, flag: string, day: number) => ({ ...s, flags: { ...s.flags, [flag]: { value: true, day } } });

          it('Tuesday morning: overslept after a late Monday, Vitya at the door for his runs, the old album for everyone', () => {
            const s = morning10();
            expect([s.day, s.part, s.energy]).toEqual([10, 'morning', 10]);
            expect(next(s)).toBe('K10-01b');
            const late = morning10({}, 'late');
            expect([next(late), late.energy]).toEqual(['K10-late', 10 - 4]);
            const runner = morning10({ on: { d9_pass: 'vitya' } });
            expect(next(runner)).toBe('K10-run');
            for (const pass of ['renewed', 'none']) expect(next(morning10({ on: { d9_pass: pass } })), pass).toBe('K10-01b');
            expect(ids(runner, 'K10-run')).toEqual(['run', 'skip']);
            expect(card('K10-run').choices.find((c) => c.neutral)!.id).toBe('skip');
            const ran = choose(content, runner, 'K10-run', 'run');
            expect([runner.energy - ran.state.energy, ran.state.problems.weight - runner.problems.weight]).toEqual([4, -2]);
            expect(ran.outcome.text).toContain('мангал');
            expect(choose(content, morning10({ on: { d9_pass: 'vitya', d9_burner: true } }), 'K10-run', 'run').outcome.text).toContain('После вчерашних капсул');
            expect(next(morning10({ on: { d6_reply: 'joke' } }))).toBe('K10-01a');
            expect(card('K10-01a').text).toContain('с микрофоном');
            for (const id of ['K10-01a', 'K10-01b']) expect(card(id).choices.map((c) => c.id), id).toEqual(['pick']);
            expect(d10(play10(morning10({ on: { d9_pass: 'vitya', d6_reply: 'joke' } }, 'late'), {}, []))).toEqual(['K10-late', 'K10-run', 'K10-01a']);
          });
          it('the photo for Oksana: she reminds him of the promise; both photos cost 2 energy, 1 if he has posted one before; the old one is neutral', () => {
            expect(next(day10())).toBe('K10-02b');
            const promised = day10({ on: { d9_oksana: 'promised' } });
            expect(next(promised)).toBe('K10-02a');
            expect(card('K10-02a').text).toContain('{hero}, ты обещал!');
            expect(ids(promised, 'K10-02a')).toEqual(['both', 'old', 'none']);
            expect(ids(day10({ on: { d3_posted: true } }), 'K10-02b')).toEqual(['both_easy', 'old', 'none']);
            const cost = (id: string) => card(id).choices.map((c) => [c.id, c.cost?.energy ?? 0]);
            for (const id of ['K10-02a', 'K10-02b']) {
              expect(cost(id), id).toEqual([['both', 2], ['both_easy', 1], ['old', 0], ['none', 0]]);
              expect(card(id).choices.find((c) => c.neutral)!.id, id).toBe('old');
            }
            const s = day10();
            const sent = pick(s, 'K10-02b', 'both');
            expect([sent.flags.d10_photo.value, sent.problems.conf - s.problems.conf, s.energy - sent.energy]).toEqual(['both', -2, 2]);
            expect(pick(s, 'K10-02b', 'old').flags.d10_photo.value).toBe('old');
            expect(pick(s, 'K10-02b', 'none').flags.d10_photo.value).toBe('none');
            expect(choose(content, promised, 'K10-02a', 'none').outcome.text).toContain('Обещал, но не прислал');
          });
          it('the slideshow draft: Alina reacts to a fresh photo by the number of visible changes, +2 / +3 / +4; without one she likes Vitya\'s', () => {
            const sent = (p: Patch = {}, photo = 'both') => syncClock(full10, pick(day10(p), 'K10-02b', photo), at(235));
            const cases: [Patch, string, string, number][] = [
              [{}, 'K10-03a', 'status_d10_like', 2],
              [{ on: { shaved: true, d3_course: true } }, 'K10-03b', 'status_d10_you', 3],
              [{ on: { shaved: true, bought_shirt: true, d5_cleaned: true, bought_haircut: true } }, 'K10-03c', 'status_d10_fire', 4],
              [{ on: { bought_frame: true, d5_cleaned: true, d3_course: true }, counters: { smoke_free: 2 } }, 'K10-03c', 'status_d10_fire', 4],
            ];
            for (const [p, id, key, add] of cases) {
              const s = sent({ counters: { smoke_free: 0 }, ...p });
              expect(next(s), id).toBe(id);
              const r = pick(drawStory(content, s).state, id, 'ok');
              const her = r.chat.filter((m) => m.day === 10 && m.from === 'crush');
              expect([her.length, her[0].status, bank(key).map((x) => x.replaceAll('{hero}', 'Андрей')).includes(her[0].text)], id).toEqual([1, true, true]);
              expect([r.affinity - s.affinity, r.rumors.filter((x) => x.day === 10).map((x) => x.id)], id).toEqual([add, ['slideshow']]);
            }
            expect(content.chat.status_d10_you.map((x) => x.includes('{hero}')).every(Boolean)).toBe(true);
            for (const key of ['status_d10_like', 'status_d10_you', 'status_d10_fire']) expect(bank(key), key).toHaveLength(10);
            for (const [photo, id] of [['old', 'K10-03d'], ['none', 'K10-03e']]) {
              const s = sent({ on: { shaved: true, d3_course: true, d5_cleaned: true, bought_haircut: true } }, photo);
              expect(next(s), photo).toBe(id);
              const r = pick(s, id, 'ok');
              expect([r.affinity - s.affinity, r.chat.filter((m) => m.day === 10).length, r.rumors.filter((x) => x.day === 10).map((x) => x.id)], photo).toEqual([0, 0, ['slideshow']]);
            }
            expect(card('K10-03d').text).toContain('{crush} поставила ему лайк');
          });
          it('karaoke: for the singer of Day 6 or the song of Day 7 Vitya puts him on stage; a promise sets d10_will_sing, laughing is neutral', () => {
            const after = (p: Patch) => pick(evening10(p), 'K10-03d', 'ok');
            expect(next(after({}))).toBeUndefined();                                    // the evening ends on the draft
            for (const on of [{ d6_reply: "joke" }, { d7_thread: "song" }] as Record<string, string>[]) expect(next(after({ on })), JSON.stringify(on)).toBe('K10-04');
            const s = after({ on: { d7_thread: 'song' } });
            expect(card('K10-04').text).toContain('на встрече поёт {hero}');
            expect(card('K10-04').choices.find((c) => c.neutral)!.id).toBe('laugh');
            const sing = pick(s, 'K10-04', 'promise');
            expect([!!sing.flags.d10_will_sing, sing.problems.conf - s.problems.conf]).toEqual([true, -1]);
            expect(pick(s, 'K10-04', 'laugh').flags.d10_will_sing).toBeUndefined();
          });
          it('the night: the craving on the balcony, the plus actions with the gym only while a pass runs, and sleep; Day 10 ends the lifted demo on «Осталось двадцать дней»', () => {
            const night = (p: Patch = {}) => patch(play10(morning10()), p);
            const before = (p: Patch) => { const s = night(p); const flags = { ...s.flags }; for (const f of ['d10_smoked', 'd10_no_smoke', 'd10_quarter']) delete flags[f]; const seen = { ...s.seen }; delete seen['K10-05a']; return { ...s, flags, seen }; };
            expect(next(before({ counters: { smoke_free: 0 } }))).toBe('K10-05a');
            expect(next(before({ counters: { smoke_free: 9 } }))).toBe('K10-05b');
            const cost = (id: string) => card(id).choices.map((c) => [c.id, c.cost?.energy ?? 0]);
            expect(cost('K10-05a')).toEqual([['hold', 2], ['quarter', 1], ['gum', 0], ['smoke', 0]]);
            expect(cost('K10-05b')).toEqual([['hold', 3], ['quarter', 1], ['gum', 0], ['smoke', 0]]);
            const r = choose(content, before({ counters: { smoke_free: 9 } }), 'K10-05b', 'hold');
            expect([r.outcome.text.includes('Десятый день без табака'), r.state.counters.smoke_free]).toEqual([true, 10]);
            expect(choose(content, before({ counters: { smoke_free: 0 }, on: { d9_quarter: true } }), 'K10-05a', 'hold').outcome.text).toContain('Вчера была четверть');
            const s = night();
            expect(s.flags.d10_smoked).toBeDefined();
            expect(actionsFor(content, s).map((c) => c.id)).toEqual(['A10-run', 'A10-clean', 'A10-teeth', 'A10-couch', 'K10-sleep']);
            expect(actionsFor(content, day10()).map((c) => c.id)).toContain('A-job');
            const gym = (x: GameState) => actionsFor(content, x).map((c) => c.id).includes('A10-gym');
            expect(gym(passFrom(night({ on: { d9_pass: 'renewed' } }), 9))).toBe(true);
            expect(gym(passFrom(s, 2))).toBe(false);                     // the Day 2 pass ended on Day 9
            expect(gym(passFrom(s, 5))).toBe(true);                     // a shop pass used from Day 5 runs to Day 12
            expect(gym(passFrom(s, 2))).toBe(false);
            expect(gym(passFrom(s, 10))).toBe(false);
            expect(gym({ ...flagged(s, 'bought_gym_pass', 5), items: { ...s.items, gym_pass: 1 } })).toBe(false);
            expect(choose(content, passFrom(night({ on: { d9_pass: 'renewed' } }), 9), 'A10-gym', 'go').outcome.text).toContain('Растёшь');
            expect(card('K10-sleep').choices.map((c) => c.id)).toEqual(['sleep', 'late']);
            const slept = choose(content, s, 'K10-sleep', 'sleep');
            expect(slept.outcome.text).toContain('«Осталось двадцать дней!»');
            const end = syncClock(full10, slept.state, at(249));
            expect([end.demoOver, end.day]).toEqual([true, 10]);
            expect(end.summaries[9]).toMatchObject({ day: 10, played: true, gift: 'acne_patch' });
            expect(content.days.find((d) => d.day === 10)).toMatchObject({ title: 'Тогда и сейчас', gift: 'acne_patch' });
            const late = pick(s, 'K10-sleep', 'late');
            expect(late.flags.d10_late).toBeDefined();
            expect(syncClock(full, late, at(249)).energy).toBe(10 - 4);
            for (const part of ['morning', 'day', 'evening', 'night']) expect(content.cards.some((c) => c.id.startsWith('K10-') && c.kind === 'story' && c.when!.parts!.includes(part as 'day')), part).toBe(true);
          });
          it('a fully skipped Day 10: the old photo only, no reaction from her, no song promised, smoked, and affinity 0', () => {
            for (const promised of [true, false]) {
              const s0 = morning10({ on: { d9_pass: 'vitya', d6_reply: 'joke', ...(promised ? { d9_oksana: 'promised' } : {}), shaved: true, d3_course: true, d5_cleaned: true, bought_haircut: true } });
              const s = syncClock(full10, s0, at(249));
              expect([s.demoOver, s.day]).toEqual([true, 10]);
              expect([s.flags.d10_photo.value, s.flags.d10_will_sing, !!s.flags.d10_smoked]).toEqual(['old', undefined, true]);
              expect(s.affinity - s0.affinity).toBe(0);
              expect(s.chat.filter((m) => m.day === 10)).toEqual([]);
              expect(s.summaries[9]).toMatchObject({ day: 10, played: false, coins: 0 });
              expect(s.missed!.at(-1)!.items.map((i) => i.title)).toEqual(['Витя у подъезда', 'Старый альбом', 'Фото для Оксаны', 'Черновик слайд-шоу', 'Витя пишет', 'Балкон']);
            }
          });
          it('every flag set on Day 10 is read on Day 10 or has a planned payoff, and every Day 9 flag left for Day 10 is checked', () => {
            const mine = content.cards.filter((c) => /^[KA]10-/.test(c.id));
            const json = JSON.stringify(mine.map((c) => [c.when?.requires, c.choices.map((ch) => [ch.requires, ch.outcomes.map((o) => o.if)])]));
            const read = (f: string) => json.includes(`{"flag":"${f}"`) || json.includes(`{"flagAge":"${f}"`);
            const set = new Set(mine.flatMap((c) => c.choices.flatMap((ch) => ch.outcomes.flatMap((o) => (o.effects ?? []).flatMap((e) => ('flag' in e ? [e.flag] : []))))));
            // d10_late: the Day 11 morning; d10_will_sing: the reunion, days 15–30
            expect([...set].filter((f) => !read(f)).sort()).toEqual(['d10_late', 'd10_will_sing']);
            for (const f of ['d9_late', 'd9_pass', 'd9_burner', 'd9_oksana', 'd9_quarter', 'd6_reply', 'd7_thread', 'd3_posted', ...LOOKS, 'd1_half']) expect(read(f), f).toBe(true);
            for (const x of ['{"item":"gum"}', '{"modifier":"gym"}', '"counter":"smoke_free"']) expect(json).toContain(x);
          });
          describe('день 11', () => {
            /** Day 11 is past the demo too: the clock may cross Day 10 only with the cut-off lifted to 11 */
            const full11: Content = { ...content, balance: { ...content.balance, demoDays: 11 } };
            /** quiet choices of Day 11: up, not today, nod, scroll, walk past, the fridge, talk, a cigarette */
            const Q11: Record<string, string> = {
              'K11-late': 'up', 'K11-run': 'skip', 'K11-01h': 'thanks', 'K11-01a': 'nod', 'K11-01b': 'nod', 'K11-01c': 'hello',
              'K11-02': 'scroll', 'K11-03': 'later', 'K11-04': 'fridge', 'K11-05': 'talk', 'K11-08a': 'ok', 'K11-08b': 'ok', 'K11-08c': 'later',
              'K11-06a': 'smoke', 'K11-06q': 'smoke', 'K11-06b': 'smoke', 'K11-07': 'ok',
            };
            /** Aunt Zina's Day 5 branches: the quiet path is «no help, no cream» */
            const HELPED: Patch = { on: { d5_helped_zina: 'shelf' }, off: ['d5_no_help'] };
            const CREAM: Patch = { on: { d5_cream: 'bought' } };
            const both = (a: Patch, b: Patch): Patch => ({ ...a, ...b, on: { ...a.on, ...b.on }, off: [...(a.off ?? []), ...(b.off ?? [])] });
            /** the quiet Tuesday, then sleep or stay up */
            let n10: GameState | undefined;
            const night10 = () => (n10 ??= play10(morning10()));
            const morning11 = (p: Patch = {}, sleep10 = 'sleep') =>
              patch(syncClock(full11, pick(night10(), 'K10-sleep', sleep10), at(249)), { coins: 300, ...p, off: ['bought_haircut', 'd9_pass', 'd9_burner', ...(p.off ?? [])] });
            const play11 = (s: GameState, p: Record<string, string> = {}, hours = [253, 259, 263.5]) =>
              hours.reduce((x, h) => story(syncClock(full11, x, at(h)), { ...Q11, ...p }), story(s, { ...Q11, ...p }));
            const d11 = (s: GameState) => Object.keys(s.seen).filter((id) => id.startsWith('K11-'));
            /** the day part of Wednesday after the quiet morning */
            const day11 = (p: Patch = {}, q: Record<string, string> = {}) => syncClock(full11, story(morning11(p), { ...Q11, ...q }), at(253));
            /** the evening of Wednesday after the quiet day */
            const evening11 = (p: Patch = {}, q: Record<string, string> = {}) => syncClock(full11, story(day11(p, q), { ...Q11, ...q }), at(259));

            it('Wednesday morning: overslept after a late Tuesday, Vitya for his runs, and Aunt Zina on the stairs by her Day 5 branch', () => {
              const s = morning11();
              expect([s.day, s.part, s.energy]).toEqual([11, 'morning', 10]);
              expect(next(s)).toBe('K11-01c');
              const late = morning11({}, 'late');
              expect([next(late), late.energy]).toEqual(['K11-late', 10 - 4]);
              const runner = morning11({ on: { d9_pass: 'vitya' } });
              expect(next(runner)).toBe('K11-run');
              for (const pass of ['renewed', 'none']) expect(next(morning11({ on: { d9_pass: pass } })), pass).toBe('K11-01c');
              expect(card('K11-run').choices.find((c) => c.neutral)!.id).toBe('skip');
              const ran = choose(content, runner, 'K11-run', 'run');
              expect([runner.energy - ran.state.energy, ran.state.problems.weight - runner.problems.weight]).toEqual([4, -2]);
              expect(ran.outcome.text).toContain('шнурок');
              expect(choose(content, morning11({ on: { d9_pass: 'vitya', d9_burner: true } }), 'K11-run', 'run').outcome.text).toContain('Капсулы до сих пор');
              expect(d11(play11(morning11({ on: { d9_pass: 'vitya' } }, 'late'), {}, []))).toEqual(['K11-late', 'K11-run', 'K11-01c']);
              // the tip about the barber comes from helping her or from the cream bought on Sadovaya
              const cases: [Patch, string][] = [[HELPED, 'K11-01a'], [both(HELPED, { on: { d5_helped_zina: 'bags' } }), 'K11-01a'], [CREAM, 'K11-01b'], [{}, 'K11-01c']];
              for (const [p, id] of cases) expect(next(morning11(p)), id).toBe(id);
              expect(card('K11-01c').text).toContain('«Зарос ты, Андрюша»');
              expect(card('K11-01c').choices.map((c) => c.id)).toEqual(['hello']);
              for (const id of ['K11-01a', 'K11-01b']) {
                expect(card(id).text, id).toContain('Гош');
                expect(card(id).choices.map((c) => [c.id, !!c.neutral]), id).toEqual([['note', false], ['nod', true]]);
              }
              const noted = pick(morning11(HELPED), 'K11-01a', 'note');
              expect([noted.flags.d11_tip.value, noted.hints]).toEqual(['noted', expect.arrayContaining(['barber_gosha'])]);
              expect(pick(morning11(CREAM), 'K11-01b', 'nod').flags.d11_tip.value).toBe('heard');
              expect(pick(morning11(), 'K11-01c', 'hello').flags.d11_tip).toBeUndefined();
              // a haircut bought in the shop earlier: she recognises her nephew's work, whatever her branch
              for (const p of [HELPED, CREAM, {}]) expect(next(patch(morning11(p), { on: { bought_haircut: true } }))).toBe('K11-01h');
            });
            it('the day: the salon «Люкс» for 150 is a trap with its odds on the button; the barber for 70 only with Aunt Zina\'s tip', () => {
              const s = day11();
              expect(next(s)).toBe('K11-02');
              const salon = card('K11-02').choices.find((c) => c.id === 'book')!;
              expect([salon.cost, card('K11-02').choices.find((c) => c.neutral)!.id]).toEqual([{ coins: 150 }, 'scroll']);
              expect(oddsFor(content, s, salon).map((o) => `${o.word}: ${o.hint}`)).toEqual(['часто: не твоё', 'иногда: вышло нормально']);
              const scrolled = pick(s, 'K11-02', 'scroll');
              expect([scrolled.rumors.filter((x) => x.day === 11).map((x) => x.id), next(scrolled)]).toEqual([['salon_lux'], undefined]);
              const booked = choose(content, s, 'K11-02', 'book');
              expect([s.coins - booked.state.coins, booked.state.problems.care - s.problems.care, booked.state.flags.d11_cut.value]).toEqual([150, -6, 'salon']);
              const tipped = day11(HELPED);
              expect(next(pick(tipped, 'K11-02', 'scroll'))).toBe('K11-03');
              expect(next(pick(tipped, 'K11-02', 'book'))).toBeUndefined();                 // just had a haircut: no barber
              expect(card('K11-03').choices.map((c) => [c.id, c.cost ?? null, !!c.neutral])).toEqual([['cut', { coins: 70, energy: 2 }, false], ['later', null, true]]);
              const before = pick(tipped, 'K11-02', 'scroll');
              const cut = pick(before, 'K11-03', 'cut');
              expect([before.coins - cut.coins, before.energy - cut.energy, cut.problems.care - before.problems.care, cut.problems.conf - before.problems.conf]).toEqual([70, 2, -6, -2]);
              expect([cut.flags.d11_cut.value, !!cut.flags.bought_haircut, soldOut(cut, content.items.find((i) => i.id === 'haircut')!)]).toEqual(['barber', true, true]);
              expect(choicesFor(content, { ...before, coins: 40 }, card('K11-03')).map((x) => [x.choice.id, x.affordable])).toEqual([['cut', false], ['later', true]]);
              const haircut = patch(day11(HELPED), { on: { bought_haircut: true } });
              expect(next(haircut)).toBeUndefined();                                          // no salon, no barber after a shop haircut
            });
            it('the evening: pizza or cooking, mum on the phone by the haircut and the Sunday lunch, then the mirror or Aunt Zina\'s «Ну, как знаешь»', () => {
              const s = evening11();
              expect(next(s)).toBe('K11-04');
              const cost = (id: string) => card(id).choices.map((c) => [c.id, c.cost ?? null, !!c.neutral]);
              expect(cost('K11-04')).toEqual([['cook', { energy: 2 }, false], ['order', { coins: 20 }, false], ['fridge', null, true]]);
              const w = (id: string) => pick(s, 'K11-04', id).problems.weight - s.problems.weight;
              expect([w('cook'), w('order'), w('fridge')]).toEqual([-1, 2, 1]);
              const call = (x: GameState) => choose(content, pick(x, 'K11-04', 'fridge'), 'K11-05', 'talk').outcome.text;
              expect(call(s)).toContain('зарос ты');
              expect(call(evening11(HELPED))).toContain('отправила тебя к Гоше');
              expect(call(evening11(HELPED, { 'K11-03': 'cut' }))).toContain('ты подстригся');
              expect(call(evening11({}, { 'K11-02': 'book' }))).toContain('в «Люксе»');
              expect(call(patch(s, { on: { d8_lunch: 'held' } }))).toContain('от второго пирожка отказался');
              expect(call(patch(s, { on: { d8_lunch: 'ate' } }))).toContain('Пирожки в воскресенье все доел');
              const end = (x: GameState) => next(pick(pick(x, 'K11-04', 'fridge'), 'K11-05', 'talk'));
              expect(end(s)).toBeUndefined();                                                   // no tip, no haircut: the evening ends on mum
              expect(end(evening11(HELPED))).toBe('K11-08c');
              expect(card('K11-08c').text).toContain('«Не дошёл до Гоши? Ну, как знаешь»');
              expect(end(evening11(HELPED, { 'K11-03': 'cut' }))).toBe('K11-08a');
              expect(end(evening11({}, { 'K11-02': 'book' }))).toBe('K11-08b');
              for (const id of ['K11-08a', 'K11-08b', 'K11-08c']) expect(card(id).choices.map((c) => !!c.neutral), id).toEqual([true]);
            });
            it('the night: the balcony pays off yesterday\'s cigarette, quarter or clean day; a week without cigarettes; the gym only while a pass runs; Day 11 ends the lifted demo', () => {
              const night = (p: Patch = {}) => patch(play11(morning11()), p);
              const before = (p: Patch) => { const s = night(p); const flags = { ...s.flags }; for (const f of ['d11_smoked', 'd11_no_smoke', 'd11_quarter']) delete flags[f]; const seen = { ...s.seen }; delete seen['K11-06a']; return { ...s, flags, seen }; };
              const SMOKED = { counters: { smoke_free: 0 } };
              const QUARTER = { on: { d10_quarter: true }, off: ['d10_smoked'], counters: { smoke_free: 0 } };
              const HELD = { on: { d10_no_smoke: true }, off: ['d10_smoked'], counters: { smoke_free: 3 } };
              expect(night().flags.d10_smoked).toBeDefined();
              expect([next(before(SMOKED)), next(before(QUARTER)), next(before(HELD))]).toEqual(['K11-06a', 'K11-06q', 'K11-06b']);
              expect(card('K11-06a').text).toContain('Вчера здесь же была сигарета');
              expect(card('K11-06q').text).toContain('Вчера была четверть');
              expect(card('K11-06b').text).toContain('Вчера пачка осталась закрытой');
              const cost = (id: string) => card(id).choices.map((c) => [c.id, c.cost?.energy ?? 0]);
              for (const id of ['K11-06a', 'K11-06q']) expect(cost(id), id).toEqual([['hold', 2], ['quarter', 1], ['gum', 0], ['smoke', 0]]);
              expect(cost('K11-06b')).toEqual([['hold', 3], ['quarter', 1], ['gum', 0], ['smoke', 0]]);
              for (const id of ['K11-06a', 'K11-06q', 'K11-06b']) expect(card(id).choices.find((c) => c.neutral)!.id, id).toBe('smoke');
              expect(choose(content, before(QUARTER), 'K11-06q', 'smoke').outcome.text).toContain('Вчера была четверть, сегодня целая');
              expect(choose(content, before(HELD), 'K11-06b', 'smoke').outcome.text).toContain('Вчера удержался, сегодня нет');
              const held = choose(content, before(HELD), 'K11-06b', 'hold');
              expect([held.outcome.text.includes('Четвёртый день без табака'), held.state.counters.smoke_free, next(held.state)]).toEqual([true, 4, undefined]);
              const week = choose(content, before({ ...HELD, counters: { smoke_free: 6 } }), 'K11-06b', 'hold').state;
              expect([week.counters.smoke_free, next(week)]).toEqual([7, 'K11-07']);
              const r = choose(content, week, 'K11-07', 'ok');
              expect([r.outcome.text.includes('Ровно неделя без сигарет'), r.state.problems.care - week.problems.care]).toEqual([true, -3]);
              const s = night();
              expect(actionsFor(content, s).map((c) => c.id)).toEqual(['A11-run', 'A11-clean', 'A11-teeth', 'A11-couch', 'K11-sleep']);
              expect(actionsFor(content, day11()).map((c) => c.id)).toContain('A-job');
              const gym = (x: GameState) => actionsFor(content, x).map((c) => c.id).includes('A11-gym');
              expect(gym(passFrom(night({ on: { d9_pass: 'renewed' } }), 9))).toBe(true);
              expect(gym(passFrom(s, 4))).toBe(true);                       // a shop pass used from Day 4 runs to Day 11
              expect(gym(passFrom(s, 3))).toBe(false);
              expect(gym(passFrom(s, 11))).toBe(false);
              expect(gym({ ...flagged(s, 'bought_gym_pass', 6), items: { ...s.items, gym_pass: 1 } })).toBe(false);
              expect(card('K11-sleep').choices.map((c) => c.id)).toEqual(['sleep', 'late']);
              const slept = choose(content, s, 'K11-sleep', 'sleep');
              expect(slept.outcome.text).toContain('Завтра четверг');
              const end = syncClock(full11, slept.state, at(273));
              expect([end.demoOver, end.day]).toEqual([true, 11]);
              expect(end.summaries[10]).toMatchObject({ day: 11, played: true, gift: 'floss' });
              expect(content.days.find((d) => d.day === 11)).toMatchObject({ title: 'Племянник', gift: 'floss' });
              const late = pick(s, 'K11-sleep', 'late');
              expect(late.flags.d11_late).toBeDefined();
              expect(syncClock(full, late, at(273)).energy).toBe(10 - 4);
              for (const part of ['morning', 'day', 'evening', 'night']) expect(content.cards.some((c) => c.id.startsWith('K11-') && c.kind === 'story' && c.when!.parts!.includes(part as 'day')), part).toBe(true);
            });
            it('a fully skipped Day 11: no haircut, the fridge, smoked, no coins spent, and affinity 0', () => {
              for (const [p, titles] of [
                [HELPED, ['Тётя Зина на лестнице', 'Лента: салон «Люкс»', 'Барбершоп на Садовой', 'Пицца', 'Мама звонит', 'Тётя Зина', 'Балкон']],
                [{}, ['Тётя Зина на лестнице', 'Лента: салон «Люкс»', 'Пицца', 'Мама звонит', 'Балкон']],
              ] as [Patch, string[]][]) {
                const s0 = morning11(p);
                const s = syncClock(full11, s0, at(273));
                expect([s.demoOver, s.day]).toEqual([true, 11]);
                expect([s.flags.d11_cut, s.flags.bought_haircut, !!s.flags.d11_smoked]).toEqual([undefined, undefined, true]);
                expect([s.affinity - s0.affinity, s.coins - s0.coins]).toEqual([0, 0]);
                expect(s.summaries[10]).toMatchObject({ day: 11, played: false, coins: 0 });
                expect(s.missed!.at(-1)!.items.map((i) => i.title)).toEqual(titles);
              }
            });
            it('every flag set on Day 11 is read on Day 11 or has a planned payoff, and every Day 10 flag left for Day 11 is checked', () => {
              const mine = content.cards.filter((c) => /^[KA]11-/.test(c.id));
              const json = JSON.stringify(mine.map((c) => [c.when?.requires, c.choices.map((ch) => [ch.requires, ch.outcomes.map((o) => o.if)])]));
              const read = (f: string) => json.includes(`{"flag":"${f}"`) || json.includes(`{"flagAge":"${f}"`);
              const set = new Set(mine.flatMap((c) => c.choices.flatMap((ch) => ch.outcomes.flatMap((o) => (o.effects ?? []).flatMap((e) => ('flag' in e ? [e.flag] : []))))));
              // d11_late: the Day 12 morning
              expect([...set].filter((f) => !read(f)).sort()).toEqual(['d11_late']);
              for (const f of ['d10_late', 'd10_smoked', 'd10_no_smoke', 'd10_quarter', 'd9_pass', 'd9_burner', 'd5_helped_zina', 'd5_no_help', 'd5_cream', 'd8_lunch', 'bought_haircut', 'd1_half']) expect(read(f), f).toBe(true);
              for (const x of ['{"item":"gum"}', '{"modifier":"gym"}', '"counter":"smoke_free"']) expect(json).toContain(x);
            });
            describe('день 12', () => {
              /** Day 12 is past the demo too: the clock may cross Day 11 only with the cut-off lifted to 12 */
              const full12: Content = { ...content, balance: { ...content.balance, demoDays: 12 } };
              /** quiet choices of Day 12: up, not today, the dentist, a cigarette, answer later, scroll, put the phone away */
              const Q12: Record<string, string> = {
                'K12-late': 'up', 'K12-run': 'skip', 'K12-01': 'go', 'K12-01c': 'go', 'K12-02a': 'smoke', 'K12-02q': 'smoke', 'K12-02b': 'smoke',
                'K12-03ws': 'later', 'K12-03wa': 'later', 'K12-03e': 'later', 'K12-04a': 'scroll', 'K12-04b': 'scroll',
                'K12-05l': 'ok', 'K12-05s': 'ok', 'K12-05p': 'ok', 'K12-05e': 'ok', 'K12-06a': 'smoke', 'K12-06q': 'smoke', 'K12-06b': 'smoke',
              };
              /** Day 5 dentist branches and Day 7 tones are switched per test; the base is «booked for Day 12», the dry tone, no soda */
              const DENTAL = ['d5_dentist_later', 'd5_dentist_moved', 'd5_cleaned', 'd5_smoked', 'd1_soda_teeth'];
              const CHECKUP: Patch = { on: { d5_cleaned: 'full' } };
              const WARM: Patch = { on: { d7_msg: 'warm' } };
              const EVEN: Patch = { on: { d7_msg: 'even' } };
              const SINGER: Patch = { on: { d7_msg: 'warm', d6_reply: 'joke' } };
              /** the quiet Wednesday, then sleep or stay up */
              let n11: GameState | undefined;
              const night11 = () => (n11 ??= play11(morning11()));
              const morning12 = (p: Patch = {}, sleep11 = 'sleep') => {
                const s = syncClock(full12, pick(night11(), 'K11-sleep', sleep11), at(273));
                const base = patch(s, { off: [...DENTAL, 'd9_pass', 'd9_burner', 'd6_reply', 'd7_msg'], on: { d5_dentist_later: true } });
                return patch(base, { coins: 300, ...p, off: [...(p.on && ('d5_cleaned' in p.on || 'd5_dentist_moved' in p.on) ? ['d5_dentist_later'] : []), ...(p.off ?? [])] });
              };
              const play12 = (s: GameState, p: Record<string, string> = {}, hours = [277, 283, 287.5]) =>
                hours.reduce((x, h) => story(syncClock(full12, x, at(h)), { ...Q12, ...p }), story(s, { ...Q12, ...p }));
              const d12 = (s: GameState) => Object.keys(s.seen).filter((id) => id.startsWith('K12-'));
              /** the day part of Thursday after the quiet morning */
              const day12 = (p: Patch = {}, q: Record<string, string> = {}) => syncClock(full12, story(morning12(p), { ...Q12, ...q }), at(277));
              /** the evening of Thursday */
              const evening12 = (p: Patch = {}, q: Record<string, string> = {}) => syncClock(full12, story(day12(p, q), { ...Q12, ...q }), at(283));
              const her12 = (s: GameState) => s.chat.filter((m) => m.day === 12 && m.from === 'crush' && !m.status).map((m) => m.text);
              const his12 = (s: GameState) => s.chat.filter((m) => m.day === 12 && m.from === 'hero').map((m) => m.text);

              it('Thursday morning: overslept after a late Wednesday, Vitya for his runs, the postponed cleaning or the check-up', () => {
                const s = morning12();
                expect([s.day, s.part, s.energy]).toEqual([12, 'morning', 10]);
                expect(next(s)).toBe('K12-01');
                expect(next(morning12({ on: { d5_dentist_moved: true } }))).toBe('K12-01');
                expect(next(morning12(CHECKUP))).toBe('K12-01c');
                const late = morning12({}, 'late');
                expect([next(late), late.energy]).toEqual(['K12-late', 10 - 4]);
                const runner = morning12({ on: { d9_pass: 'vitya' } });
                expect(next(runner)).toBe('K12-run');
                for (const pass of ['renewed', 'none']) expect(next(morning12({ on: { d9_pass: pass } })), pass).toBe('K12-01');
                expect(card('K12-run').choices.find((c) => c.neutral)!.id).toBe('skip');
                const ran = choose(content, runner, 'K12-run', 'run');
                expect([runner.energy - ran.state.energy, ran.state.problems.weight - runner.problems.weight]).toEqual([4, -2]);
                expect(choose(content, morning12({ on: { d9_pass: 'vitya', d9_burner: true } }), 'K12-run', 'run').outcome.text).toContain('капсулы');
                expect(d12(play12(morning12({ on: { d9_pass: 'vitya' } }, 'late'), {}, []))).toEqual(['K12-late', 'K12-run', 'K12-01']);
                // the cleaning: three energy as an effect, the neutral choice is to go, the soda scratched the enamel
                expect(card('K12-01').choices.map((c) => [c.id, !!c.neutral, c.cost ?? null])).toEqual([['go', true, null]]);
                const clean = choose(content, s, 'K12-01', 'go');
                expect([s.energy - clean.state.energy, clean.state.problems.teeth - s.problems.teeth, clean.state.flags.d12_cleaned.value]).toEqual([3, -15, 'full']);
                const sodaS = morning12({ on: { d1_soda_teeth: true } });
                const soda = choose(content, sodaS, 'K12-01', 'go');
                expect([soda.outcome.text.includes('Содой тёрли?'), soda.state.problems.teeth - sodaS.problems.teeth, soda.state.flags.d12_cleaned.value]).toEqual([true, -10, 'soda']);
                // the check-up for those cleaned on Day 5: the cigarette on the porch is remembered
                const up = morning12(CHECKUP);
                const fine = choose(content, up, 'K12-01c', 'go');
                expect([fine.outcome.text.includes('Держится хорошо'), fine.state.problems.teeth - up.problems.teeth, fine.state.flags.d12_cleaned]).toEqual([true, -3, undefined]);
                const smokedUp = patch(up, { on: { d5_smoked: true } });
                const seen = choose(content, smokedUp, 'K12-01c', 'go');
                expect([seen.outcome.text.includes('«Курили сразу после чистки?'), seen.state.problems.teeth - smokedUp.problems.teeth]).toEqual([true, -1]);
              });
              it('the day: the porch craving right after the cleaning, by yesterday\'s cigarette; Alina asks about the music (warm) or the physics teacher (even), nothing for the dry tone', () => {
                const s = day12();
                expect(s.flags.d12_cleaned.value).toBe('full');
                expect(next(s)).toBe('K12-02a');
                const y = (p: Patch) => day12(p);
                expect(next(y({ on: { d11_quarter: true }, off: ['d11_smoked'] }))).toBe('K12-02q');
                expect(next(y({ on: { d11_no_smoke: true }, off: ['d11_smoked'], counters: { smoke_free: 2 } }))).toBe('K12-02b');
                expect(card('K12-02a').text).toContain('вчера вечером была сигарета');
                expect(card('K12-02q').text).toContain('Вчера была четверть');
                expect(card('K12-02b').text).toContain('Вчера пачка осталась закрытой');
                const cost = (id: string) => card(id).choices.map((c) => [c.id, c.cost?.energy ?? 0]);
                for (const id of ['K12-02a', 'K12-02q']) expect(cost(id), id).toEqual([['hold', 2], ['quarter', 1], ['gum', 0], ['smoke', 0]]);
                expect(cost('K12-02b')).toEqual([['hold', 3], ['quarter', 1], ['gum', 0], ['smoke', 0]]);
                const smoked = choose(content, s, 'K12-02a', 'smoke');
                expect([smoked.state.problems.teeth - s.problems.teeth, !!smoked.state.flags.d12_smoked]).toEqual([2, true]);
                const held = choose(content, y({ on: { d11_no_smoke: true }, off: ['d11_smoked'], counters: { smoke_free: 2 } }), 'K12-02b', 'hold');
                expect([held.outcome.text.includes('Третий день без табака'), held.state.counters.smoke_free]).toEqual([true, 3]);
                expect(choose(content, y({ on: { d11_quarter: true }, off: ['d11_smoked'] }), 'K12-02q', 'smoke').outcome.text).toContain('Вчера была четверть, сегодня целая');
                expect(next(pick(s, 'K12-02a', 'smoke'))).toBeUndefined();                       // dry tone: no message from her
                expect(next(day12(CHECKUP))).toBeUndefined();                                    // the check-up: no porch, the craving waits for the night
                // the warm tone: the music, with «Ты же у нас певец» for the one who joked about singing
                const ask = (p: Patch) => { const x = pick(day12(p), 'K12-02a', 'smoke'); return drawStory(content, x).state; };
                expect(next(pick(day12(WARM), 'K12-02a', 'smoke'))).toBe('K12-03wa');
                expect(next(pick(day12(SINGER), 'K12-02a', 'smoke'))).toBe('K12-03ws');
                expect(next(pick(day12(EVEN), 'K12-02a', 'smoke'))).toBe('K12-03e');
                expect(her12(ask(SINGER)).at(-1)).toContain('Ты же у нас певец');
                expect(her12(ask(WARM)).at(-1)).not.toContain('певец');
                expect(her12(ask(EVEN)).at(-1)).toContain('физичк');
                for (const id of ['K12-03ws', 'K12-03wa']) {
                  expect(card(id).choices.map((c) => [c.id, !!c.neutral]), id).toEqual([['list', false], ['short', false], ['pass', false], ['later', true]]);
                }
                expect(card('K12-03e').choices.map((c) => [c.id, !!c.neutral])).toEqual([['answer', false], ['short', false], ['later', true]]);
                const w = ask(WARM);
                const aff = (st: GameState, id: string, ch: string) => { const r = pick(st, id, ch); return [r.affinity - st.affinity, r.flags.d12_reply.value, his12(r).length]; };
                expect([aff(w, 'K12-03wa', 'list'), aff(w, 'K12-03wa', 'short'), aff(w, 'K12-03wa', 'pass'), aff(w, 'K12-03wa', 'later')]).toEqual([[3, 'list', 1], [1, 'short', 1], [0, 'pass', 1], [0, 'later', 0]]);
                expect(pick(w, 'K12-03wa', 'list').flags.d12_helped_music).toBeDefined();
                const e = ask(EVEN);
                expect([aff(e, 'K12-03e', 'answer'), aff(e, 'K12-03e', 'short'), aff(e, 'K12-03e', 'later')]).toEqual([[2, 'answer', 1], [0, 'short', 1], [0, 'later', 0]]);
              });
              it('the evening: whitening strips for 40 are a trap with odds on the button, the soda remembered; then her answer ends the day: Saturday at «Зерно» for the list', () => {
                const s = evening12();
                expect(next(s)).toBe('K12-04b');
                expect(next(evening12({ on: { d1_soda_teeth: true } }))).toBe('K12-04a');
                expect(card('K12-04a').text).toContain('сода');
                const buy = card('K12-04b').choices.find((c) => c.id === 'buy')!;
                expect([buy.cost, card('K12-04b').choices.find((c) => c.neutral)!.id]).toEqual([{ coins: 40 }, 'scroll']);
                expect(oddsFor(content, s, buy).map((o) => `${o.word}: ${o.hint}`)).toEqual(['часто: заныли зубы', 'иногда: ничего не изменилось']);
                const scrolled = pick(s, 'K12-04b', 'scroll');
                expect([scrolled.rumors.filter((x) => x.day === 12).map((x) => x.id), next(scrolled), s.coins - scrolled.coins]).toEqual([['strips_ad'], undefined, 0]);
                const bought = choose(content, s, 'K12-04b', 'buy');
                expect(s.coins - bought.state.coins).toBe(40);
                expect(['sore', 'none']).toContain(bought.state.flags.d12_strips.value);
                const sore = card('K12-04b').choices[0].outcomes[0];
                expect([sore.effects, sore.hint]).toEqual([expect.arrayContaining([{ problem: 'teeth', add: 2 }, { tomorrow: [{ problem: 'teeth', add: 2 }] }]), 'заныли зубы']);
                // her answer by his reply
                const answer = (p: Patch, q: Record<string, string>) => { const x = pick(evening12(p, q), next(evening12(p, q))!, 'scroll'); return [next(x), x] as const; };
                const [l, ls] = answer(WARM, { 'K12-03wa': 'list' });
                expect(l).toBe('K12-05l');
                expect(her12(drawStory(content, ls).state).at(-1)).toMatch(/субботу.*«Зерне»/);
                expect(answer(SINGER, { 'K12-03ws': 'short' })[0]).toBe('K12-05s');
                expect(answer(WARM, { 'K12-03wa': 'pass' })[0]).toBe('K12-05p');
                expect(answer(EVEN, { 'K12-03e': 'answer' })[0]).toBe('K12-05e');
                for (const [p, q] of [[EVEN, { 'K12-03e': 'short' }], [EVEN, {}], [WARM, {}], [{}, {}]] as [Patch, Record<string, string>][]) expect(answer(p, q)[0]).toBeUndefined();
                for (const id of ['K12-05l', 'K12-05s', 'K12-05p', 'K12-05e']) expect(card(id).choices.map((c) => !!c.neutral), id).toEqual([true]);
                for (const k of ['alina_d12_music_singer', 'alina_d12_music_ask', 'alina_d12_zerno', 'alina_d12_short', 'alina_d12_pass', 'alina_d12_even_q', 'alina_d12_even_thanks']) expect(content.chat[k].length, k).toBe(10);
                expect(content.chat.alina_d12_zerno.every((t) => /субботу.*«Зерне»/.test(t))).toBe(true);
              });
              it('the night: the balcony pays off yesterday\'s cigarette, quarter or clean day for those without the porch; the gym only while a pass runs; Day 12 ends the lifted demo', () => {
                const night = (p: Patch = {}) => patch(play12(morning12(CHECKUP)), p);
                const before = (p: Patch) => { const s = night(p); const flags = { ...s.flags }; for (const f of ['d12_smoked', 'd12_no_smoke', 'd12_quarter']) delete flags[f]; const seen = { ...s.seen }; delete seen['K12-06a']; return { ...s, flags, seen }; };
                const SMOKED = { counters: { smoke_free: 0 } };
                const QUARTER = { on: { d11_quarter: true }, off: ['d11_smoked'], counters: { smoke_free: 0 } };
                const HELD = { on: { d11_no_smoke: true }, off: ['d11_smoked'], counters: { smoke_free: 3 } };
                expect(d12(night())).toEqual(['K12-01c', 'K12-04b', 'K12-06a']);
                expect([next(before(SMOKED)), next(before(QUARTER)), next(before(HELD))]).toEqual(['K12-06a', 'K12-06q', 'K12-06b']);
                const porch = play12(morning12());
                expect([d12(porch).includes('K12-02a'), d12(porch).some((id) => id.startsWith('K12-06')), !!porch.flags.d12_smoked]).toEqual([true, false, true]);
                expect(card('K12-06a').text).toContain('Вчера здесь же была сигарета');
                expect(card('K12-06q').text).toContain('Вчера была четверть');
                expect(card('K12-06b').text).toContain('Вчера пачка осталась закрытой');
                for (const id of ['K12-06a', 'K12-06q', 'K12-06b']) expect(card(id).choices.find((c) => c.neutral)!.id, id).toBe('smoke');
                const held = choose(content, before(HELD), 'K12-06b', 'hold');
                expect([held.outcome.text.includes('Четвёртый день без табака'), held.state.counters.smoke_free, held.state.problems.teeth - before(HELD).problems.teeth]).toEqual([true, 4, 0]);
                expect(choose(content, before(HELD), 'K12-06b', 'smoke').outcome.text).toContain('Вчера удержался, сегодня нет');
                const s = night();
                expect(actionsFor(content, s).map((c) => c.id)).toEqual(['A12-run', 'A12-clean', 'A12-teeth', 'A12-couch', 'K12-sleep']);
                expect(actionsFor(content, day12()).map((c) => c.id)).toContain('A-job');
                const gym = (x: GameState) => actionsFor(content, x).map((c) => c.id).includes('A12-gym');
                expect(gym(passFrom(night({ on: { d9_pass: 'renewed' } }), 9))).toBe(true);
                expect(gym(passFrom(s, 5))).toBe(true);                       // a shop pass used from Day 5 runs to Day 12
                expect(gym(passFrom(s, 4))).toBe(false);
                expect(gym(passFrom(s, 12))).toBe(false);
                expect(gym({ ...flagged(s, 'bought_gym_pass', 7), items: { ...s.items, gym_pass: 1 } })).toBe(false);
                expect(card('K12-sleep').choices.map((c) => c.id)).toEqual(['sleep', 'late']);
                const slept = choose(content, s, 'K12-sleep', 'sleep');
                expect(slept.outcome.text).toContain('Завтра пятница');
                const end = syncClock(full12, slept.state, at(297));
                expect([end.demoOver, end.day]).toEqual([true, 12]);
                expect(end.summaries[11]).toMatchObject({ day: 12, played: true, gift: 'gum' });
                expect(content.days.find((d) => d.day === 12)).toMatchObject({ title: 'Вторая чистка', gift: 'gum' });
                const late = pick(s, 'K12-sleep', 'late');
                expect(late.flags.d12_late).toBeDefined();
                expect(syncClock(full, late, at(297)).energy).toBe(10 - 4);
                for (const part of ['morning', 'day', 'evening', 'night']) expect(content.cards.some((c) => c.id.startsWith('K12-') && c.kind === 'story' && c.when!.parts!.includes(part as 'day')), part).toBe(true);
              });
              it('a fully skipped Day 12: the cleaning happened, smoked on the porch, no answer sent, no strips, and affinity 0', () => {
                for (const [p, titles] of [
                  [WARM, ['Стоматолог', 'Крыльцо стоматологии', 'Алина пишет', 'Лента: полоски «Белый жемчуг»']],
                  [CHECKUP, ['Контрольный осмотр', 'Лента: полоски «Белый жемчуг»', 'Балкон']],
                ] as [Patch, string[]][]) {
                  const s0 = morning12(p);
                  const s = syncClock(full12, s0, at(297));
                  expect([s.demoOver, s.day]).toEqual([true, 12]);
                  expect([!!s.flags.d12_smoked, s.flags.d12_strips, s.flags.d12_helped_music, his12(s)]).toEqual([true, undefined, undefined, []]);
                  expect([s.affinity - s0.affinity, s.coins - s0.coins]).toEqual([0, 0]);
                  expect(s.summaries[11]).toMatchObject({ day: 12, played: false, coins: 0 });
                  expect(s.missed!.at(-1)!.items.map((i) => i.title)).toEqual(titles);
                }
                expect(syncClock(full12, morning12(), at(297)).flags.d12_cleaned.value).toBe('full');
              });
              it('every flag set on Day 12 is read on Day 12 or has a planned payoff, and every Day 11 flag left for Day 12 is checked', () => {
                const mine = content.cards.filter((c) => /^[KA]12-/.test(c.id));
                const json = JSON.stringify(mine.map((c) => [c.when?.requires, c.choices.map((ch) => [ch.requires, ch.outcomes.map((o) => o.if)])]));
                const read = (f: string) => json.includes(`{"flag":"${f}"`) || json.includes(`{"flagAge":"${f}"`);
                const set = new Set(mine.flatMap((c) => c.choices.flatMap((ch) => ch.outcomes.flatMap((o) => (o.effects ?? []).flatMap((e) => ('flag' in e ? [e.flag] : []))))));
                // d12_cleaned is read by the porch and pays off on Day 14 too; d12_helped_music: Days 13–14; d12_strips: Day 13; d12_late: the Day 13 morning
                expect([...set].filter((f) => !read(f)).sort()).toEqual(['d12_helped_music', 'd12_late', 'd12_strips']);
                for (const f of ['d11_late', 'd11_smoked', 'd11_no_smoke', 'd11_quarter', 'd9_pass', 'd9_burner', 'd5_dentist_later', 'd5_dentist_moved', 'd5_cleaned', 'd5_smoked', 'd1_soda_teeth', 'd7_msg', 'd6_reply', 'd1_half']) expect(read(f), f).toBe(true);
                for (const x of ['{"item":"gum"}', '{"modifier":"gym"}', '"counter":"smoke_free"']) expect(json).toContain(x);
              });
              describe('день 13', () => {
                /** Day 13 is past the demo too: the clock may cross Day 12 only with the cut-off lifted to 13 */
                const full13: Content = { ...content, balance: { ...content.balance, demoDays: 13 } };
                /** quiet choices of Day 13: up, not today, the drawer, the tube, call later, stay home, talk, answer in the morning, a cigarette */
                const Q13: Record<string, string> = {
                  'K13-late': 'up', 'K13-run': 'skip', 'K13-00s': 'ok', 'K13-00n': 'ok', 'K13-01': 'ok', 'K13-02': 'later',
                  'K13-03a': 'home', 'K13-03b': 'home', 'K13-03c': 'home', 'K13-03k': 'lot', 'K13-04': 'ok',
                  'K13-06a': 'smoke', 'K13-06q': 'smoke', 'K13-06b': 'smoke', 'K13-03h': 'talk', 'K13-05m': 'later', 'K13-05': 'ok',
                  'K13-07a': 'smoke', 'K13-07q': 'smoke', 'K13-07b': 'smoke',
                };
                /** earlier flags Day 13 reads are switched per test; the base: no course, no strips, no help with the music, Day 4 at home, «Зерно» unknown */
                const EARLY = ['d9_pass', 'd9_burner', 'd12_strips', 'd12_helped_music', 'd3_course', 'd4_meat_held', 'd4_feast', 'd4_home', 'd4_went', 'd1_joked', 'd2_zerno_known'];
                const COURSE: Patch = { on: { d3_course: true } };
                const GO: Record<string, string> = { 'K13-03a': 'go', 'K13-03b': 'go', 'K13-03c': 'go' };
                /** the quiet Thursday (the cleaning, a cigarette), then sleep or stay up */
                let n12: GameState | undefined;
                const night12 = () => (n12 ??= play12(morning12()));
                const morning13 = (p: Patch = {}, sleep12 = 'sleep') =>
                  patch(syncClock(full13, pick(night12(), 'K12-sleep', sleep12), at(297)), { coins: 300, ...p, off: [...EARLY, ...(p.off ?? [])] });
                const play13 = (s: GameState, p: Record<string, string> = {}, hours = [301, 307, 311.5]) =>
                  hours.reduce((x, h) => story(syncClock(full13, x, at(h)), { ...Q13, ...p }), story(s, { ...Q13, ...p }));
                const d13 = (s: GameState) => Object.keys(s.seen).filter((id) => id.startsWith('K13-'));
                const day13 = (p: Patch = {}, q: Record<string, string> = {}) => syncClock(full13, story(morning13(p), { ...Q13, ...q }), at(301));
                const evening13 = (p: Patch = {}, q: Record<string, string> = {}) => syncClock(full13, story(day13(p, q), { ...Q13, ...q }), at(307));
                const her13 = (s: GameState) => s.chat.filter((m) => m.day === 13 && m.from === 'crush' && !m.status).map((m) => m.text);
                const his13 = (s: GameState) => s.chat.filter((m) => m.day === 13 && m.from === 'hero').map((m) => m.text);

                it('Friday morning: overslept after a late Thursday, Vitya runs on his birthday, the strips remembered, the last tube of the course', () => {
                  const s = morning13();
                  expect([s.day, s.part, s.energy]).toEqual([13, 'morning', 10]);
                  expect(next(s)).toBeUndefined();
                  const late = morning13({}, 'late');
                  expect([next(late), late.energy]).toEqual(['K13-late', 10 - 4]);
                  expect(next(morning13({ on: { d12_strips: 'sore' } }))).toBe('K13-00s');
                  expect(next(morning13({ on: { d12_strips: 'none' } }))).toBe('K13-00n');
                  expect(card('K13-00s').text).toContain('Вчерашние полоски');
                  expect(card('K13-00n').text).toContain('«Белый жемчуг»');
                  // the course started on Day 3 ends on the morning of Day 13; a later start is not over yet
                  expect(next(morning13(COURSE))).toBe('K13-01');
                  expect(next(flagged(morning13(), 'd3_course', 4))).toBeUndefined();
                  const runner = morning13({ on: { d9_pass: 'vitya' } });
                  expect(next(runner)).toBe('K13-run');
                  expect(card('K13-run').text).toContain('Именинник');
                  expect(card('K13-run').choices.find((c) => c.neutral)!.id).toBe('skip');
                  const ran = choose(content, runner, 'K13-run', 'run');
                  expect([runner.energy - ran.state.energy, ran.state.problems.weight - runner.problems.weight]).toEqual([4, -2]);
                  expect(choose(content, morning13({ on: { d9_pass: 'vitya', d9_burner: true } }), 'K13-run', 'run').outcome.text).toContain('капсулы');
                  const all = morning13({ on: { d9_pass: 'vitya', d12_strips: 'sore', d3_course: true } }, 'late');
                  expect(d13(story(all, Q13))).toEqual(['K13-late', 'K13-run', 'K13-00s', 'K13-01']);
                  for (const id of ['K13-late', 'K13-00s', 'K13-00n', 'K13-01']) expect(card(id).choices.map((c) => !!c.neutral), id).toEqual([true]);
                });
                it('the day: the control visit after the last tube, nothing sold there; Vitya invites by how Day 4 went', () => {
                  expect(next(day13())).toBe('K13-03c');
                  const s = day13(COURSE);
                  expect(next(s)).toBe('K13-02');
                  expect(card('K13-02').choices.map((c) => [c.id, !!c.neutral, c.cost ?? null])).toEqual([['go', false, { energy: 2 }], ['later', true, null]]);
                  const went = choose(content, s, 'K13-02', 'go');
                  expect([s.energy - went.state.energy, went.state.problems.skin - s.problems.skin, !!went.state.flags.d13_course_done]).toEqual([2, -2, true]);
                  expect(went.outcome.text).toContain('Дальше сами');
                  expect(JSON.stringify(card('K13-02'))).not.toMatch(/coins|item/);
                  expect(pick(s, 'K13-02', 'later').flags.d13_course_done).toBeUndefined();
                  // the invitation: «тебе шампур с овощами» for the one who held at the grill, «мяса с запасом» for the feast, «в этот раз придёшь?» for home
                  expect(next(day13({ on: { d4_went: true, d4_meat_held: true } }))).toBe('K13-03a');
                  expect(next(day13({ on: { d4_went: true, d4_feast: true } }))).toBe('K13-03b');
                  expect(next(day13({ on: { d4_home: true } }))).toBe('K13-03c');
                  expect(card('K13-03a').text).toContain('шампур с овощами');
                  expect(card('K13-03b').text).toContain('с запасом');
                  expect(card('K13-03c').text).toContain('В этот раз придёшь?');
                  const d = day13();
                  for (const id of ['K13-03a', 'K13-03b', 'K13-03c']) expect(card(id).choices.map((c) => [c.id, !!c.neutral]), id).toEqual([['go', false], ['home', true]]);
                  const yes = pick(d, 'K13-03c', 'go');
                  expect([!!yes.flags.d13_went, yes.problems.conf - d.problems.conf, next(yes)]).toEqual([true, -1, undefined]);
                  expect(pick(d, 'K13-03c', 'home').flags.d13_bday.value).toBe('home');
                });
                it('the evening at Vitya\'s: the cake, the toast for the door joke, the craving at the grill by yesterday\'s cigarette', () => {
                  const s = evening13({}, GO);
                  expect(next(s)).toBe('K13-03k');
                  expect(card('K13-03k').choices.map((c) => [c.id, !!c.neutral, c.cost?.energy ?? 0])).toEqual([['slice', false, 2], ['lot', true, 0]]);
                  const slice = pick(s, 'K13-03k', 'slice');
                  const lot = pick(s, 'K13-03k', 'lot');
                  expect([slice.flags.d13_bday.value, slice.problems.weight - s.problems.weight, s.energy - slice.energy]).toEqual(['held', 0, 2]);
                  expect([lot.flags.d13_bday.value, lot.problems.weight - s.problems.weight]).toEqual(['cake', 2]);
                  expect(lot.rumors.map((r) => r.id)).toContain('vitya_bday');
                  expect(next(lot)).toBe('K13-06a');
                  const joker = pick(evening13({ on: { d1_joked: true } }, GO), 'K13-03k', 'lot');
                  expect(next(joker)).toBe('K13-04');
                  expect(card('K13-04').text).toContain('пролезть в дверь');
                  expect(card('K13-04').choices.map((c) => !!c.neutral)).toEqual([true]);
                  // the craving moves to the grill and names yesterday's result
                  const at12 = (p: Patch) => next(pick(evening13(p, GO), 'K13-03k', 'lot'));
                  expect(at12({ on: { d12_quarter: true }, off: ['d12_smoked'] })).toBe('K13-06q');
                  expect(at12({ on: { d12_no_smoke: true }, off: ['d12_smoked'], counters: { smoke_free: 1 } })).toBe('K13-06b');
                  expect(card('K13-06a').text).toContain('Вчера вечером была сигарета');
                  expect(card('K13-06q').text).toContain('Вчера была четверть');
                  expect(card('K13-06b').text).toContain('Вчера пачка осталась закрытой');
                  const cost = (id: string) => card(id).choices.map((c) => [c.id, c.cost?.energy ?? 0]);
                  for (const id of ['K13-06a', 'K13-06q', 'K13-07a', 'K13-07q']) expect(cost(id), id).toEqual([['hold', 2], ['quarter', 1], ['gum', 0], ['smoke', 0]]);
                  for (const id of ['K13-06b', 'K13-07b']) expect(cost(id), id).toEqual([['hold', 3], ['quarter', 1], ['gum', 0], ['smoke', 0]]);
                  const heldS = pick(evening13({ on: { d12_no_smoke: true }, off: ['d12_smoked'], counters: { smoke_free: 1 } }, GO), 'K13-03k', 'lot');
                  const held = choose(content, heldS, 'K13-06b', 'hold');
                  expect([held.outcome.text.includes('Второй день без табака'), held.state.counters.smoke_free]).toEqual([true, 2]);
                  expect(choose(content, lot, 'K13-06a', 'hold').outcome.text).toContain('Ну ты кремень');
                  const smoked = pick(lot, 'K13-06a', 'smoke');
                  expect([!!smoked.flags.d13_smoked, smoked.counters.smoke_free ?? 0]).toEqual([true, 0]);
                  // no balcony after the grill
                  const n = play13(morning13(), GO);
                  expect([d13(n).includes('K13-06a'), d13(n).some((id) => id.startsWith('K13-07'))]).toEqual([true, false]);
                });
                it('the evening at home: mum calls, the course remembered; Alina confirms Saturday for the one who helped with the music', () => {
                  const s = evening13();
                  expect(next(s)).toBe('K13-03h');
                  const talk = choose(content, s, 'K13-03h', 'talk');
                  expect([talk.outcome.text.includes('отдохни'), talk.state.rumors.map((r) => r.id).includes('vitya_bday')]).toEqual([true, true]);
                  expect(choose(content, evening13(COURSE, { 'K13-02': 'go' }), 'K13-03h', 'talk').outcome.text).toContain('Закончил курс?');
                  // her message about Saturday: only after the list on Day 12, no affinity on Day 13
                  const helped = pick(evening13({ on: { d12_helped_music: true } }), 'K13-03h', 'talk');
                  expect(next(helped)).toBe('K13-05m');
                  const opened = drawStory(content, helped).state;
                  expect(her13(opened).at(-1)).toMatch(/«Зерн.*одиннадцат|одиннадцат.*«Зерн/);
                  expect(card('K13-05m').choices.map((c) => [c.id, !!c.neutral])).toEqual([['yes', false], ['later', true]]);
                  const yes = pick(opened, 'K13-05m', 'yes');
                  expect([yes.flags.d13_zerno_reply.value, his13(yes), yes.affinity - opened.affinity]).toEqual(['yes', ['Буду. Список возьму с собой.'], 0]);
                  expect(yes.chat.at(-1)!.status).toBe(true);
                  const later = pick(opened, 'K13-05m', 'later');
                  expect([later.flags.d13_zerno_reply.value, his13(later)]).toEqual(['later', []]);
                  expect(next(pick(s, 'K13-03h', 'talk'))).toBeUndefined();
                  for (const k of ['alina_d13_time', 'status_reply_read_eve']) expect(content.chat[k].length, k).toBe(10);
                  expect(content.chat.alina_d13_time.every((t) => t.includes('«Зерн') && t.includes('одиннадцат'))).toBe(true);
                });
                it('the night: Vitya\'s Saturday tip for those who do not know «Зерно», the balcony for those at home; the gym only while a pass runs; Day 13 ends the lifted demo', () => {
                  const s = play13(morning13());
                  expect(d13(s)).toEqual(['K13-03c', 'K13-03h', 'K13-05', 'K13-07a']);
                  expect(s.hints).toContain('zerno_saturday');
                  expect(!!s.flags.d13_zerno_tip).toBe(true);
                  expect(d13(play13(morning13({ on: { d2_zerno_known: true } })))).not.toContain('K13-05');
                  expect(d13(play13(morning13({ on: { d12_helped_music: true } })))).toEqual(['K13-03c', 'K13-03h', 'K13-05m', 'K13-07a']);
                  const before = (p: Patch) => { const x = patch(s, p); const flags = { ...x.flags }; for (const f of ['d13_smoked', 'd13_no_smoke', 'd13_quarter']) delete flags[f]; const seen = { ...x.seen }; delete seen['K13-07a']; return { ...x, flags, seen }; };
                  const QUARTER = { on: { d12_quarter: true }, off: ['d12_smoked'], counters: { smoke_free: 0 } };
                  const HELD = { on: { d12_no_smoke: true }, off: ['d12_smoked'], counters: { smoke_free: 4 } };
                  expect([next(before({})), next(before(QUARTER)), next(before(HELD))]).toEqual(['K13-07a', 'K13-07q', 'K13-07b']);
                  expect(card('K13-07a').text).toContain('Вчера здесь же была сигарета');
                  expect(card('K13-07q').text).toContain('Вчера была четверть');
                  expect(card('K13-07b').text).toContain('Вчера пачка осталась закрытой');
                  for (const id of ['K13-06a', 'K13-06q', 'K13-06b', 'K13-07a', 'K13-07q', 'K13-07b']) expect(card(id).choices.find((c) => c.neutral)!.id, id).toBe('smoke');
                  const held = choose(content, before(HELD), 'K13-07b', 'hold');
                  expect([held.outcome.text.includes('Пятый день без табака'), held.state.counters.smoke_free]).toEqual([true, 5]);
                  expect(choose(content, before(QUARTER), 'K13-07q', 'smoke').outcome.text).toContain('Вчера четверть, сегодня целая');
                  expect(actionsFor(content, s).map((c) => c.id)).toEqual(['A13-run', 'A13-clean', 'A13-teeth', 'A13-couch', 'K13-sleep']);
                  expect(actionsFor(content, day13()).map((c) => c.id)).toContain('A-job');
                  const gym = (x: GameState) => actionsFor(content, x).map((c) => c.id).includes('A13-gym');
                  expect(gym(passFrom(patch(s, { on: { d9_pass: 'renewed' } }), 9))).toBe(true);
                  expect(gym(passFrom(s, 6))).toBe(true);                       // a shop pass used from Day 6 runs to Day 13
                  expect(gym(passFrom(s, 5))).toBe(false);
                  expect(gym(passFrom(s, 13))).toBe(false);
                  expect(card('K13-sleep').choices.map((c) => c.id)).toEqual(['sleep', 'late']);
                  const slept = choose(content, s, 'K13-sleep', 'sleep');
                  expect(slept.outcome.text).toContain('Завтра суббота');
                  const end = syncClock(full13, slept.state, at(321));
                  expect([end.demoOver, end.day]).toEqual([true, 13]);
                  expect(end.summaries[12]).toMatchObject({ day: 13, played: true, gift: 'acne_patch' });
                  expect(content.days.find((d) => d.day === 13)).toMatchObject({ title: 'Конец курса', gift: 'acne_patch', teaser: 'Завтра суббота. Половина пути' });
                  const late = pick(s, 'K13-sleep', 'late');
                  expect(late.flags.d13_late).toBeDefined();
                  expect(syncClock(full, late, at(321)).energy).toBe(10 - 4);
                  for (const part of ['morning', 'day', 'evening', 'night']) expect(content.cards.some((c) => c.id.startsWith('K13-') && c.kind === 'story' && c.when!.parts!.includes(part as 'day')), part).toBe(true);
                });
                it('a fully skipped Day 13: the control visit put off, stayed home, mum called, smoked, no answer to her, and affinity 0', () => {
                  for (const [p, titles] of [
                    [{ on: { d3_course: true, d12_strips: 'none' } }, ['Ящик в ванной', 'Последний тюбик', 'Контроль', 'Витин день рождения', 'Мама звонит', 'Витя пишет', 'Балкон']],
                    [{ on: { d12_helped_music: true, d4_went: true, d4_feast: true } }, ['Витин день рождения', 'Мама звонит', 'Алина пишет', 'Балкон']],
                  ] as [Patch, string[]][]) {
                    const s0 = morning13(p);
                    const s = syncClock(full13, s0, at(321));
                    expect([s.demoOver, s.day]).toEqual([true, 13]);
                    expect([!!s.flags.d13_smoked, s.flags.d13_bday.value, s.flags.d13_course_done, his13(s)]).toEqual([true, 'home', undefined, []]);
                    expect([s.affinity - s0.affinity, s.coins - s0.coins]).toEqual([0, 0]);
                    expect(s.summaries[12]).toMatchObject({ day: 13, played: false, coins: 0 });
                    expect(s.missed!.at(-1)!.items.map((i) => i.title)).toEqual(titles);
                  }
                });
                it('every flag set on Day 13 is read on Day 13 or has a planned payoff, and every Day 12 flag left for Day 13 is checked', () => {
                  const mine = content.cards.filter((c) => /^[KA]13-/.test(c.id));
                  const json = JSON.stringify(mine.map((c) => [c.when?.requires, c.choices.map((ch) => [ch.requires, ch.outcomes.map((o) => o.if)])]));
                  const read = (f: string) => json.includes(`{"flag":"${f}"`) || json.includes(`{"flagAge":"${f}"`);
                  const set = new Set(mine.flatMap((c) => c.choices.flatMap((ch) => ch.outcomes.flatMap((o) => (o.effects ?? []).flatMap((e) => ('flag' in e ? [e.flag] : []))))));
                  // Day 14 reads d13_late, d13_zerno_reply and d13_zerno_tip; d13_course_done also pays off on days 15+
                  expect([...set].filter((f) => !read(f)).sort()).toEqual(['d13_late', 'd13_zerno_tip']);
                  for (const f of ['d12_late', 'd12_smoked', 'd12_no_smoke', 'd12_quarter', 'd12_strips', 'd12_helped_music', 'd9_pass', 'd9_burner', 'd3_course', 'd4_meat_held', 'd4_feast', 'd1_joked', 'd2_zerno_known', 'd1_half']) expect(read(f), f).toBe(true);
                  for (const x of ['{"item":"gum"}', '{"modifier":"gym"}', '"counter":"smoke_free"']) expect(json).toContain(x);
                });
                describe('день 14', () => {
                  /** Day 14 is past the demo too: the clock may cross Day 13 only with the cut-off lifted to 14 */
                  const full14: Content = { ...content, balance: { ...content.balance, demoDays: 14 } };
                  /** quiet choices of Day 14: up, not today, keep the stubble, the mirror, stay home, a cigarette, the short answers, put the phone away */
                  const Q14: Record<string, string> = {
                    'K14-late': 'up', 'K14-run': 'skip', 'K14-01a': 'keep', 'K14-01b': 'keep', 'K14-02': 'look',
                    'K14-03p': 'home', 'K14-03t': 'home', 'K14-03e': 'home', 'K14-04a': 'smoke', 'K14-04q': 'smoke', 'K14-04b': 'smoke',
                    'K14-05p': 'sit', 'K14-05c': 'sit', 'K14-05f': 'hello', 'K14-05v4': 'ok', 'K14-05v2': 'ok', 'K14-05v0': 'ok', 'K14-05s': 'look',
                    'K14-05pq': 'short', 'K14-05cq': 'see', 'K14-05fq': 'short', 'K14-06a': 'ok', 'K14-06b': 'ok', 'K14-06c': 'ok',
                    'K14-07w': 'ok', 'K14-07d': 'ok', 'K14-07e': 'ok', 'K14-07h': 'ok', 'K14-08a': 'smoke', 'K14-08q': 'smoke', 'K14-08b': 'smoke',
                  };
                  /** earlier flags Day 14 reads are switched per test; the base: no visible change, no runs, no music, no tip, nothing from Day 13 but a cigarette */
                  const EARLY14 = ['d9_pass', 'd9_burner', 'shaved', 'd8_red', 'd6_beard_hint', 'd11_cut', 'bought_haircut', 'd10_photo', 'd12_helped_music', 'd12_cleaned',
                    'd13_zerno_reply', 'd13_zerno_tip', 'd13_bday', 'd7_msg', 'd7_line', 'bought_shirt', 'bought_frame', 'd5_cleaned', 'd3_course'];
                  const PLANNED: Patch = { on: { d12_helped_music: true, d13_zerno_reply: 'yes', d7_msg: 'warm' } };
                  const DRY14: Patch = { on: { d7_msg: 'dry', d13_zerno_tip: true } };
                  /** the quiet Friday (stayed home, a cigarette on the balcony), then sleep or stay up */
                  let n13: GameState | undefined;
                  const night13 = () => (n13 ??= play13(morning13()));
                  const morning14 = (p: Patch = {}, sleep13 = 'sleep') =>
                    patch(syncClock(full14, pick(night13(), 'K13-sleep', sleep13), at(321)), { coins: 300, ...p, off: [...EARLY14, ...(p.off ?? [])] });
                  const play14 = (s: GameState, p: Record<string, string> = {}, hours = [325, 331, 335.5]) =>
                    hours.reduce((x, h) => story(syncClock(full14, x, at(h)), { ...Q14, ...p }), story(s, { ...Q14, ...p }));
                  const d14 = (s: GameState) => Object.keys(s.seen).filter((id) => id.startsWith('K14-'));
                  const day14 = (p: Patch = {}, q: Record<string, string> = {}) => syncClock(full14, story(morning14(p), { ...Q14, ...q }), at(325));
                  /** went to «Зерно» and held at the door: the table opens next */
                  const inside = (p: Patch = {}) => { const s = day14(p); const go = pick(s, next(s)!, 'go'); return pick(go, next(go)!, 'hold'); };
                  const her14 = (s: GameState) => s.chat.filter((m) => m.day === 14 && m.from === 'crush' && !m.status).map((m) => m.text);
                  const his14 = (s: GameState) => s.chat.filter((m) => m.day === 14 && m.from === 'hero').map((m) => m.text);
                  const choicesOf = (id: string) => card(id).choices.map((c) => [c.id, !!c.neutral]);

                  it('Saturday morning: overslept after a late Friday, Vitya\'s last run, the stubble back for the shaved, the half-time mirror by the haircut', () => {
                    const s = morning14();
                    expect([s.day, s.part, s.energy]).toEqual([14, 'morning', 10]);
                    expect(next(s)).toBe('K14-02');
                    const late = morning14({}, 'late');
                    expect([next(late), late.energy]).toEqual(['K14-late', 10 - 4]);
                    expect(choose(content, late, 'K14-late', 'up').outcome.text).toContain('торопиться некуда');
                    expect(choose(content, patch(late, PLANNED), 'K14-late', 'up').outcome.text).toContain('До одиннадцати');
                    const runner = morning14({ on: { d9_pass: 'vitya' } });
                    expect(next(runner)).toBe('K14-run');
                    const ran = choose(content, runner, 'K14-run', 'run');
                    expect([runner.energy - ran.state.energy, ran.state.problems.weight - runner.problems.weight]).toEqual([4, -2]);
                    expect(choose(content, morning14({ on: { d9_pass: 'vitya', d9_burner: true } }), 'K14-run', 'run').outcome.text).toContain('капсулы');
                    // the stubble: as K8-01, only for those still shaved since Sunday
                    expect(next(morning14({ on: { shaved: true, d8_red: true } }))).toBe('K14-01a');
                    const shaved = morning14({ on: { shaved: true } });
                    expect(next(shaved)).toBe('K14-01b');
                    expect(card('K14-01a').text).toContain('краснота сошла');
                    for (const id of ['K14-01a', 'K14-01b']) expect(choicesOf(id), id).toEqual([['cream', false], ['bare', false], ['keep', true]]);
                    const kept = pick(shaved, 'K14-01b', 'keep');
                    expect([kept.flags.shaved, kept.lookPatch.facial]).toEqual([undefined, 'stubble']);
                    expect(choose(content, patch(shaved, { on: { d6_beard_hint: true } }), 'K14-01b', 'keep').outcome.text).toContain('Борода вообще не моё');
                    const cream = pick(patch(shaved, { items: { cream_zina: 1 } }), 'K14-01b', 'cream');
                    expect([!!cream.flags.shaved, cream.flags.d14_red, cream.lookPatch.razorBurn]).toEqual([true, undefined, false]);
                    const bare = pick(shaved, 'K14-01b', 'bare');
                    expect([!!bare.flags.d14_red, bare.problems.conf - shaved.problems.conf, bare.lookPatch.razorBurn]).toEqual([true, 2, true]);
                    // the mirror: one button, the line by the haircut; the salon is read here, not counted as a visible change
                    expect(choicesOf('K14-02')).toEqual([['look', true]]);
                    expect(card('K14-02').text).toContain('во вкладке «Зеркало»');
                    const mirror = (p: Patch) => choose(content, morning14(p), 'K14-02', 'look').outcome.text;
                    expect(mirror({ on: { d11_cut: 'barber', bought_haircut: true } })).toContain('от Гоши');
                    expect(mirror({ on: { d11_cut: 'salon' } })).toContain('«Люкса»');
                    expect(mirror({ on: { bought_haircut: true } })).toContain('Стрижка ещё держит');
                    expect(mirror({})).toContain('отросли');
                    const all = morning14({ on: { d9_pass: 'vitya', shaved: true } }, 'late');
                    expect(d14(story(all, Q14))).toEqual(['K14-late', 'K14-run', 'K14-01b', 'K14-02']);
                  });
                  it('the day: go to «Зерно» or stay home; the planned coffee for the one who helped with the music, Vitya\'s tip for the rest; the craving at the door by yesterday', () => {
                    expect(next(day14())).toBe('K14-03e');
                    expect(next(day14({ on: { d13_zerno_tip: true } }))).toBe('K14-03t');
                    expect(next(day14(PLANNED))).toBe('K14-03p');
                    expect(card('K14-03t').text).toContain('Витя вчера сказал');
                    for (const id of ['K14-03p', 'K14-03t', 'K14-03e']) expect(choicesOf(id), id).toEqual([['go', false], ['home', true]]);
                    const s = day14();
                    const went = pick(s, 'K14-03e', 'go');
                    expect([went.flags.d14_met.value, went.problems.conf - s.problems.conf, next(went)]).toEqual(['came', -1, 'K14-04a']);
                    expect(pick(day14(PLANNED), 'K14-03p', 'go').flags.d14_met.value).toBe('planned');
                    const home = pick(s, 'K14-03e', 'home');
                    expect([home.flags.d14_met.value, next(home)]).toEqual(['home', undefined]);
                    // the door: no coins anywhere on Day 14, each pays for his own coffee
                    const door = (p: Patch) => next(pick(day14(p), 'K14-03e', 'go'));
                    expect(door({ on: { d13_quarter: true }, off: ['d13_smoked'] })).toBe('K14-04q');
                    expect(door({ on: { d13_no_smoke: true }, off: ['d13_smoked'], counters: { smoke_free: 4 } })).toBe('K14-04b');
                    const cost = (id: string) => card(id).choices.map((c) => [c.id, c.cost?.energy ?? 0]);
                    for (const id of ['K14-04a', 'K14-04q', 'K14-08a', 'K14-08q']) expect(cost(id), id).toEqual([['hold', 2], ['quarter', 1], ['gum', 0], ['smoke', 0]]);
                    for (const id of ['K14-04b', 'K14-08b']) expect(cost(id), id).toEqual([['hold', 3], ['quarter', 1], ['gum', 0], ['smoke', 0]]);
                    const heldS = pick(day14({ on: { d13_no_smoke: true }, off: ['d13_smoked'], counters: { smoke_free: 4 } }), 'K14-03e', 'go');
                    const held = choose(content, heldS, 'K14-04b', 'hold');
                    expect([held.outcome.text.includes('Пятый день без табака'), held.state.counters.smoke_free]).toEqual([true, 5]);
                    const smoked = pick(went, 'K14-04a', 'smoke');
                    expect([!!smoked.flags.d14_smoked, smoked.counters.smoke_free ?? 0]).toEqual([true, 0]);
                    expect(JSON.stringify(content.cards.filter((c) => /^K14-/.test(c.id)))).not.toMatch(/"coins"/);
                  });
                  it('the table: her first line by the Friday reply, her line by the visible changes (Day 7 thresholds), the slideshow by the Day 10 photo, one question by how he came', () => {
                    const p = inside(PLANNED);
                    expect(next(p)).toBe('K14-05p');
                    expect(choose(content, p, 'K14-05p', 'sit').outcome.text).toContain('со списком');
                    expect(choose(content, patch(p, { on: { d13_zerno_reply: 'later' } }), 'K14-05p', 'sit').outcome.text).toContain('не ответил');
                    // the visible changes: a clean shave today, a shirt or frame, teeth (Day 5 or Day 12), the course, no cigarette today, the haircut
                    const line = (on: Record<string, string | boolean>, door = 'hold', q: Record<string, string> = {}) => {
                      const s = day14({ on: { ...PLANNED.on, ...on }, items: { cream_zina: 1 } }, q);
                      const x = pick(pick(pick(s, 'K14-03p', 'go'), 'K14-04a', door), 'K14-05p', 'sit');
                      return next(x);
                    };
                    expect(line({})).toBe('K14-05v0');
                    expect(line({ bought_shirt: true })).toBe('K14-05v2');
                    expect(line({ bought_shirt: true, d12_cleaned: 'full', d3_course: true })).toBe('K14-05v4');
                    expect(line({ bought_shirt: true, d12_cleaned: 'full', d3_course: true }, 'smoke')).toBe('K14-05v2');
                    expect(line({ bought_shirt: true, d12_cleaned: 'full', shaved: true })).toBe('K14-05v2');                       // kept the stubble this morning
                    expect(line({ bought_shirt: true, d12_cleaned: 'full', shaved: true }, 'hold', { 'K14-01b': 'cream' })).toBe('K14-05v4');
                    expect(line({ bought_shirt: true, d5_cleaned: true, bought_haircut: true })).toBe('K14-05v4');
                    expect(line({ bought_shirt: true, d11_cut: 'salon' })).toBe('K14-05v2');           // the salon cut is not counted
                    expect(card('K14-05v4').text).toContain('Ты какой-то другой');
                    for (const id of ['K14-05p', 'K14-05c', 'K14-05f', 'K14-05v4', 'K14-05v2', 'K14-05v0', 'K14-05s']) expect(card(id).choices.map((c) => !!c.neutral), id).toEqual([true]);
                    const seated = pick(p, 'K14-05p', 'sit');
                    const v0 = choose(content, patch(seated, { on: { d7_line: 'nice' } }), 'K14-05v0', 'ok');
                    expect([v0.outcome.text.includes('В прошлую субботу'), v0.state.flags.d14_line.value]).toEqual([true, 'plain']);
                    const lined = pick(seated, 'K14-05v0', 'ok');
                    expect(next(lined)).toBe('K14-05s');
                    const slide = (photo?: string) => choose(content, photo ? patch(lined, { on: { d10_photo: photo } }) : lined, 'K14-05s', 'look').outcome.text;
                    expect(slide('both')).toContain('задержалась');
                    expect(slide('old')).toContain('только «тогда»');
                    expect(slide()).toContain('слайда нет');
                    const asked = pick(lined, 'K14-05s', 'look');
                    expect(next(asked)).toBe('K14-05pq');
                    expect(choicesOf('K14-05pq')).toEqual([['good', false], ['short', true], ['long', false]]);
                    const delta = (s: GameState, id: string, c: string) => { const x = pick(s, id, c); return [x.affinity - s.affinity, x.counters.d14_scene ?? 0]; };
                    expect([delta(asked, 'K14-05pq', 'good'), delta(asked, 'K14-05pq', 'short'), delta(asked, 'K14-05pq', 'long')]).toEqual([[3, 1], [0, 0], [-2, -1]]);
                    // came on his own (even, or warm without the list): her laptop, a short talk
                    const c = inside({ on: { d7_msg: 'even', d13_zerno_tip: true } });
                    expect(next(c)).toBe('K14-05c');
                    const c2 = pick(pick(pick(c, 'K14-05c', 'sit'), 'K14-05v0', 'ok'), 'K14-05s', 'look');
                    expect(next(c2)).toBe('K14-05cq');
                    expect([delta(c2, 'K14-05cq', 'help'), delta(c2, 'K14-05cq', 'see'), delta(c2, 'K14-05cq', 'food')]).toEqual([[2, 1], [0, 0], [-2, -1]]);
                    expect(next(inside({ on: { d7_msg: 'warm', d13_zerno_tip: true } }))).toBe('K14-05c');
                    // dry: she is with a friend, a hello, no slideshow
                    const f = inside(DRY14);
                    expect(next(f)).toBe('K14-05f');
                    const f2 = pick(pick(f, 'K14-05f', 'hello'), 'K14-05v0', 'ok');
                    expect(next(f2)).toBe('K14-05fq');
                    expect(choicesOf('K14-05fq')).toEqual([['hello', false], ['short', true], ['sit', false]]);
                    expect([delta(f2, 'K14-05fq', 'hello'), delta(f2, 'K14-05fq', 'short'), delta(f2, 'K14-05fq', 'sit')]).toEqual([[1, 1], [0, 0], [-2, -1]]);
                    expect(d14(play14(morning14(DRY14), { 'K14-03t': 'go' }))).not.toContain('K14-05s');
                  });
                  it('the evening: Vitya about yesterday\'s birthday, then her message by how the table went; at home, her photo from «Зерно» in the feed', () => {
                    const evening = (p: Patch, q: Record<string, string>) => play14(morning14(p), q, [325, 331]);
                    const warm = evening(PLANNED, { 'K14-03p': 'go', 'K14-05pq': 'good' });
                    expect(d14(warm).slice(-2)).toEqual(['K14-06c', 'K14-07w']);
                    expect(content.chat.alina_d14_warm).toContain(her14(warm).at(-1));
                    expect([warm.flags.d14_msg.value, his14(warm)]).toEqual(['warm', []]);
                    const even = evening(PLANNED, { 'K14-03p': 'go' });
                    expect([d14(even).at(-1), even.flags.d14_msg.value]).toEqual(['K14-07e', 'even']);
                    expect(content.chat.alina_d14_even).toContain(her14(even).at(-1));
                    const dry = evening(DRY14, { 'K14-03t': 'go', 'K14-05fq': 'sit' });
                    expect([d14(dry).at(-1), dry.flags.d14_msg.value]).toEqual(['K14-07d', 'dry']);
                    expect(content.chat.alina_d14_dry).toContain(her14(dry).at(-1));
                    for (const k of ['alina_d14_warm', 'alina_d14_even', 'alina_d14_dry']) expect(content.chat[k].length, k).toBe(10);
                    // Vitya's line by d13_bday
                    expect(d14(evening({ on: { d13_bday: 'held' } }, {}))).toContain('K14-06a');
                    expect(d14(evening({ on: { d13_bday: 'cake' } }, {}))).toContain('K14-06b');
                    expect(d14(evening({ on: { d13_bday: 'home' } }, {}))).toContain('K14-06c');
                    expect(card('K14-06a').text).toContain('один кусок торта');
                    for (const id of ['K14-06a', 'K14-06b', 'K14-06c', 'K14-07w', 'K14-07e', 'K14-07d', 'K14-07h']) expect(card(id).choices.map((c) => !!c.neutral), id).toEqual([true]);
                    const home = evening({}, {});
                    expect([d14(home).at(-1), home.flags.d14_msg, her14(home)]).toEqual(['K14-07h', undefined, []]);
                    expect(home.rumors.map((r) => r.id)).toContain('zerno_d14');
                  });
                  it('the night: the balcony only for those who stayed home, the gym only while a pass runs; Day 14 ends the lifted demo on «шестнадцать дней»', () => {
                    const s = play14(morning14({ on: { d13_zerno_tip: true } }));
                    expect(d14(s)).toEqual(['K14-02', 'K14-03t', 'K14-06c', 'K14-07h', 'K14-08a']);
                    const went = play14(morning14(PLANNED), { 'K14-03p': 'go' });
                    expect(d14(went).some((id) => id.startsWith('K14-08'))).toBe(false);
                    expect(!!went.flags.d14_smoked).toBe(true);
                    const before = (p: Patch) => { const x = patch(s, p); const flags = { ...x.flags }; for (const f of ['d14_smoked', 'd14_no_smoke', 'd14_quarter']) delete flags[f]; const seen = { ...x.seen }; delete seen['K14-08a']; return { ...x, flags, seen }; };
                    const QUARTER = { on: { d13_quarter: true }, off: ['d13_smoked'], counters: { smoke_free: 0 } };
                    const HELD = { on: { d13_no_smoke: true }, off: ['d13_smoked'], counters: { smoke_free: 12 } };
                    expect([next(before({})), next(before(QUARTER)), next(before(HELD))]).toEqual(['K14-08a', 'K14-08q', 'K14-08b']);
                    const held = choose(content, before(HELD), 'K14-08b', 'hold');
                    expect([held.outcome.text.includes('Тринадцатый день без табака'), held.state.counters.smoke_free]).toEqual([true, 13]);
                    for (const id of ['K14-04a', 'K14-04q', 'K14-04b', 'K14-08a', 'K14-08q', 'K14-08b']) expect(card(id).choices.find((c) => c.neutral)!.id, id).toBe('smoke');
                    expect(actionsFor(content, s).map((c) => c.id)).toEqual(['A14-run', 'A14-clean', 'A14-teeth', 'A14-couch', 'K14-sleep']);
                    expect(actionsFor(content, day14()).map((c) => c.id)).toContain('A-job');
                    const gym = (x: GameState) => actionsFor(content, x).map((c) => c.id).includes('A14-gym');
                    expect(gym(passFrom(patch(s, { on: { d9_pass: 'renewed' } }), 9))).toBe(true);
                    expect(gym(passFrom(s, 7))).toBe(true);                       // a shop pass used from Day 7 runs to Day 14
                    expect(gym(passFrom(s, 6))).toBe(false);
                    expect(gym(passFrom(s, 14))).toBe(false);
                    expect(card('K14-sleep').choices.map((c) => c.id)).toEqual(['sleep', 'late']);
                    const slept = choose(content, s, 'K14-sleep', 'sleep');
                    expect(slept.outcome.text).toContain('шестнадцать дней');
                    const end = syncClock(full14, slept.state, at(345));
                    expect([end.demoOver, end.day]).toEqual([true, 14]);
                    expect(end.summaries[13]).toMatchObject({ day: 14, played: true, gift: 'floss' });
                    expect(content.days.find((d) => d.day === 14)).toMatchObject({ title: 'Половина пути', gift: 'floss', teaser: 'Завтра воскресенье. До встречи выпускников 16 дней' });
                    const late = pick(s, 'K14-sleep', 'late');
                    expect(late.flags.d14_late).toBeDefined();
                    expect(syncClock(full, late, at(345)).energy).toBe(10 - 4);
                    for (const part of ['morning', 'day', 'evening', 'night']) expect(content.cards.some((c) => c.id.startsWith('K14-') && c.kind === 'story' && c.when!.parts!.includes(part as 'day')), part).toBe(true);
                  });
                  it('a fully skipped Day 14: stayed home, smoked, no message from her, and affinity 0', () => {
                    for (const [p, titles] of [
                      [{ on: { d13_zerno_tip: true, shaved: true } }, ['Щетина', 'Половина пути', 'Суббота', 'Витя пишет', 'Лента', 'Балкон']],
                      [PLANNED, ['Половина пути', 'Суббота, одиннадцать', 'Витя пишет', 'Лента', 'Балкон']],
                    ] as [Patch, string[]][]) {
                      const s0 = morning14(p);
                      const s = syncClock(full14, s0, at(345));
                      expect([s.demoOver, s.day]).toEqual([true, 14]);
                      expect([!!s.flags.d14_smoked, s.flags.d14_met.value, s.flags.d14_msg, his14(s), her14(s)]).toEqual([true, 'home', undefined, [], []]);
                      expect([s.affinity - s0.affinity, s.coins - s0.coins]).toEqual([0, 0]);
                      expect(s.summaries[13]).toMatchObject({ day: 14, played: false, coins: 0 });
                      expect(s.missed!.at(-1)!.items.map((i) => i.title)).toEqual(titles);
                    }
                  });
                  it('every flag set on Day 14 is read on Day 14 or has a planned payoff, and the Day 13 flags left for Day 14 are checked', () => {
                    const mine = content.cards.filter((c) => /^[KA]14-/.test(c.id));
                    const json = JSON.stringify(mine.map((c) => [c.when?.requires, c.choices.map((ch) => [ch.requires, ch.outcomes.map((o) => o.if)])]));
                    const read = (f: string) => json.includes(`{"flag":"${f}"`) || json.includes(`{"flagAge":"${f}"`);
                    const set = new Set(mine.flatMap((c) => c.choices.flatMap((ch) => ch.outcomes.flatMap((o) => (o.effects ?? []).flatMap((e) => ('flag' in e ? [e.flag] : []))))));
                    // d14_late: the Day 15 morning; d14_met, d14_line, d14_msg also pay off on days 15+
                    expect([...set].filter((f) => !read(f)).sort()).toEqual(['d14_late']);
                    for (const f of ['d13_late', 'd13_smoked', 'd13_no_smoke', 'd13_quarter', 'd13_bday', 'd13_zerno_reply', 'd13_zerno_tip', 'd12_helped_music', 'd12_cleaned', 'd11_cut',
                      'd10_photo', 'd9_pass', 'd9_burner', 'shaved', 'd8_red', 'd6_beard_hint', 'd7_msg', 'd7_line', 'bought_haircut', 'bought_shirt', 'bought_frame', 'd5_cleaned', 'd3_course', 'd1_half']) expect(read(f), f).toBe(true);
                    // left open on purpose: d13_course_done is for days 15+, d8_replied waits for the authors
                    for (const f of ['d13_course_done', 'd8_replied']) expect(read(f), f).toBe(false);
                    for (const x of ['{"item":"gum"}', '{"modifier":"gym"}', '{"item":"cream_zina"}', '"counter":"smoke_free"', '"counter":"d14_scene"']) expect(json).toContain(x);
                  });
                  describe('день 15', () => {
                    /** Day 15 is past the demo too: the clock may cross Day 14 only with the cut-off lifted to 15 */
                    const full15: Content = { ...content, balance: { ...content.balance, demoDays: 15 } };
                    /** quiet choices of Day 15: up, not today, squeeze, eat, open the chat, scroll, later, a cigarette, put the phone away */
                    const Q15: Record<string, string> = {
                      'K15-late': 'up', 'K15-run': 'skip', 'K15-01a': 'squeeze', 'K15-01b': 'squeeze', 'K15-01c': 'squeeze', 'K15-02a': 'ate', 'K15-02b': 'ate',
                      'K15-03m': 'ok', 'K15-03c': 'ok', 'K15-04a': 'scroll', 'K15-04b': 'scroll', 'K15-05a': 'later', 'K15-05b': 'later',
                      'K15-06wm': 'later', 'K15-06ws': 'later', 'K15-06m': 'later', 'K15-06et': 'ok', 'K15-06ec': 'ok', 'K15-06d': 'ok',
                      'K15-07wm': 'ok', 'K15-07ws': 'ok', 'K15-07m': 'ok', 'K15-08a': 'smoke', 'K15-08q': 'smoke', 'K15-08b': 'smoke', 'K15-09': 'ok',
                    };
                    /** Day 14 flags Day 15 reads are switched per test; the base: stayed home on Saturday, smoked, ate at mum's on Day 8, both photos sent on Day 10 */
                    const EARLY15 = ['d14_met', 'd14_msg', 'd14_late', 'd14_smoked', 'd14_no_smoke', 'd14_quarter', 'd13_course_done', 'd10_photo', 'd3_posted', 'd9_oksana', 'd8_lunch', 'bought_haircut'];
                    let n14: GameState | undefined;
                    const night14 = () => (n14 ??= play14(morning14()));
                    const morning15 = (p: Patch = {}, sleep14 = 'sleep') =>
                      patch(syncClock(full15, pick(night14(), 'K14-sleep', sleep14), at(345)), { ...p, on: { d14_met: 'home', d14_smoked: true, d8_lunch: 'ate', d10_photo: 'both', ...p.on }, off: [...EARLY15, ...(p.off ?? [])] });
                    const seenAlso = (s: GameState, ...ids: string[]): GameState => ({ ...s, seen: { ...s.seen, ...Object.fromEntries(ids.map((id) => [id, 14])) } });
                    const play15 = (s: GameState, p: Record<string, string> = {}, hours = [349, 355, 359.5]) =>
                      hours.reduce((x, h) => story(syncClock(full15, x, at(h)), { ...Q15, ...p }), story(s, { ...Q15, ...p }));
                    const d15 = (s: GameState) => Object.keys(s.seen).filter((id) => id.startsWith('K15-'));
                    const day15 = (p: Patch = {}, q: Record<string, string> = {}, s0?: GameState) => syncClock(full15, story(s0 ?? morning15(p), { ...Q15, ...q }), at(349));
                    const evening15 = (p: Patch = {}, q: Record<string, string> = {}) => play15(morning15(p), q, [349, 355]);
                    const her15 = (s: GameState) => s.chat.filter((m) => m.day === 15 && m.from === 'crush' && !m.status).map((m) => m.text);
                    const his15 = (s: GameState) => s.chat.filter((m) => m.day === 15 && m.from === 'hero').map((m) => m.text);
                    const choicesOf = (id: string) => card(id).choices.map((c) => [c.id, !!c.neutral]);
                    const TONE = ['K15-06wm', 'K15-06ws', 'K15-06m', 'K15-06et', 'K15-06ec', 'K15-06d'];

                    it('Sunday morning: overslept after a late Saturday, Vitya\'s long circle, one pimple by how the course ended', () => {
                      const s = morning15();
                      expect([s.day, s.part, s.energy]).toEqual([15, 'morning', 10]);
                      expect(next(s)).toBe('K15-01c');
                      const late = morning15({ on: { d14_late: true } }, 'late');
                      expect([next(late), late.energy]).toEqual(['K15-late', 10 - 4]);
                      const runner = morning15({ on: { d9_pass: 'vitya' } });
                      expect(next(runner)).toBe('K15-run');
                      const ran = choose(content, runner, 'K15-run', 'run');
                      expect([runner.energy - ran.state.energy, ran.state.problems.weight - runner.problems.weight, ran.outcome.text.includes('длинный') || ran.outcome.text.includes('Длинный')]).toEqual([4, -2, true]);
                      expect(card('K15-run').text).toContain('В воскресенье бежим длинный круг');
                      // the pimple: Galina Petrovna for the course done, «Позвоню потом» for the one who put the control off, a plain line for the rest
                      expect(next(morning15({ on: { d13_course_done: true } }))).toBe('K15-01a');
                      expect(next(seenAlso(morning15(), 'K13-02'))).toBe('K15-01b');
                      expect(card('K15-01a').text).toContain('руками не трогать');
                      expect(card('K15-01b').text).toContain('Позвоню потом');
                      for (const id of ['K15-01a', 'K15-01b', 'K15-01c']) expect(choicesOf(id), id).toEqual([['wash', false], ['patch', false], ['squeeze', true]]);
                      const washed = pick(s, 'K15-01c', 'wash');
                      expect([s.energy - washed.energy, washed.problems.skin - s.problems.skin, washed.flags.d15_pimple.value]).toEqual([1, -1, 'washed']);
                      expect(choicesFor(content, patch(s, { items: { acne_patch: 0 } }), card('K15-01c')).map((x) => x.choice.id)).toEqual(['wash', 'squeeze']);   // no patch in the bag
                      const withPatch = patch(s, { items: { acne_patch: 1 } });
                      const patched = pick(withPatch, 'K15-01c', 'patch');
                      expect([patched.problems.skin - s.problems.skin, patched.items.acne_patch ?? 0, patched.flags.d15_pimple.value]).toEqual([-3, 0, 'patch']);
                      const squeezed = pick(s, 'K15-01c', 'squeeze');
                      expect([[1, 3].includes(squeezed.problems.skin - s.problems.skin), squeezed.flags.d15_pimple.value]).toEqual([true, 'squeezed']);
                      expect(oddsFor(content, s, card('K15-01c').choices[2])).toEqual([{ word: 'часто', hint: 'краснеет' }, { word: 'иногда', hint: 'обошлось' }]);
                      // no purchase on the failure moment
                      expect(JSON.stringify(['K15-01a', 'K15-01b', 'K15-01c'].map(card))).not.toMatch(/"coins"/);
                      const all = seenAlso(morning15({ on: { d9_pass: 'vitya', d14_late: true } }, 'late'), 'K13-02');
                      expect(d15(story(all, Q15))).toEqual(['K15-late', 'K15-run', 'K15-01b']);
                    });

                    it('the day: lunch at mum\'s with her line, the organisers\' chat by Day 14, the class chat for the rest, the "now" photo for those without one', () => {
                      expect(next(day15())).toBe('K15-02b');
                      expect(next(day15({ on: { d8_lunch: 'held' } }))).toBe('K15-02a');
                      for (const id of ['K15-02a', 'K15-02b']) expect(choicesOf(id), id).toEqual([['held', false], ['ate', true]]);
                      const s = day15();
                      const mum = (p: Patch, c = 'ate') => choose(content, patch(s, p), 'K15-02b', c).outcome.text;
                      expect(mum({ on: { bought_haircut: true }, counters: { smoke_free: 9 } })).toContain('Подстригся! Совсем другое дело');
                      expect(mum({ counters: { smoke_free: 7 } })).toContain('И куревом не пахнет');
                      expect(mum({ counters: { smoke_free: 6 } })).toContain('На неделю');
                      const held = pick(s, 'K15-02b', 'held');
                      expect([s.energy - held.energy, held.problems.conf - s.problems.conf, held.flags.d15_lunch.value]).toEqual([2, -1, 'held']);
                      const ate = pick(s, 'K15-02b', 'ate');
                      expect([ate.problems.weight - s.problems.weight, ate.flags.d15_lunch.value]).toEqual([2, 'ate']);
                      // the team: Alina adds the music table and the chairs promise; the class chat asks the rest
                      const after = (p: Patch) => pick(day15(p), next(day15(p))!, 'ate');
                      const music = after({ on: { d14_met: 'planned' } });
                      expect(next(music)).toBe('K15-03m');
                      expect(pick(music, 'K15-03m', 'ok').flags.d15_team.value).toBe('music');
                      expect(next(pick(music, 'K15-03m', 'ok'))).toBeUndefined();                      // no class chat for the team, the photo was sent on Day 10
                      const chairs = after({ on: { d14_met: 'came', d7_msg: 'even' }, counters: { d14_scene: 1 } });
                      expect(next(chairs)).toBe('K15-03c');
                      expect(pick(chairs, 'K15-03c', 'ok').flags.d15_team.value).toBe('chairs');
                      expect(card('K15-03c').text).toContain('Ты обещал стулья');
                      expect(next(after({ on: { d14_met: 'came', d7_msg: 'even' }, counters: { d14_scene: 0 } }))).toBe('K15-04b');
                      expect(next(after({ on: { d14_met: 'came', d7_msg: 'dry' }, counters: { d14_scene: 1 } }))).toBe('K15-04b');
                      for (const id of ['K15-03m', 'K15-03c']) expect(choicesOf(id), id).toEqual([['ok', true]]);
                      const cls = after({});
                      expect(next(cls)).toBe('K15-04b');
                      expect(next(after({ on: { d9_oksana: 'promised' } }))).toBe('K15-04a');
                      expect(card('K15-04a').text).toContain('ты фото обещал');
                      for (const id of ['K15-04a', 'K15-04b']) expect(choicesOf(id), id).toEqual([['volunteer', false], ['scroll', true]]);
                      const vol = pick(cls, 'K15-04b', 'volunteer');
                      expect([vol.flags.d15_team.value, vol.problems.conf - cls.problems.conf]).toEqual(['volunteer', -1]);
                      expect(pick(cls, 'K15-04b', 'scroll').flags.d15_team).toBeUndefined();
                      // the photo: a second chance for those with only the old one or none; her «Пришлёшь?» for those who saw the slideshow
                      const photo = (p: Patch, seen: string[] = []) => { const x = pick(pick(seenAlso(day15(p), ...seen), 'K15-02b', 'ate'), 'K15-04b', 'scroll'); return x; };
                      expect(next(photo({ on: { d10_photo: 'old' } }, ['K14-05s']))).toBe('K15-05a');
                      expect(next(photo({ on: { d10_photo: 'none' } }))).toBe('K15-05b');
                      expect(next(photo({}))).toBeUndefined();
                      const ph = photo({ on: { d10_photo: 'old' } });
                      expect(choicesFor(content, ph, card('K15-05b')).map((x) => [x.choice.id, x.choice.cost?.energy ?? 0])).toEqual([['selfie', 2], ['later', 0]]);
                      const posted = patch(ph, { on: { d3_posted: true } });
                      expect(choicesFor(content, posted, card('K15-05b')).map((x) => [x.choice.id, x.choice.cost?.energy ?? 0])).toEqual([['selfie_easy', 1], ['later', 0]]);
                      const sent = pick(ph, 'K15-05b', 'selfie');
                      expect([sent.flags.d15_photo.value, sent.problems.conf - ph.problems.conf]).toEqual(['fresh', -2]);
                      expect(pick(ph, 'K15-05b', 'later').flags.d15_photo).toBeUndefined();
                      expect(JSON.stringify(content.cards.filter((c) => /^K15-/.test(c.id)))).not.toMatch(/"coins"/);
                    });

                    it('the week tone: exactly one evening card for every Day 14 state, and it follows the A1 table', () => {
                      const evening = (on: Record<string, string | boolean>, counters: Record<string, number> = {}) => {
                        const flags: GameState['flags'] = {};
                        for (const [k, value] of Object.entries(on)) flags[k] = { value, day: 14 };
                        return { ...start(), day: 15, part: 'evening' as const, flags, counters };
                      };
                      const fits = (s: GameState) => TONE.filter((id) => (card(id).when!.requires ?? []).every((c) => check(content, s, c)));
                      let n = 0;
                      for (const met of ['planned', 'came', 'home', undefined]) for (const msg of ['warm', 'even', 'dry', undefined]) for (const d7 of ['warm', 'even', 'dry', undefined])
                        for (const helped of [true, false]) for (const team of ['music', 'chairs', 'volunteer', undefined]) {
                          const on: Record<string, string | boolean> = {};
                          if (met) on.d14_met = met;
                          if (msg) on.d14_msg = msg;
                          if (d7) on.d7_msg = d7;
                          if (helped) on.d12_helped_music = true;
                          if (team) on.d15_team = team;
                          expect(fits(evening(on)), JSON.stringify(on)).toHaveLength(1);
                          n++;
                        }
                      expect(n).toBe(512);
                      const tone = (on: Record<string, string | boolean>) => fits(evening(on))[0];
                      expect(tone({ d14_met: 'planned', d14_msg: 'warm', d12_helped_music: true })).toBe('K15-06wm');
                      expect(tone({ d14_met: 'came', d14_msg: 'warm' })).toBe('K15-06ws');
                      expect(tone({ d14_met: 'came', d14_msg: 'even', d7_msg: 'warm' })).toBe('K15-06ws');
                      expect(tone({ d14_met: 'came', d14_msg: 'even', d7_msg: 'even', d15_team: 'chairs' })).toBe('K15-06et');
                      expect(tone({ d14_met: 'came', d14_msg: 'even', d7_msg: 'even' })).toBe('K15-06ec');
                      expect(tone({ d14_met: 'came', d14_msg: 'dry', d7_msg: 'warm' })).toBe('K15-06d');
                      expect(tone({ d14_met: 'home', d12_helped_music: true, d7_msg: 'warm' })).toBe('K15-06m');
                      expect(tone({ d14_met: 'home', d7_msg: 'warm' })).toBe('K15-06ec');            // one step down from warm
                      expect(tone({ d14_met: 'home', d7_msg: 'even' })).toBe('K15-06ec');
                      expect(tone({ d14_met: 'home', d7_msg: 'dry' })).toBe('K15-06d');
                      // every choice of every tone card sets d15_tone, the neutral included
                      for (const id of TONE) for (const ch of card(id).choices) expect(ch.outcomes.every((o) => (o.effects ?? []).some((e) => 'flag' in e && e.flag === 'd15_tone')), `${id} ${ch.id}`).toBe(true);
                    });

                    it('the evening: his exact words to her, her answer to his question, the group thanks or a status line for the rest', () => {
                      const W = { on: { d14_met: 'planned', d14_msg: 'warm', d12_helped_music: true } };
                      expect(choicesOf('K15-06wm')).toEqual([['ask', false], ['short', false], ['long', false], ['later', true]]);
                      expect(choicesOf('K15-06m')).toEqual([['sorry', false], ['short', false], ['later', true]]);
                      const delta = (p: Patch, c: string, id: string) => { const s0 = morning15(p); const x = evening15(p, { [id]: c }); return [x.affinity - s0.affinity, x.flags.d15_tone.value, x.flags.d15_reply?.value]; };
                      expect(delta(W, 'ask', 'K15-06wm')).toEqual([3, 'warm', 'ask']);
                      expect(delta(W, 'short', 'K15-06wm')).toEqual([0, 'warm', 'short']);
                      expect(delta(W, 'long', 'K15-06wm')).toEqual([-2, 'warm', 'long']);
                      expect(delta(W, 'later', 'K15-06wm')).toEqual([0, 'warm', 'later']);
                      const asked = evening15(W, { 'K15-06wm': 'ask' });
                      expect(d15(asked).slice(-2)).toEqual(['K15-06wm', 'K15-07wm']);
                      expect(content.chat.alina_d15_music).toContain(her15(asked)[0]);
                      expect(content.chat.alina_d15_music_back).toContain(her15(asked).at(-1));
                      expect(his15(asked)).toEqual([card('K15-06wm').choices[0].label]);
                      const sunday = evening15({ on: { d14_met: 'came', d14_msg: 'warm' } }, { 'K15-06ws': 'ask' });
                      expect(d15(sunday).slice(-2)).toEqual(['K15-06ws', 'K15-07ws']);
                      expect(content.chat.alina_d15_sunday_back).toContain(her15(sunday).at(-1));
                      const short = evening15(W, { 'K15-06wm': 'short' });
                      expect([d15(short).at(-1), her15(short).length]).toEqual(['K15-06wm', 1]);
                      const M = { on: { d14_met: 'home', d12_helped_music: true } };
                      expect(delta(M, 'sorry', 'K15-06m')).toEqual([2, 'even', 'sorry']);
                      const sorry = evening15(M, { 'K15-06m': 'sorry' });
                      expect(d15(sorry).slice(-2)).toEqual(['K15-06m', 'K15-07m']);
                      expect(content.chat.alina_d15_missed_back).toContain(her15(sorry).at(-1));
                      // even: the group thanks in «Оргкомитет», or a like under Oksana's post; dry: «была в сети»
                      const team = evening15({ on: { d14_met: 'came', d14_msg: 'even', d7_msg: 'even' }, counters: { d14_scene: 1 } });
                      expect([d15(team).at(-1), team.flags.d15_team.value, team.flags.d15_tone.value, her15(team)]).toEqual(['K15-06et', 'chairs', 'even', []]);
                      expect(content.chat.status_d15_team).toContain(team.chat.at(-1)!.text);
                      const home = evening15({});
                      expect([d15(home).at(-1), home.flags.d15_tone.value, his15(home), her15(home)]).toEqual(['K15-06ec', 'even', [], []]);
                      const dry = evening15({ on: { d14_msg: 'dry', d14_met: 'came' } });
                      expect([d15(dry).at(-1), dry.flags.d15_tone.value, her15(dry)]).toEqual(['K15-06d', 'dry', []]);
                      for (const k of ['alina_d15_music', 'alina_d15_sunday', 'alina_d15_missed', 'alina_d15_music_back', 'alina_d15_sunday_back', 'alina_d15_missed_back', 'status_d15_team', 'status_d15_class']) expect(content.chat[k].length, k).toBe(10);
                      for (const id of ['K15-06et', 'K15-06ec', 'K15-06d', 'K15-07wm', 'K15-07ws', 'K15-07m']) expect(card(id).choices.map((c) => !!c.neutral), id).toEqual([true]);
                    });

                    it('the night: the balcony by Saturday, two weeks without cigarettes, the gym only while a pass runs; Day 15 ends the lifted demo on «пятнадцать дней»', () => {
                      const s = play15(morning15());
                      expect(d15(s)).toEqual(['K15-01c', 'K15-02b', 'K15-04b', 'K15-06ec', 'K15-08a']);
                      const before = (p: Patch) => { const x = patch(s, p); const flags = { ...x.flags }; for (const f of ['d15_smoked', 'd15_no_smoke', 'd15_quarter']) delete flags[f]; const seen = { ...x.seen }; delete seen['K15-08a']; return { ...x, flags, seen }; };
                      const QUARTER = { on: { d14_quarter: true }, off: ['d14_smoked'], counters: { smoke_free: 0 } };
                      const HELD = { on: { d14_no_smoke: true }, off: ['d14_smoked'], counters: { smoke_free: 13 } };
                      expect([next(before({})), next(before(QUARTER)), next(before(HELD))]).toEqual(['K15-08a', 'K15-08q', 'K15-08b']);
                      const cost = (id: string) => card(id).choices.map((c) => [c.id, c.cost?.energy ?? 0]);
                      for (const id of ['K15-08a', 'K15-08q']) expect(cost(id), id).toEqual([['hold', 2], ['quarter', 1], ['gum', 0], ['smoke', 0]]);
                      expect(cost('K15-08b')).toEqual([['hold', 3], ['quarter', 1], ['gum', 0], ['smoke', 0]]);
                      const held = choose(content, before(HELD), 'K15-08b', 'hold');
                      expect([held.outcome.text.includes('Четырнадцатый день без табака'), held.state.counters.smoke_free]).toEqual([true, 14]);
                      expect(next(held.state)).toBe('K15-09');
                      const two = choose(content, held.state, 'K15-09', 'ok');
                      expect([two.outcome.text.includes('Ровно две недели'), two.state.problems.care - held.state.problems.care]).toEqual([true, -3]);
                      expect(next(choose(content, before({ ...HELD, counters: { smoke_free: 12 } }), 'K15-08b', 'hold').state)).toBeUndefined();
                      for (const id of ['K15-08a', 'K15-08q', 'K15-08b']) expect(card(id).choices.find((c) => c.neutral)!.id, id).toBe('smoke');
                      expect(actionsFor(content, s).map((c) => c.id)).toEqual(['A15-run', 'A15-clean', 'A15-teeth', 'A15-couch', 'K15-sleep']);
                      expect(actionsFor(content, day15())).toEqual(expect.arrayContaining([expect.objectContaining({ id: 'A-job' })]));
                      const gym = (x: GameState) => actionsFor(content, x).map((c) => c.id).includes('A15-gym');
                      expect(card('A15-gym').when!.requires).toEqual([{ modifier: 'gym' }]);
                      expect(gym(passFrom(patch(s, { on: { d9_pass: 'renewed' } }), 9))).toBe(true);   // the renewed pass runs mornings 10–16
                      expect(gym(passFrom(s, 8))).toBe(true);                                          // a shop pass used on Day 8 runs to Day 15
                      expect(gym(passFrom(s, 7))).toBe(false);
                      expect(gym(passFrom(s, 15))).toBe(false);                                        // used today: from tomorrow
                      expect(gym(s)).toBe(false);
                      expect(card('K15-sleep').choices.map((c) => c.id)).toEqual(['sleep', 'late']);
                      const slept = choose(content, s, 'K15-sleep', 'sleep');
                      expect(slept.outcome.text).toContain('пятнадцать дней');
                      const end = syncClock(full15, slept.state, at(369));
                      expect([end.demoOver, end.day]).toEqual([true, 15]);
                      expect(end.summaries[14]).toMatchObject({ day: 15, played: true, gift: 'gum' });
                      expect(content.days.find((d) => d.day === 15)).toMatchObject({ title: 'Оргкомитет', gift: 'gum', teaser: 'Завтра понедельник. Оксана раздаёт задания' });
                      const late = pick(s, 'K15-sleep', 'late');
                      expect(late.flags.d15_late).toBeDefined();
                      expect(syncClock(full, late, at(369)).energy).toBe(10 - 4);
                      for (const part of ['morning', 'day', 'evening', 'night']) expect(content.cards.some((c) => c.id.startsWith('K15-') && c.kind === 'story' && c.when!.parts!.includes(part as 'day')), part).toBe(true);
                    });

                    it('a fully skipped Day 15: squeezed, ate, accepted the add, no volunteer, no photo, no message to her, smoked, affinity 0', () => {
                      for (const [p, titles, tone, team] of [
                        [{ on: { d10_photo: 'old' } }, ['Прыщ', 'Обед у мамы', 'Чат класса', 'Фото «сейчас»', 'Чат класса', 'Балкон'], 'even', undefined],
                        [{ on: { d14_met: 'planned', d14_msg: 'warm', d12_helped_music: true } }, ['Прыщ', 'Обед у мамы', 'Алина добавила тебя', 'Алина пишет', 'Балкон'], 'warm', 'music'],
                      ] as [Patch, string[], string, string | undefined][]) {
                        const s0 = morning15(p);
                        const s = syncClock(full15, s0, at(369));
                        expect([s.demoOver, s.day]).toEqual([true, 15]);
                        expect([!!s.flags.d15_smoked, s.flags.d15_pimple.value, s.flags.d15_lunch.value, s.flags.d15_tone.value, s.flags.d15_team?.value, s.flags.d15_photo, his15(s)]).toEqual([true, 'squeezed', 'ate', tone, team, undefined, []]);
                        expect([s.affinity - s0.affinity, s.coins - s0.coins]).toEqual([0, 0]);
                        expect(s.summaries[14]).toMatchObject({ day: 15, played: false, coins: 0 });
                        expect(s.missed!.at(-1)!.items.map((i) => i.title)).toEqual(titles);
                      }
                    });

                    it('every flag set on Day 15 is read on Day 15 or has a planned payoff, and the Day 14 flags left for Day 15 are checked', () => {
                      const mine = content.cards.filter((c) => /^[KA]15-/.test(c.id));
                      const json = JSON.stringify(mine.map((c) => [c.when?.requires, c.choices.map((ch) => [ch.requires, ch.outcomes.map((o) => o.if)])]));
                      const read = (f: string) => json.includes(`{"flag":"${f}"`) || json.includes(`{"flagAge":"${f}"`);
                      const set = new Set(mine.flatMap((c) => c.choices.flatMap((ch) => ch.outcomes.flatMap((o) => (o.effects ?? []).flatMap((e) => ('flag' in e ? [e.flag] : []))))));
                      // d15_late: the Day 16 morning; d15_pimple: Day 16; d15_photo: Day 20; d15_lunch: Sunday 22; d15_team and d15_tone are read all week
                      expect([...set].filter((f) => !read(f)).sort()).toEqual(['d15_late', 'd15_lunch', 'd15_photo', 'd15_pimple']);
                      for (const f of ['d14_late', 'd14_met', 'd14_msg', 'd14_smoked', 'd14_no_smoke', 'd14_quarter', 'd13_course_done', 'd12_helped_music', 'd10_photo', 'd9_pass', 'd9_oksana',
                        'd8_lunch', 'd7_msg', 'd3_posted', 'bought_haircut', 'd1_half']) expect(read(f), f).toBe(true);
                      expect(read('d8_replied')).toBe(false);                                         // never read again (week 3 answer 17)
                      for (const x of ['{"item":"gum"}', '{"item":"acne_patch"}', '{"modifier":"gym"}', '"counter":"smoke_free"', '"counter":"d14_scene"', '{"seen":"K14-05s"}', '{"seen":"K13-02"}']) expect(json).toContain(x);
                    });
                  });
                });
              });
            });
          });
        });
    });
      });
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
  it('a look effect can set razor burn, and only then the portrait changes', () => {
    const shaved: Content = {
      ...content,
      cards: content.cards.map((c) => (c.id === 'K1-01'
        ? { ...c, choices: c.choices.map((ch) => ({ ...ch, outcomes: [{ text: 'x', effects: [{ look: { facial: 'none' as const, razorBurn: true } }] }] })) }
        : c)),
    };
    const s0 = drawStory(shaved, start()).state;
    const card = shaved.cards.find((c) => c.id === 'K1-01')!;
    const s = pick(s0, 'K1-01', choicesFor(shaved, s0, card).find((x) => x.affordable)!.choice.id, shaved);
    expect(currentLook(shaved, s)).toMatchObject({ razorBurn: true, facial: 'none' });
    expect(startLook(shaved, s)).toMatchObject({ razorBurn: false, facial: 'patchy' });

    const { razorBurn: _, ...bare } = currentLook(content, start());
    expect(portraitSvg({ ...bare, razorBurn: false })).toBe(portraitSvg(bare as Look));
    expect(portraitSvg({ ...bare, razorBurn: true })).not.toBe(portraitSvg(bare as Look));
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
