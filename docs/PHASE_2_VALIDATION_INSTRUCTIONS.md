# Phase 2 Validation Instructions

## Overview

Phase 2 is now active. The consumption path has switched from deprecated `select(reasonSignals)` to `selectFromSuggestionV2(signals, scoring)`.

The goal is to verify that **atom selection varies meaningfully by dominance**.

## How Phase 2 Works

```
SuggestionEngine emits:
  signals: [
    { type: PRESTIGE_PROXIMITY, weight: 0.62, horizon: "shortTerm" },
    { type: ATTRIBUTE_SYNERGY, weight: 0.35, horizon: "immediate" },
    { type: IDENTITY_ALIGNMENT, weight: 0.28, horizon: "identity" }
  ]

        ↓

MentorReasonSelector.selectFromSuggestionV2():
  1. Sort signals by weight (descending)
  2. Select top 3 signals
  3. Map each ReasonType → REASON_ATOMS
  4. Deduplicate atoms
  5. Compute intensity from weight + confidence

        ↓

Output:
  atoms: [REASON_ATOM_1, REASON_ATOM_2, ...]
  intensity: "high" | "medium" | "low"
```

## To Validate Phase 2

### Step 1: Run in Foundry VTT

1. Open character leveling/chargen
2. Open browser console (F12)
3. Filter for: `Phase2Validation`
4. Trigger feat/talent suggestions

### Step 2: Capture Validation Logs

You will see logs like:

```javascript
[MentorReasonSelector.Phase2Validation] Atom selection: {
  signals: [
    { type: "PRESTIGE_PROXIMITY", weight: "0.620", horizon: "shortTerm" },
    { type: "ATTRIBUTE_SYNERGY", weight: "0.350", horizon: "immediate" },
    { type: "IDENTITY_ALIGNMENT", weight: "0.280", horizon: "identity" }
  ],
  atoms: ["CommitmentDeclared", "GoalAdvancement", "SynergyPresent"],
  intensity: "high",
  confidence: "0.640",
  dominantHorizon: "shortTerm",
  topSignalType: "PRESTIGE_PROXIMITY"
}
```

### Step 3: Test Three Dominance Contrasts

Capture **one example of each scenario** showing atoms vary by dominance:

#### Scenario A: Immediate-Dominant Suggestion

Find suggestion where: `dominantHorizon: "immediate"`

Expected:
- Top signal type: `ATTRIBUTE_SYNERGY`
- Atoms include: attributes/skill synergy atoms
- Example atoms: `SynergyPresent`, `SkillMatch`, etc.

Copy full `Phase2Validation` log.

#### Scenario B: Short-Term Dominant Suggestion

Find suggestion where: `dominantHorizon: "shortTerm"`

Expected:
- Top signal type: `PRESTIGE_PROXIMITY`
- Atoms include: prestige/milestone atoms
- Example atoms: `CommitmentDeclared`, `DependencyChain`, `GoalAdvancement`, etc.

Copy full `Phase2Validation` log.

#### Scenario C: Identity-Dominant Suggestion

Find suggestion where: `dominantHorizon: "identity"`

Expected:
- Top signal type: `IDENTITY_ALIGNMENT`
- Atoms include: identity/role atoms
- Example atoms: `PatternAlignment`, `CommitmentDeclared`, etc.

Copy full `Phase2Validation` log.

### Step 4: Verify Atom Variation

Critical check:

```javascript
// Atoms from Scenario A (immediate dominant)
atoms_A = ["SynergyPresent", "SkillMatch"]

// Atoms from Scenario B (shortTerm dominant)
atoms_B = ["CommitmentDeclared", "GoalAdvancement", "DependencyChain"]

// Atoms from Scenario C (identity dominant)
atoms_C = ["PatternAlignment", "CommitmentDeclared"]

// MUST BE TRUE:
atoms_A !== atoms_B  // Different atoms for different dominance
atoms_B !== atoms_C
atoms_A !== atoms_C

// If atoms are IDENTICAL across scenarios:
// → Phase 2 is broken (atoms not driven by signals)
```

### Step 5: Verify Intensity Variation

Check intensity varies with confidence:

```javascript
// Separated scores (0.75/0.30/0.25)
confidence ≈ 0.75
intensity should be "high"

// Close scores (0.42/0.40/0.38)
confidence ≈ 0.42
intensity should be "low" or "medium"
```

### Step 6: Verify Weight Ordering

In each log, confirm:
```javascript
signals[0].weight > signals[1].weight > signals[2].weight
// Should always be descending order
```

### Step 7: Report Validation

Provide:

1. **Screenshot or copy of Scenario A** (immediate dominant)
   - Show full Phase2Validation log
   - Confirm top signal is ATTRIBUTE_SYNERGY
   - List atoms

2. **Screenshot or copy of Scenario B** (shortTerm dominant)
   - Show full Phase2Validation log
   - Confirm top signal is PRESTIGE_PROXIMITY
   - List atoms

3. **Screenshot or copy of Scenario C** (identity dominant)
   - Show full Phase2Validation log
   - Confirm top signal is IDENTITY_ALIGNMENT
   - List atoms

4. **Verification**
   - [ ] Atoms differ across scenarios
   - [ ] Atoms match expected type (immediate → ATTRIBUTE_SYNERGY atoms, etc.)
   - [ ] Intensity varies with confidence
   - [ ] Signals sorted by weight (descending)
   - [ ] No warnings/errors in console

## Expected Behavior

### What Should Change (From Phase 1)

- ✅ Atom selection now weight-driven (varies by breakdown)
- ✅ Top signal reflects dominant horizon
- ✅ Atoms vary based on which horizon dominates
- ✅ Intensity computed from weight + confidence

### What Should NOT Change (Regression Tests)

- ✅ Tier assignment still rule-driven (not changed)
- ✅ Suggestion ordering still by tier (not changed)
- ✅ v1 reasonSignals still emitted (dual format)
- ✅ Confidence values unchanged
- ✅ No performance degradation

## Debugging Atoms

If atoms aren't changing by dominance:

1. **Check signal sorting**
   - Verify signals_by_weight in Phase1Validation log
   - Confirm sorted correctly (0.62 > 0.35 > 0.28)

2. **Check ReasonTypeToReasonAtomsMapping**
   - Find: ReasonTypeToReasonAtomsMapping.js
   - Verify:
     - ATTRIBUTE_SYNERGY maps to some atoms
     - PRESTIGE_PROXIMITY maps to different atoms
     - IDENTITY_ALIGNMENT maps to different atoms

3. **Check atoms deduplification**
   - If all three horizons map to same atom:
   - Deduplification collapses them
   - Result: same atoms despite different signals

4. **Check atom pool**
   - Different ReasonTypes should map to different atoms
   - If not, mapping is incomplete

## Phase 2 Decision Gate

✅ Phase 2 is VALID if:
- [ ] Atoms vary across three dominance scenarios
- [ ] Atoms match expected type (ATTRIBUTE_SYNERGY → skill atoms, etc.)
- [ ] Intensity varies with confidence
- [ ] No errors in console
- [ ] Weight ordering correct (descending)
- [ ] No UI regressions

## Next: Phase 3 (After Validation)

Once Phase 2 is validated:

1. Delete deprecated `select()` method from MentorReasonSelector
2. Remove `reasonSignals` emission from SuggestionEngine
3. Remove v1 fallback from SuggestionService
4. Clean up imports

Single authoritative path only.

---

## Code References

**SuggestionEngine**: Emits signals + scoring
- File: scripts/engine/suggestion/SuggestionEngine.js
- Method: _buildSignalsFromScorer() (line 1539)

**MentorReasonSelector**: Selects atoms from signals
- File: scripts/engine/mentor/mentor-reason-selector.js
- Method: selectFromSuggestionV2() (line 42)

**SuggestionService**: Routes to selector
- File: scripts/engine/suggestion/SuggestionService.js
- Method: _enrichSuggestions() (line 533)

**ReasonTypeToReasonAtomsMapping**: Maps ReasonType → atoms
- File: scripts/engine/mentor/ReasonTypeToReasonAtomsMapping.js
- Used by: mapReasonTypeToAtoms()
