// What the arcade shares with each of its games: the room's canvas, the top bar, the kitten's
// look, the coins, the sound and storage.

import type { JsonValue } from 'orca'
import type { Look } from './shop'
import type { Sound } from './sound'

export type View = {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  /** The empty room, painted once per size. */
  room: HTMLCanvasElement
  width: number
  height: number
  /** CSS pixels per room pixel. */
  cssPerPixel: number
}

/** The bar on the room's wall: the pause button and big text on the left, something in the middle, a note
 *  under the coins. */
export type Hud = { pause: HTMLButtonElement; left: HTMLElement; center: HTMLElement; note: HTMLElement }

export type Arcade = {
  view: View
  hud: Hud
  sound: Sound
  look(): Look
  earn(coins: number): void
  keep(key: string, value: JsonValue): void
  home(): void
}

export type GameScreen = {
  /** Shows the game's own first screen. */
  enter(): void
  leave(): void
  frame(dt: number): void
  /** True when the game used the key. */
  key(event: KeyboardEvent): boolean
  keyUp?(event: KeyboardEvent): void
  /** Orca's window or another pane took the focus. */
  blur(): void
  /** The pause button was pressed. */
  pause(): void
  resize(): void
  /** One line for the game's tile in the arcade, such as the best score. */
  summary(): string
}

export function element<T extends HTMLElement = HTMLElement>(id: string): T {
  const found = document.getElementById(id) as T | null
  if (!found) throw new Error(`Kittens Arcade is missing #${id}`)
  return found
}

/** A line of text with an optional class, or an element ready to show. */
export type Line = readonly [string, string?] | HTMLElement

export function paragraphs(lines: readonly Line[]): HTMLElement[] {
  return lines.map((item) => {
    if (item instanceof HTMLElement) return item
    const [text, className] = item
    const line = document.createElement('p')
    line.textContent = text
    if (className) line.className = className
    return line
  })
}

/** One rule of a game: an icon, what it is about, and the rule itself. */
export type Rule = readonly [icon: string, label: string, text: string]

/** A game's rules, shown before it starts. */
export function howToPlay(rules: readonly Rule[]): HTMLElement {
  const list = document.createElement('dl')
  list.className = 'how'
  for (const [icon, label, text] of rules) {
    const term = document.createElement('dt')
    term.textContent = `${icon} ${label}`
    const detail = document.createElement('dd')
    detail.textContent = text
    list.append(term, detail)
  }
  return list
}

/** The same rules folded under "How to play", for the pause card. */
export function howToPlayFold(rules: readonly Rule[]): HTMLElement {
  const fold = document.createElement('details')
  fold.className = 'how-fold'
  const summary = document.createElement('summary')
  summary.textContent = 'How to play'
  fold.append(summary, howToPlay(rules))
  return fold
}

export function button(label: string, onClick: () => void, className?: string): HTMLButtonElement {
  const made = document.createElement('button')
  made.type = 'button'
  made.textContent = label
  if (className) made.className = className
  made.addEventListener('click', onClick)
  return made
}

/** 83 456 ms → "1:23.4". */
export function clock(ms: number): string {
  const tenths = Math.floor(ms / 100)
  const minutes = Math.floor(tenths / 600)
  const seconds = Math.floor((tenths % 600) / 10)
  return `${minutes}:${String(seconds).padStart(2, '0')}.${tenths % 10}`
}
