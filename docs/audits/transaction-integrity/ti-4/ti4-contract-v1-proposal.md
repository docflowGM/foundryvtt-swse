# SWSE Mechanical Transaction Contract v1 — Proposal

**Status:** `DESIGN_PROPOSAL`. Not implemented, not authorized for implementation, not a rules decision. Subject to independent review and owner decisions listed in §10.
**Invariant (permanent):** *No authoritative SWSE mechanical transaction may silently duplicate an effect, lose a resource, overwrite another transaction, or report success without verifying its committed state.*

## 1. Purpose and non-goals

This contract is a **vocabulary and a set of obligations**, not a class. Each domain keeps its existing authority (see §6). The contract says what every authority must be able to state about its own transactions so that outcomes are comparable, replays are distinguishable from legitimate repeats, and uncertainty is never reported as success or clean failure.

Non-goals: a universal orchestrator; another credit/FP/ammo/equipment ledger; duplicating rules; transaction machinery for read-only operations; any claim of distributed ACID. Foundry offers no multi-document transaction and no compare-and-swap (see `ti4-l2-l3-feasibility.md`); compensation is **never** described as atomicity.

## 2. Who is bound

A mutation is an **authoritative mechanical transaction (AMT)** if it changes any of: credits; Force Points (value or bonus pool); ammunition; action economy; equipment posture/occupancy/readiness; installed upgrades/modifications; level/XP/feat/talent/class grants; ownership/assignment of an actor or Item (followers, allies, acquired assets); approval/denial state of a queued request; or deletes a document the user cannot trivially recreate.

Single-document writes are **not automatically low risk**: a one-field absolute write of a resource (e.g. `forcePoints.value`, `ammunition.current`) is an AMT because replay and concurrent writes lose value. Pure view-state, UI selection and read-only derivations are not AMTs.

## 3. Required concepts

| Concept | Definition | Existing carrier today |
|---|---|---|
| **Operation identity** (`operationId`) | Stable id for one *logical* operation, minted at the user's intent (button press), **before** any call, and reused by every retry of that intent. | equipment `requestId` (accepted but per-call in production); progression `finalizationToken`/`slot:<id>`; `convertToFollower` `requestToken`; `storeAcquisition.transactionId` marker; escrow `escrowId`. TE: none. |
| **Scope** | The documents/fields the operation may touch, enumerable before the write. | equipment `OWNED_PATHS` allow-list; TE `transactionContext` allow-lists; mutation-plan buckets. |
| **Intent fingerprint** | Deterministic digest of the authorized payload (inputs that determine the mutation, not timestamps). | equipment `intentDigest`/`planDigest` (sha-256). |
| **Execution authority** | The single existing domain service permitted to perform the write. | §6 table. |
| **Validation** | Permission, prerequisites, funds/resources, mechanical eligibility, evaluated under the operation's concurrency boundary. | per domain. |
| **Freshness** | Evidence the validated state has not changed before commit, stated with its **guarantee level**. | equipment plan-digest compare; `checkPending` (TI-3); TE funds re-check. |
| **Commit receipt** | Durable-as-far-as-the-level-allows record of what was applied: operationId, fingerprint, outcome, affected fields, resulting values. | equipment journal; TE `transactions.<id>` flag; `storeAcquisition` marker; FP receipt (memory only). |
| **Outcome** | See §4. | see mapping §4.2 |
| **Compensation** | A transaction-specific, **field-scoped, conditional** recovery that cannot reverse unrelated changes and whose own result is verified. | equipment conditional restore; TI-1 FP `giveBack`; TI-2 `#compensateUnverified`. |
| **Replay policy** | Distinguishes duplicate request / uncertain retry / legitimate second operation. | §5. |
| **Recovery policy** | What is retained and who may act after a crash, reload, failed persistence call or lost acknowledgement. | `ti4-replay-and-recovery-design.md`. |

## 4. Outcomes

### 4.1 Required states

| State | Meaning | May the caller retry? |
|---|---|---|
| `REFUSED` | Rejected before any mechanical write (validation, permission, funds, stale, duplicate-in-flight, recovery unavailable, request-id conflict). | Yes, after fixing the cause. |
| `COMMITTED` | The mechanical effect was applied **and verified** at the declared level. May carry `postCommit` warnings (see §4.3). | No (replay returns the same receipt). |
| `FAILED_COMPENSATED` | A write failed (or verification failed), compensation ran and **verified restoration of the operation's entire affected mechanical scope** (every document and field the operation's declared scope covers — credits, Items, ownership, markers, resources); observable mechanical state equals pre-state for that whole scope. Restoring one part (e.g. refunding credits) while any other part remains changed or unverified is **not** this state: it is `INDETERMINATE` (`compensation:'PARTIAL'`) unless each remaining effect is explicitly classified and reconciled under the recovery design (§4 there). | Yes (new attempt, same `operationId` permitted). |
| `INDETERMINATE` | A write may have landed and the state cannot be shown either way (thrown-after-write, verification unavailable, restore failed or inexact, lost acknowledgement). Includes today's `rollbackFailed`. | **No automatic retry.** Manual reconcile only. |

### 4.2 Mapping from the vocabulary already in the codebase

| Existing term (where) | Contract state |
|---|---|
| `refused:*`, `REJECTED_*`, `REQUEST_ID_CONFLICT`, `DUPLICATE_UNRESOLVED` | `REFUSED` |
| `committed:true` / `success:true` after verification | `COMMITTED` |
| `compensated` / `rolledBack:true` after a verified restore | `FAILED_COMPENSATED` |
| `indeterminate` (TE, FP receipt, FP transaction, coordinator) | `INDETERMINATE` |
| `rollbackFailed` (TE, ally service) | `INDETERMINATE` with `compensation:'FAILED'` |
| Q-033 `PRECONDITION_SNAPSHOT_UNAVAILABLE` | `REFUSED(reason:'recovery-unavailable')` — already the TI-2 name `refused:'recovery-unavailable'` |
| Q-033 `RECOVERY_INCOMPLETE` | `INDETERMINATE` with `compensation:'FAILED'|'INEXACT'` |
| `presentationError`, `postApplyWarnings` | `postCommit.warnings` qualifier on `COMMITTED`, never a state change |
| `postApplyIncomplete` / `postApplyRepair` (progression, TI-3) | `postCommit.postApplyIncomplete` obligation on `COMMITTED` (§4.3): never a state change, **not** an ordinary warning; requires an idempotent repair operation |
| equipment journal `PREPARED/APPLIED/PARTIAL/INDETERMINATE/NOT_APPLIED/FINALIZED` | domain-internal phases; map by outcome table in the compliance matrix |

### 4.3 Committed effects vs bookkeeping (`postCommit`)

A `COMMITTED` outcome carries `postCommit: { warnings: [...], postApplyIncomplete: [...] }`. The two lists are **different obligations**:

- **`warnings` — presentation/bookkeeping** (chat cards, hooks, history mirrors, notifications, repaint, queue cleanup that does not change a mechanical value). They **cannot** change the outcome and must be isolated from the mechanical failure handler (the TI-2/TI-3 `#emitCommitted` / `_afterCommit` pattern; owner ruling Q4: completion hooks are non-transactional). A failing step is a warning that tells the user *not to repeat the operation*.
- **`postApplyIncomplete` — mechanically incomplete post-apply synchronization** (derived/engine state that the primary commit requires to be consistent, e.g. the progression maneuver-suite sync that `_syncPostApplyState` performs). The primary operation stays `COMMITTED` and must **never** be rolled back, replayed or re-run because of it, but this is **not** an ordinary warning. It is a machine-readable obligation: each entry records `{ kind, scope, reason, repair }`, where `repair` names an **idempotent** repair operation (own operation id and receipt; safe to run any number of times; never replays the primary operation). Until repaired, the affected scope is reported as incomplete wherever its state is consumed. A domain with a mechanically required post-apply step but no idempotent repair path does not meet the contract (today only progression has one: `resyncPostApplyState`; no production consumer invokes it, G37).

## 5. Replay policy

1. **Mint once.** `operationId` is minted at the user's intent and stored with the pending UI action; a click handler that can fire twice must reuse it. Server-style per-call random ids (today's TE behavior) cannot detect a duplicate and are not sufficient. (Durable replay is bounded by owner-approved OD-3; the stable client-generated id contract is owner Q3's separate design checkpoint.)
2. **Same id, same fingerprint, recorded `COMMITTED`** → return the recorded receipt, perform no write.
3. **Same id, same fingerprint, recorded `INDETERMINATE`/unresolved** → `REFUSED(reason:'unresolved')` with the evidence; never retry automatically.
4. **Same id, same fingerprint, recorded `REFUSED`/`FAILED_COMPENSATED`** → may execute again.
5. **Same id, different fingerprint** → `REFUSED(reason:'request-id-conflict')`.
6. **Different ids** → independent operations (a legitimate second purchase of the same item is a new id).
7. **Where receipts live** is the domain's existing record (§6). **Storage in an Actor flag does not make a receipt durable.** A receipt is *durable for replay purposes* only when each of the following has been demonstrated for that domain's record:
   a. it **survives the operation's own restore/compensation path** (a whole-actor snapshot restore rewrites actor flags — the TE audit flag is erased by it today, G17; receipts must be excluded from that scope, written afterwards, or live on a document the compensation does not touch, as the `storeAcquisition` marker does);
   b. it **survives crash and reload** (persisted before the first mechanical write as `PREPARED`, finalized after verification);
   c. it has a **retention policy** (bounded ring; unresolved entries never evicted; a full ring refuses new work in that scope rather than dropping evidence) and an expiry/pruning rule for resolved entries.
   Until a *receipt-storage certification* for the domain demonstrates a–c (offline for the restore path, runtime for reload), the receipt is **not** accepted as replay-protection evidence and the domain may not claim L3.
8. Receipts are bounded (ring/cap with unresolved entries never evicted — the equipment journal rule).

## 6. Execution authorities (retain; do not add an orchestrator)

| Domain | Authority | Contract obligations to add (proposal) |
|---|---|---|
| Credits/commerce | `TransactionEngine` + `LedgerService` | `operationId`+fingerprint intake; one wallet-scoped lock key across methods; post-write verification on all methods; recovery precondition per §7 rule 1 (risk-based, OD-1; matrix DI-2 pending). |
| Force Points | `ActorEngine.spendForcePoints/gainForcePoints` + receipt/coordinator | bring inline spenders under a single call shape; persist receipt evidence (L3 prerequisite). |
| Action economy | `ActionEconomyConsumption`/`Persistence` | per-actor serialization; compute `after` inside one synchronous section. |
| Equipment state | `EquipmentStateCoordinator` + journal | production `requestId` minted at intent; GM reconcile operation for unresolved entries. |
| Ammunition / fire state | `AmmoSystem`, `FireStateStore` | verify via `confirmsItemUpdate` consistently; field-scoped rollback. |
| Progression | `ProgressionFinalizer` | session `operationId` recorded in the plan and checked before apply. |
| Followers | `runFollowerMutationTransaction` + domain services | already outcome-annotated (TI-3); keep. |
| Approvals | `GMApprovalOperationsService` + decision lock | extend marker pattern to store-item approvals; id-only addressing everywhere. |
| Modifications | none active; D-005 host evidence (offline) | **any** future install commit must present host evidence and obey this contract and Q-033 §2–§3. |

## 7. Compensation rules

1. **Recovery prerequisite (risk-based; owner-approved OD-1).**
   a. A **high-risk, multi-resource, or otherwise unsafe-to-repeat** transaction must establish adequate, retrievable recovery **before its first authoritative write**, or it is `REFUSED('recovery-unavailable')` (TI-2 rule; Q-033 §2.5). This is the default for every operation.
   b. **Exception — simple single-resource GM credit adjustment.** Such an operation may proceed without a full snapshot **only if all of the following hold**: (i) the separately reviewed risk matrix (DI-2) classifies it as eligible; (ii) the resulting state is verified after the write (balance observation); (iii) uncertainty is reported explicitly as `INDETERMINATE` (never as success or a clean failure); and (iv) the operation cannot silently duplicate or lose resources.
   c. **Until DI-2 is accepted, no operation qualifies for the exception.** A newly classified or unclassified operation is treated under (a).
   d. The exception never relaxes §4.1: `FAILED_COMPENSATED` still means verified compensation of the **entire** affected scope (rule 6); absent recovery, a failed or uncertain write is `INDETERMINATE`.
2. Restore verdict is **only** `restoreSnapshotExact(...,{requireExact:true})` with both `success` and `exact` checked, plus an independent post-restore check of the resource (Q-033 §2.9). A truthy return or a non-throwing call is not a verdict.
3. Prefer **field-scoped conditional compensation** (restore a field only if it still holds the value this operation wrote). Whole-actor restores revert concurrent edits and are a last resort that must say so.
4. Compensation of a resource (FP, credits) uses a **relative or conditional** write; an absolute restore of a previously read value is allowed only inside the same single-flight section and must be flagged `INTENTIONAL_LIMITATION` (L1).
5. A failed or inexact compensation yields `INDETERMINATE` and **blocks** further automatic mutation of the affected scope until reconciled.
6. **Whole-scope rule.** Compensation is judged against the operation's *entire* declared scope (§3). A verified refund with an Item still changed, or a restored Item with credits still moved, is `INDETERMINATE (compensation:'PARTIAL')`, never `FAILED_COMPENSATED`, unless every remaining effect is explicitly classified and reconciled.

## 8. Concurrency obligations by level

| Level | Obligation | Today |
|---|---|---|
| L1 | Single-flight per (actor × resource family); re-validate under the guard; no check-then-act across an `await` without re-reading; guard key shared across every method touching the same resource. | partial; per-method keys (G28). |
| L2 | A verified authoritative coordination mechanism across clients (single-writer GM route, versioned state). | none |
| L3 | Durable receipts **certified per §5.7 (a–c: survive own restore, crash/reload, retention)** + deterministic reconciliation after reload/disconnect. | partial (equipment journal, snapshots, markers); **no domain has a receipt-storage certification** |

A domain may claim a level only with the evidence listed in `ti4-cross-domain-test-plan.md` §6.

## 9. Enforcement (links to the gap register)

The contract is enforceable only where the repository can observe a violation. The proposal is (a) a CI **call-path guard** with a recorded baseline per protected field family (G01/G03), (b) authority-local checks (guard keys, markers, digests, receipts), and (c) the cross-domain tests. It deliberately does **not** revive prototype wrapping or the dead Sentinel pipeline. Rationale and limits: `ti4-implementation-roadmap.md` §4.

## 10. Owner decisions (all `OWNER_APPROVED`; record: `ti4-decision-register.md`)

| ID | Decision | Effect on this contract |
|---|---|---|
| OD-1 | Risk-based recovery prerequisites: high-risk multi-resource transactions fail closed without adequate recovery; simple GM credit adjustments may remain with verified outcomes and explicit uncertainty reporting; the exception never covers an operation that can silently duplicate or lose resources. | §7 rule 1 (a–d) states the rule and the narrow exception; no operation qualifies for the exception until the risk matrix (DI-2) is accepted. |
| OD-2 | Adopt the four-state vocabulary with the whole-scope compensation and post-apply-incomplete qualifiers. | §4 is the approved vocabulary. |
| OD-3 | Existing domain-owned receipt storage, no universal ledger; each store certified against compensation, reload and retention before durable replay or L3 claims. | §5.7, §8. |
| OD-4 | Design GM-only reconciliation operations without UI; implementation needs separate authorization and negative tests. | recovery design §4 is an approved design direction only. |
| OD-5 | Follow the printed lightsaber construction sequence; persistence failure is not a failed check; preserve the original roll and identity through recovery; component-acquisition timing is a future design item. | applies to any future construction-path correction (G15); no code change authorized. |
| Q2 | Eventually route Sith Alchemy credit-and-Item changes through an authoritative transaction boundary after verifying rules and preserving macros. | inventory P33; no change authorized. |

No rules mechanic is decided by this contract. OD-5 is an owner-approved rules policy recorded from owner-supplied sources.
