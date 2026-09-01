#!/usr/bin/env python3
"""Remove four reviewer-identified duplicate or generic passages from final drafts."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DRAFTS = ROOT / "content" / "leap-deepfest-2026" / "drafts" / "raw"
LOG = ROOT / "content" / "leap-deepfest-2026" / "qa" / "final-duplicate-removal.json"

RULES = {
    27: {
        "phrase": "This specific launch provides a concrete news angle distinct from generic AI or cloud announcements, giving IT decision-makers actionable pathways for digital infrastructure updates.",
        "mode": "all",
    },
    56: {
        "phrase": "lowering the overall complexity of the surface transport network.",
        "mode": "duplicates",
    },
    65: {
        "phrase": "The AI Smart Collection system analyzes customer data to personalize communication and improve collection efficiency across multiple channels, offering accurate and proactive interactions.",
        "mode": "duplicates",
    },
    72: {
        "phrase": "This distinct hardware focus highlights the intersection of religious practice and modern consumer electronics, offering a concrete product launch story that avoids general event overviews or infrastructure announcements.",
        "mode": "duplicates",
    },
}


def remove_all(text: str, phrase: str) -> tuple[str, int]:
    count = text.count(phrase)
    text = text.replace(phrase, "")
    return text, count


def remove_duplicates(text: str, phrase: str) -> tuple[str, int]:
    count = text.count(phrase)
    if count <= 1:
        return text, 0
    first = text.find(phrase)
    head = text[: first + len(phrase)]
    tail = text[first + len(phrase):].replace(phrase, "")
    return head + tail, count - 1


def clean_spacing(text: str) -> str:
    while "  " in text:
        text = text.replace("  ", " ")
    while "\n\n\n" in text:
        text = text.replace("\n\n\n", "\n\n")
    return text.replace("\n .", "\n").replace("  .", ".")


def main() -> None:
    changes = []
    for sequence, rule in RULES.items():
        file_path = next(DRAFTS.glob(f"{sequence:03d}-*.json"))
        data = json.loads(file_path.read_text())
        before_count = data["content_markdown"].count(rule["phrase"])
        if rule["mode"] == "all":
            updated, removed = remove_all(data["content_markdown"], rule["phrase"])
        else:
            updated, removed = remove_duplicates(data["content_markdown"], rule["phrase"])
        data["content_markdown"] = clean_spacing(updated)
        file_path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")
        changes.append({"sequence": sequence, "phrase": rule["phrase"], "before_count": before_count, "removed": removed, "after_count": data["content_markdown"].count(rule["phrase"]), "path": str(file_path.resolve())})
    LOG.write_text(json.dumps({"changes": changes}, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({"changes": changes}, indent=2))


if __name__ == "__main__":
    main()
