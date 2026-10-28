# TI4-C0 — `TransactionEngine.executeCreditAdjustment` failure contract (dependency of G22)

Branch `audit/ti4c0-te-credit-adjustment-safety`, cut from `main` @ `882643a9dd3c1e09e2278f991937c32e36e21f3b`. Level: **L1 only** (offline, one client). Not exactly-once, no L2/L3.

## 1. Defect

`executeCreditAdjustment` created its rollback snapshot best-effort: a snapshot failure was logged and the adjustment **continued without one**. `ActorEngine.applyMutationPlan` is called non-transactionally; `_applySetOps` commits `system.credits` and the transaction flag in one `actor.update`, and *afterwards* (`rederive`, default `true`) `recalcAll` runs and can throw. With no snapshot the `catch` had nothing to restore from and returned a plain `{ success:false, transactionId, error }` — although the credits had already moved. Callers (including G22's refund retry) read that as "definitely not applied".

Reproduction (real `TransactionEngine`, snapshot create throwing, model `applyMutationPlan` that commits then throws): `success:false`, actor credits 900 → 1000. The shim replaces the real `ActorEngine`, so the real `applyMutationPlan` ordering is established by reading `actor-engine.js`, not by executing it. Not reproduced in live Foundry.

## 2. Change (`scripts/engine/store/transaction-engine.js`, `executeCreditAdjustment` only)

- The rollback snapshot is a **precondition**. If creation throws, or yields nothing, the adjustment is refused **before** the credit mutation begins: definitive `{ success:false, transactionId, error }` (no `indeterminate`, nothing moved).
- A `mutationStarted` flag marks the call to `applyMutationPlan`. A failure *before* it (credit read, etc.) is a definitive failure with no restore attempted.
- A failure after the mutation was attempted: if the snapshot restore is **verified**, definitive failure (unchanged). If the restore reports failure, throws, or no snapshot exists, the result is `{ success:false, transactionId, rollbackFailed:true, indeterminate:true, partialMutationPossible:true, error }` — a strict superset of the old `rollbackFailed` result.
- Success result, pre-mutation refusals (no actor, zero amount, unsupported context, insufficient credits, locks) unchanged. `executeMutationTransaction`, `executeCreditTransfer` and `executeRollbackCorrection` are **not** modified.

## 3. Caller impact

All callers read `success`/`error` (and propagate `rollbackFailed`/`indeterminate` where they already did); the new fields are additive. One behaviour change: when snapshots are unavailable, a credit adjustment (and therefore a transfer's debit leg or a compensating refund) is now **refused** instead of running unprotected. `tests/ti2-commerce-integrity.test.mjs` case (5) encoded the old outcome for a transfer with no snapshots (sender left debited, `rollbackFailed`); it now asserts the safer result (definitive failure, A still 1000, B unchanged). That assertion was changed deliberately.

## 4. Evidence

`tests/ti4c0-te-credit-adjustment-safety.test.mjs`: 12 checks. **Fail-before on `main`**: 5 of 12 pass, 7 fail (snapshot throw/null not refused; commit-then-throw without snapshot moves credits behind a plain failure; unverified restore lacks `indeterminate`/`partialMutationPossible`; lock/contract checks). **After**: 12/12. Mutation checks (each reverted, all detected): both snapshot guards removed → 6 failures; missing-snapshot guard → 2; `mutationStarted` ignored → 2; indeterminate flags dropped → 4; unverified restore reported as plain failure → 5; verified restore flagged indeterminate → 3. Rolling suite 391 passed / 0 failed (5 documented exclusions); rolling syntax check; `validate-partials`; `git diff --check`; every `node tools/…` guard in `rolling-system-validation.yml` passed locally.

## 5. Not changed / remaining

No refactor of TransactionEngine. `executeMutationTransaction` has its own snapshot handling (not touched). Whether credits moved after an `indeterminate` result can only be established from the actor's ledger; there is no reconciliation operation. Integrate **before** G22; G22 then stops being able to receive a plain `success:false` for an applied adjustment from this path.
