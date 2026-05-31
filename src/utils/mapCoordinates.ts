import L from 'leaflet'
import type { MapLayer, MapObject } from '../types/map'

export const TILE_SIZE = 256
export const MAP_SIZE: [number, number] = [24000, 20000]
export const GAME_BOUNDS = {
  minX: -6000,
  maxX: 6000,
  minZ: -5000,
  maxZ: 5000,
}
export const MIN_ZOOM = 2
export const DEFAULT_ZOOM = 3
export const MAX_ZOOM = 10
export const MAX_NATIVE_ZOOM = 7

type MutableSimpleCrs = L.CRS & { transformation: L.Transformation }

export const totkCrs = L.Util.extend({}, L.CRS.Simple) as MutableSimpleCrs
totkCrs.transformation = new L.Transformation(
  4 / TILE_SIZE,
  MAP_SIZE[0] / TILE_SIZE,
  4 / TILE_SIZE,
  MAP_SIZE[1] / TILE_SIZE,
)

export const mapBounds = L.latLngBounds(
  [GAME_BOUNDS.minZ, GAME_BOUNDS.minX],
  [GAME_BOUNDS.maxZ, GAME_BOUNDS.maxX],
)

export function objectToLatLng(object: Pick<MapObject, 'x' | 'z'>): L.LatLngTuple {
  return [object.z, object.x]
}

export function formatGameCoordinates(
  object: Pick<MapObject, 'x' | 'y' | 'z'>,
  useInGameCoordinates = false,
) {
  if (useInGameCoordinates) {
    return `${formatCoordinate(object.x)}, ${formatCoordinate(-object.z)}, ${formatCoordinate(
      object.y - 106,
    )}`
  }

  return `${formatCoordinate(object.x)}, ${formatCoordinate(object.y)}, ${formatCoordinate(
    -object.z,
  )}`
}

function formatCoordinate(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2)
}

export function formatCopiedCoordinates(
  object: Pick<MapObject, 'x' | 'z'>,
  activeLayer: MapLayer,
  copyCoordinatesXYZ: boolean,
) {
  if (copyCoordinatesXYZ) {
    const layerHeight = {
      Surface: 150,
      Sky: 1500,
      Depths: -500,
    }[activeLayer]

    return `${formatCoordinate(object.x)},${layerHeight},${formatCoordinate(-object.z)}`
  }

  return `${formatCoordinate(object.x)},${formatCoordinate(-object.z)}`
}

export function isWithinGameBounds(object: Pick<MapObject, 'x' | 'z'>) {
  return (
    object.x >= GAME_BOUNDS.minX &&
    object.x <= GAME_BOUNDS.maxX &&
    object.z >= GAME_BOUNDS.minZ &&
    object.z <= GAME_BOUNDS.maxZ
  )
}
