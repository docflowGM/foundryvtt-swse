# Shared Transaction Contract — Proposal v0 (TI-0, NOT IMPLEMENTED)

**Status:** design proposal for owner/independent review. Nothing here is code. It is **reconciled against what already exists**, adds **no second ledger**, no universal orchestrator, and no new persistence schema. Domain authorities keep their own records; the contract is a *checklist of properties plus one shared outcome vocabulary*, enforced per domain by tests and static guards (TI-4).

## 1. What Foundry actually provides (the ceiling on any guarantee)
| Primitive | Reality | Consequence |
|---|---|---|
| Document update | Resolves with the documents **actually changed** (an empty array when nothing changed or the target is missing) | "No exception" is not proof of persistence; confirm the intended document in the result (done for FireStateStore in WP5-C3) |
| Compare-and-swap | **None.** Flags (`setFlag`) and `update` are last-write-wins | No contract can promise cross-client isolation; it can only *detect* conflicts after the fact or serialize on one client |
| Multi-document atomicity | **None.** Sequential awaited writes; partial states are visible to other clients. **A single `TransactionEngine`/`ActorEngine.applyMutationPlan` plan is still sequential** (CREATE → DELETE → SET → UPDATE → ADD) | "Atomic" may be claimed only for a **single** document update, or stated as "all-or-compensated, best effort". Submitting two changes in one plan gives shared ordering, lock and audit — **not** atomicity; the writes and the recovery outcome must still be verified |
| Client model | Every client can write what it owns; GM-only execution is a convention (`GM_LOCAL_CONTEXT`), not a lock | Per-actor FIFO queues and in-flight sets are **process-local** |
| Increment/decrement | No atomic increment; credits and Force Points are read-modify-write | Re-read immediately before writing and verify after; never claim isolation |

**Precise guarantee statement the project may make once the contract is adopted:** *within one Foundry client, a transaction either commits a verified state, is exactly compensated, or is recorded as indeterminate; a retry of the same operation id is safe; independent operations on the same resource do not undo each other's recorded changes. Across clients, concurrent writers are detected where a domain can detect them and are otherwise last-write-wins.*

## 2. What already exists (the contract must reuse it)
| Concern | Existing mechanism | Where |
|---|---|---|
| Operation identity | Caller-supplied `requestId` + `intentDigest` (sha-256 of the immutable intent incl. actor id) | Equipment coordinator |
| Immutable intent | `fingerprintIntent` canonicalization | `intent-fingerprint.js` |
| Plan digest / stale detection | `planDigest` echoed by the caller; re-read and compare before writing | Equipment coordinator |
| Durable receipt | Actor-flag journal: phases `PREPARED → APPLIED → FINALIZED`, plus `NOT_APPLIED`, `PARTIAL`, `INDETERMINATE`; per-item `before`/`target`; `spend` state | `equipment-transaction-journal.js` |
| Verified commit | Re-read of owned paths and compare to the plan before `APPLIED` | Equipment coordinator |
| Conditional compensation | Field-scoped, read-compare-restore; never restores a path that no longer holds the planned value | Equipment coordinator |
| Unresolved handling | Readiness withheld while a journal entry is unresolved; duplicates of unresolved ids are never replayed | Equipment reader/coordinator |
| Spend identity | `spendId` stamped in the action-history entry; own-spend rollback with `refunded/superseded/failed` | `961f4bc` |
| FP spend identity | Transaction object with committed flag, per-spend deltas, single-use | `force-point-transaction.js` (`961f4bc`) |
| Commerce audit | `transactionId` + ledger/audit records, `creditsBefore/After` | `TransactionEngine` |
| Follower saga | Ordered steps, reverse-order compensation, `rollbackFailed` | `FollowerMutationTransaction` |

## 3. Required properties (the checklist each domain coordinator must satisfy)
Each row: **property → existing support → gap → who closes it**.

1. **Stable operation identity** — equipment ✔ (caller `requestId`); commerce ✘ (random per call, TX-12); upgrades ✘; FP/action ✔ for *rollback identity only* (not for retry). *Close: TI-2 (commerce/upgrade ids), TI-4 (contract).*
2. **Actor and resource scope** — equipment ledger is `requestId`-only (TX-05); journal is per-actor ✔. *Key every replay structure by `(actorId, resourceScope, operationId)`.*
3. **Immutable intent / payload fingerprint** — equipment ✔; others ✘. *A fingerprint is required whenever a retry must be recognized as "the same operation".*
4. **Authenticated execution authority** — equipment: explicit local GM context ✔; commerce: `isOwner` check only; approvals: GM UI. *Do not invent a GM-attestation path (safeguard).*
5. **State freshness and validation** — equipment ✔ (plan digest, re-plan under serialization); commerce validates funds on a pre-read (TX-08c). *Re-read immediately before commit.*
6. **Durable receipt where a retry can occur after uncertain completion** — equipment ✔; commerce/upgrades ✘. *Receipt is the domain's existing audit/journal record, extended — not a new store.*
7. **Commit verification** — equipment ✔; FireStateStore ✔ (WP5-C3); others ✘ (exception-absence is treated as success).
8. **Transaction-specific compensation** — equipment ✔ (field-scoped); action rollback ✔ (`961f4bc`); FP ✔ (transaction) / ✘ (coordinator); `ActorEngine` transactional = whole-actor (**prohibited for new code**, existing for two callers).
9. **Explicit partial / indeterminate outcomes** — equipment ✔; commerce: single error string (TX-08b); sagas: `rollbackFailed` (not consulted everywhere, TX-11).
10. **Safe retry and duplicate handling** — equipment ✔; others ✘.
11. **Recovery after interruption** — equipment ✔ (journal inspection/classification); others ✘ (snapshot restore at best).
12. **Stated concurrency limitation** — each domain's header/doc must state its guarantee in the §1 vocabulary. Currently only the equipment coordinator does.

## 4. Outcome vocabulary (mapping, not replacement)
The audit proposed `PREPARED`, `APPLIED_UNVERIFIED`, `COMMITTED_VERIFIED`, `FAILED_NO_CHANGE`, `FAILED_COMPENSATED`, `INDETERMINATE_REQUIRES_RECONCILIATION`. The equipment domain already has an implemented, tested vocabulary; the mapping below shows the contract is satisfiable **without renaming** it.

| Contract class | Equipment journal phase | Equipment coordinator outcome | Commerce today | Action rollback (`961f4bc`) | FP transaction (`961f4bc`) |
|---|---|---|---|---|---|
| Prepared (intent recorded, nothing changed) | `PREPARED` | `PLANNED`/`CONFIRMATION_REQUIRED` | — | `rollbackStatus:'none'` | before `commit()` |
| Applied, not yet verified | between writes | — | mutation applied, result unchecked | — | — |
| **Committed, verified** | `FINALIZED` | `COMMITTED` | `success:true` (verification absent) | spend committed | `committed:true` |
| Failed, no change | `NOT_APPLIED` | `FAILED_NOT_APPLIED` | `success:false` (state unknown: no snapshot, TX-08a) | — | commit returned false |
| Failed, **exactly compensated** | `NOT_APPLIED` after compensation | `FAILED_COMPENSATED` | "rolled back" (unverified, TX-08b) | `refunded` | rollback → `closed` |
| Failed, **partially compensated / unresolved** | `PARTIAL` | `FAILED_PARTIAL` | `rollback failed` string | `superseded`/`failed` | rollback returned false |
| **Indeterminate** | `INDETERMINATE` | `INDETERMINATE`/`UNRESOLVED_*` | — (absent) | `failed` | — |

**Rule for every domain:** no outcome may be reported as *committed* or *compensated* unless the verification step actually observed it; "no exception" is never evidence. An outcome of *indeterminate* blocks replay until reconciled.

## 5. Candidate shared envelope (read-only, for tests and receipts)
`{ operationId, operationType, actorId, resourceScope, immutableIntentDigest, expectedStateEvidence?, authority }` — carried **inside each domain's existing record** (equipment journal entry, commerce audit, action-history metadata). It is a naming convention plus a validator, not a table. Whether to ship a tiny shared `classifyOutcome()` pure helper (used only by tests and diagnostics) is deferred to TI-4 after TI-1…TI-3 show which fields every domain really needs.

## 6. What the contract deliberately does NOT do
- It does **not** create a universal coordinator class, a second journal, or a global ledger.
- It does **not** claim cross-client atomicity, isolation or compare-and-swap.
- It does **not** let operation ids substitute for verification (an id makes a *retry recognizable*; it proves nothing about what was written).
- It does **not** change any rule: costs, eligibility, slots, effects, FP and action-economy rules are untouched.
- It does **not** authorize a V2 modification installer, selectability, or any GM attestation path (TX-14 gate).

## 7. Adoption order (each step is a bounded, separately reviewed package)
1. TI-1 — resources: action rollback (accept C3), FP coordinator refund + bonus symmetry, required-action no-op rule, equipment ledger key.
2. TI-2 — commerce/upgrades: fail-closed snapshot policy, rollback verdict, credit write verification, single-plan upgrade install; durable operation id for the paths where a retry after uncertain completion is possible.
3. TI-3 — progression sub-gap, follower contract, GM approvals by stable id.
4. TI-4 — property tests per domain, static guards ("no atomic claim on non-transactional path", "commerce spend only through the commerce authority", "no `undoLast` outside the action-economy authority"), optional `classifyOutcome`.

## 8. Owner rulings (2026-10-19, independent review of TI-0)
**Resolved:** (1) fail closed when recovery cannot be verified — **approved (D1)**; (2) the vehicle `UpgradeService` branch — **deferred, unchanged (D3)**; (3) client-generated operation id surfaced in the UI for purchase retries — still **open**, not needed before TI-2's refusal/verification work.

### Original questions as asked by TI-0 (preserved)
1. **Fail-closed purchases without a snapshot (TX-08a):** accept refusing a purchase/customization when no recovery snapshot can be created, instead of today's silent best-effort? This changes behavior in a failure case only; it is a commerce-policy choice.
2. **Vehicle upgrade path charges nothing** (`UpgradeService` vehicle branch). Out of scope for integrity work; flagging so it is not "fixed" as a side effect.
3. Whether retries of the same *purchase* should be recognized by a client-generated operation id surfaced in the UI (a UX/commerce decision) or only prevented in-process.
