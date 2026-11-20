import { assert, test } from 'orca/testing'
import { elapsed, newStopwatch, pause, resume, tick } from './stopwatch'

test('pausing before the first move leaves the clock waiting for it', () => {
  const watch = newStopwatch()
  pause(watch, 1000)
  resume(watch, 5000)
  assert.equal(watch.started, false, 'Expected resuming an unstarted level not to start its clock')
  assert.equal(elapsed(watch, 9000), 0)
  assert.ok(tick(watch, 9000), 'Expected the first move after the pause to count')
  assert.equal(elapsed(watch, 9500), 500)
})
