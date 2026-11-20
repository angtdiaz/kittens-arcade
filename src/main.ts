import { RULES, advance, createGame, pounce, resize, start, type GameEvent, type Input } from './engine'
import { HAT_ROOM, drawKitten } from './looks'
import { FLOATER_LIFE, drawScene, paintRoom, type Floater } from './render'
import {
  ACCESSORIES,
  COATS,
  buy,
  earn,
  isWorn,
  newWardrobe,
  parseWardrobe,
  takeOff,
  tryOn,
  wear,
  type Accessory,
  type Coat,
  type Wardrobe
} from './shop'
import { Sound } from './sound'
import { CAT, spriteWidth } from './sprites'

const STORE = { best: 'best', sound: 'sound', wardrobe: 'wardrobe' } as const
/** About how many room pixels fit across the panel; the scale is the whole number closest to it. */
const ROOM_WIDTH = 150
const MIN_SIZE = { width: 96, height: 140 }
/** Space right after losing should not start a new run by accident. */
const RESTART_LOCK_MS = 700
const MAX_FRAME_SECONDS = 0.25
const PREVIEW = { width: spriteWidth(CAT.walkA) + 4, height: CAT.walkA.length + HAT_ROOM + 1 }

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

type Tab = 'coats' | 'accessories'

const stage = element<HTMLDivElement>('stage')
const canvas = element<HTMLCanvasElement>('room')
const hud = { score: element('score'), lives: element('lives'), coins: element('coins'), best: element('best') }
const card = { root: element('card'), title: element('card-title'), body: element('card-body'), play: element('play') }
const shop = {
  root: element('shop'),
  coins: element('shop-coins'),
  items: element('shop-items'),
  tabs: { coats: element('tab-coats'), accessories: element('tab-accessories') }
}
const settings = { root: element('settings'), sound: element('sound-toggle') }
const ctx = canvas.getContext('2d') ?? fail('Kittens Arcade needs a 2D canvas')

const sound = new Sound()
const keys = new Set<string>()
const game = createGame(seed(), MIN_SIZE.width, MIN_SIZE.height)
let wardrobe: Wardrobe = newWardrobe()
let aim: { x: number; y: number } | null = null
let cssPerPixel = 1
let room = paintRoom(game.width, game.height)
let floaters: Floater[] = []
let paused = false
let best = 0
let restartAt = 0
let last = performance.now()
let carry = 0
let tab: Tab = 'coats'

function element<T extends HTMLElement = HTMLElement>(id: string): T {
  return (document.getElementById(id) as T | null) ?? fail(`Kittens Arcade is missing #${id}`)
}

function fail(message: string): never {
  throw new Error(message)
}

function seed(): number {
  return Math.floor(Math.random() * 2 ** 32)
}

function sheetOpen(): boolean {
  return !shop.root.hidden || !settings.root.hidden
}

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

// ----- The game loop -----

function frame(now: number): void {
  const dt = Math.min(MAX_FRAME_SECONDS, (now - last) / 1000)
  last = now
  if (game.phase === 'playing' && !paused) {
    carry += dt
    while (carry >= RULES.step) {
      carry -= RULES.step
      handle(advance(game, RULES.step, input()))
    }
  }
  for (const floater of floaters) floater.age += dt
  floaters = floaters.filter((floater) => floater.age < FLOATER_LIFE)
  drawScene(ctx, room, game, floaters, wardrobe)
  requestAnimationFrame(frame)
}

function handle(events: readonly GameEvent[]): void {
  for (const event of events) {
    if (event.type === 'caught') {
      floaters.push({ x: event.x, y: event.y, text: `+${event.points}`, age: 0, golden: event.golden })
      earn(wardrobe, event.points)
      keepWardrobe()
      sound.play(event.golden ? 'golden' : 'catch')
    } else if (event.type === 'escaped') {
      sound.play('escape')
      shake(hud.lives)
    } else if (event.type === 'over') {
      finish(event.score)
    }
  }
  if (events.length > 0) showHud()
}

/** Space or Enter: start, carry on, or pounce. */
function act(): void {
  if (sheetOpen()) return
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
  showHud()
  sound.play('start')
}

function finish(score: number): void {
  sound.play('over')
  const record = score > best
  if (record) {
    best = score
    keep(STORE.best, best)
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
  if (paused) showCard('Paused', 'Resume', [['Your mice are waiting.', 'soft']])
  else card.root.hidden = true
}

// ----- Screens -----

function showTitle(): void {
  showCard('Catching Kittens', 'Play', [
    ['Catch the mice before they reach another hole. If three get away, you lose.'],
    ['Each mouse is a coin, golden ones are worth five. Spend them in the shop.', 'soft'],
    ['Move: mouse or arrows · Pounce: click or Space · Pause: P · Sound: M', 'soft']
  ])
}

function showCard(title: string, play: string, lines: readonly (readonly [string, string?])[]): void {
  card.title.textContent = title
  card.play.textContent = play
  card.body.replaceChildren(
    ...lines.map(([text, className]) => {
      const line = document.createElement('p')
      line.textContent = text
      if (className) line.className = className
      return line
    })
  )
  if (!sheetOpen()) card.root.hidden = false
}

function openSheet(sheet: HTMLElement): void {
  card.root.hidden = true
  sheet.hidden = false
  if (sheet === shop.root) showShop()
  if (sheet === settings.root) showSettings()
  sheet.querySelector<HTMLButtonElement>('button')?.focus()
}

function closeSheets(): void {
  shop.root.hidden = true
  settings.root.hidden = true
  card.root.hidden = game.phase === 'playing' && !paused
  stage.focus()
}

function showHud(): void {
  hud.score.textContent = String(game.score)
  hud.coins.textContent = String(wardrobe.coins)
  hud.best.textContent = `Best ${best}`
  hud.lives.replaceChildren(
    ...Array.from({ length: RULES.lives }, (_, index) => {
      const heart = document.createElement('span')
      heart.textContent = '♥'
      if (index >= game.lives) heart.className = 'lost'
      return heart
    })
  )
}

function shake(target: HTMLElement): void {
  target.classList.remove('hit')
  void target.offsetWidth
  target.classList.add('hit')
}

// ----- Shop -----

function showShop(): void {
  shop.coins.textContent = String(wardrobe.coins)
  for (const [name, button] of Object.entries(shop.tabs)) button.setAttribute('aria-selected', String(name === tab))
  const items: readonly (Coat | Accessory)[] = tab === 'coats' ? COATS : ACCESSORIES
  shop.items.replaceChildren(...items.map(itemCard))
}

function itemCard(item: Coat | Accessory): HTMLElement {
  const worn = isWorn(wardrobe, item.id)
  const owned = wardrobe.owned.includes(item.id)
  const box = document.createElement('div')
  box.className = worn ? 'item worn' : 'item'
  const preview = document.createElement('canvas')
  preview.width = PREVIEW.width
  preview.height = PREVIEW.height
  const previewCtx = preview.getContext('2d')
  if (previewCtx) drawKitten(previewCtx, CAT.walkA, tryOn(wardrobe, item.id), 2, HAT_ROOM, false)
  const name = document.createElement('span')
  name.textContent = item.name
  const button = document.createElement('button')
  button.type = 'button'
  button.dataset.id = item.id
  if (!owned) {
    button.dataset.action = 'buy'
    button.textContent = `Buy · ${item.price}`
    button.disabled = wardrobe.coins < item.price
    if (button.disabled) button.title = `You need ${item.price - wardrobe.coins} more coins`
  } else if (worn) {
    button.dataset.action = 'slot' in item ? 'take-off' : ''
    button.textContent = 'slot' in item ? 'Take off' : 'Wearing'
    button.disabled = !('slot' in item)
  } else {
    button.dataset.action = 'wear'
    button.textContent = 'Wear'
  }
  box.append(preview, name, button)
  return box
}

function shopAction(action: string, id: string): void {
  if (action === 'buy') {
    if (!buy(wardrobe, id).ok) return
    sound.play('golden')
  } else if (action === 'wear') {
    wear(wardrobe, id)
  } else if (action === 'take-off') {
    takeOff(wardrobe, id)
  } else {
    return
  }
  keepWardrobe()
  showShop()
  showHud()
  shop.items.querySelector<HTMLButtonElement>(`button[data-id="${id}"]`)?.focus()
}

// ----- Settings -----

function showSettings(): void {
  settings.sound.textContent = sound.enabled ? 'On' : 'Off'
  settings.sound.setAttribute('aria-checked', String(sound.enabled))
}

function toggleSound(): void {
  sound.enabled = !sound.enabled
  keep(STORE.sound, sound.enabled)
  showSettings()
}

// ----- Storage -----

function keep(key: string, value: number | boolean | Wardrobe): void {
  orca.storage.set(key, value).catch((error: unknown) => console.warn(`Kittens Arcade could not save ${key}`, error))
}

function keepWardrobe(): void {
  keep(STORE.wardrobe, wardrobe)
}

async function load(): Promise<void> {
  try {
    const [storedBest, storedSound, storedWardrobe] = await Promise.all([
      orca.storage.get(STORE.best),
      orca.storage.get(STORE.sound),
      orca.storage.get(STORE.wardrobe)
    ])
    if (typeof storedBest === 'number') best = storedBest
    if (typeof storedSound === 'boolean') sound.enabled = storedSound
    wardrobe = parseWardrobe(storedWardrobe)
  } catch (error) {
    console.warn('Kittens Arcade could not read its storage', error)
  }
  showHud()
}

// ----- Size and input -----

/** Sizes the room to the panel in whole device pixels, so the pixel art stays sharp. */
function fit(): void {
  const ratio = window.devicePixelRatio || 1
  const deviceWidth = stage.clientWidth * ratio
  const deviceHeight = stage.clientHeight * ratio
  if (deviceWidth <= 0 || deviceHeight <= 0) return
  const scale = Math.max(1, Math.round(deviceWidth / ROOM_WIDTH))
  const width = Math.max(MIN_SIZE.width, Math.floor(deviceWidth / scale))
  const height = Math.max(MIN_SIZE.height, Math.floor(deviceHeight / scale))
  cssPerPixel = scale / ratio
  canvas.width = width
  canvas.height = height
  canvas.style.width = `${width * cssPerPixel}px`
  canvas.style.height = `${height * cssPerPixel}px`
  ctx.imageSmoothingEnabled = false
  stage.style.setProperty('--wall-height', `${RULES.wall.top * cssPerPixel}px`)
  if (width === game.width && height === game.height) return
  resize(game, width, height)
  room = paintRoom(width, height)
}

function toRoom(event: PointerEvent): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect()
  return { x: (event.clientX - rect.left) / cssPerPixel, y: (event.clientY - rect.top) / cssPerPixel }
}

stage.addEventListener('pointermove', (event) => {
  aim = toRoom(event)
})

// Only a click on the room itself pounces or resumes; the screens' buttons do the rest.
canvas.addEventListener('pointerdown', (event) => {
  stage.focus()
  aim = toRoom(event)
  if (game.phase === 'playing' && !sheetOpen()) act()
})

card.play.addEventListener('click', act)
element('open-shop').addEventListener('click', () => openSheet(shop.root))
element('open-settings').addEventListener('click', () => openSheet(settings.root))
settings.sound.addEventListener('click', toggleSound)
document.querySelectorAll<HTMLButtonElement>('[data-close]').forEach((close) => {
  close.addEventListener('click', closeSheets)
})
shop.tabs.coats.addEventListener('click', () => {
  tab = 'coats'
  showShop()
})
shop.tabs.accessories.addEventListener('click', () => {
  tab = 'accessories'
  showShop()
})
shop.items.addEventListener('click', (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button[data-id]')
  if (button?.dataset.id && button.dataset.action) shopAction(button.dataset.action, button.dataset.id)
})

window.addEventListener('keydown', (event) => {
  if (sheetOpen()) {
    if (event.code === 'Escape') closeSheets()
    return
  }
  // A focused button answers Space and Enter itself.
  const onButton = event.target instanceof HTMLButtonElement
  if (MOVES[event.code]) {
    keys.add(event.code)
    aim = null
  } else if ((event.code === 'Space' || event.code === 'Enter') && !onButton) {
    if (!event.repeat) act()
  } else if (event.code === 'KeyP' || event.code === 'Escape') {
    setPaused(!paused)
  } else if (event.code === 'KeyM') {
    toggleSound()
  } else {
    return
  }
  event.preventDefault()
})

window.addEventListener('keyup', (event) => {
  keys.delete(event.code)
})

// Clicking into a terminal or anywhere outside the panel pauses, so typing never costs a run.
window.addEventListener('blur', () => setPaused(true))
document.addEventListener('visibilitychange', () => {
  if (document.hidden) setPaused(true)
})

new ResizeObserver(fit).observe(stage)
fit()
showTitle()
showHud()
void load()
requestAnimationFrame(frame)
