// The kitten's furniture in pixel art, drawn from text like the kitten itself. Rugs are drawn by
// code, since they stretch to the room.

import { MOUSE, drawSprite, spriteWidth, type Palette, type Sprite } from '../sprites'

type Art = { rows: Sprite; palette: Palette }

const MOON_WINDOW: Sprite = [
  'ffffffffffffffffffffff',
  'fnnnnnnnnnfnnnnnnnnnnf',
  'fnnsnnnnnnfnnnnnyynnnf',
  'fnnnnnnnnnfnnnnyyynnnf',
  'fnnnnnnsnnfnnnnyynnnnf',
  'fnnnnnnnnnfnnnnnnnnsnf',
  'fnsnnnnnnnfnnnnnnnnnnf',
  'ffffffffffffffffffffff',
  'fnnnnnnnnnfnnnnnnnnnnf',
  'fnnnnnsnnnfnnsnnnnnnnf',
  'fnnnnnnnnnfnnnnnnnnnnf',
  'ffffffffffffffffffffff',
  'bbbbbbbbbbbbbbbbbbbbbb'
]

/** The moon window with a curtain drawn over each side. */
const CURTAINED_WINDOW: Sprite = MOON_WINDOW.map((row, y) =>
  y === MOON_WINDOW.length - 1 ? row : `ccc${row.slice(3, -3)}ccc`
)

const WINDOW_PALETTE: Palette = { f: '#8a6a4a', n: '#1d3557', y: '#ffd166', s: '#ffffff', b: '#a0805f', c: '#d97aa5' }

const BOWL: Sprite = ['..........', 'bbbbbbbbbb', 'bhbbbbbbbb', '.bbbbbbbb.', '..bbbbbb..']
/** Heaped with treats, a row taller than the empty bowl. */
const FULL_BOWL: Sprite = ['..kkkkkk..', '.kkkkkkkk.', ...BOWL.slice(1)]

const ART: Record<string, Art> = {
  'picture-fish': {
    rows: [
      'ffffffffffff',
      'fbbbbbbbbbbf',
      'fbbbbbbbbbbf',
      'fbboooobbobf',
      'fbookoooooof',
      'fbboooobbobf',
      'fbbbbbbbbbbf',
      'fwbwbwbwbwbf',
      'fbbbbbbbbbbf',
      'ffffffffffff'
    ],
    palette: { f: '#b9812f', b: '#1d3557', o: '#f4a259', k: '#1b1b2b', w: '#4cc9f0' }
  },
  'picture-yarn': {
    rows: [
      'ffffffffffff',
      'fccccccccccf',
      'fcccpppccccf',
      'fccpplppcccf',
      'fccppplpcccf',
      'fccplpppcccf',
      'fcccpppcclcf',
      'fccccccclccf',
      'fccccccccccf',
      'ffffffffffff'
    ],
    palette: { f: '#7a5a8f', c: '#f7f1e8', p: '#ff6fa3', l: '#d94c84' }
  },
  'picture-paw': {
    rows: [
      'ffffffffffff',
      'fmmmmmmmmmmf',
      'fmmmpmmpmmmf',
      'fmmpmmmmpmmf',
      'fmmmmppmmmmf',
      'fmmmppppmmmf',
      'fmmmppppmmmf',
      'fmmmmmmmmmmf',
      'fmmmmmmmmmmf',
      'ffffffffffff'
    ],
    palette: { f: '#5a3f6e', m: '#bde0c3', p: '#e07a5f' }
  },
  'picture-clock': {
    rows: [
      '..ffffff..',
      '.fwwwwwwf.',
      'fwwwwkwwwf',
      'fwwwwkwwwf',
      'fwwwwkkkwf',
      'fwwwwwwwwf',
      'fwwwwwwwwf',
      '.fwwwwwwf.',
      '..ffffff..'
    ],
    palette: { f: '#b9812f', w: '#fff4e6', k: '#2b2118' }
  },
  'window-moon': { rows: MOON_WINDOW, palette: WINDOW_PALETTE },
  'window-curtains': { rows: CURTAINED_WINDOW, palette: WINDOW_PALETTE },
  'bed-basket': {
    rows: [
      '.wwwwwwwwwwwwwwwwww.',
      'wwccccccccccccccccww',
      'wccccccccccccccccccw',
      'wccccccccccccccccccw',
      'wwwwwwwwwwwwwwwwwwww',
      'wvwvwvwvwvwvwvwvwvwv',
      'vwvwvwvwvwvwvwvwvwvw',
      '.wwwwwwwwwwwwwwwwww.'
    ],
    palette: { w: '#b07a3f', v: '#8a5a2b', c: '#f7c6d0' }
  },
  'bed-pillow': {
    rows: [
      '...pppppppppppppp...',
      '.ppllllllllllllllpp.',
      'ppllllllllllllllllpp',
      'pllllllllllllllllllp',
      'pllllllllllllllllllp',
      'ppllllllllllllllllpp',
      '.pppppppppppppppppp.'
    ],
    palette: { p: '#6a4c9c', l: '#9d7bd8' }
  },
  'bed-royal': {
    rows: [
      'y..................y',
      'yy................yy',
      'yrwwwrrrrrrrrrrrrrry',
      'yrwwwrrrrrrrrrrrrrry',
      'yrrrrrrrrrrrrrrrrrry',
      'yyyyyyyyyyyyyyyyyyyy',
      'y.y..............y.y'
    ],
    palette: { y: '#ffd166', r: '#c1121f', w: '#fff4e6' }
  },
  'bowl-blue': { rows: BOWL, palette: { b: '#3a86ff', h: '#8ecae6', k: '#b5835a' } },
  'bowl-pink': { rows: BOWL, palette: { b: '#ff6fa3', h: '#ffc2d4', k: '#b5835a' } },
  'bowl-gold': { rows: BOWL, palette: { b: '#ffd166', h: '#fff3b0', k: '#b5835a' } },
  'corner-plant': {
    rows: [
      '....g.....',
      '..g.gg.g..',
      '.gggggggg.',
      'gggg.gggg.',
      '.gggggggg.',
      '..gg.ggg..',
      '....g.....',
      '....g.....',
      '.pppppppp.',
      '..pppppp..',
      '..pqqqqp..',
      '..pppppp..',
      '...pppp...'
    ],
    palette: { g: '#52b788', p: '#c8712f', q: '#e09f5f' }
  },
  'corner-lamp': {
    rows: [
      '.yyyyyy.',
      'yyyyyyyy',
      'ylllllly',
      'yyyyyyyy',
      '...ss...',
      '...ss...',
      '...ss...',
      '...ss...',
      '...ss...',
      '...ss...',
      '...ss...',
      '...ss...',
      '..ssss..',
      '.ssssss.'
    ],
    palette: { y: '#f6bd60', l: '#fff3b0', s: '#7a5a8f' }
  },
  'scratcher-post': {
    rows: [
      '.tttttt.',
      'tttttttt',
      '..rrrr..',
      '..ssss..',
      '..rrrr..',
      '..ssss..',
      '..rrrr..',
      '..ssss..',
      '..rrrr..',
      '..ssss..',
      '..rrrr..',
      '..ssss..',
      '..rrrr..',
      'bbbbbbbb',
      'bbbbbbbb'
    ],
    palette: { t: '#9d7bd8', r: '#d4a373', s: '#b5835a', b: '#6a4c9c' }
  },
  'scratcher-tower': {
    rows: [
      '...tttttttt...',
      '...tttttttt...',
      '.....rr.......',
      '.....rr.......',
      '.....rr.......',
      '.....rr.......',
      '.....rr.......',
      'tttttttt......',
      'tttttttt......',
      '..rr..........',
      '..rr..........',
      '..rr..........',
      '..rr..........',
      '..rr..........',
      '......tttttttt',
      '......tttttttt',
      '.........rr...',
      '.........rr...',
      '.........rr...',
      '.........rr...',
      '.........rr...',
      'bbbbbbbbbbbbbb',
      'bbbbbbbbbbbbbb'
    ],
    palette: { t: '#9d7bd8', r: '#d4a373', b: '#6a4c9c' }
  },
  'toy-mouse': { rows: MOUSE.runA, palette: { g: '#8d99ae', w: '#d9dde4', p: '#ff9fb2', n: '#ff7a93', k: '#1b1b2b' } },
  'toy-yarn': {
    rows: ['..ppp..', '.plppp.', 'ppplppp', 'pplpppp', 'pppplpp', '.ppplp.', '..ppp.l'],
    palette: { p: '#ff6fa3', l: '#d94c84' }
  },
  treats: {
    rows: ['.ttttt.', '..ggg..', '.ggggg.', 'gkgggkg', 'ggkgkgg', 'gkggggg', 'ggggggg', '.ggggg.'],
    palette: { t: '#c8712f', g: '#a8dadc', k: '#b5835a' }
  }
}

const RUGS: Record<string, { base: string; edge: string; dot: string; stripes?: boolean }> = {
  'rug-blue': { base: '#2f5d8a', edge: '#4a7fb5', dot: '#a8dadc' },
  'rug-pink': { base: '#b5527f', edge: '#d97aa5', dot: '#ffd6e5' },
  'rug-striped': { base: '#7a5a8f', edge: '#e0a96d', dot: '#e0a96d', stripes: true }
}

/** The size of a piece in room pixels; rugs take the size they are drawn at. */
export function sizeOf(id: string): { width: number; height: number } {
  const art = ART[id]
  return art ? { width: spriteWidth(art.rows), height: art.rows.length } : { width: 0, height: 0 }
}

/** Draws a piece with its top-left corner at (x, y). A bowl can be drawn with food in it. */
export function drawFurniture(ctx: CanvasRenderingContext2D, id: string, x: number, y: number, full = false): void {
  const art = ART[id]
  if (!art) return
  const heaped = full && id.startsWith('bowl-')
  drawSprite(ctx, heaped ? FULL_BOWL : art.rows, art.palette, Math.round(x), Math.round(y) - (heaped ? 1 : 0))
}

export function drawRug(ctx: CanvasRenderingContext2D, id: string, x: number, y: number, width: number, height: number): void {
  const rug = RUGS[id]
  if (!rug || width < 8 || height < 6) return
  ctx.fillStyle = rug.edge
  ctx.fillRect(x + 1, y, width - 2, height)
  ctx.fillRect(x, y + 1, width, height - 2)
  ctx.fillStyle = rug.base
  ctx.fillRect(x + 2, y + 2, width - 4, height - 4)
  ctx.fillStyle = rug.dot
  if (rug.stripes) {
    for (let stripe = y + 4; stripe < y + height - 3; stripe += 4) ctx.fillRect(x + 2, stripe, width - 4, 2)
    return
  }
  for (let dx = 4; dx < width - 4; dx += 4) {
    ctx.fillRect(x + dx, y + 3, 1, 1)
    ctx.fillRect(x + dx, y + height - 4, 1, 1)
  }
}

/** A piece drawn as large as fits, centred in a square `room` pixels wide: the shop's picture of it. */
export function drawPreview(ctx: CanvasRenderingContext2D, id: string, room: number): void {
  if (RUGS[id]) {
    drawRug(ctx, id, 2, Math.floor(room / 2) - 7, room - 4, 14)
    return
  }
  const art = ART[id]
  if (!art) return
  const width = spriteWidth(art.rows)
  const scale = Math.max(1, Math.floor((room - 2) / Math.max(width, art.rows.length)))
  const left = Math.floor((room - width * scale) / 2)
  const top = Math.floor((room - art.rows.length * scale) / 2)
  drawSprite(ctx, art.rows, art.palette, left, top, false, scale)
}
