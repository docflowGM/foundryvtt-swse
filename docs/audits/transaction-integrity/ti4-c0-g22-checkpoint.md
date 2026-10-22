# TI4-C0 / G22 — Wager refund replay prevention (checkpoint)

Base: PR #1069 (`audit/ti4c0-g21-legacy-dashboard-reversal`) at the certified head `db095fde2f9abad164a9cef8f9d69404ddfee902`. Stacked draft PR; earlier branches unmodified.
Evidence level: **L1** (offline, single client, real `GameCreditEscrowService` + real `GameSessionStore` over an in-memory world-setting model; `TransactionEngine.executeCreditAdjustment` is a recorded, scriptable model). No L2 (cross-client coordination) or L3 (durable recovery/reload) claim, and **no exactly-once claim**. No rules or economy decision was needed.

## 1. Defect (verified on the base head)

`refundSession()` accepted `escrowed`, `payout-failed` and `refund-failed`, and passed **every** original escrow entry to `refundDebitEntries()`, which issued a positive `executeCreditAdjustment` per entry with no check that the entry had already been refunded. Results were persisted only after the whole batch, replacing `escrow.credits.refunds` with the latest attempt, and eligibility came from the caller's session copy. Demonstrated on the base head: with a first attempt that refunded A and failed B, a retry refunded **A a second time** (A's credits 900 → 1000 → 1100); a stale caller copy did the same; preparation-time refunds were repeated by a later `refundSession`.

## 2. Source-state findings

| Question | Finding |
|---|---|
| Escrow entries | `escrow.credits.entries[]` = `{seatId, seatLabel, actorId, actorName, amount, transactionId(debit), creditsBefore, creditsAfter}` written by `prepareEscrow` only for debits that succeeded. |
| Refund records | `escrow.credits.refunds[]` = the engine result spread with `{actorId, actorName, seatId, amount}` (`success`, `transactionId`, `error`, `rollbackFailed`, `indeterminate`, credits before/after) or, for a missing wallet, `{success:false, …, error}`. They do **not** carry the debit transaction id (the id appeared only in the credit transaction's audit), so legacy association with an entry is by **seat** (+ actor). |
| Evidence meaning | `success:false` with `rollbackFailed` or `indeterminate` (TI-2) means credits may have moved; a plain `success:false` is a definitive no-movement failure; `success:true` always carries a `transactionId` in the real engine. |
| Reaching the states | `escrowed` (prepareEscrow) → `refunded`/`refund-failed` (refundSession) ; `payout-failed` (settleSession / table-balance settlement / GM approval) ; `refund-failed` also from a failed `prepareEscrow` rollback (status `failed` when every rollback refund succeeded). `refundSession` also writes the **session** `status` (`refunded`/`refund-failed`). |
| Store | `GameSessionStore.getSession(id)` reads the world setting (fresh, normalized); `upsertSession` replaces the whole session. No locking. |
| Callers | Pazaak/Sabacc/Hintaro cancel flows call it only for `escrowed`/`payout-failed` and use `.session`; the GM Datapad action `game-refund-escrow` (the only caller that can reach `refund-failed`) uses `.ok`/`.error`. |
| Payout state | `payout-failed` can leave a payout that really moved credits (`payout.rollbackFailed/indeterminate`, or table-balance `payouts[]` with a success and no successful `payoutRollbacks[]`). The old code refunded the full buy-in regardless. |
| Existing tests | None covered `GameCreditEscrowService`. |

## 3. Design (`game-credit-escrow-service.js`; `GameSessionStore` untouched)

**Per-entry refund state** (`deriveRefundStates`), from `escrow.credits.refundLedger[<debit transaction id>]` (new), else from the legacy `refunds` history by seat:
`pending` / `failed` (every attempt definitive) → may be refunded; `refunded` (a refund with a transaction id) → skipped; `indeterminate` (rollbackFailed / indeterminate / thrown / interrupted attempt) and `review` (malformed, id-less success, ledger/identity mismatch, ambiguous entry identity) → **never refunded automatically**. No refund identity is invented for legacy entries.

**Ledger entry**: `{key, seatId, seatLabel, actorId, actorName, amount, debitTransactionId, status, attemptId, refundTransactionId?, attempts[], lastError}`; `refunds` stays an **append-only history** (each attempt adds its record, now also with `debitTransactionId`, `attemptId`, `attemptedAt`).

**Sequencing** (`refundSession` → `refundSessionAuthoritative`):
1. The current session is read from `GameSessionStore` by id (missing ⇒ refused; the caller's copy is never the authority). A per-session in-memory guard refuses a concurrent refund in this client.
2. Unresolved payout activity (above) ⇒ refused with an explicit error and no movement; the status is left as `payout-failed`.
3. For **each** entry: re-read the session, re-derive that entry's state, skip anything not `pending`/`failed`; a missing actor is a recorded definitive failure (no engine call). Then **persist an intent marker** (`attempting`) → call `executeCreditAdjustment` → **persist the outcome** (ledger + history). A thrown/malformed engine result is `indeterminate`.
4. If the intent cannot be saved, no credit moves and processing stops. If the outcome cannot be saved after credits may have moved, processing **stops**, the result carries the refund transaction id and the persistence error (`indeterminate:true`), and the intent marker remains, so a later call treats the entry as unresolved and does **not** repeat it.
5. Final status is derived from the actual entry states: `refunded` only if every required entry is positively `refunded` (no required entries ⇒ refunded, unchanged); otherwise `refund-failed` with `refundError`, `refundFailedAt` and `refundUnresolved[]`. Return shape `{ok, session, refunds, error}` is kept (`refunds` = this call's attempts); `indeterminate`, `unresolvedEntries`, `skippedRefunded` are added only when relevant.

`refundDebitEntries` (used by `prepareEscrow`'s rollback) only gains `debitTransactionId` on its records; its single-pass behaviour is unchanged, and a later `refundSession` recognises its successes from the history.

## 4. Selective-retry matrix

| Previous evidence for the entry | `refundSession` |
|---|---|
| none | refund once |
| definitive failure (`success:false`, no unresolved flag) / missing wallet | retry once |
| success with a transaction id (ledger or legacy history) | skip |
| `rollbackFailed` / `indeterminate` / engine threw / attempt interrupted (intent without outcome) | skip; session stays `refund-failed`, `indeterminate:true` |
| malformed record, success without id, ledger/identity mismatch, ambiguous entry identity | skip (`review`); session not `refunded` |

## 5. Tests — `tests/ti4c0-g22-wager-refund-replay.test.mjs` (22 checks at first submission, 38 after correction 1, 56 after correction 2, 70 after correction 3)

**Fail-before** (base head): 6 of 22 passed; the over-refund is shown by observed credits and call counts (retry after partial failure refunds A twice; stale copy; preparation refund repeated; unresolved outcomes retried or not flagged; no per-entry evidence; no payout guard; no concurrency guard). **After:** 22/22.
Coverage: both entries once with evidence; partial failure; retry skips A and completes B; further calls (including the stale object) move nothing; stale caller copy; transaction ids and history preserved; `rollbackFailed` / `indeterminate` / thrown / malformed not retried and not marked refunded; legacy missing/malformed/ambiguous evidence fails closed and legacy successes are recognised; missing Actor; persistence failure after movement (stops, id surfaced, not repeated later); intent-write failure moves nothing; final status requires positive completion; preparation refunds not duplicated (prepare path A refunded, B failed, C failed leg → later refund only retries B once); `failed` stays non-refundable; return-shape compatibility incl. `payout-failed` with a definitive payout failure; unresolved payout activity blocks refund; missing session fails closed; concurrent call refused.

Mutation checks (each reverted): unconditional refund of every entry → 11 failures; stale caller session as authority → 3; `rollbackFailed`/`indeterminate` retryable → 3; refund transaction id dropped → 11; history overwritten by the latest attempt → 5; session marked refunded with unresolved entries → 6; processing continues after a persistence failure → 1; write-ahead intent removed → 2.

## 5a. Review correction 1 — evidence must belong to the debit being evaluated

Independent review of `22e45a07f` found that the legacy fallback associated refund history with an entry by **seat** (with a permissive actor check), so a record for a different Actor on the seat was ignored (⇒ another refund) and one success could certify two debits on a seat; that the wager profile was read from the caller's copy before the stored session; and that payout reversals were matched to payouts by seat alone.

- **`deriveRefundStates` (R1).** A ledger record now counts only if its **debit id, seat, actor and amount** all agree with the entry (otherwise `review`). Legacy history is attributed per record: a record **naming a debit id** belongs only to the entry with that id (and must agree on seat, actor and amount, else conflict); a named id that matches **no** entry on that seat is unattributable evidence (conflict); a record **without** an id is attributable only when the seat has exactly one escrow entry and actor and amount agree. Any conflict sends the entry to `review` (never refunded, never certified refunded, session not `refunded`); nothing is ignored as "no refund attempted". An unambiguous single-entry legacy success is still recognised; legacy history is read, never rewritten.
- **`refundSession` (R2).** The stored session is read first and decides whether this is a credit wager: a stale copy cannot cause a false skip nor enable a refund for a session that is not stored as a credit wager. Missing stored session: refused for a credit wager (unchanged); a genuine non-credit game with nothing stored keeps its `skipped` result.
- **`payoutRefundBlockers` (R3).** A payout counts as reversed only by a **successful** rollback matched to **that** payout, each rollback used once: a rollback naming `rollbackOfTransactionId` matches only that payout; an older one without it matches only when seat, actor and amount (`-approvedPayout`) agree. A reversal of another payout, a wrong amount/actor, or one rollback offered for two payouts leaves the payout unmatched and blocks the refund. New rollbacks now record `rollbackOfTransactionId` (additive evidence in `rollbackAppliedCreditPayouts`); no payout replay protection was added.
- Tests: 16 added (38 total). **Fail-before** on `22e45a07f`: 26/38 passed (12 failed: different-actor legacy success ignored → refund issued; one success certifying two debits; foreign/orphan debit ids and amount mismatch accepted; ledger debit-id/amount mismatch accepted; stale caller profile skipped a stored credit wager and enabled a non-credit one; unrelated payout rollback accepted; rollback not recording its payout). **After:** 38/38. Mutation checks (each reverted): legacy attribution by seat only → 5 failures; ledger debit/amount not checked → 2; caller profile decides eligibility → 2; payout rollback matched by seat only → 2; explicit debit id ignored → 2; `rollbackOfTransactionId` not recorded → 1.
- One existing fixture changed, deliberately: the "payout was rolled back" positive case in check 16 now carries the `actorId` and `amount` (`-150`) every real rollback record has (`rollbackAppliedCreditPayouts` always wrote them); a seat-only rollback is no longer accepted as proof.

## 5b. Review correction 2 — strict identity evidence, cross-seat conflicts, complete payout matching

Independent review of `1d9ad02` withheld certification. Correction 2 is limited to R4–R6 plus an investigation; `TransactionEngine` is **not** modified.

- **R4 — cross-seat attribution (`deriveRefundStates`).** Legacy history is now attributed in one pass over the records. A record that names a debit id belonging to another seat than the seat it records is conflicting evidence for **both** entries: the debit's owner and every entry on the seat the record claims. Neither is refunded automatically and neither is certified refunded. `C1-R1c` previously expected seat A to be refunded in this case; that expectation was wrong and is changed. Records naming correct, matching explicit debit ids on several debits of one seat are still attributed individually (`C2-R4b`). A record with neither a debit id nor a seat cannot be attributed to anything and fails every entry closed (`C2-R4c`).
- **R5 — complete identity.** Ledger records and legacy history now require the debit id (ledger), seat, actor **and** amount to be present and equal (`sameId` / `sameAmount`: a missing value never matches). Previously only *differing non-empty* values were rejected, so a record with no actor or no amount could certify a refund or enable a retry. This applies to failed records as well as successes (an unattributable failure may be an unrecorded indeterminate attempt). Missing legacy identities are not manufactured. Records written by `refundSession` and by the former `refundDebitEntries` always carried seat, actor, amount and debit id, so no real record shape is newly refused.
- **R6 — complete payout reversal (`payoutRefundBlockers`).** A rollback now reverses a payout only if its seat, actor (present and equal) and amount (`-approvedPayout`) agree, **including** when it names the payout via `rollbackOfTransactionId`; an id-less rollback needs the same. A missing actor or amount never matches. One rollback is still used at most once. No payout replay protection was added.

### Investigation — `TransactionEngine.executeCreditAdjustment` failure semantics

**Finding: the path is real and G22 would retry it.**

Code: `executeCreditAdjustment` creates a rollback snapshot in a `try` whose `catch` only logs ("continuing without rollback snapshot"), leaving `snapshotId = null`. It then calls `ActorEngine.applyMutationPlan(...)` **without** `transactional: true`, so `applyMutationPlan` takes no snapshot and performs no rollback. Inside it, `_applySetOps` commits `system.credits` and the transaction flag in a single `actor.update`, and *afterwards* (Phase 3, `rederive` defaults to `true`) runs `recalcAll(actor)`, which can throw. The outer `catch` only restores `if (snapshotId)`; with no snapshot it falls through to `return { success:false, transactionId, error }` — no `indeterminate`, no `rollbackFailed` — although the credits were already written.

Reproduction (scratch script, not committed): real `TransactionEngine`, `SnapshotManager.createSnapshot` throwing, `ActorEngine.applyMutationPlan` replaced by a model that commits `system.credits` and then throws the Phase-3 error. Result: `{"success":false,"transactionId":"tx_…","error":"derived-data recompute failed"}` with the actor at **1000** (was 900, +100). The offline shim replaces `ActorEngine` with a fake, so the real `applyMutationPlan` ordering above is established by reading `actor-engine.js` (`_applySetOps` then `recalcAll`), not by executing it. Not reproduced in live Foundry.

Effect on G22: `refundSession` classifies a plain `success:false` as `failed` (definitive, retryable). A refund whose credits moved but whose derived-data recompute threw would therefore be refunded again on retry — the original double-refund defect, reachable through an upstream result that does not say "credits may have moved". G22 cannot distinguish this from a genuine no-op failure using the result alone, and must not invent a balance-reading reconciliation (a new mechanism, out of scope).

**Certification impact:** G22's per-entry logic is correct *given* the engine's result contract; this defect makes `success:false` an unreliable "definitely not applied" signal when the rollback snapshot could not be taken. G22 should not be described as replay-safe against this path until the engine is corrected or the owner accepts it as a documented residual risk.

**Smallest safe correction (proposed, NOT implemented — needs authorization):** in `executeCreditAdjustment`'s `catch`, when `snapshotId` is `null` (no verified restore was possible) and the failure occurred at or after the mutation started, return `{ success:false, transactionId, indeterminate:true, partialMutationPossible:true, error }` instead of the plain failure. Failures before any mutation (validation, locks, insufficient credits, missing actor) already return before the `try`'s mutation and stay definitive. G22 already treats `indeterminate:true` as unresolved and never retries it automatically. The same contract question applies to the other `executeCreditAdjustment` callers (store, GM tools); changing it affects all of them, which is why it is a separate authorization.

## 5c. Review correction 3 — fail closed on unattributable named evidence and on debits without an identity

- **R7.** A legacy history record naming a debit id that matches no escrow entry, and carrying no usable seat (missing / null / blank), was silently ignored. It is now unattributable evidence: every entry that relies on legacy history fails closed (`review`). An unknown debit id with a usable seat still flags that seat's entries (unchanged); a record whose seat matches no entry of this session and names no debit is still not this session's evidence (unchanged).
- **R8.** `refundEntryKey()` fell back to `seat:<seatId>`, and the ledger comparison accepted `null === null` for the debit identity, so an escrow entry with no debit transaction id could be trusted as refunded/failed or refunded automatically. An entry whose `transactionId` is missing, null, empty or blank (`debitIdOf`) is now `review` (`escrow-entry-without-debit-transaction-id`) before any ledger or history is consulted: no automatic credit adjustment and no trusted ledger. The ledger debit comparison is strict (`sameId`). An id-less *legacy history record* is still honoured when the escrow entry itself has a valid debit id and attribution is unambiguous (`C3-R8b`).
- **Tests:** 14 added (70 total). **Fail-before** on `fa9bc2f`: 57/70 passed, 13 failed (R7 unknown-debit/no-seat; R8 missing/null/empty/whitespace id × no ledger / failed / refunded). **After:** 70/70. Mutation checks (each reverted, all detected): unknown debit + no seat ignored → 2 failures; id-less entry check removed → 5; whitespace id usable (no trim) → 5; empty-string id usable → 4. Rolling suite 391 passed / 0 failed (5 documented exclusions); syntax 2884 files; `validate-partials` and `git diff --check` clean; every `node tools/…` guard in `rolling-system-validation.yml` passes locally (the feat-inventory guard rewrites `docs/audits/generated/feat-inventory-report.*` as a side effect; those were reverted and are not part of this change).
- **Dependency:** the `TransactionEngine.executeCreditAdjustment` failure contract (§5b) is being corrected in a separate branch/PR from `main`; it is not part of G22.

## 6. Verification

**After correction 2 (`R4–R6`):** G22 56/56. **Fail-before** on `1d9ad02` (new/changed tests run against the unmodified production file): 44/56 passed, 12 failed (C1-R1c cross-seat expectation, C2-R4a, C2-R4c, six C2-R5a variants incl. missing actor/amount/seat, C2-R5b, C2-R5d missing actor, C2-R6a explicit-id wrong actor/amount, C2-R6b). Mutation checks (each reverted, all detected): no fan-out to the claimed seat → 3 failures; unknown-debit conflict dropped → 2; `sameId` lets missing values match → 10; `sameAmount` lets missing amount match → 5; ledger actor unchecked → 3; unattributable record ignored → 3; payout actor unchecked → 4; payout amount unchecked → 4; explicit rollback id skips the identity check → 2; rollback reusable (no one-per-payout) → 2. Rolling suite `Result: 391 passed, 0 failed (of 391 run; 5 excluded as documented pre-existing failures)`; rolling syntax check 2884 files; `validate-partials`, `system.json` parse and `git diff --check` clean; every `node tools/(check|audit|verify|build|migrate|validate)…` command in `rolling-system-validation.yml` passed locally (including `migrate-phase-5c-weapon-references.mjs --check`, which passed in this checkout); exact-head CI for the new commit is to be confirmed after push.

**Correction 1 figures (superseded, kept for history):**

G22 38/38. No other test touched `GameCreditEscrowService`. Rolling suite `Result: 391 passed, 0 failed (of 391 run; 5 excluded as documented pre-existing failures)`; guards 26 of 27 pass locally; `validate-partials`, `system.json` parse and the rolling syntax check (2884 files) pass; `git diff --check` clean. The guard `node tools/migrate-phase-5c-weapon-references.mjs --check` crashes only in a local git worktree (`ENOTDIR … .git/index`) and is verified in exact-head CI, not reported as locally passing.

## 7. Behaviour changes to note

- A refund from `payout-failed` is refused (no credits, status unchanged, explicit error) when a payout may still stand; previously the buy-in was refunded regardless.
- Entries with unresolved or ambiguous evidence are skipped and the session stays `refund-failed`; a GM must reconcile. There is no reconciliation operation in this checkpoint.
- An extra session write precedes each credit adjustment (the intent marker).
- A session absent from the store can no longer be refunded from a caller copy.

## 8. Remaining limitations (not certified)

- **L1 only; not exactly-once.** Single client; the world setting has no compare-and-swap, so two clients can still race. The in-memory guard only excludes concurrent calls in one client.
- **A crash or lost acknowledgement** between the credit adjustment and its outcome write leaves the intent marker (the entry becomes `indeterminate`, never repeated), but whether credits moved can only be established from the actor's TransactionEngine ledger; there are no durable receipts (L3) and no reconciliation operation.
- `prepareEscrow`'s own rollback refunds remain single-pass and are persisted after the batch; a failed initial debit that returned `rollbackFailed`/`indeterminate` is not tracked as an escrow entry (so it is never refunded here) — pre-existing, documented, not changed.
- Settlement/payout replay (`settleSession`, table-balance cash-out, GM approval) is not changed; payout evidence is only read to refuse an unsafe refund. G24, G26, G34, G35, TI4-B/C are untouched.
- Live Foundry behaviour is not established by the offline models.
