#!/usr/bin/env python3
"""Build decisive closing remediation packets from the final independent review."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "content" / "leap-deepfest-2026"
REVIEWS = BASE / "qa" / "closing-review-final-remediations.json"
DRAFTS = BASE / "drafts" / "raw"
BRIEFS = BASE / "article-briefs"
OUT = BASE / "qa" / "closing-correction-briefs"


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
            "instructions": "Write a fresh, restrained 850–1,000-word body rather than patching repeated prose. Cover the verified announcement, named facts, practical implications, explicit limitations and concrete follow-up questions once each. No paragraph may restate a previous point. Remove the reviewer-quoted unsupported or generic phrases. Preserve all metadata, source URLs and image data.",
        }
        (OUT / f"{sequence:03d}.json").write_text(json.dumps(packet, ensure_ascii=False, indent=2) + "\n")
        selected.append(sequence)
    print(json.dumps({"correction_briefs": len(selected), "sequences": selected, "output": str(OUT)}, indent=2))
    if len(selected) != 12:
        raise SystemExit(f"Expected 12 correction briefs, got {len(selected)}")


if __name__ == "__main__":
    main()
