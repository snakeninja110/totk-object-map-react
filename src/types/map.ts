export type MapLayer = 'Sky' | 'Surface' | 'Depths'

export type ObjectCategory = 'shrine' | 'chest' | 'weapon' | 'monster'

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
  tags: string[]
  note: string
}
