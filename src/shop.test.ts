import { assert, test } from 'orca/testing'
import { buy, earn, newWardrobe, parseWardrobe, takeOff, wear } from './shop'

test('an item cannot be bought without enough coins', () => {
  const wardrobe = newWardrobe()
  earn(wardrobe, 10)
  assert.deepEqual(buy(wardrobe, 'gray'), { ok: false, reason: 'coins' })
  assert.equal(wardrobe.coins, 10)
  assert.ok(!wardrobe.owned.includes('gray'), 'Expected the gray coat to stay in the shop')
})

test('buying takes the coins and puts the item on', () => {
  const wardrobe = newWardrobe()
  earn(wardrobe, 50)
  assert.deepEqual(buy(wardrobe, 'gray'), { ok: true })
  assert.deepEqual(buy(wardrobe, 'bow'), { ok: true })
  assert.equal(wardrobe.coins, 0)
  assert.equal(wardrobe.coat, 'gray')
  assert.equal(wardrobe.head, 'bow')
  assert.deepEqual(buy(wardrobe, 'bow'), { ok: false, reason: 'owned' })
})

test('only what was bought can be worn, one per slot', () => {
  const wardrobe = newWardrobe()
  assert.ok(!wear(wardrobe, 'crown'), 'Expected a crown nobody bought to stay off')
  earn(wardrobe, 200)
  buy(wardrobe, 'bow')
  buy(wardrobe, 'crown')
  buy(wardrobe, 'bell')
  assert.equal(wardrobe.head, 'crown')
  assert.equal(wardrobe.neck, 'bell')
  wear(wardrobe, 'bow')
  assert.equal(wardrobe.head, 'bow')
  takeOff(wardrobe, 'bow')
  assert.equal(wardrobe.head, null)
})

test('a stored wardrobe keeps only what still makes sense', () => {
  const wardrobe = parseWardrobe({
    coins: 12.7,
    owned: ['gray', 'bow', 'dragon', 3],
    coat: 'calico',
    head: 'bow',
    neck: 'bow',
    face: 'shades'
  })
  assert.equal(wardrobe.coins, 12)
  assert.deepEqual(wardrobe.owned, ['tabby', 'gray', 'bow'])
  assert.equal(wardrobe.coat, 'tabby')
  assert.equal(wardrobe.head, 'bow')
  assert.equal(wardrobe.neck, null)
  assert.equal(wardrobe.face, null)
  assert.deepEqual(parseWardrobe(null), newWardrobe())
})
