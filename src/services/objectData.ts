import type { MapLayer, MapObject, ObjectDataSource, SearchMapType } from '../types/map'
import {
  STATIC_MARKER_TYPES,
  categoryColor,
  isRecord,
  iconKeyForCategory,
  normalizeRadarObject,
  normalizeStaticMarker as normalizeSharedStaticMarker,
  parseCategory,
  parseLayer,
  parseOptionalLayer,
  readFirstString,
  readNumber,
  readString,
  type RawStaticMarker,
  type StaticMarkerType,
} from '../utils/objectStandardization'

const LOCAL_OBJECTS_URL = '/data/objects/index.json'
const RADAR_OBJECTS_BASE_URL = 'https://radar-totk.zeldamods.org/objs'
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
  // 对象数据来源；local 读取 public 索引，remote 按 query 决定读取 static marker 或 radar API。
  source: ObjectDataSource
  // 搜索词；remote 模式下空搜索词不会请求 radar API，特殊内部值会加载 static marker。
  query: string
  // 远程 radar 搜索的地图类型；本地数据加载不使用。
  searchMapType?: SearchMapType
  // 远程 radar 搜索的地图名；空字符串表示源站 All。
  searchMapName?: string
  // React effect 清理时传入的取消信号，避免旧请求覆盖新状态。
  signal?: AbortSignal
}

type LocalObjectIndex = {
  // public/data/objects/index.json 的对象数组；兼容历史上直接数组和 { objects } 两种格式。
  objects?: unknown
}

// 源站 map_summary static.json 的顶层结构；markers 下按源站 Filter 分类存放静态点位。
type StaticMarkerIndex = {
  // static.json 顶层 markers 对象；key 是源站 marker 分组名。
  markers?: unknown
}

// LocationMarker 文本表；key 是 MessageID，value 是地图上显示的英文名。
type LocationNameIndex = Record<string, string>
// Dungeon 文本表；key 是 MessageID，value 是神庙显示名。
type StaticNameIndex = Record<string, string>

export async function loadObjects({
  source,
  query,
  searchMapType = 'MainAndMinusField',
  searchMapName = '',
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

  return loadRemoteObjects(cleanQuery, searchMapType, searchMapName, signal)
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

async function loadRemoteObjects(
  query: string,
  searchMapType: SearchMapType,
  searchMapName: string,
  signal?: AbortSignal,
) {
  const url = new URL(
    `${RADAR_OBJECTS_BASE_URL}/${encodeURIComponent(searchMapType)}/${encodeURIComponent(
      searchMapName,
    )}`,
  )
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

  return data
    .map((item) => normalizeRadarObject(item, { remoteNote: true }))
    .filter((object): object is MapObject => object !== null)
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
      const object = normalizeRemoteStaticMarker(
        marker as RawStaticMarker,
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
  const category = parseCategory(value.category)
  const displayLayers = Array.isArray(value.displayLayers)
    ? value.displayLayers.filter((layer): layer is MapLayer => parseOptionalLayer(layer) !== null)
    : undefined
  const equipment = Array.isArray(value.equipment)
    ? value.equipment.filter((item): item is string => typeof item === 'string')
    : undefined
  const drop = parseObjectDrop(value.drop)
  const rawParams = parseRawParams(value.rawParams)

  return {
    id: readString(value.id, 'unknown-object'),
    name: readString(value.name, 'Unnamed object'),
    displayName: readString(value.displayName, ''),
    actor: readString(value.actor, 'UnknownActor'),
    category,
    layer: parseLayer(value.layer),
    ...(displayLayers?.length ? { displayLayers } : {}),
    x: readNumber(value.x),
    y: readNumber(value.y),
    z: readNumber(value.z),
    color: readString(value.color, categoryColor(category)),
    iconKey: readString(value.iconKey, iconKeyForCategory(category)),
    showLevel: readString(value.showLevel, ''),
    priority:
      typeof value.priority === 'number' && Number.isFinite(value.priority)
        ? value.priority
        : undefined,
    sourceKind: value.sourceKind === 'static' ? 'static' : 'raw',
    mapType: readString(value.mapType, ''),
    mapName: readString(value.mapName, ''),
    fieldArea: readString(value.fieldArea, ''),
    region: readString(value.region, ''),
    locationId: readString(value.locationId, ''),
    ...(equipment?.length ? { equipment } : {}),
    ...(drop ? { drop } : {}),
    ...(rawParams && Object.keys(rawParams).length ? { rawParams } : {}),
    tags,
    note: readString(value.note, ''),
  }
}

function parseRawParams(value: unknown): MapObject['rawParams'] | undefined {
  if (!isRecord(value)) {
    return undefined
  }

  const entries = Object.entries(value).filter(
    (entry): entry is [string, string | number | boolean] => {
      const item = entry[1]

      return typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean'
    },
  )

  return entries.length ? Object.fromEntries(entries) : undefined
}

function parseObjectDrop(value: unknown): MapObject['drop'] | undefined {
  if (!isRecord(value)) {
    return undefined
  }

  const values = Array.isArray(value.values)
    ? value.values.filter((item): item is string => typeof item === 'string')
    : []
  const type = readString(value.type, '')

  if (!type && values.length === 0) {
    return undefined
  }

  return {
    type: type || 'Drop',
    values,
  }
}

function normalizeRemoteStaticMarker(
  // static.json 中某个 marker 分组下的原始 marker。
  value: RawStaticMarker,
  // 源站 marker 分组名，用于共享标准化规则判断分类、图标和图层。
  markerType: StaticMarkerType,
  // LocationMarker 文本表。
  locationNames: LocationNameIndex,
  // Dungeon 文本表。
  dungeonNames: StaticNameIndex,
): MapObject | null {
  const name = readFirstString(value.MessageID, readString(value.name, markerType))
  const displayName =
    markerType === 'Dungeon'
      ? readString(dungeonNames[name], '')
      : readString(locationNames[name], readString(value.name, ''))

  return normalizeSharedStaticMarker(value, {
    markerType,
    displayName,
    idPrefix: 'remote',
    note: `Remote static ${markerType} marker from zeldamods map summary.`,
  })
}
