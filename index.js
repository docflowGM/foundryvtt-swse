// ============================================
// FILE: index.js
// Star Wars Saga Edition (SWSE) - FoundryVTT System
// Compatible with Foundry v13.350+ and v14+
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
  console.log("🛠️ SWSE | Initializing Star Wars Saga Edition system...");

  // -------------------------------
  // Global Config & Namespace
  // -------------------------------
  CONFIG.SWSE = SWSE;
  CONFIG.Actor.documentClass = SWSEActor;

  game.swse = {
    data: SWSEData,
    SWSE,
    version: "v13.350+",
  };

  // -------------------------------
  // Sheet Registration (Dual API)
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

  console.log("✅ SWSE | System initialization complete.");
});

// ============================================
// READY HOOK
// ============================================
Hooks.once("ready", async () => {
  console.log("🚀 SWSE | System ready. May the Force be with you.");

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
// REGISTER SHEETS (Dual Compatibility)
// ============================================
function registerSWSESheets() {
  try {
    // Detect Foundry version & API structure
    const hasV14API = !!foundry.applications?.documents?.DocumentSheetConfig;

    if (hasV14API) {
      // ============================================
      // 🧩 Foundry v14+ (DocumentSheetConfig API)
      // ============================================
      console.log("SWSE | Registering sheets using Foundry v14+ API");

      const { DocumentSheetConfig } = foundry.applications.documents;
      const { ActorSheet, ItemSheet } = foundry.appv1.sheets;

      // Unregister core sheets
      DocumentSheetConfig.unregisterSheet(foundry.documents.BaseActor, "core", ActorSheet);
      DocumentSheetConfig.unregisterSheet(foundry.documents.BaseItem, "core", ItemSheet);

      // Register Actor Sheets
      DocumentSheetConfig.registerSheet(foundry.documents.BaseActor, "swse", SWSEActorSheet, {
        types: ["character", "npc"],
        label: "SWSE Character/NPC Sheet",
        makeDefault: true,
      });

      DocumentSheetConfig.registerSheet(foundry.documents.BaseActor, "swse", SWSEDroidSheet, {
        types: ["droid"],
        label: "SWSE Droid Sheet",
        makeDefault: true,
      });

      DocumentSheetConfig.registerSheet(foundry.documents.BaseActor, "swse", SWSEVehicleSheet, {
        types: ["vehicle"],
        label: "SWSE Vehicle Sheet",
        makeDefault: true,
      });

      // Register Item Sheets
      DocumentSheetConfig.registerSheet(foundry.documents.BaseItem, "swse", SWSEItemSheet, {
        types: SWSE.itemTypes,
        label: "SWSE Item Sheet",
        makeDefault: true,
      });
    } else {
      // ============================================
      // 🧱 Foundry v12–v13 Legacy API
      // ============================================
      console.log("SWSE | Registering sheets using legacy API");

      Actors.unregisterSheet("core", ActorSheet);
      Items.unregisterSheet("core", ItemSheet);

      // Register Actor Sheets
      Actors.registerSheet("swse", SWSEActorSheet, {
        types: ["character", "npc"],
        label: "SWSE Character/NPC Sheet",
        makeDefault: true,
      });

      Actors.registerSheet("swse", SWSEDroidSheet, {
        types: ["droid"],
        label: "SWSE Droid Sheet",
        makeDefault: true,
      });

      Actors.registerSheet("swse", SWSEVehicleSheet, {
        types: ["vehicle"],
        label: "SWSE Vehicle Sheet",
        makeDefault: true,
      });

      // Register Item Sheets
      Items.registerSheet("swse", SWSEItemSheet, {
        types: SWSE.itemTypes,
        label: "SWSE Item Sheet",
        makeDefault: true,
      });
    }
  } catch (err) {
    console.error("❌ SWSE | Sheet registration failed:", err);
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
    default: 2,
  });

  game.settings.register("swse", "storeSettings", {
    name: "Store Price Settings",
    scope: "world",
    config: false,
    type: Object,
    default: { buyMultiplier: 1.0, sellMultiplier: 0.5 },
  });

  game.settings.register("swse", "dataLoaded", {
    scope: "world",
    config: false,
    type: Boolean,
    default: false,
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
      console.log(`🚗 SWSE | Loaded ${game.swseVehicles.templates.length} vehicle templates.`);
    } else {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch (err) {
    console.warn("⚠️ SWSE | Could not load vehicle templates:", err);
    game.swseVehicles = { templates: [] };
  }
}
