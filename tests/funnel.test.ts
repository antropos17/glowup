import { describe, expect, it } from 'vitest';
import { content } from '../src/content';
import { beatFor, funnelFrom, partAhead, sanitizeCode, wishlistUrl } from '../src/funnel';
import { msToNextPart } from '../src/engine/clock';
import { actionsFor, advancePart, choicesFor, choose, drawStory, newGame, syncClock } from '../src/engine/game';
import { FUNNEL_KEY, LocalSave } from '../src/engine/save';
import type { Content, GameState } from '../src/engine/types';

const at = (q: string) => funnelFrom(new URLSearchParams(q));

describe('1-day funnel', () => {
  describe('gating: only ?demo=1', () => {
    it('is off without ?demo, with ?full, with ?kit and with other demo lengths', () => {
      for (const q of ['', '?full', '?kit', '?demo=2', '?demo=7', '?demo=', '?demo=01', '?demo=1x', '?ref=abc', '?full&ref=abc']) {
        expect(at(q), q).toBeUndefined();
      }
    });
    it('is on for ?demo=1, also next to other parameters', () => {
      expect(at('?demo=1')).toEqual({ code: '' });
      expect(at('?full&demo=1&tgWebAppStartParam=x')).toEqual({ code: '' });
    });
  });

  describe('creator code', () => {
    it('comes from ?ref=, then ?code=', () => {
      expect(at('?demo=1&ref=tiktok_01')?.code).toBe('tiktok_01');
      expect(at('?demo=1&code=seymur')?.code).toBe('seymur');
      expect(at('?demo=1&ref=first&code=second')?.code).toBe('first');
      // an empty or fully invalid ref falls back to code
      expect(at('?demo=1&ref=%D0%BA%D0%BE%D0%B4&code=b2')?.code).toBe('b2');
    });
    it('is sanitized to [a-z0-9_], lower case, at most 32 characters', () => {
      expect(sanitizeCode('TikTok-Ruslan.01')).toBe('tiktokruslan01');
      expect(sanitizeCode('a b<script>')).toBe('abscript');
      expect(sanitizeCode('код')).toBe('');
      expect(sanitizeCode('x'.repeat(40))).toBe('x'.repeat(32));
      expect(sanitizeCode(null)).toBe('');
      expect(at(`?demo=1&ref=${'A'.repeat(50)}`)?.code).toBe('a'.repeat(32));
    });
    it('goes into the bot link, or a plain ?start without one', () => {
      expect(wishlistUrl('tiktok_01')).toBe('https://t.me/glowupchallenge30bot?start=tiktok_01');
      expect(wishlistUrl('')).toBe('https://t.me/glowupchallenge30bot?start');
    });
  });

  describe('beats point at real Day 1 cards', () => {
    it('every beat card and choice exists in content', () => {
      const pairs: [string, string][] = [['K1-01', 'coming'], ['K1-02', 'ok'], ['K1-05', 'plain'], ['K1-05', 'flirty'], ['K1-05', 'like'], ['K1-08', 'ok'], ['K1-08b', 'ok'], ['K1-08c', 'ok']];
      for (const [card, choice] of pairs) {
        const c = content.cards.find((x) => x.id === card);
        expect(c?.when?.days, card).toEqual([1, 1]);
        expect(c?.choices.some((x) => x.id === choice), `${card}/${choice}`).toBe(true);
        expect(beatFor(card, choice), `${card}/${choice}`).toBeDefined();
      }
      expect(beatFor('K1-05', 'close')).toBeUndefined();
      expect(beatFor('K1-03', 'tell')).toBeUndefined();
    });
  });

  describe('cliffhanger facts', () => {
    it('Days 2–7 have a title, and Days 1–6 a teaser for the next day', () => {
      for (let d = 2; d <= 7; d++) expect(content.days.find((x) => x.day === d)?.title, `day ${d}`).toBeTruthy();
      for (let d = 1; d <= 6; d++) expect(content.days.find((x) => x.day === d)?.teaser, `day ${d}`).toBeTruthy();
    });
    it('on Day 5 the phone rings with the crush on every Day 1 path («Через четыре дня… Это будет она»)', () => {
      const day5 = content.cards.filter((c) => c.when?.days?.[0] === 5 && /Телефон звякнул/.test(c.text ?? ''));
      // the four night cards only look at three Day 1 flags; check that each combination gets one of them
      const holds = (req: { flag?: string; set?: boolean }, f: Record<string, boolean>) =>
        req.flag === 'd5_alina_wrote' ? true : req.set === false ? !f[req.flag!] : !!f[req.flag!];
      for (const plain of [false, true]) for (const flirty of [false, true]) for (const coming of [false, true]) {
        if (plain && flirty) continue; // one first message only
        const f = { d1_wrote_plain: plain, d1_wrote_flirty: flirty, d1_said_coming: coming };
        const hit = day5.filter((c) => (c.when?.requires ?? []).every((r) => holds(r as { flag?: string; set?: boolean }, f)));
        expect(hit.length, JSON.stringify(f)).toBeGreaterThanOrEqual(1);
      }
    });
    it('the class reunion is in «Старый двор» (Day 1 invite)', () => {
      expect(content.cards.find((c) => c.id === 'K1-01')?.text).toContain('Старый двор');
    });
  });
});

describe('1-day funnel: the whole Day 1 in one sitting', () => {
  const H = 3_600_000, TZ = 240;
  // 1 June 2026, 09:00 and 14:00 in Baku (UTC+4)
  const NINE = Date.UTC(2026, 5, 1, 5, 0), TWO = NINE + 5 * H;
  // main.tsx cuts the demo after Day 1 for ?demo=1
  const one: Content = { ...content, balance: { ...content.balance, demoDays: 1 } };
  const funnel = { code: '' };
  const start = (now: number) => newGame(one, { seed: 7, now, tzOffsetMin: TZ, archetypeId: 'andrey' });
  /** every story card of the current part, first affordable choice */
  function story(s: GameState): GameState {
    for (let i = 0; i < 20; i++) {
      const d = drawStory(one, s);
      s = d.state;
      if (!d.card) break;
      s = choose(one, s, d.card.id, choicesFor(one, s, d.card).find((x) => x.affordable)!.choice.id).state;
    }
    return s;
  }
  /** the funnel's way through the day: play the part, then the «Дальше» button, the clock never moves */
  function playFunnel(now: number): GameState {
    let s = story(start(now));
    const parts = [s.part];
    for (let next = partAhead(funnel, s); next; next = partAhead(funnel, s)) {
      s = story(advancePart(one, s));
      expect(s.part).toBe(next);
      parts.push(s.part);
      // the real clock is behind the state and leaves it alone
      expect(syncClock(one, s, now)).toBe(s);
    }
    expect(s.part).toBe('night');
    expect(actionsFor(one, s).map((c) => c.id)).toContain('K1-09');
    s = choose(one, s, 'K1-09', 'sleep').state;
    expect(parts.join(' ')).toMatch(/(morning )?(day )?evening night$/);
    return s;
  }

  for (const [label, now] of [['09:00', NINE], ['14:00', TWO]] as const) {
    it(`from ${label} reaches the closed Day 1 without the clock moving`, () => {
      const s = playFunnel(now);
      expect(s.closedDay).toBe(1);
      expect(s.summaries).toHaveLength(1);
      expect(s.summaries[0]).toMatchObject({ day: 1, played: true });
      // Game.tsx: `ended` in the funnel is a closed day at the demo's last day
      expect(s.day >= one.balance.demoDays).toBe(true);
      expect(partAhead(funnel, s)).toBeUndefined();
      expect(syncClock(one, s, now)).toBe(s);
    });
  }
  it('plays the same story cards as the real-time day', () => {
    let clocked = story(start(NINE));
    for (const h of [13, 19, 23.5]) clocked = story(syncClock(one, clocked, NINE + (h - 9) * H));
    clocked = choose(one, clocked, 'K1-09', 'sleep').state;
    const fast = playFunnel(NINE);
    expect(Object.keys(fast.seen).sort()).toEqual(Object.keys(clocked.seen).sort());
    expect(fast.flags).toEqual(clocked.flags);
  });
  it('without the funnel the same 09:00 start still hits the time wall', () => {
    const s = story(start(NINE));
    expect(s.part).toBe('morning');
    expect(drawStory(one, s).card).toBeNull();
    expect(actionsFor(one, s)).toHaveLength(0);
    expect(partAhead(undefined, s)).toBeUndefined();
    expect(msToNextPart(NINE, TZ)).toBe(3 * H);
    expect(syncClock(one, s, NINE + H)).toBe(s);
  });
  it('gives no button at night, after the day is closed or past the funnel', () => {
    const s = story(start(NINE));
    expect(partAhead(funnel, s)).toBe('day');
    expect(partAhead(funnel, { ...s, part: 'night' })).toBeUndefined();
    expect(partAhead(funnel, { ...s, closedDay: 1 })).toBeUndefined();
    expect(advancePart(one, { ...s, part: 'night' }).part).toBe('night');
  });
  it('keeps its own save, so the real-time game never loads a funnel day', () => {
    const mem = new Map<string, string>();
    const g = globalThis as { localStorage?: unknown };
    const prev = g.localStorage;
    g.localStorage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => mem.set(k, v), removeItem: (k: string) => mem.delete(k) };
    try {
      const normal = start(NINE);
      new LocalSave().save(normal);
      new LocalSave(FUNNEL_KEY).save(advancePart(one, advancePart(one, story(start(NINE)))));
      const back = new LocalSave().load()!;
      expect(back.part).toBe('morning');
      expect(back).toEqual(normal);
      expect(new LocalSave(FUNNEL_KEY).load()!.part).toBe('evening');
      expect(FUNNEL_KEY).not.toBe('glowup.save.v2');
    } finally { g.localStorage = prev; }
  });
});
