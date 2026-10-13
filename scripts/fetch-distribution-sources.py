"""Cache attributable Wikipedia distribution passages for editorial review.

This never infers a native range from observations, countries, or taxonomy and
never publishes locations automatically. Existing cached pages are reused.
"""
from __future__ import annotations

import argparse
import datetime
import json
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "content/research/distribution-sources.json"
USER_AGENT = "FishAtlas/0.5 (local educational atlas; attributed Wikipedia range review)"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=1000)
    args = parser.parse_args()
    fish = json.loads((ROOT / "content/species.json").read_text()) + json.loads((ROOT / "content/photo-profiles.json").read_text())
    sources = json.loads(OUTPUT.read_text()) if OUTPUT.exists() else {}
    count = 0
    for item in fish:
        if item["id"] in sources or count >= args.limit:
            continue
        params = urllib.parse.urlencode({"action": "query", "format": "json", "prop": "extracts|info|revisions", "explaintext": "1", "redirects": "1", "inprop": "url", "rvprop": "ids|timestamp", "titles": item["scientific"]})
        request = urllib.request.Request("https://en.wikipedia.org/w/api.php?" + params, headers={"User-Agent": USER_AGENT})
        try:
            with urllib.request.urlopen(request, timeout=35) as response:
                page = next(iter(json.load(response).get("query", {}).get("pages", {}).values()), {})
            text = page.get("extract", "")
            parts = re.split(r"\n\s*={2,4}\s*([^=\n]+?)\s*={2,4}\s*\n", text)
            sections = [{"heading": parts[i].strip(), "text": parts[i + 1].strip()} for i in range(1, len(parts) - 1, 2)]
            # Native range can be in a lead paragraph or under nested Range /
            # Description headings in very short articles. Keep short articles
            # intact for review; omit unrelated long biology sections.
            relevant = [section for section in sections if re.search(r"distribution|range|habitat|geograph|occurrence|natural history|origin", section["heading"], re.I)]
            sources[item["id"]] = {
                "scientific": item["scientific"], "title": page.get("title", item["scientific"]),
                "url": page.get("fullurl", "https://en.wikipedia.org/wiki/" + urllib.parse.quote(item["scientific"].replace(" ", "_"))),
                "revision": page.get("revisions", [{}])[0].get("revid"),
                "fetchedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                "license": "CC BY-SA 4.0", "intro": parts[0].strip(),
                "sections": relevant, "shortArticle": text if len(text) < 4500 else "",
            }
            OUTPUT.parent.mkdir(parents=True, exist_ok=True)
            OUTPUT.write_text(json.dumps(sources, ensure_ascii=False, indent=2) + "\n")
            count += 1
            print(f"{len(sources)}/{len(fish)} {item['scientific']} ({len(text)} chars)", flush=True)
        except urllib.error.HTTPError as error:
            print(f"HTTP {error.code}: {item['scientific']}", flush=True)
            if error.code == 429:
                break
        except (urllib.error.URLError, OSError) as error:
            print(f"Skipped {item['scientific']}: {error}", flush=True)
        time.sleep(0.65)
    print(f"Cached {len(sources)} species; no distribution assignments were made.", flush=True)


if __name__ == "__main__":
    main()
