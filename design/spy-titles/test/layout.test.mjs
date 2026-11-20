import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { EDGE_DEFAULTS, cutPolygon, rect } from '../src/cutpaper.mjs';
import { ANSWER_BOX, ANSWER_MAX_CHARS, TWIST, fitAnswer, wrapTwist } from '../src/layout.mjs';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const NO_LINE_START = '，。、；：？！）》」』”’…—·';

function assertFits(text, label = text) {
  const f = fitAnswer(text);
  assert.equal(f.overflow, false, `${label} overflows`);
  assert.ok(f.size >= 56, `${label} below 56px`);
  assert.ok(f.lines.length * f.lineHeight <= ANSWER_BOX.h + 1e-6, `${label} too tall`);
  for (const line of f.lines) {
    const n = Array.from(line).length;
    assert.ok(n * f.size <= ANSWER_BOX.w + f.size, `${label} line too wide: ${line}`);
    assert.ok(!NO_LINE_START.includes(Array.from(line)[0]), `${label} line starts with punctuation: ${line}`);
  }
  assert.equal(f.lines.join(''), text.replace(/\|/g, ''), `${label} lost characters`);
  return f;
}

test('every answer length 1-32 fits the answer box at >=56px', () => {
  for (let n = 1; n <= ANSWER_MAX_CHARS; n++) assertFits('测'.repeat(n), `${n} chars`);
});

test('short answers stay on one line', () => {
  assert.deepEqual(fitAnswer('给气球打结').lines, ['给气球打结']);
  assert.equal(fitAnswer('伞').size, 150);
  assert.equal(fitAnswer('回形针').lines.length, 1);
});

test('break hints are honoured when they fit and ignored when they do not', () => {
  const f = assertFits('一手按住|被风掀起的地图|一手找路');
  assert.deepEqual(f.lines, ['一手按住', '被风掀起的地图', '一手找路']);
  assert.equal(f.hinted, true);
  const g = fitAnswer('一二三四五六七八九十一二三四五六七八九十|一');
  assert.equal(g.hinted, undefined);
  assert.equal(g.overflow, false);
});

test('twist wraps to <=3 lines up to capacity and never opens a line with punctuation', () => {
  const sentence = '每做完一个关键动作就停住一拍，再接着演下去。';
  const w = wrapTwist(sentence);
  assert.deepEqual(w.lines, ['每做完一个关键动作就停住一拍，再接着演下去。']);
  for (let n = 1; n <= TWIST.cpl * TWIST.maxLines; n++) {
    const r = wrapTwist('测'.repeat(n));
    assert.equal(r.overflow, false, `${n} chars`);
  }
  assert.equal(wrapTwist('测'.repeat(TWIST.cpl * TWIST.maxLines + 1)).overflow, true);
  for (let n = 1; n <= 63; n++) {
    for (const line of wrapTwist('测'.repeat(n) + '。').lines) assert.ok(!NO_LINE_START.includes(line[0]));
  }
});

test('playtest pack (PR #4 data) fits when available', (t) => {
  const path = process.env.PACK_PATH || join(REPO, 'data', 'initial-pack.json');
  if (!existsSync(path)) return t.skip(`no pack at ${path}`);
  const pack = JSON.parse(readFileSync(path, 'utf8'));
  assert.ok(pack.prompts.length >= 30);
  for (const p of pack.prompts) assertFits(p.answer, p.id);
  for (const tw of pack.twists) assert.equal(wrapTwist(tw.instruction).overflow, false, tw.id);
});

test('hand-cut edges are deterministic per seed and stay close to the ideal outline', () => {
  const a = cutPolygon(rect(0, 0, 400, 200), 'piece-a');
  assert.deepEqual(a, cutPolygon(rect(0, 0, 400, 200), 'piece-a'));
  assert.notDeepEqual(a, cutPolygon(rect(0, 0, 400, 200), 'piece-b'));
  const limit = EDGE_DEFAULTS.amp * 1.6 + EDGE_DEFAULTS.nickDepth * 1.3 + 0.01;
  for (const [x, y] of a) {
    const d = Math.min(Math.abs(x), Math.abs(x - 400), Math.abs(y), Math.abs(y - 200));
    assert.ok(d <= limit, `point ${x},${y} is ${d}px off the ideal edge`);
  }
});
