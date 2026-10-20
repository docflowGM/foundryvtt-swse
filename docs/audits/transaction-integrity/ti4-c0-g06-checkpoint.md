# TI4-C0 / G06 — Verified rollback outcomes in `ActorEngine.applyMutationPlan({ transactional: true })`

**Status:** bounded production correction, **G06 only**. Evidence is `SOURCE_VERIFIED` plus `TEST_VERIFIED_L1` (offline, one client). No Foundry-runtime claim; no L2/L3 claim anywhere in the code or in the evidence the code emits.
**Authorization:** TI4-C0/G06 directive following the certified TI-4 Phase 0 (#1062 `d7b9d84e0`) and TI4-A (#1063 `3dc3ac221`, CI run 39458445863 success).

## 1. Base and branch

| Item | Value |
|---|---|
| Base (lineage B, verified equal to the accepted head before branching) | `audit/ti3-progression-followers-approvals` @ `4e51a15654adddae27da7e8a9ca1dda735771dd4` (PR #1061) |
| G06 branch | `audit/ti4c0-g06-rollback-verification` |
| Draft PR | targets the lineage B branch (number and final commit SHA in the hand-off message) |
| Not used as a base or merged | `main`, #1062, #1063, lineage A. The TI4-A specifications were referenced, not cherry-picked |

## 2. The defect (reproduced)

`ActorEngine.applyMutationPlan` (`scripts/governance/actor-engine/actor-engine.js`, catch block formerly lines 3106–3146) awaited `this.restoreFromSnapshot(...)` and **discarded its structured result**. It logged "rolled back to pre-plan snapshot" for **any** resolved promise, and set `partialMutationPossible` **only** when the restore *threw*. Consequences, each reproduced by a failing test on the unmodified base:

- a restore returning `{success:false}` was logged as a successful rollback and the error carried no flag;
- a restore returning `{success:true, exact:false}` (which is what every restore from this method's snapshot returns, see §6) was logged as a rollback;
- a malformed/undefined restore result was treated as success;
- the CREATE-bucket cleanup treated a resolved `Actor.deleteDocuments` as proof of deletion and never combined its result with the target restore into one verdict;
- `ProgressionFinalizer` and `LightsaberConstructionEngine` reduced every failure to a plain `{success:false}` / `"mutation_failed"`, and the lightsaber workbench told the player "No item was created and credits were not deducted" regardless.

## 3. Fail-before evidence

`tests/ti4c0-g06-rollback-verification.test.mjs` (now 40 checks, 31 at first submission; a recording runner so each case's result is visible).

| Run | Result |
|---|---|
| **Against the unmodified lineage B base `4e51a1565`** (tests only added) | **5 / 30 passed, 25 FAILED** (the workbench check was added after this capture, as the 31st). The 5 that passed are exactly the *unchanged-behavior* guards: plan success, non-transactional failure, failure before the snapshot, no replay, and the progression caller's no-evidence shape |
| After the correction | **31 / 31 passed** |
| Mutation check (5 injected defects in the new code: ignore `exact`; trust a resolved delete; ignore created actors in the verdict; set the flag only on a throw; replace the error object) | **each caught** (25, 29, 29, 22 and 25 of 31 passed respectively) |

## 4. Injected restoration failures and observed outcomes (real `ActorEngine`, real catch block)

| Injected | Outcome | `compensation` | `partialMutationPossible` | "rolled back" logged |
|---|---|---|---|---|
| restore `{success:false, exact:false}` | `INDETERMINATE` | `FAILED` | `true` | no |
| restore `{success:true, exact:false}` | `INDETERMINATE` | `INEXACT` | `true` | no |
| restore throws | `INDETERMINATE`; restore error recorded in `rollback.target.restoreError` | `FAILED` | `true` | no |
| restore returns `undefined`, `null`, a string, `{}`, `{success:"yes"}`, `[]` | `INDETERMINATE` (`MALFORMED`) | `FAILED` | `true` | no |
| restore `{success:true, exact:true}`, nothing created | **`FAILED_COMPENSATED`** | `EXACT` | not set | once |
| restore exact; CREATE cleanup throws and actors remain | `INDETERMINATE` | `PARTIAL` | `true` | no |
| restore inexact; CREATE cleanup verified | `INDETERMINATE` | `PARTIAL` | `true` | no |
| restore exact; delete call *resolves* but the actors remain in the registry | `INDETERMINATE` (`created.stillPresent` listed) | `PARTIAL` | `true` | no |
| restore exact; CREATE cleanup verified absent | **`FAILED_COMPENSATED`** over both parts | `EXACT` | not set | once |
| restore exact; delete call throws (lost acknowledgement) but the registry shows the actors gone | `FAILED_COMPENSATED`; the delete error is still recorded (`created.error`) | `EXACT` | not set | once |
| both restore and cleanup fail | `INDETERMINATE` | `FAILED` | `true` | no |

In every thrown case the **original error object is propagated** (identity preserved, asserted with `===`); only a non-object throw (a string) is wrapped, with the original in `cause`.

## 5. What the correction does

`applyMutationPlan` (signature, successful-plan behavior and non-transactional behavior unchanged; its docblock no longer says "atomic"):

1. On a transactional failure that occurred **after** the snapshot was taken, it calls a new internal `ActorEngine._rollbackTransactionalPlan(...)` and attaches the result to the thrown error as `rollback` (machine-readable), `rollbackOutcome`, and — unless the outcome is `FAILED_COMPENSATED` — `partialMutationPossible: true`.
2. **Target restore** is judged from the structured result, never from the promise: `EXACT` = `success===true && exact===true`; `INEXACT` = success without exact; `FAILED`; `MALFORMED` (not an object with a boolean `success`); `THREW`.
3. **CREATE-bucket cleanup** is judged by **observed state only** (corrected in review, §5a): after `Actor.deleteDocuments`, each id is looked up in `game.actors`; a resolved call with the actor still present is unverified; a thrown call with the actor verifiably gone is effective (the error is still recorded). **If the registry cannot be observed, the cleanup is UNVERIFIED** — the ids the delete call returned are kept as diagnostic evidence only.
4. The **verdict covers the whole scope**: `FAILED_COMPENSATED` only when the target is `EXACT` **and** every created actor is verified absent; otherwise `INDETERMINATE` with `compensation` one of `EXACT` / `INEXACT` / `PARTIAL` / `FAILED` and `reasons[]`.
5. "Rolled back" is logged only for `FAILED_COMPENSATED`; otherwise an error line says the rollback was **not verified**.
6. Nothing is replayed: each stage, the restore and the delete run once (asserted). `level: 'L1'` is the only level the evidence states.

Not changed: the snapshot format, `SnapshotService`, ordering of plan stages, `recalcAll`, validation, the non-transactional path, or any other caller.

## 5a. Independent review correction 1 (PR #1064 reviewed at `8b8ca4ed4`; CI 39465182871 success) — applied

Two edge cases in `_rollbackTransactionalPlan` undermined the verification guarantee:

- **R1 — fallback treated returned ids as proof.** When `game.actors.get` was unavailable the helper marked cleanup verified if `Actor.deleteDocuments` returned every requested id; with an exact target restore that could yield `FAILED_COMPENSATED` without observed cleanup. **Corrected:** with no readable registry the created actors are `unverifiable`, `verifiedAbsent` is `false`, the outcome is `INDETERMINATE` (`compensation: PARTIAL`, reason `created-cleanup-unverified`), and `created.returnedIds` is kept as **diagnostic evidence only**. A registry with a non-callable `get` is the same case.
- **R2 — an unguarded registry read could replace the original error.** **Corrected:** every `registry.get(id)` is guarded individually and so is reading `game.actors` itself; a failure is recorded in `created.registryErrors` (`{id, error}`) and the id becomes `unverifiable` while the other ids are still observed (`created.absentIds`, `stillPresent`). The outcome is `INDETERMINATE`, `partialMutationPossible` is `true`, nothing verified-rollback is logged, and the **original mutation error object is the propagated error** (identity asserted). As a defense in depth the call to the helper in `applyMutationPlan` is itself guarded: if verification fails unexpectedly the error still propagates with `INDETERMINATE` evidence (`reasons: ['rollback-verification-threw']`, `verificationError` kept). Nothing is re-run: the failed stage, the restore and the delete each execute once.

Evidence added to `created`: `registryAvailable`, `absentIds`, `stillPresent`, `unverifiable`, `registryErrors`, `returnedIds` (diagnostic). Normal successful verification (registry readable, all absent, exact target) is **unchanged** (`FAILED_COMPENSATED`).

Fail-before on the reviewed head `8b8ca4ed4`: **8 of the 9 new checks fail** (the ninth — registry unavailable and the delete call throws — already ended `INDETERMINATE` and is a regression guard); the other 32 pass. After: **40 / 40**. Five injected defects in the new logic (trust returned ids; ignore unverifiable lookups; let a helper failure replace the error; let a lookup error escape; let a registry-access error escape) are each caught.

## 6. Remaining limitation — the transactional snapshot is legacy (needs a separate decision)

`applyMutationPlan` snapshots with `actor.toObject(true)`. That object has no `schemaVersion`, so `SnapshotService.restoreFromSnapshot` classifies it **legacy** and by construction returns `exact: false` — even when the restore wrote everything back and the content verification matched (`verification.rootMatched/itemsMatched/effectsMatched`). Per the directive, exactness is **not manufactured**, `requireExact` is **not** passed (with a legacy snapshot it would trigger the service's compensation pass and could undo a good restore), and no snapshot migration is made.

**Consequence the reviewer must weigh:** with the snapshot as it is, a transactional failure can **never** reach `FAILED_COMPENSATED` in production through the real `SnapshotService`; every such failure is reported `INDETERMINATE` (`legacySnapshot: true`, `compensation: 'INEXACT'` or `'PARTIAL'`), even if the actor was in fact restored. That is the honest state of the evidence, and it is a visible behavior change for progression finalization failures and lightsaber mutation failures (§7). The evidence records `target.contentVerified` (true when content verification matched), so a later decision can see how often a restore was in fact content-equal.

**Separate dependency (not authorized here):** capture the transactional snapshot as a schema-v2 snapshot (`schemaVersion`, `actorId`, `scope`) without persisting it, so the existing exactness verification can honestly return `exact:true`. This is a snapshot-format change and is documented as its own work item, not part of G06.

## 7. Callers

**`ProgressionFinalizer._applyMutationPlan`** (`progression-finalizer.js`): when the error carries rollback evidence it returns `{ success:false, error, rollbackOutcome, rollback }`; when the outcome is not `FAILED_COMPENSATED` it also returns `indeterminate: true`, `partialMutationPossible: true` and an `error` message that says the rollback could not be verified and the character may be partially modified (the existing UI already shows `result.error`; `finalize` and `finalizeSingleStep` pass the result through unchanged). No post-apply sync runs after a failed plan (tested). The comment claiming a failed finalize "should leave the actor unchanged" is corrected. Progression entitlements, level-up rules, synchronization and sequencing are untouched; a failure with no evidence keeps the original `{success:false, error}` shape.

**`LightsaberConstructionEngine`**: the mutation catch calls a new `mutationFailureResult(err, roll)`. The existing `reason: "mutation_failed"` is kept; the result adds `rollbackOutcome` and `rollback`; when the rollback is unverified it is also `indeterminate: true`, `partialMutationPossible: true`, and carries the **original check result** (`finalDc`, `rollTotal`, `modifier`, `rollRaw`, `checkMode`) and `attemptedCost`. The catch performs no roll, no plan, no retry (asserted on the source). Eligibility, prices, expenditure timing, DCs, time, failed-check rebuilding and attunement are untouched; **OD-5 / DI-1 (component expenditure) is not touched**.

**Directly misleading message (authorized correction):** `ItemCustomizationWorkbench._getLightsaberResultView` appended "No item was created and credits were not deducted" to every failed result. For an `indeterminate` result it now shows title "Construction Uncertain" and a message saying the rollback could not be verified, the check result is preserved, and not to retry or roll again until a GM has checked. This is a one-branch message change, not a UI redesign; flagged here because the workbench is a consumer of the lightsaber engine, not one of the two named callers.

Limits (documented, not built): no durable record survives a reload and there is no reconcile operation, so the player/GM can only be *told* the outcome is uncertain; recovery guidance beyond that message needs the receipt/reconciliation work (DI-3, DI-4) that is not authorized.

## 8. Changed files

| File | Change |
|---|---|
| `scripts/governance/actor-engine/actor-engine.js` | `applyMutationPlan` catch block + new `_rollbackTransactionalPlan`; docblock corrected |
| `scripts/apps/progression-framework/shell/progression-finalizer.js` | `_applyMutationPlan` catch carries rollback evidence; two comments corrected |
| `scripts/engine/crafting/lightsaber-construction-engine.js` | `mutationFailureResult` + the mutation catch; one comment corrected |
| `scripts/apps/customization/item-customization-workbench.js` | `_getLightsaberResultView` indeterminate branch (message only) |
| `tests/ti4c0-g06-rollback-verification.test.mjs` | new (31 checks) |
| `docs/audits/transaction-integrity/ti4-c0-g06-checkpoint.md` | this file |

No existing test was edited or weakened (§9 records the rolling-suite result).

## 9. Verification (local; exact-head CI is recorded in the hand-off message)

| Check | Result |
|---|---|
| G06 test file | **40 / 40** (first submission 31 / 31 with fail-before 5 / 30 on the base, §3; correction 1: fail-before 8 of 9 new checks fail on `8b8ca4ed4`, §5a) |
| Rolling suite (`node tools/run-rolling-tests.mjs`) | **384 passed, 0 failed** (5 documented exclusions); lineage B's accepted suite was 383, plus this file; no existing test edited |
| Affected suites inside it | the TI-3 progression/approvals/follower tests, the progression and customization-bay tests and the equipment/crafting tests all pass unchanged |
| Repo guards (27 CI commands + partials + `system.json` + syntax sweep) | **26 pass locally**; syntax sweep 2,877 files pass |
| Guard that fails **only in this local git worktree** | `node tools/migrate-phase-5c-weapon-references.mjs --check` → `ENOTDIR` on `<worktree>/.git/index` (a worktree's `.git` is a file). **Not reported as locally passing**; it is a step of the exact-head CI workflow |
| `git diff --check` | clean |

## 10. Not done (by directive)

G11, G16, G20, G21, G22, G24, G26, G34, G35; TI4-B identity/replay; TI4-C authority enforcement; a new transaction service or receipt ledger; a snapshot-service redesign or snapshot-format migration; a generalized reconciliation operation; lightsaber component-expenditure changes; D-005; branch integration; merges. Stopped for independent review.
