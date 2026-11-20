import { assert, test } from 'orca/testing'
import { PODIUM, finishLevel, newProgress, canPlay, parseProgress } from '../progress'
import { KITTENS, LEVELS, cover, deal, elapsed, flip, pause, resume, totalPairs, type Board } from './engine'

function pairOf(board: Board, index: number): number {
  return board.cards.findIndex((card, other) => other !== index && card.kitten === board.cards[index].kitten)
}

test('there are 25 different kittens, and the last level deals all of them', () => {
  assert.equal(new Set(KITTENS.map((look) => JSON.stringify(look))).size, 25)
  assert.equal(LEVELS[LEVELS.length - 1], 50)
  const board = deal(LEVELS.length, 3)
  assert.equal(new Set(board.cards.map((card) => card.kitten)).size, 25)
})

test('every level deals each of its kittens exactly twice', () => {
  LEVELS.forEach((cards, index) => {
    const board = deal(index + 1, 11)
    assert.equal(board.cards.length, cards)
    const counts = new Map<number, number>()
    for (const card of board.cards) counts.set(card.kitten, (counts.get(card.kitten) ?? 0) + 1)
    assert.ok([...counts.values()].every((count) => count === 2), `Expected pairs only on level ${index + 1}`)
  })
})

test('the same seed deals the same cards, another seed shuffles them', () => {
  assert.deepEqual(deal(4, 99), deal(4, 99))
  assert.notDeepEqual(deal(4, 99).cards, deal(4, 100).cards)
})

test('two matching cards stay up, two different ones go back down', () => {
  const board = deal(1, 5)
  assert.equal(flip(board, 0, 1000), 'first')
  assert.equal(flip(board, pairOf(board, 0), 1500), 'match')
  assert.equal(board.cards[0].state, 'matched')
  const loose = board.cards.findIndex((card) => card.state === 'down')
  const other = board.cards.findIndex((card) => card.state === 'down' && card.kitten !== board.cards[loose].kitten)
  assert.equal(flip(board, loose, 2000), 'first')
  assert.equal(flip(board, other, 2500), 'miss')
  cover(board)
  assert.equal(board.cards[loose].state, 'down')
  assert.equal(board.cards[other].state, 'down')
  assert.equal(board.moves, 2)
})

test('a matched card or one already up cannot be turned again', () => {
  const board = deal(1, 5)
  flip(board, 0, 0)
  assert.equal(flip(board, 0, 10), 'ignored')
  flip(board, pairOf(board, 0), 20)
  assert.equal(flip(board, 0, 30), 'ignored')
})

test('the clock starts with the first card, stops while paused and at the last pair', () => {
  const board = deal(1, 8)
  assert.equal(elapsed(board, 5000), 0)
  const order = [...board.cards.keys()].sort((a, b) => board.cards[a].kitten - board.cards[b].kitten)
  flip(board, order[0], 10_000)
  pause(board, 12_000)
  assert.equal(elapsed(board, 60_000), 2000)
  assert.equal(flip(board, order[1], 61_000), 'ignored', 'Expected no card to turn while paused')
  resume(board, 70_000)
  let result = flip(board, order[1], 71_000)
  for (let i = 2; i < order.length; i += 1) result = flip(board, order[i], 71_000 + i * 1000)
  assert.equal(result, 'done')
  assert.equal(board.pairs, totalPairs(board))
  const finished = elapsed(board, 200_000)
  assert.equal(finished, 2000 + 1000 + (order.length - 1) * 1000)
  assert.equal(elapsed(board, 900_000), finished)
})

test('only the three fastest times of a level are kept, in order', () => {
  const progress = newProgress()
  assert.equal(finishLevel(progress, 1, 40_000, 1, LEVELS.length), 1)
  assert.equal(finishLevel(progress, 1, 30_000, 2, LEVELS.length), 1)
  assert.equal(finishLevel(progress, 1, 50_000, 3, LEVELS.length), 3)
  assert.equal(finishLevel(progress, 1, 60_000, 4, LEVELS.length), null)
  assert.equal(finishLevel(progress, 1, 35_000, 5, LEVELS.length), 2)
  assert.deepEqual(
    progress.records['1'].map((time) => time.ms),
    [30_000, 35_000, 40_000]
  )
  assert.equal(progress.records['1'].length, PODIUM)
})

test('a level opens only once the one before it is done', () => {
  const progress = newProgress()
  assert.ok(canPlay(progress, 1) && !canPlay(progress, 2), 'Expected only level 1 open at first')
  finishLevel(progress, 1, 9000, 1, LEVELS.length)
  assert.ok(canPlay(progress, 2) && !canPlay(progress, 3), 'Expected level 2 open after level 1')
  for (let level = 2; level <= LEVELS.length; level += 1) finishLevel(progress, level, 9000, 1, LEVELS.length)
  assert.equal(progress.unlocked, LEVELS.length)
})

test('stored progress keeps only what still makes sense', () => {
  const progress = parseProgress(
    { unlocked: 99, records: { '1': [{ ms: 5, at: 1 }, { ms: -1, at: 1 }, 'x'], '9': [{ ms: 1, at: 1 }] } },
    LEVELS.length
  )
  assert.equal(progress.unlocked, LEVELS.length)
  assert.deepEqual(progress.records, { '1': [{ ms: 5, at: 1 }] })
  assert.deepEqual(parseProgress(null, LEVELS.length), newProgress())
})
