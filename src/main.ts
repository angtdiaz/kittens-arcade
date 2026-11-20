import type { JsonValue } from 'orca'
import { element, type Arcade, type GameScreen, type View } from './arcade'
import { paintCatchingArt, paintRoom } from './catching/render'
import { CATCHING_STORE, catchingScreen } from './catching/screen'
import { HAT_ROOM, drawKitten } from './looks'
import { MAZE_STORE, mazeScreen, paintMazeArt } from './maze/screen'
import { PAIRS_STORE, paintPairsArt, pairsScreen } from './pairs/screen'
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
  type Look,
  type Wardrobe
} from './shop'
import { Sound } from './sound'
import { CAT, spriteWidth } from './sprites'

const STORE = { sound: 'sound', wardrobe: 'wardrobe' } as const
/** About how many room pixels fit across the panel; the scale is the whole number closest to it. */
const ROOM_WIDTH = 150
const MIN_SIZE = { width: 96, height: 140 }
const WALL_HEIGHT = 26
const MAX_FRAME_SECONDS = 0.25
const PREVIEW = { width: spriteWidth(CAT.walkA) + 4, height: CAT.walkA.length + HAT_ROOM + 1 }
const ART = { width: 41, height: 20 }

type Tab = 'coats' | 'accessories'
type Game = {
  id: string
  name: string
  line: string
  paint: (ctx: CanvasRenderingContext2D, look: Look) => void
  screen: GameScreen
}

const stage = element<HTMLDivElement>('stage')
const canvas = element<HTMLCanvasElement>('room')
const coins = element('coins')
const lobby = { root: element('lobby'), kitten: element<HTMLCanvasElement>('lobby-kitten'), games: element('games') }
const shop = {
  root: element('shop'),
  coins: element('shop-coins'),
  items: element('shop-items'),
  tabs: { coats: element('tab-coats'), accessories: element('tab-accessories') }
}
const settings = { root: element('settings'), sound: element('sound-toggle') }
const ctx = canvas.getContext('2d') ?? fail('Kittens Arcade needs a 2D canvas')

const view: View = { canvas, ctx, room: paintRoom(MIN_SIZE.width, MIN_SIZE.height), ...MIN_SIZE, cssPerPixel: 1 }
const sound = new Sound()
let wardrobe: Wardrobe = newWardrobe()
let games: Game[] = []
let current: Game | null = null
let tab: Tab = 'coats'
let last = performance.now()

const arcade: Arcade = {
  view,
  hud: {
    pause: element<HTMLButtonElement>('hud-pause'),
    left: element('hud-left'),
    center: element('hud-center'),
    note: element('hud-note')
  },
  sound,
  look: () => wardrobe,
  earn(amount) {
    earn(wardrobe, amount)
    keepWardrobe()
    showCoins()
  },
  keep,
  home: () => showLobby()
}

function fail(message: string): never {
  throw new Error(message)
}

// ----- The arcade -----

function showLobby(): void {
  current?.screen.leave()
  current = null
  closeSheets()
  arcade.hud.pause.hidden = true
  arcade.hud.left.textContent = ''
  arcade.hud.center.textContent = ''
  arcade.hud.note.textContent = ''
  paintPicture(lobby.kitten, PREVIEW, (picture) => drawKitten(picture, CAT.walkA, wardrobe, 2, HAT_ROOM, false))
  lobby.games.replaceChildren(...games.map(gameTile))
  lobby.root.hidden = false
}

function play(game: Game): void {
  lobby.root.hidden = true
  current = game
  game.screen.enter()
  stage.focus()
}

function gameTile(game: Game): HTMLElement {
  const tile = document.createElement('button')
  tile.type = 'button'
  tile.className = 'game'
  const art = document.createElement('canvas')
  paintPicture(art, ART, (picture) => game.paint(picture, wardrobe))
  const name = document.createElement('span')
  name.className = 'game-name'
  name.textContent = game.name
  const line = document.createElement('span')
  line.className = 'game-line'
  line.textContent = game.line
  const best = document.createElement('span')
  best.className = 'game-best'
  best.textContent = game.screen.summary()
  tile.append(art, name, line, best)
  tile.addEventListener('click', () => play(game))
  return tile
}

function paintPicture(
  picture: HTMLCanvasElement,
  size: { width: number; height: number },
  paint: (ctx: CanvasRenderingContext2D) => void
): void {
  picture.width = size.width
  picture.height = size.height
  const pictureCtx = picture.getContext('2d')
  if (pictureCtx) paint(pictureCtx)
}

function frame(now: number): void {
  const dt = Math.min(MAX_FRAME_SECONDS, (now - last) / 1000)
  last = now
  if (current) current.screen.frame(dt)
  else ctx.drawImage(view.room, 0, 0)
  requestAnimationFrame(frame)
}

function showCoins(): void {
  coins.textContent = String(wardrobe.coins)
}

// ----- Sheets: the shop and the settings -----

function sheetOpen(): boolean {
  return !shop.root.hidden || !settings.root.hidden
}

function openSheet(sheet: HTMLElement): void {
  lobby.root.hidden = true
  sheet.hidden = false
  if (sheet === shop.root) showShop()
  if (sheet === settings.root) showSettings()
  sheet.querySelector<HTMLButtonElement>('button')?.focus()
}

function closeSheets(): void {
  if (!sheetOpen()) return
  shop.root.hidden = true
  settings.root.hidden = true
  showLobby()
  stage.focus()
}

function showShop(): void {
  shop.coins.textContent = String(wardrobe.coins)
  for (const [name, tabButton] of Object.entries(shop.tabs)) {
    tabButton.setAttribute('aria-selected', String(name === tab))
  }
  const items: readonly (Coat | Accessory)[] = tab === 'coats' ? COATS : ACCESSORIES
  shop.items.replaceChildren(...items.map(itemCard))
}

function itemCard(item: Coat | Accessory): HTMLElement {
  const worn = isWorn(wardrobe, item.id)
  const owned = wardrobe.owned.includes(item.id)
  const box = document.createElement('div')
  box.className = worn ? 'item worn' : 'item'
  const preview = document.createElement('canvas')
  paintPicture(preview, PREVIEW, (picture) =>
    drawKitten(picture, CAT.walkA, tryOn(wardrobe, item.id), 2, HAT_ROOM, false)
  )
  const name = document.createElement('span')
  name.textContent = item.name
  const action = document.createElement('button')
  action.type = 'button'
  action.dataset.id = item.id
  if (!owned) {
    action.dataset.action = 'buy'
    action.textContent = `Buy · ${item.price}`
    action.disabled = wardrobe.coins < item.price
    if (action.disabled) action.title = `You need ${item.price - wardrobe.coins} more coins`
  } else if (worn) {
    action.dataset.action = 'slot' in item ? 'take-off' : ''
    action.textContent = 'slot' in item ? 'Take off' : 'Wearing'
    action.disabled = !('slot' in item)
  } else {
    action.dataset.action = 'wear'
    action.textContent = 'Wear'
  }
  box.append(preview, name, action)
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
  showCoins()
  shop.items.querySelector<HTMLButtonElement>(`button[data-id="${id}"]`)?.focus()
}

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

function keep(key: string, value: JsonValue): void {
  orca.storage.set(key, value).catch((error: unknown) => console.warn(`Kittens Arcade could not save ${key}`, error))
}

function keepWardrobe(): void {
  keep(STORE.wardrobe, wardrobe)
}

async function load(): Promise<Record<string, unknown>> {
  const keys = [STORE.sound, STORE.wardrobe, CATCHING_STORE, PAIRS_STORE, MAZE_STORE]
  try {
    const values = await Promise.all(keys.map((key) => orca.storage.get(key)))
    return Object.fromEntries(keys.map((key, index) => [key, values[index]]))
  } catch (error) {
    console.warn('Kittens Arcade could not read its storage', error)
    return {}
  }
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
  view.cssPerPixel = scale / ratio
  canvas.width = width
  canvas.height = height
  canvas.style.width = `${width * view.cssPerPixel}px`
  canvas.style.height = `${height * view.cssPerPixel}px`
  ctx.imageSmoothingEnabled = false
  stage.style.setProperty('--wall-height', `${WALL_HEIGHT * view.cssPerPixel}px`)
  if (width !== view.width || height !== view.height) {
    view.width = width
    view.height = height
    view.room = paintRoom(width, height)
  }
  for (const game of games) game.screen.resize()
}

arcade.hud.pause.addEventListener('click', () => current?.screen.pause())
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
  const target = (event.target as HTMLElement).closest<HTMLButtonElement>('button[data-id]')
  if (target?.dataset.id && target.dataset.action) shopAction(target.dataset.action, target.dataset.id)
})

window.addEventListener('keydown', (event) => {
  if (sheetOpen()) {
    if (event.code === 'Escape') closeSheets()
    return
  }
  if (event.code === 'KeyM') {
    sound.enabled = !sound.enabled
    keep(STORE.sound, sound.enabled)
    event.preventDefault()
    return
  }
  if (current?.screen.key(event)) event.preventDefault()
})

window.addEventListener('keyup', (event) => current?.screen.keyUp?.(event))

// Clicking into a terminal or anywhere outside the panel pauses, so typing never costs a run.
window.addEventListener('blur', () => current?.screen.blur())
document.addEventListener('visibilitychange', () => {
  if (document.hidden) current?.screen.blur()
})

async function start(): Promise<void> {
  new ResizeObserver(fit).observe(stage)
  fit()
  requestAnimationFrame(frame)
  const saved = await load()
  const storedSound = saved[STORE.sound]
  if (typeof storedSound === 'boolean') sound.enabled = storedSound
  wardrobe = parseWardrobe(saved[STORE.wardrobe])
  games = [
    {
      id: 'catching',
      name: 'Catching Kittens',
      line: 'Catch the mice before they get away.',
      paint: paintCatchingArt,
      screen: catchingScreen(arcade, saved[CATCHING_STORE])
    },
    {
      id: 'pairs',
      name: 'Kitten Pairs',
      line: 'Find the matching kittens, fast.',
      paint: paintPairsArt,
      screen: pairsScreen(arcade, saved[PAIRS_STORE])
    },
    {
      id: 'maze',
      name: 'Kitten Maze',
      line: 'Lead your kitten to its fish.',
      paint: paintMazeArt,
      screen: mazeScreen(arcade, saved[MAZE_STORE])
    }
  ]
  fit()
  showCoins()
  showLobby()
}

void start()
