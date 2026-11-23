// Random players over days 1–7: every story card answered with a uniformly random affordable choice.
// Prints the share of each Day 7 evening tone (flag d7_msg) and the d7_scene distribution.
// Usage: npx tsx scripts/sim-day7-tone.ts [runs=10000] [seed=2026] [skipChance=0]
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { choicesFor, choose, drawStory, newGame, syncClock } from '../src/engine/game';
import type { Content, GameState } from '../src/engine/types';

// same loader as check-content.ts: src/content uses import.meta.glob, which needs Vite
const dir = join(import.meta.dirname, '..', 'content');
const read = (f: string) => JSON.parse(readFileSync(join(dir, f), 'utf8'));
const content = {
  balance: read('balance.json'), days: read('days.json'), problems: read('problems.json'), archetypes: read('archetypes.json'),
  crushes: read('crushes.json'), tastes: read('tastes.json'), items: read('items.json'),
  chat: read('chat.json'), hints: read('hints.json'), rumors: read('rumors.json'),
  cards: readdirSync(join(dir, 'cards')).filter((f) => f.endsWith('.json')).sort().flatMap((f) => read(join('cards', f))),
} as Content;

const [runs = 10000, seed = 2026, skip = 0] = process.argv.slice(2).map(Number);
const H = 3_600_000, TZ = 240, START = Date.UTC(2026, 5, 1, 5, 0);
const at = (hour: number) => START + (hour - 9) * H;

function mulberry32(a: number) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(seed);

function story(s: GameState): GameState {
  for (let i = 0; i < 30; i++) {
    const d = drawStory(content, s);
    s = d.state;
    if (!d.card) break;
    const ok = choicesFor(content, s, d.card).filter((x) => x.affordable);
    s = choose(content, s, d.card.id, ok[Math.floor(rnd() * ok.length)].choice.id).state;
  }
  return s;
}

const tones: Record<string, number> = {};
const scene: Record<string, number> = {};
for (let r = 0; r < runs; r++) {
  let s = newGame(content, { seed: r + 1, now: START, tzOffsetMin: TZ, archetypeId: 'andrey' });
  for (let day = 1; day <= 7; day++) {
    const played = day === 1 || rnd() >= skip; // Day 1 is always played
    for (const h of [9, 13, 19, 23.5]) {
      s = syncClock(content, s, at(h + 24 * (day - 1)));
      if (played) s = story(s);
    }
  }
  s = syncClock(content, s, at(9 + 24 * 7)); // close Day 7 so a skipped evening resolves itself
  const t = String(s.flags.d7_msg?.value ?? 'none');
  tones[t] = (tones[t] ?? 0) + 1;
  const k = String(s.counters?.d7_scene ?? 0);
  scene[k] = (scene[k] ?? 0) + 1;
}
const pct = (n: number) => `${((100 * n) / runs).toFixed(1)}%`;
console.log(`runs ${runs}, seed ${seed}, skip ${skip}`);
console.log('tone', Object.fromEntries(Object.entries(tones).map(([k, v]) => [k, pct(v)])));
console.log('d7_scene', Object.fromEntries(Object.entries(scene).sort((a, b) => +a[0] - +b[0]).map(([k, v]) => [k, pct(v)])));
