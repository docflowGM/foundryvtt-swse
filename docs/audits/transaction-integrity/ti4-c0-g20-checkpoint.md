# TI4-C0 / G20 — Rollback replay guard (checkpoint)

Base: PR #1067 (`audit/ti4c0-g16-credit-transfer-evidence`) at the certified head `acb3525fa3655c3d4b2eada7fc826ddb11f5978b`. Stacked draft PR; earlier branches unmodified.
Evidence level: **L1** (offline, single client, real `TransactionEngine.executeRollbackCorrection` over an in-memory actor model). No L2 (cross-client coordination) or L3 (durable recovery/reload) claim. No rules decision was needed.

## 1. Defect (verified on the base head)

`executeRollbackCorrection()` took only an in-memory same-actor lock and then built its plan unconditionally. Calling it twice with the same `sourceTransactionId` therefore applied the credit adjustment twice, deleted the owned Items named in the second call, wrote a second `Rollback` record and **overwrote the source record's `rolledBackByTransactionId` / `rolledBackAt` / `rollbackReason`**. Demonstrated on the base head: after one rollback (credits 900 → 1000), a second call returned `success:true`, credits became **1100**, a second Rollback record existed, and the source pointed at the second rollback. The only protection was the dashboard's UI-computed `canRollback`.

## 2. Source preflight findings

| Question | Finding |
|---|---|
| Authoritative record | The stored audit record `flags.foundryvtt-swse.transactions.<id>` on the actor (key == record id; `getActorTransactions` reads the same map and normalises `status` default `Success`). The only writer of `status:'Rolled Back'` is this method's own `set` plan. |
| Only production caller | `GMStoreOperationsService.rollbackTransaction` (`:272`), which passes the id from a rendered/normalised transaction row and gates on `transaction.canRollback`. No other caller passes a source id; the legacy dashboard (`gm-store-dashboard.js:~414`) calls `executeCreditAdjustment` and never marks the source (that is G21, out of scope). |
| Missing / malformed source id | **The engine accepted any nonempty id.** A well-formed id with no record made the `set` plan write `flags.foundryvtt-swse.transactions.<id>.status/rolledBackBy…/rollbackReason/rolledBackAt`, silently **materialising a stub source record**; an id containing `.` nested the path; `__proto__`-style ids targeted prototype properties. |
| Legitimate source-less calls | `sourceTransactionId` is optional (`''` default → `rollbackOf: null`, no source `set` paths). Preserved unchanged; no source lookup is made. |
| Await between guard and mutation | After the lock and the guard the method awaits a dynamic import and `SnapshotManager.createSnapshot` before `applyMutationPlan`. The status is therefore read again immediately before applying. |
| Existing tests | No test called `executeRollbackCorrection` before; `ti2-commerce-integrity` (credit adjustment/transfer) is unaffected. |

## 3. Change (`scripts/engine/store/transaction-engine.js` only)

- New private pure-read helper `#sourceRollbackRefusal(actor, sourceTransactionId)` reading the **live actor's** stored record (never a caller object or `canRollback`). Returns `null` (proceed) or a refusal:
  - `SOURCE_TRANSACTION_ALREADY_ROLLED_BACK` (record `status` is `Rolled Back`, case-insensitive) — also returns `alreadyRolledBack:true` and the first rollback's `rolledBackByTransactionId`;
  - `SOURCE_TRANSACTION_NOT_FOUND` (nonempty id, no own record), `SOURCE_TRANSACTION_MALFORMED` (record not a plain object), `SOURCE_TRANSACTION_ID_INVALID` (not a string, untrimmed/empty, contains `.`, or a prototype property).
- `executeRollbackCorrection`: the guard runs **inside the existing lock, first thing in the `try`**, before any snapshot or mutation; a refusal returns `{success:false, transactionId, code, error, …}` without `rollbackFailed`/`indeterminate` (nothing was attempted) and the existing `finally` releases the lock. The status is re-read right before `applyMutationPlan` (after the awaited snapshot): a late refusal also writes nothing, though the snapshot that was already taken remains.
- Unchanged: the successful plan (credits + item deletes + source audit `set`), the recovery snapshot/restore and its `rollbackFailed` evidence, source-less corrections, hooks (no hook on refusal).
- Out of scope and untouched: G21's legacy dashboard reroute, `GMStoreOperationsService`, G22/G24/G26/G34/G35, TI4-B/C.

## 4. Tests — `tests/ti4c0-g20-rollback-replay.test.mjs` (15 checks)

Real `TransactionEngine.executeRollbackCorrection` and `LedgerService`; the shim's `ActorEngine.applyMutationPlan` is replaced by a model applying `set` and `delete.items`; snapshots are in-memory; the actor's `flags` getter records whether it is read while the engine's rollback lock is held.

**Fail-before** (base head): 4 of 15 passed. Duplicate reversal shown directly: second call `success:true`, credits 1100, Items deleted, second Rollback record, first rollback metadata overwritten. **After:** 15/15.
Coverage: first rollback once; second refused with credits/Items/records/first rollback's id+timestamp+reason+status untouched, no plan applied, no hook, no extra snapshot; stale caller actor; caller `canRollback:true`; lock released and an independent rollback still works; source-less corrections unchanged (no stub record); missing / `a.b` / `__proto__` / non-string ids and a non-object record fail closed with no write and no stub; normal rollback failure keeps its evidence (`rollbackFailed`, restored credits, source not marked, rollback retryable); the status is read under the lock and never outside it; late re-read catches a rollback landing during the snapshot await and preserves the other rollback's metadata; the lock still excludes a concurrent rollback.

Mutation checks (each reverted): guard removed → 11 failures; trusting caller `canRollback` → 1; guard moved before the lock → 1; replay refusal still rewrites rollback metadata → 1; late re-read removed → 1; missing source allowed → 1.

## 5. Verification

G20 15/15; `ti2-commerce-integrity` passes; G06 40/40, G06-S1 50/50, G11 (21 + 10), G16 21/21 regressions run in the rolling suite. Rolling suite `Result: 389 passed, 0 failed (of 389 run; 5 excluded as documented pre-existing failures)`; guards 26 of 27 pass locally; `validate-partials`, `system.json` parse and the rolling syntax check (2882 files) pass; `git diff --check` clean. The guard `node tools/migrate-phase-5c-weapon-references.mjs --check` crashes only in a local git worktree (`ENOTDIR … .git/index`) and is verified in exact-head CI, not reported as locally passing.

## 6. Remaining limitations (not certified)

- **L1 only.** The lock is a process-local `Set` and the status check is read-then-write on the live document; another client (or a hook) that commits a rollback between the late re-read and `applyMutationPlan` is not detected — there is no compare-and-swap. No cross-client coordination (L2) and no durable recovery or receipt (L3).
- A rollback whose plan **partly applied and then failed uncertainly** still reports its existing `rollbackFailed` evidence; this checkpoint does not make that recoverable.
- The late-refusal path leaves one unused recovery snapshot (taken before the re-read); it mutates nothing.
- Behaviour change to note: a nonempty source id with no matching record (including a legacy record whose key differs from its id) is now refused instead of silently creating a stub record; a GM must handle such a transaction through a source-less correction.
- A source already reversed by another route that does not mark `status:'Rolled Back'` (the legacy dashboard, G21) is not detected here.
- Live Foundry behaviour is not established by the offline model.
