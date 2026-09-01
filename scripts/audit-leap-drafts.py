#!/usr/bin/env python3
"""Deterministic editorial/SEO/entity/image preflight for the 100-article draft package."""

from __future__ import annotations

import csv
import hashlib
import json
import math
import re
from collections import Counter, defaultdict
from itertools import combinations
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "content" / "leap-deepfest-2026"
DRAFTS = BASE / "drafts" / "raw"
BLUEPRINT = BASE / "blueprint" / "editorial-blueprint.json"
OUT = BASE / "qa"

WORD_RE = re.compile(r"\b[\w’'-]+\b", re.UNICODE)
URL_RE = re.compile(r"https://[^\s)\]>]+")
HYPE_PHRASES = [
    "game-changing", "revolutionary", "groundbreaking", "cutting-edge", "paradigm shift",
    "in today's rapidly evolving", "in an era where", "it remains to be seen", "only time will tell",
    "testament to", "poised to transform", "sets a new benchmark", "marks a significant milestone",
    "underscores its commitment", "at the forefront", "seamlessly", "unprecedented",
]


def words(text: str) -> list[str]:
    return WORD_RE.findall(text)


def normalize_url(url: str) -> str:
    parts = urlsplit(url.rstrip(".,;:"))
    return urlunsplit((parts.scheme.lower(), parts.netloc.lower(), parts.path.rstrip("/"), parts.query, ""))


def strip_markdown(text: str) -> str:
    text = re.sub(r"!\[[^\]]*\]\([^)]*\)", " ", text)
    text = re.sub(r"\[([^\]]+)\]\([^)]*\)", r"\1", text)
    text = re.sub(r"^#{1,6}\s+", "", text, flags=re.MULTILINE)
    text = re.sub(r"[*_`>#|]", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def body_and_references(markdown: str) -> tuple[str, str]:
    parts = re.split(r"^##\s+References\s*$", markdown, maxsplit=1, flags=re.MULTILINE | re.IGNORECASE)
    return parts[0].strip(), parts[1].strip() if len(parts) > 1 else ""


def tokens_for_similarity(text: str) -> list[str]:
    stop = {"the", "a", "an", "and", "or", "of", "to", "in", "for", "with", "on", "at", "by", "as", "is", "are", "was", "were", "be", "that", "this", "it", "from", "its", "their", "has", "have", "will", "said", "says", "leap", "deepfest", "2026", "saudi", "arabia", "riyadh"}
    return [token.lower() for token in words(strip_markdown(text)) if len(token) > 2 and token.lower() not in stop]


def cosine(counter_a: Counter[str], counter_b: Counter[str]) -> float:
    shared = set(counter_a) & set(counter_b)
    dot = sum(counter_a[key] * counter_b[key] for key in shared)
    norm_a = math.sqrt(sum(value * value for value in counter_a.values()))
    norm_b = math.sqrt(sum(value * value for value in counter_b.values()))
    return dot / (norm_a * norm_b) if norm_a and norm_b else 0.0


def issue(level: str, field: str, message: str) -> dict:
    return {"level": level, "field": field, "message": message}


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    blueprint = json.loads(BLUEPRINT.read_text())
    expected = {item["sequence"]: item for item in blueprint["articles"]}
    files = sorted(DRAFTS.glob("*.json"))
    results: list[dict] = []
    body_counters: dict[int, Counter[str]] = {}
    body_texts: dict[int, str] = {}
    sentence_owners: dict[str, set[int]] = defaultdict(set)

    for file_path in files:
        data = json.loads(file_path.read_text())
        seq = int(data["sequence"])
        exp = expected[seq]
        article_issues: list[dict] = []
        markdown = data.get("content_markdown", "")
        body_md, refs_md = body_and_references(markdown)
        body_plain = strip_markdown(body_md)
        body_words = words(body_plain)
        word_count = len(body_words)
        body_texts[seq] = body_plain
        body_counters[seq] = Counter(tokens_for_similarity(body_md))

        for sentence in re.split(r"(?<=[.!?])\s+", body_plain):
            normalized = re.sub(r"\s+", " ", sentence.lower()).strip()
            normalized = re.sub(r"\b\d+(?:\.\d+)?\b", "#", normalized)
            if len(words(normalized)) >= 12:
                sentence_owners[normalized].add(seq)

        if word_count < 850 or word_count > 1250:
            article_issues.append(issue("error", "content_word_count", f"Computed body word count is {word_count}; required 850–1,250."))
        if int(data.get("content_word_count", 0)) != word_count:
            article_issues.append(issue("error", "content_word_count", f"Stored count {data.get('content_word_count')} does not equal computed count {word_count}."))
        h2_count = len(re.findall(r"^##\s+(?!References\s*$).+", body_md, flags=re.MULTILINE | re.IGNORECASE))
        if h2_count < 2 or h2_count > 4:
            article_issues.append(issue("error", "content_markdown", f"Found {h2_count} body H2 headings; required 2–4."))
        if not refs_md:
            article_issues.append(issue("error", "references", "Missing H2 References section."))
        if re.search(r"^\s*[-*+]\s+", body_md, flags=re.MULTILINE):
            article_issues.append(issue("error", "content_markdown", "Body contains a bullet list."))
        if re.search(r"^\s*\|.+\|\s*$", body_md, flags=re.MULTILINE):
            article_issues.append(issue("error", "content_markdown", "Body contains a Markdown table."))
        if re.search(r"<[^>]+>", markdown):
            article_issues.append(issue("error", "content_markdown", "Draft contains HTML."))

        if data.get("author_public_name") != "TechScoop Desk":
            article_issues.append(issue("error", "author_public_name", "Author is not TechScoop Desk."))
        if data.get("workflow_status_slug") != "draft":
            article_issues.append(issue("error", "workflow_status_slug", "Article is not a draft."))
        if data.get("slug") != exp["slug"]:
            article_issues.append(issue("error", "slug", "Slug differs from the locked blueprint."))
        if data.get("canonical_announcement_key") != exp["canonical_announcement_key"]:
            article_issues.append(issue("error", "canonical_announcement_key", "Announcement key differs from the locked blueprint."))
        for field in ("event_names", "company_names", "people_names", "topic_names", "tag_names", "coverage", "display_datetime_local", "display_datetime_utc", "timezone"):
            if data.get(field) != exp.get(field):
                article_issues.append(issue("error", field, "Structured metadata differs from the locked blueprint."))

        title = data.get("title", "")
        excerpt = data.get("excerpt", "")
        seo = data.get("seo") or {}
        if not (1 <= len(title) <= 512):
            article_issues.append(issue("error", "title", "Title is missing or too long."))
        if not (140 <= len(excerpt) <= 320):
            article_issues.append(issue("error", "excerpt", f"Excerpt length is {len(excerpt)}; required 140–320."))
        if len(seo.get("seo_title", "")) > 65 or not seo.get("seo_title"):
            article_issues.append(issue("error", "seo.seo_title", f"SEO title length is {len(seo.get('seo_title', ''))}; required 1–65."))
        if len(seo.get("seo_description", "")) > 165 or not seo.get("seo_description"):
            article_issues.append(issue("error", "seo.seo_description", f"SEO description length is {len(seo.get('seo_description', ''))}; required 1–165."))
        focus = seo.get("focus_keyword", "")
        first_120 = " ".join(body_words[:120]).lower()
        if focus and focus.lower() not in first_120:
            article_issues.append(issue("warning", "seo.focus_keyword", "Focus keyword does not appear as an exact phrase in the first 120 words."))

        sources = data.get("sources") or {}
        allowed_urls = {normalize_url(sources.get("primary_url", ""))}
        allowed_urls.update(normalize_url(url) for url in sources.get("supporting_urls", []))
        linked_urls = {normalize_url(url) for url in URL_RE.findall(markdown)}
        unapproved_urls = sorted(url for url in linked_urls if url and url not in allowed_urls)
        if unapproved_urls:
            article_issues.append(issue("error", "references", f"Draft contains URLs outside the approved source list: {unapproved_urls}"))
        if normalize_url(sources.get("primary_url", "")) not in linked_urls:
            article_issues.append(issue("error", "references", "Primary source URL is not cited in the draft."))

        image = data.get("image") or {}
        image_path = Path(image.get("local_path", ""))
        if not image_path.is_file():
            article_issues.append(issue("error", "image.local_path", "Image file does not exist."))
            image_hash = ""
            actual_dimensions = None
        else:
            image_hash = hashlib.sha256(image_path.read_bytes()).hexdigest()
            with Image.open(image_path) as img:
                actual_dimensions = img.size
            if actual_dimensions != (1600, 900):
                article_issues.append(issue("error", "image.dimensions", f"Actual image dimensions are {actual_dimensions}; required 1600×900."))
        for field in ("alt", "caption", "credit", "license", "rights_status", "rights_notes"):
            if not image.get(field):
                article_issues.append(issue("error", f"image.{field}", "Required image metadata is missing."))

        lower_body = body_plain.lower()
        hype_found = [phrase for phrase in HYPE_PHRASES if phrase in lower_body]
        if hype_found:
            article_issues.append(issue("warning", "style", f"Promotional or formulaic phrases found: {hype_found}"))

        results.append({
            "sequence": seq,
            "slug": data.get("slug"),
            "title": title,
            "file": str(file_path.resolve()),
            "body_word_count": word_count,
            "h2_count": h2_count,
            "reference_url_count": len(linked_urls),
            "image_sha256": image_hash,
            "error_count": sum(1 for item in article_issues if item["level"] == "error"),
            "warning_count": sum(1 for item in article_issues if item["level"] == "warning"),
            "issues": article_issues,
        })

    similarity_pairs = []
    for left, right in combinations(sorted(body_counters), 2):
        score = cosine(body_counters[left], body_counters[right])
        if score >= 0.50:
            similarity_pairs.append({"left": left, "right": right, "cosine": round(score, 4)})
    similarity_pairs.sort(key=lambda item: item["cosine"], reverse=True)

    repeated_sentences = [
        {"sentence": sentence, "article_sequences": sorted(owners), "article_count": len(owners)}
        for sentence, owners in sentence_owners.items() if len(owners) >= 3
    ]
    repeated_sentences.sort(key=lambda item: (-item["article_count"], item["sentence"]))

    title_keys = [item["title"].strip().lower() for item in results]
    slug_keys = [item["slug"] for item in results]
    summary = {
        "expected_articles": 100,
        "actual_articles": len(results),
        "unique_titles": len(set(title_keys)),
        "unique_slugs": len(set(slug_keys)),
        "unique_images": len({item["image_sha256"] for item in results if item["image_sha256"]}),
        "word_count_min": min(item["body_word_count"] for item in results) if results else 0,
        "word_count_max": max(item["body_word_count"] for item in results) if results else 0,
        "word_count_mean": round(sum(item["body_word_count"] for item in results) / len(results), 1) if results else 0,
        "total_errors": sum(item["error_count"] for item in results),
        "articles_with_errors": sum(1 for item in results if item["error_count"]),
        "total_warnings": sum(item["warning_count"] for item in results),
        "articles_with_warnings": sum(1 for item in results if item["warning_count"]),
        "similarity_pairs_at_or_above_0_50": len(similarity_pairs),
        "max_pairwise_cosine": similarity_pairs[0]["cosine"] if similarity_pairs else 0,
        "sentences_repeated_in_3_or_more_articles": len(repeated_sentences),
        "valid": len(results) == 100 and len(set(title_keys)) == 100 and len(set(slug_keys)) == 100 and sum(item["error_count"] for item in results) == 0,
    }
    report = {"summary": summary, "articles": sorted(results, key=lambda item: item["sequence"]), "similarity_pairs": similarity_pairs[:100], "repeated_sentences": repeated_sentences[:200]}
    (OUT / "preflight-report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")

    with (OUT / "preflight-issues.csv").open("w", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=["sequence", "slug", "level", "field", "message"])
        writer.writeheader()
        for item in report["articles"]:
            for problem in item["issues"]:
                writer.writerow({"sequence": item["sequence"], "slug": item["slug"], **problem})

    markdown = [
        "# LEAP / DeepFest 2026 Draft Preflight",
        "",
        "| Metric | Result |",
        "|---|---:|",
    ]
    for key, value in summary.items():
        markdown.append(f"| {key.replace('_', ' ').title()} | {value} |")
    markdown.extend(["", "## Articles Requiring Correction", "", "| # | Errors | Warnings | Words | Title |", "|---:|---:|---:|---:|---|"])
    for item in report["articles"]:
        if item["error_count"] or item["warning_count"]:
            markdown.append(f"| {item['sequence']} | {item['error_count']} | {item['warning_count']} | {item['body_word_count']} | {item['title'].replace('|', '/')} |")
    markdown.extend(["", "## Highest Similarity Pairs", "", "| Left | Right | Cosine |", "|---:|---:|---:|"])
    for pair in similarity_pairs[:25]:
        markdown.append(f"| {pair['left']} | {pair['right']} | {pair['cosine']:.4f} |")
    (OUT / "preflight-report.md").write_text("\n".join(markdown) + "\n")
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
