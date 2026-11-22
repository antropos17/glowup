// npm run check:content — проверяет папку content/ без запуска игры.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { validateContent } from '../src/engine/validate';
import type { Content } from '../src/engine/types';

const dir = join(import.meta.dirname, '..', 'content');
const read = (f: string) => JSON.parse(readFileSync(join(dir, f), 'utf8'));
const content = {
  balance: read('balance.json'), days: read('days.json'), problems: read('problems.json'), archetypes: read('archetypes.json'),
  crushes: read('crushes.json'), tastes: read('tastes.json'), items: read('items.json'),
  chat: read('chat.json'), hints: read('hints.json'), rumors: read('rumors.json'),
  cards: readdirSync(join(dir, 'cards')).filter((f) => f.endsWith('.json')).flatMap((f) => read(join('cards', f))),
} as Content;

const errors = validateContent(content);
const byKind = content.cards.reduce<Record<string, number>>((a, c) => ((a[c.kind] = (a[c.kind] ?? 0) + 1), a), {});
console.log(`Карточек: ${content.cards.length}`, byKind, `архетипов: ${content.archetypes.length}, крашей: ${content.crushes.length}`);
if (errors.length) { console.error(`\nОшибок: ${errors.length}`); errors.forEach((e) => console.error(' - ' + e)); process.exit(1); }
console.log('Контент в порядке.');
