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

/** Russian plural of «день» for a count: 1 день, 2 дня, 5 дней, 11 дней, 21 день. */
export function dayWord(n: number) {
  const d = Math.abs(n) % 10, h = Math.abs(n) % 100;
  if (h >= 11 && h <= 14) return 'дней';
  return d === 1 ? 'день' : d >= 2 && d <= 4 ? 'дня' : 'дней';
}

/** «Пока тебя не было»: story cards that resolved themselves while the player was away. */
export const MISSED = {
  title: 'Пока тебя не было',
  lead: 'История шла своим ходом. Вот что случилось.',
  day: (n: number) => `День ${n}`,
  ok: 'Понятно',
};

/** Day card: a bar that moved although its percent did not (it is still at 0%); the calm lines of a skipped day. */
export const DAY_CARD = {
  drift: { worse: 'стало хуже', better: 'стало лучше' },
  skipped: 'День прошёл без тебя. Шкалы немного просели — пара дней, и вернёшь.',
  noReward: 'Награды за пропущенный день нет.',
};

/** Mirror: days without a cigarette. Shown only from 1 day on. */
export const SMOKE_FREE = (n: number) => `Без сигарет: ${n} ${dayWord(n)}`;

/** Sound toggle in the top bar and the sound list on the showcase page. */
export const SOUND = {
  turnOn: 'Включить звук',
  turnOff: 'Выключить звук',
  names: {
    tap: 'Нажатие', open: 'Карточка открылась', up: 'Шанс вырос', down: 'Шанс упал',
    coins: 'Монеты', message: 'Сообщение в чате', dayend: 'День закончен', away: '«Пока тебя не было»',
  },
};

/** Demo end screen. */
export const DEMO_END = {
  title: 'Продолжение следует',
  written: (days: number, total: number) => `Написан ${days === 1 ? 'первый день' : `сценарий на ${days} ${dayWord(days)}`} из ${total}. Дальше игра пока не идёт.`,
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
  /** Telegram Mini App only: the bot has the player on its list. */
  listed: 'Ты в списке. Бот напишет, когда выйдет продолжение.',
  /** Telegram Mini App only: closes the app and returns to the chat. */
  leave: 'Вернуться в чат',
  close: 'Закрыть',
  restart: 'Начать заново',
  frozenNote: 'Демо закончено: всё можно посмотреть, но играть дальше нельзя.',
  restOpen: 'Итоги демо',
};

/** Hero pick before a new game. */
export const PICK = {
  title: 'Выбери героя',
  problems: 'Над чем работать',
  start: 'Начать',
};
