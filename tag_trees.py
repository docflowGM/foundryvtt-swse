#!/usr/bin/env python3
"""
TAG TALENT TREES
Adds system.tags to talent trees for flag-based access control
- "force": Trees accessible to Force-sensitive characters
- "droid": Trees accessible to Droid characters
"""

import json
from pathlib import Path

BASE = Path("packs")

print("=" * 70)
print("TAGGING TALENT TREES")
print("=" * 70)

# Load trees
print("\n[1/2] Loading talent trees...")
trees = []
with open(BASE / "talent_trees.db") as f:
    for line in f:
        if line.strip():
            trees.append(json.loads(line))

print(f"  ✓ Loaded {len(trees)} trees")

# Force keywords (from SWSE canon)
force_trees = {
    "Alter", "Control", "Sense",  # Force skill trees
    "Dark Side Devotee", "Force Adept",  # Force classes
    "Dark Healing", "Force Item", "Force Warning",  # Force mechanics
    "Beastwarden", "Mystic", "Telepath",  # Force adept trees
    "Sith Alchemy", "Sith",  # Sith trees
    "Jedi Consular", "Jedi Guardian", "Jedi Sentinel",  # Jedi paths
    "Jedi Archivist", "Jedi Artisan", "Jedi Battlemaster",
    "Jedi Healer", "Jedi Instructor", "Jedi Investigator",
    "Jedi Refugee", "Jedi Shadow", "Jedi Watchman", "Jedi Weapon Master",  # Jedi specializations
    "Lightsaber Combat", "Lightsaber Forms", "Duelist",  # Saber combat
    "Force Hunter", "Imperial Inquisitor",  # Force-related hunter/inquisitor
    "Knight's Armor", "Knight's Resolve",  # Imperial Knight
    "Sith Apprentice", "Sith Commander",  # Sith paths
    "Sith Lord",  # Sith lord
}

droid_trees = {
    "1stdegree Droid", "2nddegree Droid", "3rddegree Droid", "4thdegree Droid", "5thdegree Droid",
    "Autonomy", "Specialized Droid", "Elite Droid",
    "Droid Commander", "Override",
}

print("\n[2/2] Tagging trees...")

force_count = 0
droid_count = 0

for tree in trees:
    tree_name = tree.get("name", "")
    tags = []

    # Check force trees
    if tree_name in force_trees:
        tags.append("force")
        force_count += 1

    # Check droid trees
    if tree_name in droid_trees:
        tags.append("droid")
        droid_count += 1

    # Add tags to system
    if tags:
        if "system" not in tree:
            tree["system"] = {}
        tree["system"]["tags"] = tags

print(f"  ✓ Tagged {force_count} force trees")
print(f"  ✓ Tagged {droid_count} droid trees")

# Save
print("\n[3/2] Saving talent_trees.db...")
with open(BASE / "talent_trees.db", "w") as f:
    for tree in trees:
        f.write(json.dumps(tree) + "\n")

print("  ✓ Saved")

print("\n" + "=" * 70)
print("✅ TAGGING COMPLETE")
print("=" * 70)
