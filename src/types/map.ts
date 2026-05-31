export type MapLayer = 'Sky' | 'Surface' | 'Depths'

export type TileSource = 'local' | 'remote'

export type ObjectDataSource = 'local' | 'remote'

export type SearchMapType =
  | 'MainAndMinusField'
  | 'SmallDungeon'
  | 'LargeDungeon'
  | 'NormalStage'
  | 'MainField'
  | 'MinusField'

export type SearchPreset = {
  // 预设显示名称；用于 Settings 自定义预设和搜索预设按钮。
  label: string
  // 预设写入搜索框的查询语句。
  query: string
}

export type MapAreaId =
  | 'none'
  | 'mapTower'
  | 'surfaceField'
  | 'depthsField'
  | 'caveField'
  | 'skyField'
  | 'skyRegions'
  | 'caveRegions'
  | 'caveRegionsDetail'
  | 'cherryBlossomTrees'

export type MapAreaOption = {
  id: MapAreaId
  label: string
  // 对应 public/data/map-areas 下的源站区域文件；none 不需要加载数据。
  fileName: string | null
  // 区域图层的默认描边颜色；源文件没有 style.color 时使用这个颜色。
  color: string
}

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

export type ObjectDrop = {
  // 掉落来源类型，例如 Actor 或 Table；来自 radar API 的 drop.type。
  type: string
  // 掉落内容列表；宝箱内容也复用这个结构。
  values: string[]
}

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
  // 源站地图类型，例如 MainField 或 MinusField；详情面板用于展示地图单元信息。
  mapType?: string
  // 源站地图单元名，例如 A-1；详情面板用于定位对象来源文件。
  mapName?: string
  // 源站 Field Area 名，例如 Surface3、DepthsField 等。
  fieldArea?: string
  // 源站区域名；通常是英文地理区域。
  region?: string
  // 源站 Location ID；保留原始 ID 便于和 zeldamods 数据对照。
  locationId?: string
  // 装备或关联物品列表；来自 radar API equip。
  equipment?: string[]
  // 掉落或宝箱内容；宝箱 category 下可作为宝箱内容展示。
  drop?: ObjectDrop
  // 精简保留的源站原始参数；避免把完整 raw JSON 塞入前端索引。
  rawParams?: Record<string, string | number | boolean>
  tags: string[]
  note: string
}
