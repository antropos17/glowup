/**
 * The 1-day funnel: `?demo=1` (the Telegram Mini App and the TikTok link). Only this mode gets the intro,
 * the animated Day 1 beats, the cliffhanger and the wishlist call. Every other address keeps the game as is.
 * Pure functions, so the gating and the creator code are covered by tests.
 */
import { DAY_PARTS, type DayPart, type GameState } from './engine/types';

export const BOT_URL = 'https://t.me/glowupchallenge30bot';

/** What the 1-day funnel needs to know about the page. */
export interface Funnel {
  /** creator code from `?ref=` or `?code=`, already sanitized; '' when there is none */
  code: string;
}

/** Lower case, only `[a-z0-9_]`, at most 32 characters. Anything else is dropped. */
export function sanitizeCode(raw: string | null | undefined): string {
  return (raw ?? '').toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 32);
}

/** The funnel is on for `?demo=1` exactly; `?demo=2`, `?full` or no `?demo` give undefined. */
export function funnelFrom(params: URLSearchParams): Funnel | undefined {
  if (params.get('demo') !== '1') return undefined;
  return { code: sanitizeCode(params.get('ref')) || sanitizeCode(params.get('code')) };
}

/** The bot link that puts the player on the wishlist: `/start <code>`, or a plain `/start`. */
export function wishlistUrl(code: string): string {
  return code ? `${BOT_URL}?start=${code}` : `${BOT_URL}?start`;
}

/** The Day 1 moments that get an animation in the funnel, by card id (and choice, for the first message). */
export type Beat = 'invite' | 'mirror' | 'message' | 'like' | 'chance';

export function beatFor(cardId: string, choiceId: string): Beat | undefined {
  if (cardId === 'K1-01') return 'invite';
  if (cardId === 'K1-02') return 'mirror';
  if (cardId === 'K1-05') return choiceId === 'like' ? 'like' : choiceId === 'close' ? undefined : 'message';
  if (cardId === 'K1-08' || cardId === 'K1-08b' || cardId === 'K1-08c') return 'chance';
  return undefined;
}

/** The intro is shown once per browser. */
export const INTRO_KEY = 'glowup.introSeen';

/**
 * The funnel is one sitting: once a part of the day has nothing left, the player moves on by a button
 * instead of waiting for the clock. Gives the part the button leads to, or undefined when there is no button:
 * outside the funnel (the real-time wall stays), at night (the day ends with sleep) and once the day is closed.
 */
export function partAhead(funnel: Funnel | undefined, s: GameState): DayPart | undefined {
  if (!funnel || s.part === 'night' || s.closedDay === s.day || s.verdict || s.demoOver) return undefined;
  return DAY_PARTS[DAY_PARTS.indexOf(s.part) + 1];
}
