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

export function paragraphs(lines: readonly (readonly [string, string?])[]): HTMLElement[] {
  return lines.map(([text, className]) => {
    const line = document.createElement('p')
    line.textContent = text
    if (className) line.className = className
    return line
  })
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
