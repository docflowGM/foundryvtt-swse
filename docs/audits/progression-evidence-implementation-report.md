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

## Checkpoint B - canonical completion reader - IMPLEMENTED, Node-tested
`reconciliation/progression-completion-reader.js` is the ONE read-only interpretation of the persisted progression evidence (first domain: ability-score increases from
`system.progression.abilityIncreaseHistory`). API: `getEntitlementCompletion(actor, entitlementId, ctx)`, `getAbilityIncreaseCompletion`, batch `getAbilityIncreaseCompletions`. The entitlement COUNT and the
deferred-rules flag are supplied by the caller from the existing authorities (`_abilityIncreaseCountForActor`, RECON-002/003); the reader owns no rules, writes nothing, and never reconstructs history from current scores.

Per entitlement it returns: stable id, type, level, expected count, applied / attested / GM-authorized selections, remaining unknown, classification (`SYSTEM_VERIFIED`, `SYSTEM_COMMITTED_UNVERIFIED`,
`PLAYER_ATTESTED`, `GM_AUTHORIZED`, `PARTIAL`, `UNVERIFIABLE`; `CONFIRMED_DISCREPANCY` is never produced from history alone), `provenShortfall`, evidence sources, session references, verification state,
conflicts and preserved legacy records.

Rules implemented from the approved decisions: Q2 - a record with no recognised provenance is preserved and shown but is UNVERIFIABLE, never trusted as system evidence (a recognised writer label only claims a
source: `SYSTEM_COMMITTED_UNVERIFIED`; `SYSTEM_VERIFIED` requires a recorded `verification.state === 'verified'`, which nothing writes yet - Checkpoint C); Q3 - partial manual evidence leaves the remainder
unknown (not an open finding) while a short SYSTEM record remains a proven shortfall; Q1/C7 - deferred (droid / Nonheroic) entitlements ignore attestations; C1 - system and manual records for one level are reported as a conflict and the
system record wins; withdrawn / superseded records do not count; duplicates merge (no double counting); C6 - `lastAbilityIncrease` never overrides the history and is supplementary only for an untracked level.

Reconciler integration: `_buildAbilityIncreaseSlots` now derives status and counts from the reader; its private history parser (`_readAbilityIncreaseHistory` + three helpers) was removed (no competing reader). Behavior change by decision (Q2):
a history record with no recognised `source` used to fill the slot and now shows as unverifiable. Existing slot ids, labels and the open / unverifiable / filled semantics are otherwise unchanged; slots gain a `completion` block.
Other domains are NOT migrated to the reader (feats, talents, skills, Force, HP keep their existing readers until proven equivalent).

Tests: `tests/progression-completion-reader.test.mjs` (13 groups); `tests/reconciliation-v2-contract.test.mjs` 14b updated and 14c / 14d added.
