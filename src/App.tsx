import { useEffect, useMemo, useState } from 'react'
import Fuse from 'fuse.js'
import L from 'leaflet'
import { CircleMarker, MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'
import {
  Bookmark,
  Box,
  CircleDot,
  FlaskConical,
  Layers,
  Leaf,
  MapPin,
  Mountain,
  RadioTower,
  Search,
  ShoppingBag,
  Sparkle,
  Shield,
  Swords,
  Waypoints,
} from 'lucide-react'
import 'leaflet/dist/leaflet.css'
import './App.css'
import { loadObjects } from './services/objectData'
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

const DISPLAY_OBJECT_LIMIT = 1000

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

const categoryLabels: Record<MapObject['category'], string> = {
  location: 'Locations',
  place: 'Places',
  cave: 'Caves',
  chasm: 'Chasms',
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

const remoteCategoryQueries: Record<MapObject['category'], string> = {
  location: 'LocationMarker',
  place: 'LocationMarker',
  cave: 'Cave',
  chasm: 'Chasm',
  dragonTear: 'DragonTears',
  dispenser: 'Dispenser',
  korok: 'Korok',
  shop: 'Shop',
  lightroot: 'LightRoot',
  techLab: 'Labo',
  tower: 'Tower',
  shrine: 'Shrine',
  chest: 'TBox',
  weapon: 'Weapon',
  enemy: 'Enemy',
}

const categoryPreferredLayers: Partial<Record<MapObject['category'], MapLayer>> = {
  lightroot: 'Depths',
}

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
  const [activeLayer, setActiveLayer] = useState<MapLayer>('Surface')
  const [tileSource, setTileSource] = useState<TileSource>('remote')
  const [objectSource, setObjectSource] = useState<ObjectDataSource>('local')
  const [objects, setObjects] = useState<MapObject[]>([])
  const [objectsLoading, setObjectsLoading] = useState(false)
  const [objectsError, setObjectsError] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState<MapObject['category'] | 'all'>(
    'all',
  )
  const [query, setQuery] = useState('')
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null)
  const remoteCategoryQuery =
    activeCategory === 'all' ? '' : remoteCategoryQueries[activeCategory]
  const objectLoadQuery =
    objectSource === 'remote' ? query.trim() || remoteCategoryQuery : ''

  useEffect(() => {
    const controller = new AbortController()

    queueMicrotask(() => {
      if (!controller.signal.aborted) {
        setObjectsLoading(true)
        setObjectsError(null)
      }
    })

    loadObjects({
      source: objectSource,
      query: objectLoadQuery,
      signal: controller.signal,
    })
      .then((nextObjects) => {
        setObjects(nextObjects)
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
  }, [objectLoadQuery, objectSource])

  const fuse = useMemo(
    () =>
      new Fuse(objects, {
        threshold: 0.32,
        ignoreLocation: true,
        minMatchCharLength: 2,
        keys: [
          { name: 'name', weight: 0.36 },
          { name: 'actor', weight: 0.32 },
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
    const usesDefaultLocationOverview =
      objectSource === 'local' &&
      activeCategory === 'location' &&
      query.trim().length === 0

    return searchedObjects.filter((object) => {
      const matchesLayer = object.layer === activeLayer
      const matchesCategory =
        activeCategory === 'all' || object.category === activeCategory

      if (
        usesDefaultLocationOverview &&
        object.category === 'location' &&
        !isOverviewLocation(object)
      ) {
        return false
      }

      return matchesLayer && matchesCategory
    })
  }, [activeCategory, activeLayer, objectSource, query, searchedObjects])

  const layerObjectCount = useMemo(
    () => searchedObjects.filter((item) => item.layer === activeLayer).length,
    [activeLayer, searchedObjects],
  )

  const displayedObjects = useMemo(
    () => visibleObjects.slice(0, DISPLAY_OBJECT_LIMIT),
    [visibleObjects],
  )

  const selectedObject = useMemo(
    () => objects.find((object) => object.id === selectedObjectId) ?? null,
    [objects, selectedObjectId],
  )

  const objectStatusText = getObjectStatusText({
    objectSource,
    query,
    activeCategory,
    objectsLoading,
    objectsError,
    objectCount: objects.length,
  })

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="Map controls">
        <div className="brand">
          <div className="brand-mark">
            <Layers size={20} />
          </div>
          <div>
            <h1>TotK Object Map</h1>
            <p>React static data prototype</p>
          </div>
        </div>

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
                onClick={() => {
                  setActiveLayer(layer)
                  setSelectedObjectId(null)
                }}
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
                onClick={() => {
                  setObjectSource(source)
                  setSelectedObjectId(null)
                }}
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
          <h2 id="category-heading">Categories</h2>
          <button
            type="button"
            className={`category-row ${activeCategory === 'all' ? 'active' : ''}`}
            onClick={() => {
              setActiveCategory('all')
              setSelectedObjectId(null)
            }}
          >
            <Bookmark size={17} />
            <span>All objects</span>
            <strong>{layerObjectCount}</strong>
          </button>

          {(Object.keys(categoryLabels) as Array<MapObject['category']>).map(
            (category) => {
              const Icon = categoryIcons[category]
              const count = searchedObjects.filter(
                (item) => item.layer === activeLayer && item.category === category,
              ).length

              return (
                <button
                  type="button"
                  className={`category-row ${
                    activeCategory === category ? 'active' : ''
                  }`}
                  onClick={() => {
                    setActiveCategory(category)
                    const preferredLayer = categoryPreferredLayers[category]

                    if (preferredLayer) {
                      setActiveLayer(preferredLayer)
                    }

                    setSelectedObjectId(null)
                  }}
                  key={category}
                >
                  <Icon size={17} />
                  <span>{categoryLabels[category]}</span>
                  <strong>{count}</strong>
                </button>
              )
            },
          )}
        </section>

        <section className="results" aria-labelledby="results-heading">
          <h2 id="results-heading">
            {visibleObjects.length} visible
            {visibleObjects.length > DISPLAY_OBJECT_LIMIT
              ? ` · ${DISPLAY_OBJECT_LIMIT} shown`
              : ''}
          </h2>
          <div className="result-list">
            {displayedObjects.map((object) => (
              <button
                key={object.id}
                type="button"
                className={selectedObject?.id === object.id ? 'active' : ''}
                onClick={() => setSelectedObjectId(object.id)}
              >
                <span>{object.name}</span>
                <small>{object.actor}</small>
              </button>
            ))}
          </div>
        </section>
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

          {displayedObjects.map((object) => (
            <ObjectMarker
              key={object.id}
              object={object}
              renderLocationLabel={activeCategory === 'location'}
              onSelect={() => setSelectedObjectId(object.id)}
            />
          ))}
        </MapContainer>

        <div className="map-toolbar">
          <span>{activeLayer}</span>
          <span>{tileSource === 'local' ? 'Local tiles' : 'Remote tiles'}</span>
          <span>{objectSource === 'local' ? 'Local data' : 'Remote API'}</span>
          <span>{layerFolders[activeLayer]}</span>
          <span>{visibleObjects.length} objects</span>
          {visibleObjects.length > displayedObjects.length ? (
            <span>{displayedObjects.length} rendered</span>
          ) : null}
        </div>
      </section>

      <aside className="details" aria-label="Selected object details">
        {selectedObject ? (
          <>
            <div className="detail-header">
              <p>{categoryLabels[selectedObject.category]}</p>
              <h2>{selectedObject.name}</h2>
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
          <strong>{object.name}</strong>
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
          <strong>{object.name}</strong>
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
        <strong>{object.name}</strong>
        <span>{object.actor}</span>
      </Popup>
    </CircleMarker>
  )
}

function getLocationLabelIcon(object: MapObject) {
  const label = formatLocationLabel(object.name)
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

function isOverviewLocation(object: MapObject) {
  return object.showLevel === 'Farthest' && object.name.startsWith('MapRegion_')
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
  activeCategory,
  objectsLoading,
  objectsError,
  objectCount,
}: {
  objectSource: ObjectDataSource
  query: string
  activeCategory: MapObject['category'] | 'all'
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

  if (
    objectSource === 'remote' &&
    activeCategory === 'all' &&
    query.trim().length < 2
  ) {
    return 'Enter a search term or choose a category to query radar API.'
  }

  return `${objectCount} ${objectSource === 'local' ? 'local objects' : 'remote results'}`
}

export default App
