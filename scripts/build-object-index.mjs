import { readdir, readFile, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'

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
const CATEGORIES = [
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
const LAYERS = ['Sky', 'Surface', 'Depths']
const STATIC_MARKER_TYPES = [
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

const rawFiles = await collectJsonFiles(RAW_ROOT)
const staticMarkerData = await readStaticMarkers()
const staticMarkersByHashId = staticMarkerData.byHashId
const objectsById = new Map()
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
  const translate = isRecord(item.Translate) ? item.Translate : {}
  const x = readNumber(translate.X)
  const y = readNumber(translate.Y)
  const z = readNumber(translate.Z)
  const name = readFirstString(item.MessageID, readString(item.name, marker.markerType))
  const id = readString(
    item.hash_id,
    readString(item.id, `static-${marker.markerType}-${x}-${y}-${z}`),
  )
  const category = categoryForStaticMarker(marker.markerType)
  const layer = inferStaticMarkerLayer(marker.markerType, item, y)
  const displayLayers = inferStaticMarkerDisplayLayers(marker.markerType, item, y)
  const iconKey = iconKeyForStaticMarker(marker)

  if (!id || !Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
    return null
  }

  return {
    id,
    name,
    ...(marker.displayName ? { displayName: marker.displayName } : {}),
    actor: staticMarkerActor(marker.markerType),
    category,
    layer,
    ...(displayLayers ? { displayLayers } : {}),
    x,
    y,
    z,
    color: categoryColor(category),
    ...(iconKey ? { iconKey } : {}),
    ...(marker.showLevel ? { showLevel: marker.showLevel } : {}),
    ...(marker.priority ? { priority: marker.priority } : {}),
    sourceKind: 'static',
    tags: [category, layer, `static-${marker.markerType}`, name, marker.displayName].filter(
      Boolean,
    ),
    note: `Source: static map summary ${marker.markerType} marker`,
  }
}

function normalizeRadarObject(value, query) {
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

  const staticMarker = staticMarkersByHashId.get(id)
  const category = inferCategory(value, query, staticMarker)

  if (!staticMarker && category === 'location') {
    return null
  }

  const layer = inferLayer(value)
  const iconKey = iconKeyForObject(value, category, staticMarker)
  const mapType = readString(value.map_type, '')
  const mapName = readString(value.map_name, '')
  const region = readString(value.region, '')
  const location = readString(value.Location, '')
  const fieldArea = readString(value.fieldarea, '')
  const tags = unique([
    category,
    layer,
    mapType,
    mapName,
    region,
    location,
    fieldArea,
    query,
    ...readStringArray(value.equip),
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
    tags,
    note: objectNote(value, mapType, mapName),
  }
}

function iconKeyForObject(value, category, staticMarker) {
  if (staticMarker) {
    const staticIcon = iconKeyForStaticMarker(staticMarker)

    if (staticIcon) {
      return staticIcon
    }
  }

  const actor = readString(value.name, '')
  const location = readString(value.Location, '')

  if (category === 'korok') {
    return 'korok'
  }

  if (category === 'lightroot') {
    return 'lightroot'
  }

  if (category === 'shrine') {
    return 'shrine'
  }

  if (category === 'shop') {
    return 'shop_yorozu'
  }

  if (location.startsWith('Cave_') || actor.startsWith('CaveEntrance')) {
    return 'cave'
  }

  return ''
}

function iconKeyForStaticMarker(staticMarker) {
  if (staticMarker.markerType === 'Dungeon') {
    return staticMarker.shrineInCave ? 'shrine_cave' : 'shrine'
  }

  const iconMap = {
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

  if (staticMarker.markerType === 'Korok') {
    return 'korok'
  }

  return iconMap[staticMarker.icon] ?? iconMap[staticMarker.markerType] ?? ''
}

function formatObjectName(value, actor) {
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

function objectNote(value, mapType, mapName) {
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

function inferCategory(value, query = '', staticMarker = null) {
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

  if (staticMarker?.markerType === 'Place') {
    return 'place'
  }

  if (staticMarker?.markerType === 'Location') {
    return 'location'
  }

  if (staticMarker?.markerType === 'Chasm') {
    return 'chasm'
  }

  if (staticMarker?.markerType === 'DragonTears') {
    return 'dragonTear'
  }

  if (staticMarker?.markerType === 'Dispensers') {
    return 'dispenser'
  }

  if (staticMarker?.markerType === 'Labo') {
    return 'techLab'
  }

  if (staticMarker?.markerType === 'Tower') {
    return 'tower'
  }

  if (staticMarker?.markerType === 'Dungeon') {
    return 'shrine'
  }

  if (staticMarker?.markerType === 'Cave') {
    return 'cave'
  }

  if (staticMarker?.markerType === 'Shop') {
    return 'shop'
  }

  if (
    staticMarker?.markerType === 'Korok' ||
    (isKorokSeedActor(actor) &&
      mapType !== 'MinusField' &&
      !fieldArea.startsWith('Depths'))
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

function isKorokSeedActor(actor) {
  return (
    actor.startsWith('Npc_HiddenKorok') ||
    actor.startsWith('Obj_LiftRockWhite_Korok') ||
    actor.startsWith('Obj_DecorationLiftRockWhite_Korok') ||
    actor.startsWith('KorokCarry')
  )
}

function inferLayer(value) {
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

function inferStaticLocationLayer(y) {
  if (y >= 950) {
    return 'Sky'
  }

  if (y <= -50) {
    return 'Depths'
  }

  return 'Surface'
}

function categoryForStaticMarker(markerType) {
  return {
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
  }[markerType]
}

function inferStaticMarkerLayer(markerType, marker, y) {
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

function inferStaticMarkerDisplayLayers(markerType, marker, y) {
  const icon = readString(marker.Icon, '')

  if (markerType === 'Chasm' || (markerType === 'Cave' && icon === 'Chasm')) {
    const layers = ['Depths']

    if (y > -50 && y < 1000) {
      layers.unshift('Surface')
    }

    return layers
  }

  return null
}

function readDungeonNumber(messageId) {
  const match = messageId.match(/^Dungeon(\d+)/)

  return match ? Number(match[1]) : -1
}

function staticMarkerActor(markerType) {
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

function categoryColor(category) {
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

function readNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function readString(value, fallback) {
  return typeof value === 'string' && value.length > 0 ? value : fallback
}

function readFirstString(value, fallback) {
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

function readStringArray(value) {
  return Array.isArray(value)
    ? value.filter((item) => typeof item === 'string' && item.length > 0)
    : []
}

function unique(values) {
  return [...new Set(values)]
}

function isRecord(value) {
  return typeof value === 'object' && value !== null
}
