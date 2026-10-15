"""Apply the same reviewed Chinese fish-name policy as the web interface.

No OpenCC dependency is needed by imports or builds. Only the checked-in,
reviewed glyph table and taxon-specific, sourced preferences are applied.
"""
import copy
import json
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
POLICY = json.loads((ROOT / "content/chinese-name-policy.json").read_text())
CHARACTERS = str.maketrans(POLICY["characterReplacements"])
PREFERRED = {" ".join(name.casefold().split()): record for name, record in POLICY["preferredNames"].items()}


def normalize_name(value: str) -> str:
    return unicodedata.normalize("NFC", value).translate(CHARACTERS)


def normalize_profile_name(profile: dict) -> dict:
    row = copy.deepcopy(profile)
    source_name = row["name"]
    preference = PREFERRED.get(" ".join(row["scientific"].casefold().split()), {})
    row["name"] = preference.get("name") or normalize_name(source_name)
    rejected = {normalize_name(name) for name in preference.get("rejectedNames", [])}
    aliases = row.get("aliases", []) + preference.get("aliases", [])
    if row["name"] != source_name and normalize_name(source_name) not in rejected:
        aliases += [source_name]
    aliases = [name for name in aliases if normalize_name(name) not in rejected]
    # Preserve both original source spellings and usable simplified searches.
    aliases += [normalize_name(name) for name in aliases]
    aliases = list(dict.fromkeys(name for name in aliases if name.strip() and name != row["name"]))
    if aliases or "aliases" in row:
        row["aliases"] = aliases
    return row
