import { create } from 'zustand'
import type {
  MapAreaId,
  MapLayer,
  MapObject,
  ObjectDataSource,
  TileSource,
} from '../types/map'

export type ActiveObjectCategory = MapObject['category']

// 统一保存地图页面的用户交互状态；对象数据本身仍由数据服务加载，避免把大数据塞进 store。
type MapUiState = {
  activeLayer: MapLayer
  tileSource: TileSource
  objectSource: ObjectDataSource
  // 当前启用的 Visible map areas 图层；none 表示不绘制任何区域覆盖层。
  activeMapArea: MapAreaId
  // 区域编号过滤输入，兼容源站的 “1,2,3,64” 写法。
  mapAreaFilter: string
  // 是否填充区域面；关闭后只显示边界线，便于查看底图细节。
  mapAreaFill: boolean
  activeCategories: ActiveObjectCategory[]
  query: string
  selectedObjectId: string | null
  setActiveLayer: (layer: MapLayer) => void
  setTileSource: (source: TileSource) => void
  setObjectSource: (source: ObjectDataSource) => void
  setActiveMapArea: (mapArea: MapAreaId) => void
  setMapAreaFilter: (filter: string) => void
  setMapAreaFill: (shouldFill: boolean) => void
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
  activeMapArea: 'none',
  mapAreaFilter: '',
  mapAreaFill: true,
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
  setActiveMapArea: (mapArea) =>
    set({
      activeMapArea: mapArea,
    }),
  setMapAreaFilter: (filter) =>
    set({
      mapAreaFilter: filter,
    }),
  setMapAreaFill: (shouldFill) =>
    set({
      mapAreaFill: shouldFill,
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
