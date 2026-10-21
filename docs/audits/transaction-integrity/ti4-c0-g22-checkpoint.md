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

## 5. Tests — `tests/ti4c0-g22-wager-refund-replay.test.mjs` (22 checks)

**Fail-before** (base head): 6 of 22 passed; the over-refund is shown by observed credits and call counts (retry after partial failure refunds A twice; stale copy; preparation refund repeated; unresolved outcomes retried or not flagged; no per-entry evidence; no payout guard; no concurrency guard). **After:** 22/22.
Coverage: both entries once with evidence; partial failure; retry skips A and completes B; further calls (including the stale object) move nothing; stale caller copy; transaction ids and history preserved; `rollbackFailed` / `indeterminate` / thrown / malformed not retried and not marked refunded; legacy missing/malformed/ambiguous evidence fails closed and legacy successes are recognised; missing Actor; persistence failure after movement (stops, id surfaced, not repeated later); intent-write failure moves nothing; final status requires positive completion; preparation refunds not duplicated (prepare path A refunded, B failed, C failed leg → later refund only retries B once); `failed` stays non-refundable; return-shape compatibility incl. `payout-failed` with a definitive payout failure; unresolved payout activity blocks refund; missing session fails closed; concurrent call refused.

Mutation checks (each reverted): unconditional refund of every entry → 11 failures; stale caller session as authority → 3; `rollbackFailed`/`indeterminate` retryable → 3; refund transaction id dropped → 11; history overwritten by the latest attempt → 5; session marked refunded with unresolved entries → 6; processing continues after a persistence failure → 1; write-ahead intent removed → 2.

## 6. Verification

G22 22/22. No other test touched `GameCreditEscrowService`. Rolling suite `Result: 391 passed, 0 failed (of 391 run; 5 excluded as documented pre-existing failures)`; guards 26 of 27 pass locally; `validate-partials`, `system.json` parse and the rolling syntax check (2884 files) pass; `git diff --check` clean. The guard `node tools/migrate-phase-5c-weapon-references.mjs --check` crashes only in a local git worktree (`ENOTDIR … .git/index`) and is verified in exact-head CI, not reported as locally passing.

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
