// The clock of a level played against time: it starts with the first move, stops while the game is
// paused and for good when the level is done. Every call says what time it is, in milliseconds.

export type Stopwatch = {
  spentMs: number
  runningSince: number | null
  started: boolean
  finished: boolean
}

export function newStopwatch(): Stopwatch {
  return { spentMs: 0, runningSince: null, started: false, finished: false }
}

/** Starts the clock on the first move. False when the move must wait: the game is paused or over. */
export function tick(watch: Stopwatch, now: number): boolean {
  if (watch.finished) return false
  if (!watch.started) {
    watch.started = true
    watch.runningSince = now
  }
  return watch.runningSince !== null
}

export function pause(watch: Stopwatch, now: number): void {
  if (watch.runningSince === null) return
  watch.spentMs += now - watch.runningSince
  watch.runningSince = null
}

export function resume(watch: Stopwatch, now: number): void {
  if (watch.started && !watch.finished && watch.runningSince === null) watch.runningSince = now
}

export function finish(watch: Stopwatch, now: number): void {
  pause(watch, now)
  watch.finished = true
}

export function isRunning(watch: Stopwatch): boolean {
  return watch.runningSince !== null
}

export function elapsed(watch: Stopwatch, now: number): number {
  return watch.spentMs + (watch.runningSince === null ? 0 : now - watch.runningSince)
}
