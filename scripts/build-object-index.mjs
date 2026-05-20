import { readdir, readFile, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'

const RAW_ROOT = path.resolve('public/data/objects/raw')
const STATIC_MARKERS_FILE = path.resolve(
  'public/data/objects/static/mainfield-static.json',
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

const rawFiles = await collectJsonFiles(RAW_ROOT)
const staticMarkersByHashId = await readStaticMarkers()
const objectsById = new Map()
const stats = {
  rawFiles: 0,
  rawRecords: 0,
  duplicateRecords: 0,
  invalidRecords: 0,
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
  const markers = new Map()
  const data = JSON.parse(await readFile(STATIC_MARKERS_FILE, 'utf8'))

  for (const [markerType, items] of Object.entries(data.markers ?? {})) {
    if (!Array.isArray(items)) {
      continue
    }

    for (const item of items) {
      const hashId = readString(item.hash_id, readString(item.id, ''))

      if (!hashId) {
        continue
      }

      markers.set(hashId, {
        markerType,
        icon: readString(item.Icon, ''),
        messageId: readString(item.MessageID, ''),
        showLevel: readString(item.ShowLevel, ''),
        priority: readNumber(item.Priority),
        shrineInCave: Boolean(item.ShrineInCave),
      })
    }
  }

  return markers
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
