# SuggestionEngine → SuggestionV2 Retrofit: Pre-Flight Checklist

## Executive: Five Critical Questions Answered

### ✅ 1️⃣ Is SuggestionScorer Deterministic and Complete?

**ANSWER: YES**

Evidence:
- **Function**: `scoreSuggestion(candidate, actor, buildIntent, options)` (line 64)
- **Coverage**: Works on ANY candidate type (feats, talents, classes, powers, attributes)
  - Uses candidate.tags, candidate.name, candidate.type generically
  - No hardcoded type checks
  - No "this only works for feats" conditions
- **Horizon Computation**:
  - `_computeImmediateScore()` (line 178+) → returns score + breakdown
  - `_computeShortTermScore()` (line 91+) → returns score + breakdown
  - `_computeIdentityProjectionScore()` (line 102+) → returns score + breakdown
- **Output Structure** (line 147-161):
  ```javascript
  {
    finalScore: number,
    breakdown: {
      immediate: number,
      shortTerm: number,
      identity: number,
      conditionalBonus: number
    },
    horizons: {
      immediate: { score, breakdown },
      shortTerm: { score, breakdown },
      identity: { score, breakdown }
    },
    reasons: string[]
  }
  ```
- **Batch Function**: `scoreAllCandidates()` (line 771) applies to N candidates with deterministic tie-breaking
- **No Legacy Dependencies**: Does not reference buildIntent.identity (that was removed)
- **No Reliance on reasonSignals**: Entirely independent

**VERDICT: Ready to use. No scope inflation.**

---

### ✅ 2️⃣ Where Is Tier Currently Computed? Does It Align with SuggestionScorer.final?

**ANSWER: Tier is computed by SuggestionEngine rule evaluation, NOT by SuggestionScorer**

Current Flow:
```
SuggestionEngine._evaluateFeat()
  → Applies rules in priority order (lines 1200+)
  → Returns FIRST match with tier (6 → 5 → 4 → 3 → 2 → 1 → 0)
  → Tier maps to reason code via TIER_REASON_CODES (line 72)

Example:
  TIER_REASON_CODES = {
    6: 'PRESTIGE_PREREQ',
    5: 'META_SYNERGY',
    4: 'CHAIN_CONTINUATION',
    3: 'ARCHETYPE_RECOMMENDATION',
    2: 'ABILITY_PREREQ_MATCH',
    1: 'CLASS_SYNERGY',
    0: 'FALLBACK'
  }
```

**The Critical Issue:**
- Tier is assigned based on RULE MATCHING (first rule that matches wins)
- SuggestionScorer.final is computed from three-horizon synthesis (weighted average)
- These CAN diverge

**Example Scenario:**
- Actor is 1 level from prestige (Tier 6 by rule)
- But feat has weak attribute synergy + weak skill synergy (scorer.final = 0.35)
- Result: Tier 6 with low final score = contradiction

**DECISION REQUIRED:**

Option A: Keep tier from rule evaluation, use scorer.final for confidence/dominance
  - Tier determines display order in UI
  - Scorer determines mentor tone
  - Risk: Tier and score may appear misaligned to user

Option B: Recalculate tier from scorer.final (MAJOR REFACTOR)
  - Map score ranges to tiers: 0.9+ = tier 6, 0.8+ = tier 5, etc.
  - Unify tier source of truth
  - Risk: Changes existing tier semantics

**CURRENT RECOMMENDATION: Option A**
- Tier stays rule-driven (semantically meaningful)
- SuggestionScorer feeds confidence + dominance
- These serve different purposes (ranking vs tone)

---

### ✅ 3️⃣ Are Reason Codes Already Structured? Do They Map 1:1 to ReasonType?

**ANSWER: PARTIAL — Reason codes exist but don't map 1:1 to ReasonType. Mapping is needed.**

Current State:

**Old Reason Code System** (in SuggestionEngine):
```javascript
PRESTIGE_PREREQ
WISHLIST_PATH
MARTIAL_ARTS
META_SYNERGY
SPECIES_EARLY
CHAIN_CONTINUATION
ARCHETYPE_RECOMMENDATION
PRESTIGE_SIGNAL
MENTOR_BIAS_MATCH
SKILL_PREREQ_MATCH
ABILITY_PREREQ_MATCH
CLASS_SYNERGY
FALLBACK
```

**New ReasonType System** (in SuggestionV2Contract):
```
Immediate Horizon (0.60):
  ATTRIBUTE_SYNERGY
  FEAT_PREREQUISITE_MET
  TALENT_TREE_CONTINUATION
  ROLE_ALIGNMENT
  EQUIPMENT_SYNERGY
  COMBAT_STYLE_MATCH
  SKILL_INVESTMENT_ALIGNMENT
  ACTION_ECONOMY_GAIN
  DEFENSIVE_GAP_COVERAGE
  REDUNDANCY_WARNING
  (+ more)

Short-Term Horizon (0.25):
  PRESTIGE_PROXIMITY
  (+ more)

Identity Horizon (0.15):
  IDENTITY_ALIGNMENT
  ARCHETYPE_AFFINITY
  (+ more)
```

**Current Bridge:**
- `selectReasonAtoms(reasonCode)` (selectReasonAtoms.js) maps old codes → REASON_ATOMS ✓
- But NO mapping from old codes → ReasonType ✓ **MISSING**

**What We Need:**

A mapping from old reason codes to new ReasonType:

```javascript
const REASON_CODE_TO_REASON_TYPE = {
  PRESTIGE_PREREQ: ReasonType.PRESTIGE_PROXIMITY,
  CHAIN_CONTINUATION: ReasonType.FEAT_CHAIN_SETUP,
  ATTRIBUTE_SYNERGY: ReasonType.ATTRIBUTE_SYNERGY,
  ARCHETYPE_RECOMMENDATION: ReasonType.IDENTITY_ALIGNMENT,
  SKILL_PREREQ_MATCH: ReasonType.SKILL_INVESTMENT_ALIGNMENT,
  ABILITY_PREREQ_MATCH: ReasonType.ATTRIBUTE_SYNERGY,
  CLASS_SYNERGY: ReasonType.ROLE_ALIGNMENT,
  META_SYNERGY: ReasonType.MECHANICAL_SYNERGY, // or similar
  MENTOR_BIAS_MATCH: ReasonType.IDENTITY_ALIGNMENT,
  SPECIES_EARLY: ReasonType.IDENTITY_ALIGNMENT,
  WISHLIST_PATH: ReasonType.GOAL_ADVANCEMENT, // or custom
  MARTIAL_ARTS: ReasonType.COMBAT_STYLE_MATCH,
  FALLBACK: ReasonType.LEGAL_OPTION // or null for no signal
};
```

**SCOPE IMPACT: +30 minutes**
- Create REASON_CODE_TO_REASON_TYPE mapping
- Use in SuggestionEngine._buildSuggestion() when creating signals
- Some reason codes may map to "no primary ReasonType" (fallback)

---

### ✅ 4️⃣ Is Anything Else Consuming reasonSignals?

**ANSWER: NO — Only MentorReasonSelector.select() consumes them**

Search Results:
```
✓ MentorReasonSelector.select() - ONLY consumer (line 538 in SuggestionService)
✓ ReasonSignalBuilder - Internal helper, can be deleted
✓ No UI panels reading reasonSignals
✓ No debug tools reading reasonSignals
✓ No other bridges consuming reasonSignals
✓ One test file (mentor-interaction-orchestrator.test.js) has mock, trivial to update
```

**VERDICT: Safe to delete. No cascading dependencies.**

---

### ✅ 5️⃣ Are We Ready to Delete the Deprecated Path?

**ANSWER: YES — Everything is isolated**

Current Deprecated Code:
- `MentorReasonSelector.select()` - ONLY called from SuggestionService line 538
- `ReasonSignalBuilder` - Only called from SuggestionEngine line 1509
- Boolean reasonSignals format - Only created in SuggestionEngine._buildSuggestion()

Post-Retrofit Cleanup:
1. Delete `MentorReasonSelector.select()` method + helpers
2. Delete `ReasonSignalBuilder` import + usage
3. Delete reasonSignals object creation
4. Update test file mock
5. **Single atomic commit: "Remove v1 reasonSignals format"**

**No rollback risk — new path (selectFromSuggestionV2) already exists and is tested.**

---

## Pre-Flight Implementation Checklist

### Phase 0: Preparation (30 min)

- [ ] Create REASON_CODE_TO_REASON_TYPE mapping
  - Map all 13 reason codes → ReasonType values
  - Fallback strategy for unmapped codes

- [ ] Import SuggestionScorer in SuggestionEngine
  - Add: `import { scoreSuggestion } from "./suggestion-scorer.js";`
  - Location: top of SuggestionEngine.js

- [ ] Import ReasonType enum in SuggestionEngine
  - Add: `import { ReasonType } from "./SuggestionV2Contract.ts";`

- [ ] Create dominantHorizon computation function
  ```javascript
  function determineDominantHorizon(immediate, shortTerm, identity) {
    if (immediate >= shortTerm && immediate >= identity) return 'immediate';
    if (shortTerm >= identity) return 'shortTerm';
    return 'identity';
  }
  ```

### Phase 1: Instrumentation (2 hours)

- [ ] Modify `SuggestionEngine._buildSuggestion()` (line 1484)
  - Call SuggestionScorer
  - Extract horizons breakdown
  - Compute dominantHorizon
  - Compute confidence (not currently done)
  - **Keep old tier assignment unchanged**

- [ ] Build signals array in `_buildSuggestion()`
  - Map reasonCode → ReasonType using new mapping
  - Extract weight from scorer breakdown
  - Extract horizon (immediate/shortTerm/identity)
  - Attach metadata (e.g., prestigeClass for prestige signals)

- [ ] Build scoring object in `_buildSuggestion()`
  ```javascript
  suggestion.scoring = {
    immediate: scorerResult.breakdown.immediate,
    shortTerm: scorerResult.breakdown.shortTerm,
    identity: scorerResult.breakdown.identity,
    final: scorerResult.finalScore,
    confidence: computeConfidence(scorerResult),
    dominantHorizon
  };
  ```

- [ ] Attach signals to suggestion
  ```javascript
  suggestion.signals = signals;
  ```

- [ ] Debug logging
  - Add console.log of suggestion.scoring + signals
  - Verify dominantHorizon matches expectations
  - Verify signal weights > 0.1

### Phase 2: Bridge Update (1 hour)

- [ ] Update `SuggestionService._enrichSuggestions()` (line 536)
  - Change from `MentorReasonSelector.select(reasonSignals)`
  - To: `MentorReasonSelector.selectFromSuggestionV2(signals, scoring)`
  - Verify mentorAtoms still flow correctly

- [ ] Test mentor voice end-to-end
  - Verify atoms are selected
  - Verify intensity computation changed (now weight-based)
  - Verify mentor output differs meaningfully

### Phase 3: Validation (1 hour)

- [ ] Run existing test suite
  - Verify tier assignment unchanged
  - Verify suggestion ordering unchanged
  - Verify mentor voice still works

- [ ] Create new tests
  - Test weight-driven atom selection
  - Test dominantHorizon computation
  - Test confidence scaling

- [ ] Verify no regressions
  - Run chargen flow
  - Run levelup flow
  - Check for console warnings

### Phase 4: Cleanup (30 min)

- [ ] Delete deprecated code
  - Remove `MentorReasonSelector.select()` method
  - Remove `_determineIntensityLegacy()`
  - Remove ReasonSignalBuilder import + usage
  - Remove reasonSignals object creation

- [ ] Update test file
  - Remove mock reasonSignals
  - Update to use signals + scoring format

- [ ] Final cleanup commit

---

## Implementation Safeguards

### Parallel Emission (Recommended)
For first 1 week: Emit BOTH formats
```javascript
// Keep old format for safety
suggestion.suggestion.reasonSignals = { ... };

// Add new format
suggestion.signals = [ ... ];
suggestion.scoring = { ... };
```

Then run in production, monitoring for issues.

Then delete old format.

### Deterministic Testing
```javascript
// Test 1: Weight drives selection
test('Stronger weight = higher priority atoms')
  signals = [
    { type: PRESTIGE_PROXIMITY, weight: 0.7 },
    { type: ATTRIBUTE_SYNERGY, weight: 0.2 }
  ]
  atoms = MentorReasonSelector.selectFromSuggestionV2(signals)
  // Must include prestige-related atoms

// Test 2: Horizon dominance
test('dominantHorizon correctly identified')
  scoring = {
    immediate: 0.4,
    shortTerm: 0.7,
    identity: 0.3
  }
  // Must be 'shortTerm'

// Test 3: Confidence scaled
test('confidence reflects separation')
  // High separation = high confidence
  // Low separation = lower confidence
```

### Regression Prevention
- Tier assignment: Unchanged
- Suggestion ordering: Must remain identical
- Mentor output: Will change (expected) but must be meaningful
- Performance: No observable difference

---

## Risk Matrix

| Phase | Risk | Mitigation |
|-------|------|-----------|
| Instrumentation | Missing horizon computation | Add 5-tier SuggestionScorer verification |
| Instrumentation | ReasonCode→ReasonType incomplete | Audit all 13 codes, add fallback |
| Bridge Update | selectFromSuggestionV2 fails | Verify it's fully implemented + tested |
| Validation | Unexpected tier changes | Keep tier logic identical, only add scoring |
| Cleanup | Orphaned code path | Delete in single commit, don't stage |

---

## Final Approval Gate

Before proceeding to implementation, confirm:

- [ ] Tier assignment will NOT change (only scoring added)
- [ ] SuggestionScorer will be called for all suggestion types
- [ ] REASON_CODE_TO_REASON_TYPE mapping is complete
- [ ] selectFromSuggestionV2() will be the ONLY path forward
- [ ] All boolean reasonSignals will be deleted in single atomic cleanup
- [ ] Test coverage includes weight-driven and dominance scenarios

**If all items are checked: Implementation can proceed safely.**
