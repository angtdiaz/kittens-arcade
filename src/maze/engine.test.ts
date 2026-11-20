import { assert, test } from 'orca/testing'
import {
  DIFFICULTY,
  LEVELS,
  MAZES_VERSION,
  WALL,
  build,
  elapsed,
  inSight,
  isOpen,
  pause,
  resume,
  run,
  shortestWay,
  step,
  upgradeProgress,
  type Cell,
  type Direction,
  type Maze
} from './engine'

const DIRECTIONS: Direction[] = ['north', 'east', 'south', 'west']
const DELTA: Record<Direction, Cell> = { north: { x: 0, y: -1 }, east: { x: 1, y: 0 }, south: { x: 0, y: 1 }, west: { x: -1, y: 0 } }

/** The directions that walk from the start to the goal, found by a breadth-first search. */
function solve(maze: Maze): Direction[] {
  const key = (cell: Cell) => cell.y * maze.columns + cell.x
  const came = new Map<number, { from: Cell; direction: Direction }>()
  const queue: Cell[] = [{ x: 0, y: 0 }]
  const seen = new Set([0])
  while (queue.length > 0) {
    const here = queue.shift() as Cell
    for (const direction of DIRECTIONS) {
      if (!isOpen(maze, here, direction)) continue
      const next = { x: here.x + DELTA[direction].x, y: here.y + DELTA[direction].y }
      if (seen.has(key(next))) continue
      seen.add(key(next))
      came.set(key(next), { from: here, direction })
      queue.push(next)
    }
  }
  const path: Direction[] = []
  let at = maze.goal
  while (key(at) !== 0) {
    const link = came.get(key(at))
    if (!link) return []
    path.unshift(link.direction)
    at = link.from
  }
  return path
}

function openings(maze: Maze): number {
  let open = 0
  maze.walls.forEach((walls) => {
    if ((walls & WALL.east) === 0) open += 1
    if ((walls & WALL.south) === 0) open += 1
  })
  return open
}

function share(maze: Maze, openSides: (open: number) => boolean): number {
  const count = maze.walls.filter((walls) => openSides(DIRECTIONS.filter((side) => (walls & WALL[side]) === 0).length))
  return count.length / maze.walls.length
}

test('every level has a way from the kitten to its fish', () => {
  LEVELS.forEach((_, index) => {
    const maze = build(index + 1)
    assert.ok(solve(maze).length > 0, `Expected a way through level ${index + 1}`)
    assert.equal(solve(maze).length, shortestWay(maze))
  })
})

test('levels 1 to 3 have a single way through, and from level 4 the paths loop', () => {
  LEVELS.forEach(([columns, rows], index) => {
    const level = index + 1
    const extra = openings(build(level)) - (columns * rows - 1)
    if (level <= 3) assert.equal(extra, 0, `Expected level ${level} to have no loops`)
    else assert.ok(extra > 0, `Expected level ${level} to have loops`)
  })
})

test('levels 1 and 2 are still the mazes of version 0.2.0, so their times still count', () => {
  const hex = (level: number) => build(level).walls.map((walls) => walls.toString(16)).join('')
  assert.equal(hex(1), 'bd5153c53a92b96eaaac556ac13b9696c2c3ad5696c55547')
  assert.equal(
    hex(2),
    'd53d515393c5383aa857aaaaac53aeaaa956c56aac55553ac395396abaa96c5686ec5153a9393c7ac6c6c556'
  )
})

test('from level 3 there are more forks and dead ends, and the way out still winds', () => {
  const easy = build(2)
  for (let level = 3; level <= LEVELS.length; level += 1) {
    const maze = build(level)
    assert.ok(share(maze, (open) => open >= 3) > share(easy, (open) => open >= 3), `Expected more forks on ${level}`)
    assert.ok(share(maze, (open) => open === 1) > share(easy, (open) => open === 1), `Expected more dead ends on ${level}`)
    const straight = maze.columns + maze.rows - 2
    assert.ok(shortestWay(maze) >= straight * 2.2, `Expected the way out of level ${level} to wind`)
  }
})

test('from level 5 the kitten sees only around itself, a little less on each level', () => {
  const sights = DIFFICULTY.map((difficulty) => difficulty.sight)
  assert.deepEqual(sights.slice(0, 4), [null, null, null, null])
  const dark = sights.slice(4) as number[]
  assert.ok(dark.every((sight, index) => index === 0 || sight < dark[index - 1]), 'Expected less light each level')
  const maze = build(5)
  assert.ok(!inSight(maze, maze.goal), 'Expected the fish to be out of sight at the start')
  const seenAtStart = [...maze.seen]
  assert.ok(seenAtStart.every((index) => inSight(maze, { x: index % maze.columns, y: Math.floor(index / maze.columns) })))
  for (const direction of solve(maze).slice(0, 8)) step(maze, direction, 0)
  assert.ok(maze.seen.length > seenAtStart.length, 'Expected walking to light up more of the maze')
  assert.ok(seenAtStart.every((index) => maze.seen.includes(index)), 'Expected what was seen to be remembered')
})

test('stored maze times from before version 2 are dropped, except on the unchanged levels', () => {
  const old = { unlocked: 6, records: { '1': [{ ms: 9000, at: 1 }], '2': [{ ms: 20000, at: 1 }], '5': [{ ms: 50000, at: 1 }] } }
  const upgraded = upgradeProgress(old)
  assert.equal(upgraded.unlocked, 6)
  assert.deepEqual(Object.keys(upgraded.records), ['1', '2'])
  assert.deepEqual(upgradeProgress({ ...old, mazes: MAZES_VERSION }).records, old.records)
})

test('a level is always the same maze, and the levels grow', () => {
  assert.deepEqual(build(3).walls, build(3).walls)
  assert.notDeepEqual(build(3).walls, build(4).walls)
  const sizes = LEVELS.map(([columns, rows]) => columns * rows)
  assert.deepEqual([...sizes].sort((a, b) => a - b), sizes)
  assert.ok(solve(build(7)).length > solve(build(1)).length, 'Expected the last maze to be the longest walk')
})

test('the kitten cannot walk through a wall or out of the maze', () => {
  const maze = build(2)
  assert.equal(step(maze, 'north', 0), 'blocked')
  assert.equal(step(maze, 'west', 0), 'blocked')
  const shut = DIRECTIONS.find((direction) => !isOpen(maze, maze.kitten, direction)) as Direction
  assert.equal(step(maze, shut, 0), 'blocked')
  assert.deepEqual(maze.kitten, { x: 0, y: 0 })
  assert.equal(maze.started, false, 'Expected a step into a wall not to start the clock')
})

test('walking the way through reaches the fish and stops the clock', () => {
  const maze = build(1)
  const path = solve(maze)
  let result = step(maze, path[0], 1000)
  path.slice(1).forEach((direction, index) => {
    result = step(maze, direction, 2000 + index * 100)
  })
  assert.equal(result, 'done')
  assert.deepEqual(maze.kitten, maze.goal)
  const finished = elapsed(maze, 999_999)
  assert.equal(finished, 1000 + (path.length - 2) * 100)
  assert.equal(step(maze, 'north', 1_000_000), 'ignored')
})

test('a run in a row or column goes until the target or a wall', () => {
  const maze = build(4)
  assert.equal(run(maze, { x: 3, y: 3 }, 0), 'ignored', 'Expected a target out of line to be ignored')
  const direction = isOpen(maze, maze.kitten, 'east') ? 'east' : 'south'
  const far = direction === 'east' ? { x: maze.columns - 1, y: 0 } : { x: 0, y: maze.rows - 1 }
  assert.equal(run(maze, far, 0), 'moved')
  assert.ok(maze.steps > 0, 'Expected the kitten to have moved')
  const stopped = maze.kitten
  const ahead = { x: stopped.x + DELTA[direction].x, y: stopped.y + DELTA[direction].y }
  const reachedTarget = stopped.x === far.x && stopped.y === far.y
  assert.ok(reachedTarget || !isOpen(maze, stopped, direction), `Expected a wall before ${JSON.stringify(ahead)}`)
})

test('the clock starts with the first step and stops while paused', () => {
  const maze = build(1)
  const way = solve(maze)
  step(maze, way[0], 5000)
  pause(maze, 7000)
  assert.equal(step(maze, way[1], 8000), 'ignored', 'Expected no step while paused')
  assert.equal(elapsed(maze, 60_000), 2000)
  resume(maze, 60_000)
  step(maze, way[1], 61_000)
  assert.equal(elapsed(maze, 61_500), 3500)
})
