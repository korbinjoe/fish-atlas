"""Extract source facts for the atlas from rOpenSci's FishBase 26.06 snapshot.

Requires pyarrow; pass the directory containing species, synonyms, stocks,
ecosystem, and ecosystemref parquet tables. The extraction retains native /
introduced status; publishing geography requires editorial review separately.
"""
import argparse
import datetime
import json
import re
from collections import defaultdict
from pathlib import Path

import pyarrow.parquet as pq

ROOT = Path(__file__).resolve().parents[1]
VERSION = "26.06"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("tables", type=Path)
    args = parser.parse_args()
    tables = {name: pq.read_table(args.tables / (name + ".parquet")).to_pylist() for name in ["species", "synonyms", "stocks", "ecosystem", "ecosystemref"]}
    species = {f"{row['Genus']} {row['Species']}": row for row in tables["species"]}
    species_by_code = {row["SpecCode"]: row for row in tables["species"]}
    synonyms, stocks, ecosystems = defaultdict(set), defaultdict(list), defaultdict(list)
    ecoref = {row["E_CODE"]: row for row in tables["ecosystemref"]}
    for row in tables["synonyms"]:
        if row["SpecCode"] in species_by_code and str(row["TaxonLevel"]).lower() == "species" and (row["Valid"] or row["Status"] == "synonym") and row.get("Synonymy") != "misidentification":
            synonyms[f"{row['SynGenus']} {row['SynSpecies']}"].add(row["SpecCode"])
    for row in tables["stocks"]:
        if row.get("StockDefs"):
            stocks[row["SpecCode"]].append({"level": row["Level"], "text": re.sub(r"<[^>]+>", "", row["StockDefs"]), "ref": row["StocksRefNo"]})
    for row in tables["ecosystem"]:
        eco = ecoref.get(row["E_CODE"])
        if not eco:
            continue
        record = {key: row.get(key) for key in ["E_CODE", "Status", "CurrentPresence", "EcosystemRefno", "Remarks", "WebURL"]}
        record.update({key: eco.get(key) for key in ["EcosystemName", "EcosystemType", "Location", "Salinity", "E_CODE_Large", "E_CODE_Larger", "E_CODE_Largest", "LatDegFill", "LatMinFill", "NorthSouthFill", "LongDegFill", "LongMinFill", "EastWestFill", "EcosystemURL1", "EcosystemURL2"]})
        ecosystems[row["Speccode"]].append(record)
    fish = json.loads((ROOT / "content/species.json").read_text()) + json.loads((ROOT / "content/photo-profiles.json").read_text())
    output = {}
    for item in fish:
        found = species.get(item["scientific"])
        method = "exact"
        if not found:
            codes = synonyms[item["scientific"]]
            if len(codes) == 1:
                found = species_by_code[next(iter(codes))]
                method = "accepted-synonym"
        if not found:
            print("UNRESOLVED", item["scientific"])
            continue
        code = found["SpecCode"]
        output[item["id"]] = {"scientific": item["scientific"], "acceptedScientific": f"{found['Genus']} {found['Species']}", "match": method, "specCode": code, "url": f"https://www.fishbase.se/summary/{code}", "snapshot": VERSION, "freshwater": bool(found["Fresh"]), "brackish": bool(found["Brack"]), "marine": bool(found["Saltwater"]), "distribution": stocks[code], "ecosystems": ecosystems[code]}
    path = ROOT / "content/research/fishbase-distribution.json"
    path.write_text(json.dumps({"provider": "FishBase / rOpenSci", "version": VERSION, "fetchedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(), "tablesUrl": f"https://s3.us-west-2.amazonaws.com/us-west-2.opendata.source.coop/cboettig/fishbase/fb/v{VERSION}/parquet/", "species": output}, ensure_ascii=False, indent=2) + "\n")
    print(f"Matched {len(output)}/{len(fish)} species; no map coordinates inferred.")


if __name__ == "__main__":
    main()
