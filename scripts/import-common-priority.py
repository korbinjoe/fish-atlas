"""Add missing common aquarium fish as attributed GBIF taxonomy records.

The species checklist lives in audit-common-fish.py. No husbandry value is
inferred here. A mismatched or uncertain GBIF result is skipped for review.
"""

from __future__ import annotations

import csv
import json
import runpy
import urllib.parse
import urllib.request
from collections import Counter
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / "content/catalog.json"
MANIFEST = ROOT / "content/catalog-manifest.json"
QUEUE = ROOT / "docs/catalog-review-queue.csv"
MATCHES = ROOT / "content/research/common-gbif-matches.json"
API = "https://api.gbif.org/v1/"
AGENT = "FishAtlas/0.5 (local educational atlas; taxonomy and media attribution)"
COMMON = runpy.run_path(str(ROOT / "scripts/audit-common-fish.py"))["COMMON"]


def get(path: str, **params) -> dict:
    url = API + path + ("?" + urllib.parse.urlencode(params) if params else "")
    request = urllib.request.Request(url, headers={"User-Agent": AGENT})
    with urllib.request.urlopen(request, timeout=35) as response:
        return json.load(response)


def verified(scientific: str, match: dict, details: dict) -> bool:
    return (
        match.get("matchType") == "EXACT"
        and match.get("confidence", 0) >= 95
        and match.get("canonicalName", "").casefold() == scientific.casefold()
        and match.get("rank") == "SPECIES"
        and match.get("status") == "ACCEPTED"
        and details.get("canonicalName", "").casefold() == scientific.casefold()
        and details.get("taxonomicStatus") == "ACCEPTED"
        and details.get("kingdom") == "Animalia"
        and details.get("phylum") == "Chordata"
        and isinstance(details.get("key"), int)
    )


def main() -> None:
    catalog = json.loads(CATALOG.read_text(encoding="utf-8"))
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    by_name = {entry["scientific"].casefold(): entry for entry in catalog}
    by_key = {entry["key"]: entry for entry in catalog}
    reviewed = {
        row["requested"]: row
        for row in (json.loads(MATCHES.read_text(encoding="utf-8")) if MATCHES.exists() else [])
    }
    added = []
    skipped = []

    for group, fish in COMMON.items():
        for name, scientific in fish:
            if scientific.casefold() in by_name:
                by_name[scientific.casefold()]["reviewCandidate"] = True
                continue
            print(f"GBIF: {scientific}", flush=True)
            match = get("species/match", name=scientific, strict="true")
            key = match.get("usageKey")
            details = get(f"species/{key}") if isinstance(key, int) else {}
            reviewed[scientific] = {"name": name, "requested": scientific, "group": group, "match": match, "details": details}
            if not verified(scientific, match, details):
                skipped.append(scientific + ": uncertain GBIF match")
                continue
            if key in by_key:
                # A different canonical name at this key needs manual synonym review.
                skipped.append(scientific + ": key already used by " + by_key[key]["scientific"])
                continue
            habitats = sorted(set(details.get("habitats") or []) & {"FRESHWATER", "MARINE", "BRACKISH"})
            row = {
                "key": key,
                "scientific": scientific,
                "family": details["family"],
                "genus": details["genus"],
                "habitats": habitats,
                "vernacular": details.get("vernacularName") or "",
                "reviewCandidate": True,
            }
            catalog.append(row)
            by_name[scientific.casefold()] = row
            by_key[key] = row
            added.append(scientific)

    # Recognized older trade names remain discoverability work, not duplicate taxa.
    existing_aliases = {"Otocinclus affinis": "Macrotocinclus affinis"}
    for current in existing_aliases.values():
        if current.casefold() in by_name:
            by_name[current.casefold()]["reviewCandidate"] = True

    catalog.sort(key=lambda row: row["scientific"].casefold())
    manifest["generatedAt"] = date.today().isoformat()
    method_note = " Common aquarium priority taxa added by exact GBIF species match."
    if method_note not in manifest["method"]:
        manifest["method"] += method_note
    manifest["basicEntries"] = sum("curatedId" not in row for row in catalog)
    manifest["totalEntries"] = len(catalog)
    manifest["reviewQueue"] = sum(row["reviewCandidate"] for row in catalog)
    manifest["families"] = dict(sorted(Counter(row["family"] for row in catalog).items()))
    manifest["commonPriorityTargets"] = sum(len(fish) for fish in COMMON.values())
    manifest["commonPriorityTaxaAdded"] = manifest.get("commonPriorityTaxaAdded", 0) + len(added)
    review_note = " All represented common aquarium checklist species are review candidates."
    if review_note not in manifest["reviewMethod"]:
        manifest["reviewMethod"] += review_note

    with QUEUE.open("w", encoding="utf-8", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=["stage", "scientific", "family", "gbif_key", "profile_id", "gbif_url"])
        writer.writeheader()
        for row in sorted((entry for entry in catalog if entry["reviewCandidate"]), key=lambda row: ("curatedId" not in row, row["family"], row["scientific"])):
            writer.writerow({
                "stage": "full-profile" if "curatedId" in row else "taxonomy-candidate",
                "scientific": row["scientific"],
                "family": row["family"],
                "gbif_key": row["key"],
                "profile_id": row.get("curatedId", ""),
                "gbif_url": f"https://www.gbif.org/species/{row['key']}",
            })
    MATCHES.write_text(json.dumps(list(reviewed.values()), ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    CATALOG.write_text(json.dumps(catalog, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Added {len(added)} priority taxa; catalog now {len(catalog)} records; skipped {len(skipped)}.")
    for reason in skipped:
        print("SKIP", reason)


if __name__ == "__main__":
    main()
