// ============================================
// FILE: index.js
// Star Wars Saga Edition (SWSE) - FoundryVTT
// ============================================

import { SWSE } from "./scripts/core/config.js";
import { SWSEV2CharacterSheet } from "./scripts/sheets/v2/character-sheet.js";
import { SWSEItemSheet } from "./scripts/items/swse-item-sheet.js";
import { EntityCreateBrowser, openEntityCreateBrowser } from "./scripts/dialogs/entity-dialog/entity-create-browser.js";
import { preloadHandlebarsTemplates } from "./scripts/load-templates.js";
import { SWSEStore } from "./store/store.js";
import * as SWSEData from "./scripts/core/swse-data.js";
import { WorldDataLoader } from "./scripts/core/world-data-loader.js";
import { SWSEV2BaseActor } from "./scripts/actors/v2/base-actor.js";
import { SWSECombatDocument } from "./scripts/combat/swse-combat.js";
import { SWSECombatant } from "./scripts/combat/swse-combatant.js";
import { registerSystemSettings } from "./scripts/core/settings.js";
import { UIManager } from "./scripts/ui/ui-manager.js";
import { registerInitHooks } from "./scripts/infrastructure/hooks/init-hooks.js";
import { initializeSceneControls } from "./scripts/scene-controls/init.js";
import { initializeDiscoverySystem, onDiscoveryReady } from "./scripts/ui/discovery/index.js";
import { initializeSentinelGovernance } from "./scripts/governance/sentinel/sentinel-init.js";
import { MutationInterceptor } from "./scripts/governance/mutation/MutationInterceptor.js";
import { ActorEngine } from "./scripts/governance/actor-engine/actor-engine.js";
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
import { registerConsularTalentActions } from "./scripts/engine/talent/consular-talent-actions.js";
import { registerSentinelTalentActions } from "./scripts/engine/talent/sentinel-talent-actions.js";
import { registerLightsaberTalentActions } from "./scripts/engine/talent/lightsaber-talent-actions.js";
import { registerJediPrestigeTalentActions } from "./scripts/engine/talent/jedi-prestige-talent-actions.js";
import { registerTokenNameSyncHooks } from "./scripts/core/token-name-sync.js";
import "./scripts/talents/squad-actions-init.js";
import "./scripts/talents/minion-actions-init.js";

UIManager.init();

// ============================================
// INIT HOOK
// ============================================
Hooks.once("init", async () => {
  console.log("SWSE | Initializing Star Wars Saga Edition system...");
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
    RollEngine,
    EntityCreateBrowser,
    openEntityCreateBrowser
  };

  globalThis.SWSE ??= {};
  globalThis.SWSE.ActorEngine = ActorEngine;
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
  await registerSystemSettings();

  // -------------------------------
  // Register Hook Infrastructure
  // -------------------------------
  registerInitHooks();
  SystemInitHooks.registerHooks();
  initializeSceneControls();
  initializeDiscoverySystem();
  initializeSentinelGovernance();
  registerCompendiumDirectoryClickRepair();
  registerForceExecutorChatHooks();
  registerConsularTalentActions();
  registerSentinelTalentActions();
  registerLightsaberTalentActions();
  registerJediPrestigeTalentActions();
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
  } else {
    console.log("SWSE | All required Handlebars helpers registered:", requiredHelpers);
  }

  console.log("SWSE | System initialization complete.");
});

// ============================================
// READY HOOK
// ============================================
Hooks.once("ready", async () => {
  console.log("SWSE | System ready. May the Force be with you.");

  // -------
  // Initialize Mutation Interceptor (PHASE 1: Enforcement setup)
  // Initialized in ready hook after all settings and systems are loaded
  // -------
  MutationInterceptor.initialize();
  RecurringDamageEngine.initializeHooks();
  PoisonEngine.initializeHooks();
  SWSEGrappling.init();
  await initializeHolonet();
  await initializeGames();

  // Wire debug helpers (logging disabled — uncomment below to re-enable diagnostics)
  initSidebarIconDiagnostics();
  // snapshotPhase('ready:start (before SWSE theme)');
  // auditSidebarIconCssRules();
  // requestAnimationFrame(() => snapshotPhase('ready:rAF'));

  // Restore sidebar tab icon classes for Foundry v13.
  initSidebarIconFallback();

  // Setup store shortcut
  game.swse.openStore = actor => new SWSEStore(actor ?? null).render(true);
  game.swse.repairForcePowerAbilityMeta = async (actor = null, options = {}) => {
    return actor
      ? repairActorForcePowerAbilityMeta(actor, options)
      : repairWorldForcePowerAbilityMeta(options);
  };

  onDiscoveryReady();

  // Auto-load data on first run
  if (game.user.isGM) {
    await WorldDataLoader.autoLoad();
    repairWorldForcePowerAbilityMeta({ silent: true }).catch((err) => {
      console.warn('SWSE | Force power abilityMeta backfill failed:', err);
    });
  }
});

// ============================================
// HANDLEBARS HELPERS (LEGACY)
// ============================================
function registerLegacyHandlebarsHelpers() {
  Handlebars.registerHelper("toUpperCase", str =>
    typeof str === "string" ? str.toUpperCase() : ""
  );

  Handlebars.registerHelper("array", function () {
    return Array.prototype.slice.call(arguments, 0, -1);
  });

  Handlebars.registerHelper("keys", obj => (obj ? Object.keys(obj) : []));

  Handlebars.registerHelper("eq", (a, b) => a === b);
  Handlebars.registerHelper("lte", (a, b) => a <= b);
  Handlebars.registerHelper("gt", (a, b) => Number(a) > Number(b));

  Handlebars.registerHelper("capitalize", str =>
    typeof str === "string" ? str.charAt(0).toUpperCase() + str.slice(1) : ""
  );

  Handlebars.registerHelper("json", context => JSON.stringify(context));

  Handlebars.registerHelper("add", (a, b) => Number(a) + Number(b));

  // -------------------------------
  // Custom Helpers
  // -------------------------------
  Handlebars.registerHelper("getCrewName", id => {
    const actor = game.actors.get(id) || canvas.tokens.get(id)?.actor;
    return actor ? actor.name : "";
  });

  Handlebars.registerHelper("calculateDamageThreshold", actor => {
    if (!actor?.system) return 0;

    const fortitude = actor.system.defenses?.fortitude?.total ?? 10;
    const size = actor.system.size ?? "medium";

    const sizeMods = {
      tiny: -5,
      small: 0,
      medium: 0,
      large: 5,
      huge: 10,
      gargantuan: 20,
      colossal: 50
    };

    const sizeMod = sizeMods[size.toLowerCase()] ?? 0;

    const hasFeat = actor.items?.some(
      i => i.type === "feat" && i.name?.toLowerCase() === "improved damage threshold"
    );

    const featBonus = hasFeat ? 5 : 0;
    return fortitude + sizeMod + featBonus;
  });

  Handlebars.registerHelper("getSkillMod", (skill, abilities, level, conditionTrack) => {
    if (!skill || !abilities) return 0;

    const abilMod = abilities[skill.ability]?.mod || 0;
    const trained = skill.trained ? 5 : 0;
    const focus = skill.focus ? 1 : 0;
    const halfLevel = Math.floor((level || 1) / 2);
    const conditionPenalty = getConditionPenalty(conditionTrack);

    return abilMod + trained + focus + halfLevel + conditionPenalty;
  });

  function getConditionPenalty(track) {
    const penalties = {
      normal: 0,
      "-1": -1,
      "-2": -2,
      "-5": -5,
      "-10": -10,
      helpless: -100
    };
    return penalties[track] || 0;
  }
}

// ============================================
// SETTINGS
// ============================================
function registerSettings() {
  game.settings.register("swse", "forcePointBonus", {
    name: "Force Point Bonus",
    hint: "Extra modifier applied when spending a Force Point on a power.",
    scope: "world",
    config: true,
    type: Number,
    default: 2
  });

  game.settings.register("swse", "storeSettings", {
    name: "Store Price Settings",
    scope: "world",
    config: false,
    type: Object,
    default: { buyMultiplier: 1.0, sellMultiplier: 0.5 }
  });

  game.settings.register("swse", "storeMarkup", {
    name: "Store Markup %",
    scope: "world",
    config: false,
    type: Number,
    default: 0
  });

  game.settings.register("swse", "storeDiscount", {
    name: "Store Discount %",
    scope: "world",
    config: false,
    type: Number,
    default: 0
  });

  // Data load flag
  game.settings.register("swse", "dataLoaded", {
    scope: "world",
    config: false,
    type: Boolean,
    default: false
  });
}

