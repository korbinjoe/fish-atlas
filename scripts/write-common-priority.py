"""Export the audited common-fish names for catalog search and display."""

import json
import runpy
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
audit = runpy.run_path(str(ROOT / "scripts/audit-common-fish.py"))
common = audit["COMMON"]
aliases = audit["ALIASES"]
rows = {}
for group, fish in common.items():
    for name, scientific in fish:
        accepted = aliases.get(scientific, scientific)
        rows[accepted] = {"name": name, "aliases": [scientific] if accepted != scientific else []}
output = ROOT / "content/common-priority.json"
output.write_text(json.dumps(dict(sorted(rows.items())), ensure_ascii=False, indent=2) + "\n")
print(f"Wrote {len(rows)} common priority names to {output}")
