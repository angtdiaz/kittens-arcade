// Levels played against the clock: which levels are open, and the three fastest times of each.

export const PODIUM = 3

export type Time = { ms: number; at: number }
export type Progress = { unlocked: number; records: Record<string, Time[]> }

export function newProgress(): Progress {
  return { unlocked: 1, records: {} }
}

/** Reads what storage held, keeping only what still makes sense for a game of `levels` levels. */
export function parseProgress(value: unknown, levels: number): Progress {
  const progress = newProgress()
  if (!isObject(value)) return progress
  if (typeof value.unlocked === 'number' && Number.isInteger(value.unlocked)) {
    progress.unlocked = Math.min(levels, Math.max(1, value.unlocked))
  }
  if (!isObject(value.records)) return progress
  for (let level = 1; level <= levels; level += 1) {
    const times = value.records[String(level)]
    if (!Array.isArray(times)) continue
    const valid = times.filter(
      (time): time is Time => isObject(time) && isPositive(time.ms) && isPositive(time.at)
    )
    if (valid.length > 0) progress.records[String(level)] = podium(valid)
  }
  return progress
}

export function canPlay(progress: Progress, level: number): boolean {
  return level >= 1 && level <= progress.unlocked
}

export function bestOf(progress: Progress, level: number): Time | null {
  return progress.records[String(level)]?.[0] ?? null
}

/** Records a finished level and opens the next one. Returns its place on the podium (1 to 3), or
 *  null when it was not fast enough. */
export function finishLevel(progress: Progress, level: number, ms: number, at: number, levels: number): number | null {
  progress.unlocked = Math.max(progress.unlocked, Math.min(levels, level + 1))
  const time: Time = { ms, at }
  const times = podium([...(progress.records[String(level)] ?? []), time])
  progress.records[String(level)] = times
  const place = times.indexOf(time)
  return place >= 0 ? place + 1 : null
}

function podium(times: Time[]): Time[] {
  return [...times].sort((a, b) => a.ms - b.ms || a.at - b.at).slice(0, PODIUM)
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isPositive(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}
