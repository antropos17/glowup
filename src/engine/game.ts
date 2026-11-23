/**
 * Ядро игры. Чистые функции: получают состояние, возвращают новое.
 * Здесь нет ни экрана, ни сети, ни часов устройства, поэтому тот же код
 * может работать на сервере для проверки прохождения.
 */
import { DEFAULT_LOOK, type Look } from '../art/avatar';
import { slotAt, slotIndex } from './clock';
import {
  DAY_PARTS, type Card, type Choice, type Cond, type Content, type DayPart,
  type DaySummary, type Effect, type GameState, type Item, type Outcome,
} from './types';

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const clone = <T>(v: T): T => structuredClone(v);

// ---------- случайность с зерном ----------

function mulberry(seed: number) {
  let t = (seed + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
/** следующее случайное число 0..1. Меняет счётчик в состоянии. */
function roll(s: GameState) {
  s.rolls += 1;
  return mulberry(s.seed + s.rolls * 0x9e3779b1);
}
function pickWeighted<T>(s: GameState, list: T[], weight: (x: T) => number): T {
  const total = list.reduce((a, x) => a + Math.max(0, weight(x)), 0);
  let r = roll(s) * total;
  for (const x of list) { r -= Math.max(0, weight(x)); if (r <= 0) return x; }
  return list[list.length - 1];
}

// ---------- чтение состояния ----------

export function dayEnergy(c: Content, s: GameState, day = s.day) {
  const boost = day <= c.balance.earlyBoost.days ? c.balance.earlyBoost.factor : 1;
  const mods = s.modifiers.reduce((a, m) => a + (m.energyPerDay ?? 0), 0);
  return Math.min(c.balance.energyCap, Math.round(c.balance.energyPerDay * boost) + mods);
}

function cmp(v: number | string | boolean | undefined, c: { eq?: unknown; gte?: number; lte?: number }) {
  if (c.eq !== undefined && v !== c.eq) return false;
  if (c.gte !== undefined && !(typeof v === 'number' && v >= c.gte)) return false;
  if (c.lte !== undefined && !(typeof v === 'number' && v <= c.lte)) return false;
  return true;
}

export function check(c: Content, s: GameState, cond: Cond): boolean {
  if ('any' in cond) return cond.any.some((x) => check(c, s, x));
  if ('not' in cond) return !check(c, s, cond.not);
  if ('flagAge' in cond) {
    const f = s.flags[cond.flagAge];
    return !!f && cmp(s.day - f.day, cond);
  }
  if ('flag' in cond) {
    const f = s.flags[cond.flag];
    if (cond.set === false) return !f;
    return !!f && cmp(f.value, cond);
  }
  if ('counter' in cond) return cmp(s.counters[cond.counter] ?? 0, cond);
  if ('problem' in cond) return cmp(s.problems[cond.problem] ?? 0, cond);
  if ('stat' in cond) {
    const v = cond.stat === 'chance' ? chance(c, s) : cond.stat === 'day' ? s.day : s[cond.stat];
    return cmp(v, cond);
  }
  if ('item' in cond) return (s.items[cond.item] ?? 0) >= (cond.gte ?? 1);
  if ('part' in cond) return cond.part.includes(s.part);
  if ('archetype' in cond) return cond.archetype.includes(s.archetypeId);
  if ('gender' in cond) return hero(c, s).gender === cond.gender;
  if ('taste' in cond) {
    if (!s.tastes.includes(cond.taste)) return false;
    return cond.revealed === undefined || s.revealed.includes(cond.taste) === cond.revealed;
  }
  if ('seen' in cond) return cond.seen in s.seen;
  return false;
}
const all = (c: Content, s: GameState, conds?: Cond[]) => !conds || conds.every((x) => check(c, s, x));

export const hero = (c: Content, s: GameState) => c.archetypes.find((a) => a.id === s.archetypeId)!;
export const crush = (c: Content, s: GameState) => c.crushes.find((a) => a.id === s.crushId)!;

/** Внешность героя прямо сейчас: архетип + уровень проблем + разовые изменения. */
export function currentLook(c: Content, s: GameState, problems = s.problems, patch = s.lookPatch): Look {
  const look: Look = { ...DEFAULT_LOOK, ...hero(c, s).look };
  for (const def of c.problems) {
    const level = problems[def.id];
    if (level === undefined) continue;
    for (const m of def.look ?? []) {
      (look as unknown as Record<string, number>)[m.param] = m.at0 + (m.at100 - m.at0) * (level / 100);
    }
    const stage = [...(def.stages ?? [])].sort((a, b) => a.below - b.below).find((st) => level <= st.below);
    if (stage) Object.assign(look, stage.set);
  }
  return { ...look, ...patch };
}
/** Внешность в первый день, для «до/после». */
export const startLook = (c: Content, s: GameState) => currentLook(c, s, s.startProblems, {});

/** Насколько решена каждая проблема, 0..1. */
export function progress(s: GameState, id: string) {
  const start = s.startProblems[id] || 1;
  return clamp(1 - (s.problems[id] ?? 0) / start, 0, 1);
}

/**
 * Шанс понравиться, в процентах. Формулу можно показать игроку как есть:
 * стартовый шанс + решённые проблемы + отношение краша + совпавшие вкусы, но не выше потолка.
 */
export function chance(c: Content, s: GameState): number {
  const ids = Object.keys(s.startProblems);
  const solved = ids.length ? ids.reduce((a, id) => a + progress(s, id), 0) / ids.length : 0;
  const tastes = s.tastes.reduce((a, id) => {
    const t = c.tastes.find((x) => x.id === id);
    return a + (t && all(c, s, t.wants) ? t.bonus : 0);
  }, 0);
  return Math.round(clamp(c.balance.chanceBase + solved * c.balance.chanceFromProblems + s.affinity + tastes, 1, c.balance.chanceCap));
}

// ---------- новая игра ----------

export function newGame(c: Content, o: { seed: number; now: number; tzOffsetMin: number; archetypeId: string; crushId?: string }): GameState {
  const arch = c.archetypes.find((a) => a.id === o.archetypeId);
  if (!arch) throw new Error(`Нет архетипа ${o.archetypeId}`);
  const slot = slotAt(o.now, o.now, o.tzOffsetMin);
  const s: GameState = {
    v: 2, seed: o.seed, rolls: 0, startedAt: o.now, tzOffsetMin: o.tzOffsetMin,
    day: 1, part: slot.part, archetypeId: arch.id, crushId: '', tastes: [], revealed: [],
    problems: { ...arch.problems }, startProblems: { ...arch.problems }, lookPatch: {},
    energy: 0, coins: c.balance.startCoins, affinity: 0, streak: 0, playedDays: [],
    flags: {}, items: {}, modifiers: [], queue: [], seen: {}, playedThisPart: 0,
    log: [], chat: [], chatUsed: {}, hints: [], rumors: [], history: [],
    counters: {}, pending: [], dayStart: { ...arch.problems }, summaries: [],
  };
  // краш противоположного пола, случайный
  const pool = c.crushes.filter((x) => x.gender !== arch.gender);
  const cr = o.crushId ? c.crushes.find((x) => x.id === o.crushId)! : pickWeighted(s, pool, () => 1);
  s.crushId = cr.id;
  const tastes = [...cr.tastePool];
  while (s.tastes.length < cr.tasteCount && tastes.length) {
    s.tastes.push(tastes.splice(Math.floor(roll(s) * tastes.length), 1)[0]);
  }
  s.energy = dayEnergy(c, s, 1);
  return s;
}

// ---------- ход времени ----------

/**
 * Подтянуть состояние к настоящему моменту. Вызывается при каждом открытии игры.
 * Пропущенный день не проходит бесследно: герой срывается, проблемы растут.
 * Story cards the player did not get to are resolved by their neutral choice (see autoPlayStory).
 */
export function syncClock(c: Content, state: GameState, now: number): GameState {
  const target = slotAt(state.startedAt, now, state.tzOffsetMin);
  if (target.index <= slotIndex(state.day, state.part) || state.verdict || state.demoOver) return state;
  const s = clone(state);

  while (slotIndex(s.day, s.part) < target.index) {
    const i = DAY_PARTS.indexOf(s.part);
    if (i < 3) {
      s.part = DAY_PARTS[i + 1];
      s.energy = Math.min(dayEnergy(c, s), s.energy + c.balance.energyPerPart);
    } else {
      // the clock ends the day, not the player's sleep: the story the player missed resolves itself first
      if (s.closedDay !== s.day) autoPlayStory(c, s);
      closeDay(c, s);
      if (s.day >= c.balance.days) return finalize(c, s);
      if (s.day >= c.balance.contentDays) { s.demoOver = true; return s; }
      s.day += 1;
      s.part = 'morning';
      delete s.closedDay;
      s.modifiers = s.modifiers.filter((m) => m.days === undefined || s.day <= m.fromDay + m.days);
      for (const m of s.modifiers) for (const d of m.daily ?? []) addProblem(s, d.problem, d.add);
      s.energy = dayEnergy(c, s);
      // то, что было отложено «на завтра»
      const due = s.pending.filter((p) => p.day <= s.day);
      s.pending = s.pending.filter((p) => p.day > s.day);
      for (const p of due) applyEffects(c, s, p.effects);
      s.dayStart = { ...s.problems };
    }
    s.playedThisPart = 0;
    delete s.current;
  }
  return s;
}

/**
 * The day is ending without the player: every story card of this day that is still waiting
 * is played with its neutral choice, in file order. Eligibility is re-checked after each card,
 * because an earlier neutral choice sets flags that gate later cards. Called at night,
 * so cards of every part of the day count as reached.
 * This does not make the day "played": no reward, the streak resets, problems regress.
 */
function autoPlayStory(c: Content, s: GameState) {
  const items: { title: string; text: string }[] = [];
  for (;;) {
    const card = c.cards.find((x) => x.kind === 'story' && eligible(c, s, x));
    const ch = card?.choices.find((x) => x.neutral);
    if (!card || !ch) break;
    // the crush writes first when the card opens; a card left open has already said its line
    if (card.says && s.current !== card.id) say(c, s, card.says);
    const outcome = pickOutcome(c, s, ch);
    applyEffects(c, s, (outcome.effects ?? []).filter((e) => !('closeDay' in e)));
    s.seen[card.id] = s.day;
    delete s.current;
    const entry = { title: fill(c, s, card.title), text: fill(c, s, outcome.text) };
    // filed under the part of the day the card belongs to, not under the night it was resolved in
    const part = DAY_PARTS.find((p) => card.when?.parts?.includes(p)) ?? s.part;
    s.log.push({ day: s.day, part, kind: 'auto', ...entry });
    items.push(entry);
  }
  if (items.length) (s.missed ??= []).push({ day: s.day, items });
}

/** The player has read «Пока тебя не было». */
export function markMissedSeen(state: GameState): GameState {
  if (!state.missed) return state;
  const s = clone(state);
  delete s.missed;
  return s;
}

const pct = (start: number, level: number) => Math.round(clamp(1 - level / (start || 1), 0, 1) * 100);

/**
 * Закончить день: награда за сыгранный день или срыв за пропущенный,
 * кадр героя для таймлапса и карточка дня. Повторный вызов ничего не делает.
 */
function closeDay(c: Content, s: GameState) {
  if (s.closedDay === s.day) return;
  const played = s.playedDays.includes(s.day);
  const info = c.days.find((d) => d.day === s.day);
  let coins = 0, gift: string | undefined;
  if (played) {
    s.streak += 1;
    coins = c.balance.dayCoins;
    s.coins += coins;
    if (info?.gift) { gift = info.gift; s.items[gift] = (s.items[gift] ?? 0) + 1; }
  } else {
    s.streak = 0;
    for (const def of c.problems) {
      if (s.problems[def.id] === undefined || def.regress <= 0) continue;
      s.problems[def.id] = clamp(s.problems[def.id] + def.regress, 0, 100);
    }
    // one calm line: the day card and the bars already show what slipped
    s.log.push({ day: s.day, part: 'night', kind: 'miss', text: `Без тебя ${hero(c, s).name} провёл день как раньше.` });
  }
  const picks = s.history.filter((h) => h.day === s.day)
    .sort((a, b) => Math.abs(b.chanceDelta) - Math.abs(a.chanceDelta)).slice(0, 3)
    .map((h) => ({ title: h.title, label: h.label, delta: h.chanceDelta }));
  const summary: DaySummary = {
    day: s.day, played, look: currentLook(c, s),
    bars: Object.keys(s.startProblems).map((id) => {
      const start = s.startProblems[id], was = s.dayStart[id] ?? start, now = s.problems[id];
      const from = pct(start, was), to = pct(start, now);
      // "percent solved" stops at 0: a level above its start (a skipped day's regress) moves without moving the percent
      return { id, from, to, ...(from === to && now !== was ? { drift: now > was ? 'worse' as const : 'better' as const } : {}) };
    }),
    chance: chance(c, s), picks, coins, gift, seen: false,
  };
  s.summaries.push(summary);
  s.closedDay = s.day;
  delete s.current;
}

/** Отметить, что игрок посмотрел карточку дня. */
export function markSummarySeen(state: GameState, day: number): GameState {
  const s = clone(state);
  const x = s.summaries.find((d) => d.day === day);
  if (x) x.seen = true;
  return s;
}

function finalize(c: Content, s: GameState): GameState {
  const ch = chance(c, s);
  const r = roll(s);
  s.verdict = { liked: r * 100 < ch, chance: ch, roll: Math.round(r * 100) };
  return s;
}

// ---------- карточки ----------

function eligible(c: Content, s: GameState, card: Card): boolean {
  const w = card.when ?? {};
  if (w.days && (s.day < w.days[0] || s.day > w.days[1])) return false;
  if (w.parts) {
    // сюжет ждёт игрока: утренняя карточка придёт и днём, и вечером того же дня
    const now = DAY_PARTS.indexOf(s.part);
    const ok = card.kind === 'story' ? now >= Math.min(...w.parts.map((p) => DAY_PARTS.indexOf(p))) : w.parts.includes(s.part);
    if (!ok) return false;
  }
  if (card.id in s.seen) {
    if (w.cooldownDays === undefined) return false;
    if (s.day - s.seen[card.id] < w.cooldownDays) return false;
  }
  return all(c, s, w.requires);
}

/** A queued quest step whose time has come: its day and part, or any part once its day has passed. */
const queueDue = (s: GameState, q: GameState['queue'][number]) => q.day <= s.day && (!q.part || q.part === s.part || q.day < s.day);

const over = (s: GameState) => !!s.verdict || !!s.demoOver || s.closedDay === s.day;
type Drawn = { state: GameState; card: Card | null };

function openCard(c: Content, s: GameState, card: Card | null): Drawn {
  if (card) {
    s.current = card.id;
    if (card.says) say(c, s, card.says);
  }
  return { state: s, card };
}

/** Обязательное: назначенные шаги квестов, потом сюжет по порядку в файле. */
export function drawStory(c: Content, state: GameState): Drawn {
  const byId = (id: string) => c.cards.find((x) => x.id === id) ?? null;
  if (over(state)) return { state, card: null };
  if (state.current) return { state, card: byId(state.current) };
  const s = clone(state);
  // a queued step stays in the queue while it is open: only the player's choice takes it out (see choose)
  let card = byId(s.queue.find((q) => queueDue(s, q) && byId(q.cardId))?.cardId ?? '');
  if (!card) card = c.cards.find((x) => x.kind === 'story' && eligible(c, s, x)) ?? null;
  return card ? openCard(c, s, card) : { state, card: null };
}

const eventPool = (c: Content, s: GameState) =>
  over(s) || s.playedThisPart >= c.balance.cardsPerPart ? [] : c.cards.filter((x) => (x.kind === 'event' || x.kind === 'chat') && eligible(c, s, x));

/** Есть ли сейчас случайные события в колоде. */
export const hasEvents = (c: Content, s: GameState) => eventPool(c, s).length > 0;

/** Случайная карточка из колоды. */
export function drawEvent(c: Content, state: GameState): Drawn {
  const pool = eventPool(c, state);
  if (!pool.length) return { state, card: null };
  const s = clone(state);
  return openCard(c, s, pickWeighted(s, pool, (x) => x.when?.weight ?? 1));
}

/** Действия, которые игрок может выбрать сам в меню «плюса». */
export function actionsFor(c: Content, s: GameState): Card[] {
  return over(s) ? [] : c.cards.filter((x) => x.kind === 'action' && eligible(c, s, x));
}

/** Сюжет, а если его нет, случайное событие. */
export function draw(c: Content, state: GameState): Drawn {
  const d = drawStory(c, state);
  return d.card ? d : drawEvent(c, d.state);
}

/** Подписи шансов для варианта со случайным исходом: «часто: смеются». */
export function oddsFor(c: Content, s: GameState, choice: Choice): { word: string; hint: string }[] {
  const fits = choice.outcomes.filter((o) => all(c, s, o.if));
  if (fits.length < 2 || !fits.some((o) => o.hint)) return [];
  const total = fits.reduce((a, o) => a + (o.weight ?? 1), 0);
  return fits.map((o) => {
    const share = (o.weight ?? 1) / total;
    return { word: share >= 0.6 ? 'часто' : share >= 0.25 ? 'иногда' : 'редко', hint: o.hint ?? 'иначе' };
  });
}

export interface ShownChoice { choice: Choice; affordable: boolean }

export function choicesFor(c: Content, s: GameState, card: Card): ShownChoice[] {
  return card.choices
    .filter((ch) => all(c, s, ch.requires))
    .map((choice) => ({
      choice,
      affordable: s.energy >= (choice.cost?.energy ?? 0) && s.coins >= (choice.cost?.coins ?? 0),
    }));
}

function addProblem(s: GameState, id: string, add: number) {
  if (s.problems[id] === undefined) return;
  s.problems[id] = clamp(s.problems[id] + add, 0, 100);
}

/** Подставить имена и «память» в текст: {hero}, {crush}, {day:метка}. */
export function fill(c: Content, s: GameState, text: string): string {
  return text
    .replaceAll('{hero}', hero(c, s).name)
    .replaceAll('{crush}', crush(c, s).name)
    .replace(/\{day:([\w-]+)\}/g, (_, f) => String(s.flags[f]?.day ?? '?'));
}

export function applyEffects(c: Content, s: GameState, effects: Effect[] = []) {
  for (const e of effects) {
    if ('problem' in e) addProblem(s, e.problem, e.add);
    else if ('stat' in e) {
      if (e.stat === 'energy') s.energy = clamp(s.energy + e.add, 0, c.balance.energyCap);
      else if (e.stat === 'coins') s.coins = Math.max(0, s.coins + e.add);
      else s.affinity = clamp(s.affinity + e.add, -40, 60);
    }
    else if ('flag' in e) s.flags[e.flag] = { value: e.value ?? true, day: s.day };
    else if ('unflag' in e) delete s.flags[e.unflag];
    else if ('item' in e) s.items[e.item] = Math.max(0, (s.items[e.item] ?? 0) + e.add);
    else if ('look' in e) Object.assign(s.lookPatch, e.look);
    else if ('queue' in e) s.queue.push({ cardId: e.queue, day: s.day + (e.inDays ?? 0), part: e.part });
    else if ('chat' in e) say(c, s, e.chat);
    else if ('write' in e) s.chat.push({ day: s.day, part: s.part, from: 'hero', text: fill(c, s, e.write) });
    else if ('hint' in e) { if (!s.hints.includes(e.hint)) s.hints.push(e.hint); }
    else if ('rumor' in e) { if (!s.rumors.some((r) => r.id === e.rumor)) s.rumors.push({ id: e.rumor, day: s.day }); }
    else if ('reveal' in e) { if (s.tastes.includes(e.reveal) && !s.revealed.includes(e.reveal)) s.revealed.push(e.reveal); }
    else if ('modifier' in e) {
      s.modifiers = s.modifiers.filter((m) => m.id !== e.modifier.id);
      s.modifiers.push({ ...e.modifier, fromDay: s.day });
    }
    else if ('log' in e) s.log.push({ day: s.day, part: s.part, kind: 'system', text: fill(c, s, e.log) });
    else if ('counter' in e) s.counters[e.counter] = e.set ?? (s.counters[e.counter] ?? 0) + (e.add ?? 0);
    else if ('tomorrow' in e) s.pending.push({ day: s.day + 1, effects: e.tomorrow });
    else if ('closeDay' in e) closeDay(c, s);
  }
}

/** Краш пишет. Из вариантов фразы берётся тот, что дольше всех не звучал. */
function say(c: Content, s: GameState, key: string) {
  const variants = c.chat[key];
  if (!variants?.length) return;
  const used = (s.chatUsed[key] ??= []);
  const fresh = variants.map((_, i) => i).filter((i) => !used.includes(i));
  const from = fresh.length ? fresh : variants.map((_, i) => i);
  const i = from[Math.floor(roll(s) * from.length)];
  if (!fresh.length) used.length = 0;
  used.push(i);
  s.chat.push({ day: s.day, part: s.part, from: 'crush', text: fill(c, s, variants[i]), ...(key.startsWith('status_') ? { status: true } : {}) });
}

/** One of the outcomes whose conditions hold, by weight and the seeded roll; the last outcome if none fits. */
function pickOutcome(c: Content, s: GameState, ch: Choice): Outcome {
  const fits = ch.outcomes.filter((o) => all(c, s, o.if));
  return fits.length ? pickWeighted(s, fits, (o) => o.weight ?? 1) : ch.outcomes[ch.outcomes.length - 1];
}

export interface Resolved { state: GameState; outcome: Outcome; chanceDelta: number }

export function choose(c: Content, state: GameState, cardId: string, choiceId: string): Resolved {
  const card = c.cards.find((x) => x.id === cardId);
  const shown = card && choicesFor(c, state, card).find((x) => x.choice.id === choiceId);
  if (!card || !shown) throw new Error(`Нет варианта ${cardId}/${choiceId}`);
  if (!shown.affordable) throw new Error('Не хватает энергии или монет');
  const s = clone(state);
  const before = chance(c, s);
  const ch = shown.choice;
  s.energy -= ch.cost?.energy ?? 0;
  s.coins -= ch.cost?.coins ?? 0;

  // the queued step is answered: taken out before the effects, which may queue the same card again
  const qi = s.queue.findIndex((q) => q.cardId === card.id && queueDue(s, q));
  if (qi >= 0) s.queue.splice(qi, 1);

  const outcome = pickOutcome(c, s, ch);
  if (card.kind === 'chat') s.chat.push({ day: s.day, part: s.part, from: 'hero', text: ch.label });
  // день закрывается последним, чтобы этот выбор попал в его итог
  const effects = outcome.effects ?? [];
  applyEffects(c, s, effects.filter((e) => !('closeDay' in e)));

  s.seen[card.id] = s.day;
  if (card.kind === 'event' || card.kind === 'chat') s.playedThisPart += 1;
  if (!s.playedDays.includes(s.day)) s.playedDays.push(s.day);
  delete s.current;
  const chanceDelta = chance(c, s) - before;
  const title = fill(c, s, card.title);
  s.log.push({ day: s.day, part: s.part, kind: card.kind === 'story' ? 'story' : 'choice', title, text: fill(c, s, outcome.text) });
  s.history.push({ day: s.day, card: card.id, choice: ch.id, title, label: ch.label, chanceDelta });
  if (chanceDelta !== 0) s.lastChange = { delta: chanceDelta, why: fill(c, s, outcome.why ?? card.title) };
  if (effects.some((e) => 'closeDay' in e)) closeDay(c, s);
  return { state: s, outcome: { ...outcome, text: fill(c, s, outcome.text) }, chanceDelta };
}

// ---------- магазин и предметы ----------

/** Покупка за игровые монеты. Покупки за реальные деньги подтверждает сервер. */
export function buy(c: Content, state: GameState, itemId: string): GameState {
  const item = c.items.find((x) => x.id === itemId);
  const price = item?.price?.coins;
  if (!item || price === undefined) throw new Error(`Предмет ${itemId} не продаётся за монеты`);
  if (state.coins < price) throw new Error('Не хватает монет');
  if (soldOut(state, item)) throw new Error(`Предмет ${itemId} продаётся один раз`);
  const s = clone(state);
  s.coins -= price;
  s.items[itemId] = (s.items[itemId] ?? 0) + 1;
  // remembered even after the item is used up, so `once` holds and later cards can check it
  s.flags[`bought_${itemId}`] = { value: true, day: s.day };
  return s;
}

/** A once-only item that this run has already bought. */
export function soldOut(s: GameState, item: Item): boolean {
  return !!item.once && `bought_${item.id}` in s.flags;
}

/** The item starts a course (a modifier) that is already running, so a second one would only restart it. */
export function courseActive(s: GameState, item: Item): boolean {
  return (item.onUse ?? []).some((e) => 'modifier' in e && s.modifiers.some((m) => m.id === e.modifier.id));
}

export function useItem(c: Content, state: GameState, itemId: string): GameState {
  const item = c.items.find((x) => x.id === itemId);
  if (!item || !(state.items[itemId] > 0)) throw new Error(`Нет предмета ${itemId}`);
  if (courseActive(state, item)) throw new Error(`Курс ${itemId} уже действует`);
  if (state.energy < (item.energy ?? 0)) throw new Error('Не хватает энергии');
  const s = clone(state);
  s.items[itemId] -= 1;
  s.energy -= item.energy ?? 0;
  applyEffects(c, s, item.onUse);
  s.log.push({ day: s.day, part: s.part, kind: 'choice', title: item.title, text: `Использовано: ${item.title.toLowerCase()}.` });
  if (!s.playedDays.includes(s.day)) s.playedDays.push(s.day);
  return s;
}

export type { DayPart };
