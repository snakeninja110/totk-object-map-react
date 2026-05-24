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
import type { MapAreaOption, MapLayer, MapObject, TileSource } from '../types/map'

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

// 源站 Visible map areas 对应的区域数据入口；文件统一放在 public/data/map-areas。
export const mapAreaOptions: MapAreaOption[] = [
  {
    id: 'none',
    label: 'None',
    fileName: null,
    color: '#3388ff',
  },
  {
    id: 'mapTower',
    label: 'Map Tower Areas',
    fileName: 'MapTower.json',
    color: '#46a6ff',
  },
  {
    id: 'surfaceField',
    label: 'Surface Field Map Areas',
    fileName: 'Ground.json',
    color: '#46a6ff',
  },
  {
    id: 'depthsField',
    label: 'Depths Field Map Areas',
    fileName: 'MinusField.json',
    color: '#9b7cff',
  },
  {
    id: 'caveField',
    label: 'Cave Field Map Areas',
    fileName: 'Cave.json',
    color: '#f3b84a',
  },
  {
    id: 'skyField',
    label: 'Sky Field Map Areas',
    fileName: 'Sky.json',
    color: '#5fd3ff',
  },
  {
    id: 'skyRegions',
    label: 'Sky Regions (approximate)',
    fileName: 'sky_polys.json',
    color: '#70d6ff',
  },
  {
    id: 'caveRegions',
    label: 'Cave Regions (approximate)',
    fileName: 'cave_polys.json',
    color: '#f0c15f',
  },
  {
    id: 'caveRegionsDetail',
    label: 'Cave Regions (detailed)',
    fileName: 'cave_polys_detail.json',
    color: '#f3e79b',
  },
  {
    id: 'cherryBlossomTrees',
    label: 'Cherry Blossom Trees',
    fileName: 'cherry_blossom_trees.json',
    color: '#ff8db7',
  },
]
