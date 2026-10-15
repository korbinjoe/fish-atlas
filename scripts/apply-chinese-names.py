"""Check Chinese display names and aliases, or apply reviewed policy with --write."""
import argparse
import json
import runpy
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
normalize = runpy.run_path(str(ROOT / "scripts/chinese-name-policy.py"))["normalize_profile_name"]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--write", action="store_true", help="Apply reviewed names and regenerate photograph credits")
args = parser.parse_args()
changed = 0
for relative in ("content/species.json", "content/photo-profiles.json"):
    file = ROOT / relative
    previous = json.loads(file.read_text())
    normalized = [normalize(row) for row in previous]
    changed += sum(before != after for before, after in zip(previous, normalized))
    if args.write and previous != normalized:
        file.write_text(json.dumps(normalized, ensure_ascii=False, indent=2) + "\n")
if args.write and changed:
    runpy.run_path(str(ROOT / "scripts/write-photo-attribution.py"))
print(f"Chinese name policy: {changed} records {'updated' if args.write else 'need normalization'}")
if changed and not args.write:
    raise SystemExit(1)
