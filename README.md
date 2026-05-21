# TotK Object Map React

这是一个用 React 复刻《塞尔达传说：王国之泪》对象地图的个人项目原型。目标是做成一个可离线运行的交互式地图工具，用于查看地图底图、对象点位、分类筛选、搜索和详情信息。

当前版本还不是完整复刻版，已经完成本地 / 远程瓦片切换、本地对象索引、分类筛选、Fuse.js 搜索和原站部分图标复刻。离线瓦片体积较大，不提交到 Git，需要在本地按下面步骤抓取。

## 技术栈

- React 19：前端界面
- TypeScript：类型约束
- Vite：开发服务器和构建工具
- Leaflet：地图渲染核心
- React Leaflet：React 里的 Leaflet 组件封装
- Zustand：预留给后续全局状态管理
- Fuse.js：本地模糊搜索
- Lucide React：界面图标
- ESLint：代码检查

## 当前功能

- 三层地图切换：`Sky`、`Surface`、`Depths`
- 地图瓦片加载：支持本地静态瓦片和 zeldamods 远程瓦片切换
- TotK 坐标校准：地图使用原始 `x=-6000..6000`、`z=-5000..5000` 边界和 `24000 x 20000` 原图尺寸
- 对象点位渲染：支持本地对象索引和远程 radar API
- 左侧工具栏：搜索、图层切换、分类筛选、点位列表
- Filter 侧边栏：按原站风格展示两列分类按钮，并支持多选分类标签
- 右侧详情栏：展示选中对象的 Actor、图层、坐标、标签和备注
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

## 静态数据规划

推荐把离线资源放在：

```text
public/data/
  map/                         # 本地生成，不提交 Git
    Ground/maptex/{z}/{x}/{y}.webp
    Sky/maptex/{z}/{x}/{y}.webp
    Depths/maptex/{z}/{x}/{y}.webp
  objects/
    MainField/A-1.json
    MainField/A-2.json
    index.json
  details/
    {objectId}.json
```

当前应用支持从 `public/data/map` 读取本地瓦片，也可以在界面中切回远程瓦片。对象点位支持从 `public/data/objects/index.json` 读取本地 JSON，也可以在界面中切换到 radar API 搜索模式。

本地对象点位入口：

```text
public/data/objects/index.json
```

远程对象模式使用 radar API 搜索。切到 `Remote API` 后，需要在搜索框输入至少 2 个字符才会发起查询；瓦片来源和对象数据来源互相独立。

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
- [ ] 加入 IndexedDB 或本地存储，保存已完成、收藏和自定义标记
- [ ] 加入点位聚合或 Canvas 渲染，优化大量点位性能
- [ ] 增加对象详情页字段：掉落物、宝箱内容、地图单元、原始参数
- [ ] 增加导入 / 导出 JSON 功能
- [ ] 增加移动端布局优化
- [ ] 增加 Playwright 基础交互测试

## 数据来源说明

本项目是个人学习和娱乐用途。当前原型参考了 zeldamods 的 TotK Object Map 公开站点和公开接口结构。若后续发布或分享，需要注意原项目许可证、数据来源授权、接口使用频率和资源再分发问题。
