// ============================================
// FILE: index.js
// Star Wars Saga Edition (SWSE) - FoundryVTT
// ============================================

import { SWSE } from "./scripts/core/config.js";
import { SWSEDroidSheet } from "./scripts/swse-droid.js";
import { SWSEVehicleSheet } from "./scripts/swse-vehicle.js";
import { SWSEV2VehicleSheet } from "./scripts/sheets/v2/vehicle-sheet.js";
import { SWSEV2DroidSheet } from "./scripts/sheets/v2/droid-sheet.js";
import { SWSEV2CharacterSheet } from "./scripts/sheets/v2/character-sheet.js";
import { SWSEItemSheet } from "./scripts/items/swse-item-sheet.js";
import { preloadHandlebarsTemplates } from "./scripts/load-templates.js";
import { SWSEStore } from "./store/store.js";
import * as SWSEData from "./scripts/core/swse-data.js";
import { WorldDataLoader } from "./scripts/core/world-data-loader.js";
import { SWSEV2BaseActor } from "./scripts/actors/v2/base-actor.js";
import { registerSystemSettings } from "./scripts/core/settings.js";
import { UIManager } from "./scripts/ui/ui-manager.js";
import { registerInitHooks } from "./scripts/infrastructure/hooks/init-hooks.js";
import { initializeSceneControls } from "./scripts/scene-controls/init.js";
import { initializeDiscoverySystem, onDiscoveryReady } from "./scripts/ui/discovery/index.js";

UIManager.init();

// ============================================
// INIT HOOK
// ============================================
Hooks.once("init", async () => {
  console.log("SWSE | Initializing Star Wars Saga Edition system...");

  // Foundry v13+ namespaced references
  const { Actors, Items } = foundry.documents.collections;
  const { ActorSheet, ItemSheet } = foundry.appv1.sheets;

  // -------------------------------
  // Global Config & Namespace
  // -------------------------------
  CONFIG.SWSE = SWSE;
  game.swse = {
    data: SWSEData,
    SWSE: SWSE
  };

  // -------------------------------
  // Document Classes
  // -------------------------------
  CONFIG.Actor.documentClass = SWSEV2BaseActor;

  // -------------------------------
  // Sheet Registration
  // -------------------------------
  Actors.unregisterSheet("core", ActorSheet);
  Items.unregisterSheet("core", ItemSheet);

  Actors.registerSheet("swse", SWSEV2CharacterSheet, {
    types: ["character"],
    label: "SWSE Character Sheet v2",
    makeDefault: true
  });

  Actors.registerSheet("swse", SWSEV2DroidSheet, {
    types: ["droid"],
    label: "SWSE Droid Sheet v2",
    makeDefault: true
  });

  Actors.registerSheet("swse", SWSEDroidSheet, {
    types: ["droid"],
    label: "SWSE Droid Sheet (Legacy)",
    makeDefault: false
  });

  Actors.registerSheet("swse", SWSEV2VehicleSheet, {
    types: ["vehicle"],
    label: "SWSE Vehicle Sheet v2",
    makeDefault: true
  });

  Actors.registerSheet("swse", SWSEVehicleSheet, {
    types: ["vehicle"],
    label: "SWSE Vehicle Sheet (Legacy)",
    makeDefault: false
  });

  Items.registerSheet("swse", SWSEItemSheet, {
    types: SWSE.itemTypes,
    label: "SWSE Item Sheet",
    makeDefault: true
  });

  // -------------------------------
  // Register Handlebars Helpers
  // -------------------------------
  registerHandlebarsHelpers();

  // -------------------------------
  // Register Game Settings
  // -------------------------------
  registerSettings(); // Legacy swse namespace settings retained for compatibility.
  await registerSystemSettings();

  // -------------------------------
  // Register Hook Infrastructure
  // -------------------------------
  registerInitHooks();
  initializeSceneControls();
  initializeDiscoverySystem();

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
  game.swse.openStore = actor => new SWSEStore(actor ?? null).render(true);

  onDiscoveryReady();

  // Auto-load data on first run
  if (game.user.isGM) {
    await WorldDataLoader.autoLoad();
  }
});

// ============================================
// HANDLEBARS HELPERS
// ============================================
function registerHandlebarsHelpers() {
  Handlebars.registerHelper("toUpperCase", str =>
    typeof str === "string" ? str.toUpperCase() : ""
  );

  Handlebars.registerHelper("array", function () {
    return Array.prototype.slice.call(arguments, 0, -1);
  });

  Handlebars.registerHelper("keys", obj => (obj ? Object.keys(obj) : []));

  Handlebars.registerHelper("eq", (a, b) => a === b);
  Handlebars.registerHelper("lte", (a, b) => a <= b);
  Handlebars.registerHelper("gt", (a, b) => Number(a) > Number(b));

  Handlebars.registerHelper("capitalize", str =>
    typeof str === "string" ? str.charAt(0).toUpperCase() + str.slice(1) : ""
  );

  Handlebars.registerHelper("json", context => JSON.stringify(context));

  // -------------------------------
  // Custom Helpers
  // -------------------------------
  Handlebars.registerHelper("getCrewName", id => {
    const actor = game.actors.get(id) || canvas.tokens.get(id)?.actor;
    return actor ? actor.name : "";
  });

  Handlebars.registerHelper("calculateDamageThreshold", actor => {
    if (!actor?.system) return 0;

    const fortitude = actor.system.defenses?.fortitude?.total ?? 10;
    const size = actor.system.size ?? "medium";

    const sizeMods = {
      tiny: -5,
      small: 0,
      medium: 0,
      large: 5,
      huge: 10,
      gargantuan: 20,
      colossal: 50
    };

    const sizeMod = sizeMods[size.toLowerCase()] ?? 0;

    const hasFeat = actor.items?.some(
      i => i.type === "feat" && i.name?.toLowerCase() === "improved damage threshold"
    );

    const featBonus = hasFeat ? 5 : 0;
    return fortitude + sizeMod + featBonus;
  });

  Handlebars.registerHelper("getSkillMod", (skill, abilities, level, conditionTrack) => {
    if (!skill || !abilities) return 0;

    const abilMod = abilities[skill.ability]?.mod || 0;
    const trained = skill.trained ? 5 : 0;
    const focus = skill.focus ? 1 : 0;
    const halfLevel = Math.floor((level || 1) / 2);
    const conditionPenalty = getConditionPenalty(conditionTrack);

    return abilMod + trained + focus + halfLevel + conditionPenalty;
  });

  function getConditionPenalty(track) {
    const penalties = {
      normal: 0,
      "-1": -1,
      "-2": -2,
      "-5": -5,
      "-10": -10,
      helpless: -100
    };
    return penalties[track] || 0;
  }
}

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

  // Data load flag
  game.settings.register("swse", "dataLoaded", {
    scope: "world",
    config: false,
    type: Boolean,
    default: false
  });
}

