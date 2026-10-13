"""Append visually reviewed common fish photographs to the atlas.

Run discover-common-photos.py, review-common-photos.py and inspect the sheet
before running this script. Never overwrite existing photo profiles.
"""

from __future__ import annotations

import json
import re
import shutil
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
CANDIDATES = ROOT / "content/research/common-photo-candidates.json"
REVIEW = ROOT / "content/research/common-photo-review/downloaded.json"
OUTPUT = ROOT / "content/photo-profiles.json"
MEDIA = ROOT / "public/media/wikimedia"
AGENT = "FishAtlas/0.5 (educational atlas; source and license review)"

# Exclusions follow visual inspection of contact-sheet.jpg and source captions.
EXCLUDE = {
    "Amphiprion percula",  # Commons caption warns that many named photos show A. ocellaris.
    "Crossocheilus oblongus",  # Commons caption identifies only a species complex.
    "Corydoras julii",  # Candidate markings can be confused with C. trilineatus.
    "Epiplatys annulatus",  # CC0 file gives no identifiable creator.
    "Panaqolus maccus",  # Candidate is too dark to identify visually in the atlas.
    "Pelvicachromis pulcher",  # Available candidate is a composite, not a single photograph.
}


def get(**params) -> dict:
    url = "https://en.wikipedia.org/w/api.php?" + urllib.parse.urlencode(params)
    request = urllib.request.Request(url, headers={"User-Agent": AGENT})
    with urllib.request.urlopen(request, timeout=55) as response:
        return json.load(response)


def short_paragraph(text: str, limit: int = 330) -> str:
    paragraph = re.split(r"\n\s*\n", text.strip())[0].replace("\n", " ").strip()
    if len(paragraph) <= limit:
        return paragraph
    sentences = re.findall(r"[^.!?]*[.!?](?:\s|$)", paragraph)
    output = ""
    for sentence in sentences:
        if len(output) + len(sentence) > limit:
            break
        output += sentence
    return output.strip()


def sections(extract: str) -> tuple[str, str, str]:
    parts = re.split(r"(?m)^\s*={2,4}\s*([^=\n]+?)\s*={2,4}\s*$", extract)
    intro = short_paragraph(parts[0])
    named = {parts[i].strip().lower(): parts[i + 1] for i in range(1, len(parts) - 1, 2)}

    def find(pattern: str) -> str:
        for title, body in named.items():
            if re.search(pattern, title):
                paragraph = short_paragraph(body)
                if paragraph and "==" not in paragraph:
                    return paragraph
        return ""

    return intro, find(r"distribution|range|habitat|occurrence"), find(r"biology|ecology|behavio[u]?r|feeding|diet|reproduction")


def main() -> None:
    candidates = {row["scientific"]: row for row in json.loads(CANDIDATES.read_text())}
    downloaded = json.loads(REVIEW.read_text())
    existing = json.loads(OUTPUT.read_text())
    known = {row["scientific"] for row in existing}
    source_text = {}
    requested = [candidates[row["scientific"]] for row in downloaded if row["scientific"] not in EXCLUDE]
    # MediaWiki limits whole-article extracts to one page per request.
    for start in range(0, len(requested)):
        batch = requested[start : start + 1]
        try:
            data = get(action="query", format="json", prop="extracts", explaintext="1", titles=batch[0]["wikipediaTitle"])
            for page in data.get("query", {}).get("pages", {}).values():
                source_text[page["title"]] = page.get("extract", "")
            time.sleep(0.6)
        except urllib.error.HTTPError as error:
            print(f"Wikipedia HTTP {error.code}; keeping already verified introductory text", flush=True)
            break

    added = []
    updated = []
    by_scientific = {row["scientific"]: row for row in existing}
    MEDIA.mkdir(parents=True, exist_ok=True)
    for item in downloaded:
        scientific = item["scientific"]
        if scientific in EXCLUDE:
            continue
        row = candidates[scientific]
        intro, distribution, behavior = sections(source_text.get(row["wikipediaTitle"]) or row["intro"])
        if scientific in known:
            entry = by_scientific[scientific]
            for field, value in (("intro", intro), ("distribution", distribution), ("behavior", behavior)):
                if value and not entry[field]:
                    entry[field] = value
            updated.append(scientific)
            continue
        photo = next((p for p in row["photos"] if p["eligible"] and p["fileTitle"] == item["fileTitle"]), None)
        if not photo:
            continue
        source = Path(item["path"])
        with Image.open(source) as image:
            if image.format not in ("JPEG", "PNG", "WEBP") or min(image.size) < 300:
                continue
        target = MEDIA / source.name
        if not target.exists():
            shutil.copy2(source, target)
        entry = {
            "id": "wm-" + scientific.lower().replace(" ", "-"),
            "gbifKey": row["gbifKey"], "scientific": scientific, "name": row["name"],
            "family": row["family"], "water": "freshwater" if row["group"] == "淡水" else "marine",
            "wikipediaUrl": row["wikipediaUrl"],
            "wikidataUrl": "https://www.wikidata.org/wiki/" + row["wikidataId"],
            "intro": intro, "distribution": distribution, "behavior": behavior,
            "photo": {
                "path": "/media/wikimedia/" + target.name,
                "author": photo["author"], "license": photo["license"],
                "licenseUrl": photo["licenseUrl"], "pageUrl": photo["pageUrl"],
                "caption": photo["caption"],
            },
        }
        existing.append(entry)
        known.add(scientific)
        added.append(scientific)
    existing.sort(key=lambda row: row["scientific"].casefold())
    OUTPUT.write_text(json.dumps(existing, ensure_ascii=False, indent=2) + "\n")
    print(f"Added {len(added)} common fish photos; refreshed source text for {len(updated)}; total photo profiles {len(existing)}")
    print("Added:", ", ".join(added))


if __name__ == "__main__":
    main()
