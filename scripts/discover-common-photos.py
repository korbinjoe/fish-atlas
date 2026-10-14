"""Discover licensed photo candidates for the representative common-fish list.

Only metadata is written. A human must inspect the contact sheet before publish.
The Wikidata taxon-name claim must match the exact catalog scientific name.
"""

from __future__ import annotations

import html
import json
import re
import runpy
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "content/research/common-photo-candidates.json"
API_AGENT = "FishAtlas/0.5 (educational atlas; common fish image and attribution review)"
COMMON = runpy.run_path(str(ROOT / "scripts/audit-common-fish.py"))["COMMON"]


def get(base: str, **params) -> dict:
    url = base + "?" + urllib.parse.urlencode(params)
    request = urllib.request.Request(url, headers={"User-Agent": API_AGENT})
    with urllib.request.urlopen(request, timeout=55) as response:
        return json.load(response)


def chunks(items: list, size: int):
    for start in range(0, len(items), size):
        yield items[start : start + size]


def plain(value: str) -> str:
    return html.unescape(re.sub(r"<[^>]*>", "", value)).strip()


def claims(entity: dict, prop: str) -> list[str]:
    return [
        claim["mainsnak"]["datavalue"]["value"]
        for claim in entity.get("claims", {}).get(prop, [])
        if claim.get("mainsnak", {}).get("datavalue", {}).get("type") == "string"
    ]


def main() -> None:
    catalog = {row["scientific"].casefold(): row for row in json.loads((ROOT / "content/catalog.json").read_text())}
    covered = {
        row["scientific"].casefold()
        for filename in ("species.json", "photo-profiles.json")
        for row in json.loads((ROOT / "content" / filename).read_text())
    }
    targets = [
        {"name": name, "scientific": scientific, "group": group, "gbif": catalog[scientific.casefold()]}
        for group, fish in COMMON.items()
        for name, scientific in fish
        if scientific.casefold() in catalog and scientific.casefold() not in covered
    ]
    print(f"Searching Wikipedia for {len(targets)} common fish", flush=True)
    pages = {}
    for batch in chunks(targets, 15):
        result = get(
            "https://en.wikipedia.org/w/api.php",
            action="query", format="json", prop="pageprops|pageimages|extracts",
            piprop="name", exintro="1", explaintext="1", exlimit="max",
            titles="|".join(row["scientific"] for row in batch), redirects="1",
        )
        for page in result.get("query", {}).get("pages", {}).values():
            qid = page.get("pageprops", {}).get("wikibase_item")
            if qid:
                pages[qid] = page
        time.sleep(1.5)

    by_scientific = {row["scientific"].casefold(): row for row in targets}
    candidates = []
    for batch in chunks(sorted(pages), 20):
        result = get(
            "https://www.wikidata.org/w/api.php", action="wbgetentities", format="json",
            ids="|".join(batch), props="claims|labels", languages="zh|en",
        )
        for qid, entity in result.get("entities", {}).items():
            names = claims(entity, "P225")
            if len(names) != 1 or names[0].casefold() not in by_scientific:
                continue
            row = by_scientific[names[0].casefold()]
            page = pages[qid]
            filenames = list(dict.fromkeys(
                ([page["pageimage"]] if page.get("pageimage") else []) + claims(entity, "P18")
            ))
            filenames = [name for name in filenames if
                         name.lower().endswith((".jpg", ".jpeg", ".png", ".webp"))
                         and not any(word in name.casefold() for word in
                                     ("map", "diagram", "drawing", "illustration", "collage", "montage", "hybrid"))]
            candidates.append({
                "scientific": row["scientific"], "name": row["name"], "group": row["group"],
                "gbifKey": row["gbif"]["key"], "family": row["gbif"]["family"],
                "wikidataId": qid, "wikipediaTitle": page["title"],
                "wikipediaUrl": "https://en.wikipedia.org/wiki/" + urllib.parse.quote(page["title"].replace(" ", "_")),
                "intro": page.get("extract", ""), "filenames": filenames,
            })
        time.sleep(1.5)

    files = {}
    for row in candidates:
        for name in row["filenames"]:
            files["File:" + name.replace("_", " ")] = None
    for batch in chunks(list(files), 15):
        result = get(
            "https://commons.wikimedia.org/w/api.php", action="query", format="json",
            prop="imageinfo", iiprop="url|extmetadata|size|mime", iiurlwidth="800",
            titles="|".join(batch),
        )
        for page in result.get("query", {}).get("pages", {}).values():
            info = page.get("imageinfo", [{}])[0]
            if not info:
                continue
            meta = info.get("extmetadata", {})
            files[page["title"]] = {
                "url": info.get("thumburl"), "pageUrl": info.get("descriptionurl"),
                "license": plain(meta.get("LicenseShortName", {}).get("value", "")),
                "licenseUrl": meta.get("LicenseUrl", {}).get("value", ""),
                "author": plain(meta.get("Artist", {}).get("value", "")),
                "caption": plain(meta.get("ImageDescription", {}).get("value", ""))[:400],
                "width": info.get("width", 0), "height": info.get("height", 0),
                "mime": info.get("mime", ""),
            }
        time.sleep(1.5)
    for row in candidates:
        row["photos"] = []
        for name in row.pop("filenames"):
            title = "File:" + name.replace("_", " ")
            photo = files.get(title)
            if not photo:
                continue
            eligible = bool(
                re.fullmatch(r"CC BY(?:-SA)? [0-9.]+(?: de)?|CC0", photo["license"])
                and photo["licenseUrl"] and photo["author"] and photo["url"]
                and photo["width"] >= 500 and photo["height"] >= 300
                and photo["mime"] in ("image/jpeg", "image/png", "image/webp")
                and not any(word in photo["caption"].casefold() for word in ("distribution map", "range map"))
            )
            row["photos"].append({"fileTitle": title, "eligible": eligible, **photo})
    candidates.sort(key=lambda row: row["scientific"])
    OUT.write_text(json.dumps(candidates, ensure_ascii=False, indent=2) + "\n")
    print(f"Found {len(candidates)} exact Wikidata species, {sum(any(p['eligible'] for p in row['photos']) for row in candidates)} with eligible photos")
    print(OUT)


if __name__ == "__main__":
    try:
        main()
    except urllib.error.HTTPError as error:
        raise SystemExit(f"Source returned HTTP {error.code}; stopped without retrying") from error
