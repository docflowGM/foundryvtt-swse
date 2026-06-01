// FILE: scripts/swse-droid.js
// @deprecated Droid actors no longer use a droid-specific sheet shell. The
// default droid actor sheet is SWSEV2CharacterSheet registered for actor type
// "droid" in index.js. This legacy AppV1 shim is intentionally not registered.
// ============================================
import { SWSEActorSheet } from "./swse-actor.js";

export class SWSEDroidSheet extends SWSEActorSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["swse", "sheet", "droid", "swse-v2-sheet", "holo-theme"],
      template: "systems/foundryvtt-swse/templates/actors/character/v2/character-sheet.hbs"
    });
  }

  getData() {
    const data = super.getData();
    data.labels.sheetTitle = game.i18n.localize("SWSE.SheetLabel.droid") || "Droid";
    data.inventoryItems = data.inventoryItems.filter(i => i.type !== 'force-power');
    data.forcePowers = [];
    data.hasForce = false;
    data.system.forcePoints = data.system.forcePoints || { value: 0, max: 0 };
    data.system.freeForcePowers = data.system.freeForcePowers || { current: 0, max: 0 };
    return data;
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.find(".add-force-power, .roll-force-power, .refresh-forcepowers, .reload-forcepower").remove();
  }
}
