import { useEffect, useMemo, useState } from 'react'
import { mapAreaOptions } from '../constants/mapConfig'
import type { MapAreaId, MapLayer } from '../types/map'
import {
  filterMapAreaFeatures,
  normalizeMapAreaData,
  type MapAreaFeature,
} from '../utils/mapAreaRules'

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
    return filterMapAreaFeatures({
      features,
      activeLayer,
      filterText,
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
