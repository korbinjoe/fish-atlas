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
    "导言、分布和行为节选（如有）归属于相应语言词条的 Wikipedia contributors，依据 [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) 使用。词条链接可查看完整编辑历史；没有可核实百科页面的记录保留空文字，以已署名的分类、照片及 FishBase 分布证据展示。分类学名与科来自 [GBIF](https://www.gbif.org/developer/species)；英文俗名来自 GBIF，部分区域补充记录使用 [FishBase](https://www.fishbase.se/) FBname 或与原始词条一致的 GBIF 俗名。中文标签一部分来自 [Wikidata](https://www.wikidata.org/wiki/Wikidata:Licensing)，部分使用编辑核对的通用鱼名。Public domain 照片保留其原许可凭据及明确作者，不改标为 CC0。",
    "",
    "| 鱼种 | 学名 | 摄影者／作者 | 图片许可 | Commons 原始文件 | Wikipedia 文字 |",
    "| --- | --- | --- | --- | --- | --- |",
]
for profile in profiles:
    photo = profile["photo"]
    article = f"[词条与历史]({profile['wikipediaUrl']})" if profile.get("wikipediaUrl") else "—（无百科节选）"
    lines.append(
        f"| {cell(profile['name'])} | *{cell(profile['scientific'])}* | "
        f"{cell(photo['author'])} | "
        f"[{cell(photo['license'])}]({photo['licenseUrl']}) | "
        f"[文件页]({photo['pageUrl']}) | "
        f"{article} |"
    )
lines.append("")
(root / "public/PHOTO_PROFILES_ATTRIBUTION.md").write_text("\n".join(lines))
print(f"Wrote attribution for {len(profiles)} photos")
