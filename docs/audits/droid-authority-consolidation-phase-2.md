# Droid Stabilization Phase 2 — Installation Write Authority and Projection Reconciliation

This follows `docs/audits/droid-authority-consolidation-phase-1.md`, which
established one canonical droid-part registry and one normalized read model
(`resolveInstalledDroidComponents`) but deliberately did not touch how
droid installation state gets *written*. Phase 1's own "Deferred work"
section named this gap explicitly: "Complete Garage write reconciliation
(install/remove atomically synchronizing `installedSystems`, `droidSystems`,
and embedded Items in one transaction)... it does not touch
`UpgradeService`'s direct `installedSystems` writes." Phase 2 closes that
gap.

## Scope

**In scope:**

- A complete inventory of every live writer to `system.installedSystems`,
  `system.droidSystems`, or a droid-part embedded Item.
- An explicit, documented policy for whether embedded Items are
  authoritative installation records or generated/legacy artifacts.
- Making the Upgrade Workshop (`UpgradeService`) route droid install/remove
  through the same authority the Garage uses
  (`DroidCustomizationEngine.applyDroidCustomization`), instead of writing
  `system.installedSystems` directly.
- Making that authority delete a matching embedded Item whenever a
  canonical part is removed through it, so a removal can no longer leave a
  stale, still-mechanically-active Item behind.
- Rollback on partial failure for the combined system-field + embedded-Item
  mutation.
- Stale-mirror detection and an explicit, GM-invoked (never automatic)
  repair path for drift that already exists on a droid from before this
  phase's code ran.
- A new static guard against a new independent writer reappearing.
- A test suite for the new reconciliation logic, plus a full regression run
  of everything from Phase 1 and the rest of the repo's CI-covered suites.

**Explicitly out of scope** (see "Deferred work"):

- Automatically creating an embedded Item when a system is installed
  through the Garage or Workshop (no current live UI flow expects one to be
  created, so none is fabricated).
- Rewriting chargen finalization or follower creation to also populate
  `system.installedSystems` at creation time (see "Progression/chargen and
  stock-droid paths" below for why).
- Intercepting ad hoc, manual GM creation/deletion of a droid-part Item via
  Foundry document hooks.
- Stock-droid statblock preservation, repair/healing authority, virtual
  attack pipeline unification, the armor-required rule disagreement, and
  retirement of the dead legacy Droid Builder chain — unchanged from
  Phase 1's deferred list.
- Live Foundry v13 runtime verification.

## Writer inventory

Every writer to `system.installedSystems`, `system.droidSystems`, or a
droid-part embedded Item, found by tracing actual mutation call sites (not
assumed):

| Writer | What it wrote (before Phase 2) | Status after Phase 2 |
|---|---|---|
| `DroidCustomizationEngine.applyDroidCustomization` (Garage) | `installedSystems` + `droidSystems` via `TransactionEngine.executeAssetCustomizationTransaction` (snapshot-based rollback) | **Canonical authority.** Now also deletes matching embedded Item(s) on removal, in the same transaction. |
| `UpgradeService.applyUpgrade`/`removeUpgrade` (Upgrade Workshop, droid branch) | `installedSystems[id] = true` directly via `ActorEngine.applyMutationPlan`, bypassing the Garage entirely — **no cost/credit charge, no `droidSystems` mirror, no Item reconciliation** | **Fixed.** Now calls `DroidCustomizationEngine.applyDroidCustomization({ add: [id] })` / `{ remove: [id] }`. `removeUpgrade` keeps a narrow, logged fallback to a raw ledger delete only when the stored key does not resolve against the canonical registry at all (protects a GM's ability to clear malformed/legacy data). |
| `scripts/apps/progression-framework/adapters/default-subtypes.js` (chargen finalization) | Writes the full `droidSystems` object once, at actor creation | **Left unchanged.** One-time creation-time seed, not ongoing installation churn — see reasoning below. |
| `scripts/apps/follower-creator.js` (follower creation) | Writes the full `droidSystems` object once, at follower creation | **Left unchanged.** Same reasoning. |
| `scripts/engine/import/stock-droid-importer-engine.js` (stock-droid import) | Writes `droidSystems` from parsed statblock totals, plus creates integrated weapon Items, at import time | **Left unchanged.** Same reasoning; full stock-droid statblock handling remains a later phase's work per Phase 1. |
| Direct/manual embedded-Item creation or deletion (a GM dragging an item onto a droid actor, or creating one directly) | Not routed through any droid authority at all — ordinary Foundry Item CRUD | **Not intercepted** (no lifecycle hooks added). Detected/repairable after the fact via `reconcileDroidInstallationState`'s diagnose/repair pair — see below. |
| `scripts/domain/droids/droid-modification-factory.js`, `droid-transaction-service.js`, `scripts/apps/droid-builder-app.js` | Would write `installedSystems`/`droidSystems` if reachable | **Confirmed dead code** (same finding as Phase 1: nothing imports `droid-transaction-service.js` or `StockDroidConversionDialog`). Left untouched; allowlisted in the new guard with a comment so it isn't mistaken for a live violation. |

No other writer was found. `scripts/apps/gm-datapad.js` and
`scripts/apps/customization/customization-bay-app.js` read
`droidSystems`/`installedSystems` for display only.

## Embedded-Item authority policy (explicit decision)

**`system.installedSystems` is the single canonical installation ledger.
`system.droidSystems` is a generated, sheet-facing display projection
written by the same operation, for backward compatibility with consumers
that read structured droid-system fields (cost, rating, etc.). Embedded
droid-part Items are NOT authoritative installation records.**

Consequences of this decision:

- The authority (`DroidCustomizationEngine.applyDroidCustomization`) is
  free to delete an embedded Item that represents the same canonical part
  as a component being removed, without that being a loss of authoritative
  data — the ledger entry was the source of truth, and the Item was, at
  best, a redundant mirror of it.
- The authority does **not** fabricate a new embedded Item when a system is
  installed. No currently-live install flow (Garage, Workshop) expects an
  Item to be created, and Phase 1's resolver already treats
  `installedSystems`/`droidSystems`-only components as first-class,
  correctly-resolved components — an Item is not required for a component
  to be mechanically real.
- A GM who manually creates a droid-part Item outside the authority is not
  prevented from doing so, and it is not silently deleted by anything in
  this phase. It becomes a legitimate `embeddedItem` source in the Phase 1
  resolver, exactly as designed. It only becomes a "drift issue" if it ends
  up as the *sole* source for a canonical id with no ledger entry backing
  it (see the reconciler below) — at that point it's flagged for review,
  not silently altered.

This directly answers the confirmed bug from `docs/audits/droid-static-audit.md`
("Garage removal does not reconcile embedded Items"): removal through the
one true authority now closes that gap by construction, for every writer
that goes through the authority.

## Installation transaction: rollback

No new "transaction engine" was introduced (per the standing constraint:
"do not introduce a new droid engine parallel to the existing customization...
engines"). Instead, `DroidCustomizationEngine.applyDroidCustomization`'s
existing call to `TransactionEngine.executeAssetCustomizationTransaction`
was extended: the `assetMutationPlan` it already builds (`{ set: {
'system.installedSystems', 'system.droidSystems' } }`) now also carries a
`delete: { items: [...] }` bucket when a removal has a matching embedded
Item. This was verified against `ActorEngine.applyMutationPlan`'s and
`TransactionEngine`'s actual code (not assumed):

- `TransactionEngine.executeAssetCustomizationTransaction` already
  snapshots the target actor with `SnapshotManager.createSnapshot()` before
  attempting the mutation, and restores that snapshot (`actor.toObject(false)`,
  which includes embedded Items) on any failure. A failure partway through
  — insufficient funds, a validation error, a mutation error — reverts the
  *entire* asset actor, items included, not just the `system` fields.
- `mergeMutationPlans` (used internally by the transaction) already unions
  `delete` buckets across merged plans and detects add/delete and
  update/delete conflicts, so the new `delete` bucket composes safely with
  the existing `set` bucket and the transaction's own audit-trail `set`
  entries.
- `ActorEngine.applyMutationPlan`'s `_applyDeleteOps` already runs delete
  operations (including `'items'` → embedded `Item` documents) as a
  first-class mutation bucket.

No manual snapshot-orchestration code was written; the existing rollback
net already covered this shape once the embedded-Item deletion rode in the
same plan object.

## Stale mirror detection and repair

New module `scripts/domain/droids/droid-installation-reconciler.js`:

- `diagnoseDroidInstallationDrift(resolution)` — pure, zero-import, takes
  the output of `resolveInstalledDroidComponents` and flags any component
  that is mechanically active *only* because of an embedded Item, with no
  `system.installedSystems` ledger entry at all. This is exactly the shape
  a pre-Phase-2 Upgrade Workshop removal (or any other historical path)
  would have left behind: the ledger key was deleted, but the Item wasn't,
  so the Item became the new highest-precedence source.
- `repairDroidInstallationDrift(actor, intent)` — **updated by the P1-6
  correction pass below**; originally took a caller-supplied
  `issuesToRepair` array carrying authoritative embedded Item ids
  directly, now takes intent (`{actorId, selectedIssueIds,
  inspectionRevision}`) and derives every deleted Item id internally.
  Still deletes only via `ActorEngine.applyMutationPlan(actor, { delete:
  { items: [...] } })`. Never a blanket sweep; never applied without the
  caller (a GM, or debug tooling) explicitly choosing which issues to act
  on for one actor.

This is deliberately not automatic and does not migrate every world actor —
consistent with Phase 1's "do not migrate every world Actor automatically
in this phase" constraint, which is treated as still in force. It is wired
into `scripts/debug/droid-authority-diagnostics.js`'s report as
`report.driftIssues`, following the same opt-in, call-it-when-you-need-it
convention as the rest of that module.

### P1-6 — Intent-Based Installation Drift Repair Boundary (correction pass)

**Trigger:** a static review found that `repairDroidInstallationDrift()`
accepted a caller-held array of issue objects, each carrying authoritative
embedded Item ids, and deleted exactly those ids with no verification
that they belonged to the target Actor, were still diagnosed as drift, or
came from a fresh diagnosis at all — turning the repair boundary into a
potentially arbitrary embedded-Item deletion endpoint (a caller could
submit fabricated, stale, or cross-Actor Item ids).

**Former vulnerability:** `repairDroidInstallationDrift(actor,
issuesToRepair)` flattened `issuesToRepair[].itemIds` and deleted them
directly. Nothing tied the ids to `actor`, nothing checked whether the
actor's installation state had changed since the issues were diagnosed,
and an issue object built against one Actor could be handed to the
function for a different Actor with no rejection.

**New intent contract:** `repairDroidInstallationDrift(actor,
{actorId, selectedIssueIds, inspectionRevision})`. The caller may submit
only these three fields — never `itemIds`/`embeddedItemIds`/`itemUuids`/
`uuids` arrays, a mutation plan, a `delete` bucket, or
`installedSystems`/`droidSystems` payloads. Any of those shapes is
detected and rejected outright: "Caller-supplied drift-repair Item IDs
and mutation plans are no longer accepted. Submit repair intent instead."

**Issue-ID design:** new `buildDroidDriftIssueId(issue)` builds a
deterministic id from issue type + canonical component id (e.g.
`orphaned-embedded-item:improved-sensor-package`) — never from embedded
Item ids, so the same unrepaired drift problem always produces the same
issue id across repeated inspections.

**Actor identity enforcement:** `intent.actorId` is compared against
`actor.id` and rejected on mismatch (`DRIFT_REPAIR_ACTOR_MISMATCH`)
before anything else. Actor existence, `type === 'droid'`
(`DRIFT_REPAIR_WRONG_ACTOR_TYPE`), and GM/owner permission
(`DRIFT_REPAIR_PERMISSION_DENIED`) are all independently re-verified
inside the function itself, regardless of any UI-side gating. Unlike
reconciliation (P1-5), drift repair carries no calculation-mode
restriction — it never had one, and none was invented; a mode change
between inspection and apply is still caught because calculation mode is
one of the revision fingerprint's fields.

**Revision/fingerprint design:** new
`scripts/domain/droids/droid-installation-drift-revision.js` —
`buildDroidInstallationDriftRevision(actor, resolution, diagnosis,
buildIssueId)` builds a deterministic fingerprint over: actor id,
resolved calculation mode, `installedSystems` ledger, `droidSystems`
projection, embedded droid-part Item identities, diagnosed issue ids, and
a repair schema version. Volatile fields (HP, token position, chat/window
state, temporary UI selection) are excluded by construction. Reuses new
`scripts/domain/droids/droid-revision-hash.js` (the stable-serialize-
then-hash primitive extracted from P1-5's
`droid-reconciliation-revision.js`) rather than duplicating the hashing
mechanism — the two revision modules' field sets are different, but the
underlying mechanism is identical and now shared.

**Current-state diagnosis:** `inspectDroidInstallationDrift(actor)`
reruns `resolveInstalledDroidComponents()`/`diagnoseDroidInstallationDrift()`
fresh and returns a public view model
(`{actorId, actorName, inspectionRevision, calculationMode, issues, warnings}`)
that never exposes embedded Item ids at all. `repairDroidInstallationDrift()`
reruns this same fresh diagnosis twice: once to validate the caller's
selection against current issues, and again immediately before mutating
(after rereading the Actor from `game.actors`, closing the gap opened by
the snapshot-creation `await`) — a change at either point is rejected as
stale (`DRIFT_REPAIR_STALE`, message: "The droid's installation state
changed after this repair review was opened. Refresh the drift report
before applying repairs.").

**Selection validation:** new `validateDriftRepairSelection()` rejects an
empty selection, unknown issue ids, and anything not present in the fresh
diagnosis — failing the whole request closed rather than silently
dropping invalid entries (`DRIFT_REPAIR_INVALID_SELECTION`).

**Internal Item-id derivation:** new `deriveRepairItemIds(issue, actor)`
independently re-verifies every embedded Item id a diagnosed issue names
directly against the actor's CURRENT `actor.items` — an id only survives
if an Item with that id currently exists on THIS actor and its own
resolved canonical id still matches the issue's canonical id. A mismatch
between the diagnosed count and the verified count aborts the whole
repair (`DRIFT_REPAIR_ITEM_VALIDATION_FAILED`) rather than deleting a
partial, unverified set.

**Repair strategies by issue type:** one narrow internal strategy
function (`buildRepairStepsForIssue`) dispatches on issue type; only one
issue type exists today (`orphaned-active-item-without-ledger-entry`),
whose strategy deletes only the independently-verified orphaned Item(s)
and touches no ledger/projection field. An issue type this switch does
not recognize deletes nothing — there is no "delete everything the issue
mentions" fallback.

**Canonical-ledger policy:** unchanged — `installedSystems` remains the
canonical ledger, `droidSystems` a derived projection, embedded Items
evidence only. Drift repair never accepts caller-supplied
`installedSystems`/`droidSystems` and, for its one existing issue type,
never writes either field (the orphaned-Item issue has no ledger entry to
correct — that absence is exactly what makes it "orphaned").

**ActorEngine mutation path:** validate intent → reread state → confirm
revision → validate selection → reread the Actor from `game.actors`
(TOCTOU) → re-diagnose → independently re-verify derived Item ids →
`SnapshotManager.createSnapshot()` → `ActorEngine.applyMutationPlan(actor,
{delete: {items: [...]}})` → structured result. No new transaction engine
was introduced. P1-7 (snapshot restoration exactness) remains separately
deferred and unchanged by this fix — the snapshot/rollback added here
gives real rollback-on-failure behavior, but its exactness is bounded by
the same full-actor-replace `SnapshotManager.restoreSnapshot()` P1-7
already documents as imperfect; nothing here claims otherwise.

**Structured result shape:** success —
`{success: true, actorId, appliedIssueIds, deletedItemIds,
repairedCanonicalIds, previousRevision, resultingRevision,
mutationSummary}` (or `{success: true, noOp: true, ...}` for a validated
selection resolving to zero deletions, which cannot currently happen for
the one supported issue type). Failure — `{success: false, code, error,
actorId}` with codes `DRIFT_REPAIR_ACTOR_MISMATCH`,
`DRIFT_REPAIR_WRONG_ACTOR_TYPE`, `DRIFT_REPAIR_PERMISSION_DENIED`,
`DRIFT_REPAIR_STALE`, `DRIFT_REPAIR_INVALID_SELECTION`,
`DRIFT_REPAIR_ITEM_VALIDATION_FAILED`, `DRIFT_REPAIR_APPLY_FAILED`,
`DRIFT_REPAIR_ROLLBACK_FAILED`.

**UI/caller migration:** the only production reference to
`repairDroidInstallationDrift()` was a console usage-doc comment in
`scripts/debug/droid-authority-diagnostics.js` (no sheet/controller ever
called it) — updated to submit `{actorId, selectedIssueIds,
inspectionRevision}` via `inspectDroidInstallationDrift()`'s
`issue.issueId`, never `report.driftIssues[0]` (the old shape) or any
Item id.

**Test coverage tiers:**
- (a) pure production-path, zero Foundry dependency:
  `buildDroidDriftIssueId`/`buildDroidInstallationDriftRevision`/
  `normalizeDriftRepairIntent`/`validateDriftRepairSelection`/
  `deriveRepairItemIds` (`tests/droid-installation-drift-repair-intent-boundary.test.mjs`,
  tests 1-10), plus the pre-existing `diagnoseDroidInstallationDrift`
  suite (`tests/droid-installation-reconciler.test.mjs`, unaffected).
- (a) production-path through the Foundry-shim harness: the real
  `inspectDroidInstallationDrift()`/`repairDroidInstallationDrift()`
  executing end-to-end (same file, tests 11-43) — covering valid repair,
  actor-mismatch, non-droid/permission rejection, staleness from ledger/
  projection/Item changes and mode changes, duplicate/unknown/already-
  resolved selections, every old-API rejected shape (`itemIds`,
  `embeddedItemIds`, `itemUuids`, mutation plan, delete bucket,
  `installedSystems`, `droidSystems`), unrelated-Item and cross-Actor
  deletion resistance, concurrent-install/removal staleness, TOCTOU
  re-fetch and "Actor no longer in the world" rejection, revision change
  on success and stale-replay rejection, empty-selection rejection, and
  honest mutation/rollback failure reporting.
- (c) structural: the console usage-doc comment in
  `droid-authority-diagnostics.js` is confirmed (via source inspection —
  the file cannot load in the Node shim harness) to submit intent, not
  raw `driftIssues` entries or Item ids.

**Static guard:** new `tools/check-droid-drift-repair-authority.mjs` (8
checks: identity verification, revision/staleness validation, old-API
rejection, single-API authority, no direct embedded-document deletion,
no caller-held plan/array-literal at call sites, inspection view model
never treated as an Item-id source, no test-shim import in production
code). All 8 verified via inject→detect→revert with byte-identical diffs
after each revert. Deliberately narrow — does not ban `itemIds`
repository-wide (it remains legitimate in `ActorEngine`'s own mutation-
plan shape); the prohibition applies only to the public drift-repair
trust boundary and its callers.

**Live Foundry status:** no live Foundry v13 environment was available in
this session. Nothing in this pass was validated by execution in a
running Foundry client.

P1-6 is removed from any "remaining limitations" note precisely because
the production path (`repairDroidInstallationDrift()`) and its one
caller (a console usage-doc example, now updated) are fully migrated to
the intent contract — no production caller can submit or apply a
ready-made Item-id list anymore.

## Progression/chargen and stock-droid paths — verified, left unchanged

Chargen finalization (`default-subtypes.js`), follower creation
(`follower-creator.js`), and stock-droid import
(`stock-droid-importer-engine.js`) all write a complete `system.droidSystems`
object once, at actor-creation time, and never populate
`system.installedSystems`. This was confirmed by reading each writer's
code, not assumed.

These were deliberately left unchanged rather than folded into the write
authority, for two reasons:

1. **They are creation-time state-seeding, not ongoing installation churn.**
   The "no independent writer" rule exists to prevent *drift* between
   representations of an *existing* droid's installation state. A brand
   new actor has no pre-existing ledger to drift against — there is nothing
   to reconcile.
2. **The Phase 1 resolver already handles a `droidSystems`-only actor
   correctly.** `system.droidSystems` is one of the resolver's four sources
   regardless of whether `system.installedSystems` is populated, so a
   freshly created droid's components resolve correctly (installed, and
   active per their `droidSystems` record) with an empty ledger. Nothing is
   double-counted, mis-classified, or invisible because of this.

Retrofitting these three writers to also populate `installedSystems` at
creation time would make the ledger "complete" from day one, but touches
the progression finalizer (used by every character type, not just droids)
and the follower/stock-import pipelines — a much larger blast radius than
this phase's actual correctness requirement justifies. This is noted as a
possible future polish item, not a defect.

**One consequence worth flagging directly:** because `applyDroidCustomization`'s
removal path starts `installedSystems` from `{ ...(actor.system.installedSystems ?? {}) }`
(whatever is currently in the ledger, which may be empty for a
never-Garage-touched droid) and unconditionally calls
`#applyRemovalToDroidSystems(droidSystems, normalized)` regardless of
whether a ledger entry existed, removing an original chargen-only part
(one that was never in the ledger) already worked correctly before this
phase and continues to. This was verified by reading
`#applyRemovalToDroidSystems`, not assumed.

## Confirmed fixes

- **Upgrade Workshop installs were free.** `UpgradeService.applyUpgrade`'s
  droid branch never charged credits or validated funds. Routing through
  `DroidCustomizationEngine.applyDroidCustomization` now applies the same
  cost/credit transaction the Garage uses. This is a real, user-visible
  behavior change, called out explicitly (same spirit as Phase 1's
  "confirmed, intentional behavior change" for legacy mods).
- **Upgrade Workshop removals gave no resale credit.** Same fix, same
  route — removal now credits 50% resale value like the Garage does.
- **Upgrade Workshop installs/removals never wrote the `system.droidSystems`
  mirror.** Now they do, via the same authority call.
- **Garage/Workshop removal left a stale, still-active embedded Item
  behind** (the original static audit's "Garage removal does not reconcile
  embedded Items" finding) — fixed for every future removal through the
  authority; pre-existing instances of this are diagnosable and,
  optionally, repairable via the new reconciler.
- **A malformed/legacy `installedSystems` key that doesn't resolve against
  the canonical registry could get permanently stuck** (since
  `DroidCustomizationEngine`'s preview step rejects unknown ids) — the
  Workshop's `removeUpgrade` keeps a narrow, logged fallback specifically
  so this doesn't regress a GM's ability to clear such an entry.

## Deferred work

Unchanged from Phase 1, plus:

- Automatic embedded-Item creation on install (no current UI needs it; if a
  future feature wants droid parts represented as real Items, that's new
  scope, not a gap in this phase).
- Foundry Item-lifecycle hook interception for fully automatic drift
  prevention against manual GM edits.
- Backfilling `system.installedSystems` at chargen/follower/stock-import
  creation time (noted above as a possible future polish item).
- Everything else already deferred by Phase 1 (stock-droid statblock
  preservation, repair/healing authority, virtual attack pipeline
  unification, armor-required rule disagreement, legacy Droid Builder
  retirement, full world migration).
- Live Foundry v13 runtime verification.

## Runtime test matrix

All of Phase 1's runtime test matrix still applies. Additionally:

1. **Install a system through the Upgrade Workshop**: confirm credits are
   charged, `system.droidSystems` is updated, and the sheet reflects it
   identically to a Garage install.
2. **Remove a system through the Upgrade Workshop that also has a matching
   embedded Item** (construct this via a macro, since no current UI creates
   such an Item automatically): confirm the Item is deleted and the
   component is no longer active.
3. **Trigger a rollback**: attempt a Workshop install with insufficient
   credits; confirm the actor's `installedSystems`/`droidSystems`/items are
   completely unchanged afterward (no partial mutation).
4. **Pre-existing drift repair**: construct a droid actor with an active
   embedded Item and no matching ledger entry (simulating a pre-Phase-2
   removal); confirm `diagnoseDroidAuthority(actor).driftIssues` flags it,
   and that `repairDroidInstallationDrift(actor, [issue])` deletes exactly
   that Item and nothing else.
5. **Attempt to remove a malformed legacy `installedSystems` key** (one
   that doesn't resolve against the canonical registry) through the
   Workshop: confirm the documented fallback still clears it.
6. **Linked and unlinked token droids**: repeat scenarios 1–2 on both.

## Validation performed (this phase, Node-only)

- `node tools/run-rolling-syntax-check.mjs` — 2092 files, all pass
  (2 pre-existing, documented, unrelated exclusions).
- `node tools/run-rolling-tests.mjs` — 41/41 passed (5 pre-existing,
  documented, unrelated Force-power-track exclusions), including the new
  `droid-installation-reconciler.test.mjs` alongside all of Phase 1's
  droid tests.
- `node tools/check-droid-installation-write-authority.mjs --strict` — new
  guard, passes; verified it actually detects a violation by temporarily
  adding a fake independent writer file and confirming a nonzero exit
  before removing it.
- `node tools/check-droid-authority-ssot.mjs --strict` (Phase 1's guard) —
  still passes, unaffected.
- All 8 pre-existing combat/vehicle SSOT guards — still pass, unaffected.
- `bash tools/check-mutation-paths.sh` — still passes (this phase's only
  new mutation call sites are the embedded-Item `delete` bucket routed
  through `ActorEngine.applyMutationPlan`/`TransactionEngine`, which are
  already-approved mutation authorities, not new direct
  `actor.update()`/`item.update()` calls).

No live Foundry v13 instance was launched. Everything above is Node-only
static/unit verification, same posture as Phase 1.
