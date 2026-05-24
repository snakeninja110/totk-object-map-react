import { Polygon, Popup } from 'react-leaflet'
import type { LatLngExpression, PathOptions } from 'leaflet'
import type { MapAreaFeature } from '../hooks/useMapAreas'

type MapAreaOverlayProps = {
  // 已按当前图层和编号过滤后的区域；组件只负责把几何数据画到 Leaflet。
  features: MapAreaFeature[]
  // 是否填充区域面；false 时只保留边界线，避免遮挡瓦片细节。
  fillAreas: boolean
}

// 绘制 Visible map areas 覆盖层；支持 Polygon 与 MultiPolygon 两种源站几何格式。
export function MapAreaOverlay({ features, fillAreas }: MapAreaOverlayProps) {
  return (
    <>
      {features.map((feature) =>
        toPolygonPositions(feature).map((positions, index) => (
          <Polygon
            key={`${feature.id}-${index}`}
            positions={positions}
            pathOptions={getPathOptions(feature, fillAreas)}
          >
            <Popup>
              <strong>{feature.title}</strong>
              <span>{feature.areaKey}</span>
            </Popup>
          </Polygon>
        )),
      )}
    </>
  )
}

function toPolygonPositions(feature: MapAreaFeature): LatLngExpression[][] {
  if (feature.geometry.type === 'Polygon') {
    return [toLatLngRing(feature.geometry.coordinates[0] ?? [])]
  }

  return feature.geometry.coordinates.map((polygon) => toLatLngRing(polygon[0] ?? []))
}

function toLatLngRing(ring: Array<[number, number]>): LatLngExpression[] {
  return ring.map(([x, z]) => [z, x])
}

function getPathOptions(feature: MapAreaFeature, fillAreas: boolean): PathOptions {
  return {
    color: feature.color,
    fillColor: feature.color,
    fillOpacity: fillAreas ? 0.16 : 0,
    opacity: 0.82,
    weight: 2,
  }
}
