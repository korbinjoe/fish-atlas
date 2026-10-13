# 全球主要流域覆盖与鱼种关联

2026-10-12。探索地球与鱼类图鉴共用一套 **520 个主要河流／湖泊流域** 的本地快照。来源为德国全球径流数据中心（GRDC）的 [Major River Basins of the World，2020 年第二修订版](https://mrb.grdc.bafg.de/)，基于 [HydroSHEDS／HydroBASINS](https://www.hydrosheds.org/products/hydrobasins)。GRDC 将“主要”定义为面积较大，或具有水文政治重要性／研究价值；这 **不是全球全部集水区**，也不包含所有独立湖泊水体。数据覆盖六大洲，不代表每个流域都已有图鉴鱼种。

应用保留了 GRDC 的 `MRBID`、英文原名、大洲及估算汇水面积。常见流域增加了中文显示名；其他条目保留英文名，仍可通过英文名、编号和大洲搜索。边界从官方 GeoJSON 中提取，使用 Shapely 将坐标简化至适合地球浏览的分辨率，并转换为 d3-geo 所需的外环方向。`content/major-basins.json` 约 380 KB，离线运行；地球上的边界是概览图，不适合精确 GIS 测量。可使用 `python3 scripts/build-major-basins.py /path/to/GRDC_Major_River_Basins_json.zip` 从官方完整 GeoJSON ZIP 重建。

2026-10-13 已扩充为 **183 种可定位鱼、133 个关联水域**，包含 43 个 GRDC 流域、42 个海域、11 个湖泊／潟湖与 37 个补充河流水系。全部 183 种都有 FishBase 分布段落；前轮剩余 14 种已补齐具名水系关系，详见[最后 14 种复核](remaining-distributions-completed.md)。[逐种关系与来源口径](native-distribution-expansion.md)记录逐种定位关系与资料限制。

湖泊独立定位，不泛化到出水河流。海水鱼关联海域。地球总览每种鱼展示一个有依据的代表水域，选择具体水域后展示全部关联鱼；流域、湖泊、海域和水域锚点共用图鉴筛选。展示位通过对应多边形检查，海域位额外排除陆地；无边界的小水域使用来源坐标，不虚构范围。照片展示位不代表其拍摄地；小水系锚点可以来自馆藏／调查坐标，均不表示物种完整分布边界。

选择尚无已核实鱼种的流域时，地球仍能高亮其官方边界；图鉴和地球列表显示“鱼种待补”。这只说明本站尚未收录有明确关联证据的照片图鉴，**不代表该流域没有鱼**。后续扩大鱼种覆盖时，应先核对接受学名、可复用且可辨认的照片、自然分布原文及许可，再更新关联表；不能从 GBIF 观测点、国别或同属物种自动推定原生流域。

署名：GRDC (2020): *GRDC Major River Basins*. Global Runoff Data Centre. 2nd, rev. ed. Koblenz: Federal Institute of Hydrology (BfG). 数据包含 © World Wildlife Fund, Inc. (2006–2013) 的 HydroSHEDS 数据，并按 GRDC 的公开使用要求保留来源说明。详见[项目来源与署名](../public/ATTRIBUTION.md)。

## 河网优先底图（2026-10-13）

地球总览默认展示全球主要河流，不再绘制全部流域轮廓；流域筛选、点击陆地选区以及归属高亮保留。河网与海岸线改为球面矢量，数据扩充和缩放验证见 [高清河网记录](globe-vector-rivers.md)。
