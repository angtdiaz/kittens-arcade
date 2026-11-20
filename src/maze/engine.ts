// The rules of Kitten Maze: walk the kitten from the top-left corner to its fish in the bottom-right
// one. Each level is always the same maze, so its times can be compared. No DOM and no clock of its
// own: each move says what time it is.

import { randomFrom } from '../random'
import { finish, newStopwatch, tick, type Stopwatch } from '../stopwatch'

export { elapsed, isRunning, pause, resume } from '../stopwatch'

/** Columns × rows of each level: taller than wide, like the panel. */
export const LEVELS: readonly (readonly [number, number])[] = [
  [6, 8],
  [8, 11],
  [10, 14],
  [12, 17],
  [14, 20],
  [16, 23],
  [18, 26]
]

/** The walls of a cell, one bit each. */
export const WALL = { north: 1, east: 2, south: 4, west: 8 } as const

export type Direction = keyof typeof WALL
export type Cell = { x: number; y: number }

export type Maze = Stopwatch & {
  level: number
  columns: number
  rows: number
  /** One number per cell, row by row: the walls it still has. */
  walls: number[]
  kitten: Cell
  goal: Cell
  /** Every cell the kitten has stepped on, as `y * columns + x`. */
  trail: number[]
  steps: number
}

export type Step = 'ignored' | 'blocked' | 'moved' | 'done'

const MOVES: Record<Direction, Cell & { opposite: Direction }> = {
  north: { x: 0, y: -1, opposite: 'south' },
  east: { x: 1, y: 0, opposite: 'west' },
  south: { x: 0, y: 1, opposite: 'north' },
  west: { x: -1, y: 0, opposite: 'east' }
}

/** Each level's maze comes from its own fixed seed. */
const SEED = 0x6b697474

export function coinsFor(level: number): number {
  return level * 2
}

/** Builds a level's maze: a single path joins any two cells, carved by a seeded depth-first walk. */
export function build(level: number): Maze {
  const [columns, rows] = LEVELS[level - 1] ?? LEVELS[0]
  const all = WALL.north | WALL.east | WALL.south | WALL.west
  const walls = Array.from({ length: columns * rows }, () => all)
  const random = randomFrom(SEED + level * 7919)
  const seen = new Set<number>([0])
  const path: Cell[] = [{ x: 0, y: 0 }]
  while (path.length > 0) {
    const here = path[path.length - 1]
    const ways = (Object.keys(MOVES) as Direction[]).filter((direction) => {
      const next = neighbour(here, direction)
      return inside(next, columns, rows) && !seen.has(next.y * columns + next.x)
    })
    if (ways.length === 0) {
      path.pop()
      continue
    }
    const direction = ways[Math.floor(random() * ways.length)]
    const next = neighbour(here, direction)
    walls[here.y * columns + here.x] &= ~WALL[direction]
    walls[next.y * columns + next.x] &= ~WALL[MOVES[direction].opposite]
    seen.add(next.y * columns + next.x)
    path.push(next)
  }
  return {
    ...newStopwatch(),
    level,
    columns,
    rows,
    walls,
    kitten: { x: 0, y: 0 },
    goal: { x: columns - 1, y: rows - 1 },
    trail: [0],
    steps: 0
  }
}

export function isOpen(maze: Maze, cell: Cell, direction: Direction): boolean {
  return (maze.walls[cell.y * maze.columns + cell.x] & WALL[direction]) === 0
}

/** One step at `now` (in milliseconds). The clock starts with the first one. */
export function step(maze: Maze, direction: Direction, now: number): Step {
  if (maze.finished || (maze.started && maze.runningSince === null)) return 'ignored'
  if (!isOpen(maze, maze.kitten, direction)) return 'blocked'
  if (!tick(maze, now)) return 'ignored'
  maze.kitten = neighbour(maze.kitten, direction)
  maze.steps += 1
  const index = maze.kitten.y * maze.columns + maze.kitten.x
  if (!maze.trail.includes(index)) maze.trail.push(index)
  if (maze.kitten.x !== maze.goal.x || maze.kitten.y !== maze.goal.y) return 'moved'
  finish(maze, now)
  return 'done'
}

/** Runs the kitten straight toward `target`, in its row or column, until it gets there or meets a
 *  wall. Returns how far it went, or 'ignored' when the target is not in line with the kitten. */
export function run(maze: Maze, target: Cell, now: number): Step {
  const { kitten } = maze
  if (target.x !== kitten.x && target.y !== kitten.y) return 'ignored'
  if (target.x === kitten.x && target.y === kitten.y) return 'ignored'
  const direction: Direction =
    target.x > kitten.x ? 'east' : target.x < kitten.x ? 'west' : target.y > kitten.y ? 'south' : 'north'
  let last: Step = 'blocked'
  while (maze.kitten.x !== target.x || maze.kitten.y !== target.y) {
    const result = step(maze, direction, now)
    if (result !== 'moved') return result === 'blocked' && last === 'moved' ? 'moved' : result
    last = result
  }
  return last
}

function neighbour(cell: Cell, direction: Direction): Cell {
  return { x: cell.x + MOVES[direction].x, y: cell.y + MOVES[direction].y }
}

function inside(cell: Cell, columns: number, rows: number): boolean {
  return cell.x >= 0 && cell.y >= 0 && cell.x < columns && cell.y < rows
}
