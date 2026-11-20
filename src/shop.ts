// What a kitten can wear and have at home, what it costs, and the coins, clothes, furniture and
// treats the player has. Coins are earned only by playing.

import { SPOTS, SPOTS_OF, TREAT_PRICE, furnitureOf, type Furniture, type Spot } from './home/catalog'

export type Slot = 'head' | 'neck' | 'face'

export type Coat = { id: string; name: string; price: number }
export type Accessory = { id: string; name: string; price: number; slot: Slot }

export const COATS: readonly Coat[] = [
  { id: 'tabby', name: 'Orange Tabby', price: 0 },
  { id: 'gray', name: 'Gray', price: 30 },
  { id: 'black', name: 'Black', price: 40 },
  { id: 'white', name: 'Snow', price: 40 },
  { id: 'siamese', name: 'Siamese', price: 50 },
  { id: 'calico', name: 'Calico', price: 60 }
]

export const ACCESSORIES: readonly Accessory[] = [
  { id: 'bow', name: 'Pink Bow', price: 20, slot: 'head' },
  { id: 'bell', name: 'Bell Collar', price: 30, slot: 'neck' },
  { id: 'party', name: 'Party Hat', price: 45, slot: 'head' },
  { id: 'shades', name: 'Sunglasses', price: 60, slot: 'face' },
  { id: 'crown', name: 'Crown', price: 100, slot: 'head' },
  { id: 'wizard', name: 'Wizard Hat', price: 120, slot: 'head' }
]

export const SLOTS: readonly Slot[] = ['head', 'neck', 'face']

/** What the kitten has on: its coat and at most one accessory per slot. */
export type Look = { coat: string } & Record<Slot, string | null>

/** What stands in each spot of the kitten's home (by spot name), and the treats left. */
export type Home = { placed: Record<string, string>; treats: number }

export type Wardrobe = Look & { coins: number; owned: string[]; home: Home }

export type Purchase = { ok: true } | { ok: false; reason: 'unknown' | 'owned' | 'coins' }

const FREE = COATS.filter((coat) => coat.price === 0).map((coat) => coat.id)

export function newWardrobe(): Wardrobe {
  return {
    coins: 0,
    owned: [...FREE],
    coat: FREE[0] ?? 'tabby',
    head: null,
    neck: null,
    face: null,
    home: { placed: {}, treats: 0 }
  }
}

/** Reads what storage held, keeping only what still makes sense. */
export function parseWardrobe(value: unknown): Wardrobe {
  const wardrobe = newWardrobe()
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return wardrobe
  const stored = value as Record<string, unknown>
  if (typeof stored.coins === 'number' && Number.isFinite(stored.coins) && stored.coins > 0) {
    wardrobe.coins = Math.floor(stored.coins)
  }
  if (Array.isArray(stored.owned)) {
    const known = stored.owned.filter((id): id is string => typeof id === 'string' && itemOf(id) !== null)
    wardrobe.owned = [...new Set([...FREE, ...known])]
  }
  if (typeof stored.coat === 'string' && wardrobe.owned.includes(stored.coat) && coatOf(stored.coat)) {
    wardrobe.coat = stored.coat
  }
  for (const slot of SLOTS) {
    const id = stored[slot]
    if (typeof id === 'string' && wardrobe.owned.includes(id) && accessoryOf(id)?.slot === slot) wardrobe[slot] = id
  }
  wardrobe.home = parseHome(stored.home, wardrobe.owned)
  return wardrobe
}

function parseHome(value: unknown, owned: readonly string[]): Home {
  const home: Home = { placed: {}, treats: 0 }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return home
  const stored = value as Record<string, unknown>
  if (typeof stored.treats === 'number' && Number.isFinite(stored.treats) && stored.treats > 0) {
    home.treats = Math.floor(stored.treats)
  }
  const placed = stored.placed
  if (typeof placed !== 'object' || placed === null) return home
  for (const spot of SPOTS) {
    const id = (placed as Record<string, unknown>)[spot]
    const item = typeof id === 'string' ? furnitureOf(id) : null
    if (item && owned.includes(item.id) && SPOTS_OF[item.kind].includes(spot)) home.placed[spot] = item.id
  }
  return home
}

export function earn(wardrobe: Wardrobe, coins: number): void {
  wardrobe.coins += Math.max(0, Math.floor(coins))
}

/** Buys an item and puts it on, or in its place at home. */
export function buy(wardrobe: Wardrobe, id: string): Purchase {
  const item = itemOf(id)
  if (!item) return { ok: false, reason: 'unknown' }
  if (wardrobe.owned.includes(id)) return { ok: false, reason: 'owned' }
  if (wardrobe.coins < item.price) return { ok: false, reason: 'coins' }
  wardrobe.coins -= item.price
  wardrobe.owned.push(id)
  if (furnitureOf(id)) place(wardrobe, id)
  else wear(wardrobe, id)
  return { ok: true }
}

/** Puts a piece of furniture the player owns in `spot`, or in the first free spot of its kind (the
 *  first spot when all are taken). Moved from another spot, it swaps with what stood in the new one. */
export function place(wardrobe: Wardrobe, id: string, spot?: Spot): boolean {
  const item = furnitureOf(id)
  if (!item || !wardrobe.owned.includes(id)) return false
  const spots = SPOTS_OF[item.kind]
  const target = spot ?? spots.find((candidate) => !wardrobe.home.placed[candidate]) ?? spots[0]
  if (!spots.includes(target)) return false
  const from = spots.find((other) => wardrobe.home.placed[other] === id)
  const displaced = wardrobe.home.placed[target]
  if (from) delete wardrobe.home.placed[from]
  if (from && displaced && displaced !== id) wardrobe.home.placed[from] = displaced
  wardrobe.home.placed[target] = id
  return true
}

export function removeFrom(wardrobe: Wardrobe, spot: Spot): void {
  delete wardrobe.home.placed[spot]
}

/** Where a piece of furniture stands, or null. */
export function spotOf(wardrobe: Wardrobe, id: string): Spot | null {
  return SPOTS.find((spot) => wardrobe.home.placed[spot] === id) ?? null
}

export function buyTreat(wardrobe: Wardrobe): boolean {
  if (wardrobe.coins < TREAT_PRICE) return false
  wardrobe.coins -= TREAT_PRICE
  wardrobe.home.treats += 1
  return true
}

/** Takes one treat out of the jar; false when it is empty. */
export function giveTreat(wardrobe: Wardrobe): boolean {
  if (wardrobe.home.treats <= 0) return false
  wardrobe.home.treats -= 1
  return true
}

/** Puts on an item the player owns, in place of whatever was in its slot. */
export function wear(wardrobe: Wardrobe, id: string): boolean {
  if (!wardrobe.owned.includes(id)) return false
  if (coatOf(id)) {
    wardrobe.coat = id
    return true
  }
  const accessory = accessoryOf(id)
  if (!accessory) return false
  wardrobe[accessory.slot] = id
  return true
}

export function takeOff(wardrobe: Wardrobe, id: string): void {
  for (const slot of SLOTS) if (wardrobe[slot] === id) wardrobe[slot] = null
}

export function isWorn(look: Look, id: string): boolean {
  return look.coat === id || SLOTS.some((slot) => look[slot] === id)
}

/** The look with one item tried on, for the shop's previews. */
export function tryOn(look: Look, id: string): Look {
  const accessory = accessoryOf(id)
  if (accessory) return { ...look, [accessory.slot]: id }
  return coatOf(id) ? { ...look, coat: id } : look
}

export function coatOf(id: string): Coat | null {
  return COATS.find((coat) => coat.id === id) ?? null
}

export function accessoryOf(id: string): Accessory | null {
  return ACCESSORIES.find((accessory) => accessory.id === id) ?? null
}

function itemOf(id: string): Coat | Accessory | Furniture | null {
  return coatOf(id) ?? accessoryOf(id) ?? furnitureOf(id)
}
