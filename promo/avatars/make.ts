/**
 * Profile pictures for the game's social accounts (TikTok, YouTube, VK, Telegram).
 * The hero is drawn by the game's own `portraitInner`; his looks come from the engine's `currentLook`
 * with the real archetype and problem definitions from `content/`.
 *
 * Run: npm run promo:avatars
 * Writes SVG + PNG (1024 and 400) for each avatar and a preview sheet to promo/avatars/out/.
 * PNG rendering uses playwright-core with the browser already installed (Edge, else Chrome).
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { portraitInner, type Look } from '../../src/art/avatar';
import { currentLook } from '../../src/engine/game';
import type { Content, GameState } from '../../src/engine/types';
import archetypes from '../../content/archetypes.json';
import problems from '../../content/problems.json';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const out = join(root, 'promo/avatars/out');

// ---------- the hero's two looks ----------

const c = { archetypes, problems } as unknown as Content;
const andrey = archetypes.find((a) => a.id === 'andrey')!;
const s = { archetypeId: andrey.id, problems: andrey.problems, lookPatch: {} } as unknown as GameState;

/** Day 1: the archetype at its starting problem levels. */
const before: Look = currentLook(c, s, andrey.problems, {});
/**
 * Every problem solved, shaved (Day 14), in the blue of the game's new top. Promo liberties asked by Ruslan
 * (2026-11-27), not in the game: a rich look, a black suit over a white shirt, fuller hair, gold-framed sunglasses,
 * slimmer than the engine's weight 50, a confident smile.
 */
const solved = Object.fromEntries(Object.keys(andrey.problems).map((k) => [k, 0]));
const after: Look = currentLook(c, s, solved, {
  facial: 'none', razorBurn: false, glasses: 'thin', neckline: 'lapel', topColor: '#1C1F26',
  hair: 'side', weight: 35, mood: 90,
});

/** The game has no sunglasses: restyle the drawn thin frames as dark lenses in a gold frame. */
const GOLD = '#D9A520';
function sunglasses(svg: string) {
  return svg
    .replace('fill="#fff" fill-opacity=".14" stroke="#6B7384" stroke-width="2"><rect x="63" y="92" width="32" height="23" rx="9"/><rect x="105" y="92" width="32" height="23" rx="9"/>',
      `fill="#15181F" stroke="${GOLD}" stroke-width="2.6"><path d="M 60 93 H 96 V 104 Q 96 119 81 119 Q 62 119 60 104 Z"/><path d="M 104 93 H 140 V 104 Q 138 119 119 119 Q 104 119 104 104 Z"/>` +
      `<path d="M 66 98 L 74 98 M 110 98 L 118 98" stroke="#fff" stroke-opacity=".55" stroke-width="2.4" stroke-linecap="round"/>`)
    .replace(/stroke="#6B7384" stroke-width="2" fill="none"/, `stroke="${GOLD}" stroke-width="2.6" fill="none"`);
}

// ---------- palette (src/styles/game.css) ----------

const INK = '#14233B', MINT_DEEP = '#0A7468', RASP = '#DE3A6B', RASP_DEEP = '#C42A5A';
const NOTE = '#FFD25E', MORNING = '#FFE3A8';

// ---------- font: Unbounded, embedded so the SVG files stand alone ----------

const fontDir = join(root, 'node_modules/@fontsource-variable/unbounded/files');
const face = (file: string, range: string) =>
  `@font-face{font-family:'Unbounded';font-weight:200 900;unicode-range:${range};` +
  `src:url(data:font/woff2;base64,${readFileSync(join(fontDir, file)).toString('base64')}) format('woff2')}`;
const FONT_CSS =
  face('unbounded-latin-wght-normal.woff2', 'U+0000-00FF') +
  face('unbounded-cyrillic-wght-normal.woff2', 'U+0400-045F');

// ---------- avatars, all in a 1024 box; the important part stays inside r = 410 (80% of the side) ----------

const S = 1024, C = S / 2;

/** The portrait placed so the face fills the middle of the circle. Portrait coordinates are 200×226. */
function hero(look: Look, scale = 4.3, dy = 30, cx = 100, cy = 112) {
  return `<g transform="translate(${C - cx * scale} ${C - cy * scale + dy}) scale(${scale})">${sunglasses(portraitInner(look))}</g>`;
}

const radial = (id: string, inner: string, outer: string) =>
  `<radialGradient id="${id}" cx="50%" cy="42%" r="62%"><stop offset="0" stop-color="${inner}"/><stop offset="1" stop-color="${outer}"/></radialGradient>`;

const svg = (defs: string, body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" width="${S}" height="${S}">` +
  `<defs><style>${FONT_CSS}</style>${defs}</defs>${body}</svg>`;

const HEART = 'M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0112 7.5a4.3 4.3 0 017.5 2.3C19.5 15.4 12 20 12 20z';

const avatars: Record<string, string> = {
  // 1. «до»: Day 1 Andrey on the mint accent
  '1-do': svg(radial('bg', '#2FC0AC', MINT_DEEP), `<rect width="${S}" height="${S}" fill="url(#bg)"/>${hero(before)}`),

  // 2. «после»: the same hero solved, on a warm background
  '2-posle': svg(radial('bg', '#FFE9A8', GOLD), `<rect width="${S}" height="${S}" fill="url(#bg)"/>${hero(after)}`),

  // 3. logo mark: «КРАШ ЗА 30 ДНЕЙ», a heart and the chance meter
  '3-logo': svg(
    radial('bg', RASP, RASP_DEEP),
    `<rect width="${S}" height="${S}" fill="url(#bg)"/>` +
      `<g transform="translate(${C - 62} 128) scale(5.2)"><path d="${HEART}" fill="${NOTE}"/></g>` +
      `<text x="${C}" y="330" text-anchor="middle" font-family="Unbounded" font-weight="800" font-size="92" letter-spacing="2" fill="#fff">КРАШ ЗА</text>` +
      `<text x="${C + 7}" y="640" text-anchor="middle" font-family="Unbounded" font-weight="900" font-size="330" letter-spacing="-12" fill="#fff">30</text>` +
      `<text x="${C}" y="768" text-anchor="middle" font-family="Unbounded" font-weight="800" font-size="92" letter-spacing="2" fill="#fff">ДНЕЙ</text>` +
      `<rect x="${C - 220}" y="804" width="440" height="48" rx="24" fill="#fff" fill-opacity=".28"/>` +
      `<rect x="${C - 220}" y="804" width="308" height="48" rx="24" fill="${NOTE}"/>`,
  ),

  // 4. split: one face, left half Day 1, right half solved, a thin white divider
  '4-split': svg(
    radial('bgL', '#2FC0AC', MINT_DEEP) + radial('bgR', '#FFE9A8', GOLD) +
      `<clipPath id="L"><rect width="${C}" height="${S}"/></clipPath><clipPath id="R"><rect x="${C}" width="${C}" height="${S}"/></clipPath>`,
    `<g clip-path="url(#L)"><rect width="${S}" height="${S}" fill="url(#bgL)"/>${hero(before, 3.9, 140)}</g>` +
      `<g clip-path="url(#R)"><rect width="${S}" height="${S}" fill="url(#bgR)"/>${hero(after, 3.9, 140)}</g>` +
      `<rect x="${C - 5}" width="10" height="${S}" fill="#fff"/>` +
      `<text x="${C - 40}" y="292" text-anchor="end" font-family="Unbounded" font-weight="800" font-size="56" fill="#fff">до</text>` +
      `<text x="${C + 40}" y="292" font-family="Unbounded" font-weight="800" font-size="56" fill="${INK}">после</text>`,
  ),
};

// ---------- render ----------

mkdirSync(out, { recursive: true });

async function launch() {
  for (const channel of ['msedge', 'chrome']) {
    try { return await chromium.launch({ channel }); } catch { /* try the next one */ }
  }
  throw new Error('No Edge or Chrome found for playwright-core');
}

const browser = await launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });

async function shot(html: string, w: number, h: number, file: string) {
  await page.setViewportSize({ width: w, height: h });
  await page.setContent(`<!doctype html><style>html,body{margin:0}</style>${html}`);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: file, clip: { x: 0, y: 0, width: w, height: h } });
}

const png400: Record<string, string> = {};
for (const [name, code] of Object.entries(avatars)) {
  writeFileSync(join(out, `${name}.svg`), code);
  for (const size of [1024, 400]) {
    const file = join(out, `${name}-${size}.png`);
    await shot(code.replace(`width="${S}" height="${S}"`, `width="${size}" height="${size}" style="display:block"`), size, size, file);
    if (size === 400) png400[name] = `data:image/png;base64,${readFileSync(file).toString('base64')}`;
  }
}

// preview: each avatar circle-cropped at 48 and 110 px on light and dark, plus a 220 px guide of the inner circle
const row = (bg: string, fg: string, label: string) =>
  `<div style="background:${bg};color:${fg};padding:18px 24px;display:flex;align-items:center;gap:28px">` +
  `<b style="width:70px;font:600 13px system-ui">${label}</b>` +
  Object.values(png400).map((src) =>
    `<div style="display:flex;align-items:center;gap:14px"><img src="${src}" width="48" height="48" style="border-radius:50%">` +
    `<img src="${src}" width="110" height="110" style="border-radius:50%"></div>`).join('') + '</div>';
const guide =
  `<div style="background:#fff;padding:18px 24px;display:flex;gap:28px;align-items:center"><b style="width:70px;font:600 13px system-ui">80%</b>` +
  Object.values(png400).map((src) =>
    `<div style="position:relative;width:220px;height:220px"><img src="${src}" width="220" height="220" style="border-radius:50%">` +
    `<div style="position:absolute;inset:22px;border-radius:50%;border:2px dashed #000"></div></div>`).join('') + '</div>';
const sheet = row('#FFFFFF', '#14233B', 'светлый') + row('#121318', '#E8EFF1', 'тёмный') + guide;
await shot(sheet, 1100, 2 * 146 + 256, join(out, 'preview.png'));

await browser.close();
console.log('written to', out);
