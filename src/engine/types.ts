/**
 * Формат контента и состояния игры.
 * Сценарий пишется в JSON-файлах в папке content/ ровно в этих типах.
 * Движок ничего не знает про конкретные сюжеты: всё приходит из контента.
 */
import type { Look } from '../art/avatar';

export type DayPart = 'morning' | 'day' | 'evening' | 'night';
export const DAY_PARTS: DayPart[] = ['morning', 'day', 'evening', 'night'];

// ---------- условия ----------

type Cmp = { eq?: number | string | boolean; gte?: number; lte?: number };

/** Условие. Все поля внутри одного условия должны выполниться разом. */
export type Cond =
  | ({ flag: string; set?: boolean } & Cmp)          // метка-«память»: есть ли она и чему равна
  | ({ flagAge: string } & Cmp)                      // сколько дней назад метку поставили
  | ({ problem: string } & Cmp)                      // уровень проблемы: 100 запущено, 0 решено
  | ({ stat: 'energy' | 'coins' | 'chance' | 'affinity' | 'day' | 'streak' } & Cmp)
  | ({ counter: string } & Cmp)                      // счётчик: дни без сигарет, полезные действия
  | { item: string; gte?: number }                   // предмет в инвентаре
  | { part: DayPart[] }
  | { archetype: string[] }
  | { gender: 'm' | 'f' }
  | { taste: string; revealed?: boolean }            // вкус краша: есть ли он и раскрыт ли игроку
  | { seen: string }                                 // карточка уже была сыграна
  | { any: Cond[] }                                  // хотя бы одно из
  | { not: Cond };

// ---------- эффекты ----------

export type Effect =
  | { problem: string; add: number }                 // минус лечит, плюс ухудшает
  | { stat: 'energy' | 'coins' | 'affinity'; add: number }
  | { flag: string; value?: number | string | boolean } // поставить метку (запоминается день)
  | { unflag: string }
  | { item: string; add: number }
  | { look: Partial<Look> }                          // прямое изменение внешности: покрасилась, сняла очки
  | { queue: string; inDays?: number; part?: DayPart } // назначить карточку на потом
  | { chat: string }                                 // краш пишет: ключ ситуации из chat.json
  | { write: string }                                // герой пишет крашу этот текст
  | { hint: string }                                 // подсказка в блокнот
  | { rumor: string }                                // слух в ленту
  | { reveal: string }                               // раскрыть вкус краша
  | { modifier: Modifier }                           // временное изменение, например абонемент в зал
  | { log: string }                                  // строка в журнал
  | { counter: string; add?: number; set?: number }  // изменить счётчик
  | { tomorrow: Effect[] }                           // эффекты сработают завтра утром
  | { closeDay: true };                              // закончить день сейчас: карточка дня, кадр, награда

export interface Modifier {
  id: string;
  title: string;
  /** сколько энергии добавляет каждое утро */
  energyPerDay?: number;
  /** на сколько дней, без поля действует до конца игры */
  days?: number;
  /** каждый день с этим модификатором проблема меняется на столько */
  daily?: { problem: string; add: number }[];
}

// ---------- карточки ----------

export interface Outcome {
  /** вес среди подходящих исходов, по умолчанию 1 */
  weight?: number;
  if?: Cond[];
  text: string;
  effects?: Effect[];
  /** два-три слова для подписи шанса на карточке: «часто: смеются» */
  hint?: string;
  /** причина рядом со шкалой шанса, если он изменился: «Алина прочитала и не ответила» */
  why?: string;
}

export interface Choice {
  id: string;
  label: string;
  cost?: { energy?: number; coins?: number };
  /** без выполнения условий вариант не показывается */
  requires?: Cond[];
  outcomes: Outcome[];
}

export interface Card {
  id: string;
  /**
   * story: узкое дерево, история с крашем, приходит строго по расписанию
   * event: широкая колода, выпадает по весу, когда подходят условия
   * quest: шаг квеста, обычно ставится в очередь эффектом queue
   * chat: развилка в переписке с крашем
   * action: действие из меню «плюса», игрок выбирает его сам
   */
  kind: 'story' | 'event' | 'quest' | 'chat' | 'action';
  title: string;
  text: string;
  /** кто говорит, если это реплика персонажа */
  speaker?: string;
  /** краш пишет первым: ключ ситуации из chat.json, фраза уходит в чат, когда карточка открывается */
  says?: string;
  when?: {
    /** включительно, дни 1..30 */
    days?: [number, number];
    parts?: DayPart[];
    requires?: Cond[];
    /** вес в колоде, по умолчанию 1 */
    weight?: number;
    /** через сколько дней карточка может выпасть снова. Без поля выпадает один раз */
    cooldownDays?: number;
  };
  choices: Choice[];
}

// ---------- остальной контент ----------

export interface ProblemDef {
  id: string;
  title: string;
  /** подпись шкалы на экране, например «Кожа» */
  bar: string;
  icon: string;
  /** на сколько становится хуже за каждый пропущенный день */
  regress: number;
  /** как уровень проблемы меняет внешность: число интерполируется от at0 (решено) к at100 (запущено) */
  look?: { param: keyof Look; at0: number; at100: number }[];
  /** дискретные изменения: применяется первая ступень, у которой уровень не выше below */
  stages?: { below: number; set: Partial<Look> }[];
}

export interface Archetype {
  id: string;
  gender: 'm' | 'f';
  name: string;
  age: number;
  blurb: string;
  /** внешность при полностью решённых проблемах */
  look: Look;
  /** стартовые проблемы и их уровень */
  problems: Record<string, number>;
}

export interface Taste {
  id: string;
  /** что игрок увидит, когда вкус раскроется */
  title: string;
  /** что должно быть правдой, чтобы вкус сработал в плюс */
  wants: Cond[];
  bonus: number;
}

export interface Crush {
  id: string;
  gender: 'm' | 'f';
  name: string;
  blurb: string;
  look: Look;
  /** сколько скрытых вкусов выдаётся из пула */
  tasteCount: number;
  tastePool: string[];
}

export interface Item {
  id: string;
  title: string;
  blurb: string;
  icon: string;
  /** без цены предмет не продаётся, его можно только получить */
  price?: { coins?: number; iap?: string };
  /** обязательная честная приписка: что предмет не гарантирует */
  limits: string;
  onUse?: Effect[];
  /** расход энергии на применение */
  energy?: number;
}

export interface Balance {
  days: number;
  energyPerDay: number;
  /** множитель энергии в первые дни */
  earlyBoost: { days: number; factor: number };
  /** сколько энергии возвращается при смене времени суток */
  energyPerPart: number;
  energyCap: number;
  startCoins: number;
  /** потолок шанса: даже идеальная игра не даёт 100% */
  chanceCap: number;
  /** шанс в самом начале, когда ничего не решено */
  chanceBase: number;
  /** вклад решённых проблем в шанс, 0..100 */
  chanceFromProblems: number;
  /** монеты за каждый сыгранный день */
  dayCoins: number;
  /** сколько дней сценария уже написано. После них идёт «Продолжение следует» */
  contentDays: number;
  /** сколько случайных карточек из колоды выпадает за одно время суток. Сюжет и квесты сюда не входят */
  cardsPerPart: number;
}

/** Настройки одного дня: название, подарок за день, строка «что будет завтра». */
export interface DayInfo { day: number; title: string; gift?: string; teaser?: string }

export interface Content {
  balance: Balance;
  days: DayInfo[];
  problems: ProblemDef[];
  archetypes: Archetype[];
  crushes: Crush[];
  tastes: Taste[];
  items: Item[];
  cards: Card[];
  /** ситуация → варианты фраз краша. Берётся вариант, который дольше всех не звучал */
  chat: Record<string, string[]>;
  hints: Record<string, string>;
  rumors: Record<string, { text: string; source: string }>;
}

// ---------- состояние ----------

export interface LogEntry {
  day: number;
  part: DayPart;
  kind: 'story' | 'choice' | 'system' | 'miss';
  title?: string;
  text: string;
}

export interface ChatMsg {
  day: number;
  part: DayPart;
  from: 'crush' | 'hero';
  text: string;
  /** служебная строка, а не её слова: «была в сети, ответа нет». Ситуации с ключом status_… */
  status?: boolean;
}

/** Итог дня: кадр героя для таймлапса и то, что показывает карточка дня. */
export interface DaySummary {
  day: number;
  played: boolean;
  look: Look;
  bars: { id: string; from: number; to: number }[];
  chance: number;
  picks: { title: string; label: string; delta: number }[];
  coins: number;
  gift?: string;
  seen: boolean;
}

export interface GameState {
  v: 2;
  seed: number;
  /** сколько раз уже тянули случайное число, чтобы прохождение можно было повторить и проверить */
  rolls: number;
  /** когда началась игра, миллисекунды по серверу */
  startedAt: number;
  /** смещение часового пояса игрока в минутах, как в Date.getTimezoneOffset со знаком минус */
  tzOffsetMin: number;
  day: number;
  part: DayPart;
  archetypeId: string;
  crushId: string;
  tastes: string[];
  revealed: string[];
  problems: Record<string, number>;
  startProblems: Record<string, number>;
  lookPatch: Partial<Look>;
  energy: number;
  coins: number;
  affinity: number;
  streak: number;
  /** дни, в которые игрок сделал хотя бы один выбор */
  playedDays: number[];
  flags: Record<string, { value: number | string | boolean; day: number }>;
  items: Record<string, number>;
  modifiers: (Modifier & { fromDay: number })[];
  queue: { cardId: string; day: number; part?: DayPart }[];
  seen: Record<string, number>;
  /** карточки, сыгранные в текущее время суток */
  playedThisPart: number;
  /** открытая сейчас карточка, чтобы после перезапуска она не поменялась */
  current?: string;
  log: LogEntry[];
  chat: ChatMsg[];
  chatUsed: Record<string, number[]>;
  hints: string[];
  rumors: { id: string; day: number }[];
  /** статистика для разбора после финала */
  history: { day: number; card: string; choice: string; title: string; label: string; chanceDelta: number }[];
  counters: Record<string, number>;
  /** эффекты, отложенные на утро указанного дня */
  pending: { day: number; effects: Effect[] }[];
  /** уровни проблем на утро текущего дня, чтобы показать изменения за день */
  dayStart: Record<string, number>;
  summaries: DaySummary[];
  /** день, который игрок уже закончил */
  closedDay?: number;
  /** последнее изменение шанса и его причина */
  lastChange?: { delta: number; why: string };
  /** написанные дни кончились */
  demoOver?: boolean;
  verdict?: { liked: boolean; chance: number; roll: number };
}
