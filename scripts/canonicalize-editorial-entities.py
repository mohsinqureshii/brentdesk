#!/usr/bin/env python3
"""Canonicalize confirmed company/person aliases in the final article metadata."""
from __future__ import annotations
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "content/leap-deepfest-2026"
DRAFTS = BASE / "drafts/raw"
LOG = BASE / "qa/entity-canonicalization.json"

COMPANY_MAP = {
    "COGNIXION": "Cognixion",
    "Cognixion": "Cognixion",
    "HP": "HP Inc.",
    "HP Inc.": "HP Inc.",
    "stc group": "stc Group",
    "stc Group": "stc Group",
    "Ministry of Tourism": "Saudi Ministry of Tourism",
    "Saudi Ministry of Tourism": "Saudi Ministry of Tourism",
    "PIF": "Public Investment Fund (PIF)",
    "Public Investment Fund": "Public Investment Fund (PIF)",
    "Public Investment Fund (PIF)": "Public Investment Fund (PIF)",
}
PEOPLE_MAP = {
    "Abdullah Alswaha": "Abdullah bin Amer Alswaha",
    "Abdullah Amer Alswaha": "Abdullah bin Amer Alswaha",
    "Abdullah bin Amer Alswaha": "Abdullah bin Amer Alswaha",
}


def canonicalize(values: list[str], mapping: dict[str, str]) -> tuple[list[str], list[dict[str, str]]]:
    result, changes = [], []
    seen = set()
    for value in values:
        canonical = mapping.get(value, value)
        if canonical != value:
            changes.append({"from": value, "to": canonical})
        if canonical not in seen:
            result.append(canonical)
            seen.add(canonical)
    return result, changes


def main() -> None:
    all_changes = []
    for path in sorted(DRAFTS.glob("*.json")):
        data = json.loads(path.read_text())
        companies, company_changes = canonicalize(data.get("company_names", []), COMPANY_MAP)
        people, people_changes = canonicalize(data.get("people_names", []), PEOPLE_MAP)
        tag_names, tag_changes = canonicalize(data.get("tag_names", []), COMPANY_MAP)
        # Amazon is the parent company; AWS is its distinct cloud subsidiary/brand.
        # Article 19 is specifically an AWS Academy announcement and has no separate
        # Amazon corporate announcement, so remove only that over-tag.
        amazon_removed = False
        if data["sequence"] == 19 and "Amazon" in companies:
            companies = [name for name in companies if name != "Amazon"]
            amazon_removed = True
        if data["sequence"] == 19 and "Amazon" in tag_names:
            tag_names = [name for name in tag_names if name != "Amazon"]
            amazon_removed = True
        if company_changes or people_changes or tag_changes or amazon_removed:
            data["company_names"] = companies
            data["people_names"] = people
            data["tag_names"] = tag_names
            path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")
            all_changes.append({"sequence": data["sequence"], "file": path.name, "company_changes": company_changes, "people_changes": people_changes, "tag_changes": tag_changes, "amazon_parent_tag_removed": amazon_removed})
    summary = {
        "company_aliases": COMPANY_MAP,
        "people_aliases": PEOPLE_MAP,
        "changed_articles": len(all_changes),
        "company_replacements": sum(len(item["company_changes"]) for item in all_changes),
        "people_replacements": sum(len(item["people_changes"]) for item in all_changes),
        "tag_replacements": sum(len(item.get("tag_changes", [])) for item in all_changes),
        "amazon_parent_tag_removed": sum(1 for item in all_changes if item.get("amazon_parent_tag_removed")),
        "changes": all_changes,
        "intentionally_not_merged": [
            ["specialized by stc", "stc Group", "brand/subsidiary distinction retained"],
            ["Saudi Data and Artificial Intelligence Authority", "SDAIA", "no SDAIA alias appears in the final manifest; no invented alias added"],
            ["Ministry of Communications and Information Technology", "Ministry of Communications and Information Technology (Syria)", "different jurisdictions retained"],
            ["Ministry of Communications and Information Technology", "Ministry of Transport, Communications and Information Technology", "different ministries retained"],
            ["Oracle", "URACLE. Co. Ltd", "not merged without source confirmation"],
            ["Amazon", "Amazon Web Services", "parent and subsidiary/cloud brand retained as separate entities; Amazon removed from AWS-only article 19 company/tag fields"],
        ],
    }
    LOG.parent.mkdir(parents=True, exist_ok=True)
    LOG.write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({k: summary[k] for k in ("changed_articles", "company_replacements", "people_replacements")}, indent=2))

if __name__ == "__main__": main()
