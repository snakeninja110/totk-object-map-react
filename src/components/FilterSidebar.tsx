import {
  CircleCheck,
  EyeOff,
  Funnel,
  HelpCircle,
  ListChecks,
  Pin,
  Plus,
  Search,
  Settings,
  Trash2,
  Wrench,
  Waypoints,
} from 'lucide-react'
import {
  categoryIconAssets,
  categoryIcons,
  categoryLabels,
  categoryOrder,
  categoryPreferredLayers,
  mapAreaOptions,
  searchMapNameOptions,
  searchMapTypeOptions,
  searchPresets,
} from '../constants/mapConfig'
import type {
  MapAreaId,
  MapLayer,
  MapObject,
  ObjectDataSource,
  SearchMapType,
  SearchPreset,
  TileSource,
} from '../types/map'
import { VirtualResultList } from './VirtualResultList'

type SidebarPanel = 'filter' | 'settings'

type FilterSidebarProps = {
  // 当前左侧功能面板；filter 展示筛选，settings 展示页面设置。
  activeSidebarPanel: SidebarPanel
  // 当前地图层；控制 Layer 分段按钮的选中状态。
  activeLayer: MapLayer
  // 当前瓦片来源；控制 Local/Remote tiles 按钮的选中状态。
  tileSource: TileSource
  // 当前对象数据来源；控制 Local Data/Remote API 按钮和状态文案。
  objectSource: ObjectDataSource
  // 搜索框内容；由上层 store 维护，输入变化会驱动对象搜索或远程查询。
  query: string
  // 对象数据加载失败信息；存在时以错误样式显示在数据源区域。
  objectsError: string | null
  // 对象数据加载状态文案；统一由 useObjectData 根据来源、搜索词和错误生成。
  objectStatusText: string
  // 当前启用的区域覆盖层；控制 Visible map areas 单选项，并驱动地图覆盖层加载。
  activeMapArea: MapAreaId
  // 区域编号过滤输入；兼容源站按编号筛选区域的交互。
  mapAreaFilter: string
  // 是否填充区域覆盖层；关闭后地图只显示区域边界线。
  mapAreaFill: boolean
  // 当前已选分类集合；用于高亮分类按钮，并决定地图上实际显示哪些对象。
  selectedCategorySet: Set<MapObject['category']>
  // 当前固定显示的对象 ID 集合；固定对象会绕过分类和搜索限制显示在地图上。
  pinnedObjectSet: Set<string>
  // 当前临时隐藏的对象 ID 集合；用于展示隐藏数量和清空隐藏状态。
  hiddenObjectSet: Set<string>
  // 是否显示地图状态条；Settings 面板开关会控制地图右上角状态信息。
  showMapStatusBar: boolean
  // 是否显示 marker hover tooltip。
  showMarkerTooltips: boolean
  // 是否启用 marker hover 发光和圆点放大。
  enableMarkerHoverEffects: boolean
  // 是否默认展开右侧详情面板的 Advanced details。
  defaultAdvancedDetailsOpen: boolean
  // 远程 radar 搜索地图类型；只影响 Remote API 搜索。
  searchMapType: SearchMapType
  // 远程 radar 搜索地图名；空字符串表示 All。
  searchMapName: string
  // 是否按 Actor 类型给圆点 marker 上色。
  colorPerActor: boolean
  // 是否使用内部 Actor 名称显示对象标题。
  useActorNames: boolean
  // 是否用十六进制显示 hash ID。
  useHexForHashIds: boolean
  // 是否在 marker tooltip 中显示高度。
  showObjectHeightsInTooltips: boolean
  // 是否用游戏内坐标顺序显示坐标。
  inGameCoordinates: boolean
  // 用户自定义搜索预设。
  customSearchPresets: SearchPreset[]
  // 右键复制坐标时是否复制三维坐标。
  copyCoordinatesXYZ: boolean
  // 每个分类在当前图层和当前搜索条件下的计数；用于分类按钮右侧数字。
  categoryCounts: Record<MapObject['category'], number>
  // 已通过图层、分类、搜索和源站规则筛选的对象；用于显示结果总数。
  visibleObjects: MapObject[]
  // 侧边栏结果列表的数据源；实际 DOM 数量由 VirtualResultList 按滚动位置控制。
  resultListObjects: MapObject[]
  // 当前详情面板选中的对象；用于在结果列表中高亮对应项。
  selectedObject: MapObject | null
  // 切换左侧功能面板。
  setActiveSidebarPanel: (panel: SidebarPanel) => void
  // 切换地图层；由 Layer 分段按钮触发。
  setActiveLayer: (layer: MapLayer) => void
  // 切换瓦片来源；只影响底图瓦片，不影响对象数据来源。
  setTileSource: (source: TileSource) => void
  // 切换对象数据来源；Local Data 使用本地索引，Remote API 使用远程静态/搜索接口。
  setObjectSource: (source: ObjectDataSource) => void
  // 切换分类选中状态；部分分类可传 preferredLayer 来同步切换到更合适的图层。
  toggleCategory: (category: MapObject['category'], preferredLayer?: MapLayer) => void
  // 清空所有分类；清空后地图不显示任何点位。
  clearCategories: () => void
  // 更新搜索词；Local 模式走 Fuse，本地无搜索词时按源站静态分类规则展示。
  setQuery: (query: string) => void
  // 切换区域覆盖层；None 会清空地图区域渲染。
  setActiveMapArea: (mapArea: MapAreaId) => void
  // 更新区域编号过滤词；输入为空时显示当前区域图层的全部区域。
  setMapAreaFilter: (filter: string) => void
  // 切换区域填充状态；用于在强调范围和查看底图细节之间切换。
  setMapAreaFill: (shouldFill: boolean) => void
  // 选中对象并驱动右侧详情面板更新。
  selectObject: (id: string) => void
  // 固定或取消固定对象；固定对象仍遵守当前地图图层。
  togglePinnedObject: (id: string) => void
  // 临时隐藏对象；隐藏后对象不再出现在结果列表和地图上。
  hideObject: (id: string) => void
  // 清空全部固定对象。
  clearPinnedObjects: () => void
  // 清空全部隐藏对象。
  clearHiddenObjects: () => void
  // 切换地图状态条显示。
  setShowMapStatusBar: (shouldShow: boolean) => void
  // 切换 marker hover tooltip。
  setShowMarkerTooltips: (shouldShow: boolean) => void
  // 切换 marker hover 高亮效果。
  setEnableMarkerHoverEffects: (shouldEnable: boolean) => void
  // 切换高级详情默认展开状态。
  setDefaultAdvancedDetailsOpen: (shouldOpen: boolean) => void
  // 设置远程 radar 搜索地图类型。
  setSearchMapType: (mapType: SearchMapType) => void
  // 设置远程 radar 搜索地图名。
  setSearchMapName: (mapName: string) => void
  // 切换按 Actor 类型上色。
  setColorPerActor: (shouldColorPerActor: boolean) => void
  // 切换内部 Actor 名称显示。
  setUseActorNames: (shouldUse: boolean) => void
  // 切换 hash ID 十六进制显示。
  setUseHexForHashIds: (shouldUse: boolean) => void
  // 切换 tooltip 高度显示。
  setShowObjectHeightsInTooltips: (shouldShow: boolean) => void
  // 切换游戏内坐标显示。
  setInGameCoordinates: (shouldUse: boolean) => void
  // 新增一条空白自定义搜索预设。
  addCustomSearchPreset: () => void
  // 更新指定自定义搜索预设。
  updateCustomSearchPreset: (index: number, preset: SearchPreset) => void
  // 删除指定自定义搜索预设。
  removeCustomSearchPreset: (index: number) => void
  // 切换三维坐标复制格式。
  setCopyCoordinatesXYZ: (shouldCopyXYZ: boolean) => void
}

// 左侧筛选面板组件；只负责交互呈现，数据加载和可见对象计算由上层 hook 提供。
// 这里刻意保持为“受控组件”：所有状态和回调都从 App 传入，避免侧边栏内部再分叉数据来源逻辑。
export function FilterSidebar({
  activeSidebarPanel,
  activeLayer,
  tileSource,
  objectSource,
  query,
  objectsError,
  objectStatusText,
  activeMapArea,
  mapAreaFilter,
  mapAreaFill,
  selectedCategorySet,
  pinnedObjectSet,
  hiddenObjectSet,
  showMapStatusBar,
  showMarkerTooltips,
  enableMarkerHoverEffects,
  defaultAdvancedDetailsOpen,
  searchMapType,
  searchMapName,
  colorPerActor,
  useActorNames,
  useHexForHashIds,
  showObjectHeightsInTooltips,
  inGameCoordinates,
  customSearchPresets,
  copyCoordinatesXYZ,
  categoryCounts,
  visibleObjects,
  resultListObjects,
  selectedObject,
  setActiveSidebarPanel,
  setActiveLayer,
  setTileSource,
  setObjectSource,
  toggleCategory,
  clearCategories,
  setQuery,
  setActiveMapArea,
  setMapAreaFilter,
  setMapAreaFill,
  selectObject,
  togglePinnedObject,
  hideObject,
  clearPinnedObjects,
  clearHiddenObjects,
  setShowMapStatusBar,
  setShowMarkerTooltips,
  setEnableMarkerHoverEffects,
  setDefaultAdvancedDetailsOpen,
  setSearchMapType,
  setSearchMapName,
  setColorPerActor,
  setUseActorNames,
  setUseHexForHashIds,
  setShowObjectHeightsInTooltips,
  setInGameCoordinates,
  addCustomSearchPreset,
  updateCustomSearchPreset,
  removeCustomSearchPreset,
  setCopyCoordinatesXYZ,
}: FilterSidebarProps) {
  return (
    <aside className="sidebar filter-sidebar" aria-label="Map controls">
      <nav className="filter-rail" aria-label="Filter sections">
        <Search size={28} />
        <button
          type="button"
          className={activeSidebarPanel === 'filter' ? 'active' : ''}
          aria-label="Filter panel"
          onClick={() => setActiveSidebarPanel('filter')}
        >
          <Funnel size={28} />
        </button>
        <ListChecks size={28} />
        <Waypoints size={28} />
        <CircleCheck size={28} />
        <Wrench size={28} />
        <button
          type="button"
          className={activeSidebarPanel === 'settings' ? 'active' : ''}
          aria-label="Settings panel"
          onClick={() => setActiveSidebarPanel('settings')}
        >
          <Settings size={28} />
        </button>
      </nav>

      <div className="filter-panel">
        {activeSidebarPanel === 'filter' ? (
          <>
            <header className="filter-header">
              <h1>Filter</h1>
              <button type="button" onClick={clearCategories}>
                Clear tags
              </button>
            </header>

            <label className="search-box">
              <Search size={17} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search name, actor, tag"
              />
            </label>

            <section className="search-tools" aria-label="Search tools">
          <div className="search-presets" aria-label="Search presets">
            {[...searchPresets, ...customSearchPresets.filter(isValidPreset)].map((preset) => (
              <button
                key={preset.label}
                type="button"
                className={query === preset.query ? 'active' : ''}
                onClick={() => setQuery(preset.query)}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <details className="search-help">
            <summary>
              <HelpCircle size={17} />
              Search syntax
            </summary>
            <div>
              <p>Combine plain words with field filters. Every field filter must match.</p>
              <code>category:chest drop:Arrow layer:Surface</code>
              <ul>
                <li>
                  <strong>actor</strong>
                  <span>Actor name, for example actor:TBox</span>
                </li>
                <li>
                  <strong>category</strong>
                  <span>chest, shrine, cave, enemy, weapon...</span>
                </li>
                <li>
                  <strong>drop</strong>
                  <span>Chest contents or enemy drops</span>
                </li>
                <li>
                  <strong>map</strong>
                  <span>Map unit or field area, for example map:A-1</span>
                </li>
                <li>
                  <strong>hash</strong>
                  <span>Object hash or objid</span>
                </li>
                <li>
                  <strong>layer</strong>
                  <span>Sky, Surface, or Depths</span>
                </li>
              </ul>
            </div>
          </details>
            </section>

            <section className="object-overrides" aria-label="Pinned and hidden objects">
          <span>
            <Pin size={16} />
            {pinnedObjectSet.size} pinned
          </span>
          <button
            type="button"
            disabled={pinnedObjectSet.size === 0}
            onClick={clearPinnedObjects}
          >
            Clear
          </button>
          <span>
            <EyeOff size={16} />
            {hiddenObjectSet.size} hidden
          </span>
          <button
            type="button"
            disabled={hiddenObjectSet.size === 0}
            onClick={clearHiddenObjects}
          >
            Show all
          </button>
            </section>

            <section className="control-group" aria-labelledby="layer-heading">
          <h2 id="layer-heading">Layer</h2>
          <div className="segmented">
            {(['Sky', 'Surface', 'Depths'] as const).map((layer) => (
              <button
                key={layer}
                type="button"
                className={layer === activeLayer ? 'active' : ''}
                onClick={() => setActiveLayer(layer)}
              >
                {layer}
              </button>
            ))}
          </div>
            </section>

            <section className="control-group" aria-labelledby="tile-source-heading">
          <h2 id="tile-source-heading">Tile source</h2>
          <div className="segmented source-switch">
            {(['local', 'remote'] as const).map((source) => (
              <button
                key={source}
                type="button"
                className={source === tileSource ? 'active' : ''}
                onClick={() => setTileSource(source)}
              >
                {source === 'local' ? 'Local' : 'Remote'}
              </button>
            ))}
          </div>
            </section>

            <section className="control-group" aria-labelledby="object-source-heading">
          <h2 id="object-source-heading">Object data</h2>
          <div className="segmented source-switch">
            {(['local', 'remote'] as const).map((source) => (
              <button
                key={source}
                type="button"
                className={source === objectSource ? 'active' : ''}
                onClick={() => setObjectSource(source)}
              >
                {source === 'local' ? 'Local Data' : 'Remote API'}
              </button>
            ))}
          </div>
          <p className={objectsError ? 'data-status error' : 'data-status'}>
            {objectStatusText}
          </p>
            </section>

            <section className="control-group" aria-labelledby="category-heading">
          <div className="category-grid">
            {categoryOrder.map((category) => {
              const Icon = categoryIcons[category]
              const iconAsset = categoryIconAssets[category]
              const isSelected = selectedCategorySet.has(category)
              const count = categoryCounts[category]

              return (
                <button
                  type="button"
                  className={`category-tile ${isSelected ? 'active' : ''}`}
                  aria-pressed={isSelected}
                  onClick={() => toggleCategory(category, categoryPreferredLayers[category])}
                  key={category}
                >
                  <span className="category-icon">
                    {iconAsset ? <img src={iconAsset} alt="" /> : <Icon size={28} />}
                  </span>
                  <span>{categoryLabels[category]}</span>
                  <strong>{count}</strong>
                </button>
              )
            })}
          </div>
            </section>

            <section className="map-area-panel" aria-labelledby="map-area-heading">
          <h2 id="map-area-heading">Visible map areas</h2>
          {mapAreaOptions.map((item) => (
            <label key={item.id} className="map-area-option">
              <input
                type="radio"
                name="map-area"
                checked={activeMapArea === item.id}
                onChange={() => setActiveMapArea(item.id)}
              />
              <span>{item.label}</span>
            </label>
          ))}
          <label className="map-area-filter">
            <span>Filter map areas</span>
            <div>
              <input
                value={mapAreaFilter}
                onChange={(event) => setMapAreaFilter(event.target.value)}
                placeholder="Example: 1,2,3,64"
              />
              <button type="button" aria-label="Apply map area filter">
                <Funnel size={22} />
              </button>
            </div>
          </label>
          <label className="map-area-fill">
            <input
              type="checkbox"
              checked={mapAreaFill}
              onChange={(event) => setMapAreaFill(event.target.checked)}
            />
            <span>Fill map areas with color</span>
          </label>
            </section>

            <section className="results" aria-labelledby="results-heading">
              <h2 id="results-heading">{visibleObjects.length} visible</h2>
              <VirtualResultList
                objects={resultListObjects}
                selectedObjectId={selectedObject?.id ?? null}
                pinnedObjectSet={pinnedObjectSet}
                useActorNames={useActorNames}
                onSelect={selectObject}
                onTogglePinned={togglePinnedObject}
                onHide={hideObject}
              />
            </section>
          </>
        ) : (
          <SettingsPanel
            activeLayer={activeLayer}
            tileSource={tileSource}
            objectSource={objectSource}
            visibleObjectCount={visibleObjects.length}
            pinnedObjectCount={pinnedObjectSet.size}
            hiddenObjectCount={hiddenObjectSet.size}
            showMapStatusBar={showMapStatusBar}
            showMarkerTooltips={showMarkerTooltips}
            enableMarkerHoverEffects={enableMarkerHoverEffects}
            defaultAdvancedDetailsOpen={defaultAdvancedDetailsOpen}
            searchMapType={searchMapType}
            searchMapName={searchMapName}
            colorPerActor={colorPerActor}
            useActorNames={useActorNames}
            useHexForHashIds={useHexForHashIds}
            showObjectHeightsInTooltips={showObjectHeightsInTooltips}
            inGameCoordinates={inGameCoordinates}
            customSearchPresets={customSearchPresets}
            copyCoordinatesXYZ={copyCoordinatesXYZ}
            setShowMapStatusBar={setShowMapStatusBar}
            setShowMarkerTooltips={setShowMarkerTooltips}
            setEnableMarkerHoverEffects={setEnableMarkerHoverEffects}
            setDefaultAdvancedDetailsOpen={setDefaultAdvancedDetailsOpen}
            setSearchMapType={setSearchMapType}
            setSearchMapName={setSearchMapName}
            setColorPerActor={setColorPerActor}
            setUseActorNames={setUseActorNames}
            setUseHexForHashIds={setUseHexForHashIds}
            setShowObjectHeightsInTooltips={setShowObjectHeightsInTooltips}
            setInGameCoordinates={setInGameCoordinates}
            addCustomSearchPreset={addCustomSearchPreset}
            updateCustomSearchPreset={updateCustomSearchPreset}
            removeCustomSearchPreset={removeCustomSearchPreset}
            setCopyCoordinatesXYZ={setCopyCoordinatesXYZ}
          />
        )}
      </div>
    </aside>
  )
}

function SettingsPanel({
  activeLayer,
  tileSource,
  objectSource,
  visibleObjectCount,
  pinnedObjectCount,
  hiddenObjectCount,
  showMapStatusBar,
  showMarkerTooltips,
  enableMarkerHoverEffects,
  defaultAdvancedDetailsOpen,
  searchMapType,
  searchMapName,
  colorPerActor,
  useActorNames,
  useHexForHashIds,
  showObjectHeightsInTooltips,
  inGameCoordinates,
  customSearchPresets,
  copyCoordinatesXYZ,
  setShowMapStatusBar,
  setShowMarkerTooltips,
  setEnableMarkerHoverEffects,
  setDefaultAdvancedDetailsOpen,
  setSearchMapType,
  setSearchMapName,
  setColorPerActor,
  setUseActorNames,
  setUseHexForHashIds,
  setShowObjectHeightsInTooltips,
  setInGameCoordinates,
  addCustomSearchPreset,
  updateCustomSearchPreset,
  removeCustomSearchPreset,
  setCopyCoordinatesXYZ,
}: {
  // 当前地图层；用于设置页状态摘要。
  activeLayer: MapLayer
  // 当前瓦片来源；用于设置页状态摘要。
  tileSource: TileSource
  // 当前对象数据来源；用于设置页状态摘要。
  objectSource: ObjectDataSource
  // 当前可见对象数；帮助用户判断设置对地图显示的影响。
  visibleObjectCount: number
  // 当前固定对象数量。
  pinnedObjectCount: number
  // 当前隐藏对象数量。
  hiddenObjectCount: number
  // 是否显示地图状态条。
  showMapStatusBar: boolean
  // 是否显示 marker hover tooltip。
  showMarkerTooltips: boolean
  // 是否启用 marker hover 高亮。
  enableMarkerHoverEffects: boolean
  // 是否默认展开高级详情。
  defaultAdvancedDetailsOpen: boolean
  // 远程 radar 搜索地图类型。
  searchMapType: SearchMapType
  // 远程 radar 搜索地图名。
  searchMapName: string
  // 是否按 Actor 类型上色。
  colorPerActor: boolean
  // 是否显示内部 Actor 名称。
  useActorNames: boolean
  // 是否用十六进制显示 hash ID。
  useHexForHashIds: boolean
  // 是否在 tooltip 中显示对象高度。
  showObjectHeightsInTooltips: boolean
  // 是否用游戏内坐标格式。
  inGameCoordinates: boolean
  // 用户自定义搜索预设。
  customSearchPresets: SearchPreset[]
  // 是否复制三维坐标。
  copyCoordinatesXYZ: boolean
  // 切换地图状态条显示。
  setShowMapStatusBar: (shouldShow: boolean) => void
  // 切换 marker hover tooltip。
  setShowMarkerTooltips: (shouldShow: boolean) => void
  // 切换 marker hover 高亮。
  setEnableMarkerHoverEffects: (shouldEnable: boolean) => void
  // 切换高级详情默认展开。
  setDefaultAdvancedDetailsOpen: (shouldOpen: boolean) => void
  // 设置远程搜索地图类型。
  setSearchMapType: (mapType: SearchMapType) => void
  // 设置远程搜索地图名。
  setSearchMapName: (mapName: string) => void
  // 切换按 Actor 类型上色。
  setColorPerActor: (shouldColorPerActor: boolean) => void
  // 切换内部 Actor 名称。
  setUseActorNames: (shouldUse: boolean) => void
  // 切换十六进制 hash ID。
  setUseHexForHashIds: (shouldUse: boolean) => void
  // 切换 tooltip 高度显示。
  setShowObjectHeightsInTooltips: (shouldShow: boolean) => void
  // 切换游戏内坐标格式。
  setInGameCoordinates: (shouldUse: boolean) => void
  // 新增自定义搜索预设。
  addCustomSearchPreset: () => void
  // 更新自定义搜索预设。
  updateCustomSearchPreset: (index: number, preset: SearchPreset) => void
  // 删除自定义搜索预设。
  removeCustomSearchPreset: (index: number) => void
  // 切换三维坐标复制格式。
  setCopyCoordinatesXYZ: (shouldCopyXYZ: boolean) => void
}) {
  const mapNameOptions = searchMapNameOptions[searchMapType]

  return (
    <>
      <header className="filter-header">
        <h1>Settings</h1>
      </header>

      <section className="settings-section" aria-label="Search map settings">
        <h2>Map</h2>
        <select
          value={searchMapType}
          onChange={(event) => setSearchMapType(event.target.value as SearchMapType)}
        >
          {searchMapTypeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select value={searchMapName} onChange={(event) => setSearchMapName(event.target.value)}>
          {mapNameOptions.map((option) => (
            <option key={option.value || 'all'} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <p>This setting only affects Remote API search. Objects still use the main Hyrule map.</p>
      </section>

      <section className="settings-section" aria-label="Object color mode">
        <h2>Object Color Mode</h2>
        <label className="settings-radio">
          <input
            type="radio"
            name="object-color-mode"
            checked={colorPerActor}
            onChange={() => setColorPerActor(true)}
          />
          <span>Color by actor type</span>
        </label>
        <label className="settings-radio">
          <input
            type="radio"
            name="object-color-mode"
            checked={!colorPerActor}
            onChange={() => setColorPerActor(false)}
          />
          <span>Color by search group</span>
        </label>
      </section>

      <section className="settings-section" aria-label="Object display settings">
        <h2>Object Display</h2>
        <p>Some changes only take effect after visible markers rerender.</p>
        <SettingsToggle
          checked={useActorNames}
          label="Use internal actor names"
          onChange={setUseActorNames}
        />
        <SettingsToggle
          checked={useHexForHashIds}
          label="Show hash IDs in hex"
          onChange={setUseHexForHashIds}
        />
        <SettingsToggle
          checked={showObjectHeightsInTooltips}
          label="Show object heights in tooltips"
          onChange={setShowObjectHeightsInTooltips}
        />
      </section>

      <section className="settings-section" aria-label="In-game coordinate settings">
        <h2>Use In-Game Coordinates</h2>
        <SettingsToggle
          checked={inGameCoordinates}
          label="Display Coordinates as those In-Game"
          onChange={setInGameCoordinates}
        />
        <p>
          Coordinates here are displayed as East-West, Vertical, North-South (x,z,y). This
          option converts them to East-West, North-South, Vertical - 106 meters (x,y,z).
        </p>
      </section>

      <section className="settings-section" aria-label="Custom search presets">
        <h2>Custom Search Presets</h2>
        <div className="custom-search-presets">
          {customSearchPresets.map((preset, index) => (
            <div key={index} className="custom-search-preset">
              <input
                value={preset.label}
                placeholder="Label"
                onChange={(event) =>
                  updateCustomSearchPreset(index, {
                    ...preset,
                    label: event.target.value,
                  })
                }
              />
              <input
                value={preset.query}
                placeholder="Query"
                onChange={(event) =>
                  updateCustomSearchPreset(index, {
                    ...preset,
                    query: event.target.value,
                  })
                }
              />
              <button
                type="button"
                aria-label="Remove custom search preset"
                onClick={() => removeCustomSearchPreset(index)}
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>
        <button type="button" className="settings-add-button" onClick={addCustomSearchPreset}>
          <Plus size={20} />
          Add
        </button>
      </section>

      <section className="settings-section" aria-label="Copy coordinates settings">
        <h2>Copy Coordinates</h2>
        <SettingsToggle
          checked={copyCoordinatesXYZ}
          label="Copy (x,y,z) instead of (x,z)."
          onChange={setCopyCoordinatesXYZ}
        />
        <p>
          This setting is stored now; it will apply to the map context menu after the right-click
          coordinate copy action is implemented.
        </p>
      </section>

      <section className="settings-section" aria-label="Local UI settings">
        <h2>Local UI</h2>
        <SettingsToggle
          checked={showMapStatusBar}
          label="Map status bar"
          onChange={setShowMapStatusBar}
        />
        <SettingsToggle
          checked={showMarkerTooltips}
          label="Marker hover tooltip"
          onChange={setShowMarkerTooltips}
        />
        <SettingsToggle
          checked={enableMarkerHoverEffects}
          label="Marker hover glow"
          onChange={setEnableMarkerHoverEffects}
        />
        <SettingsToggle
          checked={defaultAdvancedDetailsOpen}
          label="Open advanced details"
          onChange={setDefaultAdvancedDetailsOpen}
        />
      </section>

      <section className="settings-status" aria-label="Current map state">
        <h2>Current state</h2>
        <dl>
          <div>
            <dt>Layer</dt>
            <dd>{activeLayer}</dd>
          </div>
          <div>
            <dt>Tiles</dt>
            <dd>{tileSource === 'local' ? 'Local' : 'Remote'}</dd>
          </div>
          <div>
            <dt>Objects</dt>
            <dd>{objectSource === 'local' ? 'Local data' : 'Remote API'}</dd>
          </div>
          <div>
            <dt>Visible</dt>
            <dd>{visibleObjectCount}</dd>
          </div>
          <div>
            <dt>Pinned</dt>
            <dd>{pinnedObjectCount}</dd>
          </div>
          <div>
            <dt>Hidden</dt>
            <dd>{hiddenObjectCount}</dd>
          </div>
        </dl>
      </section>
    </>
  )
}

function SettingsToggle({
  checked,
  label,
  onChange,
}: {
  // 当前开关状态。
  checked: boolean
  // 开关显示名称。
  label: string
  // 用户切换开关后的回调。
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="settings-toggle">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  )
}

function isValidPreset(preset: SearchPreset) {
  return preset.label.trim().length > 0 && preset.query.trim().length > 0
}
