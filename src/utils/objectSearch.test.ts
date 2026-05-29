import { describe, expect, it } from 'vitest'
import type { MapObject } from '../types/map'
import {
  getPlainSearchText,
  getRemoteObjectSearchText,
  objectMatchesSearch,
  parseObjectSearch,
} from './objectSearch'

function createObject(overrides: Partial<MapObject> = {}): MapObject {
  return {
    id: 'hash-1',
    name: 'TBox_Field_Stone',
    displayName: 'Treasure Chest',
    actor: 'TBox_Field_Stone',
    category: 'chest',
    layer: 'Surface',
    x: 0,
    y: 0,
    z: 0,
    color: '#ffffff',
    mapType: 'MainField',
    mapName: 'A-1',
    fieldArea: 'Surface3',
    region: 'Rospro Pass',
    locationId: 'Cave_Test',
    equipment: ['Weapon_Bow_017'],
    drop: {
      type: 'Actor',
      values: ['Weapon_Bow_017', 'Item_Arrow'],
    },
    rawParams: {
      objid: 372,
      hash_id: 'hash-1',
      scale: 1,
    },
    tags: ['chest', 'Surface', 'A-1'],
    note: '',
    ...overrides,
  }
}

describe('parseObjectSearch', () => {
  it('separates plain terms from structured filters', () => {
    const parsed = parseObjectSearch('bow category:chest map:"A-1" layer:Surface')

    expect(getPlainSearchText(parsed)).toBe('bow')
    expect(parsed.filters).toEqual([
      { field: 'category', value: 'chest' },
      { field: 'map', value: 'A-1' },
      { field: 'layer', value: 'Surface' },
    ])
  })

  it('uses structured values as remote query fallback when no plain term exists', () => {
    expect(getRemoteObjectSearchText(parseObjectSearch('drop:Arrow'))).toBe('Arrow')
    expect(getRemoteObjectSearchText(parseObjectSearch('category:chest layer:Surface'))).toBe('')
  })
})

describe('objectMatchesSearch', () => {
  it('matches actor, category, drop, map, hash, and layer filters together', () => {
    const parsed = parseObjectSearch(
      'actor:TBox category:chest drop:Arrow map:A-1 hash:hash-1 layer:Surface',
    )

    expect(objectMatchesSearch(createObject(), parsed)).toBe(true)
  })

  it('rejects objects that miss any structured filter', () => {
    const parsed = parseObjectSearch('category:enemy drop:Arrow')

    expect(objectMatchesSearch(createObject(), parsed)).toBe(false)
  })

  it('matches quoted plain terms against extended object fields', () => {
    const parsed = parseObjectSearch('"Rospro Pass"')

    expect(objectMatchesSearch(createObject(), parsed)).toBe(true)
  })
})
