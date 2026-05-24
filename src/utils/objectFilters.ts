import type { MapLayer, MapObject } from '../types/map'

// 地图当前视口的游戏坐标边界；Leaflet Simple CRS 中 lng 对应 x，lat 对应 z。
export type ViewportBounds = {
  minX: number
  maxX: number
  minZ: number
  maxZ: number
}

// 判断对象是否显示在当前图层；Chasm 等源站静态 marker 可能跨多个图层显示。
export function objectMatchesLayer(object: MapObject, activeLayer: MapLayer) {
  return object.displayLayers?.includes(activeLayer) ?? object.layer === activeLayer
}

// 源站 Filter 面板的主分类默认只展示 static marker，raw radar 对象只用于搜索场景。
export function isSourceStaticFilterCategory(category: MapObject['category']) {
  return (
    category === 'location' ||
    category === 'place' ||
    category === 'cave' ||
    category === 'chasm' ||
    category === 'dragonTear' ||
    category === 'dispenser' ||
    category === 'korok' ||
    category === 'shop' ||
    category === 'lightroot' ||
    category === 'techLab' ||
    category === 'tower' ||
    category === 'shrine'
  )
}

// 判断对象是否落在当前地图视口内，用于避免一次性渲染过多 marker。
export function isObjectInViewport(object: MapObject, bounds: ViewportBounds) {
  return (
    object.x >= bounds.minX &&
    object.x <= bounds.maxX &&
    object.z >= bounds.minZ &&
    object.z <= bounds.maxZ
  )
}
