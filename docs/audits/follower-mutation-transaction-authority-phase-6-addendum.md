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

## Correction pass

A review of the addendum above found a critical, production-blocking
regression it introduced, plus several real hierarchy/atomicity gaps left
open by the first pass. This section documents both, and is explicit about
which claims below are backed by tests that execute real production code,
which are backed by pure orchestration/builder tests using mock steps, and
which are verified by direct code inspection only — the distinction the
correction review specifically asked this report to stop blurring.

### CRITICAL: undeclared `actorData` — every follower creation was broken

`createFollowerFromMutation`'s preflight block assigned to `actorData = {`
with no `const`/`let`/`var`. `.mjs` files are always-strict ES modules, so
this assignment threw `ReferenceError: actorData is not defined` on every
single call, immediately caught by the preflight's own `catch` and
returned as `null`. **Reproduced directly** (a two-line repro script
throwing the exact same error) before touching any code. No test in the
first pass could have caught this: every test exercised the pure
transaction *coordinator* with mock steps, never the actual
preflight-building logic — and that logic lives inside
`follower-creator.js`, which cannot be loaded through the Node Foundry-shim
at all (confirmed again this session: it transitively imports
`scripts/apps/base/swse-application-v2.js` via `SWSEDialogV2`, which needs
the full `foundry.applications.api` surface the shim does not model).

**The fix is not only the missing declaration.** The entire preflight —
building the follower's `actorData` payload from a mutation bundle, plus
every pure helper it depends on (`_getFixedFollowerProfileFromChoices`,
`_resolveFollowerDroidSystems`, `_resolveFollowerName`, etc.) — moved into
a new module with **zero Foundry-adjacent imports**:
`scripts/apps/progression-framework/adapters/follower-mutation-planning.js`.
`FollowerCreator`'s own static methods became one-line delegates to these
functions, so none of their ~50 existing call sites elsewhere in the file
needed to change. `buildFollowerCreationPreflight(owner, followerMutation)`
is the exact code `createFollowerFromMutation` now calls — not a
reimplementation — so `tests/follower-mutation-planning.test.mjs` directly
imports and executes the real production preflight path.

**Verified the fix closes the actual bug class**, not just this one
instance: temporarily reverted `const actorData = {` back to a bare
`actorData = {` in the new module and re-ran the test suite — it failed
immediately with the same `ReferenceError`, uncaught, crashing the test
run. Reverted and confirmed a clean pass again. This is a genuine
regression test, not a coincidental pass.

### Hierarchy/atomicity gaps closed

1. **Follower-slot mutation moved into the creation transaction.**
   `FollowerShell` used to call a separate, error-swallowing
   `_updateFollowerSlot()` *after* `createFollowerFromMutation` already
   returned success — so a slot-write failure could never surface; the UI
   would report success while the slot's `createdActorId` stayed unset.
   `_updateFollowerSlot()` is deleted entirely (not left as unreachable
   dead code). The slot now commits inside
   `FollowerCreator._linkFollowerToOwner`'s single owner-relationship
   write, alongside `flags.foundryvtt-swse.followers` and
   `system.ownedActors` — all three in one governed `ActorEngine.updateActor`
   call.
2. **`FollowerShell` now respects `updateFollowerFromMutation`'s boolean.**
   The update branch previously called the method and always returned
   `{success: true}` regardless of the result. It now captures the
   boolean and returns `{success: false, error: 'Failed to update follower'}`
   when it is `false`.
3. **Required species materialization is now transactional.** The
   materialize step used to catch a species Item creation failure, log a
   warning, and continue — contradicting the documented guarantee that a
   species failure rolls back creation. For an ordinary species-based
   follower (a species name is present and not suppressed), a missing or
   unresolvable species document now `throw`s, which fails the
   `materialize` step and triggers the `create-actor` step's rollback
   (deleting the follower). The only documented, legitimate skip remains a
   fixed follower profile's `noSpeciesSelection` flag; no other
   "source-only species identity" exception exists anywhere in this
   codebase's data model today.
4. **Removal/unlink now covers all five relationship projections, not
   two.** `removeFollower` previously touched only
   `flags.foundryvtt-swse.followers` and `system.ownedActors`. It now
   also: clears the matching follower slot's `createdActorId` (via the new
   `clearFollowerSlotByActorId`, matched by Actor id since removal doesn't
   necessarily know the slot id); and, on the **unlink-only** path (the
   follower Actor survives), clears the follower's own
   `flags.swse.follower.ownerId` and `system.npcProfile.owner.actorId` so
   a surviving, no-longer-linked follower stops claiming its former owner.
   Both the owner-unlink commit and the second step (delete, or clear
   follower metadata) now run through `runFollowerMutationTransaction`,
   with the owner's complete prior state (all three projections) restored
   if the second step fails.
5. **Owner-linkage rollback is now an explicit, visible coordinator step**
   instead of hidden inside `_linkFollowerToOwner`'s own ad-hoc try/catch.
   `_linkFollowerToOwner` runs two named steps —
   `owner-relationship-commit` (all three owner projections together) and
   `follower-ownership-commit` — through the same
   `runFollowerMutationTransaction` coordinator used everywhere else. On
   failure it throws an `Error` carrying a `.transactionResult` property
   with the full structured result (`failedStep`, `rollbackFailed`,
   `rollbackErrors`), so a caller (e.g. `createFollowerFromMutation`'s own
   "link" step) can inspect exactly what happened instead of only a
   flattened message.
6. **Flag-restoration rollback now deletes newly-introduced keys, not just
   overwrites existing ones.** The prior rollback called
   `ActorEngine.updateActor(follower, {flags: preUpdateFlags})` directly;
   Foundry's `Document#update()` recursively *merges* nested objects by
   default, so passing the complete previous `flags` object only
   overwrites keys present in it — it does not remove a key the failed
   update introduced for the first time (e.g. `flags.foundryvtt-swse.isDroid`
   newly set right before materialization threw). New
   `buildFlagRestorationPatch(previousFlags, currentFlags)` computes an
   explicit patch: restore every previously-existing value, and delete
   every key that's new since the snapshot via Foundry's established
   `'-=key'` deletion-key convention (already used elsewhere in this
   codebase, e.g. `scripts/migrations/phase5-compendium-heal.js` — not
   invented here). **Verified with a test that introduces a brand-new
   nested flag key, rolls back, and asserts the key is `undefined`
   afterward** — using the existing Foundry-shim fake `ActorEngine`,
   narrowly extended (its `setPath` helper now honors the same `'-=key'`
   convention the real `ActorEngine`/Foundry does) to make that assertion
   meaningful rather than passing vacuously.
7. **Idempotency tightened**: stale-token repair and a runtime in-flight
   guard.
   - `buildFollowerLinkOwnerUpdate` now supersedes any existing link
     carrying the **same `finalizationToken`**, not just the same Actor
     id. Without this, recreating a follower for a token whose original
     Actor no longer exists would produce a *new* Actor id, so an id-only
     dedup would leave the stale, orphaned link record in place alongside
     the new one — two records bearing the same token. Verified with a
     test asserting exactly one record survives.
   - `createFollowerFromMutation` now wraps the real creation logic
     (renamed `_createFollowerFromMutationInternal`) with a
     process-local, runtime-only guard keyed by
     `buildFollowerFinalizationGuardKey(ownerActorId, finalizationToken)`:
     a second concurrent call for the same owner/token awaits the first
     call's in-flight promise instead of starting a second creation. This
     is explicitly **not** a persisted lock — the persisted deduplication
     mechanism remains the owner link's `finalizationToken` field, checked
     inside the guarded method exactly as before.

### Droid canonical ledger — deferred, documented, not silently assumed safe

Follower droid creation still seeds only `system.droidSystems` (a
generated projection), never `system.installedSystems` (the Phase 1/2
canonical installation ledger). This remains an already-reviewed, narrow,
explicitly-allowlisted exception in
`tools/check-droid-installation-write-authority.mjs`
(`"one-time follower-creation writer — same reasoning as chargen
finalization"`) — re-verified this pass, not newly added. Unifying this
into one canonical seed planner (`installedSystems` first, `droidSystems`
derived from it) was **not** attempted in this correction pass: doing so
safely would require re-deriving `resolveFollowerDroidSystems`/
`resolveFollowerDroidCredits` against the real installed-systems ledger
shape and re-verifying every consumer of the current projection-only
shape (sheets, `deriveFollowerStats`, `FollowerConfirmStep`), which is a
larger, riskier change than this pass's scope. This is recorded here as
**deferred debt, not resolved** — no diagnostic proving or disproving
whether follower-droid modifiers currently resolve correctly under the
projection-only seed was added either; that remains an open question for
a future pass, not a claim made one way or the other here.

### Coverage, separated by tier

**Direct automated production-path coverage** (imports and executes the
actual code that ships, not a mock or reimplementation):
- `tests/follower-mutation-planning.test.mjs` — `buildFollowerCreationPreflight`
  and every pure helper it depends on, including the exact regression case
  (undeclared-variable class of bug) described above.
- The `-=` flag-deletion assertion in `tests/follower-mutation-transaction.test.mjs`
  (Case 16), which exercises the real `buildFlagRestorationPatch` output
  applied through a shim `ActorEngine` extended to honor the same
  deletion convention the real one does.

**Pure coordinator/builder coverage** (executes real orchestration/builder
logic — `runFollowerMutationTransaction`, `buildFollowerLinkOwnerUpdate`,
`buildFollowerUnlinkOwnerUpdate`, `clearFollowerSlotByActorId`,
`buildFollowerSlotUpdate`, `buildFollowerFinalizationGuardKey`,
`resolveFollowerFinalizationToken`/`findFollowerLinkForToken` — but through
mock `commit`/`rollback` steps or a simulated call sequence shaped exactly
like the real `_linkFollowerToOwner`/`removeFollower`/`createFollowerFromMutation`
code, not the real Foundry-heavy methods themselves):
- `tests/follower-mutation-transaction.test.mjs` (111 assertions) —
  including `simulateLinkFollowerToOwner`/`simulateRemoveFollower` helpers
  that mirror the real methods' exact step names, payload shapes (all
  three owner projections together), and rollback behavior.
- `tests/follower-mutation-planning.test.mjs` (53 assertions total,
  including the direct production-path cases above).

**Source-inspection verification only** (no test executes this; confirmed
by reading the code):
- Chassis-step selection and cancelled chargen perform no Actor mutation
  (unchanged since Phase 6; no chargen step file was touched this pass).
- Natural-weapon materialization's existing per-weapon catch-and-continue
  policy (unchanged, pre-existing, not part of this pass's required/
  optional species distinction).
- Enhancement-application commit policy (unchanged try/catch, runs after
  the link is already committed).
- Droid systems/credits resolved exactly once per finalization path
  (`_resolveFollowerDroidSystems`/`_resolveFollowerDroidCredits` each
  called once); no owner-credit mutation exists anywhere in
  `follower-creator.js` for a droid follower's chassis budget.
- Synthetic-token owner/follower Actor targeting — unchanged, already
  covered by Phase 5's own tests; no synthetic-token code touched this
  pass.

**Live Foundry v13 runtime coverage:** none. Unchanged from every prior
phase's finding — no Foundry installation exists in this repository or
container. Every claim above is exactly as strong as its tier states, no
stronger.

### Static guard: 6 → 10 checks

`check-follower-mutation-authority.mjs` gained four checks for this
correction pass: (7) `_updateFollowerSlot()` must not be reintroduced in
`follower-shell.js`; (8) every `system.ownedActors` assignment must also
assign `flags.foundryvtt-swse.followerSlots` in the same literal; (9)
every `updateFollowerFromMutation()` call site in `follower-shell.js` must
capture its boolean result; (10) `follower-creator.js` must contain the
required-species-throws guard and must not contain a swallowed
species-application catch block. All four were verified by injecting the
exact corresponding violation, confirming detection, then reverting and
confirming a clean pass again — same as the original six checks,
re-verified unchanged.

### Validation performed (Node-only — exact counts)

- `node tools/run-rolling-syntax-check.mjs` — 2120 files, all pass (2
  pre-existing, documented, unrelated exclusions).
- `node tools/run-rolling-tests.mjs` — 51 passed, 0 failed, 5 excluded
  (pre-existing, documented, unrelated).
- `node tests/follower-mutation-transaction.test.mjs` — pass (111
  assertions).
- `node tests/follower-mutation-planning.test.mjs` — pass (53 assertions,
  including the real production-path preflight test).
- `node tools/check-follower-mutation-authority.mjs --strict` — 0
  violations across 10 checks (up from 6).
- `node tools/check-follower-droid-chassis-authority.mjs --strict` — 0
  violations (8 checks, unaffected by this pass).
- `node tools/check-progression-integrity.mjs` — **44 violations** —
  identical to the recorded baseline.
- `node tools/check-architecture-boundaries.mjs` — **37 violations** —
  identical to the recorded baseline.

### Runtime status and merge readiness (unchanged reasoning, corrected verdict)

No live Foundry VTT v13 testing occurred, for the same unchanged
environmental reason as every prior phase. **Before this correction pass,
the branch was NOT READY** — the undeclared-variable bug meant every
follower creation via the mutation path was completely broken in
production, a strictly worse state than "untested." With that fixed and
verified via a real regression test, and the hierarchy gaps above closed,
merge readiness returns to **CONDITIONALLY READY** — blocked only by the
same, unrelated, unchanged lack-of-live-Foundry constraint. PR #937
remains a draft.
