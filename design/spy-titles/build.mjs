// Builds every spy-titles asset for the round screen from MODE_ASSETS.json.
// Usage (from repo root): node design/spy-titles/build.mjs
// Then render PNGs:       python design/spy-titles/tools/render_png.py
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as cp from './src/cutpaper.mjs';
import { ANSWER_BOX, FRAME, SAFE, TWIST, fitAnswer, wrapTwist } from './src/layout.mjs';

const ROOT = dirname(fileURLToPath(import.meta.url));
const REPO = join(ROOT, '..', '..');
const readJson = (p) => JSON.parse(readFileSync(join(ROOT, p), 'utf8'));
const MODE_ASSETS = readJson('../MODE_ASSETS.json');
const GLYPHS = readJson('src/glyphs.json');
const SHARED = MODE_ASSETS.shared;
const INK = Object.fromEntries(Object.entries(SHARED.palette).map(([k, v]) => [k, v.hex]));
const PROP = Object.fromEntries(Object.entries(SHARED.prop_variants).map(([k, v]) => [k, v.hex]));
const MODES = Object.fromEntries(MODE_ASSETS.modes.map((m) => [m.mode_id, m]));
const SHADOW = { op: SHARED.paper_shadow_spec.opacity, dx: SHARED.paper_shadow_spec.offset_px[0], dy: SHARED.paper_shadow_spec.offset_px[1] };
const SEAM_W = SHARED.seam_px * 2; // stroke sits under the fill, so half of it shows
const VERSION = '0.1.0-proposal';
const CREATED = '2026-11-20';
const FONT = "'Noto Sans SC', sans-serif";

// Icons are authored on a 512 grid and displayed at ~200 px, so their
// edge / seam / shadow numbers are scaled up to land on the frame values.
const ICON_K = 512 / 200;
const ICON_EDGE = { amp: 1.3 * ICON_K, segMin: 12 * ICON_K, segMax: 26 * ICON_K, cornerClip: 2 * ICON_K, nickDepth: 2 * ICON_K };
const ICON_PIECE = { seamW: SEAM_W * ICON_K, sdx: SHADOW.dx * ICON_K, sdy: SHADOW.dy * ICON_K };
const BIG_EDGE = { amp: 1.6, segMin: 26, segMax: 70, cornerClip: 3, nickDepth: 2.6 };

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const f1 = (v) => String(+v.toFixed(1));
const f2 = (v) => String(+v.toFixed(2));

// ---------------------------------------------------------------- pieces

function piece(shape, fill, o = {}) {
  const { seam = null, seamW = SEAM_W, shadow = true, sdx = SHADOW.dx, sdy = SHADOW.dy, tf = '', rule = '', id = '' } = o;
  const d = typeof shape === 'string' ? shape : cp.toPath(shape);
  const fr = rule ? ` fill-rule="${rule}"` : '';
  const idAttr = id ? ` id="${id}"` : '';
  let s = '';
  if (shadow) {
    // Shadow offset lives in screen space; only the outline follows the piece.
    s += `<path d="${d}"${fr} fill="${INK.ink_black}" fill-opacity="${SHADOW.op}" transform="translate(${f2(sdx)} ${f2(sdy)})${tf ? ' ' + tf : ''}"/>`;
  }
  const stroke = seam ? ` stroke="${seam}" stroke-width="${f2(seamW)}" stroke-linejoin="round" paint-order="stroke"` : '';
  s += `<path${idAttr} d="${d}"${fr} fill="${fill}"${stroke}${tf ? ` transform="${tf}"` : ''}/>`;
  return s;
}

const cutRect = (x, y, w, h, seed, edge = {}) => cp.cutPolygon(cp.rect(x, y, w, h), seed, edge);

// ---------------------------------------------------------------- texture

function texture(id = 'paper-tex', size = 512) {
  const r = cp.rng('paper-fibre-ink-wear');
  const parts = [];
  parts.push(`<rect width="${size}" height="${size}" fill="${INK.ink_black}" filter="url(#${id}-mottle)"/>`);
  const wrap = (x, y, fn) => {
    for (const dx of [-size, 0, size]) for (const dy of [-size, 0, size]) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx > -40 && nx < size + 40 && ny > -40 && ny < size + 40) parts.push(fn(nx, ny));
    }
  };
  for (let i = 0; i < 170; i++) {
    const x = r() * size, y = r() * size, a = r() * Math.PI, len = 6 + r() * 16, bend = (r() - 0.5) * 6;
    const ex = Math.cos(a) * len, ey = Math.sin(a) * len;
    const op = 0.05 + r() * 0.09, w = 0.5 + r() * 0.5;
    wrap(x, y, (px, py) => `<path d="M${f1(px)} ${f1(py)}q${f1(ex / 2 - ey * bend / len)} ${f1(ey / 2 + ex * bend / len)} ${f1(ex)} ${f1(ey)}" fill="none" stroke="${INK.ink_black}" stroke-opacity="${f2(op)}" stroke-width="${f2(w)}" stroke-linecap="round"/>`);
  }
  for (let i = 0; i < 26; i++) {
    const x = r() * size, y = r() * size, rad = 0.6 + r() * 1.4, op = 0.3 + r() * 0.3;
    const pts = cp.cutEllipse(0, 0, rad, rad * (0.6 + r() * 0.6), `speck-d-${i}`, { facet: 1, amp: rad * 0.25 });
    wrap(x, y, (px, py) => `<path d="${cp.toPath(cp.translate(pts, px, py), 2)}" fill="${INK.ink_black}" fill-opacity="${f2(op)}"/>`);
  }
  for (let i = 0; i < 4; i++) {
    const x = r() * size, y = r() * size, rad = 2.4 + r() * 1.8;
    const pts = cp.cutEllipse(0, 0, rad, rad * 0.7, `leak-${i}`, { facet: 1.2, amp: rad * 0.35 });
    wrap(x, y, (px, py) => `<path d="${cp.toPath(cp.translate(pts, px, py), 2)}" fill="${INK.ink_black}" fill-opacity="0.22"/>`);
  }
  for (let i = 0; i < 22; i++) {
    const x = r() * size, y = r() * size, a = ((-30 + (r() - 0.5) * 80) * Math.PI) / 180, len = 8 + r() * 26;
    const op = 0.12 + r() * 0.13, w = 0.6 + r() * 0.5;
    wrap(x, y, (px, py) => `<path d="M${f1(px)} ${f1(py)}l${f1(Math.cos(a) * len)} ${f1(Math.sin(a) * len)}" stroke="${INK.paper_cream}" stroke-opacity="${f2(op)}" stroke-width="${f2(w)}" stroke-linecap="round"/>`);
  }
  for (let i = 0; i < 40; i++) {
    const x = r() * size, y = r() * size, rad = 0.5 + r() * 1.0, op = 0.3 + r() * 0.25;
    const pts = cp.cutEllipse(0, 0, rad, rad * (0.6 + r() * 0.5), `speck-l-${i}`, { facet: 1, amp: rad * 0.25 });
    wrap(x, y, (px, py) => `<path d="${cp.toPath(cp.translate(pts, px, py), 2)}" fill="${INK.paper_cream}" fill-opacity="${f2(op)}"/>`);
  }
  const filter = `<filter id="${id}-mottle" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="3" seed="7" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 0.106 0 0 0 0 0.090 0 0 0 0 0.078 0.26 0 0 0 -0.10"/></filter>`;
  return {
    defs: `${filter}<pattern id="${id}" width="${size}" height="${size}" patternUnits="userSpaceOnUse">${parts.join('')}</pattern>`,
    tile: `<defs>${filter}</defs>${parts.join('')}`,
    overlay: (w, h) => `<rect width="${w}" height="${h}" fill="url(#${id})" pointer-events="none"/>`,
  };
}

// ---------------------------------------------------------------- type

const glyphCache = new Map();
function glyphPath(ch, seed) {
  const key = `${ch}|${seed}`;
  if (glyphCache.has(key)) return glyphCache.get(key);
  const g = GLYPHS.glyphs[ch];
  if (!g) throw new Error(`glyph "${ch}" not extracted: add it to src/static-labels.json and rerun tools/extract_glyphs.py`);
  const contours = g.c.map((flat) => {
    const pts = [];
    for (let i = 0; i < flat.length; i += 2) pts.push([flat[i], flat[i + 1]]);
    return pts;
  });
  let big = contours[0];
  for (const c of contours) if (Math.abs(cp.signedArea(c)) > Math.abs(cp.signedArea(big))) big = c;
  const inkSign = Math.sign(cp.signedArea(big)) || 1;
  const cut = contours.map((c, k) => cp.cutPolygon(c, `${seed}#${k}`, { amp: 10, segMin: 60, segMax: 150, cornerClip: 0, nickChance: 0.06, nickDepth: 20, inkSign }));
  const d = cp.toPath(cut, 0);
  glyphCache.set(key, d);
  return d;
}

// Fixed labels: real outlines re-cut by hand-cut rules, uneven baseline,
// rotation and width (spy-titles-12). Optional knife slice in the surface colour.
function cutType(str, o) {
  const { x, y, size, fill, seed, anchor = 'start', tracking = 0.03, rot = 1.8, dy = 0.035, slice = null } = o;
  const s = size / GLYPHS.upm;
  const r = cp.rng(`${seed}|layout`);
  const items = [];
  let pen = 0;
  Array.from(str).forEach((ch, i) => {
    if (ch === ' ') { pen += size * 0.28; return; }
    const g = GLYPHS.glyphs[ch];
    if (!g) throw new Error(`glyph "${ch}" not extracted`);
    const sx = 0.94 + r() * 0.1;
    const w = g.w * s * sx;
    items.push({ ch, i, px: pen, w, sx, rot: (r() * 2 - 1) * rot, dy: (r() * 2 - 1) * dy * size });
    pen += w + size * tracking;
  });
  const width = pen - size * tracking;
  const x0 = anchor === 'middle' ? x - width / 2 : anchor === 'end' ? x - width : x;
  let svg = items.map((it) => {
    const cx = x0 + it.px + it.w / 2;
    const cy = y + it.dy - size * 0.38;
    return `<path d="${glyphPath(it.ch, `${seed}:${it.i}`)}" fill="${fill}" transform="translate(${f1(cx)} ${f1(cy)}) rotate(${f2(it.rot)}) translate(${f1(-it.w / 2)} ${f1(size * 0.38)}) scale(${(s * it.sx).toFixed(4)} ${s.toFixed(4)})"/>`;
  }).join('');
  if (slice) svg += knifeSlice(x0, width, y, size, slice, seed);
  return { svg: `<g>${svg}</g>`, width, x0 };
}

function knifeSlice(x0, width, baseline, size, color, seed) {
  const r = cp.rng(`${seed}|slice`);
  const t = Math.max(1.6, size * 0.026);
  const yc = baseline - size * (0.3 + r() * 0.08);
  const tilt = Math.tan(((r() * 2 - 1) * 2.5 * Math.PI) / 180) * (width + 8);
  const pts = [[x0 - 4, yc - t / 2], [x0 + width + 4, yc - t / 2 + tilt], [x0 + width + 4, yc + t / 2 + tilt], [x0 - 4, yc + t / 2]];
  return `<path d="${cp.toPath(pts)}" fill="${color}"/>`;
}

function liveText(str, { x, y, size, fill, weight = 500, anchor = 'start', opacity = null }) {
  const op = opacity == null ? '' : ` fill-opacity="${opacity}"`;
  return `<text x="${f1(x)}" y="${f1(y)}" font-family="${esc(FONT)}" font-size="${size}" font-weight="${weight}" fill="${fill}"${op}${anchor !== 'start' ? ` text-anchor="${anchor}"` : ''}>${esc(str)}</text>`;
}

// Dynamic answer: live text (any of the 30+ prompts), treated per character
// so it can be reproduced at runtime: alternating weight, tiny rotation and
// baseline drift, plus one knife slice per line in the card colour.
function answerText(answer, box, { fill, slice, seed }) {
  const fit = fitAnswer(answer, box);
  const r = cp.rng(`${seed}|answer`);
  const total = fit.lines.length * fit.lineHeight;
  const top = box.y + (box.h - total) / 2;
  const cx = box.x + box.w / 2;
  let svg = '';
  fit.lines.forEach((line, k) => {
    const chars = Array.from(line);
    const lw = chars.length * fit.size;
    const base = top + fit.lineHeight * k + fit.lineHeight / 2 + fit.size * 0.36;
    chars.forEach((ch, i) => {
      const x = cx - lw / 2 + i * fit.size + fit.size / 2;
      const y = base + (r() * 2 - 1) * fit.size * 0.025;
      const rot = (r() * 2 - 1) * 1.4;
      svg += `<text x="${f1(x)}" y="${f1(y)}" font-family="${esc(FONT)}" font-size="${fit.size}" font-weight="${(i + k) % 2 ? 800 : 900}" fill="${fill}" text-anchor="middle" transform="rotate(${f2(rot)} ${f1(x)} ${f1(y - fit.size * 0.36)})">${esc(ch)}</text>`;
    });
    svg += knifeSlice(cx - lw / 2, lw, base, fit.size, slice, `${seed}:${k}`);
  });
  return { svg, fit };
}

// ---------------------------------------------------------------- icons (512 grid)

const rotAll = (contours, deg, cx, cy) => contours.map((c) => cp.rotate(c, deg, cx, cy));

function iconMicrophone({ backingSeam = null } = {}) {
  const C = INK.paper_cream;
  const pivot = [236, 262];
  const R = (pts) => cp.rotate(pts, -16, ...pivot);
  const E = ICON_EDGE;
  let s = '';
  s += piece(cp.cutPolygon([[64, 86], [392, 48], [452, 214], [430, 468], [96, 452], [48, 262]], 'mic-back', { ...E, amp: E.amp * 1.3 }), C, { ...ICON_PIECE, seam: backingSeam });
  s += piece(R(cp.cutArcBand(236, 196, 134, 152, -64, 6, 'mic-wave-1', { facet: 30, amp: 2.4 })), INK.warm_secondary, { ...ICON_PIECE, seam: C });
  s += piece(R(cp.cutArcBand(236, 196, 172, 190, -58, 0, 'mic-wave-2', { facet: 30, amp: 2.4 })), INK.warm_secondary, { ...ICON_PIECE, seam: C });
  s += piece(R(cutRect(220, 300, 32, 96, 'mic-stem', E)), INK.ink_black, { ...ICON_PIECE, seam: C });
  s += piece(R(cp.cutPolygon([[156, 392], [316, 392], [340, 428], [132, 428]], 'mic-base', E)), INK.ink_black, { ...ICON_PIECE, seam: C });
  s += piece(R(cp.cutPolygon(cp.stadium(236, 196, 150, 228, 20), 'mic-head', { ...E, cornerClip: 0 })), INK.ink_black, { ...ICON_PIECE, seam: C });
  for (let k = 0; k < 5; k++) {
    s += piece(R(cutRect(198, 112 + k * 23, 76, 9, `mic-slit-${k}`, { amp: 1.2, segMin: 16, segMax: 30, cornerClip: 1.2, nickChance: 0 })), C, { ...ICON_PIECE, shadow: false });
  }
  s += piece(R(cutRect(150, 238, 172, 30, 'mic-band', E)), INK.hot_ink, { ...ICON_PIECE, seam: C });
  return s;
}

const HAND = [[190, 430], [180, 290], [130, 260], [110, 215], [118, 195], [140, 200], [170, 230], [200, 245], [205, 100], [215, 78], [232, 72], [248, 80], [252, 100], [256, 210], [262, 210], [262, 70], [272, 50], [290, 44], [305, 52], [310, 72], [312, 210], [318, 210], [318, 85], [328, 68], [344, 64], [358, 74], [360, 92], [362, 222], [368, 222], [368, 130], [376, 116], [390, 114], [400, 124], [402, 140], [398, 260], [385, 320], [360, 370], [340, 430]];

function iconGesture({ backingSeam = null } = {}) {
  const C = INK.paper_cream;
  const pivot = [290, 300];
  const R = (pts) => cp.rotate(pts, -10, ...pivot);
  const E = ICON_EDGE;
  let s = '';
  s += piece(cp.cutPolygon([[58, 70], [420, 40], [462, 240], [440, 470], [80, 460], [40, 250]], 'hand-back', { ...E, amp: E.amp * 1.3 }), C, { ...ICON_PIECE, seam: backingSeam });
  s += piece(R(cp.cutArcBand(290, 300, 196, 214, 196, 244, 'hand-motion-1', { facet: 30, amp: 2.4 })), INK.warm_secondary, { ...ICON_PIECE, seam: C });
  s += piece(R(cp.cutArcBand(290, 300, 228, 244, 202, 238, 'hand-motion-2', { facet: 30, amp: 2.4 })), INK.warm_secondary, { ...ICON_PIECE, seam: C });
  s += piece(R(cp.cutArcBand(290, 300, 258, 272, 208, 232, 'hand-motion-3', { facet: 30, amp: 2.4 })), INK.warm_secondary, { ...ICON_PIECE, seam: C });
  s += piece(R(cp.cutPolygon([[186, 450], [364, 450], [376, 500], [172, 500]], 'hand-sleeve', E)), INK.ink_black, { ...ICON_PIECE, seam: C });
  s += piece(R(cp.cutPolygon(HAND, 'hand', { ...E, segMin: 10 * ICON_K, segMax: 20 * ICON_K })), INK.ink_black, { ...ICON_PIECE, seam: C });
  s += piece(R(cutRect(178, 424, 194, 32, 'hand-cuff', E)), INK.hot_ink, { ...ICON_PIECE, seam: C });
  return s;
}

function keyhole() {
  const pts = [];
  const cx = 256, cy = 228, r = 50;
  for (let i = 0; i <= 16; i++) {
    const a = ((62 - (304 * i) / 16) * Math.PI) / 180;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  pts.push([220, 340], [292, 340]);
  return pts;
}

// Task identifier. `rot` rotates the already-cut outlines, so the placed mark
// keeps exactly the same edges as the standalone file.
function iconMissionMark({ rot = 0, seam = INK.paper_cream } = {}) {
  const C = INK.paper_cream;
  const R = (shape) => (Array.isArray(shape[0][0]) ? rotAll(shape, rot, 256, 256) : cp.rotate(shape, rot, 256, 256));
  const E = ICON_EDGE;
  let s = '';
  s += piece(R(cp.cutEllipse(256, 256, 206, 206, 'mark-disc', { facet: 30, amp: 2.6 })), INK.ink_black, { ...ICON_PIECE, seam });
  s += piece(R([cp.cutEllipse(256, 256, 170, 170, 'mark-ring-o', { facet: 28, amp: 2.2 }), cp.cutEllipse(256, 256, 146, 146, 'mark-ring-i', { facet: 26, amp: 2.2 })]), C, { ...ICON_PIECE, seam: null, rule: 'evenodd' });
  [30, 120, 210, 300].forEach((deg, k) => {
    const bar = cp.rotate(cp.cutPolygon(cp.rect(256 + 92, 250, 108, 13), `mark-bar-${k}`, { ...E, nickChance: 0 }), deg, 256, 256);
    s += piece(R(bar), C, { ...ICON_PIECE, shadow: false });
  });
  s += piece(R(cp.cutPolygon(keyhole(), 'mark-keyhole', { ...E, segMin: 8 * ICON_K, segMax: 16 * ICON_K })), INK.warm_secondary, { ...ICON_PIECE, seam: INK.ink_black });
  const tab = cp.rotate(cp.cutPolygon(cp.rect(372, 120, 104, 36), 'mark-tab', E), -30, 424, 138);
  s += piece(R(tab), INK.hot_ink, { ...ICON_PIECE, seam: INK.ink_black });
  return s;
}

// ---------------------------------------------------------------- patterns (frame grid, transparent)

function patternDiagonalCut() {
  const fill = PROP.paper_cream;
  const o = { seam: null };
  let s = '';
  s += piece(cp.cutEllipse(700, 210, 290, 290, 'diag-sun', { facet: 34, amp: 1.8 }), fill, o);
  s += piece(cp.cutPolygon([[-60, 1010], [820, 502], [820, 676], [-60, 1184]], 'diag-band-a', BIG_EDGE), fill, o);
  s += piece(cp.cutPolygon([[-60, 1290], [820, 782], [820, 818], [-60, 1326]], 'diag-band-b', BIG_EDGE), fill, o);
  s += piece(cp.cutPolygon([[-60, 430], [300, 222], [300, 258], [-60, 466]], 'diag-band-c', BIG_EDGE), fill, o);
  return s;
}

function patternLayerMotion() {
  const fill = PROP.warm_secondary;
  const o = { seam: null };
  const u = [Math.cos(Math.PI / 6), -Math.sin(Math.PI / 6)];
  const n = [Math.sin(Math.PI / 6), Math.cos(Math.PI / 6)];
  const strip = (ox, oy, len, th, seed) => cp.cutPolygon([[ox, oy], [ox + u[0] * len, oy + u[1] * len], [ox + u[0] * len + n[0] * th, oy + u[1] * len + n[1] * th], [ox + n[0] * th, oy + n[1] * th]], seed, BIG_EDGE);
  let s = '';
  s += piece(cp.cutEllipse(80, 780, 230, 230, 'motion-disc', { facet: 34, amp: 1.8 }), fill, o);
  [900, 720, 540, 380].forEach((len, i) => {
    s += piece(strip(-60 + n[0] * i * 70, 1150 + n[1] * i * 70, len, 46, `motion-strip-${i}`), fill, o);
  });
  [360, 260, 170].forEach((len, i) => {
    s += piece(strip(420 + n[0] * i * 52, 260 + n[1] * i * 52, len, 30, `motion-top-${i}`), fill, o);
  });
  return s;
}

const PATTERNS = {
  'patterns/diagonal-cut-composition.svg': patternDiagonalCut,
  'patterns/paper-layer-motion.svg': patternLayerMotion,
};
const ICONS = {
  'icons/cut-paper-microphone.svg': iconMicrophone,
  'icons/cut-paper-gesture.svg': iconGesture,
};

// ---------------------------------------------------------------- task card (local 690 x 544)

export const CARD = Object.freeze({
  w: 690, h: 544, cut: [130, 75],
  answer: { x: 50, y: 88, w: ANSWER_BOX.w, h: ANSWER_BOX.h },
  forbidden: { x: 50, y: 424, h: 42 },
  tab: { x: -10, y: -28, w: 306, h: 48 },
  mark: { cx: 584, cy: 30, size: 112, rot: 12 },
});

function cardShellPoints() {
  const { w, h, cut } = CARD;
  return cp.cutPolygon([[0, 0], [w - cut[0], 0], [w, cut[1]], [w, h], [0, h]], 'task-card', BIG_EDGE);
}

function taskCard({ ground, view = 'performer', state = 'playing', answer = null, forbidden = [], forbiddenLabel = '禁说', tf = '' }) {
  const last = state === 'last_call';
  let s = piece(cardShellPoints(), INK.ink_black, { seam: ground, tf, id: 'card-shell' });
  let inner = '';
  const tab = CARD.tab;
  const tabFill = last ? INK.hot_ink : INK.paper_cream;
  inner += piece(cp.cutPolygon([[tab.x, tab.y], [tab.x + tab.w - 10, tab.y], [tab.x + tab.w + 10, tab.y + tab.h], [tab.x, tab.y + tab.h]], 'card-tab', { amp: 1.2, segMin: 18, segMax: 40, cornerClip: 2 }), tabFill, { seam: ground, id: 'slot-tab' });
  const tabLabel = last ? '最后 10 秒' : view === 'guesser' ? '绝密 · 表演者可见' : '绝密 · 仅你可见';
  inner += cutType(tabLabel, { x: tab.x + 24, y: tab.y + tab.h / 2 + 10, size: 28, fill: last ? INK.paper_cream : INK.ink_black, seed: `tab:${tabLabel}` }).svg;
  const m = CARD.mark;
  const k = m.size / 512;
  inner += `<g id="slot-mark" transform="translate(${f1(m.cx - m.size / 2)} ${f1(m.cy - m.size / 2)}) scale(${f2(k)})">${iconMissionMark({ rot: m.rot, seam: ground })}</g>`;
  if (view === 'guesser') {
    const big = 230;
    inner += `<g transform="translate(${f1(CARD.w / 2 - big / 2)} ${f1(118)}) scale(${(big / 512).toFixed(4)})">${iconMissionMark({ rot: -8, seam: INK.ink_black })}</g>`;
    inner += cutType('目标已封存', { x: CARD.w / 2, y: 430, size: 56, fill: INK.paper_cream, seed: 'sealed', anchor: 'middle', slice: INK.ink_black }).svg;
  } else if (answer) {
    inner += answerText(answer, CARD.answer, { fill: INK.paper_cream, slice: INK.ink_black, seed: `answer:${answer}` }).svg;
    if (forbidden.length) {
      const fb = CARD.forbidden;
      inner += piece(cutRect(fb.x, fb.y + 2, 84, fb.h - 2, 'forbid-tag', { amp: 1.1, segMin: 14, segMax: 28, cornerClip: 1.5 }), INK.hot_ink, { seam: INK.ink_black, shadow: false });
      inner += cutType(forbiddenLabel, { x: fb.x + 42, y: fb.y + 32, size: 28, fill: INK.paper_cream, seed: `forbid:${forbiddenLabel}`, anchor: 'middle' }).svg;
      let x = fb.x + 106;
      for (const term of forbidden) {
        const w = Array.from(term).length * 30;
        inner += liveText(term, { x, y: fb.y + 32, size: 30, fill: INK.paper_cream, weight: 700 });
        // Underline, not strike-through: a bar through 口 reads as 日.
        inner += `<path d="${cp.toPath(cutRect(x - 2, fb.y + 38, w + 4, 4, `strike:${term}`, { amp: 0.4, segMin: 10, segMax: 20, cornerClip: 0.5, nickChance: 0 }))}" fill="${INK.hot_ink}"/>`;
        x += w + 30;
      }
    }
  }
  s += tf ? `<g transform="${tf}">${inner}</g>` : inner;
  return s;
}

function guides() {
  const g = (x, y, w, h, label) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="${INK.hot_ink}" stroke-width="1.5" stroke-dasharray="6 4"/>` + liveText(label, { x: x + 6, y: y + 20, size: 16, fill: INK.hot_ink, weight: 700 });
  const a = CARD.answer, fb = CARD.forbidden, t = CARD.tab, m = CARD.mark;
  return `<g id="guides" display="none">${g(a.x, a.y, a.w, a.h, `slot-answer ${a.w}×${a.h} · fitAnswer()`)}${g(fb.x, fb.y, CARD.w - 100, fb.h, 'slot-forbidden')}${g(t.x, t.y, t.w, t.h, 'slot-tab')}${g(m.cx - m.size / 2, m.cy - m.size / 2, m.size, m.size, 'slot-mark')}</g>`;
}

// ---------------------------------------------------------------- frame parts

function seal(cx, cy, seconds, last, ground) {
  const r = last ? 100 : 88;
  let s = piece(cp.cutEllipse(cx, cy, r, r, last ? 'seal-last' : 'seal', { facet: 20, amp: 1.4 }), last ? INK.hot_ink : INK.ink_black, { seam: ground });
  s += piece([cp.cutEllipse(cx, cy, r - 11, r - 11, 'seal-ring-o', { facet: 18, amp: 1 }), cp.cutEllipse(cx, cy, r - 17, r - 17, 'seal-ring-i', { facet: 18, amp: 1 })], INK.paper_cream, { shadow: false, rule: 'evenodd' });
  s += cutType(String(seconds).padStart(2, '0'), { x: cx, y: cy + (last ? 38 : 33), size: last ? 104 : 92, fill: INK.paper_cream, seed: 'seal-digits', anchor: 'middle', tracking: 0.0 }).svg;
  return s;
}

function header(mode, ground, cfg) {
  const last = cfg.state === 'last_call';
  let s = liveText(cfg.context, { x: 30, y: 226, size: 24, fill: INK.ink_black, weight: 700 });
  const icon = mode.mode_id === 'verbal' ? iconMicrophone : iconGesture;
  s += `<g id="mode-mark" transform="translate(22 246) scale(${(200 / 512).toFixed(4)})">${icon({ backingSeam: ground })}</g>`;
  s += cutType(mode.name, { x: 238, y: 352, size: 72, fill: INK.ink_black, seed: `mode:${mode.mode_id}` }).svg;
  s += seal(640, 330, cfg.seconds, last, ground);
  const strip = cp.cutPolygon([[-12, 462], [762, 450], [762, 508], [-12, 520]], 'rule-strip', BIG_EDGE);
  s += piece(strip, INK.ink_black, { seam: ground });
  const title = cutType(mode.rule_title, { x: 30, y: 498, size: 30, fill: INK[mode.accent_role], seed: `rule:${mode.mode_id}` });
  s += `<g transform="rotate(-0.89 375 486)">${title.svg}${liveText(mode.rule_description, { x: 30 + title.width + 18, y: 496, size: 26, fill: INK.paper_cream, weight: 500 })}</g>`;
  return s;
}

function twistStrip(twist, ground) {
  const wrap = wrapTwist(twist.instruction);
  if (wrap.overflow) throw new Error(`twist too long for ${TWIST.maxLines} lines: ${twist.instruction}`);
  const y0 = 1060;
  const h = 20 + 40 + 16 + wrap.lines.length * TWIST.lineHeight + 6;
  let inner = piece(cp.cutPolygon([[8, y0 + 6], [744, y0], [736, y0 + h], [14, y0 + h + 8]], `twist-strip-${wrap.lines.length}`, BIG_EDGE), INK.paper_cream, { seam: ground });
  inner += piece(cutRect(34, y0 + 20, 136, 42, 'twist-tag', { amp: 1.1, segMin: 14, segMax: 30, cornerClip: 1.5 }), INK.warm_secondary, { seam: INK.paper_cream, shadow: false });
  inner += cutType('脑洞指令', { x: 102, y: y0 + 51, size: 26, fill: INK.ink_black, seed: 'twist-label', anchor: 'middle' }).svg;
  inner += liveText(twist.title, { x: 186, y: y0 + 52, size: 32, fill: INK.ink_black, weight: 900 });
  wrap.lines.forEach((line, k) => {
    inner += liveText(line, { x: 40, y: y0 + 106 + k * TWIST.lineHeight, size: TWIST.size, fill: INK.ink_black, weight: 500 });
  });
  return { svg: `<g id="twist" transform="rotate(-1.6 375 ${f1(y0 + h / 2)})">${inner}</g>`, bottom: y0 + h + 8, lines: wrap.lines.length };
}

function actions(ground, last, view) {
  let s = piece(cp.cutPolygon([[-12, 1330], [762, 1294], [762, 1640], [-12, 1640]], 'action-base', BIG_EDGE), last ? INK.hot_ink : INK.ink_black, { seam: null });
  if (view === 'guesser') {
    s += liveText('由描述者判定 猜对 / 跳过（规则待定）', { x: 375, y: 1474, size: 28, fill: INK.paper_cream, weight: 700, anchor: 'middle' });
    return s;
  }
  s += piece(cp.cutPolygon([[40, 1386], [290, 1378], [298, 1530], [34, 1538]], 'btn-skip', BIG_EDGE), INK.warm_secondary, { seam: ground, id: 'btn-skip' });
  s += cutType('跳过', { x: 166, y: 1477, size: 54, fill: INK.ink_black, seed: 'btn-skip', anchor: 'middle' }).svg;
  s += piece(cp.cutPolygon([[322, 1374], [662, 1366], [716, 1398], [712, 1538], [326, 1542]], 'btn-correct', BIG_EDGE), INK.paper_cream, { seam: ground, id: 'btn-correct' });
  s += cutType('猜对', { x: 519, y: 1483, size: 76, fill: INK.ink_black, seed: 'btn-correct', anchor: 'middle', slice: INK.paper_cream }).svg;
  return s;
}

function svgDoc(w, h, body, { defs = '', title = '' } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${title ? `<title>${esc(title)}</title>` : ''}${defs ? `<defs>${defs}</defs>` : ''}${body}</svg>\n`;
}

function frame(cfg) {
  const mode = MODES[cfg.mode];
  const ground = INK[mode.ground_role];
  const last = cfg.state === 'last_call';
  const tex = texture();
  let s = `<rect width="${FRAME.w}" height="${FRAME.h}" fill="${ground}"/>`;
  s += `<g id="props">${PATTERNS[mode.pattern_asset]()}</g>`;
  s += header(mode, ground, cfg);
  const cardTf = 'translate(30 548) rotate(-1.2 345 272)';
  s += `<g id="task-card">${taskCard({ ground, view: cfg.view, state: cfg.state, answer: cfg.answer, forbidden: cfg.forbidden, forbiddenLabel: cfg.forbiddenLabel, tf: cardTf })}</g>`;
  const tw = twistStrip(cfg.twist, ground);
  s += tw.svg;
  s += actions(ground, last, cfg.view);
  s += tex.overlay(FRAME.w, FRAME.h);
  if (tw.bottom > 1294) throw new Error(`${cfg.id}: twist strip overlaps action base (${tw.bottom})`);
  return svgDoc(FRAME.w, FRAME.h, s, { defs: tex.defs, title: `${cfg.id} · ${mode.name} · ${cfg.state} · ${cfg.view}` });
}

// ---------------------------------------------------------------- master sheets

function sheet(w, h, body, bg = INK.paper_cream) {
  const tex = texture();
  return svgDoc(w, h, `<rect width="${w}" height="${h}" fill="${bg}"/>${body}${tex.overlay(w, h)}`, { defs: tex.defs });
}

function zoomInset(id, content, { sx, sy, sw, sh, dx, dy, k }) {
  return `<clipPath id="${id}"><rect x="${dx}" y="${dy}" width="${sw * k}" height="${sh * k}"/></clipPath><g clip-path="url(#${id})"><rect x="${dx}" y="${dy}" width="${sw * k}" height="${sh * k}" fill="${INK.paper_cream}"/><g transform="translate(${dx - sx * k} ${dy - sy * k}) scale(${k})">${content}</g></g>`;
}

function masterHandCutEdge() {
  const rectP = cutRect(40, 90, 260, 150, 'edge-sample-rect');
  const circ = cp.cutEllipse(440, 165, 78, 78, 'edge-sample-circle', { facet: 22, amp: 1.2 });
  const para = cp.cutPolygon([[560, 240], [800, 101], [860, 101], [620, 240]], 'edge-sample-para');
  const samples = piece(rectP, INK.ink_black, {}) + piece(circ, INK.hot_ink, {}) + piece(para, INK.warm_secondary, {});
  const ideal = `<path d="M40 90H300" stroke="${INK.hot_ink}" stroke-width="0.4" stroke-dasharray="2 1.5" fill="none"/>`;
  let s = liveText('手剪边 hand-cut edge · cutPolygon() / cutEllipse()', { x: 40, y: 50, size: 26, fill: INK.ink_black, weight: 900 });
  s += samples;
  s += zoomInset('edge-zoom', samples + ideal, { sx: 30, sy: 76, sw: 110, sh: 42, dx: 40, dy: 290, k: 4 });
  s += liveText('4× 放大：一串短直剪刀线 + 偶发回剪小缺口；虚线为理想直边', { x: 40, y: 480, size: 18, fill: INK.ink_black, weight: 500 });
  const e = cp.EDGE_DEFAULTS;
  const lines = [`amp ±${e.amp}px（垂直偏移）`, `segMin–segMax ${e.segMin}–${e.segMax}px（单刀长度）`, `cornerClip ${e.cornerClip}px（角点不剪满）`, `nickChance ${e.nickChance} · nickDepth ${e.nickDepth}px`, '轮廓在纸片局部坐标一次生成并缓存', '移动/旋转/缩放时边缘不变（spy-titles-03）'];
  lines.forEach((t, i) => { s += liveText(t, { x: 500, y: 320 + i * 30, size: 18, fill: INK.ink_black, weight: i < 4 ? 700 : 500 }); });
  return sheet(900, 520, s);
}

function masterSeam() {
  const base = cutRect(40, 90, 520, 260, 'seam-base', BIG_EDGE);
  const a = cutRect(80, 130, 200, 90, 'seam-a');
  const b = cutRect(80, 226, 200, 90, 'seam-b');
  const c = cp.cutPolygon([[300, 140], [520, 120], [530, 300], [320, 320]], 'seam-c');
  const art = piece(base, INK.ink_black, { seam: INK.paper_cream }) + piece(a, INK.paper_cream, { seam: INK.paper_cream }) + piece(b, INK.warm_secondary, { seam: INK.paper_cream }) + piece(c, INK.hot_ink, { seam: INK.paper_cream });
  let s = liveText('切缝 paper seam · 底色描边垫在纸片下方', { x: 40, y: 50, size: 26, fill: INK.ink_black, weight: 900 });
  s += art;
  s += zoomInset('seam-zoom', art, { sx: 250, sy: 200, sw: 80, sh: 50, dx: 600, dy: 90, k: 3.5 });
  const lines = [`stroke = 场景底色，宽 ${SEAM_W}px，paint-order: stroke`, `可见切缝 ≈ ${SHARED.seam_px}px（原文约 2.4px，按 750 画布校准）`, '只在独立纸片之间出现，不给内部部件描粗黑线', '纸片与底色同色时切缝不可见，只靠纸影区分'];
  lines.forEach((t, i) => { s += liveText(t, { x: 40, y: 400 + i * 28, size: 18, fill: INK.ink_black, weight: 500 }); });
  return sheet(900, 520, s);
}

function masterShadow() {
  const p1 = cutRect(60, 100, 220, 140, 'shadow-a');
  const p2 = cutRect(500, 100, 220, 140, 'shadow-b');
  let s = liveText('小纸影 paper shadow · 硬边、低不透明度、屏幕坐标偏移', { x: 40, y: 50, size: 26, fill: INK.ink_black, weight: 900 });
  s += `<rect x="440" y="80" width="420" height="190" fill="${INK.warm_secondary}"/>`;
  s += piece(p1, INK.ink_black, {}) + piece(p2, INK.paper_cream, { seam: INK.warm_secondary });
  s += zoomInset('shadow-zoom', `<rect x="440" y="80" width="420" height="190" fill="${INK.warm_secondary}"/>` + piece(p2, INK.paper_cream, { seam: INK.warm_secondary }), { sx: 680, sy: 210, sw: 60, sh: 45, dx: 60, dy: 290, k: 4 });
  const lines = [`墨黑 ${Math.round(SHADOW.op * 100)}% 不透明度，偏移 (${SHADOW.dx}, ${SHADOW.dy}) px，无模糊`, '叠在任何墨色上都得到该色的深色纸影变体，不新增阴影色', '偏移在屏幕空间计算：纸片旋转时光向不变', '只给独立纸片加，不给文字、切口和纸纹加'];
  lines.forEach((t, i) => { s += liveText(t, { x: 320, y: 330 + i * 30, size: 18, fill: INK.ink_black, weight: 500 }); });
  return sheet(900, 520, s);
}

function texturePreview() {
  const tex = texture();
  let s = '';
  const sw = [[INK.paper_cream, '纸奶油'], [INK.ink_black, '墨黑'], [INK.hot_ink, '热色'], [INK.warm_secondary, '暖次色']];
  sw.forEach(([c], i) => { s += `<rect x="${i * 225}" y="0" width="225" height="300" fill="${c}"/>`; });
  s += tex.overlay(900, 300);
  s += `<rect y="300" width="900" height="220" fill="${INK.paper_cream}"/>`;
  s += zoomInset('tex-zoom-a', sw.map(([c], i) => `<rect x="${i * 225}" y="0" width="225" height="300" fill="${c}"/>`).join('') + tex.overlay(900, 300), { sx: 180, sy: 100, sw: 90, sh: 48, dx: 20, dy: 320, k: 4 });
  s += liveText('纸纹/纤维/漏墨：独立透明叠加层，512px 无缝平铺', { x: 400, y: 360, size: 20, fill: INK.ink_black, weight: 900 });
  ['斑驳 ≤ 10% 墨黑 · 纤维 5–14% · 漏墨点稀疏不成网格', '浅色刮痕 12–25% 纸奶油，只在深色纸片上可见', '不用半色调网点，不压低文字对比', '运行时用 export/paper-fibre-ink-wear.png 叠加'].forEach((t, i) => { s += liveText(t, { x: 400, y: 400 + i * 28, size: 17, fill: INK.ink_black, weight: 500 }); });
  return svgDoc(900, 520, s, { defs: tex.defs });
}

function masterTaskCard() {
  const ground = INK.paper_cream;
  const body = `<g transform="translate(40 60)">${taskCard({ ground, answer: null })}${guides()}</g>`;
  return svgDoc(770, 640, `<rect width="770" height="640" fill="${ground}"/>${body}`, { title: 'TaskCard master · local 690×544 · slots: slot-tab, slot-mark, slot-answer, slot-forbidden' });
}

function assetSheet() {
  const grounds = [INK.paper_cream, INK.warm_secondary, INK.ink_black];
  const icons = [['微型话筒', iconMicrophone], ['手势', iconGesture], ['任务标识', (o) => iconMissionMark({ seam: o.backingSeam })]];
  let s = '';
  grounds.forEach((g, gi) => {
    s += `<rect x="0" y="${gi * 260}" width="1040" height="260" fill="${g}"/>`;
    icons.forEach(([, fn], ii) => {
      s += `<g transform="translate(${30 + ii * 340} ${gi * 260 + 30}) scale(${(200 / 512).toFixed(4)})">${fn({ backingSeam: g })}</g>`;
      s += `<g transform="translate(${250 + ii * 340} ${gi * 260 + 110}) scale(${(72 / 512).toFixed(4)})">${fn({ backingSeam: g })}</g>`;
    });
  });
  const tex = texture();
  s += tex.overlay(1040, 780);
  return svgDoc(1040, 780, s, { defs: tex.defs, title: 'Icon check: 200px and 72px on the three grounds' });
}

// ---------------------------------------------------------------- frames data

// Prompts and twists below are copied from PR #4 (data/initial-pack.json,
// review_status "playtest") except the explicitly synthetic stress case.
const STRESS_ANSWER = '在暴雨夜的地铁站里一边打电话一边找出口还要赶上最后一班车的上班族';
const STRESS_TWIST = '先用三个字概括它，再说出它最常出现的地方，最后讲一个你和它有关的小故事，全程不能提到颜色和形状。';
if (wrapTwist(STRESS_TWIST).lines.length !== 3) throw new Error('stress twist must wrap to 3 lines');
if (Array.from(STRESS_ANSWER).length !== 32) throw new Error(`stress answer must be 32 chars, is ${Array.from(STRESS_ANSWER).length}`);

const FRAMES = [
  { id: 'round-verbal-playing', mode: 'verbal', view: 'performer', state: 'playing', seconds: 42, context: '第 2 轮 · 红队 12 : 9 蓝队 · 描述者 阿杰', answer: '回形针', forbidden: ['金属', '纸张'], forbiddenLabel: '禁说', twist: { title: '快讯播报', instruction: '像播报一条刚刚收到的新闻，先交代发生的事，再补充一个细节。' }, caption: '口头描述 · 短答案 · 双行指令' },
  { id: 'round-charades-playing', mode: 'charades', view: 'performer', state: 'playing', seconds: 35, context: '第 3 轮 · 蓝队 9 : 12 红队 · 表演者 小周', answer: '给气球打结', forbidden: ['说话', '写字'], forbiddenLabel: '禁止', twist: { title: '定格画面', instruction: '每做完一个关键动作就停住一拍，再接着演下去。' }, caption: '动作表演 · 同一组件，仅配置不同' },
  { id: 'round-verbal-long', mode: 'verbal', view: 'performer', state: 'playing', seconds: 51, context: '第 4 轮 · 红队 14 : 11 蓝队 · 描述者 阿杰', answer: '只在房门关上之后才想起来的钥匙', forbidden: ['门锁', '口袋'], forbiddenLabel: '禁说', twist: { title: '招领广播', instruction: '用失物招领广播的语气，描述两条能让人认出来的线索。' }, caption: '口头描述 · 15 字长答案' },
  { id: 'round-charades-last-call', mode: 'charades', view: 'performer', state: 'last_call', seconds: 7, context: '第 5 轮 · 蓝队 13 : 14 红队 · 表演者 小周', answer: '一手按住被风掀起的地图一手找路', forbidden: ['说话', '写字'], forbiddenLabel: '禁止', twist: { title: '局部特写', instruction: '做完一遍后，把最能说明答案的那个小动作夸张地再演一次。' }, caption: '动作表演 · 最后 10 秒' },
  { id: 'round-verbal-stress-32', mode: 'verbal', view: 'performer', state: 'playing', seconds: 18, context: '压力测试 · 32 字答案 · 三行指令（合成数据）', answer: STRESS_ANSWER, forbidden: ['雨伞', '地铁'], forbiddenLabel: '禁说', twist: { title: '三步讲完', instruction: STRESS_TWIST }, caption: '压力测试 · 32 字 + 三行指令' },
  { id: 'round-verbal-guesser', mode: 'verbal', view: 'guesser', state: 'playing', seconds: 42, context: '第 2 轮 · 红队 12 : 9 蓝队 · 你是猜词者', answer: '回声', forbidden: [], twist: { title: '初来地球', instruction: '假装队友第一次来地球，只讲看到的样子和它能做的事。' }, caption: '猜词者视角 · 答案不下发' },
];

// ---------------------------------------------------------------- write

const manifest = [];
function emit(rel, content, meta) {
  const abs = join(ROOT, rel);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, content, 'utf8');
  manifest.push({ path: rel, bytes: Buffer.byteLength(content), ...meta });
}

const ICON_META = {
  'icons/cut-paper-microphone.svg': ['ModeMark: 口头描述', 'verbal.icon_asset'],
  'icons/cut-paper-gesture.svg': ['ModeMark: 动作表演', 'charades.icon_asset'],
};

emit('masters/hand-cut-edge.svg', masterHandCutEdge(), { asset_type: 'master', used_by: ['shared.cut_edge'], notes: '手剪边参数样张；实际轮廓由 src/cutpaper.mjs 生成' });
emit('masters/paper-seam.svg', masterSeam(), { asset_type: 'master', used_by: ['shared.paper_seam'], notes: '切缝规则样张' });
emit('masters/paper-shadow.svg', masterShadow(), { asset_type: 'master', used_by: ['shared.paper_shadow'], notes: '纸影规则样张' });
emit('masters/paper-fibre-ink-wear.svg', svgDoc(512, 512, texture('tile').tile, { title: 'paper fibre + ink wear tile, transparent, seamless 512' }), { asset_type: 'texture', used_by: ['shared.paper_texture'], notes: '运行时叠加用透明平铺层' });
emit('masters/paper-texture-preview.svg', texturePreview(), { asset_type: 'master', used_by: ['review'], notes: '纸纹在四墨上的强度预览' });
emit('masters/task-card-master.svg', masterTaskCard(), { asset_type: 'master', used_by: ['shared.card_shell', 'TaskCard'], notes: '含 id="guides" 隐藏参考层与 slot-* 插槽', glyphs: true });
emit('icons/cut-paper-mission-mark.svg', svgDoc(512, 512, iconMissionMark(), { title: 'Mission mark (task identifier)' }), { asset_type: 'icon', used_by: ['shared.task_mark', 'TaskCard slot-mark'], notes: '任务标识；旋转后切边不变' });
for (const [rel, fn] of Object.entries(ICONS)) {
  emit(rel, svgDoc(512, 512, fn(), { title: ICON_META[rel][0] }), { asset_type: 'icon', used_by: [ICON_META[rel][1], 'ModeMark'], notes: ICON_META[rel][0] });
}
for (const [rel, fn] of Object.entries(PATTERNS)) {
  emit(rel, svgDoc(FRAME.w, FRAME.h, fn(), { title: `background props · ${rel}` }), { asset_type: 'pattern', used_by: [MODE_ASSETS.modes.find((m) => m.pattern_asset === rel).mode_id + '.pattern_asset'], notes: '背景道具层，透明，底色的深色版本' });
}
emit('proposal/asset-sheet.svg', assetSheet(), { asset_type: 'board', used_by: ['review'], notes: '图标在三种底色、200px 与 72px 下的可读性检查' });
for (const cfg of FRAMES) {
  emit(`proposal/${cfg.id}.svg`, frame(cfg), { asset_type: 'proposal', used_by: ['ROUND_SCREEN_SPEC', 'ENG-01 reference'], notes: cfg.caption, glyphs: true, live_text: true });
}

// Overview board composed from the rendered frame PNGs.
{
  const cols = 3, tw = 375, th = 812, gap = 40, pad = 50, capH = 50;
  const W = pad * 2 + cols * tw + (cols - 1) * gap;
  const rows = Math.ceil(FRAMES.length / cols);
  const H = pad * 2 + 70 + rows * (th + capH) + (rows - 1) * gap;
  let s = `<rect width="${W}" height="${H}" fill="${INK.ink_black}"/>`;
  s += liveText('开个脑洞 · 猜词回合屏视觉提案 · spy-titles 转译 v0.1', { x: pad, y: pad + 34, size: 34, fill: INK.paper_cream, weight: 900 });
  FRAMES.forEach((cfg, i) => {
    const x = pad + (i % cols) * (tw + gap);
    const y = pad + 70 + Math.floor(i / cols) * (th + capH + gap);
    s += `<image href="../export/${cfg.id}.png" x="${x}" y="${y}" width="${tw}" height="${th}"/>`;
    s += liveText(cfg.caption, { x, y: y + th + 34, size: 22, fill: INK.paper_cream, weight: 700 });
  });
  emit('proposal/overview.svg', svgDoc(W, H, s, { title: 'Round screen proposal overview' }), { asset_type: 'board', used_by: ['review'], notes: '六帧总览（引用 export/*.png，需先渲染帧）', depends_on_png: true });
}

// PNG exports (rendered by tools/render_png.py from the SVGs above).
const png = (from, rel, extra = {}) => ({ path: rel, rendered_from: from, ...extra });
const pngs = [
  png('masters/paper-fibre-ink-wear.svg', 'export/paper-fibre-ink-wear.png', { transparent: true, used_by: ['shared.paper_texture_tile'], notes: '运行时纸纹叠加层' }),
  png('masters/hand-cut-edge.svg', 'export/hand-cut-edge.png'),
  png('masters/paper-seam.svg', 'export/paper-seam.png'),
  png('masters/paper-shadow.svg', 'export/paper-shadow.png'),
  png('masters/paper-texture-preview.svg', 'export/paper-texture-preview.png'),
  png('masters/task-card-master.svg', 'export/task-card-master.png'),
  png('masters/task-card-master.svg', 'export/task-card-master.guides.png', { show: 'guides' }),
  png('icons/cut-paper-mission-mark.svg', 'export/cut-paper-mission-mark.png', { transparent: true }),
  png('icons/cut-paper-microphone.svg', 'export/cut-paper-microphone.png', { transparent: true }),
  png('icons/cut-paper-gesture.svg', 'export/cut-paper-gesture.png', { transparent: true }),
  png('patterns/diagonal-cut-composition.svg', 'export/diagonal-cut-composition.png', { transparent: true }),
  png('patterns/paper-layer-motion.svg', 'export/paper-layer-motion.png', { transparent: true }),
  png('proposal/asset-sheet.svg', 'export/asset-sheet.png'),
  ...FRAMES.map((c) => png(`proposal/${c.id}.svg`, `export/${c.id}.png`, { notes: c.caption })),
  png('proposal/overview.svg', 'export/overview.png', { after_frames: true }),
];

const AUTHOR = 'Claude (Anthropic) · 程序化生成（build.mjs，固定种子）；未使用任何生图模型';
const LICENSE = '项目原创素材；对外许可由仓库所有者决定（仓库暂无 LICENSE）。未包含任何上游 spy-titles 图像、代码或字体文件';
const FONT_NOTE = '含由 Noto Sans SC（SIL OFL 1.1）字形轮廓重新切割得到的固定标签图形；未打包字体文件';
const LIVE_NOTE = '动态文字使用 Noto Sans SC（SIL OFL 1.1）系统字体渲染';
const entries = manifest.map((m) => ({
  asset_id: m.path.replace(/^.*\//, '').replace(/\.svg$/, ''),
  path: `design/spy-titles/${m.path}`,
  asset_type: m.asset_type,
  source: 'design/spy-titles/build.mjs',
  author_or_model: AUTHOR,
  license: [LICENSE, m.glyphs ? FONT_NOTE : null, m.live_text ? LIVE_NOTE : null].filter(Boolean).join('；'),
  created_at: CREATED,
  version: VERSION,
  used_by: m.used_by,
  notes: m.notes,
}));
for (const p of pngs) {
  const src = entries.find((e) => e.path === `design/spy-titles/${p.rendered_from}`);
  entries.push({
    asset_id: p.path.replace(/^.*\//, '').replace(/\.png$/, ''),
    path: `design/spy-titles/${p.path}`,
    asset_type: 'export_png',
    source: `design/spy-titles/${p.rendered_from} → tools/render_png.py`,
    author_or_model: AUTHOR,
    license: src.license,
    created_at: CREATED,
    version: VERSION,
    used_by: p.used_by ?? src.used_by,
    notes: p.notes ?? src.notes,
    render: { from: p.rendered_from, transparent: !!p.transparent, show: p.show ?? null, after_frames: !!p.after_frames },
  });
}
writeFileSync(join(ROOT, 'ASSET_MANIFEST.json'), JSON.stringify({ schema: 'asset-manifest/v1', style_reference: 'spy-titles（Lemo-Opuscar by Lemomo / LemoLab）仅作风格研究参照，见 design/VISUAL_CONTRACT.md §8', assets: entries }, null, 2) + '\n', 'utf8');

const fits = FRAMES.filter((c) => c.view === 'performer').map((c) => {
  const f = fitAnswer(c.answer);
  return `${c.id}: ${Array.from(c.answer).length}字 → ${f.size}px × ${f.lines.length}行 [${f.lines.join(' / ')}]; twist ${wrapTwist(c.twist.instruction).lines.length}行`;
});
console.log(`wrote ${manifest.length} svg + ASSET_MANIFEST.json (${entries.length} entries)`);
console.log(fits.join('\n'));
console.log(`relative check: ${relative(REPO, ROOT)}`);
