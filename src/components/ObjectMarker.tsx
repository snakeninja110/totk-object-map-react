import L from 'leaflet'
import { CircleMarker, Marker, Tooltip } from 'react-leaflet'
import type { MapObject } from '../types/map'
import { getLocationLabelIcon } from '../utils/locationLabels'
import { objectToLatLng } from '../utils/mapCoordinates'
import { getObjectMarkerColor, getObjectTitle } from '../utils/objectDisplay'
import { getObjectIcon } from '../utils/objectIcons'

type ObjectMarkerProps = {
  // 要渲染到地图上的标准化对象；包含分类、坐标、颜色和可选源站图标 key。
  object: MapObject
  // Locations 分类在特定场景下用文字标签渲染，而不是普通图标或圆点。
  renderLocationLabel: boolean
  // 当前对象是否被选中；选中时在源站图标上方叠加蓝色 pin。
  isSelected: boolean
  // 是否显示 hover tooltip。
  showTooltip: boolean
  // 是否启用 hover 高亮和圆点放大。
  enableHoverEffects: boolean
  // 是否在 tooltip 中显示对象高度。
  showObjectHeight: boolean
  // 是否在 Korok tooltip 中显示 Korok 编号。
  showKorokId: boolean
  // 是否按 Actor 类型给兜底圆点 marker 上色。
  colorPerActor: boolean
  // 是否使用内部 Actor 名称作为 tooltip 标题。
  useActorNames: boolean
  // 点击 marker 后把对象选中状态交还给上层 store。
  onSelect: () => void
}

// 渲染单个地图对象；按优先级选择 Locations 文本标签、源站图标或兜底圆点。
export function ObjectMarker({
  object,
  renderLocationLabel,
  isSelected,
  showTooltip,
  enableHoverEffects,
  showObjectHeight,
  showKorokId,
  colorPerActor,
  useActorNames,
  onSelect,
}: ObjectMarkerProps) {
  const position = objectToLatLng(object)
  const displaySettings = { colorPerActor, useActorNames }

  if (renderLocationLabel && object.category === 'location') {
    return (
      <>
        <Marker
          position={position}
          icon={getLocationLabelIcon(object)}
          eventHandlers={{
            click: onSelect,
          }}
        >
          {showTooltip ? (
            <ObjectTooltip
              object={object}
              showObjectHeight={showObjectHeight}
              showKorokId={showKorokId}
              useActorNames={useActorNames}
            />
          ) : null}
        </Marker>
        {isSelected ? <SelectedObjectPin position={position} onSelect={onSelect} /> : null}
      </>
    )
  }

  const icon = object.iconKey ? getObjectIcon(object.iconKey) : null

  if (icon) {
    return (
      <>
        <Marker
          position={position}
          icon={icon}
          eventHandlers={{
            click: onSelect,
          }}
        >
          {showTooltip ? (
            <ObjectTooltip
              object={object}
              showObjectHeight={showObjectHeight}
              showKorokId={showKorokId}
              useActorNames={useActorNames}
            />
          ) : null}
        </Marker>
        {isSelected ? <SelectedObjectPin position={position} onSelect={onSelect} /> : null}
      </>
    )
  }

  return (
    <>
      {/* 圆点类对象没有源站图标，颜色模式在这里直接映射到 Leaflet path 样式。 */}
      <CircleMarker
        center={position}
        radius={8}
        pathOptions={{
          color: getObjectMarkerColor(object, displaySettings),
          fillColor: getObjectMarkerColor(object, displaySettings),
          fillOpacity: 0.82,
          weight: 2,
        }}
        eventHandlers={{
          click: onSelect,
          mouseout: (event) => {
            if (!enableHoverEffects) {
              return
            }

            event.target.setStyle({
              radius: 8,
              weight: 2,
            })
          },
          mouseover: (event) => {
            if (!enableHoverEffects) {
              return
            }

            event.target.setStyle({
              radius: 11,
              weight: 3,
            })
          },
        }}
      >
        {showTooltip ? (
          <ObjectTooltip
            object={object}
            showObjectHeight={showObjectHeight}
            showKorokId={showKorokId}
            useActorNames={useActorNames}
          />
        ) : null}
      </CircleMarker>
      {isSelected ? <SelectedObjectPin position={position} onSelect={onSelect} /> : null}
    </>
  )
}

const selectedObjectPinIcon = L.divIcon({
  className: 'selected-object-pin',
  html: '<span></span>',
  iconSize: L.point(36, 52),
  iconAnchor: L.point(18, 49),
})

function SelectedObjectPin({
  position,
  onSelect,
}: {
  // 选中 pin 的地图坐标；与被选中的对象 marker 共用同一位置。
  position: L.LatLngExpression
  // 点击 pin 时保持当前对象选中，避免覆盖底层 marker 的行为。
  onSelect: () => void
}) {
  return (
    <Marker
      position={position}
      icon={selectedObjectPinIcon}
      zIndexOffset={1000}
      eventHandlers={{
        click: onSelect,
      }}
    />
  )
}

function ObjectTooltip({
  object,
  showObjectHeight,
  showKorokId,
  useActorNames,
}: {
  // 当前 hover 的对象。
  object: MapObject
  // 是否把对象 y 坐标作为高度追加到 tooltip。
  showObjectHeight: boolean
  // 是否显示 Korok 编号。
  showKorokId: boolean
  // 是否使用内部 Actor 名称显示 tooltip 标题。
  useActorNames: boolean
}) {
  const subtitles = getObjectTooltipSubtitles(object, showObjectHeight, showKorokId)

  return (
    <Tooltip
      className="object-hover-tooltip"
      direction="left"
      offset={[-14, 0]}
      opacity={1}
    >
      <strong>{getObjectTitle(object, { useActorNames })}</strong>
      {subtitles.map((subtitle) => (
        <span key={subtitle}>{subtitle}</span>
      ))}
    </Tooltip>
  )
}

// 生成 hover 提示的副标题；优先展示掉落/宝箱内容，其次展示 Actor，避免 tooltip 过长。
function getObjectTooltipSubtitles(
  object: MapObject,
  showObjectHeight: boolean,
  showKorokId: boolean,
) {
  const subtitles: string[] = []

  if (object.drop?.values.length) {
    subtitles.push(object.drop.values.slice(0, 2).join(', '))
  } else if (object.displayName && object.name && object.name !== object.displayName) {
    subtitles.push(object.name)
  } else {
    subtitles.push(object.actor)
  }

  if (showObjectHeight) {
    subtitles.push(`Height: ${object.y}`)
  }

  if (showKorokId && object.category === 'korok' && object.rawParams?.korok_id) {
    subtitles.push(`Korok ID: ${object.rawParams.korok_id}`)
  }

  return subtitles
}
