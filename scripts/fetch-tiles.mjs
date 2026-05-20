import { mkdir, rename, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'

const TILE_BASE = 'https://objmap-totk.zeldamods.org/game_files/map'
const OUT_ROOT = path.resolve('public/data/map')
const TILE_SIZE = 256
const MAP_SIZE = [24000, 20000]
const MAX_NATIVE_ZOOM = 7
const DEFAULT_LAYERS = ['Ground', 'Sky', 'Depths']
const DEFAULT_ZOOMS = range(0, 7)
const DEFAULT_CONCURRENCY = 8
const DEFAULT_DELAY_MS = 50
const DEFAULT_RETRIES = 3

const options = parseArgs(process.argv.slice(2))
const manifest = {
  source: TILE_BASE,
  generatedAt: new Date().toISOString(),
  layers: {},
  totals: {
    written: 0,
    skipped: 0,
    missing: 0,
    failed: 0,
  },
}

for (const layer of options.layers) {
  manifest.layers[layer] = {
    zooms: {},
    totals: {
      written: 0,
      skipped: 0,
      missing: 0,
      failed: 0,
    },
  }

  for (const z of options.zooms) {
    const [maxXTile, maxYTile] = maxTileForZoom(z)
    const xRange = clampRange(options.xRange ?? [0, maxXTile], 0, maxXTile)
    const yRange = clampRange(options.yRange ?? [0, maxYTile], 0, maxYTile)
    const zoomStats = {
      xRange,
      yRange,
      written: 0,
      skipped: 0,
      missing: 0,
      failed: 0,
    }

    manifest.layers[layer].zooms[z] = zoomStats

    const jobs = []

    for (const x of range(xRange[0], xRange[1])) {
      for (const y of range(yRange[0], yRange[1])) {
        jobs.push({ layer, z, x, y, zoomStats })
      }
    }

    await runJobs(jobs)

    await writeManifest()
  }
}

await writeManifest()
console.log(`manifest ${path.relative(process.cwd(), manifestPath())}`)

async function downloadTile(layer, z, x, y) {
  const file = tilePath(layer, z, x, y)

  if (await hasExistingFile(file)) {
    return 'skipped'
  }

  const url = `${TILE_BASE}/${layer}/maptex/${z}/${x}/${y}.webp`
  const response = await fetchWithRetry(url)

  if (response === null) {
    return 'failed'
  }

  if (response.status === 404) {
    return 'missing'
  }

  if (!response.ok) {
    console.warn(`failed  ${response.status} ${url}`)
    return 'failed'
  }

  const bytes = Buffer.from(await response.arrayBuffer())

  if (bytes.length === 0) {
    console.warn(`failed  empty body ${url}`)
    return 'failed'
  }

  await mkdir(path.dirname(file), { recursive: true })
  await writeFile(file, bytes)
  return 'written'
}

async function runJobs(jobs) {
  let nextIndex = 0
  const workerCount = Math.min(options.concurrency, jobs.length)

  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (nextIndex < jobs.length) {
        const job = jobs[nextIndex]
        nextIndex += 1

        const result = await downloadTile(job.layer, job.z, job.x, job.y)
        job.zoomStats[result] += 1
        manifest.layers[job.layer].totals[result] += 1
        manifest.totals[result] += 1

        console.log(
          `${result.padEnd(7)} ${job.layer}/${job.z}/${job.x}/${job.y}.webp`,
        )
        await sleep(options.delayMs)
      }
    }),
  )
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
  await mkdir(OUT_ROOT, { recursive: true })
  const tempPath = `${manifestPath()}.tmp`

  await writeFile(tempPath, `${JSON.stringify(manifest, null, 2)}\n`)
  await rename(tempPath, manifestPath())
}

function parseArgs(args) {
  const parsed = {
    layers: DEFAULT_LAYERS,
    zooms: DEFAULT_ZOOMS,
    xRange: null,
    yRange: null,
    concurrency: DEFAULT_CONCURRENCY,
    delayMs: DEFAULT_DELAY_MS,
    retries: DEFAULT_RETRIES,
  }

  for (const arg of args) {
    const [key, rawValue] = arg.split('=')

    if (!key.startsWith('--') || rawValue === undefined) {
      throw new Error(`Unsupported argument: ${arg}`)
    }

    if (key === '--layers') {
      parsed.layers = rawValue.split(',').filter(Boolean)
    } else if (key === '--zooms') {
      parsed.zooms = parseNumberRange(rawValue)
    } else if (key === '--x') {
      parsed.xRange = parseRangePair(rawValue)
    } else if (key === '--y') {
      parsed.yRange = parseRangePair(rawValue)
    } else if (key === '--delay-ms') {
      parsed.delayMs = Number(rawValue)
    } else if (key === '--concurrency') {
      parsed.concurrency = Number(rawValue)
    } else if (key === '--retries') {
      parsed.retries = Number(rawValue)
    } else {
      throw new Error(`Unsupported argument: ${arg}`)
    }
  }

  validateOptions(parsed)
  return parsed
}

function validateOptions(parsed) {
  const unknownLayers = parsed.layers.filter(
    (layer) => !DEFAULT_LAYERS.includes(layer),
  )

  if (unknownLayers.length > 0) {
    throw new Error(`Unknown layer(s): ${unknownLayers.join(', ')}`)
  }

  if (!parsed.zooms.every((zoom) => zoom >= 0 && zoom <= 7)) {
    throw new Error('Zooms must be between 0 and 7.')
  }

  if (!Number.isInteger(parsed.delayMs) || parsed.delayMs < 0) {
    throw new Error('delay-ms must be a non-negative integer.')
  }

  if (!Number.isInteger(parsed.concurrency) || parsed.concurrency < 1) {
    throw new Error('concurrency must be a positive integer.')
  }

  if (!Number.isInteger(parsed.retries) || parsed.retries < 1) {
    throw new Error('retries must be a positive integer.')
  }
}

function parseNumberRange(value) {
  if (value.includes(',')) {
    return value
      .split(',')
      .filter(Boolean)
      .map((item) => Number(item))
  }

  return range(...parseRangePair(value))
}

function parseRangePair(value) {
  const [start, end] = value.split('..').map((item) => Number(item))

  if (!Number.isInteger(start) || !Number.isInteger(end) || start > end) {
    throw new Error(`Invalid range: ${value}`)
  }

  return [start, end]
}

function clampRange([start, end], min, max) {
  return [Math.max(start, min), Math.min(end, max)]
}

function range(start, end) {
  return Array.from({ length: end - start + 1 }, (_, index) => start + index)
}

function maxTileForZoom(zoom) {
  const scale = 2 ** (MAX_NATIVE_ZOOM - zoom)
  const width = MAP_SIZE[0] / scale
  const height = MAP_SIZE[1] / scale

  return [Math.ceil(width / TILE_SIZE) - 1, Math.ceil(height / TILE_SIZE) - 1]
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function tilePath(layer, z, x, y) {
  return path.join(OUT_ROOT, layer, 'maptex', String(z), String(x), `${y}.webp`)
}

function manifestPath() {
  return path.join(OUT_ROOT, 'manifest.json')
}
