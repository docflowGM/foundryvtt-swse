# Phase 1: Core Authority Consolidation — Progress Report

**Status:** In Progress (Foundation Layer Complete, Step Normalization In Progress)

**Completion Target:** All canonical state, finalizer, and step adaptation infrastructure in place

---

## Completed Work

### ✅ Work Package A: Create Canonical Progression Session State

**Deliverable:** Single authoritative progression session object replacing committedSelections + buildIntent + stepData

**What Was Done:**

1. **ProgressionSession Class** (`progression-session.js`)
   - Canonical draftSelections object with semantic keys (species, class, background, attributes, skills, feats, talents, languages, forcePowers, forceTechniques, forceSecrets, starshipManeuvers, survey, droid)
   - Immutable actor snapshot prevents accidental reads from live actor during draft
   - Derived entitlements (computed on demand, not hand-maintained)
   - Progression tracking (activeSteps, completedSteps, invalidatedSteps)
   - Schema validation on commit
   - Observer/watcher API for backward compat with buildIntent

2. **Wired into ProgressionShell** (`progression-shell.js`)
   - Constructor creates `this.progressionSession = new ProgressionSession({actor, mode, subtype})`
   - Added `_getProgressionSubtype()` method for subclass override
   - Marked old state as deprecated but functional (committedSelections, buildIntent, stepData)

3. **Demoted BuildIntent** (`build-intent.js`)
   - Now a thin wrapper that delegates to progressionSession
   - `commitSelection()` writes to progressionSession + backward-compat update to committedSelections
   - `getSelection()`, `getAllSelections()`, `observeSelection()`, `reset()` all delegate
   - `toCharacterData()` delegates
   - Marked as deprecated, scheduled for Phase 2 removal
   - Maintains backward compat so existing watchers/observers continue to work

**Status:** ✅ Complete and wired in

**Backward Compat:** Maintained — old code continues to work via delegation

---

### ✅ Work Package B: Standardize Step Output Contracts

**Deliverable:** Helper infrastructure for normalizing step outputs

**What Was Done:**

1. **Step Normalizers** (`step-normalizers.js`)
   - Functions for each major step: normalizeSpecies(), normalizeClass(), normalizeBackground(), normalizeAttributes(), normalizeSkills(), normalizeFeats(), normalizeTalents(), normalizeLanguages(), normalizeSurvey(), normalizeDroid()
   - Each takes step-specific raw data and outputs canonical schema object
   - Handles type conversions (strength→str), schema validation, error handling
   - Provides a safe, validated path for steps to transition to normalized commits

2. **Commit Helper on Base Class** (`step-plugin-base.js`)
   - Added `_commitNormalized(shell, selectionKey, value)` method
   - Steps use this to commit normalized selections
   - Writes to progressionSession as primary store
   - Updates buildIntent and committedSelections for backward compat
   - Single consistent API for all steps during migration

**Status:** ✅ Complete and ready for steps to use

**Next Step:** Update major steps to use normalizers + _commitNormalized()

---

### ✅ Work Package C1: Wire progressionSession into Finalizer

**Deliverable:** Finalizer reads from progressionSession with fallback to committedSelections

**What Was Done:**

1. **Updated _validateReadiness()** (`progression-finalizer.js`)
   - Checks `sessionState.progressionSession` first
   - Falls back to committedSelections if not available
   - Unblocks droid build, chargen completion checks working with both sources

2. **Updated _compileMutationPlan()** (`progression-finalizer.js`)
   - Reads species, class, background, attributes, skills, languages from progressionSession.draftSelections when available
   - Falls back to committedSelections/stepData for backward compat
   - Maintains existing mutation compilation logic

3. **Added _buildSelectionsFromSession()** helper
   - Temporary adapter to convert progressionSession.draftSelections to committedSelections-compatible Map
   - Enables gradual migration without breaking existing code

**Status:** ✅ Complete and functional

**Backward Compat:** Maintained via fallback chains

---

## In Progress

### 🔄 Work Package C2: Update Summary to Use progressionSession

**Status:** Not started (planned next)

**What's Needed:**
- Update `summary-step.js` to read from progressionSession.draftSelections
- Remove shape-guessing (attribute vs attributes)
- Unify with finalizer's data consumption

---

## Pending Work

### ⏳ Step Normalization (Work Package B Continuation)

**Scope:** Update major steps to commit normalized data

**Steps to Update:**
1. `species-step.js` — commit normalized species with normalizeSpecies()
2. `class-step.js` — commit normalized class with normalizeClass()
3. `background-step.js` — commit normalized background with normalizeBackground()
4. `attribute-step.js` — commit normalized attributes with normalizeAttributes()
5. `skills-step.js` — commit normalized skills with normalizeSkills()
6. `feat-step.js` — commit normalized feats with normalizeFeats()
7. `talent-step.js` — commit normalized talents with normalizeTalents()
8. `language-step.js` — commit normalized languages with normalizeLanguages()

**Current State:** Most steps still commit to committedSelections with ad-hoc payloads

**Approach:** Each step can be updated independently:
1. Import normalizer function
2. Replace old `shell.committedSelections.set()` calls with `this._commitNormalized(shell, key, normalizedValue)`
3. Use normalizer to validate + transform data before committing

---

### ⏳ Work Package D: Legality Authority (AbilityEngine)

**Scope:** Make AbilityEngine the only legality gate

**What's Needed:**
1. Reroute talent/force-secret/force-power steps through AbilityEngine
2. Remove direct PrerequisiteChecker imports in production code
3. Consolidate prestige/class legality checks
4. Add progression-to-prereq adapter (candidate resolution)

**Current State:**
- Feat step: ✅ Already uses AbilityEngine
- Talent/Force steps: ⚠️ Still use PrerequisiteChecker directly
- Suggestion engines: ❓ May have duplicate prestige logic

---

### ⏳ Work Package G: Demote Suggestion Engines

**Scope:** Audit and lock suggestion systems to advisory-only mode

**What's Needed:**
1. Audit suggestion modules for manual prestige checking
2. Replace any local legality logic with AbilityEngine calls
3. Lock suggestion input/output contracts

**Current State:** Not yet audited

---

## Architectural Status

### ✅ Authority Boundaries (Locked)

| Layer | Authority | Status |
|-------|-----------|--------|
| Progression State | `progressionSession.draftSelections` | ✅ Established |
| Rules/Legality | AbilityEngine | ⏳ Partial (feats only) |
| Suggestion | Advisory only | ⏳ Needs locking |
| Mutation | ActorEngine | ✅ Via finalizer |

### ✅ State Model

| Concept | Location | Status |
|---------|----------|--------|
| Immutable actor snapshot | `progressionSession.actorSnapshot` | ✅ |
| Normalized draft selections | `progressionSession.draftSelections` | ✅ |
| Mode/subtype | `progressionSession.mode/subtype` | ✅ |
| Progression tracking | `progressionSession.activeSteps/completedSteps/invalidatedSteps` | ✅ |
| Derived entitlements | `progressionSession.derivedEntitlements` | ✅ |

### ⏳ Step Contracts

| Step | Old Format | Normalized Format | Status |
|------|-----------|-------------------|--------|
| species | ad-hoc | `{id, name, grants, metadata}` | 🔄 Normalizer ready |
| class | ad-hoc | `{id, name, grants, metadata}` | 🔄 Normalizer ready |
| background | ad-hoc | `{id, name, grants, metadata}` | 🔄 Normalizer ready |
| attributes | ad-hoc | `{values, increases, metadata}` | 🔄 Normalizer ready |
| skills | ad-hoc | `{trained, source, metadata}` | 🔄 Normalizer ready |
| feats | ad-hoc | `[{id, source}, ...]` | 🔄 Normalizer ready |
| talents | ad-hoc | `[{id, treeId, source}, ...]` | 🔄 Normalizer ready |
| languages | ad-hoc | `[{id, source}, ...]` | 🔄 Normalizer ready |

---

## Known Issues and Blockers

### Minor Issues

1. **Summary still reads from committedSelections** (Work Package C2)
   - Not blocking Phase 1 completion, but should be updated for parity with finalizer

2. **Steps not yet normalized** (Work Package B continuation)
   - Can proceed incrementally — infrastructure is ready
   - Normalizers are available and tested
   - Steps can migrate one at a time

### Non-Issues (Acceptable for Phase 1)

- buildIntent still lives (marked deprecated, will remove Phase 2)
- committedSelections still maintained (for backward compat)
- stepData still maintained (for backward compat)
- PrerequisiteChecker still directly imported by some steps (will consolidate Phase 1 part 2)

---

## Remaining Phase 1 Work (Priority Order)

### HIGH PRIORITY (Blocks later phases)

1. **Update Summary Step** (Work Package C2)
   - Read from progressionSession.draftSelections
   - Remove shape-guessing
   - Ensure parity with finalizer

2. **Update Major Steps to Normalized Commits** (Work Package B continuation)
   - Start with class-step (most critical for later phases)
   - Then species, background, attributes, skills
   - Then feats, talents, languages
   - Each can be a small, focused commit

3. **Reroute Legality to AbilityEngine** (Work Package D)
   - Talent-step, force-secret-step, force-power-step
   - Remove duplicate prestige logic
   - Fix progression-to-prereq adapter

### MEDIUM PRIORITY (Nice to have for Phase 1)

4. **Audit and Lock Suggestion Engines** (Work Package G)
   - Ensure no local rules logic
   - Confirm advisory-only behavior
   - Document suggestion input contracts

---

## Files Modified Summary

### Core Infrastructure
- `scripts/apps/progression-framework/shell/progression-session.js` — NEW
- `scripts/apps/progression-framework/shell/progression-shell.js` — Modified (added progressionSession, added _getProgressionSubtype)
- `scripts/apps/progression-framework/shell/build-intent.js` — Modified (demoted to delegating wrapper)
- `scripts/apps/progression-framework/shell/progression-finalizer.js` — Modified (reads from progressionSession, added adapter)

### Step Infrastructure
- `scripts/apps/progression-framework/steps/step-plugin-base.js` — Modified (added _commitNormalized helper)
- `scripts/apps/progression-framework/steps/step-normalizers.js` — NEW (normalizer functions)

### Documentation
- `PHASE-1-AUDIT.md` — Current state assessment
- `PHASE-1-ARCHITECTURAL-DECISIONS.md` — Locked decisions and design
- `PHASE-1-PROGRESS.md` — This file

---

## How to Continue Phase 1

### Option A: Incremental Step Normalization (Recommended)

Each step update is a small, focused commit:

```
For each major step (class, species, background, attributes, skills, feats, talents, languages):
  1. Import normalizer: import { normalizeSpecies } from './step-normalizers.js'
  2. Find onItemCommitted() or similar commit method
  3. Replace: shell.committedSelections.set('species', raw)
     With:    this._commitNormalized(shell, 'species', normalizeSpecies(raw))
  4. Test
  5. Commit with message "Phase 1: Normalize [Step] step commits"
```

### Option B: Focus on AbilityEngine Authority

If step normalization feels incremental, focus next on:
1. Reroute talent/force steps to AbilityEngine
2. Add progression-to-prereq candidate adapter
3. Remove duplicate prestige checking

This is higher-impact architectural work.

### Option C: Balance Both

Interleave:
- One step normalization (quick win, parity with finalizer)
- One AbilityEngine reroute (architectural)
- One step normalization
- And so on...

---

## Success Criteria for Phase 1 Completion

✅ Canonical progression session state exists and is wired in
✅ buildIntent demoted to derived view
✅ Step normalizers and commit helpers ready
✅ Finalizer reads from progressionSession
⏳ Summary reads from progressionSession
⏳ Major steps commit normalized data
⏳ AbilityEngine is the sole legality authority
⏳ Suggestion engines are advisory-only

---

## Next Steps for Implementer

1. **Update summary-step.js** (Work Package C2, ~1-2 hour)
   - Quick, high-impact parity work
   - Unblocks testing and validation

2. **Update class-step.js** (Work Package B, ~1-2 hour)
   - Most critical step for downstream dependencies
   - Sets pattern for other steps

3. **Update remaining major steps** (Work Package B, ~6-8 hours total)
   - Each ~30-40 minutes once pattern is established
   - Can be parallelized or done incrementally

4. **Reroute talent/force steps to AbilityEngine** (Work Package D, ~2-3 hours)
   - Architectural impact, unlocks forecast phase later
   - Requires careful prerequisite checking

5. **Audit suggestion engines** (Work Package G, ~2-3 hours)
   - Ensure no rule duplication
   - Document input/output contracts

---

## Token Budget Estimate for Remaining Work

- Summary refactor: ~500-1000 tokens
- Each step normalization: ~300-500 tokens per step × 8 = 2400-4000 tokens
- AbilityEngine reroute: ~1500-2000 tokens
- Suggestion audit: ~800-1200 tokens
- Final handoff report: ~1000-1500 tokens

**Total estimate:** ~8000-12000 tokens remaining (including this progress report)

---

## Key Takeaways

**What's solid:**
- Foundation infrastructure is complete and tested
- Canonical state model is established and working
- Step normalizers are ready for use
- Finalizer already reads from progressionSession
- Backward compatibility is maintained

**What's in flight:**
- Summary step needs updating (quick)
- Major steps need normalization (mechanical, repeatable)
- Legality authority needs consolidation (architectural)

**What's locked:**
- Authority boundaries are defined
- State model is canonical
- Fallback chains ensure migration safety

Phase 1 is well-positioned for completion. The remaining work is largely mechanical (step normalization) with some focused architectural work (AbilityEngine, suggestion demoting).
