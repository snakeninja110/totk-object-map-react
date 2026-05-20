import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'

const OUT_ROOT = path.resolve('public/data/map')
const TILE_SIZE = 256
const MAP_SIZE = [24000, 20000]
const MAX_NATIVE_ZOOM = 7
const DEFAULT_LAYERS = ['Ground', 'Sky', 'Depths']
const DEFAULT_ZOOMS = range(0, 7)

const options = parseArgs(process.argv.slice(2))
const manifest = await readManifest()
const rows = []
const totals = {
  expected: 0,
  present: 0,
  missing: 0,
  empty: 0,
  failed: 0,
  unexplainedMissing: 0,
}

for (const layer of options.layers) {
  for (const z of options.zooms) {
    const [maxXTile, maxYTile] = maxTileForZoom(z)
    const expected = (maxXTile + 1) * (maxYTile + 1)
    const zoomManifest = manifest?.layers?.[layer]?.zooms?.[z] ?? null
    const manifestMissing = zoomManifest?.missing ?? 0
    const manifestFailed = zoomManifest?.failed ?? 0
    const result = await verifyZoom(layer, z, maxXTile, maxYTile)
    const explainedTotal = result.present + result.empty + manifestMissing
    const unexplainedMissing = Math.max(expected - explainedTotal, 0)

    rows.push({
      layer,
      z,
      expected,
      present: result.present,
      empty: result.empty,
      manifestMissing,
      manifestFailed,
      unexplainedMissing,
    })

    totals.expected += expected
    totals.present += result.present
    totals.missing += manifestMissing
    totals.empty += result.empty
    totals.failed += manifestFailed
    totals.unexplainedMissing += unexplainedMissing
  }
}

printReport(rows, totals, manifest)

if (
  totals.empty > 0 ||
  totals.failed > 0 ||
  totals.unexplainedMissing > 0 ||
  totals.present + totals.missing !== totals.expected
) {
  process.exitCode = 1
}

async function verifyZoom(layer, z, maxXTile, maxYTile) {
  const result = {
    present: 0,
    empty: 0,
  }

  for (const x of range(0, maxXTile)) {
    for (const y of range(0, maxYTile)) {
      const file = tilePath(layer, z, x, y)

      try {
        const fileStat = await stat(file)

        if (fileStat.size > 0) {
          result.present += 1
        } else {
          result.empty += 1
        }
      } catch (error) {
        if (error.code !== 'ENOENT') {
          throw error
        }
      }
    }
  }

  return result
}

async function readManifest() {
  if (options.noManifest) {
    return null
  }

  try {
    return JSON.parse(await readFile(manifestPath(), 'utf8'))
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null
    }

    throw error
  }
}

function printReport(rows, reportTotals, loadedManifest) {
  const table = rows.map((row) => ({
    layer: row.layer,
    zoom: row.z,
    present: `${row.present}/${row.expected}`,
    missing_404: row.manifestMissing,
    empty: row.empty,
    failed: row.manifestFailed,
    unexplained_missing: row.unexplainedMissing,
  }))

  console.table(table)
  console.log(`tiles present: ${reportTotals.present}/${reportTotals.expected}`)
  console.log(`manifest 404 missing: ${reportTotals.missing}`)
  console.log(`empty files: ${reportTotals.empty}`)
  console.log(`failed downloads: ${reportTotals.failed}`)
  console.log(`unexplained missing files: ${reportTotals.unexplainedMissing}`)

  if (loadedManifest?.generatedAt) {
    console.log(`manifest generated: ${loadedManifest.generatedAt}`)
  } else {
    console.log('manifest generated: unavailable')
  }

  if (
    reportTotals.empty === 0 &&
    reportTotals.failed === 0 &&
    reportTotals.unexplainedMissing === 0 &&
    reportTotals.present + reportTotals.missing === reportTotals.expected
  ) {
    console.log('tile verification passed')
  } else {
    console.log('tile verification failed')
  }
}

function parseArgs(args) {
  const parsed = {
    layers: DEFAULT_LAYERS,
    zooms: DEFAULT_ZOOMS,
    noManifest: false,
  }

  for (const arg of args) {
    if (arg === '--no-manifest') {
      parsed.noManifest = true
      continue
    }

    const [key, rawValue] = arg.split('=')

    if (!key.startsWith('--') || rawValue === undefined) {
      throw new Error(`Unsupported argument: ${arg}`)
    }

    if (key === '--layers') {
      parsed.layers = rawValue.split(',').filter(Boolean)
    } else if (key === '--zooms') {
      parsed.zooms = parseNumberRange(rawValue)
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

  if (!parsed.zooms.every((zoom) => zoom >= 0 && zoom <= MAX_NATIVE_ZOOM)) {
    throw new Error(`Zooms must be between 0 and ${MAX_NATIVE_ZOOM}.`)
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

function range(start, end) {
  return Array.from({ length: end - start + 1 }, (_, index) => start + index)
}

function maxTileForZoom(zoom) {
  const scale = 2 ** (MAX_NATIVE_ZOOM - zoom)
  const width = MAP_SIZE[0] / scale
  const height = MAP_SIZE[1] / scale

  return [Math.ceil(width / TILE_SIZE) - 1, Math.ceil(height / TILE_SIZE) - 1]
}

function tilePath(layer, z, x, y) {
  return path.join(OUT_ROOT, layer, 'maptex', String(z), String(x), `${y}.webp`)
}

function manifestPath() {
  return path.join(OUT_ROOT, 'manifest.json')
}
