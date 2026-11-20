import { assert, test } from 'orca/testing'
import {
  NO_INPUT,
  RULES,
  advance,
  createGame,
  destinations,
  difficultyAt,
  floorOf,
  pounce,
  start,
  type Game,
  type GameEvent,
  type Input,
  type Mouse
} from './engine'

const WIDTH = 150
const HEIGHT = 300

function playing(seed = 7): Game {
  const game = createGame(seed, WIDTH, HEIGHT)
  start(game, seed)
  game.spawnIn = Infinity
  return game
}

function mouseAt(game: Game, x: number, y: number, extra: Partial<Mouse> = {}): Mouse {
  const mouse: Mouse = {
    id: game.nextId++,
    from: 0,
    to: 6,
    x,
    y,
    speed: 0,
    golden: false,
    peek: 0,
    age: 0,
    phase: 0,
    facing: 1,
    ...extra
  }
  game.mice.push(mouse)
  return mouse
}

function play(game: Game, seconds: number, input: Input = NO_INPUT): GameEvent[] {
  const events: GameEvent[] = []
  for (let i = 0; i < Math.round(seconds / RULES.step); i += 1) events.push(...advance(game, RULES.step, input))
  return events
}

test('a mouse the cat touches is caught for one point', () => {
  const game = playing()
  mouseAt(game, game.cat.x + 2, game.cat.y)
  const events = play(game, RULES.step)
  assert.deepEqual(
    events.map((event) => event.type),
    ['caught']
  )
  assert.equal(game.score, 1)
  assert.equal(game.mice.length, 0)
})

test('a golden mouse is worth five', () => {
  const game = playing()
  mouseAt(game, game.cat.x, game.cat.y + 2, { golden: true })
  play(game, RULES.step)
  assert.equal(game.score, RULES.golden.points)
})

test('a mouse that reaches its hole costs a life, and the third ends the run', () => {
  const game = playing()
  const hole = game.holes[6]
  for (let i = 0; i < RULES.lives; i += 1) mouseAt(game, hole.x, hole.y - 1, { to: 6 })
  const events = play(game, RULES.step)
  assert.deepEqual(
    events.map((event) => event.type),
    ['escaped', 'escaped', 'escaped', 'over']
  )
  assert.equal(game.lives, 0)
  assert.equal(game.phase, 'over')
  assert.deepEqual(advance(game, RULES.step, NO_INPUT), [], 'Expected nothing to happen once the run is over')
})

test('a mouse still peeking out of its hole does not escape', () => {
  const game = playing()
  const hole = game.holes[6]
  mouseAt(game, hole.x, hole.y, { to: 6, peek: RULES.mouse.peek })
  play(game, RULES.mouse.peek / 2)
  assert.equal(game.lives, RULES.lives)
})

test('a mouse runs away from a cat that comes close', () => {
  const game = playing()
  game.cat.x = 60
  game.cat.y = 150
  const mouse = mouseAt(game, 60, 150 - 14, { to: 6, speed: 30 })
  play(game, 0.2)
  assert.ok(mouse.y < 150 - 14, 'Expected the mouse to move away from the cat, not toward its hole below')
})

test('the cat follows the pointer and stays on the floor', () => {
  const game = playing()
  play(game, 5, { aim: { x: -50, y: -50 }, dx: 0, dy: 0 })
  const floor = floorOf(WIDTH, HEIGHT)
  assert.ok(game.cat.x >= floor.left && game.cat.y >= floor.top, 'Expected the cat to stay inside the room')
  assert.ok(game.cat.x < WIDTH / 2 && game.cat.y < HEIGHT / 2, 'Expected the cat to head for the pointer')
})

test('a pounce has to cool down before the next one', () => {
  const game = playing()
  assert.ok(pounce(game, NO_INPUT), 'Expected the first pounce to go')
  assert.ok(!pounce(game, NO_INPUT), 'Expected a second pounce right away to be refused')
  play(game, RULES.cat.cooldown + RULES.step)
  assert.ok(pounce(game, NO_INPUT), 'Expected a pounce once the cooldown is over')
})

test('mice come out faster and more at once as the run goes on, up to a limit', () => {
  const early = difficultyAt(0)
  const late = difficultyAt(RULES.spawn.rampSeconds)
  assert.ok(late.spawnEvery < early.spawnEvery && late.speed > early.speed && late.maxMice > early.maxMice)
  assert.deepEqual(difficultyAt(RULES.spawn.rampSeconds * 3), late)
})

test('the same seed plays the same run', () => {
  const input: Input = { aim: { x: 30, y: 200 }, dx: 0, dy: 0 }
  const runs = [createGame(42, WIDTH, HEIGHT), createGame(42, WIDTH, HEIGHT)].map((game) => {
    start(game, 42)
    play(game, 30, input)
    return JSON.stringify(game)
  })
  assert.equal(runs[0], runs[1])
  const other = createGame(43, WIDTH, HEIGHT)
  start(other, 43)
  play(other, 30, input)
  assert.notEqual(JSON.stringify(other), runs[0])
})

test('a mouse never runs to a hole close to the one it came out of', () => {
  const game = playing()
  const floor = floorOf(WIDTH, HEIGHT)
  const half = Math.hypot(floor.right - floor.left, floor.bottom - floor.top) / 2
  game.holes.forEach((start, from) => {
    const choices = destinations(game, from)
    assert.ok(choices.length > 0, `Expected somewhere to run from hole ${from}`)
    for (const to of choices) {
      const hole = game.holes[to]
      assert.notEqual(hole.side, start.side)
      assert.ok(Math.hypot(hole.x - start.x, hole.y - start.y) >= half, `Expected hole ${to} to be far from ${from}`)
    }
  })
})
