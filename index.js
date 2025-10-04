/**
 * Star Wars Saga Edition - FoundryVTT System
 * Master entry point for SWSE system initialization and module imports.
 *
 * Handles:
 *  - Core system initialization and registration
 *  - Modular imports for actors, items, droids, and vehicles
 *  - Template preloading and data management
 *  - Dice utilities and character progression systems
 */

// -----------------------------
// Core Imports
// -----------------------------
import * as System from "./swse.js";
import * as Init from "../scripts/init.js";
import * as SWSEData from "../scripts/swse-data.js";

// -----------------------------
// Actor & Entity Scripts
// -----------------------------
import * as Actor from "../scripts/swse-actor.js";
import * as Droid from "../scripts/swse-droid.js";
import * as Vehicle from "../scripts/swse-vehicle.js";

// -----------------------------
// Item Logic
// -----------------------------
import * as Item from "../scripts/swse-item.js";

// -----------------------------
// Character Creation & Leveling
// -----------------------------
import * as LevelUp from "../scripts/swse-levelup.js";
import * as Races from "../scripts/races.js";
import * as CharGen from "../scripts/chargen.js";

// -----------------------------
// Dice Utilities
// -----------------------------
import * as DiceUtils from "../scripts/dice-utils.js";
import * as DiceRoller from "../scripts/diceroller.js";

// -----------------------------
// Template & Data Loading
// -----------------------------
import * as LoadTemplates from "../scripts/load-templates.js";
import * as ImportData from "../scripts/import-data.js";

// -----------------------------
// Rolls Subsystem
// -----------------------------
import * as Rolls from "./rolls/index.js";

// -----------------------------
// System Initialization Hook
// -----------------------------
Hooks.once("init", async () => {
  console.log("SWSE | Initializing Star Wars Saga Edition system...");

  // Register system settings, custom entities, and sheet classes
  if (System?.registerSystem) System.registerSystem();

  // Load templates and data
  await LoadTemplates.preloadHandlebarsTemplates?.();
  await ImportData.loadDefaultData?.();

  console.log("SWSE | System initialization complete.");
});

// -----------------------------
// Ready Hook (post-init setup)
// -----------------------------
Hooks.once("ready", async () => {
  console.log("SWSE | System ready. May the Force be with you.");
});

// -----------------------------
// Export System Namespace
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
  Rolls
};
