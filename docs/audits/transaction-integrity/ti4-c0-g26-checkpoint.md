# TI4-C0 / G26 — Holonet Party Fund contribution and payout outcome integrity

Branch `audit/ti4c0-g26-party-fund-integrity`, cut from `main` @ `fb80c7b68f52533e64bff6a84b05956148ca9ffa`. Level: **L1 only** (offline, one client). Not L2 (cross-client), not L3 (durable), not live Foundry, not exactly-once. Original authority: TI-4 Phase 0 enforcement gap register, G26 (S1).

## 1. Findings verified against current `main` (`scripts/holonet/subsystems/holonet-messenger-service.js`)

`_gmContributeToPartyFund`
1. The contributor's debit was checked with `if (!debit.success) return false;` — **no message, no distinction** between a definitive refusal and an unresolved result (`indeterminate` / `rollbackFailed` / `partialMutationPossible`, which `TransactionEngine.executeCreditAdjustment` returns since #1072). An unresolved debit is not proof that no credits moved; the player could be charged with nothing recorded. A *thrown* debit call propagated out of the method.
2. When the fund update failed, the fund was restored with `try { await setPartyFundBalance(before); } catch (_e) {}` — a failed restore was swallowed — and the contributor was then refunded. If the failed write had actually persisted and the restore also failed, the refund **creates credits** (fund keeps the contribution, player is refunded).
3. The refund's returned result was never inspected: `await executeCreditAdjustment(...)` inside a `try` that only caught throws. A returned `{success:false}` (or an indeterminate result) went unnoticed, and the thread was told "failed and was reverted" although the player stayed charged.
4. The `try` also covered the ledger append and the success announcement, which run **after** the fund holds the contribution. A failure in either rolled back and refunded a committed contribution and reported it as failed.

`_gmPayFromPartyFund`
5. The payout result was reduced to `payout.success`; a thrown call became `{success:false}`. Any non-success — including `rollbackFailed` / `indeterminate` / `partialMutationPossible`, where the recipient may already hold the credits — **restored the fund balance**, creating credits.
6. A failed fund restore was logged and the thread was still told "failed and was reverted".
7. After a successful payout, a ledger-append or announcement failure threw out of the method although the payout was committed.

## 2. Change (that one file only)

- `partyFundCreditOutcome(result)` classifies a credit-adjustment result as `success` | `failed` (a definitive `success:false` with none of the unresolved flags) | `indeterminate` (`indeterminate`, `rollbackFailed`, `partialMutationPossible`, a malformed result, or a thrown call); `partyFundCreditAdjustment` converts a thrown call into an indeterminate result. This uses the engine's existing outcome evidence and the same INDETERMINATE meaning as G16's `creditMovementEvidence`; no new authority.
- **Contribution debit:** indeterminate → no fund credit, no refund, no retry, a "needs GM review" thread message (`party-fund-contribution-indeterminate`); definitive failure → unchanged (nothing moved, nothing refunded).
- **Fund update failure** (`_rollbackPartyFundContribution`): restore the fund; **if the restore fails the fund state is unknown, so no refund is attempted** and the GM is told (`party-fund-contribution-indeterminate`). Refund result is read: `success` → "failed and was reverted" (unchanged); definitive refund failure → the contributor remains charged, reported as such (`party-fund-refund-failed`), not retried; unresolved refund → "could not be reconciled, needs GM review" (`party-fund-refund-indeterminate`), not retried. Never described as reverted unless the refund returned success.
- **Post-commit steps:** once the fund holds the contribution, the ledger entry and announcement are best-effort (errors logged); the contribution is not rolled back and `true` is returned.
- **Payout:** indeterminate → the fund is **not** restored, the payout is not retried, the uncertainty is recorded as a `payout-indeterminate` fund-ledger entry (amount `-value`, recipient, transaction id) and surfaced with a GM-review message (`party-fund-payout-indeterminate`); definitive failure → fund restored and "failed and was reverted" (unchanged) — and if the restore fails, "fund is short … needs GM review" instead (`party-fund-payout-restore-failed`); committed payout → ledger/announcement are best-effort and `true` is returned.
- Return values keep their boolean contract. The ledger-record shape of normal contributions and payouts is unchanged.

## 3. Behaviour changes to note

- An unresolved debit/refund/payout is now announced for GM review instead of being silent (debit) or labelled "reverted" / restored (refund, payout).
- A fund restore that fails no longer proceeds to a refund and no longer produces "reverted" text.
- A committed contribution/payout whose ledger entry or announcement fails is reported as committed (`true`) instead of rolled back / thrown. A missing ledger row is logged only.
- A thrown credit adjustment in these two methods no longer propagates; it is treated as unresolved.

## 4. Evidence

`tests/ti4c0-g26-party-fund-integrity.test.mjs` — 30 checks on the real service methods with a scriptable engine model that moves credits only on outcomes that can move them (economy invariant: fund + player + recipient is conserved; a larger total means credits were created) and an in-memory settings model whose writes can fail or persist-then-throw. **Fail-before on `fb80c7b`:** 7/30 passed (23 failed, including P4 — an unresolved payout where the recipient received the credits and the fund was restored, **creating 100 credits** — and C8 — fund write persisted-then-threw, restore failed, refund issued). **After:** 30/30. Mutation checks (each reverted, all 15 detected): outcome helper ignores unresolved flags → 14 failures; malformed result as definitive failure → 3; `partialMutationPossible` ignored → 3; thrown call propagates → 4; unresolved payout restores the fund → 7; unresolved payout not ledgered → 4; payout restore failure reported as reverted → 2; post-commit ledger/publish failures propagate (payout and contribution, 4 mutations) → 2 each; unresolved debit silent → 6; unresolved debit retried → 6; refund result ignored → 6; restore failure ignored before refund → 3.

Rolling suite `Result: 394 passed, 0 failed (of 394 run; 5 excluded as documented pre-existing failures)`; rolling syntax check; `validate-partials`; `system.json` parse; `git diff --check`; every `node tools/…` guard in `rolling-system-validation.yml` passes locally (the feat-inventory guard rewrites generated reports; reverted, not part of this change).

## 5. Not changed / remaining

- `TransactionEngine`, G21, G22, G24 and the engines are untouched. No new ledger, wallet, receipt system, reconciliation UI or cross-client mechanism.
- The Party Fund **job-reward** paths (`_gmAtomicJobCreditPayout`, `_gmDistributeJobCredits`, `_executeAtomicJobRewardSettlement`, the fund-cut writes), `_gmChargePartyFund`, and the GM deposit branch of `_gmTransferCredits` are outside the two methods G26 names and are unchanged; they use the same fund setting and an atomic-settlement wrapper and were not audited for this defect class.
- In `_gmPayFromPartyFund` the initial fund reduction (`setPartyFundBalance(before - value)`) is unchanged: a rejection there still propagates before any credit moves.
- Unresolved outcomes are surfaced as thread messages and (payout) a fund-ledger row; there is no reconciliation operation, so a GM must resolve them by hand. The fund ledger keeps only the last 100 entries (existing behaviour).
- The fund is a world setting with no compare-and-swap: concurrent writers (L2) can still interleave.
