import type { MapObject } from '../types/map'
import { getObjectDisplayName } from './locationLabels'

// 对象展示设置；来自源站 Settings 的 Object Display / Object Color Mode。
export type ObjectDisplaySettings = {
  // 是否使用内部 Actor 名称显示对象标题。
  useActorNames: boolean
  // 是否把 hash ID 统一显示为 0x 开头的十六进制。
  useHexForHashIds: boolean
  // 是否按 Actor 类型给圆点 marker 上色。
  colorPerActor: boolean
}

// 生成对象标题；地点类静态标签仍保留可读地名，避免地图区域名变成 LocationMarker。
export function getObjectTitle(
  object: MapObject,
  settings: Pick<ObjectDisplaySettings, 'useActorNames'>,
) {
  if (settings.useActorNames && object.category !== 'location') {
    return object.actor
  }

  return getObjectDisplayName(object)
}

// 格式化源数据 ID；源站用 parseHash 把十进制 hash 转成 16 位十六进制。
export function formatObjectId(
  value: string | number | boolean | undefined,
  settings: Pick<ObjectDisplaySettings, 'useHexForHashIds'>,
) {
  if (value === undefined || typeof value === 'boolean') {
    return value
  }

  const text = String(value)

  if (!settings.useHexForHashIds || !/^\d+$/.test(text)) {
    return text
  }

  return `0x${BigInt(text).toString(16).padStart(16, '0')}`
}

// 计算 marker 颜色；按 Actor 上色时复刻源站“同名对象同色”的稳定哈希思路。
export function getObjectMarkerColor(
  object: MapObject,
  settings: Pick<ObjectDisplaySettings, 'colorPerActor'>,
) {
  if (!settings.colorPerActor) {
    return object.color
  }

  return colorFromHash(hashString(object.actor || object.name))
}

function hashString(value: string) {
  let hash = 0

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index)
    hash |= 0
  }

  return hash >>> 0
}

function colorFromHash(hash: number) {
  const hue = hash % 360

  return `hsl(${hue} 72% 55%)`
}
