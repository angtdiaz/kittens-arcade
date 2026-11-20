import { button, clock, element, paragraphs, type Arcade, type GameScreen } from '../arcade'
import { floorOf } from '../catching/engine'
import { levelButtons, resultLines, type Line } from '../levels'
import { drawCentred, drawKittenHead } from '../looks'
import { bestOf, canPlay, finishLevel, type Progress } from '../progress'
import type { Look } from '../shop'
import type { Sprite } from '../sprites'
import {
  LEVELS,
  MAZES_VERSION,
  WALL,
  build,
  coinsFor,
  elapsed,
  inSight,
  pause,
  resume,
  run,
  step,
  upgradeProgress,
  type Cell,
  type Direction,
  type Maze,
  type Step
} from './engine'

export const MAZE_STORE = 'maze'

/** Holding an arrow walks on: first after a short wait, then at a steady pace. */
const HOLD = { first: 0.22, every: 0.09 }
/** How long the kitten sits on its fish before the level's card comes up. */
const DONE_DELAY_MS = 450

const KEYS: Record<string, Direction> = {
  ArrowUp: 'north',
  KeyW: 'north',
  ArrowRight: 'east',
  KeyD: 'east',
  ArrowDown: 'south',
  KeyS: 'south',
  ArrowLeft: 'west',
  KeyA: 'west'
}

const FISH: Record<'large' | 'small', Sprite> = {
  large: ['..cc...', '.cccc.c', 'ckccccc', '.cccc.c', '..cc...'],
  small: ['.cc.c', 'kcccc', '.cc.c']
}

const COLOURS = {
  floor: '#241f3a',
  dark: '#0f0c1a',
  trail: '#3d3560',
  trailSeen: '#2f2a4a',
  wall: '#c9c3e6',
  wallSeen: '#5a5185',
  fish: { c: '#4cc9f0', k: '#1b1b2b' }
} as const

type Grid = { left: number; top: number; cell: number }

export function mazeScreen(arcade: Arcade, saved: unknown): GameScreen {
  const { view, hud, sound } = arcade
  const card = {
    root: element('maze-card'),
    title: element('maze-title'),
    body: element('maze-body'),
    levels: element('maze-levels'),
    actions: element('maze-actions')
  }
  const progress: Progress = upgradeProgress(saved)
  let maze: Maze | null = null
  let held: { code: string; direction: Direction; wait: number } | null = null
  let paused = false
  let active = false

  function startLevel(level: number): void {
    if (!canPlay(progress, level)) return
    maze = build(level)
    paused = false
    held = null
    card.root.hidden = true
    hud.pause.hidden = false
    showHud()
  }

  function move(result: Step): void {
    if (!maze || result === 'ignored' || result === 'blocked') return
    sound.play('flip')
    showHud()
    if (result === 'done') finish(maze)
  }

  function finish(done: Maze): void {
    held = null
    hud.pause.hidden = true
    const ms = elapsed(done, performance.now())
    const place = finishLevel(progress, done.level, ms, Date.now(), LEVELS.length)
    arcade.keep(MAZE_STORE, { ...progress, mazes: MAZES_VERSION })
    arcade.earn(coinsFor(done.level))
    window.setTimeout(() => {
      if (maze !== done) return
      sound.play('win')
      showDone(done, ms, place)
    }, DONE_DELAY_MS)
  }

  function setPaused(value: boolean): void {
    if (!maze || maze.finished || paused === value) return
    const now = performance.now()
    if (value) pause(maze, now)
    else resume(maze, now)
    paused = value
    held = null
    hud.pause.hidden = paused
    if (!paused) {
      card.root.hidden = true
      return
    }
    const note = maze.started ? 'The maze hides while the clock is stopped.' : 'The clock starts with your first step.'
    showCard('Paused', [[note, 'soft']], [
      button('Resume', () => setPaused(false), 'primary'),
      button('Levels', showMenu),
      button('Arcade', arcade.home)
    ])
  }

  // ----- Drawing -----

  /** The largest square cells that fit the room's floor, the maze centred on it. */
  function grid(of: Maze): Grid {
    const floor = floorOf(view.width, view.height)
    const width = floor.right - floor.left - 4
    const height = floor.bottom - floor.top - 4
    const cell = Math.max(3, Math.floor(Math.min((width - 1) / of.columns, (height - 1) / of.rows)))
    return {
      left: Math.floor(floor.left + (floor.right - floor.left - (of.columns * cell + 1)) / 2),
      top: Math.floor(floor.top + (floor.bottom - floor.top - (of.rows * cell + 1)) / 2),
      cell
    }
  }

  /** In the dark levels, a cell is lit inside the kitten's light, dim once seen, and black before. */
  function draw(of: Maze, look: Look): void {
    const { ctx } = view
    const { left, top, cell } = grid(of)
    const seen = new Set(of.seen)
    const light = (index: number): 'lit' | 'seen' | 'dark' => {
      if (inSight(of, { x: index % of.columns, y: Math.floor(index / of.columns) })) return 'lit'
      return seen.has(index) ? 'seen' : 'dark'
    }
    const corner = (index: number) => ({
      x: left + (index % of.columns) * cell,
      y: top + Math.floor(index / of.columns) * cell
    })
    ctx.fillStyle = COLOURS.floor
    ctx.fillRect(left, top, of.columns * cell + 1, of.rows * cell + 1)
    ctx.fillStyle = COLOURS.dark
    of.walls.forEach((_, index) => {
      if (light(index) !== 'dark') return
      const { x, y } = corner(index)
      ctx.fillRect(x, y, cell + 1, cell + 1)
    })
    for (const index of of.trail) {
      const { x, y } = corner(index)
      ctx.fillStyle = light(index) === 'lit' ? COLOURS.trail : COLOURS.trailSeen
      ctx.fillRect(x + 1, y + 1, cell - 1, cell - 1)
    }
    of.walls.forEach((walls, index) => {
      const shown = light(index)
      if (shown === 'dark') return
      const { x, y } = corner(index)
      ctx.fillStyle = shown === 'lit' ? COLOURS.wall : COLOURS.wallSeen
      if (walls & WALL.north) ctx.fillRect(x, y, cell + 1, 1)
      if (walls & WALL.west) ctx.fillRect(x, y, 1, cell + 1)
      if (walls & WALL.east) ctx.fillRect(x + cell, y, 1, cell + 1)
      if (walls & WALL.south) ctx.fillRect(x, y + cell, cell + 1, 1)
    })
    const room = cell - 1
    const fish = room < 9 ? FISH.small : FISH.large
    drawCentred(ctx, fish, COLOURS.fish, left + of.goal.x * cell + 1, top + of.goal.y * cell + 1, room)
    drawKittenHead(ctx, look, left + of.kitten.x * cell + 1, top + of.kitten.y * cell + 1, room)
  }

  function cellAt(event: PointerEvent): Cell | null {
    if (!maze) return null
    const rect = view.canvas.getBoundingClientRect()
    const { left, top, cell } = grid(maze)
    const x = Math.floor(((event.clientX - rect.left) / view.cssPerPixel - left) / cell)
    const y = Math.floor(((event.clientY - rect.top) / view.cssPerPixel - top) / cell)
    return x >= 0 && y >= 0 && x < maze.columns && y < maze.rows ? { x, y } : null
  }

  // ----- Screens -----

  function showMenu(): void {
    hud.pause.hidden = true
    maze = null
    paused = false
    held = null
    showHud()
    card.levels.replaceChildren(
      ...levelButtons(
        progress,
        LEVELS.map(([columns, rows]) => `${columns}×${rows}`),
        startLevel
      )
    )
    showCard(
      'Kitten Maze',
      [
        ['Walk your kitten from the top-left corner to its fish, as fast as you can.'],
        ['Arrows or WASD take a step; hold them to keep walking. Click a square in line with the kitten to run there.', 'soft'],
        ['From level 4 the paths loop, and from level 5 the lights go out: you only see around your kitten.', 'soft'],
        ['The clock starts with your first step. Each level is always the same maze.', 'soft']
      ],
      [button('Arcade', arcade.home)],
      true
    )
  }

  function showDone(done: Maze, ms: number, place: number | null): void {
    const level = done.level
    const last = level === LEVELS.length
    showCard(
      last ? 'Every maze done!' : `Level ${level} done!`,
      [...resultLines(progress, level, ms, place), [`You earned ${coinsFor(level)} coins.`, 'soft']],
      [
        ...(last ? [] : [button('Next level', () => startLevel(level + 1), 'primary')]),
        button('Retry', () => startLevel(level), last ? 'primary' : ''),
        button('Levels', showMenu),
        button('Arcade', arcade.home)
      ]
    )
  }

  function showCard(title: string, lines: readonly Line[], actions: HTMLElement[], withLevels = false): void {
    card.title.textContent = title
    card.body.replaceChildren(...paragraphs(lines))
    card.actions.replaceChildren(...actions)
    if (!withLevels) card.levels.replaceChildren()
    card.root.hidden = false
  }

  function showHud(): void {
    if (!maze) {
      hud.left.textContent = ''
      hud.center.textContent = 'Kitten Maze'
      hud.note.textContent = `Level ${progress.unlocked} of ${LEVELS.length}`
      return
    }
    hud.left.textContent = clock(elapsed(maze, performance.now()))
    hud.center.textContent = `Level ${maze.level}`
    const best = bestOf(progress, maze.level)
    hud.note.textContent = best ? `Best ${clock(best.ms)}` : `${maze.columns}×${maze.rows}`
  }

  view.canvas.addEventListener('pointerdown', (event) => {
    if (!active || !maze || paused || maze.finished) return
    const target = cellAt(event)
    if (target) move(run(maze, target, performance.now()))
  })

  return {
    enter() {
      active = true
      showMenu()
    },
    leave() {
      active = false
      hud.pause.hidden = true
      maze = null
      held = null
      card.root.hidden = true
    },
    frame(dt) {
      view.ctx.drawImage(view.room, 0, 0)
      if (!maze || paused) return
      if (held && !maze.finished) {
        held.wait -= dt
        while (held && held.wait <= 0) {
          held.wait += HOLD.every
          move(step(maze, held.direction, performance.now()))
        }
      }
      draw(maze, arcade.look())
      if (!maze.finished) hud.left.textContent = clock(elapsed(maze, performance.now()))
    },
    key(event) {
      if (!maze || maze.finished) return false
      if (event.code === 'KeyP' || event.code === 'Escape') {
        setPaused(!paused)
        return true
      }
      if (paused) {
        if ((event.code === 'Space' || event.code === 'Enter') && !(event.target instanceof HTMLButtonElement)) {
          setPaused(false)
          return true
        }
        return false
      }
      const direction = KEYS[event.code]
      if (!direction) return false
      if (!event.repeat) {
        held = { code: event.code, direction, wait: HOLD.first }
        move(step(maze, direction, performance.now()))
      }
      return true
    },
    keyUp(event) {
      if (held?.code === event.code) held = null
    },
    blur() {
      setPaused(true)
    },
    pause() {
      setPaused(true)
    },
    resize() {},
    summary() {
      const best = bestOf(progress, progress.unlocked)
      return `Level ${progress.unlocked} of ${LEVELS.length}${best ? ` · best ${clock(best.ms)}` : ''}`
    }
  }
}

/** The kitten's head on a corner of a small maze: the picture on the game's tile in the arcade. */
export function paintMazeArt(ctx: CanvasRenderingContext2D, look: Look): void {
  const maze = build(1)
  const cell = 6
  ctx.fillStyle = COLOURS.floor
  ctx.fillRect(0, 0, 41, 20)
  ctx.fillStyle = COLOURS.wall
  for (let y = 0; y < 3; y += 1) {
    for (let x = 0; x < 6; x += 1) {
      const walls = maze.walls[y * maze.columns + x]
      const px = 2 + x * cell
      const py = 1 + y * cell
      if (walls & WALL.north) ctx.fillRect(px, py, cell + 1, 1)
      if (walls & WALL.west) ctx.fillRect(px, py, 1, cell + 1)
      if (x === 5) ctx.fillRect(px + cell, py, 1, cell + 1)
      if (y === 2) ctx.fillRect(px, py + cell, cell + 1, 1)
    }
  }
  drawKittenHead(ctx, look, 3, 2, cell - 1)
  drawCentred(ctx, FISH.small, COLOURS.fish, 2 + 5 * cell + 1, 1 + 2 * cell + 1, cell - 1)
}
