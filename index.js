/* ========================================================================== */
/* SWSE SYSTEM ENTRY — CLEAN V13 BUILD                                        */
/* Stable, deterministic boot lifecycle                                       */
/* ========================================================================== */

/* ========================================================================== */
/* LOAD GUARD                                                                  */
/* ========================================================================== */

if (globalThis.__SWSE_BOOT__) {
  console.error("SWSE | Double load detected.");
  throw new Error("SWSE boot aborted.");
}
globalThis.__SWSE_BOOT__ = true;

/* ========================================================================== */
/* GLOBAL ERROR HANDLERS                                                       */
/* ========================================================================== */

window.addEventListener("error", (event) => {
  console.group("🔥 SWSE HARD ERROR");
  console.error(event.error || event.message);
  console.groupEnd();
});

window.addEventListener("unhandledrejection", (event) => {
  console.group("🔥 SWSE UNHANDLED PROMISE");
  console.error(event.reason);
  console.groupEnd();
});

/* ========================================================================== */
/* IMPORTS                                                                     */
/* ========================================================================== */

// Core
import { SWSE } from "./scripts/core/config.js";
import { registerSystemSettings } from "./scripts/core/settings.js";
import { registerHouseruleSettings } from "./scripts/houserules/houserule-settings.js";
import { initializeUtils } from "./scripts/core/utils-init.js";
import { initializeRolls } from "./scripts/core/rolls-init.js";

// Hardening
import { initializeHardeningSystem, validateSystemReady, registerHardeningHooks } from "./scripts/core/hardening-init.js";

// Logging
import { swseLogger } from "./scripts/utils/logger.js";
import { errorHandler } from "./scripts/core/error-handler.js";

// Data
import { dataPreloader } from "./scripts/core/data-preloader.js";
import { runJsonBackedIdsMigration } from "./scripts/migrations/json-backed-ids-migration.js";
import { CompendiumVerification } from "./scripts/core/compendium-verification.js";

// Documents
import { SWSEV2BaseActor } from "./scripts/actors/v2/base-actor.js";
import { SWSEItemBase } from "./scripts/items/base/swse-item-base.js";

// Sheets
import { SWSEV2CharacterSheet } from "./scripts/sheets/v2/character-sheet.js";
import { SWSEV2NpcSheet } from "./scripts/sheets/v2/npc-sheet.js";
import { SWSEV2DroidSheet } from "./scripts/sheets/v2/droid-sheet.js";
import { SWSEV2VehicleSheet } from "./scripts/sheets/v2/vehicle-sheet.js";
import { SWSEItemSheet } from "./scripts/items/swse-item-sheet.js";

// Apps
import CharacterGenerator from "./scripts/apps/chargen/chargen-main.js";
import { SWSELevelUpEnhanced } from "./scripts/apps/levelup/levelup-main.js";
import { SWSEStore } from "./scripts/apps/store/store-main.js";

// Handlebars
import { registerHandlebarsHelpers } from "./helpers/handlebars/index.js";
import { registerSWSEPartials } from "./helpers/handlebars/partials-auto.js";
import { preloadHandlebarsTemplates } from "./scripts/core/load-templates.js";

// Engines
import { RulesEngine } from "./scripts/rules/rules-engine.js";
import { SWSEProgressionEngine, initializeProgressionHooks } from "./scripts/engine/progression.js";
import { FeatSystem } from "./scripts/engine/FeatSystem.js";
import { SkillSystem } from "./scripts/engine/SkillSystem.js";
import { TalentAbilitiesEngine } from "./scripts/engine/TalentAbilitiesEngine.js";
import TalentActionLinker from "./scripts/engine/talent-action-linker.js";
import { SWSELanguageModule } from "./scripts/progression/modules/language-module.js";

// Hooks
import { registerInitHooks, registerDestinyHooks } from "./scripts/hooks/index.js";
import { initializeForcePowerHooks } from "./scripts/hooks/force-power-hooks.js";
import { initializeFollowerHooks } from "./scripts/hooks/follower-hooks.js";
import { registerKeybindings } from "./scripts/core/keybindings.js";

// UI
import { ThemeLoader } from "./scripts/theme-loader.js";
import { initializeSceneControls } from "./scripts/scene-controls/init.js";
import { initializeActionPalette } from "./scripts/ui/action-palette/init.js";
import { initializeGMSuggestions } from "./scripts/gm-suggestions/init.js";
import { MentorTranslationSettings } from "./scripts/mentor/mentor-translation-settings.js";

// Suggestions
import { SuggestionService } from "./scripts/engine/SuggestionService.js";
import { registerSuggestionHooks } from "./scripts/hooks/suggestion-hooks.js";
import { registerCombatSuggestionHooks } from "./scripts/suggestion-engine/combat-hooks.js";
import { CombatSuggestionEngine } from "./scripts/suggestion-engine/combat-engine.js";
import { testHarness } from "./scripts/suggestion-engine/test-harness.js";
import { initializeDiscoverySystem, onDiscoveryReady } from "./scripts/ui/discovery/index.js";

// House Rule Engines
import { ThresholdEngine } from "./scripts/engine/combat/threshold-engine.js";
import { MountEngine } from "./scripts/engine/mount/mount-engine.js";

// Misc
import { SystemInitHooks } from "./scripts/progression/hooks/system-init-hooks.js";
import { Upkeep } from "./scripts/automation/upkeep.js";

// Phase 5
import { initializePhase5, getPhaseSummary } from "./scripts/core/phase5-init.js";
import { registerCriticalFlowTests } from "./scripts/tests/critical-flow-tests.js";

/* ========================================================================== */
/* EARLY DOCUMENT CLASS REGISTRATION                                          */
/* ========================================================================== */

CONFIG.Actor.documentClass = SWSEV2BaseActor;
CONFIG.Item.documentClass  = SWSEItemBase;

/* ========================================================================== */
/* INIT                                                                        */
/* ========================================================================== */

Hooks.once("init", () => {

  swseLogger.log("SWSE | Init");

  const SYSTEM_ID = "foundryvtt-swse";
  const ActorsCollection = foundry.documents.collections.Actors;
  const ItemsCollection  = foundry.documents.collections.Items;

  /* ---------- PARTIALS + TEMPLATES (MUST BE EARLY) ---------- */

  registerSWSEPartials();
  preloadHandlebarsTemplates();

  /* ---------- SHEET REGISTRATION ---------- */

  ActorsCollection.registerSheet(SYSTEM_ID, SWSEV2CharacterSheet, { types: ["character"], makeDefault: true });
  ActorsCollection.registerSheet(SYSTEM_ID, SWSEV2NpcSheet, { types: ["npc"], makeDefault: true });
  ActorsCollection.registerSheet(SYSTEM_ID, SWSEV2DroidSheet, { types: ["droid"], makeDefault: true });
  ActorsCollection.registerSheet(SYSTEM_ID, SWSEV2VehicleSheet, { types: ["vehicle"], makeDefault: true });

  ItemsCollection.registerSheet(SYSTEM_ID, SWSEItemSheet, { makeDefault: true });

  /* ---------- STRUCTURAL SYSTEMS ---------- */

  registerSystemSettings();
  registerHouseruleSettings();
  registerHandlebarsHelpers();
  registerInitHooks();
  registerDestinyHooks();
  registerKeybindings();
  ThemeLoader.init();

  CONFIG.SWSE = SWSE;
});

/* ========================================================================== */
/* READY                                                                       */
/* ========================================================================== */

Hooks.once("ready", async () => {

  swseLogger.log("SWSE | Ready");

  await initializeHardeningSystem();
  registerHardeningHooks();
  await validateSystemReady();

  await CompendiumVerification.verifyCompendiums();

  await Promise.all([
    dataPreloader.preload({ priority: ["classes","skills"], background: ["feats","talents","species"] }),
    runJsonBackedIdsMigration()
  ]);

  initializeRolls();
  initializeUtils();
  initializeForcePowerHooks();
  initializeFollowerHooks();
  initializeProgressionHooks();
  SWSELanguageModule.init();

  initializeSceneControls();
  initializeActionPalette();
  initializeDiscoverySystem();
  initializeGMSuggestions();

  const systemJSON = await fetch("systems/foundryvtt-swse/system.json").then(r => r.json());
  SuggestionService.initialize({ systemJSON });

  registerSuggestionHooks();
  registerCombatSuggestionHooks();

  RulesEngine.init();
  Upkeep.init();
  initializePhase5();
  registerCriticalFlowTests();

  // Initialize House Rule Engines
  MountEngine.registerHooks();
  Hooks.on('deleteCombat', (combat) => ThresholdEngine.onCombatEnd(combat));

  // Restore global SWSE namespace
  game.swse = {
    engine: SWSEProgressionEngine,
    progression: SWSEProgressionEngine,
    chargen: CharacterGenerator,
    levelup: SWSELevelUpEnhanced,
    store: SWSEStore,
    suggestion: SuggestionService,
    ui: {
      ChargenApp: CharacterGenerator,
      LevelUpApp: SWSELevelUpEnhanced,
      StoreApp: SWSEStore
    },
    rolls: game.swse?.rolls || {},
    api: {
      FeatSystem,
      SkillSystem,
      TalentAbilitiesEngine,
      CombatSuggestionEngine,
      ThresholdEngine,
      MountEngine
    }
  };

  window.SWSE = {
    api: {
      FeatSystem,
      SkillSystem,
      TalentAbilitiesEngine,
      CombatSuggestionEngine,
      ThresholdEngine,
      MountEngine
    },
    debug: {
      testHarness,
      phase5: { summary: getPhaseSummary }
    }
  };

  if (!game.settings.get("core", "devMode")) {
    Object.freeze(window.SWSE);
  }

  onDiscoveryReady();

  swseLogger.log("SWSE | Fully loaded");
});

/* ========================================================================== */
/* HEADER CONTROLS REGISTRATION                                              */
/* ========================================================================== */

Hooks.on("getHeaderControlsApplicationV2", (app, controls) => {
  const actor = app.document;
  if (!actor) return;

  // CHARACTER SHEET CONTROLS
  if (app instanceof SWSEV2CharacterSheet) {
    const chargenComplete = actor.system?.chargenComplete;

    // Chargen / Level Up button
    if (!chargenComplete) {
      controls.unshift({
        icon: "fas fa-user-plus",
        label: "Chargen",
        class: "swse-glow-button",
        action: () => {
          game.swse.chargen?.open?.(actor);
        }
      });
    } else {
      controls.unshift({
        icon: "fas fa-arrow-up",
        label: "Level Up",
        class: "swse-glow-button",
        action: () => {
          game.swse.levelup?.showForActor?.(actor);
        }
      });
    }
  }

  // NPC SHEET CONTROLS
  if (app instanceof SWSEV2NpcSheet) {
    // Only show Level Up if progression mode is enabled
    if (actor.system?.useProgression) {
      controls.unshift({
        icon: "fas fa-arrow-up",
        label: "Level Up",
        class: "swse-glow-button",
        action: () => {
          game.swse.levelup?.showForActor?.(actor);
        }
      });
    }
  }

  // SHARED CONTROLS (both Character and NPC)
  if (app instanceof SWSEV2CharacterSheet || app instanceof SWSEV2NpcSheet) {
    // Store button
    controls.unshift({
      icon: "fas fa-store",
      label: "Store",
      class: "swse-glow-button",
      action: () => {
        game.swse.store?.open?.(actor);
      }
    });

    // Mentor button
    controls.unshift({
      icon: "fas fa-comments",
      label: "Talk to Mentor",
      action: () => {
        game.swse.ui?.MentorDialog?.open?.(actor);
      }
    });
  }
});

/* ========================================================================== */
/* CANVAS SAFETY                                                               */
/* ========================================================================== */

Hooks.on("canvasReady", () => {
  const board = document.querySelector("#board");
  if (board) {
    board.style.display = "block";
    board.style.visibility = "visible";
    board.style.opacity = "1";
  }
});
