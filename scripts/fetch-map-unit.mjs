import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const RADAR_URL = 'https://radar-totk.zeldamods.org'
const OUT_DIR = path.resolve('public/data/objects/MainField')
const MAP_UNITS = ['A-1']

async function fetchJson(url) {
  const response = await fetch(url)

  if (response.status === 404) {
    return null
  }

  if (!response.ok) {
    throw new Error(`${response.status} ${url}`)
  }

  return response.json()
}

await mkdir(OUT_DIR, { recursive: true })

for (const mapName of MAP_UNITS) {
  const url = new URL(`/objs/MainField/${mapName}`, RADAR_URL)
  url.searchParams.set('q', '')
  url.searchParams.set('withMapNames', 'true')
  url.searchParams.set('limit', '-1')

  const data = await fetchJson(url)

  if (!data) {
    console.log(`skip ${mapName}`)
    continue
  }

  const file = path.join(OUT_DIR, `${mapName}.json`)
  await writeFile(file, JSON.stringify(data, null, 2))
  console.log(`wrote ${file}`)
}
