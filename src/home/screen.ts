import { element, type Arcade, type GameScreen } from '../arcade'
import { floorOf } from '../catching/engine'
import { paintRoom } from '../catching/render'
import { drawKitten } from '../looks'
import { giveTreat } from '../shop'
import { CAT, drawText, spriteWidth } from '../sprites'
import { treatAdvice } from './advice'
import { drawFurniture, drawRug, sizeOf } from './art'
import type { Spot } from './catalog'

type Point = { x: number; y: number }
type Activity = 'idle' | 'walk' | 'nap' | 'play' | 'eat'
/** Where the kitten is (its feet), what it does, and for how long more. */
type Kitten = Point & { facing: 1 | -1; stride: number; activity: Activity; left: number; goal: Point | null; then: Activity }
type Floater = Point & { text: string; colour: string; age: number }

const KITTEN = { speed: 28, near: 1.5, petReach: 10 }
const TIMES = { idle: [1.5, 4], nap: [6, 12], play: [3, 4], eat: [2.5, 2.5] } as const
const FLOATER_LIFE = 1.4
const COLOURS = { heart: '#ff6fa3', sleep: '#ffffff', shadow: 'rgba(0, 0, 0, 0.28)' } as const

/** Where each spot's piece stands, by its top-left corner, in a room `width` × `height`. */
function anchor(spot: Spot, id: string, width: number, height: number): Point & { width: number; height: number } {
  const floor = floorOf(width, height)
  const tall = floor.bottom - floor.top
  const size = spot === 'rug' ? rugSize(width, height) : sizeOf(id)
  const at = (x: number, y: number) => ({ x: Math.round(x), y: Math.round(y), ...size })
  switch (spot) {
    case 'wallLeft':
      return at(width * 0.2 - size.width / 2, 5)
    case 'wallRight':
      return at(width * 0.78 - size.width / 2, 5)
    case 'window':
      return at(width / 2 - size.width / 2, 3)
    case 'bed':
      return at(floor.left + 4, floor.top + 6)
    case 'corner':
      return at(floor.right - size.width - 3, floor.top + 2)
    case 'scratcher':
      return at(floor.right - size.width - 4, floor.top + tall * 0.42)
    case 'rug':
      return at(width / 2 - size.width / 2, floor.top + tall * 0.45)
    case 'bowl':
      return at(floor.left + 6, floor.bottom - tall * 0.2)
    case 'toy':
      return at(width / 2 + 14, floor.top + tall * 0.7)
  }
}

function rugSize(width: number, height: number): { width: number; height: number } {
  const floor = floorOf(width, height)
  return { width: Math.round((floor.right - floor.left) * 0.55), height: Math.round((floor.bottom - floor.top) * 0.22) }
}

export function homeScreen(arcade: Arcade): GameScreen {
  const { view, hud, sound } = arcade
  const bar = { root: element('home-bar'), hint: element('home-hint'), treat: element<HTMLButtonElement>('home-treat') }
  let room = paintRoom(view.width, view.height, false)
  let kitten: Kitten = fresh()
  let floaters: Floater[] = []
  let sleepTick = 0
  let active = false

  function fresh(): Kitten {
    const floor = floorOf(view.width, view.height)
    return {
      x: Math.round((floor.left + floor.right) / 2),
      y: Math.round(floor.top + (floor.bottom - floor.top) * 0.4),
      facing: 1,
      stride: 0,
      activity: 'idle',
      left: 1,
      goal: null,
      then: 'idle'
    }
  }

  function placed(spot: Spot): string | null {
    return arcade.wardrobe().home.placed[spot] ?? null
  }

  /** The point the kitten walks to for a spot: in front of the piece, or on the bed. */
  function standAt(spot: Spot): Point | null {
    const id = placed(spot)
    if (!id) return null
    const where = anchor(spot, id, view.width, view.height)
    if (spot === 'bed') return { x: where.x + where.width / 2, y: where.y + where.height - 1 }
    if (spot === 'bowl') return { x: where.x + where.width + 8, y: where.y + where.height }
    return { x: where.x - 6, y: where.y + where.height }
  }

  function randomPoint(): Point {
    const floor = floorOf(view.width, view.height)
    return {
      x: floor.left + 10 + Math.random() * (floor.right - floor.left - 20),
      y: floor.top + 12 + Math.random() * (floor.bottom - floor.top - 40)
    }
  }

  function goTo(goal: Point, then: Activity): void {
    kitten.goal = goal
    kitten.then = then
    kitten.activity = 'walk'
  }

  function settle(activity: Activity): void {
    kitten.goal = null
    kitten.activity = activity
    const [least, most] = activity === 'walk' ? TIMES.idle : TIMES[activity]
    kitten.left = least + Math.random() * (most - least)
    if (activity === 'eat') {
      sound.play('catch')
      hearts(2)
    }
  }

  /** What the kitten does when it has nothing to do: wander, nap on its bed or play with its toy. */
  function choose(): void {
    const roll = Math.random()
    const bed = standAt('bed')
    const toy = standAt('toy')
    if (bed && roll < 0.2) goTo(bed, 'nap')
    else if (toy && roll < 0.4) goTo(toy, 'play')
    else if (roll < 0.85) goTo(randomPoint(), 'idle')
    else settle('idle')
  }

  function update(dt: number): void {
    if (kitten.activity === 'walk' && kitten.goal) {
      const dx = kitten.goal.x - kitten.x
      const dy = kitten.goal.y - kitten.y
      const distance = Math.hypot(dx, dy)
      if (distance < KITTEN.near) {
        if (kitten.then === 'eat' || kitten.then === 'play') {
          kitten.facing = kitten.then === 'eat' ? -1 : 1
        }
        settle(kitten.then)
        return
      }
      const step = Math.min(distance, KITTEN.speed * dt)
      kitten.x += (dx / distance) * step
      kitten.y += (dy / distance) * step
      kitten.stride += step
      if (Math.abs(dx) > 0.5) kitten.facing = dx > 0 ? 1 : -1
      return
    }
    kitten.left -= dt
    if (kitten.activity === 'nap') {
      sleepTick -= dt
      if (sleepTick <= 0) {
        sleepTick = 1.2
        float('Z', COLOURS.sleep, kitten.x + 4, kitten.y - 8)
      }
    }
    if (kitten.left > 0) return
    if (kitten.activity === 'eat') {
      hearts(3)
      sound.play('golden')
    }
    choose()
  }

  function float(text: string, colour: string, x: number, y: number): void {
    floaters.push({ text, colour, x, y, age: 0 })
  }

  function hearts(count: number): void {
    for (let i = 0; i < count; i += 1) {
      float('♥', COLOURS.heart, kitten.x - 6 + i * 6, kitten.y - 12 - i * 2)
    }
  }

  function draw(): void {
    const { ctx, width, height } = view
    ctx.drawImage(room, 0, 0)
    const rug = placed('rug')
    if (rug) {
      const where = anchor('rug', rug, width, height)
      drawRug(ctx, rug, where.x, where.y, where.width, where.height)
    }
    for (const spot of ['wallLeft', 'wallRight', 'window'] as const) {
      const id = placed(spot)
      if (!id) continue
      const where = anchor(spot, id, width, height)
      drawFurniture(ctx, id, where.x, where.y)
    }
    const standing = (['bed', 'corner', 'scratcher', 'bowl', 'toy'] as const).flatMap((spot) => {
      const id = placed(spot)
      if (!id) return []
      const where = anchor(spot, id, width, height)
      // The bed lies under the kitten that naps on it.
      const depth = spot === 'bed' ? where.y : where.y + where.height
      return [{ depth, draw: () => drawPiece(spot, id, where) }]
    })
    const actors = [...standing, { depth: kitten.y, draw: drawCat }].sort((a, b) => a.depth - b.depth)
    for (const actor of actors) actor.draw()
    for (const floater of floaters) {
      const rise = Math.round(floater.age * 10)
      drawText(ctx, floater.text, Math.round(floater.x), Math.round(floater.y) - rise, floater.colour)
    }
  }

  function drawPiece(spot: Spot, id: string, where: Point): void {
    const wobble = spot === 'toy' && kitten.activity === 'play' ? Math.round(Math.sin(performance.now() / 90) * 2) : 0
    drawFurniture(view.ctx, id, where.x + wobble, where.y, spot === 'bowl' && kitten.activity === 'eat')
  }

  function drawCat(): void {
    const { ctx } = view
    const napping = kitten.activity === 'nap'
    const walking = kitten.activity === 'walk'
    const pose = napping ? CAT.loaf : walking && Math.floor(kitten.stride / 5) % 2 === 1 ? CAT.walkB : CAT.walkA
    const beat = Math.floor(performance.now() / 250) % 2 === 0
    // A hop while it plays, a nod into the bowl while it eats.
    const hop = kitten.activity === 'play' && beat ? 2 : kitten.activity === 'eat' && beat ? -1 : 0
    const x = Math.round(kitten.x) - Math.floor(spriteWidth(pose) / 2)
    const y = Math.round(kitten.y) - pose.length - hop
    ctx.fillStyle = COLOURS.shadow
    ctx.fillRect(Math.round(kitten.x) - 6, Math.round(kitten.y), 12, 2)
    drawKitten(ctx, pose, arcade.look(), x, y, kitten.facing < 0)
  }

  function showBar(): void {
    const wardrobe = arcade.wardrobe()
    const advice = treatAdvice(wardrobe)
    bar.treat.textContent = advice.button
    bar.hint.hidden = advice.hint === null
    bar.hint.textContent = advice.hint ?? ''
    hud.left.textContent = ''
    hud.center.textContent = ''
    hud.note.textContent = `Treats ${wardrobe.home.treats}`
  }

  function treat(): void {
    const bowl = standAt('bowl')
    if (!bowl || arcade.wardrobe().home.treats <= 0) {
      arcade.openShop('home')
      return
    }
    if (kitten.activity === 'eat' || (kitten.activity === 'walk' && kitten.then === 'eat')) return
    giveTreat(arcade.wardrobe())
    arcade.saveWardrobe()
    sound.play('flip')
    goTo(bowl, 'eat')
    showBar()
  }

  function pet(event: PointerEvent): void {
    const rect = view.canvas.getBoundingClientRect()
    const x = (event.clientX - rect.left) / view.cssPerPixel
    const y = (event.clientY - rect.top) / view.cssPerPixel
    if (Math.hypot(x - kitten.x, y - (kitten.y - 5)) > KITTEN.petReach) return
    hearts(2)
    sound.play('catch')
    if (kitten.activity !== 'eat') settle('idle')
  }

  bar.treat.addEventListener('click', treat)
  element('home-shop').addEventListener('click', () => arcade.openShop('home'))
  element('home-arcade').addEventListener('click', () => arcade.home())
  view.canvas.addEventListener('pointerdown', (event) => {
    if (active) pet(event)
  })

  return {
    enter() {
      active = true
      room = paintRoom(view.width, view.height, false)
      kitten = fresh()
      floaters = []
      hud.pause.hidden = true
      bar.root.hidden = false
      showBar()
    },
    leave() {
      active = false
      bar.root.hidden = true
    },
    frame(dt) {
      if (!active) return
      update(dt)
      for (const floater of floaters) floater.age += dt
      floaters = floaters.filter((floater) => floater.age < FLOATER_LIFE)
      draw()
    },
    key(event) {
      if (event.code === 'Escape') {
        arcade.home()
        return true
      }
      return false
    },
    blur() {},
    pause() {},
    resize() {
      room = paintRoom(view.width, view.height, false)
      if (active) showBar()
    },
    summary() {
      return ''
    }
  }
}
