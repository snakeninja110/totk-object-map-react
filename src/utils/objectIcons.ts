import L from 'leaflet'

type IconConfig = {
  file: string
  size: [number, number]
  className?: string
}

const iconConfigs: Record<string, IconConfig> = {
  bargainer: { file: 'bargainer_statue.svg', size: [20, 20] },
  battery: { file: 'battery.svg', size: [20, 20] },
  cave: { file: 'cave.png', size: [20, 20] },
  castle: { file: 'mapicon_castle.svg', size: [32, 32] },
  chasm: { file: 'chasm.png', size: [20, 20] },
  checkpoint: { file: 'mapicon_checkpoint.svg', size: [26, 26] },
  dispenser: { file: 'dispenser.svg', size: [20, 20] },
  drink: { file: 'drink.svg', size: [20, 20] },
  hatago: { file: 'mapicon_hatago.svg', size: [32, 32] },
  korok: { file: 'mapicon_korok.png', size: [20, 20] },
  labo: { file: 'mapicon_labo.svg', size: [32, 32] },
  lightroot: {
    file: 'lightroot.svg',
    size: [32, 32],
    className: 'mapicon-totk-Lightroot',
  },
  shrine: {
    file: 'shrine.svg',
    size: [32, 32],
    className: 'mapicon-totk-Shrine',
  },
  shrine_cave: {
    file: 'shrine_cave.svg',
    size: [32, 32],
    className: 'mapicon-totk-Shrine',
  },
  shop_bougu: { file: 'mapicon_shop_bougu.svg', size: [32, 32] },
  shop_color: { file: 'mapicon_shop_color.svg', size: [32, 32] },
  shop_jewel: { file: 'mapicon_shop_jewel.svg', size: [32, 32] },
  shop_yadoya: { file: 'mapicon_shop_yadoya.svg', size: [32, 32] },
  shop_yorozu: { file: 'mapicon_shop_yorozu.svg', size: [32, 32] },
  star: { file: 'star.svg', size: [20, 20] },
  sword: { file: 'sword.svg', size: [20, 20] },
  tear: { file: 'tear.svg', size: [24, 24] },
  tower: {
    file: 'tower.svg',
    size: [32, 32],
    className: 'mapicon-totk-Tower',
  },
  village: { file: 'mapicon_village.svg', size: [32, 32] },
  well: { file: 'well.svg', size: [20, 20] },
}

const iconCache = new Map<string, L.Icon>()

export function getObjectIcon(iconKey: string) {
  const cached = iconCache.get(iconKey)

  if (cached) {
    return cached
  }

  const config = iconConfigs[iconKey]

  if (!config) {
    return null
  }

  const icon = L.icon({
    iconUrl: `/icons/${config.file}`,
    iconSize: L.point(...config.size),
    iconAnchor: L.point(config.size[0] / 2, config.size[1] / 2),
    tooltipAnchor: L.point(0, config.size[1] / 2),
    className: config.className,
  })

  iconCache.set(iconKey, icon)
  return icon
}
