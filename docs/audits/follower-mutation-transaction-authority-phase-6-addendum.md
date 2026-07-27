# Follower Mutation Transaction Authority — Phase 6 Addendum

**Branch:** `fix/droid-authority-consolidation-phase-2`
**PR:** #937 (draft, stacked on #936)
**Scope:** follower creation, update, removal, and owner linkage — a
follow-up mutation-governance audit on top of the Phase 6 chassis
consolidation (`a3b6eee`, `b297697`).

## Summary

The Phase 6 chassis consolidation (and its earlier addendum) is
structurally correct: the follower chargen step UI writes only to
`progressionSession.draftSelections`/`droidContext`, never touching a live
Actor. This addendum addresses a different, deeper finding: **follower
finalization and lifecycle operations were mostly ActorEngine-governed
per-write, but not transactionally atomic as multi-step or multi-Actor
operations**, and several call sites bypassed ActorEngine entirely with
direct `setFlag()`/`.delete()` calls.

**ActorEngine governance and transaction atomicity are two separate
requirements.** ActorEngine governs *how* a single Actor is mutated (every
governed call goes through `MutationInterceptor` authorization and a single
recomputation pass). It does not, by itself, make a multi-step sequence
(create a follower Actor, materialize its Items/fields, then link it to the
owner) succeed or fail as one logical unit. This addendum closes that gap
without inventing a generic transaction engine — Foundry cannot commit
multiple world documents atomically, so the fix is an explicit, honest
"do these steps in order; if one fails, undo everything already done, in
reverse order, best-effort" coordinator.

## Confirmed mutation paths (before this addendum)

| Path | ActorEngine-governed? | Atomic as a unit? |
|---|---|---|
| Species/feat/natural-weapon Item creation | Yes (`ActorEngine.createEmbeddedDocuments`/`updateEmbeddedDocuments`) | N/A — single-Item writes |
| Skill training, language grants, progression/defense fields | Yes (`ActorEngine.updateActor`) | N/A — single-actor field writes |
| `_applyDroidTraits` (`follower.setFlag('isDroid', true)`) | **No — direct `setFlag()`** | — |
| `_linkFollowerToOwner` (owner flag, owner ownedActors, follower ownership) | Partially (2 of 3 writes) | **No — three independent writes, no rollback** |
| `createFollowerFromMutation` rollback (`follower.delete()`) | **No — direct `Actor#delete()`**, bypassing the approved `deleteActor()` wrapper | Deleted only the follower; never restored owner state if linkage had partially run |
| `updateFollowerFromMutation` (core state, then progression material) | Yes, per call | **No — a materialization failure left the prior core-state write persisted** |
| `removeFollower` (owner flag, then `follower.delete()`) | Partially (owner flag was direct `setFlag()`, deletion was direct `Actor#delete()`) | **No — no rollback if deletion failed after unlink** |
| `FollowerManager` enhancement bonus/tactical-ability flags | **No — nine direct `owner.setFlag()` calls**, two of them (ability list + detail record) logically paired with no shared write | — |
| `FollowerShell._updateFollowerSlot` | **No — direct `ownerActor.setFlag()`** | — |

## What changed

### 1. `scripts/apps/progression-framework/adapters/follower-mutation-transaction.js` (new)

Zero-Foundry-dependency pure module. Exports:

- `runFollowerMutationTransaction(steps, options)` — runs an ordered
  sequence of `{name, commit(context), rollback(result)}` steps. On any
  step's `commit` throwing, rolls back every already-completed step in
  reverse order (best-effort — a rollback failure is recorded, not
  swallowed, and does not stop the remaining rollbacks from being
  attempted) and returns a structured `{ok: false, error, failedStep,
  completedSteps, rollbackFailed, rollbackErrors}` rather than throwing —
  there is no single Actor a thrown-and-caught error could naturally
  attach to for a multi-Actor sequence.
- `resolveFollowerFinalizationToken(followerMutation)` — derives a stable
  idempotency key, preferring an explicit `finalizationToken` and falling
  back to the follower progression slot id
  (`followerMutation.slotId`/`persistentChoices.slotId`, already threaded
  through by `FollowerShell` from `dependencyContext.slotId`).
- `findFollowerLinkForToken(followerLinks, token)` — looks up an existing
  owner-side follower link record carrying a given token.
- `buildFollowerLinkOwnerUpdate(...)` / `buildFollowerUnlinkOwnerUpdate(...)`
  — pure, dedup-safe builders for the owner's two follower-relationship
  projections (`flags.foundryvtt-swse.followers`, `system.ownedActors`).
- `buildFollowerSlotUpdate(slots, slotId, followerActorId)` — pure,
  dedup-safe (updates in place, never appends) follower-slot builder.

This module is directly Node-testable with mock steps, independent of
whatever real Actor/Item calls a production step happens to make — see
"Tests" below.

### 2. `scripts/apps/follower-creator.js`

- **`_applyDroidTraits`**: `follower.setFlag(...)` → `ActorEngine.updateActor(follower, {'flags.foundryvtt-swse.isDroid': true})`.
- **`_linkFollowerToOwner`**: the owner's two projections
  (`flags.foundryvtt-swse.followers`, `system.ownedActors`) now commit in
  ONE `ActorEngine.updateActor` call via `buildFollowerLinkOwnerUpdate`. If
  the follower-ownership grant that follows fails, that single owner write
  is rolled back to its pre-link state before the error is rethrown.
  Enhancement application remains a documented, deliberately best-effort
  post-commit step (see "Commit policy for enhancement application"
  below) — its failure must not unwind an already-valid link.
- **`createFollowerFromMutation`**: now (a) checks
  `resolveFollowerFinalizationToken`/`findFollowerLinkForToken` first and
  returns the existing follower on a repeat finalization instead of
  creating a duplicate; (b) builds the full actor payload in a preflight
  block — if that throws, nothing has been persisted, so there is nothing
  to roll back; (c) runs `create-actor` → `materialize` → `link` through
  `runFollowerMutationTransaction`, with `create-actor`'s rollback deleting
  the follower Actor via `deleteActor()` (the approved
  `core/document-api-v13.js` world-document lifecycle wrapper, not a
  direct `Actor#delete()`).
- **`updateFollowerFromMutation`**: snapshots the follower
  (`follower.toObject(true)` + a separate clone of `follower.flags`,
  since `ActorEngine.restoreFromSnapshot`/`SnapshotService` deliberately
  does not restore `flags` — a documented limitation of that existing
  restore contract) before any mutation. On failure, restores both via
  `ActorEngine.restoreFromSnapshot` (system/name/img/items/effects) and a
  follow-up `ActorEngine.updateActor(follower, {flags: preUpdateFlags})`
  call (flags) — so a materialization failure after the core-state write
  already committed no longer leaves that write persisted.
- **`removeFollower`**: unlink now commits both owner projections in one
  `ActorEngine.updateActor` call via `buildFollowerUnlinkOwnerUpdate`.
  Deletion routes through `deleteActor()` instead of `follower.delete()`.
  If deletion fails after the owner was already unlinked, the owner's
  prior projections are restored before rethrowing.

### 3. `scripts/apps/follower-manager.js`

All nine direct `owner.setFlag()` calls (speed bonuses, tactical
abilities, tactical ability details, and the stale-flag cleanup pass)
replaced with `ActorEngine.updateActor(owner, {'flags.foundryvtt-swse.<key>': value})`.
`addTacticalAbility` and `removeEnhancement`'s tactical-ability case each
write BOTH sibling flags (the ability-name list and its detail record) in
one governed call instead of two separately-persisted writes, eliminating
the partial-write case (name added with no detail record, or vice versa)
at the source rather than needing a rollback for it.
`_removeStaleOwnerEnhancementFlags` now collects every changed projection
into one governed call instead of up to three independent writes.

### 4. `scripts/apps/progression-framework/follower-shell.js`

`_updateFollowerSlot`'s direct `ownerActor.setFlag(...)` replaced with a
governed `ActorEngine.updateActor` call, using the new
`buildFollowerSlotUpdate` pure builder.

## World-document lifecycle authority — already established, not invented

The addendum asked whether ActorEngine governs world Actor
creation/deletion or whether a separate authority already exists.
`scripts/core/document-api-v13.js`'s own header comment already states the
split this addendum needed: it is the v13-safe wrapper for **document
creation, updates, and deletions**, while
`scripts/governance/actor-engine/actor-engine.js` governs **Actor content
mutation**. `follower-creator.js` already imported and used
`createActor()` from that file for follower creation — but never imported
its matching `deleteActor()`, instead calling `follower.delete()` directly
in three places (`createFollowerFromMutation`'s rollback, `removeFollower`).
All three now use `deleteActor()`. No new lifecycle service was created;
this addendum only completed the wrapper's use.

## `ActorEngine.applyMutationPlan` — an existing single-Actor transaction primitive, and why it wasn't used here

`ActorEngine.applyMutationPlan(actor, {create, set, update, add, delete},
{transactional: true})` already exists in production and already
implements strict-order apply (DELETE → SET → UPDATE → ADD) with
snapshot-based rollback on failure, including deleting any world Actor
created via its `create.actors` bucket if a later step in the *same* plan
fails. It targets one pre-existing `actor` argument — `add`/`update`/
`delete`/`set` all operate on that actor, and a `create.actors` entry
creates an *additional*, independent world Actor rather than the target
itself. It does not support "create the target actor and then add Items to
it" in one call, because the target must already exist to be the plan's
subject. Follower creation genuinely needs that shape (create the
follower, then add Items to *it*), so `applyMutationPlan` was not directly
usable for the whole creation sequence; `runFollowerMutationTransaction`'s
narrower per-step approach was built instead, deliberately consistent with
`applyMutationPlan`'s own reverse-order rollback philosophy rather than
inventing an unrelated pattern.

## Commit policy for enhancement application

`FollowerManager.applyExistingEnhancementsToFollower` (owner talents like
"Undying Loyalty" granting a follower a feat) runs *after* the follower
link (both owner projections + follower ownership) is already fully and
successfully committed. This is intentional and unchanged: enhancement
application is a best-effort convenience layered onto an already-valid
link, not part of the atomic unit — its failure (already wrapped in
try/catch, logged, swallowed) must never unwind a link that already
succeeded.

## Droid chassis budget and canonical droid ledger semantics (verified, no code change)

- **Budget resolved once, not double-applied**: `_resolveFollowerDroidCredits`
  reads the already-computed `droidConfig.droidCredits` (base/spent/lost)
  produced during the live chargen session by `FollowerDroidBuilderStep`;
  it normalizes and carries the number forward, it does not re-derive or
  re-add cost. Each finalization path (`createFollowerFromMutation`,
  `updateFollowerFromMutation`) calls it exactly once.
- **Owner credits untouched**: no code path anywhere in
  `follower-creator.js` deducts credits from the *owner* actor for a
  droid follower's chassis budget — the follower's own `system.credits` is
  set to `0` after chargen (the budget is spent-or-lost accounting
  internal to the chassis, not a live purchase transaction against
  anything).
- **Cancellation/retry**: chargen cancellation never calls
  `createFollowerFromMutation`/`updateFollowerFromMutation` at all (the
  draft session is simply discarded), so no persisted credit mutation
  occurs. `FollowerDroidBuilderStep._ensureFollowerStartingCredits` only
  rolls `startingCredits` when it is not already set, so a session retry
  does not reroll. The new idempotency-token check means a repeated
  *finalization* attempt for the same follower slot returns the already-
  created follower rather than re-rolling or re-creating anything.
- **Canonical droid ledger**: `follower-creator.js` writes only
  `system.droidSystems` (a generated projection) for a newly created
  droid follower, never `system.installedSystems` (the Phase 1/2 canonical
  installation ledger). This was already reviewed and explicitly
  allowlisted in Phase 2's `tools/check-droid-installation-write-authority.mjs`
  as `"one-time follower-creation writer — same reasoning as chargen
  finalization"` — a documented, narrow, already-approved seed exception,
  not something this addendum needed to add. Whether a follower droid
  Actor (`type: 'npc'` with `system.isDroid: true`) can ever be opened in
  the Garage (`DroidCustomizationEngine`) to trigger first-use
  reconciliation the way `droid-converted-system-reconciliation-service.js`
  does for stock-imported droids was not established either way — no
  follower-specific handling exists in the Garage engine, and no evidence
  of a missing or broken reconciliation path for this specific case was
  found. This is flagged as unresolved and out of this addendum's scope
  rather than silently assumed safe.

## Tests

`tests/follower-mutation-transaction.test.mjs` (new) — covers the
orchestration algorithm and pure builders directly:

- Sequencing/rollback: a failure at any step never lets a later step run;
  rollback runs in strict reverse order; a step with no `rollback` is
  skipped, not treated as an error; a rollback that itself throws is
  recorded (`rollbackFailed`) without stopping remaining rollbacks; a fully
  successful sequence returns every result plus a name-keyed context.
- Idempotency: `resolveFollowerFinalizationToken` (explicit token wins
  over slot id; slot id resolved from both top-level and
  `persistentChoices`; `null` when neither exists) and
  `findFollowerLinkForToken` (exact match only — a `null` token never
  matches).
- Owner-projection builders: linking is dedup-safe (re-linking the same
  follower id never appends a duplicate; a different follower id is
  additive); unlinking removes exactly the target id from both
  projections and is a no-op for an unknown id; `buildFollowerSlotUpdate`
  never mutates its input array and is a no-op for an unmatched slot id.
- Using the already-existing Foundry-shim fake `ActorEngine`
  (`tests/helpers/foundry-shim/fakes/actor-engine.fake.mjs`, zero Foundry
  dependency itself): a follower-ownership failure after the owner
  projections commit restores both projections to their pre-link values;
  an update-materialization failure restores the complete follower
  snapshot via `restoreFromSnapshot` + a follow-up flags-only
  `updateActor` call; a failed follower deletion after unlink restores the
  owner's prior linkage.

### Why `follower-creator.js` itself is not directly tested

Confirmed again this session (re-run, not assumed from the earlier Phase
5 finding): `scripts/apps/follower-creator.js` still cannot be loaded
through the Node Foundry-shim test harness — it transitively imports
`scripts/apps/base/swse-application-v2.js` (via `SWSEDialogV2`), which
needs the full `foundry.applications.api` surface the shim does not model.
This is why the tests above exercise the *orchestration logic itself*
(sequencing, rollback order, idempotency, owner-projection shape) with
mock steps and the existing fake ActorEngine, rather than the real
`FollowerCreator` class — the algorithm is what changed and what is
correctness-critical; the specific Foundry API calls each real step makes
were already governed (ActorEngine) before this addendum and are unchanged
in kind, only in sequencing/rollback.

### Mapping to the addendum's 25 required test cases

| # | Case | Status |
|---|---|---|
| 1 | Chassis step selection performs no Actor mutation | Verified by code inspection — unchanged since Phase 6, no chassis-step file touched by this addendum |
| 2 | Cancelled chargen performs no Actor mutation | Verified by code inspection — cancel/close never calls `FollowerCreator` |
| 3 | Preflight failure creates no follower | Tested (transaction: a step-1 failure produces zero completed steps) |
| 4 | Actor creation failure leaves owner unchanged | Tested |
| 5 | Species Item failure removes the new follower, leaves owner unchanged | Tested (materialize-phase failure) |
| 6 | Feat Item failure rolls back follower and owner state | Tested (materialize-phase failure; owner was never touched since link runs after materialize) |
| 7 | Skill-update failure rolls back follower and owner state | Tested (same as #6 — skill training is part of the materialize step) |
| 8 | Natural-weapon failure follows the documented required/optional policy | Verified by code inspection — `_upsertFixedProfileNaturalWeapons` already catches per-weapon errors and continues (unchanged, pre-existing) |
| 9 | Owner flag update failure rolls back follower creation | Tested |
| 10 | Owner ownedActors failure restores the owner flag | **Eliminated by construction** — both projections now commit in one call, so this partial-failure case can no longer occur |
| 11 | Follower ownership failure restores both owner projections | Tested (via the fake ActorEngine) |
| 12 | Enhancement failure follows the documented commit policy | Verified by code inspection — unchanged try/catch, runs after link is already committed |
| 13 | Successful creation produces one follower and one owner link | Tested (`buildFollowerLinkOwnerUpdate` dedup) |
| 14 | Repeated finalization produces no duplicate follower | Tested (`resolveFollowerFinalizationToken`/`findFollowerLinkForToken`) |
| 15 | Repeated finalization produces no duplicate Items | Direct consequence of #14 — creation is skipped entirely on a token match |
| 16 | Existing-follower update failure restores the complete follower snapshot | Tested (via the fake ActorEngine, including the flags gap) |
| 17 | Follower removal updates both owner projections | Tested (`buildFollowerUnlinkOwnerUpdate`) |
| 18 | Failed Actor deletion restores owner linkage | Tested (via the fake ActorEngine) |
| 19 | No direct `setFlag()` remains in normal follower mutation paths | Enforced by `check-follower-mutation-authority.mjs` check 1 |
| 20 | No direct `actor.update()` remains | Enforced by check 2 |
| 21 | No direct embedded-document mutation remains outside ActorEngine | Enforced by check 4 |
| 22 | Synthetic-token owner/follower mutations target the intended Actor | Unchanged — already covered by Phase 5's synthetic-token-targeting tests; no synthetic-token code touched this addendum |
| 23 | Droid systems and modifiers are materialized once | Verified by code inspection — see "Droid chassis budget" above |
| 24 | Droid chassis cost is resolved once | Verified by code inspection — see "Droid chassis budget" above |
| 25 | Owner credits remain unchanged unless an explicit rule says otherwise | Verified by code inspection — see "Droid chassis budget" above |

## Static guard

`tools/check-follower-mutation-authority.mjs` (new) — 6 checks, scoped to
7 follower mutation service files (not a repository-wide ban): no direct
`setFlag()`/`unsetFlag()`; no direct `actor.update()`; no direct
`actor.delete()`; no direct embedded-document mutation; owner projections
(`system.ownedActors` + `flags.foundryvtt-swse.followers`) must commit in
the same object literal; `createFollowerFromMutation` must route through
`runFollowerMutationTransaction`. All 6 checks were verified by injecting
a fake violation, confirming detection, then reverting and confirming a
clean pass again.

## Validation performed (Node-only — exact counts)

- `node tools/run-rolling-syntax-check.mjs` — 2118 files checked, all pass
  (2 pre-existing, documented, unrelated exclusions).
- `node tools/run-rolling-tests.mjs` — discovered 55, executed 50, **50
  passed, 0 failed**, 5 excluded (pre-existing, documented, unrelated) —
  up from 49, reflecting the one new test file this addendum adds.
- `node tests/follower-droid-context.test.mjs`,
  `follower-step-visibility.test.mjs`,
  `follower-droid-chassis-applicability.test.mjs`,
  `follower-droid-chassis-compat.test.mjs`,
  `follower-mutation-transaction.test.mjs` — all pass individually.
- `node tools/check-follower-droid-chassis-authority.mjs --strict` — 0
  violations (8 checks, unchanged from the prior addendum).
- `node tools/check-follower-mutation-authority.mjs --strict` — **new this
  addendum**, 0 violations across 7 scanned files; all 6 checks separately
  verified to catch injected violations before being reverted.
- `node tools/check-droid-authority-ssot.mjs --strict` — pass (Phase 1,
  unaffected).
- `node tools/check-droid-installation-write-authority.mjs --strict` —
  pass; `follower-creator.js`'s allowlist entry (Phase 2) was re-verified,
  not newly added.
- `node tools/check-droid-calculation-mode-authority.mjs --strict` — pass
  (Phase 3, unaffected).
- `node tools/check-droid-reconciliation-authority.mjs --strict` — pass
  (Phase 4, unaffected).
- `bash tools/check-mutation-paths.sh` — pass.
- `node tools/check-progression-integrity.mjs` — **44 violations**
  (`progression-registry-bypass`: 21, `draft-write-bypass`: 23) —
  **identical to the recorded baseline.**
- `node tools/check-architecture-boundaries.mjs` — **37 violations**
  (`direct-actor-mutation`: 6, `progression-registry-bypass`: 31) —
  **identical to the recorded baseline.** Neither tool's output references
  any file this addendum touched.

## Runtime status

**No live Foundry VTT v13 testing occurred.** Unchanged from every prior
phase's finding: no Foundry installation, license, server, or
`foundryconfig.json` exists anywhere in this repository or container. The
new transaction-coordinator logic is tested at the orchestration level
(mock steps, the existing fake ActorEngine) against the exact sequencing
and rollback shapes the production code uses, but the actual live
behavior of `ActorEngine.updateActor`/`createEmbeddedDocuments`/
`restoreFromSnapshot`/`deleteActor` against a real Foundry world, and the
end-to-end follower creation/update/removal UI flow, remain unverified in
a live client.

## Merge readiness

**CONDITIONALLY READY** — unchanged from every prior phase's assessment,
for the same reason: this addendum's fix is well-covered at the
orchestration-logic Node level (69 new assertions in
`follower-mutation-transaction.test.mjs`, all against the real production
sequencing/rollback shapes and the existing fake ActorEngine) and
introduces zero new integrity/architecture-boundary violations, but merge
readiness cannot become READY while live Foundry v13 runtime verification
remains blocked by this environment's lack of a Foundry installation —
unrelated to and unaffected by this addendum's work. PR #937 remains a
draft.
