# TotK Object Map React

这是一个用 React 复刻《塞尔达传说：王国之泪》对象地图的个人项目原型。目标是做成一个可离线运行的交互式地图工具，用于查看地图底图、对象点位、分类筛选、搜索和详情信息。

当前版本还不是完整复刻版，已经完成基础应用骨架和示例数据，后续重点是把地图瓦片和点位数据转成本地静态资源。

## 技术栈

- React 19：前端界面
- TypeScript：类型约束
- Vite：开发服务器和构建工具
- Leaflet：地图渲染核心
- React Leaflet：React 里的 Leaflet 组件封装
- Zustand：预留给后续全局状态管理
- Fuse.js：预留给后续本地模糊搜索
- Lucide React：界面图标
- ESLint：代码检查

## 当前功能

- 三层地图切换：`Sky`、`Surface`、`Depths`
- 地图瓦片加载：当前直接读取 zeldamods 的公开瓦片 URL
- 示例点位渲染：使用 `src/data/sampleObjects.ts`
- 左侧工具栏：搜索、图层切换、分类筛选、点位列表
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

## 静态数据规划

推荐把离线资源放在：

```text
public/data/
  map/
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

当前应用仍然使用远程瓦片和本地示例点位。等静态数据抓取完成后，需要把地图瓦片 URL 和对象加载逻辑切换到 `public/data`。

## TODO

- [x] 初始化 Git 仓库，建立基础提交记录
- [ ] 把 Leaflet 坐标系统校准到 TotK 原始地图尺寸
- [ ] 把远程瓦片切换为本地静态瓦片
- [ ] 完善 `fetch-tiles.mjs`，支持断点续传、跳过已存在文件、限速和多图层
- [ ] 完善 `fetch-map-unit.mjs`，支持批量枚举地图单元
- [ ] 设计对象数据标准格式，把 radar API 响应转换成前端稳定结构
- [ ] 从 `sampleObjects.ts` 切换到 `public/data/objects/index.json`
- [ ] 加入 Fuse.js 搜索，支持名称、Actor、标签和分类搜索
- [ ] 加入 Zustand 状态管理，统一维护图层、筛选、选中对象和收藏状态
- [ ] 加入 IndexedDB 或本地存储，保存已完成、收藏和自定义标记
- [ ] 加入点位聚合或 Canvas 渲染，优化大量点位性能
- [ ] 增加对象详情页字段：掉落物、宝箱内容、地图单元、原始参数
- [ ] 增加导入 / 导出 JSON 功能
- [ ] 增加移动端布局优化
- [ ] 增加 Playwright 基础交互测试

## 数据来源说明

本项目是个人学习和娱乐用途。当前原型参考了 zeldamods 的 TotK Object Map 公开站点和公开接口结构。若后续发布或分享，需要注意原项目许可证、数据来源授权、接口使用频率和资源再分发问题。
