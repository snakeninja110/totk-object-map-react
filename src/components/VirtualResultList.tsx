import { EyeOff, Pin, PinOff } from 'lucide-react'
import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { MapObject } from '../types/map'
import { getObjectDisplayName } from '../utils/locationLabels'

const RESULT_ROW_HEIGHT = 72
const RESULT_OVERSCAN = 6
const FALLBACK_LIST_HEIGHT = 260

type VirtualResultListProps = {
  // 完整结果集；组件内部只渲染当前滚动窗口附近的条目，避免大量 DOM 节点拖慢侧边栏。
  objects: MapObject[]
  // 当前详情面板选中的对象 ID；用于高亮列表中对应行。
  selectedObjectId: string | null
  // 当前固定显示的对象 ID 集合；用于给行按钮展示固定状态。
  pinnedObjectSet: Set<string>
  // 点击列表行时把对象选择交还给上层 store。
  onSelect: (id: string) => void
  // 固定或取消固定当前对象。
  onTogglePinned: (id: string) => void
  // 临时隐藏当前对象。
  onHide: (id: string) => void
}

// 轻量虚拟列表组件；不引入额外依赖，按固定行高计算可见范围。
// 结果数量较大时，DOM 只保留视口内几十行，搜索和多选分类后侧栏滚动会更稳定。
export function VirtualResultList({
  objects,
  selectedObjectId,
  pinnedObjectSet,
  onSelect,
  onTogglePinned,
  onHide,
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
          const isPinned = pinnedObjectSet.has(object.id)

          return (
            <div
              key={object.id}
              className={`result-row ${selectedObjectId === object.id ? 'active' : ''} ${
                isPinned ? 'pinned' : ''
              }`}
              style={{
                transform: `translateY(${absoluteIndex * RESULT_ROW_HEIGHT}px)`,
              }}
            >
              <button
                type="button"
                className="result-main"
                onClick={() => onSelect(object.id)}
              >
                <span>{getObjectDisplayName(object)}</span>
                <small>{object.actor}</small>
              </button>
              <div className="result-actions" aria-label={`${getObjectDisplayName(object)} actions`}>
                <button
                  type="button"
                  aria-label={isPinned ? 'Remove from map' : 'Add to map'}
                  title={isPinned ? 'Remove from map' : 'Add to map'}
                  onClick={() => onTogglePinned(object.id)}
                >
                  {isPinned ? <PinOff size={16} /> : <Pin size={16} />}
                </button>
                <button
                  type="button"
                  aria-label="Hide object"
                  title="Hide object"
                  onClick={() => onHide(object.id)}
                >
                  <EyeOff size={16} />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
