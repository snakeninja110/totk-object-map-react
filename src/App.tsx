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
  const activeSidebarPanel = useMapUiStore((state) => state.activeSidebarPanel)
  const activeLayer = useMapUiStore((state) => state.activeLayer)
  const tileSource = useMapUiStore((state) => state.tileSource)
  const objectSource = useMapUiStore((state) => state.objectSource)
  const activeMapArea = useMapUiStore((state) => state.activeMapArea)
  const mapAreaFilter = useMapUiStore((state) => state.mapAreaFilter)
  const mapAreaFill = useMapUiStore((state) => state.mapAreaFill)
  const activeCategories = useMapUiStore((state) => state.activeCategories)
  const query = useMapUiStore((state) => state.query)
  const selectedObjectId = useMapUiStore((state) => state.selectedObjectId)
  const pinnedObjectIds = useMapUiStore((state) => state.pinnedObjectIds)
  const hiddenObjectIds = useMapUiStore((state) => state.hiddenObjectIds)
  const showMapStatusBar = useMapUiStore((state) => state.showMapStatusBar)
  const showMarkerTooltips = useMapUiStore((state) => state.showMarkerTooltips)
  const enableMarkerHoverEffects = useMapUiStore((state) => state.enableMarkerHoverEffects)
  const defaultAdvancedDetailsOpen = useMapUiStore((state) => state.defaultAdvancedDetailsOpen)
  const searchMapType = useMapUiStore((state) => state.searchMapType)
  const searchMapName = useMapUiStore((state) => state.searchMapName)
  const colorPerActor = useMapUiStore((state) => state.colorPerActor)
  const useActorNames = useMapUiStore((state) => state.useActorNames)
  const useHexForHashIds = useMapUiStore((state) => state.useHexForHashIds)
  const showObjectHeightsInTooltips = useMapUiStore(
    (state) => state.showObjectHeightsInTooltips,
  )
  const inGameCoordinates = useMapUiStore((state) => state.inGameCoordinates)
  const customSearchPresets = useMapUiStore((state) => state.customSearchPresets)
  const copyCoordinatesXYZ = useMapUiStore((state) => state.copyCoordinatesXYZ)
  const setActiveSidebarPanel = useMapUiStore((state) => state.setActiveSidebarPanel)
  const setActiveLayer = useMapUiStore((state) => state.setActiveLayer)
  const setTileSource = useMapUiStore((state) => state.setTileSource)
  const setObjectSource = useMapUiStore((state) => state.setObjectSource)
  const setActiveMapArea = useMapUiStore((state) => state.setActiveMapArea)
  const setMapAreaFilter = useMapUiStore((state) => state.setMapAreaFilter)
  const setMapAreaFill = useMapUiStore((state) => state.setMapAreaFill)
  const toggleCategory = useMapUiStore((state) => state.toggleCategory)
  const clearCategories = useMapUiStore((state) => state.clearCategories)
  const setQuery = useMapUiStore((state) => state.setQuery)
  const selectObject = useMapUiStore((state) => state.selectObject)
  const togglePinnedObject = useMapUiStore((state) => state.togglePinnedObject)
  const hideObject = useMapUiStore((state) => state.hideObject)
  const clearPinnedObjects = useMapUiStore((state) => state.clearPinnedObjects)
  const clearHiddenObjects = useMapUiStore((state) => state.clearHiddenObjects)
  const setShowMapStatusBar = useMapUiStore((state) => state.setShowMapStatusBar)
  const setShowMarkerTooltips = useMapUiStore((state) => state.setShowMarkerTooltips)
  const setEnableMarkerHoverEffects = useMapUiStore(
    (state) => state.setEnableMarkerHoverEffects,
  )
  const setDefaultAdvancedDetailsOpen = useMapUiStore(
    (state) => state.setDefaultAdvancedDetailsOpen,
  )
  const setSearchMapType = useMapUiStore((state) => state.setSearchMapType)
  const setSearchMapName = useMapUiStore((state) => state.setSearchMapName)
  const setColorPerActor = useMapUiStore((state) => state.setColorPerActor)
  const setUseActorNames = useMapUiStore((state) => state.setUseActorNames)
  const setUseHexForHashIds = useMapUiStore((state) => state.setUseHexForHashIds)
  const setShowObjectHeightsInTooltips = useMapUiStore(
    (state) => state.setShowObjectHeightsInTooltips,
  )
  const setInGameCoordinates = useMapUiStore((state) => state.setInGameCoordinates)
  const addCustomSearchPreset = useMapUiStore((state) => state.addCustomSearchPreset)
  const updateCustomSearchPreset = useMapUiStore((state) => state.updateCustomSearchPreset)
  const removeCustomSearchPreset = useMapUiStore((state) => state.removeCustomSearchPreset)
  const setCopyCoordinatesXYZ = useMapUiStore((state) => state.setCopyCoordinatesXYZ)
  const [mapZoom, setMapZoom] = useState(DEFAULT_ZOOM)
  const [viewportBounds, setViewportBounds] = useState<ViewportBounds | null>(null)
  const handleViewportChange = useCallback((bounds: ViewportBounds) => {
    setViewportBounds(bounds)
  }, [])
  const { objects, objectsError, objectStatusText } = useObjectData({
    objectSource,
    query,
    activeCategories,
    searchMapType,
    searchMapName,
  })
  const {
    selectedCategorySet,
    pinnedObjectSet,
    hiddenObjectSet,
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
    pinnedObjectIds,
    hiddenObjectIds,
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
        activeSidebarPanel={activeSidebarPanel}
        activeLayer={activeLayer}
        tileSource={tileSource}
        objectSource={objectSource}
        query={query}
        objectsError={objectsError}
        objectStatusText={objectStatusText}
        activeMapArea={activeMapArea}
        mapAreaFilter={mapAreaFilter}
        mapAreaFill={mapAreaFill}
        selectedCategorySet={selectedCategorySet}
        pinnedObjectSet={pinnedObjectSet}
        hiddenObjectSet={hiddenObjectSet}
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
        categoryCounts={categoryCounts}
        visibleObjects={visibleObjects}
        resultListObjects={resultListObjects}
        selectedObject={selectedObject}
        setActiveSidebarPanel={setActiveSidebarPanel}
        setActiveLayer={setActiveLayer}
        setTileSource={setTileSource}
        setObjectSource={setObjectSource}
        toggleCategory={toggleCategory}
        clearCategories={clearCategories}
        setQuery={setQuery}
        setActiveMapArea={setActiveMapArea}
        setMapAreaFilter={setMapAreaFilter}
        setMapAreaFill={setMapAreaFill}
        selectObject={selectObject}
        togglePinnedObject={togglePinnedObject}
        hideObject={hideObject}
        clearPinnedObjects={clearPinnedObjects}
        clearHiddenObjects={clearHiddenObjects}
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

      <TotkMap
        activeLayer={activeLayer}
        tileSource={tileSource}
        objectSource={objectSource}
        mapZoom={mapZoom}
        activeMapArea={activeMapArea}
        mapAreaFilter={mapAreaFilter}
        mapAreaFill={mapAreaFill}
        visibleObjects={visibleObjects}
        viewportObjects={viewportObjects}
        mapObjects={mapObjects}
        selectedObjectId={selectedObjectId}
        showMapStatusBar={showMapStatusBar}
        showMarkerTooltips={showMarkerTooltips}
        enableMarkerHoverEffects={enableMarkerHoverEffects}
        showObjectHeightsInTooltips={showObjectHeightsInTooltips}
        colorPerActor={colorPerActor}
        useActorNames={useActorNames}
        renderLocationLabels={selectedCategorySet.has('location')}
        setMapZoom={setMapZoom}
        onViewportChange={handleViewportChange}
        selectObject={selectObject}
      />

      <ObjectDetails
        selectedObject={selectedObject}
        defaultAdvancedDetailsOpen={defaultAdvancedDetailsOpen}
        useActorNames={useActorNames}
        useHexForHashIds={useHexForHashIds}
        inGameCoordinates={inGameCoordinates}
        onClose={() => selectObject(null)}
      />
    </main>
  )
}

export default App
