"""Build a compact, attributed GBIF Backbone taxonomy snapshot for browsing.

The import only publishes taxonomic fields supplied by GBIF. It never infers
aquarium suitability or husbandry values from a family or genus.
"""

from __future__ import annotations

import json
import csv
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import Counter
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATASET = "d7dddbf4-2cf0-4f39-9b2a-bb099caae36c"
API = "https://api.gbif.org/v1/"
FAMILIES = [
    "Characidae", "Cichlidae", "Cyprinidae", "Danionidae", "Poeciliidae",
    "Osphronemidae", "Loricariidae", "Callichthyidae", "Gobiidae",
    "Pomacentridae", "Acanthuridae", "Labridae", "Apogonidae",
    "Serranidae", "Tetraodontidae", "Syngnathidae", "Cobitidae",
    "Cyprinodontidae", "Blenniidae", "Chaetodontidae",
]
TARGET_BASE = 3500
PER_FAMILY = 240
PAGE_SIZE = 500
NAME = re.compile(r"^[A-Z][a-z-]+ [a-z][a-z-]+$")


def get(path: str, **params):
    url = API + path + "?" + urllib.parse.urlencode(params)
    for attempt in range(4):
        try:
            with urllib.request.urlopen(
                urllib.request.Request(url, headers={"User-Agent": "FishAtlas/0.3 taxonomy-import (GBIF API)"}),
                timeout=35,
            ) as response:
                return json.load(response)
        except (urllib.error.URLError, TimeoutError):
            if attempt == 3:
                raise
            time.sleep(2**attempt)


def family_key(family: str) -> int:
    result = get("species/search", q=family, rank="FAMILY", datasetKey=DATASET, limit=20)
    exact = [row for row in result["results"] if row.get("canonicalName") == family and row.get("family") == family]
    if not exact:
        raise ValueError(f"GBIF family not found: {family}")
    return exact[0]["key"]


def priority_keys(selected: list[dict], curated_genera: set[str]) -> set[int]:
    """Select a varied review set; never claim that candidates are aquarium-safe."""
    picked: set[int] = set()
    genus_counts: Counter[str] = Counter()

    def add(row: dict, genus_cap: int) -> bool:
        if row["key"] in picked or genus_counts[row["genus"]] >= genus_cap:
            return False
        picked.add(row["key"])
        genus_counts[row["genus"]] += 1
        return True

    # Related genera are convenient to review using the existing profiles.
    for row in sorted(selected, key=lambda item: (not bool(item["vernacular"]), item["scientific"])):
        if row["genus"] in curated_genera:
            add(row, 6)
            if len(picked) == 267:
                return picked

    # Spread remaining work across families and genera instead of taking
    # the first 267 alphabetical names (which clusters similar species).
    groups = {
        family: sorted((row for row in selected if row["family"] == family), key=lambda item: (not bool(item["vernacular"]), item["scientific"]))
        for family in FAMILIES
    }
    while len(picked) < 267:
        progressed = False
        for family in FAMILIES:
            for row in groups[family]:
                if add(row, 4):
                    progressed = True
                    break
            if len(picked) == 267:
                return picked
        if not progressed:
            break
    for row in sorted(selected, key=lambda item: item["scientific"]):
        add(row, 999)
        if len(picked) == 267:
            return picked
    raise RuntimeError("Not enough distinct review candidates")


def write_review_queue(catalog: list[dict]) -> None:
    path = ROOT / "docs/catalog-review-queue.csv"
    rows = sorted(
        (row for row in catalog if row["reviewCandidate"]),
        key=lambda row: (not bool(row.get("curatedId")), row["family"], row["scientific"]),
    )
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=["stage", "scientific", "family", "gbif_key", "profile_id", "gbif_url"])
        writer.writeheader()
        for row in rows:
            writer.writerow({
                "stage": "full-profile" if row.get("curatedId") else "taxonomy-candidate",
                "scientific": row["scientific"],
                "family": row["family"],
                "gbif_key": row["key"],
                "profile_id": row.get("curatedId", ""),
                "gbif_url": f"https://www.gbif.org/species/{row['key']}",
            })


def main():
    dataset = get(f"dataset/{DATASET}")
    if dataset.get("license") not in {
        "CC_BY_4_0", "CC BY 4.0",
        "http://creativecommons.org/licenses/by/4.0/legalcode",
        "https://creativecommons.org/licenses/by/4.0/",
    }:
        raise RuntimeError(f"Unexpected GBIF Backbone license: {dataset.get('license')}")
    species = json.loads((ROOT / "content/species.json").read_text())
    geography = json.loads((ROOT / "content/enrichment/geography.json").read_text())
    curated_keys = {g["key"]: fish["id"] for fish in species if (g := geography.get(fish["id"])) and g.get("key")}
    curated_names = {name.casefold() for fish in species for name in [fish["scientific"], geography.get(fish["id"], {}).get("acceptedName", "")]}
    curated_genera = {fish["scientific"].split()[0] for fish in species}
    records: dict[int, dict] = {}
    family_counts = {}
    for family in FAMILIES:
        key = family_key(family)
        offset = 0
        accepted = 0
        while accepted < PER_FAMILY:
            result = get("species/search", higherTaxonKey=key, rank="SPECIES", datasetKey=DATASET, limit=PAGE_SIZE, offset=offset)
            page = result.get("results", [])
            if not page:
                break
            for row in page:
                canonical = row.get("canonicalName", "")
                gbif_key = row.get("key")
                if (
                    row.get("taxonomicStatus") != "ACCEPTED"
                    or row.get("rank") != "SPECIES"
                    or row.get("family") != family
                    or row.get("kingdom") != "Animalia"
                    or row.get("phylum") != "Chordata"
                    or not NAME.fullmatch(canonical)
                    or not isinstance(gbif_key, int)
                    or gbif_key in curated_keys
                    or canonical.casefold() in curated_names
                    or gbif_key in records
                ):
                    continue
                habitats = sorted(set(row.get("habitats") or []) & {"FRESHWATER", "MARINE", "BRACKISH"})
                records[gbif_key] = {
                    "key": gbif_key,
                    "scientific": canonical,
                    "family": family,
                    "genus": row.get("genus") or canonical.split()[0],
                    "habitats": habitats,
                    "vernacular": next(
                        (v["vernacularName"] for v in row.get("vernacularNames", []) if v.get("language") == "eng" and v.get("vernacularName")),
                        "",
                    ),
                }
                accepted += 1
                if accepted >= PER_FAMILY:
                    break
            offset += len(page)
            if result.get("endOfRecords"):
                break
        family_counts[family] = accepted
        print(f"{family}: {accepted} accepted species", flush=True)
    if len(records) < TARGET_BASE:
        raise RuntimeError(f"Only {len(records)} new species; refusing to publish an undersized snapshot")
    # Round-robin selected families so large families cannot crowd out small ones.
    groups = {family: sorted((r for r in records.values() if r["family"] == family), key=lambda r: r["scientific"]) for family in FAMILIES}
    selected = []
    for index in range(PER_FAMILY):
        for family in FAMILIES:
            if index < len(groups[family]):
                selected.append(groups[family][index])
                if len(selected) >= TARGET_BASE:
                    break
        if len(selected) >= TARGET_BASE:
            break
    selected.sort(key=lambda row: row["scientific"].casefold())
    # This is a work queue, not a claim that these are aquarium fish.
    selected_priority_keys = priority_keys(selected, curated_genera)
    for row in selected:
        row["reviewCandidate"] = row["key"] in selected_priority_keys
    curated = []
    for fish in species:
        geo = geography.get(fish["id"], {})
        curated.append({
            "key": geo.get("key") or -len(curated) - 1,
            "scientific": fish["scientific"],
            "family": geo.get("family") or fish["family"],
            "genus": fish["scientific"].split()[0],
            "habitats": ["MARINE" if fish.get("water", "freshwater") == "marine" else "FRESHWATER"],
            "vernacular": "",
            "curatedId": fish["id"],
            "reviewCandidate": True,
        })
    catalog = sorted(curated + selected, key=lambda row: row["scientific"].casefold())
    keys = [row["key"] for row in catalog]
    if len(keys) != len(set(keys)):
        raise RuntimeError("Duplicate GBIF keys in catalog")
    (ROOT / "content/catalog.json").write_text(json.dumps(catalog, ensure_ascii=False, separators=(",", ":")) + "\n")
    manifest = {
        "generatedAt": date.today().isoformat(),
        "source": "GBIF Backbone Taxonomy",
        "datasetKey": DATASET,
        "datasetUrl": f"https://www.gbif.org/dataset/{DATASET}",
        "license": "CC BY 4.0",
        "licenseUrl": "https://creativecommons.org/licenses/by/4.0/",
        "api": "https://api.gbif.org/v1/species/search",
        "method": "Accepted species within 20 selected fish families; 240 per family cap, then round-robin to 3,500. Existing curated profiles merged by key/name. This is taxonomy, not an aquarium suitability list.",
        "curatedProfiles": len(curated),
        "basicEntries": len(selected),
        "totalEntries": len(catalog),
        "reviewQueue": len(selected_priority_keys) + len(curated),
        "reviewMethod": "33 existing profiles plus 267 taxonomy candidates: related genera first (cap 6 per genus), then round-robin across families (cap 4 per genus), favouring available English names. Editorial work queue, not an aquarium suitability claim.",
        "families": dict(Counter(row["family"] for row in catalog)),
        "fetchedAcceptedByFamily": family_counts,
    }
    (ROOT / "content/catalog-manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
    write_review_queue(catalog)
    print(f"Wrote {len(catalog)} entries, {len(selected_priority_keys) + len(curated)} review candidates")


if __name__ == "__main__":
    main()
