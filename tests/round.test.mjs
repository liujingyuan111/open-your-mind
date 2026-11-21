import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { createLocalRound } from '../src/game/local-round.mjs'

const read = path => JSON.parse(readFileSync(new URL(path, import.meta.url)))
const pack = read('../data/initial-pack.json')
const { modes } = read('../design/MODE_ASSETS.json')

function fixture(role = 'performer') {
  let now = 0
  const source = createLocalRound({ modes, pack, role, clock: () => now, random: () => 0.9999 })
  const snap = source.snapshot
  const send = (type, extra) => source.dispatch({ type, round: snap().round, promptId: snap().prompt?.id, ...extra })
  return { snap, send, tick: ms => { now += ms; return snap() } }
}

test('ready hides the prompt; each mode selects compatible prompts and twists', () => {
  for (const mode of modes) {
    const { snap, send } = fixture()
    assert.equal(snap().prompt, null)
    send('prepare', { modeId: mode.mode_id })
    assert.ok(send('start'))
    const state = snap()
    assert.equal(state.phase, 'playing')
    assert.equal(state.remaining, 60)
    assert.ok(state.prompt.id.startsWith(mode.mode_id))
    assert.ok(state.twist.compatible_modes.includes(mode.mode_id))
    assert.equal(state.prompt.forbidden.length > 0, mode.input_method === 'speech')
  }
})

test('rapid and delayed repeats cannot score twice or skip the next card', () => {
  const { snap, send, tick } = fixture()
  send('start')
  const promptId = snap().prompt.id
  assert.ok(send('correct'))
  assert.equal(snap().phase, 'correct_feedback')
  assert.equal(send('skip'), false)
  tick(800)
  assert.equal(send('correct', { promptId }), false)
  assert.equal(snap().score, 1)
  assert.equal(snap().ordinal, 2)
  assert.ok(send('skip'))
  assert.equal(snap().phase, 'skipped')
  assert.equal(snap().skipped, 1)
})

test('deadline is authoritative even after sleep or during feedback', () => {
  const { snap, send, tick } = fixture()
  send('start')
  assert.equal(tick(49999).phase, 'playing')
  assert.equal(tick(1).phase, 'last_call')
  tick(9999)
  send('correct')
  assert.equal(tick(1).phase, 'round_finished')
  assert.equal(send('correct'), false)
  assert.equal(snap().score, 1)
  assert.equal(snap().remaining, 0)
  assert.equal(snap().prompt, null)
  send('prepare', { modeId: 'verbal' })
  send('start')
  assert.equal(tick(90000).finishReason, 'timeout')
})

test('read-only snapshots omit private content and guessers cannot act', () => {
  const { snap, send } = fixture()
  send('start')
  const guesser = snap('guesser')
  assert.equal(guesser.role, 'guesser')
  assert.equal(guesser.prompt, null)
  assert.equal(guesser.twist, null)
  const guest = fixture('guesser')
  assert.equal(guest.send('start'), false)
  assert.equal(guest.snap('performer').role, 'guesser')
})

test('all 15 cards are unique, exhausted decks finish and their time freezes', () => {
  const { snap, send, tick } = fixture()
  send('start')
  const ids = new Set()
  for (let i = 0; i < 15; i++) {
    ids.add(snap().prompt.id)
    send('skip')
    tick(650)
  }
  assert.equal(ids.size, 15)
  assert.equal(snap().skipped, 15)
  assert.equal(snap().phase, 'round_finished')
  assert.equal(snap().finishReason, 'deck')
  const remaining = snap().remaining
  assert.equal(tick(20000).remaining, remaining)
})

test('switching resets score and rejects commands from the previous round', () => {
  const { snap, send } = fixture()
  send('start')
  const old = snap()
  send('correct')
  send('prepare', { modeId: 'charades' })
  assert.equal(snap().phase, 'ready')
  assert.equal(snap().score, 0)
  assert.equal(snap().round, 2)
  assert.equal(send('start', { round: old.round }), false)
})

test('every artwork and accent in the project style contract resolves', () => {
  const { shared, modes } = read('../design/MODE_ASSETS.json')
  const files = Object.values(shared).filter(v => typeof v === 'string' && v.endsWith('.svg'))
  for (const mode of modes) {
    assert.match(shared.palette[mode.accent_role].hex, /^#[0-9a-f]{6}$/i)
    files.push(mode.icon_asset, mode.pattern_asset)
    for (const variant of Object.values(mode.theme_assets || {})) {
      assert.match(variant.accent, /^#[0-9a-f]{6}$/i)
      files.push(variant.icon_asset)
    }
  }
  for (const file of files) {
    assert.match(readFileSync(new URL('../src/static/art/' + file, import.meta.url), 'utf8'), /<svg\s/)
  }
})
