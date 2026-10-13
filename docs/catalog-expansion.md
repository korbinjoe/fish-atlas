# 物种目录扩充与资料分级

2026-10-09 · 历史快照：原 v0.3.0 目录扩充记录；v0.4.0 新增有图条目见[照片扩充记录](photo-profile-expansion.md)。下文“当前”均指当时的 2026-10-09 快照；2026-10-12 最新数量见[常见鱼补齐记录](common-fish-expansion.md)。

本轮把小而完整的养鱼图鉴与大规模分类索引分开：现有 33 种鱼保留照片、中文介绍、来源和已核对的饲养资料；新增数千条记录只展示分类、来源及 GBIF 明确提供的环境标签。新目录可以搜索、按科筛选、分页和打开 GBIF 原始记录；它不会自动把未核对鱼种放到地球的具体区域或鱼缸规划中。

主导航的“鱼类图鉴”（`#/atlas`）只展示有可核对照片的鱼种，不再划分精选与普通图鉴。v0.4.0 已增至 103 种；“物种目录”（`#/catalog`）仍保留全部 3,533 条分类记录，其中 3,430 条无图记录只在目录中检索，不计入图鉴。

## 完整图鉴进度

当前有 **103 种有照片的图鉴条目**，其中 33 种有较完整的中文养护参考，70 种只有照片与部分公开资料。另外 3,430 条记录尚无可核对图片：GBIF 批量导入的是分类字段，不提供可直接用于鱼缸规划的养护参数。照片是进入图鉴的展示门槛，并不代表养护内容已经由专家审定。

继续补齐时，可先用 [Wikidata 的 CC0 结构化数据](https://www.wikidata.org/wiki/Wikidata:Licensing)寻找名称和候选关联，再按 [Wikimedia Commons 的复用要求](https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia/en)逐张检查图片作者、许可和物种对应。分布和养护参数必须另找可信且允许复用的来源，记录逐字段出处与适用条件；资料及图片核对完成后才升级为完整图鉴。300 条重点名单是编辑顺序，不代表已取得 300 份完整档案。

当前静态快照为 **3,533 条物种记录**（103 种有照片的图鉴条目、3,430 条无图记录）。下列截图摄于 v0.3.0，数量与当前版本不同：[桌面图鉴](desktop-atlas.png) · [手机图鉴](mobile-atlas.png) · [桌面目录](desktop-catalog.png) · [手机目录](mobile-catalog.png)。

## 数据来源与选择

- 来源：[GBIF Backbone Taxonomy](https://www.gbif.org/dataset/d7dddbf4-2cf0-4f39-9b2a-bb099caae36c)，许可 [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)，通过 [GBIF Species API](https://www.gbif.org/developer/species) 获取。每条记录保留 GBIF taxon key，界面链接回原始条目；快照日期、计数及家族分布见 [`catalog-manifest.json`](../content/catalog-manifest.json)。
- [GBIF 技术文档](https://techdocs.gbif.org/en/data-processing/taxonomy-interpretation)指出旧 Backbone 已停止更新，ID 仍保留供兼容。本轮沿用现有图鉴的 GBIF 键，后续持续更新应迁移到 Catalogue of Life eXtended Release，并建立旧键映射；“抓取日期”不等于底库分类更新日期。
- 导入 20 个与水族观察相关的鱼科，只接收 GBIF 数据集中的 `ACCEPTED`、`SPECIES`、动物界脊索动物门和规范双名；每科最多 240 条，轮流选取直到达到目标。这个范围刻意是**鱼类分类目录**，包含野生鱼，不宣称它们都是适合水族箱的观赏鱼。
- 旧 GBIF Backbone 的这些记录没有可统一使用的现生状态标记，目录尚未逐种排除化石种或核对是否现生；不能把这份列表当作现生或可家养清单。
- 同 GBIF 键或学名已在图鉴中的条目合并，避免结果重复。v0.4.0 新增有图条目的中文标签来自 Wikidata；无图基础记录不自动翻译中文名，也不根据科推断海水／淡水、地理分布或饲养条件。
- GBIF 返回的英文俗名与环境标签如有提供才显示；缺失即保持空白。没有引入第三方图片、自动生成鱼形或引用受限的养护档案。

## 资料层级

| 层级 | 界面内容 | 可用于鱼缸规划 |
| --- | --- | --- |
| 有养护参考的图鉴 | 原有 33 种中文图鉴、照片、已核对资料及来源 | 是，仍需人工判断 |
| 有照片的资料条目 | 新增 70 种的分类、图片、来源及部分野外资料；缺失字段留空 | 否 |
| 重点名单候选 | 基础分类记录加审阅标记 | 否 |
| 基础记录 | 学名、科属、GBIF 键与可用环境标签 | 否 |

重点名单共 300 条：原有 33 种完整图鉴，加 267 条优先复核候选；其中 70 条已补上照片，但尚无养护参考。候选优先选择与已收录鱼种同属、具有英文俗名的记录，并对属设上限、在各科之间轮流选取，避免队列被同一属占满；这是**编辑工作队列**，不是适养、流行度、资料质量或物种鉴定的结论。下一步继续核对自然分布、中文通用名、养护来源与图片鉴定，再由专家审阅。没有足够证据的字段继续为空。

[300 条可导出的重点名单](catalog-review-queue.csv)保留阶段、学名、科、GBIF 键和来源链接，便于逐条分配编辑工作。

## 更新与检查

```bash
npm run catalog:refresh
npm run validate
npm run build
npm test
npm run test:e2e
```

`scripts/import-catalog.py` 联网请求 GBIF 并重写 `content/catalog.json` 与 `content/catalog-manifest.json`；正常构建只使用仓库内快照，不依赖运行时 API。`scripts/validate-catalog.ts` 检查数量、许可、唯一键、已核对鱼种映射和工作队列。GBIF 分类会变化，刷新时应查看差异并重新测试；分类名称、英文俗名或环境标签不代替物种专家审定。

继续扩大目录时，可在导入脚本中增加 `FAMILIES`、`PER_FAMILY` 与 `TARGET_BASE`；目录页按需加载整份静态快照，但每页只渲染 48 张卡片。导入脚本会检查目标条数并在不足时保留旧快照。扩成完整图鉴则需要逐种补齐证据，不能只提高导入上限。

本轮验证：`npm run build`、12 项单元测试、36 项浏览器测试均通过；浏览器流程在 Chrome 和 WebKit 各执行一次。手机 390 px 视口的图鉴与目录均没有横向溢出。

没有批量导入 FishBase 或 Seriously Fish 的养护资料。[FishBase 可下载快照](https://source.coop/cboettig/fishbase/README.md)标注 CC BY-NC；[Seriously Fish 复用政策](https://www.seriouslyfish.com/reuse-policy)对批量复用档案有单独要求。现有 33 种资料继续保留原有逐条来源。
