# 常见观赏鱼优先补齐记录

此文是首轮 60 种清单的历史快照；[当前扩展清单与逐种状态](common-aquarium-fish-coverage.md)已扩大到 111 种，[第二轮补齐记录](common-fish-expansion-2.md)记录后续新增内容。

2026-10-12。本次以 [60 种代表性清单](common-aquarium-fish-coverage.md)为优先级，范围为淡水 40 种、海水 20 种；清单不是市场销量排名，也不代表所有人工品系。

## 本次结果

| 层级 | 补齐前 | 补齐后 |
| --- | ---: | ---: |
| 有养护资料、可参与规划 | 16 / 60 | 16 / 60 |
| 仅照片图鉴 | 1 / 60 | 44 / 60 |
| 仅分类目录 | 9 / 60 | 0 / 60 |
| 完全缺失 | 34 / 60 | 0 / 60 |

产品总量现为 **146 种有照片的图鉴**（33 种养护图鉴、113 种照片图鉴）与 **3,567 条分类目录**。本轮新增 34 条经 GBIF 学名核对的分类记录、43 张逐张核对来源和许可的照片。代表性清单的 60 种现均有图，其中 16 种已有养护参考并可进入规划，44 种是照片图鉴。新照片条目未填写未经核对的饲养参数，因此不进入鱼缸规划。

## 核对方法与出处

1. 以清单学名逐一查询 [GBIF Species Match API](https://www.gbif.org/developer/species)，只接受精确、高置信度、接受名且与物种详情一致的脊索动物种级记录。异名 *Otocinclus affinis* 以 GBIF 接受名 [*Macrotocinclus affinis*](https://www.gbif.org/taxon/6TDZS)计入目录；[FishBase](https://www.fishbase.se/summary/Centropyge-loriculus.html)及 GBIF 接受名核对后，将火焰神仙的清单名改为 *Centropyge loriculus*。
2. 查询 [Wikipedia](https://en.wikipedia.org/) 对应页面与 [Wikidata](https://www.wikidata.org/wiki/Wikidata:Main_Page) 的 P225 物种学名声明，再从 [Wikimedia Commons](https://commons.wikimedia.org/) 抓取照片候选。只接受 CC BY、CC BY-SA、CC0 且有作者、文件页、许可地址、足够尺寸的位图。首批 33 张和后续 10 张替代照片分别在[首批候选接触表](../content/research/common-photo-review/contact-sheet.jpg)、[常见鱼替代图](../content/research/common-photo-review/alternative-contact-sheet.jpg)、[异名鱼替代图](../content/research/common-photo-review/synonym-contact-sheet.jpg)与[最后两种替代图](../content/research/common-photo-review/remaining-contact-sheet.jpg)中检查画面。首批暹罗食藻鱼图片仅鉴定到近似种群，因此改用文件页明确标注物种的替代图；真小丑鱼图片的完整说明明确指出与公子小丑鱼的差异。异名图片另用 GBIF 接受名关系核对，未把它们当成第二个物种。
3. 图片保存在 `public/media/wikimedia/`，每条图鉴链接原始 Commons 文件页，完整作者和许可见[照片署名索引](../public/PHOTO_PROFILES_ATTRIBUTION.md)。英文导言来自对应 Wikipedia 页面；能清楚定位的自然分布、习性段落才写入对应字段。新添 43 条都有导言，6 条有分布段落，7 条有行为或生态段落；空白保持空白。中文名来自编辑清单，在目录中可搜索；经核对的旧学名也可搜索。

## 资料仍待补充

此次解决的是**常见种的物种身份、中文名与照片覆盖**，不是完整饲养档案。新增 43 种仍缺逐项核对的缸体、水温、水质、混养与群游数据，不能进入鱼缸规划；多数也尚无明确的分布、行为段落。Commons 和 Wikipedia 批量检索一度遇到 HTTP 429，后续仅对少量指定文件页逐一核对作者与许可，没有批量重试。代表性清单以外的市场常见种和不同人工品系仍需单独审查。

完整逐种状态见[常见鱼覆盖表](common-aquarium-fish-coverage.md)；本次原始核对缓存见 `content/research/common-gbif-matches.json`、`content/research/common-photo-candidates.json`。原有 70 种照片图鉴的导入记录见[照片扩充记录](photo-profile-expansion.md)。
