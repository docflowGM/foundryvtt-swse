#!/usr/bin/env python3
"""
SWSE Classes.db SSOT Fixer - Final Version

This script:
1. Normalizes prestige class hit dice and defenses
2. Removes Force Point progression from classes (making it actor-derived only)
3. Applies the Shaper exception (grants_force_points: false)
4. Ensures classes.db is the authoritative SSOT
"""

import json
import shutil
from pathlib import Path
from typing import Dict, Tuple

# Root directory
ROOT = Path(__file__).parent.parent.parent
CLASSES_DB = ROOT / "packs" / "classes.db"

# Classes with special Force Point base
# These prestige classes have base 7 FP instead of standard 6
BASE_7_FP_CLASSES = {"Force Disciple", "Jedi Master", "Sith Lord"}

# Prestige class authoritative data
# Format: "Class Name": (hit_die, reflex, fortitude, will)
PRESTIGE_FIXES: Dict[str, Tuple[int, int, int, int]] = {
    "Ace Pilot":            (8,  2, 0, 4),
    "Bounty Hunter":        (10, 2, 4, 0),
    "Crime Lord":           (8,  0, 4, 2),
    "Elite Trooper":        (12, 4, 2, 0),
    "Force Adept":          (8,  2, 4, 2),
    "Force Disciple":       (8,  3, 6, 3),
    "Gunslinger":           (8,  0, 2, 4),
    "Jedi Knight":          (10, 2, 2, 2),
    "Jedi Master":          (10, 3, 3, 3),
    "Officer":              (8,  0, 4, 2),
    "Sith Apprentice":      (10, 2, 2, 1),
    "Sith Lord":            (10, 3, 3, 3),
    "Corporate Agent":      (8,  0, 4, 2),
    "Gladiator":            (10, 2, 4, 0),
    "Melee Duelist":        (8,  0, 2, 4),
    "Enforcer":             (8,  0, 2, 4),
    "Independent Droid":    (12, 0, 4, 2),
    "Infiltrator":          (8,  0, 2, 4),
    "Master Privateer":     (10, 0, 4, 2),
    "Medic":                (8,  4, 2, 0),
    "Saboteur":             (8,  0, 4, 2),
    "Assassin":             (10, 2, 4, 0),
    "Charlatan":            (8,  0, 4, 2),
    "Outlaw":               (8,  0, 0, 4),
    "Droid Commander":      (10, 2, 2, 2),
    "Military Engineer":    (8,  2, 2, 2),
    "Vanguard":             (10, 4, 2, 0),
    "Imperial Knight":      (10, 2, 2, 2),
    "Shaper":               (8,  2, 4, 0),
    "Improviser":           (8,  0, 4, 2),
    "Pathfinder":           (10, 4, 2, 0),
    "Martial Arts Master":  (10, 4, 2, 0),
}


def normalize_hit_die(hit_die_value) -> int:
    """Normalize hit die to integer format."""
    if isinstance(hit_die_value, int):
        return hit_die_value

    # Handle "1dX" format
    if isinstance(hit_die_value, str):
        hit_die_str = hit_die_value.replace("1d", "").strip()
        try:
            return int(hit_die_str)
        except ValueError:
            print(f"  ⚠️  Warning: Could not parse hit die '{hit_die_value}', defaulting to 6")
            return 6

    return 6


def fix_class(class_doc: dict) -> bool:
    """
    Fix a single class document.
    Returns True if changes were made.
    """
    changed = False
    name = class_doc.get("name", "Unknown")
    system = class_doc.setdefault("system", {})

    # Check if this is a prestige class
    is_prestige = not system.get("base_class", True)

    # Apply prestige class fixes
    if name in PRESTIGE_FIXES:
        hit, ref, fort, will = PRESTIGE_FIXES[name]

        # Mark as prestige class
        if system.get("base_class") is not False:
            system["base_class"] = False
            changed = True

        # Fix hit die
        current_hit = normalize_hit_die(system.get("hit_die"))
        if current_hit != hit:
            system["hit_die"] = f"1d{hit}"
            changed = True
            print(f"  ✓ {name}: hit_die {current_hit} → {hit}")

        # Fix defenses
        defenses = system.setdefault("defenses", {})
        if defenses.get("reflex") != ref:
            defenses["reflex"] = ref
            changed = True
        if defenses.get("fortitude") != fort:
            defenses["fortitude"] = fort
            changed = True
        if defenses.get("will") != will:
            defenses["will"] = will
            changed = True

        # Add grants_force_points flag (false for Shaper only)
        if name == "Shaper":
            if system.get("grants_force_points") is not False:
                system["grants_force_points"] = False
                changed = True
                print(f"  ✓ {name}: grants_force_points → false")
        else:
            if system.get("grants_force_points") is not True:
                system["grants_force_points"] = True
                changed = True

        # Set force_point_base for special classes (Force Disciple, Jedi Master, Sith Lord)
        if name in BASE_7_FP_CLASSES:
            if system.get("force_point_base") != 7:
                system["force_point_base"] = 7
                changed = True
                print(f"  ✓ {name}: force_point_base → 7")

    # Remove Force Point progression from ALL classes
    level_progression = system.get("level_progression", [])
    for level_entry in level_progression:
        if "force_points" in level_entry:
            del level_entry["force_points"]
            changed = True

    # Remove legacy FP hooks
    removed_keys = []
    for key in ["forcePointProgression", "forceSensitive", "grantsForcePoints"]:
        if key in system:
            del system[key]
            removed_keys.append(key)
            changed = True

    if removed_keys:
        print(f"  ✓ {name}: Removed legacy fields: {', '.join(removed_keys)}")

    return changed


def main():
    """Main execution function."""
    print("=" * 70)
    print("SWSE Classes.db SSOT Fixer")
    print("=" * 70)

    # Backup
    backup_path = CLASSES_DB.with_suffix(".db.backup")
    if not backup_path.exists():
        shutil.copy(CLASSES_DB, backup_path)
        print(f"✓ Backup created: {backup_path}")
    else:
        print(f"✓ Using existing backup: {backup_path}")

    print(f"\n📖 Reading: {CLASSES_DB}")

    # Read NDJSON
    classes = []
    with open(CLASSES_DB, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line:
                classes.append(json.loads(line))

    print(f"✓ Loaded {len(classes)} classes")

    # Apply fixes
    print("\n🔧 Applying fixes...")
    changes_made = 0
    for cls in classes:
        if fix_class(cls):
            changes_made += 1

    # Write back
    print(f"\n💾 Writing changes...")
    with open(CLASSES_DB, 'w', encoding='utf-8') as f:
        for cls in classes:
            f.write(json.dumps(cls, ensure_ascii=False) + '\n')

    print(f"✓ {changes_made} classes updated")

    print("\n" + "=" * 70)
    print("✅ COMPLETE - Classes.db is now SSOT-compliant")
    print("=" * 70)
    print("\nChanges made:")
    print("  ✓ Prestige class hit dice normalized")
    print("  ✓ Defense bonuses corrected")
    print("  ✓ Force Point class logic removed")
    print("  ✓ Shaper exception applied")
    print("\nNext steps:")
    print("  1. Create normalization layers (JS)")
    print("  2. Update Progression Engine to use ClassesDB")
    print("  3. Update CharGen to create state-only class items")
    print("\n⚠️  Restart Foundry to reload compendium data")


if __name__ == "__main__":
    main()
