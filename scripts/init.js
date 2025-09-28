// systems/swse/scripts/init.js

import { SWSEActor, SWSEActorSheet }    from "./swse-actor.js";
import { SWSEDroidSheet }               from "./swse-droid.js";
import { SWSEVehicleSheet }             from "./swse-vehicle.js";
import { SWSEItemSheet }                from "./swse-item.js";
import "./swse-force.js";
import "./swse-levelup.js";
import "./load-templates.js"; // ✅ include vehicle template loader

Hooks.once("init", () => {
  console.log("SWSE | Initializing Star Wars Saga Edition (SWSE)");

  // -----------------------------
  // CONFIGURATION
  // -----------------------------
  CONFIG.SWSE = {
    templates: {
      actor: {
        character: "systems/swse/templates/actor/character-sheet.hbs",
        droid:     "systems/swse/templates/actor/droid-sheet.hbs",
        vehicle:   "systems/swse/templates/actor/vehicle-sheet.hbs"
      },
      item: "systems/swse/templates/item/item-sheet.hbs"
    }
  };

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
  CONFIG.Actor.documentClass = SWSEActor;

  // Unregister default sheets
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

  // -----------------------------
  // HANDLEBARS HELPERS
  // -----------------------------
  Handlebars.registerHelper("getCrewName", id => {
    const actor = game.actors.get(id) || canvas.tokens.get(id)?.actor;
    return actor ? actor.name : "";
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

  // ✅ Debugging aid: confirm templates loaded
  if (game.swseVehicles?.templates?.length) {
    console.log(`SWSE | Loaded ${game.swseVehicles.templates.length} vehicle templates.`);
  }
});
Hooks.once("ready", () => {
  // Patch Actor.create to log extra validation detail
  const _create = Actor.create;
  Actor.create = async function(data, options) {
    try {
      return await _create.call(this, data, options);
    } catch (err) {
      if (err.name === "DataModelValidationError") {
        console.error("Actor creation failed with validation errors:", err);
        console.error("Raw data passed:", data);
        // If the failure includes field-level issues:
        if (err.failures) {
          for (let f of err.failures) {
            console.error(`Field "${f.path}" failed:`, f.failure);
          }
        }
      }
      throw err;
    }
  };
});
