#!/usr/bin/env python3
"""Create the final draft-only backend import manifest from the QA-approved articles."""

from __future__ import annotations

import json
import re
from pathlib import Path
from urllib.parse import urlsplit

import markdown

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "content" / "leap-deepfest-2026"
DRAFTS = BASE / "drafts" / "raw"
FINAL = BASE / "final"
MANIFEST = FINAL / "import-manifest.json"
INDEX = FINAL / "REVIEW_INDEX.md"

REQUIRED_FIELDS = [
    "batch_id", "sequence", "candidate_id", "canonical_announcement_key", "title", "slug",
    "author_public_name", "workflow_status_slug", "article_type", "display_datetime_local",
    "display_datetime_utc", "timezone", "excerpt", "content_word_count", "primary_category_name",
    "category_names", "event_names", "event_bucket", "company_names", "people_names", "topic_names",
    "tag_names", "coverage", "seo", "sources", "image",
]


def visible_reference_definitions(markdown_text: str) -> str:
    """Turn Markdown link definitions in the References section into visible numbered links."""
    parts = re.split(r"(^##\s+References\s*$)", markdown_text, maxsplit=1, flags=re.MULTILINE | re.IGNORECASE)
    if len(parts) < 3:
        return markdown_text
    body, heading, reference_text = parts
    lines = []
    for line in reference_text.splitlines():
        match = re.match(r'^\[(\d+)\]:\s+(https://\S+?)(?:\s+"([^"]+)")?\s*$', line.strip())
        if not match:
            lines.append(line)
            continue
        number, url, title = match.groups()
        if not title:
            title = urlsplit(url).netloc.replace("www.", "") or "Source"
        lines.append(f"{number}. [{title}]({url})")
    return body.rstrip() + "\n\n" + heading + "\n" + "\n".join(lines).lstrip("\n")


def render_html(markdown_text: str) -> str:
    normalized = visible_reference_definitions(markdown_text)
    return markdown.markdown(normalized, extensions=["extra", "sane_lists"], output_format="html5")


def html_body_word_count(html: str) -> int:
    body = re.split(r"<h[1-6][^>]*>\s*References\s*</h[1-6]>", html, maxsplit=1, flags=re.IGNORECASE)[0]
    text = re.sub(r"<[^>]+>", " ", body)
    text = re.sub(r"&[a-z0-9#]+;", " ", text, flags=re.IGNORECASE)
    text = re.sub(r"\s+", " ", text).strip()
    return len(text.split()) if text else 0


def main() -> None:
    FINAL.mkdir(parents=True, exist_ok=True)
    files = sorted(DRAFTS.glob("*.json"))
    if len(files) != 100:
        raise SystemExit(f"Expected 100 QA-approved drafts, found {len(files)}")

    articles = []
    review_rows = []
    for file_path in files:
        source = json.loads(file_path.read_text())
        missing = [field for field in REQUIRED_FIELDS if field not in source]
        if missing:
            raise ValueError(f"{file_path.name} missing fields: {missing}")
        article = {field: source[field] for field in REQUIRED_FIELDS}
        article["content_html"] = render_html(source["content_markdown"])
        article["content_word_count"] = html_body_word_count(article["content_html"])
        articles.append(article)
        review_rows.append({
            "sequence": article["sequence"],
            "time": article["display_datetime_local"][11:19],
            "event": article["event_bucket"],
            "words": article["content_word_count"],
            "title": article["title"],
            "image": article["image"]["filename"],
            "source": article["sources"]["primary_url"],
        })

    articles.sort(key=lambda item: item["sequence"])
    manifest = {
        "batch": {
            "id": "leap-deepfest-2026-day1",
            "name": "LEAP and DeepFest 2026 Day 1 — TechScoop Desk Review Batch",
            "article_count": 100,
            "author_public_name": "TechScoop Desk",
            "workflow_status_slug": "draft",
            "public_publish_allowed": False,
            "review_required": True,
            "date": "2026-08-31",
            "timezone": "Asia/Riyadh",
            "window_start": "2026-08-31T12:00:00+03:00",
            "window_end": "2026-08-31T23:59:00+03:00",
        },
        "articles": articles,
    }
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")

    lines = [
        "# LEAP and DeepFest 2026 Draft Review Index",
        "",
        "This index lists the 100 unpublished **TechScoop Desk** drafts in backend sequence order. All times use **Asia/Riyadh** on 31 August 2026. Nothing in this package is published by the manifest build or validation commands.",
        "",
        "| # | Time | Event | Words | Draft title | Image | Primary source |",
        "|---:|---:|---|---:|---|---|---|",
    ]
    for row in sorted(review_rows, key=lambda item: item["sequence"]):
        title = row["title"].replace("|", "/")
        lines.append(f"| {row['sequence']} | {row['time']} | {row['event']} | {row['words']} | {title} | `{row['image']}` | [Source]({row['source']}) |")
    lines.extend(["", "## Review safeguards", "", "The manifest fixes the author to **TechScoop Desk**, targets the `draft` workflow only, disables public publishing, requires editorial review, and carries full event, company, person, taxonomy, keyword, geography, image-rights and source-provenance metadata for each article.", ""])
    INDEX.write_text("\n".join(lines))
    print(json.dumps({"manifest": str(MANIFEST), "review_index": str(INDEX), "articles": len(articles)}, indent=2))


if __name__ == "__main__":
    main()
