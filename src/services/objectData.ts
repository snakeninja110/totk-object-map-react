import type {
  MapLayer,
  MapObject,
  ObjectCategory,
  ObjectDataSource,
} from '../types/map'

const LOCAL_OBJECTS_URL = '/data/objects/index.json'
const RADAR_OBJECTS_URL = 'https://radar-totk.zeldamods.org/objs/MainAndMinusField/'
const REMOTE_RESULT_LIMIT = 500

type LoadObjectsParams = {
  source: ObjectDataSource
  query: string
  signal?: AbortSignal
}

type LocalObjectIndex = {
  objects?: unknown
}

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

function parseMapObject(value: unknown): MapObject {
  if (!isRecord(value)) {
    throw new Error('Invalid object entry.')
  }

  const tags = Array.isArray(value.tags)
    ? value.tags.filter((tag): tag is string => typeof tag === 'string')
    : []

  return {
    id: readString(value.id, 'unknown-object'),
    name: readString(value.name, 'Unnamed object'),
    actor: readString(value.actor, 'UnknownActor'),
    category: parseCategory(value.category),
    layer: parseLayer(value.layer),
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
    tags,
    note: `Remote radar API result${mapName ? ` from ${mapType}/${mapName}` : ''}.`,
  }
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
