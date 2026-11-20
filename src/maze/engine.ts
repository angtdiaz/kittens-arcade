// The rules of Kitten Maze: walk the kitten from the top-left corner to its fish in the bottom-right
// one. Each level is always the same maze, so its times can be compared. No DOM and no clock of its
// own: each move says what time it is.

import { parseProgress, type Progress } from '../progress'
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

/** How each level gets harder. `branching`: how often the carving goes back to an older cell rather
 *  than the newest, which leaves more forks and dead ends. `loops`: the share of cells given an extra
 *  opening. `tries`: how many mazes are carved, keeping the one whose way out is longest, since
 *  branching and loops alone shorten it. `sight`: how many cells away the kitten sees in the dark,
 *  or null when the lights are on. Levels 1 and 2 are the mazes of version 0.2.0. */
export const DIFFICULTY: readonly { branching: number; loops: number; tries: number; sight: number | null }[] = [
  { branching: 0, loops: 0, tries: 1, sight: null },
  { branching: 0, loops: 0, tries: 1, sight: null },
  { branching: 0.2, loops: 0, tries: 40, sight: null },
  { branching: 0.3, loops: 0.01, tries: 40, sight: null },
  { branching: 0.3, loops: 0.012, tries: 40, sight: 4.5 },
  { branching: 0.3, loops: 0.015, tries: 40, sight: 3.5 },
  { branching: 0.3, loops: 0.018, tries: 40, sight: 2.5 }
]

/** Which mazes stored times were set on: version 2 changed every level from the third on. */
export const MAZES_VERSION = 2
const UNCHANGED_LEVELS = 2

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
  /** In the dark levels, how many cells away the kitten sees, and every cell it has seen. */
  sight: number | null
  seen: number[]
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

/** Builds a level's maze from its own fixed seeds: carved by a growing tree that branches more from
 *  the third level on and gets a few loops from the fourth, the longest way out of its tries kept. */
export function build(level: number): Maze {
  const [columns, rows] = LEVELS[level - 1] ?? LEVELS[0]
  const difficulty = DIFFICULTY[level - 1] ?? DIFFICULTY[0]
  let walls: number[] = []
  let longest = -1
  for (let attempt = 0; attempt < difficulty.tries; attempt += 1) {
    const tried = carveMaze(columns, rows, difficulty, SEED + level * 7919 + attempt * 104729)
    const length = wayOut(tried, columns, rows)
    if (length > longest) {
      walls = tried
      longest = length
    }
  }
  const maze: Maze = {
    ...newStopwatch(),
    level,
    columns,
    rows,
    walls,
    kitten: { x: 0, y: 0 },
    goal: { x: columns - 1, y: rows - 1 },
    trail: [0],
    sight: difficulty.sight,
    seen: [],
    steps: 0
  }
  light(maze)
  return maze
}

/** Whether `cell` is inside the kitten's light right now; always, when the lights are on. */
export function inSight(maze: Maze, cell: Cell): boolean {
  if (maze.sight === null) return true
  return Math.hypot(cell.x - maze.kitten.x, cell.y - maze.kitten.y) <= maze.sight
}

/** Stored maze times, dropping those set on mazes that have changed since. Open levels stay open. */
export function upgradeProgress(saved: unknown): Progress {
  const progress = parseProgress(saved, LEVELS.length)
  const version = typeof saved === 'object' && saved !== null ? (saved as { mazes?: unknown }).mazes : undefined
  if (version === MAZES_VERSION) return progress
  for (const level of Object.keys(progress.records)) {
    if (Number(level) > UNCHANGED_LEVELS) delete progress.records[level]
  }
  return progress
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
  light(maze)
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

/** How many steps the shortest way from the start to the goal takes, or -1 when there is none. */
export function shortestWay(maze: Maze): number {
  return wayOut(maze.walls, maze.columns, maze.rows)
}

function carveMaze(
  columns: number,
  rows: number,
  difficulty: { branching: number; loops: number },
  seed: number
): number[] {
  const all = WALL.north | WALL.east | WALL.south | WALL.west
  const walls = Array.from({ length: columns * rows }, () => all)
  const random = randomFrom(seed)
  carve(walls, columns, rows, difficulty.branching, random)
  addLoops(walls, columns, rows, Math.round(columns * rows * difficulty.loops), random)
  return walls
}

/** A breadth-first search from the top-left cell to the bottom-right one. */
function wayOut(walls: number[], columns: number, rows: number): number {
  const distance = new Map<number, number>([[0, 0]])
  const queue: Cell[] = [{ x: 0, y: 0 }]
  for (let next = queue.shift(); next; next = queue.shift()) {
    const here = next
    for (const direction of Object.keys(MOVES) as Direction[]) {
      if ((walls[here.y * columns + here.x] & WALL[direction]) !== 0) continue
      const there = neighbour(here, direction)
      const index = there.y * columns + there.x
      if (distance.has(index)) continue
      distance.set(index, (distance.get(here.y * columns + here.x) ?? 0) + 1)
      queue.push(there)
    }
  }
  return distance.get(columns * rows - 1) ?? -1
}

/** A growing tree: from the newest cell it carves into an unvisited neighbour, and with chance
 *  `branching` it carries on from an older cell instead, which leaves more forks and dead ends. With
 *  `branching` at 0 it is a depth-first walk, and draws the same numbers as one. */
function carve(walls: number[], columns: number, rows: number, branching: number, random: () => number): void {
  const seen = new Set<number>([0])
  const active: Cell[] = [{ x: 0, y: 0 }]
  while (active.length > 0) {
    const at = branching > 0 && random() < branching ? Math.floor(random() * active.length) : active.length - 1
    const here = active[at]
    const ways = (Object.keys(MOVES) as Direction[]).filter((direction) => {
      const next = neighbour(here, direction)
      return inside(next, columns, rows) && !seen.has(next.y * columns + next.x)
    })
    if (ways.length === 0) {
      active.splice(at, 1)
      continue
    }
    const direction = ways[Math.floor(random() * ways.length)]
    const next = neighbour(here, direction)
    open(walls, columns, here, direction)
    seen.add(next.y * columns + next.x)
    active.push(next)
  }
}

/** Opens `count` more walls inside the maze, each one making a loop. */
function addLoops(walls: number[], columns: number, rows: number, count: number, random: () => number): void {
  let made = 0
  for (let tries = 0; made < count && tries < count * 50; tries += 1) {
    const here = { x: Math.floor(random() * columns), y: Math.floor(random() * rows) }
    const direction: Direction = random() < 0.5 ? 'east' : 'south'
    if (!inside(neighbour(here, direction), columns, rows)) continue
    if ((walls[here.y * columns + here.x] & WALL[direction]) === 0) continue
    open(walls, columns, here, direction)
    made += 1
  }
}

function open(walls: number[], columns: number, here: Cell, direction: Direction): void {
  const next = neighbour(here, direction)
  walls[here.y * columns + here.x] &= ~WALL[direction]
  walls[next.y * columns + next.x] &= ~WALL[MOVES[direction].opposite]
}

/** Adds the cells in the kitten's light to those it has seen. */
function light(maze: Maze): void {
  if (maze.sight === null) return
  const reach = Math.ceil(maze.sight)
  for (let y = maze.kitten.y - reach; y <= maze.kitten.y + reach; y += 1) {
    for (let x = maze.kitten.x - reach; x <= maze.kitten.x + reach; x += 1) {
      const cell = { x, y }
      const index = y * maze.columns + x
      if (inside(cell, maze.columns, maze.rows) && inSight(maze, cell) && !maze.seen.includes(index)) {
        maze.seen.push(index)
      }
    }
  }
}

function neighbour(cell: Cell, direction: Direction): Cell {
  return { x: cell.x + MOVES[direction].x, y: cell.y + MOVES[direction].y }
}

function inside(cell: Cell, columns: number, rows: number): boolean {
  return cell.x >= 0 && cell.y >= 0 && cell.x < columns && cell.y < rows
}
