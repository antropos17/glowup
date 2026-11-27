import { describe, expect, it } from 'vitest';
import { content } from '../src/content';
import { beatFor, funnelFrom, sanitizeCode, wishlistUrl } from '../src/funnel';

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
    it('on Day 5 the crush writes first on every Day 1 path («Через четыре дня… она напишет первой»)', () => {
      const day5 = content.cards.filter((c) => c.when?.days?.[0] === 5 && /написала первой/.test(c.text ?? ''));
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
