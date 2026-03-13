# SuggestionEngine → SuggestionV2 Retrofit: Scope Analysis

## Executive Summary

**Retrofit Complexity: MEDIUM**

The three-horizon scoring infrastructure **already exists and computes correctly**.
It is simply **not being connected to the suggestion output**.

This is not a new architecture—it's wiring the existing architecture.

---

## Current Architecture Map

```
┌─────────────────────────────────────────────────────────────────────┐
│ SuggestionEngine.suggestFeats()                                      │
│ - Evaluates tiers (0-6) based on rules                              │
│ - Builds reasonSignals (OLD FORMAT: boolean flags)                  │
│ Returns: suggestion { tier, reasonSignals, reason }                 │
└────────────────────┬────────────────────────────────────────────────┘
                     │
                     │ ❌ Does NOT call SuggestionScorer
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│ SuggestionScorer.scoreSuggestion()                                   │
│ EXISTS BUT UNUSED                                                    │
│ - Computes immediate, shortTerm, identity scores (0-1)              │
│ - Returns: { breakdown: {immediate, shortTerm, identity},           │
│             horizons: {...}, reasons: [...] }                       │
│ ❌ NOT CALLED ANYWHERE IN PRODUCTION                                │
└────────────────────┬────────────────────────────────────────────────┘
                     │
                     │ (This code path is orphaned)
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│ SuggestionService._enrichSuggestions()                               │
│ Receives: suggestion { tier, reasonSignals: {boolean flags} }       │
│ Calls: MentorReasonSelector.select(reasonSignals)                   │
│ Returns: suggestion + { mentorAtoms, mentorIntensity }              │
│ ❌ No horizon data anywhere in flow                                  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## What Needs to Happen

### Step 1: Call SuggestionScorer
SuggestionEngine must call `scoreSuggestion()` for each candidate:

```javascript
// In SuggestionEngine.suggestFeats() or similar:
const scorerResult = SuggestionScorer.scoreSuggestion(
  candidate,
  actor,
  buildIntent,
  { identityBias }
);
```

### Step 2: Extract Horizon Scores
From scorer result, compute dominantHorizon:

```javascript
const dominantHorizon =
  scorerResult.breakdown.immediate >= scorerResult.breakdown.shortTerm &&
  scorerResult.breakdown.immediate >= scorerResult.breakdown.identity
    ? 'immediate'
    : scorerResult.breakdown.shortTerm >= scorerResult.breakdown.identity
    ? 'shortTerm'
    : 'identity';
```

### Step 3: Build ReasonSignals Array
Convert to SuggestionV2 signals format:

```javascript
const signals = scorerResult.reasons.map(reason => ({
  type: reason.type,  // Mapped from reasonCode → ReasonType
  weight: reason.weight || 0.5,
  horizon: reason.horizon,  // Already in scorer result
  metadata: reason.metadata || {}
}));
```

### Step 4: Build Scoring Object
Attach structured scoring to suggestion:

```javascript
suggestion.scoring = {
  immediate: scorerResult.breakdown.immediate,
  shortTerm: scorerResult.breakdown.shortTerm,
  identity: scorerResult.breakdown.identity,
  final: scorerResult.finalScore,
  confidence: computeConfidence(scorerResult),
  dominantHorizon
};

suggestion.signals = signals;
```

### Step 5: Remove reasonSignals
Delete the old format:

```javascript
// Delete suggestion.reasonSignals;
```

---

## Implementation Checklist

### Phase 1: Instrumentation (2–3 hours)
- [ ] Add SuggestionScorer import to SuggestionEngine
- [ ] Call `scoreSuggestion()` for each evaluated candidate
- [ ] Extract horizon breakdown and dominant horizon
- [ ] Map reason codes to ReasonType enum
- [ ] Build signals array from reason objects

### Phase 2: Integration (1–2 hours)
- [ ] Attach `suggestion.scoring` to suggestion object
- [ ] Attach `suggestion.signals` to suggestion object
- [ ] Verify tier and final score alignment
- [ ] Test with debug logging

### Phase 3: Bridge Update (1 hour)
- [ ] Update `MentorReasonSelector.select()` → call `selectFromSuggestionV2()`
- [ ] Pass signals + scoring to selector
- [ ] Remove deprecated select() method
- [ ] Verify mentor atoms still flow correctly

### Phase 4: Cleanup (30 minutes)
- [ ] Remove reasonSignals object creation
- [ ] Remove ReasonSignalBuilder usage
- [ ] Verify no code depends on old format
- [ ] Delete deprecated code paths

---

## Key Implementation Details

### Where to Make Changes

1. **SuggestionEngine.js** (~line 1484–1544)
   - In `_buildSuggestion()` method
   - Call SuggestionScorer here
   - Build signals + scoring object
   - Remove reasonSignals

2. **SuggestionService.js** (~line 538)
   - Change from `select()` to `selectFromSuggestionV2()`
   - Pass signals + scoring objects
   - No breaking changes to interface

3. **MentorReasonSelector.js**
   - Make `selectFromSuggestionV2()` the primary path
   - Delete `select()` method
   - Update imports in SuggestionService

### Data Flow After Retrofit

```
SuggestionEngine.suggestFeats()
  → Call SuggestionScorer.scoreSuggestion()
  → Extract horizon data + confidence
  → Build signals[] array with ReasonType + weight + horizon
  → Build scoring { immediate, shortTerm, identity, final, confidence, dominantHorizon }
  → Return suggestion { name, tier, signals, scoring }

                          ↓

SuggestionService._enrichSuggestions()
  → Call MentorReasonSelector.selectFromSuggestionV2()
  → Pass signals[] + scoring
  → Receive { atoms, intensity }
  → Attach to suggestion

                          ↓

MentorSuggestionDialog.show()
  → Receive suggestion with atoms + intensity + scoring.dominantHorizon
  → Pass to MentorSuggestionVoice

                          ↓

MentorSuggestionVoice.generateVoicedSuggestion()
  → Call MentorJudgmentEngine.buildExplanation()
  → Use scoring.dominantHorizon for later tone modulation
  → Return mentor-voiced explanation
```

---

## Risk Assessment

### Low Risk
- SuggestionScorer already exists and works
- Changes are additive (new fields, no deletions)
- Tier assignment is unaffected
- Mentor voice atom selection unaffected (selectFromSuggestionV2 handles same logic)

### Medium Risk
- Must verify tier mapping to ReasonType is complete
- Some reason codes may not map to ReasonType (need fallback)
- Must handle edge cases (tie-breaking, missing metadata)

### No Risk
- Backwards compatibility: Old reasonSignals only used internally, never exposed to UI
- Service contract: SuggestionService.getSuggestions() interface unchanged
- Mentor contract: MentorJudgmentEngine signature unchanged

---

## Confidence Computation

Currently not computed. Should be:

```javascript
function computeConfidence(scorerResult) {
  // Confidence = separation between top and second-best horizon
  const scores = [
    scorerResult.breakdown.immediate,
    scorerResult.breakdown.shortTerm,
    scorerResult.breakdown.identity
  ].sort((a, b) => b - a);

  const separation = scores[0] - scores[1];
  const baseConfidence = Math.min(scorerResult.finalScore, 1.0);

  // Higher separation = higher confidence
  const confidenceLift = Math.min(separation * 0.5, 0.3);

  return Math.min(baseConfidence + confidenceLift, 0.95);
}
```

---

## Testing Strategy

### Unit Tests
1. Call SuggestionScorer with known candidate
2. Verify signals array is populated
3. Verify dominantHorizon is computed correctly
4. Verify confidence is reasonable (0.0–1.0)

### Integration Tests
1. Run full suggestion pipeline for feat selection
2. Log suggestion object at SuggestionService level
3. Verify scoring + signals present
4. Verify MentorReasonSelector receives them
5. Verify mentorAtoms + mentorIntensity still correct

### Regression Tests
1. Verify tier assignment unchanged
2. Verify suggestion ordering unchanged
3. Verify mentor voice still works
4. Verify no performance degradation

---

## Estimated Timeline

| Phase | Task | Estimate | Risk |
|-------|------|----------|------|
| 1 | Instrumentation | 2–3 hours | Low |
| 2 | Integration | 1–2 hours | Low |
| 3 | Bridge update | 1 hour | Very Low |
| 4 | Cleanup | 30 min | Low |
| **Total** | | **5–7 hours** | **Low** |

---

## Architectural Outcome

After retrofit:

✅ SuggestionV2 contract fully implemented
✅ Three-horizon scoring connected to mentor system
✅ Weight-driven atom selection enabled
✅ Dominance-aware tone modulation possible
✅ Confidence-scaled phrasing ready
✅ No dead code pathways

This is the correct state. The contract is no longer decorative.
