# TI4-C0 G35 — Droid Rejection Post-Commit Integrity (checkpoint)

**Status:** implemented, awaiting independent L1 review. Not self-certified. Not merged.
**Scope:** `scripts/ui/shell/gm/GMApprovalOperationsService.js` — `rejectDroid()` only (plus a backward-compatible optional `noun` parameter on the existing `_afterCommit()` / `_reportCommitted()` helpers).
**Certification level claimed:** none. Evidence is offline, same-client (L1 shape) only. No L2, L3, exactly-once or live-Foundry claim.

## Defect reproduced

`rejectDroid()` referenced `ownerActor`, which was never declared in the method. After the `REJECTED` state update committed, building the `swseApprovalResolved` payload threw a `ReferenceError`. The surrounding `try/catch` then reported "Failed to reject droid" and returned `false` although the droid was already `REJECTED`. The build-history write, hook and UI refresh were all inside the same `try`, so any failure after the commit was also reported as a failed rejection.

Fail-before result on unmodified `main` (292527c): **3/12** (passing: failed-state-update truthfulness, unchanged guards, unchanged helper wording).

## Change

- Owner is resolved with the existing `resolveDroidOwnerActor()`; it is optional (null allowed). Rejection does not require an owner.
- Only the `REJECTED` state update sits in the failure path. If it fails: error notification "Failed to reject droid: …", return `false`, no history/hook/refresh, no success notice.
- After the state update succeeds, the commit boundary is crossed. History write, `swseApprovalResolved` hook and UI refresh each run through the existing `_afterCommit()`; failures are collected.
- Outcome is reported through the existing `_reportCommitted()`. Clean → info notice. Otherwise → one warning listing the failed follow-ups and stating the rejection is committed ("do not reject it again"). `rejectDroid()` returns `true`.
- `_afterCommit` / `_reportCommitted` gained an optional `noun` argument defaulting to `'approval'`; existing callers' wording is byte-identical (pinned by test 12).
- Hook payload shape is unchanged; `ownerActor`, `ownerActorId`, `approval.ownerActorId/Name` are now actually defined.

## Not changed

TransactionEngine; G21/G22/G24/G26/G34 implementations; approval lifecycle, validation and notifications of `approveDroid`/other paths; any other GM approval flow; hook consumers.

## Tests

`tests/ti4c0-g35-droid-rejection-post-commit.test.mjs` — 12 checks, **12/12** after the fix: normal rejection; hook payload (droid, owner, decision); ownerless droid rejects; hook / history / refresh failure after commit (and all three together); failed state update does not claim rejection; rejected droid cannot be rejected again; `denyRequest('droid:<id>')` route; guards unchanged; shared helper wording unchanged.

## Mutation checks (all killed)

| Mutant | Killed by |
|---|---|
| owner never declared (original defect) | 1, 2, 3, 5, 6, 10 |
| owner required for rejection | 3 |
| history write not isolated | 5, 7 |
| hook not isolated | 4, 7 |
| refresh not isolated | 6, 7 |
| state-update failure treated as committed | 8 |
| hook owner fields wrong | 2, 10 |
| rejection warning uses approval wording | 4 |
| PENDING-only guard removed | 9, 11 |

(Two mutants first survived because the edit hit the identical text in `approveDroid`; they were redone scoped to `rejectDroid` and killed.)

## Limitations

L1 offline only. Hook listeners (e.g. the Holonet approvals emitter) and the Shell UI refresh are stubbed, not exercised in a live Foundry runtime.

## Correction 1 (independent review R1)

**Finding (reproduced):** after the commit, `rejectDroid()` called `_reportCommitted()` unguarded. If `ui.notifications.info` (clean path) or `ui.notifications.warn` (follow-up-failure path) threw, the committed rejection surfaced as a rejected promise, both directly and through `denyRequest('droid:<id>')`.

**Fix:** the final `_reportCommitted()` call in `rejectDroid()` is wrapped in a callsite `try/catch` that logs the notification failure (`SWSELogger.warn`) and still returns `true`. No change to `_reportCommitted()`, `_afterCommit()`, `approveDroid()` or any other caller; the failed-initial-state path still returns `false`.

**Tests:** two new checks. 13 has the info notification throw; 14 has a hook failure plus a throwing warn notification. Each runs directly and through `denyRequest`, and asserts: no rejected promise, return `true`, droid `REJECTED`, exactly two writes (state and history, so no retry or reversal), and the failure logged. Fail-before at `6514678`: **12/14** (13 and 14 fail). After: **14/14**.

**Mutations (all killed by 13 and 14):** guard removed entirely; catch swallows without logging; catch returns `false`; catch rethrows. (A first attempt that removed only half of the `try/catch` produced a syntax error and was discarded.) The earlier nine mutants target code this correction does not change and were not re-run.

**Residual (unchanged, out of R1 scope):** on the failed-initial-state path, a throwing `ui.notifications.error` still propagates. Nothing is committed on that path, so no committed outcome is misreported.
