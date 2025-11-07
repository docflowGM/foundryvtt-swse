// ============================================
// SWSE System - Main Entry Point
// Foundry VTT | Star Wars Saga Edition
// ============================================

// Actor Classes and Sheets
import { SWSEActorBase } from './scripts/actors/base/swse-actor-base.js';
import { SWSECharacterSheet } from './scripts/actors/character/swse-character-sheet.js';
import { SWSECharacterSheetEnhanced } from './scripts/actors/character/swse-character-sheet-enhanced.js';
import { SWSEDroidSheet } from './scripts/actors/droid/swse-droid.js';
import { SWSENPCSheet } from './scripts/actors/npc/swse-npc.js';
import { SWSEVehicleSheet } from './scripts/actors/vehicle/swse-vehicle.js';

// Item Sheets
import { SWSEItemSheet } from './scripts/items/swse-item-sheet.js';

// Data Models
import { SWSECharacterDataModel } from './scripts/data-models/character-data-model.js';
import { SWSEVehicleDataModel } from './scripts/data-models/vehicle-data-model.js';

// Core Systems
import { registerHandlebarsHelpers } from './helpers/handlebars/index.js';
import { preloadHandlebarsTemplates } from './scripts/core/load-templates.js';
import { SWSERoll } from './scripts/rolls/swse-roll.js';
import { SWSECombatAutomation } from './scripts/automation/combat-automation.js';
import { WorldDataLoader } from './scripts/core/world-data-loader.js';

// Components
import { ConditionTrackComponent } from './scripts/components/condition-track.js';
import { ForceSuiteComponent } from './scripts/components/force-suite.js';

// Combat Systems
import { DamageSystem } from './scripts/combat/damage-system.js';

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

  // Create namespace for global access
  game.swse = {
    SWSEActorBase,
    SWSERoll,
    DamageSystem,
    config: CONFIG.SWSE,
    components: {
      ConditionTrack: ConditionTrackComponent,
      ForceSuite: ForceSuiteComponent
    }
  };

  // Define custom Document classes
  CONFIG.Actor.documentClass = SWSEActorBase;

  // Register Data Models (Foundry V11+ uses systemDataModels)
  CONFIG.Actor.systemDataModels = {
    character: SWSECharacterDataModel,
    npc: SWSECharacterDataModel,
    droid: SWSECharacterDataModel,
    vehicle: SWSEVehicleDataModel
  };

  // Unregister core sheets
  Actors.unregisterSheet("core", ActorSheet);
  Items.unregisterSheet("core", ItemSheet);

  // Register Actor Sheets
  Actors.registerSheet("swse", SWSECharacterSheet, {
    types: ["character"],
    makeDefault: true,
    label: "SWSE.SheetLabels.Character"
  });

  // Enhanced character sheet (alternative)
  Actors.registerSheet("swse", SWSECharacterSheetEnhanced, {
    types: ["character"],
    makeDefault: false,
    label: "SWSE.SheetLabels.CharacterEnhanced"
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

  // Register Item sheets
  Items.registerSheet("swse", SWSEItemSheet, {
    types: ["weapon", "armor", "equipment", "feat", "talent", "forcepower", "class", "species"],
    makeDefault: true,
    label: "SWSE.SheetLabels.Item"
  });

  // Register system settings
  registerSystemSettings();

  // Register Handlebars helpers
  registerHandlebarsHelpers();

  // Register custom Handlebars helpers for conditions
  Handlebars.registerHelper('conditionPenalty', function(track) {
    const penalties = [0, -1, -2, -5, -10, 0];
    return penalties[track] || 0;
  });

  Handlebars.registerHelper('isHelpless', function(track) {
    return track === 5;
  });

  Handlebars.registerHelper('formatModifier', function(value) {
    const num = Number(value) || 0;
    return num >= 0 ? `+${num}` : `${num}`;
  });

  // Preload templates
  await preloadHandlebarsTemplates();

  // Configure dice (Die is a Foundry global)
  CONFIG.Dice.terms["d"] = Die;

  // Enhance validation logging
  enhanceValidationLogging();

  console.log("SWSE | System Initialized");
});

/* -------------------------------------------- */
/*  System Ready                                */
/* -------------------------------------------- */

Hooks.once("ready", async function() {
  console.log("SWSE | System Ready");

  // Auto-load world data for GM
  if (game.user.isGM) {
    await WorldDataLoader.autoLoad();

    // Show welcome message
    ui.notifications.info(`
      SWSE Enhanced System Loaded!
      • Visual Condition Track active
      • Damage Threshold automation enabled
      • Force Suite management ready
      • Check the Summary tab for your combat dashboard
    `);
  }

  // Initialize combat automation
  if (game.settings.get('swse', 'enableAutomation')) {
    SWSECombatAutomation.init();
  }

  // Set up condition recovery automation
  if (game.settings.get('swse', 'autoConditionRecovery')) {
    setupConditionRecovery();
  }
});

/* -------------------------------------------- */
/*  System Settings                             */
/* -------------------------------------------- */

/**
 * Register all system settings
 */
function registerSystemSettings() {
  // Data loaded flag
  game.settings.register("swse", "dataLoaded", {
    name: "Data Loaded",
    scope: "world",
    config: false,
    type: Boolean,
    default: false
  });

  // Welcome message shown flag
  game.settings.register('swse', 'welcomeShown', {
    scope: 'world',
    config: false,
    type: Boolean,
    default: false
  });

  // Combat automation
  game.settings.register('swse', 'enableAutomation', {
    name: 'Enable Combat Automation',
    hint: 'Automatically apply combat effects and track conditions',
    scope: 'world',
    config: true,
    type: Boolean,
    default: true
  });

  // Condition recovery
  game.settings.register('swse', 'autoConditionRecovery', {
    name: 'Automatic Condition Recovery',
    hint: 'Prompt for condition recovery at start of turn',
    scope: 'world',
    config: true,
    type: Boolean,
    default: true
  });

  // Damage threshold
  game.settings.register('swse', 'autoDamageThreshold', {
    name: 'Automatic Damage Threshold',
    hint: 'Automatically move condition track when damage exceeds threshold',
    scope: 'world',
    config: true,
    type: Boolean,
    default: true
  });

  // Force Point bonus
  game.settings.register("swse", "forcePointBonus", {
    name: "Force Point Bonus",
    hint: "Bonus applied when spending Force Points",
    scope: "world",
    config: true,
    type: Number,
    default: 2
  });

  // Store markup
  game.settings.register("swse", "storeMarkup", {
    name: "Store Markup %",
    hint: "Percentage markup on store items",
    scope: "world",
    config: true,
    type: Number,
    default: 0
  });

  // Store discount
  game.settings.register("swse", "storeDiscount", {
    name: "Store Discount %",
    hint: "Percentage discount on store items",
    scope: "world",
    config: true,
    type: Number,
    default: 0
  });
}

/* -------------------------------------------- */
/*  Combat Automation                           */
/* -------------------------------------------- */

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
    if (actor.system.conditionTrack?.current > 0 && 
        !actor.system.conditionTrack?.persistent) {

      // Prompt for recovery
      const recover = await Dialog.confirm({
        title: 'Condition Recovery',
        content: `<p>${actor.name} can attempt condition recovery.</p>
                  <p>Make a DC 10 Endurance check?</p>`
      });

      if (recover) {
        const endurance = actor.system.skills?.endurance;
        const bonus = endurance?.total || 0;
        const roll = await new Roll(`1d20 + ${bonus}`).evaluate({async: true});

        await roll.toMessage({
          speaker: ChatMessage.getSpeaker({actor}),
          flavor: 'Condition Recovery (DC 10)'
        });

        if (roll.total >= 10) {
          await actor.moveConditionTrack(-1);
          ui.notifications.info(`${actor.name} recovers!`);
        }
      }
    }
  });
}

/* -------------------------------------------- */
/*  Other Hooks                                 */
/* -------------------------------------------- */

// Handle item drops on actor sheets
Hooks.on("dropActorSheetData", async (actor, sheet, data) => {
  if (data.type === "Item") {
    return actor._onDropItem(data);
  }
});

// Handle condition track changes
Hooks.on('preUpdateActor', function(actor, changes, options, userId) {
  // If condition track changes, update penalty
  if (changes.system?.conditionTrack?.current !== undefined) {
    const penalties = [0, -1, -2, -5, -10, 0];
    const newPos = changes.system.conditionTrack.current;

    if (!changes.system.conditionTrack) {
      changes.system.conditionTrack = {};
    }

    changes.system.conditionTrack.penalty = penalties[newPos];
  }
});

// Add chat message listeners
Hooks.on("renderChatMessage", (message, html, data) => {
  // Apply damage button
  html.find('.apply-damage').click(async ev => {
    const damage = parseInt(ev.currentTarget.dataset.damage);
    const targets = game.user.targets;

    for (let target of targets) {
      await target.actor.applyDamage(damage, {checkThreshold: true});
    }
  });

  // Roll damage button
  html.find('.roll-damage').click(async ev => {
    const itemId = ev.currentTarget.dataset.itemId;
    const actor = game.actors.get(message.speaker.actor);
    const item = actor?.items.get(itemId);

    if (item) {
      await SWSERoll.rollDamage(actor, item);
    }
  });
});

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
          console.group(`⚠️ ${DocumentClass.name} Validation Error`);
          console.error(`${DocumentClass.name} Instance:`, this);
          console.error("Data being validated:", data);
          if (err.failures) {
            err.failures.forEach(f => {
              console.error(`❌ Path: ${f.path}`, "Reason:", f.failure, "Value:", f.value);
            });
          }
          console.groupEnd();
        }
        throw err;
      }
    };
  });
}

/* -------------------------------------------- */
/*  Export for Debugging                        */
/* -------------------------------------------- */

// Make system components available globally for console access
window.SWSE = {
  ConditionTrack: ConditionTrackComponent,
  ForceSuite: ForceSuiteComponent,
  Roll: SWSERoll,
  Damage: DamageSystem,
  WorldDataLoader: WorldDataLoader
};

console.log("SWSE | Enhanced system fully loaded");
