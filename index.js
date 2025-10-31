/**
 * SWSE System - Main Entry Point
 * Star Wars Saga Edition for Foundry VTT
 * Modern V10+ Architecture
 */

import { registerHandlebarsHelpers } from './helpers/handlebars/index.js';
import { preloadHandlebarsTemplates } from './scripts/core/load-templates.js';
import { registerSystemSettings } from './scripts/core/settings.js';
import { SWSEDropHandler } from './scripts/drag-drop/drop-handler.js';

// Import actor classes (TODO: Create these files)
// import { SWSEActorBase } from './scripts/actors/base/swse-actor-base.js';
// import { SWSECharacter } from './scripts/actors/character/swse-character.js';

// Import data models (TODO: Create these files)
// import { SWSECharacterDataModel } from './scripts/data-models/character-model.js';
// import { SWSEVehicleDataModel } from './scripts/data-models/vehicle-model.js';

// Import automation (TODO: Create these files)
// import { SWSECombatAutomation } from './scripts/automation/combat-automation.js';
// import { SWSEHomebrewManager } from './scripts/gm-tools/homebrew-manager.js';

// ============================================
// INIT HOOK - System Initialization
// ============================================
Hooks.once("init", async () => {
  console.log("SWSE | Initializing Star Wars Saga Edition system...");
  
  // TODO: Set base Actor class
  // CONFIG.Actor.documentClass = SWSEActorBase;
  
  // TODO: Register DataModels
  // CONFIG.Actor.systemDataModels = {
  //   character: SWSECharacterDataModel,
  //   npc: SWSEActorDataModel,
  //   droid: SWSEActorDataModel,
  //   vehicle: SWSEVehicleDataModel
  // };
  
  // Register Handlebars helpers
  registerHandlebarsHelpers();
  
  // Register system settings
  registerSystemSettings();
  
  // Preload templates
  await preloadHandlebarsTemplates();
  
  // TODO: Register sheets
  // registerSheets();
  
  console.log("SWSE | System initialization complete.");
});

// ============================================
// READY HOOK - Post-Initialization
// ============================================
Hooks.once("ready", async () => {
  console.log("SWSE | System ready. May the Force be with you.");
  
  // TODO: Initialize combat automation
  // SWSECombatAutomation.init();
  
  // TODO: Initialize GM tools
  // if (game.user.isGM && game.settings.get('swse', 'enableHomebrewTools')) {
  //   SWSEHomebrewManager.init();
  // }
});

// ============================================
// DRAG-DROP HOOKS
// ============================================
Hooks.on("dropActorSheetData", async (actor, sheet, data) => {
  return SWSEDropHandler.handleDrop(actor, data);
});

// TODO: Add more hooks
// - Combat hooks
// - Macro hooks
// - Chat hooks
// - Keybinding hooks
