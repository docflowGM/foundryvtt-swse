// systems/swse/scripts/init.js

import { SWSEActor, SWSEActorSheet } from "./swse-actor.js";
import { SWSEDroidSheet } from "./swse-droid.js";
import { SWSEVehicleSheet } from "./swse-vehicle.js";
import { SWSEItemSheet } from "./swse-item.js";
import "./swse-levelup.js";

/**
 * Star Wars Saga Edition (SWSE) — Initialization Script
 * Handles system bootstrapping, template preloading, and enhanced validation logging.
 */
Hooks.once("init", async () => {
  console.log("SWSE | Initializing Star Wars Saga Edition (SWSE)");

  // -----------------------------
  // CONFIGURATION
  // -----------------------------
  CONFIG.SWSE = {
    templates: {
      actor: {
        character: "systems/swse/templates/actor/character-sheet.hbs",
        droid: "systems/swse/templates/actor/droid-sheet.hbs",
        vehicle: "systems/swse/templates/actor/vehicle-sheet.hbs"
      },
      item: "systems/swse/templates/item/item-sheet.hbs"
    }
  };

  // -----------------------------
  // REGISTER ACTOR DOCUMENT CLASS
  // -----------------------------
  CONFIG.Actor.documentClass = SWSEActor;

  // -----------------------------
  // HANDLEBARS HELPERS
  // -----------------------------
  registerSWSEHandlebarsHelpers();

  // -----------------------------
  // GAME SETTINGS
  // -----------------------------
  registerSWSEGameSettings();

  // -----------------------------
  // REGISTER SHEETS
  // -----------------------------
  registerSWSENativeSheets();

  // -----------------------------
  // PRELOAD HANDLEBARS TEMPLATES
  // -----------------------------
  await preloadSWSEHandlebars();

  console.log("SWSE | Initialization complete.");
});

/**
 * Handle post-init operations once Foundry is ready.
 */
Hooks.once("ready", () => {
  console.log("SWSE | System ready.");

  enhanceValidationLogging(Actor, "Actor");
  enhanceValidationLogging(Item, "Item");
});


// ============================================================
// ===============  HELPER REGISTRATION  ======================
// ============================================================

function registerSWSEHandlebarsHelpers() {
  Handlebars.registerHelper("toUpperCase", str => (typeof str === "string" ? str.toUpperCase() : ""));
  Handlebars.registerHelper("array", function () {
    return Array.prototype.slice.call(arguments, 0, -1);
  });

  Handlebars.registerHelper("json", context => JSON.stringify(context));

  // Resolve crew name from Actor or Token ID
  Handlebars.registerHelper("getCrewName", id => {
    const actor = game.actors.get(id) || canvas.tokens.get(id)?.actor;
    return actor ? actor.name : "";
  });

  // Calculate Damage Threshold
  Handlebars.registerHelper("calculateDamageThreshold", actor => {
    if (!actor?.system) return 0;
    const fort = actor.system.defenses?.fortitude?.value ?? 10;
    const size = actor.system.traits?.size ?? "medium";

    const sizeMods = {
      tiny: -5, small: 0, medium: 0, large: 5, huge: 10, gargantuan: 20, colossal: 50
    };
    const sizeMod = sizeMods[size.toLowerCase()] ?? 0;

    const featBonus = actor.items?.some(i => i.type === "feat" && i.name?.toLowerCase() === "improved damage threshold")
      ? 5
      : 0;

    return fort + sizeMod + featBonus;
  });
}

function registerSWSEGameSettings() {
  game.settings.register("swse", "forcePointBonus", {
    name: "Force Point Bonus",
    hint: "Extra modifier applied when spending a Force Point on a power.",
    scope: "world",
    config: true,
    type: Number,
    default: 2
  });
}

function registerSWSENativeSheets() {
  // Unregister default Foundry sheets
  Actors.unregisterSheet("core", ActorSheet);
  Items.unregisterSheet("core", ItemSheet);

  // Register SWSE sheets
  Actors.registerSheet("swse", SWSEActorSheet, {
    types: ["character"],
    makeDefault: true,
    label: "SWSE | Character"
  });

  Actors.registerSheet("swse", SWSEDroidSheet, {
    types: ["droid"],
    makeDefault: true,
    label: "SWSE | Droid"
  });

  Actors.registerSheet("swse", SWSEVehicleSheet, {
    types: ["vehicle"],
    makeDefault: true,
    label: "SWSE | Vehicle"
  });

  Items.registerSheet("swse", SWSEItemSheet, {
    makeDefault: true,
    label: "SWSE | Item"
  });
}

async function preloadSWSEHandlebars() {
  await loadTemplates([
    CONFIG.SWSE.templates.actor.character,
    CONFIG.SWSE.templates.actor.droid,
    CONFIG.SWSE.templates.actor.vehicle,
    CONFIG.SWSE.templates.item
  ]);
  console.log("SWSE | Handlebars templates preloaded.");
}

// ============================================================
// ===============  VALIDATION DEBUG LOGGER  ==================
// ============================================================

function enhanceValidationLogging(klass, label) {
  if (klass.prototype._swseValidated) return; // Avoid double wrapping
  const original = klass.prototype.validate;

  klass.prototype.validate = function (data, options) {
    try {
      return original.call(this, data, options);
    } catch (err) {
      if (err.name === "DataModelValidationError") {
        console.group(`⚠️ ${label} Validation Error`);
        console.error(`${label} Instance:`, this);
        console.error("Data being validated:", data);
        if (err.failures) {
          for (let f of err.failures) {
            console.error(`❌ Path: ${f.path}`, "Reason:", f.failure, "Value:", f.value);
          }
        }
        console.groupEnd();
      }
      throw err;
    }
  };

  klass.prototype._swseValidated = true;
}


// --- Math Helper for Handlebars (Fix Vehicle Template Error) ---
if (typeof Handlebars !== "undefined") {
  Handlebars.registerHelper('math', function(lvalue, operator, rvalue) {
    lvalue = parseFloat(lvalue);
    rvalue = parseFloat(rvalue);
    return {
      '+': lvalue + rvalue,
      '-': lvalue - rvalue,
      '*': lvalue * rvalue,
      '/': lvalue / rvalue,
      '%': lvalue % rvalue
    }[operator];
  });
}
