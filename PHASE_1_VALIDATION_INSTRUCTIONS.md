# Phase 1 Validation Instructions

## Overview

Phase 1 has been implemented. SuggestionEngine now calls SuggestionScorer and emits both v1 (reasonSignals) and v2 (signals + scoring) formats in parallel.

Detailed validation logging is active in SuggestionEngine._buildSuggestion() to capture the Phase 1 output.

## To Validate Phase 1 Output

### Step 1: Run the System in Foundry VTT

1. Start Foundry VTT with the SWSE system
2. Open a character sheet in leveling/chargen scenario
3. **Open Browser Developer Console** (F12 or right-click → Inspect)
4. Filter console for: `Phase1Validation`

### Step 2: Capture Validation Logs

As feats/talents are suggested, console will show an **object** (not JSON):

```javascript
[SuggestionEngine.Phase1Validation] Force Focus: {
  metadata: {
    name: "Force Focus",
    tier: 6,
    reasonCode: "PRESTIGE_PREREQ"
  },
  signals: [
    {
      type: "PRESTIGE_PROXIMITY",
      weight: 0.85,                    // ← MUST BE NUMBER not "0.85"
      weight_type: "number",           // ← CRITICAL: Verify this says "number"
      horizon: "shortTerm"
    }
  ],
  scoring: {
    immediate: 0.35,                   // ← MUST BE NUMBER
    shortTerm: 0.62,                   // ← MUST BE NUMBER
    identity: 0.28,                    // ← MUST BE NUMBER
    final: 0.47,                       // ← MUST BE NUMBER
    confidence: 0.64,                  // ← MUST BE NUMBER
    dominantHorizon: "shortTerm",
    types: {
      immediate: "number",             // ← ALL MUST SAY "number"
      shortTerm: "number",
      identity: "number",
      final: "number",
      confidence: "number"
    }
  },
  signals_by_weight: [                 // ← SORTING TEST
    "[0.850] PRESTIGE_PROXIMITY"       // ← Shows weights sort correctly
  ]
}
```

### Step 3: Critical Type Validation

**MUST VERIFY BEFORE PHASE 2:**

#### A. Weight Type Check (CRITICAL FOR SORTING)
```javascript
// Open console and check one log entry:
// Right-click → Copy → Paste into notepad

// ALL of these MUST be true:
- weight_type: "number"  (NOT "string")
- typeof scoring.immediate === "number"
- typeof scoring.shortTerm === "number"
- typeof scoring.identity === "number"
- typeof scoring.final === "number"
- typeof scoring.confidence === "number"

// If ANY are "string", Phase 2 will FAIL at weight sorting
```

#### B. Weight Sorting Test
- [ ] `signals_by_weight` shows weights sorted in descending order
- [ ] Check: `[0.85] > [0.65] > [0.45]` (numeric, not lexicographic)
- [ ] Confirm: `0.9` sorts correctly vs `0.85` (not "0.9" < "0.85" string sort)

#### C. Dominant Horizon Correctness
- [ ] Test Case 1: immediate=0.65, shortTerm=0.25, identity=0.10
  - [ ] MUST have `dominantHorizon: "immediate"`
- [ ] Test Case 2: immediate=0.30, shortTerm=0.70, identity=0.25
  - [ ] MUST have `dominantHorizon: "shortTerm"`
- [ ] Test Case 3: immediate=0.40, shortTerm=0.35, identity=0.65
  - [ ] MUST have `dominantHorizon: "identity"`

#### D. Confidence Variation
- [ ] Close scores (0.42/0.40/0.38): confidence should be LOWER
- [ ] Separated scores (0.75/0.30/0.25): confidence should be HIGHER
- [ ] Check: confidence varies across different suggestions (not static 0.6–0.7)

#### E. Score Range Validation
- [ ] All scores in range [0.0, 1.0] (NO negative or >1.0)
- [ ] finalScore = weighted average of three horizons
- [ ] Check: finalScore is roughly `0.6*immediate + 0.25*shortTerm + 0.15*identity`

### Step 4: Collect Behavior Contrast Examples

Capture **three key scenarios** to test dominance detection:

**Scenario A: Immediate-Dominant**
Look for suggestion with: immediate >> shortTerm and identity
- Example: immediate=0.65, shortTerm=0.25, identity=0.10
- [ ] MUST have `dominantHorizon: "immediate"`
- [ ] MUST have signal with `horizon: "immediate"`
- [ ] Copy full console output

**Scenario B: Short-Term Dominant**
Look for suggestion with: shortTerm >> immediate and identity
- Example: immediate=0.30, shortTerm=0.70, identity=0.20
- [ ] MUST have `dominantHorizon: "shortTerm"`
- [ ] MUST have signal with `horizon: "shortTerm"`
- [ ] Copy full console output

**Scenario C: Identity-Dominant**
Look for suggestion with: identity > immediate and shortTerm
- Example: immediate=0.40, shortTerm=0.35, identity=0.65
- [ ] MUST have `dominantHorizon: "identity"`
- [ ] If you CANNOT produce identity dominance, scoring may be misconfigured
- [ ] Copy full console output

### Step 5: Verify Type Safety

From ANY of the three scenarios above, verify:
```javascript
// In console, expand the log object and check:
scoring.types.immediate === "number"    // NOT "string"
scoring.types.shortTerm === "number"    // NOT "string"
scoring.types.identity === "number"     // NOT "string"
signals[0].weight_type === "number"     // NOT "string"
```

### Step 6: Report Validation Results

Provide:
1. Screenshot or copy of **ONE example from each scenario** (A, B, C)
2. Confirm `weight_type: "number"` in all examples
3. Confirm all scoring types are "number"
4. Confirm `signals_by_weight` shows correct numeric sorting
5. Note any errors or unexpected patterns

## Expected Behavior (No Changes Expected)

These should NOT change from current behavior:

- ✅ Tier assignment unchanged (still rule-driven)
- ✅ Suggestion ordering unchanged (still by tier)
- ✅ Mentor atoms unchanged (still using selectReasonAtoms)
- ✅ No performance degradation
- ✅ reasonSignals still present (v1 format)
- ✅ reason.atoms still present (v1 format)

## Fallback Behavior

If SuggestionScorer throws error:
- Logged: `[SuggestionEngine] SuggestionScorer failed, continuing with v1 format: <error>`
- Result: signals=[], scoring=null
- System continues with v1 format only
- No breaking changes

## Next Steps After Validation

Once Phase 1 output is validated:

1. Phase 2: Update MentorReasonSelector to use selectFromSuggestionV2(signals, scoring)
2. Phase 3: Remove v1 reasonSignals emission
3. Phase 4: Delete deprecated code paths

---

## Code Location

Implementation details:
- **Main change**: SuggestionEngine._buildSuggestion() (line 1667-1723)
- **Helper functions**:
  - _determineDominantHorizon() (line 1505)
  - _computeConfidenceFromScorer() (line 1516)
  - _buildSignalsFromScorer() (line 1539)
  - _buildScoringObject() (line 1574)
- **Imports**: SuggestionScorer, ReasonType, ReasonCodeToReasonTypeMapping
- **Imports**: All added at top of file (line 50-52)

## Phase 2 Decision Gate (DO NOT PROCEED WITHOUT ALL CHECKED)

**All of these must be true before flipping MentorReasonSelector:**

- [ ] **TYPE CHECK**: weight_type === "number" (not "string")
- [ ] **TYPE CHECK**: all scoring.types say "number" (not "string")
- [ ] **SORTING TEST**: signals_by_weight sorts numerically correct (0.9 > 0.85 > 0.5)
- [ ] **DOMINANCE TEST A**: Found suggestion with immediate dominant
  - [ ] dominantHorizon === "immediate" ✓
  - [ ] signal.horizon === "immediate" ✓
- [ ] **DOMINANCE TEST B**: Found suggestion with shortTerm dominant
  - [ ] dominantHorizon === "shortTerm" ✓
  - [ ] signal.horizon === "shortTerm" ✓
- [ ] **DOMINANCE TEST C**: Found suggestion with identity dominant
  - [ ] dominantHorizon === "identity" ✓
  - [ ] signal.horizon === "identity" ✓
  - [ ] If NOT found: **STOP — Scoring may be misconfigured**
- [ ] **CONFIDENCE TEST**: Confidence varies meaningfully across suggestions
  - [ ] Not all ~0.6–0.7 (that's broken)
  - [ ] Shows clear spread (some 0.45, some 0.80, etc.)
- [ ] **UI REGRESSION TEST**: Tier ordering unchanged
  - [ ] Tier 6 suggestions still grouped at top
  - [ ] Tier 0 suggestions still at bottom
  - [ ] Sorting by tier (not score) still applies

**If ANY of these are false:**
- Do NOT proceed to Phase 2
- Fix the issue in Phase 1
- Re-validate before Phase 2

