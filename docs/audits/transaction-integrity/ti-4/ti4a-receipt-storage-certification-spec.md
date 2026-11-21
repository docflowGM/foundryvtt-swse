# TI4-A — DI-3: Receipt-Storage Certification Specification

**Status:** `DESIGN_PROPOSAL` test specification. **No receipt store is built, changed or certified by TI4-A.** Owner policy OD-3: each domain keeps its **own** receipt record (no universal ledger); a store must pass certification against **compensation**, **reload** and **retention** before it is accepted as replay evidence or supports an L3 claim (contract §5.7 a–c).

## 1. What is being certified

A **receipt store** is a domain's existing record of an operation: its identity, intent fingerprint, phase/outcome, affected-field observations, and resulting values. The certification asks whether that record can be *trusted as evidence* in the situations where evidence matters. It certifies a **(domain, record location, writer, reader)** tuple, not a class.

Candidates today (none certified):

| Domain | Record | Location | Known weakness (from Phase 0) |
|---|---|---|---|
| Equipment | equipment journal (PREPARED→APPLIED→FINALIZED…) | actor flag `flags.swse.equipmentTxn`, cap 20 | lives in the actor; a whole-actor restore would rewrite it; no reconcile |
| Commerce | audit flag | actor flag `flags.foundryvtt-swse.transactions.<id>` | erased by a successful whole-actor restore; id is per call |
| Approvals | acquired marker | asset document `system.storeAcquisition.transactionId` + flag | only for droid/vehicle approvals; survives the owner's restore |
| Force Points | receipt | in-memory `WeakMap` | not persisted |
| Followers | finalization token; conversion reservations | actor flag `followers`; reservation flags with TTL | TTL expiry; soft locks |
| Progression | none | — | no operation record at all |
| Snapshots | ring of ≤10 full-actor snapshots | actor flag `flags.foundryvtt-swse.snapshots` | restored together with the actor; the ring is itself part of what a restore rewrites |

## 2. Certification dimensions and tests

Each dimension has a **test matrix**. `OFFLINE` = certifiable with the offline harness; `RUNTIME` = needs Foundry v13; `MULTI` = needs ≥2 clients. A store is certified only when **every row applicable to it** passes.

### 2.1 Restoration survival (R-series) — contract §5.7(a)

| ID | Scenario | Pass condition | Env |
|---|---|---|---|
| R1 | operation fails after its first write; its own compensation restores the actor from a snapshot | the receipt is **still present** and shows the truthful phase (e.g. `NOT_APPLIED` / `PARTIAL`), not erased and not stale | OFFLINE |
| R2 | receipt written, then an **unrelated** whole-actor restore (another transaction's compensation) runs | the receipt is preserved or re-applied; replay protection still works | OFFLINE |
| R3 | the restore is inexact / fails | the receipt records `INDETERMINATE` and is preserved | OFFLINE |
| R4 | field-scoped conditional compensation (no whole-actor restore) | receipt unaffected; compensation recorded | OFFLINE |
| R5 | receipt lives on a document the operation does not restore (e.g. the asset) while the owner is restored | receipt remains; marker still blocks re-approval | OFFLINE |
| R6 | embedded-document id preserved across the restore the receipt refers to (Q-033-T13) | ids unchanged or the receipt flags divergence | RUNTIME |

### 2.2 Reload survival (L-series) — contract §5.7(b)

| ID | Scenario | Pass condition | Env |
|---|---|---|---|
| L1 | write receipt `PREPARED`, drop in-memory state, re-create the module (simulated reload) | the `PREPARED` entry is found and the scope is **blocked** from new automatic mutation | OFFLINE |
| L2 | crash after the mechanical write, before `FINALIZED` | on reload the entry classifies as `APPLIED`/unresolved, never as success | OFFLINE |
| L3 | crash between receipt `PREPARED` and the mechanical write | reload classifies `PREPARED` (not applied) — the field values prove which | OFFLINE |
| L4 | real browser reload / reconnect | same as L1–L3 in Foundry | RUNTIME |
| L5 | acknowledgement lost: write persisted server-side, client never saw the result | after reconnect the receipt (or its absence) plus current field values identify what committed | RUNTIME + MULTI |
| L6 | a different GM client reads the receipt | readable and classifiable without the original client's memory | MULTI |

### 2.3 Bounded retention (T-series) — contract §5.7(c)

| ID | Scenario | Pass condition | Env |
|---|---|---|---|
| T1 | ring is full of **resolved** entries; new operation | oldest resolved entry pruned; no unresolved entry evicted | OFFLINE |
| T2 | ring is full of **unresolved** entries | new work in that scope is **refused** (`REFUSED('receipt-ring-full')`), not accepted by evicting evidence (the equipment journal's `JOURNAL_FULL`) | OFFLINE |
| T3 | pruning of a resolved entry whose operation id could be replayed later | the replay guard's window is documented; replay of a pruned id is either detected by a durable marker or explicitly out-of-window | OFFLINE |
| T4 | retention size/growth bound | the record is size-bounded and cannot grow the document without limit | OFFLINE |
| T5 | receipt payload size within the document-size limits of the host | verified | RUNTIME |

### 2.4 Unresolved-entry preservation (U-series)

| ID | Scenario | Pass condition | Env |
|---|---|---|---|
| U1 | repeated attempts on a scope with an unresolved entry | each returns `REFUSED('unresolved')` with the evidence; none writes | OFFLINE |
| U2 | the unresolved entry is read by the reconcile operation | classification per `ti4a-gm-reconciliation-design-and-negative-tests.md` | OFFLINE |
| U3 | an `INDETERMINATE` entry for operation X; operation Y (different id) on a disjoint scope | Y proceeds (containment is scoped, not global) | OFFLINE |

### 2.5 Loss-of-acknowledgement (A-series)

| ID | Scenario | Pass condition | Env |
|---|---|---|---|
| A1 | the update call throws after the server applied it | the post-write read plus receipt classify `APPLIED`/`INDETERMINATE`, never `FAILED_COMPENSATED` without verification | OFFLINE (simulated) / RUNTIME |
| A2 | the receipt write itself fails after the mechanical write | outcome `INDETERMINATE` (`UNRESOLVED_JOURNAL`-class), readiness/scope withheld | OFFLINE |
| A3 | the receipt write succeeds, the mechanical write fails | receipt `NOT_APPLIED`, scope unblocked | OFFLINE |

### 2.6 Replay behavior (P-series) — links to the operation-id interface

| ID | Scenario | Pass condition |
|---|---|---|
| P1 | same id + same fingerprint + `COMMITTED` receipt | the recorded receipt is returned; **no write** |
| P2 | same id + same fingerprint + unresolved receipt | `REFUSED('unresolved')` |
| P3 | same id + different fingerprint | `REFUSED('request-id-conflict')` |
| P4 | new id, identical payload | executes as a separate legitimate operation |
| P5 | same id after the receipt was pruned | behavior is the documented T3 window, tested explicitly |

## 3. Pass/fail and recording

1. A store's certification result is a table of the rows above with `PASS`/`FAIL`/`NOT_APPLICABLE` (with a reason) and the evidence (test file, run id). `RUNTIME` and `MULTI` rows are `NOT_RUN` until run in Foundry; **a store with any applicable `NOT_RUN` row cannot be certified L3**, but may be certified for **L1 replay** if every `OFFLINE` row passes.
2. The result is recorded in the domain's certification document under `docs/audits/transaction-integrity/` and referenced by the contract compliance matrix; it is not a code constant.
3. A store that fails R1/R2/R5 **may not** be used as replay evidence even at L1: its guard is bypassed by the domain's own compensation (the situation of the `TransactionEngine` audit flag today).

## 4. Expected outcome per candidate (prediction from source reading, not a result)

| Candidate | R1/R2 | R5 | L1–L3 | T2 | Prediction |
|---|---|---|---|---|---|
| Equipment journal | at risk if a whole-actor restore ever runs on the actor (it uses field-scoped compensation, so R4 applies) | n/a (same document) | designed for it | present (`JOURNAL_FULL`) | strongest candidate; needs R2 proof and a reconcile op |
| `TransactionEngine` audit flag | **fails R1/R2** (the audit is part of the restored actor) | n/a | partial | none | not usable as replay evidence as is |
| `storeAcquisition` marker | passes R5 by construction | yes | marker survives reload | not a ring | usable for droid/vehicle approvals only |
| FP receipt | n/a (in-memory) | n/a | **fails L1** | n/a | cannot be certified until persisted |

These are predictions to be tested; no row is certified by this document.

## 5. Out of scope

Building a store, choosing one location for every domain, a universal ledger, or any UI. OD-3 requires domain-owned storage.
