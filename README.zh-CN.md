# 鱼类星球 · Fish Atlas

[English](README.md) · [简体中文](README.zh-CN.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [日本語](README.ja.md)

可旋转地球、鱼类图鉴、大规模物种目录与鱼缸规划。当前内容快照有 **287 种有照片的图鉴条目、3,410 条无图分类记录、520 个全球主要流域和 4 个精选水域入口**。其中 33 种有逐条核对的中文养护参考；其余 254 种为有图但资料不全的条目，不参与鱼缸规划。扩展的 111 种代表性常见观赏鱼清单中，101 种已入图鉴，仍有 10 种仅在分类目录；这不是全部常见观赏鱼。

## 启动

需要 Node.js 22.12+ 或兼容的新版本；本次使用 Node.js 24.4.1。

```bash
git clone https://github.com/korbinjoe/fish-atlas.git
cd fish-atlas
npm ci
npm run dev -- --port 4173
```

打开 <http://127.0.0.1:4173>。安装和构建不需要重新抓取资料；照片、底图、观测快照及鱼类数据均已本地化。

生产预览：

```bash
npm run build
npm run preview -- --port 4174
```

访问 [探索地球](http://127.0.0.1:4174/#/explore)、[鱼类图鉴（287 种有照片）](http://127.0.0.1:4174/#/atlas)、[物种目录（3,697 条分类记录）](http://127.0.0.1:4174/#/catalog)、[鱼缸规划](http://127.0.0.1:4174/#/planner)。图鉴只展示有照片的鱼种；无图记录只在目录中检索。预览进程停止后须重新启动。部署目录为 `dist/`，使用 hash 路由和相对资源路径，可放在静态主机子目录，无需 SPA 路由重写。当前未发布公网。

## 已实现

- 多语言：首次访问默认英文，可在页头切换 English、中文、Français、Deutsch、日本語，并记住选择。导航、筛选、地球标记、详情、对比和鱼缸规划同步更新；原有 33 种鱼的主要资料有四种译文，所有鱼仍可用中文、英文、已收录译名和学名搜索。学名、养护数值、来源及原文引文保持原意；非中文反馈使用英文 GitHub 表单。详见[多语言实现与验证](docs/i18n.md)。
- GitHub 与反馈：所有页面顶部提供醒目的“GitHub · Star”和“提 Issue”，手机采用 44px 高的紧凑按钮；关于页展示完整仓库地址和参与提示。每条照片图鉴的操作栏提供“补充或纠错”，页脚和关于页提供通用资料入口。资料入口按界面语言跳转到本仓库的中文或英文 GitHub Issue 表单，自动填写鱼名、学名及干净的图鉴链接，支持补充资料、修正错误和推荐新鱼。用户自行登录并提交，建议核对后更新；详见[参与完善资料](CONTRIBUTING.md)。
- 地球与鱼类详情联动：点击照片后地球平滑移到侧边，完整详情内联展开；使用左右方向键、上一种／下一种按钮或照片缩略栏，在当前筛选结果内连续浏览。地球转向并高亮当前鱼的原生水域，支持快速连按、照片大图内切换及关闭后的视角／焦点恢复；手机采用上方地球与下方详情，支持减少动态效果。默认地球占视区短边约 94%，布局通过等比变换移动同一 Canvas，镜头独立计时，连续切鱼复用照片与地理数据。详见[联动浏览记录](docs/globe-linked-reader.md)与[性能实测](docs/globe-animation-performance.md)。
- 地球拖拽、缩放、流域聚焦、重置与可选自转；默认显示 Natural Earth 10m 主要河网与湖泊，放大显示重要支流，流域轮廓仅在选中或查看归属时出现。海岸线与河流使用球面矢量绘制，缩放不依赖低分辨率纹理；287 种有照片的鱼都可在探索列表查看，其中 287 种均已关联到具名原生流域、海域、湖泊或小河流水系，成为地球照片标记。可按名称、定位状态、水体与具体水域筛选；手机端先展示地球与筛选。照片标记是有水域来源的**地理展示位置**，同水域照片围绕共同锚点紧凑排列，悬停或选中时显示归属名称、高亮水域并以短引导线连接位置；全量快照的稳定匹配让更多已核实水域得到代表标记；搜索、语言和种类筛选不改变代表水域，不表示真实采集点或物种完整自然分布。
- 全球流域层采用 GRDC 2020 的 **520 个主要河流／湖泊流域**：可点击陆地选流域，或在搜索面板按中文／英文名及大洲查找；默认显示主要河网，查看归属时显示对应流域边界，鱼类图鉴使用同一流域筛选。当前 287 种鱼已关联到 203 个水域（94 个 GRDC 流域、47 个海域、25 个湖泊／潟湖、37 个补充河流水系），原文与关系依据在详情可查；前轮剩余 14 种已按馆藏、分类修订和具名水系调查补齐；本轮新增美国／北美 37、中国 24、欧洲 43 种，并复核原生范围冲突。详见[区域定向补齐记录](docs/regional-fish-expansion.md)、[原生水域补齐记录](docs/native-distribution-expansion.md)、[全球流域口径](docs/global-basin-coverage.md)与[高清河网记录](docs/globe-vector-rivers.md)。
- 四个区域分别关联亚马孙 13 种、东南亚 23 种、东非湖区 10 种、印太礁区 31 种；区域标记不是精确观测点或完整分布边界。
- 名称／别名／学名搜索（支持中文输入法组词，停顿后自动搜索），区域、体型与水体筛选；详情、来源、图片署名、收藏和最多三鱼对比。详情以大幅完整照片开篇，资料位于下方；点击打开大图后，可用左右方向键或按钮在当前筛选结果内切换鱼种，地球同步联动。探索页大图在右侧展开，左侧地球持续可见且可操作；手机上地球与大图同时显示，关闭后恢复阅读位置。保留 100%–300% 缩放、拖动与手机滚动；`+`／`-` 缩放、`0` 重置、`Esc` 返回当前详情。详见[大图浏览记录](docs/fish-photo-gallery.md)。输入、下拉和复选框采用与深色主题适配的 shadcn/ui 组件。
- GBIF Backbone 分类目录：287 种有图鱼与 3,410 条无图记录，学名、科属、英文俗名及扩展常见鱼清单中文名搜索，按科筛选和分页；111 种清单鱼可按中文名检索，其中 101 种有图。基础记录不提供图片、养护参数或适养判断。
- 鱼缸规划：首次打开即显示普通热带淡水示例；也可一键切换偏软水、东非湖慈鲷或海水方案。完整方案会带入示例尺寸、暂估水量、水温、pH 与淡水 dGH／海水比重；尺寸和参数都可手动修改，示例数字不代表实测水质。附基础设备、开缸与参数来源提示，最多选择 6 种鱼。有明确群养下限的鱼按该下限加入，建议单养的鱼按 1 条加入；未记录数量下限的鱼暂按 1 条起步并标记“数量待核对”。加入后可直接修改数量，推荐数量不代表当前鱼缸可容纳。
- 逐项解释参数冲突、群体数量不足、单养、领地、咬鳍和捕食风险；本机保存与可恢复的分享链接。
- GBIF 分类接受名及 26 条精选历史观测；保留日期、精度、原生性状态、记录者、原始记录、数据集和许可。
- 手机布局、原生对话框与焦点恢复、WebGL 降级、存储受限提示、照片失败时的原创示意插画。

## 内容边界

资料核对不等于专家审定。规划只做现有规则下的初步核对，不输出“混养安全”或安全总载量；未知字段不会自动满足条件。23 个物种有结构化行为档案，其余仍需阅读详情；即使有规则，也未覆盖全部行为与组合。

大目录是**分类学探索层**，不是观赏鱼适养名录。人工复核队列以已收录鱼种的属、英文俗名和常见鱼优先清单作为排序线索，不表示候选已经过饲养或物种鉴定核验。图鉴与探索列表均收录 287 种有照片的鱼；其中 33 种有养护参考并可用于对比、规划。287 种均已有原生水域关系并出现在地球地图；这表示当前有照片条目的定位覆盖，不表示这些鱼的完整自然分布已全部记录。库利泥鳅采用已发表的形态鉴定调查记录，鉴定限制在详情保留。缺失的分布、习性和养护字段不猜测。详见 [扩展清单覆盖表](docs/common-aquarium-fish-coverage.md)、[第二轮补齐记录](docs/common-fish-expansion-2.md)、[首轮补齐记录](docs/common-fish-expansion.md)与[全量图鉴来源调研](docs/full-fish-atlas-sources.md)。

自然分布、观测记录与地理背景分开展示：区域点不是采集点；GRDC 流域边界不是物种分布边界；精选记录不是全部出现记录；原生性不明时不猜测。当前 26 条样本均为“原生性未知”。地图不是实时追踪，没有据观测点生成物种边界。部分物种沿用来源名称，同时展示 GBIF 接受名；分类库匹配不代替鉴定。

七彩神仙的水温、pH、硬度仍缺少已选来源中的明确值；公子小丑鱼与泗水玫瑰有最低容积参考，缸长未强行推算。海水 dKH 与淡水 dGH 不混用。温度、比重的来源范围不是长期目标值。

真实手机和专家签核尚待外部验证，具体见 [发布与复核记录](docs/release-checklist.md)。

补充美国、中国与欧洲的区域鱼类资料后，有图图鉴达 287 种；覆盖情况、真实照片和分布修正见 [区域补齐记录](docs/regional-fish-expansion.md)。

## 维护与验证

```bash
npm run validate
npm test
npx playwright install webkit
npm run test:e2e
npm run benchmark
npm run catalog:refresh # 仅在需要联网更新 GBIF 快照时执行
```

浏览器测试使用本机 Chrome 和 Playwright WebKit，生产预览端口为 4174。`benchmark` 为 Chrome 本机测试，模拟结果不能代表真实手机。

| 文件 | 用途 |
| --- | --- |
| `content/species.json` | 发布数据 |
| `content/photo-profiles.json` | 254 种有图条目与逐张照片署名 |
| `content/common-priority.json` | 111 种代表性常见鱼的中文名与经核对的学名别名 |
| `content/catalog.json` | GBIF 分类目录静态快照 |
| `content/catalog-manifest.json` | 分类目录来源、许可、筛选方法与数量 |
| `docs/catalog-review-queue.csv` | 342 条重点名单与 GBIF 来源链接 |
| `content/marine.json` | 海水条目 |
| `content/enrichment/overrides.json` | 带限定条件的参数补充 |
| `content/enrichment/behavior-rules.json` | 有来源的行为触发条件 |
| `content/enrichment/geography.json` | 分类及观测快照 |
| `content/enrichment/datasets.json` | 数据集引用 |
| `content/enrichment/waterways.json` | Natural Earth 10m 全球主要河网与湖泊中心线，1,726 段 |
| `content/enrichment/globe-land.json` | Natural Earth 50m 陆地填色与矢量海岸线 |
| `content/enrichment/globe-geography.json` | 河网与海陆来源、版本、SHA256、简化参数及体积 |
| `content/major-basins.json` | GRDC 2020 的 520 个简化流域边界、编号与面积 |
| `content/distributions.json` | 全部 287 种分布文字、学名匹配与原生水域关系／来源 |
| `content/waterbodies.json` | 独立海域、湖泊与补充河流水系的边界或来源锚点 |
| `src/lib/distribution.ts` | 地球与图鉴共用的原生水域索引 |
| `content/media-manifest.json` | 图片许可与署名 |
| `public/PHOTO_PROFILES_ATTRIBUTION.md` | 新增照片的完整署名索引 |

`scripts/build-content.py` 用本地研究缓存重建内容；基础中文摘要在该脚本的 `notes` 中维护。`scripts/prepare-v2-content.py` 生成补充条件、行为规则和海水条目，修改这些内容时应同步其编辑源，避免被重建覆盖。

可选采集脚本 `collect-sources.py`、`collect-media.py`、`enrich-geography.py`、`collect-dataset-citations.py` 不参与日常构建。来源缓存位于 `content/research/`，不进入发布包；不要把来源整页正文重新发布。采集遇到限流应停止并等待。

## 技术与授权

React 19、TypeScript、Vite、Three.js、React Three Fiber 9、Drei、Zod，版本锁定于 `package-lock.json`。照片来自 Wikimedia Commons，逐张许可独立适用；Natural Earth 为公共领域地理数据；全球流域边界来自 GRDC／HydroSHEDS，按来源要求署名；GBIF 样本只接受当前管线支持的 CC BY／CC0 许可。FishBase 26.06 分布数据遵循 CC BY-NC 3.0 非商业使用与署名要求。详见 [来源与署名](public/ATTRIBUTION.md)。原创示意鱼不能用于物种鉴定。

[技术方案](docs/technical-proposal.md) · [实施与验证记录](docs/implementation.md) · [外部复核清单](docs/release-checklist.md)
