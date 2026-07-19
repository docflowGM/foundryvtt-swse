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
import { registerCustomContentApprovalSettings } from "./scripts/settings/custom-content-approval.js";
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
import { initSidebarIconDiagnostics } from "./scripts/core/sidebar-icon-diagnostics.js";
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
import { registerCustomTalentTreeProgressionOverlay } from "./scripts/apps/talent-tree-workbench/custom-talent-tree-progression-overlay.js";
import { registerCustomContentGmApprovalIntegration } from "./scripts/apps/talent-tree-workbench/custom-content-gm-approval-integration.js";
import { registerCustomTalentEffectWizardIntegration } from "./scripts/apps/talent-tree-workbench/custom-talent-effect-wizard-integration.js";
import { registerLightsaberConstructionHooks } from "./scripts/applications/lightsaber/lightsaber-router.js";
import { initializeConceptParityDiagnostics } from "./scripts/ui/concept-parity/concept-parity-diagnostics.js";
import { initializeShellResponsiveObserver } from "./scripts/ui/shell/shell-responsive-observer.js";
import { registerTokenNameSyncHooks } from "./scripts/core/token-name-sync.js";
import { installSwseFlagScopeCompatibility } from "./scripts/utils/flags/swse-flags.js";
import { registerNpcDamageHydrationHooks } from "./scripts/engine/import/npc-damage-hydration-hooks.js";
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
  installItemEditorTrace();

  globalThis.SWSE ??= {};
  globalThis.SWSE.debug ??= {};
  globalThis.SWSE.debug.defenses = (actor) => DefenseCalculator.debugFor(actor);
  globalThis.SWSE.debug.featPacks = (options = {}) => FeatRegistry.diagnosePackRegistration({ reason: 'manual SWSE.debug.featPacks()', ...options });
  globalThis.SWSE.debug.seedFeatsPack = (options = {}) => FeatPackSeeder.seedIfEmpty({ reason: 'manual SWSE.debug.seedFeatsPack()', ...options });

  const { Actors, Items } = foundry.documents.collections;
  const { ActorSheet, ItemSheet } = foundry.appv1.sheets;

  CONFIG.SWSE = SWSE;
  game.swse = {
    data: SWSEData,
    SWSE,
    ActorEngine,
    ConditionTrackFeatActions,
    RollEngine,
    EntityCreateBrowser,
    openEntityCreateBrowser,
    openForceAlchemyWorkbench
  };

  globalThis.SWSE.ActorEngine = ActorEngine;
  globalThis.SWSE.ConditionTrackFeatActions = ConditionTrackFeatActions;
  globalThis.SWSE.RollEngine = RollEngine;
  globalThis.SWSE.EntityCreateBrowser = EntityCreateBrowser;
  globalThis.SWSE.openEntityCreateBrowser = openEntityCreateBrowser;

  CONFIG.Actor.documentClass = SWSEV2BaseActor;
  CONFIG.Combat.documentClass = SWSECombatDocument;
  CONFIG.Combatant.documentClass = SWSECombatant;
  registerTokenNameSyncHooks();

  Actors.unregisterSheet("core", ActorSheet);
  Items.unregisterSheet("core", ItemSheet);

  for (const [type, label] of [
    ["character", "SWSE Character Sheet v2"],
    ["droid", "SWSE Droid Actor Sheet v2 (Actor Shell)"],
    ["npc", "SWSE NPC Actor Sheet v2 (Actor Shell)"],
    ["vehicle", "SWSE Vehicle Actor Sheet v2 (Actor Shell)"]
  ]) {
    Actors.registerSheet("swse", SWSEV2CharacterSheet, {
      types: [type],
      label,
      makeDefault: true
    });
  }

  Items.registerSheet("swse", SWSEItemSheet, {
    types: SWSE.itemTypes,
    label: "SWSE Item Sheet",
    makeDefault: true
  });

  registerLegacyHandlebarsHelpers();
  registerSystemHandlebarsHelpers();

  registerSettings();
  registerForceTraditionHouseRuleSettings();
  registerCustomContentApprovalSettings();
  await registerSystemSettings();

  registerInitHooks();
  registerStoreSheetHooks();
  SystemInitHooks.registerHooks();
  initializeSceneControls();
  initializeDiscoverySystem();
  initializeSentinelGovernance();
  registerCompendiumDirectoryClickRepair();
  registerNpcDamageHydrationHooks();
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
  registerCustomTalentTreeProgressionOverlay();
  registerCustomContentGmApprovalIntegration();
  registerCustomTalentEffectWizardIntegration();
  registerLightsaberConstructionHooks();
  initializeShellResponsiveObserver();
  await initializeGames();

  FeatEffectRegistry.initialize();
  initializeFeatEffectsHooks();
  globalThis.SWSE.FeatRegistry = FeatRegistry;
  globalThis.SWSE.FeatEffectRegistry = FeatEffectRegistry;
  globalThis.SWSE.FeatEffectApplier = FeatEffectApplier;

  const templatesReady = await preloadHandlebarsTemplates();
  if (!templatesReady) {
    throw new Error('SWSE bootstrap failed: one or more required Handlebars templates could not be preloaded.');
  }

  const requiredHelpers = ["add", "div", "subtract", "multiply", "and", "or", "not", "arrayIncludes", "truncate", "range"];
  const missingHelpers = requiredHelpers.filter(h => !Handlebars.helpers[h]);
  if (missingHelpers.length) {
    console.error("SWSE | Missing required Handlebars helpers:", missingHelpers);
  }

  console.log("SWSE | System initialization complete.");
});

// ============================================
// READY HOOK
// ============================================
Hooks.once("ready", async () => {
  console.log("SWSE | System ready. May the Force be with you.");

  MutationInterceptor.initialize();
  RecurringDamageEngine.initializeHooks();
  PoisonEngine.initializeHooks();
  SWSEGrappling.init();

  await initializeHolonet();
  initializeConceptParityDiagnostics();
  initSidebarIconDiagnostics();
  initSidebarIconFallback();

  game.swse.openStore = actor => SWSEStore.open(actor ?? null);
  game.swse.repairForcePowerAbilityMeta = async (actor = null, options = {}) => {
    return actor
      ? repairActorForcePowerAbilityMeta(actor, options)
      : repairWorldForcePowerAbilityMeta(options);
  };

  onDiscoveryReady();

  if (game.user.isGM) {
    await WorldDataLoader.autoLoad();
    repairWorldForcePowerAbilityMeta({ silent: true }).catch((err) => {
      console.warn('SWSE | Force power abilityMeta backfill failed:', err);
    });
  }
});

// ============================================
// HANDLEBARS HELPERS (LEGACY COMPATIBILITY)
// ============================================
function registerLegacyHandlebarsHelpers() {
  const helpers = {
    toUpperCase: str => typeof str === "string" ? str.toUpperCase() : "",
    array: function () { return Array.prototype.slice.call(arguments, 0, -1); },
    keys: obj => obj ? Object.keys(obj) : [],
    eq: (a, b) => a === b,
    lte: (a, b) => a <= b,
    gt: (a, b) => Number(a) > Number(b),
    capitalize: str => typeof str === "string" ? str.charAt(0).toUpperCase() + str.slice(1) : "",
    json: context => JSON.stringify(context),
    add: (a, b) => Number(a) + Number(b),
    getCrewName: id => {
      const actor = game.actors.get(id) || canvas.tokens.get(id)?.actor;
      return actor ? actor.name : "";
    },
    calculateDamageThreshold: actor => {
      if (!actor?.system) return 0;
      const fortitude = actor.system.defenses?.fortitude?.total ?? 10;
      const size = String(actor.system.size ?? "medium").toLowerCase();
      const sizeMods = { tiny: -5, small: 0, medium: 0, large: 5, huge: 10, gargantuan: 20, colossal: 50 };
      const featBonus = actor.items?.some(i => i.type === "feat" && i.name?.toLowerCase() === "improved damage threshold") ? 5 : 0;
      return fortitude + (sizeMods[size] ?? 0) + featBonus;
    },
    getSkillMod: (skill, abilities, level, conditionTrack) => {
      if (!skill || !abilities) return 0;
      const penalties = { normal: 0, "-1": -1, "-2": -2, "-5": -5, "-10": -10, helpless: -100 };
      return (abilities[skill.ability]?.mod || 0)
        + (skill.trained ? 5 : 0)
        + (skill.focus ? 1 : 0)
        + Math.floor((level || 1) / 2)
        + (penalties[conditionTrack] || 0);
    }
  };

  for (const [name, helper] of Object.entries(helpers)) {
    if (!Handlebars.helpers[name]) Handlebars.registerHelper(name, helper);
  }
}

// ============================================
// LEGACY SETTINGS
// ============================================
function registerSettings() {
  const register = (key, data) => {
    const fullKey = `swse.${key}`;
    if (!game.settings.settings.has(fullKey)) game.settings.register("swse", key, data);
  };

  register("forcePointBonus", {
    name: "Force Point Bonus",
    hint: "Extra modifier applied when spending a Force Point on a power.",
    scope: "world",
    config: true,
    type: Number,
    default: 2
  });

  register("storeSettings", {
    name: "Store Price Settings",
    scope: "world",
    config: false,
    type: Object,
    default: { buyMultiplier: 1.0, sellMultiplier: 0.5 }
  });

  register("storeMarkup", {
    name: "Store Markup %",
    scope: "world",
    config: false,
    type: Number,
    default: 0
  });

  register("storeDiscount", {
    name: "Store Discount %",
    scope: "world",
    config: false,
    type: Number,
    default: 0
  });

  register("dataLoaded", {
    scope: "world",
    config: false,
    type: Boolean,
    default: false
  });
}
