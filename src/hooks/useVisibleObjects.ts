import { useMemo } from 'react'
import Fuse from 'fuse.js'
import {
  MAP_RENDER_LIMIT,
  categoryOrder,
} from '../constants/mapConfig'
import type { MapLayer, MapObject, ObjectDataSource } from '../types/map'
import type { CompletedMarkerMode } from '../stores/mapUiStore'
import {
  isObjectInViewport,
  isSourceStaticFilterCategory,
  objectMatchesLayer,
  type ViewportBounds,
} from '../utils/objectFilters'
import {
  getPlainSearchText,
  objectMatchesSearch,
  parseObjectSearch,
} from '../utils/objectSearch'
import { getVisibleObjects } from '../utils/visibleObjectRules'

type UseVisibleObjectsParams = {
  objects: MapObject[]
  objectSource: ObjectDataSource
  query: string
  activeCategories: Array<MapObject['category']>
  pinnedObjectIds: string[]
  hiddenObjectIds: string[]
  completedObjectIds: string[]
  completedMarkerMode: CompletedMarkerMode
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
  pinnedObjectIds,
  hiddenObjectIds,
  completedObjectIds,
  completedMarkerMode,
  activeLayer,
  mapZoom,
  viewportBounds,
}: UseVisibleObjectsParams) {
  const selectedCategorySet = useMemo(
    () => new Set<MapObject['category']>(activeCategories),
    [activeCategories],
  )
  const pinnedObjectSet = useMemo(() => new Set(pinnedObjectIds), [pinnedObjectIds])
  const hiddenObjectSet = useMemo(() => new Set(hiddenObjectIds), [hiddenObjectIds])
  const completedObjectSet = useMemo(() => new Set(completedObjectIds), [completedObjectIds])
  const availableObjects = useMemo(
    () =>
      objects.filter(
        (object) =>
          !hiddenObjectSet.has(object.id) &&
          (completedMarkerMode !== 'hide' || !completedObjectSet.has(object.id)),
      ),
    [completedMarkerMode, completedObjectSet, hiddenObjectSet, objects],
  )

  const fuse = useMemo(
    () =>
      new Fuse(availableObjects, {
        threshold: 0.32,
        ignoreLocation: true,
        minMatchCharLength: 2,
        keys: [
          { name: 'displayName', weight: 0.32 },
          { name: 'name', weight: 0.28 },
          { name: 'actor', weight: 0.25 },
          { name: 'drop.values', weight: 0.22 },
          { name: 'equipment', weight: 0.2 },
          { name: 'tags', weight: 0.2 },
          { name: 'mapName', weight: 0.12 },
          { name: 'fieldArea', weight: 0.1 },
          { name: 'region', weight: 0.1 },
          { name: 'category', weight: 0.07 },
          { name: 'layer', weight: 0.05 },
        ],
      }),
    [availableObjects],
  )

  const parsedSearch = useMemo(() => parseObjectSearch(query), [query])

  const searchedObjects = useMemo(() => {
    const plainSearchText = getPlainSearchText(parsedSearch)
    const baseObjects =
      plainSearchText && objectSource === 'local'
        ? fuse.search(plainSearchText).map((result) => result.item)
        : availableObjects

    return query.trim()
      ? baseObjects.filter((object) => objectMatchesSearch(object, parsedSearch))
      : baseObjects
  }, [availableObjects, fuse, objectSource, parsedSearch, query])

  const visibleObjects = useMemo(() => {
    const filteredObjects = getVisibleObjects({
      searchedObjects,
      selectedCategorySet,
      activeLayer,
      mapZoom,
      query,
    })
    const visibleObjectIds = new Set(filteredObjects.map((object) => object.id))
    const pinnedObjects = availableObjects.filter(
      (object) =>
        pinnedObjectSet.has(object.id) &&
        !visibleObjectIds.has(object.id) &&
        objectMatchesLayer(object, activeLayer),
    )

    return [...pinnedObjects, ...filteredObjects]
  }, [
    activeLayer,
    availableObjects,
    mapZoom,
    pinnedObjectSet,
    query,
    searchedObjects,
    selectedCategorySet,
  ])

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
    pinnedObjectSet,
    hiddenObjectSet,
    searchedObjects,
    visibleObjects,
    resultListObjects,
    viewportObjects,
    mapObjects,
    categoryCounts,
  }
}
