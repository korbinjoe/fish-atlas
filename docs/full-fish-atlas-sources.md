# 全量鱼类图鉴来源调研

2026-10-09。目标是为当前鱼类星球的 3,533 条分类目录记录补齐照片、名称、分类、野外习性、地理分布与（有证据时）水族养护信息。这里的“全量”指尽可能覆盖目标目录，并保留每个字段的出处；它不等于保证每个鱼种都有全部资料。现有应用仍遵守“无照片不进入图鉴”，v0.4.0 已有 103 种有照片的条目、3,430 条无图分类记录。首批实际入库经过见[照片扩充记录](photo-profile-expansion.md)。

## 结论

**没有发现一个能直接取得全部鱼种、逐种有可复用照片及完整习性／分布／养护资料的单一数据源。** 最接近广覆盖鱼类百科的是 FishBase；照片、自然分布和水族养护仍须跨来源核对。尤其不能把“网站有照片”当成“照片可复制”，或把野外温度、出现地点当作鱼缸饲养建议。

## 来源与用途

| 来源 | 可提供的字段 | 覆盖与取得方式 | 用于本项目的边界 |
| --- | --- | --- | --- |
| [FishBase](https://www.fishbase.org/search.php)／[API](https://fishbaseapi.readme.io/reference/species) | 学名、俗名、分类、生态、食性、体长、分布、繁殖等；另有照片 | 官网目前列约 36,700 种鱼与 66,300 张图片；API 有 [species](https://fishbaseapi.readme.io/reference/species)、[ecology](https://fishbaseapi.readme.io/reference/ecology)、[comnames](https://fishbaseapi.readme.io/reference/comnames) 等接口 | 内容标为 **CC BY-NC 4.0**；照片另有各自拍摄者权利。可作为核查线索，若产品可能商业化，不能直接批量搬运资料或照片；应先取得适用授权。见 [官网版权说明](https://www.fishbase.org/search.php)。 |
| [Seriously Fish](https://www.seriouslyfish.com/) | 淡水观赏鱼的名称、自然分布、栖地、养护、习性和参考文献 | 首页当前显示 1,822 份物种档案和 7,863 张照片；部分档案仍缺参数、来源或图片 | 适合逐种阅读和核查，不适合作批量导入源。[复用政策](https://www.seriouslyfish.com/reuse-policy)要求大量复制或商业使用取得许可，站内照片不得直接复用。 |
| [GBIF Species API](https://techdocs.gbif.org/en/openapi/v1/species)／[Occurrence API](https://techdocs.gbif.org/en/openapi/) | 接受名、同物异名、俗名、分类、部分 profile／distribution／media，带时间与地点的观测记录 | 已是当前目录的分类来源；可按 GBIF key 对接 | 观测点只说明有记录，不能直接当成原生分布范围；[多媒体许可可与记录许可不同](https://techdocs.gbif.org/en/data-publishing/multimedia-publishing)，要逐图核查作者、许可和源记录。 |
| [iNaturalist](https://www.inaturalist.org/pages/developers) | 物种照片、观测记录、分类名与俗名；[开放范围模型](https://www.inaturalist.org/pages/range_maps) | 提供 API、开放数据与鱼类范围数据集；API 推荐不超过 60 次／分钟，明确不建议拿 API 作大规模抓取 | 照片与观测有独立许可，默认常为 CC BY-NC；应从开放数据或有限 API 查询中筛出适用许可，并人工复核物种识别。模型范围须标成“预测分布”，不是确证原生范围。 |
| [Wikidata](https://www.wikidata.org/wiki/Wikidata:Licensing)＋[Wikimedia Commons](https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia/en) | 学名／别名／跨库 ID、图片候选与图片元数据 | Wikidata 结构化数据 CC0；Commons 逐文件有作者与许可 | 适合查找可复用照片和跨库对应，但图片是否确为该物种须复核，且每张按文件页单独署名。批量查询曾遇 Wikidata 查询服务限流；不要高频重试。 |
| [Encyclopedia of Life](https://api.eol.org/docs/what-is-eol/data-services) | 汇集分类、媒体、文本、生态互动及性状 | 有经典 API、结构化数据 API 与批量开放数据；结构化数据服务需要密钥 | 聚合数据不是统一许可或统一质量；[每个对象需检查来源与复用条件](https://eol.org/docs/what-is-eol/copyright-and-linking-policy)。适合作补充和交叉核查。 |
| [Catalogue of Life](https://www.catalogueoflife.org/data/download) | 接受名、同物异名、科属分类及版本化清单 | 可下载 Base／Extended Release | 用于名称归一和旧 GBIF Backbone 迁移；不是照片、行为或养护源。 |
| [WoRMS](https://www.marinespecies.org/rest/)＋[OBIS](https://api.obis.org/) | 海洋物种接受名、部分分布／属性；海洋出现记录 | 均有公开查询接口 | 只用于海水鱼相关分类与观测。OBIS [要求按数据集许可与来源署名](https://portal.obis.org/data/datapolicy/)；出现记录同样不能直接画成物种自然边界。 |

## 维基百科与 GitHub 能补到什么

- **维基百科**：[Page Content Service](https://www.mediawiki.org/wiki/Page_Content_Service)可返回词条标题、导语和缩略图；[PageImages API](https://www.mediawiki.org/wiki/API:Pageimages)可查页面主图。但物种不一定有独立词条，导语不是标准化的习性／分布字段，主图也未必能直接证明图中鱼的物种身份。复用文字须遵守页面的许可与署名要求；图片应回到 Commons 或原始文件页确认，不能把词条缩略图的 URL 当作授权。
- **Wikidata＋Commons**：Wikidata 适合作跨库学名和 ID 匹配，Commons 的 [Imageinfo API](https://www.mediawiki.org/wiki/API:Imageinfo)／[CommonsMetadata](https://www.mediawiki.org/wiki/Extension:CommonsMetadata/en)可取图片文件的作者、许可、描述等元数据。先核对确切学名，再取照片并保存文件页、作者与许可；人工检查物种识别。
- **GitHub 官方开放数据**：[iNaturalist Open Data](https://github.com/inaturalist/inaturalist-open-data)说明了观测、照片、物种与摄影者元数据如何关联。适合大量候选照片匹配，但逐张图片仍受摄影者所选许可约束，不能只依据仓库是否公开下载。
- **GitHub 鱼类数据／工具**：[rfishbase](https://github.com/ropensci/rfishbase)是访问 FishBase 表的 R 工具，代码开源不代表 FishBase 内容或照片变更许可；[Fish-Vista](https://github.com/Imageomics/Fish-Vista)是约 6 万张、1,900 种鱼的博物馆图片与视觉性状研究集，仓库主要放代码，图片及来源许可须依其数据集元数据核对；[GloBI 的 FishBase 导出](https://github.com/globalbioticinteractions/fishbase)标为 CC BY-NC 且引用 2016 版，不适合当成当前全量、无许可顾虑的图鉴数据。

因此可以从这些渠道**拼出更多有图的物种档案**，但不能从“有词条／仓库有图片”推断现有 3,500 条无图记录均可直接升级。先对目录做学名匹配与图片许可审计，才知道真实覆盖率；习性与地理分布仍需来源分字段补齐。

一个具体例子是目录中的 *Acanthurus achilles*：[英文维基百科词条](https://en.wikipedia.org/wiki/Acanthurus_achilles)有分类、分布／栖地与生物学段落；[Commons 物种分类](https://commons.wikimedia.org/wiki/Category:Acanthurus_achilles)在本次查看时列出 41 个媒体文件，其中[这张照片](https://commons.wikimedia.org/wiki/File:Acanthurus_achilles_501753140.jpg)的文件页标为 CC BY 4.0 并列出原摄影者。这个案例可作为采集样本，但图片与各项描述仍要分别核对，不能把该物种的覆盖程度外推到全部目录。

## 字段归并方式

每条记录以**接受学名＋稳定跨库 ID**关联，先处理同物异名，再写中文／英文俗名。保留原始名称、来源版本和匹配方式，避免只凭模糊文本把近缘鱼合并。字段建议如下：

| 图鉴字段 | 首选依据 | 展示方式 |
| --- | --- | --- |
| 名称、科属、学名、异名 | COL／GBIF；海鱼复核 WoRMS；俗名来自可追溯的 iNaturalist／FishBase 条目 | 中文俗名缺少可信依据时只显示学名，不机翻或猜名 |
| 物种照片 | Commons 文件页；iNaturalist／GBIF 中许可适用且身份可信的原始照片 | 存作者、许可、许可 URL、原始页面、来源记录 ID、下载时间和鉴定状态；无合格照片不入图鉴 |
| 野外习性 | FishBase 生态表、EOL 性状及可核对的原始文献 | 食性、活动层、栖地、繁殖分字段记录；无来源即显示“资料待补充” |
| 地理分布 | FishBase／WoRMS 明确的原生分布；iNaturalist 模型、GBIF／OBIS 观测作独立证据层 | 明示“原生／引入／观测点／模型预测”，不合成未经证实的物种边界 |
| 鱼缸养护 | 有授权、可逐字段引用的养护资料或人工编辑与复核 | 单独于野外生态存储；没有尺寸、水质、行为依据时不进入鱼缸规划 |

“习性”与“养护”必须分开：野外食物、野外水温和出现地点不能直接转换为投喂量、恒定缸温或混养安全结论。来源互相冲突时保留冲突与适用条件，不选择看起来最方便的数字。

## 在当前 3,533 条目录上的执行顺序

1. **确定鱼种**：将当前 GBIF key 与 COL／FishBase／WoRMS／iNaturalist ID 逐种对齐；标出异名、化石／未确认条目与水族常见种。现有 300 条重点名单只决定先审顺序，不是自动通过名单。
2. **先找可复用图片**：在 Commons 和 iNaturalist 开放数据中查候选，按照片自身许可与署名筛选，检查照片分辨率、物种识别和重复上传。记录覆盖率、拒绝原因和待人工复核清单；不要仅抓网页缩略图。
3. **补生态与分布**：按字段拉取数据、保留原值和出处。GBIF／OBIS 的点、iNaturalist 的预测范围以及文献声明的自然分布分别存储。
4. **入图鉴与养护分流**：有合格照片且分类身份明确的记录可进入单一“鱼类图鉴”；欠缺习性或分布时明确留空。只有另经养护资料核对的物种才可参加鱼缸规划。
5. **批量前小样本验收**：先在淡水与海水鱼、常见与冷门鱼、异名与无图鱼之间抽样，核查照片许可、名称匹配、字段覆盖率和错误率，再选择开放数据快照进行批处理。不要对服务接口发起数千次密集请求。

2026-10-09 的单条接口试查：`Acanthurus achilles` 在 [GBIF](https://www.gbif.org/species/5209178) 与 [WoRMS](https://www.marinespecies.org/aphia.php?p=taxdetails&id=272957) 可对应接受种名；iNaturalist 返回物种级结果，但其默认照片许可为 **CC BY-NC**，不能据此直接放入面向未来商业化的图片库。这只验证跨源连接与许可检查的必要性，**不是**对 3,500 条记录的图片或资料覆盖率估计。

本机直连 FishBase API 时证书验证失败，因此这次仅核对其公开接口文档与官网信息，没有绕过证书检查或导入 FishBase 数据。后续接入前须先解决安全连接并确认用途所需的数据许可。
