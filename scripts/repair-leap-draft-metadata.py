#!/usr/bin/env python3
"""Apply safe mechanical editorial fixes without broadening or rewriting sourced claims."""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "content" / "leap-deepfest-2026"
DRAFTS = BASE / "drafts" / "raw"
OUT = BASE / "qa" / "mechanical-repair-log.json"
WORD_RE = re.compile(r"\b[\w’'-]+\b", re.UNICODE)

REPLACEMENTS = {
    "game-changing": "material",
    "revolutionary": "new",
    "groundbreaking": "new",
    "cutting-edge": "advanced",
    "paradigm shift": "change",
    "in today's rapidly evolving": "in the current",
    "in an era where": "as",
    "it remains to be seen": "the result is not yet clear",
    "only time will tell": "the outcome will depend on execution",
    "testament to": "a reflection of",
    "poised to transform": "could affect",
    "sets a new benchmark": "sets a reference point",
    "marks a significant milestone": "is a step",
    "underscores its commitment": "reflects its stated strategy",
    "at the forefront": "active",
    "seamlessly": "directly",
    "unprecedented": "large-scale",
}
GENERIC_FOCUS = {"leap", "leap 2026", "deepfest", "deepfest 2026", "saudi arabia", "riyadh"}


def words(value: str) -> list[str]:
    return WORD_RE.findall(value)


def split_body(markdown: str) -> tuple[str, str]:
    parts = re.split(r"(^##\s+References\s*$)", markdown, maxsplit=1, flags=re.MULTILINE | re.IGNORECASE)
    if len(parts) >= 3:
        return parts[0].rstrip(), "\n\n" + parts[1] + "\n" + parts[2].lstrip("\n")
    return markdown, ""


def replace_phrase(text: str, phrase: str, replacement: str) -> tuple[str, int]:
    return re.subn(re.escape(phrase), replacement, text, flags=re.IGNORECASE)


def normalized_plain(markdown: str) -> str:
    value = re.sub(r"\[([^\]]+)\]\([^)]*\)", r"\1", markdown)
    value = re.sub(r"^#{1,6}\s+", "", value, flags=re.MULTILINE)
    value = re.sub(r"[*_`>#|]", " ", value)
    return re.sub(r"\s+", " ", value).strip()


def choose_focus(data: dict, used: set[str]) -> str:
    body, _ = split_body(data["content_markdown"])
    lead_words = words(normalized_plain(body))[:120]
    lead = " ".join(lead_words).lower()
    seo = data["seo"]
    candidates: list[str] = []
    candidates.extend(seo.get("keywords", []))
    title_words = words(data["title"])
    for size in range(min(7, len(title_words)), 1, -1):
        for start in range(0, len(title_words) - size + 1):
            candidates.append(" ".join(title_words[start:start + size]))
    candidates.extend(data.get("company_names", []))
    seen: set[str] = set()
    for candidate in candidates:
        phrase = re.sub(r"\s+", " ", str(candidate)).strip(" ,.;:-")
        key = phrase.lower()
        if not phrase or key in seen or key in GENERIC_FOCUS or len(words(phrase)) < 2:
            continue
        seen.add(key)
        if key in lead and key not in used:
            return phrase
    fallback = " ".join(lead_words[:5]).strip()
    suffix = 2
    chosen = fallback
    while chosen.lower() in used:
        chosen = f"{fallback} {suffix}"
        suffix += 1
    return chosen


def trim_chars(value: str, limit: int) -> str:
    if len(value) <= limit:
        return value
    clipped = value[: limit + 1].rsplit(" ", 1)[0].rstrip(" ,;:-")
    return clipped + "…" if len(clipped) + 1 <= limit else clipped[:limit]


def main() -> None:
    logs: list[dict] = []
    used_focus: set[str] = set()
    records = []
    for file_path in sorted(DRAFTS.glob("*.json")):
        data = json.loads(file_path.read_text())
        records.append((file_path, data))
        current = data["seo"].get("focus_keyword", "").lower()
        if current:
            used_focus.add(current)

    for file_path, data in records:
        seq = int(data["sequence"])
        body, references = split_body(data["content_markdown"])
        changes = []
        for phrase, replacement in REPLACEMENTS.items():
            body, count = replace_phrase(body, phrase, replacement)
            if count:
                changes.append({"type": "style_phrase", "from": phrase, "to": replacement, "count": count})
        data["content_markdown"] = body.rstrip() + references

        plain = normalized_plain(body)
        computed_count = len(words(plain))
        if data.get("content_word_count") != computed_count:
            changes.append({"type": "word_count", "from": data.get("content_word_count"), "to": computed_count})
            data["content_word_count"] = computed_count

        if len(data["seo"].get("seo_description", "")) > 165:
            previous = data["seo"]["seo_description"]
            data["seo"]["seo_description"] = trim_chars(previous, 165)
            changes.append({"type": "seo_description", "from_length": len(previous), "to_length": len(data["seo"]["seo_description"])})

        current_focus = data["seo"].get("focus_keyword", "")
        lead = " ".join(words(plain)[:120]).lower()
        if current_focus.lower() not in lead:
            used_focus.discard(current_focus.lower())
            new_focus = choose_focus(data, used_focus)
            used_focus.add(new_focus.lower())
            keywords = [new_focus] + [keyword for keyword in data["seo"].get("keywords", []) if keyword.lower() != new_focus.lower()]
            data["seo"]["focus_keyword"] = new_focus
            data["seo"]["keywords"] = keywords[:12]
            changes.append({"type": "focus_keyword", "from": current_focus, "to": new_focus})

        file_path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")
        if changes:
            logs.append({"sequence": seq, "slug": data["slug"], "changes": changes})

    OUT.write_text(json.dumps({"changed_articles": len(logs), "changes": logs}, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({"articles": len(records), "changed_articles": len(logs), "unique_focus_keywords": len(used_focus), "log": str(OUT)}, indent=2))


if __name__ == "__main__":
    main()
