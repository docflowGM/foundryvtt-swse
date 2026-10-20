/**
 * TI-4A report-only authority inventory — configuration.
 *
 * This file is DATA for a static, non-enforcing analyzer (tools/lib/ti4-authority-inventory.mjs). Nothing here grants runtime
 * authority, blocks a write, or changes any mechanic. It encodes (a) what counts as a "protected mechanical field family",
 * (b) which files ARE the family's authority, (c) documented exceptions, and (d) the files the accepted TI-4 Phase 0 audit
 * already inventoried (`docs/audits/transaction-integrity/ti-4/ti4-authority-inventory.md`), so that a writer outside that
 * census is reported as newly discovered instead of being silently absorbed into the baseline.
 *
 * Pattern sources are regular-expression strings (compiled by the analyzer). Paths use forward slashes relative to the scanned
 * root.
 */

export const CONFIG_VERSION = 'ti4a-authority-config/1';

/** Directories/files scanned (relative to the root). Production source only; tests, tools, docs and data are not scanned. */
export const SCAN_ROOTS = Object.freeze(['scripts', 'index.js']);
export const SCAN_EXTENSIONS = Object.freeze(['.js', '.mjs']);

/**
 * Callee names whose string argument is a READ of a path/flag, and callee names whose string argument is a WRITE.
 * A protected-path string passed to any other callee is reported as `unresolved-use`, never dropped.
 */
export const READ_CALLEES = Object.freeze(['getProperty', 'hasProperty', 'getFlag', 'get', 'has', 'getArray', 'getSetting', 'includes', 'startsWith']);
export const FLAG_WRITE_CALLEES = Object.freeze(['setFlag', 'unsetFlag']);
export const SETTING_WRITE_CALLEES = Object.freeze(['set', 'setArray', 'setSetting', 'setObject']);

/**
 * Protected field families. For each:
 *   paths          regex sources matched against comment-masked text (inside strings and in code)
 *   flagKeys       exact string arguments of getFlag/setFlag/unsetFlag that name the family's flag
 *   settingKeys    exact string arguments of a settings set/get call that name the family's world setting
 *   calls          calls to the family's authority API (reported as DELEGATED, not as direct writers)
 *   authorityFiles file path regexes that implement the authority (their own writes are AUTHORITY_INTERNAL)
 */
export const FAMILIES = Object.freeze({
  credits: {
    description: 'Credits and financial resources',
    paths: ['system\\.credits\\b'],
    flagKeys: [],
    settingKeys: [],
    calls: [
      { authority: 'TransactionEngine', re: '\\bTransactionEngine\\.execute(?:MutationTransaction|CreditAdjustment|CreditTransfer|AssetCustomizationTransaction|AssetApprovalTransaction|SaleTransaction|RollbackCorrection)\\s*\\(' },
      { authority: 'LedgerService', re: '\\bLedgerService\\.buildCreditDelta\\s*\\(' }
    ],
    authorityFiles: ['^scripts/engine/store/transaction-engine\\.js$', '^scripts/engine/store/ledger-service\\.js$']
  },
  forcePoints: {
    description: 'Force Points and bonus pools',
    paths: ['forcePoints\\.value\\b', '\\bbonusForcePoints\\b'],
    flagKeys: ['bonusForcePoints'],
    settingKeys: [],
    calls: [{ authority: 'ActorEngine.forcePoints', re: '\\bActorEngine\\.(?:spend|gain)ForcePoints\\s*\\(' }],
    authorityFiles: [
      '^scripts/governance/actor-engine/actor-engine\\.js$',
      '^scripts/engine/force/force-point-spend-(?:receipt|coordinator)\\.js$',
      '^scripts/engine/force/force-points-service\\.js$',
      '^scripts/combat/rolls/force-point-transaction\\.js$'
    ]
  },
  ammunitionFireState: {
    description: 'Ammunition and fire state',
    paths: ['ammunition\\.current\\b', 'flags\\.[\\w-]+\\.fireState\\b'],
    flagKeys: ['fireState'],
    settingKeys: [],
    calls: [
      { authority: 'AmmoSystem', re: '\\bAmmoSystem\\.(?:consumeAmmunition|rollbackSpend|setAmmunition|reloadWeapon|spendForWorkflow)\\s*\\(' },
      { authority: 'FireStateStore', re: '\\bFireStateStore\\.(?:commitFired|clearReload|primePreparedAttack|setPowerSourceState|spendRequiredActions|setSizeTreatment|setMounted|setHeldTogether|setConfiguration|setStockState|setLoadedPayload|reloadBySecondCrew|recordCrewRegulation|mountOnHost|unmountFromHost|applyOwnedSelection|resetUsage)\\s*\\(' }
    ],
    authorityFiles: ['^scripts/engine/inventory/ammo-system\\.js$', '^scripts/engine/combat/fire-state-store\\.js$']
  },
  actionEconomy: {
    description: 'Action economy',
    paths: ['flags\\.[\\w-]+\\.actionEconomy\\b'],
    flagKeys: ['actionEconomy'],
    settingKeys: [],
    calls: [
      { authority: 'ActionEconomyConsumption', re: '\\bActionEconomyConsumption\\.spend\\s*\\(' },
      { authority: 'ActionEconomyPersistence', re: '\\bActionEconomyPersistence\\.(?:commitConsumption|setTurnState|undoLast|spendReaction|resetTurnState)\\s*\\(' }
    ],
    authorityFiles: ['^scripts/engine/combat/action/action-economy-(?:consumption|persistence)\\.js$']
  },
  equipmentState: {
    description: 'Equipment posture, occupancy and readiness',
    paths: ['\\bweaponPosture\\b', '\\bweaponOccupancy\\b', '\\bequipmentTxn\\b'],
    flagKeys: ['equipmentTxn'],
    settingKeys: [],
    calls: [{ authority: 'EquipmentStateCoordinator', re: '\\bexecuteEquipmentIntent\\s*\\(|\\bInventoryEngine\\.requestWeaponPosture\\s*\\(' }],
    authorityFiles: ['^scripts/engine/equipment/equipment-(?:state-coordinator|transaction-journal)\\.js$']
  },
  upgradeModificationState: {
    description: 'Upgrade and modification state',
    paths: ['\\binstalledUpgrades\\b', '\\binstalledSystems\\b', 'flags\\.[\\w-]+\\.customization\\b'],
    flagKeys: ['customization'],
    settingKeys: [],
    calls: [
      { authority: 'UpgradeService', re: '\\bUpgradeService\\.(?:applyUpgrade|removeUpgrade)\\s*\\(' },
      { authority: 'InstallRemoveEngine', re: '\\bInstallRemoveEngine\\.(?:applyInstall|applyRemove)\\s*\\(' },
      { authority: 'LightsaberConstructionEngine', re: '\\bLightsaberConstructionEngine\\.attemptConstruction\\s*\\(' }
    ],
    authorityFiles: ['^scripts/engine/upgrades/UpgradeService\\.js$']
  },
  progressionEntitlements: {
    description: 'Progression entitlements',
    paths: ['\\blevelUpEntitlementManifest\\b', '\\bprogressionHistory\\b'],
    flagKeys: ['progressionHistory', 'levelUpEntitlementManifest'],
    settingKeys: [],
    calls: [
      { authority: 'ProgressionFinalizer', re: '\\bProgressionFinalizer\\.(?:finalize|finalizeSingleStep|resyncPostApplyState)\\s*\\(' },
      { authority: 'ActorEngine.applyProgression', re: '\\bActorEngine\\.applyProgression\\s*\\(' }
    ],
    authorityFiles: ['^scripts/apps/progression-framework/shell/progression-finalizer\\.js$']
  },
  ownershipFollowersAssignments: {
    description: 'Ownership, followers and assignments',
    paths: ['flags\\.[\\w-]+\\.followers\\b', '\\bfollowerSlots\\b'],
    flagKeys: ['followers', 'followerSlots'],
    settingKeys: [],
    calls: [
      { authority: 'AllyAssignmentService', re: '\\bAllyAssignmentService\\.(?:assignAsAlly|unassignAlly|convertToFollower)\\s*\\(' },
      { authority: 'FollowerSlotService', re: '\\bFollowerSlotService\\.(?:reserve|release|grant|revoke)\\w*\\s*\\(' },
      { authority: 'FollowerMutationTransaction', re: '\\brunFollowerMutationTransaction\\s*\\(' },
      { authority: 'FollowerCreator', re: '\\bFollowerCreator\\.(?:createFollowerFromMutation|updateFollowerFromMutation)\\s*\\(' }
    ],
    authorityFiles: [
      '^scripts/engine/crew/ally-assignment-service\\.js$',
      '^scripts/apps/progression-framework/adapters/follower-mutation-transaction\\.js$',
      '^scripts/apps/follower-creator\\.js$',
      '^scripts/engine/crew/follower-slot-service\\.js$'
    ]
  },
  gmApprovalState: {
    description: 'GM approval state',
    paths: ['\\bstoreAcquisition\\b'],
    flagKeys: ['storeAcquisition'],
    settingKeys: ['pendingCustomPurchases', 'pendingSales'],
    calls: [{ authority: 'GMApprovalOperationsService', re: '\\bGMApprovalOperationsService\\.(?:approve|deny|reject)\\w*\\s*\\(' }],
    authorityFiles: ['^scripts/ui/shell/gm/GMApprovalOperationsService\\.js$', '^scripts/engine/store/acquisition-service\\.js$']
  }
});

/**
 * Documented exceptions: (file, family) pairs the Phase 0 audit explicitly classified as intentional, manual or compatibility
 * adapters. An exception records WHY; it grants no runtime authority and is not a suppression of the finding (the record is still
 * emitted, marked DOCUMENTED_EXCEPTION).
 */
export const EXCEPTIONS = Object.freeze([
  { file: '^scripts/sheets/v2/character-like-sheet\\.js$', family: 'credits', reason: 'Player/GM manual "add credits" sheet control (Phase 0 P33); no role check recorded — classified, not endorsed' },
  { file: '^scripts/sheets/v2/character-like-sheet\\.js$', family: 'forcePoints', reason: 'Manual Force Point +/- sheet buttons (Phase 0 P14)' },
  { file: '^scripts/sheets/v2/actor-sheet-base\\.js$', family: 'credits', reason: 'Manual reset control (Phase 0 P33)' },
  { file: '^scripts/ui/shell/gm/controllers/GMWorkspaceSurfaceController\\.js$', family: 'forcePoints', reason: 'GM workspace manual Force Point edit (Phase 0 P14)' },
  { file: '^scripts/engine/crafting/phase-3-advanced-crystal-system\\.js$', family: 'equipmentState', reason: 'Free (no-cost) crystal activation through InventoryEngine.setActivated (Phase 0 P02)' }
]);

/**
 * Files already inventoried by the accepted Phase 0 audit, by family (writers the audit named, from
 * ti4-authority-inventory.md §3 and the three inventory passes). A writer in a file not listed here and not an authority file is
 * UNCLASSIFIED = newly discovered relative to Phase 0. The lists are references, not counts to hardcode.
 */
export const PHASE0_CENSUS = Object.freeze({
  credits: [
    'scripts/talents/DarkSidePowers.js',
    'scripts/apps/force-alchemy/force-alchemy-mechanics-service.js',
    'scripts/sheets/v2/character-like-sheet.js',
    'scripts/sheets/v2/actor-sheet-base.js',
    'scripts/sheets/v2/character-sheet/form.js',
    'scripts/engine/abilities/progression/progression-event-processor.js',
    'scripts/engine/progression/engine/equipment-engine.js',
    'scripts/apps/progression-framework/shell/progression-finalizer.js',
    'scripts/apps/progression-framework/steps/summary-step.js',
    'scripts/apps/progression-framework/shell/mutation/progression-economy-plan-builder.js',
    'scripts/apps/follower-creator.js',
    'scripts/domain/droids/droid-modification-factory.js',
    'scripts/domain/vehicles/vehicle-modification-factory.js',
    'scripts/engine/crafting/lightsaber-construction-engine.js'
  ],
  forcePoints: [
    'scripts/apps/force-alchemy/force-alchemy-mechanics-service.js',  // Phase 0 P33 (credits + FP + DSP debited in one update)
    'scripts/utils/force-points.js',
    'scripts/engine/force/force-power-final-integration.js',
    'scripts/engine/force/force-executor.js',
    'scripts/engine/feats/meta-resource-feat-resolver.js',
    'scripts/combat/rolls/enhanced-rolls.js',
    'scripts/components/force-suite.js',
    'scripts/engine/talent/guardian-spirit-actions.js',
    'scripts/engine/talent/sentinel-talent-actions.js',
    'scripts/engine/talent/lightsaber-form-engine.js',
    'scripts/engine/talent/lightsaber-talent-actions.js',
    'scripts/engine/talent/jedi-prestige-talent-actions.js',
    'scripts/engine/talent/consular-talent-actions.js',
    'scripts/engine/talent/sith-talent-actions.js',
    'scripts/engine/talent/force-adept-talent-actions.js',
    'scripts/talents/DarkSidePowers.js',
    'scripts/engine/talent/talent-effect-engine.js',
    'scripts/engine/talent/dark-side-devotee-mechanics.js',
    'scripts/engine/combat/weapons-engine.js',
    'scripts/engine/combat/reactions/reaction-engine.js',
    'scripts/engine/combat/combat-executor.js',
    'scripts/engine/combat/threshold-engine.js',
    'scripts/engine/combat/reactions/reaction-registry.js',
    'scripts/engine/abilities/active/active-adapter.js',
    'scripts/actors/base/swse-actor-base.js',
    'scripts/sheets/v2/character-like-sheet.js',
    'scripts/ui/shell/gm/controllers/GMWorkspaceSurfaceController.js',
    'scripts/data/force-points.js',
    'scripts/patches/follower-species-materialization-hotfix.js',
    'scripts/sheets/v2/actor-sheet-base.js',
    'scripts/engine/feats/force-point-feat-actions.js',
    'scripts/utils/destiny-effects.js'
  ],
  ammunitionFireState: [
    'scripts/combat/rolls/attacks.js',
    'scripts/combat/rolls/enhanced-rolls.js',
    'scripts/engine/combat/full-attack-executor.js',
    'scripts/sheets/v2/character-like-sheet.js',
    'scripts/engine/equipment/equipment-state-coordinator.js'
  ],
  actionEconomy: [
    'scripts/ui/combat/action-economy-bindings.js',
    'scripts/engine/feats/condition-track-feat-actions.js',
    'scripts/sheets/v2/character-like-sheet.js',
    'scripts/sheets/v2/character-sheet/combat-ui.js',
    'scripts/patches/combat-ui-behavior-hotfix.js',
    'scripts/ui/chat/chat-interaction-bridge.js',
    'scripts/sheets/v2/actor-sheet-base.js',
    'scripts/engine/equipment/equipment-state-coordinator.js',
    'scripts/engine/inventory/InventoryEngine.js',
    'scripts/engine/combat/fire-state-store.js',
    'scripts/engine/feats/core-attack-option-action-economy.js',
    'scripts/engine/combat/full-attack-executor.js',
    'scripts/engine/combat/features/combat-feature-handlers.js'
  ],
  equipmentState: [
    'scripts/engine/inventory/InventoryEngine.js',
    'scripts/actors/base/swse-actor-base.js',
    'scripts/sheets/v2/character-like-sheet.js',
    'scripts/sheets/v2/character-sheet/inventory-ui.js',
    'scripts/engine/crafting/phase-3-advanced-crystal-system.js',
    'scripts/items/item-defaults.js'
  ],
  upgradeModificationState: [
    'scripts/engine/customization/structural-change-engine.js',  // Phase 0 P40: dormant (no importer)
    'scripts/engine/customization/template-engine.js',          // Phase 0 P40: dormant (no importer)
    'scripts/engine/crafting/modification-intent-builder.js',   // Phase 0 P40: dormant (no importer)
    'scripts/engine/upgrades/UpgradeService.js',
    'scripts/engine/crafting/lightsaber-construction-engine.js',
    'scripts/apps/customization/item-customization-workbench.js',
    'scripts/engine/customization/install-remove-engine.js',
    'scripts/engine/customization/customization-workflow.js',
    'scripts/engine/customization/tech-specialist-modification-service.js',
    'scripts/engine/customization/droid-customization-engine.js',
    'scripts/engine/customization/vehicle-customization-engine.js'
  ],
  progressionEntitlements: [
    'scripts/engine/progression/engine/progression-engine.js',  // Phase 0 P52: legacy, no production caller by static search
    'scripts/apps/progression-framework/shell/progression-finalizer.js',
    'scripts/engine/abilities/progression/progression-event-processor.js',
    'scripts/patches/progression-ledger-reconciliation-hotfix.js'
  ],
  ownershipFollowersAssignments: [
    'scripts/apps/follower-creator.js',
    'scripts/engine/crew/ally-assignment-service.js',
    'scripts/engine/crew/follower-slot-service.js',
    'scripts/infrastructure/hooks/follower-hooks.js'
  ],
  gmApprovalState: [
    'scripts/ui/shell/gm/GMStoreOperationsService.js',  // Phase 0 P25/P47 (pendingSales queue, sale/rollback operations)
    'scripts/apps/item-selling-system.js',              // Phase 0 P25 (sale transaction caller)
    'scripts/ui/shell/gm/GMApprovalOperationsService.js',
    'scripts/apps/gm-store-dashboard.js',
    'scripts/engine/store/acquisition-service.js',
    'scripts/engine/store/store-engine.js',
    'scripts/apps/store/store-checkout.js'
  ]
});
