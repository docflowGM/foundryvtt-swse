// systems/swse/scripts/init.js

import { SWSEActor, SWSEActorSheet } from "./swse-actor.js";
import { SWSEDroidSheet } from "./swse-droid.js";
import { SWSEVehicleSheet } from "./swse-vehicle.js";
import { SWSEItemSheet } from "./swse-item.js";
import "./swse-levelup.js";

Hooks.once("init", () => {
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
  // HANDLEBARS HELPERS
  // -----------------------------
  Handlebars.registerHelper("toUpperCase", function (str) {
    if (typeof str !== "string") return "";
    return str.toUpperCase();
  });

  Handlebars.registerHelper("array", function () {
    return Array.prototype.slice.call(arguments, 0, -1);
  });

  // Crew name resolver
  Handlebars.registerHelper("getCrewName", id => {
    const actor = game.actors.get(id) || canvas.tokens.get(id)?.actor;
    return actor ? actor.name : "";
  });
Handlebars.registerHelper("json", context => JSON.stringify(context));

  // Damage Threshold calculation
  Handlebars.registerHelper("calculateDamageThreshold", function (actor) {
    if (!actor?.system) return 0;

    // Base Fortitude Defense
    let fortitude = actor.system.defenses?.fortitude?.value ?? 10;

    // Size modifier
    const size = actor.system.traits?.size ?? "medium";
    const sizeMods = {
      tiny: -5,
      small: 0,
      medium: 0,
      large: 5,
      huge: 10,
      gargantuan: 20,
      colossal: 50
    };
    let sizeMod = sizeMods[size.toLowerCase()] ?? 0;

    // Feat bonus (Improved Damage Threshold)
    let featBonus = 0;
    if (actor.items?.some(i => i.type === "feat" && i.name?.toLowerCase() === "improved damage threshold")) {
      featBonus += 5;
    }

    return fortitude + sizeMod + featBonus;
  });

  // -----------------------------
  // GAME SETTINGS
  // -----------------------------
  game.settings.register("swse", "forcePointBonus", {
    name: "Force Point Bonus",
    hint: "Extra modifier applied when spending a Force Point on a power.",
    scope: "world",
    config: true,
    type: Number,
    default: 2
  });

  // -----------------------------
  // ACTOR CONFIGURATION
  // -----------------------------
  CONFIG.Actor.documentClasses.character = SWSEActor;

  // Unregister default sheets
  Actors.unregisterSheet("core", ActorSheet);
  Items.unregisterSheet("core", ItemSheet);

  // Register custom sheets
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

  // -----------------------------
  // PRELOAD HANDLEBARS TEMPLATES
  // -----------------------------
  loadTemplates([
    CONFIG.SWSE.templates.actor.character,
    CONFIG.SWSE.templates.actor.droid,
    CONFIG.SWSE.templates.actor.vehicle,
    CONFIG.SWSE.templates.item
  ]);
});

Hooks.once("ready", () => {
  console.log("SWSE | System ready.");

  // -----------------------------
  // DEBUGGING: Detailed validation error logging
  // -----------------------------
  const _actorValidate = Actor.prototype.validate;
  Actor.prototype.validate = function (data, options) {
    try {
      return _actorValidate.call(this, data, options);
    } catch (err) {
      if (err.name === "DataModelValidationError") {
        console.group("⚠️ Actor Validation Error");
        console.error("Actor instance:", this);
        console.error("Data being validated:", data);
        console.error("Options:", options);
        console.error("Validation Error Object:", err);
        if (err.failures) {
          console.error("Field-level Failures:");
          for (let f of err.failures) {
            console.error(`❌ Path: ${f.path}`, "Reason:", f.failure, "Value:", f.value);
          }
        }
        console.groupEnd();
      }
      throw err;
    }
  };

  const _itemValidate = Item.prototype.validate;
  Item.prototype.validate = function (data, options) {
    try {
      return _itemValidate.call(this, data, options);
    } catch (err) {
      if (err.name === "DataModelValidationError") {
        console.group("⚠️ Item Validation Error");
        console.error("Item instance:", this);
        console.error("Data being validated:", data);
        console.error("Options:", options);
        console.error("Validation Error Object:", err);
        if (err.failures) {
          console.error("Field-level Failures:");
          for (let f of err.failures) {
            console.error(`❌ Path: ${f.path}`, "Reason:", f.failure, "Value:", f.value);
          }
        }
        console.groupEnd();
      }
      throw err;
    }
  };
});
