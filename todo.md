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

## 当前数据状态

- 瓦片：`29847/29850` 个本地 `.webp` 文件。
- 瓦片缺口：3 个已知 z0 文件，远端返回 404。
- raw 对象记录：`51573`。
- 转换后的本地对象：`44796`。
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
  - `korok`
  - `shop`
  - `lightroot`
  - `shrine`
  - `chest`
  - `weapon`
  - `enemy`

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
   - 已完成：分类筛选从单选改成多选，空选择表示显示全部分类。
   - 后续如果增加收藏、完成状态和自定义标记，也应继续放入状态层或持久化层，而不是直接塞回 `App.tsx`。

0.1 Filter 侧边栏交互
   - 已完成：侧边栏改成接近原站的左侧图标栏 + 两列分类按钮布局。
   - 已完成：分类按钮使用原站图标资源优先显示，缺失时回退到通用图标。
   - 已完成：`Locations` 与其他分类多选时，仍只显示大区域文字标签，避免普通地点淹没地图。
   - 后续需要把 `Visible map areas` 接入真实区域图层数据；当前只是界面占位。

1. 对象渲染性能
   - 当前 UI 只渲染前 `1000` 个可见对象，这是临时保护，避免页面卡死。
   - 后续应替换为 Canvas 渲染、点位聚合，或基于当前视口动态渲染。

2. 本地搜索
   - 已完成：本地对象数据已接入 Fuse.js 搜索。
   - 当前搜索字段包括 `name`、`actor`、`tags`、`category`、`layer`。
   - 后续可继续调优排序，并把 `region`、`mapName` 作为显式字段加入索引。

3. 分类扩展
   - 已完成：分类已扩展为 `location`、`place`、`cave`、`korok`、`shop`、`lightroot`、`shrine`、`chest`、`weapon`、`enemy`。
   - 后续需要继续检查 cave 类结果是否过重，决定 cave 应该作为主分类、标签，还是两者都保留。

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
   - 增加结果分页或虚拟列表。
   - 更清晰地区分“总结果数”和“当前渲染数”。
   - 增加快速清空搜索。
   - 增加更丰富的分类和图层统计。

8. 图标映射完善
   - 已完成：神庙、洞中神庙、呀哈哈、洞穴、商店、龙之泪、驿站、光根等静态标记会使用原站点图标。
   - 当前普通搜索对象仍保留圆点，因为原站点对普通 radar 搜索对象也主要使用颜色/分组显示。
   - 后续可继续补充宝箱、敌人、武器等自定义通用图标，但这不属于原站点静态标记图标体系。

## 建议下一步

优先处理对象渲染性能和列表虚拟化。现在 `44796` 个离线对象已经可搜索、可分类，但地图和列表仍然只渲染前 `1000` 个对象，后续需要把这一层做成真正适合大数据量浏览的实现。
