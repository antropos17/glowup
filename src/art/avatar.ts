/**
 * Герой рисуется кодом из слоёв. Никаких картинок: одна функция получает
 * параметры внешности и возвращает SVG. Портрет (по плечи) идёт в игру,
 * фигура в полный рост идёт на экран «Зеркало» и в финальное «до/после».
 *
 * Все числовые параметры: 0..100. Что значит 0 и 100, написано у каждого.
 */

export type Gender = 'm' | 'f';
export type HairStyle =
  | 'bald' | 'receding' | 'buzz' | 'short' | 'side' | 'messy' | 'curly'
  | 'long' | 'bob' | 'ponytail' | 'bun';
export type Glasses = 'none' | 'thick' | 'taped' | 'thin' | 'round';
export type Facial = 'none' | 'stubble' | 'patchy' | 'beard';
export type Neckline = 'wide' | 'crew' | 'v' | 'collar' | 'hood' | 'lapel';
export type Bottom = 'sweats' | 'jeans' | 'trousers' | 'skirt';

export interface Look {
  gender: Gender;
  /** индекс тона кожи, 0..4 */
  skin: number;
  /** 0 очень худой, 50 в форме, 100 сильный лишний вес */
  weight: number;
  /** 0 чистая кожа, 100 всё лицо в прыщах */
  acne: number;
  hair: HairStyle;
  hairColor: string;
  /** 0 сальные и растрёпанные, 100 ухоженные */
  hairCare: number;
  glasses: Glasses;
  /** 0 жёлтые и кривые, 100 ровные и белые */
  teeth: number;
  facial: Facial;
  /** 0 сутулый, 100 прямая спина */
  posture: number;
  /** 0 подавлен, 100 сияет. От 60 улыбается с зубами */
  mood: number;
  /** 0 выспался, 100 мешки под глазами */
  tired: number;
  neckline: Neckline;
  topColor: string;
  /** 0 мятое и в пятнах, 100 опрятное */
  clothesCare: number;
  bottom: Bottom;
  bottomColor: string;
  shoeColor: string;
  piercing?: boolean;
  /** fresh shave without cream: a red flush over jaw, chin and upper lip */
  razorBurn: boolean;
}

export const SKIN_TONES = ['#F7D6BE', '#EDBE98', '#D7A077', '#AD7650', '#74492F'];
export const HAIR_COLORS = {
  black: '#25211F', brown: '#5B3B28', chestnut: '#8B5733', blond: '#E2BD72',
  red: '#B4532C', grey: '#A2A7AD', pink: '#E58AA6',
} as const;

export const DEFAULT_LOOK: Look = {
  gender: 'm', skin: 1, weight: 50, acne: 0, hair: 'short', hairColor: HAIR_COLORS.brown,
  hairCare: 100, glasses: 'none', teeth: 100, facial: 'none', posture: 100, mood: 70,
  tired: 0, neckline: 'crew', topColor: '#2F6FDE', clothesCare: 100,
  bottom: 'jeans', bottomColor: '#33456B', shoeColor: '#F4F6F8', razorBurn: false,
};

// ---------- помощники ----------

const clamp = (v: number, a = 0, b = 100) => Math.max(a, Math.min(b, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** значение по весу: худой → норма → полный */
const byWeight = (w: number, thin: number, norm: number, heavy: number) =>
  w <= 50 ? lerp(thin, norm, clamp(w) / 50) : lerp(norm, heavy, (clamp(w) - 50) / 50);
const r1 = (n: number) => Math.round(n * 10) / 10;

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
}
function rgbToHex(rgb: number[]) {
  return '#' + rgb.map((c) => Math.round(clamp(c, 0, 255)).toString(16).padStart(2, '0')).join('');
}
/** смешать два цвета, t=0 первый, t=1 второй */
export function mix(a: string, b: string, t: number) {
  const A = hexToRgb(a), B = hexToRgb(b);
  return rgbToHex(A.map((c, i) => lerp(c, B[i], t)));
}
const darker = (c: string, t: number) => mix(c, '#3A1E24', t);
const lighter = (c: string, t: number) => mix(c, '#FFFFFF', t);

// Прыщи лежат в фиксированных местах и исчезают по порядку,
// поэтому лечение видно как «стало на три меньше», а не как новая картинка.
const ACNE_SPOTS: [number, number, number][] = [
  [72, 122, 2.6], [128, 118, 2.4], [90, 70, 2.2], [66, 110, 2.0], [133, 128, 2.6],
  [112, 66, 2.0], [80, 132, 2.2], [121, 134, 2.0], [100, 158, 2.2], [76, 74, 1.8],
  [124, 76, 2.2], [62, 124, 1.8], [138, 112, 1.8], [108, 152, 1.8], [92, 126, 1.6], [116, 122, 1.6],
];

interface Geo {
  tw: number; cw: number; jw: number; chinY: number; nw: number; sw: number;
  dy: number; shoulderY: number;
}

function geometry(look: Look): Geo {
  const w = look.weight, f = look.gender === 'f';
  const slouch = (100 - clamp(look.posture)) / 100;
  return {
    tw: byWeight(w, 46, 49, 55) - (f ? 1 : 0),
    cw: byWeight(w, 42, 49, 63) - (f ? 1 : 0),
    jw: byWeight(w, 26, 35, 54) - (f ? 4 : 0),
    chinY: byWeight(w, 168, 165, 169),
    nw: byWeight(w, 12, 15.5, 22) - (f ? 2 : 0),
    sw: byWeight(w, 60, 72, 90) - (f ? 10 : 0),
    dy: slouch * 7,
    shoulderY: 186 + slouch * 9,
  };
}

function facePath(g: Geo) {
  const { tw, cw, jw, chinY } = g;
  const side = (s: 1 | -1) => [
    `C ${100 + s * tw * 0.62} 38 ${100 + s * tw} 58 ${100 + s * tw} 88`,
    `C ${100 + s * tw} 100 ${100 + s * (cw + 1)} 110 ${100 + s * cw} 122`,
    `C ${100 + s * (cw - 1)} 136 ${100 + s * (jw + 7)} 143 ${100 + s * jw} 149`,
    `C ${100 + s * (jw - 9)} 159 ${100 + s * 17} ${chinY} 100 ${chinY}`,
  ];
  const right = side(1);
  // левая сторона идёт обратно: от подбородка к макушке
  const l = (s: -1) => [
    `C ${100 + s * 17} ${chinY} ${100 + s * (jw - 9)} 159 ${100 + s * jw} 149`,
    `C ${100 + s * (jw + 7)} 143 ${100 + s * (cw - 1)} 136 ${100 + s * cw} 122`,
    `C ${100 + s * (cw + 1)} 110 ${100 + s * tw} 100 ${100 + s * tw} 88`,
    `C ${100 + s * tw} 58 ${100 + s * tw * 0.62} 38 100 38`,
  ];
  return `M 100 38 ${right.join(' ')} ${l(-1).join(' ')} Z`;
}

// ---------- волосы ----------

function hair(look: Look, g: Geo): { back: string; front: string } {
  const c = look.hairColor, hi = lighter(c, 0.22), tw = g.tw;
  const L = 100 - tw, R = 100 + tw;
  const capTop = `M ${L - 3} 92 C ${L - 6} 48 ${100 - 28} 28 100 28 C ${100 + 28} 28 ${R + 6} 48 ${R + 3} 92`;
  let back = '', front = '';
  const shine = look.hairCare > 60
    ? `<path d="M ${100 - 24} 44 Q 100 34 ${100 + 20} 42" stroke="${hi}" stroke-width="3" stroke-linecap="round" fill="none" opacity=".7"/>`
    : '';
  const strands = look.hairCare < 40
    ? `<path d="M ${L + 6} 44 l -8 -9 M 100 30 l 3 -11 M ${R - 10} 40 l 9 -8 M ${100 - 20} 32 l -4 -9" stroke="${c}" stroke-width="3.2" stroke-linecap="round" fill="none"/>`
    : '';

  switch (look.hair) {
    case 'bald':
      front = `<ellipse cx="86" cy="54" rx="13" ry="7" fill="#fff" opacity=".28" transform="rotate(-24 86 54)"/>`;
      break;
    case 'receding':
      front =
        `<path d="M ${L - 3} 96 C ${L - 5} 74 ${L} 60 ${L + 12} 54 C ${L + 8} 66 ${L + 7} 80 ${L + 5} 96 Z" fill="${c}"/>` +
        `<path d="M ${R + 3} 96 C ${R + 5} 74 ${R} 60 ${R - 12} 54 C ${R - 8} 66 ${R - 7} 80 ${R - 5} 96 Z" fill="${c}"/>` +
        `<ellipse cx="88" cy="52" rx="12" ry="6" fill="#fff" opacity=".25" transform="rotate(-24 88 52)"/>`;
      break;
    case 'buzz':
      front = `<path d="${capTop} L ${R - 3} 78 Q 100 56 ${L + 3} 78 Z" fill="${mix(c, SKIN_TONES[clamp(look.skin, 0, 4)], 0.38)}"/>`;
      break;
    case 'short':
      front = `<path d="${capTop} L ${R - 4} 80 Q ${100 + 22} 58 100 62 Q ${100 - 22} 58 ${L + 4} 80 Z" fill="${c}"/>${shine}${strands}`;
      break;
    case 'side':
      front = `<path d="${capTop} L ${R - 3} 84 Q ${R - 6} 62 ${100 + 8} 56 Q ${100 - 26} 60 ${L + 4} 86 Z" fill="${c}"/>` +
        `<path d="M ${100 + 10} 34 Q ${100 + 2} 46 ${100 + 8} 56" stroke="${darker(c, 0.25)}" stroke-width="2" fill="none" stroke-linecap="round"/>${shine}${strands}`;
      break;
    case 'messy':
      front = `<path d="M ${L - 4} 92 C ${L - 10} 60 ${L - 2} 44 ${L + 8} 40 L ${L + 6} 28 L ${100 - 18} 34 L ${100 - 10} 20 L ${100 + 4} 32 L ${100 + 18} 22 L ${100 + 22} 36 L ${R - 2} 30 L ${R - 2} 46 C ${R + 8} 56 ${R + 6} 76 ${R + 4} 92 L ${R - 4} 82 Q ${100 + 18} 60 100 68 Q ${100 - 16} 58 ${L + 4} 82 Z" fill="${c}"/>${strands}`;
      break;
    case 'curly': {
      const bumps: string[] = [];
      for (let i = 0; i <= 8; i++) {
        const a = Math.PI * (1.04 + (0.92 * i) / 8);
        bumps.push(`<circle cx="${r1(100 + Math.cos(a) * (tw + 4))}" cy="${r1(72 + Math.sin(a) * 40)}" r="13" fill="${c}"/>`);
      }
      front = `<path d="${capTop} L ${R - 4} 80 Q 100 60 ${L + 4} 80 Z" fill="${c}"/>${bumps.join('')}` +
        (look.hairCare > 60 ? `<circle cx="88" cy="40" r="4" fill="${hi}" opacity=".6"/><circle cx="112" cy="36" r="3" fill="${hi}" opacity=".6"/>` : strands);
      break;
    }
    case 'long':
      back = `<path d="M ${L - 8} 86 C ${L - 12} 40 ${100 - 30} 26 100 26 C ${100 + 30} 26 ${R + 12} 40 ${R + 8} 86 L ${R + 14} 196 Q ${R - 4} 206 ${R - 12} 196 L ${L + 12} 196 Q ${L + 4} 206 ${L - 14} 196 Z" fill="${darker(c, 0.12)}"/>`;
      front = `<path d="${capTop} L ${R + 2} 128 Q ${R - 8} 96 ${R - 8} 82 Q ${100 + 12} 58 ${100 - 6} 54 Q ${100 - 30} 62 ${L + 8} 86 Q ${L + 8} 100 ${L - 2} 128 Z" fill="${c}"/>${shine}${strands}`;
      break;
    case 'bob':
      back = `<path d="M ${L - 8} 86 C ${L - 12} 40 ${100 - 30} 26 100 26 C ${100 + 30} 26 ${R + 12} 40 ${R + 8} 86 L ${R + 9} 150 Q ${R - 4} 160 ${R - 14} 150 L ${L + 14} 150 Q ${L + 4} 160 ${L - 9} 150 Z" fill="${darker(c, 0.12)}"/>`;
      front = `<path d="${capTop} L ${R + 3} 112 L ${R - 5} 82 Q 100 74 ${L + 5} 82 L ${L - 3} 112 Z" fill="${c}"/>${shine}${strands}`;
      break;
    case 'ponytail':
      back = `<path d="M ${R - 6} 58 C ${R + 30} 60 ${R + 32} 110 ${R + 18} 150 C ${R + 12} 130 ${R + 4} 110 ${R - 4} 96 Z" fill="${darker(c, 0.12)}"/>`;
      front = `<path d="${capTop} L ${R - 4} 82 Q ${100 + 26} 58 100 52 Q ${100 - 26} 58 ${L + 4} 82 Z" fill="${c}"/>` +
        `<path d="M 100 30 L 100 52" stroke="${darker(c, 0.25)}" stroke-width="2" stroke-linecap="round"/>${shine}${strands}`;
      break;
    case 'bun':
      back = `<circle cx="100" cy="24" r="17" fill="${darker(c, 0.12)}"/>`;
      front = `<path d="${capTop} L ${R - 4} 82 Q ${100 + 26} 60 100 56 Q ${100 - 26} 60 ${L + 4} 82 Z" fill="${c}"/>${shine}${strands}`;
      break;
  }
  return { back, front };
}

// ---------- лицо ----------

function mouth(look: Look, skinShade: string) {
  const m = clamp(look.mood);
  if (m < 60) {
    const d = lerp(-5, 7, m / 60);
    return `<path d="M 87 141 Q 100 ${r1(141 + d)} 113 141" stroke="${darker(skinShade, 0.45)}" stroke-width="3" stroke-linecap="round" fill="none"/>`;
  }
  const open = lerp(11, 18, (m - 60) / 40);
  const t = clamp(look.teeth) / 100;
  const tooth = mix('#D8BE62', '#FFFFFF', t);
  const gapLine = mix('#8A7430', '#D5DAE0', t);
  const shape = `M 84 137 Q 100 140 116 137 Q 100 ${r1(137 + open)} 84 137 Z`;
  const id = `mth${Math.round(m)}${Math.round(look.teeth)}`;
  // кривые зубы: неровные промежутки и один «выпавший» ряд
  const xs = t < 0.5 ? [89.5, 94, 101.5, 105, 111.5] : [90, 95, 100, 105, 110];
  const lines = xs.map((x, i) => `<path d="M ${x} 137 l ${t < 0.5 ? (i % 2 ? 1.2 : -1) : 0} 8" stroke="${gapLine}" stroke-width="${t < 0.5 ? 1.3 : 0.7}"/>`).join('');
  const missing = t < 0.3 ? `<rect x="101.6" y="136" width="3.4" height="9" fill="#5A2230"/>` : '';
  return `<clipPath id="${id}"><path d="${shape}"/></clipPath>` +
    `<path d="${shape}" fill="#5A2230"/>` +
    `<g clip-path="url(#${id})"><rect x="84" y="134" width="32" height="${r1(4 + open * 0.42)}" fill="${tooth}"/>${lines}${missing}` +
    `<ellipse cx="100" cy="${r1(137 + open)}" rx="8" ry="4" fill="#E0667A"/></g>`;
}

function eyes(look: Look, skin: string, skinShade: string) {
  const tired = clamp(look.tired) / 100;
  const browColor = look.hair === 'bald' || look.hair === 'receding' ? darker(look.hairColor, 0.1) : darker(look.hairColor, 0.2);
  const worry = look.mood < 35 ? 3 : 0;
  const one = (x: number, s: 1 | -1) => {
    const lash = look.gender === 'f'
      ? `<path d="M ${x + s * 4.5} 100.5 l ${s * 4} -3" stroke="#25211F" stroke-width="1.8" stroke-linecap="round"/>` : '';
    const lid = tired > 0.55
      ? `<path d="M ${x - 6} 102 Q ${x} ${r1(97 + tired * 4)} ${x + 6} 102 L ${x + 6} 97 L ${x - 6} 97 Z" fill="${skin}"/>` : '';
    const bag = tired > 0.15
      ? `<path d="M ${x - 6} 111 Q ${x} ${r1(113 + tired * 3)} ${x + 6} 111" stroke="${darker(skinShade, 0.25)}" stroke-width="2" fill="none" stroke-linecap="round" opacity="${r1(tired)}"/>` : '';
    return `<ellipse cx="${x}" cy="104" rx="4.6" ry="5.6" fill="#25211F"/><circle cx="${x + 1.6}" cy="101.8" r="1.5" fill="#fff"/>${lid}${lash}${bag}` +
      `<path d="M ${x - s * 9} ${91 + (s === 1 ? 0 : 0) - worry * 0} Q ${x} ${87} ${x + s * 9} ${91 + 1}" stroke="${browColor}" stroke-width="3.4" stroke-linecap="round" fill="none" transform="rotate(${s * -worry * 2.2} ${x} 90)"/>`;
  };
  return one(79, -1) + one(121, 1);
}

function glasses(look: Look, g: Geo) {
  if (look.glasses === 'none') return '';
  const earL = 100 - g.tw, earR = 100 + g.tw;
  if (look.glasses === 'thick' || look.glasses === 'taped') {
    // изолента на переносице: две белые обмотки
    const tape = look.glasses === 'taped'
      ? `<rect x="94" y="94.5" width="12" height="10" rx="2" fill="#EDE7D6" transform="rotate(-6 100 99)"/><path d="M 97.5 95 l -1 9 M 102.5 94.5 l -1 9.5" stroke="#B9B19A" stroke-width="1"/>`
      : '';
    return `<g fill="#fff" fill-opacity=".22" stroke="#25211F" stroke-width="5" stroke-linejoin="round">` +
      `<rect x="61" y="90" width="34" height="27" rx="8"/><rect x="105" y="90" width="34" height="27" rx="8"/></g>` +
      `<path d="M 95 101 Q 100 97 105 101 M 61 100 L ${earL} 97 M 139 100 L ${earR} 97" stroke="#25211F" stroke-width="4.5" fill="none" stroke-linecap="round"/>` + tape;
  }
  if (look.glasses === 'round') {
    return `<g fill="#fff" fill-opacity=".16" stroke="#3B4254" stroke-width="2.6"><circle cx="79" cy="104" r="15"/><circle cx="121" cy="104" r="15"/></g>` +
      `<path d="M 94 102 Q 100 98 106 102 M 64 102 L ${earL} 98 M 136 102 L ${earR} 98" stroke="#3B4254" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
  }
  return `<g fill="#fff" fill-opacity=".14" stroke="#6B7384" stroke-width="2"><rect x="63" y="92" width="32" height="23" rx="9"/><rect x="105" y="92" width="32" height="23" rx="9"/></g>` +
    `<path d="M 95 101 Q 100 98 105 101 M 63 101 L ${earL} 98 M 137 101 L ${earR} 98" stroke="#6B7384" stroke-width="2" fill="none" stroke-linecap="round"/>`;
}

/** The zone a beard covers: jaw, chin and upper lip. Shared by facial hair and razor burn. */
function jawPath(g: Geo) {
  const { cw, jw, chinY } = g;
  return `M ${100 - cw + 2} 124 C ${100 - cw + 2} 138 ${100 - jw - 4} 146 ${100 - jw + 1} 151 C ${100 - jw + 9} 161 ${100 - 17} ${chinY + 1} 100 ${chinY + 1} C ${100 + 17} ${chinY + 1} ${100 + jw - 9} 161 ${100 + jw - 1} 151 C ${100 + jw + 4} 146 ${100 + cw - 2} 138 ${100 + cw - 2} 124 C ${100 + cw - 12} 140 118 130 100 130 C 82 130 ${100 - cw + 12} 140 ${100 - cw + 2} 124 Z`;
}

/**
 * Irritation after a dry shave: skin-toned reddening over the shaved zone that fades out
 * towards the cheeks, so it has no upper edge. Deliberately unlike acne (round spots).
 * The gradient defs are identical for every look, so one shared id is safe on a page
 * with several portraits.
 */
function razorBurn(look: Look, g: Geo, skin: string) {
  if (!look.razorBurn || look.gender === 'f') return '';
  const c = mix(skin, '#C93F4C', 0.62);
  return `<linearGradient id="razorBurnFade" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset=".1" stop-color="${c}" stop-opacity="0"/><stop offset=".55" stop-color="${c}" stop-opacity=".45"/><stop offset="1" stop-color="${c}" stop-opacity=".7"/>` +
    `</linearGradient><path d="${jawPath(g)}" fill="url(#razorBurnFade)"/>`;
}

function facial(look: Look, g: Geo) {
  if (look.facial === 'none' || look.gender === 'f') return '';
  const c = darker(look.hairColor, 0.1);
  const { jw, chinY } = g;
  const jaw = jawPath(g);
  if (look.facial === 'beard') return `<path d="${jaw}" fill="${c}"/>`;
  if (look.facial === 'stubble') return `<path d="${jaw}" fill="${c}" opacity=".24"/>`;
  // patchy: клочки
  return `<g fill="${c}" opacity=".5"><ellipse cx="${100 - jw + 6}" cy="148" rx="7" ry="5"/><ellipse cx="${100 + jw - 10}" cy="152" rx="6" ry="4"/>` +
    `<ellipse cx="96" cy="${chinY - 5}" rx="8" ry="4"/><ellipse cx="112" cy="132" rx="5" ry="2.5"/></g>`;
}

function head(look: Look, g: Geo) {
  const skin = SKIN_TONES[clamp(look.skin, 0, 4)];
  const shade = darker(skin, 0.16);
  const h = hair(look, g);
  const n = Math.round((clamp(look.acne) / 100) * ACNE_SPOTS.length);
  const sx = g.cw / 49;
  const acne = ACNE_SPOTS.slice(0, n).map(([x, y, r], i) => {
    const px = r1(100 + (x - 100) * sx);
    return `<circle cx="${px}" cy="${y}" r="${r}" fill="#D9534F" opacity=".78"/>` +
      (i % 3 === 0 ? `<circle cx="${px}" cy="${y}" r="${r1(r * 0.4)}" fill="#F6E3B8"/>` : '');
  }).join('');
  const blush = look.acne < 30 && look.tired < 50
    ? `<ellipse cx="${r1(100 - g.cw * 0.62)}" cy="124" rx="9" ry="5.5" fill="#F08A8A" opacity=".3"/><ellipse cx="${r1(100 + g.cw * 0.62)}" cy="124" rx="9" ry="5.5" fill="#F08A8A" opacity=".3"/>`
    : '';
  const hollow = look.weight < 22
    ? `<path d="M ${100 - g.cw + 6} 124 Q ${100 - g.cw + 14} 138 ${100 - g.jw + 4} 146" stroke="${shade}" stroke-width="3" fill="none" stroke-linecap="round" opacity=".7"/><path d="M ${100 + g.cw - 6} 124 Q ${100 + g.cw - 14} 138 ${100 + g.jw - 4} 146" stroke="${shade}" stroke-width="3" fill="none" stroke-linecap="round" opacity=".7"/>`
    : '';
  const chin2 = look.weight > 68
    ? `<path d="M ${100 - g.jw + 6} ${g.chinY - 6} Q 100 ${g.chinY + 16} ${100 + g.jw - 6} ${g.chinY - 6}" stroke="${shade}" stroke-width="3" fill="none" stroke-linecap="round"/>`
    : '';
  const ears =
    `<ellipse cx="${100 - g.tw - 1}" cy="106" rx="7" ry="10" fill="${skin}"/><ellipse cx="${100 + g.tw + 1}" cy="106" rx="7" ry="10" fill="${skin}"/>` +
    `<path d="M ${100 - g.tw - 3} 102 q -3 4 0 9 M ${100 + g.tw + 3} 102 q 3 4 0 9" stroke="${shade}" stroke-width="2" fill="none" stroke-linecap="round"/>` +
    (look.piercing ? `<circle cx="${100 + g.tw + 3}" cy="116" r="2.4" fill="#F4C542"/>` : '');
  const nose = `<path d="M 98 110 Q 94.5 121 100 123 Q 103.5 124 105 121.5" stroke="${shade}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
  return {
    back: h.back,
    main: `${ears}<path d="${facePath(g)}" fill="${skin}"/>${chin2}${hollow}${blush}${acne}${razorBurn(look, g, skin)}${facial(look, g)}` +
      `${eyes(look, skin, shade)}${nose}${mouth(look, shade)}${h.front}${glasses(look, g)}`,
    skin, shade,
  };
}

// ---------- одежда на портрете ----------

function torso(look: Look, g: Geo, skin: string, shade: string) {
  const c = look.topColor, dark = darker(c, 0.22), light = lighter(c, 0.18);
  const { sw, nw, shoulderY: sy } = g;
  const L = 100 - sw, R = 100 + sw;
  const body = `M ${L} 226 C ${L} ${sy + 22} ${L + 6} ${sy + 4} ${L + 26} ${sy} L ${100 - nw - 4} ${sy - 9} L ${100 + nw + 4} ${sy - 9} L ${R - 26} ${sy} C ${R - 6} ${sy + 4} ${R} ${sy + 22} ${R} 226 Z`;
  const neckTop = 150 + g.dy;
  const depth = look.neckline === 'wide' ? 15 : look.neckline === 'v' ? 20 : look.neckline === 'lapel' ? 18 : 8;
  const spread = look.neckline === 'wide' ? 9 : 4;
  const nb = sy - 9;
  const neckSkin = look.neckline === 'v' || look.neckline === 'lapel' || look.neckline === 'collar'
    ? `M ${100 - nw} ${neckTop} L ${100 - nw - spread} ${nb} L 100 ${nb + depth} L ${100 + nw + spread} ${nb} L ${100 + nw} ${neckTop} Z`
    : `M ${100 - nw} ${neckTop} L ${100 - nw - spread} ${nb} Q 100 ${nb + depth * 2} ${100 + nw + spread} ${nb} L ${100 + nw} ${neckTop} Z`;
  const chinShadow = `<path d="M ${100 - nw} ${neckTop + 8} Q 100 ${neckTop + 26} ${100 + nw} ${neckTop + 8} L ${100 + nw} ${neckTop} L ${100 - nw} ${neckTop} Z" fill="${shade}" opacity=".55"/>`;
  let detail = '', behind = '';
  switch (look.neckline) {
    case 'crew':
    case 'wide':
      detail = `<path d="M ${100 - nw - spread} ${nb} Q 100 ${nb + depth * 2} ${100 + nw + spread} ${nb}" stroke="${dark}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
      break;
    case 'v':
      detail = `<path d="M ${100 - nw - spread} ${nb} L 100 ${nb + depth} L ${100 + nw + spread} ${nb}" stroke="${dark}" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
      break;
    case 'collar':
      detail = `<path d="M ${100 - nw - 5} ${nb - 3} L 100 ${nb + depth} L ${100 - nw - 14} ${nb + 20} Z M ${100 + nw + 5} ${nb - 3} L 100 ${nb + depth} L ${100 + nw + 14} ${nb + 20} Z" fill="${light}" stroke="${dark}" stroke-width="1.5" stroke-linejoin="round"/>` +
        `<path d="M 100 ${nb + depth} L 100 226" stroke="${dark}" stroke-width="1.6"/><circle cx="100" cy="${nb + depth + 12}" r="1.8" fill="${dark}"/><circle cx="100" cy="${nb + depth + 26}" r="1.8" fill="${dark}"/>`;
      break;
    case 'hood':
      behind = `<path d="M ${100 - nw - 22} ${sy + 2} C ${100 - nw - 30} ${sy - 34} ${100 + nw + 30} ${sy - 34} ${100 + nw + 22} ${sy + 2} Z" fill="${dark}"/>`;
      detail = `<path d="M ${100 - nw - spread} ${nb} Q 100 ${nb + depth * 2} ${100 + nw + spread} ${nb}" stroke="${dark}" stroke-width="5" fill="none" stroke-linecap="round"/>` +
        `<path d="M ${100 - 8} ${nb + 14} l -1 22 M ${100 + 8} ${nb + 14} l 1 22" stroke="${light}" stroke-width="2.4" stroke-linecap="round"/>`;
      break;
    case 'lapel':
      detail = `<path d="M ${100 - nw - spread} ${nb} L 100 ${nb + depth} L ${100 + nw + spread} ${nb} L ${100 + nw + 16} ${nb + 30} L 100 226 L ${100 - nw - 16} ${nb + 30} Z" fill="#F4F6F8"/>` +
        `<path d="M ${100 - nw - spread} ${nb} L ${100 - nw - 22} ${nb + 26} L ${100 - 6} 226 M ${100 + nw + spread} ${nb} L ${100 + nw + 22} ${nb + 26} L ${100 + 6} 226" stroke="${dark}" stroke-width="2" fill="none" stroke-linejoin="round"/>`;
      break;
  }
  const care = clamp(look.clothesCare);
  const stains = care < 45
    ? `<ellipse cx="${100 - sw * 0.42}" cy="212" rx="7" ry="4.5" fill="${dark}" opacity=".5"/><ellipse cx="${100 + sw * 0.3}" cy="206" rx="4" ry="3" fill="${dark}" opacity=".45"/>` +
      `<path d="M ${100 + sw * 0.5} 198 q 6 8 2 18 M ${100 - sw * 0.2} 204 q -5 8 -1 16" stroke="${dark}" stroke-width="1.6" fill="none" opacity=".5" stroke-linecap="round"/>`
    : '';
  return {
    behind,
    main: `<path d="${body}" fill="${c}"/>${stains}<path d="${neckSkin}" fill="${skin}"/>${chinShadow}${detail}`,
  };
}

/** Содержимое портрета без тега svg. Координаты: 200×226. */
export function portraitInner(look: Look): string {
  const g = geometry(look);
  const h = head(look, g);
  const t = torso(look, g, h.skin, h.shade);
  return `${t.behind}<g transform="translate(0 ${r1(g.dy)})">${h.back}</g>${t.main}<g transform="translate(0 ${r1(g.dy)})">${h.main}</g>`;
}

export function portraitSvg(look: Look, opts: { size?: number; bg?: string; title?: string } = {}): string {
  const size = opts.size ?? 200;
  const bg = opts.bg ? `<rect width="200" height="226" fill="${opts.bg}"/>` : '';
  const title = opts.title ? `<title>${opts.title}</title>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 226" width="${size}" height="${r1(size * 1.13)}" role="img">${title}${bg}${portraitInner(look)}</svg>`;
}

// ---------- фигура в полный рост ----------

/** Фигура для зеркала. Координаты: 200×440. */
export function bodySvg(look: Look, opts: { height?: number; title?: string } = {}): string {
  const g = geometry(look);
  const h = head(look, g);
  const w = look.weight, f = look.gender === 'f';
  const slouch = (100 - clamp(look.posture)) / 100;
  const top = look.topColor, topDark = darker(top, 0.22);
  const bot = look.bottomColor, botDark = darker(bot, 0.25);

  const k = 0.5; // масштаб головы
  const headY = 8 + slouch * 12;
  const neckY = headY + 150 * k + 6;
  const shY = neckY + 14 + slouch * 6;          // линия плеч
  const sh = byWeight(w, 39, 47, 62) - (f ? 6 : 0);     // полуширина плеч
  const waist = byWeight(w, 25, 35, 72) - (f ? 5 : 0);  // полуширина талии
  const hip = byWeight(w, 29, 38, 68) + (f ? 3 : 0);
  const hipY = 232, hemY = hipY + 10;
  const belly = Math.max(0, w - 55) / 45;               // 0..1

  const torsoP = `M ${100 - sh} ${shY + 8} Q ${100 - sh} ${shY} ${100 - sh + 12} ${shY - 2} L ${100 - 10} ${shY - 8} Q 100 ${shY - 2} ${100 + 10} ${shY - 8} L ${100 + sh - 12} ${shY - 2} Q ${100 + sh} ${shY} ${100 + sh} ${shY + 8}` +
    ` C ${100 + sh - 4} ${shY + 50} ${100 + waist + belly * 6} ${shY + 70} ${100 + waist + belly * 4} ${hipY - 20} Q ${100 + hip} ${hipY} ${100 + hip - 2} ${hemY}` +
    ` L ${100 - hip + 2} ${hemY} Q ${100 - hip} ${hipY} ${100 - waist - belly * 4} ${hipY - 20} C ${100 - waist - belly * 6} ${shY + 70} ${100 - sh + 4} ${shY + 50} ${100 - sh} ${shY + 8} Z`;

  const armW = byWeight(w, 9, 12.5, 19);
  const armDrop = slouch * 6;
  const longSleeve = look.neckline === 'hood' || look.neckline === 'lapel' || look.neckline === 'collar';
  const arm = (s: 1 | -1) => {
    const x0 = 100 + s * (sh - 3), x1 = 100 + s * (sh + 8 + belly * 6), handY = hipY + 26 + armDrop;
    const sleeveEnd = longSleeve ? handY - 12 : shY + 46;
    return `<path d="M ${x0} ${shY + 6} Q ${x1 + s * 2} ${shY + 60} ${x1} ${handY}" stroke="${h.skin}" stroke-width="${armW}" stroke-linecap="round" fill="none"/>` +
      `<ellipse cx="${x1}" cy="${handY + 3}" rx="${r1(armW * 0.62)}" ry="${r1(armW * 0.78)}" fill="${h.skin}"/>` +
      `<path d="M ${x0} ${shY + 6} Q ${x1 + s * 2} ${shY + 40} ${100 + s * (sh + 5 + belly * 4 + (longSleeve ? 3 : 0))} ${sleeveEnd}" stroke="${top}" stroke-width="${armW + 4}" stroke-linecap="round" fill="none"/>`;
  };

  const legW = byWeight(w, 15, 21, 32);
  const footY = 418;
  const legX = hip * 0.52;
  const legs = look.bottom === 'skirt'
    ? `<path d="M ${100 - legX} ${hemY + 40} L ${100 - legX + 1} ${footY - 6}" stroke="${h.skin}" stroke-width="${legW - 2}" stroke-linecap="round"/>` +
      `<path d="M ${100 + legX} ${hemY + 40} L ${100 + legX - 1} ${footY - 6}" stroke="${h.skin}" stroke-width="${legW - 2}" stroke-linecap="round"/>` +
      `<path d="M ${100 - hip + 2} ${hemY - 2} L ${100 - hip - 10} ${hemY + 74} Q 100 ${hemY + 84} ${100 + hip + 10} ${hemY + 74} L ${100 + hip - 2} ${hemY - 2} Z" fill="${bot}"/>`
    : (() => {
      const wide = look.bottom === 'sweats' ? 5 : look.bottom === 'trousers' ? 2 : 0;
      const leg = (s: 1 | -1) =>
        `<path d="M ${100 + s * 1} ${hemY - 4} L ${100 + s * (hip - 1)} ${hemY - 4} L ${100 + s * (legX + legW / 2 + wide)} ${footY - 8} L ${100 + s * (legX - legW / 2 - wide * 0.4)} ${footY - 8} L ${100 + s * 1} ${hemY + 44} Z" fill="${bot}"/>`;
      const cuff = look.bottom === 'sweats'
        ? `<rect x="${100 - legX - legW / 2 - 2}" y="${footY - 14}" width="${legW + 4}" height="7" rx="3" fill="${botDark}"/><rect x="${100 + legX - legW / 2 - 2}" y="${footY - 14}" width="${legW + 4}" height="7" rx="3" fill="${botDark}"/>` : '';
      const knees = look.clothesCare < 45
        ? `<ellipse cx="${100 - legX}" cy="${hemY + 82}" rx="${legW / 2}" ry="9" fill="${lighter(bot, 0.2)}" opacity=".7"/><ellipse cx="${100 + legX}" cy="${hemY + 82}" rx="${legW / 2}" ry="9" fill="${lighter(bot, 0.2)}" opacity=".7"/>` : '';
      return leg(-1) + leg(1) + `<path d="M 100 ${hemY} L 100 ${hemY + 40}" stroke="${botDark}" stroke-width="1.6"/>` + knees + cuff;
    })();
  const shoe = (s: 1 | -1) => `<path d="M ${100 + s * (legX - 9)} ${footY - 8} h ${s * 22} q ${s * 10} 2 ${s * 10} 10 v 4 h ${s * -32} Z" fill="${look.shoeColor}" stroke="${darker(look.shoeColor, 0.3)}" stroke-width="1.5" stroke-linejoin="round"/>`;

  // вырез и детали верха
  const nb = shY - 8;
  let neck = `<rect x="${100 - 7}" y="${neckY - 12}" width="14" height="${shY - neckY + 10}" fill="${h.skin}"/>`;
  let det = '';
  if (look.neckline === 'v' || look.neckline === 'collar' || look.neckline === 'lapel') {
    neck += `<path d="M ${100 - 10} ${nb} L 100 ${nb + 16} L ${100 + 10} ${nb} Z" fill="${h.skin}"/>`;
  } else {
    neck += `<path d="M ${100 - 10 - (look.neckline === 'wide' ? 4 : 0)} ${nb} Q 100 ${nb + (look.neckline === 'wide' ? 18 : 10)} ${100 + 10 + (look.neckline === 'wide' ? 4 : 0)} ${nb} Z" fill="${h.skin}"/>`;
  }
  if (look.neckline === 'collar') det = `<path d="M 100 ${nb + 16} L 100 ${hemY}" stroke="${topDark}" stroke-width="1.4"/><path d="M ${100 - 11} ${nb - 2} L 100 ${nb + 16} L ${100 - 14} ${nb + 14} Z M ${100 + 11} ${nb - 2} L 100 ${nb + 16} L ${100 + 14} ${nb + 14} Z" fill="${lighter(top, 0.2)}" stroke="${topDark}" stroke-width="1"/>`;
  if (look.neckline === 'lapel') det = `<path d="M ${100 - 10} ${nb} L 100 ${nb + 16} L ${100 + 10} ${nb} L ${100 + 13} ${nb + 30} L ${100 + 5} ${hemY} L ${100 - 5} ${hemY} L ${100 - 13} ${nb + 30} Z" fill="#F4F6F8"/><path d="M ${100 - 10} ${nb} L ${100 - 16} ${nb + 28} L ${100 - 5} ${hemY} M ${100 + 10} ${nb} L ${100 + 16} ${nb + 28} L ${100 + 5} ${hemY}" stroke="${topDark}" stroke-width="1.5" fill="none"/>`;
  if (look.neckline === 'hood') det = `<path d="M ${100 - 5} ${nb + 12} v 20 M ${100 + 5} ${nb + 12} v 20" stroke="${lighter(top, 0.25)}" stroke-width="2" stroke-linecap="round"/><path d="M ${100 - 20} ${hipY - 30} h 40 l -4 22 h -32 Z" fill="${topDark}" opacity=".45"/>`;
  const hoodBack = look.neckline === 'hood' ? `<path d="M ${100 - 24} ${shY + 2} C ${100 - 30} ${shY - 30} ${100 + 30} ${shY - 30} ${100 + 24} ${shY + 2} Z" fill="${topDark}"/>` : '';
  const bellyLine = belly > 0.25
    ? `<path d="M ${100 - waist * 0.7} ${hipY - 26} Q 100 ${hipY - 8 + belly * 8} ${100 + waist * 0.7} ${hipY - 26}" stroke="${topDark}" stroke-width="2" fill="none" stroke-linecap="round" opacity=".55"/>` : '';
  const stains = look.clothesCare < 45
    ? `<ellipse cx="${100 - waist * 0.4}" cy="${shY + 62}" rx="6" ry="4" fill="${topDark}" opacity=".5"/><ellipse cx="${100 + waist * 0.35}" cy="${shY + 92}" rx="4" ry="3" fill="${topDark}" opacity=".45"/>` : '';

  const height = opts.height ?? 440;
  const title = opts.title ? `<title>${opts.title}</title>` : '';
  const headG = (s: string) => `<g transform="translate(${100 - 100 * k} ${r1(headY)}) scale(${k})">${s}</g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 440" width="${r1(height * 200 / 440)}" height="${height}" role="img">${title}` +
    `<ellipse cx="100" cy="${footY + 8}" rx="${hip + 26}" ry="7" fill="#0F2233" opacity=".1"/>` +
    `${hoodBack}${headG(h.back)}${arm(-1)}${arm(1)}${legs}${shoe(-1)}${shoe(1)}` +
    `<path d="${torsoP}" fill="${top}"/>${bellyLine}${stains}${neck}${det}${headG(h.main)}</svg>`;
}
