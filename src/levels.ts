// What the games played level by level against the clock show alike: the level buttons and the
// card of a finished level.

import { button, clock, type Line } from './arcade'
import { PODIUM, bestOf, canPlay, type Progress } from './progress'

export const PLACES = ['1st', '2nd', '3rd'] as const

/** One button per level: an open one says its size and best time, the rest are locked. */
export function levelButtons(
  progress: Progress,
  sizes: readonly string[],
  pick: (level: number) => void
): HTMLButtonElement[] {
  return sizes.map((size, index) => {
    const level = index + 1
    const best = bestOf(progress, level)
    const open = canPlay(progress, level)
    const choice = button(`Level ${level}`, () => pick(level), level === progress.unlocked ? 'primary' : '')
    choice.disabled = !open
    const detail = document.createElement('small')
    detail.textContent = open ? `${size}${best ? ` · ${clock(best.ms)}` : ''}` : 'Locked'
    choice.append(detail)
    return choice
  })
}

/** A finished level's time, the place it took, and the level's podium with that time lit up. */
export function resultLines(progress: Progress, level: number, ms: number, place: number | null): Line[] {
  const times = progress.records[String(level)] ?? []
  return [
    [clock(ms), 'big gold'],
    [place ? `New record: ${PLACES[place - 1]} place!` : `Not in the top ${PODIUM} this time.`, place ? 'gold' : 'soft'],
    ...times.map((time, index): Line => [`${PLACES[index]}  ${clock(time.ms)}`, index + 1 === place ? 'gold' : 'soft'])
  ]
}
