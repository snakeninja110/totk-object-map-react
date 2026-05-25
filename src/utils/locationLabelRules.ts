import type { MapLayer, MapObject } from '../types/map'

// 源站总览缩放层级优先展示的区域名，用于把内部 ID 转成地图上的英文标签。
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

export function getObjectDisplayName(object: MapObject) {
  if (object.displayName) {
    return object.displayName
  }

  if (object.category === 'location') {
    return formatLocationLabel(object.name)
  }

  return object.name
}

export function formatLocationLabel(name: string) {
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

// 源站 Locations 使用 ShowLevel 控制不同缩放层级下逐步显示的地名数量。
export function shouldShowLocationLabel(
  object: MapObject,
  activeLayer: MapLayer,
  zoom: number,
) {
  if (object.name === 'Oasis') {
    return false
  }

  if (!isStaticLocationLabel(object) || !matchesSourceLocationLayer(object, activeLayer)) {
    return false
  }

  const showLevels = getLocationShowLevels(object)

  return (
    (showLevels.includes('Farthest') && zoom <= 4) ||
    (showLevels.includes('Far') && zoom === 5) ||
    (showLevels.includes('Near') && zoom === 5) ||
    (showLevels.includes('') && zoom >= 6) ||
    (showLevels.includes('Nearest') && zoom >= 6)
  )
}

// 只有静态地点标签才参与缩放分级；未归类的普通对象不能被当成地名渲染。
function isStaticLocationLabel(object: MapObject) {
  return (
    object.category === 'location' &&
    (object.priority !== undefined ||
      Boolean(object.showLevel) ||
      (object.note.startsWith('Remote radar API') && object.name.startsWith('MapRegion_')))
  )
}

// 源站用高度区间约束不同地图层的地点标签，这里保留同样的边界。
function matchesSourceLocationLayer(object: MapObject, activeLayer: MapLayer) {
  if (activeLayer === 'Sky') {
    return object.y >= 950
  }

  if (activeLayer === 'Depths') {
    return object.y <= -50
  }

  return object.y >= 0 && object.y <= 950
}

function getLocationShowLevels(object: MapObject) {
  if (object.showLevel !== undefined) {
    return object.showLevel.split(',').map((level) => level.trim())
  }

  if (object.note.startsWith('Remote radar API') && object.name.startsWith('MapRegion_')) {
    return ['Farthest']
  }

  return ['']
}
