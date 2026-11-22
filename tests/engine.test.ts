import { describe, expect, it } from 'vitest';
import { content } from '../src/content';
import { slotAt, msToNextPart } from '../src/engine/clock';
import {
  actionsFor, chance, choicesFor, choose, currentLook, dayEnergy, draw, drawStory,
  buy, courseActive, newGame, oddsFor, soldOut, startLook, syncClock, useItem,
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
    expect(s.log.at(-1)!.kind).toBe('miss');
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
    expect(viaCard.coins).toBe(s0.coins - 200);
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
