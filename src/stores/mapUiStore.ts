import { create } from 'zustand'
import type {
  MapAreaId,
  MapLayer,
  MapObject,
  ObjectDataSource,
  SearchMapType,
  SearchPreset,
  TileSource,
} from '../types/map'

export type ActiveObjectCategory = MapObject['category']
export type SidebarPanel = 'filter' | 'settings'

// 统一保存地图页面的用户交互状态；对象数据本身仍由数据服务加载，避免把大数据塞进 store。
type MapUiState = {
  // 左侧功能栏当前打开的面板；目前实现 Filter 和 Settings 两页。
  activeSidebarPanel: SidebarPanel
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
  // 固定到地图上的对象 ID；固定对象会绕过搜索和分类限制，但仍遵守当前地图图层。
  pinnedObjectIds: string[]
  // 临时隐藏的对象 ID；隐藏对象不会进入结果列表、详情选择和地图渲染。
  hiddenObjectIds: string[]
  // 是否显示地图底部/右上状态条；关闭后地图画面更接近源站沉浸模式。
  showMapStatusBar: boolean
  // 是否启用 marker hover tooltip。
  showMarkerTooltips: boolean
  // 是否启用 marker hover 发光和圆点放大。
  enableMarkerHoverEffects: boolean
  // 是否默认展开详情面板里的高级参数。
  defaultAdvancedDetailsOpen: boolean
  // 远程 radar 搜索的地图类型；复刻源站 Settings Map 第一层下拉。
  searchMapType: SearchMapType
  // 远程 radar 搜索的地图名；复刻源站 Settings Map 第二层下拉。
  searchMapName: string
  // 是否按 Actor 类型给圆点 marker 上色；关闭时按搜索/分类分组颜色显示。
  colorPerActor: boolean
  // 是否使用内部 Actor 名称作为对象标题。
  useActorNames: boolean
  // 是否把数字 hash ID 显示为 0x 开头的十六进制。
  useHexForHashIds: boolean
  // 是否在 hover tooltip 中显示对象高度。
  showObjectHeightsInTooltips: boolean
  // 是否用游戏内坐标顺序显示详情坐标。
  inGameCoordinates: boolean
  // 用户自定义搜索预设；结构与源站 customSearchPresets 保持一致。
  customSearchPresets: SearchPreset[]
  // 右键复制坐标时是否复制三维坐标；右键菜单实现后会直接读取这个设置。
  copyCoordinatesXYZ: boolean
  setActiveSidebarPanel: (panel: SidebarPanel) => void
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
  togglePinnedObject: (objectId: string) => void
  hideObject: (objectId: string) => void
  clearPinnedObjects: () => void
  clearHiddenObjects: () => void
  setShowMapStatusBar: (shouldShow: boolean) => void
  setShowMarkerTooltips: (shouldShow: boolean) => void
  setEnableMarkerHoverEffects: (shouldEnable: boolean) => void
  setDefaultAdvancedDetailsOpen: (shouldOpen: boolean) => void
  setSearchMapType: (mapType: SearchMapType) => void
  setSearchMapName: (mapName: string) => void
  setColorPerActor: (shouldColorPerActor: boolean) => void
  setUseActorNames: (shouldUse: boolean) => void
  setUseHexForHashIds: (shouldUse: boolean) => void
  setShowObjectHeightsInTooltips: (shouldShow: boolean) => void
  setInGameCoordinates: (shouldUse: boolean) => void
  addCustomSearchPreset: () => void
  updateCustomSearchPreset: (index: number, preset: SearchPreset) => void
  removeCustomSearchPreset: (index: number) => void
  setCopyCoordinatesXYZ: (shouldCopyXYZ: boolean) => void
}

// 空的 activeCategories 表示不显示任何点位；用户勾选一个或多个分类后才渲染对应对象。
export const useMapUiStore = create<MapUiState>((set) => ({
  activeSidebarPanel: 'filter',
  activeLayer: 'Surface',
  tileSource: 'remote',
  objectSource: 'local',
  activeMapArea: 'none',
  mapAreaFilter: '',
  mapAreaFill: true,
  activeCategories: [],
  query: '',
  selectedObjectId: null,
  pinnedObjectIds: [],
  hiddenObjectIds: [],
  showMapStatusBar: true,
  showMarkerTooltips: true,
  enableMarkerHoverEffects: true,
  defaultAdvancedDetailsOpen: false,
  searchMapType: 'MainAndMinusField',
  searchMapName: '',
  colorPerActor: true,
  useActorNames: false,
  useHexForHashIds: true,
  showObjectHeightsInTooltips: false,
  inGameCoordinates: false,
  customSearchPresets: [],
  copyCoordinatesXYZ: false,
  setActiveSidebarPanel: (panel) =>
    set({
      activeSidebarPanel: panel,
    }),
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
  togglePinnedObject: (objectId) =>
    set((state) => {
      const isPinned = state.pinnedObjectIds.includes(objectId)

      return {
        pinnedObjectIds: isPinned
          ? state.pinnedObjectIds.filter((id) => id !== objectId)
          : [...state.pinnedObjectIds, objectId],
      }
    }),
  hideObject: (objectId) =>
    set((state) => ({
      hiddenObjectIds: state.hiddenObjectIds.includes(objectId)
        ? state.hiddenObjectIds
        : [...state.hiddenObjectIds, objectId],
      pinnedObjectIds: state.pinnedObjectIds.filter((id) => id !== objectId),
      selectedObjectId: state.selectedObjectId === objectId ? null : state.selectedObjectId,
    })),
  clearPinnedObjects: () =>
    set({
      pinnedObjectIds: [],
    }),
  clearHiddenObjects: () =>
    set({
      hiddenObjectIds: [],
    }),
  setShowMapStatusBar: (shouldShow) =>
    set({
      showMapStatusBar: shouldShow,
    }),
  setShowMarkerTooltips: (shouldShow) =>
    set({
      showMarkerTooltips: shouldShow,
    }),
  setEnableMarkerHoverEffects: (shouldEnable) =>
    set({
      enableMarkerHoverEffects: shouldEnable,
    }),
  setDefaultAdvancedDetailsOpen: (shouldOpen) =>
    set({
      defaultAdvancedDetailsOpen: shouldOpen,
    }),
  setSearchMapType: (mapType) =>
    set({
      searchMapType: mapType,
      searchMapName: '',
      selectedObjectId: null,
    }),
  setSearchMapName: (mapName) =>
    set({
      searchMapName: mapName,
      selectedObjectId: null,
    }),
  setColorPerActor: (shouldColorPerActor) =>
    set({
      colorPerActor: shouldColorPerActor,
    }),
  setUseActorNames: (shouldUse) =>
    set({
      useActorNames: shouldUse,
    }),
  setUseHexForHashIds: (shouldUse) =>
    set({
      useHexForHashIds: shouldUse,
    }),
  setShowObjectHeightsInTooltips: (shouldShow) =>
    set({
      showObjectHeightsInTooltips: shouldShow,
    }),
  setInGameCoordinates: (shouldUse) =>
    set({
      inGameCoordinates: shouldUse,
    }),
  addCustomSearchPreset: () =>
    set((state) => ({
      customSearchPresets: [...state.customSearchPresets, { label: '', query: '' }],
    })),
  updateCustomSearchPreset: (index, preset) =>
    set((state) => ({
      customSearchPresets: state.customSearchPresets.map((item, itemIndex) =>
        itemIndex === index ? preset : item,
      ),
    })),
  removeCustomSearchPreset: (index) =>
    set((state) => ({
      customSearchPresets: state.customSearchPresets.filter((_, itemIndex) => itemIndex !== index),
    })),
  setCopyCoordinatesXYZ: (shouldCopyXYZ) =>
    set({
      copyCoordinatesXYZ: shouldCopyXYZ,
    }),
}))
