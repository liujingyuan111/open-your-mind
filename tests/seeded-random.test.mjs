import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { createLocalRound } from '../src/game/local-round.mjs'
import { mulberry32 } from '../src/game/seeded-random.mjs'

const read = path => JSON.parse(readFileSync(new URL(path, import.meta.url)))
const pack = read('../data/initial-pack.json')
const { modes } = read('../design/MODE_ASSETS.json')

test('same seed deals the same deck, different seeds differ', () => {
  const firstCard = seed => {
    const source = createLocalRound({ modes, pack, random: mulberry32(seed), clock: () => 0 })
    source.dispatch({ type: 'start', round: 1 })
    return source.snapshot().prompt.id
  }
  assert.equal(firstCard(7), firstCard(7))
  const distinct = new Set([1, 2, 3, 4, 5].map(firstCard))
  assert.ok(distinct.size > 1)
})
