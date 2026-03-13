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

As feats/talents are suggested, console will show:

```
[SuggestionEngine.Phase1Validation] <FeatName>: {
  "name": "<FeatName>",
  "tier": 4,
  "reasonCode": "CHAIN_CONTINUATION",
  "signals": [
    {
      "type": "FEAT_CHAIN_SETUP",
      "weight": "0.70",
      "horizon": "immediate"
    }
  ],
  "scoring": {
    "immediate": "0.45",
    "shortTerm": "0.28",
    "identity": "0.15",
    "final": "0.35",
    "confidence": "0.48",
    "dominantHorizon": "immediate"
  }
}
```

### Step 3: Validate Output Structure

For each log entry, verify:

#### A. Signals Array Present
- [ ] `signals` field exists
- [ ] `signals` is an array (not empty)
- [ ] Each signal has: `type`, `weight`, `horizon`

#### B. Scoring Object Present
- [ ] `scoring` field exists
- [ ] Has: `immediate`, `shortTerm`, `identity`, `final`, `confidence`, `dominantHorizon`
- [ ] All values are numbers in range [0.0, 1.0]

#### C. Weight Differentiation
- [ ] If multiple signals: weights vary (not all 0.5)
- [ ] Weights reflect signal importance

#### D. Dominant Horizon Correctness
- [ ] `dominantHorizon` = horizon with highest score
- [ ] If immediate=0.45, shortTerm=0.28, identity=0.15 → dominantHorizon should be "immediate"

#### E. Tier/Score Separation Invariant
- [ ] Tier and finalScore can diverge (this is correct!)
- [ ] Example: Tier 6 feat can have finalScore 0.35
- [ ] Example: Tier 1 feat can have finalScore 0.65

### Step 4: Collect Examples

Capture **two key scenarios**:

**Scenario A: Prestige-Heavy Suggestion**
Expected pattern:
- Tier: 6 (PRESTIGE_PREREQ)
- dominantHorizon: likely "shortTerm" or "identity"
- final score: may be lower (0.3-0.6)
- confidence: high (0.6+)

**Scenario B: Attribute-Heavy Suggestion**
Expected pattern:
- Tier: 2-4 (depends on rule match)
- dominantHorizon: likely "immediate"
- final score: varies
- confidence: moderate

### Step 5: Report Validation Results

Copy console output showing:
1. One prestige-heavy example (full JSON)
2. One attribute-heavy example (full JSON)
3. Confirm all fields present
4. Note any missing fields or errors

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

## Validation Checklist

- [ ] Opened Foundry VTT browser console
- [ ] Triggered feat/talent suggestions
- [ ] Found Phase1Validation logs
- [ ] Verified signals[] present and non-empty
- [ ] Verified scoring object present with all fields
- [ ] Confirmed dominantHorizon matches highest score
- [ ] Captured prestige-heavy example
- [ ] Captured attribute-heavy example
- [ ] Confirmed tier/score separation (can diverge)
- [ ] Noted any errors or missing fields
- [ ] Ready for Phase 2

