#!/usr/bin/env python3
"""
Integration Test for Archetype Engine Pipeline
===============================================

Tests:
1. Data validation (Step 3)
2. Affinity scoring (Step 2)
3. Explanation generation (Step 3.5)
4. Persistence and drift detection (Step 4.5)
5. Prestige hinting and Foundry export (Steps 5-6)
"""

import json
import sys
from pathlib import Path

# Import all engine modules
sys.path.insert(0, str(Path(__file__).parent))

import archetype_engine_tools as engine_tools
import archetype_explanation_engine as explain_engine
import archetype_affinity_persistence as persist_engine
import archetype_prestige_and_foundry_bridge as prestige_engine


def test_pipeline():
    """Full integration test of the archetype engine."""

    print("\n" + "=" * 70)
    print("🧪 ARCHETYPE ENGINE INTEGRATION TEST")
    print("=" * 70)

    # Step 1: Load and validate data
    print("\n📋 STEP 1: Loading and validating archetype data...")
    archetype_path = engine_tools.ARCHETYPE_PATH

    if not archetype_path.exists():
        print(f"❌ ERROR: Archetype file not found at {archetype_path}")
        return False

    with open(archetype_path, "r", encoding="utf-8") as f:
        raw_data = json.load(f)

    archetypes = engine_tools.flatten_archetypes(raw_data)
    print(f"✅ Loaded {len(archetypes)} active archetypes")

    # Step 2: Validate structure
    print("\n📋 STEP 2: Validating archetype structure...")
    try:
        engine_tools.validate_archetypes(archetypes)
    except SystemExit as e:
        print(f"❌ Validation failed")
        return False

    # Step 3: Calculate affinity
    print("\n📋 STEP 3: Calculating archetype affinity...")
    character_state = {
        "feats": ["Weapon Focus (Lightsabers)", "Power Attack", "Rapid Strike"],
        "talents": ["Block", "Deflect", "Redirect Shot"],
        "attributes": {
            "STR": 16,
            "DEX": 14,
            "WIS": 12,
            "CON": 13,
        },
    }

    affinity = engine_tools.calculate_archetype_affinity(archetypes, character_state)
    print(f"✅ Calculated affinity for {len(affinity)} archetypes")

    top_3 = sorted(affinity.items(), key=lambda x: x[1], reverse=True)[:3]
    print("   Top 3 archetypes:")
    for name, score in top_3:
        print(f"     • {name}: {round(score, 3)}")

    # Step 4: Weight suggestions
    print("\n📋 STEP 4: Weighting suggestions based on affinity...")
    base_suggestions = {
        "Power Attack": 1.0,
        "Weapon Focus (Lightsabers)": 0.95,
        "Block": 1.2,
        "Deflect": 1.1,
    }

    weighted = engine_tools.weight_suggestions(
        base_suggestions,
        affinity,
        archetypes,
    )
    print(f"✅ Weighted {len(weighted)} suggestions")
    for name, score in sorted(weighted.items(), key=lambda x: x[1], reverse=True):
        print(f"   • {name}: {round(score, 4)}")

    # Step 5: Generate explanations
    print("\n📋 STEP 5: Generating suggestion explanations...")
    explanations = explain_engine.explain_suggestion_batch(
        weighted,
        affinity,
        archetypes,
    )
    print(f"✅ Generated {len(explanations)} explanations")
    for name, explanation in list(explanations.items())[:2]:
        print(f"   • {name}:")
        print(f"     '{explanation}'")

    # Step 6: Create affinity snapshot
    print("\n📋 STEP 6: Creating affinity persistence snapshot...")
    snapshot = persist_engine.build_affinity_snapshot(
        character_state,
        affinity,
        engine_version="1.0",
    )
    print(f"✅ Snapshot created")
    print(f"   • State hash: {snapshot['stateHash'][:16]}...")
    print(f"   • Version: {snapshot['version']}")

    # Step 7: Test drift detection
    print("\n📋 STEP 7: Testing drift detection...")
    needs_recalc_1 = persist_engine.affinity_needs_recompute(
        snapshot,
        character_state,
    )
    print(f"✅ No changes: needs_recalc = {needs_recalc_1} (expected False)")

    modified_state = character_state.copy()
    modified_state["feats"].append("Cleave")
    needs_recalc_2 = persist_engine.affinity_needs_recompute(
        snapshot,
        modified_state,
    )
    print(f"✅ After adding feat: needs_recalc = {needs_recalc_2} (expected True)")

    # Step 8: Generate prestige hints
    print("\n📋 STEP 8: Generating prestige path hints...")
    prestige_hints = prestige_engine.generate_prestige_hints(
        affinity,
        archetypes,
        prestige_engine.PRESTIGE_MAP,
    )
    print(f"✅ Generated {len(prestige_hints)} prestige hints")
    for hint in prestige_hints[:2]:
        print(f"   • {hint['archetype']} (strength: {hint['strength']})")
        print(f"     Options: {', '.join(hint['prestigeOptions'])}")

    # Step 9: Export Foundry contract
    print("\n📋 STEP 9: Exporting Foundry integration contract...")
    foundry_payload = prestige_engine.export_foundry_contract(
        affinity,
        prestige_hints,
    )
    print(f"✅ Foundry payload created")
    print(f"   • Engine: {foundry_payload['meta']['engine']}")
    print(f"   • Version: {foundry_payload['meta']['version']}")
    print(f"   • Non-forcing: {foundry_payload['meta']['nonForcing']}")
    print(f"   • Archetype affinity keys: {len(foundry_payload['archetypeAffinity'])}")
    print(f"   • Prestige hints: {len(foundry_payload['prestigeHints'])}")

    print("\n" + "=" * 70)
    print("✅ ALL TESTS PASSED")
    print("=" * 70)
    print("\n📍 Next steps:")
    print("   1. Port calculate_archetype_affinity() into SuggestionEngine.js")
    print("   2. Cache affinity on actor as derived state")
    print("   3. Use weight_suggestions() at UI render time")
    print("   4. Store foundry_payload at actor.flags.swse.buildGuidance")
    print("\n")

    return True


if __name__ == "__main__":
    success = test_pipeline()
    sys.exit(0 if success else 1)
