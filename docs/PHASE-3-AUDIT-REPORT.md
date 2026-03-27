# Phase 3: Projection and Atomic Mutation — Audit Report

**Date:** March 26, 2026
**Status:** Audit Complete, Ready for Implementation

---

## Current State Analysis

### Summary-Step Current Behavior

**File:** `summary-step.js:_aggregateSummary()`

Currently reads:
- `progressionSession.draftSelections` (normalized Phase 1 selections)
- `shell.committedSelections` (legacy fallback)
- `shell.actor.system` (live actor for fallback name/level)

Does manual aggregation:
- Species: attempts to extract name/id from normalized, falls back to legacy, then live actor
- Class: same pattern
- Attributes: transforms `{values: {str, dex, ...}}` to `{str, dex, ...}`
- Skills: maps from `{trained: [ids]}` to `[ids]`
- Languages: normalizes to flat id list
- Feats/Talents: flattens from slot-based to list
- All use triple-fallback pattern (normalized → legacy → live actor)

**Problem:** Manual aggregation means summary shape is reconstructed in multiple places. No single source of truth for what the "draft character" looks like.

---

### Finalizer Current Behavior

**File:** `progression-finalizer.js:_compileMutationPlan()`

Currently reads:
- `progressionSession.draftSelections` (via adapter: `_buildSelectionsFromSession()`)
- `shell.committedSelections` (legacy fallback)
- `shell.actor` (live actor for baseline mutations)

Does reconstruction:
- Builds selection Map from progressionSession
- Compiles mutations for species, class, background, attributes, skills, feats, talents, languages
- Applies droid-specific logic
- Calls ActorEngine for final application

**Problem:** Mutation compilation reads raw selections and infers what should happen. No intermediate validation against a "projected character" model.

---

### Prerequisite/Legality Current Behavior

**Files:** `AbilityEngine.js`, `PrerequisiteChecker.js`, various step legality checks

Currently:
- Each step calls `AbilityEngine.evaluateAcquisition(actor, item)` against live actor
- Live actor is immutable snapshot via Phase 1's `progressionSession.actorSnapshot`
- But steps must pass the snapshot actor, not the projected draft

**Problem:** Legality checks don't see projected draft state. If a player selects class→changes attributes→force access changes, the change isn't reflected until checkpoint/summary.

---

## Identified Gaps (Phase 3 to Fix)

| Gap | Current Behavior | Phase 3 Solution |
|-----|------------------|------------------|
| Multiple aggregations | Summary and finalizer both reconstruct draft state | Single ProjectionEngine |
| No draft preview | Live actor is immutable; draft effects not visible | Projected character object |
| Legality against snapshot | Legality checks see actor at progression start | Prereq adapter sees projected draft |
| Summary/apply mismatch | Summary aggregates independently; apply compiles independently | Both read from projection |
| Mutation plan vague | Apply is "run mutations from finalizer" | Explicit mutation plan schema |

---

## Phase 3 Projection Contract

### Projected Character Schema

```javascript
{
  // Identity (from draft selections)
  identity: {
    species: {id, name},
    class: {id, name},
    background: {id, name}
  },

  // Attributes (computed from draft + grants)
  attributes: {
    str: number,
    dex: number,
    con: number,
    int: number,
    wis: number,
    cha: number
  },

  // Skills (trained from selections + grants)
  skills: {
    trained: [id],           // directly selected
    granted: [id],           // from class/background/feats
    total: {}                // preview only, counts + modifiers
  },

  // Abilities (from selections)
  abilities: {
    feats: [{id, name, source}],
    talents: [{id, name, source}],
    forcePowers: [{id, name}],
    forceTechniques: [{id, name}],
    forceSecrets: [{id, name}],
    starshipManeuvers: [{id, name}]
  },

  // Languages (from selections + grants)
  languages: [{id, name}],

  // Droid (if applicable)
  droid: {
    credits: number,
    systems: [...],
    defenses: {...}
  } || null,

  // Derived (preview-friendly)
  derived: {
    hpPreview: number || null,
    defensesPreview: {},
    grants: {...},            // what identity/attrs/feats grant
    warnings: [],             // conflicts, missing choices, etc.
    projectStatus: 'complete'  // 'incomplete', 'complete', 'dirty'
  }
}
```

### Authoritative in Phase 3

- identity (species, class, background)
- attributes (str, dex, con, int, wis, cha)
- trained skills (direct selection)
- feats, talents, languages (selection lists)
- droid core fields

### Preview-Only (Deferred)

- Combat math (hp, defenses, attack bonuses)
- Advanced derived calculations
- Suggestion rankings

---

## Phase 3 Implementation Roadmap

### Step 1: Audit Complete ✅

Current findings:
- Summary does manual aggregation → need ProjectionEngine
- Finalizer reads raw selections → need to compile from projection
- Legality checks see immutable snapshot → need prereq adapter
- No mutation plan schema → need explicit plan

### Step 2-9: Implementation Tasks

1. **Build ProjectionEngine** — Derive character from snapshot + normalized selections
2. **Build PrereqAdapter** — Make draft-aware context for legality checks
3. **Rewrite Summary** — Use projection as review model
4. **Define MutationPlan** — Schema + compiler
5. **Separate Compile/Apply** — Validation before mutations
6. **Hook Reconciliation** — Rebuild projection after changes
7. **Add Parity Checks** — Verify summary matches apply

---

## Next Session Plan

Start with Step 2: Build ProjectionEngine

1. Create `projection-engine.js` module
2. Implement `buildProjectedCharacter(session)`
3. Test with current normalized selections
4. Hook into summary for initial validation

Then proceed with Steps 3-9 in documented order.

---

## Key Constraints for Phase 3

✅ Projection is DERIVED (from snapshot + selections)
✅ No second draft authority
✅ No temp Actor document (use projection object)
✅ Mutation plan is single write contract
✅ Preserve Phase 1-2 boundaries

