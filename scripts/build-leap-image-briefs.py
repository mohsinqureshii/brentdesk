#!/usr/bin/env python3
"""Create one self-contained image-generation brief per editorial blueprint article."""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BLUEPRINT = ROOT / "content" / "leap-deepfest-2026" / "blueprint" / "editorial-blueprint.json"
OUT = ROOT / "content" / "leap-deepfest-2026" / "image-briefs"


def subject_direction(article: dict) -> str:
    blob = " ".join(
        [article["title"], article["sources"]["verified_angle_summary"], article["sources"]["verified_key_facts"]]
        + article.get("topic_names", [])
    ).casefold()
    rules = [
        (r"data cent|cloud region|compute|gpu|inference|server", "a credible high-density AI data center with illuminated server aisles, cooling architecture and flowing compute pathways"),
        (r"autonomous|robotaxi|truck|mobility|shuttle", "an intelligent mobility network with a modern autonomous vehicle or logistics fleet moving through a stylized Riyadh transport corridor"),
        (r"robot|humanoid|physical ai", "a refined industrial or humanoid robotics scene emphasizing sensors, dexterous mechanics and safe human-scale engineering"),
        (r"quantum", "a precise quantum-computing laboratory with cryogenic hardware, controlled light rings and abstract qubit-state geometry"),
        (r"cyber|post-quantum|security|border|fraud", "a layered cybersecurity command environment with protected data pathways, secure access gates and threat-detection signals"),
        (r"telecom|5g|6g|wireless|network|open ran", "a next-generation telecommunications network spanning Riyadh with antennas, edge nodes and clean signal-wave visualization"),
        (r"startup|accelerator|incubator|founder|venture|investment", "a high-energy startup and investment ecosystem scene with pitch-stage lighting, product prototypes and connected capital pathways, with no legible screens"),
        (r"government|ministr|authority|public service|absher|passport|justice", "a modern Saudi digital public-service environment represented by secure service portals, civic architecture and citizen-centered data flows, without official emblems"),
        (r"health|medical|biomarker|patient|food safety", "a clean digital-health or medical-technology scene with diagnostic sensing, secure health data and carefully rendered clinical equipment"),
        (r"manufactur|factory|industrial|device|laptop|pc|hardware|semiconductor|chip", "advanced Saudi technology manufacturing with precision robotics, semiconductor or device assembly and realistic engineered materials"),
        (r"gaming|esports|roblox|gamex", "a premium esports and digital-entertainment arena with immersive lighting, responsive game environments and no logos or readable interface text"),
        (r"geospatial|climate|hazard|gis|mapping", "a sophisticated geospatial intelligence view of Saudi terrain with satellite layers, hazard sensing and precise environmental data patterns"),
        (r"education|training|academy|skills|classroom", "a future-skills learning environment with collaborative workstations, spatial learning tools and visible human presence only as unidentifiable silhouettes"),
        (r"tourism|hospitality", "an intelligent Saudi tourism and hospitality experience connecting landmarks, mobility and personalized digital services without logos"),
        (r"logistics|supply chain|fleet|freight|port", "a connected logistics and supply-chain control scene with freight movement, warehouse automation and real-time route intelligence"),
        (r"finance|fintech|payment|bank", "a secure digital-finance ecosystem represented by verified transactions, embedded-finance pathways and institutional-grade data architecture"),
        (r"space|satellite|non-terrestrial", "a Saudi space-and-satellite communications concept linking orbital systems with terrestrial infrastructure and desert geography"),
    ]
    for pattern, direction in rules:
        if re.search(pattern, blob):
            return direction
    return "a story-specific enterprise-technology scene built around the announcement’s principal product, institution and operational impact"


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    data = json.loads(BLUEPRINT.read_text())
    for article in data["articles"]:
        sequence = article["sequence"]
        companies = article.get("company_names", [])[:4]
        people = article.get("people_names", [])[:3]
        event_names = article.get("event_names", [])
        subject = subject_direction(article)
        prompt = f"""Create a premium editorial technology-news hero image for TechScoop's coverage of {', '.join(event_names)} in Riyadh.

Story: {article['title']}
Verified angle: {article['sources']['verified_angle_summary']}
Principal organizations or institutions: {', '.join(companies) if companies else 'the organizations named in the story'}.
Relevant people for editorial context only: {', '.join(people) if people else 'no named individual is necessary'}.

Subject direction: {subject}. Make the image materially specific to this announcement through objects, setting and visual metaphor; do not create a generic conference crowd.

Composition: cinematic 16:9 landscape hero, 1600×900 final-use ratio, single strong focal point slightly right of center, generous clean negative space on the left, layered depth, crisp silhouette at thumbnail size. Where people are contextually useful, show only distant or over-the-shoulder editorial silhouettes unless an exact reference portrait is supplied; do not invent a recognizable face.

Visual style: match the supplied reference image's premium MENA enterprise-news aesthetic—dark navy and deep indigo foundation, electric cyan and violet data light, restrained warm sand-gold accents, photorealistic materials blended with elegant 3D editorial visualization, controlled volumetric lighting, credible business-technology tone.

Text/content: no text, no letters, no numbers, no logos, no watermarks, no badges, no brand marks, no national emblems, no fake signage and no readable user-interface elements.

Avoid: protected product trade dress, fabricated press photography, handshakes, crowded collage layouts, duplicated subjects, fantasy sci-fi excess, inaccurate corporate logos, distorted anatomy, recognizable but invented executives, and visual claims that go beyond the verified angle.
"""
        brief = {
            "sequence": sequence,
            "candidate_id": article["candidate_id"],
            "slug": article["slug"],
            "title": article["title"],
            "event_names": event_names,
            "company_names": companies,
            "people_names": people,
            "image_prompt": prompt,
            "requested_filename": f"{sequence:03d}-{article['slug']}.png",
            "target_width": 1600,
            "target_height": 900,
            "credit": "TechScoop illustration",
            "source_url": "https://techscoop.io",
            "license": "TechScoop original",
            "rights_status": "generated",
            "rights_notes": "Original editorial illustration generated for TechScoop's LEAP and DeepFest 2026 news coverage; no third-party logos, faces or protected trade dress intentionally reproduced.",
            "alt": article["image"]["alt_text_template"],
            "caption": article["image"]["caption_template"],
        }
        (OUT / f"{sequence:03d}.json").write_text(json.dumps(brief, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({"briefs": len(data["articles"]), "output": str(OUT)}, indent=2))


if __name__ == "__main__":
    main()
