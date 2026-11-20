import { assert, test } from 'orca/testing'
import { buy, buyTreat, earn, newWardrobe, removeFrom } from '../shop'
import { treatAdvice } from './advice'

test('with no bowl, the home says what to buy and how many coins are missing', () => {
  const wardrobe = newWardrobe()
  earn(wardrobe, 14)
  const advice = treatAdvice(wardrobe)
  assert.equal(advice.button, 'Get a bowl')
  assert.match(advice.hint ?? '', /buy a bowl \(15 coins\) and treats \(5 each\) in Shop → Home/)
  assert.match(advice.hint ?? '', /You have 14 coins: play a game to earn 6 more/)
  assert.match(advice.hint ?? '', /home is empty/)
})

test('a bowl taken off the floor is put back, not bought again', () => {
  const wardrobe = newWardrobe()
  earn(wardrobe, 15)
  buy(wardrobe, 'bowl-blue')
  removeFrom(wardrobe, 'bowl')
  assert.equal(treatAdvice(wardrobe).button, 'Place your bowl')
})

test('with a bowl and no treats it asks for treats, then counts them', () => {
  const wardrobe = newWardrobe()
  earn(wardrobe, 18)
  buy(wardrobe, 'bowl-pink')
  let advice = treatAdvice(wardrobe)
  assert.equal(advice.button, 'Buy treats')
  assert.match(advice.hint ?? '', /You have 3 coins: play a game to earn 2 more/)
  earn(wardrobe, 7)
  buyTreat(wardrobe)
  buyTreat(wardrobe)
  advice = treatAdvice(wardrobe)
  assert.equal(advice.button, 'Give a treat (2)')
  assert.equal(advice.hint, null)
})
