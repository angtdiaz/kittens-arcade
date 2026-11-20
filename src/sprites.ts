// Pixel art drawn from text: each character is one pixel, '.' is empty, and the palette names
// the colour of every other character. Every sprite faces right; the renderer flips it.

export type Sprite = readonly string[]
export type Palette = Readonly<Record<string, string>>

const CAT_HEAD: Sprite = [
  '..o......o....o.',
  '.o.......oo..oo.',
  '.o.......oooooo.',
  '.o.......okooko.',
  '..oooooooowppwo.',
  '..oodoodoowwwwo.',
  '..oodoodoowwo...',
  '...ooooooooo....'
]

export const CAT = {
  walkA: [...CAT_HEAD, '...o.o...o.o....', '...w.w...w.w....'],
  walkB: [...CAT_HEAD, '....o.o.o.o.....', '....w.w.w.w.....'],
  pounce: [...CAT_HEAD, '..oo.......oo...', '.ww.........ww..']
} as const satisfies Record<string, Sprite>

export const MOUSE = {
  runA: ['......gpg...', '...ggggggg..', '..gggggggkg.', '.pgggggggggn', 'p..gwwwwwg..', '...p...p....'],
  runB: ['......gpg...', '...ggggggg..', '..gggggggkg.', '.pgggggggggn', 'p..gwwwwwg..', '....p.p.....']
} as const satisfies Record<string, Sprite>

export const PALETTES = {
  mouse: { g: '#c9c6da', w: '#e8e6f2', p: '#ff9fb2', n: '#ff7a93', k: '#1b1b2b' },
  golden: { g: '#ffd166', w: '#fff1c1', p: '#f7a541', n: '#ff9fb2', k: '#5a3a00' }
} as const satisfies Record<string, Palette>

export function spriteWidth(sprite: Sprite): number {
  return sprite[0]?.length ?? 0
}

/** Draws `sprite` with its top-left corner at (x, y), mirrored when `flip` is true. */
export function drawSprite(
  ctx: CanvasRenderingContext2D,
  sprite: Sprite,
  palette: Palette,
  x: number,
  y: number,
  flip = false
): void {
  const width = spriteWidth(sprite)
  sprite.forEach((row, dy) => {
    for (let dx = 0; dx < row.length; dx += 1) {
      const colour = palette[row[dx]]
      if (!colour) continue
      ctx.fillStyle = colour
      ctx.fillRect(Math.round(x + (flip ? width - 1 - dx : dx)), Math.round(y + dy), 1, 1)
    }
  })
}

// A 3×5 font with only what the floating points need.
const GLYPHS: Record<string, Sprite> = {
  '+': ['...', '.#.', '###', '.#.', '...'],
  '1': ['.#.', '##.', '.#.', '.#.', '###'],
  '5': ['###', '#..', '##.', '..#', '##.']
}

export function drawText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, colour: string): void {
  ;[...text].forEach((char, index) => {
    const glyph = GLYPHS[char]
    if (glyph) drawSprite(ctx, glyph, { '#': colour }, x + index * 4, y)
  })
}
