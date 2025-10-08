// ============================================
// FILE: scripts/swse-vehicle.js
// ============================================
import { SWSEActorSheet } from "./swse-actor.js";

export class SWSEVehicleSheet extends SWSEActorSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["swse", "sheet", "vehicle"],
      template: "systems/swse/templates/actor/vehicle-sheet.hbs"
    });
  }

  getData() {
    const data = super.getData();
    data.crew = this.actor.system.crew || {};
    data.weapons = this.actor