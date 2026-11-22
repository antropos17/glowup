/**
 * Иконки игры. Одна сетка 24×24, одна толщина линии, скруглённые концы.
 * Цвет берётся из текста вокруг (currentColor).
 */
export const ICONS = {
  plus: '<path d="M12 5v14M5 12h14"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  up: '<path d="M12 19V6M6.5 11.5L12 6l5.5 5.5"/>',
  down: '<path d="M12 5v13M6.5 12.5L12 18l5.5-5.5"/>',
  bolt: '<path d="M13 3L5.5 13.5H11L10 21l8-11h-5.5z"/>',
  coin: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5v9M14.5 9.5c-.6-1-1.5-1.4-2.6-1.4-1.4 0-2.4.8-2.4 1.9 0 2.8 5.2 1.3 5.2 4.1 0 1.2-1.1 2-2.7 2-1.3 0-2.3-.5-2.9-1.6"/>',
  heart: '<path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0112 7.5a4.3 4.3 0 017.5 2.3C19.5 15.4 12 20 12 20z"/>',
  mirror: '<rect x="6" y="2.5" width="12" height="16" rx="6"/><path d="M12 18.5V22M8.5 22h7M9.5 8.5l3-3"/>',
  chat: '<path d="M4 6.5A2.5 2.5 0 016.5 4h11A2.5 2.5 0 0120 6.5v7a2.5 2.5 0 01-2.5 2.5H11l-4.5 4v-4A2.5 2.5 0 014 13.5z"/>',
  feed: '<path d="M4 10v4l2 .5 1.5 5h2.5l-1-4.5L18 18V6L6 9.5z"/><path d="M20.5 10v4"/>',
  bag: '<path d="M5 8h14l-1 12H6z"/><path d="M9 8V6.5a3 3 0 016 0V8"/>',
  sunrise: '<path d="M3 18h18M6 18a6 6 0 0112 0M12 5v3M5 9l2 2M19 9l-2 2"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3L7 7M17 17l1.7 1.7M18.7 5.3L17 7M7 17l-1.7 1.7"/>',
  sunset: '<path d="M3 18h18M6 18a6 6 0 0112 0M12 4v5M9.5 6.5L12 9l2.5-2.5"/>',
  moon: '<path d="M19.5 14.5A8 8 0 019.5 4.5a8 8 0 1010 10z"/>',
  drop: '<path d="M12 3s6 6.5 6 11a6 6 0 01-12 0c0-4.5 6-11 6-11z"/>',
  dumbbell: '<path d="M3 9.5v5M6.5 7v10M17.5 7v10M21 9.5v5M6.5 12h11"/>',
  tooth: '<path d="M7.5 3.5c-2.5 0-4 2-3.5 5 .4 2.5 1 3.5 1.5 6.5.3 2 .5 5.5 2 5.5 1.8 0 1-5 4.5-5s2.7 5 4.5 5c1.5 0 1.7-3.5 2-5.5.5-3 1.1-4 1.5-6.5.5-3-1-5-3.5-5-1.8 0-2.8 1-4.5 1s-2.7-1-4.5-1z"/>',
  scissors: '<circle cx="6.5" cy="6.5" r="2.8"/><circle cx="6.5" cy="17.5" r="2.8"/><path d="M8.8 8.3L20 18M8.8 15.7L20 6"/>',
  shirt: '<path d="M8.5 3.5L3 7l2.5 4L8 9.5V20h8V9.5l2.5 1.5L21 7l-5.5-3.5a3.5 3.5 0 01-7 0z"/>',
  spine: '<path d="M12 3v18M8 6.5h8M7.5 11h9M8 15.5h8"/>',
  tube: '<path d="M8 3h8l2 14H6zM8 17v3.5h8V17M10 8h4"/>',
  bulb: '<path d="M9 17.5h6M10 21h4M12 3a6 6 0 00-3.5 10.9c.7.6 1 1.3 1 2.1h5c0-.8.3-1.5 1-2.1A6 6 0 0012 3z"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  flame: '<path d="M12 3c.5 3.5 5 5.5 5 10.5a5 5 0 01-10 0c0-2 1-3.5 2-4.5 0 2 1 3 2 3 0-3-1-6 1-9z"/>',
  lock: '<rect x="5.5" y="11" width="13" height="9.5" rx="2"/><path d="M8.5 11V8a3.5 3.5 0 017 0v3"/>',
  gum: '<rect x="3.5" y="8" width="17" height="8" rx="2"/><path d="M9 8v8M15 8v8"/>',
  note: '<path d="M5 4h10l4 4v12H5z"/><path d="M15 4v4h4M8.5 12.5h7M8.5 16h5"/>',
  sound: '<path d="M4 9.5v5h3.5l4.5 4v-13l-4.5 4z"/><path d="M15.5 9a4.5 4.5 0 010 6M18 6.5a8 8 0 010 11"/>',
  mute: '<path d="M4 9.5v5h3.5l4.5 4v-13l-4.5 4z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/>',
} as const;

export type IconName = keyof typeof ICONS;

export function iconSvg(name: IconName, size = 24, strokeWidth = 2): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] ?? ICONS.note}</svg>`;
}
