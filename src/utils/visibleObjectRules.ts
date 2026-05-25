import type { MapLayer, MapObject } from '../types/map'
import { shouldShowLocationLabel } from './locationLabelRules'
import { isSourceStaticFilterCategory, objectMatchesLayer } from './objectFilters'

type GetVisibleObjectsParams = {
  searchedObjects: MapObject[]
  selectedCategorySet: Set<MapObject['category']>
  activeLayer: MapLayer
  mapZoom: number
  query: string
}

// 计算最终可见对象；保持为纯函数，便于测试源站静态分类和 Locations 缩放规则。
export function getVisibleObjects({
  searchedObjects,
  selectedCategorySet,
  activeLayer,
  mapZoom,
  query,
}: GetVisibleObjectsParams) {
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
}
