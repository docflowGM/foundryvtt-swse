// ============================================
// FILE: index.js
// Star Wars Saga Edition (SWSE) - FoundryVTT
// ============================================

import { SWSE } from "./scripts/core/config.js";
import { SWSEV2CharacterSheet } from "./scripts/sheets/v2/character-sheet.js";
import { SWSEItemSheet } from "./scripts/items/swse-item-sheet.js";
import { EntityCreateBrowser, openEntityCreateBrowser } from "./scripts/dialogs/entity-dialog/entity-create-browser.js";
import { preloadHandlebarsTemplates } from "./scripts/load-templates.js";
import { SWSEStore } from "./scripts/apps/store/store-main.js";
import * as SWSEData from "./scripts/core/swse-data.js";
import { WorldDataLoader } from "./scripts/core/world-data-loader.js";
import { SWSEV2BaseActor } from "./scripts/actors/v2/base-actor.js";
import { SWSECombatDocument } from "./scripts/combat/swse-combat.js";
import { SWSECombatant } from "./scripts/combat/swse-combatant.js";
import { registerSystemSettings } from "./scripts/core/settings.js";
import { registerForceTraditionHouseRuleSettings } from "./scripts/settings/force-tradition-house-rules.js";
import { UIManager } from "./scripts/ui/ui-manager.js";
import { registerInitHooks } from "./scripts/infrastructure/hooks/init-hooks.js";
import { registerStoreSheetHooks } from "./scripts/infrastructure/hooks/store-sheet-hooks.js";
import { initializeSceneControls } from "./scripts/scene-controls/init.js";
import { initializeDiscoverySystem, onDiscoveryReady } from "./scripts/ui/discovery/index.js";
import { initializeSentinelGovernance } from "./scripts/governance/sentinel/sentinel-init.js";
import { MutationInterceptor } from "./scripts/governance/mutation/MutationInterceptor.js";
import { ActorEngine } from "./scripts/governance/actor-engine/actor-engine.js";
import { ConditionTrackFeatActions } from "./scripts/engine/feats/condition-track-feat-actions.js";
import { SystemInitHooks } from "./scripts/engine/progression/hooks/system-init-hooks.js";
import { registerHandlebarsHelpers as registerSystemHandlebarsHelpers } from "./helpers/handlebars/index.js";
import { PoisonEngine } from "./scripts/engine/poison/poison-engine.js";
import { RecurringDamageEngine } from "./scripts/engine/combat/recurring-damage-engine.js";
import { SWSEGrappling } from "./scripts/combat/systems/grappling-system.js";
import { repairActorForcePowerAbilityMeta, repairWorldForcePowerAbilityMeta } from "./scripts/engine/abilities/force-power/force-power-ability-meta.js";
import { installItemEditorTrace } from "./scripts/debug/item-editor-trace.js";
import { registerCompendiumDirectoryClickRepair } from "./scripts/core/compendium-directory-click-repair.js";
import { DefenseCalculator } from "./scripts/actors/derived/defense-calculator.js";
import { initializeHolonet } from "./scripts/holonet/integration/holonet-init.js";
import { initializeGames } from "./scripts/games/game-init.js";
import { initSidebarIconFallback } from "./scripts/core/sidebar-icon-fallback.js";
import { initSidebarIconDiagnostics, dumpSidebarIconState, watchSidebarIconMutations, auditSidebarIconCssRules, snapshotPhase } from "./scripts/core/sidebar-icon-diagnostics.js";
import { FeatRegistry } from "./scripts/registries/feat-registry.js";
import { FeatEffectRegistry } from "./scripts/engine/features/feat-effect-registry.js";
import { FeatEffectApplier, initializeFeatEffectsHooks } from "./scripts/engine/features/feat-effect-applier.js";
import { FeatPackSeeder } from "./scripts/registries/feat-pack-seeder.js";
import { RollEngine } from "./scripts/engine/roll-engine.js";
import { registerForceExecutorChatHooks } from "./scripts/engine/force/force-executor.js";
import { registerForceSuiteRuntimeRepairs } from "./scripts/engine/force/force-suite-runtime-repairs.js";
import { registerActionEconomyHooks } from "./scripts/engine/combat/action/action-economy-hooks.js";
import { registerFeatHousekeepingRuntimePatches } from "./scripts/engine/progression/feats/feat-housekeeping-runtime-patches.js";
import { registerConsularTalentActions } from "./scripts/engine/talent/consular-talent-actions.js";
import { registerSentinelTalentActions } from "./scripts/engine/talent/sentinel-talent-actions.js";
import { registerLightsaberTalentActions } from "./scripts/engine/talent/lightsaber-talent-actions.js";
import { registerJediPrestigeTalentActions } from "./scripts/engine/talent/jedi-prestige-talent-actions.js";
import { registerSithTalentActions } from "./scripts/engine/talent/sith-talent-actions.js";
import { registerForceAdeptTalentActions } from "./scripts/engine/talent/force-adept-talent-actions.js";
import { registerForceAlchemyWorkbench, openForceAlchemyWorkbench } from "./scripts/apps/force-alchemy/force-alchemy-workbench-app.js";
import { registerForceTraditionPickerHooks } from "./scripts/apps/force-tradition/force-tradition-picker.js";
import { registerCustomTalentTreeWorkbenchHooks } from "./scripts/apps/talent-tree-workbench/custom-talent-tree-workbench-hooks.js";
import { registerLightsaberConstructionHooks } from "./scripts/applications/lightsaber/lightsaber-router.js";
import { initializeConceptParityDiagnostics } from "./scripts/ui/concept-parity/concept-parity-diagnostics.js";
import { initializeShellResponsiveObserver } from "./scripts/ui/shell/shell-responsive-observer.js";
import { registerTokenNameSyncHooks } from "./scripts/core/token-name-sync.js";
import { installSwseFlagScopeCompatibility } from "./scripts/utils/flags/swse-flags.js";
import "./scripts/talents/squad-actions-init.js";
import "./scripts/talents/minion-actions-init.js";

UIManager.init();

// ============================================
// INIT HOOK
// ============================================
Hooks.once("init", async () => {
  console.log("SWSE | Initializing Star Wars Saga Edition system...");
  installSwseFlagScopeCompatibility();
  registerForceSuiteRuntimeRepairs();
  // snapshotPhase('init:hook'); // LOGGING DISABLED
  installItemEditorTrace();
  // Register SWSE.debug.defenses(actor) helper for defense breakdown diagnostics
  globalThis.SWSE ??= {};
  globalThis.SWSE.debug ??= {};
  globalThis.SWSE.debug.defenses = (actor) => DefenseCalculator.debugFor(actor);
  globalThis.SWSE.debug.featPacks = (options = {}) => FeatRegistry.diagnosePackRegistration({ reason: 'manual SWSE.debug.featPacks()', ...options });
  globalThis.SWSE.debug.seedFeatsPack = (options = {}) => FeatPackSeeder.seedIfEmpty({ reason: 'manual SWSE.debug.seedFeatsPack()', ...options });

  // Foundry v13+ namespaced references
  const { Actors, Items } = foundry.documents.collections;
  const { ActorSheet, ItemSheet } = foundry.appv1.sheets;

  // -------------------------------
  // Global Config & Namespace
  // -------------------------------
  CONFIG.SWSE = SWSE;
  game.swse = {
    data: SWSEData,
    SWSE: SWSE,
    ActorEngine,
    ConditionTrackFeatActions,
    RollEngine,
    EntityCreateBrowser,
    openEntityCreateBrowser,
    openForceAlchemyWorkbench
  };

  globalThis.SWSE ??= {};
  globalThis.SWSE.ActorEngine = ActorEngine;
  globalThis.SWSE.ConditionTrackFeatActions = ConditionTrackFeatActions;
  globalThis.SWSE.RollEngine = RollEngine;
  globalThis.SWSE.EntityCreateBrowser = EntityCreateBrowser;
  globalThis.SWSE.openEntityCreateBrowser = openEntityCreateBrowser;

  // -------------------------------
  // Document Classes
  // -------------------------------
  CONFIG.Actor.documentClass = SWSEV2BaseActor;
  CONFIG.Combat.documentClass = SWSECombatDocument;
  CONFIG.Combatant.documentClass = SWSECombatant;
  registerTokenNameSyncHooks();

  // -------------------------------
  // Sheet Registration
  // -------------------------------
  Actors.unregisterSheet("core", ActorSheet);
  Items.unregisterSheet("core", ItemSheet);

  Actors.registerSheet("swse", SWSEV2CharacterSheet, {
    types: ["character"],
    label: "SWSE Character Sheet v2",
    makeDefault: true
  });

  // Droid actors intentionally use the same actor holopad/shell as characters.
  // Droid-specific differences are layered inside the character sheet context/templates;
  // the old droid-only shell is deprecated and no longer registered.
  Actors.registerSheet("swse", SWSEV2CharacterSheet, {
    types: ["droid"],
    label: "SWSE Droid Actor Sheet v2 (Actor Shell)",
    makeDefault: true
  });

  // NPC actors intentionally use the same actor holopad/shell as characters.
  // Nonheroic/follower/minion/beast/mount NPCs render NPC concept content inside
  // that shell; heroic-promoted NPCs render full actor content permanently.
  Actors.registerSheet("swse", SWSEV2CharacterSheet, {
    types: ["npc"],
    label: "SWSE NPC Actor Sheet v2 (Actor Shell)",
    makeDefault: true
  });

  // Vehicle actors intentionally use the same actor holopad/shell as characters, droids, and NPCs.
  // Vehicle-specific systems remain vehicle-native inside a shared actor shell; the old
  // vehicle-only shell is deprecated and no longer registered as the default.
  Actors.registerSheet("swse", SWSEV2CharacterSheet, {
    types: ["vehicle"],
    label: "SWSE Vehicle Actor Sheet v2 (Actor Shell)",
    makeDefault: true
  });

  Items.registerSheet("swse", SWSEItemSheet, {
    types: SWSE.itemTypes,
    label: "SWSE Item Sheet",
    makeDefault: true
  });

  // -------------------------------
  // Register Handlebars Helpers
  // -------------------------------
  registerLegacyHandlebarsHelpers();
  registerSystemHandlebarsHelpers();

  // -------------------------------
  // Register Game Settings
  // -------------------------------
  registerSettings(); // Legacy swse namespace settings retained for compatibility.
  registerForceTraditionHouseRuleSettings();
  await registerSystemSettings();

  // -------------------------------
  // Register Hook Infrastructure
  // -------------------------------
  registerInitHooks();
  registerStoreSheetHooks();
  SystemInitHooks.registerHooks();
  initializeSceneControls();
  initializeDiscoverySystem();
  initializeSentinelGovernance();
  registerCompendiumDirectoryClickRepair();
  registerForceExecutorChatHooks();
  registerActionEconomyHooks();
  registerFeatHousekeepingRuntimePatches();
  registerConsularTalentActions();
  registerSentinelTalentActions();
  registerLightsaberTalentActions();
  registerJediPrestigeTalentActions();
  registerSithTalentActions();
  registerForceAdeptTalentActions();
  registerForceAlchemyWorkbench();
  registerForceTraditionPickerHooks();
  registerCustomTalentTreeWorkbenchHooks();
  registerLightsaberConstructionHooks();
  initializeShellResponsiveObserver();

  // -------------------------------
  // Feat Effect Registry + lifecycle hooks
  // Mechanical effect definitions formerly embedded in feat compendium items
  // now live in data/feat-effects.json. FeatRegistry owns feat identity;
  // FeatEffectRegistry owns feat mechanics; the applier reconciles generated
  // ActiveEffects on actors that own the corresponding feats.
  // -------------------------------
  FeatEffectRegistry.initialize();
  initializeFeatEffectsHooks();
  globalThis.SWSE.FeatRegistry = FeatRegistry;
  globalThis.SWSE.FeatEffectRegistry = FeatEffectRegistry;
  globalThis.SWSE.FeatEffectApplier = FeatEffectApplier;

  // -------------------------------
  // Preload Templates
  // -------------------------------
  await preloadHandlebarsTemplates();

  // Boot-time diagnostic: verify required Handlebars helpers are registered
  const requiredHelpers = ["add", "div", "subtract", "multiply", "and", "or", "not", "arrayIncludes", "truncate", "range"];
  const missingHelpers = requiredHelpers.filter(h => !Handlebars.helpers[h]);
  if (missingHelpers.length) {
    console.error("SWSE | Missing required Handlebars helpers:", missingHelpers);
  }
});
