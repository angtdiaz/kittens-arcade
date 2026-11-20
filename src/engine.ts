// The rules of Catching Kittens, with no DOM and no clock: the same seed and the same input always
// give the same game, so the rules can be tested in Node.

export const RULES = {
  step: 1 / 60,
  lives: 3,
  wall: { top: 26, side: 6, bottom: 6 },
  cat: { speed: 120, pounceSpeed: 230, pounceTime: 0.16, cooldown: 0.55, radius: 6, reach: 3 },
  mouse: { radius: 4, peek: 0.5, speed: 32, speedMax: 60, flee: 30, fleeBoost: 1.3, wobble: 0.5, minTrip: 0.5 },
  spawn: { first: 1, every: 2.2, everyMin: 0.6, miceStart: 2, miceEnd: 6, rampSeconds: 150 },
  golden: { chance: 0.08, after: 8, points: 5, speedBoost: 1.35 }
} as const

export type Side = 'top' | 'left' | 'right' | 'bottom'
export type Vec = { x: number; y: number }
export type Hole = Vec & { side: Side }
export type Floor = { left: number; top: number; right: number; bottom: number }

export type Cat = Vec & {
  facing: 1 | -1
  moving: boolean
  stride: number
  pounce: number
  cooldown: number
  dir: Vec
}

export type Mouse = Vec & {
  id: number
  from: number
  to: number
  speed: number
  golden: boolean
  peek: number
  age: number
  phase: number
  facing: 1 | -1
}

export type Phase = 'ready' | 'playing' | 'over'

export type Game = {
  width: number
  height: number
  holes: Hole[]
  phase: Phase
  score: number
  lives: number
  time: number
  spawnIn: number
  nextId: number
  rng: number
  cat: Cat
  mice: Mouse[]
}

/** What the player does this step: `aim` is where the pointer is, `dx`/`dy` the arrow keys. */
export type Input = { aim: Vec | null; dx: number; dy: number }

export type GameEvent =
  | { type: 'caught'; x: number; y: number; points: number; golden: boolean }
  | { type: 'escaped'; x: number; y: number }
  | { type: 'spawned'; golden: boolean }
  | { type: 'over'; score: number }

const HOLES: readonly { side: Side; at: number }[] = [
  { side: 'top', at: 0.28 },
  { side: 'top', at: 0.72 },
  { side: 'left', at: 0.35 },
  { side: 'left', at: 0.78 },
  { side: 'right', at: 0.2 },
  { side: 'right', at: 0.6 },
  { side: 'bottom', at: 0.5 }
]

export const NO_INPUT: Input = { aim: null, dx: 0, dy: 0 }

export function floorOf(width: number, height: number): Floor {
  return {
    left: RULES.wall.side,
    top: RULES.wall.top,
    right: width - RULES.wall.side,
    bottom: height - RULES.wall.bottom
  }
}

export function holesOf(width: number, height: number): Hole[] {
  const floor = floorOf(width, height)
  return HOLES.map(({ side, at }) => {
    if (side === 'top') return { side, x: Math.round(width * at), y: floor.top }
    if (side === 'bottom') return { side, x: Math.round(width * at), y: floor.bottom }
    const y = Math.round(floor.top + (floor.bottom - floor.top) * at)
    return { side, x: side === 'left' ? floor.left : floor.right, y }
  })
}

export function difficultyAt(time: number): { spawnEvery: number; speed: number; maxMice: number } {
  const k = Math.min(1, time / RULES.spawn.rampSeconds)
  return {
    spawnEvery: lerp(RULES.spawn.every, RULES.spawn.everyMin, k),
    speed: lerp(RULES.mouse.speed, RULES.mouse.speedMax, k),
    maxMice: Math.round(lerp(RULES.spawn.miceStart, RULES.spawn.miceEnd, k))
  }
}

export function createGame(seed: number, width: number, height: number): Game {
  const floor = floorOf(width, height)
  return {
    width,
    height,
    holes: holesOf(width, height),
    phase: 'ready',
    score: 0,
    lives: RULES.lives,
    time: 0,
    spawnIn: RULES.spawn.first,
    nextId: 1,
    rng: seed >>> 0,
    cat: {
      x: Math.round((floor.left + floor.right) / 2),
      y: Math.round((floor.top + floor.bottom) / 2),
      facing: 1,
      moving: false,
      stride: 0,
      pounce: 0,
      cooldown: 0,
      dir: { x: 1, y: 0 }
    },
    mice: []
  }
}

/** Starts a new run in the same room. */
export function start(game: Game, seed: number): void {
  Object.assign(game, createGame(seed, game.width, game.height), { phase: 'playing' })
}

/** Fits the room to a new panel size, keeping the cat and the mice on the floor. */
export function resize(game: Game, width: number, height: number): void {
  game.width = width
  game.height = height
  game.holes = holesOf(width, height)
  if (game.phase === 'ready') {
    // Above the title card, so the cat is seen before the first run.
    const floor = floorOf(width, height)
    game.cat.x = Math.round((floor.left + floor.right) / 2)
    game.cat.y = Math.round(floor.top + (floor.bottom - floor.top) * 0.15)
  }
  keepCatOnFloor(game)
  const floor = floorOf(width, height)
  for (const mouse of game.mice) {
    mouse.x = clamp(mouse.x, floor.left, floor.right)
    mouse.y = clamp(mouse.y, floor.top, floor.bottom)
  }
}

/** A quick leap toward where the player is heading. False while the last one cools down. */
export function pounce(game: Game, input: Input): boolean {
  const { cat } = game
  if (game.phase !== 'playing' || cat.cooldown > 0) return false
  const want = intent(game, input)
  cat.dir = want ? { x: want.x, y: want.y } : { x: cat.facing, y: 0 }
  cat.pounce = RULES.cat.pounceTime
  cat.cooldown = RULES.cat.cooldown
  return true
}

/** Plays `dt` seconds and says what happened. */
export function advance(game: Game, dt: number, input: Input): GameEvent[] {
  if (game.phase !== 'playing') return []
  const events: GameEvent[] = []
  game.time += dt
  moveCat(game, dt, input)
  spawn(game, dt, events)
  for (const mouse of [...game.mice]) {
    moveMouse(game, mouse, dt)
    if (caught(game, mouse)) {
      remove(game, mouse)
      const points = mouse.golden ? RULES.golden.points : 1
      game.score += points
      events.push({ type: 'caught', x: mouse.x, y: mouse.y, points, golden: mouse.golden })
    } else if (escaped(game, mouse)) {
      remove(game, mouse)
      game.lives -= 1
      events.push({ type: 'escaped', x: mouse.x, y: mouse.y })
      if (game.lives <= 0) {
        game.phase = 'over'
        events.push({ type: 'over', score: game.score })
        break
      }
    }
  }
  return events
}

function moveCat(game: Game, dt: number, input: Input): void {
  const { cat } = game
  cat.cooldown = Math.max(0, cat.cooldown - dt)
  let vx = 0
  let vy = 0
  if (cat.pounce > 0) {
    cat.pounce -= dt
    vx = cat.dir.x * RULES.cat.pounceSpeed
    vy = cat.dir.y * RULES.cat.pounceSpeed
  } else {
    const want = intent(game, input)
    if (want) {
      // Following the pointer, the cat slows as it arrives instead of shaking around it.
      const speed = want.byKeys ? RULES.cat.speed : Math.min(RULES.cat.speed, want.distance * 10)
      vx = want.x * speed
      vy = want.y * speed
    }
  }
  cat.x += vx * dt
  cat.y += vy * dt
  keepCatOnFloor(game)
  const speed = Math.hypot(vx, vy)
  cat.moving = speed > 4
  cat.stride += speed * dt
  if (Math.abs(vx) > 1) cat.facing = vx > 0 ? 1 : -1
}

function intent(game: Game, input: Input): (Vec & { distance: number; byKeys: boolean }) | null {
  if (input.dx !== 0 || input.dy !== 0) {
    const length = Math.hypot(input.dx, input.dy)
    return { x: input.dx / length, y: input.dy / length, distance: Infinity, byKeys: true }
  }
  if (!input.aim) return null
  const dx = input.aim.x - game.cat.x
  const dy = input.aim.y - game.cat.y
  const distance = Math.hypot(dx, dy)
  if (distance < 1.5) return null
  return { x: dx / distance, y: dy / distance, distance, byKeys: false }
}

function keepCatOnFloor(game: Game): void {
  const floor = floorOf(game.width, game.height)
  game.cat.x = clamp(game.cat.x, floor.left + 7, floor.right - 7)
  game.cat.y = clamp(game.cat.y, floor.top + 4, floor.bottom - 4)
}

function spawn(game: Game, dt: number, events: GameEvent[]): void {
  game.spawnIn -= dt
  if (game.spawnIn > 0) return
  const level = difficultyAt(game.time)
  if (game.mice.length >= level.maxMice) {
    game.spawnIn = 0.3
    return
  }
  game.spawnIn = level.spawnEvery * (0.7 + random(game) * 0.6)
  const from = Math.floor(random(game) * game.holes.length)
  const hole = game.holes[from]
  const choices = destinations(game, from)
  const to = choices[Math.floor(random(game) * choices.length)]
  const golden = game.time >= RULES.golden.after && random(game) < RULES.golden.chance
  game.mice.push({
    id: game.nextId++,
    from,
    x: hole.x,
    y: hole.y,
    to,
    speed: level.speed * (0.85 + random(game) * 0.3) * (golden ? RULES.golden.speedBoost : 1),
    golden,
    peek: RULES.mouse.peek,
    age: 0,
    phase: random(game) * Math.PI * 2,
    facing: game.holes[to].x >= hole.x ? 1 : -1
  })
  events.push({ type: 'spawned', golden })
}

/** The holes a mouse coming out of `from` may run to: on another wall and at least half the room
 *  away, so no mouse slips from one hole into the next one round a corner. */
export function destinations(game: Game, from: number): number[] {
  const start = game.holes[from]
  const floor = floorOf(game.width, game.height)
  const far = Math.hypot(floor.right - floor.left, floor.bottom - floor.top) * RULES.mouse.minTrip
  const others = game.holes
    .map((hole, index) => ({ index, distance: Math.hypot(hole.x - start.x, hole.y - start.y), side: hole.side }))
    .filter((hole) => hole.side !== start.side)
  const farOnes = others.filter((hole) => hole.distance >= far)
  if (farOnes.length > 0) return farOnes.map((hole) => hole.index)
  const farthest = Math.max(...others.map((hole) => hole.distance))
  return others.filter((hole) => hole.distance === farthest).map((hole) => hole.index)
}

function moveMouse(game: Game, mouse: Mouse, dt: number): void {
  mouse.age += dt
  if (mouse.peek > 0) {
    mouse.peek -= dt
    return
  }
  const target = game.holes[mouse.to]
  const toX = target.x - mouse.x
  const toY = target.y - mouse.y
  const distance = Math.hypot(toX, toY) || 1
  const wobble = Math.sin(mouse.age * 6 + mouse.phase) * RULES.mouse.wobble
  let dirX = toX / distance - (toY / distance) * wobble
  let dirY = toY / distance + (toX / distance) * wobble
  let speed = mouse.speed
  const fromCatX = mouse.x - game.cat.x
  const fromCatY = mouse.y - game.cat.y
  const catDistance = Math.hypot(fromCatX, fromCatY) || 1
  if (catDistance < RULES.mouse.flee) {
    const fear = (1 - catDistance / RULES.mouse.flee) * (mouse.golden ? 3.2 : 2.5)
    dirX += (fromCatX / catDistance) * fear
    dirY += (fromCatY / catDistance) * fear
    speed *= RULES.mouse.fleeBoost
  }
  const length = Math.hypot(dirX, dirY) || 1
  const floor = floorOf(game.width, game.height)
  mouse.x = clamp(mouse.x + (dirX / length) * speed * dt, floor.left, floor.right)
  mouse.y = clamp(mouse.y + (dirY / length) * speed * dt, floor.top, floor.bottom)
  if (Math.abs(dirX) > 0.1) mouse.facing = dirX > 0 ? 1 : -1
}

function caught(game: Game, mouse: Mouse): boolean {
  const reach = RULES.cat.radius + RULES.mouse.radius + (game.cat.pounce > 0 ? RULES.cat.reach : 0)
  return Math.hypot(mouse.x - game.cat.x, mouse.y - game.cat.y) < reach
}

function escaped(game: Game, mouse: Mouse): boolean {
  const target = game.holes[mouse.to]
  return mouse.peek <= 0 && Math.hypot(target.x - mouse.x, target.y - mouse.y) < 2.5
}

function remove(game: Game, mouse: Mouse): void {
  game.mice = game.mice.filter((other) => other.id !== mouse.id)
}

/** Mulberry32, kept in the game itself so a game can be copied and replayed. */
function random(game: Game): number {
  game.rng = (game.rng + 0x6d2b79f5) >>> 0
  let t = game.rng
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

function lerp(from: number, to: number, k: number): number {
  return from + (to - from) * k
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}
