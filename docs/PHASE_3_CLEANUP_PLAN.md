# Phase 3 Cleanup Plan

## Purpose

Lock SuggestionV2 as the sole authoritative suggestion format.

Remove all deprecated boolean reasoning paths.

Enforce single-path architecture.

---

## When Phase 3 Executes

**AFTER** Phase 2 validation confirms:
- ✅ selectFromSuggestionV2() works for all suggestion types
- ✅ Atoms meaningfully vary by dominance scenario
- ✅ No console errors during heavy testing
- ✅ UI performance acceptable

---

## Phase 3 Cleanup Checklist

### 1️⃣ Remove Deprecated select() Method

**File:** scripts/engine/mentor/mentor-reason-selector.js

**Action:** Delete entire method (lines ~101-200)

```javascript
// DELETE THIS:
static select(reasonSignals, mentorProfile = {}) {
  SWSELogger.warn('[MentorReasonSelector] Using deprecated select()...');
  // ... 100+ lines of old logic
}
```

**Keep:** selectFromSuggestionV2() method only.

**Verify:**
- No other file imports or calls select()
- Check grep: `MentorReasonSelector.select` (should find 0 results after cleanup)

---

### 2️⃣ Remove reasonSignals Emission from SuggestionEngine

**File:** scripts/engine/suggestion/SuggestionEngine.js

**Action:** Remove reasonSignals object creation in _buildSuggestion()

Currently returns:
```javascript
return {
    tier,
    reasonCode,
    sourceId,
    confidence,
    reasonSignals,        // ← DELETE THIS ENTIRE FIELD
    reason,              // ← DELETE THIS ENTIRE FIELD
    signals,             // ← KEEP (new format)
    scoring              // ← KEEP (new format)
};
```

Should become:
```javascript
return {
    tier,
    reasonCode,
    sourceId,
    confidence,
    signals,             // ← NEW FORMAT ONLY
    scoring
};
```

**Actions:**
- Remove reasonSignals object creation (all ReasonSignalBuilder usage)
- Remove reason object construction
- Remove related comments about v1 format
- Keep tier, reasonCode, sourceId, confidence (tier is rule-driven, not derived)

**Verify:**
- No code references `suggestion.reasonSignals`
- No code references `suggestion.reason`
- Check grep: `\.reasonSignals` (should find 0 results)
- Check grep: `\.reason\.` for suggestion object (should find 0 results)

---

### 3️⃣ Remove Fallback in SuggestionService

**File:** scripts/engine/suggestion/SuggestionService.js

**Location:** _enrichSuggestions() method (line ~533)

**Current State:**
```javascript
// PRIMARY: selectFromSuggestionV2
if (suggestion?.suggestion?.signals && suggestion?.suggestion?.scoring) {
  // ... selectFromSuggestionV2 call
}
// FALLBACK: deprecated select()
else if (suggestion?.suggestion?.reasonSignals) {
  // ... deprecated select() call
}
```

**Phase 3 State:**
```javascript
// ONLY selectFromSuggestionV2
if (suggestion?.suggestion?.signals && suggestion?.suggestion?.scoring) {
  const mentorSelection = MentorReasonSelector.selectFromSuggestionV2(
    suggestion.suggestion.signals,
    suggestion.suggestion.scoring,
    { mentorProfile: options.mentorProfile || null }
  );
  suggestion.mentorAtoms = mentorSelection.atoms;
  suggestion.mentorIntensity = mentorSelection.intensity;
} else {
  // Hard error if v2 signals missing (not soft fallback)
  SWSELogger.error('[SuggestionService] suggestion missing signals/scoring; v2 format required');
  suggestion.mentorAtoms = suggestion?.suggestion?.reason?.atoms || [];
  suggestion.mentorIntensity = 'medium';
}
```

**Actions:**
- Delete entire `else if` branch (fallback to select())
- Change fallback behavior to ERROR log (not graceful)
- Keep v2 path unchanged

**Verify:**
- No soft fallback to select()
- Error is logged if v2 format missing
- selectFromSuggestionV2() is only path

---

### 4️⃣ Clean Up Imports

**File:** scripts/engine/suggestion/SuggestionEngine.js

**Remove:**
```javascript
import { ReasonSignalBuilder } from "...";
```

This was only used for reasonSignals construction.

**Verify:**
- grep: `ReasonSignalBuilder` (should find 0 results)
- All imports still present for v2 path:
  - `SuggestionScorer`
  - `ReasonType`
  - `ReasonCodeToReasonTypeMapping`

---

### 5️⃣ Delete selectReasonAtoms Dependency (Optional Cleanup)

**File:** scripts/engine/suggestion/selectReasonAtoms.js

**Status:** Currently still imported by SuggestionEngine for reason.atoms.

**Decision:**
- If reason object is deleted, selectReasonAtoms becomes unused
- Can be deleted in Phase 3 OR left as dead code (low risk either way)
- User decision: Delete for maximum cleanup, or leave for minimal risk

**Recommendation:** Delete it. Dead code is entropy.

---

### 6️⃣ Remove Debug Logging Comments

**File:** scripts/engine/suggestion/SuggestionEngine.js

Search for:
```javascript
// Debug logging: uncomment to verify...
// TODO: remove once validated...
// PHASE 1: (old comments about transient state)
```

These were scaffolding comments. Remove once Phase 2 validated.

---

## Phase 3 Verification Checklist

After cleanup, verify:

### Type Safety
- [ ] No string weights (all numeric)
- [ ] No type coercion in sorting
- [ ] Signals always array
- [ ] Scoring always object

### Path Integrity
- [ ] Only selectFromSuggestionV2() in use
- [ ] No MentorReasonSelector.select() calls
- [ ] No reasonSignals emission
- [ ] No reason object emission

### Code Cleanliness
- [ ] grep: `reasonSignals` → 0 results (except comments)
- [ ] grep: `\.reason\.` → 0 results for suggestion object
- [ ] grep: `ReasonSignalBuilder` → 0 results
- [ ] grep: `select\(` → 0 results for MentorReasonSelector.select
- [ ] No commented-out fallback code

### Performance
- [ ] No console errors during heavy feat loading
- [ ] No performance regression from Phase 2
- [ ] Atom distribution varies across suggestions
- [ ] Intensity scales correctly with confidence

### Behavioral
- [ ] Tier assignment unchanged
- [ ] Suggestion ordering unchanged (by tier)
- [ ] Atoms vary by dominance scenario
- [ ] Intensity varies by confidence
- [ ] No UI flickering or delays

---

## Phase 3 Commit Strategy

Execute as **single atomic commit:**

```
Phase 3: Lock SuggestionV2 as sole authoritative format

Delete deprecated reasoning paths:
- Remove MentorReasonSelector.select() method
- Remove reasonSignals emission from SuggestionEngine
- Remove reason object construction
- Remove ReasonSignalBuilder import
- Remove v1 fallback in SuggestionService
- Clean debug logging scaffolding

Enforce single-path architecture:
- SuggestionV2 signals + scoring only
- selectFromSuggestionV2() is authoritative path
- Hard error if v2 format missing
- No shadow fallbacks

Verified:
- All suggestion types (feats/talents/classes/attributes/powers)
- Atom distribution varies meaningfully
- Intensity scales correctly
- No performance regression
- No console errors during heavy testing

SuggestionV2 is now the locked contract.
No v1 code remains in production path.

https://claude.ai/code/session_01AXxMZf2gVZN9oGnEJQoDev
```

---

## Post-Phase 3 State

The codebase will be:

**Authoritative:**
- ✅ SuggestionEngine emits signals + scoring only
- ✅ MentorReasonSelector consumes only v2 format
- ✅ Weight-driven atom selection enforced
- ✅ Single reasoning path

**Removed:**
- ❌ Boolean reasonSignals
- ❌ v1 select() method
- ❌ v1 fallback logic
- ❌ ReasonSignalBuilder
- ❌ selectReasonAtoms usage (for suggestion.reason)

**Ready for:**
- ✅ Phase 4: Tone modulation using dominantHorizon
- ✅ Phase 5: Intensity scaling in phrasing
- ✅ Phase 6: Confidence-based hesitation language

---

## Risk Assessment

**Phase 3 Risk: LOW**

Why:
- No new code introduced
- Only deletions (least risky operation)
- v2 path already validated in Phase 2
- Fallback still exists during Phase 2 validation
- Can revert entire commit if needed

**Regression Prevention:**
- Verify tier assignment unchanged
- Verify suggestion ordering unchanged
- Confirm atoms vary (not collapsed)
- Test all suggestion types

---

## Timeline

Phase 3 execution (once Phase 2 validated):
- Cleanup: 30 minutes
- Verification: 1 hour
- Testing in Foundry: 30 minutes
- Total: ~2 hours

Single atomic commit, no staged rollout.

---

## Success Criteria

Phase 3 is complete when:

1. ✅ grep shows 0 results for deprecated paths
2. ✅ All tests pass
3. ✅ Foundry UI shows no regressions
4. ✅ Atom distribution varies by dominance
5. ✅ Console shows only v2 logs (no fallback warnings)
6. ✅ Single commit successfully pushed

At that point:

**Architecture is locked.**
**Multi-horizon reasoning is sole authority.**
**Mentor system is structurally honest.**

Ready for enhancement phases.
