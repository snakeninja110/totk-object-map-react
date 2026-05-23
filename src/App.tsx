import { useCallback, useEffect, useMemo, useState } from 'react'
import Fuse from 'fuse.js'
import L from 'leaflet'
import {
  CircleMarker,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMapEvents,
} from 'react-leaflet'
import {
  Bookmark,
  Box,
  CircleDot,
  CircleCheck,
  Funnel,
  FlaskConical,
  Leaf,
  ListChecks,
  MapPin,
  Mountain,
  RadioTower,
  Search,
  Settings,
  ShoppingBag,
  Sparkle,
  Shield,
  Swords,
  Wrench,
  Waypoints,
} from 'lucide-react'
import 'leaflet/dist/leaflet.css'
import './App.css'
import { REMOTE_STATIC_MARKERS_QUERY, loadObjects } from './services/objectData'
import { useMapUiStore } from './stores/mapUiStore'
import type { MapLayer, MapObject, ObjectDataSource, TileSource } from './types/map'
import {
  DEFAULT_ZOOM,
  MAX_NATIVE_ZOOM,
  MAX_ZOOM,
  MIN_ZOOM,
  formatGameCoordinates,
  mapBounds,
  objectToLatLng,
  totkCrs,
} from './utils/mapCoordinates'
import { getObjectIcon } from './utils/objectIcons'

const layerFolders: Record<MapLayer, string> = {
  Sky: 'Sky',
  Surface: 'Ground',
  Depths: 'Depths',
}

const tileLayers: Record<TileSource, Record<MapLayer, string>> = {
  local: {
    Sky: '/data/map/Sky/maptex/{z}/{x}/{y}.webp',
    Surface: '/data/map/Ground/maptex/{z}/{x}/{y}.webp',
    Depths: '/data/map/Depths/maptex/{z}/{x}/{y}.webp',
  },
  remote: {
    Sky: 'https://objmap-totk.zeldamods.org/game_files/map/Sky/maptex/{z}/{x}/{y}.webp',
    Surface:
      'https://objmap-totk.zeldamods.org/game_files/map/Ground/maptex/{z}/{x}/{y}.webp',
    Depths:
      'https://objmap-totk.zeldamods.org/game_files/map/Depths/maptex/{z}/{x}/{y}.webp',
  },
}

const tileAttributions: Record<TileSource, string> = {
  local: 'Map tiles cached locally from zeldamods.org',
  remote: 'Map tiles from zeldamods.org',
}

const RESULT_LIST_LIMIT = 1000
const MAP_RENDER_LIMIT = 3000

// 地图当前视口的游戏坐标边界；Leaflet Simple CRS 中 lng 对应 x，lat 对应 z。
type ViewportBounds = {
  minX: number
  maxX: number
  minZ: number
  maxZ: number
}

// 侧边栏分类按钮顺序，按原站 Filter 面板的主分类优先展示。
const categoryOrder: Array<MapObject['category']> = [
  'location',
  'shrine',
  'place',
  'tower',
  'shop',
  'techLab',
  'chasm',
  'cave',
  'korok',
  'dragonTear',
  'lightroot',
  'dispenser',
  'chest',
  'weapon',
  'enemy',
]

const categoryIcons = {
  location: MapPin,
  place: Bookmark,
  cave: Mountain,
  chasm: CircleDot,
  dragonTear: Sparkle,
  dispenser: CircleDot,
  korok: Leaf,
  shop: ShoppingBag,
  lightroot: CircleDot,
  techLab: FlaskConical,
  tower: RadioTower,
  shrine: Shield,
  chest: Box,
  weapon: Swords,
  enemy: Waypoints,
}

// 分类按钮优先使用从原站拉取的图标资源；缺失时回退到 lucide 图标。
const categoryIconAssets: Partial<Record<MapObject['category'], string>> = {
  location: '/icons/mapicon_village.svg',
  place: '/icons/mapicon_hatago.svg',
  cave: '/icons/cave.png',
  chasm: '/icons/chasm.png',
  dragonTear: '/icons/tear.svg',
  dispenser: '/icons/dispenser.svg',
  korok: '/icons/mapicon_korok.png',
  shop: '/icons/mapicon_shop_yorozu.svg',
  lightroot: '/icons/lightroot.svg',
  techLab: '/icons/mapicon_labo.svg',
  tower: '/icons/tower.svg',
  shrine: '/icons/shrine.svg',
  weapon: '/icons/sword.svg',
}

const categoryLabels: Record<MapObject['category'], string> = {
  location: 'Locations',
  place: 'Places',
  cave: 'Cave/Well',
  chasm: 'Chasm',
  dragonTear: 'Dragon Tears',
  dispenser: 'Device Dispensers',
  korok: 'Koroks',
  shop: 'Shops',
  lightroot: 'Lightroots',
  techLab: 'Tech Labs',
  tower: 'Towers',
  shrine: 'Shrines',
  chest: 'Chests',
  weapon: 'Weapons',
  enemy: 'Enemies',
}

const categoryPreferredLayers: Partial<Record<MapObject['category'], MapLayer>> = {
  lightroot: 'Depths',
}

// 先按原站侧栏展示地图区域入口；当前仅提供界面占位，后续再接入区域图层数据。
const mapAreaOptions = [
  'None',
  'Map Tower Areas',
  'Surface Field Map Areas',
  'Depths Field Map Areas',
  'Cave Field Map Areas',
  'Sky Field Map Areas',
  'Sky Regions (approximate)',
  'Cave Regions (approximate)',
  'Cave Regions (detailed)',
  'Cherry Blossom Trees',
]

const locationLabelIconCache = new Map<string, L.DivIcon>()
const overviewLocationNames: Record<string, string> = {
  MapRegion_Eldin: 'Eldin',
  MapRegion_Firone: 'Faron',
  MapRegion_Gerudo: 'Gerudo',
  MapRegion_Hateru: 'Necluda',
  MapRegion_Hebura: 'Hebra',
  MapRegion_HyrulePrairie: 'Central Hyrule',
  MapRegion_Lanayru: 'Lanayru',
  MapRegion_Tamul: 'Akkala',
}

function App() {
  const activeLayer = useMapUiStore((state) => state.activeLayer)
  const tileSource = useMapUiStore((state) => state.tileSource)
  const objectSource = useMapUiStore((state) => state.objectSource)
  const activeCategories = useMapUiStore((state) => state.activeCategories)
  const query = useMapUiStore((state) => state.query)
  const selectedObjectId = useMapUiStore((state) => state.selectedObjectId)
  const setActiveLayer = useMapUiStore((state) => state.setActiveLayer)
  const setTileSource = useMapUiStore((state) => state.setTileSource)
  const setObjectSource = useMapUiStore((state) => state.setObjectSource)
  const toggleCategory = useMapUiStore((state) => state.toggleCategory)
  const clearCategories = useMapUiStore((state) => state.clearCategories)
  const setQuery = useMapUiStore((state) => state.setQuery)
  const selectObject = useMapUiStore((state) => state.selectObject)
  const [objects, setObjects] = useState<MapObject[]>([])
  const [objectsLoading, setObjectsLoading] = useState(false)
  const [objectsError, setObjectsError] = useState<string | null>(null)
  const [mapZoom, setMapZoom] = useState(DEFAULT_ZOOM)
  const [viewportBounds, setViewportBounds] = useState<ViewportBounds | null>(null)
  const handleViewportChange = useCallback((bounds: ViewportBounds) => {
    setViewportBounds(bounds)
  }, [])
  const selectedCategorySet = useMemo(
    () => new Set<MapObject['category']>(activeCategories),
    [activeCategories],
  )
  const objectLoadQueries = useMemo(() => {
    if (objectSource === 'local') {
      return ['']
    }

    const cleanQuery = query.trim()

    if (cleanQuery) {
      return [cleanQuery]
    }

    return [REMOTE_STATIC_MARKERS_QUERY]
  }, [objectSource, query])

  useEffect(() => {
    const controller = new AbortController()

    queueMicrotask(() => {
      if (!controller.signal.aborted) {
        setObjectsLoading(true)
        setObjectsError(null)
      }
    })

    Promise.all(
      objectLoadQueries.map((objectLoadQuery) =>
        loadObjects({
          source: objectSource,
          query: objectLoadQuery,
          signal: controller.signal,
        }),
      ),
    )
      .then((objectGroups) => {
        setObjects(dedupeObjects(objectGroups.flat()))
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return
        }

        setObjects([])
        setObjectsError(error instanceof Error ? error.message : 'Object data failed.')
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setObjectsLoading(false)
        }
      })

    return () => controller.abort()
  }, [objectLoadQueries, objectSource])

  const fuse = useMemo(
    () =>
      new Fuse(objects, {
        threshold: 0.32,
        ignoreLocation: true,
        minMatchCharLength: 2,
        keys: [
          { name: 'displayName', weight: 0.32 },
          { name: 'name', weight: 0.28 },
          { name: 'actor', weight: 0.25 },
          { name: 'tags', weight: 0.2 },
          { name: 'category', weight: 0.07 },
          { name: 'layer', weight: 0.05 },
        ],
      }),
    [objects],
  )

  const searchedObjects = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase()

    if (!cleanQuery || objectSource === 'remote') {
      return objects
    }

    return fuse.search(cleanQuery).map((result) => result.item)
  }, [fuse, objectSource, objects, query])

  const visibleObjects = useMemo(() => {
    if (selectedCategorySet.size === 0) {
      return []
    }

    const usesLocationZoomFilter =
      selectedCategorySet.has('location') && query.trim().length === 0
    const usesStaticFilterMarkers = query.trim().length === 0

    return searchedObjects.filter((object) => {
      const matchesLayer = objectMatchesLayer(object, activeLayer)
      const matchesCategory = selectedCategorySet.has(object.category)

      if (
        usesStaticFilterMarkers &&
        isSourceStaticFilterCategory(object.category) &&
        object.sourceKind !== 'static'
      ) {
        return false
      }

      if (
        usesLocationZoomFilter &&
        object.category === 'location' &&
        !shouldShowLocationLabel(object, activeLayer, mapZoom)
      ) {
        return false
      }

      return matchesLayer && matchesCategory
    })
  }, [
    activeLayer,
    mapZoom,
    query,
    searchedObjects,
    selectedCategorySet,
  ])

  const resultListObjects = useMemo(
    () => visibleObjects.slice(0, RESULT_LIST_LIMIT),
    [visibleObjects],
  )

  const viewportObjects = useMemo(() => {
    if (!viewportBounds) {
      return []
    }

    return visibleObjects.filter((object) => isObjectInViewport(object, viewportBounds))
  }, [viewportBounds, visibleObjects])

  const mapObjects = useMemo(
    () => viewportObjects.slice(0, MAP_RENDER_LIMIT),
    [viewportObjects],
  )

  const selectedObject = useMemo(
    () => objects.find((object) => object.id === selectedObjectId) ?? null,
    [objects, selectedObjectId],
  )

  const objectStatusText = getObjectStatusText({
    objectSource,
    query,
    activeCategories,
    objectsLoading,
    objectsError,
    objectCount: objects.length,
  })

  return (
    <main className="app-shell">
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
              const count = searchedObjects.filter((item) => {
                if (!objectMatchesLayer(item, activeLayer) || item.category !== category) {
                  return false
                }

                return (
                  query.trim().length > 0 ||
                  !isSourceStaticFilterCategory(category) ||
                  item.sourceKind === 'static'
                )
              }).length

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
            {mapAreaOptions.map((item, index) => (
              <label key={item} className="map-area-option">
                <input type="radio" name="map-area" defaultChecked={index === 0} />
                <span>{item}</span>
              </label>
            ))}
            <label className="map-area-filter">
              <span>Filter map areas</span>
              <div>
                <input placeholder="Example: 1,2,3,64" />
                <button type="button" aria-label="Apply map area filter">
                  <Funnel size={22} />
                </button>
              </div>
            </label>
            <label className="map-area-fill">
              <input type="checkbox" defaultChecked />
              <span>Fill map areas with color</span>
            </label>
          </section>

        <section className="results" aria-labelledby="results-heading">
          <h2 id="results-heading">
            {visibleObjects.length} visible
            {visibleObjects.length > RESULT_LIST_LIMIT
              ? ` · ${RESULT_LIST_LIMIT} shown`
              : ''}
          </h2>
          <div className="result-list">
            {resultListObjects.map((object) => (
              <button
                key={object.id}
                type="button"
                className={selectedObject?.id === object.id ? 'active' : ''}
                onClick={() => selectObject(object.id)}
              >
                <span>{getObjectDisplayName(object)}</span>
                <small>{object.actor}</small>
              </button>
            ))}
          </div>
        </section>
        </div>
      </aside>

      <section className="map-stage" aria-label="Interactive map">
        <MapContainer
          center={[0, 0]}
          zoom={DEFAULT_ZOOM}
          minZoom={MIN_ZOOM}
          maxZoom={MAX_ZOOM}
          maxBounds={mapBounds}
          maxBoundsViscosity={1}
          crs={totkCrs}
          zoomControl={false}
          className="map-canvas"
        >
          <TileLayer
            key={`${tileSource}-${activeLayer}`}
            url={tileLayers[tileSource][activeLayer]}
            noWrap
            bounds={mapBounds}
            maxNativeZoom={MAX_NATIVE_ZOOM}
            attribution={tileAttributions[tileSource]}
          />
          <MapViewportSync
            onZoomChange={setMapZoom}
            onViewportChange={handleViewportChange}
          />

          {mapObjects.map((object) => (
            <ObjectMarker
              key={object.id}
              object={object}
              renderLocationLabel={selectedCategorySet.has('location')}
              onSelect={() => selectObject(object.id)}
            />
          ))}
        </MapContainer>

        <div className="map-toolbar">
          <span>{activeLayer}</span>
          <span>{tileSource === 'local' ? 'Local tiles' : 'Remote tiles'}</span>
          <span>{objectSource === 'local' ? 'Local data' : 'Remote API'}</span>
          <span>Zoom {mapZoom}</span>
          <span>{layerFolders[activeLayer]}</span>
          <span>{visibleObjects.length} objects</span>
          <span>{viewportObjects.length} in view</span>
          {viewportObjects.length > mapObjects.length ? (
            <span>{mapObjects.length} rendered</span>
          ) : null}
        </div>
      </section>

      <aside className="details" aria-label="Selected object details">
        {selectedObject ? (
          <>
            <div className="detail-header">
              <p>{categoryLabels[selectedObject.category]}</p>
              <h2>{getObjectDisplayName(selectedObject)}</h2>
            </div>
            <dl>
              <div>
                <dt>Actor</dt>
                <dd>{selectedObject.actor}</dd>
              </div>
              <div>
                <dt>Layer</dt>
                <dd>{selectedObject.layer}</dd>
              </div>
              <div>
                <dt>Coordinates</dt>
                <dd>{formatGameCoordinates(selectedObject)}</dd>
              </div>
              <div>
                <dt>Tags</dt>
                <dd>{selectedObject.tags.join(', ')}</dd>
              </div>
            </dl>
            <p className="detail-note">{selectedObject.note}</p>
          </>
        ) : (
          <div className="empty-state">
            <MapPin size={24} />
            <h2>No object selected</h2>
            <p>Choose a result or click a marker on the map.</p>
          </div>
        )}
      </aside>
    </main>
  )
}

// 监听 Leaflet 当前缩放层级和视口边界，用于地点分级显示与大数据量按需渲染。
function MapViewportSync({
  onZoomChange,
  onViewportChange,
}: {
  onZoomChange: (zoom: number) => void
  onViewportChange: (bounds: ViewportBounds) => void
}) {
  const syncMapState = useCallback(
    (map: L.Map) => {
      onZoomChange(map.getZoom())
      onViewportChange(getPaddedViewportBounds(map))
    },
    [onViewportChange, onZoomChange],
  )

  const map = useMapEvents({
    moveend: () => syncMapState(map),
    zoomend: () => syncMapState(map),
  })

  useEffect(() => {
    syncMapState(map)
  }, [map, syncMapState])

  return null
}

function ObjectMarker({
  object,
  renderLocationLabel,
  onSelect,
}: {
  object: MapObject
  renderLocationLabel: boolean
  onSelect: () => void
}) {
  if (renderLocationLabel && object.category === 'location') {
    return (
      <Marker
        position={objectToLatLng(object)}
        icon={getLocationLabelIcon(object)}
        eventHandlers={{
          click: onSelect,
        }}
      >
        <Popup>
          <strong>{getObjectDisplayName(object)}</strong>
          <span>{object.actor}</span>
        </Popup>
      </Marker>
    )
  }

  const icon = object.iconKey ? getObjectIcon(object.iconKey) : null

  if (icon) {
    return (
      <Marker
        position={objectToLatLng(object)}
        icon={icon}
        eventHandlers={{
          click: onSelect,
        }}
      >
        <Popup>
          <strong>{getObjectDisplayName(object)}</strong>
          <span>{object.actor}</span>
        </Popup>
      </Marker>
    )
  }

  return (
    <CircleMarker
      center={objectToLatLng(object)}
      radius={8}
      pathOptions={{
        color: object.color,
        fillColor: object.color,
        fillOpacity: 0.82,
        weight: 2,
      }}
      eventHandlers={{
        click: onSelect,
      }}
    >
      <Popup>
        <strong>{getObjectDisplayName(object)}</strong>
        <span>{object.actor}</span>
      </Popup>
    </CircleMarker>
  )
}

function dedupeObjects(objects: MapObject[]) {
  const objectsById = new Map<string, MapObject>()

  for (const object of objects) {
    objectsById.set(object.id, object)
  }

  return [...objectsById.values()]
}

function getPaddedViewportBounds(map: L.Map): ViewportBounds {
  const bounds = map.getBounds().pad(0.35)

  return {
    minX: bounds.getWest(),
    maxX: bounds.getEast(),
    minZ: bounds.getSouth(),
    maxZ: bounds.getNorth(),
  }
}

function isObjectInViewport(object: MapObject, bounds: ViewportBounds) {
  return (
    object.x >= bounds.minX &&
    object.x <= bounds.maxX &&
    object.z >= bounds.minZ &&
    object.z <= bounds.maxZ
  )
}

function objectMatchesLayer(object: MapObject, activeLayer: MapLayer) {
  return object.displayLayers?.includes(activeLayer) ?? object.layer === activeLayer
}

function isSourceStaticFilterCategory(category: MapObject['category']) {
  return (
    category === 'location' ||
    category === 'place' ||
    category === 'cave' ||
    category === 'chasm' ||
    category === 'dragonTear' ||
    category === 'dispenser' ||
    category === 'korok' ||
    category === 'shop' ||
    category === 'lightroot' ||
    category === 'techLab' ||
    category === 'tower' ||
    category === 'shrine'
  )
}

function getLocationLabelIcon(object: MapObject) {
  const label = getObjectDisplayName(object)
  const cacheKey = `${object.layer}:${label}`
  const cached = locationLabelIconCache.get(cacheKey)

  if (cached) {
    return cached
  }

  const icon = L.divIcon({
    className: `location-map-label location-map-label-${object.layer.toLowerCase()}`,
    html: `<span class="location-map-label-name">${escapeHtml(label)}</span><span class="location-map-label-glyphs">${escapeHtml(
      label,
    )}</span>`,
    iconSize: L.point(220, 58),
    iconAnchor: L.point(110, 29),
    popupAnchor: L.point(0, -18),
  })

  locationLabelIconCache.set(cacheKey, icon)
  return icon
}

function getObjectDisplayName(object: MapObject) {
  if (object.displayName) {
    return object.displayName
  }

  if (object.category === 'location') {
    return formatLocationLabel(object.name)
  }

  return object.name
}

function formatLocationLabel(name: string) {
  const overviewName = overviewLocationNames[name]

  if (overviewName) {
    return overviewName
  }

  return name
    .replace(/^MapRegion_/, '')
    .replace(/^MinusField_/, '')
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\bMt\b/g, 'Mt.')
    .trim()
}

function shouldShowLocationLabel(object: MapObject, activeLayer: MapLayer, zoom: number) {
  if (object.name === 'Oasis') {
    return false
  }

  if (!isStaticLocationLabel(object) || !matchesSourceLocationLayer(object, activeLayer)) {
    return false
  }

  const showLevels = getLocationShowLevels(object)

  return (
    (showLevels.includes('Farthest') && zoom <= 4) ||
    (showLevels.includes('Far') && zoom === 5) ||
    (showLevels.includes('Near') && zoom === 5) ||
    (showLevels.includes('') && zoom >= 6) ||
    (showLevels.includes('Nearest') && zoom >= 6)
  )
}

// 只有静态地点标签才参与缩放分级；未归类的普通对象不能被当成地名渲染。
function isStaticLocationLabel(object: MapObject) {
  return (
    object.category === 'location' &&
    (object.priority !== undefined ||
      Boolean(object.showLevel) ||
      (object.note.startsWith('Remote radar API') && object.name.startsWith('MapRegion_')))
  )
}

// 源站用高度区间约束不同地图层的地点标签，这里保留同样的边界。
function matchesSourceLocationLayer(object: MapObject, activeLayer: MapLayer) {
  if (activeLayer === 'Sky') {
    return object.y >= 950
  }

  if (activeLayer === 'Depths') {
    return object.y <= -50
  }

  return object.y >= 0 && object.y <= 950
}

function getLocationShowLevels(object: MapObject) {
  if (object.showLevel !== undefined) {
    return object.showLevel.split(',').map((level) => level.trim())
  }

  if (object.note.startsWith('Remote radar API') && object.name.startsWith('MapRegion_')) {
    return ['Farthest']
  }

  return ['']
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    return {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }[character] as string
  })
}

function getObjectStatusText({
  objectSource,
  query,
  activeCategories,
  objectsLoading,
  objectsError,
  objectCount,
}: {
  objectSource: ObjectDataSource
  query: string
  activeCategories: Array<MapObject['category']>
  objectsLoading: boolean
  objectsError: string | null
  objectCount: number
}) {
  if (objectsError) {
    return objectsError
  }

  if (objectsLoading) {
    return 'Loading object data...'
  }

  if (objectSource === 'remote' && activeCategories.length === 0 && query.trim().length < 2) {
    return 'Static markers loaded. Choose categories to show points.'
  }

  return `${objectCount} ${objectSource === 'local' ? 'local objects' : 'remote results'}`
}

export default App
