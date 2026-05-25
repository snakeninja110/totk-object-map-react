import { useCallback, useEffect } from 'react'
import type L from 'leaflet'
import { useMapEvents } from 'react-leaflet'
import type { ViewportBounds } from '../utils/objectFilters'

type MapViewportSyncProps = {
  // 写回当前 Leaflet 缩放层级；Locations 的 ShowLevel 规则和底部状态条都会读取它。
  onZoomChange: (zoom: number) => void
  // 写回当前地图视口边界；useVisibleObjects 用它裁剪需要渲染的 marker。
  onViewportChange: (bounds: ViewportBounds) => void
}

// 监听 Leaflet 的 move/zoom 事件，把地图内部状态同步回 React 状态层。
export function MapViewportSync({
  onZoomChange,
  onViewportChange,
}: MapViewportSyncProps) {
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

// 给视口边界留出缓冲区，减少拖动地图时 marker 频繁进出导致的视觉跳变。
function getPaddedViewportBounds(map: L.Map): ViewportBounds {
  const bounds = map.getBounds().pad(0.35)

  return {
    minX: bounds.getWest(),
    maxX: bounds.getEast(),
    minZ: bounds.getSouth(),
    maxZ: bounds.getNorth(),
  }
}
