"""Compare a representative aquarium-fish checklist with the local atlas.

The checklist is editorial, not an exhaustive inventory of the aquarium trade.
Run from any directory: python3 scripts/audit-common-fish.py
"""

import json
from collections import Counter
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

# Scientific names keep this audit independent of translated trade names.
# Sources and selection limits are documented in the generated report.
COMMON = {
    "淡水": [
        ("金鱼", "Carassius auratus"),
        ("孔雀鱼", "Poecilia reticulata"),
        ("安德勒孔雀鱼", "Poecilia wingei"),
        ("月光鱼", "Xiphophorus maculatus"),
        ("花斑月光鱼", "Xiphophorus variatus"),
        ("玛丽鱼", "Poecilia sphenops"),
        ("帆鳍玛丽", "Poecilia latipinna"),
        ("剑尾鱼", "Xiphophorus hellerii"),
        ("暹罗斗鱼", "Betta splendens"),
        ("红绿灯", "Paracheirodon innesi"),
        ("宝莲灯", "Paracheirodon axelrodi"),
        ("黑霓虹灯", "Hyphessobrycon herbertaxelrodi"),
        ("刚果灯", "Phenacogrammus interruptus"),
        ("三角灯", "Trigonostigma heteromorpha"),
        ("红三角灯", "Trigonostigma espei"),
        ("绿晶灯", "Microdevario kubotai"),
        ("剪刀波鱼", "Rasbora trilineata"),
        ("青铜鼠", "Corydoras aeneus"),
        ("熊猫鼠", "Corydoras panda"),
        ("花椒鼠", "Corydoras paleatus"),
        ("翡翠鼠", "Corydoras splendens"),
        ("虎皮鱼", "Puntigrus tetrazona"),
        ("奥德萨鲃", "Pethia padamya"),
        ("樱桃鲃", "Puntius titteya"),
        ("玻利维亚短鲷", "Mikrogeophagus altispinosus"),
        ("荷兰凤凰", "Mikrogeophagus ramirezi"),
        ("库利泥鳅", "Pangio kuhlii"),
        ("神仙鱼", "Pterophyllum scalare"),
        ("白云金丝", "Tanichthys albonubes"),
        ("暹罗食藻鱼", "Crossocheilus oblongus"),
        ("斑马鱼", "Danio rerio"),
        ("胡子异形（代表种）", "Ancistrus cirrhosus"),
        ("小精灵（代表种）", "Otocinclus affinis"),
        ("皇冠泥鳅", "Chromobotia macracanthus"),
        ("七彩神仙", "Symphysodon aequifasciatus"),
        ("地图鱼", "Astronotus ocellatus"),
        ("非洲王子", "Labidochromis caeruleus"),
        ("德氏岩栖丽鱼", "Pseudotropheus demasoni"),
        ("六间鱼", "Cyphotilapia frontosa"),
        ("多带卷贝", "Neolamprologus multifasciatus"),
        # Second-pass priority: other widely kept groups omitted by the first 60.
        ("火焰灯", "Hyphessobrycon amandae"),
        ("红鼻剪刀（代表种）", "Hemigrammus bleheri"),
        ("黑裙灯", "Gymnocorymbus ternetzi"),
        ("柠檬灯", "Hyphessobrycon pulchripinnis"),
        ("红线灯", "Hemigrammus erythrozonus"),
        ("银尖灯", "Hasemania nana"),
        ("钻石灯", "Moenkhausia pittieri"),
        ("银河斑马鱼", "Danio margaritatus"),
        ("绿宝石斑马鱼", "Danio erythromicron"),
        ("矮丽鱼", "Trichogaster lalius"),
        ("蜜丽鱼", "Trichogaster chuna"),
        ("三点丝足鲈", "Trichopodus trichopterus"),
        ("接吻鱼", "Helostoma temminckii"),
        ("叉尾蓝眼", "Pseudomugil furcatus"),
        ("博氏虹银汉鱼", "Melanotaenia boesemani"),
        ("霓虹彩虹鱼", "Melanotaenia praecox"),
        ("红彩虹鱼", "Glossolepis incisus"),
        ("米字蓝眼", "Pseudomugil gertrudae"),
        ("小精灵鼠", "Corydoras pygmaeus"),
        ("哈氏鼠", "Corydoras habrosus"),
        ("茱莉鼠", "Corydoras julii"),
        ("小猴飞狐", "Garra flavatra"),
        ("小丑异形", "Panaqolus maccus"),
        ("斑马异形", "Hypancistrus zebra"),
        ("斑马鳅", "Botia striata"),
        ("溜溜球鳅", "Botia almorhae"),
        ("孔雀鳉", "Aphyosemion australe"),
        ("小丑鳉", "Epiplatys annulatus"),
        ("鸡冠短鲷", "Apistogramma cacatuoides"),
        ("阿卡西短鲷", "Apistogramma agassizii"),
        ("七彩凤凰", "Pelvicachromis pulcher"),
        ("九间菠萝", "Amatitlania nigrofasciata"),
        ("蓝阿卡拉", "Andinoacara pulcher"),
        ("钥匙孔慈鲷", "Cleithracara maronii"),
        ("珍珠马甲", "Trichopodus leerii"),
        ("玫瑰鲃", "Pethia conchonius"),
        ("斑马短鲷", "Apistogramma borellii"),
    ],
    "海水": [
        ("公子小丑鱼", "Amphiprion ocellaris"),
        ("真小丑鱼", "Amphiprion percula"),
        ("睡衣天竺鲷", "Sphaeramia nematoptera"),
        ("泗水玫瑰", "Pterapogon kauderni"),
        ("蓝绿光鳃鱼", "Chromis viridis"),
        ("雷达鱼", "Nemateleotris magnifica"),
        ("皇家格兰玛", "Gramma loreto"),
        ("黄小丑虾虎", "Gobiodon okinawae"),
        ("火焰鹰鱼", "Neocirrhites armatus"),
        ("兰花拟雀鲷", "Pseudochromis fridmani"),
        ("六线龙", "Pseudocheilinus hexataenia"),
        ("黄守望虾虎", "Cryptocentrus cinctus"),
        ("霓虹虾虎", "Elacatinus oceanops"),
        ("钻石虾虎", "Valenciennea puellaris"),
        ("金色鳚", "Ecsenius midas"),
        ("火焰神仙", "Centropyge loriculus"),
        ("蓝倒吊", "Paracanthurus hepatus"),
        ("黄倒吊", "Zebrasoma flavescens"),
        ("青蛙鱼", "Synchiropus splendidus"),
        ("粉蓝倒吊", "Acanthurus leucosternon"),
        ("紫火箭鱼", "Nemateleotris decora"),
        ("四线龙", "Pseudocheilinus tetrataenia"),
        ("黄龙", "Halichoeres chrysus"),
        ("食藻鳚", "Salarias fasciatus"),
        ("双色鳚", "Ecsenius bicolor"),
        ("尾斑鳚", "Ecsenius stigmatura"),
        ("珊瑚美人", "Centropyge bispinosa"),
        ("狐狸鱼", "Siganus vulpinus"),
        ("紫倒吊", "Zebrasoma xanthurum"),
        ("帆倒吊", "Zebrasoma veliferum"),
        ("蓝魔雀鲷", "Chrysiptera cyanea"),
        ("柠檬雀鲷", "Pomacentrus moluccensis"),
        ("火焰剑鱼", "Nemateleotris helfrichi"),
        ("黄尾蓝魔鬼", "Chrysiptera parasema"),
    ],
}

# The older aquarium name is searchable under the accepted catalog name.
ALIASES = {"Otocinclus affinis": "Macrotocinclus affinis"}
LABELS = {
    "care": "养护图鉴（可规划）",
    "photo": "照片图鉴",
    "catalog": "仅分类目录",
    "missing": "未收录",
}


def read(name):
    return json.loads((ROOT / "content" / name).read_text(encoding="utf-8"))


def main():
    care_rows = read("species.json")
    photo_rows = read("photo-profiles.json")
    catalog_rows = read("catalog.json")
    manifest = read("catalog-manifest.json")
    care = {row["scientific"].casefold() for row in care_rows}
    photo = {row["scientific"].casefold() for row in photo_rows}
    catalog = {row["scientific"].casefold() for row in catalog_rows}
    counts = Counter()
    rows = {}
    for group, fish in COMMON.items():
        rows[group] = []
        for name, scientific in fish:
            key = scientific.casefold()
            alias = ALIASES.get(scientific)
            accepted = alias.casefold() if alias else key
            if key in care or accepted in care:
                status = "care"
            elif key in photo or accepted in photo:
                status = "photo"
            elif key in catalog or (alias and alias.casefold() in catalog):
                status = "catalog"
            else:
                status = "missing"
            counts[(group, status)] += 1
            counts[status] += 1
            rows[group].append((name, scientific, status, alias if key not in catalog else None))

    n = sum(len(fish) for fish in COMMON.values())
    lines = [
        "# 常见鱼缸观赏鱼覆盖核对",
        "",
        f"核对日期：{date.today().isoformat()}。本地分类内容更新日期：`content/catalog-manifest.json` 所列 {manifest['generatedAt']}。",
        "",
        "## 结论",
        "",
        f"从淡水 {len(COMMON['淡水'])} 种、海水 {len(COMMON['海水'])} 种组成的**扩展代表性清单**核对 {n} 种：{counts['care']} 种有核对过的养护参考并可进入鱼缸规划，{counts['photo']} 种只有照片图鉴，{counts['catalog']} 种仅有分类目录记录，{counts['missing']} 种在本地没有对应物种记录。图鉴覆盖 {counts['care'] + counts['photo']}/{n}；任何层级的记录覆盖 {n - counts['missing']}/{n}。这些比例只描述本清单，不能外推为全市场覆盖率。",
        "",
        "| 范围 | 养护图鉴 | 照片图鉴 | 仅目录 | 未收录 |",
        "| --- | ---: | ---: | ---: | ---: |",
    ]
    for group, fish in COMMON.items():
        lines.append(f"| {group}（{len(fish)}） | {counts[group, 'care']} | {counts[group, 'photo']} | {counts[group, 'catalog']} | {counts[group, 'missing']} |")
    lines += [
        "",
        f"当前产品总量是 {len(care_rows)} 种养护图鉴、{len(photo_rows)} 种照片图鉴、{len(catalog_rows):,} 条分类目录。照片条目不能进入规划；目录里的其他记录也不能当作适养建议。",
        "",
        "## 核对口径",
        "",
        "清单参考 [Aquarium Co-Op 的淡水入门鱼](https://www.aquariumcoop.com/blogs/aquarium/10-best-aquarium-fish-for-beginners)、[灯鱼](https://www.aquariumcoop.com/blogs/aquarium/top-10-tetras)、[波鱼](https://www.aquariumcoop.com/blogs/aquarium/top-10-rasboras)、[丝足鲈](https://www.aquariumcoop.com/blogs/aquarium/top-5-gouramis)、[彩虹鱼](https://www.aquariumcoop.com/blogs/aquarium/top-10-rainbowfish)、[慈鲷](https://www.aquariumcoop.com/blogs/aquarium/top-10-cichlids)与 [泥鳅](https://www.aquariumcoop.com/blogs/aquarium/loaches)，以及 [Bulk Reef Supply 的海水鱼清单](https://www.bulkreefsupply.com/content/post/best-saltwater-aquarium-fish-for-beginners)与[海缸常见功能鱼](https://www.bulkreefsupply.com/content/post/decorative-vs-utilitarian-fish-whats-the-difference)。此处“常见”是编辑抽样，并非统一销量排名；有些常见商品名涵盖人工品系或多个物种。",
        "",
        "以物种学名核对 `species.json`、`photo-profiles.json`、`catalog.json`。商品名可能指多个物种或人工品系，本清单只取一个代表种，不把不同品系重复计数；未对所有异名做自动穷举。*Otocinclus affinis* 依据 [GBIF 异名关系](https://www.gbif.org/taxon/6TDZS)按接受名 *Macrotocinclus affinis* 的实际资料层级计数，站内把旧学名作为可搜索别名。",
        "",
        "## 逐种结果",
    ]
    for group, fish in rows.items():
        lines += ["", f"### {group}（{len(fish)} 种）", "", "| 中文常用名 | 学名 | 当前层级 |", "| --- | --- | --- |"]
        for name, scientific, status, alias in fish:
            detail = LABELS[status]
            if alias:
                detail += f"（目录名：*{alias}*）"
            lines.append(f"| {name} | *{scientific}* | {detail} |")
    lines += [
        "",
        "## 缺口成因与处理顺序",
        "",
        "原始 `scripts/import-catalog.py` 每个选定科最多抓取 240 个接受名，然后按科轮流截到 3,500 条；这是分类抽样，不依据鱼店常见度或养殖需求排序。2026-10-12 起另以常见鱼清单补充 GBIF 精确匹配的物种，并加入清单中文名检索；其他商品名和异名尚未完整覆盖。",
        "",
        "1. **扩展清单外常见鱼**：继续按鱼店常见度、用户检索与可信水族指南选择物种；仅目录或未收录者先核对接受名，再查 Commons 可复用照片与摄影者署名。",
        "2. **补资料字段**：照片图鉴已显示分类、中文名和原文导言；有可靠公开段落时再补自然分布和行为，缺失保持空白。",
        "3. **最后补规划数据**：只有逐种核对缸体、温度、水质、群游与混养风险之后，才加入鱼缸规划。照片图鉴或 GBIF 分类记录不能直接升级为养护建议。",
        "",
    ]
    output = ROOT / "docs" / "common-aquarium-fish-coverage.md"
    output.write_text("\n".join(lines), encoding="utf-8")
    print(f"Wrote {output}: {n} species, {dict((k, counts[k]) for k in LABELS)}")


if __name__ == "__main__":
    main()
