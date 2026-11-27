// Draws the hero and the crush with the game's own engine (currentLook + avatar.ts)
// and writes the SVGs into each short's assets/ folder.
// Run: npx tsx promo/shorts/tools/hero.ts
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { bodySvg, portraitSvg, type Look } from '../../../src/art/avatar';
import { currentLook } from '../../../src/engine/game';
import type { Content, GameState } from '../../../src/engine/types';
import archetypes from '../../../content/archetypes.json';
import crushes from '../../../content/crushes.json';
import problems from '../../../content/problems.json';

const here = dirname(fileURLToPath(import.meta.url));
const c = { archetypes, crushes, problems } as unknown as Content;
const andrey = archetypes[0];

const lookAt = (levels: Record<string, number>, patch: Partial<Look> = {}) =>
  currentLook(c, { archetypeId: 'andrey', problems: levels, lookPatch: patch } as unknown as GameState);

// Day 1: the archetype's starting levels, exactly as the game starts.
const day1 = lookAt(andrey.problems);
// Day 7: an illustrative state after a week of good choices (levels invented for the ad),
// wearing what Day 6–7 cards really give: the market shirt, the round frame, a clean shave.
const day7 = lookAt(
  { weight: 74, skin: 50, teeth: 58, style: 45, care: 35, conf: 58 },
  { topColor: '#4A6FA5', neckline: 'v', glasses: 'round', facial: 'none', mood: 72 },
);
const alina = { ...(crushes[0].look as Look) };

const out = (short: string, name: string, svg: string) => {
  const dir = join(here, '..', short, 'assets');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, name), svg);
};

out('chat', 'alina.svg', portraitSvg(alina, { size: 200 }));
out('chat', 'andrey.svg', portraitSvg(day1, { size: 200 }));
out('feed', 'andrey.svg', portraitSvg(day1, { size: 200 }));
out('feed', 'andrey-sad.svg', portraitSvg({ ...day1, mood: 30 }, { size: 200 }));
out('pov', 'body-day1.svg', bodySvg(day1, { height: 440 }));
out('pov', 'body-day7.svg', bodySvg(day7, { height: 440 }));
out('pov', 'portrait-day1.svg', portraitSvg(day1, { size: 200 }));
console.log('hero SVGs written');
