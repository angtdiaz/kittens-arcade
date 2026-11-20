// What a kitten can wear, what it costs, and the coins and clothes the player has. Coins are
// earned only by playing: one for each mouse, five for a golden one.

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

export type Wardrobe = Look & { coins: number; owned: string[] }

export type Purchase = { ok: true } | { ok: false; reason: 'unknown' | 'owned' | 'coins' }

const FREE = COATS.filter((coat) => coat.price === 0).map((coat) => coat.id)

export function newWardrobe(): Wardrobe {
  return { coins: 0, owned: [...FREE], coat: FREE[0] ?? 'tabby', head: null, neck: null, face: null }
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
  return wardrobe
}

export function earn(wardrobe: Wardrobe, coins: number): void {
  wardrobe.coins += Math.max(0, Math.floor(coins))
}

/** Buys an item and puts it on. */
export function buy(wardrobe: Wardrobe, id: string): Purchase {
  const item = itemOf(id)
  if (!item) return { ok: false, reason: 'unknown' }
  if (wardrobe.owned.includes(id)) return { ok: false, reason: 'owned' }
  if (wardrobe.coins < item.price) return { ok: false, reason: 'coins' }
  wardrobe.coins -= item.price
  wardrobe.owned.push(id)
  wear(wardrobe, id)
  return { ok: true }
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

function itemOf(id: string): Coat | Accessory | null {
  return coatOf(id) ?? accessoryOf(id)
}
