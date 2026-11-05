# Transaction Integrity — Authority and Call-Path Map (TI-0)

Source: static import/call search of `main` `4392c90`, with equipment-branch deltas from PR #1056 `961f4bc` noted. **ACTIVE / DORMANT / INACTIVE / TEST-ONLY** as defined in the ledger. This is reachability by code search, not Foundry-runtime proof. Search breadth: `scripts/`, `templates/`, repo-root `index.js`, `system.json`, `tests/`.

## 1. Authority map (retain; do not add a universal orchestrator)

| Domain | Authority (retain) | What it actually guarantees today | Gap tracked |
|---|---|---|---|
| Actor / embedded Item writes | `ActorEngine` (`scripts/governance/actor-engine/actor-engine.js`) | Single mutation gateway; context tracking for governance. `applyMutationPlan` is **sequential, non-transactional by default**; `transactional:true` is a **whole-actor snapshot restore**. No multi-document ACID. | TX-07 |
| Mutation governance | `MutationInterceptor` / Sentinel | Logs unauthorized writes in production (`normal`), throws in dev (`strict`). Prototype wrapping removed. **Not** isolation. | TX-13 |
| Equipment state | `EquipmentStateCoordinator` + `EquipmentTransactionJournal` (PR #1056) | GM-local, per-actor FIFO (process-local); durable PREPARED→APPLIED→FINALIZED journal; field-scoped conditional compensation; unresolved entries withhold readiness. No CAS. | TX-05, TX-06 |
| Action economy | `ActionEconomyConsumption` / `ActionEconomyPersistence` | Spend + history in an actor flag (`setFlag`, last write wins). Rollback: history-last on `main`; own-spend with verified outcome on `961f4bc`. | TX-03, TX-13 |
| Force Points | `ForcePointsService` (rules), `ActorEngine.spendForcePoints/gainForcePoints` (mutation), `ForcePointSpendCoordinator` (roll+spend+refund), `force-point-transaction.js` (attack FP, PR #1056) | Bonus FP are spent first. Coordinator refund goes to the normal pool and hides failure. | TX-04 |
| Credits / commerce | `TransactionEngine` + `LedgerService` (`scripts/engine/store/`) | In-process lock per actor+context, per-call random id, snapshot (best effort), audit ledger; credits written as an **absolute** value. | TX-08, TX-12 |
| Progression | `ProgressionFinalizer._applyMutationPlan` → `ActorEngine.applyMutationPlan(transactional:true)` | Whole-actor restore on failure inside the engine. | TX-09 sub-gap |
| Followers | `FollowerMutationTransaction` | Ordered steps, reverse-order compensation; "failed" = thrown only. | TX-11 |
| Ability registration | `AbilityExecutionCoordinator` | Deterministic rebuild; **not** a transaction coordinator. | — |
| UI command routing | `CommandBus` | Dispatcher only. | — |
| Modification eligibility | D-005 T4c–T4d-2 (PR #1057, offline) | Offline predicates; `selectable: 0`. **Not** an installation authority. | TX-14 (gate) |

## 2. Production call paths

### 2.1 Upgrade / customization writers (TX-01, TX-02)
```
ACTIVE   ShellHost.js:1187,1253 ─┐
ACTIVE   apps/upgrade-app.js:131 ─┼─> CommandBus 'APPLY_ITEM_UPGRADE' ─> UpgradeCommands.applyItemUpgrade
ACTIVE   sheets/v2/actor-sheet-base.js:1102,1147 ─┘                      └─> UpgradeService.applyUpgrade
          ├─ droid-actor-*  ─> DroidCustomizationEngine.applyDroidCustomization
          ├─ vehicle-actor-* ─> ActorEngine.applyMutationPlan({set installedSystems})   (no charge)
          └─ item: workflow state (read) ─> updateEmbeddedDocuments(system.installedUpgrades) ─THEN─> LedgerService.buildCreditDelta ─> ActorEngine.applyMutationPlan   ◄ TX-01
ACTIVE   item sheet / ShellOverlayManager ─> openItemCustomization ─> ItemCustomizationWorkbench._applyCurrentItem
          └─> TransactionEngine.executeMutationTransaction('owned-customization')  (cost + item in one plan)   ◄ TX-08
ACTIVE   customization bay / workbench ─> TechSpecialistModificationService ─> TransactionEngine.executeMutationTransaction
ACTIVE   lightsaber workbench ─> lightsaber-construction-engine ─> applyMutationPlan({transactional:true})
INACTIVE CustomizationWorkflow.applyInstall/applyRemove ─> InstallRemoveEngine   (no external caller)
INACTIVE crafting/ModificationIntentBuilder                                      (no importer)
```

### 2.2 Commerce (TX-08, TX-10, TX-12)
```
TransactionEngine.executeMutationTransaction   <- store-engine.js:367 (store checkout), Workbench, TechSpecialist           ACTIVE
TransactionEngine.executeAssetApprovalTransaction <- GMApprovalOperationsService (approveDroid, approvePendingCustom), gm-store-dashboard   ACTIVE
TransactionEngine.executeCreditAdjustment      <- store-checkout.js, gm-store-dashboard.js, holonet-intel/messenger services (×~10 sites),
                                                  games/wagers/game-credit-escrow-service.js (×7)                          ACTIVE
StoreTransactionEngine (saga)                  <- (comment only)                                                          INACTIVE
Domain Droid/VehicleTransactionService         <- (none; source says so)                                                  INACTIVE
Direct credit writers outside the authority    : talents/DarkSidePowers.js:1601,1969 · progression-event-processor.js:409 · equipment-engine.js:68
                                                  · follower-creator.js (starting credits at creation)                      ACTIVE (classify in TI-2)
```

### 2.3 Force Points (TX-04)
```
RollCore.applyForcePointLogic ─> ForcePointSpendCoordinator.rollAndSpend ─> ActorEngine.spendForcePoints … _safeRefund ─> gainForcePoints   ACTIVE
SWSERoll.rollAttack/rollAutofire/rollFullAttack ─> beginForcePointUse ─> ForcePointTransaction (commit/rollback/announce)                  ACTIVE on 961f4bc (PR #1056); on main: promptForcePointUse spends inline
SWSERoll.promptForcePointUse (damage, Use-the-Force)                                                                                         ACTIVE
30 inline ActorEngine.spendForcePoints call sites in 13 files (talent actions, feats/meta-resource, force executors, force suite, lightsaber forms, utils/force-points.js)   ACTIVE
enhanced-rolls.js ~1820 (Force Secrets) spend without checking the returned `spent`                                                         ACTIVE
```

### 2.4 Action economy (TX-03, TX-06)
```
ActionEconomyConsumption.spend <- chat-interaction-bridge, combat-feature-handlers, full-attack-executor, fire-state-store,
                                  core-attack-option-action-economy, InventoryEngine, combat-ui-behavior-hotfix, attacks.js, (961f4bc) sheet reload via _spendActionEconomy
   no-op results: missing-actor (denied) · free/passive · out-of-combat · economy-modules-unavailable          ◄ TX-06 ambiguity
   rollback: main -> Persistence.undoLast (history-last)      961f4bc -> own-spend, verified, status reported
EquipmentStateCoordinator.runExecution ─> deps.spendAction (default ActionEconomyConsumption.spend)          (PR #1056)
```

### 2.5 Progression (TX-09)
```
ProgressionShell.finalize / ProgressionSurfaceAdapter ─> ProgressionFinalizer.finalize(SingleStep) ─> _applyMutationPlan ─> ActorEngine.applyMutationPlan(transactional:true) ─> _syncPostApplyState   ACTIVE
MutationCoordinator.confirmAndApply ─> MutationPlan.apply (sequential, no rollback)                                             INACTIVE (no importer)
```

### 2.6 Followers and allies (TX-11)
```
follower-hooks.js · ally-assignment-service.js (assign / unassign / convert) · follower-creator.js ─> runFollowerMutationTransaction     ACTIVE
   rollbackFailed consulted by: convertToFollower, follower-creator (3 sites)    NOT consulted by: assignAsAlly, unassignAlly
```

### 2.7 GM approvals (TX-10)
```
GM Datapad ─> GMApprovalOperationsService.approveDroid (state check PENDING) / approvePendingCustom(index) ─> TransactionEngine.executeAssetApprovalTransaction     ACTIVE
```

### 2.8 Helpers named in the audit
`scripts/core/mutation-safety.js#safeMutateActor` — **no call site** (INACTIVE). `SafetyEngine` in-flight map — used by Workbench, template-engine, install-remove-engine (30 s timeout; process-local). `SnapshotManager.createSnapshot` — progression engine instance, finalize-integration, NPC progression, ally assignment (target snapshot), TransactionEngine (≥4 methods).

## 3. Overlap register (two systems doing the same mechanical transaction)

| Transaction | Systems | Intended authority | Bounded convergence proposal |
|---|---|---|---|
| Spend a Force Point for a roll bonus | `ForcePointSpendCoordinator`; `SWSERoll.promptForcePointUse` / `force-point-transaction`; 30 inline spenders | `ActorEngine.spendForcePoints` for the mutation; **one** transaction implementation for "spend now, maybe give back later" | After TI-1 correctness fixes, make the coordinator's refund reuse the transaction's relative/bonus-aware rollback; leave inline terminal spenders alone |
| Pay for an item customization | `UpgradeService` (LedgerService+ActorEngine) vs Workbench (`TransactionEngine`) | `TransactionEngine` (commerce) | Route the `UpgradeService` item path through the same single-plan `TransactionEngine` call (TX-01) |
| Refund an action | `Persistence.undoLast` callers; equipment coordinator compensation | `ActionEconomyConsumption` own-spend rollback | Accept C3; migrate no callers (they already receive the safe rollback) |
| Record "installed upgrade" | `system.installedUpgrades` vs `flags.foundryvtt-swse.customization` | Certified V2 installer (gated) | none until TX-14 gate lifts |
| Credit movement | `TransactionEngine` (many) vs direct writes (4 sites) | `TransactionEngine`/`LedgerService` | Classify each direct writer (grant vs commerce); route commerce ones; do not centralize grants |
