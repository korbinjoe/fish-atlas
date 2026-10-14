"""Incrementally publish visually reviewed regional fish batches.

The research batch contains catalog, profiles, distributions, waterbodies and
optional distributionPatches. All photos and native-waterbody evidence must be
reviewed before running this command. Existing profiles are never replaced.
Run with --dry-run first; npm run build and the geography check remain required.
"""
from __future__ import annotations

import argparse
import json
import re
import runpy
from collections import Counter
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LICENSE = re.compile(r"CC BY(?:-SA)? [\d.]+(?: de)?|CC0|Public domain")


def read(path: Path):
    return json.loads(path.read_text())


def write(path: Path, value, compact=False):
    path.write_text(json.dumps(value, ensure_ascii=False,
                               **({"separators": (",", ":")} if compact else {"indent": 2})) + "\n")


def merge_catalog(existing: list[dict], additions: list[dict]) -> list[dict]:
    """Keep previous editorial records and reject conflicting taxon identities."""
    by_key = {row["key"]: dict(row) for row in existing}
    by_name = {row["scientific"].casefold(): row["key"] for row in existing}
    for row in additions:
        key, scientific = row["key"], row["scientific"].casefold()
        if scientific in by_name and by_name[scientific] != key:
            raise ValueError(f"Conflicting GBIF keys: {row['scientific']}")
        if key in by_key:
            previous = by_key[key]
            if previous["scientific"].casefold() != scientific or previous["family"] != row["family"]:
                raise ValueError(f"Conflicting taxonomy: {row['scientific']}")
            previous["reviewCandidate"] = previous["reviewCandidate"] or row["reviewCandidate"]
            if not previous["vernacular"]:
                previous["vernacular"] = row["vernacular"]
        else:
            by_key[key] = dict(row)
            by_name[scientific] = key
    return sorted(by_key.values(), key=lambda row: row["scientific"].casefold())


def validate_distribution(id: str, record: dict, scientific: str, location_ids: set[str]):
    if record["scientific"] != scientific or not record.get("rangeText", "").strip():
        raise ValueError(f"Missing or mismatched range text: {id}")
    if not record.get("sourceUrl", "").startswith("https://") or not record.get("links"):
        raise ValueError(f"Missing native distribution source/location: {id}")
    seen = set()
    for link in record["links"]:
        place = link["locationId"]
        if place not in location_ids or place in seen:
            raise ValueError(f"Unknown or duplicate waterbody {place}: {id}")
        if not link["evidence"].strip() or not link["sourceUrl"].startswith("https://"):
            raise ValueError(f"Unsourced native relationship: {id}, {place}")
        seen.add(place)


def main():
    from PIL import Image
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("batches", nargs="+", type=Path)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    catalog = read(ROOT / "content/catalog.json")
    curated = read(ROOT / "content/species.json")
    profiles = read(ROOT / "content/photo-profiles.json")
    distribution_data = read(ROOT / "content/distributions.json")
    bodies = read(ROOT / "content/waterbodies.json")
    initial_names = {row["scientific"] for row in curated + profiles}
    by_id = {row["id"]: row for row in curated + profiles}
    by_name = {row["scientific"]: row["id"] for row in curated + profiles}
    by_body = {row["id"]: row for row in bodies}
    known_basins = {row["id"] for row in read(ROOT / "content/major-basins.json")}
    for path in args.batches:
        batch = read(path)
        if batch.get("review", {}).get("visualReviewed") is not True:
            raise ValueError(f"Batch has no completed visual review: {path}")
        for body in batch.get("waterbodies", []):
            if body["kind"] not in {"lake", "sea", "river"} or not body["sourceUrl"].startswith("https://"):
                raise ValueError(f"Invalid waterbody: {body['id']}")
            lon, lat = body["center"]
            if not (-180 <= lon <= 180 and -90 <= lat <= 90) or not body.get("coordinateMethod"):
                raise ValueError(f"Unsourced coordinates: {body['id']}")
            if body["id"] in by_body:
                if by_body[body["id"]] != body:
                    raise ValueError(f"Conflicting waterbody: {body['id']}")
            elif body["id"] in known_basins:
                raise ValueError(f"Duplicate basin identity: {body['id']}")
            else:
                bodies.append(body)
                by_body[body["id"]] = body
        location_ids = set(by_body) | known_basins
        catalog = merge_catalog(catalog, batch["catalog"])
        by_key = {row["key"]: row for row in catalog}
        for profile in batch["profiles"]:
            profile = dict(profile)
            aliases = profile.get("aliases", []) + batch.get("review", {}).get("speciesAliases", {}).get(profile["scientific"], [])
            if not all(isinstance(alias, str) and alias.strip() for alias in aliases):
                raise ValueError(f"Invalid reviewed search aliases: {profile['scientific']}")
            if aliases:
                profile["aliases"] = list(dict.fromkeys(alias.strip() for alias in aliases))
            id, scientific = profile["id"], profile["scientific"]
            row = by_key[profile["gbifKey"]]
            if row.get("curatedId") or row["scientific"] != scientific or row["family"] != profile["family"]:
                raise ValueError(f"Photo taxonomy mismatch: {scientific}")
            photo = profile["photo"]
            if not LICENSE.fullmatch(photo["license"]) or not photo["author"].strip() or not photo["licenseUrl"].startswith(("https://", "http://")):
                raise ValueError(f"Missing photo license/attribution: {scientific}")
            if not photo["pageUrl"].startswith("https://commons.wikimedia.org/wiki/File:"):
                raise ValueError(f"Missing Commons identity: {scientific}")
            if not re.fullmatch(r"/media/wikimedia/[a-z0-9-]+\.(?:jpe?g|png|webp)", photo["path"]):
                raise ValueError(f"Invalid photo path: {scientific}")
            file = ROOT / "public" / photo["path"].lstrip("/")
            if file.stat().st_size < 5000:
                raise ValueError(f"Empty photo: {scientific}")
            with Image.open(file) as image:
                if image.format not in {"JPEG", "PNG", "WEBP"} or min(image.size) < 300:
                    raise ValueError(f"Invalid photo dimensions: {scientific}")
                image.verify()
            record = batch["distributions"][id]
            validate_distribution(id, record, scientific, location_ids)
            if scientific in by_name and by_name[scientific] != id:
                raise ValueError(f"Duplicate species with different ID: {scientific}")
            if id in by_id:
                if by_id[id]["scientific"] != scientific:
                    raise ValueError(f"Conflicting profile identity: {id}")
                if aliases:
                    by_id[id]["aliases"] = list(dict.fromkeys(by_id[id].get("aliases", []) + profile["aliases"]))
                # Keep the prior profile/photograph; merge only reviewed links.
                previous = distribution_data["species"][id]
                for link in record["links"]:
                    if not any(old["locationId"] == link["locationId"] for old in previous["links"]):
                        previous["links"].append(link)
            else:
                profiles.append(profile)
                by_id[id] = profile
                by_name[scientific] = id
                distribution_data["species"][id] = record
        for id, patch in batch.get("distributionPatches", {}).items():
            validate_distribution(id, patch, by_id[id]["scientific"], location_ids)
            distribution_data["species"][id] = patch
        print(f"Reviewed {path.name}: {len(batch['profiles'])} photos, {len(batch.get('distributionPatches', {}))} range corrections")
    profiles.sort(key=lambda row: row["scientific"].casefold())
    if set(distribution_data["species"]) != set(by_id):
        raise ValueError("Distribution/profile identity sets differ")
    for id, profile in by_id.items():
        validate_distribution(id, distribution_data["species"][id], profile["scientific"], set(by_body) | known_basins)
    print(f"Added {len(set(by_name) - initial_names)} photo species; atlas {len(by_id)}, catalog {len(catalog)}; dry-run={args.dry_run}")
    if args.dry_run:
        return
    write(ROOT / "content/catalog.json", catalog, compact=True)
    write(ROOT / "content/photo-profiles.json", profiles)
    write(ROOT / "content/distributions.json", distribution_data)
    write(ROOT / "content/waterbodies.json", bodies, compact=True)
    manifest_path = ROOT / "content/catalog-manifest.json"
    manifest = read(manifest_path)
    manifest.update({"generatedAt": date.today().isoformat(), "totalEntries": len(catalog),
                     "basicEntries": sum(not row.get("curatedId") for row in catalog),
                     "reviewQueue": sum(row["reviewCandidate"] for row in catalog),
                     "families": dict(sorted(Counter(row["family"] for row in catalog).items()))})
    method = " Regional native-fish priority taxa added by exact GBIF species match; previous editorial records preserved."
    if method not in manifest["method"]:
        manifest["method"] += method
    write(manifest_path, manifest)
    runpy.run_path(str(ROOT / "scripts/import-catalog.py"))["write_review_queue"](catalog)
    names = {row["scientific"].strip().lower(): row["vernacular"].strip() for row in catalog if row["vernacular"].strip()}
    write(ROOT / "src/i18n/english-names.json", dict(sorted(names.items())))
    runpy.run_path(str(ROOT / "scripts/write-photo-attribution.py"))


if __name__ == "__main__":
    main()
