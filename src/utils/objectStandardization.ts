import type { MapLayer, MapObject, ObjectCategory } from '../types/map'
import {
  categoryDefaultIconKeys,
  sourceIconKeyMap,
  type ObjectIconKey,
} from '../constants/objectIconConfig.ts'

// 前端支持的全部对象分类；离线构建统计、解析兜底和排序都以这个列表为准。
export const OBJECT_CATEGORIES: ObjectCategory[] = [
  'location',
  'place',
  'cave',
  'chasm',
  'dragonTear',
  'dispenser',
  'korok',
  'shop',
  'lightroot',
  'techLab',
  'tower',
  'shrine',
  'chest',
  'weapon',
  'enemy',
]

// TotK 地图三层；共享给离线构建脚本，避免脚本和前端的图层枚举漂移。
export const MAP_LAYERS: MapLayer[] = ['Sky', 'Surface', 'Depths']

// 源站 static.json 中 markers 的分组名；这些名字决定主 Filter 面板的静态点位口径。
export const STATIC_MARKER_TYPES = [
  'Location',
  'Dungeon',
  'Place',
  'Tower',
  'Shop',
  'Labo',
  'Chasm',
  'Cave',
  'Korok',
  'DragonTears',
  'CheckPoint',
  'Dispensers',
] as const

export type StaticMarkerType = (typeof STATIC_MARKER_TYPES)[number]

export type RawRadarObject = {
  // radar API 的数字对象 ID；hash_id 缺失时参与生成兜底 ID。
  objid?: unknown
  // radar API 和 static marker 都可能提供的稳定 ID；优先作为 MapObject.id。
  hash_id?: unknown
  // 源站地图类型，例如 MainField、MinusField；用于推断 Depths。
  map_type?: unknown
  // 源站地图文件名；包含 Sky/Minus 等关键词时用于推断图层。
  map_name?: unknown
  // 游戏 Actor 名；用于分类、搜索和兜底显示名。
  name?: unknown
  // Field area 名；用于图层、分类和搜索标签。
  fieldarea?: unknown
  // 区域名；无 Location 时会参与显示名。
  region?: unknown
  // 源站 Location ID；优先作为显示名，并用于识别神庙、地点、光根等分类。
  Location?: unknown
  // 原始坐标数组 [x, y, z]。
  pos?: unknown
  // 装备或物品标签；离线索引会纳入搜索 tags。
  equip?: unknown
  // 掉落信息；离线索引 note 会摘要它。
  drop?: unknown
  // 源站缩放参数；详情面板作为原始参数展示。
  scale?: unknown
  // 源站是否为静态地图对象的标记；详情面板作为原始参数展示。
  map_static?: unknown
  // Korok 编号；存在时用于生成 Korok 显示名。
  korok_id?: unknown
  // Korok 类型；参与分类文本匹配。
  korok_type?: unknown
}

export type RawStaticMarker = {
  // static marker 的本地 ID；hash_id 缺失时参与生成兜底 ID。
  id?: unknown
  // 源站图标名，例如 Cave、Well、Chasm；用于映射本地图标 key。
  Icon?: unknown
  // 文本资源 ID；用于关联 LocationMarker/Dungeon 文本表。
  MessageID?: unknown
  // 源站显示优先级；Locations 标签缩放显示会读取它。
  Priority?: unknown
  // 源站静态点位坐标对象，字段为 X/Y/Z。
  Translate?: unknown
  // 源站保存标记；当前保留类型占位，后续详情字段可能使用。
  SaveFlag?: unknown
  // 源站稳定 hash ID；优先作为 MapObject.id。
  hash_id?: unknown
  // Locations 标签显示级别，例如 Farthest、Near、Nearest。
  ShowLevel?: unknown
  // 神庙是否位于洞穴内；用于选择 shrine_cave 图标。
  ShrineInCave?: unknown
  // 静态 marker 所属源站地图文件名；天空/地底设备等需要它推断图层。
  map_name?: unknown
  // 静态 marker 所属源站地图类型。
  map_type?: unknown
  // 源站提供的兜底名称。
  name?: unknown
}

export type StaticMarkerInfo = {
  // static.json 的 marker 分组名；决定分类、Actor 名和部分图层规则。
  markerType: StaticMarkerType
  // 源站 Icon 字段，雷达对象与 static marker 合并时用于优先选择源站图标。
  icon: string
  // 已从文本表解析出的展示名称。
  displayName?: string
  // Locations 标签显示级别。
  showLevel?: string
  // 源站显示优先级。
  priority?: number
  // 神庙是否在洞穴内。
  shrineInCave?: boolean
}

type NormalizeRadarObjectOptions = {
  // 当前抓取或搜索 query；离线构建会把它写入 tags，帮助本地搜索。
  query?: string
  // 与当前 radar 对象 hash_id 对应的 static marker；存在时优先采用静态分类和图标。
  staticMarker?: StaticMarkerInfo | null
  // 离线构建时丢弃无法匹配 static marker 的普通 location，避免地点类 raw 数据过多。
  dropUnmatchedLocations?: boolean
  // 前端远程搜索使用短 note，离线索引用更完整的来源和掉落摘要。
  remoteNote?: boolean
}

type NormalizeStaticMarkerOptions = {
  // static.json 的 marker 分组名；决定输出分类和 Actor。
  markerType: StaticMarkerType
  // 调用方从文本表解析出的展示名称。
  displayName?: string
  // hash_id/id 都缺失时生成兜底 ID 的前缀，用于区分 remote 和 local static 来源。
  idPrefix: string
  // 输出到 MapObject.note 的来源说明。
  note: string
}

// 雷达对象和源站静态 marker 的共享标准化规则；前端远程模式和离线构建脚本都从这里取规则。
export function normalizeRadarObject(
  // radar API 返回的单条原始对象。
  value: RawRadarObject,
  // 标准化上下文；用于区分前端远程搜索和离线索引构建。
  options: NormalizeRadarObjectOptions = {},
): MapObject | null {
  if (!isRecord(value)) {
    return null
  }

  const actor = readString(value.name, 'UnknownActor')
  const pos = Array.isArray(value.pos) ? value.pos : []
  const x = readNumber(pos[0])
  const y = readNumber(pos[1])
  const z = readNumber(pos[2])
  const id = readString(value.hash_id, String(value.objid ?? `${actor}-${x}-${y}-${z}`))

  if (!id || !Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
    return null
  }

  const staticMarker = options.staticMarker ?? null
  const category = inferCategory(value, options.query ?? '', staticMarker)

  if (options.dropUnmatchedLocations && !staticMarker && category === 'location') {
    return null
  }

  const layer = inferLayer(value)
  const iconKey = iconKeyForObject(value, category, staticMarker)
  const mapType = readString(value.map_type, '')
  const mapName = readString(value.map_name, '')
  const region = readString(value.region, '')
  const location = readString(value.Location, '')
  const fieldArea = readString(value.fieldarea, '')
  const equipment = readStringArray(value.equip)
  const drop = parseDrop(value.drop)
  const rawParams = compactRawParams({
    objid: value.objid,
    hash_id: value.hash_id,
    scale: value.scale,
    map_static: value.map_static,
    korok_id: value.korok_id,
    korok_type: value.korok_type,
  })
  const tags = unique([
    category,
    layer,
    mapType,
    mapName,
    region,
    location,
    fieldArea,
    options.query ?? '',
    ...equipment,
  ]).filter(Boolean)

  return {
    id,
    name: formatObjectName(value, actor),
    ...(staticMarker?.displayName ? { displayName: staticMarker.displayName } : {}),
    actor,
    category,
    layer,
    x,
    y,
    z,
    color: categoryColor(category),
    ...(iconKey ? { iconKey } : {}),
    ...(staticMarker?.showLevel ? { showLevel: staticMarker.showLevel } : {}),
    ...(staticMarker?.priority ? { priority: staticMarker.priority } : {}),
    sourceKind: staticMarker ? 'static' : 'raw',
    ...(mapType ? { mapType } : {}),
    ...(mapName ? { mapName } : {}),
    ...(fieldArea ? { fieldArea } : {}),
    ...(region ? { region } : {}),
    ...(location ? { locationId: location } : {}),
    ...(equipment.length ? { equipment } : {}),
    ...(drop ? { drop } : {}),
    ...(Object.keys(rawParams).length ? { rawParams } : {}),
    tags,
    note: options.remoteNote
      ? `Remote radar API result${mapName ? ` from ${mapType}/${mapName}` : ''}.`
      : objectNote(value, mapType, mapName),
  }
}

export function normalizeStaticMarker(
  // static.json 中某个 marker 分组下的单条原始 marker。
  value: RawStaticMarker,
  // 文本名、来源说明和 ID 前缀等调用方上下文。
  options: NormalizeStaticMarkerOptions,
): MapObject | null {
  const translate = isRecord(value.Translate) ? value.Translate : {}
  const x = readNumber(translate.X)
  const y = readNumber(translate.Y)
  const z = readNumber(translate.Z)
  const name = readFirstString(value.MessageID, readString(value.name, options.markerType))
  const id = readString(
    value.hash_id,
    readString(value.id, `${options.idPrefix}-${options.markerType}-${x}-${y}-${z}`),
  )
  const category = categoryForStaticMarker(options.markerType)
  const layer = inferStaticMarkerLayer(options.markerType, value, y)
  const displayLayers = inferStaticMarkerDisplayLayers(options.markerType, value, y)
  const iconKey = iconKeyForStaticMarker(
    options.markerType,
    readString(value.Icon, ''),
    Boolean(value.ShrineInCave),
  )
  const showLevel = readString(value.ShowLevel, '')
  const priority = readNumber(value.Priority)
  const rawParams = compactRawParams({
    id: value.id,
    hash_id: value.hash_id,
    Icon: value.Icon,
    MessageID: value.MessageID,
    Priority: value.Priority,
    SaveFlag: value.SaveFlag,
    ShowLevel: value.ShowLevel,
    ShrineInCave: value.ShrineInCave,
    map_type: value.map_type,
    map_name: value.map_name,
  })

  if (!id || !Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
    return null
  }

  return {
    id,
    name,
    ...(options.displayName ? { displayName: options.displayName } : {}),
    actor: staticMarkerActor(options.markerType),
    category,
    layer,
    ...(displayLayers ? { displayLayers } : {}),
    x,
    y,
    z,
    color: categoryColor(category),
    ...(iconKey ? { iconKey } : {}),
    ...(showLevel ? { showLevel } : {}),
    ...(priority ? { priority } : {}),
    sourceKind: 'static',
    ...(readString(value.map_type, '') ? { mapType: readString(value.map_type, '') } : {}),
    ...(readString(value.map_name, '') ? { mapName: readString(value.map_name, '') } : {}),
    ...(Object.keys(rawParams).length ? { rawParams } : {}),
    tags: [category, layer, `static-${options.markerType}`, name, options.displayName].filter(
      Boolean,
    ),
    note: options.note,
  }
}

export function categoryForStaticMarker(markerType: StaticMarkerType): ObjectCategory {
  const categories: Record<StaticMarkerType, ObjectCategory> = {
    Location: 'location',
    Dungeon: 'shrine',
    Place: 'place',
    Tower: 'tower',
    Shop: 'shop',
    Labo: 'techLab',
    Chasm: 'chasm',
    Cave: 'cave',
    Korok: 'korok',
    DragonTears: 'dragonTear',
    CheckPoint: 'lightroot',
    Dispensers: 'dispenser',
  }

  return categories[markerType]
}

export function inferStaticMarkerLayer(
  // static.json 的 marker 分组名。
  markerType: StaticMarkerType,
  // 原始 marker；读取 Icon、MessageID 和 map_name 推断特殊图层。
  marker: RawStaticMarker,
  // marker 高度；Locations、Cave/Well 等通用规则用它区分天空/地面/地底。
  y: number,
): MapLayer {
  const mapName = readString(marker.map_name, '')
  const icon = readString(marker.Icon, '')

  if (markerType === 'CheckPoint' || markerType === 'Chasm') {
    return 'Depths'
  }

  if (markerType === 'Tower' || markerType === 'Labo' || markerType === 'DragonTears') {
    return 'Surface'
  }

  if (markerType === 'Dungeon') {
    return SKY_SHRINE_NUMBERS.has(readDungeonNumber(readFirstString(marker.MessageID, '')))
      ? 'Sky'
      : 'Surface'
  }

  if (markerType === 'Korok' || markerType === 'Dispensers') {
    if (mapName.includes('Sky')) {
      return 'Sky'
    }

    if (mapName.includes('Depths') || mapName.includes('Minus')) {
      return 'Depths'
    }

    return 'Surface'
  }

  if (markerType === 'Cave' && icon === 'Chasm') {
    return 'Depths'
  }

  return inferStaticLocationLayer(y)
}

export function inferStaticMarkerDisplayLayers(
  // static.json 的 marker 分组名。
  markerType: StaticMarkerType,
  // 原始 marker；Chasm 可能出现在 Cave 分组里，所以需要读取 Icon。
  marker: RawStaticMarker,
  // marker 高度；源站只把地表高度范围内的 Chasm 同时显示在 Surface。
  y: number,
): MapLayer[] | undefined {
  const icon = readString(marker.Icon, '')

  if (markerType === 'Chasm' || (markerType === 'Cave' && icon === 'Chasm')) {
    const layers: MapLayer[] = ['Depths']

    if (y > -50 && y < 1000) {
      layers.unshift('Surface')
    }

    return layers
  }

  return undefined
}

export function staticMarkerActor(markerType: StaticMarkerType) {
  return {
    Location: 'LocationMarker',
    Dungeon: 'ShrineMarker',
    Place: 'PlaceMarker',
    Tower: 'TowerMarker',
    Shop: 'ShopMarker',
    Labo: 'TechLabMarker',
    Chasm: 'ChasmMarker',
    Cave: 'CaveMarker',
    Korok: 'KorokMarker',
    DragonTears: 'DragonTearsMarker',
    CheckPoint: 'LightrootMarker',
    Dispensers: 'DeviceDispenserMarker',
  }[markerType]
}

export function iconKeyForStaticMarker(
  // static.json 的 marker 分组名；Dungeon 和 Korok 有分组级特殊图标规则。
  markerType: StaticMarkerType,
  // 源站 Icon 字段。
  icon: string,
  // 洞穴神庙需要用独立图标，和普通神庙区分。
  shrineInCave: boolean,
) {
  if (markerType === 'Dungeon') {
    return shrineInCave ? 'shrine_cave' : 'shrine'
  }

  if (markerType === 'Korok') {
    return 'korok'
  }

  return sourceIconKeyMap[icon] ?? sourceIconKeyMap[markerType] ?? ''
}

export function iconKeyForCategory(category: ObjectCategory) {
  return categoryDefaultIconKeys[category] ?? ''
}

export function iconKeyForObject(
  // radar API 返回的原始对象；读取 Actor 和 Location 做兜底图标判断。
  value: RawRadarObject,
  // 已推断出的对象分类。
  category: ObjectCategory,
  // 匹配到的 static marker；存在时优先复用源站静态图标。
  staticMarker: StaticMarkerInfo | null = null,
) {
  if (staticMarker) {
    const staticIcon = iconKeyForStaticMarker(
      staticMarker.markerType,
      staticMarker.icon,
      Boolean(staticMarker.shrineInCave),
    )

    if (staticIcon) {
      return staticIcon
    }
  }

  const actor = readString(value.name, '')
  const location = readString(value.Location, '')
  const iconFromContext = iconKeyFromObjectContext({
    actor,
    category,
    location,
    mapName: readString(value.map_name, ''),
    fieldArea: readString(value.fieldarea, ''),
    region: readString(value.region, ''),
  })

  if (iconFromContext) {
    return iconFromContext
  }

  return iconKeyForCategory(category)
}

function iconKeyFromObjectContext({
  actor,
  category,
  location,
  mapName,
  fieldArea,
  region,
}: {
  // radar API 的 Actor 名；用于识别商店、洞穴、武器等没有 static marker 的对象。
  actor: string
  // 已标准化后的分类；不同分类使用不同的源站图标兜底策略。
  category: ObjectCategory
  // 源站 Location ID；地点、洞穴、商店和魔人像等会从这里识别细分图标。
  location: string
  // 源站地图单元名；作为图标细分的补充文本。
  mapName: string
  // 源站 Field Area；作为图标细分的补充文本。
  fieldArea: string
  // 源站区域名；作为图标细分的补充文本。
  region: string
}): ObjectIconKey | '' {
  const text = [actor, location, mapName, fieldArea, region].join(' ').toLowerCase()

  if (category === 'place') {
    if (text.includes('castle')) {
      return 'castle'
    }

    if (text.includes('hatago') || text.includes('stable')) {
      return 'hatago'
    }

    if (text.includes('demonstatue') || text.includes('bargainer')) {
      return 'bargainer'
    }

    return 'village'
  }

  if (category === 'cave') {
    return text.includes('well') ? 'well' : 'cave'
  }

  if (category === 'shop') {
    if (text.includes('bougu') || text.includes('armor') || text.includes('armour')) {
      return 'shop_bougu'
    }

    if (text.includes('color') || text.includes('dye')) {
      return 'shop_color'
    }

    if (text.includes('jewel') || text.includes('ore')) {
      return 'shop_jewel'
    }

    if (text.includes('yadoya') || text.includes('inn') || text.includes('hatago')) {
      return 'shop_yadoya'
    }

    if (text.includes('drink')) {
      return 'drink'
    }

    return 'shop_yorozu'
  }

  return ''
}

export function formatObjectName(value: RawRadarObject, actor: string) {
  const location = readString(value.Location, '')
  const region = readString(value.region, '')
  const korokId = readString(value.korok_id, '')

  if (location) {
    return location
  }

  if (korokId) {
    return `Korok ${korokId}`
  }

  if (region) {
    return `${actor} (${region})`
  }

  return actor
}

export function inferCategory(
  // radar API 返回的原始对象。
  value: RawRadarObject,
  // 当前抓取或搜索 query；离线分片抓取时可帮助识别部分对象。
  query = '',
  // 对应 static marker；存在时以 static marker 分组作为权威分类。
  staticMarker: StaticMarkerInfo | null = null,
): ObjectCategory {
  const actor = readString(value.name, '')
  const location = readString(value.Location, '')
  const fieldArea = readString(value.fieldarea, '')
  const mapType = readString(value.map_type, '')
  const text = [
    actor,
    location,
    fieldArea,
    value.map_name,
    value.region,
    value.korok_id,
    value.korok_type,
    query,
  ]
    .join(' ')
    .toLowerCase()

  if (staticMarker) {
    return categoryForStaticMarker(staticMarker.markerType)
  }

  if (isPlaceLocationId(location)) {
    return 'place'
  }

  if (text.includes('chasm')) {
    return 'chasm'
  }

  if (text.includes('dragontears') || text.includes('dragon tears')) {
    return 'dragonTear'
  }

  if (text.includes('dispenser')) {
    return 'dispenser'
  }

  if (text.includes('labo') || text.includes('tech lab')) {
    return 'techLab'
  }

  if (location.startsWith('Tower') || text.includes('skyview tower')) {
    return 'tower'
  }

  if (
    isKorokSeedActor(actor) &&
    mapType !== 'MinusField' &&
    !fieldArea.startsWith('Depths')
  ) {
    return 'korok'
  }

  if (text.includes('lightroot') || location.startsWith('CheckPoint')) {
    return 'lightroot'
  }

  if (text.includes('tbox') || text.includes('chest')) {
    return 'chest'
  }

  if (text.includes('enemy') || text.includes('monster')) {
    return 'enemy'
  }

  if (actor.startsWith('Weapon_')) {
    return 'weapon'
  }

  if (text.includes('shop') || actor.includes('Shop') || actor.includes('Npc_Shop')) {
    return 'shop'
  }

  if (location.startsWith('Dungeon') || actor.includes('Shrine')) {
    return 'shrine'
  }

  if (text.includes('cave')) {
    return 'cave'
  }

  return 'location'
}

export function inferLayer(value: RawRadarObject): MapLayer {
  const mapType = readString(value.map_type, '')
  const mapName = readString(value.map_name, '')
  const fieldArea = readString(value.fieldarea, '')
  const pos = Array.isArray(value.pos) ? value.pos : []
  const y = readNumber(pos[1])

  if (mapType === 'MinusField' || fieldArea.startsWith('Depths')) {
    return 'Depths'
  }

  if (mapName.includes('Sky') || fieldArea.startsWith('Sky') || y > 600) {
    return 'Sky'
  }

  return 'Surface'
}

export function parseCategory(value: unknown): ObjectCategory {
  return OBJECT_CATEGORIES.includes(value as ObjectCategory)
    ? (value as ObjectCategory)
    : 'location'
}

export function parseLayer(value: unknown): MapLayer {
  return parseOptionalLayer(value) ?? 'Surface'
}

export function parseOptionalLayer(value: unknown): MapLayer | null {
  return MAP_LAYERS.includes(value as MapLayer) ? (value as MapLayer) : null
}

export function categoryColor(category: ObjectCategory) {
  return {
    location: '#8fd3a5',
    place: '#e0c46a',
    cave: '#d4a373',
    chasm: '#d5962a',
    dragonTear: '#e9f4ff',
    dispenser: '#99e3cb',
    korok: '#7dd36f',
    shop: '#f6a04d',
    lightroot: '#b6f3ff',
    techLab: '#8ebaff',
    tower: '#71c7ff',
    shrine: '#69d2ff',
    chest: '#f0c35d',
    weapon: '#a78bfa',
    enemy: '#ff7869',
  }[category]
}

export function readNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

export function readString(value: unknown, fallback: string) {
  return typeof value === 'string' && value.length > 0 ? value : fallback
}

export function readFirstString(value: unknown, fallback: string) {
  if (typeof value === 'string' && value.length > 0) {
    return value
  }

  if (Array.isArray(value)) {
    const first = value.find((item) => typeof item === 'string' && item.length > 0)

    if (first) {
      return first
    }
  }

  return fallback
}

export function readStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.length > 0)
    : []
}

export function unique<T>(values: T[]) {
  return [...new Set(values)]
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function parseDrop(value: unknown): MapObject['drop'] | undefined {
  if (!isRecord(value)) {
    return undefined
  }

  const type = readString(value.type, '')
  const values = readStringArray(value.value)

  if (!type && values.length === 0) {
    return undefined
  }

  return {
    type: type || 'Drop',
    values,
  }
}

function compactRawParams(values: Record<string, unknown>) {
  const params: Record<string, string | number | boolean> = {}

  for (const [key, value] of Object.entries(values)) {
    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      params[key] = value
    }
  }

  return params
}

function objectNote(value: RawRadarObject, mapType: string, mapName: string) {
  const parts = []
  const fieldArea = readString(value.fieldarea, '')
  const drop = isRecord(value.drop) ? value.drop : null

  if (mapType || mapName) {
    parts.push(`Source: ${[mapType, mapName].filter(Boolean).join('/')}`)
  }

  if (fieldArea) {
    parts.push(`Field area: ${fieldArea}`)
  }

  if (drop) {
    const dropType = readString(drop.type, 'Drop')
    const dropValue = Array.isArray(drop.value) ? drop.value.join(', ') : ''
    parts.push(`${dropType}: ${dropValue}`)
  }

  return parts.join('. ')
}

function inferStaticLocationLayer(y: number): MapLayer {
  if (y >= 950) {
    return 'Sky'
  }

  if (y <= -50) {
    return 'Depths'
  }

  return 'Surface'
}

function readDungeonNumber(messageId: string) {
  const match = messageId.match(/^Dungeon(\d+)/)

  return match ? Number(match[1]) : -1
}

function isKorokSeedActor(actor: string) {
  return (
    actor.startsWith('Npc_HiddenKorok') ||
    actor.startsWith('Obj_LiftRockWhite_Korok') ||
    actor.startsWith('Obj_DecorationLiftRockWhite_Korok') ||
    actor.startsWith('KorokCarry')
  )
}

function isPlaceLocationId(location: string) {
  return PLACE_LOCATION_IDS.has(location)
}

// 源站把这些编号的 Shrine 归到 Sky，其余 Dungeon marker 默认归到 Surface。
const SKY_SHRINE_NUMBERS = new Set([
  38, 105, 43, 151, 34, 149, 82, 128, 117, 148, 121, 145, 15, 55, 60, 62, 63,
  61, 71, 109, 150, 127, 83, 93, 66, 146, 45, 50, 69, 110, 99, 52,
])

const PLACE_LOCATION_IDS = new Set([
  'City_BaseCamp',
  'Cokiri',
  'Gerudo',
  'Goron',
  'Hateno',
  'Kakariko',
  'Rito',
  'Taura',
  'UMiiVillage',
  'WhiteZora',
  'HorseStableBranchOffice_Gerudo',
  'HorseStableBranchOffice_BaseCamp',
  'DeathMountainHatago',
  'FaronHatago000',
  'FaronHatago001',
  'FaronHatago002',
  'ForestHatago',
  'GerudoHatago',
  'HyruleDepthHatago',
  'NewHyruleWestHatago',
  'NorthHatelHatago',
  'RiverSideHatago',
  'TabantaBridgeHatago',
  'TabantaHatago',
  'TamourHatago',
  'TamurulHatago_02',
  'DemonStatue_00',
  'MinusField_AncientTimeShrine',
  'MinusField_KingValley',
  'DemonStatue_03',
  'DemonStatue_04',
  'DemonStatue_05',
  'DemonStatue_01',
])
