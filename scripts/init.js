// systems/swse/scripts/init.js

import { SWSEActor, SWSEActorSheet }    from "./swse-actor.js";
import { SWSEDroidSheet }               from "./swse-droid.js";
import { SWSEVehicleSheet }             from "./swse-vehicle.js";
import { SWSEItemSheet }                from "./swse-item.js";

Hooks.once("init", () => {
  console.log("SWSE | Initializing Star Wars Saga Edition (SWSE)");

  // Use our custom Actor class
  CONFIG.Actor.documentClass = SWSEActor;

  // Unregister default core sheets
  Actors.unregisterSheet("core", ActorSheet);
  Items.unregisterSheet("core", ItemSheet);

  // Register Actor sheets
  Actors.registerSheet("swse", SWSEActorSheet, {
    types: ["character"],
    makeDefault: true,
    label: "SWSE | Character"
  });
  Actors.registerSheet("swse", SWSEDroidSheet, {
    types: ["character"],
    makeDefault: false,
    label: "SWSE | Droid"
  });
  Actors.registerSheet("swse", SWSEVehicleSheet, {
    types: ["vehicle"],
    makeDefault: true,
    label: "SWSE | Vehicle"
  });

  // Register Item sheet
  Items.registerSheet("swse", SWSEItemSheet, {
    makeDefault: true,
    label: "SWSE | Item"
  });

  // Preload all Handlebars templates
  loadTemplates([
    // Actor sheets
    "systems/swse/templates/actor/character-sheet.hbs",
    "systems/swse/templates/actor/droid-sheet.hbs",
    "systems/swse/templates/actor/vehicle-sheet.hbs",
    // Item sheet
    "systems/swse/templates/item/item-sheet.hbs"
  ]);
});
