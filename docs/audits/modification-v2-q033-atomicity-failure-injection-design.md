# SWSE V2 equipment modifications — Q-033 atomicity and fault-injection proposal

**Status:** `ENGINEERING_PROPOSAL`, evidence-backed read-only analysis; not an implementation, authorization, or certification.
**Repository baseline inspected:** `main` at `6ecbed3efcb020ce2b23963c2f207014ca32cfad` (after #1048).
**Project scope:** future **G6** install/remove/GM-approved template-retrofit transactions operating on **owned Items, owner credits, modification instances, and audit**. Droid and vehicle modification workflows remain excluded from the SWSE V2 equipment-modifications implementation.
**Safety:** This note changes no runtime, schema, ledger, registry, specification, blocker, rules register, GM state or Foundry data; does not authorize G4–G9 or any executor. Q-033 remains open.

## 1. Reproduced source-code hazards

All statements in this section are grounded in **repository code read at the pinned baseline**, not a claim that a live Foundry transaction has been executed.

| ID | Code location and observed control flow | Consequence for a future equipment executor |
|---|---|---|
| **Q033-H1** | `scripts/engine/store/transaction-engine.js`, `executeMutationTransaction` approx. lines **306–318**: a `SnapshotManager.createSnapshot()` exception is caught, warned, and mutation continues. | A subsequent partial `ActorEngine.applyMutationPlan` failure can leave credits/items changed with no recovery snapshot. A log warning is not a transaction barrier. |
| **Q033-H2** | Same method approx. **347–354** calls `SnapshotManager.restoreSnapshot()` then logs success without checking its return value. | `SnapshotManager.restoreSnapshot()` can return `false` without throwing on missing or inexact restoration; a partial rollback can be described as successful. |
| **Q033-H3** | `scripts/engine/progression/utils/snapshot-manager.js`, `restoreSnapshotExact`: structured `{success, exact,...}`, optionally `{requireExact:true}`. `restoreSnapshot` returns boolean `success && exact` (but does not necessarily throw on false). | Use a **checked structured result** from `restoreSnapshotExact(..., {requireExact:true})` for recovery; check both `success` and `exact`; never accept truthiness of an object or a non-throwing boolean return. |
| **Q033-H4** | `executeAssetCustomizationTransaction` approx. **849–857** similarly catches snapshot setup error and continues with “best-effort rollback.” It may have captured only the wallet actor or only the asset actor. | For multi-actor transactions a **complete set** of recovery snapshots is an all-or-nothing precondition. A partial snapshot set is not safe to use for a mutation. |
| **Q033-H5** | `executeAssetApprovalTransaction` approx. **1145–1155** catches snapshot setup errors and continues. Later rollback calls `restoreSnapshot()` without checking its result. | The existing GM custom-purchase mutation path is **not** a verified executor for template retrofits; do not reuse it silently. |
| **Q033-H6** | `executeMutationTransaction` locks by `${actor.id}:${transactionContext}` (approx. **244–248**). | Separate contexts for the same owner can pass distinct locks concurrently. A new customization path must not infer cross-context serializability from that lock. |
| **Q033-H7** | `executeMutationTransaction` uses `Number(cost) || 0` (approx. **239**). | An invalid/non-numeric or absent price can collapse to zero. V2 must require a **source-certified finite amount** or an authorized GM-set price, never a coerced zero. |
| **Q033-H8** | `SnapshotManager.createSnapshot` captures `actor.toObject(false)` but also **persists** bounded snapshot history through `ActorEngine.updateActor`. | Snapshot creation is not mutation-free preflight; the snapshot ledger itself may change. Fault tests must distinguish harmless history writes from gameplay/economy writes, and verify a recovery snapshot can actually be retrieved. |
| **Q033-H9** | `SnapshotManager.restoreSnapshotExact` checks scope/identity and returns structured verification including embedded-document ID exactness; `tools/check-snapshot-restoration-authority.mjs` is a separate, narrow static guard. | The existing exactness facility is reusable in principle, but **no Foundry-V13 end-to-end proof yet exists for the V2 install/remove flow**. Do not treat a static guard as a transaction-integrity test. |

The existing `modification-v2-g3-offline-engines.md` states that the planner always emits `EXECUTOR_NOT_CERTIFIED`. Q-033 must be resolved *before* any G6 transaction execution or selectability claim. The registry remains immutable and source research remains independent from execution.

## 2. Proposed invariant and transaction boundary

**Atomicity goal:** if a V2 operation does not complete, the character's gameplay-relevant observable state is unchanged, including **credits, target Item data, embedded Item IDs, instance identities, slot occupancy, applied effects, audit/ledger history, equipment ownership, and flags**. A snapshot-history entry may remain as recovery evidence, provided it does not masquerade as a successful transaction. A successful operation must have a durable, unique audit identity and its authorized price.

> **Important:** Foundry's multiple asynchronous document writes are not a database transaction. Snapshot-and-compensation plus checked verification is a *bounded recovery protocol*, not a proof of literal physical ACID atomicity. A failure of exact restoration must surface an explicit **inconsistent/manual-recovery-required** outcome, never a fabricated success or clean failure.

### Preconditions (all before gameplay/economy mutation)

1. Verify GM/user permissions and actor/Item ownership using fresh trusted Foundry documents. A client-supplied item ID, price, applicability, approval or success result is untrusted.
2. Use only a verified canonical typed-definition from the trusted G8 source boundary; validate host/domain, slot closure, stacking, eligibility and any printed procedure. If a component is deferred or `EXECUTOR_NOT_CERTIFIED`, **refuse**. GM manual outcomes (Q-029) remain audited adjudication records, **not** authority to bypass certified component rules.
3. Resolve a **finite non-negative price** from certified source, or a GM-adjudicated finite non-negative value pursuant to Q-026; never default missing/invalid price to zero. Verify cost normalization/rounding explicitly and guard against mutation between quote and commitment.
4. Resolve and lock **all potentially affected actor/item identities**, in a stable order and across transaction contexts, with an approved design that prevents another store/credit transaction on the same wallet or Item while this operation holds authority. Per-context locks alone are insufficient.
5. Capture **all required full-scope, identity-aware snapshots** *and verify their retrievability* before changing credits, Item data, instance list, slot usage or effect state. If any snapshot setup fails, return **`PRECONDITION_SNAPSHOT_UNAVAILABLE`** without a gameplay mutation.
6. Re-read fresh values/permissions under the lock; reject stale quotes, sold/moved Items, duplicate instance IDs, lost GM authority or insufficient funds.

### Commit and recovery

7. Apply the approved mutation only through existing **TransactionEngine / ActorEngine / LedgerService** write authorities. Do not introduce direct document writes or a parallel currency ledger. Keep one transaction ID across all affected documents.
8. On successful write(s), re-read the actor and Item and **verify** the expected credits, instance identity, slot result and projected effects. On mismatch, enter recovery; success is not inferred from a resolved `Promise` alone.
9. On any failure after the first gameplay write, use `SnapshotManager.restoreSnapshotExact(..., {requireExact:true})` for every affected actor, and validate **`result.success === true && result.exact === true`** plus an independent post-restore check of credits/Item IDs/instances.
10. If full exact restoration is verified, report a **failed, exactly rolled-back** outcome with no success ledger entry. If restoration fails or is inexact, report **`RECOVERY_INCOMPLETE`**, preserve diagnostic identities, quarantine further mutation for that transaction/item until authorized intervention, and notify the GM. Do not retry or apply a second debit automatically.
11. Do not emit purchase/install completion hooks or a final success record until commit verification succeeds. Audit traces for rejected and inconsistent attempts must be clearly distinct from canonical successful transactions. Avoid unverified irreversible external side effects in the commit path.

## 3. Fault-injection acceptance matrix (proposed for implementation PR)

| Case | Injected failure | Required result |
|---|---|---|
| **T01** | Snapshot import throws | No credit/item write; `PRECONDITION_SNAPSHOT_UNAVAILABLE`. |
| **T02** | Snapshot write throws | Same as T01; partial snapshot-history may be recorded but no gameplay write. |
| **T03** | Snapshot API returns null or a non-retrievable identifier | Refuse before first gameplay mutation. |
| **T04** | Second required actor snapshot fails after first succeeds | Refuse; no wallet or Item mutation. |
| **T05** | Credit plan fails validation or payer has insufficient credits | Refuse; no snapshot-dependent gameplay mutation. |
| **T06** | Cost `undefined`, `NaN`, non-numeric string, or `Infinity` | Never silently translate to zero or commit. Explicit GM-entered **numeric zero**, when authorized by the GM and lawful, is a different value. |
| **T07** | Item update throws after credits are debited | Exact restore of credits, Item and successful-transaction audit absence. |
| **T08** | Credit update throws after Item data was mutated | Exact restore of both and original embedded Item ID. |
| **T09** | Restore returns `{success:false, exact:false}` without throwing | `RECOVERY_INCOMPLETE` — not “Rollback successful.” |
| **T10** | Restore returns `{success:true, exact:false}` without throwing | `RECOVERY_INCOMPLETE` (identity-inexact). |
| **T11** | Restore promise throws | `RECOVERY_INCOMPLETE` with diagnostic; not a clean rollback. |
| **T12** | Snapshot has mismatched actor ID, missing schema-v2 ID or wrong scope | Reject restore; surfaced incomplete recovery without affecting wrong actor. |
| **T13** | Embedded Item recreated under new `_id` | Restore must not be declared exact; canonical instance references do not silently rebind. |
| **T14** | Concurrent store purchase and equipment installation on same wallet | Exactly one serialized or explicitly conflicting operation, never lost updates or overspending. |
| **T15** | Concurrent remove/install of same target Item | No duplicate/missing instance; deterministic locking/optimistic conflict rule. |
| **T16** | Repeat approved request or transaction ID | No double debit, duplicate installation or duplicated completion hook (idempotency). |
| **T17** | Client supplies forged GM approval, wrong actor, stale item, or substituted template ID | Refuse; no gameplay or economy write. |
| **T18** | Failed installation / deactivation adjudicated under owner Q-024/Q-023 | Preserve approved owner-policy outcome record, slot accounting and no unapproved automatic effect mutation. |
| **T19** | Snapshot succeeds, `ActorEngine.applyMutationPlan` resolves, but poststate does not match expected data | Treat as failed commit, exact recover or explicit inconsistent outcome. |
| **T20** | GM manual-outcome (Q-029) requested while mechanics are deferred | Create **adjudication-only** audit record; no silent plan or effect projection. |

**Validation levels:** static guards catch forbidden code patterns; pure/offline tests simulate planner refusal, preconditions, locking, identity, fault outcomes; **Foundry v13 runtime tests** are necessary for document persistence, embedded IDs, hooks, rollback success and exact restoration.

## 4. Proposed minimal implementation work items (separate review gates)

**Q033-A (design review):** owner/reviewer agree on the transaction state machine and whether compensation with exact verification meets the contract. Clarify persistent quarantine and exact postcommit checks. No runtime changes at this step.

**Q033-B (shared-authority hardening, separate code PR):** remove “continue without snapshot” on the V2 path; use the strict structured restore and check `success` and `exact`; reject invalid cost; close cross-context lock races for affected actors. Whether existing general commerce callers are changed requires explicit scope review, because touching shared `TransactionEngine` can affect purchases, droid/vehicle approval and other existing features.

**Q033-C (G6 executor PR only when authorized):** implement V2-specific context, snapshot preconditions, bounded compensation, state verification and idempotency through existing SSOTs. No new unrestricted mutation authority. Maintain instance identity as `{instanceId, typedDefinitionId, domain}` for removal, as G3 already requires.

**Q033-D (G7 Foundry runtime certification):** run the T01–T20 failure tests in a real Foundry v13 environment on expendable test actors; prove no partial credits or mods, identity-exact restore (or explicit incomplete recovery), no leaked hooks and no cross-context races.

## 5. Explicit non-decisions

- This design does **not** choose a transaction implementation today, assume compensation is enough, or certify an existing TransactionEngine method as safe for V2.
- It does **not** change rules or sourcebook costs; owner policy Q-026 only allows a **GM** to set an otherwise unprinted price. Q-021 does not provide a universal attempt-cost basis.
- It does **not** treat GM adjudication Q-029 as a generic bypass of mechanical/source gates.
- It does **not** introduce a new approval UI, Foundry hook, mutation context, schema, ledger entry, rules register resolution or certification.
- It does **not** merge any PR or lift D-013/D-014/D-015 or any other blocker.

**Review criterion:** Before G6, there must be a tested path where missing/failed snapshots abort before gameplay writes, and every rollback is verified **exactly** (or explicitly classified as incomplete). Until then `EXECUTOR_NOT_CERTIFIED` remains mandatory.
