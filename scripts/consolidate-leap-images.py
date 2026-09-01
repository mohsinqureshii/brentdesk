#!/usr/bin/env python3
"""Download generated hero images and normalize them for the TechScoop media backend."""

from __future__ import annotations

import hashlib
import json
from concurrent.futures import ThreadPoolExecutor, as_completed
from io import BytesIO
from pathlib import Path

import requests
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "content" / "leap-deepfest-2026"
RESULTS = BASE / "images" / "generated-image-results.json"
BRIEFS = BASE / "image-briefs"
OUT = BASE / "images" / "final"
MANIFEST = BASE / "images" / "image-manifest.json"


def process(record: dict) -> dict:
    output = record["output"]
    sequence = int(output["sequence"])
    slug = output["slug"]
    brief = json.loads((BRIEFS / f"{sequence:03d}.json").read_text())
    response = requests.get(output["image"], timeout=180)
    response.raise_for_status()
    raw = response.content
    with Image.open(BytesIO(raw)) as image:
        image.load()
        source_format = image.format or "unknown"
        source_width, source_height = image.size
        rgb = image.convert("RGB")
        if rgb.size != (1600, 900):
            if abs((rgb.width / rgb.height) - (16 / 9)) < 0.01:
                rgb = rgb.resize((1600, 900), Image.Resampling.LANCZOS)
            else:
                rgb = ImageOps.fit(rgb, (1600, 900), method=Image.Resampling.LANCZOS, centering=(0.5, 0.5))
        filename = f"{sequence:03d}-{slug}.webp"
        target = OUT / filename
        rgb.save(target, format="WEBP", quality=88, method=6)

    final_bytes = target.read_bytes()
    return {
        "sequence": sequence,
        "candidate_id": brief["candidate_id"],
        "slug": slug,
        "local_path": str(target.resolve()),
        "filename": filename,
        "mime_type": "image/webp",
        "size": len(final_bytes),
        "width": 1600,
        "height": 900,
        "sha256": hashlib.sha256(final_bytes).hexdigest(),
        "source_generated_format": source_format,
        "source_generated_width": source_width,
        "source_generated_height": source_height,
        "alt": brief["alt"],
        "caption": brief["caption"],
        "credit": brief["credit"],
        "source_url": brief["source_url"],
        "license": brief["license"],
        "rights_status": brief["rights_status"],
        "rights_notes": brief["rights_notes"],
        "generation_reference": "content/leap-deepfest-2026/images/style-reference.png",
        "generation_brief": f"content/leap-deepfest-2026/image-briefs/{sequence:03d}.json",
    }


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    results = json.loads(RESULTS.read_text())["results"]
    records = []
    errors = []
    with ThreadPoolExecutor(max_workers=12) as executor:
        futures = {executor.submit(process, record): record for record in results}
        for future in as_completed(futures):
            try:
                records.append(future.result())
            except Exception as exc:
                source = futures[future]
                errors.append({"input": source.get("input"), "error": str(exc)})
    records.sort(key=lambda item: item["sequence"])
    manifest = {
        "count": len(records),
        "expected_count": 100,
        "errors": errors,
        "format": "image/webp",
        "dimensions": {"width": 1600, "height": 900},
        "rights_policy": "TechScoop original editorial illustrations; individual metadata follows each file.",
        "images": records,
    }
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({"images": len(records), "errors": len(errors), "output": str(OUT), "manifest": str(MANIFEST)}, indent=2))
    if errors or len(records) != 100:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
