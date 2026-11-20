// How each coat and accessory from the shop is drawn on the kitten. Accessories are placed on the
// kitten's 16-pixel-wide sprite facing right, and flipped with it.

import { SLOTS, type Look } from './shop'
import { CAT, drawSprite, spriteWidth, type Palette, type Sprite } from './sprites'

type CoatLook = { palette: Palette; layer?: Sprite; layerPalette?: Palette }
type AccessoryLook = { rows: Sprite; palette: Palette; dx: number; dy: number }

const CAT_WIDTH = spriteWidth(CAT.walkA)

const COAT_LOOKS: Record<string, CoatLook> = {
  tabby: { palette: { o: '#f4a259', d: '#c8712f', w: '#fff4e6', p: '#ff8fa3', k: '#2b2118' } },
  gray: { palette: { o: '#9d9cab', d: '#74738a', w: '#f2f2f5', p: '#ff8fa3', k: '#1d1b26' } },
  black: { palette: { o: '#26222e', d: '#3a3445', w: '#f2f2f5', p: '#ff8fa3', k: '#ffd166' } },
  white: { palette: { o: '#f4f1ec', d: '#e2dcd3', w: '#ffffff', p: '#ff8fa3', k: '#2b2118' } },
  siamese: {
    palette: { o: '#f1e4cf', d: '#f1e4cf', w: '#5b4033', p: '#c98b8b', k: '#3b7dd8' },
    layer: ['..b......b....b.', '.b.......bb..bb.', '.b..............', '.b..............'],
    layerPalette: { b: '#5b4033' }
  },
  calico: {
    palette: { o: '#f7f1e8', d: '#f7f1e8', w: '#ffffff', p: '#ff8fa3', k: '#2b2118' },
    layer: [
      '..y...........b.',
      '.y...........bb.',
      '.y...........bb.',
      '..............b.',
      '...bbb..........',
      '...bbb.yy.......',
      '.......yyy......'
    ],
    layerPalette: { b: '#2f2a3a', y: '#f4a259' }
  }
}

const ACCESSORY_LOOKS: Record<string, AccessoryLook> = {
  bow: { rows: ['pp.pp', '.pkp.', 'pp.pp'], palette: { p: '#ff6fa3', k: '#d94c84' }, dx: 10, dy: -2 },
  bell: { rows: ['r.', 'r.', 'r.', '.y'], palette: { r: '#e63946', y: '#ffd166' }, dx: 9, dy: 4 },
  party: {
    rows: ['..y..', '..r..', '.rbr.', '.brb.', 'rbrbr'],
    palette: { r: '#4cc9f0', b: '#f72585', y: '#ffd166' },
    dx: 10,
    dy: -4
  },
  shades: { rows: ['bggbgg'], palette: { b: '#111111', g: '#1d3557' }, dx: 9, dy: 3 },
  crown: { rows: ['y.y.y', 'yyyyy', 'yyryy'], palette: { y: '#ffd166', r: '#ef476f' }, dx: 10, dy: -2 },
  wizard: {
    rows: ['....b..', '...bb..', '..bsb..', '..bbb..', '.bbbbb.', 'bbbbbbb'],
    palette: { b: '#5e4ae3', s: '#ffd166' },
    dx: 9,
    dy: -5
  }
}

/** How many pixels the tallest hat rises above the kitten's sprite. */
export const HAT_ROOM = 5

/** Draws the kitten in `pose` wearing `look`, its sprite's top-left corner at (x, y). */
export function drawKitten(
  ctx: CanvasRenderingContext2D,
  pose: Sprite,
  look: Look,
  x: number,
  y: number,
  flip: boolean
): void {
  const coat = COAT_LOOKS[look.coat] ?? COAT_LOOKS.tabby
  drawSprite(ctx, pose, coat.palette, x, y, flip)
  if (coat.layer && coat.layerPalette) drawSprite(ctx, coat.layer, coat.layerPalette, x, y, flip)
  for (const slot of SLOTS) {
    const id = look[slot]
    const accessory = id ? ACCESSORY_LOOKS[id] : undefined
    if (!accessory) continue
    const width = spriteWidth(accessory.rows)
    const ax = x + (flip ? CAT_WIDTH - accessory.dx - width : accessory.dx)
    drawSprite(ctx, accessory.rows, accessory.palette, ax, y + accessory.dy, flip)
  }
}
