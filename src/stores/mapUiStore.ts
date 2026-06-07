import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type {
  MapAreaId,
  MapLayer,
  MapObject,
  ObjectDataSource,
  SearchMapType,
  SearchPreset,
  TileSource,
} from '../types/map'
import {
  MAP_UI_STORAGE_KEY,
  MAP_UI_STORAGE_VERSION,
  createMapUiStorage,
} from './mapUiPersistence'

export type ActiveObjectCategory = MapObject['category']
export type SidebarPanel = 'search' | 'filter' | 'checklist' | 'draw' | 'tools' | 'settings'
export type SidebarSide = 'left' | 'right'
export type CompletedMarkerMode = 'show' | 'hide'
export type Checklist = {
  id: string
  name: string
  completedObjectIds: string[]
}

// 统一保存地图页面的用户交互状态；对象数据本身仍由数据服务加载，避免把大数据塞进 store。
type MapUiState = {
  // 左侧功能栏当前打开的面板；与源站 rail 的主要工作区保持一致。
  activeSidebarPanel: SidebarPanel
  // 侧边栏显示位置；用于对齐源站 Move to the right side 的基础能力。
  sidebarSide: SidebarSide
  // 是否只显示左侧 rail；折叠后隐藏面板内容，保留工作区切换入口。
  sidebarCollapsed: boolean
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
  // 收藏对象 ID；当前先预留数据层，Favorites UI 在后续玩家工作流中接入。
  favoriteObjectIds: string[]
  // checklist 列表；通过 mapUiPersistence 持久化，后续可切 IndexedDB driver。
  checklists: Checklist[]
  // 当前选中的 checklist。
  activeChecklistId: string
  // Completed markers 的显示策略。
  completedMarkerMode: CompletedMarkerMode
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
  // 是否在 Korok tooltip 中显示 Korok 编号。
  showKorokIds: boolean
  // 是否用游戏内坐标顺序显示详情坐标。
  inGameCoordinates: boolean
  // 用户自定义搜索预设；结构与源站 customSearchPresets 保持一致。
  customSearchPresets: SearchPreset[]
  // 右键复制坐标时是否复制三维坐标；右键菜单实现后会直接读取这个设置。
  copyCoordinatesXYZ: boolean
  setActiveSidebarPanel: (panel: SidebarPanel) => void
  setSidebarSide: (side: SidebarSide) => void
  setSidebarCollapsed: (isCollapsed: boolean) => void
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
  pinObjects: (objectIds: string[]) => void
  hideObject: (objectId: string) => void
  hideObjects: (objectIds: string[]) => void
  toggleFavoriteObject: (objectId: string) => void
  clearFavoriteObjects: () => void
  clearPinnedObjects: () => void
  clearHiddenObjects: () => void
  createChecklist: () => void
  setActiveChecklist: (checklistId: string) => void
  resetActiveChecklist: () => void
  toggleChecklistObject: (objectId: string) => void
  setCompletedMarkerMode: (mode: CompletedMarkerMode) => void
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
  setShowKorokIds: (shouldShow: boolean) => void
  setInGameCoordinates: (shouldUse: boolean) => void
  addCustomSearchPreset: () => void
  updateCustomSearchPreset: (index: number, preset: SearchPreset) => void
  removeCustomSearchPreset: (index: number) => void
  setCopyCoordinatesXYZ: (shouldCopyXYZ: boolean) => void
}

const defaultChecklists: Checklist[] = [
  {
    id: 'default',
    name: 'Default List',
    completedObjectIds: [],
  },
]

// 迁移或恢复持久化状态时做轻量校验，避免旧版本/坏数据破坏 store 默认结构。
function normalizePersistedState(value: unknown): Partial<MapUiState> {
  if (!value || typeof value !== 'object') {
    return {}
  }

  const state = value as Partial<MapUiState>
  const checklists = normalizeChecklists(state.checklists)
  const activeChecklistId = checklists.some((checklist) => checklist.id === state.activeChecklistId)
    ? state.activeChecklistId
    : checklists[0].id

  return {
    ...state,
    checklists,
    activeChecklistId,
    favoriteObjectIds: Array.isArray(state.favoriteObjectIds) ? state.favoriteObjectIds : [],
  }
}

// 只接受结构完整的 checklist；无效或空数据回退到默认列表。
function normalizeChecklists(value: unknown): Checklist[] {
  if (!Array.isArray(value)) {
    return defaultChecklists
  }

  const checklists = value
    .filter((item): item is Checklist => {
      if (!item || typeof item !== 'object') {
        return false
      }

      const checklist = item as Checklist

      return (
        typeof checklist.id === 'string' &&
        typeof checklist.name === 'string' &&
        Array.isArray(checklist.completedObjectIds)
      )
    })
    .map((checklist) => ({
      id: checklist.id,
      name: checklist.name,
      completedObjectIds: checklist.completedObjectIds.filter(
        (objectId): objectId is string => typeof objectId === 'string',
      ),
    }))

  return checklists.length > 0 ? checklists : defaultChecklists
}

// 空的 activeCategories 表示不显示任何点位；用户勾选一个或多个分类后才渲染对应对象。
export const useMapUiStore = create<MapUiState>()(
  persist(
    (set) => ({
  activeSidebarPanel: 'filter',
  sidebarSide: 'left',
  sidebarCollapsed: false,
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
  favoriteObjectIds: [],
  checklists: defaultChecklists,
  activeChecklistId: 'default',
  completedMarkerMode: 'show',
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
  showKorokIds: false,
  inGameCoordinates: false,
  customSearchPresets: [],
  copyCoordinatesXYZ: false,
  // 切换侧栏工作区；选择任一面板时自动展开侧栏。
  setActiveSidebarPanel: (panel) =>
    set({
      activeSidebarPanel: panel,
      sidebarCollapsed: false,
    }),
  // 设置侧栏停靠方向；用于在左右布局之间切换。
  setSidebarSide: (side) =>
    set({
      sidebarSide: side,
    }),
  // 折叠或展开侧栏内容区，保留左侧 rail。
  setSidebarCollapsed: (isCollapsed) =>
    set({
      sidebarCollapsed: isCollapsed,
    }),
  // 切换当前地图层；同时清空选中对象，避免详情指向旧图层对象。
  setActiveLayer: (layer) =>
    set({
      activeLayer: layer,
      selectedObjectId: null,
    }),
  // 切换底图瓦片来源。
  setTileSource: (source) =>
    set({
      tileSource: source,
    }),
  // 切换对象数据来源；同时清空选中对象，避免详情引用旧数据源对象。
  setObjectSource: (source) =>
    set({
      objectSource: source,
      selectedObjectId: null,
    }),
  // 切换地图区域覆盖层。
  setActiveMapArea: (mapArea) =>
    set({
      activeMapArea: mapArea,
    }),
  // 更新区域编号过滤输入。
  setMapAreaFilter: (filter) =>
    set({
      mapAreaFilter: filter,
    }),
  // 控制区域覆盖层是否填充颜色。
  setMapAreaFill: (shouldFill) =>
    set({
      mapAreaFill: shouldFill,
    }),
  // 切换分类选中状态；新增分类时可同步切到该分类推荐图层。
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
  // 清空全部分类选择，并清空当前对象详情。
  clearCategories: () =>
    set({
      activeCategories: [],
      selectedObjectId: null,
    }),
  // 更新搜索词；对象筛选 hook 会基于该值重新计算结果。
  setQuery: (query) =>
    set({
      query,
    }),
  // 设置当前选中对象；传 null 可清空详情面板。
  selectObject: (objectId) =>
    set({
      selectedObjectId: objectId,
    }),
  // 固定或取消固定单个对象到地图显示。
  togglePinnedObject: (objectId) =>
    set((state) => {
      const isPinned = state.pinnedObjectIds.includes(objectId)

      return {
        pinnedObjectIds: isPinned
          ? state.pinnedObjectIds.filter((id) => id !== objectId)
          : [...state.pinnedObjectIds, objectId],
      }
    }),
  // 批量固定对象；被固定的对象会从隐藏列表中移除。
  pinObjects: (objectIds) =>
    set((state) => {
      const nextPinnedObjectIds = new Set(state.pinnedObjectIds)
      const nextHiddenObjectIds = new Set(state.hiddenObjectIds)

      for (const objectId of objectIds) {
        nextPinnedObjectIds.add(objectId)
        nextHiddenObjectIds.delete(objectId)
      }

      return {
        pinnedObjectIds: [...nextPinnedObjectIds],
        hiddenObjectIds: [...nextHiddenObjectIds],
      }
    }),
  // 隐藏单个对象；隐藏时同时取消固定并清空对应选中详情。
  hideObject: (objectId) =>
    set((state) => ({
      hiddenObjectIds: state.hiddenObjectIds.includes(objectId)
        ? state.hiddenObjectIds
        : [...state.hiddenObjectIds, objectId],
      pinnedObjectIds: state.pinnedObjectIds.filter((id) => id !== objectId),
      selectedObjectId: state.selectedObjectId === objectId ? null : state.selectedObjectId,
    })),
  // 批量隐藏对象；隐藏对象会从固定列表移除，并清空受影响的选中详情。
  hideObjects: (objectIds) =>
    set((state) => {
      const objectIdSet = new Set(objectIds)
      const nextHiddenObjectIds = new Set(state.hiddenObjectIds)

      for (const objectId of objectIdSet) {
        nextHiddenObjectIds.add(objectId)
      }

      return {
        hiddenObjectIds: [...nextHiddenObjectIds],
        pinnedObjectIds: state.pinnedObjectIds.filter((id) => !objectIdSet.has(id)),
        selectedObjectId:
          state.selectedObjectId && objectIdSet.has(state.selectedObjectId)
            ? null
            : state.selectedObjectId,
      }
    }),
  // 切换单个对象收藏状态；当前仅提供持久化数据位，UI 后续接入。
  toggleFavoriteObject: (objectId) =>
    set((state) => {
      const isFavorite = state.favoriteObjectIds.includes(objectId)

      return {
        favoriteObjectIds: isFavorite
          ? state.favoriteObjectIds.filter((id) => id !== objectId)
          : [...state.favoriteObjectIds, objectId],
      }
    }),
  // 清空全部收藏对象。
  clearFavoriteObjects: () =>
    set({
      favoriteObjectIds: [],
    }),
  // 清空全部固定对象。
  clearPinnedObjects: () =>
    set({
      pinnedObjectIds: [],
    }),
  // 清空全部隐藏对象。
  clearHiddenObjects: () =>
    set({
      hiddenObjectIds: [],
    }),
  // 新建 checklist 并立即切换为当前列表。
  createChecklist: () =>
    set((state) => {
      const nextIndex = state.checklists.length + 1
      const checklist: Checklist = {
        id: `list-${Date.now()}-${nextIndex}`,
        name: `List ${nextIndex}`,
        completedObjectIds: [],
      }

      return {
        checklists: [...state.checklists, checklist],
        activeChecklistId: checklist.id,
      }
    }),
  // 切换当前 checklist；忽略不存在的 checklist id。
  setActiveChecklist: (checklistId) =>
    set((state) => ({
      activeChecklistId: state.checklists.some((checklist) => checklist.id === checklistId)
        ? checklistId
        : state.activeChecklistId,
    })),
  // 清空当前 checklist 的 completed markers。
  resetActiveChecklist: () =>
    set((state) => ({
      checklists: state.checklists.map((checklist) =>
        checklist.id === state.activeChecklistId
          ? { ...checklist, completedObjectIds: [] }
          : checklist,
      ),
    })),
  // 切换当前 checklist 中单个对象的 completed 状态。
  toggleChecklistObject: (objectId) =>
    set((state) => ({
      checklists: state.checklists.map((checklist) => {
        if (checklist.id !== state.activeChecklistId) {
          return checklist
        }

        const isCompleted = checklist.completedObjectIds.includes(objectId)

        return {
          ...checklist,
          completedObjectIds: isCompleted
            ? checklist.completedObjectIds.filter((id) => id !== objectId)
            : [...checklist.completedObjectIds, objectId],
        }
      }),
    })),
  // 设置 completed markers 在地图和结果中的显示策略。
  setCompletedMarkerMode: (mode) =>
    set({
      completedMarkerMode: mode,
    }),
  // 控制地图状态条显示。
  setShowMapStatusBar: (shouldShow) =>
    set({
      showMapStatusBar: shouldShow,
    }),
  // 控制 marker hover tooltip 显示。
  setShowMarkerTooltips: (shouldShow) =>
    set({
      showMarkerTooltips: shouldShow,
    }),
  // 控制 marker hover 高亮效果。
  setEnableMarkerHoverEffects: (shouldEnable) =>
    set({
      enableMarkerHoverEffects: shouldEnable,
    }),
  // 控制对象详情中的高级信息是否默认展开。
  setDefaultAdvancedDetailsOpen: (shouldOpen) =>
    set({
      defaultAdvancedDetailsOpen: shouldOpen,
    }),
  // 切换远程 radar 搜索地图类型；同时重置地图名和选中对象。
  setSearchMapType: (mapType) =>
    set({
      searchMapType: mapType,
      searchMapName: '',
      selectedObjectId: null,
    }),
  // 切换远程 radar 搜索地图名；同时清空选中对象。
  setSearchMapName: (mapName) =>
    set({
      searchMapName: mapName,
      selectedObjectId: null,
    }),
  // 切换对象颜色模式是否按 Actor 类型上色。
  setColorPerActor: (shouldColorPerActor) =>
    set({
      colorPerActor: shouldColorPerActor,
    }),
  // 控制对象标题是否显示内部 Actor 名称。
  setUseActorNames: (shouldUse) =>
    set({
      useActorNames: shouldUse,
    }),
  // 控制 hash ID 是否用十六进制显示。
  setUseHexForHashIds: (shouldUse) =>
    set({
      useHexForHashIds: shouldUse,
    }),
  // 控制 marker tooltip 是否显示对象高度。
  setShowObjectHeightsInTooltips: (shouldShow) =>
    set({
      showObjectHeightsInTooltips: shouldShow,
    }),
  // 控制 Korok tooltip 是否显示 Korok 编号。
  setShowKorokIds: (shouldShow) =>
    set({
      showKorokIds: shouldShow,
    }),
  // 控制详情坐标是否使用游戏内坐标顺序。
  setInGameCoordinates: (shouldUse) =>
    set({
      inGameCoordinates: shouldUse,
    }),
  // 新增一条空白自定义搜索预设。
  addCustomSearchPreset: () =>
    set((state) => ({
      customSearchPresets: [...state.customSearchPresets, { label: '', query: '' }],
    })),
  // 更新指定位置的自定义搜索预设。
  updateCustomSearchPreset: (index, preset) =>
    set((state) => ({
      customSearchPresets: state.customSearchPresets.map((item, itemIndex) =>
        itemIndex === index ? preset : item,
      ),
    })),
  // 删除指定位置的自定义搜索预设。
  removeCustomSearchPreset: (index) =>
    set((state) => ({
      customSearchPresets: state.customSearchPresets.filter((_, itemIndex) => itemIndex !== index),
    })),
  // 控制右键复制坐标时是否使用三维坐标格式。
  setCopyCoordinatesXYZ: (shouldCopyXYZ) =>
    set({
      copyCoordinatesXYZ: shouldCopyXYZ,
    }),
}),
    {
      name: MAP_UI_STORAGE_KEY,
      version: MAP_UI_STORAGE_VERSION,
      storage: createJSONStorage(createMapUiStorage),
      partialize: (state) => ({
        activeSidebarPanel: state.activeSidebarPanel,
        sidebarSide: state.sidebarSide,
        sidebarCollapsed: state.sidebarCollapsed,
        activeLayer: state.activeLayer,
        tileSource: state.tileSource,
        objectSource: state.objectSource,
        activeMapArea: state.activeMapArea,
        mapAreaFilter: state.mapAreaFilter,
        mapAreaFill: state.mapAreaFill,
        activeCategories: state.activeCategories,
        pinnedObjectIds: state.pinnedObjectIds,
        hiddenObjectIds: state.hiddenObjectIds,
        favoriteObjectIds: state.favoriteObjectIds,
        checklists: state.checklists,
        activeChecklistId: state.activeChecklistId,
        completedMarkerMode: state.completedMarkerMode,
        showMapStatusBar: state.showMapStatusBar,
        showMarkerTooltips: state.showMarkerTooltips,
        enableMarkerHoverEffects: state.enableMarkerHoverEffects,
        defaultAdvancedDetailsOpen: state.defaultAdvancedDetailsOpen,
        searchMapType: state.searchMapType,
        searchMapName: state.searchMapName,
        colorPerActor: state.colorPerActor,
        useActorNames: state.useActorNames,
        useHexForHashIds: state.useHexForHashIds,
        showObjectHeightsInTooltips: state.showObjectHeightsInTooltips,
        showKorokIds: state.showKorokIds,
        inGameCoordinates: state.inGameCoordinates,
        customSearchPresets: state.customSearchPresets,
        copyCoordinatesXYZ: state.copyCoordinatesXYZ,
      }),
      migrate: (persistedState) => normalizePersistedState(persistedState),
    },
  ),
)
