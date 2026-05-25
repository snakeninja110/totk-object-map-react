import { describe, expect, it } from 'vitest'
import type { MapObject } from '../types/map'
import {
  isObjectInViewport,
  isSourceStaticFilterCategory,
  objectMatchesLayer,
} from './objectFilters'

function createObject(overrides: Partial<MapObject> = {}): MapObject {
  return {
    id: 'test-object',
    name: 'TestObject',
    actor: 'TestActor',
    category: 'chasm',
    layer: 'Surface',
    x: 100,
    y: 0,
    z: -100,
    color: '#ffffff',
    tags: [],
    note: '',
    ...overrides,
  }
}

describe('objectMatchesLayer', () => {
  it('uses the object layer when displayLayers is absent', () => {
    expect(objectMatchesLayer(createObject({ layer: 'Surface' }), 'Surface')).toBe(true)
    expect(objectMatchesLayer(createObject({ layer: 'Surface' }), 'Depths')).toBe(false)
  })

  it('uses displayLayers for static markers that need to render on multiple layers', () => {
    const chasm = createObject({
      layer: 'Surface',
      displayLayers: ['Surface', 'Depths'],
    })

    expect(objectMatchesLayer(chasm, 'Surface')).toBe(true)
    expect(objectMatchesLayer(chasm, 'Depths')).toBe(true)
    expect(objectMatchesLayer(chasm, 'Sky')).toBe(false)
  })
})

describe('isSourceStaticFilterCategory', () => {
  it('marks source-site filter categories as static marker categories', () => {
    expect(isSourceStaticFilterCategory('location')).toBe(true)
    expect(isSourceStaticFilterCategory('shrine')).toBe(true)
    expect(isSourceStaticFilterCategory('chasm')).toBe(true)
    expect(isSourceStaticFilterCategory('cave')).toBe(true)
  })

  it('keeps raw-search-only categories out of the source static filter list', () => {
    expect(isSourceStaticFilterCategory('chest')).toBe(false)
    expect(isSourceStaticFilterCategory('weapon')).toBe(false)
    expect(isSourceStaticFilterCategory('enemy')).toBe(false)
  })
})

describe('isObjectInViewport', () => {
  it('uses inclusive viewport bounds in game coordinates', () => {
    const object = createObject({ x: 10, z: -20 })

    expect(
      isObjectInViewport(object, {
        minX: 10,
        maxX: 20,
        minZ: -20,
        maxZ: 0,
      }),
    ).toBe(true)
  })

  it('rejects objects outside the padded viewport bounds', () => {
    const object = createObject({ x: 21, z: -20 })

    expect(
      isObjectInViewport(object, {
        minX: 10,
        maxX: 20,
        minZ: -20,
        maxZ: 0,
      }),
    ).toBe(false)
  })
})
