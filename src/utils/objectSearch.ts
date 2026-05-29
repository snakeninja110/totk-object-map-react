import { OBJECT_CATEGORIES, MAP_LAYERS } from './objectStandardization'
import type { MapObject, ObjectCategory, MapLayer } from '../types/map'

export type SearchFilterField =
  | 'actor'
  | 'category'
  | 'drop'
  | 'equipment'
  | 'hash'
  | 'layer'
  | 'location'
  | 'map'
  | 'raw'
  | 'region'
  | 'tag'

export type SearchFilter = {
  // 搜索字段名；来自用户输入中的 actor:、drop:、map: 等前缀。
  field: SearchFilterField
  // 字段过滤值；保留原始大小写，匹配时再统一规整。
  value: string
}

export type ParsedObjectSearch = {
  // 没有字段前缀的普通搜索词；用于 Fuse 模糊搜索和远程 API 查询。
  terms: string[]
  // 带字段前缀的结构化过滤条件；所有条件都必须同时命中。
  filters: SearchFilter[]
}

const SEARCH_TOKEN_PATTERN = /(\w+):(?:"([^"]+)"|(\S+))|(?:"([^"]+)"|(\S+))/g

const SEARCH_FIELD_ALIASES: Record<string, SearchFilterField> = {
  actor: 'actor',
  cat: 'category',
  category: 'category',
  class: 'category',
  drop: 'drop',
  drops: 'drop',
  equip: 'equipment',
  equipment: 'equipment',
  hash: 'hash',
  id: 'hash',
  layer: 'layer',
  location: 'location',
  loc: 'location',
  map: 'map',
  mapname: 'map',
  raw: 'raw',
  param: 'raw',
  params: 'raw',
  region: 'region',
  tag: 'tag',
  tags: 'tag',
}

// 解析对象搜索框内容；支持普通词和 field:value 两种语法，可处理带引号的值。
export function parseObjectSearch(query: string): ParsedObjectSearch {
  const terms: string[] = []
  const filters: SearchFilter[] = []

  for (const match of query.matchAll(SEARCH_TOKEN_PATTERN)) {
    const rawField = match[1]?.toLowerCase()
    const value = match[2] ?? match[3] ?? match[4] ?? match[5] ?? ''

    if (!value) {
      continue
    }

    const field = rawField ? SEARCH_FIELD_ALIASES[rawField] : undefined

    if (field) {
      filters.push({ field, value })
    } else {
      terms.push(value)
    }
  }

  return { terms, filters }
}

// 返回普通搜索词，用于 Fuse；只有结构化过滤时返回空字符串，避免误把语法本身拿去模糊匹配。
export function getPlainSearchText(parsedSearch: ParsedObjectSearch) {
  return parsedSearch.terms.join(' ').trim()
}

// 为远程 radar API 选择最合适的查询词；结构化字段无法直接下发时，用字段值做保守兜底。
export function getRemoteObjectSearchText(parsedSearch: ParsedObjectSearch) {
  const plainText = getPlainSearchText(parsedSearch)

  if (plainText) {
    return plainText
  }

  return (
    parsedSearch.filters.find((filter) =>
      filter.field === 'actor' ||
      filter.field === 'drop' ||
      filter.field === 'equipment' ||
      filter.field === 'hash' ||
      filter.field === 'location' ||
      filter.field === 'map' ||
      filter.field === 'region' ||
      filter.field === 'tag',
    )?.value ?? ''
  ).trim()
}

// 判断对象是否满足结构化搜索；普通词和字段条件都会参与匹配。
export function objectMatchesSearch(object: MapObject, parsedSearch: ParsedObjectSearch) {
  return (
    parsedSearch.terms.every((term) => objectTextMatches(object, term)) &&
    parsedSearch.filters.every((filter) => objectMatchesFilter(object, filter))
  )
}

function objectMatchesFilter(object: MapObject, filter: SearchFilter) {
  const value = normalize(filter.value)

  if (!value) {
    return true
  }

  switch (filter.field) {
    case 'actor':
      return includesNormalized(object.actor, value)
    case 'category':
      return categoryMatches(object.category, filter.value)
    case 'drop':
      return includesNormalized([object.drop?.type, ...(object.drop?.values ?? [])], value)
    case 'equipment':
      return includesNormalized(object.equipment ?? [], value)
    case 'hash':
      return includesNormalized(
        [object.id, object.rawParams?.objid, object.rawParams?.hash_id, object.rawParams?.id],
        value,
      )
    case 'layer':
      return layerMatches(object, filter.value)
    case 'location':
      return includesNormalized(
        [object.locationId, object.name, object.displayName, object.actor],
        value,
      )
    case 'map':
      return includesNormalized([object.mapType, object.mapName, object.fieldArea], value)
    case 'raw':
      return includesNormalized(rawParamText(object), value)
    case 'region':
      return includesNormalized(object.region ?? '', value)
    case 'tag':
      return includesNormalized(object.tags, value)
  }
}

function objectTextMatches(object: MapObject, term: string) {
  return includesNormalized(
    [
      object.id,
      object.name,
      object.displayName,
      object.actor,
      object.category,
      object.layer,
      object.mapType,
      object.mapName,
      object.fieldArea,
      object.region,
      object.locationId,
      object.drop?.type,
      ...(object.drop?.values ?? []),
      ...(object.equipment ?? []),
      ...object.tags,
    ],
    normalize(term),
  )
}

function categoryMatches(category: ObjectCategory, value: string) {
  const normalizedValue = normalizeCompact(value)

  return (
    normalizeCompact(category) === normalizedValue ||
    normalizeCompact(category).includes(normalizedValue) ||
    OBJECT_CATEGORIES.some(
      (item) => item === category && normalizeCompact(item).includes(normalizedValue),
    )
  )
}

function layerMatches(object: MapObject, value: string) {
  const normalizedValue = normalizeCompact(value)
  const layers = [object.layer, ...(object.displayLayers ?? [])]

  return layers.some(
    (layer) =>
      normalizeCompact(layer) === normalizedValue ||
      MAP_LAYERS.includes(value as MapLayer) && layer === value,
  )
}

function rawParamText(object: MapObject) {
  return Object.entries(object.rawParams ?? {}).map(([key, value]) => `${key}:${String(value)}`)
}

function includesNormalized(value: unknown, normalizedNeedle: string) {
  const values = Array.isArray(value) ? value : [value]

  return values.some((item) => normalize(String(item ?? '')).includes(normalizedNeedle))
}

function normalize(value: string) {
  return value.trim().toLowerCase()
}

function normalizeCompact(value: string) {
  return normalize(value).replace(/[^a-z0-9]/g, '')
}
