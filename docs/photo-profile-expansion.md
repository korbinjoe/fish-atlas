# 有图鱼种扩充记录

2026-10-09 · v0.4.0

本次从原 267 条优先复核候选中，新增 **70 种有本地照片的鱼类图鉴条目**。单一图鉴现在共有 **103 种**，物种目录总量仍为 3,533 条，另有 3,430 条无图分类记录只留在目录。新增条目不是“完整养护档案”：可查看学名、科属、GBIF 环境标签、Wikidata 中文标签、Commons 照片与许可，以及 Wikipedia 有内容时的英文导言、分布或生态短段落。缺失字段显示“资料待补充”。

[桌面条目预览](desktop-photo-profile.png) · [手机条目预览](mobile-photo-profile.png)

## 采集与入库门槛

1. 以本地 GBIF 目录的学名、分类键及原优先队列为基准；Wikipedia 词条关联的 Wikidata `P225` 必须与学名精确一致。
2. 只考虑文件名含精确双名的 Commons 图片；检查文件页的作者、许可、原始链接、尺寸和图片格式，只接收 CC BY、CC BY-SA 或 CC0。文件名匹配不是专家鉴定。
3. 下载到本地并验证图片可解码、最低像素尺寸及格式；逐一排除已经发现的分布地图、混合物种照片、主体太小的画面和说明明显冲突的文件。页面运行时无需外部图片服务。
4. Wikipedia 仅摘取词条导言与明确命名的分布／生态段落，并在详情标明英文原文和许可；未找到对应段落不推断。GBIF 的环境标签不是原生分布，也不是鱼缸水质参数。
5. 新条目进入同一个“鱼类图鉴”与收藏，可从物种目录打开；没有核对过的体长、缸体、水温、pH、混养等养护资料，因此不进入地球区域、对比或鱼缸规划。

本次扫描 267 个候选，找到 116 个文件名与学名匹配的图片候选；按许可、尺寸、格式和内容筛选后发布 70 个。其中 68 条有英文导言、11 条有明确的分布段落、6 条有生态或行为段落。Commons 下载期间出现 HTTP 429，5 个已筛图片候选未重试；Wikipedia 段落查询也遇到 429，已停止。另有低分辨率图片及人工检查不合格的地图／弱主体画面未发布。因此 70 是当前可核对结果，段落覆盖率也是这次查询的结果，不代表这 267 条或全部 3,533 条的最终上限。

## 来源与复核

- 分类与环境标签：[GBIF 物种目录](https://www.gbif.org/developer/species)，原始 GBIF key 保留在每条详情。
- 学名跨库匹配与中文标签：[Wikidata](https://www.wikidata.org/wiki/Wikidata:Licensing)，结构化数据按 CC0 使用。
- 图像：逐张 [Wikimedia Commons 文件页](https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia/en)；[新增图片署名索引](../public/PHOTO_PROFILES_ATTRIBUTION.md)列出作者、许可和原始文件，详情页也逐条展示。
- 英文短文字：各鱼种的 Wikipedia 词条与编辑历史，按 [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) 署名；这是来源节选，不代表专家复核。

图片的文件名、说明与分类名一致仍不能取代鱼类专家鉴定。若日后发现误鉴、图片撤销或许可变化，应移除相应条目并重新复核。不要把有图条目自动升级为适养推荐。

## 可复现命令

```bash
python3 scripts/discover-wikimedia.py
python3 scripts/publish-photo-profiles.py
python3 scripts/enrich-wikipedia-sections.py
npm run validate
npm run build
```

前两步访问 Wikimedia 服务。发现脚本只生成候选元数据；发布脚本按严格条件下载并记录本地图片。遇到 HTTP 429 应停止，不要立即循环重试。已经发布的 JSON 与图片都随项目保存，正常构建和浏览不需要联网。后续重新采集应先查看源站许可、数据差异、人工排除名单及尺寸阈值。

本轮 `npm run build`（含内容与图片校验）、12 项单元测试、Chrome 与 WebKit 合计 38 项浏览器测试通过。桌面 1440 px 与手机 390 px 的新增鱼种详情均已截图检查，无横向溢出。
