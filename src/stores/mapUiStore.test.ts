import { beforeEach, describe, expect, it } from 'vitest'
import { useMapUiStore } from './mapUiStore'

describe('mapUiStore object overrides', () => {
  beforeEach(() => {
    useMapUiStore.getState().clearPinnedObjects()
    useMapUiStore.getState().clearHiddenObjects()
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
    useMapUiStore.getState().setInGameCoordinates(false)
    useMapUiStore.getState().setCopyCoordinatesXYZ(false)
    useMapUiStore.setState({ customSearchPresets: [] })
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
    useMapUiStore.getState().setInGameCoordinates(true)
    useMapUiStore.getState().setCopyCoordinatesXYZ(true)

    expect(useMapUiStore.getState()).toMatchObject({
      searchMapType: 'MainField',
      searchMapName: 'Sky',
      colorPerActor: false,
      useActorNames: true,
      useHexForHashIds: false,
      showObjectHeightsInTooltips: true,
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
