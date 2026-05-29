import { beforeEach, describe, expect, it } from 'vitest'
import { useMapUiStore } from './mapUiStore'

describe('mapUiStore object overrides', () => {
  beforeEach(() => {
    useMapUiStore.getState().clearPinnedObjects()
    useMapUiStore.getState().clearHiddenObjects()
    useMapUiStore.getState().selectObject(null)
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
})
