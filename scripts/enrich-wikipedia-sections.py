"""Fill only explicitly named Wikipedia distribution and biology sections.

The Wikimedia extracts API allows a batch of introductions, but whole-article
extracts are limited to one page per request. Keep this separate and serial.
"""

from __future__ import annotations

import json
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "content/photo-profiles.json"
USER_AGENT = "FishAtlas/0.4 (local educational atlas; source and license review)"


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
    parts = re.split(r"\n\s*={2,3}\s*([^=\n]+?)\s*={2,3}\s*\n", extract)
    intro = short_paragraph(parts[0])
    titled = {parts[i].strip().lower(): parts[i + 1] for i in range(1, len(parts) - 1, 2)}

    def find(pattern: str) -> str:
        for title, body in titled.items():
            if re.search(pattern, title):
                return short_paragraph(body)
        return ""

    return (
        intro,
        find(r"distribution|range|habitat|occurrence"),
        find(r"biology|ecology|behavio[u]?r|feeding|diet|reproduction"),
    )


def main() -> None:
    profiles = json.loads(OUTPUT.read_text())
    for index, profile in enumerate(profiles):
        params = urllib.parse.urlencode(
            {
                "action": "query",
                "format": "json",
                "prop": "extracts",
                "explaintext": "1",
                "titles": profile["scientific"],
                "redirects": "1",
            }
        )
        request = urllib.request.Request(
            "https://en.wikipedia.org/w/api.php?" + params,
            headers={"User-Agent": USER_AGENT},
        )
        try:
            with urllib.request.urlopen(request, timeout=45) as response:
                data = json.load(response)
            page = next(iter(data.get("query", {}).get("pages", {}).values()), {})
            intro, distribution, behavior = sections(page.get("extract", ""))
            if intro:
                profile["intro"] = intro
            if distribution:
                profile["distribution"] = distribution
            if behavior:
                profile["behavior"] = behavior
            OUTPUT.write_text(json.dumps(profiles, ensure_ascii=False, indent=2) + "\n")
        except urllib.error.HTTPError as error:
            if error.code == 429:
                print("Wikipedia returned HTTP 429; stopped section retrieval without retrying.")
                break
            print(f"Skipped {profile['scientific']}: {error}")
        except (urllib.error.URLError, OSError) as error:
            print(f"Skipped {profile['scientific']}: {error}")
        if index < len(profiles) - 1:
            time.sleep(1.5)
    print(
        f"Enriched {len(profiles)} profiles: "
        f"{sum(bool(p['intro']) for p in profiles)} introductions, "
        f"{sum(bool(p['distribution']) for p in profiles)} distribution sections, "
        f"{sum(bool(p['behavior']) for p in profiles)} behavior sections."
    )


if __name__ == "__main__":
    main()
