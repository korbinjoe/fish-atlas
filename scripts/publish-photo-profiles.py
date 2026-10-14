"""Publish reviewed, photo-backed Wikimedia candidates without inventing care data.

Run discover-wikimedia.py first. This script uses its saved source metadata,
fetches short Wikipedia excerpts, checks downloaded image files, and adds only
records that pass the conservative review rules below.
"""

from __future__ import annotations

import io
import json
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
CANDIDATES = ROOT / "content/research/wikimedia-candidates.json"
OUTPUT = ROOT / "content/photo-profiles.json"
MEDIA = ROOT / "public/media/wikimedia"
USER_AGENT = "FishAtlas/0.4 (local educational atlas; source and license review)"

# Reviewed false positives or files that do not show one identifiable living fish.
EXCLUDE = {
    "Aethaloperca rogaa",  # The named fish is in the background.
    "Auriglobus amabilis",  # Distribution map, not a fish photograph.
    "Auriglobus nefastus",  # Distribution map.
    "Auriglobus remotus",  # Distribution map, not a fish photograph.
    "Chelmonops curiosus",  # Description names a king wrasse.
    "Cheilinus abudjubbe",  # Two species in one photograph.
    "Luciocephalus aura",  # Distribution map.
    "Macropodus ocellatus",  # Fish is too small to identify in this frame.
    "Naso caeruleacauda",  # Caption is only a third-party link.
    "Trichopsis vittata",  # Figure rather than a field photograph.
}


def get_json(base: str, params: dict[str, str]) -> dict:
    url = base + "?" + urllib.parse.urlencode(params)
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=50) as response:
        return json.load(response)


def allowed(row: dict) -> bool:
    photo = row.get("photo", {})
    license_name = photo.get("license", "")
    return (
        row["scientific"] not in EXCLUDE
        and bool(re.fullmatch(r"CC BY(?:-SA)? [0-9.]+(?: de)?|CC0", license_name))
        and bool(photo.get("licenseUrl") and photo.get("author") and photo.get("candidateUrl"))
        and photo.get("width", 0) >= 500
        and photo.get("height", 0) >= 300
        and row["fileTitle"].lower().endswith((".jpg", ".jpeg", ".png", ".webp"))
        and "map" not in photo.get("caption", "").lower()
    )


def short_paragraph(text: str, limit: int = 330) -> str:
    paragraph = re.split(r"\n\s*\n", text.strip())[0].replace("\n", " ").strip()
    if len(paragraph) <= limit:
        return paragraph
    # Preserve a complete sentence if possible; never add made-up claims.
    sentences = re.findall(r"[^.!?]*[.!?](?:\s|$)", paragraph)
    output = ""
    for sentence in sentences:
        if len(output) + len(sentence) > limit:
            break
        output += sentence
    return output.strip()


def excerpt_sections(extract: str) -> tuple[str, str, str]:
    parts = re.split(r"\n\s*={2,3}\s*([^=\n]+?)\s*={2,3}\s*\n", extract)
    intro = short_paragraph(parts[0])
    sections = {parts[i].strip().lower(): parts[i + 1] for i in range(1, len(parts) - 1, 2)}

    def section(pattern: str) -> str:
        for title, body in sections.items():
            if re.search(pattern, title):
                return short_paragraph(body)
        return ""

    distribution = section(r"distribution|range|habitat|occurrence")
    behavior = section(r"biology|ecology|behavio[u]?r|feeding|diet|reproduction")
    return intro, distribution, behavior


def main() -> None:
    candidates = [row for row in json.loads(CANDIDATES.read_text()) if allowed(row)]
    catalog = {row["key"]: row for row in json.loads((ROOT / "content/catalog.json").read_text())}
    extracts: dict[str, str] = {}
    for start in range(0, len(candidates), 20):
        batch = candidates[start : start + 20]
        data = get_json(
            "https://en.wikipedia.org/w/api.php",
            {
                "action": "query",
                "format": "json",
                "prop": "extracts",
                "explaintext": "1",
                "exintro": "1",
                "exlimit": "max",
                "titles": "|".join(row["wikipediaTitle"] for row in batch),
            },
        )
        for page in data.get("query", {}).get("pages", {}).values():
            extracts[page["title"]] = page.get("extract", "")
        time.sleep(1)

    MEDIA.mkdir(parents=True, exist_ok=True)
    profiles: list[dict] = json.loads(OUTPUT.read_text()) if OUTPUT.exists() else []
    known_scientific = {profile["scientific"].casefold() for profile in profiles}
    initial_count = len(profiles)
    failures: list[str] = []
    for row in candidates:
        scientific = row["scientific"]
        if scientific.casefold() in known_scientific:
            continue  # Preserve earlier photographs, source excerpts and review.
        catalog_row = catalog.get(row["gbifKey"])
        if not catalog_row or catalog_row["scientific"].lower() != scientific.lower():
            failures.append(scientific + ": GBIF catalog mismatch")
            continue
        photo = row["photo"]
        suffix = Path(row["fileTitle"]).suffix.lower()
        path = MEDIA / (scientific.lower().replace(" ", "-") + suffix)
        try:
            if not path.exists():
                request = urllib.request.Request(
                    photo["candidateUrl"], headers={"User-Agent": USER_AGENT}
                )
                with urllib.request.urlopen(request, timeout=45) as response:
                    image_bytes = response.read()
                with Image.open(io.BytesIO(image_bytes)) as image:
                    image.verify()
                path.write_bytes(image_bytes)
                time.sleep(0.8)
            with Image.open(path) as image:
                if image.format not in ("JPEG", "PNG", "WEBP") or min(image.size) < 300:
                    raise ValueError("image format or size failed")
        except urllib.error.HTTPError as error:
            if error.code == 429:
                print("Commons returned HTTP 429; stopped further downloads without retrying.")
                break
            failures.append(scientific + ": " + str(error))
            continue
        except (urllib.error.URLError, OSError, ValueError) as error:
            failures.append(scientific + ": " + str(error))
            continue

        intro, distribution, behavior = excerpt_sections(extracts.get(row["wikipediaTitle"], ""))
        habitats = catalog_row["habitats"]
        water = (
            {"FRESHWATER": "freshwater", "MARINE": "marine", "BRACKISH": "brackish"}.get(habitats[0])
            if len(habitats) == 1 else None
        )
        profiles.append(
            {
                "id": "wm-" + scientific.lower().replace(" ", "-"),
                "gbifKey": row["gbifKey"],
                "scientific": scientific,
                "name": row["chineseName"] if row["chineseName"] and row["chineseName"].lower() != scientific.lower() else catalog_row["vernacular"] or scientific,
                "family": row["family"],
                "water": water,
                "wikipediaUrl": row["wikipediaUrl"],
                "wikidataUrl": "https://www.wikidata.org/wiki/" + row["wikidataId"],
                "intro": intro,
                "distribution": distribution,
                "behavior": behavior,
                "photo": {
                    "path": "/media/wikimedia/" + path.name,
                    "author": photo["author"],
                    "license": photo["license"],
                    "licenseUrl": photo["licenseUrl"],
                    "pageUrl": photo["pageUrl"],
                    "caption": photo["caption"],
                },
            }
        )
        known_scientific.add(scientific.casefold())
        # Incremental write keeps successfully vetted entries if a later source fails.
        OUTPUT.write_text(json.dumps(profiles, ensure_ascii=False, indent=2) + "\n")

    print(f"Added {len(profiles) - initial_count} photo-backed profiles; preserved {initial_count}; total {len(profiles)}.")
    print(f"Intro: {sum(bool(p['intro']) for p in profiles)}; distribution: {sum(bool(p['distribution']) for p in profiles)}; behavior: {sum(bool(p['behavior']) for p in profiles)}.")
    if failures:
        print("Skipped downloads or mismatches:")
        for failure in failures:
            print(" - " + failure)


if __name__ == "__main__":
    main()
