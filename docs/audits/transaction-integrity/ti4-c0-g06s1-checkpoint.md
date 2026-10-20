# TI4-C0 / G06-S1 — Exact Transactional Snapshot Certification (checkpoint)

Base: PR #1064 (`audit/ti4c0-g06-rollback-verification`) at the accepted head `9281956f42039e9d6315ce1b23c2fb782da17ad6`. This PR targets that branch; the G06 branch is not modified.
Evidence level: **L1** (offline, single client, real modules, Foundry shim). No L2 (verified cross-client coordination) or L3 (durable recovery after reload/interruption/lost acknowledgement) claim, per the accepted TI-4 hierarchy. Rules: none touched.

## 1. What changed (smallest change)

| File | Change |
|---|---|
| `scripts/governance/snapshot/snapshot-service.js` | New `static captureExactSnapshot(actor)` that **delegates to the existing `captureSafetySnapshot()`** (the schema-v2 capture the service already uses for its own pre-restore safety snapshot). No check in `restoreFromSnapshot` is relaxed or altered. No persistence. |
| `scripts/governance/actor-engine/actor-engine.js` | `applyMutationPlan({transactional:true})` captures with `SnapshotService.captureExactSnapshot(actor)` instead of `actor.toObject(true)`. `_rollbackTransactionalPlan` adds an **identity certification** and a **contradiction downgrade** (§4). Docblocks corrected. |
| `tests/ti4c0-g06s1-exact-snapshot.test.mjs` | New: 43 real-module checks (§5). |
| `tests/ti4c0-g06-rollback-verification.test.mjs` | One justified change (§6). |

No new snapshot service, ledger, receipt or persisted state. `SnapshotManager` (which persists a ≤10-entry ring in `flags.foundryvtt-swse.snapshots`) is not used.

## 2. Source inspection — the exact schema

`captureSafetySnapshot` / `SnapshotService.restoreFromSnapshot` define schema **v2**, scope `full-actor`:

`actorId`, `schemaVersion: 2`, `scope: 'full-actor'`, `name`, `img`, `system`, `flags`, `ownership`, `prototypeToken`, `items[]` (Item source incl. `_id`), `effects[]` (ActiveEffect source incl. `_id`).

The restoration plan (`snapshot-restoration-plan.js`) reads/writes exactly: name, img, system, flags (excluding the protected paths `foundryvtt-swse.snapshots`, `swse.snapshots` and the target-conversion reservation flag), ownership, prototypeToken, and Items/Effects diffed **by `_id`** (id-less documents are skipped). Verification re-reads the Actor and compares root/system/flags/ownership/prototypeToken and Item/Effect ids + content (`_stats` excluded). `exact = !isLegacy && idsPreserved && rootMatched && itemsMatched && effectsMatched`.

**Why adding three metadata fields to `actor.toObject(true)` was not the change.** `toObject(true)` is source data; the service compares against `actor.system` (prepared) and restores against the same representation. Using the service's own capture keeps capture, restore and verification in one representation. `toObject(true)` also carries `_id`, `type`, `folder`, `sort`, `_stats`, which the restoration plan never reads or writes. Test 2c pins the out-of-scope set to exactly `_id`, `folder`, `sort`, `type`.

## 3. Proof the snapshot covers its declared scope

Test 2 damages root name/img, `system` (changed, added, deleted fields), `flags` (changed, added; protected snapshot-history flag untouched), `ownership`, `prototypeToken`, and Items/Effects (updated, deleted, added) inside a real transactional failure; the real service restores and the whole view is deep-equal to the pre-plan view with stable `_id`s. Test 2b asserts the snapshot's keys, ids and that it is a deep copy (later mutation does not alter it). Test 11: no `setFlag`, no write to a `snapshots` path, ring unchanged — the capture is in-memory only.

## 4. Engine-side certification (not relaxing the service)

`SnapshotService` matches embedded documents by `_id`, silently skips id-less ones, and defaults a missing `items`/`effects` array to `[]` (which deletes the Actor's existing embedded documents and then "verifies" against the empty list). `_rollbackTransactionalPlan` therefore refuses to certify exactness unless the snapshot carries `items`/`effects` **arrays** (as its scope requires) whose documents each have a unique non-empty string `_id` (reason `snapshot-identity-incomplete`). An `id` alias is not accepted: the service never matches on it.

It also requires **positive** verification: an `exact:true` result is certified only if its `verification` object affirms `rootMatched`, `itemsMatched` and `effectsMatched` each `=== true`; an absent, malformed, empty or partial verification object is not verification (`exactDowngraded`). Both rules only ever move toward `INDETERMINATE`; `SnapshotService` is unchanged by this correction.

*Review correction 1 (R1–R3):* R1 and R2 above were tightened after independent review of `ddfa150fa` (the first version accepted an `id` alias and absent arrays, and downgraded only on a reported contradiction); R3 corrected the level terminology in §8. Fail-before for the correction: 36/43 (7 failed: missing `items`, missing `effects`, two `id`-alias cases, three absent/malformed/empty verification cases).

`requireExact:true` is **not** used: on an inexact result the service runs compensation that restores its pre-restore safety snapshot, i.e. it would revert the rollback attempt to the failed post-plan state — destructive and unnecessary, because the helper already reads the structured `exact` verdict.

## 5. Tests (real `ActorEngine`, real `SnapshotService`; only plan stages and the shim's document mutators are injected)

Fail-before on the accepted G06 head (24 checks existed at that run): **14 passed, 10 failed** — failures: 2, 2b, 2c, 6 (×3), 8, 8b, 11, 12 (all because the captured snapshot was legacy or identity was not certified). Output kept at `/tmp/s1-fail-before.out` (not committed). Checks 6b and 14a–14c were added afterwards and have no separate fail-before run.
After: 43/43 (28 original + 15 review-correction checks). Mutation checks (each reverted): restoring `actor.toObject(true)` → 8 failures; removing the identity check → 3 failures; removing the contradiction downgrade → 1 failure; after correction 1: accepting absence-of-contradiction as verification → 2 failures; accepting an `id` alias → 2 failures; making the arrays optional → 2 failures.

Coverage of the requested cases: 1 legacy restores content but `exact:false`; 2 v2 → `FAILED_COMPENSATED`/exact; 3, 3b wrong/missing actor identity rejected before mutation (no mutator called, actor untouched); 4, 4b unsupported schema/scope; 5, 5b, 5c root, embedded-content and id-preservation differences detected; 6 id-less Item/Effect and duplicate ids not certified; 7, 7b interrupted restoration (incl. failed service compensation) never compensated; 8, 8b CREATE-bucket actors remain part of the whole-scope verdict; 9 original error object retained; 10, 10b success and nontransactional paths unchanged (no capture, no `toObject`); 11 no persisted write; 12 each stage runs once, one `Actor.deleteDocuments`, no re-apply; 13 capture failure aborts before any stage; 14a–c callers (`ProgressionFinalizer`, `LightsaberConstructionEngine`) with the real restore: exact → ordinary failure with `FAILED_COMPENSATED`; inexact → indeterminate warning + original roll preserved. The 40 G06 tests are retained (§6).

## 6. Existing-test change (justified)

`ti4c0-g06-rollback-verification.test.mjs`, case "the transactional snapshot is a LEGACY snapshot…": it asserted that `applyMutationPlan` *captures* a legacy snapshot — the exact limitation S1 removes. The rule it guards (a legacy snapshot given to the rollback helper can never verify exact) is unchanged, so the case now passes an explicit legacy snapshot to `_rollbackTransactionalPlan` and asserts the same `legacySnapshot:true` / `INDETERMINATE` outcome. 40/40 pass; nothing else edited.

## 7. Verification

- New: 43/43. G06: 40/40. Rolling suite: `Result: 385 passed, 0 failed (of 385 run; 5 excluded as documented pre-existing failures)`.
- Guards (27 commands): 26 pass locally. `node tools/migrate-phase-5c-weapon-references.mjs --check` crashes **only in this worktree** with `ENOTDIR … .git/index` (worktree `.git` is a file); it is **not** reported as locally passing and is verified in exact-head CI. `validate-partials`, `system.json` parse, and the rolling syntax check (2878 files) pass. `git diff --check` clean.

## 8. Remaining limitations (do not read as certified)

- **L1 only.** Same-client, no CAS, no multi-document atomicity. Another client or hook mutating the Actor between the failure and the restore is not detected.
- **Live Foundry document-model limitation (a prerequisite to any runtime certification of this rollback; it is not a TI-4 level):** exactness is judged in the service's representation — prepared `actor.system` and the fields above. Whether restoring prepared values through `ActorEngine.updateActor` leaves source data identical, whether derived-only keys are dropped/stripped by the data model, how Foundry-managed `_stats` and hook-driven side effects behave on the re-created Items/Effects, and whether `keepId` is honoured for every embedded type are **not** established by the shim. Real-Foundry testing is outside L1.
- **L2 (cross-client coordination):** none. No guard here coordinates clients.
- **L3 (durable recovery/reload):** none. The snapshot is in memory only; nothing survives a reload, crash or lost acknowledgement, and no receipt exists.
- Fields outside `full-actor` scope (`_id`, `type`, `folder`, `sort`, `_stats`) are not captured or restored; documents outside the Actor (world Items, Journals, other Actors except CREATE-bucket cleanup) are out of scope.
- Hooks/side effects fired by the failed plan or by the restore itself (sockets, chat, other documents) are not undone or observed.
- Capture is synchronous deep-copy of the whole Actor on every transactional plan (cost proportional to actor size); a capture failure now fails the plan before it starts (nothing applied).
- Receipts, reconciliation, G11/G16/G20–G22/G24/G26/G34/G35, OD-5/DI-1 and all rules decisions are untouched. No rules question arose; none added to the decision register.
