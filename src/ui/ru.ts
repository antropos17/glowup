// Все подписи интерфейса в одном месте, чтобы позже добавить другие языки.
import type { DayPart } from '../engine/types';

export const PART_NAME: Record<DayPart, string> = { morning: 'Утро', day: 'День', evening: 'Вечер', night: 'Ночь' };
export const PART_NEXT: Record<DayPart, string> = { morning: 'день', day: 'вечер', evening: 'ночь', night: 'утро' };
export const PART_ICON = { morning: 'sunrise', day: 'sun', evening: 'sunset', night: 'moon' } as const;

export function duration(ms: number) {
  const m = Math.max(1, Math.round(ms / 60_000));
  const h = Math.floor(m / 60), r = m % 60;
  if (!h) return `${r} мин`;
  return r ? `${h} ч ${r} мин` : `${h} ч`;
}
