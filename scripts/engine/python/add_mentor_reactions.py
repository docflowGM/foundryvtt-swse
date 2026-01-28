#!/usr/bin/env python3
"""
Add mentor reaction framework to dialogue entries.

Adds standardized reaction blocks to scolding mentors without modifying
existing dialogue. Safe to run multiple times (idempotent).

Usage:
    python3 add_mentor_reactions.py                    # Write to output file
    python3 add_mentor_reactions.py --dry-run         # Preview changes
    python3 add_mentor_reactions.py --input data.json # Custom input file
"""

import json
import copy
import argparse
import sys

INPUT_FILE = "data/mentor-template-dialogues.json"
OUTPUT_FILE = "data/mentor-template-dialogues-with-reactions.json"

# Mentors allowed to scold (by mentor key)
SCOLDING_MENTORS = {
    "malbada",      # Darth Malbada - Sith
    "miedo",        # Darth Miedo - Sith Lord
    "breach",       # Breach - Mandalorian
    "kharjo",       # Blade Master Kharjo
    "axiom",        # General Axiom - Droid
    "kex_varon",    # Kex Varon - Bounty Hunter
    "korr",         # Admiral Korr - Fleet Commander
    "dezmin",       # Dezmin - Imperial Knight
    "theron",       # Shield Captain Theron - Vanguard
    "skindar",      # Marl Skindar - Intelligence Operative
    "krag"          # Krag - Enforcer
}

# Default reaction templates
DEFAULT_REACTIONS = {
    "reject_suggestion": {
        "mild": [
            "You ignore sound advice.",
            "That choice works against your strengths."
        ],
        "harsh": [
            "You persist in error.",
            "This path will cost you."
        ]
    },
    "repeat_rejection": {
        "harsh": [
            "You refuse to learn.",
            "This pattern will end badly."
        ]
    },
    "accept_after_resistance": {
        "neutral": [
            "Good. You adapt.",
            "You learn—eventually."
        ]
    }
}


def add_reactions_to_dialogues(data, dry_run=False):
    """
    Add reactions block to scolding mentor dialogues.

    Args:
        data: Parsed JSON mentor data
        dry_run: If True, report changes without modifying data

    Returns:
        Updated data dict (or original if dry_run)
    """
    mentors = data.get("mentors", {})
    changes = []

    for mentor_key, mentor_data in mentors.items():
        mentor_name = mentor_data.get("name", mentor_key)

        if mentor_key not in SCOLDING_MENTORS:
            continue

        dialogues = mentor_data.get("dialogues", {})
        mentor_changes = 0

        for archetype_key, archetype_data in dialogues.items():
            # Skip if reactions already exist
            if "reactions" in archetype_data:
                continue

            mentor_changes += 1

            if not dry_run:
                archetype_data["reactions"] = copy.deepcopy(DEFAULT_REACTIONS)

        if mentor_changes > 0:
            changes.append(f"  {mentor_name:30s} (+{mentor_changes} dialogue paths)")

    return data, changes


def main():
    parser = argparse.ArgumentParser(
        description="Add mentor reaction framework to dialogue entries"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview changes without writing"
    )
    parser.add_argument(
        "--input",
        default=INPUT_FILE,
        help=f"Input JSON file (default: {INPUT_FILE})"
    )
    parser.add_argument(
        "--output",
        default=OUTPUT_FILE,
        help=f"Output JSON file (default: {OUTPUT_FILE})"
    )

    args = parser.parse_args()

    print(f"📖 Loading mentor data from: {args.input}")

    try:
        with open(args.input, "r", encoding="utf-8") as f:
            data = json.load(f)
    except FileNotFoundError:
        print(f"❌ Error: File not found: {args.input}")
        sys.exit(1)
    except json.JSONDecodeError:
        print(f"❌ Error: Invalid JSON in {args.input}")
        sys.exit(1)

    print(f"✓ Loaded {len(data.get('mentors', {}))} mentors")
    print()
    print(f"🔧 Processing {len(SCOLDING_MENTORS)} scolding mentors...")
    print()

    updated_data, changes = add_reactions_to_dialogues(data, dry_run=args.dry_run)

    if changes:
        print("Changes to be applied:")
        for change in changes:
            print(change)
        print()
        print(f"Total dialogues upgraded: {sum(int(c.split('+')[1].split()[0]) for c in changes)}")
    else:
        print("No changes needed (all mentors already have reactions).")
        return

    if args.dry_run:
        print()
        print("✓ Dry-run complete (no files written)")
    else:
        print()
        print(f"💾 Writing to: {args.output}")
        try:
            with open(args.output, "w", encoding="utf-8") as f:
                json.dump(updated_data, f, indent=2, ensure_ascii=False)
            print(f"✓ Reactions added successfully")
        except IOError as e:
            print(f"❌ Error writing file: {e}")
            sys.exit(1)


if __name__ == "__main__":
    main()
