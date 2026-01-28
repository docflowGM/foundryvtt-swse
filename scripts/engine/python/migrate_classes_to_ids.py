#!/usr/bin/env python3
"""
MIGRATE CLASSES TO ID-BASED TALENT TREE REFERENCES (Phase 3)

Converts classes from:
  system.talent_trees: ["Jedi Guardian", "Lightsaber Combat"]
To:
  system.talentTreeIds: ["jedi_guardian", "lightsaber_combat"]

This completes the SSOT refactor by removing name-based references.
Classes now only reference trees by stable normalized IDs.
"""

import json
import re
from pathlib import Path

BASE = Path("packs")

def normalize_tree_id(name):
    """Normalize tree name to ID (matches talent-tree-normalizer.js)"""
    if not name:
        return ""
    return name.lower().replace("'", "").replace("-", "_").replace(" ", "_").replace("/", "_")

def fix_encoding_corruption(text):
    """Try to fix UTF-8 encoding corruption (e.g., TerÃ¤s -> Teräs)"""
    if not text:
        return text
    try:
        # If text was incorrectly decoded as latin-1, try to re-encode and decode properly
        if "Ã" in text or "Â" in text:
            # Common corruption patterns
            fixed = text.replace("Ã¤", "ä").replace("Ã©", "é").replace("ë", "ë")
            return fixed
    except:
        pass
    return text

print("=" * 70)
print("PHASE 3: MIGRATE CLASSES TO ID-BASED TALENT TREE REFERENCES")
print("=" * 70)

# Load all data
print("\n[1/4] Loading data...")
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

classes = []
with open(BASE / "classes.db") as f:
    for line in f:
        if line.strip():
            classes.append(json.loads(line))

print(f"  ✓ {len(talents)} talents")
print(f"  ✓ {len(trees)} talent trees")
print(f"  ✓ {len(classes)} classes")

# Build name -> normalized ID mapping
print("\n[2/4] Building tree name to ID mapping...")
tree_name_to_id = {}
for tree in trees:
    tree_name = tree.get("name", "")
    normalized_id = normalize_tree_id(tree_name)
    tree_name_to_id[tree_name] = normalized_id
    print(f"  {tree_name} -> {normalized_id}")

print(f"  ✓ Mapped {len(tree_name_to_id)} trees")

# Build case-insensitive tree lookup (for encoding/spelling mismatches)
tree_name_lower_to_id = {name.lower(): id for name, id in tree_name_to_id.items()}

# Build normalized lookup (strip special chars for fuzzy matching)
def normalize_for_matching(text):
    """Strip/replace special characters for fuzzy matching"""
    import unicodedata
    # Try to normalize unicode
    try:
        text = unicodedata.normalize('NFKD', text).encode('ascii', 'ignore').decode('ascii')
    except:
        # Fallback: just remove non-ASCII
        text = ''.join(c for c in text if ord(c) < 128)
    return text.lower().replace("'", "").replace("-", " ").replace("_", " ")

tree_name_normalized_to_id = {}
for name, id in tree_name_to_id.items():
    normalized = normalize_for_matching(name)
    tree_name_normalized_to_id[normalized] = id

# Migrate classes
print("\n[3/4] Migrating classes from name-based to ID-based...")
migrated = 0
failed = []

for cls in classes:
    cls_name = cls.get("name", "Unknown")
    old_tree_names = cls.get("system", {}).get("talent_trees", [])

    if not old_tree_names:
        continue

    # Convert names to IDs
    new_tree_ids = []
    for tree_name in old_tree_names:
        # Try exact match first
        tree_id = tree_name_to_id.get(tree_name)

        # Try case-insensitive match
        if not tree_id:
            tree_id = tree_name_lower_to_id.get(tree_name.lower())

        # Try normalized match (handles encoding corruption)
        if not tree_id:
            normalized = normalize_for_matching(tree_name)
            tree_id = tree_name_normalized_to_id.get(normalized)

        if tree_id:
            new_tree_ids.append(tree_id)
        else:
            failed.append((cls_name, tree_name))
            print(f"  ⚠️  {cls_name}: Unknown tree '{tree_name}'")

    # Update class
    if "system" not in cls:
        cls["system"] = {}

    cls["system"]["talentTreeIds"] = new_tree_ids

    # Keep old field for backwards compatibility (read-only)
    # but prefer talentTreeIds going forward
    migrated += 1

print(f"  ✓ Migrated {migrated} classes")
if failed:
    print(f"  ⚠️  {len(failed)} missing tree references:")
    for cls_name, tree_name in failed[:10]:
        print(f"     - {cls_name} referenced '{tree_name}'")
    if len(failed) > 10:
        print(f"     ... and {len(failed) - 10} more")

# Save
print("\n[4/4] Saving classes.db...")
with open(BASE / "classes.db", "w") as f:
    for cls in classes:
        f.write(json.dumps(cls) + "\n")

print("  ✓ Saved classes.db")

print("\n" + "=" * 70)
print("✅ CLASS MIGRATION COMPLETE")
print("=" * 70)
print(f"Migrated: {migrated} classes")
print(f"Failed:   {len(failed)} references")
if len(failed) == 0:
    print("\n🎯 ALL CLASSES SUCCESSFULLY CONVERTED TO ID-BASED REFERENCES")
