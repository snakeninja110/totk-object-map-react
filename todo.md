# TotK Object Map 待办与复盘

## 已完成

- 支持本地瓦片和远程瓦片切换。
- 离线瓦片缓存路径：`public/data/map/{Layer}/maptex/{z}/{x}/{y}.webp`。
- 已完整抓取 `Ground`、`Sky`、`Depths` 三层离线瓦片。
- 已把 Leaflet CRS 校准到 TotK 原始地图尺寸：
  - 地图尺寸：`24000 x 20000`
  - 游戏坐标边界：`x=-6000..6000`，`z=-5000..5000`
- 支持本地对象数据和远程 radar API 切换。
- 本地对象索引路径：`public/data/objects/index.json`。
- radar API raw 对象抓取已支持 `limit=-1`。
- 已把 raw 对象转换为前端稳定使用的 `MapObject[]`。
- 已增加瓦片完整性校验脚本。
- 已增加对象索引完整性校验脚本。
- 已接入本地 Fuse.js 搜索。
- 已扩展对象分类。
- 已拉取原站点图标资源，并按原站点静态标记数据生成 `iconKey`。
- 已新增共享图标注册表，分类按钮、地图 marker、本地索引和远程结果共用同一套源站图标配置。
- 已把原站点 `Place` 静态标记从 `Locations` 中拆出为独立 `Places` 分类，并继续使用原站点地点图片图标。
- 已接入源站 `static.json` 的全部主 Filter 静态 marker 分组。
- 已对齐远程模式行为：页面加载一次静态 marker，分类点击只做前端筛选。
- 已拆分 `App.tsx`，抽出配置、hooks、工具函数和主要页面组件。
- 已给结果列表接入虚拟滚动，侧边栏不再一次性渲染全部结果 DOM。
- 已把 `Visible map areas` 接入真实区域图层数据，支持区域填充和编号过滤。
- 已抽出对象标准化共享规则，前端远程模式和离线构建脚本共用分类、图层、图标和颜色推断逻辑。
- 已把普通 raw 对象的 Cave/Well、商店子类、Place 子类等图标兜底接入共享标准化规则。
- 已增强对象详情，展示宝箱内容、掉落物、地图单元和精简原始参数。
- 已进一步增强对象详情，按源数据 ID、生成参数、地图单元、掉落/宝箱和剩余原始参数分组展示。
- 已增加基础结构化搜索语法，支持 `actor:`、`category:`、`drop:`、`equipment:`、`map:`、`hash:`、`layer:`、`region:`、`location:`、`tag:`、`raw:`。

## 当前数据状态

- 瓦片：`29847/29850` 个本地 `.webp` 文件。
- 瓦片缺口：3 个已知 z0 文件，远端返回 404。
- raw 对象记录：`51573`。
- 转换后的本地对象：`43583`。
- 对象索引校验：
  - 重复 id：`0`
  - 非法分类：`0`
  - 非法图层：`0`
  - 非法坐标：`0`
  - 越界坐标：`0`
- 当前分类：
  - `location`
  - `place`
  - `cave`
  - `chasm`
  - `dragonTear`
  - `dispenser`
  - `korok`
  - `shop`
  - `lightroot`
  - `techLab`
  - `tower`
  - `shrine`
  - `chest`
  - `weapon`
  - `enemy`
- 静态 marker 分类口径：
  - `location`: 890
  - `place`: 33
  - `cave`: 255，其中 Cave 197、Well 58
  - `chasm`: 36，其中 35 个同时显示在 Surface 和 Depths，`Hyrule Castle Chasm` 仅显示在 Depths
  - `dragonTear`: 12
  - `dispenser`: 30
  - `korok`: 900
  - `shop`: 46
  - `lightroot`: 120
  - `techLab`: 2
  - `tower`: 15
  - `shrine`: 152

## 可用命令

```bash
npm run fetch:tiles
npm run verify:tiles
npm run fetch:map-unit
npm run build:objects
npm run verify:objects
npm run test
npm run lint
npm run build
```

## 优化待办

0. 源站侧边栏对齐功能清单
   - 背景：浏览器对比源站后，当前最大产品差距集中在侧边栏。源站左侧 rail 是 `Search`、`Filter`、`Draw`、`Checklists`、`Tools`、`Settings` 六个完整工作区；本项目当前只有 `Filter` 和 `Settings` 两个可操作面板，Search、Checklist、Draw、Completed/Checklists、Tools 图标仍是视觉占位。
   - P0：先补工作区骨架，消除“看起来能点但实际不能点”的断层。
     - [x] 把 store 中的 `SidebarPanel` 从 `filter | settings` 扩展为 `search | filter | checklist | draw | tools | settings`。
     - [x] 把 rail 上 Search、Checklist、Draw、Completed/Checklists、Tools 图标改成真实按钮，并提供 active 状态、tooltip/aria-label 和键盘可达性。
     - [x] 为每个新增面板建立最小可用空状态：标题、说明、当前状态摘要和下一步操作按钮。
     - [x] 增加侧边栏左右切换或折叠能力，对齐源站 `Move to the right side` 的基本使用场景。
   - P1：拆分 Search 和 Filter，让 Filter 只负责显示范围。
     - [x] 新增 Search 面板，迁移当前搜索框、搜索预设、搜索语法帮助和结果列表。
     - [x] 增强 Search 帮助，覆盖基础关键词、精确短语、字段过滤、布尔组合、常用示例和结构化语法。
     - [x] 增加快速清空搜索、搜索结果总数、当前地图渲染数和 Add/Remove from map 操作。
     - [x] Filter 面板保留分类按钮、`Show Korok IDs`、Visible map areas、区域编号过滤和区域填充开关。
     - [x] 调整默认显示策略，避免数据加载成功后首屏仍显示 `0 visible`；可选方案是默认显示源站静态 marker，或提供明确的“选择分类开始显示”空状态。
   - P2：补齐玩家长期使用工作流。
     - [x] 新增 Checklists 面板，支持 New List、Reset、Completed Markers 显示策略、列表切换和完成状态统计。
     - [x] 增加 IndexedDB 或 localStorage 持久化，保存 completed、favorites、pinned、hidden、custom lists、custom search presets 和 UI 设置。
     - [ ] 新增 Draw 面板，支持 Toggle draw controls、Polyline color、Reset to default、绘制对象列表。
     - [ ] 增加 Data import/export，导入 / 导出 search groups、drawn objects、checklists、完成状态和本地 UI 设置。
     - [ ] 新增 Tools 面板，支持 Go to coordinates、复制当前坐标、打开源数据或项目链接。
     - [ ] 实现地图右键菜单，支持复制 `(x,z)` / `(x,y,z)`，并读取 Settings 中的坐标格式配置。
   - P3：补产品化质量。
     - [ ] 加入点位聚合或 Canvas 渲染，优化大量点位性能。
     - [ ] 增加移动端布局优化，支持窄屏边玩边查。
     - [ ] 增加 Playwright 交互测试，覆盖侧栏面板切换、搜索、分类、区域覆盖层、Checklist、Draw 和 Tools。
     - [ ] 增加浏览器视觉回归检查，防止侧边栏按钮、文字和地图状态条在不同视口重叠。

0. UI 状态管理
   - 已完成：新增 Zustand store，统一维护图层、瓦片来源、对象数据来源、分类、搜索词和选中对象。
   - 已完成：分类筛选从单选改成多选，空选择表示不显示任何点位。
   - 后续如果增加收藏、完成状态、自定义标记、绘制对象和导入导出状态，也应继续放入状态层或持久化层，而不是直接塞回 `App.tsx`。

0.1 Filter 侧边栏交互
   - 已完成：侧边栏改成接近原站的左侧图标栏 + 两列分类按钮布局。
   - 已完成：分类按钮使用原站图标资源优先显示，缺失时回退到通用图标。
   - 已完成：`Locations` 与其他分类多选时，仍只显示大区域文字标签，避免普通地点淹没地图。
   - 已完成：无分类选中时不显示任何点位，和多选状态语义保持一致。
   - 已完成：`Chasm` 按源站规则在 Surface 和 Depths 双层显示。
   - 已完成：`Visible map areas` 接入源站区域数据，支持 `MapTower`、Field Map Areas、天空 / 洞穴区域和樱花树区域。

0.2 页面结构拆分
   - 已完成：`App.tsx` 降为页面编排层，当前主要连接 store、hooks 和三个页面区域。
   - 已完成：`FilterSidebar.tsx` 负责左侧筛选栏。
   - 已完成：`TotkMap.tsx` 负责 Leaflet 地图、瓦片、区域覆盖层、marker 和底部状态条的组合。
   - 已完成：`MapViewportSync.tsx` 负责 Leaflet 缩放和视口边界同步。
   - 已完成：`ObjectMarker.tsx` 负责单个对象 marker、图标选择和 popup。
   - 已完成：`ObjectDetails.tsx` 负责右侧对象详情。
   - 已完成：`mapConfig.ts` 负责瓦片、分类、图标和侧栏固定配置。
   - 已完成：`useObjectData.ts` 负责对象数据加载。
   - 已完成：`useVisibleObjects.ts` 负责搜索、分类、图层、视口和渲染上限。
   - 已完成：`locationLabels.ts`、`locationLabelRules.ts`、`objectFilters.ts` 和 `visibleObjectRules.ts` 负责源站地名标签和筛选纯函数。

1. 对象渲染性能
   - 已完成：地图 marker 按当前视口裁剪，并限制最多渲染 `3000` 个。
   - 已完成：结果列表使用虚拟滚动，不再用 `1000` 条硬截断作为性能保护。
   - 后续可继续评估 Canvas 渲染或点位聚合，进一步优化地图 marker 密集场景。

2. 本地搜索
   - 已完成：本地对象数据已接入 Fuse.js 搜索。
   - 已完成：普通搜索字段包括 `displayName`、`name`、`actor`、`drop.values`、`equipment`、`tags`、`mapName`、`fieldArea`、`region`、`category`、`layer`。
   - 已完成：结构化搜索支持 `actor:`、`category:`、`drop:`、`equipment:`、`map:`、`hash:`、`layer:`、`region:`、`location:`、`tag:`、`raw:`。
   - 后续应先把搜索拆到独立 Search 面板，再继续增加搜索语法帮助、搜索建议、排序权重调优和源站式 Add/Remove from map。

3. 分类扩展
   - 已完成：分类已扩展为 `location`、`place`、`cave`、`chasm`、`dragonTear`、`dispenser`、`korok`、`shop`、`lightroot`、`techLab`、`tower`、`shrine`、`chest`、`weapon`、`enemy`。
   - 已完成：无搜索词时主 Filter 分类只展示源站 static marker，避免 raw cave / korok 数据过重。
   - 后续需要继续补充宝箱、敌人、武器等非源站静态点位的更细分类和图标策略。

4. 共享对象标准化逻辑
   - 已完成：新增 `src/utils/objectStandardization.ts`，集中维护对象分类、图层、颜色、图标、静态 marker 和 radar 对象标准化规则。
   - 已完成：`src/services/objectData.ts` 的远程 radar / static marker 加载改为使用共享标准化规则。
   - 已完成：`scripts/build-object-index.mjs` 的离线索引构建改为使用同一套共享标准化规则。
   - 已完成：本地索引读取时会按同一套分类和图标规则补齐默认图标，降低旧索引或缺失字段造成的本地 / 远程差异。
   - 已完成：重新构建并校验对象索引，当前输出 `43583` 个对象，非法分类、非法图层、非法坐标和越界坐标均为 `0`。
   - 已完成：标准化输出补充 `drop`、`equipment`、`mapType`、`mapName`、`fieldArea`、`region`、`locationId` 和精简 `rawParams`，供详情面板展示。
   - 已完成：静态 marker 的 `Priority`、`ShowLevel` 等展示控制字段也会进入精简 `rawParams`，供详情面板和后续源站式面板复用。

4.1 核心规则测试
   - 已完成：加入 Vitest 和 `npm run test`。
   - 已完成：覆盖 `objectMatchesLayer`、`isSourceStaticFilterCategory`、`isObjectInViewport`。
   - 已完成：覆盖 `formatLocationLabel`、`getObjectDisplayName`、`shouldShowLocationLabel`。
   - 已完成：覆盖空分类不显示对象、无搜索词静态分类只取 static marker、搜索时允许 raw、Chasm 双层显示和 Locations 缩放过滤。
   - 后续可补 React 层交互测试，验证侧边栏点击和地图渲染联动。

5. raw 对象完整性校验
   - `fetch-map-unit` 的 manifest 只描述最近一次运行，不一定代表完整 raw 缓存状态。
   - 后续应增加 `verify:raw-objects`，直接基于文件系统和 raw JSON 结构做校验。

6. 数据存储策略
   - 需要决定是否把 `public/data/map` 和 `public/data/objects` 提交到 Git。
   - 如果不提交，需要增加 `.gitignore` 规则，并文档化重建步骤。
   - 如果提交，需要考虑仓库体积、Git LFS 或其他 artifact 管理方案。

7. 大数据量 UI 可用性
   - 已完成：增加结果列表虚拟滚动。
   - 更清晰地区分“总结果数”和“当前渲染数”。
   - 增加快速清空搜索。
   - 增加更丰富的分类和图层统计。
   - 侧栏拆分后，结果列表应归入 Search 面板，Filter 面板只保留分类和区域开关，降低滚动负担。

8. 图标映射完善
   - 已完成：神庙、洞中神庙、呀哈哈、洞穴、商店、龙之泪、驿站、光根等静态标记会使用原站点图标。
   - 已完成：新增 `src/constants/objectIconConfig.ts`，集中维护源站图标文件、Leaflet 尺寸、源站 Icon 字段映射和分类默认图标。
   - 已完成：普通 raw 对象会按分类和上下文补齐源站风格图标，例如 Well、Cave、Castle、Stable、Bargainer、Armor Shop、Dye Shop、Jewelry Shop、Inn、General Shop、Tower、Tech Lab、Lightroot、Shrine、Dragon Tear、Chasm、Device Dispenser、Weapon。
   - 后续可继续补充宝箱、敌人等自定义通用图标，但这不属于原站点静态标记图标体系。

9. 地图区域覆盖层
   - 已完成：`public/data/map-areas` 保存源站 Visible map areas 数据。
   - 已完成：`useMapAreas` 统一处理 FeatureCollection、Feature 数组和 MapTower 分组对象三类格式。
   - 已完成：地图上可绘制 Polygon / MultiPolygon 区域，支持填充开关。
   - 已完成：支持按编号、`Area`、`order`、`towerNum` 或标题过滤区域。
   - 已完成：补充区域数据归一化、图层过滤、编号过滤、坐标转换和填充样式的单元测试。
   - 已完成：通过本地服务验证 `MapTower.json` 和 `cave_polys_detail.json` 可正常访问。
   - 后续可继续补充浏览器端交互测试、区域 hover 高亮、区域标签和更接近源站的配色透明度。

## 建议下一步

优先继续处理源站侧边栏对齐。现在 `43583` 个离线对象已经可搜索、可分类，地图 marker 已按视口裁剪，结果列表已经虚拟化，`Visible map areas` 也已接入真实区域数据，核心筛选规则和对象标准化规则已有第一批测试/校验覆盖。下一阶段的产品差距主要不是数据，而是侧边栏工作区和玩家工作流。

建议下一项：

1. 新增 Draw 面板的绘制开关、线颜色、重置默认颜色和绘制对象列表。
2. 增加 Data import/export，覆盖 search groups、drawn objects、checklists、完成状态和本地 UI 设置。
3. 再做 Tools 面板的 Go to coordinates、复制当前坐标和源数据入口。
4. 实现地图右键菜单，支持复制 `(x,z)` / `(x,y,z)`。
