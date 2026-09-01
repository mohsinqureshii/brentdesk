#!/usr/bin/env python3
"""Build a readable company/person candidate report from the final manifest."""

from __future__ import annotations

import json
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "content" / "leap-deepfest-2026"
MANIFEST = BASE / "final" / "import-manifest.json"
OUT = BASE / "final" / "ENTITY_ADDITION_CANDIDATES.md"
JSON_OUT = BASE / "final" / "entity-addition-candidates.json"


def collect(articles: list[dict], field: str) -> dict[str, list[int]]:
    result: dict[str, list[int]] = defaultdict(list)
    for article in articles:
        for name in article.get(field, []):
            result[name].append(article["sequence"])
    return dict(sorted(result.items(), key=lambda pair: pair[0].casefold()))


def main() -> None:
    manifest = json.loads(MANIFEST.read_text())
    articles = manifest["articles"]
    companies = collect(articles, "company_names")
    people = collect(articles, "people_names")
    events = collect(articles, "event_names")
    payload = {
        "database_comparison": "unavailable: DATABASE_URL is not configured in this sandbox; these are all canonical manifest candidates requiring live DB lookup before creation.",
        "unique_companies": len(companies),
        "unique_people": len(people),
        "unique_events": len(events),
        "companies": companies,
        "people": people,
        "events": events,
    }
    JSON_OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n")
    lines = [
        "# Company and People Addition Candidates",
        "",
        "> **Database status:** A definitive “already exists / missing” comparison could not be performed because the backend `DATABASE_URL` is not configured in this sandbox. The lists below are the canonical names referenced by the 100-draft manifest; the guarded importer should look each one up by normalized name and create only missing records.",
        "",
        f"The manifest references **{len(companies)} unique companies/institutions**, **{len(people)} unique people**, and **{len(events)} event records**. Company and person creation should occur inside the importer transaction, with idempotent normalized-name matching.",
        "",
        "## Companies and institutions",
        "",
        "| Canonical name | Articles |",
        "|---|---:|",
    ]
    for name, sequences in companies.items():
        lines.append(f"| {name.replace('|', '/') } | {', '.join(map(str, sequences))} |")
    lines += ["", "## People", "", "| Canonical name | Articles |", "|---|---:|"]
    for name, sequences in people.items():
        lines.append(f"| {name.replace('|', '/') } | {', '.join(map(str, sequences))} |")
    lines += ["", "## Events", "", "| Event | Articles |", "|---|---:|"]
    for name, sequences in events.items():
        lines.append(f"| {name} | {', '.join(map(str, sequences))} |")
    lines += ["", "## Import behavior", "", "The backend import service must resolve these names against the existing `companies`, `people` and `events` masters. It must not create a duplicate where a normalized name or slug already exists. Missing companies and people are created as editorial records, then linked through `articleCompanies` and `articlePeople`; every article is linked through `articleEvents` to the existing LEAP 2026 or DeepFest 2026 event record. All article inserts and relation writes are draft-only and transactional.", ""]
    OUT.write_text("\n".join(lines))
    print(json.dumps({"unique_companies": len(companies), "unique_people": len(people), "unique_events": len(events), "markdown": str(OUT), "json": str(JSON_OUT)}, indent=2))


if __name__ == "__main__":
    main()
