"""Publish three manually verified Commons alternatives after API rate limiting.

Their Commons file pages identify the fish, author and license. The locally
downloaded alternatives were inspected in alternative-contact-sheet.jpg.
"""

import json
import shutil
from pathlib import Path
from urllib.parse import quote

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
REVIEW = ROOT / "content/research/common-photo-review"
OUTPUT = ROOT / "content/photo-profiles.json"
MEDIA = ROOT / "public/media/wikimedia"
CANDIDATES = {row["scientific"]: row for row in json.loads((ROOT / "content/research/common-photo-candidates.json").read_text())}
CATALOG = {row["scientific"]: row for row in json.loads((ROOT / "content/catalog.json").read_text())}
NAMES = json.loads((ROOT / "content/common-priority.json").read_text())
FILES = {
    "Danio rerio": {
        "file": "Danio rerio.JPG", "author": "Pogrebnoj-Alexandroff (Commons: Cherus)",
        "license": "CC BY-SA 3.0", "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0/",
        "caption": "Danio rerio (zebra danio)",
    },
    "Puntius titteya": {
        "file": "Cherry barb, Puntius titteya.jpg", "author": "Brian Gratwicke",
        "license": "CC BY 2.0", "licenseUrl": "https://creativecommons.org/licenses/by/2.0/",
        "caption": "Cherry barb (Puntius titteya)",
    },
    "Tanichthys albonubes": {
        "file": "White Cloud Mountain Minnow (Tanichthys albonubes).jpg",
        "author": "Nicklas Iversen (Corydoras-adolfoi); color adjustment: Togabi",
        "license": "CC BY-SA 4.0", "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0/",
        "caption": "White Cloud Mountain Minnow (Tanichthys albonubes), female",
    },
    "Puntigrus tetrazona": {
        "file": "Tigerbarbe Puntius tetrazona.jpg", "author": "Malene Thyssen",
        "license": "CC BY-SA 3.0", "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0/",
        "caption": "Tiger barb (Puntius tetrazona; accepted as Puntigrus tetrazona)",
        "wikipediaTitle": "Tiger barb", "wikidataId": "Q729207",
        "intro": "The tiger barb or Sumatra barb (Puntigrus tetrazona), is a species of tropical cyprinid fish.",
        "water": "freshwater",
    },
    "Centropyge loriculus": {
        "file": "Flame angelfish (Centropyge loricula).jpg", "author": "Andreas März",
        "license": "CC BY 2.0", "licenseUrl": "https://creativecommons.org/licenses/by/2.0/",
        "caption": "Flame angelfish (Centropyge loricula; accepted as Centropyge loriculus)",
        "wikipediaTitle": "Flame angelfish", "wikidataId": "Q1426988",
        "intro": "The flame angelfish (Centropyge loricula) is a marine angelfish of the family Pomacanthidae found in tropical waters of the Pacific Ocean.",
        "water": "marine",
    },
    "Valenciennea puellaris": {
        "file": "Maiden goby (Valenciennea puellaris).jpg", "author": "Rickard Zerpe",
        "license": "CC BY 2.0", "licenseUrl": "https://creativecommons.org/licenses/by/2.0/",
        "caption": "Maiden goby (Valenciennea puellaris)",
        "water": "marine",
    },
    "Corydoras splendens": {
        "file": "Brochis splendens NonstickRon.jpg", "author": "NonstickRon",
        "license": "CC BY-SA 2.0", "licenseUrl": "https://creativecommons.org/licenses/by-sa/2.0/",
        "caption": "Emerald catfish (Brochis splendens; GBIF accepts Corydoras splendens)",
        "wikipediaTitle": "Emerald catfish", "wikidataId": "Q1697113",
        "intro": "The emerald catfish (Brochis splendens) is a species of freshwater ray-finned fish belonging to the family Callichthyidae. It is found in the Amazon Basin in South America.",
        "water": "freshwater",
    },
    "Amphiprion percula": {
        "file": "A. percula.jpg", "author": "CrisisRose",
        "license": "CC BY-SA 3.0", "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0/",
        "caption": "True percula clownfish (Amphiprion percula); source describes distinguishing black bands and orange eyes",
        "water": "marine", "reviewSuffix": ".jpg",
    },
    "Macrotocinclus affinis": {
        "file": "Macrotocinclus affinis resting.jpg", "author": "Cisamarc",
        "license": "CC BY-SA 3.0", "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0/",
        "caption": "Macrotocinclus affinis resting on a leaf (older name: Otocinclus affinis)",
        "wikipediaTitle": "Otocinclus affinis", "wikidataId": "Q948883",
        "intro": "Otocinclus affinis, the golden otocinclus, is a species of freshwater ray-finned fish belonging to the family Loricariidae.",
        "water": "freshwater",
    },
    "Crossocheilus oblongus": {
        "file": "Crossocheilus Oblongus (1).jpg", "author": "aleander2137",
        "license": "CC BY-SA 4.0", "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0/",
        "caption": "Siamese algae-eater (Crossocheilus oblongus) swimming",
        "water": "freshwater",
    },
}


def short_intro(value: str, limit: int = 330) -> str:
    import re
    paragraph = re.split(r"\n\s*\n", value.strip())[0].replace("\n", " ")
    sentences = re.findall(r"[^.!?]*[.!?](?:\s|$)", paragraph)
    result = ""
    for sentence in sentences:
        if len(result) + len(sentence) > limit:
            break
        result += sentence
    return result.strip() or paragraph[:limit].strip()


def main():
    profiles = json.loads(OUTPUT.read_text())
    known = {row["scientific"] for row in profiles}
    MEDIA.mkdir(parents=True, exist_ok=True)
    added = []
    for scientific, photo in FILES.items():
        if scientific in known:
            continue
        candidate = CANDIDATES.get(scientific)
        catalog = CATALOG[scientific]
        filename = scientific.lower().replace(" ", "-") + photo.get("reviewSuffix", "-alternative.jpg")
        source = REVIEW / filename
        with Image.open(source) as image:
            if image.format != "JPEG" or min(image.size) < 300:
                raise ValueError(f"Invalid reviewed photo: {scientific}")
        target = MEDIA / (scientific.lower().replace(" ", "-") + ".jpg")
        if not target.exists():
            shutil.copy2(source, target)
        profiles.append({
            "id": "wm-" + scientific.lower().replace(" ", "-"),
            "gbifKey": catalog["key"], "scientific": scientific,
            "name": NAMES[scientific]["name"], "family": catalog["family"],
            "water": photo.get("water", "freshwater"),
            "wikipediaUrl": candidate["wikipediaUrl"] if candidate else "https://en.wikipedia.org/wiki/" + quote(photo["wikipediaTitle"].replace(" ", "_")),
            "wikidataUrl": "https://www.wikidata.org/wiki/" + (candidate["wikidataId"] if candidate else photo["wikidataId"]),
            "intro": short_intro(candidate["intro"] if candidate else photo["intro"]),
            "distribution": "", "behavior": "",
            "photo": {
                "path": "/media/wikimedia/" + target.name,
                "author": photo["author"], "license": photo["license"],
                "licenseUrl": photo["licenseUrl"],
                "pageUrl": "https://commons.wikimedia.org/wiki/File:" + quote(photo["file"].replace(" ", "_")),
                "caption": photo["caption"],
            },
        })
        added.append(scientific)
    profiles.sort(key=lambda row: row["scientific"].casefold())
    OUTPUT.write_text(json.dumps(profiles, ensure_ascii=False, indent=2) + "\n")
    print(f"Published {len(added)} verified alternative photos: {', '.join(added)}")


if __name__ == "__main__":
    main()
