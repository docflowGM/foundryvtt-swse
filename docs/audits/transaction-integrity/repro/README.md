# TI-0 reproduction scripts (evidence only — not CI tests)

Run a script against any source tree: `SWSE_ROOT=<worktree> node docs/audits/transaction-integrity/repro/<script>.mjs`.
Each line is `REPRODUCED` (the defect is **present** in that tree) or `NOT REPRODUCED` (absent or corrected). Where a script verifies a *correction*
(`repro-c3-force-point-transaction-vs-real-engine.mjs`), `NOT REPRODUCED` is the desired result. `run-all.sh` runs everything against the right trees and writes
`captured-output.txt`.

| Script | Finding | Tree(s) | Real parts | Faked parts |
|---|---|---|---|---|
| `repro-tx01-upgrade-order.mjs` | TX-01 | main | `UpgradeService`, `LedgerService` | eligibility workflow (stub), `ActorEngine` (shim fake) |
| `repro-tx03-action-rollback.mjs` | TX-03 | main, equipment | `ActionEconomyConsumption`, `ActionEconomyPersistence` | actor flags (in memory) |
| `repro-tx04-force-point-refund.mjs` | TX-04 | main | `ForcePointSpendCoordinator`, **real** `spendForcePoints`/`gainForcePoints` | persistence write, dice (`Roll`) |
| `repro-c3-force-point-transaction-vs-real-engine.mjs` | WP5-C3 FP transaction | equipment | transaction module, **real** spend/gain | persistence write |
| `repro-tx05-tx06-equipment-coordinator.mjs` | TX-05, TX-06 | equipment | coordinator, journal, fingerprint, resolvers | persistence, action authority (injected result shape) |
| `repro-tx07-actorengine-plan.mjs` | TX-07 | main | **real** `applyMutationPlan` control flow | op executors, `restoreFromSnapshot` (stubs) |
| `repro-tx08-store-snapshot.mjs` | TX-08 | main | `TransactionEngine`, `LedgerService`, `SnapshotManager` | `ActorEngine` (shim fake) with an injected late failure |
| `repro-tx11-follower-contract.mjs` | TX-11 | main | `runFollowerMutationTransaction` | synthetic steps |

**Limits:** the offline shim substitutes a fake `ActorEngine` (TI-N1); results demonstrate the *logic* of the code under test, not Foundry persistence. Scripts write nothing to the repository.

**Reading `REPRODUCED` for TX-06 (out-of-combat):** that no-op is the project's *established intentional policy*, so finalizing is correct there. The line is included only to show that the coordinator accepts it for the same reason it accepts `economy-modules-unavailable` — it cannot tell them apart. The defect is the missing discrimination, not the out-of-combat behavior.
**Reading `NOT REPRODUCED` for TX-05b:** the audit's "cross-actor false replay" does not occur (the intent digest includes the actor id); only a spurious `REQUEST_ID_CONFLICT` does (TX-05).
