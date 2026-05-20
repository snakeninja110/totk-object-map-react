export type MapLayer = 'Sky' | 'Surface' | 'Depths'

export type TileSource = 'local' | 'remote'

export type ObjectDataSource = 'local' | 'remote'

export type ObjectCategory =
  | 'location'
  | 'place'
  | 'cave'
  | 'chasm'
  | 'dragonTear'
  | 'dispenser'
  | 'korok'
  | 'shop'
  | 'lightroot'
  | 'techLab'
  | 'tower'
  | 'shrine'
  | 'chest'
  | 'weapon'
  | 'enemy'

export type MapObject = {
  id: string
  name: string
  actor: string
  category: ObjectCategory
  layer: MapLayer
  x: number
  y: number
  z: number
  color: string
  iconKey?: string
  showLevel?: string
  priority?: number
  tags: string[]
  note: string
}
