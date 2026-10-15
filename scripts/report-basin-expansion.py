"""Render a frozen, reviewed basin-expansion snapshot without rewriting history.

Usage: python3 scripts/report-basin-expansion.py MANIFEST.json REPORT.md
The manifest owns all counts. A later atlas cannot silently change this report.
"""
import argparse
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("manifest", type=Path)
parser.add_argument("report", type=Path)
args = parser.parse_args()
review = json.loads(args.manifest.read_text())
before, after = review["before"], review["after"]
names = {"africa": "非洲", "asia": "亚洲", "europe": "欧洲", "north-america": "北美洲", "oceania": "大洋洲", "south-america": "南美洲"}
lines = ["# 空白流域补齐 · 第二轮", "", review["date"], "",
         "本轮从仍空白的 310 个 GRDC 主要流域出发，增加有真实照片的新鱼种，同时为已有图鉴补充遗漏的原生水体关联。保留此前全部条目和来源；没有可靠照片、原生身份或可解释定位的候选继续留待核对。", "",
         "| 项目 | 补充前 | 补充后 |", "| --- | ---: | ---: |"]
for label, key in [("有图鱼种", "photos"), ("分类目录", "catalog"), ("已关联主要流域 / 520", "basins"), ("已关联全部水域", "waterbodies"), ("原生水体关系", "relationships")]:
    lines.append(f"| {label} | {before[key]} | {after[key]} |")
lines += [f"| 仍无有图关联的主要流域 | {520-before['basins']} | {520-after['basins']} |", "",
          f"本轮新增 **{after['photos']-before['photos']} 种有图鱼**，填补 **{len(review['newMajorBasins'])} 个此前空白流域**。当前共有 {after['basins']} 个 GRDC 流域、{after['kinds']['sea']} 个海域、{after['kinds']['lake']} 个湖泊／潟湖和 {after['kinds']['river']} 个补充河流水系。这里统计的是本图鉴已有来源的覆盖，不表示水域全部鱼种已经收齐。", "",
          "## 各大洲覆盖", "", "| 大洲 | 主要流域总数 | 补充前 | 补充后 | 本轮填补 |", "| --- | ---: | ---: | ---: | ---: |"]
for continent, counts in review["continents"].items():
    lines.append(f"| {names[continent]} | {counts['total']} | {counts['before']} | {counts['after']} | {counts['after']-counts['before']} |")
lines += ["", "## 图片、原生身份与定位", ""]
for note in review["method"]:
    lines += [note, ""]
lines += ["完整审阅与跳过记录见 [本轮清单](../content/blank-basin-expansion-2-2026-10-15.json)。图片作者、原文件和许可见 [照片署名表](../public/PHOTO_PROFILES_ATTRIBUTION.md)。每条原生关系和特殊定位说明可在鱼详情中查看。", "",
          "## 新增鱼种", "", "| 区域批次 | 名称 | 学名 | 原生水体数 | 实拍来源与许可 |", "| --- | --- | --- | ---: | --- |"]
for batch in review["batches"].values():
    for fish in batch["fish"]:
        p = fish["photo"]
        lines.append(f"| {batch['label']} | {fish['name']} | *{fish['scientific']}* | {fish['nativeLinks']} | [{p['license']}]({p['pageUrl']}) |")
lines += ["", "## 本轮填补的主要流域", "", "| 大洲 | 流域 | 现有有图鱼种 |", "| --- | --- | ---: |"]
for basin in review["newMajorBasins"]:
    lines.append(f"| {names[basin['continent']]} | {basin['name']} · {basin['id']} | {basin['photoSpecies']} |")
lines += ["", "## 仍待补齐", "",
          "下表中的空白表示目前没有通过本项目核对的有图原生鱼种关联，并不表示当地没有鱼。终端盐湖的鱼可能只生活在支流或泉水；不能把流域记录放到不适生的盐湖中央。对于现代分类拆分、原生／引入冲突、历史灭绝群体、缺少可用实拍或原始地点不明确的情况，保留空白。已填补流域仍可能缺少大量本地鱼种。", "",
          "| 大洲 | 尚空白流域 |", "| --- | --- |"]
for continent in names:
    rows = [b for b in review["remainingMajorBasins"] if b["continent"] == continent]
    lines.append(f"| {names[continent]} | " + "；".join(f"{b['name']} ({b['id']})" for b in rows) + " |")
lines += ["", "## 验证与维护", ""]
validation = review.get("validation", {})
for key, value in validation.items():
    lines += [f"- {key}：{value}"]
lines += ["", "新增鱼的未核对养护参数保持未知，不自动加入鱼缸规划；规划仍仅使用 33 种已审核养护资料。资料采集共用节流和缓存，图片使用来源原尺寸或缩小版本，不放大小图。增量发布器保留先前原生关系，拒绝冲突的来源覆盖；正常构建也会检查全部图钉的流域归属。", "",
          "本报告使用冻结统计，后续补充不会改写这轮的结果。重新生成：", "", "```bash",
          f"python3 scripts/report-basin-expansion.py {args.manifest.as_posix()} {args.report.as_posix()}", "```", ""]
for file, title in [("blank-basin-round2-natron-desktop.png", "南岸泉水溪定位与真实鱼类照片"), ("blank-basin-round2-lagarfljot-mobile.png", "原始湖泊采样点与手机详情")]:
    if (ROOT / "docs" / file).exists():
        lines += [f"![{title}]({file})", ""]
args.report.write_text("\n".join(lines))
print(f"Reported frozen snapshot: {after['photos']} species, {len(review['newMajorBasins'])} newly occupied basins")
