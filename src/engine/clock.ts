/**
 * Игровое время. 30 реальных дней, день идёт утро → день → вечер → ночь
 * по местному времени игрока. Игровой день начинается в 06:00, поэтому
 * ночь после полуночи ещё принадлежит вчерашнему дню.
 */
import { DAY_PARTS, type DayPart } from './types';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
/** час, с которого начинается игровой день */
export const DAY_START_HOUR = 6;

/** границы времени суток в часах от начала игрового дня: утро 06–12, день 12–18, вечер 18–23, ночь 23–06 */
const PART_STARTS = [0, 6, 12, 17];

export interface Slot { day: number; part: DayPart; index: number }

/** номер игровых суток от эпохи для момента now в поясе игрока */
function gameDayNumber(ms: number, tzOffsetMin: number) {
  return Math.floor((ms + tzOffsetMin * 60_000 - DAY_START_HOUR * HOUR) / DAY);
}

export function slotAt(startedAt: number, now: number, tzOffsetMin: number): Slot {
  const day = gameDayNumber(now, tzOffsetMin) - gameDayNumber(startedAt, tzOffsetMin) + 1;
  const local = now + tzOffsetMin * 60_000 - DAY_START_HOUR * HOUR;
  const hourOfGameDay = (((local % DAY) + DAY) % DAY) / HOUR;
  let p = 0;
  for (let i = 0; i < PART_STARTS.length; i++) if (hourOfGameDay >= PART_STARTS[i]) p = i;
  return { day, part: DAY_PARTS[p], index: (day - 1) * 4 + p };
}

export const slotIndex = (day: number, part: DayPart) => (day - 1) * 4 + DAY_PARTS.indexOf(part);

/** сколько миллисекунд до следующей смены времени суток */
export function msToNextPart(now: number, tzOffsetMin: number): number {
  const local = now + tzOffsetMin * 60_000 - DAY_START_HOUR * HOUR;
  const inDay = ((local % DAY) + DAY) % DAY;
  const next = [...PART_STARTS.slice(1), 24].map((h) => h * HOUR).find((t) => t > inDay)!;
  return next - inDay;
}

/**
 * Источник времени. В релизе время приходит с сервера, чтобы перевод часов
 * на телефоне ничего не давал. В разработке его можно перематывать.
 */
export interface Clock { now(): number; tzOffsetMin(): number }

export class DeviceClock implements Clock {
  /** поправка к часам устройства, её присылает сервер */
  serverSkew = 0;
  /** перемотка для тестов и прототипа */
  devSkip = 0;
  now() { return Date.now() + this.serverSkew + this.devSkip; }
  tzOffsetMin() { return -new Date().getTimezoneOffset(); }
}
