export type MapLayer = 'Sky' | 'Surface' | 'Depths'

export type TileSource = 'local' | 'remote'

export type ObjectDataSource = 'local' | 'remote'

export type ObjectCategory =
  | 'location'
  | 'place'
  | 'cave'
  | 'chasm'
  | 'dragonTear'
  | 'dispenser'
  | 'korok'
  | 'shop'
  | 'lightroot'
  | 'techLab'
  | 'tower'
  | 'shrine'
  | 'chest'
  | 'weapon'
  | 'enemy'

export type MapObject = {
  id: string
  name: string
  // 地图上展示给用户看的名称；name 保留源数据 ID，便于追踪和搜索。
  displayName?: string
  actor: string
  category: ObjectCategory
  layer: MapLayer
  // 同一个源站静态 marker 可能跨图层显示，例如 Chasm 同时显示在 Surface 和 Depths。
  displayLayers?: MapLayer[]
  x: number
  y: number
  z: number
  color: string
  iconKey?: string
  showLevel?: string
  priority?: number
  // 对象来源口径：static 用于源站 Filter 静态点位，raw 用于 radar 原始对象搜索。
  sourceKind?: 'static' | 'raw'
  tags: string[]
  note: string
}
