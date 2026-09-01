#!/usr/bin/env python3
"""Apply source-bounded people-tag corrections from the complete people audit."""
from __future__ import annotations
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "content/leap-deepfest-2026"
AUDIT = BASE / "qa/audit-people-names.json"
DRAFTS = BASE / "drafts/raw"
OUT = BASE / "qa/people-audit-corrections.json"


def parse_names(value: str) -> list[str]:
    if not value or value == "NONE": return []
    return [part.strip() for part in value.split(";") if part.strip()]


def main():
    audit = json.loads(AUDIT.read_text())["results"]
    changes = []
    for record in audit:
        output = record["output"]
        sequence = int(output["sequence"])
        current_path = next(DRAFTS.glob(f"{sequence:03d}-*.json"))
        data = json.loads(current_path.read_text())
        current = data.get("people_names", [])
        canonical = parse_names(output.get("canonical_people", "NONE"))
        if current != canonical:
            data["people_names"] = canonical
            current_path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")
            changes.append({"sequence": sequence, "file": current_path.name, "from": current, "to": canonical, "audit_flags": output.get("name_flags", "NA")})
    summary = {"audited_articles": len(audit), "changed_articles": len(changes), "removed_or_replaced_people": sum(len(c["from"]) - len(c["to"]) for c in changes), "changes": changes, "rule": "Only source-supported names from the complete audit are retained; unsupported names are removed rather than guessed."}
    OUT.write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({k: summary[k] for k in ("audited_articles", "changed_articles", "removed_or_replaced_people")}, indent=2))

if __name__ == "__main__": main()
