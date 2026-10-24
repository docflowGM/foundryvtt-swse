# TI-4 Phase 0 — Transaction Compliance Matrix

**Purpose:** for every transaction domain, show which guarantees **exist and are test-modelled**, which are **missing**, and which are **only theoretical**. Status vocabulary:

| Mark | Meaning |
|---|---|
| ✅ L1 | Implemented and modelled by offline tests (`TEST_VERIFIED_L1`); correct within one JS context only. |
| ◐ | Partial: implemented for some paths/methods of the domain, absent for others (specified in the note). |
| ✗ | Missing (source read; no mechanism). |
| ⌀ | Theoretical only: a comment, name or doc claims it; the code does not provide it. |
| n/a | Does not apply. |

**There is no L2 or L3 evidence in any domain.** The L2/L3 columns therefore read ✗ unless a persisted record is genuinely durable (then L3 is ◐ with the reason). Paths are inventory IDs (`ti4-authority-inventory.md`); gaps are register IDs.

## 1. Pillar matrix (14 domains)

| # | Domain (authority) | Atomicity / honest outcome | Idempotency / replay | Concurrency safety | Verified commit | Recovery evidence | L1 | L2 | L3 |
|---|---|---|---|---|---|---|---|---|---|
| 1 | **Equipment state** (`EquipmentStateCoordinator`+journal) P01–P03 | ✅ conditional field-scoped compensation; honest FAILED_COMPENSATED/PARTIAL/INDETERMINATE | ◐ digest + `REQUEST_ID_CONFLICT` exist; **production mints a fresh id per call** (G18); P02/P03 have none | ◐ process-local per-actor FIFO + stale-plan digest (detection, not exclusion); P02/P03 none | ◐ in-memory read only, not a DB re-read | ◐ durable journal (cap 20); **no reconciliation op** (G36) | ◐ | ✗ | ◐ journal durable, no repair |
| 2 | **Action economy** (`ActionEconomyConsumption/Persistence`) P04–P05 | ◐ own-spend rollback verified by re-read | ✗ per-spend random id used for rollback only | ✗ last-write-wins on stale snapshot (G30) | ✗ none after write | ◐ history array in flag, reset per turn | ◐ | ✗ | ✗ |
| 3 | **Fire state & ammunition** P06–P08 | ◐ `FireStateStore` honest 3-state; ammo rollback absolute & results ignored (G12,G38) | ✗ | ✗ absolute RMW (G29) | ◐ `confirmsItemUpdate` on some writes, not `consumeAmmunition` | ✗ | ◐ | ✗ | ✗ |
| 4 | **Force Points** P09–P15 | ✅ TI-1 receipt/transaction: INDETERMINATE on uncertain write, never double-refund (one client) — covers attack/RollCore only | ◐ receipt object identity, memory only (G27); inline spenders none | ◐ single-flight per receipt; `spendForcePoints` itself none; 29 inline + ~31 absolute writers bypass (G03) | ◐ pool-change detection only on throw | ✗ in-memory | ◐ (only the TI-1 paths) | ✗ | ✗ |
| 5 | **Attack/damage commit** P16–P19 | ⌀ rollback best effort, results ignored (G38); damage: no compensation, FP rescue mid-dialog (G31) | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| 6 | **Commerce core** (`TransactionEngine`) P20–P28 | ◐ P20/P23 recovery-required + verified restore (TI-2); P21/P24/P25/P26 snapshot optional, unverified (G07–G09) | ◐ **no operation id** (G17); only the `storeAcquisition` marker (P24) is durable | ◐ per-method process-local keys, absolute credit writes (G28,G29) | ◐ balance check in P20/P23 only | ◐ audit flag (erased by restore) + snapshot ring | ◐ | ✗ | ◐ snapshot ring/marker durable; no reconcile |
| 7 | **Store purchase & stock** (`StoreEngine`+policy) P29 | ◐ stock held on INDETERMINATE (TI-2); restore unchecked | ✗ | ✗ stock RMW with no lock (world setting) | ✗ | ✗ stock reservation has no record | ◐ | ✗ | ✗ |
| 8 | **Credit transfer / escrow / holonet sagas** P22,P30–P33 | ◐ transfer: unresolved leg blocks refund (TI2-R3); escrow/holonet: unchecked results (G16,G22,G26) | ✗ escrow status read from caller copy (G22); lockbox (G25) | ✗ | ✗ | ◐ escrow logs, holonet snapshots (inexact) | ✗/◐ (transfer only) | ✗ | ✗ |
| 9 | **Customization / upgrade / modification boundary** P34–P41 | ✅ P34/P37(via TE)/P39 inherit TE; **no host certification at install** (G41, by design); P36 uncharged (G39); P38 bypasses TE (G15); P40 dormant defect (G40) | ◐ P34 state read before the lock | ◐ TE keys; `SafetyEngine` 30 s map (G33) | ◐ P34 `verify`; P37 none | ◐ TE | ◐ | ✗ | ✗ |
| 10 | **GM approvals & legacy dashboard** P42–P47 | ◐ committed vs bookkeeping separated (TI-3); P45 defect (G35) | ◐ stable ids + acquired marker (P42/P43); store-item approvals none (G23); dashboard reverse/sale replay (G21,G24) | ◐ shared decision lock, process-local | ✗ no post-write verification (G08) | ◐ marker | ◐ | ✗ | ◐ marker durable |
| 11 | **Character progression** P48–P52 | ✅ `committed`/`postApplyIncomplete` distinguished (TI-3); rollback result unchecked (G06) | ✗ no op id; `markSessionCompleted` dead (G19) | ✗ per-shell UI flag; ledger hotfix on every client (G34) | ◐ read-only post audit | ◐ draft persisted; no committed-state evidence | ◐ | ✗ | ✗ |
| 12 | **Followers / allies / slots** P53–P59 | ✅ runner + ally annotation (TI-3); P55 hides restore result (G11) | ◐ finalizationToken persisted (P54); `requestToken` (P57) | ◐ in-flight maps; persistent TTL reservations (soft, not CAS; G32) | ◐ write-then-reread on reservations | ◐ persisted exact snapshot (P57) | ◐ | ✗ | ◐ reservations/snapshot durable |
| 13 | **ActorEngine, snapshots & governance** P60–P63 | ⌀ plan "all or none" claim only with `transactional:true`; restore result ignored (G06,G14) | n/a | ✗ process-global mutation context (`MutationInterceptor` enforces nothing, G01) | ◐ `SnapshotManager` exact verdict (checked by TE only) | ◐ ≤10 persisted snapshots | ◐ | ✗ | ◐ |
| 14 | **D-005 host requirements** P41 | n/a (offline, `selectable:false`) | n/a | n/a | n/a | n/a | CERTIFIED-UNWIRED | n/a | n/a |

## 2. Reading the matrix

- **Strongest L1 evidence** (offline-modelled, independently accepted): TE `executeMutationTransaction`/`executeAssetCustomizationTransaction` (TI-2), the Force Point receipt/transaction (TI-1), the equipment coordinator and journal (PR #1056), `runFollowerMutationTransaction` and approval identity/denial (TI-3).
- **Weakest / only theoretical:** attack/damage commits (domain 5), `ActorEngine` "all-or-none", governance enforcement (`MutationInterceptor`), wager/holonet sagas, store stock.
- **Domains with no replay protection at all:** 2, 3, 5, 7, 8, 11. Domain 6 has one durable guard (the acquired marker) and per-call random ids elsewhere.
- **Where L3 is partially real:** persisted records survive reload (equipment journal, snapshot ring, `storeAcquisition` marker, follower reservations, persisted follower tokens), but **no domain has a deterministic reconciliation procedure**, which is what L3 requires. They are therefore marked ◐, not ✅.

## 3. Outcome-vocabulary compliance (contract §4)

| Domain | Distinguishes REFUSED | COMMITTED + postCommit | FAILED_COMPENSATED | INDETERMINATE |
|---|---|---|---|---|
| 1 | ✅ reason codes | ✅ (journal FINALIZED) | ✅ | ✅ |
| 2 | ◐ `noOp` reasons ambiguous (G36/G-AE1) | ✗ | ◐ `refunded/superseded/failed` | ✗ |
| 3 | ◐ | ✗ | ◐ | ◐ `unchanged` vs `failed` |
| 4 | ◐ | ◐ announce warnings | ✅ | ✅ |
| 5 | ✗ | ✗ | ✗ | ✗ |
| 6 | ✅ | ✅ `#emitCommitted` | ✅ (P20/P23) | ✅ |
| 7 | ◐ | ✅ | ◐ | ◐ stock held |
| 8 | ◐ | ✗ | ◐ | ◐ transfer only |
| 9 | ✅ via TE | ✅ | ✅ | ✅ |
| 10 | ✅ (`denied/stale-approved/missing/ambiguous/busy/uncertain`) | ✅ | n/a | ◐ `uncertain` |
| 11 | ◐ | ✅ `postApplyIncomplete` | ✗ result unchecked | ✗ |
| 12 | ✅ | ✅ `committed:true` errors | ✅ | ✅ (`rollbackFailed`) |
| 13 | ✗ | ✗ | ⌀ | ⌀ `partialMutationPossible` unread |
| 14 | n/a | n/a | n/a | n/a |

## 4. Domain pairs with interacting authorities (compatibility check)

| Pair | Interaction | Status |
|---|---|---|
| Equipment coordinator ↔ action economy | coordinator spends the action after the Item write and accepts only `committed:true` or `noOp(out-of-combat\|free\|passive)` (`equipment-state-coordinator.js:155,513-516`); loose-mode over-spend lands as INDETERMINATE (G36) | **conflict to resolve in TI4-A** (vocabulary of `noOp` vs `committed:false`) |
| Equipment coordinator ↔ upgrade/customization | coordinator owns `system.weaponPosture/Occupancy`, `fireState.{wielded,v}`, ready-ignite fields; `UpgradeService`/Workbench write `system.installedUpgrades`/`flags.*.customization`; **no shared fields** (verified from field lists) | compatible; shared concern is the actor-level lock key (G28) |
| TE ↔ Q-033 modification protocol | Q-033 §2 requires: recovery before write (TI-2 ✅ for P20/P23, ✗ others), exact restore (TE ✅), cross-context lock over all affected actors/items (**G28 ✗**), post-write re-read verification (P20 ✅ credits only), idempotency by transaction id (**G17 ✗**), quarantine on `RECOVERY_INCOMPLETE` (no mechanism) | modification executor **must stay gated** until G17/G28 and a quarantine mechanism exist |
| FP receipt ↔ equipment/action economy | independent resources; attack path spends action (P04), ammo (P07), FP (P11) with separate rollbacks and no combined receipt (G38) | gap in P16, not a conflict |
| Progression finalizer ↔ follower hooks | finalizer completion event triggers follower detach/auto-grant (`follower-hooks.js`) after commit | ordering is post-commit; failure cannot undo progression (consistent with Q4) |
| TI lineage A ↔ B | one overlapping file, `progression-finalizer.js` | conflict at integration only |
