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

/** Demo end screen. */
export const DEMO_END = {
  title: 'Продолжение следует',
  written: (days: number, total: number) => `Написан ${days === 1 ? 'первый день' : `сценарий на ${days} дней`} из ${total}. Дальше игра пока не идёт.`,
  heroHead: 'Как изменился герой',
  chance: 'Шанс понравиться',
  shareHead: 'Позвать друга',
  shareText: 'Отправь таймлапс героя тому, кому тоже интересно, что будет дальше.',
  shareMessage: 'Вот как изменился мой герой в демо «30 дней».',
  shareBtn: 'Поделиться таймлапсом',
  shareTitle: '30 дней',
  shareCopied: 'Ссылка скопирована.',
  shareFailed: (url: string) => `Не получилось скопировать. Ссылка: ${url}`,
  notify: 'Сообщить о полной версии',
  notified: 'Готово: отметили, что ты ждёшь полную версию.',
  close: 'Закрыть',
  restart: 'Начать заново',
  frozenNote: 'Демо закончено: всё можно посмотреть, но играть дальше нельзя.',
  restOpen: 'Итоги демо',
};
