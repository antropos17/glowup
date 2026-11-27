/**
 * Scene banners for cards, drawn in code like the hero. One viewBox 320×80, flat fills, no outlines,
 * the palette of game.css. The banner is shown with `preserveAspectRatio="xMidYMid slice"`, so its
 * height can change with the screen: keep what matters between y 12 and y 70.
 *
 * Which scene a card gets is derived from data the card already has (title, speaker, kind, `says`),
 * see `sceneFor`. Cards without a match get the hero's room.
 */
import { portraitInner, type Look } from './avatar';

export type Part = 'morning' | 'day' | 'evening' | 'night';
export type SceneId =
  | 'room' | 'bed' | 'couch' | 'bathroom' | 'kitchen' | 'balcony' | 'park' | 'gym' | 'clinic' | 'office'
  | 'pharmacy' | 'street' | 'cafe' | 'bbq' | 'job' | 'phone' | 'crushPhone' | 'feed' | 'call';

export const SCENES: SceneId[] = [
  'room', 'bed', 'couch', 'bathroom', 'kitchen', 'balcony', 'park', 'gym', 'clinic', 'office',
  'pharmacy', 'street', 'cafe', 'bbq', 'job', 'phone', 'crushPhone', 'feed', 'call',
];

// ---------- palette (game.css tokens) ----------
const INK = '#14233B', SOFT = '#55637B', PAPER = '#FFFFFF', TILE = '#E8EFF1', LINE = '#D5E0E3';
const MINT = '#10A391', RASP = '#DE3A6B', NOTE = '#FFD25E', WOOD = '#C99B6D', WOOD_D = '#A87A4F';
const LEAF = '#7CC08A', LEAF_D = '#5DAA72', GRASS = '#B5DDA8', SKIN = '#EDBE98';
const SKY: Record<Part, string> = { morning: '#FFE3A8', day: '#BFE4F6', evening: '#F4B9A6', night: '#26365C' };
const SKYLINE: Record<Part, string> = { morning: '#E9C98F', day: '#9DC3D8', evening: '#D9937F', night: '#1A2747' };

const rect = (x: number, y: number, w: number, h: number, fill: string, rx = 0, extra = '') =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}"${extra}/>`;
const circle = (cx: number, cy: number, r: number, fill: string, extra = '') => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"${extra}/>`;
const path = (d: string, stroke: string, w = 2.5, extra = '') =>
  `<path d="${d}" stroke="${stroke}" stroke-width="${w}" fill="none" stroke-linecap="round" stroke-linejoin="round"${extra}/>`;

/** A patch of sky with the sun or the moon placed by the time of day, kept inside the box. */
function sky(p: Part, x: number, y: number, w: number, h: number) {
  const r = Math.min(w, h) * 0.16;
  const body =
    p === 'night'
      ? circle(x + w * 0.74, y + h * 0.32, r, '#F4F6F8') + circle(x + w * 0.74 + r * 0.45, y + h * 0.32 - r * 0.25, r * 0.85, SKY.night) +
        [[0.18, 0.25], [0.35, 0.55], [0.52, 0.2], [0.9, 0.7], [0.62, 0.62]].map(([a, b]) => circle(x + w * a, y + h * b, 1.1, '#F4F6F8')).join('')
      : p === 'morning'
      ? circle(x + w * 0.26, y + h * 0.68, r, '#FFB84D')
      : p === 'evening'
      ? circle(x + w * 0.74, y + h * 0.7, r, '#F28A5B')
      : circle(x + w * 0.72, y + h * 0.3, r, NOTE);
  return rect(x, y, w, h, SKY[p]) + body;
}

/** A window onto the sky of the current day part. */
function windowAt(p: Part, x: number, y: number, w: number, h: number) {
  return rect(x - 3, y - 3, w + 6, h + 6, PAPER, 4) + sky(p, x, y, w, h) +
    rect(x + w / 2 - 1.5, y, 3, h, PAPER) + rect(x, y + h / 2 - 1.5, w, 3, PAPER);
}

const tree = (x: number, base: number, s = 1) =>
  rect(x - 2.5 * s, base - 18 * s, 5 * s, 18 * s, WOOD_D, 2) + circle(x, base - 26 * s, 14 * s, LEAF) + circle(x + 8 * s, base - 20 * s, 9 * s, LEAF_D) + circle(x - 8 * s, base - 21 * s, 8 * s, LEAF_D);

const smoke = (x: number, y: number) =>
  `<g class="sc-rise">${path(`M ${x} ${y} q -5 -6 0 -12 q 5 -6 0 -12`, '#FFFFFF', 3, ' opacity=".8"')}</g>`;

const plant = (x: number, base: number) =>
  rect(x - 8, base - 14, 16, 14, '#E58A5B', 3) + `<path d="M ${x} ${base - 14} q -12 -10 -8 -22 q 6 8 8 22 q 2 -16 10 -20 q 2 12 -10 20" fill="${LEAF_D}"/>`;

/** A bubble with a tail; `right` puts the tail on the right. */
const bubble = (x: number, y: number, w: number, h: number, fill: string, right = false) =>
  rect(x, y, w, h, fill, h / 2) + `<path d="M ${right ? x + w - 6 : x + 6} ${y + h - 2} l ${right ? 6 : -6} 5 l ${right ? -1 : 1} -7 z" fill="${fill}"/>`;

const dots = (x: number, y: number, c: string) => circle(x, y, 1.8, c) + circle(x + 6, y, 1.8, c) + circle(x + 12, y, 1.8, c);

const heart = (x: number, y: number, s: number, fill: string, extra = '') =>
  `<path d="M ${x} ${y + 6 * s} c -7 -4 -9 -8 -6 -11 c 2 -2 5 -1 6 1 c 1 -2 4 -3 6 -1 c 3 3 1 7 -6 11 z" fill="${fill}"${extra}/>`;

/** A face placed with its top-left corner at x,y and a given width (the portrait is 200×226). */
const face = (look: Look, x: number, y: number, w: number) =>
  `<g transform="translate(${x} ${y}) scale(${(w / 200).toFixed(3)})">${portraitInner(look)}</g>`;

/** The phone held in a hand, centred; `screen` draws inside a 56×66 screen at 132,14. */
function phone(bg: string, screen: string, around = '') {
  return rect(0, 0, 320, 80, bg) + around +
    `<ellipse cx="160" cy="88" rx="38" ry="16" fill="${SKIN}"/>` +
    rect(126, 6, 68, 84, INK, 11) + rect(132, 14, 56, 70, PAPER, 5) + screen +
    `<ellipse cx="132" cy="74" rx="9" ry="12" fill="${SKIN}"/><ellipse cx="190" cy="70" rx="7" ry="11" fill="${SKIN}"/>`;
}

// ---------- scenes ----------

const room = (p: Part) =>
  rect(0, 0, 320, 80, '#EEF3F4') + rect(0, 64, 320, 16, '#E3D3BF') + windowAt(p, 34, 12, 54, 38) +
  rect(206, 14, 30, 38, '#F6C8D5', 3) + circle(221, 30, 8, PAPER) + rect(212, 42, 18, 3, PAPER, 1.5) +
  rect(112, 44, 84, 6, WOOD, 2) + rect(118, 50, 4, 14, WOOD_D) + rect(186, 50, 4, 14, WOOD_D) +
  rect(134, 30, 34, 14, '#3B4A66', 2) + rect(137, 32, 28, 10, '#BFE4F6', 1) + path('M 180 44 V 26 l 8 -4', SOFT, 2.4) + circle(190, 22, 5, NOTE) +
  plant(276, 64);

const bed = (p: Part) =>
  rect(0, 0, 320, 80, p === 'night' ? '#CBD4E6' : '#E9EEF6') + rect(0, 66, 320, 14, '#D9CBB8') + windowAt(p, 226, 10, 58, 38) +
  rect(36, 24, 16, 44, WOOD, 4) + rect(40, 46, 154, 16, PAPER, 4) + rect(84, 40, 112, 24, '#9FD8CF', 7) +
  `<ellipse cx="66" cy="44" rx="16" ry="7" fill="${PAPER}" stroke="${LINE}" stroke-width="1.5"/>` +
  rect(200, 52, 22, 14, WOOD_D, 2) + circle(211, 45, 7, NOTE) + path('M 211 41 v 4 l 3 2', INK, 1.6) +
  `<g class="sc-float" fill="${SOFT}" font-family="Unbounded Variable, system-ui, sans-serif" font-weight="700">` +
  `<text x="104" y="30" font-size="10">z</text><text x="114" y="22" font-size="8">z</text><text x="122" y="15" font-size="6">z</text></g>`;

const couch = (p: Part) =>
  rect(0, 0, 320, 80, '#F1EBF3') + rect(0, 66, 320, 14, '#D9CBB8') + windowAt(p, 140, 10, 40, 28) +
  rect(40, 30, 120, 26, '#7A8FBF', 10) + rect(32, 42, 136, 22, '#6A7FB0', 8) + rect(52, 40, 44, 12, '#8FA2CC', 5) + rect(102, 40, 44, 12, '#8FA2CC', 5) +
  rect(40, 64, 6, 4, WOOD_D) + rect(154, 64, 6, 4, WOOD_D) +
  rect(206, 50, 76, 16, WOOD, 3) + rect(214, 16, 60, 34, INK, 4) + rect(218, 20, 52, 26, '#8FD0E8', 2, ' class="sc-blink"') + rect(240, 46, 8, 4, INK);

function bathroom() {
  const tiles = [16, 32, 48].map((y) => rect(0, y, 320, 1.5, LINE)).join('') +
    Array.from({ length: 14 }, (_, i) => rect(i * 24 + 12, 0, 1.5, 60, LINE)).join('');
  return rect(0, 0, 320, 80, TILE) + tiles + rect(0, 60, 320, 20, '#CFDDE2') +
    rect(118, 4, 84, 52, PAPER, 26) + rect(123, 9, 74, 42, '#D6E6EB', 21) + path('M 140 18 l 10 -6 M 138 28 l 22 -14', PAPER, 3, ' opacity=".8"') +
    rect(106, 56, 108, 10, PAPER, 5) + path('M 160 56 v -6 h 8', SOFT, 3) +
    rect(236, 44, 14, 16, '#BFE4F6', 3) + path('M 240 44 l -3 -14 M 246 44 l 4 -12', MINT, 2.6) + rect(30, 20, 30, 36, RASP, 4) + rect(26, 16, 38, 6, SOFT, 3) +
    rect(264, 48, 10, 12, MINT, 3) + rect(278, 44, 10, 16, NOTE, 3);
}

const kitchen = (p: Part) =>
  rect(0, 0, 320, 80, '#FFF4E3') + Array.from({ length: 14 }, (_, i) => rect(i * 24, 34, 22, 20, '#F7E6CC', 2)).join('') +
  windowAt(p, 30, 8, 46, 26) + rect(0, 54, 320, 26, WOOD) + rect(0, 54, 320, 4, WOOD_D) +
  `<ellipse cx="160" cy="54" rx="40" ry="7" fill="${PAPER}"/>` +
  `<path d="M 134 52 q 10 -14 22 0 z M 152 50 q 10 -14 22 0 z M 166 53 q 9 -12 20 0 z" fill="#E2A55B"/>` +
  smoke(150, 38) + smoke(170, 36) +
  `<path d="M 232 54 v -16 q 0 -8 14 -8 q 14 0 14 8 v 16 z" fill="${MINT}"/>` + path('M 260 40 q 8 0 6 8', MINT, 3) + rect(242, 26, 8, 4, INK, 2) +
  rect(92, 42, 14, 12, PAPER, 3) + path('M 106 45 q 5 1 0 6', PAPER, 2);

function balcony(p: Part) {
  const sl = SKYLINE[p];
  const lit = p === 'night' || p === 'evening'
    ? [[30, 40], [44, 48], [96, 36], [212, 44], [262, 38], [276, 50]].map(([x, y]) => rect(x, y, 4, 4, NOTE, 1)).join('') : '';
  return sky(p, 0, 0, 320, 80) +
    rect(20, 30, 36, 40, sl) + rect(60, 40, 26, 30, sl) + rect(90, 24, 30, 46, sl) + rect(200, 34, 40, 36, sl) + rect(250, 26, 34, 44, sl) + rect(288, 42, 32, 28, sl) + lit +
    rect(0, 48, 320, 5, SOFT, 2) + Array.from({ length: 23 }, (_, i) => rect(i * 14 + 4, 53, 3, 27, SOFT)).join('') +
    rect(150, 41, 22, 7, '#9AA6B8', 3) + rect(156, 38, 16, 3, PAPER, 1) + circle(172, 39.5, 1.6, '#F28A5B') + smoke(173, 34) + plant(250, 48);
}

const park = (p: Part) =>
  sky(p, 0, 0, 320, 80) + rect(0, 52, 320, 28, GRASS) +
  `<path d="M 120 80 C 150 66 170 62 220 54 L 240 54 C 200 64 190 70 180 80 Z" fill="#EADBC4"/>` +
  tree(40, 60, 1.1) + tree(84, 56, 0.8) + tree(270, 60, 1.2) +
  rect(196, 44, 40, 5, WOOD, 2) + rect(196, 36, 40, 4, WOOD, 2) + rect(200, 49, 3, 8, WOOD_D) + rect(229, 49, 3, 8, WOOD_D) +
  `<g class="sc-run"><path d="M 136 64 q 6 -6 14 -2 l 3 4 h -17 z" fill="${RASP}"/>${rect(135, 66, 19, 2.5, PAPER, 1)}</g>`;

const gym = () =>
  rect(0, 0, 320, 80, '#E6ECF2') + rect(0, 64, 320, 16, '#4A5568') + rect(20, 8, 280, 26, '#D6E6EB', 4) + path('M 40 14 l 10 -4 M 200 16 l 14 -6', PAPER, 3) +
  rect(40, 46, 110, 4, SOFT, 2) + rect(44, 50, 3, 14, SOFT) + rect(143, 50, 3, 14, SOFT) +
  [52, 76, 100, 124].map((x, i) => rect(x, 38, 4, 8, INK, 1) + rect(x + 4, 41, 10, 2, SOFT) + rect(x + 14, 38 - i % 2, 4, 8 + (i % 2) * 2, INK, 1)).join('') +
  rect(180, 48, 70, 8, MINT, 4) + rect(186, 56, 4, 8, SOFT) + rect(240, 56, 4, 8, SOFT) + rect(170, 42, 18, 8, MINT, 4) +
  `<path d="M 268 64 q -10 0 -10 -10 q 0 -10 12 -10 q 12 0 12 10 q 0 10 -10 10 z" fill="${INK}"/>` + path('M 264 46 q 6 -8 12 0', INK, 3);

const clinic = (p: Part) =>
  sky(p, 0, 0, 320, 80) + rect(0, 66, 320, 14, '#C9D3DA') + rect(70, 10, 180, 58, '#F3F6F8', 3) +
  [84, 112, 196, 224].map((x) => rect(x, 20, 18, 14, SKY[p], 2) + rect(x, 42, 18, 14, SKY[p], 2)).join('') +
  rect(142, 36, 36, 32, '#9FD8CF', 2) + rect(158.5, 36, 3, 32, PAPER) + circle(160, 22, 9, PAPER) + rect(157, 16, 6, 12, MINT, 1) + rect(154, 19, 12, 6, MINT, 1) +
  rect(134, 66, 52, 4, '#B4C0C8') + tree(36, 68, 1) + tree(292, 68, 0.9);

const office = () =>
  rect(0, 0, 320, 80, '#EAF2F1') + rect(0, 38, 320, 28, '#CFE3DF') + rect(0, 66, 320, 14, '#B9C7C4') +
  [40, 170].map((x) => rect(x, 14, 36, 52, WOOD, 3) + rect(x + 8, 22, 20, 8, PAPER, 2) + circle(x + 30, 42, 2, INK)).join('') +
  `<text x="98" y="29" font-size="7" font-weight="700" fill="${INK}" font-family="Unbounded Variable, system-ui, sans-serif" text-anchor="middle">12А</text>` +
  rect(84, 18, 28, 16, PAPER, 2) + rect(176, 15, 0, 0, PAPER) +
  `<text x="188" y="29" font-size="7" font-weight="700" fill="${INK}" font-family="Unbounded Variable, system-ui, sans-serif" text-anchor="middle">12</text>` +
  rect(226, 48, 60, 6, MINT, 3) + rect(230, 54, 3, 12, SOFT) + rect(279, 54, 3, 12, SOFT) + plant(300, 66) +
  rect(126, 14, 24, 30, PAPER, 3) + circle(138, 25, 6, '#BFE4F6') + rect(131, 34, 14, 2, LINE) + rect(131, 38, 10, 2, LINE);

const pharmacy = (p: Part) =>
  sky(p, 0, 0, 320, 80) + rect(0, 66, 320, 14, '#C9D3DA') + rect(40, 8, 240, 60, '#F3F6F8', 3) + rect(40, 8, 240, 12, MINT, 3) +
  circle(160, 14, 9, PAPER) + rect(157, 8, 6, 12, MINT, 1) + rect(154, 11, 12, 6, MINT, 1) +
  rect(56, 28, 150, 38, '#DCEFF4', 2) + [36, 50].map((y) => rect(60, y, 142, 2.5, PAPER)).join('') +
  [64, 76, 90, 104, 120, 140, 156, 172, 186].map((x, i) => rect(x, i % 2 ? 26 : 28 + (i % 3) * 2, 8, i % 2 ? 10 : 8, [RASP, NOTE, MINT, '#7A8FBF'][i % 4], 2)).join('') +
  [70, 96, 126, 150, 178].map((x, i) => rect(x, 42 + (i % 2), 9, 8, [MINT, '#F6C8D5', NOTE][i % 3], 2)).join('') +
  rect(220, 28, 40, 38, '#9FD8CF', 2) + rect(238.5, 28, 3, 38, PAPER);

const street = (p: Part) =>
  sky(p, 0, 0, 320, 80) + rect(0, 64, 320, 16, '#C9D3DA') + rect(0, 62, 320, 3, '#B4C0C8') +
  rect(20, 14, 120, 50, '#F3E6D6', 2) + rect(30, 22, 100, 12, NOTE, 3) +
  `<path d="M 72 31 q 8 -9 16 0 z" fill="#E2A55B"/>` + path('M 76 28 l 2 -3 M 81 27 l 2 -3', WOOD_D, 1.4) +
  rect(34, 40, 40, 24, SKY[p], 2) + rect(84, 40, 26, 24, WOOD, 2) +
  rect(164, 28, 3, 36, SOFT) + path('M 165.5 28 q 8 -4 14 2', SOFT, 3) + circle(180, 33, 4, NOTE) +
  rect(200, 38, 100, 26, '#F3F6F8', 2) + Array.from({ length: 6 }, (_, i) => rect(196 + i * 18, 30, 18, 10, i % 2 ? PAPER : RASP, 0)).join('') +
  rect(210, 48, 80, 8, WOOD, 2) + [216, 232, 248, 264, 278].map((x, i) => circle(x, 46, 4, [NOTE, RASP, LEAF, '#E58A5B', LEAF_D][i])).join('');

function cafe(p: Part, crush?: Look) {
  const inside = crush ? face(crush, 116, 24, 42) : '';
  return sky(p, 0, 0, 320, 80) + rect(0, 66, 320, 14, '#C9D3DA') + rect(40, 10, 240, 58, '#F6E3CC', 3) +
    Array.from({ length: 10 }, (_, i) => `<path d="M ${40 + i * 24} 10 h 24 v 10 q -12 8 -24 0 z" fill="${i % 2 ? PAPER : MINT}"/>`).join('') +
    rect(60, 28, 130, 38, '#FFF8EE', 2) + inside + rect(60, 54, 130, 12, '#FFF8EE') +
    rect(110, 54, 50, 4, WOOD, 2) + rect(133, 58, 4, 8, WOOD_D) + rect(116, 48, 9, 6, PAPER, 2) + smoke(120, 44) + rect(146, 48, 9, 6, PAPER, 2) +
    rect(58, 26, 134, 3, WOOD_D) + rect(210, 30, 40, 36, WOOD, 2) + circle(244, 48, 2, INK) +
    `<ellipse cx="230" cy="40" rx="6" ry="4" fill="${WOOD_D}"/>` + path('M 230 37 v 6', '#F6E3CC', 1.4) + plant(28, 66) + plant(296, 66);
}

const bbq = (p: Part) =>
  sky(p, 0, 0, 320, 80) + rect(0, 54, 320, 26, GRASS) + Array.from({ length: 20 }, (_, i) => rect(i * 16 + 2, 30, 12, 26, WOOD, 2)).join('') +
  tree(286, 56, 1) + rect(126, 42, 68, 12, INK, 3) + rect(132, 54, 4, 16, INK) + rect(184, 54, 4, 16, INK) +
  `<path d="M 134 42 q 6 -8 10 0 q 6 -10 12 0 q 6 -8 10 0 q 6 -10 12 0 z" fill="#F28A5B" class="sc-blink"/>` +
  [140, 156, 172].map((x) => path(`M ${x - 12} 38 L ${x + 14} 38`, SOFT, 1.6) + rect(x - 6, 35, 6, 6, '#B05C34', 2) + rect(x + 1, 35, 6, 6, '#C97A45', 2)).join('') +
  smoke(150, 30) + smoke(170, 28) + rect(40, 50, 50, 5, PAPER, 2) + rect(46, 55, 3, 14, SOFT) + rect(81, 55, 3, 14, SOFT) +
  rect(50, 40, 7, 10, '#7CC08A', 2) + rect(62, 42, 12, 8, NOTE, 2) + rect(78, 38, 6, 12, RASP, 2);

const job = (p: Part) =>
  sky(p, 0, 0, 320, 80) + rect(0, 62, 320, 18, '#A9B4BE') + rect(0, 70, 320, 2, PAPER) +
  rect(110, 14, 120, 48, '#F3F6F8', 3) + rect(230, 30, 44, 32, MINT, 4) + rect(242, 34, 24, 12, SKY[p], 2) +
  circle(140, 64, 9, INK) + circle(140, 64, 4, SOFT) + circle(252, 64, 9, INK) + circle(252, 64, 4, SOFT) +
  [[40, 46], [62, 46], [50, 26], [80, 54]].map(([x, y]) => rect(x, y, 20, y === 54 ? 10 : 18, '#D9A066', 2) + rect(x + 8, y, 4, 6, '#F3E6D6')).join('');

function crushPhone(look?: Look) {
  const head = rect(132, 14, 56, 18, '#FBE4EB', 5) + (look ? face(look, 135, 15, 14) : circle(142, 23, 6, RASP)) + rect(152, 20, 26, 4, RASP, 2) + rect(152, 26, 16, 3, LINE, 1.5);
  const screen = head + rect(132, 28, 56, 4, '#FBE4EB') + bubble(137, 38, 34, 10, TILE) + bubble(150, 52, 34, 10, '#C42A5A', true) + bubble(137, 66, 22, 10, TILE) + dots(141, 71, SOFT);
  const around = heart(70, 28, 1.2, RASP, ' class="sc-float"') + heart(250, 18, 1, '#F6A5BC') + heart(268, 46, 0.8, RASP, ' class="sc-float"') +
    bubble(36, 46, 52, 16, PAPER) + dots(51, 54, SOFT) + bubble(226, 58, 40, 14, PAPER, true) + heart(246, 59, 0.6, RASP);
  return phone('#FBE4EB', screen, around);
}

function groupPhone() {
  const screen = rect(132, 14, 56, 12, '#BFE4F6', 5) + rect(132, 20, 56, 6, '#BFE4F6') + rect(140, 18, 30, 3.5, INK, 1.7) +
    circle(140, 38, 4, NOTE) + bubble(146, 33, 34, 9, TILE) + circle(140, 52, 4, '#9FD8CF') + bubble(146, 47, 28, 9, TILE) +
    bubble(152, 61, 30, 9, MINT, true) + circle(140, 76, 4, '#F6C8D5') + bubble(146, 71, 20, 9, TILE);
  const around = bubble(34, 18, 60, 18, PAPER) + rect(44, 24, 30, 3, LINE, 1.5) + rect(44, 29, 20, 3, LINE, 1.5) +
    bubble(232, 40, 56, 16, PAPER, true) + dots(250, 48, SOFT) + circle(196, 12, 7, RASP, ' class="sc-blink"') +
    `<text x="196" y="15" font-size="8" font-weight="700" fill="${PAPER}" text-anchor="middle" font-family="Unbounded Variable, system-ui, sans-serif">3</text>`;
  return phone('#E3EEF6', screen, around);
}

function feedPhone() {
  const screen = circle(140, 21, 4, NOTE) + rect(147, 19, 26, 4, INK, 2) + rect(136, 28, 48, 30, '#BFE4F6', 2) + circle(168, 36, 5, NOTE) +
    `<path d="M 136 58 l 14 -14 l 10 9 l 8 -6 l 16 11 z" fill="${LEAF}"/>` + heart(142, 62, 0.6, RASP) + rect(152, 64, 28, 3, LINE, 1.5) + rect(138, 72, 40, 3, LINE, 1.5);
  const around = `<g transform="translate(48 16) scale(1.6)">${path('M 4 10 v 4 l 2 .5 1.5 5 h 2.5 l -1 -4.5 L 18 18 V 6 L 6 9.5 z', SOFT, 2)}</g>` +
    bubble(226, 16, 58, 16, PAPER, true) + heart(240, 18, 0.7, RASP) + rect(250, 22, 24, 3, LINE, 1.5) +
    bubble(222, 46, 50, 14, NOTE, true) + rect(232, 51, 28, 3, '#E0B23A', 1.5) + heart(92, 54, 0.9, '#F6A5BC', ' class="sc-float"');
  return phone('#F1EBF3', screen, around);
}

function callPhone(caller?: Look) {
  const screen = rect(132, 14, 56, 70, '#3B4A66', 5) + circle(160, 34, 13, '#9FD8CF') + (caller ? face(caller, 147, 22, 26) : '') +
    rect(132, 50, 56, 34, '#3B4A66') + rect(146, 52, 28, 4, PAPER, 2) + circle(146, 70, 6, '#CF4040') + circle(174, 70, 6, MINT, ' class="sc-blink"');
  const ring = `<g class="sc-ring">${path('M 112 26 q -8 14 0 28 M 102 20 q -12 20 0 40', MINT, 3)}${path('M 208 26 q 8 14 0 28 M 218 20 q 12 20 0 40', MINT, 3)}</g>`;
  return phone('#FFF4E3', screen, ring + rect(30, 50, 40, 30, '#F7E6CC', 2) + rect(250, 50, 40, 30, '#F7E6CC', 2) + `<path d="M 262 50 v -10 q 0 -6 9 -6 q 9 0 9 6 v 10 z" fill="${MINT}"/>`);
}

export interface SceneOpts { part?: Part; crush?: Look; face?: Look }

export function sceneInner(id: SceneId, o: SceneOpts = {}): string {
  const p = o.part ?? 'day';
  switch (id) {
    case 'room': return room(p);
    case 'bed': return bed(p);
    case 'couch': return couch(p);
    case 'bathroom': return bathroom();
    case 'kitchen': return kitchen(p);
    case 'balcony': return balcony(p);
    case 'park': return park(p);
    case 'gym': return gym();
    case 'clinic': return clinic(p);
    case 'office': return office();
    case 'pharmacy': return pharmacy(p);
    case 'street': return street(p);
    case 'cafe': return cafe(p, o.crush);
    case 'bbq': return bbq(p);
    case 'job': return job(p);
    case 'phone': return groupPhone();
    case 'crushPhone': return crushPhone(o.crush);
    case 'feed': return feedPhone();
    case 'call': return callPhone(o.face);
  }
}

export function sceneSvg(id: SceneId, o: SceneOpts = {}): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 80" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${sceneInner(id, o)}</svg>`;
}

// ---------- which card gets which scene ----------

/** The fields of a card the mapping reads; all of them already exist in content. */
export interface SceneKey { title: string; kind: string; speaker?: string; says?: string }

/** Title keywords, checked in order: the first match wins, so the more specific words come first.
 * `\b` is ASCII-only in JS regexps, so word edges are spelled out as `(^|\s)`. */
const BY_TITLE: [RegExp, SceneId][] = [
  [/лента|образ из ленты|фото из/, 'feed'],
  [/шашлык|мангал|торт|тост|день рождения/, 'bbq'],
  [/пробежк|парк/, 'park'],
  [/трениров|(^|\s)зал|абонемент|продлить/, 'gym'],
  [/диван/, 'couch'],
  [/^сон$|проспал|энерги|половина пути/, 'bed'],
  [/зеркал|бритв|душ|зуб|щетина|весы|холодная вода|ванн|тюбик|прыщ|примерка/, 'bathroom'],
  [/пирож|чай|обед|пицца/, 'kitchen'],
  [/балкон|сигарет/, 'balcony'],
  [/поликлиник|крыльцо/, 'clinic'],
  [/аптек/, 'pharmacy'],
  [/кабинет|этаж|стоматолог|косметолог|врач|контрол/, 'office'],
  [/зерн|у окна|кофейн|(^|[\s-])бара?($|\s)|суббота/, 'cafe'],
  [/хлеб|рынок|оптик|зина|садов|подъезд|лестниц|барбер/, 'street'],
  [/подработк/, 'job'],
  [/профил|прочитано|лайк|тишина|в сети|её вопрос|её сообщение/, 'crushPhone'],
  [/чат класса|фото|оргкомитет|альбом|слайд|пишет|витя:/, 'phone'],
  [/звонок|звонит|мам|сборы|перезвонил/, 'call'],
];

const BY_SPEAKER: Record<string, SceneId> = {
  'Мама': 'call', 'Витя': 'phone', 'Тётя Зина': 'street', 'Лента': 'feed', 'Гоша': 'street',
  'Косметолог': 'office', 'Стоматолог': 'office', 'Галина Петровна': 'office', 'Регистратура': 'office', 'Провизор': 'pharmacy',
};

/**
 * The scene for a card. The crush's own cards come first: a line she sends goes on the phone,
 * a card where she speaks without sending anything is a meeting in person, in the café.
 */
export function sceneFor(card: SceneKey): SceneId {
  const t = card.title.toLowerCase();
  if (card.speaker === 'crush') return card.says || /пишет|ответила|в сети|добавила|оргкомитет/.test(t) ? 'crushPhone' : 'cafe';
  for (const [re, id] of BY_TITLE) if (re.test(t)) return id;
  if (card.speaker && BY_SPEAKER[card.speaker]) return BY_SPEAKER[card.speaker];
  return 'room';
}
