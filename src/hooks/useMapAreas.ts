import { useEffect, useMemo, useState } from 'react'
import { mapAreaOptions } from '../constants/mapConfig'
import type { MapAreaId, MapLayer } from '../types/map'

type RawPosition = [number, number]
type RawPolygon = RawPosition[][]
type RawMultiPolygon = RawPolygon[]
type RawGeometry =
  | {
      type: 'Polygon'
      coordinates: RawPolygon
    }
  | {
      type: 'MultiPolygon'
      coordinates: RawMultiPolygon
    }
type RawFeature = {
  type: 'Feature'
  geometry: RawGeometry
  properties?: Record<string, unknown>
  style?: Record<string, unknown>
}
type RawGeometryFeature = RawGeometry & {
  properties?: Record<string, unknown>
  style?: Record<string, unknown>
}

export type MapAreaFeature = {
  id: string
  title: string
  areaKey: string
  layer: MapLayer | null
  color: string
  geometry: RawGeometry
}

type UseMapAreasParams = {
  activeMapArea: MapAreaId
  activeLayer: MapLayer
  filterText: string
}

// 加载源站 Visible map areas 数据，并统一不同 JSON 格式，供 Leaflet 覆盖层直接渲染。
export function useMapAreas({
  activeMapArea,
  activeLayer,
  filterText,
}: UseMapAreasParams) {
  const [areaData, setAreaData] = useState<{
    fileName: string | null
    features: MapAreaFeature[]
    error: string | null
  }>({
    fileName: null,
    features: [],
    error: null,
  })
  const activeOption = useMemo(
    () => mapAreaOptions.find((option) => option.id === activeMapArea) ?? mapAreaOptions[0],
    [activeMapArea],
  )

  useEffect(() => {
    let didCancel = false

    const fileName = activeOption.fileName

    if (!fileName) {
      return
    }

    async function loadAreas() {
      try {
        const response = await fetch(`/data/map-areas/${fileName}`)

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const rawData: unknown = await response.json()
        const normalized = normalizeMapAreaData(rawData, activeOption.color)

        if (!didCancel) {
          setAreaData({
            fileName,
            features: normalized,
            error: null,
          })
        }
      } catch (loadError) {
        if (!didCancel) {
          setAreaData({
            fileName,
            features: [],
            error: loadError instanceof Error ? loadError.message : 'Unknown error',
          })
        }
      }
    }

    void loadAreas()

    return () => {
      didCancel = true
    }
  }, [activeOption])

  const filteredFeatures = useMemo(() => {
    const features =
      activeOption.fileName && areaData.fileName === activeOption.fileName
        ? areaData.features
        : []
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
  }, [activeLayer, activeOption.fileName, areaData, filterText])

  return {
    features: filteredFeatures,
    error:
      activeOption.fileName && areaData.fileName === activeOption.fileName
        ? areaData.error
        : null,
  }
}

function normalizeMapAreaData(rawData: unknown, fallbackColor: string): MapAreaFeature[] {
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

function flattenRawFeatures(rawData: unknown): Array<RawFeature & { style?: Record<string, unknown> }> {
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
    const geometry: RawGeometry =
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

function isRawFeature(value: unknown): value is RawFeature {
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

function isRawGeometry(value: unknown): value is RawGeometry {
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
