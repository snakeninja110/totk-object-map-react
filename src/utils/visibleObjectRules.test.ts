import { describe, expect, it } from 'vitest'
import type { MapObject } from '../types/map'
import { getVisibleObjects } from './visibleObjectRules'

function createObject(overrides: Partial<MapObject> = {}): MapObject {
  return {
    id: 'test-object',
    name: 'TestObject',
    actor: 'TestActor',
    category: 'shrine',
    layer: 'Surface',
    x: 0,
    y: 0,
    z: 0,
    color: '#ffffff',
    tags: [],
    note: '',
    ...overrides,
  }
}

describe('getVisibleObjects', () => {
  it('returns no objects when no category is selected', () => {
    const objects = [
      createObject({ id: 'shrine', category: 'shrine', sourceKind: 'static' }),
      createObject({ id: 'enemy', category: 'enemy' }),
    ]

    expect(
      getVisibleObjects({
        searchedObjects: objects,
        selectedCategorySet: new Set(),
        activeLayer: 'Surface',
        mapZoom: 6,
        query: '',
      }),
    ).toEqual([])
  })

  it('allows search results to show when no category is selected', () => {
    const chest = createObject({
      id: 'chest',
      category: 'chest',
      sourceKind: 'raw',
    })

    expect(
      getVisibleObjects({
        searchedObjects: [chest],
        selectedCategorySet: new Set(),
        activeLayer: 'Surface',
        mapZoom: 6,
        query: 'category:chest',
      }).map((object) => object.id),
    ).toEqual(['chest'])
  })

  it('uses only source static markers for source-site filter categories when there is no search query', () => {
    const staticShrine = createObject({
      id: 'static-shrine',
      category: 'shrine',
      sourceKind: 'static',
    })
    const rawShrine = createObject({
      id: 'raw-shrine',
      category: 'shrine',
      sourceKind: 'raw',
    })

    const visibleObjects = getVisibleObjects({
      searchedObjects: [staticShrine, rawShrine],
      selectedCategorySet: new Set(['shrine']),
      activeLayer: 'Surface',
      mapZoom: 6,
      query: '',
    })

    expect(visibleObjects.map((object) => object.id)).toEqual(['static-shrine'])
  })

  it('allows raw source-site category objects during search', () => {
    const rawShrine = createObject({
      id: 'raw-shrine',
      category: 'shrine',
      sourceKind: 'raw',
    })

    const visibleObjects = getVisibleObjects({
      searchedObjects: [rawShrine],
      selectedCategorySet: new Set(['shrine']),
      activeLayer: 'Surface',
      mapZoom: 6,
      query: 'shrine',
    })

    expect(visibleObjects.map((object) => object.id)).toEqual(['raw-shrine'])
  })

  it('keeps raw-search-only categories visible without requiring sourceKind static', () => {
    const enemy = createObject({
      id: 'enemy',
      category: 'enemy',
      sourceKind: 'raw',
    })

    const visibleObjects = getVisibleObjects({
      searchedObjects: [enemy],
      selectedCategorySet: new Set(['enemy']),
      activeLayer: 'Surface',
      mapZoom: 6,
      query: '',
    })

    expect(visibleObjects.map((object) => object.id)).toEqual(['enemy'])
  })

  it('applies layer matching, including static chasm displayLayers', () => {
    const surfaceOnly = createObject({
      id: 'surface-only',
      category: 'chasm',
      layer: 'Surface',
      sourceKind: 'static',
    })
    const dualLayerChasm = createObject({
      id: 'dual-layer-chasm',
      category: 'chasm',
      layer: 'Surface',
      displayLayers: ['Surface', 'Depths'],
      sourceKind: 'static',
    })

    const visibleObjects = getVisibleObjects({
      searchedObjects: [surfaceOnly, dualLayerChasm],
      selectedCategorySet: new Set(['chasm']),
      activeLayer: 'Depths',
      mapZoom: 6,
      query: '',
    })

    expect(visibleObjects.map((object) => object.id)).toEqual(['dual-layer-chasm'])
  })

  it('filters location labels by source ShowLevel when there is no search query', () => {
    const overviewLocation = createObject({
      id: 'overview-location',
      name: 'MapRegion_Eldin',
      category: 'location',
      sourceKind: 'static',
      showLevel: 'Farthest',
      priority: 1,
    })
    const detailedLocation = createObject({
      id: 'detailed-location',
      name: 'MapRegion_SmallArea',
      category: 'location',
      sourceKind: 'static',
      showLevel: 'Nearest',
      priority: 10,
    })

    const visibleObjects = getVisibleObjects({
      searchedObjects: [overviewLocation, detailedLocation],
      selectedCategorySet: new Set(['location']),
      activeLayer: 'Surface',
      mapZoom: 3,
      query: '',
    })

    expect(visibleObjects.map((object) => object.id)).toEqual(['overview-location'])
  })
})
