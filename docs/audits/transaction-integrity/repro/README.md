# TI-0 reproduction scripts (evidence only — not CI tests)

Run a script against any source tree: `SWSE_ROOT=<worktree> node docs/audits/transaction-integrity/repro/<script>.mjs`.
Each line is `REPRODUCED` (the described behavior is **present** in that tree — not always a defect; see "How to read the counts" below) or `NOT REPRODUCED` (absent or corrected). Where a script verifies a *correction*
(`repro-c3-force-point-transaction-vs-real-engine.mjs`), `NOT REPRODUCED` is the desired result. `run-all.sh` runs everything against the right trees and writes
`captured-output.txt`.

| Script | Finding | Evidence level | Tree(s) | Real parts | Faked parts |
|---|---|---|---|---|---|
| `repro-tx01-upgrade-order.mjs` | TX-01 | L1 | main | `UpgradeService`, `LedgerService` | eligibility workflow (stub), `ActorEngine` (shim fake) |
| `repro-tx03-action-rollback.mjs` | TX-03 | L1 | main, equipment | `ActionEconomyConsumption`, `ActionEconomyPersistence` | actor flags (in memory) |
| `repro-tx04-force-point-refund.mjs` | TX-04 | L2 | main | `ForcePointSpendCoordinator`, **real** `spendForcePoints`/`gainForcePoints` | persistence write, dice (`Roll`) |
| `repro-c3-force-point-transaction-vs-real-engine.mjs` | WP5-C3 FP transaction | L2 | equipment | transaction module, **real** spend/gain | persistence write |
| `repro-tx05-tx06-equipment-coordinator.mjs` | TX-05, TX-06 | L1 | equipment | coordinator, journal, fingerprint, resolvers | persistence, action authority (injected result shape) |
| `repro-tx07-actorengine-plan.mjs` | TX-07 | L2 (partial) | main | **real** `applyMutationPlan` control flow | op executors, `restoreFromSnapshot` (stubs) |
| `repro-tx08-store-snapshot.mjs` | TX-08 | L1 | main | `TransactionEngine`, `LedgerService`, `SnapshotManager` | `ActorEngine` (shim fake) with an injected late failure |
| `repro-tx11-follower-contract.mjs` | TX-11 | L1 | main | `runFollowerMutationTransaction` | synthetic steps |

**Limits:** the offline shim substitutes a fake `ActorEngine` (TI-N1); results demonstrate the *logic* of the code under test, not Foundry persistence. Scripts write nothing to the repository.

**Reading `REPRODUCED` for TX-06 (out-of-combat):** that no-op is the project's *established intentional policy*, so finalizing is correct there. The line is included only to show that the coordinator accepts it for the same reason it accepts `economy-modules-unavailable` — it cannot tell them apart. The defect is the missing discrimination, not the out-of-combat behavior.
**Reading `NOT REPRODUCED` for TX-05b:** the audit's "cross-actor false replay" does not occur (the intent digest includes the actor id); only a spurious `REQUEST_ID_CONFLICT` does (TX-05).


## How to read the counts
`REPRODUCED` means *the described behavior is present in that tree*; it is not always a defect. Of the 16 `REPRODUCED` results in `captured-output.txt`: **12 demonstrate defects** (TX-01, 03, 03b, 04a, 04b, 05 (narrow), 06 (authority-unavailable shape), 08a, 08b, 08c, 11a, 11b); **2 document by-design behavior** (TX-07a, 07b); **1 is caveated** (TX-01b, stubbed catalog); **1 is the intentional `out-of-combat` control** (TX-06, not a defect). Of the 7 `NOT REPRODUCED`: 2 are corrections on `961f4bc`, 1 disproves the audit's cross-actor-replay claim, 4 verify the WP5-C3 transaction against the real engine (desired).
**Evidence levels:** L1 = offline model test (fake `ActorEngine`); L2 = real `ActorEngine` method with stubbed persistence; L3 = Foundry runtime (none performed). See `../ti-0-checkpoint.md` §2.
