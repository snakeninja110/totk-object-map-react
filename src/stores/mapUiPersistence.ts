import type { StateStorage } from 'zustand/middleware'

export const MAP_UI_STORAGE_KEY = 'totk-object-map-ui'
export const MAP_UI_STORAGE_VERSION = 1

// 后续如果切 IndexedDB，只需要替换这里返回的 driver，不改 mapUiStore 的业务状态。
export type MapUiStorageDriver = 'localStorage' | 'indexedDB'

export const mapUiStorageDriver: MapUiStorageDriver = 'localStorage'

export function createMapUiStorage(): StateStorage {
  if (mapUiStorageDriver === 'indexedDB') {
    return createNoopStorage()
  }

  if (typeof window === 'undefined' || !window.localStorage) {
    return createNoopStorage()
  }

  return {
    getItem: (name) => window.localStorage.getItem(name),
    removeItem: (name) => window.localStorage.removeItem(name),
    setItem: (name, value) => window.localStorage.setItem(name, value),
  }
}

function createNoopStorage(): StateStorage {
  return {
    getItem: () => null,
    removeItem: () => undefined,
    setItem: () => undefined,
  }
}
