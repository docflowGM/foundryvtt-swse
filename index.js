// ============================================
// SWSE System - Main Entry Point
// Foundry VTT | Star Wars Saga Edition
// ============================================

/* -------------------------------------------- */
/*  Utilities & Core Infrastructure             */
/*  (Load first - needed by everything)         */
/* -------------------------------------------- */

import { SWSELogger } from './scripts/utils/logger.js';
import { SWSENotifications } from './scripts/utils/notifications.js';
import { errorHandler, errorCommands, logError } from './scripts/core/error-handler.js';
import { perfMonitor, debounce, throttle } from './scripts/utils/performance-utils.js';
import { cacheManager } from './scripts/core/cache-manager.js';
import { dataPreloader } from './scripts/core/data-preloader.js';
import { lazyLoader } from './scripts/core/lazy-loader.js';

/* -------------------------------------------- */
/*  Configuration                               */
/*  (Data structures used throughout)           */
/* -------------------------------------------- */

import { SWSE_SKILLS, getSkillConfig, getSkillsArray } from './scripts/config/skills.js';

/* -------------------------------------------- */
/*  Core Document Classes                       */
/*  (Needed for CONFIG assignment)              */
/* -------------------------------------------- */

import { SWSEActorBase } from './scripts/actors/base/swse-actor-base.js';
import { SWSEItemBase } from './scripts/items/base/swse-item-base.js';

/* -------------------------------------------- */
/*  Data Models                                 */
/*  (Required for Foundry V11+)                 */
/* -------------------------------------------- */

import { SWSECharacterDataModel } from './scripts/data-models/character-data-model.js';
import { SWSEVehicleDataModel } from './scripts/data-models/vehicle-data-model.js';
import { WeaponDataModel, ArmorDataModel, FeatDataModel, TalentDataModel, ForcePowerDataModel, ClassDataModel, SpeciesDataModel } from './scripts/data-models/item-data-models.js';

/* -------------------------------------------- */
/*  Combat Documents                            */
/*  (Needed for CONFIG.Combat assignment)       */
/* -------------------------------------------- */

import { SWSECombatDocument } from './scripts/combat/swse-combat.js';
import { SWSECombatant } from './scripts/combat/swse-combatant.js';

/* -------------------------------------------- */
/*  Actor Sheets                                */
/*  (Needed for sheet registration)             */
/* -------------------------------------------- */

import { SWSECharacterSheet } from './scripts/actors/character/swse-character-sheet.js';
import { SWSEDroidSheet } from './scripts/actors/droid/swse-droid.js';
import { SWSENPCSheet } from './scripts/actors/npc/swse-npc.js';
import { SWSEVehicleSheet } from './scripts/actors/vehicle/swse-vehicle.js';

/* -------------------------------------------- */
/*  Item Sheets                                 */
/*  (Needed for sheet registration)             */
/* -------------------------------------------- */

import { SWSEItemSheet } from './scripts/items/swse-item-sheet.js';

/* -------------------------------------------- */
/*  Core Systems                                */
/*  (Foundational features)                     */
/* -------------------------------------------- */

import { registerHandlebarsHelpers } from './helpers/handlebars/index.js';
import { preloadHandlebarsTemplates } from './scripts/core/load-templates.js';
import { WorldDataLoader } from './scripts/core/world-data-loader.js';
import { ThemeLoader } from './scripts/theme-loader.js';
import { createItemMacro } from './scripts/macros/item-macro.js';
import './scripts/utils/skill-use-filter.js';

/* -------------------------------------------- */
/*  Migration Scripts                           */
/*  (Side-effect imports for data migrations)   */
/* -------------------------------------------- */

import './scripts/migration/fix-defense-schema.js';
import './scripts/migration/fix-actor-size.js';
import './scripts/migration/actor-validation-migration.js';
import './scripts/migration/item-validation-migration.js';
import './scripts/migration/populate-force-compendiums.js';

/* -------------------------------------------- */
/*  Combat Systems                              */
/*  (Core combat mechanics)                     */
/* -------------------------------------------- */

import { DamageSystem } from './scripts/combat/damage-system.js';
import { SWSECombatAutomation } from './scripts/combat/combat-automation.js';
import { SWSECombatIntegration } from './scripts/combat/combat-integration.js';
import { SWSEActiveEffectsManager } from './scripts/combat/active-effects-manager.js';
import { CombatActionsMapper } from './scripts/combat/utils/combat-actions-mapper.js';
import { SWSECombat } from './scripts/combat/systems/enhanced-combat-system.js';
import { SWSEGrappling } from './scripts/combat/systems/grappling-system.js';
import { SWSEVehicleCombat } from './scripts/combat/systems/vehicle-combat-system.js';

/* -------------------------------------------- */
/*  Force Powers                                */
/*  (Force-related mechanics)                   */
/* -------------------------------------------- */

import { ForcePowerManager } from './scripts/utils/force-power-manager.js';
import { initializeForcePowerHooks } from './scripts/hooks/force-power-hooks.js';

// Follower System
import { initializeFollowerHooks } from './scripts/hooks/follower-hooks.js';

/* -------------------------------------------- */
/*  Components                                  */
/*  (Reusable UI components)                    */
/* -------------------------------------------- */

import { ConditionTrackComponent } from './scripts/components/condition-track.js';
import { ForceSuiteComponent } from './scripts/components/force-suite.js';

/* -------------------------------------------- */
/*  Applications                                */
/*  (UI Applications and Dialogs)               */
/* -------------------------------------------- */

// Character Generator (side-effect import)
import './scripts/apps/chargen-init.js';

// Store System
import { SWSEStore } from './scripts/apps/store/store-main.js';

// Level Up System
import { SWSELevelUp } from './scripts/apps/swse-levelup.js';

// Upgrade System
import { SWSEUpgradeApp } from './scripts/apps/upgrade-app.js';

// Vehicle Modification System
import { VehicleModificationManager } from './scripts/apps/vehicle-modification-manager.js';
import { VehicleModificationApp } from './scripts/apps/vehicle-modification-app.js';

// Follower System
import { FollowerCreator } from './scripts/apps/follower-creator.js';
import { FollowerManager } from './scripts/apps/follower-manager.js';

/* -------------------------------------------- */
/*  House Rules & GM Tools                      */
/*  (Customization and GM utilities)            */
/* -------------------------------------------- */

import { registerHouseruleSettings } from './scripts/houserules/houserule-settings.js';
import { HouseruleMechanics } from './scripts/houserules/houserule-mechanics.js';
import { HouserulesConfig } from './scripts/houserules/houserules-config.js';
import { SWSEHomebrewManager } from './scripts/gm-tools/homebrew-manager.js';

/* -------------------------------------------- */
/*  Integration Systems                         */
/*  (Features that tie everything together)     */
/* -------------------------------------------- */

import { CanvasUIManager } from './scripts/canvas-ui/canvas-ui-manager.js';
import { DropHandler } from './scripts/drag-drop/drop-handler.js';
import './scripts/chat/chat-commands.js';

/* -------------------------------------------- */
/*  Hooks System                                */
/*  (MUST BE LAST - registers init/ready hooks) */
/* -------------------------------------------- */

import { registerInitHooks } from './scripts/hooks/index.js';

/* -------------------------------------------- */
/*  System Configuration                        */
/* -------------------------------------------- */

/**
 * Define the SWSE configuration object
 */
const SWSE = {};

// Set up CONFIG.SWSE
CONFIG.SWSE = SWSE;

/* -------------------------------------------- */
/*  System Initialization                      */
/* -------------------------------------------- */

Hooks.once("init", async function() {
  console.log("SWSE | Initializing Star Wars Saga Edition System");

  // Ensure system settings are registered before anything reads them.
  // registerSystemSettings is idempotent and safe to call early.
  registerSystemSettings();

  // ============================================
  // Create Global Namespace
  // ============================================

  game.swse = {
    // Core Classes
    SWSEActorBase,
    SWSEItemBase,

    // Sheet Classes
    SWSECharacterSheet,
    SWSEDroidSheet,
    SWSENPCSheet,
    SWSEVehicleSheet,
    SWSEItemSheet,

    // Systems
    DamageSystem,
    CombatAutomation: SWSECombatAutomation,
    Combat: SWSECombat,
    Grappling: SWSEGrappling,
    VehicleCombat: SWSEVehicleCombat,
    WorldDataLoader,
    DropHandler,
    HouseruleMechanics,
    HouserulesConfig,

    // Utilities
    notifications: SWSENotifications,
    logger: SWSELogger,

    // Configuration
    config: CONFIG.SWSE,
    skills: SWSE_SKILLS,
    getSkillConfig,
    getSkillsArray,

    // Components
    components: {
      ConditionTrack: ConditionTrackComponent,
      ForceSuite: ForceSuiteComponent
    },

    // Canvas UI
    CanvasUIManager,

    // Applications
    apps: {
      Store: SWSEStore,
      LevelUp: SWSELevelUp,
      VehicleModificationApp: VehicleModificationApp,
      UpgradeApp: SWSEUpgradeApp,
      FollowerCreator: FollowerCreator,
      FollowerManager: FollowerManager
    },

    // Vehicle Modification System
    VehicleModificationManager,

    // Performance & Optimization
    cacheManager,
    dataPreloader,
    errorHandler,
    lazyLoader,
    perfMonitor,
    utils: {
      debounce,
      throttle
    }
  };

  // ============================================
  // Make Lazy Loader Available Early
  // ============================================

  window.SWSE = {
    lazyLoader,
    perfMonitor
  };

  // ============================================
  // Configure Document Classes
  // ============================================

  CONFIG.Actor.documentClass = SWSEActorBase;
  CONFIG.Item.documentClass = SWSEItemBase;
  CONFIG.Combat.documentClass = SWSECombatDocument;
  CONFIG.Combatant.documentClass = SWSECombatant;

  // ============================================
  // Register Data Models (Foundry V11+)
  // ============================================

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

  // ============================================
  // Unregister Core Sheets
  // ============================================

  Actors.unregisterSheet("core", ActorSheet);
  Items.unregisterSheet("core", ItemSheet);

  // ============================================
  // Register Actor Sheets
  // ============================================

  Actors.registerSheet("swse", SWSECharacterSheet, {
    types: ["character"],
    makeDefault: true,
    label: "SWSE.SheetLabels.Character"
  });

  Actors.registerSheet("swse", SWSENPCSheet, {
    types: ["npc"],
    makeDefault: true,
    label: "SWSE.SheetLabels.NPC"
  });

  Actors.registerSheet("swse", SWSEDroidSheet, {
    types: ["droid"],
    makeDefault: true,
    label: "SWSE.SheetLabels.Droid"
  });

  Actors.registerSheet("swse", SWSEVehicleSheet, {
    types: ["vehicle"],
    makeDefault: true,
    label: "SWSE.SheetLabels.Vehicle"
  });

  // ============================================
  // Register Item Sheets
  // ============================================

  Items.registerSheet("swse", SWSEItemSheet, {
    types: ["weapon", "armor", "equipment", "feat", "talent", "forcepower", "force-power", "class", "species", "talenttree", "skill", "combat-action", "condition"],
    makeDefault: true,
    label: "SWSE.SheetLabels.Item"
  });

  // ============================================
  // Register System Settings (already called above - safe)
  // ============================================

  registerHouseruleSettings();
  SWSEHomebrewManager.registerSettings();
  SWSEHomebrewManager.init();

  // ============================================
  // Register Handlebars Helpers
  // ============================================

  registerHandlebarsHelpers();

  // Condition helpers and other small Handlebars helpers
  if (!Handlebars.helpers['conditionPenalty']) {
    Handlebars.registerHelper('conditionPenalty', function(track) {
      const penalties = [0, -1, -2, -5, -10, 0];
      return penalties[track] || 0;
    });
  }

  if (!Handlebars.helpers['isHelpless']) {
    Handlebars.registerHelper('isHelpless', function(track) {
      return track === 5;
    });
  }

  if (!Handlebars.helpers['formatModifier']) {
    Handlebars.registerHelper('formatModifier', function(value) {
      const num = Number(value) || 0;
      return num >= 0 ? `+${num}` : `${num}`;
    });
  }

  if (!Handlebars.helpers['safeNumber']) {
    Handlebars.registerHelper('safeNumber', function(value, options) {
      const num = Number(value);
      if (isNaN(num)) return 0;
      return num;
    });
  }

  if (!Handlebars.helpers['extractHitDie']) {
    Handlebars.registerHelper('extractHitDie', function(hitDieString) {
      if (!hitDieString) return '6';
      const match = String(hitDieString).match(/\d+d(\d+)/);
      return match ? match[1] : hitDieString;
    });
  }

  if (!Handlebars.helpers['formatBAB']) {
    Handlebars.registerHelper('formatBAB', function(babProgression) {
      if (typeof babProgression === 'string') {
        const prog = babProgression.toLowerCase();
        if (prog === 'fast' || prog === 'high') return 'High (+1/level)';
        if (prog === 'medium') return 'Medium (+3/4)';
        if (prog === 'slow' || prog === 'low') return 'Low (+1/2)';
      }
      const bab = Number(babProgression);
      if (!isNaN(bab)) {
        if (bab >= 1.0) return 'High (+1/level)';
        if (bab >= 0.75) return 'Medium (+3/4)';
        return 'Low (+1/2)';
      }
      return 'Unknown';
    });
  }

  if (!Handlebars.helpers['stripHTML']) {
    Handlebars.registerHelper('stripHTML', function(htmlString) {
      if (!htmlString) return '';
      const div = document.createElement('div');
      div.innerHTML = htmlString;
      return div.textContent || div.innerText || '';
    });
  }

  // ============================================
  // Preload Templates
  // ============================================

  await preloadHandlebarsTemplates();

  // Additional helpers used in templates
  Handlebars.registerHelper('subtract', function(a, b) {
    return Number(a) - Number(b);
  });

  Handlebars.registerHelper('uppercase', function(str) {
    return str ? str.toUpperCase() : '';
  });

  Handlebars.registerHelper('formatBonus', function(num) {
    const n = Number(num);
    return n >= 0 ? `+${n}` : `${n}`;
  });

  // ============================================
  // Configure Dice
  // ============================================

  CONFIG.Dice.terms["d"] = foundry.dice.terms.Die;

  // ============================================
  // Initialize Combat Systems
  // ============================================

  SWSECombatAutomation.init();
  SWSECombatIntegration.init();
  SWSEActiveEffectsManager.init();

  // ============================================
  // Development Enhancements
  // ============================================

  enhanceValidationLogging();

  console.log("SWSE | System Initialized Successfully");
});

/* -------------------------------------------- */
/*  System Ready Hook                           */
/* -------------------------------------------- */

Hooks.once("ready", async function() {
  console.log("SWSE | System Ready");

  // Initialize Error Handler
  errorHandler.initialize();

  // Preload Data (Priority)
  await perfMonitor.measureAsync('Data Preloading', async () => {
    await dataPreloader.preload({
      priority: ['classes', 'skills'],
      background: ['feats', 'talents', 'forcePowers', 'species'],
      verbose: true
    });
  });

  // Initialize Combat Actions Mapper
  await perfMonitor.measureAsync('Combat Actions Init', async () => {
    await CombatActionsMapper.init();
  });

  // Initialize Vehicle Modification System
  await perfMonitor.measureAsync('Vehicle Modification Init', async () => {
    await VehicleModificationManager.init();
  });

  // Initialize Force Power Hooks
  initializeForcePowerHooks();

  // Initialize Follower System Hooks
  initializeFollowerHooks();

  // Setup Lazy Loading
  lazyLoader.setupLazyImages();
  SWSELogger.log('Lazy image loading initialized');

  // Load World Data (GM Only)
  if (game.user.isGM) {
    await WorldDataLoader.autoLoad();

    if (!game.settings.get('swse', 'welcomeShown')) {
      ui.notifications.info(`
        <strong>${game.i18n.localize('SWSE.Notifications.Welcome.Title')}</strong><br>
        • ${game.i18n.localize('SWSE.Notifications.Welcome.ConditionTrack')}<br>
        • ${game.i18n.localize('SWSE.Notifications.Welcome.DamageThreshold')}<br>
        • ${game.i18n.localize('SWSE.Notifications.Welcome.ForceSuite')}<br>
        • ${game.i18n.localize('SWSE.Notifications.Welcome.Summary')}
      `, { permanent: false });

      await game.settings.set('swse', 'welcomeShown', true);
    }
  }

  // Initialize Theme System
  ThemeLoader.initialize();

  // Initialize Enhanced Combat System
  SWSECombat.init();

  // Initialize Canvas UI Manager (safe)
  try {
    CanvasUIManager.initialize();
    console.log("SWSE | Canvas UI Tools initialized");
  } catch (err) {
    console.warn("SWSE | CanvasUIManager.initialize() failed (continuing):", err);
    SWSELogger.warn("CanvasUIManager initialization failed", err);
  }

  SWSELogger.log('Enhanced Combat System initialized');

  // Center SWSE Windows (left of sidebar)
  Hooks.on('renderApplication', (app, html, data) => {
    if (!app.options.classes?.includes('swse')) return;
    const sidebar = document.getElementById('sidebar');
    const sidebarWidth = sidebar ? sidebar.offsetWidth : 300;
    const windowWidth = app.position.width;
    const windowHeight = app.position.height;
    const availableWidth = window.innerWidth - sidebarWidth;
    const left = Math.max(0, (availableWidth - windowWidth) / 2);
    const top = Math.max(0, (window.innerHeight - windowHeight) / 2);
    try { app.setPosition({ left, top }); } catch (e) { /* ignore */ }
  });

  SWSELogger.log('Window positioning initialized');

  // Initialize Grappling System
  SWSEGrappling.init();
  SWSELogger.log('Grappling System initialized');

  // Initialize Vehicle Combat System
  SWSEVehicleCombat.init();
  SWSELogger.log('Vehicle Combat System initialized');

  // Initialize House Rules
  HouseruleMechanics.initialize();

  // Export to Window for Console Access
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

  SWSELogger.log('Global namespace exported to window.SWSE');

  console.log("SWSE | Enhanced System Fully Loaded");
  console.log("SWSE | Use 'window.SWSE' in console to access system components");
});

/* -------------------------------------------- */
/*  System Settings Registration                */
/* -------------------------------------------- */

function registerSystemSettings() {

  // Data Management
  game.settings.register("swse", "dataLoaded", {
    name: "Data Loaded",
    scope: "world",
    config: false,
    type: Boolean,
    default: false
  });

  game.settings.register('swse', 'welcomeShown', {
    scope: 'world',
    config: false,
    type: Boolean,
    default: false
  });

  // Combat Automation
  game.settings.register('swse', 'enableAutomation', {
    name: 'SWSE.Settings.EnableAutomation.Name',
    hint: 'SWSE.Settings.EnableAutomation.Hint',
    scope: 'world',
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register('swse', 'autoConditionRecovery', {
    name: 'SWSE.Settings.AutoConditionRecovery.Name',
    hint: 'SWSE.Settings.AutoConditionRecovery.Hint',
    scope: 'world',
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register('swse', 'autoDamageThreshold', {
    name: 'SWSE.Settings.AutoDamageThreshold.Name',
    hint: 'SWSE.Settings.AutoDamageThreshold.Hint',
    scope: 'world',
    config: true,
    type: Boolean,
    default: true
  });

  // NEW: Canvas Toolbar behaviour on Forge (prevents missing-setting crash).
  // Registered as client-level so admins/players can opt out on their client.
  if (!game.settings.settings.has('swse.canvasToolbarOnForge')) {
    // older Foundry internals may not expose settings map directly; guard:
    try {
      game.settings.register('swse', 'canvasToolbarOnForge', {
        name: 'SWSE.Settings.CanvasToolbarOnForge.Name',
        hint: 'SWSE.Settings.CanvasToolbarOnForge.Hint',
        scope: 'client',
        config: true,
        type: Boolean,
        default: true
      });
    } catch (e) {
      // If registration fails (very rare), we fall back to a safe client default later.
      console.warn("SWSE | Could not register 'canvasToolbarOnForge' setting, proceeding with fallback behavior.", e);
    }
  }

  // Weapon Settings
  game.settings.register('swse', 'weaponRangeMultiplier', {
    name: 'SWSE.Settings.WeaponRangeMultiplier.Name',
    hint: 'SWSE.Settings.WeaponRangeMultiplier.Hint',
    scope: 'world',
    config: true,
    type: Number,
    default: 1.0,
    range: { min: 0.5, max: 5.0, step: 0.1 }
  });

  // Force Points
  game.settings.register("swse", "forcePointBonus", {
    name: 'SWSE.Settings.ForcePointBonus.Name',
    hint: 'SWSE.Settings.ForcePointBonus.Hint',
    scope: "world",
    config: true,
    type: Number,
    default: 2,
    range: { min: 0, max: 10, step: 1 }
  });

  game.settings.register("swse", "dailyForcePoints", {
    name: "SWSE.Settings.DailyForcePoints.Name",
    hint: "SWSE.Settings.DailyForcePoints.Hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });

  game.settings.register("swse", "darkSideTemptationMechanic", {
    name: "SWSE.Settings.DarkSideTemptationMechanic.Name",
    hint: "SWSE.Settings.DarkSideTemptationMechanic.Hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });

  // Store Settings
  game.settings.register("swse", "storeMarkup", {
    name: 'SWSE.Settings.StoreMarkup.Name',
    hint: 'SWSE.Settings.StoreMarkup.Hint',
    scope: "world",
    config: true,
    type: Number,
    default: 0,
    range: { min: -100, max: 1000, step: 5 }
  });

  game.settings.register("swse", "storeDiscount", {
    name: 'SWSE.Settings.StoreDiscount.Name',
    hint: 'SWSE.Settings.StoreDiscount.Hint',
    scope: "world",
    config: true,
    type: Number,
    default: 0,
    range: { min: 0, max: 100, step: 5 }
  });

  // Theme Settings
  game.settings.register("swse", "sheetTheme", {
    name: 'Sheet Theme',
    hint: 'Select the visual theme for character sheets and UI elements',
    scope: "client",
    config: true,
    type: String,
    choices: {
      "holo": "Default (Holo)",
      "high-contrast": "High Contrast",
      "starship": "Starship",
      "sand-people": "Sand People",
      "jedi": "Jedi",
      "high-republic": "High Republic"
    },
    default: "holo",
    onChange: value => {
      ThemeLoader.applyTheme(value);
    }
  });

  // Developer Settings
  game.settings.register("swse", "devMode", {
    name: "Developer Mode",
    hint: "Enable detailed error logging and stack traces for debugging",
    scope: "client",
    config: true,
    type: Boolean,
    default: false
  });

  // Migration Tracking (Hidden)
  game.settings.register("swse", "actorValidationMigration", {
    name: "Actor Validation Migration Version",
    hint: "Tracks the version of the actor validation migration that has been run",
    scope: "world",
    config: false,
    type: String,
    default: ""
  });

  game.settings.register("swse", "itemValidationMigration", {
    name: "Item Validation Migration Version",
    hint: "Tracks the version of the item validation migration that has been run",
    scope: "world",
    config: false,
    type: String,
    default: ""
  });

  game.settings.register("swse", "forceCompendiumsPopulation", {
    name: "Force Compendiums Population Version",
    hint: "Tracks the version of the force compendiums population migration that has been run",
    scope: "world",
    config: false,
    type: String,
    default: ""
  });
}

/* -------------------------------------------- */
/*  Theme Management & Deprecated API           */
/* -------------------------------------------- */

function applyTheme(themeName) {
  console.warn('[SWSE] applyTheme() is deprecated. Use ThemeLoader.applyTheme() instead.');
  ThemeLoader.applyTheme(themeName);
}

/* -------------------------------------------- */
/*  Utility Functions                           */
/* -------------------------------------------- */

function enhanceValidationLogging() {
  [Actor, Item].forEach(DocumentClass => {
    const original = DocumentClass.prototype.validate;
    DocumentClass.prototype.validate = function(data, options) {
      try {
        return original.call(this, data, options);
      } catch (err) {
        if (err.name === "DataModelValidationError") {
          console.group(`⚠️ SWSE ${DocumentClass.name} Validation Error`);
          console.error(`Document:`, this.name || "Unnamed");
          console.error(`Type:`, this.type);
          console.error(`ID:`, this.id || "No ID");
          console.group(`Data Object:`);
          console.dir(data, {depth: 3});
          console.groupEnd();
          if (err.failures && err.failures.length > 0) {
            console.group(`Validation Failures (${err.failures.length}):`);
            err.failures.forEach((f, index) => {
              console.group(`${index + 1}. Field: ${f.path}`);
              console.error(`   Message:`, f.failure?.message || f.failure);
              console.error(`   Actual Value:`, f.value);
              console.error(`   Expected:`, f.failure?.expected || 'N/A');
              console.groupEnd();
            });
            console.groupEnd();
          }
          if (err.message) console.error(`Error Message:`, err.message);
          if (game.settings?.get('swse', 'devMode')) {
            console.group(`Stack Trace:`);
            console.error(err.stack);
            console.groupEnd();
          }
          console.groupEnd();
          ui.notifications?.error(
            `Validation error in ${DocumentClass.name}: ${this.name || 'Unnamed'}. Check console for details.`,
            {permanent: false}
          );
        }
        throw err;
      }
    };
  });
  SWSELogger.log("Enhanced validation logging enabled");
}

/* -------------------------------------------- */
/*  Initialize Hook System                      */
/* -------------------------------------------- */

registerInitHooks();
