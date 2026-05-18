import { useMemo, useState } from 'react'
import L from 'leaflet'
import { CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet'
import {
  Bookmark,
  Box,
  Layers,
  MapPin,
  Search,
  Shield,
  Swords,
} from 'lucide-react'
import 'leaflet/dist/leaflet.css'
import './App.css'
import { sampleObjects } from './data/sampleObjects'
import type { MapLayer, MapObject } from './types/map'

const tileLayers: Record<MapLayer, string> = {
  Sky: 'https://objmap-totk.zeldamods.org/game_files/map/Sky/maptex/{z}/{x}/{y}.webp',
  Surface:
    'https://objmap-totk.zeldamods.org/game_files/map/Ground/maptex/{z}/{x}/{y}.webp',
  Depths:
    'https://objmap-totk.zeldamods.org/game_files/map/Depths/maptex/{z}/{x}/{y}.webp',
}

const categoryIcons = {
  shrine: Shield,
  chest: Box,
  weapon: Swords,
  monster: MapPin,
}

const categoryLabels: Record<MapObject['category'], string> = {
  shrine: 'Shrines',
  chest: 'Chests',
  weapon: 'Weapons',
  monster: 'Monsters',
}

function App() {
  const [activeLayer, setActiveLayer] = useState<MapLayer>('Surface')
  const [activeCategory, setActiveCategory] = useState<MapObject['category'] | 'all'>(
    'all',
  )
  const [query, setQuery] = useState('')
  const [selectedObject, setSelectedObject] = useState<MapObject | null>(
    sampleObjects[0],
  )

  const visibleObjects = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase()

    return sampleObjects.filter((object) => {
      const matchesLayer = object.layer === activeLayer
      const matchesCategory =
        activeCategory === 'all' || object.category === activeCategory
      const matchesQuery =
        !cleanQuery ||
        object.name.toLowerCase().includes(cleanQuery) ||
        object.actor.toLowerCase().includes(cleanQuery) ||
        object.tags.some((tag) => tag.toLowerCase().includes(cleanQuery))

      return matchesLayer && matchesCategory && matchesQuery
    })
  }, [activeCategory, activeLayer, query])

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
                  setSelectedObject(null)
                }}
              >
                {layer}
              </button>
            ))}
          </div>
        </section>

        <section className="control-group" aria-labelledby="category-heading">
          <h2 id="category-heading">Categories</h2>
          <button
            type="button"
            className={`category-row ${activeCategory === 'all' ? 'active' : ''}`}
            onClick={() => setActiveCategory('all')}
          >
            <Bookmark size={17} />
            <span>All objects</span>
            <strong>{sampleObjects.filter((item) => item.layer === activeLayer).length}</strong>
          </button>

          {(Object.keys(categoryLabels) as Array<MapObject['category']>).map(
            (category) => {
              const Icon = categoryIcons[category]
              const count = sampleObjects.filter(
                (item) => item.layer === activeLayer && item.category === category,
              ).length

              return (
                <button
                  type="button"
                  className={`category-row ${
                    activeCategory === category ? 'active' : ''
                  }`}
                  onClick={() => setActiveCategory(category)}
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
          <h2 id="results-heading">{visibleObjects.length} visible</h2>
          <div className="result-list">
            {visibleObjects.map((object) => (
              <button
                key={object.id}
                type="button"
                className={selectedObject?.id === object.id ? 'active' : ''}
                onClick={() => setSelectedObject(object)}
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
          zoom={2}
          minZoom={1}
          maxZoom={7}
          crs={L.CRS.Simple}
          zoomControl={false}
          className="map-canvas"
        >
          <TileLayer
            key={activeLayer}
            url={tileLayers[activeLayer]}
            noWrap
            maxNativeZoom={7}
            attribution="Map tiles from zeldamods.org"
          />

          {visibleObjects.map((object) => (
            <CircleMarker
              key={object.id}
              center={[object.z, object.x]}
              radius={8}
              pathOptions={{
                color: object.color,
                fillColor: object.color,
                fillOpacity: 0.82,
                weight: 2,
              }}
              eventHandlers={{
                click: () => setSelectedObject(object),
              }}
            >
              <Popup>
                <strong>{object.name}</strong>
                <span>{object.actor}</span>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>

        <div className="map-toolbar">
          <span>{activeLayer}</span>
          <span>{visibleObjects.length} objects</span>
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
                <dd>
                  {selectedObject.x}, {selectedObject.y}, {selectedObject.z}
                </dd>
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

export default App
