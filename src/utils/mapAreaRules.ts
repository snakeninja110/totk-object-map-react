import type { PathOptions } from 'leaflet'
import type { MapLayer } from '../types/map'

export type RawMapAreaPosition = [number, number]
export type RawMapAreaPolygon = RawMapAreaPosition[][]
export type RawMapAreaMultiPolygon = RawMapAreaPolygon[]
export type RawMapAreaGeometry =
  | {
      type: 'Polygon'
      coordinates: RawMapAreaPolygon
    }
  | {
      type: 'MultiPolygon'
      coordinates: RawMapAreaMultiPolygon
    }
type RawMapAreaFeature = {
  type: 'Feature'
  geometry: RawMapAreaGeometry
  properties?: Record<string, unknown>
  style?: Record<string, unknown>
}
type RawGeometryFeature = RawMapAreaGeometry & {
  properties?: Record<string, unknown>
  style?: Record<string, unknown>
}

export type MapAreaFeature = {
  id: string
  title: string
  areaKey: string
  layer: MapLayer | null
  color: string
  geometry: RawMapAreaGeometry
}

// 把源站不同形态的区域 JSON 统一成前端覆盖层数据。
export function normalizeMapAreaData(
  rawData: unknown,
  fallbackColor: string,
): MapAreaFeature[] {
  const rawFeatures = flattenRawFeatures(rawData)

  return rawFeatures.map((feature, index) => {
    const properties = feature.properties ?? {}
    const style = feature.style ?? {}
    const color = readString(properties.color) ?? readString(style.color) ?? fallbackColor
    const title =
      readString(properties.title) ??
      readString(properties.Area) ??
      readString(properties.group) ??
      `Area ${index + 1}`
    const areaKey =
      readScalar(properties.order) ??
      readScalar(properties.Area) ??
      readScalar(properties.towerNum) ??
      readScalar(properties.title) ??
      String(index + 1)

    return {
      id: `${areaKey}-${index}`,
      title,
      areaKey,
      layer: readMapLayer(properties.map_layer),
      color,
      geometry: feature.geometry,
    }
  })
}

// 按当前地图层和用户输入的区域编号过滤区域覆盖层。
export function filterMapAreaFeatures({
  features,
  activeLayer,
  filterText,
}: {
  features: MapAreaFeature[]
  activeLayer: MapLayer
  filterText: string
}) {
  const filterKeys = parseMapAreaFilter(filterText)

  return features.filter((feature, index) => {
    if (feature.layer && feature.layer !== activeLayer) {
      return false
    }

    if (filterKeys.size === 0) {
      return true
    }

    return filterKeys.has(String(index + 1)) || filterKeys.has(feature.areaKey)
  })
}

// 把源站 [x, z] 坐标转换为 Leaflet Simple CRS 的 [lat=z, lng=x]。
export function toMapAreaPolygons(feature: MapAreaFeature): number[][][] {
  if (feature.geometry.type === 'Polygon') {
    return [toLatLngRing(feature.geometry.coordinates[0] ?? [])]
  }

  return feature.geometry.coordinates.map((polygon) => toLatLngRing(polygon[0] ?? []))
}

// 统一控制区域覆盖层的描边、填充和透明度，便于测试和后续视觉微调。
export function getMapAreaPathOptions(
  feature: Pick<MapAreaFeature, 'color'>,
  fillAreas: boolean,
): PathOptions {
  return {
    color: feature.color,
    fillColor: feature.color,
    fillOpacity: fillAreas ? 0.16 : 0,
    opacity: 0.82,
    weight: 2,
  }
}

function toLatLngRing(ring: RawMapAreaPosition[]) {
  return ring.map(([x, z]) => [z, x])
}

function flattenRawFeatures(
  rawData: unknown,
): Array<RawMapAreaFeature & { style?: Record<string, unknown> }> {
  if (isFeatureCollection(rawData)) {
    return rawData.features.flatMap((item) => flattenRawFeatures(item))
  }

  if (Array.isArray(rawData)) {
    return rawData.flatMap((item) => flattenRawFeatures(item))
  }

  if (isRawFeature(rawData)) {
    return [rawData]
  }

  if (isRawGeometryFeature(rawData)) {
    const geometry: RawMapAreaGeometry =
      rawData.type === 'Polygon'
        ? {
            type: 'Polygon',
            coordinates: rawData.coordinates,
          }
        : {
            type: 'MultiPolygon',
            coordinates: rawData.coordinates,
          }

    return [
      {
        type: 'Feature',
        geometry,
        properties: rawData.properties,
        style: rawData.style,
      },
    ]
  }

  if (rawData && typeof rawData === 'object') {
    return Object.values(rawData).flatMap((item) => flattenRawFeatures(item))
  }

  return []
}

function parseMapAreaFilter(filterText: string) {
  return new Set(
    filterText
      .split(/[,\s]+/)
      .map((item) => item.trim())
      .filter(Boolean),
  )
}

function isFeatureCollection(
  value: unknown,
): value is { type: 'FeatureCollection'; features: unknown[] } {
  return (
    value !== null &&
    typeof value === 'object' &&
    'type' in value &&
    value.type === 'FeatureCollection' &&
    'features' in value &&
    Array.isArray(value.features)
  )
}

function isRawFeature(value: unknown): value is RawMapAreaFeature {
  return (
    value !== null &&
    typeof value === 'object' &&
    'type' in value &&
    value.type === 'Feature' &&
    'geometry' in value &&
    isRawGeometry(value.geometry)
  )
}

function isRawGeometryFeature(value: unknown): value is RawGeometryFeature {
  return (
    value !== null &&
    typeof value === 'object' &&
    'type' in value &&
    (value.type === 'Polygon' || value.type === 'MultiPolygon') &&
    'coordinates' in value &&
    Array.isArray(value.coordinates)
  )
}

function isRawGeometry(value: unknown): value is RawMapAreaGeometry {
  return (
    value !== null &&
    typeof value === 'object' &&
    'type' in value &&
    (value.type === 'Polygon' || value.type === 'MultiPolygon') &&
    'coordinates' in value &&
    Array.isArray(value.coordinates)
  )
}

function readString(value: unknown) {
  return typeof value === 'string' && value.length > 0 ? value : null
}

function readScalar(value: unknown) {
  if (typeof value === 'string' && value.length > 0) {
    return value
  }

  if (typeof value === 'number') {
    return String(value)
  }

  return null
}

function readMapLayer(value: unknown): MapLayer | null {
  if (value === 'Sky' || value === 'Surface' || value === 'Depths') {
    return value
  }

  return null
}
