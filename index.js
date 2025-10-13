// ============================================
// FILE: index.js
// Star Wars Saga Edition (SWSE) - FoundryVTT v13+
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
  game.swse = {
    data: SWSEData,
    SWSE: SWSE,
  };

  // -------------------------------
  // Document Classes
  // -------------------------------
  CONFIG.Actor.documentClass = SWSEActor;

  // -------------------------------
  // Sheet Registration (Foundry v13+)
  // -------------------------------
  const { DocumentSheetConfig } = foundry.applications.documents;
  const { ActorSheet } = foundry.appv1.sheets;
  const { ItemSheet } = foundry.appv1.sheets;

  // Unregister core sheets
  DocumentSheetConfig.unregisterSheet(foundry.documents.BaseActor, "core", ActorSheet);
  DocumentSheetConfig.unregisterSheet(foundry.documents.BaseItem, "core", ItemSheet);

  // Register Actor Sheets
  DocumentSheetConfig.registerSheet(foundry.documents.BaseActor, "swse", SWSEActorSheet, {
    types: ["character"],
    label: "SWSE Character Sheet",
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

  DocumentSheetConfig.registerSheet(foundry.documents.BaseActor, "swse", SWSEActorSheet, {
    types: ["npc"],
    label: "SWSE NPC Sheet",
    makeDefault: true,
  });

  // Register Item Sheets
  DocumentSheetConfig.registerSheet(foundry.documents.BaseItem, "swse", SWSEItemSheet, {
    types: SWSE.itemTypes,
    label: "SWSE Item Sheet",
    makeDefault: true,
  });

  // -------------------------------
  // Register Handlebars Helpers
  // -------------------------------
  registerHandlebarsHelpers();

  // -------------------------------
  // Register Game Settings
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

  // Setup store shortcut
  game.swse.openStore = () => new SWSEStore().render(true);

  // Load vehicle templates
  await loadVehicleTemplates();

  // Auto-load data on first run
  if (game.user.isGM) {
    await WorldDataLoader.autoLoad();
  }
});

// ============================================
// SETTINGS
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
      console.log(`SWSE | Loaded ${game.swseVehicles.templates.length} vehicle templates.`);
    }
  } catch (err) {
    console.warn("SWSE | Could not load vehicle templates:", err);
    game.swseVehicles = { templates: [] };
  }
}
