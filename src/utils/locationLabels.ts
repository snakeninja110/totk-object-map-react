import L from 'leaflet'
import type { MapObject } from '../types/map'
import { getObjectDisplayName } from './locationLabelRules'
export {
  formatLocationLabel,
  getObjectDisplayName,
  shouldShowLocationLabel,
} from './locationLabelRules'

const locationLabelIconCache = new Map<string, L.DivIcon>()

// 生成 Leaflet DivIcon，用于复刻源站 Locations 标签的文字样式。
export function getLocationLabelIcon(object: MapObject) {
  const label = getObjectDisplayName(object)
  const cacheKey = `${object.layer}:${label}`
  const cached = locationLabelIconCache.get(cacheKey)

  if (cached) {
    return cached
  }

  const icon = L.divIcon({
    className: `location-map-label location-map-label-${object.layer.toLowerCase()}`,
    html: `<span class="location-map-label-name">${escapeHtml(label)}</span><span class="location-map-label-glyphs">${escapeHtml(
      label,
    )}</span>`,
    iconSize: L.point(220, 58),
    iconAnchor: L.point(110, 29),
    popupAnchor: L.point(0, -18),
  })

  locationLabelIconCache.set(cacheKey, icon)
  return icon
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    return {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }[character] as string
  })
}
