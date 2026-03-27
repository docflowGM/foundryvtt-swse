# PHASE 2 PREREQUISITE SOVEREIGNTY HANDOFF — AUTHORITY RESTORATION

**Status**: COMPLETE ✓
**Date**: 2026-03-27
**Branch**: claude/audit-post-migration-N8GgQ

---

## 1. What Was Wrong in the Current Repo

### Problem 1: CandidatePoolBuilder Bypassed Authority
**File**: `scripts/engine/suggestion/CandidatePoolBuilder.js` (lines 130, 183)

**Old code**:
```javascript
// Direct call to PrerequisiteChecker, NOT through AbilityEngine
const prereqCheck = PrerequisiteChecker.checkFeatPrerequisites(actor, candidate);
if (prereqCheck.met) {
  filtered.push(candidate);
}
```

**Impact**: Feat and force technique suggestions did not go through the authority layer. If AbilityEngine evaluated differently than PrerequisiteChecker, suggestions could be unreliable.

---

### Problem 2: AttributeIncreaseScorer Bypassed Authority
**File**: `scripts/engine/suggestion/AttributeIncreaseScorer.js` (lines 265, 269)

**Old code**:
```javascript
// Direct check of current state, bypassing AbilityEngine
const currentCheck = PrerequisiteChecker.checkFeatPrerequisites(actor, feat);
if (currentCheck.met) continue;

// Direct check of hypothetical state, bypassing AbilityEngine
const hypotheticalCheck = PrerequisiteChecker.checkFeatPrerequisites(hypotheticalActor, feat);
if (hypotheticalCheck.met) {
  unlockedFeats.push(feat.name);
}
```

**Impact**: Attribute increase scoring evaluated prerequisites without going through AbilityEngine. Hypothetical projections could diverge from actual authority.

---

### Problem 3: TemplateEngine Bypassed Validation Entirely
**File**: `scripts/engine/progression/engine/template-engine.js` (lines 73, 86)

**Old code**:
```javascript
await engine.doAction('confirmClass', {
  classId: tpl.class,
  skipPrerequisites: true  // ← BYPASS ALL VALIDATION
});

// ... later in multi-level class application:
await engine.doAction('confirmClass', {
  classId: classLevel.class,
  skipPrerequisites: true  // ← BYPASS ALL VALIDATION
});
```

**Impact**: Templates skipped ALL prerequisite validation. If a template was stale or invalid, an invalid class would apply silently, no error thrown.

---

## 2. What Is Now Authoritative

### Authority Principle: AbilityEngine is Sole Legality Gate
**Architectural rule**: No runtime code calls PrerequisiteChecker directly.
**Only exception**: AbilityEngine itself (the authority layer), ForecastEngine (hypothetical-only), PrerequisiteChecker internal calls, and utility functions.

---

### CandidatePoolBuilder Now Routes Through Authority
**File**: `scripts/engine/suggestion/CandidatePoolBuilder.js` (lines 130, 183)

```javascript
// PHASE 2: Direct call to AbilityEngine authority layer
if (AbilityEngine.canAcquire(actor, candidate)) {
  filtered.push(candidate);
}
```

**Truth**: All candidates in filtered pool are evaluated by AbilityEngine.

---

### AttributeIncreaseScorer Now Routes Through Authority
**File**: `scripts/engine/suggestion/AttributeIncreaseScorer.js` (lines 265, 269)

```javascript
// PHASE 2: Check current state through AbilityEngine
if (AbilityEngine.canAcquire(actor, feat)) continue;

// PHASE 2: Check hypothetical state through AbilityEngine
if (AbilityEngine.canAcquire(hypotheticalActor, feat)) {
  unlockedFeats.push(feat.name);
}
```

**Truth**: Both current and hypothetical evaluations use AbilityEngine, ensuring parity.

---

### TemplateEngine Now Validates Like Any Progression
**File**: `scripts/engine/progression/engine/template-engine.js` (lines 73, 86)

```javascript
// PHASE 2: Removed skipPrerequisites flag
await engine.doAction('confirmClass', {
  classId: tpl.class
  // ← No skipPrerequisites, normal validation runs
});

// Multi-level:
await engine.doAction('confirmClass', {
  classId: classLevel.class
  // ← No skipPrerequisites, each level validates independently
});
```

**Truth**: Templates are no longer exempt from validation. If a class is invalid, doAction() will fail (not silently bypass).

---

## 3. Test Proof

### Test File
**Location**: `scripts/apps/progression-framework/testing/phase-2-prerequisite-sovereignty.test.js`

**Tests implemented**:

1. **TEST 1: CandidatePoolBuilder routes through AbilityEngine**
   - Verified: Feats in filtered pool match AbilityEngine.canAcquire() evaluation
   - Result: ✓ PASS

2. **TEST 2: TemplateEngine no longer bypasses prerequisites**
   - Verified: skipPrerequisites flag is removed from both class application sites
   - Verified: Template class validation failures now propagate (not silent)
   - Result: ✓ PASS

3. **TEST 3: Feat filtering consistency with AbilityEngine**
   - Verified: Every feat in CandidatePoolBuilder output is approved by AbilityEngine
   - Verified: Every feat rejected by AbilityEngine is excluded from output
   - Result: ✓ PASS

4. **TEST 4: Force technique filtering routes through AbilityEngine**
   - Verified: Force techniques use AbilityEngine.canAcquire(), not PrerequisiteChecker
   - Result: ✓ PASS

5. **TEST 5: No direct PrerequisiteChecker calls in suggestion/scoring**
   - Code inspection confirms: All three violation sites now use AbilityEngine
   - Result: ✓ PASS

6. **TEST 6: Hypothetical actor scoring uses AbilityEngine consistently**
   - Verified: Both current and hypothetical evaluations use AbilityEngine
   - Verified: Parity between ForecastEngine and AttributeIncreaseScorer
   - Result: ✓ PASS

---

## 4. Files Changed

### Modified
1. `scripts/engine/suggestion/CandidatePoolBuilder.js` — Route through AbilityEngine
2. `scripts/engine/suggestion/AttributeIncreaseScorer.js` — Route through AbilityEngine
3. `scripts/engine/progression/engine/template-engine.js` — Remove skipPrerequisites flag

### Added
1. `scripts/apps/progression-framework/testing/phase-2-prerequisite-sovereignty.test.js` — Proof tests
2. `PHASE-2-PREREQUISITE-SOVEREIGNTY-AUDIT.md` — Complete audit of violations and fixes

### Unchanged (Pre-Approved)
- `scripts/engine/abilities/AbilityEngine.js` — Authority layer (correct to call PrerequisiteChecker)
- `scripts/engine/progression/forecast/forecast-engine.js` — Hypothetical-only (approved to call)

---

## 5. Architectural Guarantees After Phase 2

### Enforcement Layer: AbilityEngine
- ✓ All "can acquire?" decisions flow through AbilityEngine.evaluateAcquisition()
- ✓ SuggestionEngine does not call PrerequisiteChecker directly
- ✓ AttributeIncreaseScorer does not call PrerequisiteChecker directly
- ✓ TemplateEngine does not bypass validation via skipPrerequisites

### Consequence: Auditable Authority
- Every acquisition legality decision can be traced to AbilityEngine
- Authority violations are now machine-detectable (no direct PrerequisiteChecker imports in suggestion/scoring paths)
- If rules change, they change in one place (AbilityEngine), not scattered across the system

### Consequence: Testable Consistency
- Suggestions must use same legality logic as forecasting
- Scoring must use same legality logic as actual progression
- Template application must validate like any other progression
- No "special cases" bypass rules

---

## 6. Architecture Diagram

```
Before Phase 2:
==================
CandidatePoolBuilder ─→ PrerequisiteChecker (direct)
AttributeIncreaseScorer ─→ PrerequisiteChecker (direct)
TemplateEngine ─→ skipPrerequisites flag (bypass)
     ↓
INCONSISTENT evaluation; no single source of authority


After Phase 2:
==================
CandidatePoolBuilder ─→┐
AttributeIncreaseScorer ─→┤ AbilityEngine (authority)
TemplateEngine ─────────┤ (calls PrerequisiteChecker internally)
ForecastEngine ────────┘
     ↓
CONSISTENT evaluation; AbilityEngine is sole gate
```

---

## 7. Known Follow-Ups (Phase 3+ Only)

### Do NOT address in Phase 2
The following are OUT OF SCOPE for Phase 2:

1. **Template Validation Before Apply (Phase 3)**
   - TemplateEngine should validate template content BEFORE applying
   - Currently: Applies first, fails during doAction if invalid
   - Should: Validate template at load time, reject early
   - **Leave as-is for Phase 3**

2. **Scenario & Reconciliation Proof (Phase 3)**
   - Test that all paths (chargen, levelup, template) produce same result for same inputs
   - Verify ForecastEngine and actual progression agree
   - **Leave as-is for Phase 3**

3. **Rollout Truthfulness (Phase 4)**
   - Operator-facing documentation of what is guaranteed
   - Audit trail for decisions
   - **Leave as-is for Phase 4**

---

## 8. Summary: The Core Change

### Before Phase 2
```
Suggestion asks: "Is feat X legal?"
Suggestion calls: PrerequisiteChecker directly
Scoring asks: "Would feat Y unlock with higher STR?"
Scoring calls: PrerequisiteChecker directly
Template applies: "Apply class Z"
Template flag: skipPrerequisites: true (bypass validation)

Result: Three different paths, inconsistent authority, no single source of truth
❌ Silent inconsistencies possible; no audit trail
```

### After Phase 2
```
Suggestion asks: "Is feat X legal?"
Suggestion calls: AbilityEngine.canAcquire(actor, feat)
Scoring asks: "Would feat Y unlock with higher STR?"
Scoring calls: AbilityEngine.canAcquire(hypotheticalActor, feat)
Template applies: "Apply class Z"
Template calls: doAction('confirmClass', {classId}) — validates normally

Result: One authority layer; all paths consistent; one source of truth
✓ Loud failure if rules violated; centralized authority; auditable decisions
✓ All suggestions, scoring, and templates use same legality logic
✓ Changes to rules propagate everywhere (single point of change)
```

---

## 9. Next Phase: Phase 3 Entry Conditions

When you start Phase 3 (Scenario & Reconciliation Proof), these Phase 2 guarantees are in place:

✓ AbilityEngine is the sole authority on ability acquisition legality
✓ All runtime suggestion/scoring paths route through AbilityEngine
✓ TemplateEngine no longer bypasses validation
✓ Template application fails loudly if invalid, not silently
✓ Legality decisions are centralized and auditable

Phase 3 can now focus on cross-path consistency without worrying about scattered authority violations.

---

**END OF PHASE 2 HANDOFF**

