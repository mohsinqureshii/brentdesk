#!/usr/bin/env python3
"""Package every final draft under a predictable numbered QA filename."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "content" / "leap-deepfest-2026"
DRAFTS = BASE / "drafts" / "raw"
OUT = BASE / "qa" / "review-packets"

OUT.mkdir(parents=True, exist_ok=True)
files = sorted(DRAFTS.glob("*.json"))
if len(files) != 100:
    raise SystemExit(f"Expected 100 drafts, found {len(files)}")
for file_path in files:
    draft = json.loads(file_path.read_text())
    sequence = int(draft["sequence"])
    packet = {
        "instruction": "Audit this corrected draft against its embedded verified source boundary and locked metadata. Do not browse or edit.",
        "draft": draft,
    }
    (OUT / f"{sequence:03d}.json").write_text(json.dumps(packet, ensure_ascii=False, indent=2) + "\n")
print(json.dumps({"review_packets": len(files), "output": str(OUT)}, indent=2))
