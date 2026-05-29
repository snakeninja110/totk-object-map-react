import type { MapObject, ObjectCategory } from '../types/map'

export type ObjectIconKey =
  | 'bargainer'
  | 'battery'
  | 'cave'
  | 'castle'
  | 'chasm'
  | 'checkpoint'
  | 'dispenser'
  | 'drink'
  | 'hatago'
  | 'korok'
  | 'labo'
  | 'lightroot'
  | 'shrine'
  | 'shrine_cave'
  | 'shop_bougu'
  | 'shop_color'
  | 'shop_jewel'
  | 'shop_yadoya'
  | 'shop_yorozu'
  | 'star'
  | 'sword'
  | 'tear'
  | 'tower'
  | 'village'
  | 'well'

export type ObjectIconConfig = {
  // public/icons 下的源站图标文件名；地图 marker 和侧边栏分类按钮共用。
  file: string
  // Leaflet marker 的显示尺寸；侧边栏会按容器自适应，不直接使用这个尺寸。
  size: [number, number]
  // 额外 CSS class；用于保留源站部分图标的发光或尺寸细节。
  className?: string
}

// 源站图标注册表；所有本地图标 key 都必须在这里登记，避免分类和 marker 各自维护路径。
export const objectIconConfigs: Record<ObjectIconKey, ObjectIconConfig> = {
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

// 源站 static.json 的 Icon 字段到本地图标 key 的映射；本地和远程 static marker 共用。
export const sourceIconKeyMap: Record<string, ObjectIconKey> = {
  Bargainer: 'bargainer',
  Battery: 'battery',
  Castle: 'castle',
  Cave: 'cave',
  Chasm: 'chasm',
  CheckPoint: 'checkpoint',
  Dispenser: 'dispenser',
  Drink: 'drink',
  Dungeon: 'shrine',
  Hatago: 'hatago',
  Labo: 'labo',
  Lightroot: 'lightroot',
  ShopBougu: 'shop_bougu',
  ShopColor: 'shop_color',
  ShopJewel: 'shop_jewel',
  ShopYadoya: 'shop_yadoya',
  ShopYorozu: 'shop_yorozu',
  Star: 'star',
  Sword: 'sword',
  Tear: 'tear',
  Tower: 'tower',
  Village: 'village',
  Well: 'well',
}

// 主分类默认图标；对象没有更细源站 Icon 时用它做兜底。
export const categoryDefaultIconKeys: Partial<Record<ObjectCategory, ObjectIconKey>> = {
  place: 'village',
  cave: 'cave',
  chasm: 'chasm',
  dragonTear: 'tear',
  dispenser: 'dispenser',
  korok: 'korok',
  shop: 'shop_yorozu',
  lightroot: 'lightroot',
  techLab: 'labo',
  tower: 'tower',
  shrine: 'shrine',
  weapon: 'sword',
}

// 侧边栏分类按钮使用的代表图标；这里单独配置，避免 Locations 等分类被地图 marker 规则影响。
export const categoryIconKeys: Partial<Record<MapObject['category'], ObjectIconKey>> = {
  location: 'village',
  ...categoryDefaultIconKeys,
}

// 把本地图标 key 转成 public 资源 URL；分类按钮和其他普通 img 标签使用。
export function objectIconAssetPath(iconKey: ObjectIconKey) {
  return `/icons/${objectIconConfigs[iconKey].file}`
}
