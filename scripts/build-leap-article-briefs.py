#!/usr/bin/env python3
"""Merge the 100 source/SEO/entity assignments with final image metadata for parallel drafting."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "content" / "leap-deepfest-2026"
BLUEPRINT = BASE / "blueprint" / "editorial-blueprint.json"
IMAGES = BASE / "images" / "image-manifest.json"
STYLE = BASE / "EDITORIAL_STYLE.md"
OUT = BASE / "article-briefs"


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    blueprint = json.loads(BLUEPRINT.read_text())
    image_manifest = json.loads(IMAGES.read_text())
    image_by_sequence = {item["sequence"]: item for item in image_manifest["images"]}
    if len(image_by_sequence) != 100:
        raise RuntimeError("Expected 100 final images before drafting")

    for article in blueprint["articles"]:
        image = image_by_sequence.get(article["sequence"])
        if not image or image["slug"] != article["slug"]:
            raise RuntimeError(f"Image mismatch for sequence {article['sequence']}")
        brief = {
            "instruction": "Write exactly one original TechScoop Desk news draft from this verified assignment. Do not broaden the underlying announcement.",
            "style_guide_path": str(STYLE.resolve()),
            "article": article,
            "final_image": image,
            "output_contract": {
                "format": "JSON",
                "required_fields": [
                    "sequence", "candidate_id", "canonical_announcement_key", "title", "slug", "author_public_name",
                    "workflow_status_slug", "article_type", "display_datetime_local", "display_datetime_utc", "timezone",
                    "excerpt", "content_markdown", "content_word_count", "primary_category_name", "category_names",
                    "event_names", "event_bucket", "company_names", "people_names", "topic_names", "tag_names",
                    "coverage", "seo", "sources", "image", "editorial_notes"
                ],
                "content_word_count_min": 850,
                "content_word_count_max": 1250,
                "content_word_count_scope": "Article body only, excluding References",
                "markdown_requirements": "Two to four H2 subheadings, body paragraphs, natural inline source links, and a final H2 References section with numbered Markdown reference definitions.",
                "metadata_preservation": "Preserve structured metadata exactly unless improving excerpt, SEO title or SEO description within their hard limits.",
            },
        }
        (OUT / f"{article['sequence']:03d}.json").write_text(json.dumps(brief, ensure_ascii=False, indent=2) + "\n")

    print(json.dumps({"briefs": len(blueprint["articles"]), "images": len(image_by_sequence), "output": str(OUT)}, indent=2))


if __name__ == "__main__":
    main()
