import { useMemo } from 'react'
import Fuse from 'fuse.js'
import {
  MAP_RENDER_LIMIT,
  categoryOrder,
} from '../constants/mapConfig'
import type { MapLayer, MapObject, ObjectDataSource } from '../types/map'
import { shouldShowLocationLabel } from '../utils/locationLabels'
import {
  isObjectInViewport,
  isSourceStaticFilterCategory,
  objectMatchesLayer,
  type ViewportBounds,
} from '../utils/objectFilters'

type UseVisibleObjectsParams = {
  objects: MapObject[]
  objectSource: ObjectDataSource
  query: string
  activeCategories: Array<MapObject['category']>
  activeLayer: MapLayer
  mapZoom: number
  viewportBounds: ViewportBounds | null
}

// 集中管理对象显示规则；这里复刻源站静态分类、地点缩放和视口裁剪逻辑。
export function useVisibleObjects({
  objects,
  objectSource,
  query,
  activeCategories,
  activeLayer,
  mapZoom,
  viewportBounds,
}: UseVisibleObjectsParams) {
  const selectedCategorySet = useMemo(
    () => new Set<MapObject['category']>(activeCategories),
    [activeCategories],
  )

  const fuse = useMemo(
    () =>
      new Fuse(objects, {
        threshold: 0.32,
        ignoreLocation: true,
        minMatchCharLength: 2,
        keys: [
          { name: 'displayName', weight: 0.32 },
          { name: 'name', weight: 0.28 },
          { name: 'actor', weight: 0.25 },
          { name: 'tags', weight: 0.2 },
          { name: 'category', weight: 0.07 },
          { name: 'layer', weight: 0.05 },
        ],
      }),
    [objects],
  )

  const searchedObjects = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase()

    if (!cleanQuery || objectSource === 'remote') {
      return objects
    }

    return fuse.search(cleanQuery).map((result) => result.item)
  }, [fuse, objectSource, objects, query])

  const visibleObjects = useMemo(() => {
    if (selectedCategorySet.size === 0) {
      return []
    }

    const usesLocationZoomFilter =
      selectedCategorySet.has('location') && query.trim().length === 0
    const usesStaticFilterMarkers = query.trim().length === 0

    return searchedObjects.filter((object) => {
      const matchesLayer = objectMatchesLayer(object, activeLayer)
      const matchesCategory = selectedCategorySet.has(object.category)

      if (
        usesStaticFilterMarkers &&
        isSourceStaticFilterCategory(object.category) &&
        object.sourceKind !== 'static'
      ) {
        return false
      }

      if (
        usesLocationZoomFilter &&
        object.category === 'location' &&
        !shouldShowLocationLabel(object, activeLayer, mapZoom)
      ) {
        return false
      }

      return matchesLayer && matchesCategory
    })
  }, [activeLayer, mapZoom, query, searchedObjects, selectedCategorySet])

  const resultListObjects = visibleObjects

  const viewportObjects = useMemo(() => {
    if (!viewportBounds) {
      return []
    }

    return visibleObjects.filter((object) => isObjectInViewport(object, viewportBounds))
  }, [viewportBounds, visibleObjects])

  const mapObjects = useMemo(
    () => viewportObjects.slice(0, MAP_RENDER_LIMIT),
    [viewportObjects],
  )

  const categoryCounts = useMemo(() => {
    const counts = Object.fromEntries(
      categoryOrder.map((category) => [category, 0]),
    ) as Record<MapObject['category'], number>
    const usesStaticFilterMarkers = query.trim().length === 0

    for (const object of searchedObjects) {
      if (!objectMatchesLayer(object, activeLayer)) {
        continue
      }

      if (
        usesStaticFilterMarkers &&
        isSourceStaticFilterCategory(object.category) &&
        object.sourceKind !== 'static'
      ) {
        continue
      }

      counts[object.category] += 1
    }

    return counts
  }, [activeLayer, query, searchedObjects])

  return {
    selectedCategorySet,
    searchedObjects,
    visibleObjects,
    resultListObjects,
    viewportObjects,
    mapObjects,
    categoryCounts,
  }
}
