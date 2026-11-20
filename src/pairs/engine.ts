// The rules of Kitten Pairs: cards face down, two turned at a time, a pair stays up. The clock
// starts with the first card and stops while the game is paused. No DOM and no clock of its own:
// each move says what time it is.

import { randomFrom } from '../random'
import type { Look } from '../shop'
import { finish, newStopwatch, tick, type Stopwatch } from '../stopwatch'

export { elapsed, isRunning, pause, resume } from '../stopwatch'

/** How many cards each level deals. The last one has every kitten. */
export const LEVELS = [8, 12, 18, 24, 32, 40, 50] as const

/** How long two cards that do not match stay up. */
export const MISS_MS = 800

const COATS = ['tabby', 'gray', 'black', 'siamese', 'calico'] as const
const HEADS = [null, 'bow', 'party', 'crown', 'wizard'] as const

/** The 25 kittens on the cards: every coat with every hat. */
export const KITTENS: readonly Look[] = COATS.flatMap((coat) =>
  HEADS.map((head) => ({ coat, head, neck: null, face: null }))
)

export type CardState = 'down' | 'up' | 'matched'
export type Card = { kitten: number; state: CardState }

export type Board = Stopwatch & {
  level: number
  cards: Card[]
  /** The cards turned up and not matched yet, at most two. */
  open: number[]
  pairs: number
  moves: number
}

export type Flip = 'ignored' | 'first' | 'match' | 'miss' | 'done'

export function cardsOf(level: number): number {
  return LEVELS[level - 1] ?? LEVELS[0]
}

/** Deals a level: as many different kittens as it has pairs, each twice, shuffled. */
export function deal(level: number, seed: number): Board {
  const random = randomFrom(seed)
  const kittens = shuffle(
    KITTENS.map((_, index) => index),
    random
  ).slice(0, cardsOf(level) / 2)
  const cards = shuffle([...kittens, ...kittens], random).map((kitten): Card => ({ kitten, state: 'down' }))
  return { ...newStopwatch(), level, cards, open: [], pairs: 0, moves: 0 }
}

export function totalPairs(board: Board): number {
  return board.cards.length / 2
}

/** Turns a card up at `now` (in milliseconds). */
export function flip(board: Board, index: number, now: number): Flip {
  const card = board.cards[index]
  if (!card || card.state !== 'down' || !tick(board, now)) return 'ignored'
  // A third card turns the two that did not match back down at once.
  if (board.open.length === 2) cover(board)
  card.state = 'up'
  board.open.push(index)
  if (board.open.length === 1) return 'first'
  board.moves += 1
  const [a, b] = board.open.map((open) => board.cards[open])
  if (a.kitten !== b.kitten) return 'miss'
  a.state = 'matched'
  b.state = 'matched'
  board.open = []
  board.pairs += 1
  if (board.pairs < totalPairs(board)) return 'match'
  finish(board, now)
  return 'done'
}

/** Turns back down the two cards of a miss. */
export function cover(board: Board): void {
  if (board.open.length < 2) return
  for (const index of board.open) board.cards[index].state = 'down'
  board.open = []
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const shuffled = [...items]
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}
