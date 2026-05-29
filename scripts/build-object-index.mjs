import { readdir, readFile, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'
import {
  MAP_LAYERS as LAYERS,
  OBJECT_CATEGORIES as CATEGORIES,
  STATIC_MARKER_TYPES,
  isRecord,
  normalizeRadarObject as normalizeSharedRadarObject,
  normalizeStaticMarker as normalizeSharedStaticMarker,
  readFirstString,
  readNumber,
  readString,
  unique,
} from '../src/utils/objectStandardization.ts'

const RAW_ROOT = path.resolve('public/data/objects/raw')
const STATIC_MARKERS_FILE = path.resolve(
  'public/data/objects/static/mainfield-static.json',
)
const LOCATION_NAMES_FILE = path.resolve(
  'public/data/objects/static/location-marker-names.json',
)
const DUNGEON_NAMES_FILE = path.resolve(
  'public/data/objects/static/dungeon-names.json',
)
const OUT_FILE = path.resolve('public/data/objects/index.json')
const rawFiles = await collectJsonFiles(RAW_ROOT)
const staticMarkerData = await readStaticMarkers()
// 按 hash_id 建立 static marker 索引；raw radar 对象命中后会继承源站静态分类、图标和展示名。
const staticMarkersByHashId = staticMarkerData.byHashId
// 以 MapObject.id 去重和合并 raw/static 数据；最终输出前再排序。
const objectsById = new Map()
// 构建过程统计信息；写入 index.json 便于后续完整性检查和复盘。
const stats = {
  rawFiles: 0,
  rawRecords: 0,
  duplicateRecords: 0,
  invalidRecords: 0,
  staticMarkerRecords: 0,
  outputRecords: 0,
  categories: Object.fromEntries(CATEGORIES.map((category) => [category, 0])),
  layers: Object.fromEntries(LAYERS.map((layer) => [layer, 0])),
}

for (const file of rawFiles) {
  if (path.basename(file) === 'manifest.json') {
    continue
  }

  const raw = JSON.parse(await readFile(file, 'utf8'))
  const rawObjects = Array.isArray(raw.objects) ? raw.objects : null

  if (!rawObjects) {
    continue
  }

  stats.rawFiles += 1
  stats.rawRecords += rawObjects.length

  for (const rawObject of rawObjects) {
    const object = normalizeRadarObject(rawObject, raw.query)

    if (!object) {
      stats.invalidRecords += 1
      continue
    }

    if (objectsById.has(object.id)) {
      stats.duplicateRecords += 1
      continue
    }

    objectsById.set(object.id, object)
    stats.categories[object.category] += 1
    stats.layers[object.layer] += 1
  }
}

// 源站 Filter 面板使用 static.json 里的 marker 分组；本地索引也补齐这些静态点位。
for (const staticMarker of staticMarkerData.markers) {
  if (objectsById.has(staticMarker.id)) {
    const existing = objectsById.get(staticMarker.id)

    if (existing.category !== staticMarker.category) {
      const markerCopy = {
        ...staticMarker,
        id: `${staticMarker.id}:${staticMarker.category}`,
      }

      objectsById.set(markerCopy.id, markerCopy)
      stats.staticMarkerRecords += 1
      stats.categories[markerCopy.category] += 1
      stats.layers[markerCopy.layer] += 1
      continue
    }

    objectsById.set(staticMarker.id, {
      ...existing,
      actor: staticMarker.actor,
      layer: staticMarker.layer,
      displayLayers: staticMarker.displayLayers,
      x: staticMarker.x,
      y: staticMarker.y,
      z: staticMarker.z,
      color: staticMarker.color,
      displayName: staticMarker.displayName,
      iconKey: staticMarker.iconKey,
      showLevel: staticMarker.showLevel,
      priority: staticMarker.priority,
      sourceKind: 'static',
      tags: unique([...existing.tags, ...staticMarker.tags]),
      note: staticMarker.note,
    })
    continue
  }

  objectsById.set(staticMarker.id, staticMarker)
  stats.staticMarkerRecords += 1
  stats.categories[staticMarker.category] += 1
  stats.layers[staticMarker.layer] += 1
}

const objects = [...objectsById.values()].sort((a, b) => {
  const layerOrder = LAYERS.indexOf(a.layer) - LAYERS.indexOf(b.layer)

  if (layerOrder !== 0) {
    return layerOrder
  }

  const categoryOrder = CATEGORIES.indexOf(a.category) - CATEGORIES.indexOf(b.category)

  if (categoryOrder !== 0) {
    return categoryOrder
  }

  return a.name.localeCompare(b.name) || a.id.localeCompare(b.id)
})

stats.outputRecords = objects.length

const tempFile = `${OUT_FILE}.tmp`
await writeFile(
  tempFile,
  `${JSON.stringify(
    {
      source: 'radar-totk raw object cache',
      generatedAt: new Date().toISOString(),
      stats,
      objects,
    },
    null,
    2,
  )}\n`,
)
await rename(tempFile, OUT_FILE)

console.table([
  {
    rawFiles: stats.rawFiles,
    rawRecords: stats.rawRecords,
    duplicateRecords: stats.duplicateRecords,
    invalidRecords: stats.invalidRecords,
    outputRecords: stats.outputRecords,
  },
])
console.log(`wrote ${path.relative(process.cwd(), OUT_FILE)}`)

async function collectJsonFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name)

    if (entry.isDirectory()) {
      files.push(...(await collectJsonFiles(entryPath)))
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      files.push(entryPath)
    }
  }

  return files.sort()
}

async function readStaticMarkers() {
  // byHashId 用于把 raw radar 对象和 static marker 合并；markers 用于补齐 Filter 面板静态点位。
  const byHashId = new Map()
  const data = JSON.parse(await readFile(STATIC_MARKERS_FILE, 'utf8'))
  const locationNames = JSON.parse(await readFile(LOCATION_NAMES_FILE, 'utf8'))
  const dungeonNames = JSON.parse(await readFile(DUNGEON_NAMES_FILE, 'utf8'))
  const markers = []

  for (const [markerType, items] of Object.entries(data.markers ?? {})) {
    if (!Array.isArray(items) || !STATIC_MARKER_TYPES.includes(markerType)) {
      continue
    }

    for (const item of items) {
      const hashId = readString(item.hash_id, readString(item.id, ''))

      if (!hashId) {
        continue
      }

      const messageId = readFirstString(item.MessageID, '')
      // marker 是 static marker 的轻量上下文；共享规则用它覆盖 raw 对象的分类和图标。
      const marker = {
        markerType,
        icon: readString(item.Icon, ''),
        messageId,
        displayName:
          markerType === 'Dungeon'
            ? readString(dungeonNames[messageId], '')
            : readString(locationNames[messageId], readString(item.name, '')),
        showLevel: readString(item.ShowLevel, ''),
        priority: readNumber(item.Priority),
        shrineInCave: Boolean(item.ShrineInCave),
      }

      byHashId.set(hashId, marker)
      const object = normalizeStaticMarker(item, marker)

      if (object) {
        markers.push(object)
      }
    }
  }

  return { byHashId, markers }
}

function normalizeStaticMarker(item, marker) {
  // item 是 static.json 原始 marker，marker 是已解析文本名和图标信息的上下文。
  return normalizeSharedStaticMarker(item, {
    markerType: marker.markerType,
    displayName: marker.displayName,
    idPrefix: 'static',
    note: `Source: static map summary ${marker.markerType} marker`,
  })
}

function normalizeRadarObject(value, query) {
  // value 是 radar API 原始对象，query 是当前 raw 缓存文件对应的抓取关键词。
  if (!isRecord(value)) {
    return null
  }

  const actor = readString(value.name, 'UnknownActor')
  const pos = Array.isArray(value.pos) ? value.pos : []
  const x = readNumber(pos[0])
  const y = readNumber(pos[1])
  const z = readNumber(pos[2])
  const id = readString(value.hash_id, String(value.objid ?? `${actor}-${x}-${y}-${z}`))
  // 命中 static marker 时，raw 对象会升级为 sourceKind=static 并复用源站图标/展示名。
  const staticMarker = staticMarkersByHashId.get(id)

  return normalizeSharedRadarObject(value, {
    query,
    staticMarker,
    dropUnmatchedLocations: true,
  })
}
