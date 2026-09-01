#!/usr/bin/env python3
"""Build final remediation packets from the corrected-draft re-review."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "content" / "leap-deepfest-2026"
REVIEWS = BASE / "qa" / "final-review-corrected-results.json"
DRAFTS = BASE / "drafts" / "raw"
BRIEFS = BASE / "article-briefs"
OUT = BASE / "qa" / "final-correction-briefs"


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    reviews = json.loads(REVIEWS.read_text())["results"]
    selected: list[int] = []
    for review in reviews:
        finding = review["output"]
        if finding["factual_status"] != "needs_correction" and finding["editorial_status"] != "needs_correction":
            continue
        sequence = int(finding["sequence"])
        draft_path = next(DRAFTS.glob(f"{sequence:03d}-*.json"))
        packet = {
            "sequence": sequence,
            "current_draft": json.loads(draft_path.read_text()),
            "authoritative_brief": json.loads((BRIEFS / f"{sequence:03d}.json").read_text()),
            "review_findings": finding,
            "instructions": "Perform a final restrained rewrite of the body to remove exactly the flagged unsupported details, repeated passages, generic padding and promotional wording. Preserve verified facts, approved links and every backend metadata field. Do not expand the scope. Maintain 850–1,250 article-body words, 2–4 non-References H2 headings and the final approved References section.",
        }
        (OUT / f"{sequence:03d}.json").write_text(json.dumps(packet, ensure_ascii=False, indent=2) + "\n")
        selected.append(sequence)
    print(json.dumps({"correction_briefs": len(selected), "sequences": selected, "output": str(OUT)}, indent=2))
    if len(selected) != 19:
        raise SystemExit(f"Expected 19 correction briefs, got {len(selected)}")


if __name__ == "__main__":
    main()
