#!/usr/bin/env python3
"""Build focused correction packets for drafts with remaining deterministic errors."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "content" / "leap-deepfest-2026"
REPORT = BASE / "qa" / "preflight-report.json"
DRAFTS = BASE / "drafts" / "raw"
BRIEFS = BASE / "article-briefs"
STYLE = BASE / "EDITORIAL_STYLE.md"
OUT = BASE / "qa" / "correction-briefs"


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    report = json.loads(REPORT.read_text())
    problem_articles = [item for item in report["articles"] if item["error_count"]]
    for item in problem_articles:
        sequence = item["sequence"]
        draft_path = next(DRAFTS.glob(f"{sequence:03d}-*.json"))
        original_brief_path = BRIEFS / f"{sequence:03d}.json"
        packet = {
            "sequence": sequence,
            "draft_path": str(draft_path.resolve()),
            "original_brief_path": str(original_brief_path.resolve()),
            "style_guide_path": str(STYLE.resolve()),
            "current_draft": json.loads(draft_path.read_text()),
            "authoritative_brief": json.loads(original_brief_path.read_text()),
            "errors_to_fix": [problem for problem in item["issues"] if problem["level"] == "error"],
            "instructions": "Correct only the listed failures. Preserve the underlying angle, facts, URLs, structured metadata and original image. The final body must contain 850–1,250 words excluding References and exactly 2–4 non-References H2 headings. Do not add facts, quotes, numbers, sources, lists, tables, HTML, hype language or generic event padding. Recalculate content_word_count exactly.",
        }
        (OUT / f"{sequence:03d}.json").write_text(json.dumps(packet, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({"correction_briefs": len(problem_articles), "sequences": [item["sequence"] for item in problem_articles], "output": str(OUT)}, indent=2))


if __name__ == "__main__":
    main()
