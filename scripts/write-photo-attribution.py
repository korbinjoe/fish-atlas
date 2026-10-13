"""Write the offline attribution index for newly published photo profiles."""

import json
from datetime import date
from pathlib import Path

root = Path(__file__).resolve().parents[1]
profiles = json.loads((root / "content/photo-profiles.json").read_text())


def cell(value: str) -> str:
    return value.replace("|", "\\|").replace("\n", " ").strip()


lines = [
    "# 新增有图鱼种：照片与文字署名",
    "",
    f"{date.today().isoformat()} · 共 {len(profiles)} 张本地照片。图片保持来源缩略图的像素内容，网页仅用 CSS 缩放和裁切。每张图片有独立许可；如需复用，应打开原始文件页再次核对。",
    "",
    "英文导言、分布和行为节选（如有）归属于相应词条的 Wikipedia contributors，依据 [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) 使用。词条链接可查看完整编辑历史。分类学名与科来自 [GBIF](https://www.gbif.org/developer/species)；中文标签一部分来自 [Wikidata](https://www.wikidata.org/wiki/Wikidata:Licensing)，常见鱼优先清单使用编辑核对的通用鱼名。",
    "",
    "| 鱼种 | 学名 | 摄影者／作者 | 图片许可 | Commons 原始文件 | Wikipedia 文字 |",
    "| --- | --- | --- | --- | --- | --- |",
]
for profile in profiles:
    photo = profile["photo"]
    lines.append(
        f"| {cell(profile['name'])} | *{cell(profile['scientific'])}* | "
        f"{cell(photo['author'])} | "
        f"[{cell(photo['license'])}]({photo['licenseUrl']}) | "
        f"[文件页]({photo['pageUrl']}) | "
        f"[词条与历史]({profile['wikipediaUrl']}) |"
    )
lines.append("")
(root / "public/PHOTO_PROFILES_ATTRIBUTION.md").write_text("\n".join(lines))
print(f"Wrote attribution for {len(profiles)} photos")
