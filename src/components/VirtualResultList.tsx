import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { MapObject } from '../types/map'
import { getObjectDisplayName } from '../utils/locationLabels'

const RESULT_ROW_HEIGHT = 62
const RESULT_OVERSCAN = 6
const FALLBACK_LIST_HEIGHT = 260

type VirtualResultListProps = {
  // 完整结果集；组件内部只渲染当前滚动窗口附近的条目，避免大量 DOM 节点拖慢侧边栏。
  objects: MapObject[]
  // 当前详情面板选中的对象 ID；用于高亮列表中对应行。
  selectedObjectId: string | null
  // 点击列表行时把对象选择交还给上层 store。
  onSelect: (id: string) => void
}

// 轻量虚拟列表组件；不引入额外依赖，按固定行高计算可见范围。
// 结果数量较大时，DOM 只保留视口内几十行，搜索和多选分类后侧栏滚动会更稳定。
export function VirtualResultList({
  objects,
  selectedObjectId,
  onSelect,
}: VirtualResultListProps) {
  const listRef = useRef<HTMLDivElement | null>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [viewportHeight, setViewportHeight] = useState(FALLBACK_LIST_HEIGHT)

  useLayoutEffect(() => {
    const element = listRef.current

    if (!element) {
      return
    }

    const updateHeight = () => {
      setViewportHeight(element.clientHeight || FALLBACK_LIST_HEIGHT)
    }

    updateHeight()

    if (!('ResizeObserver' in window)) {
      return
    }

    const resizeObserver = new ResizeObserver(updateHeight)
    resizeObserver.observe(element)

    return () => resizeObserver.disconnect()
  }, [])

  const totalHeight = objects.length * RESULT_ROW_HEIGHT
  const visibleRange = useMemo(() => {
    const visibleCount = Math.ceil(viewportHeight / RESULT_ROW_HEIGHT)
    const startIndex = Math.max(
      0,
      Math.floor(scrollTop / RESULT_ROW_HEIGHT) - RESULT_OVERSCAN,
    )
    const endIndex = Math.min(
      objects.length,
      startIndex + visibleCount + RESULT_OVERSCAN * 2,
    )

    return {
      startIndex,
      visibleObjects: objects.slice(startIndex, endIndex),
    }
  }, [objects, scrollTop, viewportHeight])

  return (
    <div
      className="result-list virtual-result-list"
      ref={listRef}
      onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
    >
      <div className="virtual-result-spacer" style={{ height: totalHeight }}>
        {visibleRange.visibleObjects.map((object, index) => {
          const absoluteIndex = visibleRange.startIndex + index

          return (
            <button
              key={object.id}
              type="button"
              className={selectedObjectId === object.id ? 'active' : ''}
              style={{
                transform: `translateY(${absoluteIndex * RESULT_ROW_HEIGHT}px)`,
              }}
              onClick={() => onSelect(object.id)}
            >
              <span>{getObjectDisplayName(object)}</span>
              <small>{object.actor}</small>
            </button>
          )
        })}
      </div>
    </div>
  )
}
