# TI4-C0 — Closure Report

**Status:** proposed closure assessment. Docs only. Awaiting independent review; not self-certified.
**Baseline:** `main` @ `57107d4f1c078b463ed16fd8972241f82f9c7ac8` (G35 merge, #1077). Post-merge CI: run 40521747976, success (396 passed, 0 failed, 5 documented exclusions; all `ti4c0-*` suites and the Phase 5C guard pass).
**Scope source:** TI-4 implementation roadmap §TI4-C0 (on `audit/ti4a-contract-guards`, PR #1063; not on `main`). It lists the C0 candidates as G06, G11, G16, G20 (+G21), G22, G24, G26, G34 and G35.
**Evidence level of everything below:** L1, offline and same-client. Nothing here is L2 (cross-client), L3 (durable recovery), exactly-once, or Foundry-runtime tested.

## 1. The ten C0 defects

| ID | Defect (short) | Integrated by | Merge commit | Post-merge CI | Regression tests |
|---|---|---|---|---|---|
| G06 | `ActorEngine.applyMutationPlan({transactional:true})` reported rollback outcomes it had not verified | #1071 | `882643a` | 39773920326 ✅ | `ti4c0-g06-rollback-verification`; `ti4c0-g06s1-exact-snapshot` (G06-S1 sub-correction: exact snapshot) |
| G11 | Follower update rollback was claimed, not verified | #1071 | `882643a` | 39773920326 ✅ | `ti4c0-g11-follower-rollback`, `ti4c0-g11-caller-outcomes` |
| G16 | Holonet credit transfers lost evidence; unresolved outcomes were shown as failed | #1071 | `882643a` | 39773920326 ✅ | `ti4c0-g16-holonet-credit-evidence` |
| G20 | An already rolled-back source transaction could be rolled back again | #1071 | `882643a` | 39773920326 ✅ | `ti4c0-g20-rollback-replay` |
| G21 | Legacy GM dashboard reversal bypassed the G20-protected rollback | #1071 | `882643a` | 39773920326 ✅ | `ti4c0-g21-legacy-dashboard-reversal` |
| G22 | Wager escrow refunds could repeat or be misattributed | #1070 | `530697f` | 39952425245 ✅ | `ti4c0-g22-wager-refund-replay` |
| G24 | Legacy store dashboard resolved pending sales by array index, not stable id | #1074 | `fb80c7b` | 40121470531 ✅ | `ti4c0-g24-pending-sale-identity` |
| G26 | Party Fund contributions/payouts misreported or auto-compensated unresolved outcomes | #1075 | `f41edc4` | 40130083664 ✅ | `ti4c0-g26-party-fund-integrity` |
| G34 | Progression ledger hotfix ran on any client and wrote class items directly | #1076 | `292527c` | 40502545185 ✅ | `ti4c0-g34-progression-ledger-sync-authority` |
| G35 | Droid rejection reported a committed rejection as a failure (undeclared owner; unguarded post-commit steps) | #1077 | `57107d4` | 40521747976 ✅ | `ti4c0-g35-droid-rejection-post-commit` |

**C0 dependency correction (not one of the ten):** `TransactionEngine.executeCreditAdjustment` requires a rollback snapshot and reports unverified mutations as indeterminate. Integrated by #1072 (`d35d2e4`, CI 39951288882 ✅); test `ti4c0-te-credit-adjustment-safety`.

Every item has a checkpoint in `docs/audits/transaction-integrity/ti4-c0-*-checkpoint.md`, a fail-before test, an independent L1 certification on its PR, and a merge-commit integration. All of the tests above run in the rolling suite (`node tools/run-rolling-tests.mjs`), which the Rolling System Validation workflow runs on every push and PR.

**Result:** all ten C0 defects are integrated on `main`.

## 2. Financial and mutation authority boundaries (state on `main`)

| Responsibility | Authority | Status after C0 |
|---|---|---|
| Purchases, sales, transfers, approvals, customization payments, rollback corrections, credit adjustments | `TransactionEngine` (`executeMutationTransaction`, `executeCreditAdjustment`, `executeCreditTransfer`, `executeAssetCustomizationTransaction`, `executeAssetApprovalTransaction`, `executeSaleTransaction`, `executeRollbackCorrection`, `execute`) | The C0-corrected callers (holonet transfers, Party Fund, wagers, pending sales, dashboard reversals, droid approval) route through it |
| Credit arithmetic for cart/purchase plans | `LedgerService` builds mutation plans; it does not write | Consumed by `TransactionEngine` and the customization/store callers |
| Actor and Item mutation | `ActorEngine` | G06/G11/G34 corrections enforce verified outcomes and ActorEngine-only writes on their paths |

**Credit writes that use `ActorEngine` but not `TransactionEngine`.** These are outside the C0 list and are *not* claimed to be defects. They are listed so nobody reads "one authoritative credit path" as already true everywhere:

| Location | Purpose |
|---|---|
| `scripts/talents/DarkSidePowers.js` (`createSithAlchemicalWeapon` ~L1601; `_spendCredits` ~L1969, used by `startSithAmuletCraft`) | Sith Alchemy crafting payments. Not covered by TI-1 (TI-1's Force Secret fix concerns Force Points, not credits). |
| `scripts/sheets/v2/character-like-sheet.js` ~L5980 | Manual credit add/subtract from the sheet |
| `scripts/engine/progression/engine/equipment-engine.js` ~L68, `scripts/engine/abilities/progression/progression-event-processor.js` ~L409, `scripts/apps/progression-framework/steps/summary-step.js` ~L1760 | Chargen/progression starting credits |

Whether these must route through `TransactionEngine` is TI4-C authority-enforcement scope (G01/G03 ratchet guard), not C0.

## 3. Known limitations (apply to every C0 item)

- **L2 (concurrency):** locks are process-local; world settings and documents have no compare-and-swap. Two GM clients can still race on the same refund, sale, fund entry or rollback. Each checkpoint names its own race.
- **L3 (recovery):** snapshots and in-flight guards live in memory. A reload, crash or lost acknowledgement mid-operation is not recovered. No durable receipt exists.
- **Live Foundry:** all evidence uses the Foundry shim. Hook delivery, `game.users.activeGM` election, document-model exactness and UI refresh are untested in a running Foundry V13 world.
- **Not exactly-once:** replay is prevented only within one client and only where a C0 item added a guard.
- **G35 residual:** a throwing `ui.notifications.error` on the failed (uncommitted) rejection path still propagates. Nothing is committed on that path.

## 4. Remaining transaction work (not C0)

From the TI-4 roadmap and gap register (both on `audit/ti4a-contract-guards`, not on `main`):

- **Open finding, unclassified — H7:** `transaction-engine.js:344` uses `const normalizedCost = Number(cost) || 0;`. A missing or non-numeric cost becomes 0 and passes validation as a free transaction instead of being refused. TI4-A registered it but no C0/B/C list assigns it. Needs an owner decision: a bounded fix now, or TI4-C.
- **TI4-B (identity/replay):** G17 (`TransactionEngine` operationId intake), **G18 (equipment `requestId` at intent)**, G19 (progression operationId), G23 (store-item acquired marker), G25 (lockbox).
- **TI4-C (authority enforcement):** G01/G03 (guard from report-only to ratchet), G04 (weapon-state guard inside `ActorEngine.updateOwnedItems`), G07–G09 (recovery preconditions and post-write verification), G28/G33 (wallet-scoped lock key), G30 (action-economy serialization), G31 (damage re-read), G38 (attack aggregate receipt).
- **TI4-D/E:** cross-domain tests and L2/L3 feasibility.
- **Modification executor prerequisites (TI4-A X2/X3):** 12 gaps M1–M12 plus the §5.5 atomicity requirement in `docs/audits/modification-v2-replacement-architecture.md`. Must close before any paid V2 install is activated.
- **Unmerged lineage A:** TI-1 resource integrity (#1059) sits on top of the equipment branch (#1056).

## 5. Impact on equipment integration

- **No C0 blocker remains.** Nothing in C0 prevents integrating the read-only equipment foundation (E0–E4-C0, up to `c63d798`), which adds no new financial or mutation path.
- **Dependency for the equipment cutover:** the coordinator on the equipment branch executes only in a GM-local context. A player route (WP3-B) needs the request identity, de-duplication and serialization that TI4-B **G18** defines. G18 should be scoped together with WP3-B, not as a general TI4-B prerequisite.
- **Dependency for paid modifications:** H7 and M1–M12 / §5.5 must be resolved before the V2 executor charges credits.

## 6. Closure verdict (proposed)

TI4-C0 is complete at L1: all ten defects plus the TransactionEngine dependency correction are integrated, protected by rolling regression tests, and green on post-merge CI. The open items above are assigned to later phases or need an owner decision (H7). None blocks the next authorized integration step.

## 7. Housekeeping candidates (owner decision; no action taken)

- PRs #1061 and #1064–#1069 are open drafts whose content reached `main` through #1071; they can be closed as superseded.
- PRs #1058 (TI-0), #1062 (TI-4 contract) and #1063 (TI4-A guards) hold the design documents this report cites but are not on `main`; integrate or archive.
- The G35 checkpoint's header still read "awaiting review / not merged"; this PR updates that status line only.
