import {
  CircleCheck,
  Funnel,
  ListChecks,
  Search,
  Settings,
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
} from '../constants/mapConfig'
import type { MapAreaId, MapLayer, MapObject, ObjectDataSource, TileSource } from '../types/map'
import { VirtualResultList } from './VirtualResultList'

type FilterSidebarProps = {
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
  // 每个分类在当前图层和当前搜索条件下的计数；用于分类按钮右侧数字。
  categoryCounts: Record<MapObject['category'], number>
  // 已通过图层、分类、搜索和源站规则筛选的对象；用于显示结果总数。
  visibleObjects: MapObject[]
  // 侧边栏结果列表的数据源；实际 DOM 数量由 VirtualResultList 按滚动位置控制。
  resultListObjects: MapObject[]
  // 当前详情面板选中的对象；用于在结果列表中高亮对应项。
  selectedObject: MapObject | null
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
}

// 左侧筛选面板组件；只负责交互呈现，数据加载和可见对象计算由上层 hook 提供。
// 这里刻意保持为“受控组件”：所有状态和回调都从 App 传入，避免侧边栏内部再分叉数据来源逻辑。
export function FilterSidebar({
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
  categoryCounts,
  visibleObjects,
  resultListObjects,
  selectedObject,
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
}: FilterSidebarProps) {
  return (
    <aside className="sidebar filter-sidebar" aria-label="Map controls">
      <nav className="filter-rail" aria-label="Filter sections">
        <Search size={28} />
        <Funnel size={28} className="active" />
        <ListChecks size={28} />
        <Waypoints size={28} />
        <CircleCheck size={28} />
        <Wrench size={28} />
        <Settings size={28} />
      </nav>

      <div className="filter-panel">
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
            onSelect={selectObject}
          />
        </section>
      </div>
    </aside>
  )
}
