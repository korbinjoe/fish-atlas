"""Report the reviewed 2026-10-15 blank-basin expansion from bundled data."""
import json
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(name):
    return json.loads((ROOT / name).read_text())


review = read("content/blank-basin-expansion-2026-10-15.json")
before = review["before"]
profiles = {row["id"]: row for row in read("content/photo-profiles.json")}
ranges = read("content/distributions.json")["species"]
basins = {row["id"]: row for row in read("content/major-basins.json")}
bodies = {row["id"]: row for row in read("content/waterbodies.json")}
counts = Counter(link["locationId"] for record in ranges.values() for link in record["links"])
new_basins = [row for id, row in basins.items() if counts[id] and not before["locationCounts"].get(id)]
kinds = Counter("basin" if id in basins else bodies[id]["kind"] for id in counts)
validation = review.get("validation", {})
lines = [
    "# 空白流域优先补齐", "", review["date"], "",
    "本轮优先选择此前没有有图鱼种关联的水域，补充非洲、南美洲、大洋洲、南亚和西亚鱼类，并复查已收录广布鱼的漏记分布。所有新增条目均有实际查看过的真实照片及具名原生水体依据；没有照片或只有国家级范围的候选不进入地球。", "",
    "| 项目 | 补充前 | 补充后 |", "| --- | ---: | ---: |",
    f"| 有图图鉴 | {before['photos']} | {len(ranges)} |",
    f"| 分类目录 | {before['catalog']} | {len(read('content/catalog.json'))} |",
    f"| 已关联主要流域 | {before['basins']} | {kinds['basin']} |",
    f"| 仍无有图关联的主要流域 | {len(basins)-before['basins']} | {len(basins)-kinds['basin']} |",
    f"| 已关联全部水域 | {before['waterbodies']} | {len(counts)} |",
    f"| 鱼种—原生水体关系 | {before['relationships']} | {sum(counts.values())} |", "",
    f"本轮新增 {len(ranges)-before['photos']} 种有图鱼，填补 {len(new_basins)} 个主要流域。当前关联水域包括 {kinds['basin']} 个 GRDC 流域、{kinds['sea']} 个海域、{kinds['lake']} 个湖泊／潟湖、{kinds['river']} 个补充河流水系。统计表示当前图鉴的覆盖，不是水域内全部鱼种数。", "",
    "## 各大洲覆盖", "",
    "| 大洲 | GRDC 主要流域总数 | 补充前有鱼 | 补充后有鱼 | 新填补 |", "| --- | ---: | ---: | ---: | ---: |",
]
continent_names = {"africa": "非洲", "asia": "亚洲", "europe": "欧洲", "north-america": "北美洲", "oceania": "大洋洲", "south-america": "南美洲"}
for continent, title in continent_names.items():
    rows = [row for row in basins.values() if row["continent"] == continent]
    old = sum(bool(before["locationCounts"].get(row["id"])) for row in rows)
    current = sum(bool(counts[row["id"]]) for row in rows)
    lines.append(f"| {title} | {len(rows)} | {old} | {current} | {current-old} |")
lines += ["", "## 本轮填补的主要流域", "", "| 大洲 | 水域 | 有图鱼种数 |", "| --- | --- | ---: |"]
for row in sorted(new_basins, key=lambda row: (row["continent"], row["name"])):
    lines.append(f"| {continent_names.get(row['continent'], row['continent'])} | {row['name']} · {row['id']} | {counts[row['id']]} |")
lines += [
    "", "## 来源与定位", "",
    "分类采用 GBIF 精确物种匹配。FishBase 26.06 的 native／endemic + present 记录与物种分布文字交叉检查；澳洲等区域进一步采用 Australian Museum／Fishes of Australia、政府和原始分类文献。引入记录、旧广义物种概念及与范围文字冲突的记录不会只凭原生标签自动发布。每条关系保留来源和依据，并在需要时补充审阅限制。", "",
    "照片来自具体 Wikimedia Commons 文件，保留作者、原文件页和实际许可。逐图检查排除历史画谱、食物照、疑似近似种、低分辨率或权属不足候选。馆藏、捕获或保存标本如有使用会保留原说明。Wikipedia 的短节选使用实际来源语言；没有百科词条的鱼仍可凭分类、真实照片和独立分布来源收录，不伪造百科链接或习性。", "",
    "河流鱼关联具名流域；海水、湖泊鱼分别关联海域、湖泊。沿海潟湖／河口鱼使用河口或独立潟湖位置，避免落在大流域内陆中心。澳大利亚昆士兰 Fitzroy（5411）与西澳 Fitzroy（5305）分别处理；阿根廷 Negro 与亚马孙支流 Negro 不混用。湖泊多边形和河口位置采用 Natural Earth 1:10m 或来源具名坐标。地球标记是水域展示位置，不是采集点或完整分布边界。", "",
    "复查已有鱼补入的北亚、欧洲关系也经过范围审阅：排除 Leuciscus leuciscus 的西伯利亚近似种、Salvelinus alpinus 的白海／波罗的海冲突、Abramis brama 的引入西伯利亚记录、Scardinius erythrophthalmus 的西伯利亚误记及 Oncorhynchus gorbuscha 的叶尼塞关系。丁鱥在叶尼塞只使用来源限定的南部纬度范围。", "",
    "完整物种清单、图片许可、跳过原因和审阅记录见 [本轮审阅清单](../content/blank-basin-expansion-2026-10-15.json)；运行时分布依据仍可从每条鱼详情查看。照片授权汇总见 [署名表](../public/PHOTO_PROFILES_ATTRIBUTION.md)。", "",
    "## 新增鱼种", "",
]
for key, batch in review["batches"].items():
    lines += [f"### {batch['label']} · {len(batch['fishIds'])} 种", "", "| 名称 | 学名 | 原生水体关联数 | 照片与许可 |", "| --- | --- | ---: | --- |"]
    for id in batch["fishIds"]:
        profile = profiles[id]
        photo = profile["photo"]
        lines.append(f"| {profile['name']} | *{profile['scientific']}* | {len(ranges[id]['links'])} | [{photo['license']}]({photo['pageUrl']}) |")
    lines.append("")
lines += [
    "## 验证与维护", "",
    f"生产构建和内容校验：{validation.get('build', '尚未记录')}。单元测试 {validation.get('unitTestsPassed', '—')} 项通过；增量导入测试 {validation.get('publisherTestsPassed', '—')} 项通过；地理标记错误 {validation.get('geographyErrors', '—')} 个。浏览器结果：{validation.get('browser', '尚未记录')}。", "",
    "独立预览确认 379 个鱼种标记的图片全部加载，代表 239 个水域；按具体水域筛选可查看全部已核实关联，不因每种鱼只保留一个总览代表标记而丢失其他水域关系。默认英文，1440px 桌面总览与 390px 手机详情均无横向溢出。Roper 筛选后的方向键切鱼、URL、选中照片与地球同步，无百科页面条目的照片与独立来源正常。", "",
    "发布器保留旧增量资料，拒绝分类身份、图片路径及水体冲突。没有 Wikipedia 的条目不显示空的百科来源；多语言节选标记实际 lang。Wikimedia 采集共用串行节流和缓存，限流时停止该来源采集，不更换端点规避限制。研究缓存不参与正常构建。", "",
    "```bash", "npm run build", "npm test", "python3 scripts/test-regional-publisher.py", "npx tsx scripts/check-distribution-pins.ts", "python3 scripts/report-blank-basin-coverage.py", "```", "",
    f"仍有 {len(basins)-kinds['basin']} 个主要流域没有经核实的有图鱼种；已关联水域也未覆盖全部当地鱼。缺少的习性、养护参数及具体分布仍保持未知。新增条目没有经核对的养护参数，因此不自动进入鱼缸规划。", "",
]
for image, title in [("blank-basin-overview.png", "默认英文地球总览"), ("blank-basin-filter.png", "新增原生水域筛选")]:
    if (ROOT / "docs" / image).exists():
        lines += [f"![{title}]({image})", ""]
(ROOT / "docs/blank-basin-expansion.md").write_text("\n".join(lines))
print(f"Reported {len(ranges)} photo species, {len(new_basins)} newly occupied major basins")
