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
- 已把原站点 `Place` 静态标记从 `Locations` 中拆出为独立 `Places` 分类，并继续使用原站点地点图片图标。
- 已接入源站 `static.json` 的全部主 Filter 静态 marker 分组。
- 已对齐远程模式行为：页面加载一次静态 marker，分类点击只做前端筛选。
- 已拆分 `App.tsx`，抽出配置、hooks、工具函数和主要页面组件。
- 已给结果列表接入虚拟滚动，侧边栏不再一次性渲染全部结果 DOM。
- 已把 `Visible map areas` 接入真实区域图层数据，支持区域填充和编号过滤。

## 当前数据状态

- 瓦片：`29847/29850` 个本地 `.webp` 文件。
- 瓦片缺口：3 个已知 z0 文件，远端返回 404。
- raw 对象记录：`51573`。
- 转换后的本地对象：`43578`。
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
npm run lint
npm run build
```

## 优化待办

0. UI 状态管理
   - 已完成：新增 Zustand store，统一维护图层、瓦片来源、对象数据来源、分类、搜索词和选中对象。
   - 已完成：分类筛选从单选改成多选，空选择表示不显示任何点位。
   - 后续如果增加收藏、完成状态和自定义标记，也应继续放入状态层或持久化层，而不是直接塞回 `App.tsx`。

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
   - 已完成：`TotkMap.tsx` 负责 Leaflet 地图、瓦片、marker 和视口同步。
   - 已完成：`ObjectDetails.tsx` 负责右侧对象详情。
   - 已完成：`mapConfig.ts` 负责瓦片、分类、图标和侧栏固定配置。
   - 已完成：`useObjectData.ts` 负责对象数据加载。
   - 已完成：`useVisibleObjects.ts` 负责搜索、分类、图层、视口和渲染上限。
   - 已完成：`locationLabels.ts` 和 `objectFilters.ts` 负责源站地名标签和筛选纯函数。
   - 后续如继续拆分，可把 `TotkMap.tsx` 内的 `ObjectMarker` 和 `MapViewportSync` 拆成独立组件。

1. 对象渲染性能
   - 已完成：地图 marker 按当前视口裁剪，并限制最多渲染 `3000` 个。
   - 已完成：结果列表使用虚拟滚动，不再用 `1000` 条硬截断作为性能保护。
   - 后续可继续评估 Canvas 渲染或点位聚合，进一步优化地图 marker 密集场景。

2. 本地搜索
   - 已完成：本地对象数据已接入 Fuse.js 搜索。
   - 当前搜索字段包括 `name`、`actor`、`tags`、`category`、`layer`。
   - 后续可继续调优排序，并把 `region`、`mapName` 作为显式字段加入索引。

3. 分类扩展
   - 已完成：分类已扩展为 `location`、`place`、`cave`、`chasm`、`dragonTear`、`dispenser`、`korok`、`shop`、`lightroot`、`techLab`、`tower`、`shrine`、`chest`、`weapon`、`enemy`。
   - 已完成：无搜索词时主 Filter 分类只展示源站 static marker，避免 raw cave / korok 数据过重。
   - 后续需要继续补充宝箱、敌人、武器等非源站静态点位的更细分类和图标策略。

4. 共享对象标准化逻辑
   - `src/services/objectData.ts` 和 `scripts/build-object-index.mjs` 目前都有 radar 对象标准化逻辑。
   - 后续应抽出共享转换规则，避免前端远程模式和离线转换脚本的分类规则漂移。

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

8. 图标映射完善
   - 已完成：神庙、洞中神庙、呀哈哈、洞穴、商店、龙之泪、驿站、光根等静态标记会使用原站点图标。
   - 当前普通搜索对象仍保留圆点，因为原站点对普通 radar 搜索对象也主要使用颜色/分组显示。
   - 后续可继续补充宝箱、敌人、武器等自定义通用图标，但这不属于原站点静态标记图标体系。

9. 地图区域覆盖层
   - 已完成：`public/data/map-areas` 保存源站 Visible map areas 数据。
   - 已完成：`useMapAreas` 统一处理 FeatureCollection、Feature 数组和 MapTower 分组对象三类格式。
   - 已完成：地图上可绘制 Polygon / MultiPolygon 区域，支持填充开关。
   - 已完成：支持按编号、`Area`、`order`、`towerNum` 或标题过滤区域。
   - 后续可继续补充区域 hover 高亮、区域标签和更接近源站的配色透明度。

## 建议下一步

优先补测试和继续处理交互细节。现在 `43578` 个离线对象已经可搜索、可分类，地图 marker 已按视口裁剪，结果列表已经虚拟化，`Visible map areas` 也已接入真实区域数据。核心筛选规则仍然需要测试覆盖。

建议下一项：

1. 为 `objectMatchesLayer`、`shouldShowLocationLabel`、静态分类过滤补测试。
2. 给区域覆盖层补充基础交互测试和视觉验证。
3. 继续拆分 `TotkMap.tsx` 内部的 `ObjectMarker`、`MapViewportSync`，降低单文件复杂度。
