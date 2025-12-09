// ============================================
// SWSE System - Main Entry Point
// Foundry VTT | Star Wars Saga Edition
// ============================================

import "./scripts/progression/progression-engine.js";

// ---------------------------
// Utilities & Core Infrastructure
// ---------------------------
import { SWSELogger, swseLogger } from './scripts/utils/logger.js';
import { SWSENotifications } from './scripts/utils/notifications.js';
import { errorHandler, errorCommands, logError } from './scripts/core/error-handler.js';
import { perfMonitor, debounce, throttle } from './scripts/utils/performance-utils.js';
import { cacheManager } from './scripts/core/cache-manager.js';
import { dataPreloader } from './scripts/core/data-preloader.js';
import { lazyLoader } from './scripts/core/lazy-loader.js';

// ---------------------------
// Configuration
// ---------------------------
import { SWSE_SKILLS, getSkillConfig, getSkillsArray } from './scripts/config/skills.js';
import { registerSystemSettings } from './scripts/core/settings.js';

// ---------------------------
// Core Document Classes
// ---------------------------
import { SWSEActorBase } from './scripts/actors/base/swse-actor-base.js';
import { SWSEItemBase } from './scripts/items/base/swse-item-base.js';

// ---------------------------
// Data Models
// ---------------------------
import { SWSECharacterDataModel } from './scripts/data-models/character-data-model.js';
import { SWSEVehicleDataModel } from './scripts/data-models/vehicle-data-model.js';

// ---------------------------
// Item Data Models
// ---------------------------
import {
    WeaponDataModel,
    ArmorDataModel,
    FeatDataModel,
    TalentDataModel,
    ForcePowerDataModel,
    ClassDataModel,
    SpeciesDataModel
} from './scripts/data-models/item-data-models.js';

// ---------------------------
// Combat Documents
// ---------------------------
import { SWSECombatDocument } from './scripts/combat/swse-combat.js';
import { SWSECombatant } from './scripts/combat/swse-combatant.js';

// ---------------------------
// Actor Sheets
// ---------------------------
import { SWSECharacterSheet } from './scripts/actors/character/swse-character-sheet.js';
import { SWSEDroidSheet } from './scripts/actors/droid/swse-droid.js';
import { SWSENPCSheet } from './scripts/actors/npc/swse-npc.js';
import { SWSEVehicleSheet } from './scripts/actors/vehicle/swse-vehicle.js';

// ---------------------------
// Item Sheets
// ---------------------------
import { SWSEItemSheet } from './scripts/items/swse-item-sheet.js';

// ---------------------------
// Core Systems
// ---------------------------
import { registerHandlebarsHelpers } from './helpers/handlebars/index.js';
import { preloadHandlebarsTemplates } from './scripts/core/load-templates.js';
import { WorldDataLoader } from './scripts/core/world-data-loader.js';
import { ThemeLoader } from './scripts/theme-loader.js';
import { createItemMacro } from './scripts/macros/item-macro.js';
import './scripts/utils/skill-use-filter.js';

// ---------------------------
// Migration Scripts (side-effect imports)
// ---------------------------
import './scripts/migration/fix-defense-schema.js';
import './scripts/migration/fix-actor-size.js';
import './scripts/migration/actor-validation-migration.js';
import './scripts/migration/item-validation-migration.js';
import './scripts/migration/populate-force-compendiums.js';

// ---------------------------
// Combat Systems
// ---------------------------
import { DamageSystem } from './scripts/combat/damage-system.js';
import { SWSECombatAutomation } from './scripts/combat/combat-automation.js';
import { SWSECombatIntegration } from './scripts/combat/combat-integration.js';
import { SWSEActiveEffectsManager } from './scripts/combat/active-effects-manager.js';
import { CombatActionsMapper } from './scripts/combat/utils/combat-actions-mapper.js';
import { SWSECombat } from './scripts/combat/systems/enhanced-combat-system.js';
import { SWSEGrappling } from './scripts/combat/systems/grappling-system.js';
import { SWSEVehicleCombat } from './scripts/combat/systems/vehicle-combat-system.js';

// ---------------------------
// Force Powers
// ---------------------------
import { ForcePowerManager } from './scripts/utils/force-power-manager.js';
import { initializeForcePowerHooks } from './scripts/hooks/force-power-hooks.js';

// ---------------------------
// Follower System
// ---------------------------
import { initializeFollowerHooks } from './scripts/hooks/follower-hooks.js';

// ---------------------------
// Components
// ---------------------------
import { ConditionTrackComponent } from './scripts/components/condition-track.js';
import { ForceSuiteComponent } from './scripts/components/force-suite.js';

// ---------------------------
// Applications
// ---------------------------
import './scripts/apps/chargen-init.js';
import { SWSEStore } from './scripts/apps/store/store-main.js';
import { SWSELevelUp } from './scripts/apps/swse-levelup.js';
import { SWSEUpgradeApp } from './scripts/apps/upgrade-app.js';
import { VehicleModificationManager } from './scripts/apps/vehicle-modification-manager.js';
import { VehicleModificationApp } from './scripts/apps/vehicle-modification-app.js';
import { FollowerCreator } from './scripts/apps/follower-creator.js';
import { FollowerManager } from './scripts/apps/follower-manager.js';

// ---------------------------
// House Rules & GM Tools
// ---------------------------
import { registerHouseruleSettings } from './scripts/houserules/houserule-settings.js';
import { HouseruleMechanics } from './scripts/houserules/houserule-mechanics.js';
import { HouserulesConfig } from './scripts/houserules/houserules-config.js';
import { SWSEHomebrewManager } from './scripts/gm-tools/homebrew-manager.js';

// ---------------------------
// Integration Systems
// ---------------------------
import { CanvasUIManager } from './scripts/canvas-ui/canvas-ui-manager.js';
import { DropHandler } from './scripts/drag-drop/drop-handler.js';
import './scripts/chat/chat-commands.js';

// ---------------------------
// Hooks System
// ---------------------------
import { registerInitHooks } from './scripts/hooks/index.js';

// ---------------------------
// Define SWSE Namespace
// ---------------------------
const SWSE = {};
CONFIG.SWSE = SWSE;

// ---------------------------
// Utility Functions
// ---------------------------
function enhanceValidationLogging() {
    [Actor, Item].forEach(DocumentClass => {
        const original = DocumentClass.prototype.validate;
        DocumentClass.prototype.validate = function (data, options) {
            try {
                return original.call(this, data, options);
            } catch (err) {
                if (err.name === "DataModelValidationError") {
                    console.group(`⚠️ SWSE ${DocumentClass.name} Validation Error`);
                    swseLogger.error(`Document:`, this.name || "Unnamed");
                    swseLogger.error(`Type:`, this.type);
                    swseLogger.error(`ID:`, this.id || "No ID");
                    console.group(`Data Object:`);
                    console.dir(data, { depth: 3 });
                    console.groupEnd();
                    if (err.failures?.length > 0) {
                        console.group(`Validation Failures (${err.failures.length}):`);
                        err.failures.forEach((f, index) => {
                            console.group(`${index + 1}. Field: ${f.path}`);
                            swseLogger.error(`Message:`, f.failure?.message || f.failure);
                            swseLogger.error(`Actual Value:`, f.value);
                            swseLogger.error(`Expected:`, f.failure?.expected || 'N/A');
                            console.groupEnd();
                        });
                        console.groupEnd();
                    }
                    if (err.message) swseLogger.error(`Error Message:`, err.message);
                    if (game.settings?.get('swse', 'devMode')) {
                        console.group(`Stack Trace:`);
                        swseLogger.error(err.stack);
                        console.groupEnd();
                    }
                    console.groupEnd();
                    ui.notifications?.error(
                        `Validation error in ${DocumentClass.name}: ${this.name || 'Unnamed'}. Check console for details.`,
                        { permanent: false }
                    );
                }
                throw err;
            }
        };
    });
    SWSELogger.log("Enhanced validation logging enabled");
}

// ---------------------------
// System Initialization
// ---------------------------
Hooks.once("init", async function () {
    swseLogger.log("SWSE | Initializing Star Wars Saga Edition System");

    // System Settings
    registerSystemSettings();

    // Register Hooks
    registerInitHooks();

    // Create Global Namespace
    game.swse = {
        SWSEActorBase,
        SWSEItemBase,
        SWSECharacterSheet,
        SWSEDroidSheet,
        SWSENPCSheet,
        SWSEVehicleSheet,
        SWSEItemSheet,
        DamageSystem,
        CombatAutomation: SWSECombatAutomation,
        Combat: SWSECombat,
        Grappling: SWSEGrappling,
        VehicleCombat: SWSEVehicleCombat,
        WorldDataLoader,
        DropHandler,
        HouseruleMechanics,
        HouserulesConfig,
        notifications: SWSENotifications,
        logger: SWSELogger,
        config: CONFIG.SWSE,
        skills: SWSE_SKILLS,
        getSkillConfig,
        getSkillsArray,
        components: { ConditionTrack: ConditionTrackComponent, ForceSuite: ForceSuiteComponent },
        CanvasUIManager,
        apps: {
            Store: SWSEStore,
            LevelUp: SWSELevelUp,
            VehicleModificationApp,
            UpgradeApp,
            FollowerCreator,
            FollowerManager
        },
        VehicleModificationManager,
        cacheManager,
        dataPreloader,
        errorHandler,
        lazyLoader,
        perfMonitor,
        utils: { debounce, throttle }
    };

    // Lazy Loader Early
    window.SWSE = { lazyLoader, perfMonitor };

    // Document Classes
    CONFIG.Actor.documentClass = SWSEActorBase;
    CONFIG.Item.documentClass = SWSEItemBase;
    CONFIG.Combat.documentClass = SWSECombatDocument;
    CONFIG.Combatant.documentClass = SWSECombatant;

    // Data Models
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
        'force-power': ForcePowerDataModel,
        class: ClassDataModel,
        species: SpeciesDataModel
    };

    // Sheets
    Actors.unregisterSheet("core", ActorSheet);
    Items.unregisterSheet("core", ItemSheet);

    Actors.registerSheet("swse", SWSECharacterSheet, { types: ["character"], makeDefault: true, label: "SWSE.SheetLabels.Character" });
    Actors.registerSheet("swse", SWSENPCSheet, { types: ["npc"], makeDefault: true, label: "SWSE.SheetLabels.NPC" });
    Actors.registerSheet("swse", SWSEDroidSheet, { types: ["droid"], makeDefault: true, label: "SWSE.SheetLabels.Droid" });
    Actors.registerSheet("swse", SWSEVehicleSheet, { types: ["vehicle"], makeDefault: true, label: "SWSE.SheetLabels.Vehicle" });

    Items.registerSheet("swse", SWSEItemSheet, {
        types: ["weapon","armor","equipment","feat","talent","forcepower","force-power","class","species","talenttree","skill","combat-action","condition"],
        makeDefault: true,
        label: "SWSE.SheetLabels.Item"
    });

    registerHouseruleSettings();
    SWSEHomebrewManager.registerSettings();
    SWSEHomebrewManager.init();

    // Handlebars
    registerHandlebarsHelpers();
    await preloadHandlebarsTemplates();

    // Validation Enhancements
    enhanceValidationLogging();

    // Dice Configuration
    CONFIG.Dice.terms["d"] = foundry.dice.terms.Die;

    swseLogger.log("SWSE | System Initialized Successfully");
});

// ---------------------------
// System Ready Hook
// ---------------------------
Hooks.once("ready", async function () {
    swseLogger.log("SWSE | System Ready");

    errorHandler.initialize();

    // Data Preloading
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

    lazyLoader.setupLazyImages();
    SWSELogger.log('Lazy image loading initialized');

    if (game.user.isGM) await WorldDataLoader.autoLoad();

    ThemeLoader.initialize();

    SWSECombat.init();
    SWSEGrappling.init();
    SWSEVehicleCombat.init();
    HouseruleMechanics.initialize();

    try {
        CanvasUIManager.initialize();
        swseLogger.log("SWSE | Canvas UI Tools initialized");
    } catch (err) {
        swseLogger.warn("SWSE | CanvasUIManager.initialize() failed:", err);
        SWSELogger.warn("CanvasUIManager initialization failed", err);
    }

    Object.assign(window.SWSE, {
        cacheManager,
        dataPreloader,
        errorHandler,
        lazyLoader,
        perfMonitor,
        ForcePowerManager,
        CombatActionsMapper,
        DamageSystem,
        debounce,
        throttle,
        logError,
        errors: errorCommands,
        ...game.swse
    });

    // ============================================
    // SWSE Progression UI Bootstrap
    // ============================================
    try {
        // Preload progression templates
        await loadTemplates([
            'templates/apps/progression/sidebar.hbs',
            'templates/apps/progression/attribute-method.hbs',
            'templates/apps/chargen/ability-rolling.hbs'
        ]).catch(() => {});

        // Import sidebar controller (if present)
        import('./scripts/apps/progression/sidebar.js').then(mod => {
            // Attach if template already present
            try {
                if (!window.SWSE_PROG_SIDEBAR && document.querySelector('.swse-prog-sidebar')) {
                    window.SWSE_PROG_SIDEBAR = new mod.SWSEProgressionSidebar();
                    swseLogger.log('SWSE | Progression sidebar attached');
                }
            } catch(e) { swseLogger.warn('SWSE | Sidebar init error', e); }
        }).catch(e => swseLogger.warn('SWSE | Sidebar import failed', e));

        // Install attribute selector hook listener
        Hooks.on('swse:attribute-method:selected', (method) => {
            Hooks.call('swse:attribute-method:apply', method);
        });

        // Expose the ability rolling controller for apps to instantiate
        import('./scripts/apps/chargen/ability-rolling.js').then(mod => {
            window.SWSE_AbilityRolling = mod.AbilityRollingController;
            swseLogger.log('SWSE | Ability rolling controller available');
        }).catch(e => swseLogger.warn('SWSE | ability-rolling import failed', e));

        // Load engine integration helpers (non-blocking)
        import('./scripts/apps/progression/engine-autoload.js').catch(e => swseLogger.warn('SWSE | engine-autoload import failed', e));
        import('./scripts/apps/progression/engine-helper.js').catch(e => swseLogger.warn('SWSE | engine-helper import failed', e));

        // Auto-close progression/chargen windows when progression completes
        Hooks.on('swse:progression:completed', ({ actor, level, mode } = {}) => {
            try {
                for (const appId in ui.windows) {
                    const app = ui.windows[appId];
                    if (!app) continue;
                    const name = app.constructor?.name || '';
                    const title = (app?.title || '').toString();
                    const likelyProgression = name.toLowerCase().includes('progress') || name.toLowerCase().includes('chargen') ||
                                             /progression|chargen|level up|character creation/i.test(title);
                    if (likelyProgression && typeof app.close === 'function') {
                        try { app.close(); } catch(_) {}
                    }
                }
                if (window.SWSE_PROG_SIDEBAR && typeof window.SWSE_PROG_SIDEBAR.disconnect === 'function') {
                    try { window.SWSE_PROG_SIDEBAR.disconnect(); } catch(_) {}
                }
            } catch(e) { swseLogger.warn('SWSE | auto-close handler failed', e); }
        });

        swseLogger.log('SWSE | Progression UI system bootstrapped');
    } catch(e) {
        swseLogger.warn('SWSE | Progression bootstrap error', e);
    }

    swseLogger.log("SWSE | Enhanced System Fully Loaded");
});
