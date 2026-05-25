import { describe, expect, it } from 'vitest'
import type { MapAreaFeature } from './mapAreaRules'
import {
  filterMapAreaFeatures,
  getMapAreaPathOptions,
  normalizeMapAreaData,
  type RawMapAreaGeometry,
  toMapAreaPolygons,
} from './mapAreaRules'

const polygonGeometry: RawMapAreaGeometry = {
  type: 'Polygon',
  coordinates: [
    [
      [10, 20],
      [30, 40],
      [50, 60],
    ],
  ],
}

function createFeature(overrides: Partial<MapAreaFeature> = {}): MapAreaFeature {
  return {
    id: '1-0',
    title: 'Area 1',
    areaKey: '1',
    layer: null,
    color: '#3388ff',
    geometry: polygonGeometry,
    ...overrides,
  }
}

describe('normalizeMapAreaData', () => {
  it('normalizes FeatureCollection data and reads title, area key, layer, and color', () => {
    const features = normalizeMapAreaData(
      {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: {
              title: 'Komo Shoreline Cave',
              order: 7,
              map_layer: 'Surface',
              color: '#f3e79b',
            },
            geometry: polygonGeometry,
          },
        ],
      },
      '#3388ff',
    )

    expect(features).toMatchObject([
      {
        id: '7-0',
        title: 'Komo Shoreline Cave',
        areaKey: '7',
        layer: 'Surface',
        color: '#f3e79b',
      },
    ])
  })

  it('normalizes grouped MapTower-style raw geometry objects', () => {
    const features = normalizeMapAreaData(
      {
        0: [
          {
            type: 'Polygon',
            properties: {
              title: 'Ulri Mountain',
              towerNum: 5,
            },
            coordinates: polygonGeometry.coordinates,
          },
        ],
      },
      '#46a6ff',
    )

    expect(features).toHaveLength(1)
    expect(features[0]).toMatchObject({
      id: '5-0',
      title: 'Ulri Mountain',
      areaKey: '5',
      color: '#46a6ff',
    })
  })

  it('falls back to Area, group, generated title, and fallback color in source priority order', () => {
    const [areaFeature, groupFeature, fallbackFeature] = normalizeMapAreaData(
      [
        {
          type: 'Feature',
          properties: {
            Area: 'Area 53',
          },
          geometry: polygonGeometry,
        },
        {
          type: 'Feature',
          properties: {
            group: 'Set_SkyIsland_HyruleHill_C-5_Sky',
          },
          geometry: polygonGeometry,
        },
        {
          type: 'Feature',
          properties: {},
          geometry: polygonGeometry,
        },
      ],
      '#70d6ff',
    )

    expect(areaFeature.title).toBe('Area 53')
    expect(areaFeature.areaKey).toBe('Area 53')
    expect(groupFeature.title).toBe('Set_SkyIsland_HyruleHill_C-5_Sky')
    expect(groupFeature.areaKey).toBe('2')
    expect(fallbackFeature.title).toBe('Area 3')
    expect(fallbackFeature.areaKey).toBe('3')
    expect(fallbackFeature.color).toBe('#70d6ff')
  })
})

describe('filterMapAreaFeatures', () => {
  it('filters out features that belong to another map layer', () => {
    const surface = createFeature({ id: 'surface', layer: 'Surface' })
    const sky = createFeature({ id: 'sky', layer: 'Sky' })
    const shared = createFeature({ id: 'shared', layer: null })

    const features = filterMapAreaFeatures({
      features: [surface, sky, shared],
      activeLayer: 'Surface',
      filterText: '',
    })

    expect(features.map((feature) => feature.id)).toEqual(['surface', 'shared'])
  })

  it('filters by visible list index and source area key', () => {
    const features = [
      createFeature({ id: 'first', areaKey: 'A' }),
      createFeature({ id: 'second', areaKey: 'B' }),
      createFeature({ id: 'third', areaKey: '64' }),
    ]

    const filtered = filterMapAreaFeatures({
      features,
      activeLayer: 'Surface',
      filterText: '1,64',
    })

    expect(filtered.map((feature) => feature.id)).toEqual(['first', 'third'])
  })
})

describe('toMapAreaPolygons', () => {
  it('converts source [x,z] polygon coordinates to Leaflet [z,x] coordinates', () => {
    expect(toMapAreaPolygons(createFeature())).toEqual([
      [
        [20, 10],
        [40, 30],
        [60, 50],
      ],
    ])
  })

  it('converts each multipolygon shell independently', () => {
    const feature = createFeature({
      geometry: {
        type: 'MultiPolygon',
        coordinates: [
          [
            [
              [1, 2],
              [3, 4],
            ],
          ],
          [
            [
              [5, 6],
              [7, 8],
            ],
          ],
        ],
      },
    })

    expect(toMapAreaPolygons(feature)).toEqual([
      [
        [2, 1],
        [4, 3],
      ],
      [
        [6, 5],
        [8, 7],
      ],
    ])
  })
})

describe('getMapAreaPathOptions', () => {
  it('uses the area color and toggles fill opacity', () => {
    expect(getMapAreaPathOptions({ color: '#ff8db7' }, true)).toMatchObject({
      color: '#ff8db7',
      fillColor: '#ff8db7',
      fillOpacity: 0.16,
      opacity: 0.82,
      weight: 2,
    })
    expect(getMapAreaPathOptions({ color: '#ff8db7' }, false)).toMatchObject({
      fillOpacity: 0,
    })
  })
})
