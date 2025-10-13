// ============================================
// FILE: index.js
// Star Wars Saga Edition (SWSE) - FoundryVTT System
// Reorganized and optimized structure
// ============================================

import { registerHandlebarsHelpers } from "./scripts/helpers/handlebars-helpers.js";
import { SWSE } from "./config.js";
import { SWSEActor } from "./scripts/actors/swse-actor.js";
import { SWSEActorSheet } from "./scripts/actors/swse-actor.js";
import { SWSEDroidSheet } from "./scripts/actors/swse-droid.js";
import { SWSEVehicleSheet } from "./scripts/actors/swse-vehicle.js";
import { SWSENPCSheet } from "./scripts/actors/swse-npc.js";
import { SWSEItemSheet } from "./scripts/items/swse-item.js";
import { preloadHandlebarsTemplates } from "./scripts/core/load-templates.js";
import * as SWSEData from "./scripts/core/swse-data.js";
import { WorldDataLoader } from "./scripts/core/world-data-loader.js";
import "./scripts/apps/chargen-init.js";

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
    const hasV13API = typeof DocumentSheetConfig !== "undefined";

    if (hasV13API) {
      // Foundry v13+ API
      console.log("SWSE | Using Foundry v13+ sheet registration");

      DocumentSheetConfig.unregisterSheet(Actor, "core", ActorSheet);
      DocumentSheetConfig.unregisterSheet(Item, "core", ItemSheet);

      // Character/NPC Sheet
      DocumentSheetConfig.registerSheet(Actor, "swse", SWSEActorSheet, {
        types: ["character", "npc"],
        label: "SWSE Character/NPC Sheet",
        makeDefault: true
      });

      // Droid Sheet
      DocumentSheetConfig.registerSheet(Actor, "swse", SWSEDroidSheet, {
        types: ["droid"],
        label: "SWSE Droid Sheet",
        makeDefault: true
      });

      // Vehicle Sheet
      DocumentSheetConfig.registerSheet(Actor, "swse", SWSEVehicleSheet, {
        types: ["vehicle"],
        label: "SWSE Vehicle Sheet",
        makeDefault: true
      });

      // NPC Sheet (alternative)
      DocumentSheetConfig.registerSheet(Actor, "swse", SWSENPCSheet, {
        types: ["npc"],
        label: "SWSE NPC Sheet (Alternative)"
      });

      // Item Sheet
      DocumentSheetConfig.registerSheet(Item, "swse", SWSEItemSheet, {
        types: SWSE.itemTypes,
        label: "SWSE Item Sheet",
        makeDefault: true
      });

    } else {
      // Foundry v11-v12 Legacy API
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

      Actors.registerSheet("swse", SWSENPCSheet, {
        types: ["npc"],
        label: "SWSE NPC Sheet (Alternative)"
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

  game.settings.register("swse", "dataLoaded", {
    scope: "world",
    config: false,
    type: Boolean,
    default: false
  });
}
