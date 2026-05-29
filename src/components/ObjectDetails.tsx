import { MapPin } from 'lucide-react'
import type { ReactNode } from 'react'
import { categoryLabels } from '../constants/mapConfig'
import type { MapObject } from '../types/map'
import { getObjectDisplayName } from '../utils/locationLabels'
import { formatGameCoordinates } from '../utils/mapCoordinates'

type ObjectDetailsProps = {
  // 当前选中的地图对象；为空时显示右侧空状态。
  selectedObject: MapObject | null
}

// 右侧对象详情面板；只负责展示当前选中对象的基础信息，不参与地图筛选和数据加载。
export function ObjectDetails({ selectedObject }: ObjectDetailsProps) {
  const sourceRows = selectedObject ? getSourceRows(selectedObject) : []
  const generationRows = selectedObject ? getGenerationRows(selectedObject) : []
  const mapUnitRows = selectedObject ? getMapUnitRows(selectedObject) : []
  const rawParamRows = selectedObject
    ? Object.entries(selectedObject.rawParams ?? {}).filter(
        ([key]) => !DISPLAYED_RAW_PARAM_KEYS.has(key),
      )
    : []
  const hasExtendedDetails =
    sourceRows.length > 0 ||
    generationRows.length > 0 ||
    mapUnitRows.length > 0 ||
    rawParamRows.length > 0

  return (
    <aside className="details" aria-label="Selected object details">
      {selectedObject ? (
        <>
          <div className="detail-header">
            <p>{categoryLabels[selectedObject.category]}</p>
            <h2>{getObjectDisplayName(selectedObject)}</h2>
            {getDetailSubtitle(selectedObject) ? (
              <strong>{getDetailSubtitle(selectedObject)}</strong>
            ) : null}
          </div>
          <dl className="detail-summary">
            {getSummaryRows(selectedObject).map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>

          {selectedObject.drop || selectedObject.equipment?.length ? (
            <DetailCard
              object={selectedObject}
              title={selectedObject.category === 'chest' ? 'Treasure Chest' : 'Object Items'}
            />
          ) : null}

          {hasExtendedDetails ? (
            <details className="advanced-details">
              <summary>Advanced details</summary>
              <div className="detail-sections">
                {sourceRows.length ? (
                  <DetailSection title="Source ids">
                    <DetailRows rows={sourceRows} />
                  </DetailSection>
                ) : null}

                {generationRows.length ? (
                  <DetailSection title="Generation params">
                    <DetailRows rows={generationRows} />
                  </DetailSection>
                ) : null}

                {mapUnitRows.length ? (
                  <DetailSection title="Map unit">
                    <DetailRows rows={mapUnitRows} />
                  </DetailSection>
                ) : null}

                {rawParamRows.length ? (
                  <DetailSection title="Raw params">
                    <DetailRows rows={rawParamRows} />
                  </DetailSection>
                ) : null}
              </div>
            </details>
          ) : null}
        </>
      ) : (
        <div className="empty-state">
          <MapPin size={24} />
          <h2>No object selected</h2>
          <p>Choose a result or click a marker on the map.</p>
        </div>
      )}
    </aside>
  )
}

type DetailRow = [string, string | number | boolean]
type NullableDetailRow = [string, string | number | boolean | undefined]

const DISPLAYED_RAW_PARAM_KEYS = new Set([
  'hash_id',
  'id',
  'Icon',
  'MessageID',
  'objid',
  'Priority',
  'SaveFlag',
  'ShowLevel',
  'ShrineInCave',
  'korok_id',
  'korok_type',
  'map_static',
  'scale',
])

// 详情面板内的通用分组容器；让扩展字段保持一致的标题和正文结构。
function DetailSection({
  title,
  children,
}: {
  // 详情分组标题；用于区分宝箱内容、掉落物、地图单元和原始参数。
  title: string
  // 详情分组正文；通常是文本或紧凑的 dl 列表。
  children: ReactNode
}) {
  return (
    <section className="detail-section">
      <h3>{title}</h3>
      {children}
    </section>
  )
}

// 渲染详情里的键值行；高级信息多个分组复用同一套紧凑布局。
function DetailRows({ rows }: { rows: DetailRow[] }) {
  return (
    <dl>
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{String(value)}</dd>
        </div>
      ))}
    </dl>
  )
}

// 源站风格的物品卡片；默认只展示最有用的掉落、位置和 ID。
function DetailCard({
  object,
  title,
}: {
  // 当前选中的对象；用于展示掉落物、位置和源数据 ID。
  object: MapObject
  // 卡片标题；宝箱对象显示 Treasure Chest，其他对象显示 Object Items。
  title: string
}) {
  const items = object.drop?.values.length ? object.drop.values : object.equipment ?? []

  return (
    <section className="detail-card-section">
      <h3>{title}</h3>
      <article className="detail-item-card">
        <strong>{items.length ? items.join(', ') : formatDrop(object.drop)}</strong>
        <span>{getObjectDisplayName(object)}</span>
        <small>ID {object.id}</small>
      </article>
    </section>
  )
}

// 详情摘要只保留源站面板默认可见的核心字段，避免技术参数挤占阅读空间。
function getSummaryRows(object: MapObject): DetailRow[] {
  return [
    ['Actor', object.actor],
    ['Position', formatGameCoordinates(object)],
  ]
}

// 详情标题下方的副标题；优先使用宝箱/掉落物，其次展示原始名称。
function getDetailSubtitle(object: MapObject) {
  if (object.drop?.values.length) {
    return object.drop.values.slice(0, 2).join(', ')
  }

  if (object.displayName && object.name && object.name !== object.displayName) {
    return object.name
  }

  return ''
}

// 把源数据 ID 和展示控制字段整理到一起，方便和 zeldamods 原始数据互相对照。
function getSourceRows(object: MapObject) {
  const rawParams = object.rawParams ?? {}

  const rows: NullableDetailRow[] = [
    ['Source kind', object.sourceKind],
    ['Object ID', object.id],
    ['Obj ID', readDetailParam(rawParams, 'objid')],
    ['Hash ID', readDetailParam(rawParams, 'hash_id') ?? readDetailParam(rawParams, 'id')],
    ['Message ID', readDetailParam(rawParams, 'MessageID')],
    ['Save flag', readDetailParam(rawParams, 'SaveFlag')],
    ['Icon key', object.iconKey],
    ['Source icon', readDetailParam(rawParams, 'Icon')],
    ['Show level', object.showLevel ?? readDetailParam(rawParams, 'ShowLevel')],
    ['Priority', object.priority ?? readDetailParam(rawParams, 'Priority')],
  ]

  return rows.filter(isDetailRow)
}

// 把对象生成相关参数单独分组；当前数据只展示本地 raw/static 缓存真实存在的字段。
function getGenerationRows(object: MapObject) {
  const rawParams = object.rawParams ?? {}

  const rows: NullableDetailRow[] = [
    ['Scale', readDetailParam(rawParams, 'scale')],
    ['Map static', formatBooleanish(readDetailParam(rawParams, 'map_static'))],
    ['Korok ID', readDetailParam(rawParams, 'korok_id')],
    ['Korok type', readDetailParam(rawParams, 'korok_type')],
    ['Shrine in cave', formatBooleanish(readDetailParam(rawParams, 'ShrineInCave'))],
  ]

  return rows.filter(isDetailRow)
}

// 把对象上的地图单元字段整理成可渲染的键值行；空字段会被过滤掉。
function getMapUnitRows(object: MapObject) {
  const rows: NullableDetailRow[] = [
    ['Map type', object.mapType],
    ['Map name', object.mapName],
    ['Field area', object.fieldArea],
    ['Region', object.region],
    ['Location ID', object.locationId],
  ]

  return rows.filter(isDetailRow)
}

function isDetailRow(row: NullableDetailRow): row is DetailRow {
  return row[1] !== undefined && row[1] !== ''
}

// 把标准化后的掉落数据格式化成详情面板中的简短文本。
function formatDrop(drop: MapObject['drop']) {
  if (!drop) {
    return 'Unknown'
  }

  const values = drop.values.length ? drop.values.join(', ') : 'Unknown'

  return `${drop.type}: ${values}`
}

function readDetailParam(
  rawParams: NonNullable<MapObject['rawParams']>,
  key: string,
) {
  return rawParams[key]
}

function formatBooleanish(value: string | number | boolean | undefined) {
  if (value === 1 || value === '1') {
    return 'Yes'
  }

  if (value === 0 || value === '0') {
    return 'No'
  }

  return value
}
