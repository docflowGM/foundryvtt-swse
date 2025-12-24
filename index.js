/* ==========================================================================  
   SWSE SYSTEM INDEX.JS (CLEAN, SAFE REBUILD - OPTION A)
   Fully drop-in compatible. Fixes:
   - Fatal "Missing helper: let" error
   - Incorrect init/ready order
   - Handlebars helpers loading too late
   - Template preload race conditions
   ========================================================================== */

/* =========================
   SWSE GLOBAL HARD DEBUG HOOKS
   ========================= */

console.log("%cSWSE DEBUG MODE ENABLED", "color:#0ff; font-size:20px;");

/* HARD ERROR */
window.addEventListener("error", (event) => {
  console.group("%c🔥 HARD ERROR DETECTED", "color:red; font-size:16px;");
  console.error("Message:", event.message);
  console.error("Source:", event.filename + ":" + event.lineno);
  console.error("Error Object:", event.error);
  console.error("Stack:", event.error?.stack);
  console.groupEnd();
});

/* UNHANDLED PROMISE REJECTIONS */
window.addEventListener("unhandledrejection", (event) => {
  console.group("%c🔥 UNHANDLED PROMISE REJECTION", "color:orange; font-size:16px;");
  console.error("Reason:", event.reason);
  console.error("Stack:", event.reason?.stack);
  console.groupEnd();
});

/* MODULE IMPORT WRAPPER (DEBUG SAFE) */
if (!globalThis.__swse_import_wrapped__) {
  globalThis.__swse_import_wrapped__ = true;
  const realImport = globalThis.import;
  globalThis.import = async function(path) {
    try {
      return await realImport(path);
    } catch (err) {
      console.group("%c💥 ES MODULE IMPORT FAILED", "color:red; font-size:18px;");
      console.error("Import Path:", path);
      console.error("Message:", err.message);
      console.error("Stack:", err.stack);
      console.groupEnd();
      throw err;
    }
  };
}

/* ===================================================
   BACKUP FILE WARNINGS
   =================================================== */
setTimeout(() => {
  const BAD_PATTERNS = [/\.bak$/, /\.backup/i, /\.old$/, /\.tmp$/];
  const scripts = Array.from(document.querySelectorAll("script")).map(s => s.src);
  for (const s of scripts) {
    if (BAD_PATTERNS.some(p => p.test(s))) {
      console.group("%c⚠️ WARNING: BACKUP JS FILE LOADED!", "color:yellow; font-size:16px;");
      console.error("Backup JS executed:", s);
      console.error("This WILL break SWSE initialization.");
      console.groupEnd();
    }
  }
}, 2000);


/* ==========================================================================  
   IMPORTS
   ========================================================================== */

import { SWSEProgressionEngine, initializeProgressionHooks } from './scripts/engine/progression.js';
import { FeatSystem } from './scripts/engine/FeatSystem.js';
import { SkillSystem } from './scripts/engine/SkillSystem.js';
import { SWSELanguageModule } from './scripts/progression/modules/language-module.js';
import { initializeLevelUpUI } from './scripts/progression/ui/levelup-module-init.js';
import { initializeRolls } from './scripts/core/rolls-init.js';

import { SWSELogger, swseLogger } from './scripts/utils/logger.js';
import { SWSENotifications } from './scripts/utils/notifications.js';
import { errorHandler, errorCommands, logError } from './scripts/core/error-handler.js';
import { perfMonitor, debounce, throttle } from './scripts/utils/performance-utils.js';
import { cacheManager } from './scripts/core/cache-manager.js';
import { dataPreloader } from './scripts/core/data-preloader.js';
import { lazyLoader } from './scripts/core/lazy-loader.js';

import { SWSE_SKILLS, getSkillConfig, getSkillsArray } from './scripts/config/skills.js';
import { SWSE } from './scripts/core/config.js';
import { registerSystemSettings } from './scripts/core/settings.js';
import { RulesEngine } from './scripts/rules/rules-engine.js';
import { DDEngine } from './scripts/framework/dd-engine.js';
import { ThemeLoader } from './scripts/theme-loader.js';
import { DROID_SYSTEMS } from './scripts/data/droid-systems.js';
import { Upkeep } from './scripts/automation/upkeep.js';
import { initializeUtils } from './scripts/core/utils-init.js';
import { SWSE_RACES } from './scripts/core/races.js';
import * as SWSEData from './scripts/core/swse-data.js';

import { SWSEActorBase } from './scripts/actors/base/swse-actor-base.js';
import { SWSEItemBase } from './scripts/items/base/swse-item-base.js';
import { ActorEngine } from './scripts/actors/engine/actor-engine.js';
import { DefenseSystem } from './scripts/engine/DefenseSystem.js';
import { RollEngine } from './scripts/engine/roll-engine.js';
import { applyActorUpdateAtomic, batchActorUpdates, safeActorUpdate, prepareUpdatePayload, validateActorFields } from './scripts/utils/actor-utils.js';
import { sanitizeHTML, sanitizeChatMessage, canUserModifyActor, canUserModifyItem, withPermissionCheck, withGMCheck, escapeHTML, validateUserInput } from './scripts/utils/security-utils.js';
import { hookMonitor, monitoredHook, debouncedHook, throttledHook, safeHook, hookPerformanceCommands } from './scripts/utils/hook-performance.js';
import { compendiumLoader, compendiumCommands } from './scripts/utils/compendium-loader.js';

import { SWSECharacterDataModel } from './scripts/data-models/character-data-model.js';
import { SWSEVehicleDataModel } from './scripts/data-models/vehicle-data-model.js';

import {
    WeaponDataModel,
    ArmorDataModel,
    FeatDataModel,
    TalentDataModel,
    ForcePowerDataModel,
    ClassDataModel,
    SpeciesDataModel
} from './scripts/data-models/item-data-models.js';

import { SWSECombatDocument } from './scripts/combat/swse-combat.js';
import { SWSECombatant } from './scripts/combat/swse-combatant.js';

import { SWSECharacterSheet } from './scripts/actors/character/swse-character-sheet.js';
import { SWSEDroidSheet } from './scripts/actors/droid/swse-droid.js';
import { SWSENPCSheet } from './scripts/actors/npc/swse-npc.js';
import { SWSEVehicleSheet } from './scripts/actors/vehicle/swse-vehicle.js';
import { SWSEItemSheet } from './scripts/items/swse-item-sheet.js';

import { registerHandlebarsHelpers } from './helpers/handlebars/index.js';
import { preloadHandlebarsTemplates } from './scripts/core/load-templates.js';

import { WorldDataLoader } from './scripts/core/world-data-loader.js';
import { createItemMacro } from './scripts/macros/item-macro.js';

import './scripts/utils/skill-use-filter.js';
import './scripts/migration/fix-defense-schema.js';
import './scripts/migration/fix-actor-size.js';
import './scripts/migration/actor-validation-migration.js';
import './scripts/migration/item-validation-migration.js';
import './scripts/migration/populate-force-compendiums.js';

import { DamageSystem } from './scripts/combat/damage-system.js';
import { SWSECombatAutomation } from './scripts/combat/combat-automation.js';
import { SWSECombatIntegration } from './scripts/combat/combat-integration.js';
import { SWSEActiveEffectsManager } from './scripts/combat/active-effects-manager.js';
import { CombatActionsMapper } from './scripts/combat/utils/combat-actions-mapper.js';
import { SWSECombat } from './scripts/combat/systems/enhanced-combat-system.js';
import { SWSEGrappling } from './scripts/combat/systems/grappling-system.js';
import { SWSEVehicleCombat } from './scripts/combat/systems/vehicle-combat-system.js';

import { ForcePowerManager } from './scripts/utils/force-power-manager.js';
import { initializeForcePowerHooks } from './scripts/hooks/force-power-hooks.js';

import { initializeFollowerHooks } from './scripts/hooks/follower-hooks.js';
import { registerLevelUpSheetHooks } from './scripts/hooks/levelup-sheet-hooks.js';
import { registerKeybindings } from './scripts/core/keybindings.js';
import { ConditionTrackComponent } from './scripts/components/condition-track.js';
import { ForceSuiteComponent } from './scripts/components/force-suite.js';

import './init-talents.js';
import './scripts/apps/chargen-init.js';
import './scripts/hooks/assets-hooks.js';
import './scripts/npc-level3.js';
import './scripts/apps/progression/engine-autoload.js';
import './scripts/apps/progression/engine-helper.js';
import { SWSEStore } from './scripts/apps/store/store-main.js';
import { SWSELevelUp } from './scripts/apps/swse-levelup.js';
import { SWSEUpgradeApp } from './scripts/apps/upgrade-app.js';
import { VehicleModificationManager } from './scripts/apps/vehicle-modification-manager.js';
import { VehicleModificationApp } from './scripts/apps/vehicle-modification-app.js';
import { FollowerCreator } from './scripts/apps/follower-creator.js';
import { FollowerManager } from './scripts/apps/follower-manager.js';
import { SWSECombatActionBrowser } from './scripts/apps/combat-action-browser.js';
import './scripts/apps/mentor-guidance.js';
import { MentorSelectorWindow } from './scripts/apps/mentor-selector.js';
import { ProficiencySelectionDialog } from './scripts/apps/proficiency-selection-dialog.js';

import { registerHouseruleSettings } from './scripts/houserules/houserule-settings.js';
import { HouseruleMechanics } from './scripts/houserules/houserule-mechanics.js';
import { HouserulesConfig } from './scripts/houserules/houserules-config.js';
import { GrappleMechanics } from './scripts/houserules/houserule-grapple.js';
import { RecoveryMechanics } from './scripts/houserules/houserule-recovery.js';
import { ConditionTrackMechanics } from './scripts/houserules/houserule-condition-track.js';
import { FlankingMechanics } from './scripts/houserules/houserule-flanking.js';
import { SkillTrainingMechanics } from './scripts/houserules/houserule-skill-training.js';
import { StatusEffectsMechanics } from './scripts/houserules/houserule-status-effects.js';
import { SWSEHomebrewManager } from './scripts/gm-tools/homebrew-manager.js';

import { CanvasUIManager } from './scripts/canvas-ui/canvas-ui-manager.js';
import { DropHandler } from './scripts/drag-drop/drop-handler.js';
import './scripts/chat/chat-commands.js';

import { registerInitHooks, registerDestinyHooks } from './scripts/hooks/index.js';

/* ==========================================================================  
   INIT HOOK
   ========================================================================== */

Hooks.once("init", async function () {
    swseLogger.log("SWSE | Initializing Star Wars Saga Edition System");

    /* ---------------------------------------------------------
       EARLY HANDLEBARS HELPER REGISTRATION  (CRASH FIX)
       --------------------------------------------------------- */
    try {
        registerHandlebarsHelpers();

        // Add missing #let helper
        Handlebars.registerHelper("let", function(context, options) {
            const merged = Object.assign({}, this, context);
            return options.fn(merged);
        });

        swseLogger.log("SWSE | Handlebars Helpers Registered Early");
    } catch (err) {
        swseLogger.error("SWSE | Failed to register Handlebars helpers:", err);
    }

    /* ---------------------------------------------------------
       EARLY TEMPLATE PRELOADING (Prevents render race)
       --------------------------------------------------------- */
    try {
        await preloadHandlebarsTemplates();
        swseLogger.log("SWSE | Handlebars Templates Preloaded Early");
    } catch (err) {
        swseLogger.error("SWSE | Template Preloading Failed:", err);
    }

    /* ---------------------------------------------------------
       System Settings
       --------------------------------------------------------- */
    registerSystemSettings();
    registerHouseruleSettings();

    /* ---------------------------------------------------------
       Hook Registration
       --------------------------------------------------------- */
    registerInitHooks();
    registerDestinyHooks();
    registerLevelUpSheetHooks();
    registerKeybindings();

    /* ---------------------------------------------------------
       Document Classes
       --------------------------------------------------------- */
    CONFIG.Actor.dataModels = {
        character: SWSECharacterDataModel,
        npc: SWSECharacterDataModel,
        droid: SWSECharacterDataModel,
        vehicle: SWSEVehicleDataModel
    };

    CONFIG.Item.dataModels = {
        weapon: WeaponDataModel,
        armor: ArmorDataModel,
        feat: FeatDataModel,
        talent: TalentDataModel,
        forcepower: ForcePowerDataModel,
        "force-power": ForcePowerDataModel,
        class: ClassDataModel,
        species: SpeciesDataModel
    };

    CONFIG.Actor.documentClass = SWSEActorBase;
    CONFIG.Item.documentClass = SWSEItemBase;
    CONFIG.Combat.documentClass = SWSECombatDocument;
    CONFIG.Combatant.documentClass = SWSECombatant;

    /* ---------------------------------------------------------
       SWSE Config Setup
       --------------------------------------------------------- */
    CONFIG.SWSE = SWSE;

    /* ---------------------------------------------------------
       Sheet Registration
       --------------------------------------------------------- */
    Actors.unregisterSheet("core", ActorSheet);
    Items.unregisterSheet("core", ItemSheet);

    Actors.registerSheet("swse", SWSECharacterSheet, { types: ["character"], makeDefault: true });
    Actors.registerSheet("swse", SWSENPCSheet, { types: ["npc"], makeDefault: true });
    Actors.registerSheet("swse", SWSEDroidSheet, { types: ["droid"], makeDefault: true });
    Actors.registerSheet("swse", SWSEVehicleSheet, { types: ["vehicle"], makeDefault: true });

    Items.registerSheet("swse", SWSEItemSheet, {
        types: ["weapon","armor","equipment","feat","talent","forcepower","force-power","class","species","talenttree","skill","combat-action","condition"],
        makeDefault: true
    });

    /* ---------------------------------------------------------
       Global namespace
       --------------------------------------------------------- */
    globalThis.SWSE = {
        ActorEngine,
        RollEngine,
        lazyLoader,
        perfMonitor
    };
});


/* ==========================================================================  
   READY HOOK
   ========================================================================== */

Hooks.once("ready", async function () {
    swseLogger.log("SWSE | System Ready");

    errorHandler.initialize();
    initializeRolls();

    /* Data Preloading */
    await perfMonitor.measureAsync('Data Preloading', async () => {
        await dataPreloader.preload({
            priority: ['classes','skills'],
            background: ['feats','talents','forcePowers','species'],
            verbose: true
        });
    });

    await perfMonitor.measureAsync('Combat Actions Init', async () => { await CombatActionsMapper.init(); });
    await perfMonitor.measureAsync('Vehicle Modification Init', async () => { await VehicleModificationManager.init(); });

    initializeForcePowerHooks();
    initializeFollowerHooks();
    initializeProgressionHooks();
    await initializeLevelUpUI();

    SWSELanguageModule.init();

    lazyLoader.setupLazyImages();
    swseLogger.log('Lazy image loading initialized');

    if (game.user.isGM) await WorldDataLoader.autoLoad();

    SWSECombat.init();
    SWSECombatIntegration.init();
    SWSEActiveEffectsManager.init();
    SWSEGrappling.init();
    SWSEVehicleCombat.init();
    SWSECombatActionBrowser.init();
    HouseruleMechanics.initialize();

    RulesEngine.init();
    Upkeep.init();
    ThemeLoader.init();
    initializeUtils();

    try {
        CanvasUIManager.initialize();
        swseLogger.log("SWSE | Canvas UI Tools initialized");
    } catch (err) {
        swseLogger.warn("SWSE | CanvasUIManager.initialize() failed:", err);
    }

    /* ---------------------------------------------------------
       EXTEND GLOBAL NAMESPACE (PHASE 2)
       --------------------------------------------------------- */
    Object.assign(window.SWSE, {
    FeatSystem,
    SkillSystem,

        ActorEngine,
        cacheManager,
        dataPreloader,
        errorHandler,
        lazyLoader,
        perfMonitor,
        ForcePowerManager,
        CombatActionsMapper,
        DamageSystem,
        RulesEngine,
        DDEngine,
        ThemeLoader,
        DROID_SYSTEMS,
        SWSE_RACES,
        SWSEData,
        Upkeep,
        ProficiencySelectionDialog,
        debounce,
        throttle,
        logError,
        errors: errorCommands,
        hooks: hookPerformanceCommands,
        compendium: compendiumCommands,
        applyActorUpdateAtomic,
        batchActorUpdates,
        safeActorUpdate,
        prepareUpdatePayload,
        validateActorFields,
        sanitizeHTML,
        sanitizeChatMessage,
        canUserModifyActor,
        canUserModifyItem,
        withPermissionCheck,
        withGMCheck,
        escapeHTML,
        validateUserInput,
        hookMonitor,
        compendiumLoader,
        ...game.swse
    });

    /* ---------------------------------------------------------
       PROGRESSION UI BOOTSTRAP
       --------------------------------------------------------- */
    try {
        await foundry.applications.handlebars.loadTemplates([
            'systems/foundryvtt-swse/templates/apps/progression/sidebar.hbs',
            'systems/foundryvtt-swse/templates/apps/progression/attribute-method.hbs',
            'systems/foundryvtt-swse/templates/apps/chargen/ability-rolling.hbs'
        ]);

        swseLogger.log('SWSE | Progression UI templates preloaded');
    } catch (err) {
        swseLogger.warn("SWSE | Progression bootstrap error", err);
    }

    swseLogger.log("SWSE | Enhanced System Fully Loaded");
});


/* ==========================================================================  
   CANVAS REPAIR — Fix hidden canvas issues
   ========================================================================== */

Hooks.on("canvasReady", () => {
    const board = document.querySelector("#board");
    if (board) {
        board.style.display = "block";
        board.style.visibility = "visible";
        board.style.opacity = "1";
        board.style.height = "";
    }
});
