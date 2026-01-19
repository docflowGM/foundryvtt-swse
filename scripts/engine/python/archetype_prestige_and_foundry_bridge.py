"""
SWSE Archetype → Prestige Hinting + Foundry Bridge
==================================================

Implements:
  STEP 5 — Archetype-aware prestige class hinting
  STEP 6 — JS/Foundry integration contract (Python reference)

This script:
- Consumes archetype affinity
- Emits non-forcing prestige suggestions
- Outputs a JS-ready data structure
"""

import json
from pathlib import Path
from typing import Dict, Any, List


# ------------------------------------------------------------
# CONFIG
# ------------------------------------------------------------

ARCHETYPE_PATH = Path(__file__).parent.parent.parent.parent / "data" / "class-archetypes.json"

# Soft thresholds — intentionally conservative
PRESTIGE_HINT_THRESHOLD = 0.30
SECONDARY_HINT_THRESHOLD = 0.18


# Prestige mapping (design-owned, explicit, not inferred)
# This should be maintained as prestige classes are designed
PRESTIGE_MAP = {
    "Jedi Guardian": ["Jedi Knight", "Elite Trooper"],
    "Aggressive Duelist": ["Weapon Master", "Duelist"],
    "Force Adept": ["Jedi Master", "Mystic Advisor"],
    "Balanced Knight": ["Jedi Knight", "Diplomatic Envoy"],
    # Expand as more prestige paths are designed
}


# ------------------------------------------------------------
# UTIL
# ------------------------------------------------------------

def normalize_name(name: str) -> str:
    return name.lower().strip()


def flatten_archetypes(data: Dict[str, Any], include_stubs: bool = False) -> Dict[str, Any]:
    """Converts nested class->archetypes structure into flat dict."""
    flat = {}
    classes = data.get("classes", {})
    for class_key, class_data in classes.items():
        archetypes = class_data.get("archetypes", {})
        for archetype_key, archetype_data in archetypes.items():
            status = archetype_data.get("status")
            if not include_stubs and status != "active":
                continue
            name = archetype_data.get("name", archetype_key)
            name_key = name.lower().strip()
            flat[name_key] = archetype_data
    return flat


# ------------------------------------------------------------
# PRESTIGE HINT ENGINE
# ------------------------------------------------------------

def generate_prestige_hints(
    archetype_affinity: Dict[str, float],
    archetypes: Dict[str, Any],
    prestige_map: Dict[str, List[str]],
) -> List[Dict[str, Any]]:
    """
    Generates prestige path hints based on archetype affinity.

    prestige_map example:
      {
        "Jedi Guardian": ["Jedi Knight", "Elite Trooper"],
        "Martial Arts Specialist": ["Weapon Master"],
      }
    """

    hints = []

    for archetype_name, affinity in archetype_affinity.items():
        if affinity < SECONDARY_HINT_THRESHOLD:
            continue

        # Find matching prestige options (case-insensitive)
        prestige_options = None
        for map_key, map_options in prestige_map.items():
            if normalize_name(map_key) == archetype_name:
                prestige_options = map_options
                break

        if not prestige_options:
            continue

        strength = (
            "primary" if affinity >= PRESTIGE_HINT_THRESHOLD else "secondary"
        )

        hints.append({
            "archetype": archetype_name,
            "affinity": round(affinity, 3),
            "strength": strength,
            "prestigeOptions": prestige_options,
            "explanation": build_prestige_explanation(
                archetype_name,
                affinity,
                prestige_options,
                archetypes,
            ),
        })

    return sorted(hints, key=lambda h: h["affinity"], reverse=True)


def build_prestige_explanation(
    archetype_name: str,
    affinity: float,
    prestige_options: List[str],
    archetypes: Dict[str, Any],
) -> str:
    """
    Human-readable explanation for prestige hints.
    """

    notes = "your current build direction"
    for a in archetypes.values():
        if normalize_name(a["name"]) == archetype_name:
            notes = a["notes"]
            break

    prestige_list = ", ".join(prestige_options)

    if affinity >= PRESTIGE_HINT_THRESHOLD:
        return (
            f"Your build strongly reflects a {archetype_name.title()} style "
            f"({notes}). You may want to consider prestige paths like {prestige_list}."
        )

    return (
        f"Parts of your build align with a {archetype_name.title()} approach "
        f"({notes}). Prestige options such as {prestige_list} could become relevant."
    )


# ------------------------------------------------------------
# FOUNDRY / JS BRIDGE CONTRACT
# ------------------------------------------------------------

def export_foundry_contract(
    archetype_affinity: Dict[str, float],
    prestige_hints: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """
    Produces a JS-ready structure intended to be stored at:

      actor.flags.swse.buildGuidance

    This object can be consumed directly by Foundry UI.
    """

    return {
        "archetypeAffinity": archetype_affinity,
        "prestigeHints": prestige_hints,
        "meta": {
            "engine": "SWSE Archetype Engine",
            "version": "1.0",
            "nonForcing": True,
        },
    }


# ------------------------------------------------------------
# DEMO HARNESS
# ------------------------------------------------------------

def main():
    if not ARCHETYPE_PATH.exists():
        print(f"❌ Archetype file not found: {ARCHETYPE_PATH}")
        return

    with open(ARCHETYPE_PATH, "r", encoding="utf-8") as f:
        raw_data = json.load(f)

    archetypes = flatten_archetypes(raw_data)

    # Example affinity (from previous steps)
    archetype_affinity = {
        "jedi guardian": 0.47,
        "aggressive duelist": 0.21,
        "balanced knight": 0.14,
    }

    prestige_hints = generate_prestige_hints(
        archetype_affinity,
        archetypes,
        PRESTIGE_MAP,
    )

    foundry_payload = export_foundry_contract(
        archetype_affinity,
        prestige_hints,
    )

    print("\n🏷 Prestige Hints\n")
    print(json.dumps(prestige_hints, indent=2))

    print("\n📦 Foundry Payload (actor.flags.swse.buildGuidance)\n")
    print(json.dumps(foundry_payload, indent=2))


if __name__ == "__main__":
    main()
