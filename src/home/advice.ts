// What the home's treat button says, and the line above it that explains what is missing.

import type { Wardrobe } from '../shop'
import { FURNITURE, TREAT_PRICE, furnitureOf } from './catalog'

export type TreatAdvice = { button: string; hint: string | null }

const CHEAPEST_BOWL = Math.min(...FURNITURE.filter((item) => item.kind === 'bowl').map((item) => item.price))

export function treatAdvice(wardrobe: Wardrobe): TreatAdvice {
  const { coins, home } = wardrobe
  const empty = Object.keys(home.placed).length === 0
  const lines = empty ? ['Your kitten’s home is empty: get furniture in Shop → Home.'] : []
  if (!home.placed.bowl) {
    const ownsBowl = wardrobe.owned.some((id) => furnitureOf(id)?.kind === 'bowl')
    if (ownsBowl) return { button: 'Place your bowl', hint: [...lines, 'Put your bowl back in Shop → Home to give treats.'].join(' ') }
    lines.push(`To give treats, buy a bowl (${CHEAPEST_BOWL} coins) and treats (${TREAT_PRICE} each) in Shop → Home.`)
    lines.push(...shortOf(CHEAPEST_BOWL + TREAT_PRICE, coins))
    return { button: 'Get a bowl', hint: lines.join(' ') }
  }
  if (home.treats <= 0) {
    return { button: 'Buy treats', hint: [`Treats cost ${TREAT_PRICE} coins each, in Shop → Home.`, ...shortOf(TREAT_PRICE, coins)].join(' ') }
  }
  return { button: `Give a treat (${home.treats})`, hint: lines.length > 0 ? lines.join(' ') : null }
}

/** How many coins are still missing, as a line to show, or nothing. */
function shortOf(price: number, coins: number): string[] {
  const missing = price - coins
  if (missing <= 0) return []
  return [`You have ${coins} ${coins === 1 ? 'coin' : 'coins'}: play a game to earn ${missing} more.`]
}
