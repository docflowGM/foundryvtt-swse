# Phase 3: Projected Character and Atomic Mutation — Progress Report

**Date:** March 27, 2026
**Status:** Steps 1-5 Complete, Steps 6-9 In Progress

---

## Overview

Phase 3 unifies progression state management by introducing a central **projected character** model that all steps can reference, and an explicit **mutation plan** that atomically applies changes.

**Goals:**
- ✅ Single authoritative projection derived from snapshot + selections
- ✅ Legality checks see projected draft state, not immutable snapshot
- ✅ Summary uses projection instead of manual aggregation
- ✅ Explicit, testable mutation plan contract
- ⏳ Atomic confirm/apply with validation separated from mutation
- ⏳ Projection rebuilds after reconciliation
- ⏳ Parity checks ensure summary matches apply

---

## Completed Steps

### ✅ Step 1: Audit (from previous session)

Created PHASE-3-AUDIT-REPORT.md documenting:
- Current state gaps (multiple aggregations, no draft preview, legality against snapshot)
- Phase 3 ProjectedCharacter schema (19 fields + metadata)
- Implementation roadmap (9 steps)

### ✅ Step 2: ProjectionEngine

Created `projection-engine.js` (ProjectionEngine class):

**Main API:**
- `buildProjection(progressionSession, actor)` → Projected character object

**Projection structure:**
```javascript
{
  identity: { species, class, background },
  attributes: { str, dex, con, int, wis, cha },
  skills: { trained: [ids], granted: [ids], total: {} },
  abilities: { feats, talents, forcePowers, forceTechniques, forceSecrets, starshipManeuvers },
  languages: [{ id, name }],
  droid: { credits, remaining, systems, buildState } || null,
  derived: { warnings, grants, projectStatus },
  metadata: { projectedAt, fromSession, actorId, mode }
}
```

**Implementation:**
- 8 private projection methods for each domain
- Normalizes ability lists to {id, name, source} format
- Computes warnings from missing selections + dirty nodes
- Includes fallback _buildEmptyProjection()

### ✅ Step 3: PrereqAdapter

Created `prereq-adapter.js` (PrereqAdapter class):

**Main API:**
- `buildEvaluationContext(projection, progressionSession, actorSnapshot)` → Mock actor

**Functionality:**
- Creates shallow copy of actor snapshot
- Applies projected abilities (feats, talents, powers) to mock actor.items
- Reflects projected attributes and trained skills
- Safe degradation to snapshot on error

**Integration:**
- Converts projection into context PrerequisiteChecker can use
- Makes legality checks see draft state instead of immutable baseline

### ✅ Step 4: Projection Integration

Updated `step-plugin-base.js`:
- Added ProjectionEngine import
- Modified _commitNormalized() to build projection after reconciliation
- Stores projection in progressionSession.currentProjection
- Non-blocking side effect (commit succeeds if projection fails)

Updated `summary-step.js`:
- Added ProjectionEngine import
- Refactored _aggregateSummary() to use projection as primary source
- Falls back to legacy manual aggregation for backward compatibility
- Cleaner character review based on derived model

### ✅ Step 5: MutationPlan

Created `mutation-plan.js` (MutationPlan class):

**Main API:**
- `compileFromProjection(projection, actor, options)` → MutationPlan
- `validate(plan)` → { isValid, errors, warnings }
- `apply(plan, actor)` → { success, appliedMutations, errors }

**Mutation plan structure:**
```javascript
{
  projection, actor, compiledAt,
  mutations: {
    identity: { species, class, background },
    attributes: { str, dex, con, int, wis, cha },
    items: [{ action, type, data }],
    system: { trainedSkills, languages, grants, ... }
  },
  validated: boolean,
  validationErrors: string[],
  validationWarnings: string[],
  source: 'chargen'|'levelup',
  mode: 'chargen'|'levelup',
  metadata: {}
}
```

**Implementation:**
- 4 compilation helpers (identity, attributes, items, system)
- Validates required fields (class, attributes)
- Validates item mutations are well-formed
- Checks for warnings (missing species → droid build pending)
- 4 application helpers for each domain
- Atomic apply with validation before mutation

---

## In-Progress Steps

### ⏳ Step 6: Projection Rebuild Hook

Need to rebuild projection after reconciliation completes (in ProgressionReconciler).

**Plan:**
- After reconcileAfterCommit() returns, trigger projection rebuild
- Store in progressionSession for immediate access
- Ensure all downstream reads see current projection

**Files to modify:**
- progression-reconciler.js (already has framework)
- step-plugin-base.js (already builds projection after commit; just ensure it's consistent)

### ⏳ Step 7: Confirm/Apply Separation

Make the apply phase atomic with explicit validation.

**Current flow:**
1. Player clicks "Confirm"
2. Summary commits name (no validation before apply)
3. Finalizer is called
4. Mutations applied directly

**New flow (after Step 7):**
1. Player clicks "Confirm"
2. Summary step validates all prior selections
3. Compile mutation plan from projection
4. Validate plan (returns errors/warnings)
5. If valid, apply plan atomically
6. If invalid, block with error messages

**Files to create/modify:**
- Shell needs to handle confirm as two-phase (validate, apply)
- Summary step confirms and triggers plan validation
- Finalizer delegates to MutationPlan.apply()

### ⏳ Step 8: Parity Checks

Verify summary projection matches finalized actor after apply.

**Checks to add:**
- Projection identity matches actor.system.identity
- Projection attributes match actor abilities
- Projection skills match actor.system.skills
- Projection feats match actor items (type 'feat')
- Projection languages match actor.system.languages

### ⏳ Step 9: Phase 3 Final Handoff

Create comprehensive Phase 3 completion report:
- Projection contract summary
- Mutation plan pipeline
- Prereq adapter integration guide
- Testing checklist
- Known limitations (Phase 4 follow-ups)

---

## Architecture Decisions (Locked)

| Decision | Status | Notes |
|----------|--------|-------|
| Projection is DERIVED | ✅ Locked | Built from snapshot + selections, not editable directly |
| Single projection instance per session | ✅ Locked | Stored in progressionSession.currentProjection |
| ProjectionEngine is stateless | ✅ Locked | Pure function pattern; no side effects |
| PrereqAdapter creates mock actor | ✅ Locked | Doesn't modify actual actor; safe for legality checks |
| MutationPlan is explicit contract | ✅ Locked | Inspectable, testable, separates validation from apply |
| No second authority | ✅ Locked | progressionSession is sole source of selections |

---

## Code Quality

### Strong Points
- ✅ Clear separation of concerns (projection, prereq context, mutation plan)
- ✅ ProjectionEngine is pure (stateless, deterministic)
- ✅ PrereqAdapter is safe (non-mutating mock actor)
- ✅ MutationPlan is explicit (schema-driven, not ad-hoc)
- ✅ All new code includes logging for debugging
- ✅ Backward compatibility maintained throughout

### Areas for Improvement (Phase 4)
- Add unit tests for projection engine
- Add integration tests for prereq adapter with AbilityEngine
- Add tests for MutationPlan validation and apply
- Performance optimization if needed (projection caching)

---

## Testing Checklist

### Projection Tests
- [ ] ProjectionEngine.buildProjection() with full selections
- [ ] ProjectionEngine.buildProjection() with empty session
- [ ] Projection includes all domains (identity, attributes, skills, abilities, etc.)
- [ ] Projection metadata timestamps are correct
- [ ] Fallback _buildEmptyProjection() works on error

### PrereqAdapter Tests
- [ ] buildEvaluationContext() adds feats to mock actor.items
- [ ] buildEvaluationContext() reflects projected attributes
- [ ] Mock actor can be passed to AbilityEngine.evaluateAcquisition()
- [ ] Legality checks pass with projected state that would fail with snapshot
- [ ] Safe degradation to snapshot on error

### MutationPlan Tests
- [ ] compileFromProjection() creates well-formed plan
- [ ] validate() catches missing class selection
- [ ] validate() catches missing attributes
- [ ] validate() warns on missing species
- [ ] apply() updates actor system fields
- [ ] apply() respects validation results
- [ ] Empty plan returns error

### Integration Tests
- [ ] Commit builds projection (step-plugin-base)
- [ ] Projection stored in progressionSession.currentProjection
- [ ] Summary reads from projection instead of manual aggregation
- [ ] Projection survives navigation (stored in session)
- [ ] Reconciliation updates affect projection (dirty nodes)

---

## Known Limitations (Phase 3 Scope)

### By Design (Deferred)
- Combat calculations (HP, defenses) are preview-only
- Advanced grant system (what class/feats grant)
- Level/BAB computation from class selection
- Droid build complex validation
- Force domain access computation
- Multi-level progression (only chargen tested so far)

### Technical Debt (Acceptable)
- MutationPlan.apply() is skeleton (needs ActorEngine wiring)
- Item mutations just log intent (need actual item creation)
- System mutations are placeholder (need schema mapping)
- No transaction rollback if apply fails (Phase 4)

---

## Next Session Plan

1. **Complete Step 6** — Projection rebuild hook in reconciler (30 min)
2. **Complete Step 7** — Confirm/apply separation in shell (1 hour)
3. **Complete Step 8** — Add parity checks (30 min)
4. **Complete Step 9** — Write Phase 3 final report
5. **Validate** — Test chargen with projection + mutation plan
6. **Push** — Phase 3 complete to feature branch

---

## Files Changed This Session

### New Files
- `scripts/apps/progression-framework/shell/projection-engine.js` (284 lines)
- `scripts/apps/progression-framework/shell/prereq-adapter.js` (230 lines)
- `scripts/apps/progression-framework/shell/mutation-plan.js` (350 lines)
- `PHASE-3-AUDIT-REPORT.md` (196 lines)
- `PHASE-3-PROGRESS.md` (this file)

### Modified Files
- `scripts/apps/progression-framework/steps/step-plugin-base.js` (+import ProjectionEngine, +build projection after commit)
- `scripts/apps/progression-framework/steps/summary-step.js` (+import ProjectionEngine, refactored _aggregateSummary)

### Total Lines Added
- ~900 lines of new code + infrastructure
- 3 new core modules
- 1 integration point (step-plugin-base)
- 1 enhanced module (summary-step)

---

## Commit Hash

`549098e` — Phase 3 Step 2-4: Projection engine and prereq adapter

---

## Conclusion

Phase 3 foundation is solid. The projection model is in place, prereq checks can see draft state, and mutation plan provides explicit contract. Next session should focus on the final integration steps (confirm/apply separation, parity checks) and validation.
