#!/usr/bin/env python3
"""Download, normalize and verify the 100 generated article draft JSON files."""

from __future__ import annotations

import copy
import json
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "content" / "leap-deepfest-2026"
RESULTS = BASE / "drafts" / "writing-results.json"
BRIEFS = BASE / "article-briefs"
OUT = BASE / "drafts" / "raw"
INDEX = BASE / "drafts" / "draft-index.json"


def final_image_for_import(image: dict) -> dict:
    return {
        "local_path": image["local_path"],
        "filename": image["filename"],
        "mime_type": image["mime_type"],
        "width": image["width"],
        "height": image["height"],
        "alt": image["alt"],
        "caption": image["caption"],
        "credit": image["credit"],
        "source_url": image["source_url"],
        "license": image["license"],
        "rights_status": image["rights_status"],
        "rights_notes": image["rights_notes"],
    }


def normalize_payload(payload: dict, brief: dict) -> dict:
    authoritative = copy.deepcopy(brief["article"])
    nested = payload.get("article") if isinstance(payload.get("article"), dict) else {}
    generated_sources = [payload, nested]

    def first_value(key: str, default=None):
        for source in generated_sources:
            if key in source and source[key] not in (None, ""):
                return source[key]
        return default

    authoritative["title"] = first_value("title", authoritative["title"])
    authoritative["excerpt"] = first_value("excerpt", authoritative["excerpt"])
    authoritative["content_markdown"] = first_value("content_markdown", "")
    authoritative["content_word_count"] = int(first_value("content_word_count", 0) or 0)
    authoritative["editorial_notes"] = first_value("editorial_notes", "No unsupported claims added; draft requires editorial review.")
    generated_seo = first_value("seo")
    if isinstance(generated_seo, dict):
        merged_seo = copy.deepcopy(authoritative["seo"])
        for key in ("seo_title", "seo_description", "og_title", "og_description"):
            if generated_seo.get(key):
                merged_seo[key] = generated_seo[key]
        authoritative["seo"] = merged_seo
    authoritative["image"] = final_image_for_import(brief["final_image"])

    for transient in ("content_target_words", "drafting_brief", "selection_reason", "is_featured", "is_trending", "is_editor_pick", "is_flash", "announcement_date"):
        authoritative.pop(transient, None)
    return authoritative


def fetch(record: dict) -> dict:
    output = record["output"]
    response = requests.get(output["article_file"], timeout=180)
    response.raise_for_status()
    payload = response.json()
    sequence = int(output["sequence"])
    slug = output["slug"]
    brief = json.loads((BRIEFS / f"{sequence:03d}.json").read_text())
    normalized = normalize_payload(payload, brief)
    if int(normalized.get("sequence", -1)) != sequence:
        raise ValueError(f"sequence mismatch: map={sequence} file={normalized.get('sequence')}")
    if normalized.get("slug") != slug:
        raise ValueError(f"slug mismatch for sequence {sequence}")
    if not normalized.get("content_markdown"):
        raise ValueError(f"missing article content for sequence {sequence}")
    target = OUT / f"{sequence:03d}-{slug}.json"
    target.write_text(json.dumps(normalized, ensure_ascii=False, indent=2) + "\n")
    return {
        "sequence": sequence,
        "slug": slug,
        "path": str(target.resolve()),
        "reported_word_count": output["word_count"],
        "source_count": output["source_count"],
        "workflow_status": output["workflow_status"],
    }


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    data = json.loads(RESULTS.read_text())["results"]
    records: list[dict] = []
    errors: list[dict] = []
    with ThreadPoolExecutor(max_workers=16) as executor:
        futures = {executor.submit(fetch, record): record for record in data}
        for future in as_completed(futures):
            try:
                records.append(future.result())
            except Exception as exc:
                errors.append({"input": futures[future].get("input"), "error": str(exc)})
    records.sort(key=lambda item: item["sequence"])
    index = {"count": len(records), "expected_count": 100, "errors": errors, "drafts": records}
    INDEX.write_text(json.dumps(index, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({"drafts": len(records), "errors": len(errors), "output": str(OUT), "index": str(INDEX)}, indent=2))
    if errors or len(records) != 100:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
