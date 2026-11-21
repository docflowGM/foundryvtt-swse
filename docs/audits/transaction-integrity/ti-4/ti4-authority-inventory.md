# TI-4 Phase 0 — Authority and Mutation-Path Inventory

**Status:** read-only audit. No production code, tests, data or D-005 artifacts changed.
**Evidence level of every claim:** source reading (`SOURCE_VERIFIED`) unless tagged otherwise. No Foundry runtime exists in this environment, so nothing here is L2/L3 evidence.

## 0. How to read this document

Claim labels: `SOURCE_VERIFIED` (code read at the cited line), `TEST_VERIFIED_L1` (an offline test models the behavior; the model `ActorEngine` is not Foundry), `DESIGN_PROPOSAL`, `RUNTIME_UNVERIFIED`, `OWNER_DECISION_REQUIRED`.

Provenance of findings: three inventory passes read the source independently (equipment/combat/resource, commerce/approvals, progression/followers/ActorEngine/modifications). The coordinator re-read these claims directly and they held: `†` marks a finding the coordinator re-verified line by line before using it. Unmarked findings are as read by the inventory pass and are cited so they can be re-checked.

Level vocabulary: **L1** local (one JS context), **L2** coordinated (multiple clients, verified mechanism), **L3** durable/recoverable. **No path in this repository has L2 or L3 evidence.** Where a table says `L1`, that means "offline-modelled", not "proven in Foundry".

### 0.1 Evidence heads (exact, verified remotely and locally)

| Ref | PR | Head SHA | Base | Draft | CI "Rolling system validation" |
|---|---|---|---|---|---|
| `main` | — | `4392c90dc324a0474e9ca470c514f4ec1a8fcc37` | — | — | not evaluated |
| `audit/equipment-ecosystem-e0-e1` | #1056 | `f4555227edfd27669608d2bd577bbb6d64c8dc95` | `main` | yes | success (run 39340430054) |
| `audit/d-005-t2-host-published-facts` | #1057 | `d191d60d97ea1c42e4ab9e7cdcdc306851d744b5` | `main` | yes | success (run 39261377635) |
| `audit/transaction-integrity-ti0` | #1058 | `169060a38b38ce80e0403f1e523c0cceebe67b37` | `main` | yes | success (run 39323920600) |
| `audit/ti1-resource-integrity` | #1059 | `abb81d9191a1852709c96c8b89be65a7ba9a09b1` | #1056 branch | yes | success (run 39348494357) |
| `audit/ti2-commerce-integrity` | #1060 | `903269083f9b7d3dac779b5313df7f78be635063` | `main` | yes | success (run 39360244898) |
| `audit/ti3-progression-followers-approvals` | #1061 | `4e51a15654adddae27da7e8a9ca1dda735771dd4` | #1060 branch | yes | success (run 39432891672) |

All six are open drafts; none is merged. `main` is unchanged by this work.

### 0.2 Integration dependency graph (do not merge to create a convenient base)

```
main 4392c90 ──┬─ #1058 TI-0 (docs)
               ├─ #1057 D-005 T2 (offline, selectable:0)
               ├─ #1056 equipment E0–E1 ──── #1059 TI-1 (base = #1056 branch)      "LINEAGE A": equipment, FP, action economy, ammo
               └─ #1060 TI-2 ───────────── #1061 TI-3 (base = #1060 branch)         "LINEAGE B": commerce, approvals, followers, progression
```

- Ancestry verified with `git merge-base --is-ancestor`: #1056 ⊂ #1059; #1060 ⊂ #1061; **#1059 ⊄ #1060/#1061 and #1058 is contained by neither lineage**. Lineage A is 43 commits / 166 files ahead of `main`; lineage B is 7 commits / 19 files ahead.
- **File overlap between the two lineages is exactly one production file: `scripts/apps/progression-framework/shell/progression-finalizer.js`** (TI-1 touched it for required-action truthfulness; TI-3 for post-apply reporting). Any later integration conflicts there.
- **Consequence for TI-4:** the design checkpoint is docs-only and is based on `main`. Implementation packages must each name one lineage as their base (see `ti4-implementation-roadmap.md` §2). The two lineages are never combined in a TI-4 branch without owner authorization.

## 1. Scope counts

| Metric | Count |
|---|---|
| Transaction domains inventoried | 14 |
| Authoritative / state-changing mutation paths mapped (table §3) | see `ti4-checkpoint.md` §3 (computed from the row IDs below) |
| Confirmed enforcement/integrity gaps | see `ti4-enforcement-gap-register.md` |

## 2. Classification key

ACTIVE (reachable from production UI/hooks by static search), DORMANT (defined, no production caller), INACTIVE (no importer), TEST-ONLY, CERTIFIED-UNWIRED (built and validated, deliberately not connected — D-005). Static reachability only; `RUNTIME_UNVERIFIED` for dynamic dispatch.

## 3. Path inventory

Columns: **Owner** = who actually performs the write. **Id** = operation identity. **Conc** = concurrency boundary. **Verify** = post-write verification. **Comp** = compensation. **Evid** = recovery evidence. All L2/L3 entries are NONE and omitted from the table; the L-column is the honest level.

### 3.1 Equipment, action economy, ammunition (lineage A tip `abb81d919`)

| ID | Path (entry) | Status / callers | Owner · fields | Id | Conc | Verify | Comp | Evid | L |
|---|---|---|---|---|---|---|---|---|---|
| P01 | `executeEquipmentIntent` — `engine/equipment/equipment-state-coordinator.js:419` | ACTIVE; one production caller `InventoryEngine.requestWeaponPosture` (`engine/inventory/InventoryEngine.js:229,241`) | Coordinator via `ActorEngine.updateOwnedItems`: `system.weaponPosture`, `system.weaponOccupancy`, `flags.swse.fireState.{wielded,v}`, ready-ignite fields (`:37,44,322-328`) | `requestId` ≤128 chars; **production caller mints a fresh `randomID(24)` per call** (`InventoryEngine.js:240`); `intentDigest`/`planDigest` sha-256 (`:429,332`); reuse with different intent → `REQUEST_ID_CONFLICT` (`:446,453`) | per-actor FIFO, **process-local** (`:349-357`); stale plan → `STALE_STATE` by digest (`:460-464`) | in-memory `actor.items` re-read only (`:370-375`) | field-scoped conditional restore, read-compare-write, "not CAS" (`:381-408`) | durable PREPARED→APPLIED→FINALIZED journal in actor flag `flags.swse.equipmentTxn`, cap 20 (`equipment-transaction-journal.js:26`); unresolved entries withhold readiness; **no reconciliation operation** | L1 |
| P02 | `InventoryEngine.setActivated` — `InventoryEngine.js:162-215` | ACTIVE (`character-like-sheet.js:3877`, `character-sheet/inventory-ui.js:106`, `crafting/phase-3-advanced-crystal-system.js:60`) | `ActorEngine.updateOwnedItems`: `system.activated/active`, emitLight, bladeColor, shield `currentSR`, `charges.current` (absolute, from in-memory read) | none | none | none | action-spend rollback on throw (`:211`) | none | L1 |
| P03 | `InventoryEngine.toggleEquip/equipItem` (non-weapon) — `InventoryEngine.js:111,121,325,349,372` | ACTIVE | `ActorEngine.updateOwnedItems` `system.equipped` | none | none | none | none | none | L0 |
| P04 | `ActionEconomyConsumption.spend` — `engine/combat/action/action-economy-consumption.js:149` | ACTIVE; 10 call sites in 9 files | `ActionEconomyPersistence.commitConsumption` → **raw `actor.setFlag`** `flags.foundryvtt-swse.actionEconomy` (`action-economy-persistence.js:152`) | per-spend random `spendId` (`:100,217`) used only for own-spend rollback | **none**: `commitConsumption` writes `after` derived from an earlier read (`:220-229`) → last-write-wins | none after write | `ownRollback` only if this spend is last history entry, re-read confirms (`:101-119`) | history array in the flag (reset per turn) | L1 |
| P05 | Direct `ActionEconomyPersistence` callers bypassing `spend` — `ui/combat/action-economy-bindings.js:138`, `engine/feats/condition-track-feat-actions.js:99`, `resetTurnState` at `character-like-sheet.js:4063`, `character-sheet/combat-ui.js:81` | ACTIVE | same flag | none | none | none | none | none | L0 |
| P06 | `FireStateStore` setters/`commitFired` — `engine/combat/fire-state-store.js:242-296,324` | ACTIVE | `ActorEngine.updateOwnedItems` `flags.swse.fireState.<key>` field-scoped delta; coordinator-owned keys excluded (`:202-212`) | none | none (same-key last-write-wins) | Foundry return list only (`confirmsItemUpdate` `:263-266`), not a DB re-read | action spend rolled back on failed prime/stock/config; `commitFired` best-effort by design (`:342-344`) and **its outcome is ignored by the caller** (`combat/rolls/attacks.js:884`) | none | L1 |
| P07 | `AmmoSystem.consumeAmmunition/rollbackSpend` — `engine/inventory/ammo-system.js:174,159` | ACTIVE; callers in `attacks.js`, `enhanced-rolls.js:859`, `full-attack-executor.js:98` | `system.ammunition.current`, **absolute write from in-memory read** (`:179-212`) | none | none | `consumeAmmunition`: none; `rollbackSpend` restores an **absolute** `previousAmmo` capped at max (`:159-165`)† | rollback result ignored by `attacks.js` callers | none | L1/L0 |
| P08 | `AmmoSystem.reloadWeapon` — `ammo-system.js:230` (+ `FireStateStore.reloadBySecondCrew` `:450`) | ACTIVE | ammo current + fireState clear (two writes `:277`) | none | none | `confirmsItemUpdate` on first write (`:270-274`) | partial: returns `reload-state-not-persisted` if second write fails | none | L1 |

### 3.2 Force Points

| ID | Path | Status / callers | Owner · fields | Id | Conc | Verify | Comp | Evid | L |
|---|---|---|---|---|---|---|---|---|---|
| P09 | `ActorEngine.spendForcePoints/gainForcePoints` — `governance/actor-engine/actor-engine.js:2004,1964` | ACTIVE (authority) | `system.forcePoints.value`, `flags.swse.bonusForcePoints` (bonus first), one `updateActor` | none | none | none; does not call `validateSpend`; extra args at `lightsaber-form-engine.js:281`, `force-adept-talent-actions.js:236` are ignored | none | none | L1/L0 |
| P10 | `force-point-spend-receipt.js` `giveBack` (`:51`) | ACTIVE (TI-1) | refund via `gainForcePoints` and bonus-pool `updateActor` | receipt object (module `WeakMap`, `:48`) — **memory only** | single-flight per receipt (`:54`), one client | pool-change detection **only when a write throws** (`:66-72`); a clamped no-op refund reports ok | clean failure retriable; uncertain → `indeterminate`, never retried | in-memory | L1 |
| P11 | `force-point-transaction.js` `createForcePointTransaction` (`:27`) | ACTIVE (attack/autofire/full attack, `combat/rolls/enhanced-rolls.js:272,338`) | `spendForcePoints(actor,1)` | object identity only | single-flight run promises (`:28-30`) | thrown write with changed pools → `indeterminate` (`:64-67`) | `rollback()` via receipt | `refundEvidence` in memory only (`:114`) | L1 |
| P12 | `ForcePointSpendCoordinator.rollAndSpend` — `engine/force/force-point-spend-coordinator.js:39` | ACTIVE via `RollCore.applyForcePointLogic` (`engine/roll/roll-core.js:68,96`) | spend then roll | receipt | none of its own | as P10 | refund closure on roll failure; lost if caller drops result | in-memory | L1 |
| P13 | **29 inline `ActorEngine.spendForcePoints(` call sites outside the authorities**† (literal grep: 31 occurrences in 15 files, of which 2 are the coordinator and transaction) — talent actions, `force-executor.js`, `meta-resource-feat-resolver.js`, `force-suite.js`, `guardian-spirit-actions.js`, etc.; plus `utils/force-points.js:225,262` | ACTIVE | P09 | none | none | `spent` checked at `enhanced-rolls.js:1873` only (others not audited) | none | none | L0 |
| P14 | **~31 direct absolute FP writers** (`forcePoints.value = current-1`) in 10 files: `talents/DarkSidePowers.js` (6), `engine/talent/talent-effect-engine.js` (15), `combat-executor.js`, `threshold-engine.js`, `reaction-engine.js`, `weapons-engine.js:391`, `reaction-registry.js:1049`, `dark-side-devotee-mechanics.js:467`, `sith-talent-actions.js:498`, `active-adapter.js:181`; manual/refill writers `swse-actor-base.js:302,345`, `character-like-sheet.js:6012,6035`, `GMWorkspaceSurfaceController.js:396` | ACTIVE (counts by grep; several are queued mutations, not all traced) | direct `updateActor`/`applyMutationPlan`; **ignore the bonus pool and `validateSpend`** | none | none | none | none | none | L0 |
| P15 | Bonus-pool whole-object writers: `force-executor.js:652,688`, `force-point-feat-actions.js:151`, `jedi-prestige-talent-actions.js:113`, `force-adept-talent-actions.js:112,260` | ACTIVE | `flags.swse.bonusForcePoints` read-modify-write | none | none | none | none | none | L0 |

### 3.3 Attack and damage

| ID | Path | Status | Notes (all `SOURCE_VERIFIED`) | L |
|---|---|---|---|---|
| P16 | `rollAttack` — `combat/rolls/attacks.js:672-1103` | ACTIVE | spend order: core attack option (:755) → temporal (:763) → ammo (:779) → FP (:831) → roll (:846) → `commitFired` (:884). Catch rolls back ammo, action, FP (:1095-1101) **without inspecting any rollback result**. No combined receipt, no op id. | L1/L0 |
| P17 | Autofire/burst — `enhanced-rolls.js:627-740,857-864` | ACTIVE | ammo consumed **after** damage resolved (:857-864); late failure leaves chat/damage produced and ammo unspent. | L0 |
| P18 | Full attack — `enhanced-rolls.js:1050-1156`, `engine/combat/full-attack-executor.js:60-127` | ACTIVE | batch ammo rollback logs only (:93-103); `{committed:true, rollback: async () => false}` (:116-125) is a fake rollback handle. | L0 |
| P19 | `ActorEngine.applyDamage` — `actor-engine.js:1366-1486` | ACTIVE; ≥37 call sites | `_maybeResolveForcePointRescue` (:1406) may spend an FP and **await a dialog**, then one absolute `updateActor` (HP, temp HP, shields, condition track) from pre-dialog reads; FP not refunded if the later write throws; no op id. | L0 |

### 3.4 Commerce core — `scripts/engine/store/transaction-engine.js` (lineage B tip `4e51a1565`; `TE`)

Every TE method mints a per-call random id `tx_${Date.now()}_${Math.random()…}` (:313,553,702,944,1187,1421,1593,1767). **No caller can supply an idempotency key.** Locks are the static in-memory `Set` `TE._mutationLocks` (:47), keyed differently per method (see P20–P26), so different methods on the same actor do **not** exclude each other; the only cross-method guard is `_creditReconciliations` (:50), set only during a compensation. Credits are always written as an **absolute** value computed from a client-side read.

| ID | Path | Status / callers | Fields | Verify | Comp | L |
|---|---|---|---|---|---|---|
| P20 | `executeMutationTransaction` (:297-487) | ACTIVE: `store-engine.js:371`, `UpgradeService.js:672`, `item-customization-workbench.js:3646`, `tech-specialist-modification-service.js:726,753` | `system.credits`, `flags.foundryvtt-swse.transactions.<id>`, caller plan | balance check (:433-441, mismatch → `indeterminate`); optional `verify()` (only `UpgradeService` supplies one) | recovery **required before write** (`#establishRecovery`, :252-264, refuses otherwise); whole-actor `#restoreVerified` (:271-281); targeted `#compensateUnverified` (:206-250) | L1 (`TEST_VERIFIED_L1`) |
| P21 | `executeCreditAdjustment` (:538-683) | ACTIVE; ≈20 call sites (escrow ×7, holonet ×~9, GM workspace, dashboard) | credits + audit flag | **none** (no balance or marker check) | snapshot **best effort**; continues without recovery (:620-632) | L1 |
| P22 | `executeCreditTransfer` (:685-905) | ACTIVE (holonet `:4148,5672,6750,6839,7309`) | two actors, two legs | per-leg success only | sequential saga; unresolved recipient leg blocks the sender refund (TI2-R3, :822-840); last-resort two-actor whole-snapshot restore (:871-880) | L1 |
| P23 | `executeAssetCustomizationTransaction` (:926-1153) | ACTIVE: droid/vehicle engines, `UpgradeService.js:623,717`, tech specialist, follower-droid hotfix | wallet credits + asset plan | wallet balance only when net cost ≠ 0 (:1096-1101); **asset write unverified** | recovery required (`refused:'recovery-unavailable'` :990-1010); both actors restored and verified | L1 |
| P24 | `executeAssetApprovalTransaction` + `acquireAssetDecisionLock` (:1155-1403) | ACTIVE: `GMApprovalOperationsService` `approveDroid`, `approvePendingCustom`, `gm-store-dashboard.js` | asset `storeAcquisition` marker, owner credits, audit | **none**; snapshot best effort (:1321-1331) | marker `storeAcquisition.transactionId` read inside the lock refuses re-approval (`refused:'already-acquired'` :1226-1233) — **the one durable replay guard in the commerce stack** | L1 |
| P25 | `executeSaleTransaction` (:1405-1575) | ACTIVE: `GMStoreOperationsService.js:64`, `gm-store-dashboard.js:476`, `apps/item-selling-system.js:245` | item delete + credits + audit holding full item copy | none; snapshot best effort | whole-actor restore if a snapshot exists | L1/L0 |
| P26 | `executeRollbackCorrection` (:1577-1745) | ACTIVE: `GMStoreOperationsService.rollbackTransaction` (:272) | credits, delete items, mark source `Rolled Back` (:1668-1671) | none | best-effort snapshot | L0 |
| P27 | legacy `TransactionEngine.execute` (:1757) | DORMANT (no caller; `substr` ids, no recovery) | — | — | — | L0 |
| P28 | `StoreTransactionEngine` (`store-transaction-engine.js`, 684 lines) | INACTIVE (no importer) — would be a parallel authority if wired | — | — | own `_rollback` | L0 |
| P29 | `StoreEngine.purchase` (`store-engine.js:307-470`) | ACTIVE: `store-checkout.js:393,474,574,1168`, `GMApprovalOperationsService.js:723` | world setting `storeInventoryPolicies` (stock, RMW, **no lock, no marker**) then P20 | price revalidation does not fail on exception (:264-268) | stock restored only when purchase known not to exist; HELD for `indeterminate`/`rollbackFailed` (:405-415); restore result not checked | L1 |

### 3.5 Multi-party credit saga paths

| ID | Path | Notes (`SOURCE_VERIFIED` unless tagged) | L |
|---|---|---|---|
| P30 | Wager escrow — `games/wagers/game-credit-escrow-service.js` (`prepareEscrow` :364, `settleSession` :495, `approvePendingSettlement` :697, `refundSession` :779) | `escrowId` only in the session JSON; replay protection is the session `status` read from the **caller's copy**; credit legs apply **before** the session record is saved; `refundSession` from `refund-failed` re-refunds **every** entry (:784-785)†; concurrent settle double payout `RUNTIME_UNVERIFIED` | L0 |
| P31 | Holonet credit paths — `holonet-messenger-service.js` (request pay :4141-4173, party fund :5697-5804, job payouts :1511-1560 with its own `_trade*` snapshot mechanism :6041,6150-6166) | `indeterminate`/`rollbackFailed` stored as `'failed'` (:4157); party-fund refund result unchecked (:5733-5743); fund restored after an unresolved payout (:5795); `_restoreTradeSnapshots` returns true without exactness check | L0 |
| P32 | Intel lockbox claim — `holonet-intel-service.js:1261-1308` | items created, then credits, then `updateIntel` records the claim; replay possible if `updateIntel` fails; items deleted while credits may exist if credit result is `indeterminate` | L0 |
| P33 | Direct credit writers outside TE: `talents/DarkSidePowers.js:1600-1602,1964-1971`; `apps/force-alchemy/force-alchemy-mechanics-service.js:393-446` (absolute pre-cost rollback, failure only logged); `sheets/v2/character-like-sheet.js:5976-5992` (player "add credits" button, no role check); `actor-sheet-base.js:1948`; `progression-event-processor.js:405-410`; `equipment-engine.js:66-71`; follower creation grants | ACTIVE; classification per site in gap register | L0 |

### 3.6 Customization / modification install boundary

| ID | Path | Status | Notes | L |
|---|---|---|---|---|
| P34 | `UpgradeService.applyUpgrade` item branch (`UpgradeService.js:672-693`) | ACTIVE via `CommandBus APPLY_ITEM_UPGRADE` | via P20 with `verify`; idempotence rests on state read **before** the lock (:638-640) | L1 |
| P35 | `UpgradeService.applyUpgrade` vehicle (`:628-633`) | ACTIVE | `applyMutationPlan` `system.installedSystems`, **no charge, no host check** — owner ruling D3: deferred/untouched | L0 |
| P36 | `UpgradeService.removeUpgrade` (`:702-756`) | ACTIVE | plain `updateEmbeddedDocuments`, no refund, no transaction | L0 |
| P37 | `ItemCustomizationWorkbench._applyCurrentItem` (`:3556-3683`) | ACTIVE | via P20, cost `preview.totalCost`, **no `verify`**; `SafetyEngine` in-flight guard is a process-local `Map` with 30 s auto-clear (`safety-engine.js:189-216`) | L1 |
| P38 | Lightsaber construction — `lightsaber-construction-engine.js:510-677` | ACTIVE | `applyMutationPlan({transactional:true})` (:635-641); **bypasses TE entirely** (no audit flag, no TE lock, no verification); Use-the-Force roll consumed before the write | L1 (engine mode only) |
| P39 | `TechSpecialistModificationService` (`:694-761`) | ACTIVE | via P20/P23; a failed roll still charges via an empty-plan transaction (:726); `paid: result.success` misreads `indeterminate` as unpaid (:728) | L1 |
| P40 | `CustomizationWorkflow`/`InstallRemoveEngine.applyInstall/applyRemove` (`install-remove-engine.js:56-246`) | DORMANT / TEST-ONLY | passes the **Item as the `options` argument** of `applyMutationPlan` (:154,246) and writes upgrade state to the actor — **defect; do not re-enable** | L0 |
| P41 | D-005 host-requirement artifacts (`origin/audit/d-005-t2-host-published-facts`: `data/modifications/host-requirements-v1.json` 35 records; `tools/lib/host-{requirements,evidence,evaluator}.mjs`) | CERTIFIED-UNWIRED, Node-only | no `scripts/` file imports them; every report is `selectable:false`, `installationAuthorized:false`; `"selectable": true` count 0. **Nothing in production certifies a host at install time.** Legacy per-item eligibility (`UpgradeEligibilityEngine`) is the only gate. | n/a |

### 3.7 GM approvals and legacy dashboard (lineage B)

| ID | Path | Notes | L |
|---|---|---|---|
| P42 | `approveDroid` (`GMApprovalOperationsService.js:273-375`) | via P24; pending check read before the lock, marker is the real guard; owner resolution may guess "any player-owned character" (:269) | L1 |
| P43 | `approvePendingCustom` / `decideDenial` / `denyPendingCustom` (:546-697,151-179) | stable `id` from `custom-id:` keys; index key refused for id-bearing records (:551-557); denial takes the same decision lock, refuses acquired markers, requires pending-draft evidence before `draft.delete()` | L1 |
| P44 | `_approveStoreItemPurchase` (:699-752) | via `StoreEngine.purchase` under TE lock only; **no asset decision lock, no acquired marker**; a failed post-commit queue removal permits a second charge+grant | L1/L0 |
| P45 | `rejectDroid` (:377-428)† | no lock; `ownerActor` is never declared in this function (declared only in other methods, :287,:562) so :406-412 throws a `ReferenceError` **after** `REJECTED` and history are written; catch reports "Failed to reject droid" | L0 |
| P46 | `gm-store-dashboard.js` `_reverseTransaction` (~:383-428) | `executeCreditAdjustment` with the negated amount; never marks the source reversed; row taken from a rendered list; each click reverses again | L0 |
| P47 | `gm-store-dashboard.js` `_resolvePendingSale` (~:440-495) | `pendingSales[index]` by rendered index; stale index can approve a different request (the id-based `GMStoreOperationsService.resolvePendingSaleRequest` exists) | L0 |

### 3.8 Progression and followers (lineage B)

| ID | Path | Notes | L |
|---|---|---|---|
| P48 | `ProgressionFinalizer.finalize/finalizeSingleStep/_applyMutationPlan` (`progression-finalizer.js:346,506,3697`) | via `applyMutationPlan({transactional:true})`; **no operation identity** — `sessionId` is log-only, `SessionStorage.markSessionCompleted` (`session-storage.js:318`) has no callers†; double confirm replays the whole plan; `isProcessing` is a per-shell UI flag; post-commit audit read-only (:439-455); `postApplyIncomplete` / `resyncPostApplyState` have **no production consumer** | L1 |
| P49 | NPC level-up → `ActorEngine.applyProgression` (`npc-progression-engine.js:278`) | persisted `SnapshotManager` snapshot + `revertToSnapshot`; root update → delete → create, non-transactional | L1 |
| P50 | `xp-engine.applyXP` → `updateActor` (`xp-engine.js:86`) | single write, no identity | L0 |
| P51 | Sheet drops / free-add via `ActorEngine.apply/applyDelta` (`drop-ui.js:39-168`, `character-like-sheet.js:3200-6039`) | `apply()` adoption deletes all items/effects then creates, no snapshot | L0 |
| P52 | Legacy `ProgressionEngine`/`ProgressionEventProcessor`/`finalize-integration` | no production caller by static search (`RUNTIME_UNVERIFIED` for dynamic dispatch); if active, credits written before the lineage ledger → retry double-grant | n/a |
| P53 | `runFollowerMutationTransaction` (`follower-mutation-transaction.js:75`) | steps + reverse compensation; failed = throw / `false` / `{ok:false}` / `{success:false}` (:40-42); the failing step itself is not compensated (:89); no durability | L1 |
| P54 | `FollowerCreator.createFollowerFromMutation` (`follower-creator.js:1271-1445`) | identity `finalizationToken`/`slot:<id>` persisted on `flags.foundryvtt-swse.followers` (:1313-1325); in-process in-flight map; `link` rollback writes absolute prior arrays (:1054-1059) | L1 |
| P55 | `FollowerCreator.updateFollowerFromMutation` (`:1467-1599`) | rollback calls legacy `restoreFromSnapshot` and **discards `{success}`**, logging "Rolled back" regardless (:1590-1599) | L0 |
| P56 | `AllyAssignmentService.assignAsAlly/unassignAlly` (`ally-assignment-service.js:907,1005`) | absolute prior-array rollback (overwrites concurrent change); errors annotated `rollbackFailed` (TI-3) | L1 |
| P57 | `convertToFollower` (`:1089-1539`) | GM only; idempotent on explicit `requestToken`; two **persistent flag reservations with TTL and write-then-reread** (`follower-slot-service.js:301,339-351`) — soft locks, not CAS; persisted exact snapshot, `requireExact:true` (:1344-1347); post-commit cleanup failure throws typed `committed:true` (:1528-1539) | L1 |
| P58 | `FollowerSlotService.grantManualFollowerSlot` (`:189`) | GM only; in-process in-flight map; single write | L1 |
| P59 | `follower-hooks.js` auto-detach (:340-380) | runs after the item is already deleted; rollback recreates items with **new ids** (:121-130, documented) | L0 |

### 3.9 ActorEngine and snapshots (cross-cutting authority)

| ID | Path | Notes | L |
|---|---|---|---|
| P60 | `ActorEngine.applyMutationPlan` (`actor-engine.js:3002`) | order CREATE→DELETE→SET→UPDATE→ADD→`recalcAll` (:3068-3092); doc comment says "all or none" (:2975-2978) but only `transactional:true` snapshots (`actor.toObject(true)`, in memory, :3058-3060); **rollback result is ignored and "rolled back" is logged even when the restore returned `{success:false}`** (:3109-3115)†; `partialMutationPossible` set only if the restore *throws* and has **no readers**; legacy snapshot has no `schemaVersion` so `exact` is always false; CREATE-bucket actors deleted best-effort (:3125-3145); only 2 callers pass `transactional:true` (`lightsaber-construction-engine.js:639`, `progression-finalizer.js:3713`); ≈39 call sites in 20 files | L1 |
| P61 | Embedded helpers and `moveEmbeddedDocuments`/`apply` adoption (`actor-engine.js:865-1020,1222+`) | each helper = bare delegate + `recalcAll`; `moveEmbeddedDocuments` documented "atomic" (:956-963) but delete (:1009) then create (:1012) with no compensation | L0 |
| P62 | `ActorEngine.applyProgression` (`:2397`) | root update, delete, create; non-transactional | L0 |
| P63 | `SnapshotManager` / `SnapshotService` (`snapshot-manager.js:55-246`, `snapshot-service.js:494-545`) | persisted ring of ≤10 full-actor snapshots in `flags.foundryvtt-swse.snapshots`; **only durable recovery evidence in these domains**; `restoreSnapshot` true only if success **and** exact; `ActorEngine.restoreFromSnapshot` wrapper (:2792) has none of that discipline; whole-actor restore reverts concurrent unrelated edits | L1 |

### 3.10 Governance (not a mutation path; stated here because every "enforcement" claim in this repository depends on it)

`MutationInterceptor` **enforces nothing** (`SOURCE_VERIFIED`†): authorization is a module-global `_currentMutationContext` (`governance/mutation/MutationInterceptor.js:58`) set by `ActorEngine` as a plain string; `hasContext()` (:195) and `_isAuthorized()` (:186) have no callers; `initialize()` (:103) no longer patches `Actor.prototype`; `MutationIntegrityLayer.emitMutationViolation` (`mutation-integrity-layer.js:109`) has no callers†; `SentinelUpdateAtomicity` is observe-only (`sentinel-update-atomicity.js:28`). A direct `actor.update`, `setFlag` or embedded document call reaches Foundry unobserved in every mode. `ActorEngine`'s own checks (derived-write authority :~330, HP max :633, strict semantic boundaries :4172) are skipped via caller-set options or free-text `source` regexes (`mutation-boundary-service.js:58-71`), and **none of them protect credits, Force Points or equipment state**.

## 4. Domain list (14)

1 Equipment state · 2 Action economy · 3 Fire state & ammunition · 4 Force Points · 5 Attack/damage commit · 6 Commerce core (TransactionEngine) · 7 Store purchase & stock · 8 Credit transfer, escrow & holonet sagas · 9 Customization / upgrade / modification boundary · 10 GM approvals & legacy dashboard · 11 Character progression · 12 Followers, allies & droid slots · 13 ActorEngine, snapshots & governance · 14 D-005 host requirements (certified-unwired).

## 5. Direct-write census (production `scripts/`, regex over source; includes comments)

`updateEmbeddedDocuments/createEmbeddedDocuments/deleteEmbeddedDocuments` on a non-engine receiver: 31 outside `actor-engine.js`, of which only two are real actor-Item writes (`engine/import/npc-damage-hydration-hooks.js:152`, `patches/progression-ledger-reconciliation-hotfix.js:181`). `actor.update(` with actor-like receivers: 77 matches in 35 files, mostly comments; real code at `utils/actor-utils.js:281,319` (the atomic sink `ActorEngine` itself uses), `engine/feats/weapon-foundation-feat-normalization-hooks.js:129`, `engine/core/UpdatePipeline.js:31,53` (callers unverified). `setFlag(`: 170 matches in 76 files across actor/item/user/world/combat receivers (receivers not classified). `patches/progression-ledger-reconciliation-hotfix.js` runs at `ready` on every client with **no GM gate**† and writes class item levels directly (:181,197-212).
