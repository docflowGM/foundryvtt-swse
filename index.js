/**
 * Star Wars Saga Edition - FoundryVTT System
 * Master Entry Point for SWSE System Initialization
 */

import * as System from "./swse.js";
import * as Init from "./scripts/init.js";
import * as SWSEData from "./scripts/swse-data.js";

import * as Actor from "./scripts/swse-actor.js";
import * as Droid from "./scripts/swse-droid.js";
import * as Vehicle from "./scripts/swse-vehicle.js";

import * as Item from "./scripts/swse-item.js";

import * as LevelUp from "./scripts/swse-levelup.js";
import * as Races from "./scripts/races.js";
import * as CharGen from "./scripts/chargen.js";

import * as DiceUtils from "./scripts/dice-utils.js";
import * as DiceRoller from "./scripts/diceroller.js";

import * as LoadTemplates from "./scripts/load-templates.js";
import * as ImportData from "./scripts/import-data.js";

import * as Rolls from "./rolls/index.js";

import { SWSEStore } from "./store/store.js";
import { SWSE } from "./scripts/config.js"; // <—— your config file

// -----------------------------
// Initialization Hook
// -----------------------------
Hooks.once("init", async () => {
  console.log("SWSE | Initializing Star Wars Saga Edition system...");

  // Global namespaces
  CONFIG.SWSE = SWSE;
  game.swse = SWSE;

  // Register system-specific sheets and config
  if (typeof SWSE.registerSheets === "function") {
    SWSE.registerSheets();
  }

  // Optional: Register document classes
  if (Actor?.SWSEActor) CONFIG.Actor.documentClass = Actor.SWSEActor;
  if (Item?.SWSEItem) CONFIG.Item.documentClass = Item.SWSEItem;

  // Preload templates
  if (typeof LoadTemplates.preloadHandlebarsTemplates === "function") {
    await LoadTemplates.preloadHandlebarsTemplates();
  }

  // Load base data
  if (typeof ImportData.loadDefaultData === "function") {
    await ImportData.loadDefaultData();
  }

  // Run any system-level init functions
  if (System?.registerSystem) System.registerSystem();

  console.log("SWSE | System initialization complete.");
});

// -----------------------------
// Ready Hook (post-init setup)
// -----------------------------
Hooks.once("ready", () => {
  console.log("SWSE | SWSE system ready. May the Force be with you.");

  // Store setup
  game.swse.openStore = () => new SWSEStore().render(true);
  console.log("SWSE | SWSE Store ready. Use game.swse.openStore() to open the store UI.");
});

// -----------------------------
// Export Modules for External Use
// -----------------------------
export {
  System,
  Init,
  SWSEData,
  Actor,
  Droid,
  Vehicle,
  Item,
  LevelUp,
  Races,
  CharGen,
  DiceUtils,
  DiceRoller,
  LoadTemplates,
  ImportData,
  Rolls,
  SWSEStore
};
