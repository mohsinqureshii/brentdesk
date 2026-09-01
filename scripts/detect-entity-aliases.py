#!/usr/bin/env python3
"""Detect likely entity aliases using normalized names and conservative similarity."""
from __future__ import annotations
import json
import re
from collections import defaultdict
from difflib import SequenceMatcher
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "content/leap-deepfest-2026/final/import-manifest.json"
OUT = ROOT / "content/leap-deepfest-2026/qa/entity-alias-candidates.json"

STOP = {"the", "and", "of", "for", "in", "at", "a", "an", "inc", "ltd", "limited", "company", "co"}

def norm(value: str) -> str:
    value = value.casefold().replace("&", " and ")
    value = re.sub(r"[^a-z0-9]+", " ", value)
    tokens = [t for t in value.split() if t not in STOP]
    return " ".join(tokens)

def token_score(a: str, b: str) -> float:
    na, nb = norm(a), norm(b)
    if na == nb: return 1.0
    sa, sb = set(na.split()), set(nb.split())
    jaccard = len(sa & sb) / max(1, len(sa | sb))
    seq = SequenceMatcher(None, na, nb).ratio()
    return max(jaccard, seq)

def collect(articles, field):
    refs = defaultdict(list)
    for article in articles:
        for name in article.get(field, []):
            refs[name].append(article["sequence"])
    return refs

def main():
    manifest = json.loads(MANIFEST.read_text())
    output = {}
    for field in ("company_names", "people_names"):
        refs = collect(manifest["articles"], field)
        names = sorted(refs, key=str.casefold)
        exact = defaultdict(list)
        for name in names: exact[norm(name)].append(name)
        pairs = []
        for i, left in enumerate(names):
            for right in names[i+1:]:
                score = token_score(left, right)
                if score >= 0.82:
                    pairs.append({"left": left, "right": right, "score": round(score, 3), "left_articles": refs[left], "right_articles": refs[right]})
        output[field] = {"unique_names": len(names), "normalized_collisions": [v for v in exact.values() if len(v)>1], "similar_pairs": sorted(pairs, key=lambda x: (-x["score"], x["left"].casefold(), x["right"].casefold()))}
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({field:{"unique_names":data["unique_names"],"normalized_collisions":len(data["normalized_collisions"]),"similar_pairs":len(data["similar_pairs"])} for field,data in output.items()}, indent=2))

if __name__ == "__main__": main()
