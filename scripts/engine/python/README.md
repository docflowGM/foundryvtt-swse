# SWSE Archetype Engine — Python Reference Implementation

This directory contains the **reference implementation** of the SWSE Archetype Engine, spanning **Steps 2–6** of the archetype system design.

## Overview

The archetype engine is a **multi-layer inference system** that:
1. **Validates** archetype data integrity (Step 3)
2. **Scores** character affinity to archetypes (Step 2)
3. **Weights** suggestion recommendations (Step 2)
4. **Explains** suggestions in narrative form (Step 3.5)
5. **Persists** affinity state with drift detection (Step 4.5)
6. **Hints** at prestige paths without forcing (Step 5)
7. **Exports** a Foundry-ready contract (Step 6)

**Important**: These scripts do **not** modify archetype data. They are **read-only inference engines** suitable for testing, CI validation, and 1:1 porting to JavaScript.

---

## Scripts

### `archetype_engine_tools.py` (Steps 2–3)

Implements archetype validation and affinity scoring.

**Main functions:**
- `validate_archetypes()` — Hard-fails on invalid or incomplete archetypes (CI-safe)
- `calculate_archetype_affinity()` — Scores character build against all archetypes
- `weight_suggestions()` — Applies archetype bias to suggestion scores
- `flatten_archetypes()` — Converts nested JSON to flat dict

**Usage:**
```bash
python3 archetype_engine_tools.py
```

**Output:**
- Validation report
- Example affinity scores for a test character

---

### `archetype_explanation_engine.py` (Step 3.5)

Generates human-readable explanations for suggestions based on archetype affinity.

**Main functions:**
- `explain_suggestion()` — Single-suggestion explanation
- `explain_suggestion_batch()` — Batch explanations for multiple suggestions

**Usage:**
```bash
python3 archetype_explanation_engine.py
```

**Example output:**
```
"This fits well with your Jedi Guardian–style build
(Frontline lightsaber combatant focused on direct engagement.)
and Balanced Knight–style build (Classic balanced Jedi blending combat, Force use, and adaptability.)."
```

---

### `archetype_affinity_persistence.py` (Step 4.5)

Manages affinity state caching and drift detection.

**Main functions:**
- `build_affinity_snapshot()` — Creates a persistable affinity record
- `affinity_needs_recompute()` — Detects if character state changed
- `update_affinity_snapshot()` — Safely replaces cached affinity

**Usage:**
```bash
python3 archetype_affinity_persistence.py
```

**Storage contract** (Foundry):
```javascript
actor.flags.swse.archetypeAffinity = {
  "version": "1.0",
  "stateHash": "<sha256 of character state>",
  "affinity": { "archetype_name": 0.47, ... },
  "sourceState": { "feats": [...], "talents": [...], "attributes": {...} }
}
```

**Key benefit:** Prevents affinity recalculation on every frame; enables stable explanations.

---

### `archetype_prestige_and_foundry_bridge.py` (Steps 5–6)

Generates prestige path hints and exports Foundry-ready integration contract.

**Main functions:**
- `generate_prestige_hints()` — Soft suggestions for prestige classes
- `export_foundry_contract()` — Produces JS-ready data structure

**Usage:**
```bash
python3 archetype_prestige_and_foundry_bridge.py
```

**Prestige Mapping:**
The script uses an explicit `PRESTIGE_MAP` (not inferred). Update this as prestige classes are designed:

```python
PRESTIGE_MAP = {
    "Jedi Guardian": ["Jedi Knight", "Elite Trooper"],
    "Aggressive Duelist": ["Weapon Master", "Duelist"],
    # Add more prestige paths here
}
```

**Storage contract** (Foundry):
```javascript
actor.flags.swse.buildGuidance = {
  "archetypeAffinity": { "archetype_name": 0.47, ... },
  "prestigeHints": [
    {
      "archetype": "jedi guardian",
      "affinity": 0.47,
      "strength": "primary",
      "prestigeOptions": ["Jedi Knight", "Elite Trooper"],
      "explanation": "Your build strongly reflects a Jedi Guardian style..."
    }
  ],
  "meta": {
    "engine": "SWSE Archetype Engine",
    "version": "1.0",
    "nonForcing": true
  }
}
```

---

### `test_archetype_pipeline.py` (Integration Test)

End-to-end test of the entire pipeline.

**Usage:**
```bash
python3 test_archetype_pipeline.py
```

**What it tests:**
1. Data loading and validation
2. Affinity calculation
3. Suggestion weighting
4. Explanation generation
5. Persistence snapshot creation
6. Drift detection
7. Prestige hint generation
8. Foundry payload export

---

## Archetype Data Format

Source of truth: `../../../data/class-archetypes.json`

**Required fields per archetype:**
```python
{
  "name": "Jedi Guardian",
  "status": "active",  # "active" or "stub"
  "mechanicalBias": {...},
  "roleBias": {...},
  "attributeBias": {"STR": 0.3, "WIS": 0.3, ...},
  "talentKeywords": ["Block", "Deflect", ...],
  "featKeywords": ["Weapon Focus (Lightsabers)", ...],
  "notes": "Frontline lightsaber combatant focused on direct engagement."
}
```

---

## Integration Roadmap (Foundry JS)

These Python scripts are **engine-agnostic** and portable. To integrate into Foundry:

### Phase 1: Core Porting
- [ ] Port `calculate_archetype_affinity()` → `SuggestionEngine.calculateArchetypeAffinity()`
- [ ] Port `weight_suggestions()` → `SuggestionEngine.weightSuggestionsByAffinity()`
- [ ] Cache affinity on actor at `actor.flags.swse.archetypeAffinity`

### Phase 2: Explanation Layer
- [ ] Port `explain_suggestion_batch()` → UI helper
- [ ] Emit explanations alongside weighted suggestions

### Phase 3: Prestige Hinting
- [ ] Port prestige hint generation
- [ ] Store prestige hints at `actor.flags.swse.buildGuidance.prestigeHints`
- [ ] Render prestige hints in prestige path selection UI

### Phase 4: Tuning & Rebalance
- [ ] Adjust affinity thresholds
- [ ] Reweight feature/talent bias
- [ ] Expand prestige path mappings

---

## Design Philosophy

### ✅ What These Scripts Do
- Read-only validation and inference
- Deterministic, testable computation
- No data mutation
- Name-based (never slug-based) resolution
- Soft, non-exclusive suggestions
- Portable to any language

### ❌ What These Scripts Don't Do
- Mutate archetype data
- Force or gate prestige paths
- Include UI rendering
- Persist to disk (data layer responsibility)
- Rebalance or tune (design decision)

---

## CI / Testing

Run validation in CI:
```bash
python3 archetype_engine_tools.py
```

Exit code:
- `0` = All archetypes valid
- `1` = Validation failed

Run full integration test:
```bash
python3 test_archetype_pipeline.py
```

---

## Architecture Notes

### Name Normalization
All archetype name matching uses `.lower().strip()`. This ensures:
- Case-insensitive matching
- Whitespace-tolerant references
- Safe refactors across slug vs. name

### Softmax Affinity
Affinity is normalized using **softmax**, not raw addition. This ensures:
- Interpretable 0–1 probability distribution
- Multiple archetypes can be "high-affinity" simultaneously
- Non-exclusive signal (soft, not hard clustering)

### Persistence Hashing
State hashing uses SHA256 of sorted JSON. This ensures:
- Deterministic drift detection
- Safe across character saves/reloads
- Version-aware (hash changes on meaningful edits)

---

## Future Extensions

- **ML adaptation**: Learn character intent over multiple builds
- **Prestige narration**: Generate prestige-specific flavor text
- **Community meta**: Incorporate successful build archetypes
- **Tuning hooks**: Externalize threshold and weight configs

---

## Questions or Issues?

- For design questions: See `BuildIdentityAnchor.js` and `BuildCoherenceAnalyzer.js`
- For data issues: Check `../../../data/class-archetypes.json`
- For bugs: Use `test_archetype_pipeline.py` to isolate the layer
