/**
 * Description picture of the Telegram bot (BotFather → Edit Bot → Edit Description Picture), 640×360.
 * Same hero and palette as promo/avatars/make.ts: Day 1 Andrey on mint, the solved look on gold, the name «Glow Up: челлендж 30 дней».
 *
 * Run: npx tsx promo/botfather/make.ts
 * Writes description.svg and description.png (640×360) to promo/botfather/.
 * PNG rendering uses playwright-core with the browser already installed (Edge, else Chrome).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { portraitInner, type Look } from '../../src/art/avatar';
import { currentLook } from '../../src/engine/game';
import type { Content, GameState } from '../../src/engine/types';
import archetypes from '../../content/archetypes.json';
import problems from '../../content/problems.json';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const out = join(root, 'promo/botfather');

// ---------- the hero's two looks, as in promo/avatars/make.ts ----------

const c = { archetypes, problems } as unknown as Content;
const andrey = archetypes.find((a) => a.id === 'andrey')!;
const s = { archetypeId: andrey.id, problems: andrey.problems, lookPatch: {} } as unknown as GameState;
const before: Look = currentLook(c, s, andrey.problems, {});
const solved = Object.fromEntries(Object.keys(andrey.problems).map((k) => [k, 0]));
const after: Look = currentLook(c, s, solved, {
  facial: 'none', razorBurn: false, glasses: 'thin', neckline: 'lapel', topColor: '#1C1F26',
  hair: 'side', weight: 35, mood: 90,
});
const GOLD = '#D9A520';
function sunglasses(svg: string) {
  return svg
    .replace('fill="#fff" fill-opacity=".14" stroke="#6B7384" stroke-width="2"><rect x="63" y="92" width="32" height="23" rx="9"/><rect x="105" y="92" width="32" height="23" rx="9"/>',
      `fill="#15181F" stroke="${GOLD}" stroke-width="2.6"><path d="M 60 93 H 96 V 104 Q 96 119 81 119 Q 62 119 60 104 Z"/><path d="M 104 93 H 140 V 104 Q 138 119 119 119 Q 104 119 104 104 Z"/>` +
      `<path d="M 66 98 L 74 98 M 110 98 L 118 98" stroke="#fff" stroke-opacity=".55" stroke-width="2.4" stroke-linecap="round"/>`)
    .replace(/stroke="#6B7384" stroke-width="2" fill="none"/, `stroke="${GOLD}" stroke-width="2.6" fill="none"`);
}

// ---------- palette (src/styles/game.css) and fonts ----------

const INK = '#14233B', MINT_DEEP = '#0A7468', RASP = '#DE3A6B', RASP_DEEP = '#C42A5A', NOTE = '#FFD25E';

const font = (family: string, dir: string, prefix: string) => {
  const face = (file: string, range: string) =>
    `@font-face{font-family:'${family}';font-weight:200 900;unicode-range:${range};` +
    `src:url(data:font/woff2;base64,${readFileSync(join(root, 'node_modules/@fontsource-variable', dir, 'files', file)).toString('base64')}) format('woff2')}`;
  return face(`${prefix}-latin-wght-normal.woff2`, 'U+0000-00FF') + face(`${prefix}-cyrillic-wght-normal.woff2`, 'U+0400-045F');
};
const FONT_CSS = font('Unbounded', 'unbounded', 'unbounded') + font('Golos Text', 'golos-text', 'golos-text');

// ---------- picture: a before/after card on the left, the name on the right ----------

const W = 640, H = 360;
const CARD = { x: 28, y: 28, w: 270, h: 304 };
const HALF = CARD.x + CARD.w / 2;
const HEART = 'M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0112 7.5a4.3 4.3 0 017.5 2.3C19.5 15.4 12 20 12 20z';
const radial = (id: string, inner: string, outer: string) =>
  `<radialGradient id="${id}" cx="50%" cy="42%" r="70%"><stop offset="0" stop-color="${inner}"/><stop offset="1" stop-color="${outer}"/></radialGradient>`;

/** Portrait coordinates are 200×226; the face sits in the middle of the card. */
const hero = (look: Look) => {
  const k = 1.42;
  return `<g transform="translate(${CARD.x + CARD.w / 2 - 100 * k} ${CARD.y + CARD.h - 226 * k + 6}) scale(${k})">${sunglasses(portraitInner(look))}</g>`;
};

const svg =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">` +
  `<defs><style>${FONT_CSS}</style>` +
  radial('bg', RASP, RASP_DEEP) + radial('bgL', '#2FC0AC', MINT_DEEP) + radial('bgR', '#FFE9A8', GOLD) +
  `<clipPath id="card"><rect x="${CARD.x}" y="${CARD.y}" width="${CARD.w}" height="${CARD.h}" rx="26"/></clipPath>` +
  `<clipPath id="L"><rect x="0" y="0" width="${HALF}" height="${H}"/></clipPath>` +
  `<clipPath id="R"><rect x="${HALF}" y="0" width="${W - HALF}" height="${H}"/></clipPath></defs>` +
  `<rect width="${W}" height="${H}" fill="url(#bg)"/>` +
  `<g clip-path="url(#card)">` +
  `<g clip-path="url(#L)"><rect width="${W}" height="${H}" fill="url(#bgL)"/>${hero(before)}</g>` +
  `<g clip-path="url(#R)"><rect width="${W}" height="${H}" fill="url(#bgR)"/>${hero(after)}</g>` +
  `<rect x="${HALF - 2}" y="0" width="4" height="${H}" fill="#fff"/></g>` +
  `<text x="${HALF - 14}" y="${CARD.y + 34}" text-anchor="end" font-family="Unbounded" font-weight="800" font-size="19" fill="#fff">до</text>` +
  `<text x="${HALF + 14}" y="${CARD.y + 34}" font-family="Unbounded" font-weight="800" font-size="19" fill="${INK}">после</text>` +
  // the name
  `<g transform="translate(330 30) scale(1.7)"><path d="${HEART}" fill="${NOTE}"/></g>` +
  `<text x="330" y="102" font-family="Unbounded" font-weight="900" font-size="36" fill="#fff">GLOW UP:</text>` +
  `<text x="330" y="140" font-family="Unbounded" font-weight="800" font-size="31" fill="${NOTE}">ЧЕЛЛЕНДЖ</text>` +
  `<text x="326" y="218" font-family="Unbounded" font-weight="900" font-size="82" letter-spacing="-3" fill="#fff">30</text>` +
  `<text x="480" y="218" font-family="Unbounded" font-weight="800" font-size="34" fill="#fff">ДНЕЙ</text>` +
  // the chance meter, as on the logo avatar
  `<rect x="330" y="236" width="280" height="16" rx="8" fill="#fff" fill-opacity=".28"/>` +
  `<rect x="330" y="236" width="196" height="16" rx="8" fill="${NOTE}"/>` +
  `<text x="330" y="288" font-family="Golos Text" font-weight="600" font-size="19" fill="#fff">Приведи героя в форму</text>` +
  `<text x="330" y="314" font-family="Golos Text" font-weight="600" font-size="19" fill="#fff">и понравься крашу за месяц</text>` +
  `</svg>`;

// ---------- render ----------

async function launch() {
  for (const channel of ['msedge', 'chrome']) {
    try { return await chromium.launch({ channel }); } catch { /* try the next one */ }
  }
  throw new Error('No Edge or Chrome found for playwright-core');
}

writeFileSync(join(out, 'description.svg'), svg);
const browser = await launch();
const page = await browser.newPage({ deviceScaleFactor: 1, viewport: { width: W, height: H } });
await page.setContent(`<!doctype html><style>html,body{margin:0}svg{display:block}</style>${svg}`);
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: join(out, 'description.png'), clip: { x: 0, y: 0, width: W, height: H } });
await browser.close();
console.log('written to', out);
