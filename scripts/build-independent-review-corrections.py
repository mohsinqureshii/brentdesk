#!/usr/bin/env python3
"""Build source-bounded rewrite packets from the independent 100-article review."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "content" / "leap-deepfest-2026"
REVIEWS = BASE / "qa" / "independent-review-results.json"
DRAFTS = BASE / "drafts" / "raw"
BRIEFS = BASE / "article-briefs"
OUT = BASE / "qa" / "independent-correction-briefs"


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    reviews = json.loads(REVIEWS.read_text())["results"]
    selected = []
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
            "instructions": "Rewrite the article body to correct every factual and editorial finding. The verified angle and key facts in the authoritative brief are the complete factual boundary. Preserve locked backend metadata, approved URLs and image data. Produce concise, original newsroom prose without repeated paragraphs, keyword stuffing, promotional filler or unsupported specificity. The article body must remain 850–1,250 words excluding References, with 2–4 non-References H2 headings and a final References section.",
        }
        (OUT / f"{sequence:03d}.json").write_text(json.dumps(packet, ensure_ascii=False, indent=2) + "\n")
        selected.append(sequence)
    print(json.dumps({"correction_briefs": len(selected), "sequences": selected, "output": str(OUT)}, indent=2))
    if len(selected) != 45:
        raise SystemExit(f"Expected 45 correction briefs, got {len(selected)}")


if __name__ == "__main__":
    main()
