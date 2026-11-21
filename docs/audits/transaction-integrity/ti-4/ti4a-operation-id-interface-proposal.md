# TI4-A — Q3: Stable Operation Identity — Interface Proposal

**Status:** `DESIGN_PROPOSAL`. Owner Q3 approved stable, client-generated operation ids as an architectural requirement and asked for a **separate design checkpoint**; this is that interface proposal. **It is not wired into production commerce** (or anywhere); no code is added. Receipt location is constrained by owner-approved OD-3 (domain-owned, certified, no universal ledger).

## 1. Problem (source-verified)

Every `TransactionEngine` method mints a per-call random id (`tx_${Date.now()}_${Math.random()…}`, `transaction-engine.js:313,553,702,944,1187,1421,1593`); that id doubles as the audit-flag key, so a replay creates a second record. The equipment coordinator accepts a caller `requestId` and detects `DUPLICATE_*` / `REQUEST_ID_CONFLICT` (`equipment-state-coordinator.js:443-455`) but its production caller mints a fresh random id per call (`InventoryEngine.js:240`), so identity protects nothing across a user's retry. Progression, store-item approval and holonet paths have no identity.

## 2. Interface

```
OperationEnvelope {
  operationId:  string          // minted ONCE per user intent; stable across retries of that intent
  domain:       string          // e.g. 'commerce.purchase', 'equipment.posture', 'progression.finalize'
  scope:        { actorId, assetId?, itemId?, resource? }   // what the operation may touch (enumerable)
  fingerprint:  string          // sha-256 of the canonical authorized payload (see §4)
  issuedAt:     number          // informational only; never part of the fingerprint
  intentSeq?:   number          // optional client counter: distinguishes deliberate repeats (§5)
}

OperationResult {
  operationId, outcome: 'REFUSED'|'COMMITTED'|'FAILED_COMPENSATED'|'INDETERMINATE',
  replay: 'NONE'|'RETURNED_RECEIPT'|'REFUSED_UNRESOLVED'|'REFUSED_CONFLICT',
  receiptRef: string|null,       // the domain-owned receipt key
  postCommit: { warnings: [], postApplyIncomplete: [] },
  evidence: object               // domain-specific, never reinterpreted by the caller
}
```

An authority **accepts** an envelope as an *optional* argument. A caller that supplies none keeps today's behavior (a one-off random id and no replay protection) — so the interface can be introduced per-authority, opt-in, with no behavior change for existing callers.

## 3. Minting rules

1. **Mint at the user's intent**, not at the call: when the user presses "Purchase", the UI creates the envelope and stores it with the pending action. A handler that can fire twice reuses the same envelope.
2. Use a collision-resistant id (`foundry.utils.randomID(24)` plus the user id prefix is sufficient; it needs uniqueness, not secrecy). **The id is not an authorization token** — the authority re-derives permission from fresh documents.
3. One envelope per logical operation. Retrying after a *refused* or *compensated* result may reuse the id; retrying after `INDETERMINATE` is refused (no automatic retry).
4. Server-/hook-initiated operations (hooks, GM tools) mint their own id deterministically from the triggering event when one exists (e.g. an approval id for an approval operation) so that a repeated hook fire is a replay, not a second effect.

## 4. Intent fingerprint

- **Canonical payload:** a deterministic JSON of the fields that *decide the mutation*: domain, scope ids, requested items/quantities/prices (normalized numbers), target values or deltas, selected options. **Excluded:** timestamps, random ids, UI state, display strings.
- Canonicalization: sorted keys, numbers normalized (`normalizeCredits` for credits), arrays in significant order only.
- Digest: sha-256 (the equipment coordinator already computes `intentDigest`/`planDigest`; the same function family is reused, not a new algorithm).
- The fingerprint is computed **by the authority** from the validated request, not accepted from the client, so a client cannot claim a fingerprint that disagrees with the payload.

## 5. Replay decisions (the three cases the directive names)

| Case | Condition | Result |
|---|---|---|
| **Duplicate delivery** | same `operationId`, same `fingerprint`, recorded `COMMITTED` | `COMMITTED`, `replay:'RETURNED_RECEIPT'`; **no write** |
| (duplicate while unresolved) | same id + fingerprint, recorded unresolved/`INDETERMINATE` | `REFUSED`, `replay:'REFUSED_UNRESOLVED'`, evidence returned |
| (duplicate after failure) | same id + fingerprint, recorded `REFUSED`/`FAILED_COMPENSATED` | executes again (the earlier attempt left no effect) |
| **Same id, different payload** | same `operationId`, different `fingerprint` | `REFUSED('request-id-conflict')`, `replay:'REFUSED_CONFLICT'`; nothing written, nothing overwritten |
| **Genuine second action** | different `operationId` (even with an identical payload) | an independent operation; executes normally. A UI that intends "buy another" mints a new envelope |

`intentSeq` is optional metadata so a UI can show "this is attempt 2 of the same intent"; it never changes the decision (the id does).

## 6. Where the receipt lives (OD-3 constraint)

The authority records `{operationId, fingerprint, phase/outcome, observations}` in **its own** domain record, written **before** the first mechanical write as `PREPARED` and finalized after verification (equipment journal model). The record must pass the receipt-storage certification (`ti4a-receipt-storage-certification-spec.md`) before a domain enforces replay: until then an authority may accept an envelope for **identity and conflict detection in L1** but must not claim durable replay protection.

## 7. Per-domain adoption sketch (no wiring authorized)

| Domain | Carrier | First adopter | Note |
|---|---|---|---|
| Equipment | existing `requestId` | move the mint to the UI intent (G18) | smallest: the authority already enforces conflict/replay |
| Approvals | the approval record `id` (already stable) | store-item approvals (G23) | reuse the queue id as `operationId` |
| Progression | session id + finalization attempt | record in the plan manifest (G19) | `markSessionCompleted` has no callers |
| Commerce (`TransactionEngine`) | new optional parameter | after DI-2/OD-1 acceptance | audit-flag record is erased by restore: needs a certified receipt location first |
| Force Points | receipt object | persist the receipt id (G27) | L3 prerequisite |

## 8. Compatibility and risks

- **Back-compat:** the envelope is optional; omitting it is exactly today's behavior. No schema migration.
- **Clock/randomness:** ids are not time-ordered; ordering is not required.
- **Replay window:** bounded by the receipt ring (retention policy); a pruned id is outside the window — must be tested explicitly (certification T3/P5).
- **Cross-client:** a replay across two clients is detectable only through a durable shared receipt (L2/L3); within one client it is detectable in memory (L1). Do not claim more.
- **Security:** the id is not a capability; authority still validates ownership/GM from fresh documents.
- **Not a ledger:** the receipt is the domain's own transaction record, not a new balance or inventory store.

## 9. Conformance checks

| ID | Check |
|---|---|
| Q3-1 | same id + same fingerprint after `COMMITTED` ⇒ no second effect and the same receipt |
| Q3-2 | same id + different fingerprint ⇒ `REFUSED('request-id-conflict')`, state unchanged |
| Q3-3 | different ids + identical payload ⇒ two independent effects |
| Q3-4 | `INDETERMINATE` + same id ⇒ `REFUSED(unresolved)`, no write |
| Q3-5 | omitting the envelope ⇒ legacy behavior unchanged |
| Q3-6 | fingerprint is recomputed server-side from the validated payload |
| Q3-7 | the id is never used as authorization |

## 10. Not authorized

Wiring the envelope into `TransactionEngine`, the UI, or any production path; choosing a receipt store; changing the audit-flag key.
