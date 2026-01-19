"""
SWSE Archetype Explanation Engine
=================================

Consumes:
- Archetype affinity scores
- Archetype dataset (read-only)
- Weighted suggestions

Produces:
- Player-facing explanation strings
- Deterministic, testable output

Does NOT:
- Modify archetype data
- Re-score affinities
"""

import json
from pathlib import Path
from typing import Dict, Any, List


ARCHETYPE_PATH = Path(__file__).parent.parent.parent.parent / "data" / "class-archetypes.json"


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
# EXPLANATION ENGINE
# ------------------------------------------------------------

def explain_suggestion(
    suggestion_name: str,
    archetype_affinity: Dict[str, float],
    archetypes: Dict[str, Any],
    max_archetypes: int = 2,
) -> str:
    """
    Generates a human-readable explanation for a suggestion
    based on top matching archetypes.

    Example output:
    "This fits well with your Jedi Guardian–style build,
     emphasizing frontline combat and durability."
    """

    if not archetype_affinity:
        return "This option is a solid general choice for your character."

    # Sort archetypes by affinity
    ranked = sorted(
        archetype_affinity.items(),
        key=lambda x: x[1],
        reverse=True,
    )

    explanations: List[str] = []

    for archetype_name, score in ranked[:max_archetypes]:
        for archetype in archetypes.values():
            if normalize_name(archetype["name"]) == archetype_name:
                explanations.append(
                    f"{archetype['name']}–style build ({archetype['notes']})"
                )
                break

    if not explanations:
        return "This option aligns with your current build direction."

    if len(explanations) == 1:
        return f"This fits well with your {explanations[0]}."

    return (
        "This fits well with your "
        + " and ".join(explanations)
        + "."
    )


def explain_suggestion_batch(
    suggestions: Dict[str, float],
    archetype_affinity: Dict[str, float],
    archetypes: Dict[str, Any],
) -> Dict[str, str]:
    """
    Returns:
      {
        "Power Attack": "This fits well with your Jedi Guardian–style build...",
        ...
      }
    """

    explanations = {}

    for suggestion in suggestions.keys():
        explanations[suggestion] = explain_suggestion(
            suggestion,
            archetype_affinity,
            archetypes,
        )

    return explanations


# ------------------------------------------------------------
# DEMO / SAFE TEST HARNESS
# ------------------------------------------------------------

def main():
    if not ARCHETYPE_PATH.exists():
        print(f"❌ Archetype file not found: {ARCHETYPE_PATH}")
        return

    with open(ARCHETYPE_PATH, "r", encoding="utf-8") as f:
        raw_data = json.load(f)

    archetypes = flatten_archetypes(raw_data)

    # Example affinity (normally produced by previous script)
    archetype_affinity = {
        "jedi guardian": 0.46,
        "balanced knight": 0.32,
        "martial arts specialist": 0.18,
    }

    suggestions = {
        "Power Attack": 1.42,
        "Weapon Focus (Lightsabers)": 1.31,
        "Rapid Strike": 1.18,
    }

    explanations = explain_suggestion_batch(
        suggestions,
        archetype_affinity,
        archetypes,
    )

    print("\n🧠 Suggestion Explanations\n")
    for s, text in explanations.items():
        print(f"- {s}:")
        print(f"  {text}\n")


if __name__ == "__main__":
    main()
