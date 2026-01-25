#!/usr/bin/env python3
"""
BUILD TALENTIDS
Maps talents to trees by name, populates tree.system.talentIds array
"""

import json
import re
from pathlib import Path

def normalize_name(name):
    """Normalize tree/talent names for matching: remove hyphens, apostrophes, lowercase"""
    if not name:
        return ""
    # Remove apostrophes, hyphens, spaces
    normalized = re.sub(r"['\-\s]", "", name).lower()
    return normalized

BASE = Path("packs")

print("=" * 60)
print("BUILDING TALENTIDS ARRAY")
print("=" * 60)

# Load
print("\n[1/3] Loading data...")
talents = []
with open(BASE / "talents.db") as f:
    for line in f:
        if line.strip():
            talents.append(json.loads(line))

trees = []
with open(BASE / "talent_trees.db") as f:
    for line in f:
        if line.strip():
            trees.append(json.loads(line))

print(f"  ✓ {len(talents)} talents, {len(trees)} trees")

# Build name->tree-id map (exact + case-insensitive + normalized)
print("\n[2/3] Mapping talents to trees...")
tree_by_name = {}
tree_by_name_lower = {}
tree_by_name_normalized = {}
for tree in trees:
    tree_name = tree.get("name", "").strip()
    if tree_name:
        tree_by_name[tree_name] = tree["_id"]
        tree_by_name_lower[tree_name.lower()] = tree["_id"]
        normalized = normalize_name(tree_name)
        tree_by_name_normalized[normalized] = tree["_id"]

# Populate talentIds
for tree in trees:
    tree["system"]["talentIds"] = []

assigned = 0
orphaned = []

for talent in talents:
    tree_name = talent.get("system", {}).get("talent_tree", "").strip()

    if not tree_name:
        orphaned.append((talent["_id"], talent.get("name", "Unknown")))
        continue

    # Try exact match
    tree_id = tree_by_name.get(tree_name)

    # Try case-insensitive
    if not tree_id:
        tree_id = tree_by_name_lower.get(tree_name.lower())

    # Try normalized (strip apostrophes, hyphens, spaces)
    if not tree_id:
        normalized = normalize_name(tree_name)
        tree_id = tree_by_name_normalized.get(normalized)

    if not tree_id:
        orphaned.append((talent["_id"], talent.get("name", "Unknown"), f"tree '{tree_name}' not found"))
        continue

    # Find tree and add talent
    for tree in trees:
        if tree["_id"] == tree_id:
            if talent["_id"] not in tree["system"]["talentIds"]:
                tree["system"]["talentIds"].append(talent["_id"])
                assigned += 1
            break

print(f"  ✓ Assigned {assigned} talents")
print(f"  ⚠️  Orphaned: {len(orphaned)}")

if orphaned:
    print("\n  First 10 orphans:")
    for item in orphaned[:10]:
        print(f"    - {item}")

# STEP 6: Write derived treeId back to talents
print("\n[3/4] Writing derived treeId to talents...")
for tree in trees:
    tree_id = tree["_id"]
    for talent_id in tree["system"].get("talentIds", []):
        # Find talent and add treeId
        for talent in talents:
            if talent["_id"] == talent_id:
                if "system" not in talent:
                    talent["system"] = {}
                talent["system"]["treeId"] = tree_id
                break

print(f"  ✓ All talents have derived treeId")

# Save
print("\n[4/4] Saving...")
with open(BASE / "talents.db", "w") as f:
    for talent in talents:
        f.write(json.dumps(talent) + "\n")

with open(BASE / "talent_trees.db", "w") as f:
    for tree in trees:
        f.write(json.dumps(tree) + "\n")

print("  ✓ Saved talents.db")
print("  ✓ Saved talent_trees.db")

# Stats
print("\n" + "=" * 60)
print("STATS")
print("=" * 60)
trees_with_talents = sum(1 for t in trees if t["system"].get("talentIds"))
print(f"Trees with talentIds: {trees_with_talents}/{len(trees)}")

talents_with_tree_id = sum(1 for t in talents if t.get("system", {}).get("treeId"))
print(f"Talents with derived treeId: {talents_with_tree_id}/{len(talents)}")

talent_counts = {}
for tree in trees:
    count = len(tree["system"].get("talentIds", []))
    talent_counts[count] = talent_counts.get(count, 0) + 1

print("\nTalents per tree distribution:")
for count in sorted(talent_counts.keys()):
    print(f"  {talent_counts[count]} trees with {count} talents")

print("\n✅ DONE")
