// ============================================
// FILE: index.js
// Star Wars Saga Edition (SWSE) - FoundryVTT System
// Compatible with Foundry v13+
// ============================================

import { registerHandlebarsHelpers } from "./helpers/handlebars-helpers.js";
import { SWSE } from "./config.js";
import { SWSEActor, SWSEActorSheet } from "./scripts/swse-actor.js";
import { SWSEDroidSheet } from "./scripts/swse-droid.js";
import { SWSEVehicleSheet } from "./scripts/swse-vehicle.js";
import { SWSEItemSheet } from "./scripts/swse-item.js";
import { preloadHandlebarsTemplates } from "./scripts/load-templates.js";
import { SWSEStore } from "./store/store.js";
import * as SWSEData from "./scripts/swse-data.js";
import { WorldDataLoader } from "./scripts/world-data-loader.js";
import "./scripts/chargen/chargen-init.js";

// ============================================
// INIT HOOK
// ============================================
Hooks.once("init", async () => {
  console.log("SWSE | Initializing Star Wars Saga Edition system...");

  // -------------------------------
  // Global Config & Namespace
  // -------------------------------
  CONFIG.SWSE = SWSE;
  CONFIG.Actor.documentClass = SWSEActor;

  game.swse = {
    data: SWSEData,
    SWSE: SWSE
  };

  // -------------------------------
  // Sheet Registration
  // -------------------------------
  registerSWSESheets();

  // -------------------------------
  // Register Handlebars Helpers
  // -------------------------------
  registerHandlebarsHelpers();

  // -------------------------------
  // Register Settings
  // -------------------------------
  registerSettings();

  // -------------------------------
  // Preload Templates
  // -------------------------------
  await preloadHandlebarsTemplates();

  console.log("SWSE | System initialization complete.");
});

// ============================================
// READY HOOK
// ============================================
Hooks.once("ready", async () => {
  console.log("SWSE | System ready. May the Force be with you.");

  // Create shortcut to open the SWSE Store
  game.swse.openStore = () => new SWSEStore().render(true);

  // Load vehicle templates
  await loadVehicleTemplates();

  // Auto-load data on first GM run
  if (game.user.isGM) {
    await WorldDataLoader.autoLoad();
  }
});

// ============================================
// REGISTER SHEETS
// ============================================
function registerSWSESheets() {
  try {
    // Check if we're on Foundry v13+ (has DocumentSheetConfig)
    const hasV13API = typeof DocumentSheetConfig !== "undefined";

    if (hasV13API) {
      // ============================================
      // Foundry v13+ API (DocumentSheetConfig)
      // ============================================
      console.log("SWSE | Using Foundry v13+ sheet registration");

      // Unregister core sheets
      DocumentSheetConfig.unregisterSheet(Actor, "core", ActorSheet);
      DocumentSheetConfig.unregisterSheet(Item, "core", ItemSheet);

      // Register Actor Sheets
      DocumentSheetConfig.registerSheet(Actor, "swse", SWSEActorSheet, {
        types: ["character", "npc"],
        label: "SWSE Character/NPC Sheet",
        makeDefault: true
      });

      DocumentSheetConfig.registerSheet(Actor, "swse", SWSEDroidSheet, {
        types: ["droid"],
        label: "SWSE Droid Sheet",
        makeDefault: true
      });

      DocumentSheetConfig.registerSheet(Actor, "swse", SWSEVehicleSheet, {
        types: ["vehicle"],
        label: "SWSE Vehicle Sheet",
        makeDefault: true
      });

      // Register Item Sheet
      DocumentSheetConfig.registerSheet(Item, "swse", SWSEItemSheet, {
        types: SWSE.itemTypes,
        label: "SWSE Item Sheet",
        makeDefault: true
      });

    } else {
      // ============================================
      // Foundry v11-v12 Legacy API
      // ============================================
      console.log("SWSE | Using legacy sheet registration");

      Actors.unregisterSheet("core", ActorSheet);
      Items.unregisterSheet("core", ItemSheet);

      Actors.registerSheet("swse", SWSEActorSheet, {
        types: ["character", "npc"],
        label: "SWSE Character/NPC Sheet",
        makeDefault: true
      });

      Actors.registerSheet("swse", SWSEDroidSheet, {
        types: ["droid"],
        label: "SWSE Droid Sheet",
        makeDefault: true
      });

      Actors.registerSheet("swse", SWSEVehicleSheet, {
        types: ["vehicle"],
        label: "SWSE Vehicle Sheet",
        makeDefault: true
      });

      Items.registerSheet("swse", SWSEItemSheet, {
        types: SWSE.itemTypes,
        label: "SWSE Item Sheet",
        makeDefault: true
      });
    }

    console.log("SWSE | Sheet registration complete");
  } catch (err) {
    console.error("SWSE | Sheet registration failed:", err);
  }
}

// ============================================
// REGISTER SETTINGS
// ============================================
function registerSettings() {
  game.settings.register("swse", "forcePointBonus", {
    name: "Force Point Bonus",
    hint: "Extra modifier applied when spending a Force Point on a power.",
    scope: "world",
    config: true,
    type: Number,
    default: 2
  });

  game.settings.register("swse", "storeSettings", {
    name: "Store Price Settings",
    scope: "world",
    config: false,
    type: Object,
    default: { buyMultiplier: 1.0, sellMultiplier: 0.5 }
  });

  game.settings.register("swse", "storeMarkup", {
    name: "Store Markup %",
    scope: "world",
    config: false,
    type: Number,
    default: 0
  });

  game.settings.register("swse", "storeDiscount", {
    name: "Store Discount %",
    scope: "world",
    config: false,
    type: Number,
    default: 0
  });

  game.settings.register("swse", "dataLoaded", {
    scope: "world",
    config: false,
    type: Boolean,
    default: false
  });
}

// ============================================
// VEHICLE TEMPLATE LOADER
// ============================================
async function loadVehicleTemplates() {
  try {
    const response = await fetch("systems/swse/data/vehicles.json");
    if (response.ok) {
      game.swseVehicles = { templates: await response.json() };
      console.log(`SWSE | Loaded ${game.swseVehicles.templates.length} vehicle templates.`);
    } else {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch (err) {
    console.warn("SWSE | Could not load vehicle templates:", err);
    game.swseVehicles = { templates: [] };
  }
}
