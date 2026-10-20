# TI-4 Phase 0 — Replay and Recovery Design

**Status:** `DESIGN_PROPOSAL`. No GM reconciliation UI is authorized. No automatic retry of an indeterminate transaction is proposed. Nothing here is implemented.
Companion to `ti4-contract-v1-proposal.md` §5 and §7.

## 1. Principles

1. **Never retry an `INDETERMINATE` transaction automatically.** Retrying a possibly-landed write is how effects duplicate.
2. **Never overwrite an actor with an old snapshot** except as a verified, scoped, last-resort compensation that states what it reverts. A whole-actor restore reverts concurrent unrelated edits (G12).
3. **Evidence before action.** Every recovery decision starts from recorded evidence of *what the operation intended and what it observed*, not from re-deriving what should have happened.
4. **Resource changes made after the original transaction are preserved.** Reconciliation compares recorded `before`/`after` observations against current values field by field; it never writes an absolute pre-transaction value over a field whose current value is neither `before` nor `after`.
5. **Reconcile once.** A reconcile attempt is itself an operation with an id and a receipt; a second attempt on the same unresolved entry returns the first attempt's result.
6. **Bounded evidence retention.** Rings with unresolved entries never evicted (the equipment journal rule); a full ring refuses new work in that scope rather than dropping evidence.

## 2. Unresolved-transaction taxonomy

| Class | Examples (source) | Recorded evidence today | Missing |
|---|---|---|---|
| U1 Equipment unresolved | journal phases PREPARED/APPLIED/PARTIAL/INDETERMINATE (`equipment-transaction-journal.js:33-40`) | durable journal in `flags.swse.equipmentTxn`; readiness withheld | **a reconcile operation** (G36); `inspectEquipmentTransaction` is read-only |
| U2 Credit/commerce indeterminate | TE `indeterminate`, `rollbackFailed` | `transactions.<id>` audit flag *(erased if a restore succeeds)*, snapshot ring, result object returned to the caller only | durable record of the *result*; most callers do not store it (G16) |
| U3 Force Point refund indeterminate | receipt `indeterminate` / `refund-indeterminate` | in-memory `refundEvidence` | persistence (G27) |
| U4 Approval uncertain | `decideDenial` → `uncertain`; approval committed but queue cleanup failed | `storeAcquisition.transactionId` marker; pending queue entry | marker for store-item approvals (G23) |
| U5 Progression post-apply incomplete | `committed:true, postApplyIncomplete:true` | `postApplyRepair` object on the result; idempotent `resyncPostApplyState` | consumer/UI (G37; UI out of scope) |
| U6 Multi-actor purchase incomplete | asset acquired, owner charge failed (or reverse) | acquisition marker on asset; owner audit flag | cross-actor receipt tying both legs; orphaned created actors (G10) |
| U7 Follower/ally reservation stuck | TTL reservations (`follower-slot-service.js:301-351`) | TTL expiry | explicit release evidence |
| U8 Saga (escrow/holonet) mid-flight | money moved, record unsaved (G22,G25,G26) | partial logs | recorded intent *before* the first leg |

## 3. Evidence retention (where, who writes, what survives)

| Option | Used today by | Survives reload | Survives a successful snapshot restore of the actor | Notes |
|---|---|---|---|---|
| Actor flag ring (`flags.<scope>.<journal>`) | equipment journal; `SnapshotManager` ring; `transactions.<id>` audit | yes | **no** if the flag is inside the restored actor scope — journal writes are separate calls but a whole-actor restore rewrites flags | scope rule: operation receipts must be excluded from, or re-applied after, any whole-actor restore |
| Marker on the *asset* document | `storeAcquisition.transactionId` | yes | yes (different document from the owner restore) | the only receipt that already survives owner restore |
| World setting | queues (`pendingCustomPurchases`, `pendingSales`), stock policies, game sessions | yes | n/a | writable by non-GM clients: `RUNTIME_UNVERIFIED`; serialization is read-modify-write of one JSON array |
| In-memory | FP receipt, in-flight maps, TE locks | **no** | n/a | L1 only |

**Durability is a certified property, not a storage location.** An actor flag is not durable evidence by virtue of being persisted: the row above shows a whole-actor restore rewrites it. A domain's receipt record is accepted as replay evidence only after a **receipt-storage certification** demonstrates (a) survival through the operation's own restore path, (b) survival of crash/reload, and (c) a retention/pruning policy (contract §5.7). Required before replay enforcement (TI4-B) and before any L3 claim.

**Proposal (no recommendation of a single store without owner request, `OWNER_DECISION_REQUIRED` OD-3):** (a) keep each domain's existing record; (b) require that the record for an operation is written **before** the first mechanical write (`PREPARED`) and finalized after verification, as the equipment journal already does; (c) require that receipts are not stored only inside a scope that the operation's own compensation may restore; (d) forbid a second, parallel ledger.

## 4. Who may reconcile, and how a GM learns what committed

| Action | Actor | Authority |
|---|---|---|
| Inspect an operation (read-only) | any owner of the scope | existing `inspect*` pattern; no write |
| Reconcile an `INDETERMINATE` operation | **GM only** | a reconcile *operation* (own id, own receipt); no UI in TI-4 |
| Release a stuck reservation | GM only | explicit release operation with evidence |
| Force-complete or force-roll-back a transaction | **not proposed** | would require an owner decision and a rules-neutral definition of "state now" |

**How a GM determines what committed (proposal, evidence-only):** the reconcile operation re-reads the live documents and classifies each recorded field as `AT_BEFORE`, `AT_AFTER`, or `DIVERGED` (changed after the transaction). Outcome:

| Field classes | Classification |
|---|---|
| all `AT_AFTER` | `COMMITTED` (finalize receipt; do not re-run) |
| all `AT_BEFORE` | `FAILED_COMPENSATED`/not applied (clear the block; operation may be re-issued with the same id) |
| mixed `AT_BEFORE`/`AT_AFTER` | `PARTIAL` — the GM must choose complete-forward or compensate-backward **per field**; both are field-scoped conditional writes |
| any `DIVERGED` | that field is left untouched and reported; no automatic action on it |

This is the equipment coordinator's `classifyTransaction` (`equipment-transaction-journal.js:149-173`) generalized; it needs no new rules and no recommended outcome.

## 5. Repeated reconciliation, unavailable authorities, partial work

- **Repeated reconcile:** idempotent by reconcile-operation id; second call returns the first receipt.
- **Required authority unavailable** (no active GM, missing document, setting unwritable): the operation stays `INDETERMINATE`; the block on the affected scope remains; no fallback writer is chosen by a non-GM client.
- **Incomplete progression synchronization:** already modelled — `committed:true` + `postApplyIncomplete` + idempotent `resyncPostApplyState` (TI-3). The proposal is to keep it manual (a GM/owner invokes it); a UI is not authorized.
- **Incomplete multi-actor purchase:** a purchase that created a world actor and charged the owner must carry a single operation id on both documents (the asset's `storeAcquisition` marker and the owner's audit/ledger record); reconcile compares both, never deletes an asset that carries the acquired marker (the TI-3 denial rule).

## 6. Crash/reload semantics (what is true today vs required)

| Event | Today | Required for L3 |
|---|---|---|
| Reload mid-operation | in-memory locks, single-flight maps, FP receipts vanish; equipment journal, snapshot ring, markers, reservations persist | on startup/first access, an operation scope with an unresolved entry **blocks new work** and surfaces `INDETERMINATE` (equipment already does this; other domains do not) |
| Write landed, acknowledgement lost | indistinguishable from not-landed | verification by re-read keyed by operation id (receipt) |
| Two clients, same click | both run; duplicate effects possible (L1 locks only) | L2 mechanism (see feasibility) |
| Snapshot restore succeeds but receipt erased with it | replay guard lost | receipts outside restored scope (§3c) |

## 7. Non-goals

No automatic repair daemon; no background retry queue; no new reconciliation UI; no change to published rules or to how resources are valued; no schema migration.
