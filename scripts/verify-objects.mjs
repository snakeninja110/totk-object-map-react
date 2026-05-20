import { readFile } from 'node:fs/promises'
import path from 'node:path'

const OBJECT_INDEX = path.resolve('public/data/objects/index.json')
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
const GAME_BOUNDS = {
  minX: -6000,
  maxX: 6000,
  minZ: -5000,
  maxZ: 5000,
}

const index = JSON.parse(await readFile(OBJECT_INDEX, 'utf8'))
const objects = Array.isArray(index.objects) ? index.objects : null

if (!objects) {
  console.error('object verification failed: index must contain objects[]')
  process.exit(1)
}

const seenIds = new Set()
const stats = {
  total: objects.length,
  duplicateIds: 0,
  missingId: 0,
  missingName: 0,
  missingActor: 0,
  invalidCategory: 0,
  invalidLayer: 0,
  invalidCoordinates: 0,
  outOfBounds: 0,
  missingTags: 0,
  byLayer: Object.fromEntries(LAYERS.map((layer) => [layer, 0])),
  byCategory: Object.fromEntries(CATEGORIES.map((category) => [category, 0])),
}
const examples = {
  duplicateIds: [],
  invalidCategory: [],
  invalidLayer: [],
  invalidCoordinates: [],
  outOfBounds: [],
}

for (const object of objects) {
  if (!isRecord(object)) {
    stats.invalidCoordinates += 1
    pushExample(examples.invalidCoordinates, '<non-object>')
    continue
  }

  const id = typeof object.id === 'string' ? object.id : ''

  if (!id) {
    stats.missingId += 1
  } else if (seenIds.has(id)) {
    stats.duplicateIds += 1
    pushExample(examples.duplicateIds, id)
  } else {
    seenIds.add(id)
  }

  if (typeof object.name !== 'string' || object.name.length === 0) {
    stats.missingName += 1
  }

  if (typeof object.actor !== 'string' || object.actor.length === 0) {
    stats.missingActor += 1
  }

  if (!CATEGORIES.includes(object.category)) {
    stats.invalidCategory += 1
    pushExample(examples.invalidCategory, id || '<missing-id>')
  } else {
    stats.byCategory[object.category] += 1
  }

  if (!LAYERS.includes(object.layer)) {
    stats.invalidLayer += 1
    pushExample(examples.invalidLayer, id || '<missing-id>')
  } else {
    stats.byLayer[object.layer] += 1
  }

  if (![object.x, object.y, object.z].every(Number.isFinite)) {
    stats.invalidCoordinates += 1
    pushExample(examples.invalidCoordinates, id || '<missing-id>')
    continue
  }

  if (!isWithinGameBounds(object)) {
    stats.outOfBounds += 1
    pushExample(examples.outOfBounds, id || '<missing-id>')
  }

  if (!Array.isArray(object.tags)) {
    stats.missingTags += 1
  }
}

console.log(`object index generated: ${index.generatedAt ?? 'unavailable'}`)
console.table([
  {
    total: stats.total,
    duplicateIds: stats.duplicateIds,
    missingId: stats.missingId,
    invalidCategory: stats.invalidCategory,
    invalidLayer: stats.invalidLayer,
    invalidCoordinates: stats.invalidCoordinates,
    outOfBounds: stats.outOfBounds,
  },
])
console.log(`by layer: ${JSON.stringify(stats.byLayer)}`)
console.log(`by category: ${JSON.stringify(stats.byCategory)}`)

if (hasExamples(examples)) {
  console.log(`examples: ${JSON.stringify(examples, null, 2)}`)
}

if (
  stats.duplicateIds > 0 ||
  stats.missingId > 0 ||
  stats.missingName > 0 ||
  stats.missingActor > 0 ||
  stats.invalidCategory > 0 ||
  stats.invalidLayer > 0 ||
  stats.invalidCoordinates > 0 ||
  stats.outOfBounds > 0 ||
  stats.missingTags > 0
) {
  console.log('object verification failed')
  process.exitCode = 1
} else {
  console.log('object verification passed')
}

function isWithinGameBounds(object) {
  return (
    object.x >= GAME_BOUNDS.minX &&
    object.x <= GAME_BOUNDS.maxX &&
    object.z >= GAME_BOUNDS.minZ &&
    object.z <= GAME_BOUNDS.maxZ
  )
}

function pushExample(items, value) {
  if (items.length < 5) {
    items.push(value)
  }
}

function hasExamples(groups) {
  return Object.values(groups).some((items) => items.length > 0)
}

function isRecord(value) {
  return typeof value === 'object' && value !== null
}
