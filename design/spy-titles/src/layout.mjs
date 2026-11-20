// Round-screen layout rules shared by the visual proposal and the front end.
// Units: px on a 750-wide design canvas (1 px = 1 rpx in a WeChat mini program).

export const FRAME = Object.freeze({ w: 750, h: 1624 });
export const SAFE = Object.freeze({ top: 176, bottom: 68 });

export const ANSWER_BOX = Object.freeze({ w: 590, h: 324 });
export const ANSWER_TIERS = Object.freeze([150, 132, 112, 96, 80, 68, 60, 56]);
export const ANSWER_LINE = 1.12;
export const ANSWER_MAX_CHARS = 32;

export const TWIST = Object.freeze({ size: 30, lineHeight: 44, cpl: 21, maxLines: 3, recommendedMaxChars: 60 });

// Characters that must not open a line; they hang on the previous one instead.
const NO_LINE_START = new Set(Array.from('，。、；：？！）》」』”’…—·,.;:?!)'));

function hangPunctuation(lines) {
  for (let i = 1; i < lines.length; i++) {
    while (lines[i].length > 0 && NO_LINE_START.has(lines[i][0])) {
      lines[i - 1].push(lines[i].shift());
    }
  }
  return lines.filter((l) => l.length > 0);
}

function balance(chars, lineCount) {
  const base = Math.floor(chars.length / lineCount);
  const extra = chars.length % lineCount;
  const lines = [];
  let k = 0;
  for (let i = 0; i < lineCount; i++) {
    const n = base + (i < extra ? 1 : 0);
    lines.push(chars.slice(k, k + n));
    k += n;
  }
  return hangPunctuation(lines);
}

// Short answers stay on one line when that still allows at least this size,
// so "给气球打结" is not split into "给气球 / 打结" just to be 20 px larger.
// Kept at 112 so that size never grows as answers get longer (6 chars -> 132 x 2).
export const SINGLE_LINE_MIN = 112;

// Optional break hints: "一手按住|被风掀起的地图|一手找路". Hints are used when
// every segment fits a tier; otherwise the answer falls back to balanced wrap.
function fitWithHints(segments, box) {
  for (const size of ANSWER_TIERS) {
    const cpl = Math.floor(box.w / size);
    if (segments.some((s) => s.length > cpl)) continue;
    if (segments.length * size * ANSWER_LINE > box.h) continue;
    return { size, cpl, lineHeight: size * ANSWER_LINE, lines: segments.map((s) => s.join('')), overflow: false, hinted: true };
  }
  return null;
}

// Picks the largest tier whose wrap fits the answer box.
export function fitAnswer(text, box = ANSWER_BOX) {
  const raw = String(text).trim();
  if (raw.includes('|')) {
    const hinted = fitWithHints(raw.split('|').map((s) => Array.from(s.trim())).filter((s) => s.length), box);
    if (hinted) return hinted;
  }
  const chars = Array.from(raw.replace(/\|/g, ''));
  if (chars.length === 0) throw new Error('empty answer');
  for (const size of ANSWER_TIERS) {
    if (size < SINGLE_LINE_MIN) break;
    if (chars.length * size <= box.w && size * ANSWER_LINE <= box.h) {
      return { size, cpl: Math.floor(box.w / size), lineHeight: size * ANSWER_LINE, lines: [chars.join('')], overflow: false };
    }
  }
  for (const size of ANSWER_TIERS) {
    const cpl = Math.floor(box.w / size);
    const count = Math.ceil(chars.length / cpl);
    if (count * size * ANSWER_LINE > box.h) continue;
    return { size, cpl, lineHeight: size * ANSWER_LINE, lines: balance(chars, count).map((l) => l.join('')), overflow: false };
  }
  const size = ANSWER_TIERS[ANSWER_TIERS.length - 1];
  const cpl = Math.floor(box.w / size);
  const count = Math.ceil(chars.length / cpl);
  return { size, cpl, lineHeight: size * ANSWER_LINE, lines: balance(chars, count).map((l) => l.join('')), overflow: true };
}

export function wrapTwist(text, spec = TWIST) {
  const chars = Array.from(String(text).trim());
  const lines = [];
  for (let i = 0; i < chars.length; i += spec.cpl) lines.push(chars.slice(i, i + spec.cpl));
  const out = hangPunctuation(lines).map((l) => l.join(''));
  return { lines: out, overflow: out.length > spec.maxLines };
}
