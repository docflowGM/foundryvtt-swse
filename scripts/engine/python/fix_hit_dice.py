#!/usr/bin/env python3
"""
FIX HIT DICE MIGRATION

Classes in classes.db have legacy "hit_die": "1d8" format.
Normalizer expects system.hitDie (numeric: 6, 8, 10, 12).
This migration:
- Reads legacy hit_die field
- Parses "1dX" format to numeric die size
- Writes to system.hitDie
- Removes legacy field
"""

import json
import re
from pathlib import Path

BASE = Path("packs")

def parse_hit_die(raw):
    """Parse hit_die string like '1d8' -> 8"""
    if not raw:
        return 6

    # Match pattern like "1d6", "1d8", etc.
    match = re.search(r"d(\d+)", str(raw))
    if not match:
        return 6

    die = int(match.group(1))
    # Validate it's a valid SWSE hit die
    if die in (6, 8, 10, 12):
        return die
    else:
        return 6

print("=" * 70)
print("FIX HIT DICE MIGRATION")
print("=" * 70)

# Load classes
print("\n[1/3] Loading classes.db...")
classes = []
with open(BASE / "classes.db") as f:
    for line in f:
        if line.strip():
            classes.append(json.loads(line))

print(f"  ✓ Loaded {len(classes)} classes")

# Migrate hit dice (system.hit_die -> system.hitDie, snake_case -> camelCase)
print("\n[2/3] Migrating system.hit_die -> system.hitDie...")
migrated = {}

for cls in classes:
    cls_name = cls.get("name", "Unknown")

    if "system" not in cls:
        cls["system"] = {}

    # Check both snake_case (data) and camelCase (expected)
    snake_case = cls["system"].get("hit_die")
    camel_case = cls["system"].get("hitDie")

    # If we have snake_case, parse and migrate to camelCase
    if snake_case:
        numeric_die = parse_hit_die(snake_case)
        cls["system"]["hitDie"] = numeric_die
        migrated[cls_name] = f"{snake_case} -> d{numeric_die}"

        # Remove snake_case field
        del cls["system"]["hit_die"]

    # If neither exists, set default (shouldn't happen but be safe)
    elif not camel_case:
        cls["system"]["hitDie"] = 6

print(f"  ✓ Migrated {len(migrated)} classes")

# Show results
print("\n[3/3] Results:")
for name in sorted(migrated.keys()):
    print(f"  {name}: {migrated[name]}")

# Save
with open(BASE / "classes.db", "w") as f:
    for cls in classes:
        f.write(json.dumps(cls) + "\n")

print("\n✓ Saved classes.db")

print("\n" + "=" * 70)
print("✅ HIT DICE MIGRATION COMPLETE")
print("=" * 70)
print(f"All {len(migrated)} classes now have correct system.hitDie values")
print("Normalizer warnings will disappear on next startup")
