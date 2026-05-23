import { create } from 'zustand'
import type { MapLayer, MapObject, ObjectDataSource, TileSource } from '../types/map'

export type ActiveObjectCategory = MapObject['category']

// 统一保存地图页面的用户交互状态；对象数据本身仍由数据服务加载，避免把大数据塞进 store。
type MapUiState = {
  activeLayer: MapLayer
  tileSource: TileSource
  objectSource: ObjectDataSource
  activeCategories: ActiveObjectCategory[]
  query: string
  selectedObjectId: string | null
  setActiveLayer: (layer: MapLayer) => void
  setTileSource: (source: TileSource) => void
  setObjectSource: (source: ObjectDataSource) => void
  toggleCategory: (category: ActiveObjectCategory, preferredLayer?: MapLayer) => void
  clearCategories: () => void
  setQuery: (query: string) => void
  selectObject: (objectId: string | null) => void
}

// 空的 activeCategories 表示不显示任何点位；用户勾选一个或多个分类后才渲染对应对象。
export const useMapUiStore = create<MapUiState>((set) => ({
  activeLayer: 'Surface',
  tileSource: 'remote',
  objectSource: 'local',
  activeCategories: [],
  query: '',
  selectedObjectId: null,
  setActiveLayer: (layer) =>
    set({
      activeLayer: layer,
      selectedObjectId: null,
    }),
  setTileSource: (source) =>
    set({
      tileSource: source,
    }),
  setObjectSource: (source) =>
    set({
      objectSource: source,
      selectedObjectId: null,
    }),
  toggleCategory: (category, preferredLayer) =>
    set((state) => {
      const isSelected = state.activeCategories.includes(category)
      const activeCategories = isSelected
        ? state.activeCategories.filter((item) => item !== category)
        : [...state.activeCategories, category]

      return {
        activeCategories,
        activeLayer: !isSelected && preferredLayer ? preferredLayer : state.activeLayer,
        selectedObjectId: null,
      }
    }),
  clearCategories: () =>
    set({
      activeCategories: [],
      selectedObjectId: null,
    }),
  setQuery: (query) =>
    set({
      query,
    }),
  selectObject: (objectId) =>
    set({
      selectedObjectId: objectId,
    }),
}))
