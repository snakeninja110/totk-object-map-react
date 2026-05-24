import { useEffect, useMemo, useState } from 'react'
import { REMOTE_STATIC_MARKERS_QUERY, loadObjects } from '../services/objectData'
import type { MapObject, ObjectDataSource } from '../types/map'

type UseObjectDataParams = {
  objectSource: ObjectDataSource
  query: string
  activeCategories: Array<MapObject['category']>
}

// 统一管理对象数据加载；App 只消费结果，不直接处理 Local/Remote 的查询差异。
export function useObjectData({
  objectSource,
  query,
  activeCategories,
}: UseObjectDataParams) {
  const [objects, setObjects] = useState<MapObject[]>([])
  const [objectsLoading, setObjectsLoading] = useState(false)
  const [objectsError, setObjectsError] = useState<string | null>(null)

  const objectLoadQueries = useMemo(() => {
    if (objectSource === 'local') {
      return ['']
    }

    const cleanQuery = query.trim()

    if (cleanQuery) {
      return [cleanQuery]
    }

    return [REMOTE_STATIC_MARKERS_QUERY]
  }, [objectSource, query])

  useEffect(() => {
    const controller = new AbortController()

    queueMicrotask(() => {
      if (!controller.signal.aborted) {
        setObjectsLoading(true)
        setObjectsError(null)
      }
    })

    Promise.all(
      objectLoadQueries.map((objectLoadQuery) =>
        loadObjects({
          source: objectSource,
          query: objectLoadQuery,
          signal: controller.signal,
        }),
      ),
    )
      .then((objectGroups) => {
        setObjects(dedupeObjects(objectGroups.flat()))
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return
        }

        setObjects([])
        setObjectsError(error instanceof Error ? error.message : 'Object data failed.')
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setObjectsLoading(false)
        }
      })

    return () => controller.abort()
  }, [objectLoadQueries, objectSource])

  const objectStatusText = getObjectStatusText({
    objectSource,
    query,
    activeCategories,
    objectsLoading,
    objectsError,
    objectCount: objects.length,
  })

  return {
    objects,
    objectsLoading,
    objectsError,
    objectStatusText,
  }
}

function dedupeObjects(objects: MapObject[]) {
  const objectsById = new Map<string, MapObject>()

  for (const object of objects) {
    objectsById.set(object.id, object)
  }

  return [...objectsById.values()]
}

function getObjectStatusText({
  objectSource,
  query,
  activeCategories,
  objectsLoading,
  objectsError,
  objectCount,
}: {
  objectSource: ObjectDataSource
  query: string
  activeCategories: Array<MapObject['category']>
  objectsLoading: boolean
  objectsError: string | null
  objectCount: number
}) {
  if (objectsError) {
    return objectsError
  }

  if (objectsLoading) {
    return 'Loading object data...'
  }

  if (objectSource === 'remote' && activeCategories.length === 0 && query.trim().length < 2) {
    return 'Static markers loaded. Choose categories to show points.'
  }

  return `${objectCount} ${objectSource === 'local' ? 'local objects' : 'remote results'}`
}
