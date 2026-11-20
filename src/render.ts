import { RULES, floorOf, type Game, type Hole, type Mouse } from './engine'
import { drawKitten } from './looks'
import type { Look } from './shop'
import { CAT, MOUSE, PALETTES, drawSprite, drawText, spriteWidth } from './sprites'

/** The "+1" that floats up where a mouse was caught. */
export type Floater = { x: number; y: number; text: string; age: number; golden: boolean }

export const FLOATER_LIFE = 0.8

const ROOM = {
  plank: '#3a3456',
  plankAlt: '#3e385c',
  seam: '#2c2742',
  rug: '#5a3f6e',
  rugEdge: '#7a5a8f',
  rugDot: '#e0a96d',
  wallpaper: '#262140',
  stripe: '#2d2750',
  baseboard: '#463e6a',
  baseboardTop: '#5a5185',
  sideWall: '#221d3a',
  sideEdge: '#322b52',
  hole: '#0d0b17',
  shadow: 'rgba(0, 0, 0, 0.28)',
  eyes: '#ffffff',
  goldenEyes: '#ffd166',
  sparkle: '#fff7d6',
  points: '#ffffff',
  goldenPoints: '#ffd166'
} as const

const PLANK_HEIGHT = 7

/** The room without anyone in it, painted once per size. */
export function paintRoom(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas
  const floor = floorOf(width, height)
  paintFloor(ctx, width, height)
  paintRug(ctx, floor.left, floor.top, floor.right, floor.bottom)
  paintWalls(ctx, width, height)
  return canvas
}

export function drawScene(
  ctx: CanvasRenderingContext2D,
  room: HTMLCanvasElement,
  game: Game,
  floaters: readonly Floater[],
  look: Look
): void {
  ctx.drawImage(room, 0, 0)
  for (const hole of game.holes) paintHole(ctx, hole)
  for (const mouse of game.mice) if (mouse.peek > 0) drawPeek(ctx, mouse, game.holes[mouse.from])
  const actors = [
    ...game.mice.filter((mouse) => mouse.peek <= 0).map((mouse) => ({ y: mouse.y, draw: () => drawMouse(ctx, mouse) })),
    { y: game.cat.y, draw: () => drawCat(ctx, game, look) }
  ].sort((a, b) => a.y - b.y)
  for (const actor of actors) actor.draw()
  for (const floater of floaters) drawFloater(ctx, floater)
}

function paintFloor(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  for (let y = 0, row = 0; y < height; y += PLANK_HEIGHT, row += 1) {
    ctx.fillStyle = row % 2 === 0 ? ROOM.plank : ROOM.plankAlt
    ctx.fillRect(0, y, width, PLANK_HEIGHT)
    ctx.fillStyle = ROOM.seam
    ctx.fillRect(0, y + PLANK_HEIGHT - 1, width, 1)
    for (let x = (row * 29) % 67; x < width; x += 67) ctx.fillRect(x, y, 1, PLANK_HEIGHT - 1)
  }
}

function paintRug(ctx: CanvasRenderingContext2D, left: number, top: number, right: number, bottom: number): void {
  const insetX = Math.round((right - left) * 0.18)
  const insetY = Math.round((bottom - top) * 0.22)
  const x = left + insetX
  const y = top + insetY
  const w = right - left - insetX * 2
  const h = bottom - top - insetY * 2
  if (w < 12 || h < 12) return
  ctx.fillStyle = ROOM.rugEdge
  ctx.fillRect(x + 1, y, w - 2, h)
  ctx.fillRect(x, y + 1, w, h - 2)
  ctx.fillStyle = ROOM.rug
  ctx.fillRect(x + 2, y + 2, w - 4, h - 4)
  ctx.fillStyle = ROOM.rugDot
  for (let dx = 4; dx < w - 4; dx += 4) {
    ctx.fillRect(x + dx, y + 4, 1, 1)
    ctx.fillRect(x + dx, y + h - 5, 1, 1)
  }
  for (let dy = 8; dy < h - 6; dy += 4) {
    ctx.fillRect(x + 4, y + dy, 1, 1)
    ctx.fillRect(x + w - 5, y + dy, 1, 1)
  }
}

function paintWalls(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  const { top, side, bottom } = RULES.wall
  ctx.fillStyle = ROOM.wallpaper
  ctx.fillRect(0, 0, width, top)
  ctx.fillStyle = ROOM.stripe
  for (let x = 3; x < width; x += 6) ctx.fillRect(x, 0, 1, top - 4)
  ctx.fillStyle = ROOM.baseboard
  ctx.fillRect(0, top - 4, width, 4)
  ctx.fillStyle = ROOM.baseboardTop
  ctx.fillRect(0, top - 4, width, 1)
  ctx.fillStyle = ROOM.sideWall
  ctx.fillRect(0, top, side, height - top)
  ctx.fillRect(width - side, top, side, height - top)
  ctx.fillRect(0, height - bottom, width, bottom)
  ctx.fillStyle = ROOM.sideEdge
  ctx.fillRect(side - 1, top, 1, height - top - bottom)
  ctx.fillRect(width - side, top, 1, height - top - bottom)
  ctx.fillRect(side - 1, height - bottom, width - side * 2 + 2, 1)
}

function paintHole(ctx: CanvasRenderingContext2D, hole: Hole): void {
  ctx.fillStyle = ROOM.hole
  if (hole.side === 'top') {
    ctx.fillRect(hole.x - 4, hole.y - 4, 8, 4)
    ctx.fillRect(hole.x - 3, hole.y - 5, 6, 1)
  } else if (hole.side === 'bottom') {
    ctx.fillRect(hole.x - 4, hole.y, 8, 3)
    ctx.fillRect(hole.x - 3, hole.y + 3, 6, 1)
  } else {
    const x = hole.side === 'left' ? hole.x - 4 : hole.x
    ctx.fillRect(x, hole.y - 4, 4, 8)
    ctx.fillRect(hole.side === 'left' ? x + 4 : x - 1, hole.y - 3, 1, 6)
  }
}

/** A mouse about to come out: two eyes shining in the dark of its hole. */
function drawPeek(ctx: CanvasRenderingContext2D, mouse: Mouse, hole: Hole | undefined): void {
  if (!hole || Math.floor(mouse.age * 8) % 5 === 0) return
  ctx.fillStyle = mouse.golden ? ROOM.goldenEyes : ROOM.eyes
  const eyes: Record<Hole['side'], [number, number, number, number]> = {
    top: [hole.x - 2, hole.y - 3, hole.x + 1, hole.y - 3],
    bottom: [hole.x - 2, hole.y + 1, hole.x + 1, hole.y + 1],
    left: [hole.x - 3, hole.y, hole.x - 1, hole.y],
    right: [hole.x, hole.y, hole.x + 2, hole.y]
  }
  const [x1, y1, x2, y2] = eyes[hole.side]
  ctx.fillRect(x1, y1, 1, 1)
  ctx.fillRect(x2, y2, 1, 1)
}

function drawMouse(ctx: CanvasRenderingContext2D, mouse: Mouse): void {
  const sprite = Math.floor(mouse.age * 10) % 2 === 0 ? MOUSE.runA : MOUSE.runB
  const x = Math.round(mouse.x) - 6
  const y = Math.round(mouse.y) - 3
  ctx.fillStyle = ROOM.shadow
  ctx.fillRect(x + 3, y + 6, 7, 1)
  drawSprite(ctx, sprite, mouse.golden ? PALETTES.golden : PALETTES.mouse, x, y, mouse.facing < 0)
  if (mouse.golden && Math.floor(mouse.age * 6) % 3 === 0) {
    ctx.fillStyle = ROOM.sparkle
    ctx.fillRect(x + 2 + (Math.floor(mouse.age * 6) % 9), y - 2, 1, 1)
  }
}

function drawCat(ctx: CanvasRenderingContext2D, game: Game, look: Look): void {
  const { cat } = game
  const sprite = cat.pounce > 0 ? CAT.pounce : cat.moving && Math.floor(cat.stride / 5) % 2 === 1 ? CAT.walkB : CAT.walkA
  const x = Math.round(cat.x) - Math.floor(spriteWidth(sprite) / 2)
  const y = Math.round(cat.y) - 5 - (cat.pounce > 0 ? 2 : 0)
  ctx.fillStyle = ROOM.shadow
  ctx.fillRect(Math.round(cat.x) - 6, Math.round(cat.y) + 5, 12, 2)
  drawKitten(ctx, sprite, look, x, y, cat.facing < 0)
}

function drawFloater(ctx: CanvasRenderingContext2D, floater: Floater): void {
  const rise = Math.round(floater.age * 14)
  const colour = floater.golden ? ROOM.goldenPoints : ROOM.points
  drawText(ctx, floater.text, Math.round(floater.x) - 4, Math.round(floater.y) - 10 - rise, colour)
}
