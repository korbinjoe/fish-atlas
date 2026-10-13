"""Build a compact local atlas from the official GRDC 2020 GeoJSON ZIP.

Usage: python3 scripts/build-major-basins.py /path/to/GRDC_Major_River_Basins_json.zip
Source: https://mrb.grdc.bafg.de/ (mrb_basins.json in the complete GeoJSON ZIP)
GRDC requires citation to GRDC (2020) and acknowledgement of HydroSHEDS/WWF.
Requires Shapely for geometry simplification; the web app reads the generated JSON only.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path
from zipfile import ZipFile

from shapely.geometry import MultiPolygon, mapping, shape
from shapely.geometry.polygon import orient

CONTINENTS = {
    "Africa": "africa",
    "Asia": "asia",
    "Europe": "europe",
    "South America": "south-america",
    "North America, Central America and the Caribbean": "north-america",
    "South-West Pacific": "oceania",
}


def round_coordinates(value):
    if isinstance(value, (float, int)):
        return round(value, 2)
    return [round_coordinates(part) for part in value]


def main(archive: Path) -> None:
    with ZipFile(archive) as zipped:
        source = json.loads(zipped.read("mrb_basins.json"))
    output = []
    for feature in source["features"]:
        properties = feature["properties"]
        geometry = shape(feature["geometry"])
        simplified = geometry.simplify(0.12, preserve_topology=True)
        # d3-geo's spherical path and containment use clockwise exterior rings
        # for polygons smaller than a hemisphere. GRDC exports the opposite.
        simplified = (orient(simplified, sign=-1.0) if simplified.geom_type == "Polygon"
                      else MultiPolygon([orient(part, sign=-1.0) for part in simplified.geoms]))
        point = geometry.representative_point()
        output.append({
            "id": str(properties["MRBID"]),
            "name": properties["RIVERBASIN"].title(),
            "continent": CONTINENTS[properties["CONTINENT"]],
            "areaKm2": round(properties["SUM_SUB_AREA"]),
            "center": [round(point.x, 2), round(point.y, 2)],
            "geometry": {
                "type": simplified.geom_type,
                "coordinates": round_coordinates(mapping(simplified)["coordinates"]),
            },
        })
    output.sort(key=lambda basin: -basin["areaKm2"])
    assert len(output) == 520 and len({basin["id"] for basin in output}) == 520
    destination = Path(__file__).resolve().parents[1] / "content" / "major-basins.json"
    destination.write_text(json.dumps(output, ensure_ascii=False, separators=(",", ":")) + "\n")
    print(f"Wrote {len(output)} GRDC basins to {destination} ({destination.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main(Path(sys.argv[1]))
