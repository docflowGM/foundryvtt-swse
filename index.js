// ============================================
// SWSE System - Main Entry Point
// Foundry VTT | Star Wars Saga Edition
// ============================================

/* -------------------------------------------- */
/*  Actor Classes and Sheets                    */
/* -------------------------------------------- */

import { SWSEActorBase } from './scripts/actors/base/swse-actor-base.js';
import { SWSECharacterSheet } from './scripts/actors/character/swse-character-sheet.js';
import { SWSEDroidSheet } from './scripts/actors/droid/swse-droid.js';
import { SWSENPCSheet } from './scripts/actors/npc/swse-npc.js';
import { SWSEVehicleSheet } from './scripts/actors/vehicle/swse-vehicle.js';

/* -------------------------------------------- */
/*  Item Classes and Sheets                     */
/* -------------------------------------------- */

import { SWSEItemBase } from './scripts/items/base/swse-item-base.js';
import { SWSEItemSheet } from './scripts/items/swse-item-sheet.js';

/* -------------------------------------------- */
/*  Data Models                                 */
/* -------------------------------------------- */

import { SWSECharacterDataModel } from './scripts/data-models/character-data-model.js';
import { SWSEVehicleDataModel } from './scripts/data-models/vehicle-data-model.js';
import { WeaponDataModel, ArmorDataModel, FeatDataModel, TalentDataModel, ForcePowerDataModel, ClassDataModel, SpeciesDataModel } from './scripts/data-models/item-data-models.js';

/* -------------------------------------------- */
/*  Core Systems                                */
/* -------------------------------------------- */

import { registerHandlebarsHelpers } from './helpers/handlebars/index.js';
import { preloadHandlebarsTemplates } from './scripts/core/load-templates.js';
import { WorldDataLoader } from './scripts/core/world-data-loader.js';

/* -------------------------------------------- */
/*  Utilities                                   */
/* -------------------------------------------- */

import { SWSENotifications } from './scripts/utils/notifications.js';
import { SWSELogger } from './scripts/utils/logger.js';
import { ThemeLoader } from './scripts/theme-loader.js';
import './scripts/utils/skill-use-filter.js';

/* -------------------------------------------- */
/*  Configuration                               */
/* -------------------------------------------- */

import { SWSE_SKILLS, getSkillConfig, getSkillsArray } from './scripts/config/skills.js';

/* -------------------------------------------- */
/*  Components                                  */
/* -------------------------------------------- */

import { ConditionTrackComponent } from './scripts/components/condition-track.js';
import { ForceSuiteComponent } from './scripts/components/force-suite.js';

import './scripts/migration/fix-defense-schema.js';
import './scripts/migration/fix-actor-size.js';
import './scripts/migration/actor-validation-migration.js';
import './scripts/migration/item-validation-migration.js';
import './scripts/migration/populate-force-compendiums.js';

/* -------------------------------------------- */
/*  Combat Systems                              */
/* -------------------------------------------- */

import { DamageSystem } from './scripts/combat/damage-system.js';
import { SWSECombatAutomation } from './scripts/combat/combat-automation.js';
import { CombatActionsMapper } from './scripts/combat/utils/combat-actions-mapper.js';
import { SWSECombat } from './scripts/combat/systems/enhanced-combat-system.js';
import { SWSEGrappling } from './scripts/combat/systems/grappling-system.js';
import { SWSEVehicleCombat } from './scripts/combat/systems/vehicle-combat-system.js';

/* -------------------------------------------- */
/*  Force Powers                                */
/* -------------------------------------------- */

import { ForcePowerManager } from './scripts/utils/force-power-manager.js';
import { initializeForcePowerHooks } from './scripts/hooks/force-power-hooks.js';

/* -------------------------------------------- */
/*  Performance & Optimization                  */
/* -------------------------------------------- */

import { cacheManager } from './scripts/core/cache-manager.js';
import { dataPreloader } from './scripts/core/data-preloader.js';
import { errorHandler, errorCommands, logError } from './scripts/core/error-handler.js';
import { lazyLoader } from './scripts/core/lazy-loader.js';
import { perfMonitor, debounce, throttle } from './scripts/utils/performance-utils.js';

/* -------------------------------------------- */
/*  Applications                                */
/* -------------------------------------------- */

// Character Generator is initialized via its init file
import './scripts/apps/chargen-init.js';

// Store and Level Up apps
import { SWSEStore } from './scripts/apps/store.js';
import { SWSELevelUp } from './scripts/apps/swse-levelup.js';

// Upgrade System
import { SWSEUpgradeApp } from './scripts/apps/upgrade-app.js';

// Vehicle Modification System
import { VehicleModificationManager } from './scripts/apps/vehicle-modification-manager.js';
import { VehicleModificationApp } from './scripts/apps/vehicle-modification-app.js';

/* -------------------------------------------- */
/*  Drag & Drop                                 */
/* -------------------------------------------- */

import { DropHandler } from './scripts/drag-drop/drop-handler.js';

/* -------------------------------------------- */
/*  Chat                                        */
/* -------------------------------------------- */

import './scripts/chat/chat-commands.js';

/* -------------------------------------------- */
/*  Canvas UI                                   */
/* -------------------------------------------- */

import { CanvasUIManager } from './scripts/canvas-ui/canvas-ui-manager.js';

/* -------------------------------------------- */
/*  House Rules & GM Tools                      */
/* -------------------------------------------- */

import { registerHouseruleSettings } from './scripts/houserules/houserule-settings.js';
import { HouseruleMechanics } from './scripts/houserules/houserule-mechanics.js';
import { HouserulesConfig } from './scripts/houserules/houserules-config.js';
import { SWSEHomebrewManager } from './scripts/gm-tools/homebrew-manager.js';

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
      UpgradeApp: SWSEUpgradeApp
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
  // Register System Settings
  // ============================================
  
  registerSystemSettings();
  registerHouseruleSettings();
  SWSEHomebrewManager.registerSettings();
  SWSEHomebrewManager.init();

  // ============================================
  // Register Handlebars Helpers
  // ============================================
  
  // Register Handlebars helpers
  registerHandlebarsHelpers();

  // Register condition-specific helpers
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

  // Helper to extract hit die size from string like "1d10" -> "10"
  if (!Handlebars.helpers['extractHitDie']) {
    Handlebars.registerHelper('extractHitDie', function(hitDieString) {
      if (!hitDieString) return '6';
      const match = String(hitDieString).match(/\d+d(\d+)/);
      return match ? match[1] : hitDieString;
    });
  }

  // Helper to format BAB progression
  if (!Handlebars.helpers['formatBAB']) {
    Handlebars.registerHelper('formatBAB', function(babProgression) {
      const bab = Number(babProgression);
      if (bab >= 1.0) return 'High (+1/level)';
      if (bab >= 0.75) return 'Medium (+3/4)';
      return 'Low (+1/2)';
    });
  }

  // Helper to strip HTML tags from text
  if (!Handlebars.helpers['stripHTML']) {
    Handlebars.registerHelper('stripHTML', function(htmlString) {
      if (!htmlString) return '';
      // Create a temporary div to parse HTML
      const div = document.createElement('div');
      div.innerHTML = htmlString;
      return div.textContent || div.innerText || '';
    });
  }

  // ============================================
  // Preload Templates
  // ============================================
  
  await preloadHandlebarsTemplates();

  // ============================================
  // Register Handlebars Helpers
  // ============================================

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
  // Initialize Combat Automation
  // ============================================

  SWSECombatAutomation.init();

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

  // ============================================
  // Initialize Error Handler
  // ============================================

  errorHandler.initialize();

  // ============================================
  // Preload Data (Priority)
  // ============================================

  await perfMonitor.measureAsync('Data Preloading', async () => {
    await dataPreloader.preload({
      priority: ['classes', 'skills'],
      background: ['feats', 'talents', 'forcePowers', 'species'],
      verbose: true
    });
  });

  // ============================================
  // Initialize Combat Actions Mapper
  // ============================================

  await perfMonitor.measureAsync('Combat Actions Init', async () => {
    await CombatActionsMapper.init();
  });

  // ============================================
  // Initialize Vehicle Modification System
  // ============================================

  await perfMonitor.measureAsync('Vehicle Modification Init', async () => {
    await VehicleModificationManager.init();
  });

  // ============================================
  // Initialize Force Power Hooks
  // ============================================

  initializeForcePowerHooks();

  // ============================================
  // Setup Lazy Loading
  // ============================================

  lazyLoader.setupLazyImages();
  SWSELogger.log('Lazy image loading initialized');

  // ============================================
  // Load World Data (GM Only)
  // ============================================

  if (game.user.isGM) {
    await WorldDataLoader.autoLoad();

    // Show welcome message (only once)
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

  // ============================================
  // Initialize Theme System
  // ============================================

  ThemeLoader.initialize();

  // ============================================
  // Initialize Combat Automation
  // ============================================

  if (game.settings.get('swse', 'enableAutomation')) {
    setupCombatAutomation();
  }

  // ============================================
  // Initialize Enhanced Combat System
  // ============================================

  SWSECombat.init();

  // ============================================
  // Initialize Canvas UI Manager
  // ============================================

  CanvasUIManager.initialize();
  console.log("SWSE | Canvas UI Tools initialized");
  SWSELogger.log('Enhanced Combat System initialized');

  // ============================================
  // Center SWSE Windows (left of sidebar)
  // ============================================

  Hooks.on('renderApplication', (app, html, data) => {
    // Only reposition SWSE applications
    if (!app.options.classes?.includes('swse')) return;

    // Calculate position to center window left of sidebar
    const sidebar = document.getElementById('sidebar');
    const sidebarWidth = sidebar ? sidebar.offsetWidth : 300;
    const windowWidth = app.position.width;
    const windowHeight = app.position.height;

    // Calculate center position (accounting for sidebar on right)
    const availableWidth = window.innerWidth - sidebarWidth;
    const left = Math.max(0, (availableWidth - windowWidth) / 2);
    const top = Math.max(0, (window.innerHeight - windowHeight) / 2);

    // Update position
    app.setPosition({ left, top });
  });

  SWSELogger.log('Window positioning initialized');

  // ============================================
  // Initialize Grappling System
  // ============================================

  SWSEGrappling.init();
  SWSELogger.log('Grappling System initialized');

  // ============================================
  // Initialize Vehicle Combat System
  // ============================================

  SWSEVehicleCombat.init();
  SWSELogger.log('Vehicle Combat System initialized');

  // ============================================
  // Initialize Condition Recovery
  // ============================================

  if (game.settings.get('swse', 'autoConditionRecovery')) {
    setupConditionRecovery();
  }

  // ============================================
  // Initialize House Rules
  // ============================================

  HouseruleMechanics.initialize();

  // ============================================
  // Export to Window for Console Access
  // ============================================

  Object.assign(window.SWSE, {
    // Core systems
    cacheManager,
    dataPreloader,
    errorHandler,
    lazyLoader,
    perfMonitor,

    // Force Powers
    ForcePowerManager,

    // Combat
    CombatActionsMapper,
    DamageSystem,

    // Utilities
    debounce,
    throttle,
    logError,

    // Error management commands
    errors: errorCommands,

    // Access to game.swse
    ...game.swse
  });

  SWSELogger.log('Global namespace exported to window.SWSE');

  // ============================================
  // System Fully Loaded
  // ============================================

  console.log("SWSE | Enhanced System Fully Loaded");
  console.log("SWSE | Use 'window.SWSE' in console to access system components");
  console.log("SWSE | Error tracking commands: SWSE.errors.recent(), SWSE.errors.stats(), SWSE.errors.export()");
});

/* -------------------------------------------- */
/*  System Settings Registration                */
/* -------------------------------------------- */

/**
 * Register all core system settings
 */
function registerSystemSettings() {
  
  // ============================================
  // Data Management
  // ============================================
  
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

  // ============================================
  // Combat Automation
  // ============================================
  
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

  // ============================================
  // Weapon Settings
  // ============================================
  
  game.settings.register('swse', 'weaponRangeMultiplier', {
    name: 'SWSE.Settings.WeaponRangeMultiplier.Name',
    hint: 'SWSE.Settings.WeaponRangeMultiplier.Hint',
    scope: 'world',
    config: true,
    type: Number,
    default: 1.0,
    range: {
      min: 0.5,
      max: 5.0,
      step: 0.1
    }
  });

  // ============================================
  // Force Points
  // ============================================

  game.settings.register("swse", "forcePointBonus", {
    name: 'SWSE.Settings.ForcePointBonus.Name',
    hint: 'SWSE.Settings.ForcePointBonus.Hint',
    scope: "world",
    config: true,
    type: Number,
    default: 2,
    range: {
      min: 0,
      max: 10,
      step: 1
    }
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

  // ============================================
  // Store Settings
  // ============================================

  game.settings.register("swse", "storeMarkup", {
    name: 'SWSE.Settings.StoreMarkup.Name',
    hint: 'SWSE.Settings.StoreMarkup.Hint',
    scope: "world",
    config: true,
    type: Number,
    default: 0,
    range: {
      min: -100,
      max: 1000,
      step: 5
    }
  });

  game.settings.register("swse", "storeDiscount", {
    name: 'SWSE.Settings.StoreDiscount.Name',
    hint: 'SWSE.Settings.StoreDiscount.Hint',
    scope: "world",
    config: true,
    type: Number,
    default: 0,
    range: {
      min: 0,
      max: 100,
      step: 5
    }
  });

  // ============================================
  // Theme Settings
  // ============================================

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

  // ============================================
  // Developer Settings
  // ============================================

  game.settings.register("swse", "devMode", {
    name: "Developer Mode",
    hint: "Enable detailed error logging and stack traces for debugging",
    scope: "client",
    config: true,
    type: Boolean,
    default: false
  });

  // ============================================
  // Migration Tracking (Hidden)
  // ============================================

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
/*  Theme Management                            */
/* -------------------------------------------- */

/**
 * Apply the selected theme to all sheets
 * @deprecated Use ThemeLoader.applyTheme() instead
 * Kept for backwards compatibility
 */
function applyTheme(themeName) {
  console.warn('[SWSE] applyTheme() is deprecated. Use ThemeLoader.applyTheme() instead.');
  ThemeLoader.applyTheme(themeName);
}

/* -------------------------------------------- */
/*  Combat Automation Setup                     */
/* -------------------------------------------- */

/**
 * Set up combat automation hooks
 */
function setupCombatAutomation() {
  SWSELogger.log("Setting up combat automation");

  // Initialize combat tracking
  Hooks.on('createCombat', (combat, options, userId) => {
    SWSELogger.log("Combat created:", combat.name);
  });

  // Track combat rounds
  Hooks.on('combatRound', (combat, updateData, updateOptions) => {
    SWSELogger.log(`Combat Round ${combat.round}`);
  });

  // Track combat turns
  Hooks.on('combatTurn', (combat, updateData, updateOptions) => {
    const combatant = combat.combatant;
    if (combatant?.actor) {
      SWSELogger.log(`Turn: ${combatant.actor.name}`);
    }
  });
}

/**
 * Set up automatic condition recovery on combat turn
 */
function setupConditionRecovery() {
  Hooks.on('combatTurn', async (combat, updateData, updateOptions) => {
    const combatant = combat.combatant;
    if (!combatant) return;

    const actor = combatant.actor;
    if (!actor) return;

    // Check if actor is on condition track
    const conditionTrack = actor.system.conditionTrack;
    if (!conditionTrack || conditionTrack.current <= 0) return;
    if (conditionTrack.persistent) return;

    // Prompt for recovery
    const recover = await Dialog.confirm({
      title: game.i18n.localize('SWSE.Dialogs.ConditionRecovery.Title'),
      content: game.i18n.format('SWSE.Dialogs.ConditionRecovery.Content', {
        name: actor.name,
        current: conditionTrack.current
      })
    });

    if (!recover) return;

    // Make recovery check
    const endurance = actor.system.skills?.endurance;
    const bonus = endurance?.total || 0;
    const roll = await new Roll(`1d20 + ${bonus}`).evaluate({async: true});

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({actor}),
      flavor: game.i18n.localize('SWSE.Chat.Flavors.ConditionRecovery')
    });

    if (roll.total >= 10) {
      await actor.update({
        'system.conditionTrack.current': Math.max(0, conditionTrack.current - 1)
      });
      ui.notifications.info(game.i18n.format('SWSE.Notifications.Condition.RecoverySuccess', {name: actor.name}));
    } else {
      ui.notifications.warn(game.i18n.format('SWSE.Notifications.Condition.RecoveryFailed', {name: actor.name}));
    }
  });
}

/* -------------------------------------------- */
/*  Other Hooks                                 */
/* -------------------------------------------- */

/**
 * Handle item drops on actor sheets
 */
Hooks.on("dropActorSheetData", async (actor, sheet, data) => {
  if (data.type === "Item") {
    return DropHandler.handleItemDrop(actor, data);
  }
});

/**
 * Handle condition track changes
 */
Hooks.on('preUpdateActor', function(actor, changes, options, userId) {
  // If condition track changes, update penalty
  if (changes.system?.conditionTrack?.current !== undefined) {
    const penalties = [0, -1, -2, -5, -10, 0];
    const newPos = changes.system.conditionTrack.current;

    // Ensure conditionTrack object exists
    if (!changes.system.conditionTrack) {
      changes.system.conditionTrack = {};
    }

    // Update penalty
    changes.system.conditionTrack.penalty = penalties[newPos] || 0;
  }
});

/**
 * Add chat message listeners for interactive buttons
 */
Hooks.on("renderChatMessageHTML", (message, html, data) => {
    // Note: html is now an HTMLElement, wrap in $() for jQuery: $(html).find(...)

  
  // Apply damage button
  $(html).find('.apply-damage').click(async ev => {
    ev.preventDefault();
    const damage = parseInt(ev.currentTarget.dataset.damage);
    const targets = game.user.targets;

    if (targets.size === 0) {
      ui.notifications.warn(game.i18n.localize('SWSE.Notifications.Combat.NoTargets'));
      return;
    }

    for (let target of targets) {
      if (target.actor) {
        await DamageSystem.applyDamage(target.actor, damage, {
          checkThreshold: game.settings.get('swse', 'autoDamageThreshold')
        });
      }
    }
  });

  // Roll damage button
  $(html).find('.roll-damage').click(async ev => {
    ev.preventDefault();
    const itemId = ev.currentTarget.dataset.itemId;
    const actorId = message.speaker.actor;
    const actor = game.actors.get(actorId);
    const item = actor?.items.get(itemId);

    if (item && typeof actor.rollDamage === 'function') {
      await actor.rollDamage(item);
    } else {
      ui.notifications.error(game.i18n.localize('SWSE.Notifications.Damage.CannotRoll'));
    }
  });
});

/**
 * Handle hotbar drops
 */
Hooks.on("hotbarDrop", (bar, data, slot) => {
  if (data.type === "Item") {
    createItemMacro(data, slot);
    return false;
  }
});

/**
 * Create a macro from an item drop
 */
async function createItemMacro(data, slot) {
  if (!data.uuid) return;
  
  const item = await fromUuid(data.uuid);
  if (!item) return;

  // Create the macro command
  const command = `
    const item = await fromUuid("${data.uuid}");
    if (item) {
      if (item.actor) {
        item.actor.useItem(item);
      } else {
        ui.notifications.warn("This item is not owned by an actor.");
      }
    }
  `;

  let macro = game.macros.find(m => 
    (m.name === item.name) && (m.command === command)
  );

  if (!macro) {
    macro = await Macro.create({
      name: item.name,
      type: "script",
      img: item.img,
      command: command,
      flags: { "swse.itemMacro": true }
    });
  }

  game.user.assignHotbarMacro(macro, slot);
}

/* -------------------------------------------- */
/*  Utility Functions                           */
/* -------------------------------------------- */

/**
 * Enhance validation error logging for better debugging
 */
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

          // Show full data for inspection
          console.group(`Data Object:`);
          console.dir(data, {depth: 3});
          console.groupEnd();

          // Show detailed validation failures
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

          // Show error message
          if (err.message) {
            console.error(`Error Message:`, err.message);
          }

          // Show stack trace in development mode
          if (game.settings?.get('swse', 'devMode')) {
            console.group(`Stack Trace:`);
            console.error(err.stack);
            console.groupEnd();
          }

          console.groupEnd();

          // Show user-friendly notification
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
/*  NOTE: Global exports moved to ready hook    */
/* -------------------------------------------- */
// All global exports are now properly initialized in the 'ready' hook
// at lines 490-517 to ensure window.SWSE exists before assignment.
