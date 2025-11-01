/**
 * Star Wars Saga Edition System for Foundry VTT
 */

// Import Actor classes
import { SWSEActorBase } from './scripts/actors/base/swse-actor-base.js';

// Import Sheet classes
import { SWSECharacterSheet } from './scripts/actors/character/swse-character-sheet.js';
import { SWSEDroidSheet } from './scripts/actors/droid/swse-droid.js';
import { SWSENPCSheet } from './scripts/actors/npc/swse-npc.js';
import { SWSEVehicleSheet } from './scripts/actors/vehicle/swse-vehicle.js';

// Import Data Models
import { SWSECharacterDataModel } from './scripts/data-models/character-data-model.js';
import { SWSEVehicleDataModel } from './scripts/data-models/vehicle-data-model.js';

// Import core functionality
import { registerHandlebarsHelpers } from './helpers/handlebars/index.js';
import { preloadHandlebarsTemplates } from './scripts/core/load-templates.js';
import { registerSystemSettings } from './scripts/core/settings.js';

// Import enhancements
import { SWSEDropHandler } from './scripts/drag-drop/drop-handler.js';
import { SWSECombatIntegration } from './scripts/combat/combat-integration.js';
import { registerMacroFunctions } from './scripts/macros/macro-functions.js';
import { registerChatCommands } from './scripts/chat/chat-commands.js';
import { registerKeybindings } from './scripts/core/keybindings.js';

Hooks.once("init", async function() {
  console.log("SWSE | Initializing Star Wars Saga Edition system...");
  
  // Create global namespace
  game.swse = {
    config: {},
    SWSEActorBase,
    utils: {}
  };
  
  // Set base Actor class
  CONFIG.Actor.documentClass = SWSEActorBase;
  
  // Register DataModels
  CONFIG.Actor.systemDataModels = {
    character: SWSECharacterDataModel,
    npc: SWSECharacterDataModel,
    droid: SWSECharacterDataModel,
    vehicle: SWSEVehicleDataModel
  };
  
  // Unregister default sheets
  Actors.unregisterSheet("core", ActorSheet);
  
  // Register SWSE sheets
  Actors.registerSheet("swse", SWSECharacterSheet, {
    types: ["character"],
    makeDefault: true,
    label: "SWSE Character Sheet"
  });
  
  Actors.registerSheet("swse", SWSENPCSheet, {
    types: ["npc"],
    makeDefault: true,
    label: "SWSE NPC Sheet"
  });
  
  Actors.registerSheet("swse", SWSEDroidSheet, {
    types: ["droid"],
    makeDefault: true,
    label: "SWSE Droid Sheet"
  });
  
  Actors.registerSheet("swse", SWSEVehicleSheet, {
    types: ["vehicle"],
    makeDefault: true,
    label: "SWSE Vehicle Sheet"
  });
  
  // Register helpers
  registerHandlebarsHelpers();
  
  // Register settings
  registerSystemSettings();
  
  // Preload templates
  await preloadHandlebarsTemplates();
  
  // Register keybindings
  registerKeybindings();
  
  console.log("SWSE | System initialization complete.");
});

Hooks.once("ready", async function() {
  console.log("SWSE | System ready.");
  
  // Initialize combat integration
  SWSECombatIntegration.init();
  
  // Register macro functions
  registerMacroFunctions();
  
  // Register chat commands
  registerChatCommands();
  
  console.log("SWSE | May the Force be with you.");
});

Hooks.on("dropActorSheetData", async (actor, sheet, data) => {
  return SWSEDropHandler.handleDrop(actor, data);
});

Hooks.on("hotbarDrop", async (bar, data, slot) => {
  if (data.type === "skill") {
    return createSkillMacro(data, slot);
  }
  return true;
});

async function createSkillMacro(data, slot) {
  const actor = game.actors.get(data.actorId);
  if (!actor) return;
  
  const macroData = {
    name: `${actor.name}: ${data.skillLabel}`,
    type: "script",
    img: "icons/svg/d20-grey.svg",
    command: `game.swse.rollSkill("${data.actorId}", "${data.skillKey}");`,
    flags: { "swse.skillMacro": true }
  };
  
  const macro = await Macro.create(macroData);
  game.user.assignHotbarMacro(macro, slot);
}
