import { CircleMarker, Marker, Popup } from 'react-leaflet'
import type { MapObject } from '../types/map'
import { getLocationLabelIcon, getObjectDisplayName } from '../utils/locationLabels'
import { objectToLatLng } from '../utils/mapCoordinates'
import { getObjectIcon } from '../utils/objectIcons'

type ObjectMarkerProps = {
  // 要渲染到地图上的标准化对象；包含分类、坐标、颜色和可选源站图标 key。
  object: MapObject
  // Locations 分类在特定场景下用文字标签渲染，而不是普通图标或圆点。
  renderLocationLabel: boolean
  // 点击 marker 后把对象选中状态交还给上层 store。
  onSelect: () => void
}

// 渲染单个地图对象；按优先级选择 Locations 文本标签、源站图标或兜底圆点。
export function ObjectMarker({
  object,
  renderLocationLabel,
  onSelect,
}: ObjectMarkerProps) {
  if (renderLocationLabel && object.category === 'location') {
    return (
      <Marker
        position={objectToLatLng(object)}
        icon={getLocationLabelIcon(object)}
        eventHandlers={{
          click: onSelect,
        }}
      >
        <ObjectPopup object={object} />
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
        <ObjectPopup object={object} />
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
      <ObjectPopup object={object} />
    </CircleMarker>
  )
}

function ObjectPopup({ object }: { object: MapObject }) {
  return (
    <Popup>
      <strong>{getObjectDisplayName(object)}</strong>
      <span>{object.actor}</span>
    </Popup>
  )
}
