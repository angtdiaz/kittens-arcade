import { button, clock, element, howToPlay, howToPlayFold, paragraphs, type Arcade, type GameScreen, type Line, type Rule } from '../arcade'
import { levelButtons, resultLines } from '../levels'
import { drawKitten } from '../looks'
import type { Look } from '../shop'
import { bestOf, canPlay, finishLevel, parseProgress, type Progress } from '../progress'
import { CAT, drawSprite, type Sprite } from '../sprites'
import {
  KITTENS,
  LEVELS,
  MISS_MS,
  cardsOf,
  cover,
  deal,
  elapsed,
  flip,
  pause,
  resume,
  totalPairs,
  type Board,
  type Card,
  type CardState
} from './engine'

export const PAIRS_STORE = 'pairs'

const HOW_TO_PLAY: readonly Rule[] = [
  ['🎯', 'Goal', 'Find every pair of matching kittens. Look closely: some only differ by their hat.'],
  ['⏱️', 'How it ends', 'You cannot lose: it is you against the clock, which starts with your first card. Your three fastest times on each level are kept.'],
  ['🎮', 'Controls', 'Click a card to turn it. Two that do not match turn back over. P or Esc pauses, and the cards hide.'],
  ['🪙', 'Coins', 'One per pair. Finish a level to open the next one.']
]

/** A card in room pixels: a kitten with room for the tallest hat, and a frame. */
const TILE = { width: 20, height: 18 }
const GAP_PX = 6
/** How long the last pair stays in sight before the level's card covers the board. */
const DONE_DELAY_MS = 450

const PAW: Sprite = ['..p.p..', 'p.....p', '..ppp..', '.ppppp.', '.ppppp.', '..ppp..']
const COLOURS = {
  back: '#5a3f6e',
  backEdge: '#7a5a8f',
  paw: '#e0a96d',
  face: '#3a3456',
  faceEdge: '#c9c3e6',
  matched: '#463e6a',
  matchedEdge: '#ffd166'
} as const

export function pairsScreen(arcade: Arcade, saved: unknown): GameScreen {
  const { view, hud, sound } = arcade
  const area = element('pairs-board')
  const card = {
    root: element('pairs-card'),
    title: element('pairs-title'),
    body: element('pairs-body'),
    levels: element('pairs-levels'),
    actions: element('pairs-actions')
  }
  const progress: Progress = parseProgress(saved, LEVELS.length)
  let board: Board | null = null
  let tiles: HTMLButtonElement[] = []
  let drawn: CardState[] = []
  let missTimer: number | undefined
  let paused = false

  function startLevel(level: number): void {
    if (!canPlay(progress, level)) return
    clearTimeout(missTimer)
    board = deal(level, Math.floor(Math.random() * 2 ** 32))
    paused = false
    tiles = board.cards.map((_, index) => {
      const tile = document.createElement('button')
      tile.type = 'button'
      tile.className = 'tile'
      tile.dataset.index = String(index)
      tile.setAttribute('aria-label', 'Card face down')
      const canvas = document.createElement('canvas')
      canvas.width = TILE.width
      canvas.height = TILE.height
      tile.append(canvas)
      return tile
    })
    drawn = []
    area.replaceChildren(...tiles)
    redraw(false)
    layout()
    area.hidden = false
    area.style.visibility = ''
    card.root.hidden = true
    hud.pause.hidden = false
    showHud()
  }

  function turn(index: number): void {
    if (!board || paused) return
    clearTimeout(missTimer)
    const result = flip(board, index, performance.now())
    if (result === 'ignored') return
    if (result === 'first' || result === 'miss') sound.play('flip')
    if (result === 'match' || result === 'done') {
      arcade.earn(1)
      sound.play('catch')
    }
    if (result === 'miss') missTimer = window.setTimeout(hideMiss, MISS_MS)
    redraw(true)
    showHud()
    if (result === 'done') finish(board)
  }

  function hideMiss(): void {
    if (!board) return
    cover(board)
    redraw(true)
  }

  function finish(done: Board): void {
    hud.pause.hidden = true
    const ms = elapsed(done, performance.now())
    const place = finishLevel(progress, done.level, ms, Date.now(), LEVELS.length)
    arcade.keep(PAIRS_STORE, progress)
    window.setTimeout(() => {
      if (board !== done) return
      sound.play('win')
      showDone(done, ms, place)
    }, DONE_DELAY_MS)
  }

  function setPaused(value: boolean): void {
    if (!board || board.finished || paused === value) return
    const now = performance.now()
    if (value) pause(board, now)
    else resume(board, now)
    paused = value
    hud.pause.hidden = paused
    // The cards hide while the clock is stopped, so a pause is no time to study them.
    area.style.visibility = paused ? 'hidden' : ''
    if (!paused) {
      card.root.hidden = true
      return
    }
    const note = board.started ? 'The cards are hidden while the clock is stopped.' : 'The clock starts with your first card.'
    showCard('Paused', [[note, 'soft'], howToPlayFold(HOW_TO_PLAY)], [
      button('Resume', () => setPaused(false), 'primary'),
      button('Levels', showMenu),
      button('Arcade', arcade.home)
    ])
  }

  // ----- Cards and screens -----

  function redraw(animate: boolean): void {
    if (!board) return
    board.cards.forEach((one, index) => {
      if (drawn[index] === one.state) return
      drawn[index] = one.state
      const tile = tiles[index]
      drawTile(tile.firstElementChild as HTMLCanvasElement, one)
      tile.classList.toggle('matched', one.state === 'matched')
      tile.setAttribute('aria-label', one.state === 'down' ? 'Card face down' : 'Kitten card')
      if (!animate) return
      tile.classList.remove('turn')
      void tile.offsetWidth
      tile.classList.add('turn')
    })
  }

  /** The largest cards that fit the room below its wall, in as many columns as that takes. */
  function layout(): void {
    if (!board) return
    const top = view.cssPerPixel * 26 + 8
    const width = area.parentElement?.clientWidth ?? 0
    const height = (area.parentElement?.clientHeight ?? 0) - top - 8
    const count = board.cards.length
    const aspect = TILE.width / TILE.height
    let best = { columns: 1, size: 0 }
    for (let columns = 2; columns <= 10; columns += 1) {
      const rows = Math.ceil(count / columns)
      const size = Math.min(
        (width - 16 - GAP_PX * (columns - 1)) / columns,
        ((height - GAP_PX * (rows - 1)) / rows) * aspect
      )
      if (size > best.size) best = { columns, size }
    }
    const tileWidth = Math.floor(best.size)
    area.style.top = `${top}px`
    area.style.gridTemplateColumns = `repeat(${best.columns}, ${tileWidth}px)`
    area.style.setProperty('--tile-height', `${Math.floor(tileWidth / aspect)}px`)
  }

  function showMenu(): void {
    hud.pause.hidden = true
    clearTimeout(missTimer)
    board = null
    paused = false
    area.hidden = true
    area.replaceChildren()
    showHud()
    card.levels.replaceChildren(
      ...levelButtons(
        progress,
        LEVELS.map((cards) => `${cards} cards`),
        startLevel
      )
    )
    showCard(
      'Kitten Pairs',
      [howToPlay(HOW_TO_PLAY)],
      [button('Arcade', arcade.home)]
    )
  }

  function showDone(done: Board, ms: number, place: number | null): void {
    const level = done.level
    const last = level === LEVELS.length
    const actions = [
      ...(last ? [] : [button('Next level', () => startLevel(level + 1), 'primary')]),
      button('Retry', () => startLevel(level), last ? 'primary' : ''),
      button('Levels', showMenu),
      button('Arcade', arcade.home)
    ]
    showCard(
      last ? 'All 25 kittens found!' : `Level ${level} done!`,
      [...resultLines(progress, level, ms, place), [`You earned ${totalPairs(done)} coins.`, 'soft']],
      actions
    )
    card.levels.replaceChildren()
  }

  function showCard(title: string, lines: readonly Line[], actions: HTMLElement[]): void {
    card.title.textContent = title
    card.body.replaceChildren(...paragraphs(lines))
    card.actions.replaceChildren(...actions)
    if (title !== 'Kitten Pairs') card.levels.replaceChildren()
    card.root.hidden = false
  }

  function showHud(): void {
    if (!board) {
      hud.left.textContent = ''
      hud.center.textContent = 'Kitten Pairs'
      hud.note.textContent = `Level ${progress.unlocked} of ${LEVELS.length}`
      return
    }
    hud.left.textContent = clock(elapsed(board, performance.now()))
    hud.center.textContent = `Lv ${board.level} · ${board.pairs}/${totalPairs(board)}`
    const best = bestOf(progress, board.level)
    hud.note.textContent = best ? `Best ${clock(best.ms)}` : `${cardsOf(board.level)} cards`
  }

  area.addEventListener('click', (event) => {
    const tile = (event.target as HTMLElement).closest<HTMLButtonElement>('button.tile')
    if (tile?.dataset.index) turn(Number(tile.dataset.index))
  })

  return {
    enter() {
      showMenu()
    },
    leave() {
      hud.pause.hidden = true
      clearTimeout(missTimer)
      board = null
      area.hidden = true
      area.replaceChildren()
      card.root.hidden = true
    },
    frame() {
      view.ctx.drawImage(view.room, 0, 0)
      if (board && !board.finished && !paused) hud.left.textContent = clock(elapsed(board, performance.now()))
    },
    key(event) {
      if (!board || board.finished) return false
      if (event.code === 'KeyP' || event.code === 'Escape') {
        setPaused(!paused)
        return true
      }
      if (paused && (event.code === 'Space' || event.code === 'Enter') && !(event.target instanceof HTMLButtonElement)) {
        setPaused(false)
        return true
      }
      return false
    },
    blur() {
      setPaused(true)
    },
    pause() {
      setPaused(true)
    },
    resize() {
      layout()
    },
    summary() {
      const best = bestOf(progress, progress.unlocked)
      return `Level ${progress.unlocked} of ${LEVELS.length}${best ? ` · best ${clock(best.ms)}` : ''}`
    }
  }
}

function drawTile(canvas: HTMLCanvasElement, card: Card): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.clearRect(0, 0, TILE.width, TILE.height)
  paintCard(ctx, card.state, KITTENS[card.kitten], 0, 0)
}

function paintCard(ctx: CanvasRenderingContext2D, state: CardState, look: Look, x: number, y: number): void {
  const { width, height } = TILE
  const down = state === 'down'
  const matched = state === 'matched'
  ctx.fillStyle = down ? COLOURS.backEdge : matched ? COLOURS.matchedEdge : COLOURS.faceEdge
  ctx.fillRect(x + 1, y, width - 2, height)
  ctx.fillRect(x, y + 1, width, height - 2)
  ctx.fillStyle = down ? COLOURS.back : matched ? COLOURS.matched : COLOURS.face
  ctx.fillRect(x + 1, y + 1, width - 2, height - 2)
  if (down) drawSprite(ctx, PAW, { p: COLOURS.paw }, x + 7, y + 6)
  else drawKitten(ctx, CAT.walkA, look, x + 2, y + 6, false)
}

/** Two cards showing the same kitten: the picture on the game's tile in the arcade. */
export function paintPairsArt(ctx: CanvasRenderingContext2D, look: Look): void {
  paintCard(ctx, 'up', look, 0, 1)
  paintCard(ctx, 'up', look, TILE.width + 1, 1)
}
