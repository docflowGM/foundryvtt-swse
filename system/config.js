/**
 * SWSE System Configuration
 * Registers actor types, item types, and sheet classes.
 */

import { SWSEActorSheet } from "./swse-actor.js";
import { SWSEDroidSheet } from "./swse-droid.js";
import { SWSEVehicleSheet } from "./swse-vehicle.js";
import { SWSEItemSheet } from "./swse-item.js";

export const SWSE = {};

SWSE.actorTypes = ["character", "droid", "vehicle"];
SWSE.itemTypes = ["armor", "class", "equipment", "feat", "forcepower", "talent", "weapon"];

SWSE.CONFIG = {
  actorTypes: SWSE.actorTypes,
  itemTypes: SWSE.itemTypes
};

SWSE.registerSheets = function () {
  Actors.unregisterSheet("core", ActorSheet);
  Items.unregisterSheet("core", ItemSheet);

  Actors.registerSheet("swse", SWSEActorSheet, {
    types: ["character"],
    label: "SWSE Character Sheet",
    makeDefault: true
  });

  Actors.registerSheet("swse", SWSEDroidSheet, {
    types: ["droid"],
    label: "SWSE Droid Sheet"
  });

  Actors.registerSheet("swse", SWSEVehicleSheet, {
    types: ["vehicle"],
    label: "SWSE Vehicle Sheet"
  });

  Items.registerSheet("swse", SWSEItemSheet, {
    types: SWSE.itemTypes,
    label: "SWSE Item Sheet",
    makeDefault: true
  });
};
