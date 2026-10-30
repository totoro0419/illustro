#!/usr/bin/env python3
"""Validate final product scope against the frozen 247-feature source; no application execution."""
import json
from collections import Counter
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
source = json.loads((HERE / "features.json").read_text(encoding="utf-8"))
final = json.loads((HERE / "FEATURE_SCOPE_FINAL_247.json").read_text(encoding="utf-8"))
rows = final["features"]
errors = []
source_by_id = {x["id"]: x for x in source}
final_by_id = {x["id"]: x for x in rows}

def require(ok, message):
    if not ok:
        errors.append(message)

require(len(source) == len(rows) == 247, "247 feature rows")
require(len(source_by_id) == len(final_by_id) == 247, "unique feature IDs")
require(set(source_by_id) == set(final_by_id), "exact feature identity set")
require(len(set(x["category"] for x in rows)) == 30, "30 categories")
status = Counter()
changed = []
for x in rows:
    original = source_by_id.get(x["id"])
    if not original:
        continue
    require((x["name"], x["category"], x["original_policy"], x["source_spec"]) ==
            (original["name"], original["category"], original["policy"], original["spec"]),
            "original source mismatch: " + x["id"])
    status[x["final_scope"]] += 1
    if x["final_scope"] in ("adopted_simplified", "adopted_partial", "deferred_advanced"):
        changed.append(x["id"])
require(status == Counter({
    "adopted": 186,
    "adopted_refinement": 48,
    "adopted_simplified": 1,
    "adopted_partial": 1,
    "deferred": 8,
    "deferred_advanced": 2,
    "out_of_scope": 1
}), "status distribution")
require(set(changed) == {"WET-002", "WET-003", "WET-004", "WET-005"}, "R12 scope exceptions")
active = sum(status[k] for k in ("adopted", "adopted_refinement", "adopted_simplified", "adopted_partial"))
held = status["deferred"] + status["deferred_advanced"]
require((active, held, status["out_of_scope"]) == (236, 10, 1), "target counts")
require(final["counts"]["active"] == active and
        final["counts"]["deferred"] == held and
        final["counts"]["out_of_scope"] == 1, "declared counts")
require(set(final["decisions"]) == {"D01", "D02", "D03", "D05"}, "closed product topics")
spec = (HERE / "FINAL_PRODUCT_SPEC.md").read_text(encoding="utf-8")
for item in ("D01", "D02", "D03", "D05", "236", "10", "247", "非破壊", "仮画像"):
    require(item in spec, "missing product decision term: " + item)
for path, phrase in [
    ("README.md", "FINAL_PRODUCT_SPEC.md"),
    ("docs/product-planning/README.md", "FINAL_PRODUCT_SPEC.md"),
    ("docs/performance-research/OPEN_DECISIONS.md", "FINAL_PRODUCT_SPEC.md"),
]:
    require(phrase in (ROOT / path).read_text(encoding="utf-8"), "missing spec entrypoint: " + path)
print(json.dumps({"passed": not errors, "source_features": len(source), "final_features": len(rows),
                 "categories": len(set(x["category"] for x in rows)), "active": active,
                 "deferred": held, "out_of_scope": status["out_of_scope"],
                 "scope_exceptions": sorted(changed), "errors": errors},
                ensure_ascii=False, indent=2))
raise SystemExit(1 if errors else 0)
