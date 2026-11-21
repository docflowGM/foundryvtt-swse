# TI-4 Phase 0 — Cross-Domain Test Plan

**Status:** `DESIGN_PROPOSAL`. No tests are added in this checkpoint (and none are rewritten or weakened).
**Method:** deterministic offline negative tests using the existing shim (`tests/helpers/foundry-shim`, `real-force-point-engine.mjs`) and the fail-before technique (run each new test against the unmodified base head to prove it fails there). Simulated multi-client interleaving is **same-process interleaving** and is **not** L2 evidence.

**Certifiability column:** `OFFLINE` = can be certified L1 with the offline harness; `RUNTIME` = requires real Foundry v13 (document persistence, hooks, embedded ids); `MULTI-CLIENT` = requires two or more connected clients (L2/L3, `RUNTIME_UNVERIFIED` until run).
**Existing coverage:** `EXIST` = an accepted test already covers the case at L1 (named); `PART` = partial; `NEW` = to be written in TI4-D.

## 1. Atomicity

| ID | Case | Domain(s) | Cert. | Existing | Gap link |
|---|---|---|---|---|---|
| A01 | Credit deduction succeeds, Item create fails → exact restore, no audit success record | commerce | OFFLINE | EXIST `ti2-commerce-integrity` | — |
| A02 | Asset ownership changes, payment fails (approval: asset write ok, owner write throws) | approvals | OFFLINE | EXIST `ti3` §3.4 | G09 |
| A03 | Mutation plan partially applies (CREATE ok, SET throws) in non-transactional mode | ActorEngine | OFFLINE | PART | G06,G10 |
| A04 | `applyMutationPlan(transactional:true)` rollback returns `{success:false}` → surfaces `rollbackFailed`, never logs "rolled back" | ActorEngine, progression | OFFLINE | NEW | G06 |
| A05 | Compensation returns `false` / `{success:false}` | followers, TE, FP | OFFLINE | EXIST TI-1/TI-3 | — |
| A06 | Compensation throws | followers, TE | OFFLINE | EXIST | — |
| A07 | Persistence applies a write and then throws (`recalcAll` throw after write) | FP, equipment, TE | OFFLINE | EXIST TI-1/TI-2 | — |
| A08 | Recovery evidence unavailable (snapshot missing/inexact) for adjustment, sale, rollback-correction | commerce | OFFLINE | EXIST for P20/P23 only | G07 |
| A09 | Post-commit notification/log/repaint throws | approvals, commerce | OFFLINE | EXIST (TI-3 §3.9) | — |
| A10 | Failed store droid/vehicle purchase leaves no orphan world actor | commerce | OFFLINE then RUNTIME | NEW (offline reproduction first; may find nothing) | G10 |
| A11 | `updateFollowerFromMutation` restore returns `{success:false}` | followers | OFFLINE | NEW | G11 |
| A12 | Attack: ammo rollback fails after FP spent; aggregate outcome is INDETERMINATE, not silent | combat | OFFLINE | NEW | G38 |
| A13 | `rejectDroid` after REJECTED written does not report failure | approvals | OFFLINE | NEW | G35 |
| A14 | Credit transfer leg 2 `rollbackFailed` → sender not refunded, outcome INDETERMINATE and stored on the holonet entry as such | holonet | OFFLINE | PART (engine EXIST, entry NEW) | G16 |

## 2. Idempotency

| ID | Case | Domain(s) | Cert. | Existing | Gap link |
|---|---|---|---|---|---|
| I01 | Duplicate purchase request (same `operationId`) charges once and returns the recorded receipt | commerce | OFFLINE | NEW (needs TI4-B) | G17 |
| I02 | Repeated Force Point refund (same receipt) | FP | OFFLINE | EXIST TI-1 | — |
| I03 | Replayed equipment transition (same `requestId`, same intent → DUPLICATE_REPLAYED; different intent → REQUEST_ID_CONFLICT) | equipment | OFFLINE | EXIST wp3a | G18 |
| I04 | Production caller mints id at intent: double-click yields one transition | equipment/UI | OFFLINE | NEW | G18 |
| I05 | Duplicate approval of the same asset | approvals | OFFLINE | EXIST TI-3 §3.3/3.4 | — |
| I06 | Duplicate approval of a **store item** (queue removal failed) | approvals | OFFLINE | NEW | G23 |
| I07 | Repeated progression finalization (same session) | progression | OFFLINE | NEW | G19 |
| I08 | Repeated modification installation | modification | **gated** — no active installer; test only against the dormant engine's contract if/when authorized | — | G40,G41 |
| I09 | Retry after uncertain completion: same id, recorded INDETERMINATE → REFUSED(unresolved), no write | all | OFFLINE | NEW (TI4-B) | — |
| I10 | Same id, different payload | commerce, equipment | OFFLINE | equipment EXIST; commerce NEW | G17 |
| I11 | Different ids, same content = legitimate separate operations | commerce, equipment | OFFLINE | NEW | — |
| I12 | Rollback correction applied twice | commerce/GM | OFFLINE | NEW | G20 |
| I13 | Dashboard reverse clicked twice | GM | OFFLINE | NEW | G21 |
| I14 | Wager refund from `refund-failed` does not re-refund entries already refunded | wagers | OFFLINE | NEW | G22 |
| I15 | Intel lockbox claim replay when `updateIntel` fails | holonet | OFFLINE | NEW | G25 |

## 3. Concurrency (same-process interleaving; **not** L2)

| ID | Case | Cert. | Existing | Gap link |
|---|---|---|---|---|
| C01 | Two purchases against one credit balance (interleaved awaits) | OFFLINE (L1) | EXIST TI-2 (same context); NEW for cross-method | G28 |
| C02 | Credit grant during refund (adjustment vs mutation, different keys) | OFFLINE (L1) | NEW | G28,G29 |
| C03 | Approval racing denial (same asset) | OFFLINE (L1) | EXIST TI-3 | — |
| C04 | Two GMs approving the same asset | **MULTI-CLIENT** (offline model shows only the marker guard) | marker guard EXIST; cross-client NEW/RUNTIME | G29 |
| C05 | Equipment posture changes during an attack | OFFLINE (L1) | PART (wp5-combat-readiness) | G04 |
| C06 | Ammunition expenditure racing reload | OFFLINE (L1) | NEW | G29 |
| C07 | Two modifications competing for one upgrade slot | gated (no active installer) / `UpgradeService` path OFFLINE | NEW | G28 |
| C08 | Follower assignment racing removal | OFFLINE (L1) for in-process; reservations MULTI-CLIENT | PART (`follower-conversion-reservation-race`) | G32 |
| C09 | Level-up racing another actor mutation | OFFLINE (L1) | NEW | G19,G34 |
| C10 | Two concurrent action-economy spends do not lose one | OFFLINE (L1) | NEW | G30 |
| C11 | HP change during FP-rescue dialog is not overwritten | OFFLINE (L1) | NEW | G31 |
| C12 | Ledger-reconciliation hotfix on two clients does not double-write | MULTI-CLIENT | NEW/RUNTIME | G34 |

## 4. Boundary-enforcement tests (static, OFFLINE)

| ID | Case | Gap link |
|---|---|---|
| B01 | Baseline-ratchet guard: no new writer of `system.credits` outside `TransactionEngine`/listed exceptions | G01,G03 |
| B02 | Same for `system.forcePoints.value` and `flags.swse.bonusForcePoints` | G03 |
| B03 | Same for `system.ammunition.current`, `flags.foundryvtt-swse.actionEconomy` | G03,G15 |
| B04 | Weapon-state keys rejected by `ActorEngine.updateOwnedItems` outside the coordinator context | G04 |
| B05 | No file under `scripts/` imports the D-005 host evaluator until authorized (preserves the unwired gate) | G41 |
| B06 | Dormant `InstallRemoveEngine` has no production importer | G40 |

## 5. What cannot be certified offline

Document persistence semantics, embedded-document id preservation across restore, hook ordering, real `recalcAll` side effects, world-setting write permissions for non-GM clients, socket relay behavior, GM failover, and every `MULTI-CLIENT` case. These are `RUNTIME_UNVERIFIED` and belong to the TI4-E runtime plan; the Q-033 T01–T20 fault-injection matrix (PR #1050 design) is the reference list for modification-install runtime tests.

## 6. Evidence required before a level may be claimed

| Claim | Required evidence |
|---|---|
| L1 for a domain | offline tests for each outcome in contract §4 + fail-before proof + guard test; every claim labelled "same-client". |
| L2 for a domain | a verified coordination mechanism **and** two-client Foundry runtime tests of C04-type cases passing; documented failover behavior. |
| L3 for a domain | persisted receipts surviving reload **and** a deterministic reconcile operation exercised in Foundry after an injected crash. |

No domain currently meets L2 or L3.
