// systems/swse/scripts/init.js

import { SWSEActor, SWSEActorSheet }    from "./swse-actor.js";
import { SWSEDroidSheet }               from "./swse-droid.js";
import { SWSEVehicleSheet }             from "./swse-vehicle.js";
import { SWSEItemSheet }                from "./swse-item.js";
import "./swse-force.js";
import "./swse-levelup.js";

Hooks.once("init", () => {
  console.log("SWSE | Initializing Star Wars Saga Edition (SWSE)");

  /**
   * GAME SETTINGS
   */
  game.settings.register("swse", "forcePointBonus", {
    name: "Force Point Bonus",
    hint: "Extra modifier applied when spending a Force Point on a power.",
    scope: "world",
    config: true,
    type: Number,
    default: 2
  });

  /**
   * ACTOR CONFIGURATION
   */
  // Use our custom Actor class for all actor types
  CONFIG.Actor.documentClass = SWSEActor;

  // Unregister the default Foundry sheets
  Actors.unregisterSheet("core", ActorSheet);
  Items.unregisterSheet("core", ItemSheet);

  // Register SWSE Character sheet
  Actors.registerSheet("swse", SWSEActorSheet, {
    types: ["character"],
    makeDefault: true,
    label: "SWSE | Character"
  });

  // Register SWSE Droid sheet
  Actors.registerSheet("swse", SWSEDroidSheet, {
    types: ["droid"],
    makeDefault: true,
    label: "SWSE | Droid"
  });

  // Register SWSE Vehicle sheet
  Actors.registerSheet("swse", SWSEVehicleSheet, {
    types: ["vehicle"],
    makeDefault: true,
    label: "SWSE | Vehicle"
  });

  // Register SWSE Item sheet for all items
  Items.registerSheet("swse", SWSEItemSheet, {
    makeDefault: true,
    label: "SWSE | Item"
  });

  /**
   * PRELOAD HANDLEBARS TEMPLATES
   */
  loadTemplates([
    // Actor sheets
    "systems/swse/templates/actor/character-sheet.hbs",
    "systems/swse/templates/actor/droid-sheet.hbs",
    "systems/swse/templates/actor/vehicle-sheet.hbs",
    // Item sheet
    "systems/swse/templates/item/item-sheet.hbs"
  ]);
});
