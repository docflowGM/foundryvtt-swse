#!/usr/bin/env python3
"""
TALENT TREE SSOT RECONCILIATION SCRIPT
Step 3-5: Load, validate, and reconcile talent ownership
"""

import json
from pathlib import Path
from collections import defaultdict

BASE = Path("packs")

print("=" * 60)
print("TALENT TREE SSOT RECONCILIATION")
print("=" * 60)

# STEP 3: Load talents and trees
print("\n[1/5] Loading talents...")
talents = []
with open(BASE / "talents.db", "r") as f:
    for line in f:
        if line.strip():
            talents.append(json.loads(line))
print(f"  ✓ Loaded {len(talents)} talents")

print("[2/5] Loading talent trees...")
trees = []
with open(BASE / "talent_trees.db", "r") as f:
    for line in f:
        if line.strip():
            trees.append(json.loads(line))
print(f"  ✓ Loaded {len(trees)} talent trees")

# STEP 4: Build lookup tables
print("\n[3/5] Building lookup tables...")
talent_by_id = {t["_id"]: t for t in talents}
errors = {
    "missing_talent": [],  # tree references non-existent talent
    "duplicate_claim": [],  # talent claimed by multiple trees
    "orphaned": [],        # talent not claimed by any tree
    "no_talentIds": []     # tree has no talentIds field
}

claimed_by_tree = {}  # talent_id -> tree_id

# Walk trees and claim talents
for tree in trees:
    tree_id = tree["_id"]
    talent_ids = tree.get("system", {}).get("talentIds", [])

    if not talent_ids:
        errors["no_talentIds"].append(tree_id)
        continue

    for tid in talent_ids:
        if tid not in talent_by_id:
            errors["missing_talent"].append((tree_id, tid))
            continue

        if tid in claimed_by_tree:
            errors["duplicate_claim"].append(
                (tid, claimed_by_tree[tid], tree_id)
            )
        else:
            claimed_by_tree[tid] = tree_id

# Detect orphaned talents
for tid in talent_by_id:
    if tid not in claimed_by_tree:
        errors["orphaned"].append(tid)

print(f"  ✓ Trees: {len(trees)}")
print(f"  ✓ Talents: {len(talents)}")
print(f"  ✓ Claimed: {len(claimed_by_tree)}")

# STEP 5: Report errors
print("\n[4/5] VALIDATION REPORT")
print("-" * 60)

total_errors = sum(len(v) for v in errors.values())

if errors["no_talentIds"]:
    print(f"\n⚠️  TREES WITH NO TALENTIDS ({len(errors['no_talentIds'])}):")
    for tree_id in errors["no_talentIds"][:10]:
        print(f"    - {tree_id}")
    if len(errors["no_talentIds"]) > 10:
        print(f"    ... and {len(errors['no_talentIds']) - 10} more")

if errors["missing_talent"]:
    print(f"\n❌ MISSING TALENTS ({len(errors['missing_talent'])}):")
    for tree_id, tid in errors["missing_talent"][:10]:
        print(f"    - Tree {tree_id} references non-existent {tid}")
    if len(errors["missing_talent"]) > 10:
        print(f"    ... and {len(errors['missing_talent']) - 10} more")

if errors["duplicate_claim"]:
    print(f"\n❌ DUPLICATE CLAIMS ({len(errors['duplicate_claim'])}):")
    for tid, tree1, tree2 in errors["duplicate_claim"][:10]:
        print(f"    - {tid} claimed by BOTH {tree1} and {tree2}")
    if len(errors["duplicate_claim"]) > 10:
        print(f"    ... and {len(errors['duplicate_claim']) - 10} more")

if errors["orphaned"]:
    print(f"\n⚠️  ORPHANED TALENTS ({len(errors['orphaned'])}):")
    for tid in errors["orphaned"][:20]:
        talent_name = talent_by_id[tid].get("name", "Unknown")
        print(f"    - {tid} ({talent_name})")
    if len(errors["orphaned"]) > 20:
        print(f"    ... and {len(errors['orphaned']) - 20} more")

# STEP 6: Write derived treeId back to talents (for runtime convenience)
print("\n[5/5] Writing derived treeId to talents...")
updated = 0
for talent in talents:
    tid = talent["_id"]
    if tid in claimed_by_tree:
        if "system" not in talent:
            talent["system"] = {}
        talent["system"]["treeId"] = claimed_by_tree[tid]
        updated += 1

print(f"  ✓ Updated {updated} talents with derived treeId")

# Save normalized output
print("\n" + "=" * 60)
print("SAVING NORMALIZED DATA")
print("=" * 60)

with open(BASE / "talents.db", "w") as f:
    for talent in talents:
        f.write(json.dumps(talent) + "\n")
print("✓ Saved talents.db")

with open(BASE / "talent_trees.db", "w") as f:
    for tree in trees:
        f.write(json.dumps(tree) + "\n")
print("✓ Saved talent_trees.db")

# Write detailed report
report = {
    "summary": {
        "total_talents": len(talents),
        "total_trees": len(trees),
        "claimed_talents": len(claimed_by_tree),
        "errors": total_errors
    },
    "errors": {
        "trees_with_no_talentIds": errors["no_talentIds"],
        "missing_talents": errors["missing_talent"],
        "duplicate_claims": errors["duplicate_claim"],
        "orphaned_talents": errors["orphaned"]
    }
}

Path("reports").mkdir(exist_ok=True)
with open(Path("reports") / "talent-reconciliation.json", "w") as f:
    json.dump(report, f, indent=2)
print("✓ Wrote reports/talent-reconciliation.json")

print("\n" + "=" * 60)
if total_errors == 0:
    print("✅ RECONCILIATION COMPLETE - NO ERRORS FOUND")
else:
    print(f"⚠️  RECONCILIATION COMPLETE - {total_errors} ISSUES FOUND")
    print("Review reports/talent-reconciliation.json for details")
print("=" * 60)
