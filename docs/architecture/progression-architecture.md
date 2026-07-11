# Progression Architecture (post Phase 4)

This document describes the progression finalization architecture after the Phase 4
consolidation that removed the runtime monkey-patch stack.

## The three layers

```
Shell / UI (Confirm)
        │  session state + actor
        ▼
ProgressionFinalizer            ← orchestrator
        │  calls each domain builder, merges fragments
        ▼
Domain PlanBuilders             ← pure compilers (side-effect free)
        │  return mutation-plan fragments
        ▼
merge → validate
        │  one authoritative mutation plan
        ▼
ActorEngine.applyMutationPlan() ← the only mutation gateway
        │  transactional, validated, re-derives
        ▼
Persistence
```

### ProgressionFinalizer — orchestrator
`scripts/apps/progression-framework/shell/progression-finalizer.js`

- `_compileMutationPlan()` is a thin orchestrator. It calls `_compileMutationPlanBase()`
  (base compilation) and then applies each domain builder over the resulting plan, in a
  fixed order that mirrors the historical patch registration order:
  **ability → skills → species → economy → metadata**.
- `_compileProgressionAbilityItems()` layers the item-grant builders: **force wraps
  feat/talent wraps** the base item compiler. Each layer routes its own selections
  through the owning builder and delegates the remainder downward.
- The finalizer performs **no direct document writes**. It applies the final plan
  through `ActorEngine.applyMutationPlan()` (`_applyMutationPlan`), transactionally.

There is **no runtime patching**. Builders are imported and called directly; nothing
under `shell/mutation/` reassigns `ProgressionFinalizer` methods.

### Domain PlanBuilders — compilers
`scripts/apps/progression-framework/shell/mutation/*-plan-builder.js`

Each builder is **side-effect free**: it converts a normalized progression selection into
a mutation-plan fragment (`set` / `add` / `delete` / `postApply`). Builders never mutate
actors, create owned items, call `ActorEngine`, or write to Foundry documents.

| Builder | Domain | Wired |
|---|---|---|
| `AbilityScorePlanBuilder` | ability scores, increase ledger | ✅ |
| `SkillsLanguagesPlanBuilder` | skills, languages, class-skill unlock, Skill Focus | ✅ |
| `SpeciesBackgroundPlanBuilder` | species/background materialization, portrait, natural weapons | ✅ |
| `ProgressionEconomyPlanBuilder` | HP, credits, Force Points, ledgers | ✅ |
| `FeatTalentPlanBuilder` | feat/talent grants, repeatability, Block & Deflect | ✅ |
| `ForcePlanBuilder` | Force powers/regimens/techniques/secrets, mastery | ✅ |
| `ProgressionMetadataPlanBuilder` | receipts, completion flags, session metadata | ✅ (Phase 4) |
| `ClassPlanBuilder` | class item/level bookkeeping | ❌ not wired (see below) |

### ActorEngine — mutation gateway
`scripts/governance/actor-engine/actor-engine.js`

The single place that writes to actors. The finalizer hands it one merged plan;
`applyMutationPlan` validates, applies transactionally (rolling the actor back if any
operation fails), and re-derives. Builders never reach the actor directly.

## Intentionally inline domains

Not every domain is a builder. Two areas remain compiled inline inside
`_compileMutationPlanBase`, deliberately, to avoid unverifiable behavior changes:

1. **Class** — `ClassPlanBuilder` exists but is **not wired** because it is not
   behavior-equivalent to the inline class compilation:
   - different `selectionId` fallback chain (adds `clazz.classId` / `levelContext.selectedClassId`);
   - no branch for non-chargen/non-levelup modes, where the inline path still emits a class item;
   - it does not cover class auto-grants (`_compileClassAutoGrantItems`) or starter
     equipment (`_compileClassStarterEquipmentItems`).
   Wiring class safely requires reconciling all three plus a Foundry smoke test. See the
   `TODO(class)` in `_compileMutationPlanBase` and the header note in
   `class-plan-builder.js`.

2. **Base compilation remains and is clobbered.** For the wired domains, the base method
   still computes each domain inline and the builder output then replaces it
   (remove-inline-keys + assign). This was the conservative, provably behavior-preserving
   way to remove the monkey-patch stack without deleting large tracts of unverifiable
   logic. Collapsing the base inline computation into the builders (so each domain has a
   single implementation) is a safe follow-up once a Foundry/test harness exists to verify
   it. The builders are the authoritative output today.

## Enforcement

`tools/check-architecture-phase4.mjs` gates the hard invariants (ability schema authority,
combat math SSOT, direct-actor-mutation boundary) and reports migration debt. No method
reassignment remains under `shell/mutation/`, and `squad-actions-init.js` no longer imports
any finalizer patch file.

## Verification status

Static checks pass (`node --check`, `check-architecture-phase4.mjs` unchanged from
baseline). End-to-end chargen/level-up flows require a Foundry runtime and are **not**
automatically verified here — see the smoke-test checklist on the PR.
