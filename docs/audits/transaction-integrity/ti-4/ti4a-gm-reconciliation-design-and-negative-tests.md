# TI4-A — DI-4: GM Reconciliation Design and Negative-Test Plan

**Status:** `DESIGN_PROPOSAL`. Owner decision OD-4 authorizes **design only**: a GM-only reconciliation **operation**, **no UI**. **No implementation is authorized.** Production implementation needs a separate bounded authorization and the negative tests below. Builds on `ti4-replay-and-recovery-design.md` §4.

## 1. Purpose and non-goals

A reconcile operation takes one **unresolved** transaction receipt and classifies, from recorded evidence and current document state, what actually committed — then, only on explicit GM instruction, completes forward or compensates backward **field by field**. It never retries a whole operation, never replays the original request, and never overwrites a field that has changed since the transaction.

Non-goals: automatic repair; a background job; a UI; a universal reconcile engine (each domain supplies its own classifier over its own receipt, OD-3); any change to published rules or resource values beyond restoring or completing the recorded transaction.

## 2. Authorization

| Requirement | Specification |
|---|---|
| Who | **GM only**, asserted **inside the operation** (`game.user.isGM`), not only in a UI. A player-initiated request is `REFUSED('not-gm')`. Same GM-in-the-engine rule as `EquipmentStateCoordinator` (`REJECTED_NOT_GM`) |
| Which GM | any active GM; concurrent reconciles of the same entry are serialized by the reconcile operation's own id (§3), not by a process-local lock |
| Scope check | the GM must be able to update every document the receipt names (permission check before any write); otherwise `REFUSED('insufficient-permission')` |
| No delegation | no socket route and no macro entry is added by this design; a future route would require its own review (L2 feasibility) |

## 3. Receipt identity and idempotency of the reconcile itself

1. Input is the **target receipt id** (the original `operationId`, or the domain's receipt key), never a free-form description.
2. The reconcile operation has its **own `operationId`** (`reconcile:<targetId>:<n>`) and its own receipt, stored in the **same domain-owned record** (OD-3) as the target.
3. A second reconcile call for the same target while the first receipt is `COMMITTED` returns that receipt (no write). While `INDETERMINATE` it returns `REFUSED('reconcile-unresolved')` with the evidence.
4. The target receipt is marked `reconciledBy:<reconcileId>` **only after** verification; a crash between the field writes and the mark leaves the target unresolved and the reconcile receipt `INDETERMINATE` (never silent).

## 4. Classification procedure (read-only phase; always runs first)

For each field the target receipt recorded (`path`, `before`, `after`) the operation reads the **current** value and classifies:

| Current value vs recorded | Class |
|---|---|
| equals `after` | `AT_AFTER` |
| equals `before` | `AT_BEFORE` |
| neither | `DIVERGED` (changed after the transaction, by anything) |
| document missing / unreadable | `UNAVAILABLE` |

Roll-up (the generalization of `classifyTransaction`, `equipment-transaction-journal.js:149-173`):

| Field classes present | Proposed classification | Next step available |
|---|---|---|
| all `AT_AFTER` | `COMMITTED` | **finalize** the receipt (set `FINALIZED`); no mechanical write |
| all `AT_BEFORE` | not applied | clear the block; the operation may be re-issued with the same id |
| mixed `AT_BEFORE`/`AT_AFTER` | `PARTIAL` | GM chooses **complete-forward** or **compensate-backward**, per field |
| any `DIVERGED` | that field is **left untouched and reported**; remaining fields classified independently | GM acts only on the non-diverged fields; the diverged field stays reported |
| any `UNAVAILABLE` | `INDETERMINATE` | no write; surface which document is missing |

The read-only phase returns a **report** (fields, classes, proposed classification, what each choice would write) and writes nothing. A write phase requires a second, explicit GM call carrying the report's digest (so the GM acts on exactly what was shown, and a stale report is refused).

## 5. Write phase (only after the digest-bound GM confirmation)

1. Re-read all fields; if any class changed since the report → `REFUSED('stale-report')`.
2. For **compensate-backward**: write `before` only to `AT_AFTER` fields; conditional (read-compare-write, the equipment coordinator's pattern, honestly labelled non-CAS). For **complete-forward**: write `after` only to `AT_BEFORE` fields.
3. After the writes, re-read and verify each written field equals the intended value; whole-scope verification decides the outcome (contract §4.1): all verified ⇒ `FAILED_COMPENSATED`/`COMMITTED` per direction; anything unverified or diverged ⇒ `INDETERMINATE (compensation:'PARTIAL')` with the evidence preserved.
4. Resource changes made **after** the original transaction are preserved by construction (a `DIVERGED` field is never written).
5. No snapshot restore is used by the reconcile; a whole-actor restore would revert unrelated changes.

## 6. Refusal conditions (closed list)

`not-gm` · `insufficient-permission` · `receipt-not-found` · `receipt-not-unresolved` (already finalized/closed) · `receipt-malformed` · `reconcile-unresolved` (a prior reconcile is `INDETERMINATE`) · `stale-report` · `scope-document-missing` · `diverged-only` (nothing writable) · `domain-has-no-classifier` · `receipt-store-uncertified` (the domain's receipt storage has not passed certification, `ti4a-receipt-storage-certification-spec.md`).

## 7. Negative-test plan (OFFLINE unless stated)

| ID | Test | Required result |
|---|---|---|
| N1 | player (non-GM) invokes reconcile | `REFUSED('not-gm')`; no read of protected fields beyond the receipt; no write |
| N2 | GM lacks permission on one document in the scope | `REFUSED('insufficient-permission')` **before any write** |
| N3 | target receipt already `FINALIZED` | `REFUSED('receipt-not-unresolved')` |
| N4 | reconcile called twice concurrently on one target | exactly one write phase; the other returns the first's receipt or `REFUSED` |
| N5 | reconcile called again after `COMMITTED` | returns the recorded reconcile receipt; no write |
| N6 | a recorded field changed after the transaction (`DIVERGED`) | field untouched in both complete-forward and compensate-backward; reported |
| N7 | all fields `DIVERGED` | `REFUSED('diverged-only')`; no write |
| N8 | `AT_AFTER` field with a concurrent change between report and confirm | `REFUSED('stale-report')` |
| N9 | write succeeds on field 1, throws on field 2 | outcome `INDETERMINATE (PARTIAL)`; field 1 recorded as written; **no automatic retry** |
| N10 | write phase called without the report digest, or with a wrong digest | `REFUSED` |
| N11 | receipt names a document that no longer exists | `INDETERMINATE`/`REFUSED('scope-document-missing')`; no write |
| N12 | the domain's receipt store is uncertified | `REFUSED('receipt-store-uncertified')` |
| N13 | reconcile attempts to restore an old snapshot of the whole actor | **impossible by design**: assert no `restoreSnapshot` call is reachable from the reconcile path (static check) |
| N14 | reconcile receives a free-form description / macro-supplied before/after values | refused: input is the receipt id only |
| N15 | reconcile receipt write fails after the field writes | `INDETERMINATE`; the target remains unresolved |
| N16 | repeated reconciliation after a partial reconcile | continues only from the recorded reconcile receipt; fields already written are not rewritten |
| N17 | **RUNTIME/MULTI:** two GMs reconcile the same target from different clients | exactly one succeeds; the other observes the recorded receipt (needs a verified coordination mechanism; `RUNTIME_UNVERIFIED`) |
| N18 | **RUNTIME:** reconcile after a real reload with an `APPLIED` journal entry | classifies correctly from persisted values |

## 8. Domain applicability (first candidates; none implemented)

| Domain | Classifier input | Notes |
|---|---|---|
| Equipment | `flags.swse.equipmentTxn` entry (`PREPARED/APPLIED/PARTIAL/INDETERMINATE`) | the structure already exists; the missing piece is the operation (Phase 0 G36) |
| Commerce (`TransactionEngine`) | per-transaction record + the receipts of both legs | requires the OD-3 certified receipt (the audit flag is erased by a successful restore) |
| Approvals | `storeAcquisition` marker + owner audit flag | marker-without-charge and charge-without-marker are the two partial states |
| Progression | `postApplyIncomplete` entries | already has an idempotent repair (`resyncPostApplyState`); reconcile would wrap it, not replace it |
| Force Points | none persisted | blocked until the receipt is persisted (G27) |

## 9. Explicitly not authorized by this document

Implementing the operation, a UI, a socket route, auto-reconcile on reload, any change to receipts or to `TransactionEngine`, or any retry of an indeterminate transaction.
