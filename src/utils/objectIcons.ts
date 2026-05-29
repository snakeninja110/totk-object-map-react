import L from 'leaflet'
import { objectIconConfigs, type ObjectIconKey } from '../constants/objectIconConfig'

const iconCache = new Map<string, L.Icon>()

export function getObjectIcon(iconKey: string) {
  const cached = iconCache.get(iconKey)

  if (cached) {
    return cached
  }

  const config = objectIconConfigs[iconKey as ObjectIconKey]

  if (!config) {
    return null
  }

  const icon = L.icon({
    iconUrl: `/icons/${config.file}`,
    iconSize: L.point(...config.size),
    iconAnchor: L.point(config.size[0] / 2, config.size[1] / 2),
    tooltipAnchor: L.point(0, config.size[1] / 2),
    className: ['object-map-marker', config.className].filter(Boolean).join(' '),
  })

  iconCache.set(iconKey, icon)
  return icon
}
