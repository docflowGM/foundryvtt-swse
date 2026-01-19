"""
SWSE Archetype Affinity Persistence Engine
==========================================

Purpose:
- Persist archetype affinity as derived state
- Detect when recalculation is required
- Avoid unnecessary recomputation
- Enable stable explanations across sessions

This script:
- Does NOT mutate archetype data
- Treats affinity as cacheable, derived state
"""

import json
import hashlib
from typing import Dict, Any
from copy import deepcopy


# ------------------------------------------------------------
# HASHING / SIGNATURE UTILITIES
# ------------------------------------------------------------

def stable_hash(data: Any) -> str:
    """
    Produces a deterministic hash for a character-relevant state.
    Used to detect drift.
    """
    encoded = json.dumps(data, sort_keys=True).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


# ------------------------------------------------------------
# PERSISTENCE STRUCTURE
# ------------------------------------------------------------

def build_affinity_snapshot(
    character_state: Dict[str, Any],
    archetype_affinity: Dict[str, float],
    engine_version: str = "1.0",
) -> Dict[str, Any]:
    """
    Creates a persistable affinity snapshot.

    Intended storage location (Foundry later):
      actor.flags.swse.archetypeAffinity
    """

    relevant_state = {
        "feats": sorted(character_state.get("feats", [])),
        "talents": sorted(character_state.get("talents", [])),
        "attributes": character_state.get("attributes", {}),
    }

    return {
        "version": engine_version,
        "stateHash": stable_hash(relevant_state),
        "affinity": archetype_affinity,
        "sourceState": relevant_state,  # optional but great for debugging
    }


# ------------------------------------------------------------
# DRIFT DETECTION
# ------------------------------------------------------------

def affinity_needs_recompute(
    stored_snapshot: Dict[str, Any],
    current_character_state: Dict[str, Any],
) -> bool:
    """
    Returns True if affinity should be recomputed.
    """

    if not stored_snapshot:
        return True

    relevant_state = {
        "feats": sorted(current_character_state.get("feats", [])),
        "talents": sorted(current_character_state.get("talents", [])),
        "attributes": current_character_state.get("attributes", {}),
    }

    current_hash = stable_hash(relevant_state)
    return current_hash != stored_snapshot.get("stateHash")


# ------------------------------------------------------------
# SAFE MERGE / UPDATE
# ------------------------------------------------------------

def update_affinity_snapshot(
    stored_snapshot: Dict[str, Any],
    new_snapshot: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Replaces affinity snapshot safely.
    Version-aware, future-proof.
    """

    if not stored_snapshot:
        return deepcopy(new_snapshot)

    # Future: version migrations hook here
    return deepcopy(new_snapshot)


# ------------------------------------------------------------
# DEMO HARNESS
# ------------------------------------------------------------

def main():
    # Simulated character state
    character_state = {
        "feats": ["Power Attack", "Weapon Focus (Lightsabers)"],
        "talents": ["Block"],
        "attributes": {
            "STR": 16,
            "DEX": 14,
        },
    }

    # Simulated affinity
    archetype_affinity = {
        "jedi guardian": 0.48,
        "balanced knight": 0.34,
    }

    snapshot = build_affinity_snapshot(
        character_state,
        archetype_affinity,
        engine_version="1.0",
    )

    print("📦 Stored Snapshot\n")
    print(json.dumps(snapshot, indent=2))

    # Later…
    needs_recalc = affinity_needs_recompute(snapshot, character_state)
    print("\n🔄 Needs Recompute (no changes)?", needs_recalc)

    # Change state
    character_state["feats"].append("Cleave")
    needs_recalc = affinity_needs_recompute(snapshot, character_state)
    print("🔄 Needs Recompute (feat added)?", needs_recalc)

    # Recompute and update
    new_affinity = {
        "jedi guardian": 0.52,
        "balanced knight": 0.31,
    }
    new_snapshot = build_affinity_snapshot(
        character_state,
        new_affinity,
        engine_version="1.0",
    )
    updated = update_affinity_snapshot(snapshot, new_snapshot)
    print("\n✅ Updated Snapshot\n")
    print(json.dumps(updated, indent=2))


if __name__ == "__main__":
    main()
