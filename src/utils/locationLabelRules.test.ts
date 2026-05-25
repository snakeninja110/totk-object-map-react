import { describe, expect, it } from 'vitest'
import type { MapObject } from '../types/map'
import {
  formatLocationLabel,
  getObjectDisplayName,
  shouldShowLocationLabel,
} from './locationLabelRules'

function createLocation(overrides: Partial<MapObject> = {}): MapObject {
  return {
    id: 'location-test',
    name: 'MapRegion_Eldin',
    actor: 'LocationMarker',
    category: 'location',
    layer: 'Surface',
    x: 0,
    y: 0,
    z: 0,
    color: '#d8c36c',
    sourceKind: 'static',
    showLevel: 'Farthest',
    priority: 1,
    tags: [],
    note: '',
    ...overrides,
  }
}

describe('formatLocationLabel', () => {
  it('maps source overview region ids to user-facing English names', () => {
    expect(formatLocationLabel('MapRegion_HyrulePrairie')).toBe('Central Hyrule')
    expect(formatLocationLabel('MapRegion_Tamul')).toBe('Akkala')
  })

  it('formats non-overview location ids into readable labels', () => {
    expect(formatLocationLabel('MapRegion_MtLanayru')).toBe('Mt. Lanayru')
    expect(formatLocationLabel('MinusField_AncientObservationDeck')).toBe(
      'Ancient Observation Deck',
    )
  })
})

describe('getObjectDisplayName', () => {
  it('uses displayName when the normalized object already has one', () => {
    expect(getObjectDisplayName(createLocation({ displayName: 'Akkala' }))).toBe(
      'Akkala',
    )
  })

  it('formats location names and leaves non-location names unchanged', () => {
    expect(getObjectDisplayName(createLocation({ name: 'MapRegion_Lanayru' }))).toBe(
      'Lanayru',
    )
    expect(
      getObjectDisplayName(
        createLocation({
          category: 'shrine',
          name: 'Dye Shrine',
        }),
      ),
    ).toBe('Dye Shrine')
  })
})

describe('shouldShowLocationLabel', () => {
  it('shows Farthest overview labels at low zoom and hides them after zoom 4', () => {
    const location = createLocation({ showLevel: 'Farthest', y: 10 })

    expect(shouldShowLocationLabel(location, 'Surface', 3)).toBe(true)
    expect(shouldShowLocationLabel(location, 'Surface', 5)).toBe(false)
  })

  it('shows Far and Near labels only at zoom 5', () => {
    const location = createLocation({ showLevel: 'Far,Near', y: 10 })

    expect(shouldShowLocationLabel(location, 'Surface', 4)).toBe(false)
    expect(shouldShowLocationLabel(location, 'Surface', 5)).toBe(true)
    expect(shouldShowLocationLabel(location, 'Surface', 6)).toBe(false)
  })

  it('shows default and Nearest labels from zoom 6 onward', () => {
    const defaultLocation = createLocation({ showLevel: '', y: 10 })
    const nearestLocation = createLocation({ showLevel: 'Nearest', y: 10 })

    expect(shouldShowLocationLabel(defaultLocation, 'Surface', 5)).toBe(false)
    expect(shouldShowLocationLabel(defaultLocation, 'Surface', 6)).toBe(true)
    expect(shouldShowLocationLabel(nearestLocation, 'Surface', 6)).toBe(true)
  })

  it('matches source-site layer height ranges', () => {
    expect(shouldShowLocationLabel(createLocation({ y: 1200 }), 'Sky', 3)).toBe(true)
    expect(shouldShowLocationLabel(createLocation({ y: 1200 }), 'Surface', 3)).toBe(
      false,
    )
    expect(shouldShowLocationLabel(createLocation({ y: -60 }), 'Depths', 3)).toBe(true)
    expect(shouldShowLocationLabel(createLocation({ y: -60 }), 'Surface', 3)).toBe(
      false,
    )
  })

  it('does not render non-static locations or the Oasis source exception', () => {
    expect(
      shouldShowLocationLabel(
        createLocation({
          name: 'Oasis',
          showLevel: 'Farthest',
        }),
        'Surface',
        3,
      ),
    ).toBe(false)
    expect(
      shouldShowLocationLabel(
        createLocation({
          priority: undefined,
          showLevel: undefined,
          note: 'Raw object',
        }),
        'Surface',
        6,
      ),
    ).toBe(false)
  })
})
