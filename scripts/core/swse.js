// ============================================
// SWSE System - Main Entry Point
// Foundry VTT | Star Wars Saga Edition
// ============================================

import { SWSEActor, SWSEActorSheet } from "./actors/swse-actor.js";
import { SWSEDroidSheet } from "./actors/swse-droid.js";
import { SWSENPCSheet } from "./actors/swse-npc.js";
import { SWSEVehicleSheet } from "./actors/swse-vehicle.js";
import { SWSEItemSheet } from "./items/swse-item.js";
import { registerHandlebarsHelpers } from "./module/module/helpers/handlebars-module/module/helpers.js";
import { preloadHandlebarsTemplates } from "./core/load-templates.js";
import { WorldDataLoader } from "./core/world-data-loader.js";

/**
 * SWSE System Initialization
 */
Hooks.once("init", async function() {
  console.log("SWSE | Initializing Star Wars Saga Edition System");

  // Register custom Actor and Item classes
  CONFIG.Actor.documentClass = SWSEActor;
  
  // Unregister core sheets
  Actors.unregisterSheet("core", ActorSheet);
  Items.unregisterSheet("core", ItemSheet);

  // Register SWSE sheets
  Actors.registerSheet("swse", SWSEActorSheet, {
    types: ["character"],
    makeDefault: true,
    label: "SWSE Character Sheet"
  });

  Actors.registerSheet("swse", SWSEDroidSheet, {
    types: ["droid"],
    makeDefault: true,
    label: "SWSE Droid Sheet"
  });

  Actors.registerSheet("swse", SWSENPCSheet, {
    types: ["npc"],
    makeDefault: true,
    label: "SWSE NPC Sheet"
  });

  Actors.registerSheet("swse", SWSEVehicleSheet, {
    types: ["vehicle"],
    makeDefault: true,
    label: "SWSE Vehicle Sheet"
  });

  Items.registerSheet("swse", SWSEItemSheet, {
    makeDefault: true,
    label: "SWSE Item Sheet"
  });

  // Register Handlebars module/helpers
  registerHandlebarsHelpers();

  // Preload Handlebars templates
  await preloadHandlebarsTemplates();

  // Register game settings
  registerSystemSettings();

  console.log("SWSE | System initialization complete");
});

/**
 * System Ready Hook
 */
Hooks.once("ready", async function() {
  console.log("SWSE | System ready");

  // Auto-load world data for GM
  if (game.user.isGM) {
    await WorldDataLoader.autoLoad();
  }

  // Enhance validation logging
  enhanceValidationLogging();
});

/**
 * Register system settings
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
  game.settings.register("swse", "templates/apps/templates/apps/storeMarkup", {
    name: "Store Markup %",
    hint: "Percentage markup on templates/apps/store items",
    scope: "world",
    config: true,
    type: Number,
    default: 0
  });

  // Store discount
  game.settings.register("swse", "templates/apps/templates/apps/storeDiscount", {
    name: "Store Discount %",
    hint: "Percentage discount on templates/apps/store items",
    scope: "world",
    config: true,
    type: Number,
    default: 0
  });
}

/**
 * Enhance validation error logging
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

// Make WorldDataLoader available globally for console access
window.WorldDataLoader = WorldDataLoader;

console.log("SWSE | Main module loaded");
