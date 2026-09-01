#!/usr/bin/env python3
"""Cluster overlapping LEAP/DeepFest research candidates and select unique stories."""

from __future__ import annotations

import json
from pathlib import Path
from openai import OpenAI

ROOT = Path(__file__).resolve().parents[1]
RESEARCH = ROOT / "content" / "leap-deepfest-2026" / "research"
RAW = RESEARCH / "verified-angles-raw.json"
SUPPLEMENTAL = RESEARCH / "supplemental-angles-raw.json"
DAY1_BILINGUAL = RESEARCH / "day1-bilingual-angles-raw.json"
EXISTING = RESEARCH / "existing-coverage-inventory.md"
OUT = RESEARCH / "clustered-selection.json"


def load_candidates() -> list[dict]:
    candidates: list[dict] = []
    for prefix, path in (("R", RAW), ("S", SUPPLEMENTAL), ("B", DAY1_BILINGUAL)):
        data = json.loads(path.read_text())
        for index, item in enumerate(data["results"], start=1):
            output = item.get("output") or {}
            if not output:
                continue
            candidates.append(
                {
                    "candidate_id": f"{prefix}{index:03d}",
                    "headline": output.get("proposed_headline"),
                    "event_bucket": output.get("event_bucket"),
                    "announcement_date": output.get("announcement_date"),
                    "primary_source_title": output.get("primary_source_title"),
                    "primary_source_url": output.get("primary_source_url"),
                    "supporting_source_urls": output.get("supporting_source_urls"),
                    "angle_summary": output.get("verified_angle_summary"),
                    "key_facts": output.get("verified_key_facts"),
                    "companies": output.get("canonical_companies"),
                    "people": output.get("canonical_people"),
                    "category": output.get("recommended_category"),
                    "topics": output.get("recommended_topics"),
                    "seo_keywords": output.get("seo_keywords"),
                    "image_candidate_url": output.get("image_candidate_url"),
                    "image_credit": output.get("image_credit"),
                    "image_license_note": output.get("image_license_note"),
                    "confidence": output.get("confidence"),
                }
            )
    return candidates


def main() -> None:
    candidates = load_candidates()
    existing = EXISTING.read_text()
    prompt = f"""
You are the senior assignments editor for TechScoop. Review 180 researched LEAP 2026 and DeepFest 2026 candidate stories and build a source-disciplined, non-repetitive selection.

Rules:
1. Two candidates are duplicates when they report the same underlying announcement, partnership, product launch, sponsorship-only item, session-only notice, delegation attendance item, or numerical event overview—even if headlines or URLs differ.
2. Select at most one candidate per underlying announcement. Prefer official sources, specific material news, strong factual detail, named entities, and a usable image candidate.
3. Exclude generic event previews/opening roundups, speaker biographies, media-partner announcements, attendance-only stories, unsupported social-only claims, and anything already covered in the existing TechScoop inventory.
4. A genuinely independent sub-announcement may survive only when it has separate material facts and can support a standalone 800–1,400 word article without reusing the same core news.
5. Do not invent replacement candidates. Use only supplied candidate IDs.
6. Aim for exactly 100 selected candidates, but if fewer than 100 pass these rules, select only the defensible candidates and report the gap honestly.
7. Assign DeepFest 2026 to AI governance, AI safety, AI infrastructure, enterprise AI, healthcare AI, robotics, autonomous systems, foundation models and closely related artificial-intelligence stories. Assign Both when materially relevant to both event feeds. Otherwise use LEAP 2026.

Existing TechScoop coverage to exclude:
{existing}

Candidates:
{json.dumps(candidates, ensure_ascii=False)}
"""

    schema = {
        "type": "object",
        "properties": {
            "selected": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "candidate_id": {"type": "string"},
                        "canonical_announcement_key": {"type": "string"},
                        "event_bucket": {"type": "string", "enum": ["LEAP 2026", "DeepFest 2026", "Both"]},
                        "selection_reason": {"type": "string"},
                    },
                    "required": ["candidate_id", "canonical_announcement_key", "event_bucket", "selection_reason"],
                    "additionalProperties": False,
                },
            },
            "rejected_clusters": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "canonical_announcement_key": {"type": "string"},
                        "candidate_ids": {"type": "array", "items": {"type": "string"}},
                        "reason": {"type": "string"},
                    },
                    "required": ["canonical_announcement_key", "candidate_ids", "reason"],
                    "additionalProperties": False,
                },
            },
            "selected_count": {"type": "integer"},
            "gap_to_100": {"type": "integer"},
            "editorial_notes": {"type": "string"},
        },
        "required": ["selected", "rejected_clusters", "selected_count", "gap_to_100", "editorial_notes"],
        "additionalProperties": False,
    }

    client = OpenAI()
    response = client.chat.completions.create(
        model="gpt-5",
        messages=[
            {"role": "system", "content": "You are a rigorous technology-news assignments editor. Return only schema-valid JSON."},
            {"role": "user", "content": prompt},
        ],
        max_completion_tokens=30000,
        extra_body={"reasoning": {"effort": "medium"}},
        response_format={
            "type": "json_schema",
            "json_schema": {
                "name": "leap_deepfest_selection",
                "strict": True,
                "schema": schema,
            },
        },
    )
    content = response.choices[0].message.content
    if not content:
        raise RuntimeError("Model returned no content")
    parsed = json.loads(content)
    OUT.write_text(json.dumps(parsed, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({
        "selected_count": parsed["selected_count"],
        "gap_to_100": parsed["gap_to_100"],
        "rejected_clusters": len(parsed["rejected_clusters"]),
        "usage": response.usage.model_dump() if response.usage else None,
        "output": str(OUT),
    }, indent=2))


if __name__ == "__main__":
    main()
