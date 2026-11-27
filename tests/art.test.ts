import { describe, expect, it } from 'vitest';
import { content } from '../src/content';
import { castLook } from '../src/art/cast';
import { hasItemArt, itemSvg } from '../src/art/items';
import { SCENES, sceneFor, sceneSvg } from '../src/art/scenes';

const demoCards = content.cards.filter((c) => (c.when?.days?.[0] ?? 1) <= content.balance.demoDays);

describe('illustrations', () => {
  it('gives every demo card a scene of its own, not the room fallback', () => {
    const fallback = demoCards.filter((c) => sceneFor(c) === 'room').map((c) => c.id);
    expect(fallback).toEqual([]);
  });

  it('puts the crush on the phone when she writes and in the café when she speaks in person', () => {
    expect(sceneFor({ title: '{crush} пишет', kind: 'story', speaker: 'crush', says: 'x' })).toBe('crushPhone');
    expect(sceneFor({ title: '{crush} у окна', kind: 'story', speaker: 'crush' })).toBe('cafe');
  });

  it('draws every scene as svg without external references', () => {
    for (const id of SCENES) {
      const svg = sceneSvg(id, { part: 'night' });
      expect(svg.startsWith('<svg')).toBe(true);
      expect(svg).not.toMatch(/href=|url\(http/);
    }
  });

  it('has a picture for every item in content', () => {
    for (const it of content.items) {
      expect(hasItemArt(it.id), it.id).toBe(true);
      expect(itemSvg(it.id)).toContain('<svg');
    }
  });

  it('has a face for every named speaker of the demo', () => {
    const named = new Set(demoCards.map((c) => c.speaker).filter((s): s is string => !!s && s !== 'crush' && s !== 'Лента'));
    expect([...named].filter((s) => !castLook(s))).toEqual([]);
  });
});
