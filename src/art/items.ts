/**
 * Pictures of shop items and small spot illustrations for empty screens, drawn in code.
 * Items are keyed by the item id from `content/items.json`; an item without a picture keeps its icon.
 */

const INK = '#14233B', SOFT = '#55637B', PAPER = '#FFFFFF', LINE = '#D5E0E3';
const MINT = '#10A391', MINT_L = '#9FD8CF', RASP = '#DE3A6B', NOTE = '#FFD25E';

const rect = (x: number, y: number, w: number, h: number, fill: string, rx = 0, extra = '') =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}"${extra}/>`;
const circle = (cx: number, cy: number, r: number, fill: string, extra = '') => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"${extra}/>`;
const path = (d: string, stroke: string, w = 2.5, extra = '') =>
  `<path d="${d}" stroke="${stroke}" stroke-width="${w}" fill="none" stroke-linecap="round" stroke-linejoin="round"${extra}/>`;
const sparkle = (x: number, y: number, s: number, c = NOTE) =>
  `<path d="M ${x} ${y - 5 * s} q ${s} ${4 * s} ${5 * s} ${5 * s} q ${-4 * s} ${s} ${-5 * s} ${5 * s} q ${-s} ${-4 * s} ${-5 * s} ${-5 * s} q ${4 * s} ${-s} ${5 * s} ${-5 * s} z" fill="${c}"/>`;

/** 64×64 pictures, one per item id. */
const ITEMS: Record<string, string> = {
  gum:
    rect(10, 20, 44, 26, MINT, 6) + rect(10, 28, 44, 10, PAPER, 0, ' opacity=".9"') + rect(18, 14, 8, 10, '#F6C8D5', 2) + rect(30, 12, 8, 12, '#F6C8D5', 2) +
    circle(46, 33, 3, MINT),
  acne_patch:
    rect(12, 10, 40, 44, '#F3F6F8', 6) + rect(12, 10, 40, 8, MINT_L, 4) + rect(12, 14, 40, 4, MINT_L) +
    [[24, 28], [40, 28], [24, 42], [40, 42]].map(([x, y], i) => circle(x, y, 6, i === 3 ? PAPER : '#E2F2F6', ` stroke="${LINE}" stroke-width="1.5"`)).join(''),
  floss:
    circle(32, 34, 18, PAPER, ` stroke="${LINE}" stroke-width="2"`) + `<path d="M 14 30 a 18 18 0 0 1 36 0 z" fill="${MINT}"/>` + circle(32, 38, 5, '#E2F2F6') +
    path('M 48 32 q 8 -2 10 -12', '#BFE4F6', 1.6),
  gym_pass:
    `<g transform="rotate(-8 32 32)">${rect(6, 16, 52, 32, MINT, 6)}${rect(6, 22, 52, 6, '#0A7468')}` +
    `${path('M 18 38 v 6 M 22 36 v 10 M 42 36 v 10 M 46 38 v 6 M 22 41 h 20', PAPER, 2.6)}</g>`,
  cream_zina:
    `<path d="M 18 12 h 28 l -4 36 h -20 z" fill="#F7E6CC"/>` + rect(24, 48, 16, 8, SOFT, 2) +
    path('M 24 24 q 4 -3 8 0 t 8 0 M 25 31 q 3 -2 6 0', '#A87A4F', 1.6),
  cream_premium:
    rect(14, 30, 36, 24, PAPER, 6, ` stroke="${LINE}" stroke-width="2"`) + rect(12, 22, 40, 10, RASP, 4) + rect(22, 38, 20, 8, '#FBE4EB', 3) +
    sparkle(50, 14, 1.2) + sparkle(14, 16, 0.7),
  frame:
    `<g fill="#FFFFFF" fill-opacity=".5" stroke="${INK}" stroke-width="3"><rect x="6" y="22" width="22" height="18" rx="7"/><rect x="36" y="22" width="22" height="18" rx="7"/></g>` +
    path('M 28 30 q 4 -3 8 0', INK, 3) + path('M 10 28 l 4 -4 M 40 28 l 4 -4', PAPER, 2) + sparkle(54, 12, 0.8, MINT_L),
  haircut:
    rect(8, 40, 40, 8, SOFT, 3) + Array.from({ length: 8 }, (_, i) => rect(10 + i * 4.6, 46, 2, 8, SOFT, 1)).join('') +
    circle(42, 14, 6, 'none', ` stroke="${INK}" stroke-width="3"`) + circle(54, 24, 6, 'none', ` stroke="${INK}" stroke-width="3"`) +
    path('M 46 18 L 24 34 M 49 21 L 28 38', INK, 3),
  shirt:
    `<path d="M 22 10 L 8 18 l 6 12 l 6 -3 V 56 h 24 V 27 l 6 3 l 6 -12 L 42 10 q -10 8 -20 0 z" fill="#BFE4F6"/>` +
    `<path d="M 22 10 l 10 10 l 10 -10 l -4 12 h -12 z" fill="${PAPER}"/>` + path('M 32 22 V 54', '#8FB8D0', 1.6) +
    circle(32, 30, 1.6, '#8FB8D0') + circle(32, 40, 1.6, '#8FB8D0'),
};

export const hasItemArt = (id: string) => id in ITEMS;
export const ITEM_ART_IDS = Object.keys(ITEMS);

export function itemSvg(id: string, size = 56): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="${size}" height="${size}" aria-hidden="true">${ITEMS[id] ?? ''}</svg>`;
}

// ---------- spots for empty screens, 120×72 ----------

export type SpotName = 'journal' | 'chat' | 'feed' | 'notes' | 'shop' | 'rest';
export const SPOTS: SpotName[] = ['journal', 'chat', 'feed', 'notes', 'shop', 'rest'];

const SPOT: Record<SpotName, string> = {
  journal:
    `<g transform="rotate(-6 60 36)">${rect(34, 10, 52, 56, PAPER, 5)}${rect(34, 10, 8, 56, RASP, 4)}` +
    [22, 32, 42].map((y) => rect(48, y, 30, 3, LINE, 1.5)).join('') + `</g>` +
    circle(90, 54, 11, MINT) + path('M 90 49 v 10 M 85 54 h 10', PAPER, 2.8),
  chat:
    rect(18, 12, 54, 22, PAPER, 11) + `<path d="M 26 32 l -4 8 l 10 -6 z" fill="${PAPER}"/>` + circle(34, 23, 2.2, SOFT) + circle(43, 23, 2.2, SOFT) + circle(52, 23, 2.2, SOFT) +
    rect(50, 40, 52, 20, '#C42A5A', 10) + `<path d="M 94 58 l 6 8 l -14 -6 z" fill="#C42A5A"/>` +
    `<path d="M 76 56 c -7 -4 -9 -8 -6 -11 c 2 -2 5 -1 6 1 c 1 -2 4 -3 6 -1 c 3 3 1 7 -6 11 z" fill="${PAPER}"/>`,
  feed:
    `<g transform="translate(24 10) scale(2.2)">${path('M 4 10 v 4 l 2 .5 1.5 5 h 2.5 l -1 -4.5 L 18 18 V 6 L 6 9.5 z', SOFT, 1.6)}</g>` +
    path('M 74 26 q 6 -4 10 -10 M 76 36 h 12 M 74 46 q 6 4 10 10', '#E0B23A', 2.6),
  notes:
    `<g transform="rotate(4 60 36)">${rect(36, 10, 48, 48, NOTE, 3)}${rect(36, 54, 48, 4, '#E0B23A', 2)}` +
    [22, 31, 40].map((y, i) => rect(44, y, i === 2 ? 20 : 32, 3, '#E0B23A', 1.5)).join('') + `</g>` +
    `<path d="M 78 8 l 4 14 l -6 0 z" fill="${RASP}"/>`,
  shop:
    `<path d="M 36 26 h 48 l -4 40 h -40 z" fill="${MINT}"/>` + path('M 48 26 v -6 a 12 12 0 0 1 24 0 v 6', '#0A7468', 3) +
    rect(52, 38, 16, 14, NOTE, 2) + rect(58, 38, 4, 14, RASP) + rect(52, 43, 16, 4, RASP) +
    sparkle(92, 18, 1) + sparkle(28, 22, 0.7, MINT_L),
  rest:
    `<path d="M 72 14 a 20 20 0 1 0 18 28 a 16 16 0 1 1 -18 -28 z" fill="${NOTE}"/>` +
    circle(30, 20, 1.6, SOFT) + circle(98, 14, 1.6, SOFT) + circle(22, 46, 1.4, SOFT) +
    `<g fill="${SOFT}" font-family="Unbounded Variable, system-ui, sans-serif" font-weight="700" class="sc-float"><text x="34" y="44" font-size="11">z</text><text x="44" y="34" font-size="8">z</text></g>`,
};

export function spotSvg(name: SpotName): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 72" width="120" height="72" aria-hidden="true">${SPOT[name]}</svg>`;
}

/** The night window behind the hero on the day-end card, 96×110 like the frame. */
export function nightWindowSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 110" preserveAspectRatio="xMidYMid slice" aria-hidden="true">` +
    rect(0, 0, 96, 110, '#DDE4F0') + rect(14, 8, 68, 54, PAPER, 4) + rect(18, 12, 60, 46, '#26365C', 2) +
    circle(60, 26, 7, '#F4F6F8') + circle(63, 24, 6, '#26365C') + circle(30, 22, 1.2, '#F4F6F8') + circle(40, 40, 1.1, '#F4F6F8') + circle(70, 46, 1.1, '#F4F6F8') +
    rect(46.5, 12, 3, 46, PAPER) + rect(8, 4, 14, 64, '#9FD8CF', 4) + rect(74, 4, 14, 64, '#9FD8CF', 4) + `</svg>`;
}
