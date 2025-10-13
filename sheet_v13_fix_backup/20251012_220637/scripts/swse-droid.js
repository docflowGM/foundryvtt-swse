// FILE: scripts/swse-droid.js
// ============================================
import { SWSEActorSheet } from "./swse-actor.js";

export class SWSEDroidSheet extends SWSEActorSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["swse", "sheet", "droid"],
      template: "systems/swse/templates/actor/droid-sheet.hbs"
    });
  }

  getData() {
    const data = super.getData();
    data.items = data.items.filter(i => i.type !== "forcepower");
    data.labels.sheetTitle = game.i18n.localize("SWSE.SheetLabel.droid") || "Droid";
    delete data.system.forcePoints;
    delete data.system.freeForcePowers;
    return data;
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.find(".add-forcepower, .roll-forcepower, .refresh-forcepowers, .reload-forcepower").remove();
  }
}