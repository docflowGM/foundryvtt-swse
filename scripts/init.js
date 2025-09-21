// systems/swse/scripts/init.js

//──────────────────────────────────────────────────────────────────────────────
// Imports
//──────────────────────────────────────────────────────────────────────────────
import { SWSEActor } from "./swse-actor.js";
import { SWSEActorSheet } from "./swse-actor.js";
import { SWSEDroidSheet } from "./swse-droid.js";
import { SWSEVehicleSheet } from "./swse-vehicle.js";
import { SWSEItemSheet } from "./swse-item.js"; // optional if you have a custom item sheet
import { preloadHandlebarsTemplates } from "./preload.js"; // loads all HBS partials

//──────────────────────────────────────────────────────────────────────────────
// INIT HOOK
//──────────────────────────────────────────────────────────────────────────────
Hooks.once("init", () => {
  console.log("SWSE | Initializing Star Wars Saga Edition (v1.0.0)");

  // Expose a global for ease of access
  game.swse = {
    SWSEActor,
    SWSEActorSheet,
    SWSEDroidSheet,
    SWSEVehicleSheet,
    SWSEItemSheet
  };

  // Register custom Actor document class
  CONFIG.Actor.documentClass = SWSEActor;

  // Unregister the core sheet (optional)
  Actors.unregisterSheet("core", ActorSheet);

  //── Actor Sheets ───────────────────────────────────────────────────────────
  Actors.registerSheet("swse", SWSEActorSheet, {
    types: ["character"],
    makeDefault: true,
    label: "SWSE | Character Sheet"
  });

  Actors.registerSheet("swse", SWSEDroidSheet, {
    types: ["character"],     // still type "character"
    makeDefault: false,
    label: "SWSE | Droid Sheet"
  });

  Actors.registerSheet("swse", SWSEVehicleSheet, {
    types: ["vehicle"],
    makeDefault: true,
    label: "SWSE | Vehicle Sheet"
  });

  //── Item Sheets ─────────────────────────────────────────────────────────────
  if (SWSEItemSheet) {
    Items.unregisterSheet("core", ItemSheet);
    Items.registerSheet("swse", SWSEItemSheet, {
      makeDefault: true,
      label: "SWSE | Item Sheet"
    });
  }

  //── System Settings ─────────────────────────────────────────────────────────
  game.settings.register("swse", "chargeBonus", {
    name: "Charge Action Bonus",
    hint: "Extra modifier applied when the 'charge' action is selected.",
    scope: "world",
    config: true,
    type: Number,
    default: 2
  });
  game.settings.register("swse", "blockBonus", {
    name: "Block Action Bonus",
    hint: "Extra modifier applied when selecting 'block'.",
    scope: "world",
    config: true,
    type: Number,
    default: 1
  });
  game.settings.register("swse", "deflectBonus", {
    name: "Deflect Action Bonus",
    hint: "Extra modifier applied when selecting 'deflect'.",
    scope: "world",
    config: true,
    type: Number,
    default: 0
  });

  //── Handlebars Helpers ──────────────────────────────────────────────────────
  Handlebars.registerHelper("ifEq", (a, b, opts) => a === b ? opts.fn(this) : opts.inverse(this));

  // Preload all templates (actor sheets + partials + items)
  preloadHandlebarsTemplates();
});

//──────────────────────────────────────────────────────────────────────────────
// SETUP HOOK
//──────────────────────────────────────────────────────────────────────────────
Hooks.once("setup", () => {
  console.log("SWSE | Running setup tasks");
  // Place to hook into other modules, initialize world-level data, etc.
});

//──────────────────────────────────────────────────────────────────────────────
// READY HOOK & MIGRATIONS
//──────────────────────────────────────────────────────────────────────────────
Hooks.once("ready", async () => {
  console.log("SWSE | System ready");

  // Example migration scaffold
  const current   = game.settings.get("swse", "systemVersion");
  const latest    = game.system.version;
  if (current !== latest) {
    console.warn(`SWSE | Running migrations: ${current} → ${latest}`);
    // await migrateWorld(current, latest);
    await game.settings.set("swse", "systemVersion", latest);
  }
});
