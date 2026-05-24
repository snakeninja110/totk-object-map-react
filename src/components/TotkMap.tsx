import { useCallback, useEffect } from 'react'
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
  layerFolders,
  tileAttributions,
  tileLayers,
} from '../constants/mapConfig'
import { useMapAreas } from '../hooks/useMapAreas'
import type {
  MapAreaId,
  MapLayer,
  MapObject,
  ObjectDataSource,
  TileSource,
} from '../types/map'
import {
  DEFAULT_ZOOM,
  MAX_NATIVE_ZOOM,
  MAX_ZOOM,
  MIN_ZOOM,
  mapBounds,
  objectToLatLng,
  totkCrs,
} from '../utils/mapCoordinates'
import {
  getLocationLabelIcon,
  getObjectDisplayName,
} from '../utils/locationLabels'
import { getObjectIcon } from '../utils/objectIcons'
import type { ViewportBounds } from '../utils/objectFilters'
import { MapAreaOverlay } from './MapAreaOverlay'

type TotkMapProps = {
  // 当前地图层；决定底图瓦片目录、底部工具条图层名和 marker 所属渲染上下文。
  activeLayer: MapLayer
  // 当前瓦片来源；Local 读取 public/data/map，Remote 读取 zeldamods 在线瓦片。
  tileSource: TileSource
  // 当前对象数据来源；这里只用于底部工具条展示，不负责加载对象数据。
  objectSource: ObjectDataSource
  // 当前 Leaflet 缩放层级；由 MapViewportSync 写回，用于底部工具条展示。
  mapZoom: number
  // 当前启用的地图区域覆盖层；none 时不加载区域数据。
  activeMapArea: MapAreaId
  // 区域编号过滤输入；用于只显示指定编号或 Area 值的区域。
  mapAreaFilter: string
  // 是否填充地图区域；关闭时只绘制边界线。
  mapAreaFill: boolean
  // 已通过搜索、分类、图层和源站规则筛选的对象；用于展示总对象数。
  visibleObjects: MapObject[]
  // visibleObjects 中落在当前视口范围内的对象；用于展示视口内数量。
  viewportObjects: MapObject[]
  // 实际交给 Leaflet 渲染的对象；通常是 viewportObjects 的截断结果，避免一次渲染过多 marker。
  mapObjects: MapObject[]
  // 是否把 Location 类对象渲染为文字标签；仅选择 Locations 分类时启用。
  renderLocationLabels: boolean
  // 写回当前 Leaflet 缩放层级；供源站 ShowLevel 地名显示规则和工具条使用。
  setMapZoom: (zoom: number) => void
  // 写回当前地图视口边界；供 useVisibleObjects 做视口裁剪。
  onViewportChange: (bounds: ViewportBounds) => void
  // 点击 marker 时选中对象，并驱动右侧详情面板更新。
  selectObject: (id: string) => void
}

// Leaflet 地图组件；负责瓦片、marker、视口同步和底部状态条展示。
// 数据加载、搜索和筛选已经在 hook 中完成，这里只接收最终可渲染的数据并同步地图交互状态。
export function TotkMap({
  activeLayer,
  tileSource,
  objectSource,
  mapZoom,
  activeMapArea,
  mapAreaFilter,
  mapAreaFill,
  visibleObjects,
  viewportObjects,
  mapObjects,
  renderLocationLabels,
  setMapZoom,
  onViewportChange,
  selectObject,
}: TotkMapProps) {
  const { features: mapAreaFeatures, error: mapAreaError } = useMapAreas({
    activeMapArea,
    activeLayer,
    filterText: mapAreaFilter,
  })

  return (
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
        <MapViewportSync onZoomChange={setMapZoom} onViewportChange={onViewportChange} />
        <MapAreaOverlay features={mapAreaFeatures} fillAreas={mapAreaFill} />

        {mapObjects.map((object) => (
          <ObjectMarker
            key={object.id}
            object={object}
            renderLocationLabel={renderLocationLabels}
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
        {activeMapArea !== 'none' ? (
          <span>
            {mapAreaError ? 'Area load failed' : `${mapAreaFeatures.length} areas`}
          </span>
        ) : null}
        {viewportObjects.length > mapObjects.length ? (
          <span>{mapObjects.length} rendered</span>
        ) : null}
      </div>
    </section>
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

function getPaddedViewportBounds(map: L.Map): ViewportBounds {
  const bounds = map.getBounds().pad(0.35)

  return {
    minX: bounds.getWest(),
    maxX: bounds.getEast(),
    minZ: bounds.getSouth(),
    maxZ: bounds.getNorth(),
  }
}
