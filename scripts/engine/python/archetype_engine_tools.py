"""
SWSE Archetype Engine Tools
==========================

Implements:
  STEP 2 — Archetype affinity scoring & suggestion weighting
  STEP 3 — Archetype dataset validation (CI-safe)

IMPORTANT:
- This script does NOT modify archetype data.
- Archetypes are treated as soft, non-exclusive signals.
- Resolution is name-based, never raw slug-based.

Source of Truth:
  foundryvtt-swse/data/class-archetypes.json
"""

import json
import math
import sys
from pathlib import Path
from typing import Dict, List, Any


# ------------------------------------------------------------
# CONFIG
# ------------------------------------------------------------

ARCHETYPE_PATH = Path(__file__).parent.parent.parent.parent / "data" / "class-archetypes.json"

REQUIRED_FIELDS = {
    "name",
    "status",
    "mechanicalBias",
    "roleBias",
    "attributeBias",
    "talentKeywords",
    "featKeywords",
    "notes",
}

ACTIVE_STATUS = "active"


# ------------------------------------------------------------
# UTILITY — FLATTEN NESTED STRUCTURE
# ------------------------------------------------------------

def flatten_archetypes(data: Dict[str, Any], include_stubs: bool = False) -> Dict[str, Any]:
    """
    Converts nested class->archetypes structure into flat dict.

    Input:
      {
        "classes": {
          "jedi": {
            "archetypes": {
              "guardian_defender": { "name": "Guardian Defender", ... }
            }
          }
        }
      }

    Output:
      {
        "guardian defender": { "name": "Guardian Defender", ... },
        "aggressive duelist": { ... }
      }

    By default, only includes 'active' archetypes.
    Set include_stubs=True to include stubs as well (for analysis).
    """
    flat = {}

    classes = data.get("classes", {})
    for class_key, class_data in classes.items():
        archetypes = class_data.get("archetypes", {})
        for archetype_key, archetype_data in archetypes.items():
            status = archetype_data.get("status")
            if not include_stubs and status != ACTIVE_STATUS:
                continue

            # Use name as key, normalized
            name = archetype_data.get("name", archetype_key)
            name_key = name.lower().strip()
            flat[name_key] = archetype_data

    return flat


# ------------------------------------------------------------
# STEP 3 — VALIDATOR (CI SAFE)
# ------------------------------------------------------------

def validate_archetypes(archetypes: Dict[str, Any]) -> None:
    """
    Validates only active archetypes.
    Skips stubs with warning.
    Fails hard if:
      - Any ACTIVE archetype is missing required fields
    """
    errors = []
    active_count = 0
    stub_count = 0

    for key, archetype in archetypes.items():
        status = archetype.get("status")

        if status == "stub":
            stub_count += 1
            continue

        if status != ACTIVE_STATUS:
            errors.append(
                f"[INVALID STATUS] {archetype.get('name', key)} → {status} (expected 'active' or 'stub')"
            )
            continue

        active_count += 1
        missing = REQUIRED_FIELDS - archetype.keys()
        if missing:
            errors.append(
                f"[MISSING FIELDS] {archetype.get('name', key)} → {sorted(missing)}"
            )

    if errors:
        print("❌ ARCHETYPE VALIDATION FAILED\n")
        for e in errors:
            print(" -", e)
        sys.exit(1)

    if stub_count > 0:
        print(f"⚠️  Skipped {stub_count} stub archetypes")

    print(f"✅ Archetype validation passed ({active_count} active archetypes, all fields present)")


# ------------------------------------------------------------
# STEP 2 — ARCHETYPE AFFINITY ENGINE
# ------------------------------------------------------------

def normalize_name(name: str) -> str:
    """Canonical name normalization for safe matching."""
    return name.lower().strip()


def softmax(scores: Dict[str, float]) -> Dict[str, float]:
    """Softmax normalization for affinity distribution."""
    if not scores:
        return {}

    max_score = max(scores.values())
    exp_scores = {k: math.exp(v - max_score) for k, v in scores.items()}
    total = sum(exp_scores.values())

    return {k: v / total for k, v in exp_scores.items()}


def calculate_archetype_affinity(
    archetypes: Dict[str, Any],
    character_state: Dict[str, Any],
) -> Dict[str, float]:
    """
    Calculates archetype affinity based on character choices.

    character_state may contain:
      - feats: List[str]
      - talents: List[str]
      - attributes: Dict[str, int]
    """

    affinity = {}

    feats = [normalize_name(f) for f in character_state.get("feats", [])]
    talents = [normalize_name(t) for t in character_state.get("talents", [])]
    attributes = character_state.get("attributes", {})

    for archetype in archetypes.values():
        score = 0.0

        # Feat keyword alignment
        for kw in archetype["featKeywords"]:
            if normalize_name(kw) in feats:
                score += 1.0

        # Talent keyword alignment
        for kw in archetype["talentKeywords"]:
            if normalize_name(kw) in talents:
                score += 1.5

        # Attribute bias alignment
        for attr, weight in archetype["attributeBias"].items():
            if attr in attributes:
                score += attributes[attr] * weight * 0.01

        if score > 0:
            affinity[normalize_name(archetype["name"])] = score

    return softmax(affinity)


def weight_suggestions(
    base_suggestions: Dict[str, float],
    archetype_affinity: Dict[str, float],
    archetypes: Dict[str, Any],
) -> Dict[str, float]:
    """
    Applies archetype bias to suggestion scores.

    base_suggestions:
      { "feat_or_talent_name": base_score }

    Returns:
      { "feat_or_talent_name": weighted_score }
    """

    weighted = {}

    for suggestion, base_score in base_suggestions.items():
        multiplier = 1.0
        s_norm = normalize_name(suggestion)

        for archetype in archetypes.values():
            name_key = normalize_name(archetype["name"])
            affinity = archetype_affinity.get(name_key, 0)

            if (
                s_norm in map(normalize_name, archetype["featKeywords"])
                or s_norm in map(normalize_name, archetype["talentKeywords"])
            ):
                multiplier += affinity * 0.75

        weighted[suggestion] = round(base_score * multiplier, 4)

    return weighted


# ------------------------------------------------------------
# MAIN (CLI / CI ENTRY)
# ------------------------------------------------------------

def main():
    if not ARCHETYPE_PATH.exists():
        print(f"❌ Archetype file not found: {ARCHETYPE_PATH}")
        sys.exit(1)

    with open(ARCHETYPE_PATH, "r", encoding="utf-8") as f:
        raw_data = json.load(f)

    archetypes = flatten_archetypes(raw_data)
    validate_archetypes(archetypes)

    # Example simulation (safe to remove)
    example_character = {
        "feats": ["Weapon Focus (Lightsabers)", "Power Attack"],
        "talents": ["Block", "Deflect"],
        "attributes": {
            "STR": 16,
            "DEX": 14,
            "WIS": 12,
        },
    }

    affinity = calculate_archetype_affinity(archetypes, example_character)

    print("\n🔎 Example Archetype Affinity")
    for k, v in sorted(affinity.items(), key=lambda x: x[1], reverse=True):
        print(f"  {k}: {round(v, 3)}")


if __name__ == "__main__":
    main()
