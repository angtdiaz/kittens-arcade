import { assert, test } from 'orca/testing'
import { buy, buyTreat, earn, giveTreat, newWardrobe, parseWardrobe, place, removeFrom, spotOf, takeOff, wear } from './shop'

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

test('bought furniture goes to its spot, and a second picture to the other wall', () => {
  const wardrobe = newWardrobe()
  earn(wardrobe, 500)
  buy(wardrobe, 'bed-basket')
  buy(wardrobe, 'picture-fish')
  buy(wardrobe, 'picture-yarn')
  assert.deepEqual(wardrobe.home.placed, { bed: 'bed-basket', wallLeft: 'picture-fish', wallRight: 'picture-yarn' })
  buy(wardrobe, 'picture-paw')
  assert.equal(wardrobe.home.placed.wallLeft, 'picture-paw', 'Expected a third picture to take the first wall')
  buy(wardrobe, 'bed-royal')
  assert.equal(wardrobe.home.placed.bed, 'bed-royal')
})

test('each spot holds one thing, only what was bought, and a picture can change walls', () => {
  const wardrobe = newWardrobe()
  earn(wardrobe, 500)
  assert.ok(!place(wardrobe, 'toy-yarn'), 'Expected a toy nobody bought to stay in the shop')
  buy(wardrobe, 'picture-fish')
  assert.ok(!place(wardrobe, 'picture-fish', 'bed'), 'Expected a picture to stay off the bed spot')
  place(wardrobe, 'picture-fish', 'wallRight')
  assert.deepEqual(wardrobe.home.placed, { wallRight: 'picture-fish' })
  buy(wardrobe, 'picture-yarn')
  place(wardrobe, 'picture-fish', 'wallLeft')
  assert.deepEqual(wardrobe.home.placed, { wallLeft: 'picture-fish', wallRight: 'picture-yarn' }, 'Expected the pictures to swap walls')
  place(wardrobe, 'picture-yarn', 'wallLeft')
  assert.deepEqual(wardrobe.home.placed, { wallLeft: 'picture-yarn', wallRight: 'picture-fish' })
  removeFrom(wardrobe, 'wallLeft')
  assert.equal(spotOf(wardrobe, 'picture-fish'), 'wallRight')
  removeFrom(wardrobe, 'wallRight')
  assert.equal(spotOf(wardrobe, 'picture-fish'), null)
})

test('treats cost five coins each and are gone once eaten', () => {
  const wardrobe = newWardrobe()
  earn(wardrobe, 7)
  assert.ok(buyTreat(wardrobe), 'Expected a treat for five coins')
  assert.ok(!buyTreat(wardrobe), 'Expected no treat with two coins left')
  assert.equal(wardrobe.coins, 2)
  assert.ok(giveTreat(wardrobe), 'Expected the treat to be given')
  assert.ok(!giveTreat(wardrobe), 'Expected an empty jar')
  assert.equal(wardrobe.home.treats, 0)
})

test('a stored home keeps only owned things in spots they fit', () => {
  const wardrobe = parseWardrobe({
    owned: ['bed-basket', 'picture-fish'],
    home: {
      placed: { bed: 'bed-basket', wallLeft: 'bed-basket', wallRight: 'picture-fish', toy: 'toy-yarn', attic: 'x' },
      treats: 3.9
    }
  })
  assert.deepEqual(wardrobe.home, { placed: { bed: 'bed-basket', wallRight: 'picture-fish' }, treats: 3 })
  assert.deepEqual(parseWardrobe({ coins: 5 }).home, { placed: {}, treats: 0 })
})
