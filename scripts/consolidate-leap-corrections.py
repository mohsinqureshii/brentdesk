#!/usr/bin/env python3
"""Apply corrected bodies while preserving the authoritative structured draft metadata."""

from __future__ import annotations

import json
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "content" / "leap-deepfest-2026"
RESULTS_SOURCE = Path("/home/ubuntu/correct_leap_deepfest_draft_failures.json")
RESULTS_COPY = BASE / "qa" / "correction-results.json"
PACKETS = BASE / "qa" / "correction-briefs"
DRAFTS = BASE / "drafts" / "raw"
LOG = BASE / "qa" / "correction-consolidation.json"


def extract_draft(payload: dict) -> dict:
    if isinstance(payload.get("article"), dict):
        nested = dict(payload["article"])
        for key in ("content_markdown", "content_word_count", "editorial_notes"):
            if payload.get(key) not in (None, ""):
                nested[key] = payload[key]
        return nested
    return payload


def apply(record: dict) -> dict:
    output = record["output"]
    sequence = int(output["sequence"])
    packet = json.loads((PACKETS / f"{sequence:03d}.json").read_text())
    current = packet["current_draft"]
    response = requests.get(output["corrected_file"], timeout=180)
    response.raise_for_status()
    corrected = extract_draft(response.json())
    if corrected.get("slug") != current.get("slug"):
        raise ValueError(f"slug changed for sequence {sequence}")
    if not corrected.get("content_markdown"):
        raise ValueError(f"missing corrected body for sequence {sequence}")
    current["content_markdown"] = corrected["content_markdown"]
    current["content_word_count"] = int(corrected.get("content_word_count", output["word_count"]))
    if corrected.get("editorial_notes"):
        current["editorial_notes"] = corrected["editorial_notes"]
    target = next(DRAFTS.glob(f"{sequence:03d}-*.json"))
    target.write_text(json.dumps(current, ensure_ascii=False, indent=2) + "\n")
    return {
        "sequence": sequence,
        "slug": current["slug"],
        "path": str(target.resolve()),
        "reported_word_count": output["word_count"],
        "reported_h2_count": output["h2_count"],
        "workflow_status": output["workflow_status"],
    }


def main() -> None:
    RESULTS_COPY.write_text(RESULTS_SOURCE.read_text())
    results = json.loads(RESULTS_COPY.read_text())["results"]
    applied = []
    errors = []
    with ThreadPoolExecutor(max_workers=8) as executor:
        futures = {executor.submit(apply, record): record for record in results}
        for future in as_completed(futures):
            try:
                applied.append(future.result())
            except Exception as exc:
                errors.append({"input": futures[future].get("input"), "error": str(exc)})
    applied.sort(key=lambda item: item["sequence"])
    LOG.write_text(json.dumps({"applied": applied, "errors": errors}, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({"applied": len(applied), "errors": len(errors), "sequences": [item["sequence"] for item in applied]}, indent=2))
    if errors or len(applied) != 13:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
