"""Regenerate the regional expansion report from the published offline snapshot."""
import json
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(name):
    return json.loads((ROOT / name).read_text())


review = read("content/regional-expansion.json")
profiles = {row["id"]: row for row in read("content/photo-profiles.json")}
ranges = read("content/distributions.json")["species"]
basins = {row["id"]: row for row in read("content/major-basins.json")}
bodies = {row["id"]: row for row in read("content/waterbodies.json")}
counts = Counter(link["locationId"] for record in ranges.values() for link in record["links"])
before = review["before"]
kind_counts = Counter("basin" if id in basins else bodies[id]["kind"] for id in counts)
validation = review.get("validation", {})
verification = [
    f"生产构建、内容与分类/照片校验通过；{validation.get('unitTestsPassed')} 项单元测试及 {validation.get('incrementalPublisherTestsPassed')} 项增量导入保留/冲突测试通过；全部水域照片标记地理校验错误数为 {validation.get('geographyErrors')}。",
    "",
    "Chrome 与 WebKit 的 62 项指定浏览器用例首轮 60 项通过，2 项 Chrome 的启动超时和瞬态动画观测失败在原测试不变的定向复核中全部通过；WebKit 首轮 31 项全通过。没有把首轮报告描述为 62/62。最后移除一条黑花鲈来源不明确的 Waccamaw 关系后，已重新构建并通过单元、内容和地理校验。",
    "",
    "独立预览实查 287 个标记全部图片加载成功、166 个代表水域；长江筛选 19 张实图、无横向溢出。新中文别名在英文界面可检索：桂鱼在 Atlas 命中 Siniperca chuatsi，白鲢在 Catalog 命中 Hypophthalmichthys molitrix。",
] if validation else ["验证结果尚未记录。"]
lines = [
    "# 美国、中国与欧洲鱼类补齐", "", review["date"], "",
    "本轮按区域选择代表鱼类，补充此前偏少的温带淡水鱼、洄游鱼和欧洲沿海鱼。新记录均有实际查看过的真实照片，以及具名原生水体的来源。资料不足的养护参数继续留空。", "",
    "| 项目 | 补充前 | 补充后 |", "| --- | ---: | ---: |",
    f"| 有图图鉴 | {before['atlasTotal']} | {len(ranges)} |",
    f"| 分类目录 | {before['catalogTotal']} | {len(read('content/catalog.json'))} |",
    f"| 已关联的主要流域 | {before['occupiedBasins']} | {kind_counts['basin']} |",
    f"| 已关联的全部水域 | {before['waterbodyTotal']} | {len(counts)} |",
    f"| 鱼种—原生水体关系 | {before['relationships']} | {sum(counts.values())} |", "",
    "中国批次新增 24 种，欧洲批次新增 43 种，美国／北美批次新增 37 种，合计 104 种；批次是采集工作口径，同一种鱼的原生范围可以跨多个区域。", "",
    f"已关联水域包括 {kind_counts['basin']} 个 GRDC 主要流域、{kind_counts['sea']} 个海域、{kind_counts['lake']} 个湖泊／潟湖和 {kind_counts['river']} 个补充河流水系。520 个流域的地图层仍完整保留，尚无资料的流域不会伪造鱼种。", "",
    "## 重点水域", "",
    "表内数字是该水域关联的有图鱼种数，同一鱼跨水域计数；不是当地鱼类总数，也不表示占据水域全部区域。", "",
    "| 水域 | 补充前 | 补充后 |", "| --- | ---: | ---: |",
]
names = {"2433": "长江", "2434": "黄河", "2437": "珠江", "2401": "黑龙江", "4219": "密西西比", "4238": "圣劳伦斯", "4406": "哥伦比亚", "4421": "萨克拉门托", "6242": "莱茵", "6202": "多瑙", "6903": "伏尔加", "6246": "塞纳", "6253": "泰晤士", "6204": "第聂伯", "lake-superior": "苏必利尔湖", "lake-michigan": "密歇根湖", "lake-huron": "休伦湖", "lake-erie": "伊利湖", "lake-ontario": "安大略湖"}
for id, name in names.items():
    lines.append(f"| {name} | {before['locationCounts'].get(id, 0)} | {counts[id]} |")
lines.extend([
    "", "## 来源与修正", "",
    "分类、科属和稳定 key 采用 GBIF 精确物种匹配；与当前分类研究存在物种概念冲突的条目跳过。FishBase 26.06 范围文字与 native／endemic + present 生态记录经过逐条交叉检查，矛盾、引入或身份不明记录不会直接进入地球。英文俗名以 GBIF 与 FishBase FBname 为依据；中文使用核对的物种名，并保留可靠简繁、常用别名供搜索。", "",
    "照片来自具体 Wikimedia Commons 文件，每张保留作者、原始文件页和许可。CC BY、CC BY-SA、CC0 与已核实的 Public domain 保持原许可；旧绘画、地图、误种和授权依据不足的候选已排除。部分照片为馆藏、捕获或保存标本，保留原说明。Wikipedia 导言及章节节选保留来源语言，不把 FishBase 文字冒充 Wikipedia 引文。完整署名见 [照片与文字署名](../public/PHOTO_PROFILES_ATTRIBUTION.md)。", "",
    "- 移除 *Chromis viridis* 的地中海原生关联，保留印太范围。依据：[FishBase 5679](https://www.fishbase.se/summary/5679)。",
    "- *Gila atraria* 保留哥伦比亚父流域内的上斯内克河关系，并补 Bonneville／大盐湖流域；不是将鱼放进高盐的大盐湖湖面。引入的密苏里及科罗拉多种群排除。依据：[USGS 原生范围](https://nas.er.usgs.gov/queries/FactSheet.aspx?speciesID=531)。",
    "- *Cobitis bilineata* 的罗讷关系保留，依据明确到所属 Durance 水系；不是错误扩展到莱茵。",
    "- 五大湖分别定位，新增日内瓦、拉多加、奥涅加、楚德、兴凯、贝加尔和青海等湖泊。大型水域使用 Natural Earth 多边形，小湖泊保留明确来源的坐标。",
    "- 泰晤士补充采用 [DEFRA／EA 具名调查](https://questions-statements.parliament.uk/written-questions/detail/2023-10-17/HL10629/) 与 [JNCC 英国原生鱼清单](https://data.jncc.gov.uk/data/18f27480-a7e1-498c-9cca-f9eacbed2324/SSSI-Guidelines-19-Freshwaterfish-2018.pdf) 交叉关联，标为 medium。调查不区分野生与人工增殖个体，相关限制在鱼详情保留；旧广义物种概念、外来鲤类不据此加入。",
    "- 北方狗鱼补北美原生水体；黑花鲈的原生范围不确定，移除与审阅限定范围不一致的 Waccamaw 关系。",
    "- 原 *Micropterus salmoides* 的旧广义资料暂不发布，避免将重新定义的佛罗里达谱系套用北美旧范围；依据：[2022 原始分类研究](https://www.nature.com/articles/s41598-022-11743-2)。", "",
    "## 地球与检索", "",
    "总览仍为每种鱼保留一个代表标记，采用全量已核实关系的确定性匹配，优先让更多有依据的水域得到展示，再平衡剩余鱼种。当前 287 种代表标记覆盖 166 个水域，补充前首条关系策略只显示 75 个水域。分配只在资料快照变化时重算；搜索、语言和种类筛选不会让同一鱼跳到其他国家。选择具体水域仍显示那里所有已关联鱼种。", "",
    "首页主要流域入口增加圣劳伦斯、黄河、珠江、莱茵。Atlas、Catalog 支持新鱼的学名、英文俗名、简繁中文及已核实别名搜索。新鱼不加入缺乏饲养参数的鱼缸规划。", "",
    "## 增量维护", "",
    "已修复原照片发布脚本和分类刷新脚本覆盖旧增量资料的问题。新发布器先校验分类、图片文件和具名分布来源，保留已有资料并拒绝冲突；公开快照构建不依赖研究缓存或联网。", "",
    "```bash", "python3 scripts/publish-regional-batches.py --dry-run <reviewed-batch.json>",
    "python3 scripts/publish-regional-batches.py <reviewed-batch.json>", "npm run build", "npm test",
    "python3 scripts/test-regional-publisher.py", "npx tsx scripts/check-distribution-pins.ts", "```", "",
    "发布器需要 Pillow。batch 包含 catalog、profiles、distributions、waterbodies、可选完整 distributionPatches 和 review.visualReviewed=true；review.speciesAliases 为核对过的中文别名。distributionPatches 表示明确替换，不应拿旧批次覆盖后来修正。研究缓存不入仓库，发布结果与审阅清单均已保存；[区域审阅清单](../content/regional-expansion.json) 保留新物种、照片许可、跳过原因与修正记录。", "",
    "## 新增鱼种", "",
])
for area, title in [("china", "中国"), ("us", "美国／北美"), ("europe", "欧洲")]:
    ids = review["batches"][area]["fishIds"]
    lines.extend([f"### {title} · {len(ids)} 种", "", "| 名称 | 学名 | 原生水体关联数 | 图片与许可 |", "| --- | --- | ---: | --- |"])
    for id in ids:
        p = profiles[id]; photo = p["photo"]
        lines.append(f"| {p['name']} | *{p['scientific']}* | {len(ranges[id]['links'])} | [{photo['license']}]({photo['pageUrl']}) |")
    lines.append("")
lines.extend([
    "## 覆盖边界", "",
    f"本轮是区域定向扩展，不是美国、中国、欧洲鱼种全量库。全球主要流域中仍有 {len(basins) - kind_counts['basin']} 个没有已核实的有图鱼种关系；已关联的流域也只有当前收录的代表鱼，不代表全部当地鱼。未取得合格图片、物种身份冲突或仅有国家级范围的候选继续等待复核。新增记录缺少的行为、养护参数及未核实分布保留未知，不根据科属推测。", "",
    "## 验证", "", *verification, "",
    "![默认英文地球总览](regional-expansion-overview.png)", "",
    "![长江原生鱼筛选](regional-expansion-yangtze.png)", "",
])
(ROOT / "docs/regional-fish-expansion.md").write_text("\n".join(lines))
print(f"Wrote docs/regional-fish-expansion.md: {len(ranges)} photographed fish, {len(counts)} linked waterbodies")
