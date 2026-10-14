"""Find conservatively matched Commons photos for the atlas review queue.

This writes candidate metadata only. Images are not published by this script.
The Wikipedia, Wikidata and Commons APIs are queried in small serial batches.
"""

from __future__ import annotations

import csv
import html
import json
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
QUEUE = ROOT / "docs" / "catalog-review-queue.csv"
OUT = ROOT / "content" / "research" / "wikimedia-candidates.json"
USER_AGENT = "FishAtlas/0.4 (local educational atlas; source and license review)"


def get(base: str, params: dict[str, str]) -> dict:
    url = base + "?" + urllib.parse.urlencode(params)
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=50) as response:
        return json.load(response)


def chunks(items: list, size: int):
    for index in range(0, len(items), size):
        yield items[index : index + size]


def plain(value: str) -> str:
    return html.unescape(re.sub(r"<[^>]*>", "", value)).strip()


def image_matches_species(filename: str, scientific: str) -> bool:
    title = urllib.parse.unquote(filename).replace("_", " ").lower()
    name = scientific.lower()
    return bool(re.search(r"(?<![a-z])" + re.escape(name) + r"(?![a-z])", title)) and not any(
        word in title for word in ("hybrid", "montage", "collage", "comparison", "diagram", "map", "distribution", "drawing", "illustration")
    )


def claim(entity: dict, prop: str) -> list[str]:
    return [
        item["mainsnak"]["datavalue"]["value"]
        for item in entity.get("claims", {}).get(prop, [])
        if item.get("mainsnak", {}).get("datavalue", {}).get("type") == "string"
    ]


def main() -> None:
    rows = [row for row in csv.DictReader(QUEUE.open()) if row["stage"] == "taxonomy-candidate"]
    by_name = {row["scientific"].lower(): row for row in rows}
    pages: dict[str, dict] = {}
    for batch in chunks(rows, 40):
        data = get(
            "https://en.wikipedia.org/w/api.php",
            {
                "action": "query",
                "format": "json",
                "prop": "pageprops|pageimages",
                "piprop": "name",
                "titles": "|".join(row["scientific"] for row in batch),
                "redirects": "1",
            },
        )
        for page in data.get("query", {}).get("pages", {}).values():
            qid = page.get("pageprops", {}).get("wikibase_item")
            if qid:
                pages[qid] = page
        time.sleep(2)

    matched: list[dict] = []
    for batch in chunks(sorted(pages), 25):
        data = get(
            "https://www.wikidata.org/w/api.php",
            {
                "action": "wbgetentities",
                "format": "json",
                "ids": "|".join(batch),
                "props": "claims|labels",
                "languages": "zh|en",
            },
        )
        for qid, entity in data.get("entities", {}).items():
            names = claim(entity, "P225")
            if len(names) != 1 or names[0].lower() not in by_name:
                continue
            row = by_name[names[0].lower()]
            page = pages[qid]
            image_options = claim(entity, "P18") + ([page["pageimage"]] if page.get("pageimage") else [])
            image = next((name for name in image_options if image_matches_species(name, row["scientific"])), None)
            if not image:
                continue
            matched.append(
                {
                    "gbifKey": int(row["gbif_key"]),
                    "scientific": row["scientific"],
                    "family": row["family"],
                    "wikidataId": qid,
                    "wikipediaTitle": page["title"],
                    "wikipediaUrl": "https://en.wikipedia.org/wiki/" + urllib.parse.quote(page["title"].replace(" ", "_")),
                    "chineseName": entity.get("labels", {}).get("zh", {}).get("value", ""),
                    "fileTitle": "File:" + image.replace("_", " "),
                }
            )
        time.sleep(2)

    by_file = {row["fileTitle"]: row for row in matched}
    for batch in chunks(list(by_file), 20):
        data = get(
            "https://commons.wikimedia.org/w/api.php",
            {
                "action": "query",
                "format": "json",
                "prop": "imageinfo",
                "iiprop": "url|extmetadata|size|mime",
                "iiurlwidth": "800",
                "titles": "|".join(batch),
            },
        )
        for page in data.get("query", {}).get("pages", {}).values():
            row = by_file.get(page.get("title", ""))
            info = page.get("imageinfo", [{}])[0]
            if not row or not info:
                continue
            meta = info.get("extmetadata", {})
            license_name = plain(meta.get("LicenseShortName", {}).get("value", ""))
            license_url = meta.get("LicenseUrl", {}).get("value", "")
            author = plain(meta.get("Artist", {}).get("value", ""))
            mime = info.get("mime", "")
            allowed = bool(re.match(r"^(CC BY(?:-SA)? [0-9.]|CC0|Public domain)", license_name, re.I))
            row["photo"] = {
                "candidateUrl": info.get("thumburl") or info.get("url"),
                "pageUrl": info.get("descriptionurl"),
                "license": license_name,
                "licenseUrl": license_url,
                "author": author,
                "caption": plain(meta.get("ImageDescription", {}).get("value", ""))[:400],
                "width": info.get("width"),
                "height": info.get("height"),
                "mime": mime,
            }
            row["eligible"] = bool(
                allowed
                and license_url
                and author
                and info.get("width", 0) >= 500
                and info.get("height", 0) >= 300
                and mime in ("image/jpeg", "image/png", "image/webp")
                and info.get("thumburl")
            )
        time.sleep(2)

    matched.sort(key=lambda row: row["scientific"])
    OUT.write_text(json.dumps(matched, ensure_ascii=False, indent=2) + "\n")
    print(
        f"Reviewed {len(rows)} queue names; {len(pages)} Wikipedia-linked items; "
        f"{len(matched)} exact-name image candidates; {sum(row.get('eligible', False) for row in matched)} license/dimension-eligible."
    )
    print(f"Candidate metadata: {OUT}")


if __name__ == "__main__":
    try:
        main()
    except urllib.error.HTTPError as error:
        raise SystemExit(f"Source returned HTTP {error.code}; stopped without retrying.") from error
