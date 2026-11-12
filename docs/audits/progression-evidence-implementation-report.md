# Progression Evidence Authority & Manual Completion - Implementation Report (cumulative)

Branch `claude/clever-shannon-pwf22k-evidence`, stacked on PR #1146 head `8b14ee7` (PR #1145 `44cc3c7`). PRs #1145 and #1146 are not modified.
Addendum: `docs/audits/reconciliation-v2-manual-completion-addendum.md`. Owner decisions Q1-Q8 and C1-C8 apply as approved.

## Checkpoint A - mutation integrity (C4 / C2 / C1) - IMPLEMENTED, Node-tested
**Defect confirmed statically.** The reconcile route (`_openProgressionReconciliationStep`, `singleStep: false`) reaches `AbilityScorePlanBuilder.buildLevelUpSet` through
`phase4BuildFinalizerAbilitySet` with `manifest = plan.set['flags.swse.levelUpEntitlementManifest'] || null`, which is `null` for reconciliation sessions. The builder took its level
only from `manifest.characterLevel` (null / 0), although the attribute step had already committed the correct `abilityIncreaseLevel` and `slotId` in `draftSelections.attributes`.
Scores were increased but the history record had no valid level, which the reconciler ignores - the entitlement stayed open and a second Apply added the increase again.
The single-step writer (`_compileSingleStepAttributeSet`) fell back to the actor's CURRENT level.

**Fix.**
- New `mutation/ability-increase-guard.js`: `resolveEntitlementLevel` takes the level from `attr.abilityIncreaseLevel`, the slot id (`ability-increase-level-N`) and the manifest; any
  present-but-invalid value (null/0/negative/non-integer/non-id string) or disagreeing sources FAIL CLOSED; no source fails closed; no fallback to the current level.
  `assertEntitlementOpen`: one active record per entitlement - an existing entry for the level blocks a new additive application (C1/C2).
- `AbilityScorePlanBuilder.buildLevelUpSet` (the LIVE writer) uses the resolver, stamps `entitlementId`, and no longer replaces by level (it refuses instead). Throws before any score is computed.
- `ProgressionFinalizer._applyMutationPlan` is now the guarded transaction boundary for BOTH finalize paths (`finalize`, `finalizeSingleStep`): `beginAbilityIncreaseTransaction` refuses an invalid level,
  a concurrent duplicate from this client, an entitlement recorded since preparation, and any increased score that no longer equals the value the plan was built from. Refusals return before ActorEngine is called.
- `_compileSingleStepAttributeSet` no longer supplies the actor's level.
- The dead inline ability block in `ProgressionFinalizer` was deliberately NOT edited (C5).

**Residual (not eliminated).** Foundry has no document transaction. Writes are absolute (`base = old + delta`), so two identical stale submissions cannot stack, and the boundary re-read narrows the window,
but two DIFFERENT selections prepared from the same stale read by two clients and committed within that window are not provably prevented. Fail-closed where detectable; documented as an open limitation.

**Tests.** `tests/ability-increase-entitlement-integrity.test.mjs` (11 groups): normal level-up records the entering level; chargen fabricates no history; the level-9-actor / level-8-entitlement regression through the real
finalizer compile (and the old builder fails it); fail-closed identity matrix; single-step; apply-once with level 4 record untouched and the reconciler seeing level 8 filled and no level 9 slot; duplicate refusal at the
boundary and at a fresh compile; same-client concurrency; stale scores; failed mutation records nothing and releases the guard. ActorEngine is a stub applying `plan.set`; real ActorEngine / Foundry behavior is untested.
