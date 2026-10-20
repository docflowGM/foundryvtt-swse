# TI4-A — DI-4: GM Reconciliation Design and Negative-Test Plan

**Status:** `DESIGN_PROPOSAL`. Owner decision OD-4 authorizes **design only**: a GM-only reconciliation **operation**, **no UI**. **No implementation is authorized.** Production implementation needs a separate bounded authorization and the negative tests below. Builds on `ti4-replay-and-recovery-design.md` §4.
**Erratum to the accepted Phase 0 file:** `ti4-replay-and-recovery-design.md` §4 classifies a roll-up from field values alone (`all AT_AFTER ⇒ COMMITTED`, `all AT_BEFORE ⇒ not applied`). That table is **superseded by §4 of this document**: value equality is an observation, not proof of causality. The accepted Phase 0 file is not modified.
**Revision (independent review correction 2, R5/R6):** causality is established **per mechanical leg**, never inferred across legs (§4); one active GM *user* is not one active *execution context*, and without a verified exclusive writer the operation is **read-only diagnosis only** (§3.4).
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
8. A claim is never auto-expired and never silently overwritten. A stuck claim keeps the target `INDETERMINATE`. Whether and how a GM may attest that a claim is stale is **open owner decision OD-4b and remains unresolved**; a GM attestation is an **audit record only** and is never accepted as a substitute for causal evidence (§4) or for concurrency protection (§3.4).

### 3.4 Exclusivity: no verified exclusive writer ⇒ read-only diagnosis only (R6)

9. **One active GM *user* is not one active *execution context*.** Foundry exposes no per-connection identity: two browser tabs of the same GM user are two independent JavaScript contexts, and each sees itself as the only GM (the documented Holonet limitation, `holonet-gm-authority.js:23-30`). The L1 guard of §3.2 is process-local; it does **not** exclude the other tab. The persisted claim of §3.3 is a read-then-write without compare-and-swap: both tabs can read "no claim" and both write one. **Therefore neither the guard, nor the claim, nor a count of active GM users proves exclusive execution, and none of them may be used to enable a write.**
10. **Availability rule (fail closed).** The **write phase** is available **only** when an *independently verified exclusive writer* exists for the target — one of:
    a. a certified **L2 mechanism** (single-writer GM route with sender verification, deterministic election, fencing and failover, or a platform-conditional write), proven by the multi-client tests N31 and N33; or
    b. an **alternative provably exclusive execution mechanism**, proposed and documented *separately* (§3.5), with its own guarantees and runtime tests.
    The §3.2 guard and the §3.3 claim are then required **in addition** (defense in depth); they are never the proof of exclusivity.
11. **When no verified exclusive writer exists (today: always),** the operation provides **read-only diagnosis**: the classification report of §4 (per-leg table, evidence, verdict) is returned and **nothing is written** — no claim, no field write, no reconcile receipt. Any write request returns `REFUSED('coordination-uncertified')`. This holds regardless of how many GM users are active.
12. The earlier availability fallback ("exactly one active GM user ⇒ write permitted") is **withdrawn**.

### 3.5 Requirements for any proposed exclusive-writer mechanism (documentation template; none is proposed here)

A proposal must state, and the runtime tests must demonstrate, all of:

| Guarantee | Required runtime test |
|---|---|
| **Sender verification:** the executor derives the requester's identity and permission from the platform, not from the payload | forged `requesterId` in a socket payload is refused |
| **Single elected writer per target** across *all* connections, including two tabs of one user | two tabs of one GM and two GM users reconcile the same target simultaneously: exactly one proceeds |
| **Fencing:** a stale or demoted writer cannot write after losing election (monotonic token checked at the write boundary or by the receipt) | writer paused across a failover then resumed: its writes are refused |
| **Failover:** election recovers after the writer disconnects mid-operation, and the interrupted operation is `INDETERMINATE` and visible | kill the writer after the first field write: next writer sees the claim and the partial receipt |
| **Lost acknowledgement:** a write that persisted but was not acknowledged is detectable | drop the connection after a persisted write |
| **Non-GM write paths closed:** a player cannot reach the writer or bypass it for the target fields, or the residual bypass is documented | player-initiated direct update of the target fields |

Until such a mechanism is independently verified, **§3.4 rule 11 applies**.

## 4. Evidence and causality (R1)

### 4.1 Observation is not proof

A field currently equal to its recorded `after` value does **not** prove that the target operation wrote it: an unrelated operation may have produced the same value. A field equal to its recorded `before` does **not** prove the operation never happened: the operation may have committed and a later change returned the value (ABA). The recorded `before`/`after` values are therefore **observations**. They classify fields (`AT_AFTER`, `AT_BEFORE`, `DIVERGED`, `UNAVAILABLE`) but **never alone establish causality**.

### 4.2 Evidence classes

| Class | What it is | What it can establish |
|---|---|---|
| **E-marker** | an operation-unique value written **in the same mutation** as the effect (a marker proves **only the leg(s) it was written with** — see §4.3 per-leg verification) (e.g. `system.storeAcquisition.transactionId` equals the target's id; an audit entry keyed by the transaction id written in the same plan; a per-field `lastOperationId`/revision field set by the authority) | *the write of the leg the marker is bound to landed* — a marker equal to the target id cannot be produced by an unrelated operation. It proves **nothing about any other leg**, and does not say the effect is still in place |
| **E-receipt** | the domain's own journal/receipt entry for the target (`PREPARED` with the digest and observed `before`; `APPLIED`; `NOT_APPLIED`; `FINALIZED`), **from a certified receipt store** (OD-3) | the **phase the authority reached and recorded**. `APPLIED`/`FINALIZED` = the authority observed the write; `NOT_APPLIED` = the authority verified compensation. Valid only if the store passed certification (`ti4a-receipt-storage-certification-spec.md`) |
| **E-version** | a document revision stamp or an application revision counter plus last-writer operation id on the field's document, captured at `PREPARED` | whether **anything else wrote the document** since the receipt. Today `_stats.modifiedTime` is a detection hint only; no domain stores an operation-linked revision (`RUNTIME_UNVERIFIED`) |
| **E-value** | the current value equals `before`/`after` | **observation only** |

A receipt that is missing, malformed, from an uncertified store, written by an untrusted path, or inconsistent with the markers is **untrusted** and contributes no causal evidence.

### 4.3 Per-leg causal verification (R5)

A transaction is a set of **mechanical legs**: each authoritative effect on one resource or document (a wallet debit, an asset acquisition marker/ownership, an Item create or delete, a stock change, a slot change, another actor's state). Causality is established **leg by leg**; **a marker, receipt or matching value for one leg never proves another leg**, even when the legs belong to one transaction, one actor, or one plan.

For **each** leg the report records:

| Field | Meaning |
|---|---|
| `legId`, `document`, `resource` | what the leg changes (e.g. `wallet:ownerA / system.credits`; `asset:dB / storeAcquisition`) |
| `intended` | the recorded `before` and `after` for the leg |
| `causalEvidence` | the **trusted** evidence bound to *this* leg: an E-marker written with this leg's effect (e.g. the owner's audit entry keyed by the transaction id, in the same plan as the debit), or a trusted E-receipt phase for this leg, plus E-version evidence for this leg's document |
| `observation` | the current value(s) and their class (`AT_AFTER`, `AT_BEFORE`, `DIVERGED`, `UNAVAILABLE`) |
| `status` | `VERIFIED`, `UNVERIFIED` or `INCONSISTENT` |

Leg status rules:

1. **`VERIFIED` (committed leg):** the leg's own causal evidence establishes that the write landed (E-marker bound to this leg, **or** a trusted E-receipt phase ≥ `APPLIED` for this leg plus evidence that no other writer touched this leg's document since), **and** the observation is explained: `AT_AFTER`, or a change after the commit that the evidence shows (`DIVERGED-AFTER-COMMIT`).
2. **`VERIFIED` (not-applied leg):** a trusted E-receipt `NOT_APPLIED` for this leg, **or** a matching `PREPARED` receipt, this leg's marker absent, and no-other-writer evidence for this leg's document.
3. **`UNVERIFIED`:** no trusted causal evidence bound to this leg. A matching `AT_AFTER`/`AT_BEFORE` value **cannot** raise a leg to `VERIFIED`; it is recorded as `OBSERVED_CONSISTENT_WITH_COMMIT` / `…_NOT_APPLIED`.
4. **`INCONSISTENT`:** evidence and observation contradict (e.g. a marker present but a value that is neither `before` nor `after` and not explained by later-change evidence; two legs' evidence disagreeing about whether the transaction was applied).
5. A leg's evidence must reference *that leg's* document and effect. Evidence on another document, even of the same transaction id, binds only the leg it was written with.

### 4.4 Operation-level roll-up (replaces the earlier roll-up tables)

| Leg statuses | Operation result | Next step available |
|---|---|---|
| **every required leg `VERIFIED` committed** (each independently, §4.3 rule 1) | `COMMITTED` | **finalize** the receipt (no mechanical write) |
| every required leg `VERIFIED` not-applied | not applied | clear the block; the operation may be re-issued with the same id |
| ≥ 1 leg `VERIFIED`, ≥ 1 other leg `UNVERIFIED` or `INCONSISTENT` | **`INDETERMINATE (PARTIAL)`**, with the per-leg table | none automatic; no leg is inferred from another |
| no leg `VERIFIED` | **`INDETERMINATE`** | none automatic |
| any leg `INCONSISTENT` | **`INDETERMINATE`** | none automatic |
| any leg `UNAVAILABLE` | `INDETERMINATE` | no write; surface the missing document |

Rules that follow: (a) **operation-level `COMMITTED` requires independently sufficient causal evidence for every required leg**; (b) a field that is `DIVERGED` (changed after the transaction) is **never written**; (c) a *write* phase may act only on a leg whose status is `VERIFIED` **and** only within an available write phase (§3.4) — never on an `UNVERIFIED` leg; (d) matching expected values cannot substitute for missing causal evidence on any leg.

### 4.5 If causality cannot be established

The target stays `INDETERMINATE` and its scope stays blocked from automatic mutation (contract §7 rule 5). The GM may make an ordinary new correction (its own operation, id and receipt). A **GM attestation** (who, when, stated basis) may be recorded as an **audit record**; it **cannot** establish which mechanical effects occurred, cannot substitute for per-leg causal evidence (§4.3) or concurrency protection (§3.4), and **cannot by itself unblock** the scope or reclassify the original transaction as verified. *Reviewer recommendation (not an owner approval):* a separately authorized **administrative recovery procedure** should record the disposition and any new corrective transaction without falsely reclassifying the original. **OD-4b remains unresolved.**

## 5. Write phase (only when §3.4 rule 10 holds, per-leg causality is established, and the digest-bound GM confirmation is given)

1. The read-only phase returns a **report** (fields, observations, evidence table, causality verdict, what each choice would write) and writes nothing. The write phase requires a second, explicit GM call carrying the report's digest.
2. Re-read all fields and the evidence; if any class or evidence changed since the report → `REFUSED('stale-report')`. Re-check §3 (guard held, availability predicate, claim is ours).
3. **Compensate-backward:** write `before` only to fields of a leg that is `VERIFIED` committed and `AT_AFTER`; **complete-forward:** write `after` only to `AT_BEFORE` fields of a `VERIFIED` partially committed operation. An `UNVERIFIED` or `INCONSISTENT` leg is never written. Conditional (read-compare-write, honestly labelled non-CAS).
4. After the writes, re-read and verify each written field; whole-scope verification decides the outcome (contract §4.1): anything unverified or diverged ⇒ `INDETERMINATE (compensation:'PARTIAL')` with evidence preserved.
5. Resource changes made **after** the original transaction are preserved by construction (a `DIVERGED` field is never written). No snapshot restore is used by reconcile.

## 6. Refusal conditions (closed list)

`not-gm` · `insufficient-permission` · `receipt-not-found` · `receipt-not-unresolved` · `receipt-malformed` · `receipt-untrusted` (store uncertified or integrity fails) · `reconcile-in-progress` · `reconcile-unresolved` · `coordination-uncertified` · `competing-claim` · `causality-not-established` (write phase only; the read-only report is still returned) · `leg-unverified` (a requested write targets a leg that is not `VERIFIED`) · `stale-report` · `scope-document-missing` · `diverged-only` · `domain-has-no-classifier` · `receipt-store-uncertified`.

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

### 7.2b Per-leg causality (R5)

Fixture: a droid purchase with two legs — **leg A** the asset acquisition (`system.storeAcquisition.transactionId` marker on the asset) and **leg B** the owner debit (credits 5,000 → 4,000, with the owner's audit entry keyed by the transaction id written in the same plan).

| ID | Test | Required result |
|---|---|---|
| **N36** | **Acquisition marker present, credit debit absent** (balance still 5,000, no owner audit entry) | leg A `VERIFIED`; leg B `UNVERIFIED` (observation `AT_BEFORE`, no debit evidence); operation `INDETERMINATE (PARTIAL)`; **not** `COMMITTED`; the debit is **not** inferred from the marker |
| **N37** | **Acquisition marker present; credits equal the expected after-value (4,000) because of an unrelated adjustment**; no owner audit entry for this transaction | leg A `VERIFIED`; leg B `UNVERIFIED` (`OBSERVED_CONSISTENT_WITH_COMMIT` only); operation `INDETERMINATE (PARTIAL)`; **not** `COMMITTED` |
| **N38** | **Multi-document transaction where only one leg has an operation-linked receipt** (asset leg has a trusted receipt; the owner leg has none) | operation `INDETERMINATE (PARTIAL)`; the leg without a receipt is `UNVERIFIED` regardless of matching values |
| **N39** | **All required effects individually verified with trusted causal evidence** (asset marker bound to leg A; owner audit entry bound to leg B in the owner's document; both observations consistent) | each leg `VERIFIED`; operation `COMMITTED`; finalize permitted |
| N40 | a marker bound to leg A is presented as evidence for leg B (wrong document/effect) | rejected as evidence for leg B; leg B `UNVERIFIED` |
| N41 | leg B has a trusted audit entry but its balance is neither `before` nor `after` and no later-change evidence exists | leg B `INCONSISTENT`; operation `INDETERMINATE`; no write |
| N42 | both legs verified not-applied by trusted `NOT_APPLIED` receipts | not applied; block cleared |
| N43 | leg A `VERIFIED`, leg B `UNVERIFIED`, GM requests compensate-backward for leg A only | allowed only within an available write phase (§3.4); leg B is untouched and the operation stays `INDETERMINATE (PARTIAL)`; no inference that B can be treated as applied or absent |

### 7.3 Concurrency and exclusivity (R2, R6)

| ID | Test | Required result |
|---|---|---|
| N4 | two calls with the **same** reconcile id on one target (same client) | one proceeds (when a write phase is available) or both are read-only; the other returns the first's receipt or `REFUSED('reconcile-in-progress')` |
| **N27** | two calls with **different** reconcile ids on one target (same client, interleaved), write phase available | exactly one reaches the write phase; the other `REFUSED('reconcile-in-progress')`; no competing writes |
| **N28** | a prior reconcile receipt for the target is `INDETERMINATE`; a new reconcile id arrives | `REFUSED('reconcile-unresolved')` for any id |
| **N29** | a persisted claim from a *different* reconcile id is present before the first write | `REFUSED('competing-claim')`; no write |
| **N29b** | a competing claim appears **after** the first field write | stop; `INDETERMINATE (PARTIAL)`; no further writes; evidence preserved |
| **N30** | **two tabs of one GM user** (two independent contexts, each holding its own process-local guard), no verified exclusive writer | **both** write requests `REFUSED('coordination-uncertified')`; no claim and no field write is made by either; both still return the read-only report |
| **N31** | **MULTI (future):** with a certified L2 mechanism or an independently verified exclusive-writer mechanism (§3.5) | exactly one writer across tabs and users; the other observes the recorded receipt |
| **N32** | **exactly one active GM user**, no verified exclusive writer | write `REFUSED('coordination-uncertified')` — an active-user count is **not** an availability condition; the read-only report is returned |
| **N33** | **MULTI (future):** exclusive-writer mechanism under failover and fencing (§3.5 table) | stale writer's writes refused; interrupted operation `INDETERMINATE` and visible |
| **N34** | read-only diagnosis is requested in every environment (no mechanism, one GM, two tabs, a player-visible actor) | returns the per-leg report; writes nothing: no claim, no reconcile receipt, no field write (assert via a write-spy that records zero document updates) |
| **N35** | static: no code path in the reconcile module can reach a document write when the availability rule of §3.4 is unmet | assertion holds |
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
