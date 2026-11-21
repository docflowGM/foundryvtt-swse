# Transaction Integrity Hardening — TI-0 Checkpoint (Preservation, Baseline, Reachability, TI-1 Plan)

**Phase:** TI-0 only. **No production code, test, data or workflow file was changed.** This checkpoint adds documentation and non-CI evidence scripts under `docs/audits/transaction-integrity/`. TI-1…TI-4 are planned, not started.
**Branch:** `audit/transaction-integrity-ti0`, created from verified `main` `4392c90dc324a0474e9ca470c514f4ec1a8fcc37`. Not merged; merging requires explicit owner authorization.
**Statuses:** analysis `SOURCE_VERIFIED` (static) · reproductions `OFFLINE` (shim; the `ActorEngine` is a fake unless noted) · nothing `FOUNDRY_TESTED`. **ARCHITECTURAL AUDIT + EVIDENCE ONLY.**

## 1. Preservation report (done before any other work)
| Item | State |
|---|---|
| WP5-C3 | **Already pushed and verified**, not WIP: PR #1056 head `961f4bc035b78b7dd124b6ba8edb63655a43baf5`; remote SHA re-fetched and equal; exact-head CI run 39318390232 **success**. No rescue branch was needed. |
| Worktrees | `/home/user/foundryvtt-swse` (session branch at `main`), `/home/user/wt-equipment` (PR #1056 head, **clean**), `/home/user/wt-ti0` (this branch). No other worktrees. |
| Stashes / untracked / uncommitted | None in any worktree before TI-0 started. |
| PR #1056 | open, draft, `961f4bc`. History intact (8fbd863 → 961f4bc, no force-push). |
| PR #1057 | open, draft, head `d191d60d97ea1c42e4ab9e7cdcdc306851d744b5` (re-verified; **untouched**). |
| `main` | `4392c90` (unchanged since the start of the engagement). |
| T4d-3 artifacts | **Still not recovered** (Chat 1 export outstanding); nothing recreated. Suspended per the directive. |
| Destructive operations | None (no reset/clean/rebase/force-push/branch deletion). |
| Attachment note | The first attachment received with the directive was an unrelated document (a school assignment report); the correct audit file arrived afterwards and is the source of the finding list below. |

## 2. Baselines
| Tree | Rolling suite (`tools/run-rolling-tests.mjs`) | Notes |
|---|---|---|
| `main` `4392c90` | **381 run, 381 passed, 0 failed**, 5 documented Force-power exclusions | local, fresh worktree |
| PR #1056 `961f4bc` | **399 run, 399 passed, 0 failed**, same 5 exclusions | local final run **and** CI run 39318390232 success |
| Delta | +18 test files | the equipment branch's added suites (E-series, WP5, C1–C3) |
| CI guards on the equipment head | all pass (combat-math / outcome / critical / reroll / vehicle / crew guards, modification registry and runtime `--check`/`--validate`, feat-pack, feat-inventory, syntax check on 2,911 files, partials, `system.json`) | |
**Evidence levels (used throughout this package; they must not be conflated):**
| Level | Meaning | Examples here |
|---|---|---|
| **L0** | Static reading of committed source | reachability, call graphs, TX-09/10/12/13 |
| **L1** | **Offline model test**: real production modules, but the shim's **fake `ActorEngine`** and in-memory persistence | `repro-tx01`, `tx03`, `tx05/06`, `tx08`, `tx11`; the WP5-C1…C3 unit suites |
| **L2** | **Real `ActorEngine` method executed offline** with stubbed persistence/dice (and, where stated, stubbed executors) | `repro-tx04`, `repro-c3-…-vs-real-engine` (real `spendForcePoints`/`gainForcePoints`); `repro-tx07` (real `applyMutationPlan` control flow; executors and `restoreFromSnapshot` stubbed) |
| **L3** | **Foundry runtime certification** (real documents, real persistence, multiple clients) | **none performed — nothing in this package is `FOUNDRY_TESTED`** |
An L1 result demonstrates the *logic* of the code under test; it is not evidence about Foundry persistence. L2 is stronger for the engine methods it exercises but still stubs persistence. Only L3 can settle concurrency, real snapshot-restore fidelity and live document-update semantics.

**Harness limitation (TI-N1):** the offline shim replaces `ActorEngine` with a fake. A green offline suite therefore says nothing about the real `spendForcePoints`, `gainForcePoints`, `applyMutationPlan`, `updateEmbeddedDocuments` or snapshot restore. TI-0 loads the real engine by file URL for the Force Point and plan repros; the WP5-C3 Force Point transaction, previously tested only against a model, was **verified against the real `spendForcePoints`/`gainForcePoints`** (4/4 scenarios correct).

## 3. Findings snapshot (details: `tx-remediation-ledger.md`)
| Class | Findings |
|---|---|
| `CONFIRMED_DEFECT` (reproduced) | TX-01 · TX-03 (main) · TX-04 (coordinator refund + bonus-pool refund) · TX-05 (narrower: false conflict) · TX-06 · TX-08 (×3) · TX-11 (contract) |
| `ALREADY_CORRECTED` | TX-03 on `961f4bc` (pending independent review); the attack Force Point path of TX-04 on `961f4bc` |
| `DESIGN_GAP` | TX-02 · TX-07 · TX-10 (live approvals) · TX-12 · TX-09 sub-gap |
| `INTENTIONAL_LIMITATION` | TX-13 · cross-client parts of TX-05/TX-07 |
| `INACTIVE_LEGACY` | TX-09 (`MutationCoordinator`/`MutationPlan`) · TX-10 (`StoreTransactionEngine`, Droid/VehicleTransactionService) · `InstallRemoveEngine` install path · `ModificationIntentBuilder` · `safeMutateActor` |
| `NOT_REPRODUCED` | TX-05b (cross-actor false **replay**) — the audit's wording did not hold; only a false conflict does |
| `CERTIFICATION_GATE` | TX-14 (`selectable: 0`) — not bypassed |
**Reading the 23 reproduction results** (`repro/captured-output.txt`; `main` `4392c90`, equipment `961f4bc`). `REPRODUCED` means *the described behavior is present in that tree*; it is **not** always a defect:
- **16 `REPRODUCED`** =
  - **12 demonstrated defects:** TX-01, TX-03, TX-03b, TX-04a, TX-04b, TX-08a, TX-08b, TX-08c, TX-11a, TX-11b, TX-05 (the narrow false conflict) and TX-06 (authority-unavailable shape, injected);
  - **2 documented-by-design behaviors** (evidence of a `DESIGN_GAP`, not a coding bug): TX-07a (default non-transactional apply) and TX-07b (existing whole-actor restore);
  - **1 caveated:** TX-01b (retry duplicate; eligibility catalog was stubbed, so it is not established);
  - **1 intentional-policy control:** TX-06 `out-of-combat` — the established no-op policy, included only to show the coordinator cannot tell it apart from an unavailable authority. **It is not a defect.**
- **7 `NOT REPRODUCED`** = 2 corrections confirmed on `961f4bc` (TX-03, TX-03b); 1 audit claim not borne out (TX-05b, cross-actor replay); 4 verifications that the WP5-C3 Force Point transaction is correct against the real engine methods (`C3-real-1…4`) — here "not reproduced" is the desired result.

**Findings beyond the audit** (`TI-N1`…`N8`): offline harness fakes `ActorEngine`; `TransactionEngine` ignores a non-throwing failed restore and logs success; the same snapshot-continue pattern in `executeCreditAdjustment` (the most-called commerce entry); the Force Point coordinator refunds a spent *bonus* point to the normal pool; absolute credit writes and four direct credit writers; `assignAsAlly`/`unassignAlly` ignore `rollbackFailed`; the progression post-apply sync reporting a false failure; the action-economy `undoLast` remains history-last (guarded, not removed).

## 4. Prioritized correction packages
| Pkg | Scope | Branch base | Depends on | Risk |
|---|---|---|---|---|
| **TI-1** resources | TX-03 follow-through, TX-04 coordinator, TX-05, TX-06, harness graft promoted to a shared helper | child of PR #1056 head `961f4bc` (the fixes reuse C3 code that is not on `main`) | independent acceptance of WP5-C3 | medium (equipment-adjacent) |
| **TI-2** commerce/upgrades | TX-01, TX-08 (+credit-adjustment twin), TI-N3 classification. **Must** address, as separate verified requirements: (a) snapshot-creation failure ⇒ refuse; (b) non-throwing `restoreSnapshot(false)` ⇒ explicit `rollback-failed`, never "successful"; (c) unsafe whole-actor restoration of unrelated concurrent state ⇒ no extension of it; (d) **write verification and recovery outcome checking** — a single `TransactionEngine`/`ActorEngine` plan is *not* multi-document atomic (see TX-01 ledger entry). A snapshot alone is never a sufficient recovery guarantee | main-based | D1 (**approved**, below) | high (live commerce) |
| **TI-3** progression/followers/approvals | TX-11, TI-N5, TI-N6, TX-10 live approvals | main-based | TI-2 (shared `TransactionEngine`) | medium |
| **TI-4** contract + guards | property tests, static guards, optional `classifyOutcome` | main-based | TI-1…TI-3 accepted | low |
Each package: fail-before reproduction → deterministic negative test → smallest change → targeted regressions → full rolling suite → CI guards → commit/push → exact-head CI → **stop for independent review**.

## 5. Concrete TI-1 implementation plan (for review; not started)
**Branch:** `audit/ti1-resource-integrity`, created from PR #1056 head `961f4bc`; own PR targeting the equipment branch (or `main` after integration — owner's call). The PR #1056/#1057 histories are not rewritten.

| Step | Change | Files (expected) | Fail-before test | Behavior change |
|---|---|---|---|---|
| 1.0 | Promote the real-engine graft to `tests/helpers/real-force-point-engine.mjs`; promote `repro-c3-force-point-transaction-vs-real-engine` to a CI test | tests only | n/a (verification of existing behavior) | none |
| 1.1 | **TX-04a/b:** `ForcePointSpendCoordinator._safeRefund` returns a verdict; `rolledBack:true` only when verified; the refund gives back what the spend receipt says was taken (bonus by entry id, normal as relative gain) by sharing the rollback logic with `force-point-transaction.js` (one implementation) | `force-point-spend-coordinator.js`, `force-point-transaction.js` (extract a helper) | `repro-tx04` as a CI test (fails at `961f4bc`) | none to FP rules; failed refunds become visible; bonus points return as bonus points |
| 1.2 | **TX-06:** the coordinator accepts `committed:false` only for explicit policy no-op reasons (`out-of-combat`, `free`, `passive`); `economy-modules-unavailable`, `missing-actor` and unknown shapes ⇒ `INDETERMINATE` (existing outcome), readiness withheld, no replay | `equipment-state-coordinator.js` | `repro-tx06` as a CI test | none for legitimate paths |
| 1.3 | **TX-05:** ledger key `(actorId, requestId)` | `equipment-state-coordinator.js` | two-actor test | removes a false conflict |
| 1.4 | **Force Secrets spend** (`enhanced-rolls.js` ~1820) checks the spend receipt | `enhanced-rolls.js` | injected zero-spend | none |
| 1.5 | Re-run and extend the matrix rows A1–A12 that apply (see `failure-injection-test-inventory.md`) against the real engine graft | tests | — | — |
**Not in TI-1:** migrating the 30 inline Force Point spenders; removing `undoLast`; any cross-client lock; any rules change; modification code.
**Acceptance:** all new tests fail at `961f4bc` and pass after; full rolling suite green; every guard green; exact-head CI green; ledger rows updated with commit SHAs; unresolved items stay `DESIGN_GAP`/`INTENTIONAL_LIMITATION` rather than being relabeled.

## 6. Owner rulings (independent review of TI-0, 2026-10-19) — recorded, not made by TI-0
| # | Question | Ruling |
|---|---|---|
| D1 | Refuse a purchase/customization when no recovery snapshot can be created? | **APPROVED.** Purchases and customization transactions refuse with an explicit error when required recovery capability cannot be established. A snapshot being *created* is not proof that a later restore will succeed; recovery must be **verifiable**. Do not extend unsafe whole-actor restoration. |
| D2 | TI-1 sequencing | **APPROVED:** wait for independent acceptance of WP5-C3 at `961f4bc` before beginning TI-1; then TI-1 proceeds as a focused child of PR #1056 with its own bounded review and no merges into `main`. Preserve both branches and their PR histories. |
| D3 | `UpgradeService` vehicle branch (installs without charging) | **DEFERRED.** Leave unchanged; record for separate rules/commerce review. **This is not authorization to certify free vehicle upgrades as correct.** |
| D4 | Inactive legacy implementations | **APPROVED deferral.** Leave untouched; removal belongs to the separately authorized V2 cleanup after dynamic-reachability and regression verification. |
**Status:** TI-0 *conditionally accepted* pending exact-head CI on this branch and the four documentation corrections (made in the follow-up commit). **TI-0 is stopped.** Nothing else (TI-1, T4d-3, modification integration, dead-code deletion) starts before WP5-C3 is independently accepted.

## 7. Limitations of this checkpoint
Static reachability only (no runtime trace); repros use the shim (fake `ActorEngine`; stubs named in `repro/README.md`); TX-10 concurrent approval, TX-08c concurrent credit write, TX-13 flag last-write-wins, real snapshot-restore fidelity and the live occurrence of `economy-modules-unavailable` are **Foundry-runtime-only**; the audit's TX-12 retry-duplicate claim (`tx01b`) depends on an eligibility catalog that was stubbed; `executeAssetApprovalTransaction`, `executeSaleTransaction`, `executeRollbackCorrection`, `executeAssetCustomizationTransaction` were not individually audited.

## 8. Architectural handoff (how equipment and modification work must consume the hardened authorities)
1. Equipment state changes keep going through `EquipmentStateCoordinator`; required actions are paid through `ActionEconomyConsumption` and **must treat an unavailable or ambiguous authority as `INDETERMINATE`** (TI-1.2).
2. A Force Point or action spent for a decision that may still be refused must use a **transaction** (commit at the last point, exact give-back, announce only when final), never inline spend-then-check.
3. A future V2 modification installer **must** be a single commerce-authority commit (item change + cost in one plan), carry a durable operation id and fingerprint, verify before reporting success, and fail closed without recoverability — and it stays behind TX-14 until separately certified.
4. No component may claim "atomic" without stating the §1 guarantee of `transaction-contract-proposal.md`.

## 9. Files in this checkpoint
`ti-0-checkpoint.md` (this), `tx-remediation-ledger.md`, `authority-and-call-path-map.md`, `transaction-contract-proposal.md`, `failure-injection-test-inventory.md`, `repro/` (`README.md`, `_boot.mjs`, eight scripts, `run-all.sh`, `captured-output.txt`).
