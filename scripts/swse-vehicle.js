// scripts/swse-vehicle.js
// Legacy/default vehicle sheet kept as the safe v1 path while the v2 datapad sheet
// remains selectable but default-off.

import { SWSEActorSheet } from "./swse-actor.js";

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

export class SWSEVehicleSheet extends SWSEActorSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["swse", "sheet", "actor", "vehicle", "swse-vehicle-sheet"],
      template: "systems/foundryvtt-swse/templates/actors/vehicle/vehicle-sheet.hbs",
      width: 920,
      height: 820,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "overview" }],
      resizable: true
    });
  }

  getData() {
    const context = super.getData();
    const system = this.actor?.system ?? {};
    context.system = system;
    context.items = this.actor?.items?.map?.(item => item.toObject()) ?? [];
    context.weapons = asArray(system.weapons);
    context.crew = system.crew ?? system.crewQuality ?? "";
    context.labels = {
      ...(context.labels ?? {}),
      sheetTitle: game.i18n?.localize?.("SWSE.SheetLabel.vehicle") || "Vehicle"
    };
    return context;
  }
}
