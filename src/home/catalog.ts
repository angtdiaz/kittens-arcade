// What can go in the kitten's home and where. Each spot holds one thing at a time; the two pictures
// share the wall.

export type Kind = 'picture' | 'window' | 'bed' | 'rug' | 'bowl' | 'corner' | 'scratcher' | 'toy'
export type Spot = 'wallLeft' | 'wallRight' | 'window' | 'bed' | 'rug' | 'bowl' | 'corner' | 'scratcher' | 'toy'

export type Furniture = { id: string; name: string; price: number; kind: Kind }

/** The spots of each kind, in the order a new thing fills them. */
export const SPOTS_OF: Record<Kind, readonly Spot[]> = {
  picture: ['wallLeft', 'wallRight'],
  window: ['window'],
  bed: ['bed'],
  rug: ['rug'],
  bowl: ['bowl'],
  corner: ['corner'],
  scratcher: ['scratcher'],
  toy: ['toy']
}

export const KINDS: readonly { kind: Kind; name: string }[] = [
  { kind: 'picture', name: 'Pictures' },
  { kind: 'window', name: 'Windows' },
  { kind: 'bed', name: 'Beds' },
  { kind: 'rug', name: 'Rugs' },
  { kind: 'bowl', name: 'Bowls' },
  { kind: 'corner', name: 'Plants & lamps' },
  { kind: 'scratcher', name: 'Scratchers' },
  { kind: 'toy', name: 'Toys' }
]

export const FURNITURE: readonly Furniture[] = [
  { id: 'picture-fish', name: 'Fish Picture', price: 25, kind: 'picture' },
  { id: 'picture-yarn', name: 'Yarn Painting', price: 30, kind: 'picture' },
  { id: 'picture-paw', name: 'Paw Print', price: 35, kind: 'picture' },
  { id: 'picture-clock', name: 'Clock', price: 40, kind: 'picture' },
  { id: 'window-moon', name: 'Moon Window', price: 60, kind: 'window' },
  { id: 'window-curtains', name: 'Curtained Window', price: 80, kind: 'window' },
  { id: 'bed-basket', name: 'Basket Bed', price: 40, kind: 'bed' },
  { id: 'bed-pillow', name: 'Pillow Bed', price: 60, kind: 'bed' },
  { id: 'bed-royal', name: 'Royal Bed', price: 120, kind: 'bed' },
  { id: 'rug-blue', name: 'Blue Rug', price: 30, kind: 'rug' },
  { id: 'rug-pink', name: 'Pink Rug', price: 30, kind: 'rug' },
  { id: 'rug-striped', name: 'Striped Rug', price: 45, kind: 'rug' },
  { id: 'bowl-blue', name: 'Blue Bowl', price: 15, kind: 'bowl' },
  { id: 'bowl-pink', name: 'Pink Bowl', price: 15, kind: 'bowl' },
  { id: 'bowl-gold', name: 'Golden Bowl', price: 80, kind: 'bowl' },
  { id: 'corner-plant', name: 'Plant', price: 35, kind: 'corner' },
  { id: 'corner-lamp', name: 'Lamp', price: 45, kind: 'corner' },
  { id: 'scratcher-post', name: 'Scratching Post', price: 50, kind: 'scratcher' },
  { id: 'scratcher-tower', name: 'Cat Tower', price: 150, kind: 'scratcher' },
  { id: 'toy-mouse', name: 'Toy Mouse', price: 20, kind: 'toy' },
  { id: 'toy-yarn', name: 'Yarn Ball', price: 20, kind: 'toy' }
]

/** Treats are eaten, so they are bought one at a time and never owned for good. */
export const TREAT_PRICE = 5

export const SPOTS: readonly Spot[] = Object.values(SPOTS_OF).flat()

export function furnitureOf(id: string): Furniture | null {
  return FURNITURE.find((item) => item.id === id) ?? null
}
