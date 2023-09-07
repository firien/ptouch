import test from 'node:test'
import assert from 'node:assert/strict'
import packBits from '../../src/pack-bits.js'

test('pack all same bytes', () => {
  const bytes = [4, 4, 4, 4, 4, 4]
  const packed = packBits(bytes)
  assert.deepEqual([-5, 4], packed)
})

test('pack al bytes', () => {
  const bytes = [4, 8, 4, 4, 4, 4, 4]
  const packed = packBits(bytes)
  assert.deepEqual([1, 4, 8, -4, 4], packed)
})

test('pack al bytes asdf', () => {
  const bytes = [4, 8, 4, 4, 12, 4, 4, 4, 2]
  const packed = packBits(bytes)
  assert.deepEqual([1, 4, 8, -1, 4, 0, 12, -2, 4, 0, 2], packed)
})

test('pack all different', () => {
  const bytes = [1, 2, 3, 4, 5, 6, 7]
  const packed = packBits(bytes)
  assert.deepEqual([6, 1, 2, 3, 4, 5, 6, 7], packed)
})

test('pack set 2', () => {
  const bytes = [0, 0, 0, 0, 0, 31, 255, 192, 127, 255, 255, 192, 0, 0, 0, 0]
  const packed = packBits(bytes)
  assert.deepEqual([-4, 0, 3, 31, 255, 192, 127, -1, 255, 0, 192, -3, 0], packed)
})

test('pack set 3', () => {
  const bytes = [0, 0, 0, 0, 0, 127, 255, 0, 127, 255, 255, 192, 0, 0, 0, 0]
  const packed = packBits(bytes)
  assert.deepEqual([-4, 0, 3, 127, 255, 0, 127, -1, 255, 0, 192, -3, 0], packed)
})
