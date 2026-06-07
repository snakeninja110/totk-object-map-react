import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMapUiStorage } from './mapUiPersistence'
import { useMapUiStore } from './mapUiStore'

describe('mapUiStore object overrides', () => {
  beforeEach(() => {
    useMapUiStore.getState().clearPinnedObjects()
    useMapUiStore.getState().clearHiddenObjects()
    useMapUiStore.getState().clearFavoriteObjects()
    useMapUiStore.getState().selectObject(null)
    useMapUiStore.getState().setActiveSidebarPanel('filter')
    useMapUiStore.getState().setShowMapStatusBar(true)
    useMapUiStore.getState().setShowMarkerTooltips(true)
    useMapUiStore.getState().setEnableMarkerHoverEffects(true)
    useMapUiStore.getState().setDefaultAdvancedDetailsOpen(false)
    useMapUiStore.getState().setSearchMapType('MainAndMinusField')
    useMapUiStore.getState().setSearchMapName('')
    useMapUiStore.getState().setColorPerActor(true)
    useMapUiStore.getState().setUseActorNames(false)
    useMapUiStore.getState().setUseHexForHashIds(true)
    useMapUiStore.getState().setShowObjectHeightsInTooltips(false)
    useMapUiStore.getState().setShowKorokIds(false)
    useMapUiStore.getState().setInGameCoordinates(false)
    useMapUiStore.getState().setCopyCoordinatesXYZ(false)
    useMapUiStore.setState({
      customSearchPresets: [],
      checklists: [{ id: 'default', name: 'Default List', completedObjectIds: [] }],
      activeChecklistId: 'default',
      completedMarkerMode: 'show',
    })
  })

  it('toggles pinned object ids', () => {
    useMapUiStore.getState().togglePinnedObject('object-1')
    expect(useMapUiStore.getState().pinnedObjectIds).toEqual(['object-1'])

    useMapUiStore.getState().togglePinnedObject('object-1')
    expect(useMapUiStore.getState().pinnedObjectIds).toEqual([])
  })

  it('hides objects, removes pinned state, and clears selected object', () => {
    useMapUiStore.getState().togglePinnedObject('object-1')
    useMapUiStore.getState().selectObject('object-1')
    useMapUiStore.getState().hideObject('object-1')

    expect(useMapUiStore.getState().hiddenObjectIds).toEqual(['object-1'])
    expect(useMapUiStore.getState().pinnedObjectIds).toEqual([])
    expect(useMapUiStore.getState().selectedObjectId).toBeNull()
  })

  it('bulk pins and hides result objects', () => {
    useMapUiStore.getState().hideObject('object-1')
    useMapUiStore.getState().pinObjects(['object-1', 'object-2'])

    expect(useMapUiStore.getState().pinnedObjectIds).toEqual(['object-1', 'object-2'])
    expect(useMapUiStore.getState().hiddenObjectIds).toEqual([])

    useMapUiStore.getState().selectObject('object-2')
    useMapUiStore.getState().hideObjects(['object-2'])

    expect(useMapUiStore.getState().hiddenObjectIds).toEqual(['object-2'])
    expect(useMapUiStore.getState().pinnedObjectIds).toEqual(['object-1'])
    expect(useMapUiStore.getState().selectedObjectId).toBeNull()
  })

  it('toggles favorite object ids for future favorites UI', () => {
    useMapUiStore.getState().toggleFavoriteObject('object-1')
    expect(useMapUiStore.getState().favoriteObjectIds).toEqual(['object-1'])

    useMapUiStore.getState().toggleFavoriteObject('object-1')
    expect(useMapUiStore.getState().favoriteObjectIds).toEqual([])
  })

  it('manages checklist lists and completed marker mode', () => {
    useMapUiStore.getState().toggleChecklistObject('object-1')
    expect(useMapUiStore.getState().checklists[0].completedObjectIds).toEqual(['object-1'])

    useMapUiStore.getState().setCompletedMarkerMode('hide')
    expect(useMapUiStore.getState().completedMarkerMode).toBe('hide')

    useMapUiStore.getState().createChecklist()
    const createdList = useMapUiStore.getState().checklists[1]
    expect(createdList.name).toBe('List 2')
    expect(useMapUiStore.getState().activeChecklistId).toBe(createdList.id)

    useMapUiStore.getState().toggleChecklistObject('object-2')
    expect(useMapUiStore.getState().checklists[1].completedObjectIds).toEqual(['object-2'])

    useMapUiStore.getState().resetActiveChecklist()
    expect(useMapUiStore.getState().checklists[1].completedObjectIds).toEqual([])

    useMapUiStore.getState().setActiveChecklist('default')
    expect(useMapUiStore.getState().activeChecklistId).toBe('default')
  })

  it('updates settings panel state', () => {
    useMapUiStore.getState().setActiveSidebarPanel('settings')
    useMapUiStore.getState().setShowMapStatusBar(false)
    useMapUiStore.getState().setShowMarkerTooltips(false)
    useMapUiStore.getState().setEnableMarkerHoverEffects(false)
    useMapUiStore.getState().setDefaultAdvancedDetailsOpen(true)

    expect(useMapUiStore.getState()).toMatchObject({
      activeSidebarPanel: 'settings',
      showMapStatusBar: false,
      showMarkerTooltips: false,
      enableMarkerHoverEffects: false,
      defaultAdvancedDetailsOpen: true,
    })
  })

  it('updates source-style settings', () => {
    useMapUiStore.getState().setSearchMapType('MainField')
    useMapUiStore.getState().setSearchMapName('Sky')
    useMapUiStore.getState().setColorPerActor(false)
    useMapUiStore.getState().setUseActorNames(true)
    useMapUiStore.getState().setUseHexForHashIds(false)
    useMapUiStore.getState().setShowObjectHeightsInTooltips(true)
    useMapUiStore.getState().setShowKorokIds(true)
    useMapUiStore.getState().setInGameCoordinates(true)
    useMapUiStore.getState().setCopyCoordinatesXYZ(true)

    expect(useMapUiStore.getState()).toMatchObject({
      searchMapType: 'MainField',
      searchMapName: 'Sky',
      colorPerActor: false,
      useActorNames: true,
      useHexForHashIds: false,
      showObjectHeightsInTooltips: true,
      showKorokIds: true,
      inGameCoordinates: true,
      copyCoordinatesXYZ: true,
    })
  })

  it('manages custom search presets', () => {
    useMapUiStore.getState().addCustomSearchPreset()
    useMapUiStore
      .getState()
      .updateCustomSearchPreset(0, { label: 'Bows', query: 'category:weapon bow' })

    expect(useMapUiStore.getState().customSearchPresets).toEqual([
      { label: 'Bows', query: 'category:weapon bow' },
    ])

    useMapUiStore.getState().removeCustomSearchPreset(0)
    expect(useMapUiStore.getState().customSearchPresets).toEqual([])
  })
})

describe('map UI persistence storage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('uses localStorage through a storage adapter', () => {
    const values = new Map<string, string>()
    const localStorage = {
      getItem: vi.fn((name: string) => values.get(name) ?? null),
      removeItem: vi.fn((name: string) => {
        values.delete(name)
      }),
      setItem: vi.fn((name: string, value: string) => {
        values.set(name, value)
      }),
    }

    vi.stubGlobal('window', { localStorage })

    const storage = createMapUiStorage()
    storage.setItem('state', '{"ok":true}')

    expect(storage.getItem('state')).toBe('{"ok":true}')

    storage.removeItem('state')
    expect(storage.getItem('state')).toBeNull()
  })
})
