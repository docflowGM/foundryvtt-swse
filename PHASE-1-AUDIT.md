# Phase 1 Audit Report — Current State Carriers and Dependencies

## Executive Summary

**Competing authorities found:** The system currently maintains 3 semi-independent state authorities:
1. `shell.committedSelections` — Map keyed by step-id or semantic key, stores arbitrary payloads
2. `shell.buildIntent` — Observable build state with normalized semantic keys
3. `shell.stepData` — Per-step state blobs, some read by finalizer as fallback

**Rules authority fragmentation:**
- `AbilityEngine` is the canonical rules entry point but is only used by feat/talent/force-secret steps
- Prestige/class legality is not consistently routed through a single authority
- Suggestion engines may have local prestige-checking logic

**Summary/finalizer shape guessing:**
- Finalizer reads from `committedSelections`, falls back to `stepData`, has to guess at old payload shapes
- Summary aggregates by reading `committedSelections` and makes assumptions about field names
- No one canonical schema for step outputs

---

## Work Package A Audit: Current State Carriers

### A1.1: `shell.committedSelections` Usage

**Location:** `scripts/apps/progression-framework/shell/progression-shell.js` line 205

**Type:** `Map<string, any>`

**Current usage pattern:**
```javascript
shell.committedSelections.set('class', classData);
shell.committedSelections.set('species', speciesData);
shell.committedSelections.set('skills', skillsData);
shell.committedSelections.set('l1-survey', surveyData);
shell.committedSelections.set('droid-builder', droidData);
```

**Issues:**
- Mixed keys: some semantic ('class', 'species'), some step-id based ('droid-builder', 'l1-survey')
- No schema validation — each step stores its own shape
- Finalizer has to handle multiple shape variants per field (e.g., attribute vs attributes)
- Used as primary source of truth for finalizer and summary

**Consumers:**
1. `summary-step.js` — aggregates all selections
2. `progression-finalizer.js` — primary source for mutation compilation
3. `conditional-step-resolver.js` — checks for deferred droid builds
4. `global-validator.js` — validation context

---

### A1.2: `shell.buildIntent` Usage

**Location:** `scripts/apps/progression-framework/shell/build-intent.js`

**Type:** Observable object with reactive proxy

**Current structure:**
```javascript
{
  species: null,
  class: null,
  background: null,
  feats: [],
  talents: [],
  skills: {},
  languages: [],
  attributes: {},
  multiclass: null,
  forcePowers: [],
}
```

**Current usage pattern:**
```javascript
shell.buildIntent.commitSelection('attribute-step', 'attributes', {...baseScores});
shell.buildIntent.commitSelection('skills-step', 'skills', trainedList);
shell.buildIntent.toCharacterData(); // For suggestion context
```

**Issues:**
- Partially implements normalized semantic keys
- Updated by some steps (`attribute-step`, `skills-step`, `feat-step`) but not all
- Still duplicates `committedSelections` via line 122-125 in `build-intent.js`
- Not primary source for finalizer (finalizer reads committedSelections)

**Consumers:**
1. Watchers registered by various UI subsystems
2. `toCharacterData()` called by some steps for suggestion context
3. Render triggers on any change

---

### A1.3: `shell.stepData` Usage

**Location:** `scripts/apps/progression-framework/shell/progression-shell.js` line 203

**Type:** `Map<stepId, step-specific state>`

**Current usage:**
- Finalizer uses as fallback: `selections.get('summary') || stepData.get?.('summary')`
- Step-local state management during UI interactions
- Not consistently used across all steps

**Issues:**
- Finalizer has to check both committedSelections and stepData
- No normalization guarantee — each step can store arbitrary shapes

---

### A1.4: Direct Actor Reads as Draft State Stand-ins

**Locations:**
- `summary-step.js` line 61: `const character = shell.actor?.system || {}`
- `progression-finalizer.js` line 126-129: Inferring required fields from actor during validation

**Issues:**
- Uses live actor state to infer pending draft state
- Dangerous during draft session — can pick up stale or in-progress data
- Doesn't distinguish between committed and draft selections

---

## Summary/Finalizer Audit

### Current Summary Aggregation

**File:** `scripts/apps/progression-framework/steps/summary-step.js` lines 56-180

**Pattern:**
```javascript
async onStepEnter(shell) {
  this._aggregateSummary(shell);  // Reads from shell.committedSelections
  const character = shell.actor?.system || {};  // Fallback to actor
}
```

**Issues:**
- Aggregation logic coupled to committedSelections shape
- Has to handle multiple variants (attribute vs attributes, selectedFeats vs feats array)
- Reads from actor as fallback for existing data
- No single source of truth for what "current state" means

---

### Current Finalizer Compilation

**File:** `scripts/apps/progression-framework/shell/progression-finalizer.js` lines 143-190

**Pattern:**
```javascript
const selections = sessionState.committedSelections || new Map();
const stepData = sessionState.stepData || new Map();
const summary = selections.get('summary') || stepData.get?.('summary') || {};
const attr = selections.get('attribute') || selections.get('attributes') || stepData.get?.('attribute') || {};
const species = selections.get('species') || stepData.get?.('species') || null;
```

**Issues:**
- Multiple fallback chains for each field
- Has to normalize attribute key names (strength→str, etc.)
- Guesses at old payload shapes
- Not parity with what summary sees

---

## Rules Authority Audit

### Current AbilityEngine Usage

**Locations:**
- `feat-step.js` line 166, 357: `AbilityEngine.evaluateAcquisition(actor, feat)`
- `talent-step.js`: Uses PrerequisiteChecker indirectly (via TalentSlotValidator)
- `force-secret-step.js`: Uses PrerequisiteChecker indirectly
- `force-power-step.js`: Uses PrerequisiteChecker indirectly

**Status:** Feat step correctly gates legality through AbilityEngine.

**Issue:** Talent, Force-Secret, Force-Power steps still use PrerequisiteChecker directly.

---

### Prestige/Class Legality Paths

**Locations:**
- `suggestion/` modules may have local prestige checking
- `levelup-helper.js` or similar utilities may perform prestige readiness checks

**Status:** Need to audit suggestion modules for duplicate prestige logic.

---

## Known Issues Summary

| Issue | Location | Severity | Phase 1 Impact |
|-------|----------|----------|----------------|
| committedSelections stores arbitrary shapes | progression-shell.js | HIGH | Blocks normalization |
| buildIntent duplicates committedSelections | build-intent.js | HIGH | Blocks state unification |
| Summary aggregation couples to committedSelections | summary-step.js | HIGH | Blocks normalization |
| Finalizer has multiple fallback chains | progression-finalizer.js | HIGH | Blocks finalization parity |
| Actor reads used as draft state | summary-step.js | MEDIUM | Dangerous during draft |
| Talent/Force steps use PrerequisiteChecker directly | talent/force-*.js | MEDIUM | Blocks AbilityEngine authority |
| Prestige legality may be duplicated | suggestion/* | MEDIUM | Blocks rules authority |

---

## Next Steps

1. **Propose canonical progression session shape** (before any code changes)
2. **Normalize highest-risk step outputs** in order: class, species, background, attributes, skills, feats, talents, languages
3. **Demote buildIntent** from co-authority to derived/observer layer
4. **Unify committedSelections** to store only normalized schemas
5. **Rewire summary and finalizer** to read canonical state only
6. **Reroute all legality checks** through AbilityEngine
7. **Remove duplicate prestige paths** in suggestion/validation systems
8. **Add progression-to-prereq adapter** to ensure clean candidate passing

---

## Appendix: File Targets List (Verified)

- ✓ scripts/apps/progression-framework/shell/progression-shell.js
- ✓ scripts/apps/progression-framework/shell/build-intent.js
- ✓ scripts/apps/progression-framework/shell/progression-finalizer.js
- ✓ scripts/apps/progression-framework/steps/summary-step.js
- ✓ scripts/apps/progression-framework/steps/feat-step.js
- ✓ scripts/apps/progression-framework/steps/talent-step.js
- ✓ scripts/apps/progression-framework/steps/force-secret-step.js
- ✓ scripts/apps/progression-framework/steps/force-power-step.js
- ? scripts/engine/suggestion/* (needs audit for prestige logic)
- ? scripts/engine/abilities/AbilityEngine.js (verify usage expectations)
