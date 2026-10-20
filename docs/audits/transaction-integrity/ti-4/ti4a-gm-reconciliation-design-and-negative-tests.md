# TI4-A — DI-4: GM Reconciliation Design and Negative-Test Plan

**Status:** `DESIGN_PROPOSAL`. Owner decision OD-4 authorizes **design only**: a GM-only reconciliation **operation**, **no UI**. **No implementation is authorized.** Production implementation needs a separate bounded authorization and the negative tests below. Builds on `ti4-replay-and-recovery-design.md` §4.
**Erratum to the accepted Phase 0 file:** `ti4-replay-and-recovery-design.md` §4 classifies a roll-up from field values alone (`all AT_AFTER ⇒ COMMITTED`, `all AT_BEFORE ⇒ not applied`). That table is **superseded by §4 of this document**: value equality is an observation, not proof of causality. The accepted Phase 0 file is not modified.
**Revision (independent review correction 1, R1/R2):** current field values are *observations*, not proof of transaction history (§4); an operation id is an *identity*, not a *lock*, and concurrency is guarded by the **target scope** (§3). Where either guarantee cannot be established the operation **fails closed** and the target stays `INDETERMINATE`.

## 1. Purpose and non-goals

A reconcile operation takes one **unresolved** transaction receipt and determines, **only where trusted evidence establishes causality**, what that transaction did — then, only on explicit GM instruction, completes forward or compensates backward **field by field**. It never retries a whole operation, never replays the original request, never overwrites a field that has changed since the transaction, and **never completes, compensates or replays on the strength of matching values alone**.

Non-goals: automatic repair; a background job; a UI; a universal reconcile engine (each domain supplies its own classifier over its own receipt, OD-3); any change to published rules or resource values beyond restoring or completing the recorded transaction.

## 2. Authorization

| Requirement | Specification |
|---|---|
| Who | **GM only**, asserted **inside the operation** (`game.user.isGM`), not only in a UI. A player-initiated request is `REFUSED('not-gm')`. Same GM-in-the-engine rule as `EquipmentStateCoordinator` (`REJECTED_NOT_GM`) |
| Which GM | any GM client; **concurrent GMs are governed by §3, not by the reconcile id** |
| Scope check | the GM must be able to update every document the receipt names (permission check before any write); otherwise `REFUSED('insufficient-permission')` |
| No delegation | no socket route and no macro entry is added by this design; a future route would require its own review (L2 feasibility) |

## 3. Identity, serialization and fail-closed availability (R2)

### 3.1 What the reconcile id is and is not

1. The reconcile operation has its own `operationId` (`reconcile:<targetKey>:<n>`) and its own receipt, stored in the **same domain-owned record** as the target (OD-3). The id **identifies** an attempt and lets a repeated call of *that attempt* be recognized.
2. **The id does not serialize anything.** Two GM clients (or two tabs) can mint two *different* reconcile ids for the same unresolved target. An operation id cannot, on its own, prevent them both from passing their checks and both writing. **No design statement in this document relies on id uniqueness for mutual exclusion.**

### 3.2 L1 serialization (single client)

3. Every reconcile call first acquires a **target-scoped single-flight guard** keyed by the *target receipt* (`reconcile-target:<domain>:<targetReceiptKey>`), not by the reconcile id, and holds it across the read-only phase, the confirmation wait and the write phase. While it is held — by **any** reconcile id — every other reconcile call for that target returns `REFUSED('reconcile-in-progress')`.
4. A target with a **prior reconcile receipt that is not closed** (`INDETERMINATE`, or a write phase that began and did not finish) returns `REFUSED('reconcile-unresolved')` for **any** reconcile id. A second, different reconcile id may not start a competing write against the same unresolved target.
5. **Limitation (stated, not hidden):** this guard is process-local (same class of limit as `TransactionEngine._mutationLocks`). It protects against races inside one client only; it is **L1**. It does not hold across reloads, tabs of the same user, or other clients.

### 3.3 Persisted claim (detection, not exclusion)

6. Before the first field write the operation writes a **claim** on the target receipt (`reconcileClaim: {reconcileId, claimedAt}`), then **re-reads** the receipt and proceeds only if the claim is its own. After **each** field write it re-reads the target receipt; if a different claim or a competing reconcile receipt has appeared, it **stops**, records `INDETERMINATE (PARTIAL)` with what it had written, and performs no further writes.
7. A read-then-write claim is **not** compare-and-swap: two clients can both read "no claim" and both write one. The claim therefore **detects** a competing reconcile after the fact (it bounds the damage and preserves evidence) but **does not prevent** it. It supports no L2 claim.
8. A claim is never auto-expired and never silently overwritten. A stuck claim keeps the target `INDETERMINATE` until a GM attestation (open owner decision OD-4b: whether and how a GM may attest that a claim is stale) — until decided, a stuck claim stays closed.

### 3.4 L2 requires verified cross-client authority; unsupported concurrency fails closed

9. **L2 may be claimed only if** a verified cross-client coordination mechanism exists for reconciliation (a single-writer GM route with sender verification and failover, or a platform-conditional write) **and** has passed the multi-client tests (N30–N31). Both are `RUNTIME_UNVERIFIED` today (`ti4-l2-l3-feasibility.md`).
10. **Availability predicate (fail-closed):** the write phase is available only when **either** (a) a certified L2 mechanism exists, **or** (b) the operation can establish single-client conditions: exactly **one active GM user** is connected (`game.users`) **and** the L1 guard (§3.2) is held. When neither holds the operation returns `REFUSED('coordination-uncertified')` and performs **no write**; the read-only report remains available.
11. Condition (b) is **best effort**: Foundry exposes no per-connection identity, so **two tabs of one GM user are indistinguishable from one tab** (the documented Holonet limitation, `holonet-gm-authority.js:23-30`). A reconcile under (b) is therefore **L1 only**, its claim record (§3.3) is the compensating detection, and the report states that limitation to the GM.

## 4. Evidence and causality (R1)

### 4.1 Observation is not proof

A field currently equal to its recorded `after` value does **not** prove that the target operation wrote it: an unrelated operation may have produced the same value. A field equal to its recorded `before` does **not** prove the operation never happened: the operation may have committed and a later change returned the value (ABA). The recorded `before`/`after` values are therefore **observations**. They classify fields (`AT_AFTER`, `AT_BEFORE`, `DIVERGED`, `UNAVAILABLE`) but **never alone establish causality**.

### 4.2 Evidence classes

| Class | What it is | What it can establish |
|---|---|---|
| **E-marker** | an operation-unique value written **in the same mutation** as the effect (e.g. `system.storeAcquisition.transactionId` equals the target's id; an audit entry keyed by the transaction id written in the same plan; a per-field `lastOperationId`/revision field set by the authority) | *this operation's write landed* — a marker equal to the target id cannot be produced by an unrelated operation. It does **not** say the effect is still in place |
| **E-receipt** | the domain's own journal/receipt entry for the target (`PREPARED` with the digest and observed `before`; `APPLIED`; `NOT_APPLIED`; `FINALIZED`), **from a certified receipt store** (OD-3) | the **phase the authority reached and recorded**. `APPLIED`/`FINALIZED` = the authority observed the write; `NOT_APPLIED` = the authority verified compensation. Valid only if the store passed certification (`ti4a-receipt-storage-certification-spec.md`) |
| **E-version** | a document revision stamp or an application revision counter plus last-writer operation id on the field's document, captured at `PREPARED` | whether **anything else wrote the document** since the receipt. Today `_stats.modifiedTime` is a detection hint only; no domain stores an operation-linked revision (`RUNTIME_UNVERIFIED`) |
| **E-value** | the current value equals `before`/`after` | **observation only** |

A receipt that is missing, malformed, from an uncertified store, written by an untrusted path, or inconsistent with the markers is **untrusted** and contributes no causal evidence.

### 4.3 Causality rules

1. **COMMITTED** may be concluded only with **E-marker present** (the target's id found in the post-state), **or** with a trusted **E-receipt phase ≥ `APPLIED`** *and* E-version showing no other writer since the receipt. Value equality may corroborate; it may not substitute.
2. **NOT APPLIED / cleanly compensated** may be concluded only with a trusted **E-receipt `NOT_APPLIED`** (the authority itself verified the compensation), **or** a `PREPARED` receipt whose digest matches, **E-marker absent**, *and* E-version showing the document unchanged since `PREPARED`. A value equal to `before` is not sufficient.
3. If a marker for the target id is present **and** a value differs from `after`, the operation committed and a **later change** altered the field: that field is `DIVERGED-AFTER-COMMIT`; it is reported and **never written**.
4. **Otherwise causality is not established, and the target remains `INDETERMINATE`.** In that state reconcile performs **no automatic completion, no compensation, no replay, and no retry**. It returns the evidence table and what is missing.
5. A field that is `AT_AFTER` or `AT_BEFORE` *without* causal evidence is reported as `OBSERVED_CONSISTENT_WITH_COMMIT` / `OBSERVED_CONSISTENT_WITH_NOT_APPLIED` — wording that makes the limit explicit.

### 4.4 Roll-up (replaces the earlier value-only table)

| Field observations | Causal evidence | Result | Next step available |
|---|---|---|---|
| all `AT_AFTER` | trusted (rule 1) | `COMMITTED` | **finalize** the receipt (no mechanical write) |
| all `AT_AFTER` | **absent / untrusted** | **`INDETERMINATE`** (`OBSERVED_CONSISTENT_WITH_COMMIT`) | none automatic; GM sees the evidence gap |
| all `AT_BEFORE` | trusted (rule 2) | not applied | clear the block; the operation may be re-issued with the same id |
| all `AT_BEFORE` | **absent / untrusted** | **`INDETERMINATE`** (`OBSERVED_CONSISTENT_WITH_NOT_APPLIED`; may be ABA) | none automatic |
| mixed `AT_BEFORE`/`AT_AFTER` | marker present | `PARTIAL` (committed, then partly reverted or partly applied) | GM chooses complete-forward or compensate-backward **per field**, for fields whose class is unambiguous |
| mixed | no marker | **`INDETERMINATE`** | none automatic |
| any `DIVERGED` / `DIVERGED-AFTER-COMMIT` | any | that field is **left untouched and reported** | other fields as above |
| any `UNAVAILABLE` | any | `INDETERMINATE` | no write; surface which document is missing |

### 4.5 If causality cannot be established

The target stays `INDETERMINATE` and its scope stays blocked from automatic mutation (contract §7 rule 5). The GM may still make an ordinary new correction (its own operation, id and receipt) or issue a **GM attestation record** (who, when, stated basis) acknowledging that causality was not established — whether such an attestation may unblock the scope is **open owner decision OD-4b**; until decided, the scope stays blocked. Reconcile never converts an attestation into a mechanical write.

## 5. Write phase (only after causality is established and the digest-bound GM confirmation)

1. The read-only phase returns a **report** (fields, observations, evidence table, causality verdict, what each choice would write) and writes nothing. The write phase requires a second, explicit GM call carrying the report's digest.
2. Re-read all fields and the evidence; if any class or evidence changed since the report → `REFUSED('stale-report')`. Re-check §3 (guard held, availability predicate, claim is ours).
3. **Compensate-backward:** write `before` only to fields that are `AT_AFTER` **and** whose commit is causally established; **complete-forward:** write `after` only to `AT_BEFORE` fields of a causally established partial commit. Conditional (read-compare-write, honestly labelled non-CAS).
4. After the writes, re-read and verify each written field; whole-scope verification decides the outcome (contract §4.1): anything unverified or diverged ⇒ `INDETERMINATE (compensation:'PARTIAL')` with evidence preserved.
5. Resource changes made **after** the original transaction are preserved by construction (a `DIVERGED` field is never written). No snapshot restore is used by reconcile.

## 6. Refusal conditions (closed list)

`not-gm` · `insufficient-permission` · `receipt-not-found` · `receipt-not-unresolved` · `receipt-malformed` · `receipt-untrusted` (store uncertified or integrity fails) · `reconcile-in-progress` · `reconcile-unresolved` · `coordination-uncertified` · `competing-claim` · `causality-not-established` (write phase only; the read-only report is still returned) · `stale-report` · `scope-document-missing` · `diverged-only` · `domain-has-no-classifier` · `receipt-store-uncertified`.

## 7. Negative-test plan (OFFLINE unless stated)

### 7.1 Authorization and identity

| ID | Test | Required result |
|---|---|---|
| N1 | player (non-GM) invokes reconcile | `REFUSED('not-gm')`; no write |
| N2 | GM lacks permission on one document in the scope | `REFUSED('insufficient-permission')` **before any write** |
| N3 | target receipt already `FINALIZED` | `REFUSED('receipt-not-unresolved')` |
| N5 | reconcile called again after its own receipt is `COMMITTED` | returns the recorded reconcile receipt; no write |
| N10 | write phase without the report digest, or with a wrong digest | `REFUSED` |
| N13 | static: no `restoreSnapshot`/whole-actor restore is reachable from the reconcile path | assertion holds |
| N14 | free-form description or macro-supplied before/after values | refused: input is the receipt id only |

### 7.2 Causality (R1)

| ID | Test | Required result |
|---|---|---|
| **N19** | **Same final value from an unrelated operation:** target recorded credits 5,000→4,000; no marker and no trusted receipt phase; an unrelated GM adjustment later left the balance at 4,000 | verdict `INDETERMINATE (OBSERVED_CONSISTENT_WITH_COMMIT)`; **no** finalize, completion, compensation or replay |
| **N20** | **ABA:** the target committed (marker present) and a later operation returned the value to `before` (5,000) | the field is `DIVERGED-AFTER-COMMIT`, **never rewritten**; the verdict is committed-then-changed, not "not applied" |
| **N21** | **ABA without a marker:** value equals `before`, no marker, receipt missing | `INDETERMINATE (OBSERVED_CONSISTENT_WITH_NOT_APPLIED)`; **not** reported as not applied; no clear of the block |
| **N22** | **Matching values, receipt missing** | `INDETERMINATE`; evidence table shows `E-receipt: absent` |
| **N23** | **Matching values, receipt untrusted** (store uncertified / malformed / digest mismatch) | `REFUSED('receipt-untrusted')` for the write phase; read-only report returns `INDETERMINATE` |
| **N24** | marker present but its operation id differs from the target | not causal evidence; `INDETERMINATE` |
| **N25** | trusted `NOT_APPLIED` receipt and value equals `before` | not applied (the authority verified the compensation) |
| **N26** | trusted `APPLIED` receipt, no version evidence available, values `AT_AFTER` | `INDETERMINATE` (cannot exclude another writer) unless a marker is present |
| N6 | a recorded field changed after the transaction (`DIVERGED`) | field untouched in both directions; reported |
| N7 | all fields `DIVERGED` | `REFUSED('diverged-only')` |
| N8 | an `AT_AFTER` field changes between report and confirm | `REFUSED('stale-report')` |
| N11 | receipt names a document that no longer exists | `REFUSED('scope-document-missing')`; no write |
| N9 | write succeeds on field 1, throws on field 2 | `INDETERMINATE (PARTIAL)`; field 1 recorded; **no automatic retry** |
| N15 | reconcile receipt write fails after the field writes | `INDETERMINATE`; target remains unresolved |
| N16 | repeated reconciliation after a partial reconcile | continues only from the recorded reconcile receipt; fields already written are not rewritten |

### 7.3 Concurrency (R2)

| ID | Test | Required result |
|---|---|---|
| N4 | two calls with the **same** reconcile id on one target (same client) | one proceeds; the other returns the first's receipt or `REFUSED('reconcile-in-progress')` |
| **N27** | **two calls with DIFFERENT reconcile ids** on one target (same client, interleaved) | exactly one reaches the write phase; the other is `REFUSED('reconcile-in-progress')`; **no competing writes** |
| **N28** | a prior reconcile receipt for the target is `INDETERMINATE`; a new reconcile id arrives | `REFUSED('reconcile-unresolved')` for any id |
| **N29** | a persisted claim from a *different* reconcile id is present before the first write | `REFUSED('competing-claim')`; no write |
| **N29b** | a competing claim appears **after** the first field write | stop; `INDETERMINATE (PARTIAL)`; no further writes; evidence preserved |
| **N30** | **MULTI:** two GM clients reconcile the same target with no certified L2 mechanism | the write phase is `REFUSED('coordination-uncertified')` on at least the client that cannot establish single-client conditions; if both proceed (two tabs of one GM), the claim record detects it and the outcome is `INDETERMINATE` — **never reported as success or as L2** |
| **N31** | **MULTI:** with a certified L2 mechanism (future) | exactly one writer; the other observes the recorded receipt |
| **N32** | more than one active GM user and no certified L2 mechanism | write phase `REFUSED('coordination-uncertified')`; the read-only report is still returned |
| N17 | RUNTIME: reconcile after a real reload with an `APPLIED` journal entry | classification uses persisted evidence only |
| N18 | RUNTIME: reconcile when a required document is on an unavailable client | `INDETERMINATE`, no write |

## 8. Domain applicability (first candidates; none implemented)

| Domain | Causal evidence available today | Notes |
|---|---|---|
| Equipment | `flags.swse.equipmentTxn` entry (phases, digests); history marker with `requestId` for the action spend (E-marker) | strongest: the structure exists; missing the operation (Phase 0 G36). Item-field writes carry no operation marker, so field-only matches still need the receipt phase |
| Commerce (`TransactionEngine`) | per-transaction audit flag (an E-marker only until a whole-actor restore erases it) | requires the OD-3 certified receipt; without it every commerce reconcile is `INDETERMINATE` |
| Approvals | `storeAcquisition.transactionId` marker on the asset (E-marker, survives the owner's restore) | marker-without-charge and charge-without-marker are the two partial states |
| Progression | `postApplyIncomplete` entries | already has an idempotent repair; reconcile would wrap it, not replace it |
| Force Points | none persisted | blocked until the receipt is persisted (G27) |

## 9. Explicitly not authorized by this document

Implementing the operation, a UI, a socket route, auto-reconcile on reload, any change to receipts or to `TransactionEngine`, any retry of an indeterminate transaction, or any completion/compensation/replay without established causality.
