import { mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'

const RADAR_URL = 'https://radar-totk.zeldamods.org'
const OUT_ROOT = path.resolve('public/data/objects/raw')
const DEFAULT_MAP_TYPE = 'MainAndMinusField'
const DEFAULT_MAP_NAME = ''
const DEFAULT_LIMIT = 5000
const DEFAULT_DELAY_MS = 250
const DEFAULT_RETRIES = 3
const DEFAULT_PRESET = 'core'

const QUERY_PRESETS = {
  core: [
    'LocationMarker',
    'TBox',
    'Enemy',
    'Weapon',
    'Korok',
    'LightRoot',
    'Cave',
    'Shop',
  ],
  categories: ['TBox', 'Enemy', 'Weapon', 'Korok', 'LightRoot'],
  landmarks: ['LocationMarker', 'Cave', 'Shop', 'Tower', 'Dungeon'],
  combat: ['Enemy', 'Weapon', 'Armor', 'TBox'],
}

const options = parseArgs(process.argv.slice(2))
const manifest = {
  source: RADAR_URL,
  generatedAt: new Date().toISOString(),
  mapType: options.mapType,
  mapName: options.mapName,
  limit: options.limit,
  queries: {},
  totals: {
    written: 0,
    skipped: 0,
    missing: 0,
    failed: 0,
    objects: 0,
  },
}

await mkdir(OUT_ROOT, { recursive: true })

for (const query of options.queries) {
  const stats = {
    query,
    file: path.relative(process.cwd(), queryPath(query)),
    written: 0,
    skipped: 0,
    missing: 0,
    failed: 0,
    objects: 0,
  }

  manifest.queries[query] = stats

  const result = await fetchQuery(query)
  stats[result.status] = 1
  stats.objects = result.objectCount
  manifest.totals[result.status] += 1
  manifest.totals.objects += result.objectCount

  console.log(
    `${result.status.padEnd(7)} ${query} (${result.objectCount} objects)`,
  )

  await writeManifest()
  await sleep(options.delayMs)
}

await writeManifest()
console.log(`manifest ${path.relative(process.cwd(), manifestPath())}`)

async function fetchQuery(query) {
  const file = queryPath(query)

  if (!options.force && (await hasExistingFile(file))) {
    const existing = JSON.parse(await readFile(file, 'utf8'))
    return {
      status: 'skipped',
      objectCount: Array.isArray(existing.objects) ? existing.objects.length : 0,
    }
  }

  const url = objectSearchUrl(query)
  const response = await fetchWithRetry(url.toString())

  if (response === null) {
    return {
      status: 'failed',
      objectCount: 0,
    }
  }

  if (response.status === 404) {
    return {
      status: 'missing',
      objectCount: 0,
    }
  }

  if (!response.ok) {
    console.warn(`failed  ${response.status} ${url}`)
    return {
      status: 'failed',
      objectCount: 0,
    }
  }

  const objects = await response.json()

  if (!Array.isArray(objects)) {
    console.warn(`failed  non-array response ${url}`)
    return {
      status: 'failed',
      objectCount: 0,
    }
  }

  await mkdir(path.dirname(file), { recursive: true })
  await writeFile(
    file,
    `${JSON.stringify(
      {
        source: url.toString(),
        generatedAt: new Date().toISOString(),
        mapType: options.mapType,
        mapName: options.mapName,
        query,
        limit: options.limit,
        objects,
      },
      null,
      2,
    )}\n`,
  )

  return {
    status: 'written',
    objectCount: objects.length,
  }
}

async function fetchWithRetry(url) {
  for (let attempt = 1; attempt <= options.retries; attempt += 1) {
    try {
      const response = await fetch(url)

      if (response.status < 500 || attempt === options.retries) {
        return response
      }

      console.warn(`retry   ${response.status} ${url}`)
    } catch (error) {
      if (attempt === options.retries) {
        console.warn(`failed  ${error.message} ${url}`)
        return null
      }

      console.warn(`retry   ${error.message} ${url}`)
    }

    await sleep(options.delayMs * attempt)
  }

  return null
}

async function hasExistingFile(file) {
  try {
    const fileStat = await stat(file)
    return fileStat.size > 0
  } catch (error) {
    if (error.code === 'ENOENT') {
      return false
    }

    throw error
  }
}

async function writeManifest() {
  const tempPath = `${manifestPath()}.tmp`

  await writeFile(tempPath, `${JSON.stringify(manifest, null, 2)}\n`)
  await rename(tempPath, manifestPath())
}

function objectSearchUrl(query) {
  const mapPath = options.mapName
    ? `/objs/${options.mapType}/${options.mapName}`
    : `/objs/${options.mapType}/`
  const url = new URL(mapPath, RADAR_URL)

  url.searchParams.set('q', query)
  url.searchParams.set('withMapNames', 'true')
  url.searchParams.set('limit', String(options.limit))

  return url
}

function parseArgs(args) {
  const parsed = {
    mapType: DEFAULT_MAP_TYPE,
    mapName: DEFAULT_MAP_NAME,
    queries: QUERY_PRESETS[DEFAULT_PRESET],
    limit: DEFAULT_LIMIT,
    delayMs: DEFAULT_DELAY_MS,
    retries: DEFAULT_RETRIES,
    force: false,
  }

  for (const arg of args) {
    if (arg === '--force') {
      parsed.force = true
      continue
    }

    const [key, rawValue] = arg.split('=')

    if (!key.startsWith('--') || rawValue === undefined) {
      throw new Error(`Unsupported argument: ${arg}`)
    }

    if (key === '--preset') {
      parsed.queries = readPreset(rawValue)
    } else if (key === '--queries') {
      parsed.queries = rawValue.split(',').map(decodeQuery).filter(Boolean)
    } else if (key === '--map-type') {
      parsed.mapType = rawValue
    } else if (key === '--map-name') {
      parsed.mapName = rawValue
    } else if (key === '--limit') {
      parsed.limit = Number(rawValue)
    } else if (key === '--delay-ms') {
      parsed.delayMs = Number(rawValue)
    } else if (key === '--retries') {
      parsed.retries = Number(rawValue)
    } else {
      throw new Error(`Unsupported argument: ${arg}`)
    }
  }

  validateOptions(parsed)
  return parsed
}

function readPreset(value) {
  if (value === 'all') {
    return unique(Object.values(QUERY_PRESETS).flat())
  }

  if (!QUERY_PRESETS[value]) {
    throw new Error(
      `Unknown preset: ${value}. Available presets: ${Object.keys(QUERY_PRESETS).join(', ')}, all`,
    )
  }

  return QUERY_PRESETS[value]
}

function validateOptions(parsed) {
  parsed.queries = unique(parsed.queries)

  if (parsed.queries.length === 0) {
    throw new Error('At least one query is required.')
  }

  if (!Number.isInteger(parsed.limit) || (parsed.limit < 1 && parsed.limit !== -1)) {
    throw new Error('limit must be a positive integer, or -1 for all results.')
  }

  if (!Number.isInteger(parsed.delayMs) || parsed.delayMs < 0) {
    throw new Error('delay-ms must be a non-negative integer.')
  }

  if (!Number.isInteger(parsed.retries) || parsed.retries < 1) {
    throw new Error('retries must be a positive integer.')
  }
}

function queryPath(query) {
  const mapName = options.mapName || '_all'

  return path.join(
    OUT_ROOT,
    options.mapType,
    mapName,
    `${slugifyQuery(query)}.json`,
  )
}

function manifestPath() {
  return path.join(OUT_ROOT, 'manifest.json')
}

function decodeQuery(query) {
  return decodeURIComponent(query).trim()
}

function slugifyQuery(query) {
  return query
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function unique(values) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))]
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}
