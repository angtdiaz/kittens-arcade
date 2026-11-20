import { button, element, paragraphs, type Arcade, type GameScreen } from '../arcade'
import { RULES, advance, createGame, pounce, resize, start, type GameEvent, type Input } from './engine'
import { FLOATER_LIFE, drawScene, type Floater } from './render'

export const CATCHING_STORE = 'best'
/** Space right after losing should not start a new run by accident. */
const RESTART_LOCK_MS = 700

const MOVES: Record<string, readonly [number, number]> = {
  ArrowLeft: [-1, 0],
  KeyA: [-1, 0],
  ArrowRight: [1, 0],
  KeyD: [1, 0],
  ArrowUp: [0, -1],
  KeyW: [0, -1],
  ArrowDown: [0, 1],
  KeyS: [0, 1]
}

export function catchingScreen(arcade: Arcade, saved: unknown): GameScreen {
  const { view, hud, sound } = arcade
  const card = {
    root: element('catching-card'),
    title: element('catching-title'),
    body: element('catching-body'),
    actions: element('catching-actions')
  }
  const keys = new Set<string>()
  const game = createGame(seed(), view.width, view.height)
  let best = typeof saved === 'number' ? saved : 0
  let aim: { x: number; y: number } | null = null
  let floaters: Floater[] = []
  let paused = false
  let active = false
  let restartAt = 0
  let carry = 0

  function input(): Input {
    let dx = 0
    let dy = 0
    for (const code of keys) {
      const move = MOVES[code]
      if (!move) continue
      dx += move[0]
      dy += move[1]
    }
    return { aim, dx, dy }
  }

  function handle(events: readonly GameEvent[]): void {
    for (const event of events) {
      if (event.type === 'caught') {
        floaters.push({ x: event.x, y: event.y, text: `+${event.points}`, age: 0, golden: event.golden })
        arcade.earn(event.points)
        sound.play(event.golden ? 'golden' : 'catch')
      } else if (event.type === 'escaped') {
        sound.play('escape')
        shake(hud.center)
      } else if (event.type === 'over') {
        finish(event.score)
      }
    }
    if (events.length > 0) showHud()
  }

  /** Space, Enter or the card's button: start, carry on, or pounce. */
  function act(): void {
    if (game.phase !== 'playing') {
      if (performance.now() >= restartAt) begin()
      return
    }
    if (paused) {
      setPaused(false)
      return
    }
    if (pounce(game, input())) sound.play('pounce')
  }

  function begin(): void {
    start(game, seed())
    floaters = []
    paused = false
    carry = 0
    card.root.hidden = true
    hud.pause.hidden = false
    showHud()
    sound.play('start')
  }

  function finish(score: number): void {
    hud.pause.hidden = true
    sound.play('over')
    const record = score > best
    if (record) {
      best = score
      arcade.keep(CATCHING_STORE, best)
    }
    restartAt = performance.now() + RESTART_LOCK_MS
    showCard('They got away!', 'Play again', [
      [`${score} ${score === 1 ? 'point' : 'points'}`, 'gold'],
      record && score > 0 ? ['New record!', 'gold'] : [`Best: ${best}`, 'soft'],
      [`You earned ${score} ${score === 1 ? 'coin' : 'coins'}.`, 'soft']
    ])
  }

  function setPaused(value: boolean): void {
    if (game.phase !== 'playing' || paused === value) return
    paused = value
    keys.clear()
    hud.pause.hidden = paused
    if (paused) showCard('Paused', 'Resume', [['Your mice are waiting.', 'soft']])
    else card.root.hidden = true
  }

  function showTitle(): void {
    showCard('Catching Kittens', 'Play', [
      ['Catch the mice before they reach another hole. If three get away, you lose.'],
      ['Each mouse is a coin, golden ones are worth five.', 'soft'],
      ['Move: mouse or arrows · Pounce: click or Space · Pause: P · Sound: M', 'soft']
    ])
  }

  function showCard(title: string, play: string, lines: readonly (readonly [string, string?])[]): void {
    card.title.textContent = title
    card.body.replaceChildren(...paragraphs(lines))
    card.actions.replaceChildren(button(play, act, 'primary'), button('Arcade', arcade.home))
    card.root.hidden = false
  }

  function showHud(): void {
    hud.left.textContent = String(game.score)
    hud.note.textContent = `Best ${best}`
    hud.center.replaceChildren(
      ...Array.from({ length: RULES.lives }, (_, index) => {
        const heart = document.createElement('span')
        heart.className = index >= game.lives ? 'heart lost' : 'heart'
        heart.textContent = '♥'
        return heart
      })
    )
  }

  function toRoom(event: PointerEvent): { x: number; y: number } {
    const rect = view.canvas.getBoundingClientRect()
    return { x: (event.clientX - rect.left) / view.cssPerPixel, y: (event.clientY - rect.top) / view.cssPerPixel }
  }

  view.canvas.addEventListener('pointermove', (event) => {
    if (active) aim = toRoom(event)
  })

  // Only a click on the room itself pounces or resumes; the card's buttons do the rest.
  view.canvas.addEventListener('pointerdown', (event) => {
    if (!active) return
    aim = toRoom(event)
    if (game.phase === 'playing') act()
  })

  return {
    enter() {
      active = true
      hud.pause.hidden = true
      showHud()
      showTitle()
    },
    leave() {
      active = false
      hud.pause.hidden = true
      card.root.hidden = true
      keys.clear()
      // Leaving gives up the run; the coins it earned are kept.
      if (game.phase === 'playing') Object.assign(game, createGame(seed(), view.width, view.height))
      paused = false
    },
    frame(dt) {
      if (game.phase === 'playing' && !paused) {
        carry += dt
        while (carry >= RULES.step) {
          carry -= RULES.step
          handle(advance(game, RULES.step, input()))
        }
      }
      for (const floater of floaters) floater.age += dt
      floaters = floaters.filter((floater) => floater.age < FLOATER_LIFE)
      drawScene(view.ctx, view.room, game, floaters, arcade.look())
    },
    key(event) {
      if (MOVES[event.code]) {
        keys.add(event.code)
        aim = null
        return true
      }
      if (event.code === 'Space' || event.code === 'Enter') {
        // A focused button answers Space and Enter itself.
        if (event.target instanceof HTMLButtonElement) return false
        if (!event.repeat) act()
        return true
      }
      if (event.code === 'KeyP' || event.code === 'Escape') {
        setPaused(!paused)
        return true
      }
      return false
    },
    keyUp(event: KeyboardEvent) {
      keys.delete(event.code)
    },
    blur() {
      setPaused(true)
    },
    pause() {
      setPaused(true)
    },
    resize() {
      resize(game, view.width, view.height)
    },
    summary() {
      return best > 0 ? `Best: ${best} points` : 'No runs yet'
    }
  }
}

function shake(target: HTMLElement): void {
  target.classList.remove('hit')
  void target.offsetWidth
  target.classList.add('hit')
}

function seed(): number {
  return Math.floor(Math.random() * 2 ** 32)
}
