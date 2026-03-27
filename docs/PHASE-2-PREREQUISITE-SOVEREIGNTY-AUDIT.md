# PHASE 2 AUDIT — PREREQUISITE SOVEREIGNTY VIOLATIONS

**Status**: AUDIT COMPLETE, REMEDIATION IN PROGRESS
**Date**: 2026-03-27
**Branch**: claude/audit-post-migration-N8GgQ

---

## Summary

Phase 1 established that canonical `progressionSession` is the single source of truth for what selections are applied. Phase 2 ensures that what *can* be legally selected is determined ONLY by `AbilityEngine`, not by runtime code directly calling `PrerequisiteChecker`.

This audit identified **6 violation points** across 3 files where runtime code bypasses the authority layer.

---

## 1. Violations Identified

### VIOLATION 1: CandidatePoolBuilder._filterHeroicFeats() — Direct PrerequisiteChecker call
**File**: `scripts/engine/suggestion/CandidatePoolBuilder.js`
**Line**: 130
**Severity**: HIGH (blocks qualified feats from suggestion)

```javascript
// VIOLATION: Direct call to PrerequisiteChecker, bypassing AbilityEngine
const prereqCheck = PrerequisiteChecker.checkFeatPrerequisites(actor, candidate);
if (prereqCheck.met) {
  filtered.push(candidate);
}
```

**Impact**: Feats are filtered for suggestion without going through AbilityEngine evaluation. If AbilityEngine.evaluateAcquisition() would return different results, suggestions become unreliable.

**Fix Approach**: Replace with `AbilityEngine.canAcquire(actor, candidate)` or `AbilityEngine.evaluateAcquisition()`.

---

### VIOLATION 2: CandidatePoolBuilder._filterForceOptionTechniques() — Direct PrerequisiteChecker call
**File**: `scripts/engine/suggestion/CandidatePoolBuilder.js`
**Line**: 183
**Severity**: HIGH (blocks qualified force techniques)

```javascript
// VIOLATION: Direct call to PrerequisiteChecker in force technique filtering
const prereqCheck = PrerequisiteChecker.checkFeatPrerequisites(actor, candidate);
if (prereqCheck.met) {
  filtered.push(candidate);
}
```

**Impact**: Same as Violation 1 — force techniques bypass AbilityEngine.

**Fix Approach**: Replace with AbilityEngine call.

---

### VIOLATION 3: AttributeIncreaseScorer._findUnlockedFeats() — Direct current-state check
**File**: `scripts/engine/suggestion/AttributeIncreaseScorer.js`
**Line**: 265
**Severity**: HIGH (incorrect scoring)

```javascript
// VIOLATION: Direct check of current actor state, bypassing AbilityEngine
const currentCheck = PrerequisiteChecker.checkFeatPrerequisites(actor, feat);
if (currentCheck.met) continue; // Already qualifies
```

**Impact**: Scorer evaluates current eligibility without AbilityEngine. If AbilityEngine rules differ, scoring becomes incorrect.

**Fix Approach**: Replace with `AbilityEngine.evaluateAcquisition()`.

---

### VIOLATION 4: AttributeIncreaseScorer._findUnlockedFeats() — Direct hypothetical check
**File**: `scripts/engine/suggestion/AttributeIncreaseScorer.js`
**Line**: 269
**Severity**: HIGH (incorrect hypothetical projection)

```javascript
// VIOLATION: Direct check of hypothetical actor state, bypassing AbilityEngine
const hypotheticalCheck = PrerequisiteChecker.checkFeatPrerequisites(hypotheticalActor, feat);
if (hypotheticalCheck.met) {
  unlockedFeats.push(feat.name);
}
```

**Impact**: Scorer projects future eligibility without AbilityEngine. Hypothetical evaluation becomes unreliable.

**Fix Approach**: Replace with `AbilityEngine.evaluateAcquisition(hypotheticalActor, feat)`.

---

### VIOLATION 5: TemplateEngine.doAction() — skipPrerequisites bypass (class confirmation)
**File**: `scripts/engine/progression/engine/template-engine.js`
**Line**: 73
**Severity**: CRITICAL (allows stale/invalid templates to apply)

```javascript
// VIOLATION: Bypass of prerequisite checking via skipPrerequisites flag
await engine.doAction('confirmClass', {
  classId: tpl.class,
  skipPrerequisites: true // Templates are pre-validated ← DANGEROUS ASSUMPTION
});
```

**Impact**: Templates skip prerequisite validation on class application. If template is stale or template validation failed silently, an invalid class is applied without error.

**Fix Approach**: Remove `skipPrerequisites: true` flag. Let validation run normally. If validation fails, handle explicitly (not silently).

---

### VIOLATION 6: TemplateEngine.doAction() — skipPrerequisites bypass (class level application)
**File**: `scripts/engine/progression/engine/template-engine.js`
**Line**: 86
**Severity**: CRITICAL (allows invalid multi-level class sequences)

```javascript
// VIOLATION: Bypass for multi-level class application
await engine.doAction('confirmClass', {
  classId: classLevel.class,
  skipPrerequisites: true
});
```

**Impact**: Each class level in a multi-level template skips validation. Invalid sequences can apply.

**Fix Approach**: Remove `skipPrerequisites: true`. Let each level validate independently.

---

## 2. Approved Usages (Not Violations)

The following files call PrerequisiteChecker directly but are **APPROVED** and need no changes:

### APPROVED 1: AbilityEngine — Authority Layer
**File**: `scripts/engine/abilities/AbilityEngine.js`
**Lines**: 63, 65, 67, 70, 73, 75
**Reason**: This IS the authority layer. It is the single entry point for legality evaluation. Internal delegation to PrerequisiteChecker is correct architecture.

### APPROVED 2: ForecastEngine — Hypothetical Projection
**File**: `scripts/engine/progression/forecast/forecast-engine.js`
**Line**: 68
**Reason**: Forecasting evaluates hypothetical character states for preview purposes, not live progression. Safe to call PrerequisiteChecker directly for read-only scenarios.

### APPROVED 3: Internal PrerequisiteChecker Self-Calls
**File**: `scripts/data/prerequisite-checker.js`
**Lines**: 244, 246, 248, 1461, 1475, 1566, 1568, 1570, 1573, 1575
**Reason**: PrerequisiteChecker calls itself internally (recursive delegation). This is internal implementation, not a violation.

### APPROVED 4: Utility/Export Functions
**Files**: `scripts/apps/levelup/levelup-validation.js`, `scripts/data/talent-normalizer.js`
**Reason**: These are utility functions, not runtime progression paths. Safe to leave as-is.

---

## 3. Non-Violations (Different Class)

### NOT A VIOLATION: force-progression.js
**File**: `scripts/engine/progression/engine/force-progression.js`
**Line**: 147
**Reason**: Uses `PrerequisiteValidator` (different class), not `PrerequisiteChecker`. No action needed.

---

## 4. Remediation Plan

### Step 1: Fix CandidatePoolBuilder violations
- [ ] Add import: `import { AbilityEngine } from ".../abilities/AbilityEngine.js"`
- [ ] Replace line 130: `if (prereqCheck.met)` → `if (AbilityEngine.canAcquire(actor, candidate))`
- [ ] Replace line 183: Same change

### Step 2: Fix AttributeIncreaseScorer violations
- [ ] Add import: `import { AbilityEngine } from ".../abilities/AbilityEngine.js"`
- [ ] Replace line 265: Change to use `AbilityEngine.evaluateAcquisition(actor, feat)`
- [ ] Replace line 269: Change to use `AbilityEngine.evaluateAcquisition(hypotheticalActor, feat)`

### Step 3: Fix TemplateEngine violations
- [ ] Replace line 73: Remove `skipPrerequisites: true` flag
- [ ] Replace line 86: Remove `skipPrerequisites: true` flag
- [ ] Verify that doAction() validates correctly without the flag
- [ ] Add error handling for validation failures (explicit, not silent)

---

## 5. Validation Strategy

After fixes are applied, the following must be true:

1. **CandidatePoolBuilder output** — All feats/techniques in filtered pool are candidates that AbilityEngine.canAcquire() returns true for
2. **AttributeIncreaseScorer output** — Current/hypothetical legality matches AbilityEngine evaluation
3. **TemplateEngine output** — Invalid classes fail loudly, not silently; error is surfaced to user/log
4. **No PrerequisiteChecker direct calls** — grep for `PrerequisiteChecker.check` outside AbilityEngine, ForecastEngine, PrerequisiteChecker itself, and utility functions should return zero results

---

## 6. Files to Change (Summary)

| File | Lines | Type | Status |
|------|-------|------|--------|
| CandidatePoolBuilder.js | 130, 183 | DIRECT CALL | PENDING |
| AttributeIncreaseScorer.js | 265, 269 | DIRECT CALL | PENDING |
| template-engine.js | 73, 86 | BYPASS FLAG | PENDING |

---

## 7. Next Phase: Phase 3

After Phase 2 is complete and tested:

- **Phase 3**: Scenario & Reconciliation Proof — Test that suggestions, scoring, and templates all work correctly with the new authority routing
- **Phase 4**: Rollout Truthfulness — Operator-facing documentation of what is guaranteed at each step
- **Phase 5**: Advisory Hardening — Prevent advisory-only architectural violations from becoming critical security issues

---

**END OF PHASE 2 AUDIT**
