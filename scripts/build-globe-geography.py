#!/usr/bin/env python3
"""Build compact, sourced globe geography (pyshp + shapely required).

Usage: python scripts/build-globe-geography.py --cache /tmp/fish-geography
Natural Earth is public domain. The pinned archive hashes intentionally fail
if an upstream release changes, rather than silently publishing different data.
"""

from __future__ import annotations

import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path
from urllib.request import urlretrieve
import zipfile

import shapefile
from shapely.geometry import mapping, shape
from shapely.geometry.polygon import orient


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "content" / "enrichment"
TOLERANCE = 0.02  # geographic degrees, not a survey / habitat-resolution map
DECIMALS = 5
MAX_RANK = 6
MAIN_RANK = 4
SOURCES = {
    "rivers": {
        "dataset": "ne_10m_rivers_lake_centerlines_scale_rank",
        "scale": "1:10,000,000",
        "url": "https://naturalearth.s3.amazonaws.com/10m_physical/ne_10m_rivers_lake_centerlines_scale_rank.zip",
        "documentation": "https://www.naturalearthdata.com/downloads/10m-physical-vectors/10m-rivers-lake-centerlines/",
        "sha256": "a6fc02f8d663a0cb451b2564fbc361174410cd65d14c59d11ffb870ebb8c8566",
    },
    "land": {
        "dataset": "ne_50m_land",
        "scale": "1:50,000,000",
        "url": "https://naturalearth.s3.amazonaws.com/50m_physical/ne_50m_land.zip",
        "documentation": "https://www.naturalearthdata.com/downloads/50m-physical-vectors/50m-land/",
        "sha256": "0b8e670cf80dce9cbebe2a193bc44ba5602758c22e1fa603980553646d7ff162",
    },
}


def download(source: dict, cache: Path) -> tuple[Path, str]:
    name = source["dataset"]
    archive = cache / f"{name}.zip"
    if not archive.exists():
        temporary = archive.with_suffix(".download")
        urlretrieve(source["url"], temporary)
        temporary.replace(archive)
    actual_hash = hashlib.sha256(archive.read_bytes()).hexdigest()
    if actual_hash != source["sha256"]:
        raise ValueError(f"Source checksum changed: {archive}; expected {source['sha256']}, got {actual_hash}")
    directory = cache / name
    directory.mkdir(exist_ok=True)
    with zipfile.ZipFile(archive) as zipped:
        for member in zipped.infolist():
            # These official archives are flat; do not permit path traversal.
            if Path(member.filename).name != member.filename:
                raise ValueError(f"Unexpected archive path: {member.filename}")
        zipped.extractall(directory)
    version = (directory / f"{name}.VERSION.txt").read_text().strip()
    return directory / name, version


def rounded(value):
    if isinstance(value, (tuple, list)):
        return [rounded(item) for item in value]
    return round(value, DECIMALS)


def geometry(geom) -> dict:
    compact = geom.simplify(TOLERANCE, preserve_topology=True)
    # d3-geo interprets clockwise exterior rings as the smaller spherical area.
    if compact.geom_type == "Polygon":
        compact = orient(compact, sign=-1)
    elif compact.geom_type == "MultiPolygon":
        from shapely.geometry import MultiPolygon
        compact = MultiPolygon([orient(polygon, sign=-1) for polygon in compact.geoms])
    if compact.is_empty or not compact.is_valid:
        raise ValueError("Simplification produced invalid geography")
    result = mapping(compact)
    return {"type": result["type"], "coordinates": rounded(result["coordinates"])}


def write(name: str, value: dict) -> int:
    path = OUTPUT / name
    path.write_text(json.dumps(value, ensure_ascii=False, separators=(",", ":")) + "\n")
    return path.stat().st_size


def vertex_count(value) -> int:
    if isinstance(value[0], (int, float)):
        return 1
    return sum(vertex_count(part) for part in value)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--cache", type=Path, default=Path("/tmp/fish-geography"))
    args = parser.parse_args()
    args.cache.mkdir(parents=True, exist_ok=True)
    OUTPUT.mkdir(parents=True, exist_ok=True)
    metadata = {
        "schemaVersion": 1,
        "provider": "Natural Earth",
        "license": "Public domain",
        "licenseUrl": "https://www.naturalearthdata.com/about/terms-of-use/",
        "coordinateReferenceSystem": "EPSG:4326 (longitude, latitude)",
        "simplification": {"method": "Shapely Douglas-Peucker, preserve_topology=True", "toleranceDegrees": TOLERANCE, "coordinateDecimals": DECIMALS, "exteriorRingOrientation": "clockwise (d3-geo spherical)"},
        "selection": {"maximumRiverScaleRank": MAX_RANK, "mainRiverMaximumScaleRank": MAIN_RANK, "detailRiverScaleRanks": [5, 6], "classes": ["River", "Lake Centerline", "River (Intermittent)", "Canal"]},
        "sources": {},
        "limitations": "Cartographic reference lines, not all streams or precise habitat locations. Natural Earth notes suspect alignments in parts of the Amazon and northeastern Russia. Lake centerlines connect river networks through lakes and reservoirs.",
    }
    river_base, river_version = download(SOURCES["rivers"], args.cache)
    reader = shapefile.Reader(str(river_base), encoding="utf-8")
    rivers = []
    for record in reader.iterShapeRecords():
        data = record.record.as_dict()
        rank = int(data["scalerank"])
        if rank > MAX_RANK:
            continue
        rivers.append({
            "type": "Feature",
            "properties": {
                "name": data["name_en"] or data["name"],
                "sourceName": data["name"],
                "nameZh": data["name_zh"],
                "scalerank": rank,
                "main": rank <= MAIN_RANK,
                "featureClass": data["featurecla"],
                "strokeWeight": float(data["strokeweig"]),
                "riverNumber": int(data["rivernum"]),
            },
            "geometry": geometry(shape(record.shape.__geo_interface__)),
        })
    river_collection = {"type": "FeatureCollection", "name": SOURCES["rivers"]["dataset"], "features": rivers}
    river_bytes = write("waterways.json", river_collection)
    river_names = sorted({feature["properties"]["name"] for feature in rivers if feature["properties"]["name"]})
    required = ["Amazon", "Nile", "Congo", "Yangtze", "Mekong", "Ganges", "Brahmaputra", "Danube", "Mississippi", "Niger", "Zambezi", "Orinoco", "Rhine", "Volga", "Amur", "Murray"]
    if not set(required).issubset(river_names):
        raise ValueError(f"Required global river system missing: {set(required) - set(river_names)}")
    metadata["sources"]["rivers"] = {
        **SOURCES["rivers"],
        "version": river_version,
        "sourceFeatureCount": len(reader),
        "outputFeatureCount": len(rivers),
        "distinctRiverNumbers": len({feature["properties"]["riverNumber"] for feature in rivers}),
        "namedWaterwayCount": len(river_names),
        "mainNamedWaterwayCount": len({feature["properties"]["name"] for feature in rivers if feature["properties"]["main"] and feature["properties"]["name"]}),
        "mainFeatureCount": sum(feature["properties"]["main"] for feature in rivers),
        "scaleRankCounts": dict(sorted(Counter(feature["properties"]["scalerank"] for feature in rivers).items())),
        "featureClassCounts": dict(Counter(feature["properties"]["featureClass"] for feature in rivers)),
        "vertexCount": sum(vertex_count(feature["geometry"]["coordinates"]) for feature in rivers),
        "runtimeBytes": river_bytes,
        "validatedMajorSystems": required,
    }

    land_base, land_version = download(SOURCES["land"], args.cache)
    reader = shapefile.Reader(str(land_base), encoding="utf-8")
    land = [{"type": "Feature", "properties": {}, "geometry": geometry(shape(record.shape.__geo_interface__))} for record in reader.iterShapeRecords()]
    land_bytes = write("globe-land.json", {"type": "FeatureCollection", "name": SOURCES["land"]["dataset"], "features": land})
    metadata["sources"]["land"] = {**SOURCES["land"], "version": land_version, "sourceFeatureCount": len(reader), "outputFeatureCount": len(land), "vertexCount": sum(vertex_count(feature["geometry"]["coordinates"]) for feature in land), "runtimeBytes": land_bytes}
    metadata["totalRuntimeGeoJsonBytes"] = river_bytes + land_bytes
    if river_bytes + land_bytes > 3_000_000:
        raise ValueError("Runtime geography exceeds the 3 MB budget")
    write("globe-geography.json", metadata)
    print(json.dumps({"rivers": metadata["sources"]["rivers"], "land": metadata["sources"]["land"], "totalRuntimeGeoJsonBytes": metadata["totalRuntimeGeoJsonBytes"]}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
