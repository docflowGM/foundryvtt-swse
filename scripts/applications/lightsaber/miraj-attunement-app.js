/**
 * Miraj Attunement Dialog
 * Holographic AI guide for lightsaber attunement
 * Displayed immediately after successful construction
 */

import { WeaponsEngine } from "../../engine/combat/weapons-engine.js";

export class MirajAttunementApp extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: "miraj-attunement",
    classes: ["swse", "miraj-attunement"],
    window: {
      title: "Miraj — The Force Resonates",
      resizable: false,
      minimizable: false,
      draggable: true
    },
    position: {
      width: 500,
      height: 320
    }
  };

  constructor(actor, weapon) {
    super();
    this.actor = actor;
    this.weapon = weapon;
  }

  async getData() {
    return {
      weaponName: this.weapon.name,
      hasForcePoint: (this.actor.system?.resources?.forcePoints?.value ?? 0) >= 1
    };
  }

  async _preparePartContext(partId, context) {
    context = await super._preparePartContext(partId, context);
    return context;
  }

  activateListeners(html) {
    super.activateListeners(html);

    html.find(".attune-yes").on("click", async () => {
      const result = await WeaponsEngine.attuneLightsaber(this.actor, this.weapon);
      this.close();

      if (!result.success) {
        ui.notifications.warn(`Attunement failed: ${result.reason}`);
      } else {
        ui.notifications.info("The Force binds you to your lightsaber.");
      }
    });

    html.find(".attune-no").on("click", () => {
      this.close();
      ui.notifications.info("You can attune this lightsaber later from your character sheet.");
    });
  }
}
