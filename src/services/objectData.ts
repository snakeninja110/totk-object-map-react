import type {
  MapLayer,
  MapObject,
  ObjectCategory,
  ObjectDataSource,
} from '../types/map'

const LOCAL_OBJECTS_URL = '/data/objects/index.json'
const RADAR_OBJECTS_URL = 'https://radar-totk.zeldamods.org/objs/MainAndMinusField/'
const REMOTE_STATIC_MARKERS_URL =
  'https://objmap-totk.zeldamods.org/game_files/map_summary/MainField/static.json'
const REMOTE_LOCATION_NAMES_URL =
  'https://objmap-totk.zeldamods.org/game_files/text/StaticMsg/LocationMarker.json'
const REMOTE_DUNGEON_NAMES_URL =
  'https://objmap-totk.zeldamods.org/game_files/text/StaticMsg/Dungeon.json'
const REMOTE_RESULT_LIMIT = 500

// Remote 静态 marker 的内部查询标记；用于复刻源站页面初始化时一次性加载全部筛选点位。
export const REMOTE_STATIC_MARKERS_QUERY = '__remote_static_markers__'

type LoadObjectsParams = {
  source: ObjectDataSource
  query: string
  signal?: AbortSignal
}

type LocalObjectIndex = {
  objects?: unknown
}

// 源站 map_summary static.json 的顶层结构；markers 下按源站 Filter 分类存放静态点位。
type StaticMarkerIndex = {
  markers?: unknown
}

// 源站静态 marker 的原始字段；字段名保持源数据大小写，便于直接映射。
type StaticMarker = {
  id?: unknown
  Icon?: unknown
  MessageID?: unknown
  Priority?: unknown
  Translate?: unknown
  SaveFlag?: unknown
  hash_id?: unknown
  ShowLevel?: unknown
  ShrineInCave?: unknown
  map_name?: unknown
  map_type?: unknown
  name?: unknown
}

type LocationNameIndex = Record<string, string>
type StaticNameIndex = Record<string, string>
type StaticMarkerType =
  | 'Location'
  | 'Dungeon'
  | 'Place'
  | 'Tower'
  | 'Shop'
  | 'Labo'
  | 'Chasm'
  | 'Cave'
  | 'Korok'
  | 'DragonTears'
  | 'CheckPoint'
  | 'Dispensers'

type RadarObject = {
  objid?: unknown
  hash_id?: unknown
  map_type?: unknown
  map_name?: unknown
  name?: unknown
  fieldarea?: unknown
  region?: unknown
  Location?: unknown
  pos?: unknown
  equip?: unknown
  drop?: unknown
  korok_id?: unknown
  korok_type?: unknown
}

export async function loadObjects({
  source,
  query,
  signal,
}: LoadObjectsParams): Promise<MapObject[]> {
  if (source === 'local') {
    return loadLocalObjects(signal)
  }

  const cleanQuery = query.trim()

  if (cleanQuery === REMOTE_STATIC_MARKERS_QUERY) {
    return loadRemoteStaticMarkers(signal)
  }

  if (cleanQuery.length < 2) {
    return []
  }

  return loadRemoteObjects(cleanQuery, signal)
}

async function loadLocalObjects(signal?: AbortSignal) {
  const response = await fetch(LOCAL_OBJECTS_URL, { signal })

  if (!response.ok) {
    throw new Error(`Failed to load local objects: ${response.status}`)
  }

  const data = (await response.json()) as LocalObjectIndex
  const objects = Array.isArray(data) ? data : data.objects

  if (!Array.isArray(objects)) {
    throw new Error('Local object index must be an array or contain objects[].')
  }

  return objects.map(parseMapObject)
}

async function loadRemoteObjects(query: string, signal?: AbortSignal) {
  const url = new URL(RADAR_OBJECTS_URL)
  url.searchParams.set('q', query)
  url.searchParams.set('withMapNames', 'true')
  url.searchParams.set('limit', String(REMOTE_RESULT_LIMIT))

  const response = await fetch(url, { signal })

  if (!response.ok) {
    throw new Error(`Failed to load remote objects: ${response.status}`)
  }

  const data = await response.json()

  if (!Array.isArray(data)) {
    throw new Error('Remote object response must be an array.')
  }

  return data.map(normalizeRadarObject)
}

async function loadRemoteStaticMarkers(signal?: AbortSignal) {
  const [markerResponse, locationNameResponse, dungeonNameResponse] = await Promise.all([
    fetch(REMOTE_STATIC_MARKERS_URL, { signal }),
    fetch(REMOTE_LOCATION_NAMES_URL, { signal }),
    fetch(REMOTE_DUNGEON_NAMES_URL, { signal }),
  ])

  if (!markerResponse.ok) {
    throw new Error(`Failed to load remote static markers: ${markerResponse.status}`)
  }

  if (!locationNameResponse.ok) {
    throw new Error(`Failed to load remote location names: ${locationNameResponse.status}`)
  }

  if (!dungeonNameResponse.ok) {
    throw new Error(`Failed to load remote dungeon names: ${dungeonNameResponse.status}`)
  }

  const data = (await markerResponse.json()) as StaticMarkerIndex
  const locationNames = (await locationNameResponse.json()) as LocationNameIndex
  const dungeonNames = (await dungeonNameResponse.json()) as StaticNameIndex
  const markerGroups = isRecord(data.markers) ? data.markers : {}
  const objects: MapObject[] = []

  for (const markerType of STATIC_MARKER_TYPES) {
    const markers = Array.isArray(markerGroups[markerType]) ? markerGroups[markerType] : []

    for (const marker of markers) {
      const object = normalizeStaticMarker(
        marker as StaticMarker,
        markerType,
        locationNames,
        dungeonNames,
      )

      if (object) {
        objects.push(object)
      }
    }
  }

  return objects
}

function parseMapObject(value: unknown): MapObject {
  if (!isRecord(value)) {
    throw new Error('Invalid object entry.')
  }

  const tags = Array.isArray(value.tags)
    ? value.tags.filter((tag): tag is string => typeof tag === 'string')
    : []
  const displayLayers = Array.isArray(value.displayLayers)
    ? value.displayLayers.filter((layer): layer is MapLayer => parseOptionalLayer(layer) !== null)
    : undefined

  return {
    id: readString(value.id, 'unknown-object'),
    name: readString(value.name, 'Unnamed object'),
    displayName: readString(value.displayName, ''),
    actor: readString(value.actor, 'UnknownActor'),
    category: parseCategory(value.category),
    layer: parseLayer(value.layer),
    ...(displayLayers?.length ? { displayLayers } : {}),
    x: readNumber(value.x),
    y: readNumber(value.y),
    z: readNumber(value.z),
    color: readString(value.color, categoryColor(parseCategory(value.category))),
    iconKey: readString(value.iconKey, ''),
    showLevel: readString(value.showLevel, ''),
    priority:
      typeof value.priority === 'number' && Number.isFinite(value.priority)
        ? value.priority
        : undefined,
    sourceKind: value.sourceKind === 'static' ? 'static' : 'raw',
    tags,
    note: readString(value.note, ''),
  }
}

function normalizeRadarObject(value: RadarObject): MapObject {
  const actor = readString(value.name, 'UnknownActor')
  const category = inferCategory(value)
  const layer = inferLayer(value)
  const pos = Array.isArray(value.pos) ? value.pos : []
  const x = readNumber(pos[0])
  const y = readNumber(pos[1])
  const z = readNumber(pos[2])
  const mapType = readString(value.map_type, '')
  const mapName = readString(value.map_name, '')
  const region = readString(value.region, '')
  const location = readString(value.Location, '')
  const tags = [category, layer, mapType, mapName, region, location].filter(Boolean)

  return {
    id: readString(value.hash_id, String(value.objid ?? `${actor}-${x}-${y}-${z}`)),
    name: formatObjectName(value, actor),
    actor,
    category,
    layer,
    x,
    y,
    z,
    color: categoryColor(category),
    ...(iconKeyForCategory(category) ? { iconKey: iconKeyForCategory(category) } : {}),
    sourceKind: 'raw',
    tags,
    note: `Remote radar API result${mapName ? ` from ${mapType}/${mapName}` : ''}.`,
  }
}

function normalizeStaticMarker(
  value: StaticMarker,
  markerType: StaticMarkerType,
  locationNames: LocationNameIndex,
  dungeonNames: StaticNameIndex,
): MapObject | null {
  const translate = isRecord(value.Translate) ? value.Translate : {}
  const x = readNumber(translate.X)
  const y = readNumber(translate.Y)
  const z = readNumber(translate.Z)
  const name = readFirstString(value.MessageID, readString(value.name, markerType))
  const id = readString(value.hash_id, readString(value.id, `remote-${markerType}-${x}-${y}-${z}`))
  const category = categoryForStaticMarker(markerType)
  const layer = inferStaticMarkerLayer(markerType, value, y)
  const displayLayers = inferStaticMarkerDisplayLayers(markerType, value, y)
  const displayName =
    markerType === 'Dungeon'
      ? readString(dungeonNames[name], '')
      : readString(locationNames[name], readString(value.name, ''))
  const showLevel = typeof value.ShowLevel === 'string' ? value.ShowLevel : undefined
  const priority =
    typeof value.Priority === 'number' && Number.isFinite(value.Priority)
      ? value.Priority
      : undefined

  if (!id || !Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
    return null
  }

  return {
    id,
    name,
    ...(displayName ? { displayName } : {}),
    actor: staticMarkerActor(markerType),
    category,
    layer,
    ...(displayLayers ? { displayLayers } : {}),
    x,
    y,
    z,
    color: categoryColor(category),
    ...(iconKeyForStaticMarker(markerType, readString(value.Icon, ''), Boolean(value.ShrineInCave))
      ? {
          iconKey: iconKeyForStaticMarker(
            markerType,
            readString(value.Icon, ''),
            Boolean(value.ShrineInCave),
          ),
        }
      : {}),
    ...(showLevel !== undefined ? { showLevel } : {}),
    ...(priority !== undefined ? { priority } : {}),
    sourceKind: 'static',
    tags: [category, layer, `remote-static-${markerType}`, name, displayName].filter(Boolean),
    note: `Remote static ${markerType} marker from zeldamods map summary.`,
  }
}

const STATIC_MARKER_TYPES: StaticMarkerType[] = [
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
]

// 源站把这些编号的 Shrine 归到 Sky，其余 Dungeon marker 默认归到 Surface。
const SKY_SHRINE_NUMBERS = new Set([
  38, 105, 43, 151, 34, 149, 82, 128, 117, 148, 121, 145, 15, 55, 60, 62, 63,
  61, 71, 109, 150, 127, 83, 93, 66, 146, 45, 50, 69, 110, 99, 52,
])

function categoryForStaticMarker(markerType: StaticMarkerType): ObjectCategory {
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

function inferStaticMarkerLayer(
  markerType: StaticMarkerType,
  marker: StaticMarker,
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

  if (y >= 950) {
    return 'Sky'
  }

  if (y <= -50) {
    return 'Depths'
  }

  return 'Surface'
}

function inferStaticMarkerDisplayLayers(
  markerType: StaticMarkerType,
  marker: StaticMarker,
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

function readDungeonNumber(messageId: string) {
  const match = messageId.match(/^Dungeon(\d+)/)

  return match ? Number(match[1]) : -1
}

function staticMarkerActor(markerType: StaticMarkerType) {
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

function iconKeyForStaticMarker(
  markerType: StaticMarkerType,
  icon: string,
  shrineInCave: boolean,
) {
  if (markerType === 'Dungeon') {
    return shrineInCave ? 'shrine_cave' : 'shrine'
  }

  const iconMap: Record<string, string> = {
    Bargainer: 'bargainer',
    Battery: 'battery',
    Castle: 'castle',
    Cave: 'cave',
    Chasm: 'chasm',
    CheckPoint: 'checkpoint',
    Dispenser: 'dispenser',
    Drink: 'drink',
    Dungeon: 'shrine',
    Hatago: 'hatago',
    Labo: 'labo',
    Lightroot: 'lightroot',
    ShopBougu: 'shop_bougu',
    ShopColor: 'shop_color',
    ShopJewel: 'shop_jewel',
    ShopYadoya: 'shop_yadoya',
    ShopYorozu: 'shop_yorozu',
    Star: 'star',
    Sword: 'sword',
    Tear: 'tear',
    Tower: 'tower',
    Village: 'village',
    Well: 'well',
  }

  if (markerType === 'Korok') {
    return 'korok'
  }

  return iconMap[icon] ?? iconMap[markerType] ?? ''
}

function iconKeyForCategory(category: ObjectCategory) {
  return {
    location: '',
    place: 'village',
    cave: 'cave',
    chasm: 'chasm',
    dragonTear: 'tear',
    dispenser: 'dispenser',
    korok: 'korok',
    shop: 'shop_yorozu',
    lightroot: 'lightroot',
    techLab: 'labo',
    tower: 'tower',
    shrine: 'shrine',
    chest: '',
    weapon: '',
    enemy: '',
  }[category]
}

function formatObjectName(value: RadarObject, actor: string) {
  const location = readString(value.Location, '')
  const region = readString(value.region, '')

  if (location) {
    return location
  }

  if (region) {
    return `${actor} (${region})`
  }

  return actor
}

function inferCategory(value: RadarObject): ObjectCategory {
  const actor = readString(value.name, '')
  const location = readString(value.Location, '')
  const fieldArea = readString(value.fieldarea, '')
  const text = [
    actor,
    location,
    fieldArea,
    value.map_name,
    value.region,
    value.korok_id,
    value.korok_type,
  ]
    .join(' ')
    .toLowerCase()

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
    readString(value.map_type, '') !== 'MinusField' &&
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

function isKorokSeedActor(actor: string) {
  return (
    actor.startsWith('Npc_HiddenKorok') ||
    actor.startsWith('Obj_LiftRockWhite_Korok') ||
    actor.startsWith('Obj_DecorationLiftRockWhite_Korok') ||
    actor.startsWith('KorokCarry')
  )
}

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

function isPlaceLocationId(location: string) {
  return PLACE_LOCATION_IDS.has(location)
}

function inferLayer(value: RadarObject): MapLayer {
  const mapType = readString(value.map_type, '')
  const mapName = readString(value.map_name, '')
  const fieldArea = readString(value.fieldarea, '')
  const y = Array.isArray(value.pos) ? readNumber(value.pos[1]) : 0

  if (mapType === 'MinusField' || fieldArea.startsWith('Depths')) {
    return 'Depths'
  }

  if (mapName.includes('Sky') || fieldArea.startsWith('Sky') || y > 600) {
    return 'Sky'
  }

  return 'Surface'
}

function parseCategory(value: unknown): ObjectCategory {
  if (
    value === 'location' ||
    value === 'place' ||
    value === 'cave' ||
    value === 'chasm' ||
    value === 'dragonTear' ||
    value === 'dispenser' ||
    value === 'korok' ||
    value === 'shop' ||
    value === 'lightroot' ||
    value === 'techLab' ||
    value === 'tower' ||
    value === 'shrine' ||
    value === 'chest' ||
    value === 'weapon' ||
    value === 'enemy'
  ) {
    return value
  }

  return 'location'
}

function parseLayer(value: unknown): MapLayer {
  if (value === 'Sky' || value === 'Surface' || value === 'Depths') {
    return value
  }

  return 'Surface'
}

function parseOptionalLayer(value: unknown): MapLayer | null {
  if (value === 'Sky' || value === 'Surface' || value === 'Depths') {
    return value
  }

  return null
}

function categoryColor(category: ObjectCategory) {
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

function readNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function readString(value: unknown, fallback: string) {
  return typeof value === 'string' && value.length > 0 ? value : fallback
}

function readFirstString(value: unknown, fallback: string) {
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
