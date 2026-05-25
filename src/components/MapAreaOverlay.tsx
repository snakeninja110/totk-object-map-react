import { Polygon, Popup } from 'react-leaflet'
import type { LatLngExpression } from 'leaflet'
import type { MapAreaFeature } from '../utils/mapAreaRules'
import { getMapAreaPathOptions, toMapAreaPolygons } from '../utils/mapAreaRules'

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
            pathOptions={getMapAreaPathOptions(feature, fillAreas)}
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
  return toMapAreaPolygons(feature) as LatLngExpression[][]
}
