// Hand-cut paper geometry. Every outline is cut once in the piece's own
// coordinate space from a fixed seed, so moving / rotating / scaling a piece
// never makes its edge "crawl" (spy-titles-03). Runtime code should call these
// once per piece and cache the result.

export function hashSeed(str) {
  let h = 2166136261 >>> 0;
  for (const ch of String(str)) {
    h ^= ch.codePointAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function rng(seed) {
  let a = typeof seed === 'number' ? seed >>> 0 : hashSeed(seed);
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function signedArea(pts) {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const q = pts[(i + 1) % pts.length];
    a += p[0] * q[1] - q[0] * p[1];
  }
  return a / 2;
}

export const EDGE_DEFAULTS = Object.freeze({
  amp: 1.3,          // max perpendicular wander of a scissor stroke, px at 750 design width
  segMin: 14,        // shortest straight scissor stroke
  segMax: 34,        // longest straight scissor stroke
  cornerClip: 2.2,   // scissors rarely land exactly on a corner
  nickChance: 0.12,  // chance per long edge of a small re-entry snip
  nickDepth: 2.2,
});

// Turns an ideal polygon into a faceted, hand-cut outline.
// The edge is a chain of short straight strokes (not smooth noise), which is
// what reads as scissors rather than as a wobbly digital filter.
export function cutPolygon(points, seed, opts = {}) {
  const o = { ...EDGE_DEFAULTS, ...opts };
  const r = rng(seed);
  // n is rotated so that positive offsets always point into the ink, which
  // keeps snips cutting material away for both outer contours and holes.
  const inkSign = o.inkSign ?? (Math.sign(signedArea(points)) || 1);
  const jit = () => (r() * 2 - 1) * o.amp;
  const out = [];
  let off = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy);
    if (len < 1e-6) continue;
    const ux = dx / len;
    const uy = dy / len;
    const nx = -uy * inkSign;
    const ny = ux * inkSign;
    const at = (t, k) => [a[0] + ux * t + nx * k, a[1] + uy * t + ny * k];
    const clip = o.cornerClip > 0 ? Math.min(o.cornerClip * (0.5 + r()), len * 0.25) : 0;
    off = off * 0.3 + jit() * 0.7;
    out.push(at(clip, off));
    const end = len - clip;
    let t = clip;
    let nicked = false;
    for (;;) {
      t += o.segMin + r() * (o.segMax - o.segMin);
      if (t > end - o.segMin * 0.6) break;
      off = off * 0.35 + jit();
      if (!nicked && len > o.segMax * 2 && r() < o.nickChance) {
        const w = o.nickDepth * (0.9 + r() * 0.8);
        const d = o.nickDepth * (0.7 + r() * 0.6);
        out.push(at(t - w * 0.5, off), at(t + w * 0.15, off + d), at(t + w * 0.5, off));
        nicked = true;
        continue;
      }
      out.push(at(t, off));
    }
    if (clip > 0) out.push(at(end, off * 0.5 + jit() * 0.5));
  }
  return out;
}

// Faceted ellipse: scissors cut a circle as a run of short straight strokes.
export function cutEllipse(cx, cy, rx, ry, seed, { facet = 22, amp = 1.2 } = {}) {
  const r = rng(seed);
  const n = Math.max(12, Math.round((Math.PI * (rx + ry)) / facet));
  const start = r() * Math.PI * 2;
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = start + ((i + (r() - 0.5) * 0.5) / n) * Math.PI * 2;
    const k = (r() * 2 - 1) * amp;
    pts.push([cx + Math.cos(a) * (rx + k), cy + Math.sin(a) * (ry + k)]);
  }
  return pts;
}

// Annular band from angle a0 to a1 (degrees, SVG y-down), with straight cut ends.
export function cutArcBand(cx, cy, r1, r2, a0, a1, seed, { facet = 20, amp = 1.1 } = {}) {
  const r = rng(seed);
  const rad = (d) => (d * Math.PI) / 180;
  const span = rad(a1 - a0);
  const n = Math.max(3, Math.round((Math.abs(span) * r2) / facet));
  const outer = [];
  const inner = [];
  for (let i = 0; i <= n; i++) {
    const a = rad(a0) + (span * i) / n;
    outer.push([cx + Math.cos(a) * (r2 + (r() * 2 - 1) * amp), cy + Math.sin(a) * (r2 + (r() * 2 - 1) * amp)]);
  }
  for (let i = n; i >= 0; i--) {
    const a = rad(a0) + (span * i) / n;
    inner.push([cx + Math.cos(a) * (r1 + (r() * 2 - 1) * amp), cy + Math.sin(a) * (r1 + (r() * 2 - 1) * amp)]);
  }
  return outer.concat(inner);
}

// Vertical stadium (capsule) outline, faceted.
export function stadium(cx, cy, w, h, facet = 18) {
  const rad = w / 2;
  const n = Math.max(6, Math.round((Math.PI * rad) / facet));
  const top = cy - h / 2 + rad;
  const bot = cy + h / 2 - rad;
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const a = Math.PI + (Math.PI * i) / n;
    pts.push([cx + Math.cos(a) * rad, top + Math.sin(a) * rad]);
  }
  for (let i = 0; i <= n; i++) {
    const a = (Math.PI * i) / n;
    pts.push([cx + Math.cos(a) * rad, bot + Math.sin(a) * rad]);
  }
  return pts;
}

export function rect(x, y, w, h) {
  return [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
}

export function rotate(pts, deg, cx = 0, cy = 0) {
  const a = (deg * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return pts.map(([x, y]) => [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c]);
}

export function translate(pts, dx, dy) {
  return pts.map(([x, y]) => [x + dx, y + dy]);
}

const isContour = (v) => Array.isArray(v) && Array.isArray(v[0]) && typeof v[0][0] === 'number';

export function toPath(shape, dp = 1) {
  const contours = isContour(shape) ? [shape] : shape;
  const f = (n) => {
    const s = n.toFixed(dp);
    return s.includes('.') ? s.replace(/\.?0+$/, '') : s;
  };
  return contours
    .filter((c) => c.length > 2)
    .map((c) => 'M' + c.map(([x, y]) => `${f(x)} ${f(y)}`).join('L') + 'Z')
    .join('');
}
