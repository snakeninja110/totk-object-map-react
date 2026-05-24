import {
  Bookmark,
  Box,
  CircleDot,
  FlaskConical,
  Leaf,
  MapPin,
  Mountain,
  RadioTower,
  ShoppingBag,
  Sparkle,
  Shield,
  Swords,
  Waypoints,
  type LucideIcon,
} from 'lucide-react'
import type { MapLayer, MapObject, TileSource } from '../types/map'

export const RESULT_LIST_LIMIT = 1000
export const MAP_RENDER_LIMIT = 3000

// Leaflet 瓦片目录和游戏图层的映射；Surface 在源站文件目录中叫 Ground。
export const layerFolders: Record<MapLayer, string> = {
  Sky: 'Sky',
  Surface: 'Ground',
  Depths: 'Depths',
}

// 地图瓦片 URL 配置；Local 读取 public 缓存，Remote 保留源站在线地址。
export const tileLayers: Record<TileSource, Record<MapLayer, string>> = {
  local: {
    Sky: '/data/map/Sky/maptex/{z}/{x}/{y}.webp',
    Surface: '/data/map/Ground/maptex/{z}/{x}/{y}.webp',
    Depths: '/data/map/Depths/maptex/{z}/{x}/{y}.webp',
  },
  remote: {
    Sky: 'https://objmap-totk.zeldamods.org/game_files/map/Sky/maptex/{z}/{x}/{y}.webp',
    Surface:
      'https://objmap-totk.zeldamods.org/game_files/map/Ground/maptex/{z}/{x}/{y}.webp',
    Depths:
      'https://objmap-totk.zeldamods.org/game_files/map/Depths/maptex/{z}/{x}/{y}.webp',
  },
}

export const tileAttributions: Record<TileSource, string> = {
  local: 'Map tiles cached locally from zeldamods.org',
  remote: 'Map tiles from zeldamods.org',
}

// 侧边栏分类按钮顺序，按原站 Filter 面板的主分类优先展示。
export const categoryOrder: Array<MapObject['category']> = [
  'location',
  'shrine',
  'place',
  'tower',
  'shop',
  'techLab',
  'chasm',
  'cave',
  'korok',
  'dragonTear',
  'lightroot',
  'dispenser',
  'chest',
  'weapon',
  'enemy',
]

export const categoryIcons: Record<MapObject['category'], LucideIcon> = {
  location: MapPin,
  place: Bookmark,
  cave: Mountain,
  chasm: CircleDot,
  dragonTear: Sparkle,
  dispenser: CircleDot,
  korok: Leaf,
  shop: ShoppingBag,
  lightroot: CircleDot,
  techLab: FlaskConical,
  tower: RadioTower,
  shrine: Shield,
  chest: Box,
  weapon: Swords,
  enemy: Waypoints,
}

// 分类按钮优先使用从原站拉取的图标资源；缺失时回退到 lucide 图标。
export const categoryIconAssets: Partial<Record<MapObject['category'], string>> = {
  location: '/icons/mapicon_village.svg',
  place: '/icons/mapicon_hatago.svg',
  cave: '/icons/cave.png',
  chasm: '/icons/chasm.png',
  dragonTear: '/icons/tear.svg',
  dispenser: '/icons/dispenser.svg',
  korok: '/icons/mapicon_korok.png',
  shop: '/icons/mapicon_shop_yorozu.svg',
  lightroot: '/icons/lightroot.svg',
  techLab: '/icons/mapicon_labo.svg',
  tower: '/icons/tower.svg',
  shrine: '/icons/shrine.svg',
  weapon: '/icons/sword.svg',
}

export const categoryLabels: Record<MapObject['category'], string> = {
  location: 'Locations',
  place: 'Places',
  cave: 'Cave/Well',
  chasm: 'Chasm',
  dragonTear: 'Dragon Tears',
  dispenser: 'Device Dispensers',
  korok: 'Koroks',
  shop: 'Shops',
  lightroot: 'Lightroots',
  techLab: 'Tech Labs',
  tower: 'Towers',
  shrine: 'Shrines',
  chest: 'Chests',
  weapon: 'Weapons',
  enemy: 'Enemies',
}

// 点击部分分类时自动切换到更符合源站默认展示的图层。
export const categoryPreferredLayers: Partial<Record<MapObject['category'], MapLayer>> = {
  lightroot: 'Depths',
}

// 先按原站侧栏展示地图区域入口；当前仅提供界面占位，后续再接入区域图层数据。
export const mapAreaOptions = [
  'None',
  'Map Tower Areas',
  'Surface Field Map Areas',
  'Depths Field Map Areas',
  'Cave Field Map Areas',
  'Sky Field Map Areas',
  'Sky Regions (approximate)',
  'Cave Regions (approximate)',
  'Cave Regions (detailed)',
  'Cherry Blossom Trees',
]
