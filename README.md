# TotK Object Map React

这是一个用 React 复刻《塞尔达传说：王国之泪》对象地图的个人项目原型。目标是做成一个可离线运行的交互式地图工具，用于查看地图底图、对象点位、分类筛选、搜索和详情信息。

当前版本还不是完整复刻版，已经完成本地 / 远程瓦片切换、本地对象索引、分类筛选、Fuse.js 搜索、源站静态 marker 分类、源站图标注册表、结果列表虚拟滚动、Visible map areas 区域覆盖层，以及页面结构拆分。离线瓦片体积较大，不提交到 Git，需要在本地按下面步骤抓取。

## 技术栈

- React 19：前端界面
- TypeScript：类型约束
- Vite：开发服务器和构建工具
- Leaflet：地图渲染核心
- React Leaflet：React 里的 Leaflet 组件封装
- Zustand：全局 UI 状态管理
- Fuse.js：本地模糊搜索
- Lucide React：界面图标
- Vitest：核心规则单元测试
- ESLint：代码检查

## 当前功能

- 三层地图切换：`Sky`、`Surface`、`Depths`
- 地图瓦片加载：支持本地静态瓦片和 zeldamods 远程瓦片切换
- TotK 坐标校准：地图使用原始 `x=-6000..6000`、`z=-5000..5000` 边界和 `24000 x 20000` 原图尺寸
- 对象点位渲染：支持本地对象索引和远程 radar API
- 源站静态 marker：支持 `Locations`、`Places`、`Shrines`、`Towers`、`Chasm`、`Cave/Well`、`Koroks`、`Dragon Tears` 等分类
- 源站图标：分类按钮、静态 marker 和普通 raw 对象兜底图标共用同一套本地图标注册表
- 左侧工具栏：搜索、图层切换、分类筛选、点位列表
- Filter 侧边栏：按原站风格展示两列分类按钮，并支持多选分类标签
- Visible map areas：支持地图塔区域、地面 / 地底 / 天空 Field Map Areas、天空 / 洞穴区域和樱花树区域覆盖层
- 结果列表：使用虚拟滚动渲染，避免大量结果一次性生成 DOM
- 右侧详情栏：按分组展示 Actor、图层、坐标、标签、宝箱内容 / 掉落物、装备、源数据 ID、生成参数、地图单元和原始参数
- 静态数据目录规划：`public/data/README.md`
- 数据抓取脚本初稿：
  - `scripts/fetch-map-unit.mjs`
  - `scripts/fetch-tiles.mjs`

## 本地运行

安装依赖：

```bash
npm install
```

启动开发服务：

```bash
npm run dev
```

构建检查：

```bash
npm run build
```

代码检查：

```bash
npm run lint
```

运行单元测试：

```bash
npm run test
```

## 离线瓦片获取

离线瓦片不提交到 GitHub。本地运行时可以通过脚本下载到：

```text
public/data/map/{Layer}/maptex/{z}/{x}/{y}.webp
```

对应三层目录：

```text
public/data/map/
  Ground/maptex/{z}/{x}/{y}.webp
  Sky/maptex/{z}/{x}/{y}.webp
  Depths/maptex/{z}/{x}/{y}.webp
```

先做小范围测试：

```bash
npm run fetch:tiles -- --layers=Ground --zooms=0..1 --delay-ms=200
```

确认方向和路径正确后，抓取完整离线瓦片：

```bash
npm run fetch:tiles
```

默认会抓取 `Ground`、`Sky`、`Depths` 三层，缩放层级 `0..7`，并写入 `public/data/map/manifest.json`。脚本会跳过已有非空文件，遇到 404 记录为缺失瓦片，网络错误和 5xx 会重试，并在请求之间加延迟，避免压测来源站点。

下载完成后校验：

```bash
npm run verify:tiles
```

当前应用可以在侧边栏切换 `Local` / `Remote` 瓦片。本地缺失瓦片不会自动回退远程，需要手动切回 `Remote`。

使用这些数据前请确认 zeldamods 站点许可证、数据授权、请求频率和再分发限制。

## 对象数据与远程模式

对象点位和底图瓦片是两套独立数据源：

- `Tile source`：控制地图底图，支持 `Local` / `Remote`
- `Object data`：控制点位数据，支持 `Local Data` / `Remote API`

本地对象点位入口：

```text
public/data/objects/index.json
```

当前本地对象索引由两类数据合成：

- `raw radar cache`：来自 `public/data/objects/raw`，用于本地搜索和普通对象展示
- `static markers`：来自 `public/data/objects/static/mainfield-static.json`，用于复刻源站 Filter 主分类

当前本地索引状态：

- raw 对象记录：`51573`
- 前端对象索引：`43583`
- 静态 marker 分类包含：
  - `location`: 890
  - `place`: 33
  - `cave`: 255
  - `chasm`: 36
  - `dragonTear`: 12
  - `dispenser`: 30
  - `korok`: 900
  - `shop`: 46
  - `lightroot`: 120
  - `techLab`: 2
  - `tower`: 15
  - `shrine`: 152

远程对象模式有两种行为：

- 无搜索词时：一次性加载源站 `map_summary/MainField/static.json`，分类点击只做前端筛选，行为对齐源站 Filter 面板
- 有搜索词时：使用 radar API 查询搜索结果

本地索引构建和远程对象加载共用 `src/utils/objectStandardization.ts`，分类、图层、颜色、图标、地图单元和详情字段会尽量保持同一口径。

本地搜索使用 Fuse.js，并支持基础结构化语法：

```text
actor:TBox
category:chest
drop:Arrow
equipment:Weapon_Bow_017
map:A-1
hash:0x40b1
layer:Surface
region:"Rospro Pass"
location:Cave_Test
tag:korok
raw:map_static
```

普通关键词会走模糊搜索；带字段前缀的条件会做精确字段过滤。多个条件同时输入时必须全部命中。远程搜索仍受 radar API 返回限制影响，结构化条件会优先用普通关键词或可下发的字段值向远程 API 查询，再在前端做二次过滤。

## 数据目录规划

推荐把离线资源放在：

```text
public/data/
  map/                         # 本地生成，不提交 Git
    Ground/maptex/{z}/{x}/{y}.webp
    Sky/maptex/{z}/{x}/{y}.webp
    Depths/maptex/{z}/{x}/{y}.webp
  map-areas/                   # 源站 Visible map areas 区域覆盖层数据
    MapTower.json
    Ground.json
    MinusField.json
    Cave.json
    Sky.json
    sky_polys.json
    cave_polys.json
    cave_polys_detail.json
    cherry_blossom_trees.json
  objects/
    raw/                       # radar API 原始缓存
      MainAndMinusField/_all/{query}.json
      manifest.json
    static/                    # 源站静态 marker 和文本名
      mainfield-static.json
      location-marker-names.json
      dungeon-names.json
    index.json                 # 前端直接读取的标准化对象索引
  details/
    {objectId}.json
```

抓取 radar API 原始对象数据：

```bash
npm run fetch:map-unit -- --preset=core --limit=5000 --delay-ms=250
```

常用参数：

```bash
npm run fetch:map-unit -- --queries=TBox,Enemy --limit=5000
npm run fetch:map-unit -- --preset=all --limit=5000
npm run fetch:map-unit -- --preset=core --limit=-1 --force
npm run fetch:map-unit -- --map-type=MainAndMinusField --map-name= --force
```

输出目录是 `public/data/objects/raw`。脚本会跳过已有非空文件，网络错误和 5xx 会重试，运行结果写入 `public/data/objects/raw/manifest.json`。radar API 支持 `limit=-1` 获取完整结果；`offset/page` 参数不会改变结果，需要通过多查询词分片抓取。

把 raw 对象转换成本地前端索引：

```bash
npm run build:objects
```

转换完成后检查对象索引完整性：

```bash
npm run verify:objects
```

## 前端结构

当前页面已从单文件 `App.tsx` 拆分为几类模块：

```text
src/
  App.tsx                         # 页面编排层，连接 store、hooks 和组件
  components/
    FilterSidebar.tsx             # 左侧筛选栏
    VirtualResultList.tsx         # 结果列表虚拟滚动
    TotkMap.tsx                   # Leaflet 地图、瓦片、marker 和视口同步
    MapAreaOverlay.tsx            # Visible map areas 区域覆盖层
    MapViewportSync.tsx           # Leaflet 缩放和视口边界同步
    ObjectMarker.tsx              # 单个对象 marker、图标和 popup
    ObjectDetails.tsx             # 右侧对象详情
  constants/
    mapConfig.ts                  # 分类、瓦片、图标、侧栏配置
  hooks/
    useObjectData.ts              # 对象数据加载
    useVisibleObjects.ts          # 搜索、分类、图层、视口和渲染上限
    useMapAreas.ts                # 区域覆盖层数据加载和格式归一化
  utils/
    locationLabels.ts             # Locations 文本标签和 ShowLevel 规则
    locationLabelRules.ts         # 不依赖 Leaflet 的 Locations 纯规则
    mapAreaRules.ts               # 区域覆盖层归一化、过滤、坐标和样式规则
    objectFilters.ts              # 图层匹配、静态分类、视口过滤
    objectStandardization.ts      # 前端远程模式和离线构建脚本共享的对象标准化规则
    visibleObjectRules.ts         # 最终可见对象筛选纯规则
```

新增对象、类和关键业务规则应写中文功能型注释。尤其是源站行为复刻规则，例如 `Chasm` 同时显示在 `Surface` 和 `Depths`、`Locations` 按 `ShowLevel` 随缩放逐步显示。

## TODO

- [x] 初始化 Git 仓库，建立基础提交记录
- [x] 把 Leaflet 坐标系统校准到 TotK 原始地图尺寸
- [x] 把远程瓦片切换为本地静态瓦片
- [x] 完善 `fetch-tiles.mjs`，支持断点续传、跳过已存在文件、限速和多图层
- [x] 增加离线瓦片完整性校验脚本
- [x] 从 `sampleObjects.ts` 切换到 `public/data/objects/index.json`
- [x] 增加 `Local Data / Remote API` 对象数据来源切换
- [x] 完善 `fetch-map-unit.mjs`，支持批量 raw 对象抓取、断点跳过、限速、重试和 manifest
- [x] 设计对象数据标准格式，把 radar API 响应转换成前端稳定结构
- [x] 增加对象索引完整性校验脚本
- [x] 加入 Fuse.js 搜索，支持名称、Actor、标签和分类搜索
- [x] 加入 Zustand 状态管理，统一维护图层、数据源、筛选、搜索和选中对象状态
- [x] 调整 Filter 侧边栏样式，并支持多选分类标签
- [x] 接入源站静态 marker，统一本地 / 远程分类筛选口径
- [x] 拆分 `App.tsx`，抽出配置、工具函数、hooks 和页面组件
- [x] 给结果列表接入虚拟滚动，避免大量 DOM 节点拖慢侧边栏
- [x] 把 `Visible map areas` 接入真实区域图层数据
- [x] 为核心筛选规则补充单元测试
- [x] 为区域覆盖层补充基础规则测试和本地服务验证
- [x] 抽出对象标准化共享规则，统一前端远程模式和离线构建脚本
- [x] 增强对象详情，展示宝箱内容、掉落物、地图单元和原始参数
- [ ] 加入 IndexedDB 或本地存储，保存已完成、收藏和自定义标记
- [ ] 加入点位聚合或 Canvas 渲染，优化大量点位性能
- [ ] 增加导入 / 导出 JSON 功能
- [ ] 增加移动端布局优化
- [ ] 增加 Playwright 基础交互测试

## 数据来源说明

本项目是个人学习和娱乐用途。当前原型参考了 zeldamods 的 TotK Object Map 公开站点和公开接口结构。若后续发布或分享，需要注意原项目许可证、数据来源授权、接口使用频率和资源再分发问题。
