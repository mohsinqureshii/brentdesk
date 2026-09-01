#!/usr/bin/env python3
"""Build the backend-ready editorial blueprint for 100 LEAP/DeepFest drafts."""

from __future__ import annotations

import csv
import json
import re
import unicodedata
from datetime import datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "content" / "leap-deepfest-2026"
RESEARCH = BASE / "research"
OUT = BASE / "blueprint"
SITE = "https://techscoop.io"
RIYADH = ZoneInfo("Asia/Riyadh")
UTC = ZoneInfo("UTC")


def split_pipe(value: object) -> list[str]:
    if not isinstance(value, str) or not value.strip() or value.strip().upper() == "NA":
        return []
    return [part.strip() for part in value.split("|") if part.strip() and part.strip().upper() != "NA"]


def split_keywords(value: object) -> list[str]:
    if not isinstance(value, str):
        return []
    parts = re.split(r"[,;|]", value)
    seen: set[str] = set()
    result: list[str] = []
    for part in parts:
        keyword = re.sub(r"\s+", " ", part).strip()
        key = keyword.casefold()
        if keyword and key not in seen:
            seen.add(key)
            result.append(keyword)
    return result[:12]


def slugify(value: str) -> str:
    text = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    text = re.sub(r"[^a-zA-Z0-9]+", "-", text.lower()).strip("-")
    return text[:180].rstrip("-")


def trim_words(value: str, maximum: int) -> str:
    value = re.sub(r"\s+", " ", value).strip()
    if len(value) <= maximum:
        return value
    clipped = value[: maximum + 1].rsplit(" ", 1)[0].rstrip(" ,;:-")
    return clipped + "…"


COMPANY_ALIASES = {
    "Advanced Micro Devices, Inc.": "AMD",
    "Advanced Communications and Electronic Systems Company": "ACES",
    "Digital Government Authority (DGA)": "Digital Government Authority",
    "King Abdulaziz City for Science and Technology (KACST)": "King Abdulaziz City for Science and Technology",
    "Ministry of Human Resources and Social Development (Saudi Arabia)": "Ministry of Human Resources and Social Development",
    "Ministry of Interior (MOI)": "Ministry of Interior",
    "Ministry of Investment (MISA)": "Ministry of Investment",
    "National Technology Development Program (NTDP)": "National Technology Development Program",
}


def canonicalize_companies(names: list[str]) -> list[str]:
    seen: set[str] = set()
    canonical: list[str] = []
    for name in names:
        value = COMPANY_ALIASES.get(name, name)
        key = value.casefold()
        if key not in seen:
            seen.add(key)
            canonical.append(value)
    return canonical


def canonical_topics_for(candidate: dict, event_bucket: str) -> list[str]:
    blob = " ".join(
        str(candidate.get(key) or "")
        for key in ("headline", "category", "topics", "seo_keywords", "angle_summary", "key_facts", "companies")
    ).casefold()
    rules = [
        (r"artificial intelligence|\\bai\\b|machine learning|agentic|foundation model|copilot", "AI & Machine Learning"),
        (r"data cent|compute|gpu|inference|ai infrastructure|sovereign ai", "AI Infrastructure"),
        (r"cloud|azure|aws region", "Cloud Computing"),
        (r"data governance|data management|data security|data sovereignty|analytics", "Data & Analytics"),
        (r"cyber|zero trust|post-quantum|security", "Cybersecurity"),
        (r"telecom|connectivity|network|5g|6g|wireless|open ran", "Telecommunications"),
        (r"5g|6g|millimeter wave|mmwave", "5G & 6G"),
        (r"enterprise software|saas|erp|workflow|productivity|customer experience|asset management|performance management", "Enterprise Software"),
        (r"government|ministr|authority|public service|absher|digital identity|passport|border guard", "Digital Government"),
        (r"smart cit|urban|stadium|city data|municipal", "Smart Cities"),
        (r"robot|physical ai|humanoid", "Robotics"),
        (r"autonomous|robotaxi|self-driving|truck", "Autonomous Mobility"),
        (r"quantum", "Quantum Computing"),
        (r"semiconductor|chip|snapdragon|gpu|accelerator", "Semiconductors"),
        (r"startup|accelerator|incubator|founder|pitch|delegation", "Startup Ecosystem"),
        (r"funding|series [a-z]|venture capital|investor", "Venture Capital"),
        (r"fintech|payment|bank|finance|insurance|insurtech", "Fintech"),
        (r"health|medical|biomarker|patient|food safety", "HealthTech"),
        (r"future of work|workforce|skills|training|academy|human resources|hr ", "Future of Work"),
        (r"manufactur|industrial|factory|industry 4", "Industry 4.0"),
        (r"logistics|supply chain|fleet|freight|port", "Logistics & Supply Chain"),
        (r"gaming|esports|gamex|roblox", "Gaming & Esports"),
        (r"geospatial|hazard|gis|climate intelligence", "Geospatial Technology"),
        (r"space|satellite|non-terrestrial", "Space Technology"),
        (r"education|edtech|classroom|learning", "EdTech"),
        (r"tourism|hospitality", "Travel Technology"),
        (r"legal|justice|rights protection", "Legal Technology"),
        (r"vision 2030|saudi arabia|riyadh|kingdom", "Saudi Digital Economy"),
    ]
    topics: list[str] = []
    for pattern, topic in rules:
        if re.search(pattern, blob) and topic not in topics:
            topics.append(topic)
    for event in (["LEAP 2026", "DeepFest 2026"] if event_bucket == "Both" else [event_bucket]):
        if event not in topics:
            topics.append(event)
    if not topics:
        topics = ["Digital Transformation", event_bucket]
    return topics[:8]


def category_for(candidate: dict) -> tuple[str, list[str]]:
    blob = " ".join(
        str(candidate.get(key) or "")
        for key in ("headline", "category", "topics", "seo_keywords", "angle_summary", "key_facts")
    ).casefold()
    primary = "AI & Data"
    if re.search(r"funding|series [a-z]|venture|accelerator|incubator|startup|pitch|founder", blob):
        primary = "Startups"
    if re.search(r"funding round|series [a-z]|venture capital|investment round|raises|secures \$", blob):
        primary = "Funding & VC"
    if re.search(r"fintech|payment|bank|financial service|insurance|insurtech", blob):
        primary = "Fintech"
    if re.search(r"enterprise software|saas|erp|hr platform|workplace|productivity|customer experience|asset management", blob):
        primary = "Enterprise"
    if re.search(r"delegation|event transport|shuttle|metro|visa|attendance|pavilion|official partner|leap nights|visitor", blob):
        primary = "Events & Conferences"
    if re.search(r"artificial intelligence|\bai\b|data center|data centre|cloud|quantum|robot|autonomous|semiconductor|6g|5g|cyber", blob):
        primary = "AI & Data"
    categories = [primary]
    if primary != "Events & Conferences":
        categories.append("Events & Conferences")
    return primary, categories


def load_candidates() -> dict[str, dict]:
    candidates: dict[str, dict] = {}
    for prefix, filename in (
        ("R", "verified-angles-raw.json"),
        ("S", "supplemental-angles-raw.json"),
        ("B", "day1-bilingual-angles-raw.json"),
    ):
        data = json.loads((RESEARCH / filename).read_text())
        for index, item in enumerate(data["results"], start=1):
            output = item.get("output") or {}
            if not output:
                continue
            candidates[f"{prefix}{index:03d}"] = {
                "candidate_id": f"{prefix}{index:03d}",
                "headline": output.get("proposed_headline") or "",
                "event_bucket": output.get("event_bucket") or "LEAP 2026",
                "announcement_date": output.get("announcement_date") or "2026-08-31",
                "primary_source_title": output.get("primary_source_title") or "",
                "primary_source_url": output.get("primary_source_url") or "",
                "supporting_source_urls": output.get("supporting_source_urls") or "",
                "angle_summary": output.get("verified_angle_summary") or "",
                "key_facts": output.get("verified_key_facts") or "",
                "companies": output.get("canonical_companies") or "",
                "people": output.get("canonical_people") or "",
                "category": output.get("recommended_category") or "",
                "topics": output.get("recommended_topics") or "",
                "seo_keywords": output.get("seo_keywords") or "",
                "image_candidate_url": output.get("image_candidate_url") or "",
                "image_credit": output.get("image_credit") or "",
                "image_license_note": output.get("image_license_note") or "",
                "confidence": output.get("confidence") or 0,
            }

    candidates["M001"] = {
        "candidate_id": "M001",
        "headline": "Saudi Human Resources Ministry Brings New Digital Services to LEAP 2026",
        "event_bucket": "LEAP 2026",
        "announcement_date": "2026-08-31",
        "primary_source_title": '"LEAP 2026": Saudi Human Resources Ministry Reveals a Package of Digital Solutions',
        "primary_source_url": "https://www.alarabiya.net/aswaq/saudi-economy/2026/08/31/%D8%A7%D9%84%D9%85%D9%88%D8%A7%D8%B1%D8%AF-%D8%A7%D9%84%D8%A8%D8%B4%D8%B1%D9%8A%D8%A9-%D8%A7%D9%84%D8%B3%D8%B9%D9%88%D8%AF%D9%8A%D8%A9-%D8%AA%D8%B7%D9%84%D9%82-%D8%B9%D8%AF%D8%AF%D8%A7-%D9%85%D9%86-%D8%A7%D9%84%D9%85%D9%86%D8%AA%D8%AC%D8%A7%D8%AA-%D9%88%D8%A7%D9%84%D8%AD%D9%84%D9%88%D9%84-%D8%A7%D9%84%D8%B1%D9%82%D9%85%D9%8A%D8%A9-%D8%AE%D9%84%D8%A7%D9%84-%D9%84%D9%8A%D8%A8-2026",
        "supporting_source_urls": "https://www.saudiarabiapr.com/local-news/193740-human-resources-ministry-participates-in-leap-2026",
        "angle_summary": "The Saudi Ministry of Human Resources and Social Development said its LEAP 2026 programme includes digital products and beneficiary-facing solutions, interactive demonstrations of existing services, and strategic memoranda of understanding intended to improve digital services and user experience. The announcement is distinct from private-sector HR software launches and the Digital Government Authority maturity index.",
        "key_facts": "The ministry is participating in LEAP 2026 from 31 August to 3 September; it plans to launch beneficiary-facing digital products and solutions; the pavilion will demonstrate digital achievements and services; the ministry plans strategic MoUs to develop digital services; the programme emphasizes AI adoption and government institutional excellence.",
        "companies": "Ministry of Human Resources and Social Development (Saudi Arabia) | Saudi Press Agency",
        "people": "NA",
        "category": "Government Tech",
        "topics": "Digital Government | Artificial Intelligence | User Experience | Saudi Arabia | Public Services",
        "seo_keywords": "Saudi Human Resources Ministry LEAP 2026, Saudi digital government services, AI beneficiary services Saudi Arabia, MHRSD digital transformation, LEAP public sector technology, Saudi user experience services, government AI adoption, Vision 2030 digital services",
        "image_candidate_url": "NA",
        "image_credit": "NA",
        "image_license_note": "Use an official ministry press image only after rights review, otherwise create a TechScoop editorial illustration.",
        "confidence": 96,
    }
    return candidates


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    selection = json.loads((RESEARCH / "clustered-selection.json").read_text())
    candidates = load_candidates()
    selected = selection["selected"]
    if len(selected) != 100:
        raise RuntimeError(f"Expected exactly 100 selected candidates, found {len(selected)}")

    start = datetime(2026, 8, 31, 12, 0, 0, tzinfo=RIYADH)
    end = datetime(2026, 8, 31, 23, 59, 0, tzinfo=RIYADH)
    span_seconds = int((end - start).total_seconds())
    used_slugs: set[str] = set()
    used_focus_keywords: set[str] = set()
    articles: list[dict] = []

    for index, picked in enumerate(selected, start=1):
        candidate_id = picked["candidate_id"]
        if candidate_id not in candidates:
            raise KeyError(f"Missing candidate data for {candidate_id}")
        source = candidates[candidate_id]
        scheduled_local = start + timedelta(seconds=round((index - 1) * span_seconds / 99))
        scheduled_utc = scheduled_local.astimezone(UTC)
        title = source["headline"].strip()
        slug_base = slugify(title)
        slug = slug_base
        suffix = 2
        while slug in used_slugs:
            slug = f"{slug_base}-{suffix}"
            suffix += 1
        used_slugs.add(slug)

        keywords = split_keywords(source["seo_keywords"])
        if not keywords:
            keywords = [title, "LEAP 2026", "Saudi technology news"]
        focus_keyword = keywords[0]
        if focus_keyword.casefold() in used_focus_keywords:
            focus_keyword = trim_words(title, 80)
            keywords = [focus_keyword] + [value for value in keywords if value.casefold() != focus_keyword.casefold()]
        used_focus_keywords.add(focus_keyword.casefold())
        event_bucket = picked.get("event_bucket") or source["event_bucket"]
        topic_names = canonical_topics_for(source, event_bucket)
        company_names = canonicalize_companies(split_pipe(source["companies"]))
        people_names = split_pipe(source["people"])
        event_names = ["LEAP 2026", "DeepFest 2026"] if event_bucket == "Both" else [event_bucket]
        primary_category, category_names = category_for(source)
        tag_names = []
        for value in event_names + topic_names[:5] + company_names[:3] + ["Saudi Arabia", "Riyadh"]:
            if value and value.casefold() not in {x.casefold() for x in tag_names}:
                tag_names.append(value)

        supporting_urls = split_pipe(source["supporting_source_urls"])
        excerpt = trim_words(source["angle_summary"], 240)
        seo_title = trim_words(title, 60)
        seo_description = trim_words(source["angle_summary"], 160)
        canonical_url = f"{SITE}/events-conferences/{slug}"

        articles.append(
            {
                "batch_id": "leap-deepfest-2026-day1",
                "sequence": index,
                "candidate_id": candidate_id,
                "canonical_announcement_key": picked["canonical_announcement_key"],
                "selection_reason": picked["selection_reason"],
                "title": title,
                "slug": slug,
                "author_public_name": "TechScoop Desk",
                "workflow_status_slug": "draft",
                "article_type": "news",
                "is_featured": False,
                "is_trending": False,
                "is_editor_pick": False,
                "is_flash": False,
                "announcement_date": source["announcement_date"],
                "display_datetime_local": scheduled_local.isoformat(),
                "display_datetime_utc": scheduled_utc.isoformat().replace("+00:00", "Z"),
                "timezone": "Asia/Riyadh",
                "excerpt": excerpt,
                "content_target_words": {"minimum": 800, "preferred": 1050, "maximum": 1400},
                "primary_category_name": primary_category,
                "category_names": category_names,
                "event_names": event_names,
                "event_bucket": event_bucket,
                "company_names": company_names,
                "people_names": people_names,
                "topic_names": topic_names,
                "tag_names": tag_names,
                "coverage": {"country_iso2": "SA", "country_name": "Saudi Arabia", "city_name": "Riyadh", "region_name": "Gulf Region"},
                "seo": {
                    "focus_keyword": focus_keyword,
                    "keywords": keywords,
                    "seo_title": seo_title,
                    "seo_description": seo_description,
                    "og_title": trim_words(title, 90),
                    "og_description": trim_words(source["angle_summary"], 200),
                    "google_news_keywords": keywords[:10],
                    "canonical_url": canonical_url,
                    "robots_indexing": "index",
                },
                "sources": {
                    "primary_title": source["primary_source_title"],
                    "primary_url": source["primary_source_url"],
                    "supporting_urls": supporting_urls,
                    "verified_angle_summary": source["angle_summary"],
                    "verified_key_facts": source["key_facts"],
                    "confidence": source["confidence"],
                },
                "image": {
                    "candidate_url": "" if str(source["image_candidate_url"]).upper() == "NA" else source["image_candidate_url"],
                    "credit": "" if str(source["image_credit"]).upper() == "NA" else source["image_credit"],
                    "license_note": source["image_license_note"],
                    "required_width": 1600,
                    "required_height": 900,
                    "required_mime_type": "image/webp",
                    "alt_text_template": trim_words(f"{title} — LEAP and DeepFest 2026 news", 255),
                    "caption_template": trim_words(f"{title}. Image prepared for TechScoop's LEAP and DeepFest 2026 coverage.", 500),
                    "fallback_credit": "TechScoop illustration",
                },
                "drafting_brief": {
                    "angle": source["angle_summary"],
                    "key_facts": source["key_facts"],
                    "voice": "Human newsroom prose: direct, specific, measured, varied sentence rhythm, no hype padding and no unsupported claims.",
                    "structure": "News lead; evidence and material details; company or institution context; Saudi/MENA relevance; practical implications; caveats and what happens next; source note.",
                },
            }
        )

    blueprint = {
        "batch": {
            "id": "leap-deepfest-2026-day1",
            "article_count": len(articles),
            "author_public_name": "TechScoop Desk",
            "workflow_status_slug": "draft",
            "public_publish_allowed": False,
            "review_required": True,
            "date": "2026-08-31",
            "timezone": "Asia/Riyadh",
            "window_start": start.isoformat(),
            "window_end": end.isoformat(),
            "event_distribution": {
                "LEAP 2026": sum(1 for a in articles if a["event_bucket"] == "LEAP 2026"),
                "DeepFest 2026": sum(1 for a in articles if a["event_bucket"] == "DeepFest 2026"),
                "Both": sum(1 for a in articles if a["event_bucket"] == "Both"),
            },
        },
        "articles": articles,
    }
    (OUT / "editorial-blueprint.json").write_text(json.dumps(blueprint, ensure_ascii=False, indent=2) + "\n")

    entity_map = {
        "author": {"public_name": "TechScoop Desk", "resolve_by": ["publicName", "name", "username"]},
        "events": sorted({name for article in articles for name in article["event_names"]}),
        "categories": sorted({name for article in articles for name in article["category_names"]}),
        "companies": sorted({name for article in articles for name in article["company_names"]}),
        "people": sorted({name for article in articles for name in article["people_names"]}),
        "topics": sorted({name for article in articles for name in article["topic_names"]}),
        "tags": sorted({name for article in articles for name in article["tag_names"]}),
        "coverage": {"country_iso2": "SA", "city_name": "Riyadh", "region_name": "Gulf Region"},
    }
    (OUT / "entity-map.json").write_text(json.dumps(entity_map, ensure_ascii=False, indent=2) + "\n")

    with (OUT / "source-ledger.csv").open("w", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=["sequence", "candidate_id", "headline", "event_bucket", "announcement_key", "primary_source", "supporting_sources", "confidence"])
        writer.writeheader()
        for article in articles:
            writer.writerow({
                "sequence": article["sequence"],
                "candidate_id": article["candidate_id"],
                "headline": article["title"],
                "event_bucket": article["event_bucket"],
                "announcement_key": article["canonical_announcement_key"],
                "primary_source": article["sources"]["primary_url"],
                "supporting_sources": " | ".join(article["sources"]["supporting_urls"]),
                "confidence": article["sources"]["confidence"],
            })

    with (OUT / "timestamp-schedule.csv").open("w", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=["sequence", "slug", "title", "event_bucket", "display_datetime_local", "display_datetime_utc", "workflow_status"])
        writer.writeheader()
        for article in articles:
            writer.writerow({
                "sequence": article["sequence"],
                "slug": article["slug"],
                "title": article["title"],
                "event_bucket": article["event_bucket"],
                "display_datetime_local": article["display_datetime_local"],
                "display_datetime_utc": article["display_datetime_utc"],
                "workflow_status": article["workflow_status_slug"],
            })

    with (OUT / "seo-plan.csv").open("w", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=["sequence", "slug", "focus_keyword", "seo_title", "seo_description", "keywords", "canonical_url", "robots_indexing"])
        writer.writeheader()
        for article in articles:
            seo = article["seo"]
            writer.writerow({
                "sequence": article["sequence"],
                "slug": article["slug"],
                "focus_keyword": seo["focus_keyword"],
                "seo_title": seo["seo_title"],
                "seo_description": seo["seo_description"],
                "keywords": ", ".join(seo["keywords"]),
                "canonical_url": seo["canonical_url"],
                "robots_indexing": seo["robots_indexing"],
            })

    overview = [
        "# LEAP / DeepFest 2026 Day-1 Editorial Blueprint",
        "",
        "This blueprint contains **100 source-verified, non-duplicative article assignments** attributed to **TechScoop Desk**. Every record is locked to the editorial `draft` workflow, carries an explicit LEAP/DeepFest event relation, and has a display timestamp distributed across 31 August 2026 from 12:00 PM to 11:59 PM Asia/Riyadh. Nothing in this package authorizes publication.",
        "",
        "| # | Time (Riyadh) | Event | Headline | Primary source |",
        "|---:|---|---|---|---|",
    ]
    for article in articles:
        time_text = datetime.fromisoformat(article["display_datetime_local"]).strftime("%H:%M:%S")
        overview.append(f"| {article['sequence']} | {time_text} | {article['event_bucket']} | {article['title'].replace('|', '/')} | [Source]({article['sources']['primary_url']}) |")
    overview.extend([
        "",
        "## Import Guardrails",
        "",
        "The importer must resolve the **TechScoop Desk** user, the initial editorial workflow status, all event/entity/taxonomy records, and a valid media row before article insertion. It must insert article and relation rows in one transaction per article or one transaction for the batch, write workflow audit records, remain idempotent by batch ID and slug, default to dry-run mode, and refuse any workflow status whose `isPublished` flag is true.",
        "",
        "## Image Standard",
        "",
        "Every article requires a 1600×900 WebP hero image with accurate alt text, caption, ownership/credit information, and an editorial-rights note. Official press imagery may be used only when its source and permitted editorial use are documented. Otherwise, the image must be an original TechScoop illustration that does not imitate protected trade dress or fabricate a photographic event scene.",
    ])
    (OUT / "editorial-blueprint.md").write_text("\n".join(overview) + "\n")

    print(json.dumps({
        "articles": len(articles),
        "unique_slugs": len(used_slugs),
        "events": blueprint["batch"]["event_distribution"],
        "companies": len(entity_map["companies"]),
        "people": len(entity_map["people"]),
        "topics": len(entity_map["topics"]),
        "tags": len(entity_map["tags"]),
        "window_start": blueprint["batch"]["window_start"],
        "window_end": blueprint["batch"]["window_end"],
        "output_dir": str(OUT),
    }, indent=2))


if __name__ == "__main__":
    main()
