import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const TILE_BASE = 'https://objmap-totk.zeldamods.org/game_files/map'
const layers = ['Ground']
const zooms = [0, 1, 2]
const tileRange = Array.from({ length: 8 }, (_, index) => index)

async function downloadTile(layer, z, x, y) {
  const url = `${TILE_BASE}/${layer}/maptex/${z}/${x}/${y}.webp`
  const response = await fetch(url)

  if (response.status === 404) {
    return false
  }

  if (!response.ok) {
    throw new Error(`${response.status} ${url}`)
  }

  const bytes = Buffer.from(await response.arrayBuffer())
  const file = path.resolve(`public/data/map/${layer}/maptex/${z}/${x}/${y}.webp`)

  await mkdir(path.dirname(file), { recursive: true })
  await writeFile(file, bytes)
  return true
}

for (const layer of layers) {
  for (const z of zooms) {
    for (const x of tileRange) {
      for (const y of tileRange) {
        const ok = await downloadTile(layer, z, x, y)

        if (ok) {
          console.log(`wrote ${layer}/${z}/${x}/${y}.webp`)
        }
      }
    }
  }
}
