/**
 * Star Wars Saga Edition - FoundryVTT System
 * Master Entry Point for SWSE System Initialization
 *
 * Handles:
 *  - Core system registration and lifecycle hooks
 *  - Modular imports (actors, items, droids, vehicles)
 *  - Template and data preloading
 *  - Dice utilities and store UI
 */

// -----------------------------
// Core Imports
// -----------------------------
import * as System from "./swse.js";
import * as Init from "./scripts/init.js";
import * as SWSEData from "./scripts/swse-data.js";

// -----------------------------
// Actor & Entity Scripts
// -----------------------------
import * as Actor from "./scripts/swse-actor.js";
import * as Droid from "./scripts/swse-droid.js";
import * as Vehicle from "./scripts/swse-vehicle.js";

// -----------------------------
// Item Logic
// -----------------------------
import * as Item from "./scripts/swse-item.js";

// -----------------------------
// Character Creation & Leveling
// -----------------------------
import * as LevelUp from "./scripts/swse-levelup.js";
import * as Races from "./scripts/races.js";
import * as CharGen from "./scripts/chargen.js";

// -----------------------------
// Dice Utilities
// -----------------------------
import * as DiceUtils from "./scripts/dice-utils.js";
import * as DiceRoller from "./scripts/diceroller.js";

// -----------------------------
// Template & Data Loading
// -----------------------------
import * as LoadTemplates from "./scripts/load-templates.js";
import * as ImportData from "./scripts/import-data.js";

// -----------------------------
// Rolls Subsystem
// -----------------------------
import * as Rolls from "./rolls/index.js";

// -----------------------------
// Store (GM/Player shop system)
// -----------------------------
import { SWSEStore } from "./store/store.js";

// -----------------------------
// Initialization Hook
// -----------------------------
Hooks.once("init", async () => {
  console.log("SWSE | Initializing Star Wars Saga Edition system...");

  // System registration
  if (System?.registerSystem) System.registerSystem();

  // Template loading
  if (typeof LoadTemplates.preloadHandlebarsTemplates === "function") {
    await LoadTemplates.preloadHandlebarsTemplates();
  }

  // Import base data sets
  if (typeof ImportData.loadDefaultData === "function") {
    await ImportData.loadDefaultData();
  }

  // Optional: Register custom actor and item classes
  if (Actor?.SWSEActor) CONFIG.Actor.documentClass = Actor.SWSEActor;
  if (Item?.SWSEItem) CONFIG.Item.documentClass = Item.SWSEItem;

  console.log("SWSE | System initialization complete.");
});

// -----------------------------
// Ready Hook (post-init setup)
// -----------------------------
Hooks.once("ready", () => {
  console.log("SWSE | SWSE system ready. May the Force be with you.");

  // Initialize game namespace
  game.swse = game.swse || {};

  // Attach store access for GMs and players
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
