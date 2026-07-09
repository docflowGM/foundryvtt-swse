# ActorEngine Thin-Facade Extraction Plan (Phase 5)

**Date:** 2026-07-09
**File:** `scripts/governance/actor-engine/actor-engine.js` (~4,600 lines)
**Companion:** `docs/audits/actor-engine-responsibility-audit.md` (full method inventory)

## Purpose

Identify the **safest low-risk internal extractions** from ActorEngine so the
facade shrinks without changing its public API or its role as the **only** module
that mutates actor documents. This is a plan only — no code is moved in Phase 5.

## Guiding invariant

> Domain engines may decide what should happen, but only ActorEngine may make it
> happen.

Every candidate below must keep that invariant: extracted helpers either (a) are
pure/non-mutating, or (b) remain behind the ActorEngine facade and only mutate via
the same `MutationInterceptor.setContext()` → `applyActorUpdateAtomic()` gateway
that ActorEngine owns today. No extracted helper may call `actor.update()` on its
own authority.

## Candidate ledger (safest first)

| # | Candidate | Source methods | Proposed target | Nature | Risk | Ready? |
|---|-----------|----------------|-----------------|--------|------|--------|
| 1 | Plan builders | `buildEmbeddedCreatePlan`, `buildEmbeddedDeletePlan`, `buildEmbeddedReplacePlan`, `buildCloneActorPlan` | `scripts/governance/actor-engine/plan-builders.js` | Pure, non-mutating | **Low** | Yes |
| 2 | Derived-state read view | `buildDerivedState` | sheet context builder / `plan-builders.js` | Pure read | **Low** | Yes |
| 3 | Flag helpers | `updateActorFlags`, `unsetActorFlag` | `scripts/governance/actor-engine/flag-helpers.js` | Mutating (behind facade) | **Low** | Yes, with facade wrapper |
| 4 | ActiveEffect wrappers | `createActiveEffects`, `updateActiveEffects`, `deleteActiveEffects` | `scripts/governance/actor-engine/active-effect-helpers.js` | Mutating (behind facade) | **Low–Med** | Yes, with facade wrapper |
| 5 | Force/Destiny point internals | `gainForcePoints`, `spendForcePoints`, `spendDestinyPoints` | delegate bodies to existing `engine/force/force-points-service.js` | Mutating (behind facade) | **Med** | After parity check |
| 6 | Snapshot helpers | `restoreFromSnapshot` | `scripts/governance/snapshot/` (exists) | Mutating (behind facade) | **Med** | After interface design |
| 7 | Second wind internals | `applySecondWind`, `resetSecondWind`, `applySecondWindEdgeOfExhaustion` | `engine/combat/SecondWindEngine.js` | Domain rules + mutation | **High** | Not yet |
| 8 | Condition internals | `setConditionStep`, `applyConditionShift`, `incrementPersistentConditionSteps` | `engine/combat/ConditionEngine.js` | Domain rules + mutation | **Med–High** | After parity check |

## Recommended first move (Phase 6)

**Candidate #1 (plan builders)** is the single safest extraction:
- The responsibility audit confirms these are non-mutating and hold no ActorEngine
  internal state (no reliance on in-flight guards, mutation context, or `this`
  closure beyond calling sibling primitives).
- No public method changes; ActorEngine keeps `ActorEngine.buildEmbeddedCreatePlan`
  etc. as thin re-exports/delegates.
- Extraction is a rename-and-delegate, not a behavior change.

Candidates #2–#4 are the natural follow-ups once #1's pattern (extract module +
keep facade delegate) is proven.

## Required parity checks (per candidate)

- **#1 / #2 (pure):** static grep that all callers use `ActorEngine.<method>(...)`
  (no caller relies on `this`); confirm returned plan/object shape is byte-identical
  by constructing the same input and deep-equal comparing before/after.
- **#3 / #4 (flags/effects behind facade):** confirm the extracted helper still
  routes through `MutationInterceptor.setContext()` and `applyActorUpdateAtomic`
  (or the existing embedded-doc gateway); runtime smoke test — toggle a flag / add
  and remove an ActiveEffect from a sheet and confirm persistence + single render.
- **#5 (force points):** gain/spend/destiny values persist identically; confirm
  `_maybeResolveForcePointRescue` still calls the same spend path.
- **#6 (snapshot):** round-trip a snapshot restore and deep-equal the resulting
  `actor.system`.
- **#7 / #8 (domain rules):** full rules parity audit against the existing engine
  before any body moves (see "Do not move yet").

## Do NOT move yet

These stay in ActorEngine until the responsibility audit's open questions are
closed and runtime parity is proven. Moving them now risks correctness regressions:

- `updateActor`, `updateEmbeddedDocuments`, `createEmbeddedDocuments`,
  `deleteEmbeddedDocuments` — the gateway itself.
- `recalcAll` / `_applyDerivedUpdates` — sensitive derived-cycle sequencing
  (`_isDerivedCalcCycle` guard, ModifierEngine impurity).
- `applyProgression`, `applyMutationPlan` + `_apply*Ops` — progression
  finalization; nested mutation context, temp-ID rewriting.
- `apply` (adoption path) + `_preflightAdoptionPayloads` — destructive
  delete-then-create; preflight must stay coupled to the delete.
- `_maybeResolveForcePointRescue` — mid-mutation async dialog + in-memory packet
  mutation.
- `_normalizeMutationForContract` shape-init side effects, `_validateDerivedWriteAuthority`,
  and the Phase 3 guardrail pipeline inside `updateActor` — the ordered hot path.
- Second wind / condition **rule logic** (#7, #8) — extract only after a full
  parity audit of `SecondWindEngine` / `ConditionEngine` coverage.

## Rollback concerns

- **Keep a facade delegate for every extracted method** (never delete the public
  ActorEngine method in the same PR as the extraction). This is the compatibility
  shim and the one-line rollback path — revert the delegate body to inline.
- **One candidate per PR.** Do not batch #1–#4; each needs its own parity check and
  its own revert boundary.
- **Static anti-bypass check after each move:** grep non-ActorEngine files for the
  extracted internal names to confirm no caller reached the new module directly,
  bypassing the facade. The `tools/check-architecture-boundaries.mjs`
  `direct-actor-mutation` category backs this — an extracted helper that mutates
  must live in an allowlisted gateway path, or it will (correctly) show up as a
  finding.
- **Circular-import guard:** for domain extractions (#5, #7, #8) use lazy dynamic
  `import()` in ActorEngine (the pattern already used for `DamageResolutionEngine`
  and `ForcePointsService`) to avoid import cycles.
