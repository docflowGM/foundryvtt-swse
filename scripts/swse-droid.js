// systems/swse/scripts/swse-droid.js

import { SWSEActorSheet } from "./swse-actor.js";

export class SWSEDroidSheet extends SWSEActorSheet {
  /** Extend defaultOptions to point at the Droid‐specific template */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["swse", "sheet", "droid"],
      template: "systems/swse/templates/actor/droid-sheet.hbs"
    });
  }

  /** Remove Force‐Power data and Con-based features before rendering */
  getData() {
    const data = super.getData();

    data.labels = {
      sheetTitle: game.i18n.localize("SWSE.SheetLabel.droid")
    };

    // Strip out Force‐Power items entirely
    data.actor.items = data.actor.items.filter(i => i.type !== "forcepower");

    // Remove Force-related system fields
    delete data.system.forcePoints;
    delete data.system.freeForcePowers;

    // Droids don't use Second Wind or Constitution-based features
    if (data.system.abilities?.con?.base === 0) {
      data.system.secondWind = { uses: 0, healing: 0 };
      data.system.hp.threshold = 0; // avoids Con-based thresholds
    }

    return data;
  }

  /** After the base Sheet listeners bind, remove any Force‐Power controls */
  activateListeners(html) {
    super.activateListeners(html);

    // Remove Add/Roll/Reload/Refresh Force Power buttons if present
    html.find(
      ".add-forcepower, .roll-forcepower, .reload-forcepower, .refresh-forcepowers"
    ).remove();
  }
}
