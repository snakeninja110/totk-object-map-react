import { useCallback, useMemo, useState } from 'react'
import 'leaflet/dist/leaflet.css'
import './App.css'
import { FilterSidebar } from './components/FilterSidebar'
import { ObjectDetails } from './components/ObjectDetails'
import { TotkMap } from './components/TotkMap'
import { useObjectData } from './hooks/useObjectData'
import { useVisibleObjects } from './hooks/useVisibleObjects'
import { useMapUiStore } from './stores/mapUiStore'
import { DEFAULT_ZOOM } from './utils/mapCoordinates'
import type { ViewportBounds } from './utils/objectFilters'

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
  const [mapZoom, setMapZoom] = useState(DEFAULT_ZOOM)
  const [viewportBounds, setViewportBounds] = useState<ViewportBounds | null>(null)
  const handleViewportChange = useCallback((bounds: ViewportBounds) => {
    setViewportBounds(bounds)
  }, [])
  const { objects, objectsError, objectStatusText } = useObjectData({
    objectSource,
    query,
    activeCategories,
  })
  const {
    selectedCategorySet,
    visibleObjects,
    resultListObjects,
    viewportObjects,
    mapObjects,
    categoryCounts,
  } = useVisibleObjects({
    objects,
    objectSource,
    query,
    activeCategories,
    activeLayer,
    mapZoom,
    viewportBounds,
  })

  const selectedObject = useMemo(
    () => objects.find((object) => object.id === selectedObjectId) ?? null,
    [objects, selectedObjectId],
  )

  return (
    <main className="app-shell">
      <FilterSidebar
        activeLayer={activeLayer}
        tileSource={tileSource}
        objectSource={objectSource}
        query={query}
        objectsError={objectsError}
        objectStatusText={objectStatusText}
        selectedCategorySet={selectedCategorySet}
        categoryCounts={categoryCounts}
        visibleObjects={visibleObjects}
        resultListObjects={resultListObjects}
        selectedObject={selectedObject}
        setActiveLayer={setActiveLayer}
        setTileSource={setTileSource}
        setObjectSource={setObjectSource}
        toggleCategory={toggleCategory}
        clearCategories={clearCategories}
        setQuery={setQuery}
        selectObject={selectObject}
      />

      <TotkMap
        activeLayer={activeLayer}
        tileSource={tileSource}
        objectSource={objectSource}
        mapZoom={mapZoom}
        visibleObjects={visibleObjects}
        viewportObjects={viewportObjects}
        mapObjects={mapObjects}
        renderLocationLabels={selectedCategorySet.has('location')}
        setMapZoom={setMapZoom}
        onViewportChange={handleViewportChange}
        selectObject={selectObject}
      />

      <ObjectDetails selectedObject={selectedObject} />
    </main>
  )
}

export default App
