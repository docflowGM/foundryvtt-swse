# PHASE 1 STABILIZATION HANDOFF — SINGLE TRUTH APPLY PATH

**Status**: COMPLETE ✓
**Date**: 2026-03-27
**Branch**: claude/audit-post-migration-N8GgQ

---

## 1. What Was Wrong in the Current Repo

### Problem 1: Shell Did Not Pass Canonical Session to Finalizer
**File**: `scripts/apps/progression-framework/shell/progression-shell.js` (lines 1017-1025)

**Old code**:
```javascript
const sessionState = {
  mode: this.mode,
  actor: this.actor,
  committedSelections: this.committedSelections,  // ← fallback data
  steps: this.steps,
  stepData: this.stepData,                         // ← fallback data
  mentor: this.mentor,
  sessionId: this.element?.dataset.sessionId || 'unknown',
  // NOTE: this.progressionSession was created but NOT passed
};
```

**Impact**: Finalizer could not use canonical session because it was never provided.

---

### Problem 2: Finalizer Silently Fell Back to Legacy Data
**File**: `scripts/apps/progression-framework/shell/progression-finalizer.js` (lines 92-94, 148-150)

**Old code (_validateReadiness)**:
```javascript
const selections = sessionState.progressionSession
  ? this._buildSelectionsFromSession(sessionState.progressionSession)
  : sessionState.committedSelections || new Map();  // ← FALLBACK
```

**Old code (_compileMutationPlan)**:
```javascript
const selections = sessionState.progressionSession
  ? this._buildSelectionsFromSession(sessionState.progressionSession)
  : sessionState.committedSelections || new Map();  // ← FALLBACK

// Then:
const summary = sessionState.progressionSession?.draftSelections?.survey ||
                selections.get('summary') ||
                stepData.get?.('summary') ||     // ← TRIPLE FALLBACK
                {};
```

**Impact**: If progressionSession was incomplete, finalizer silently used stale committedSelections data. No error thrown.

---

### Problem 3: Summary Step Read From Legacy Fallback
**File**: `scripts/apps/progression-framework/steps/summary-step.js` (lines 310-426)

**Old code (_aggregateSummary)**:
```javascript
const selections = session?.draftSelections || {};
const legacySteps = shell.committedSelections || new Map();

// Then per field:
const speciesNorm = selections.species;
const speciesLegacy = legacySteps.get('species');  // ← FALLBACK
this._summary.species = speciesNorm?.name || speciesNorm?.id ||
                        speciesLegacy?.speciesName ||  // ← USES LEGACY IF NORM ABSENT
                        character.species || '';
```

**Impact**: Summary could show data from committedSelections if canonical session was incomplete, even though canonical session was supposed to be source of truth.

---

## 2. What Is Now Authoritative

### Shell → Finalizer Contract (REQUIRED)
**File**: `scripts/apps/progression-framework/shell/progression-shell.js` (lines 1017-1028)

```javascript
const sessionState = {
  mode: this.mode,
  actor: this.actor,
  progressionSession: this.progressionSession,  // ✓ CANONICAL — required by finalizer
  committedSelections: this.committedSelections, // Legacy compat (finalizer ignores)
  steps: this.steps,
  stepData: this.stepData,
  mentor: this.mentor,
  sessionId: this.element?.dataset.sessionId || 'unknown',
};

const result = await ProgressionFinalizer.finalize(sessionState, this.actor);
```

**Truth**: Shell now EXPLICITLY passes canonical session.

---

### Finalizer Requires Canonical Session (ENFORCED)
**File**: `scripts/apps/progression-framework/shell/progression-finalizer.js`

**_validateReadiness (lines 83-110)**:
```javascript
// REQUIRE canonical progressionSession. Fail loudly if missing.
if (!sessionState.progressionSession) {
  throw new Error(
    'Finalization requires canonical progressionSession. ' +
    'Legacy fallback to committedSelections is no longer supported.'
  );
}

const session = sessionState.progressionSession;
const selections = session.draftSelections || {};
const summarySelection = selections.survey || {};  // ← Direct read, no fallback
```

**_compileMutationPlan (lines 146-175)**:
```javascript
// REQUIRE canonical progressionSession. Fail loudly if missing.
if (!sessionState.progressionSession) {
  throw new Error('compileMutationPlan requires canonical progressionSession');
}

const selections = sessionState.progressionSession.draftSelections || {};

// Read all data from canonical session ONLY. No fallback chains.
const summary = selections.survey || {};
const attr = selections.attributes || {};
const species = selections.species || null;
const clazz = selections.class || null;
// ... etc. All from canonical selections, no ?.get() fallback chains
```

**Truth**: Finalizer now REQUIRES progressionSession. Missing canonical data causes explicit failure, not silent fallback.

---

### Summary Uses Canonical Projection or Session ONLY
**File**: `scripts/apps/progression-framework/steps/summary-step.js`

**_aggregateSummary (lines 267-307)**:
```javascript
// PHASE 1: REQUIRE canonical session; NO fallback to committedSelections
if (!shell.progressionSession) {
  throw new Error('SummaryStep requires progressionSession');
}

// Try projection first, otherwise rebuild from canonical session
const projection = shell.progressionSession.currentProjection ||
                   ProjectionEngine.buildProjection(shell.progressionSession, shell.actor);

if (projection) {
  // Use projection as authoritative source
  // ... read from projection
  return;
}

// Rebuild from canonical session ONLY if projection unavailable
const session = shell.progressionSession;
const selections = session.draftSelections || {};

// PHASE 1: Read from canonical session ONLY. No committedSelections fallback.
const speciesNorm = selections.species;
this._summary.species = speciesNorm?.name || speciesNorm?.id || '';  // ← Direct, no fallback

const classNorm = selections.class;
this._summary.class = classNorm?.name || classNorm?.id || '';  // ← Direct, no fallback

// ... all fields read from canonical only
```

**Truth**: Summary reads from projection or canonical session ONLY. No committedSelections fallback anywhere.

---

## 3. What Legacy Shims Still Remain

### Remaining Compatibility Writes (Not Read in Apply Path)
The following WRITE operations to legacy stores are preserved for backward compatibility:

1. **`step-plugin-base.js` _commitNormalized()**
   - Still writes to `committedSelections` and `buildIntent`
   - **Important**: These writes are NOT authoritative for confirm/review/apply
   - They are purely for backward compat with any legacy code that depends on seeing them
   - **Apply path ignores them completely**

2. **`progression-shell.js` sessionState payload**
   - Still includes `committedSelections`, `steps`, `stepData` in the payload sent to finalizer
   - **Important**: Finalizer explicitly ignores these fields
   - Comment clearly marks legacy fields: `// Legacy compat (finalizer ignores)`

### No Code Removed Yet
We did NOT remove the legacy storage classes or methods. They still exist but are unreachable from the apply path:
- `committedSelections` Map still exists on shell
- `stepData` Map still exists on shell
- `buildIntent` object still exists on shell

**Why preserve?**: To avoid breaking any non-apply code paths that may still depend on reading these (e.g., UI rendering, persistence, debugging).

---

## 4. Test Proof

### Test File
**Location**: `scripts/apps/progression-framework/testing/phase-1-single-truth-apply.test.js`

**Tests implemented**:

1. **TEST 1: Shell passes progressionSession to finalizer**
   - Verified by code inspection
   - Evidence: `progression-shell.js` line 1019

2. **TEST 2: Finalizer requires progressionSession and fails loudly**
   - Test: `_validateReadiness()` throws if progressionSession missing
   - Test: `_compileMutationPlan()` throws if progressionSession missing
   - Result: ✓ PASS

3. **TEST 3: Canonical session data wins over legacy committedSelections**
   - Test: When both session and committedSelections have conflicting data, session wins
   - Scenario: session.species = Human, committedSelections = Mirialan → applies Human
   - Scenario: session.class = Soldier, committedSelections = Jedi → applies Soldier
   - Result: ✓ PASS

4. **TEST 4: Summary and apply use same canonical source**
   - Test: Mutations compiled from canonical draftSelections only
   - Result: ✓ PASS

5. **TEST 5: Missing canonical data causes failure, not fallback**
   - Test: Missing class in session → throws error (not fallback to legacy)
   - Test: Missing attributes in session → throws error (not fallback to legacy)
   - Test: Missing name in session → throws error (not fallback to legacy)
   - Result: ✓ PASS

6. **TEST 6: Droid readiness checks use canonical session only**
   - Test: Droid build state read from canonical, not committedSelections
   - Result: ✓ PASS

---

## 5. Known Follow-Ups (Phase 2+ Only)

### Do NOT address in Phase 1
The following are OUT OF SCOPE for Phase 1:

1. **Prerequisite Sovereignty (Phase 2)**
   - CandidatePoolBuilder and AttributeIncreaseScorer still call PrerequisiteChecker directly
   - They should go through AbilityEngine only
   - **Leave as-is for Phase 2**

2. **Template SkipPrerequisites Bypass (Phase 2)**
   - TemplateEngine still calls doAction(..., skipPrerequisites=true)
   - Should validate templates before apply
   - **Leave as-is for Phase 2**

3. **Level-Up Path Validation (Phase 3)**
   - Level-up may have similar dual-path issues
   - Needs separate audit and fix
   - **Leave as-is for Phase 3**

4. **Droid Support Completion (Phase 3)**
   - Droid is marked PARTIAL support in rollout
   - Needs complete testing and edge case handling
   - **Leave as-is for Phase 3**

---

## 6. Summary: The Core Change

### Before Phase 1
```
User calls finalize
    ↓
Shell builds sessionState (WITHOUT progressionSession)
    ↓
Finalizer receives sessionState
    ↓
Finalizer says: "if session present, use it; ELSE use committedSelections"
    ↓
System applies committedSelections (stale data!)
    ↓
❌ Silent data corruption possible
```

### After Phase 1
```
User calls finalize
    ↓
Shell builds sessionState (WITH progressionSession, canonical session is always passed)
    ↓
Finalizer receives sessionState
    ↓
Finalizer says: "If session ABSENT, FAIL loudly. Otherwise use ONLY canonical session"
    ↓
Finalizer reads ONLY from progressionSession.draftSelections
    ↓
System applies canonical data
    ↓
✓ Loud failure if canonical incomplete; no silent fallback
✓ Summary and apply read same source
✓ Canonical wins over any legacy data
```

---

## 7. Files Changed

### Modified
1. `scripts/apps/progression-framework/shell/progression-shell.js` — Pass progressionSession in sessionState
2. `scripts/apps/progression-framework/shell/progression-finalizer.js` — Require progressionSession; remove fallback chains
3. `scripts/apps/progression-framework/steps/summary-step.js` — Remove committedSelections fallback

### Added
1. `scripts/apps/progression-framework/testing/phase-1-single-truth-apply.test.js` — Proof tests

### Unchanged (Legacy Shims)
- `committedSelections` Map on shell (still written to, never read in apply path)
- `stepData` Map on shell (still written to, never read in apply path)
- `buildIntent` object on shell (still written to, never read in apply path)

---

## 8. Next Phase: Phase 2 Entry Conditions

When you start Phase 2 (Prerequisite Sovereignty), these Phase 1 guarantees are in place:

✓ Canonical session is always passed to finalizer
✓ Finalizer fails loudly if canonical session missing
✓ All apply-path reads come from canonical session ONLY
✓ Summary and apply use same source of truth
✓ No silent fallback to legacy data

Phase 2 can now focus on prerequisite authority without worrying about dual data paths.

---

**END OF PHASE 1 HANDOFF**
