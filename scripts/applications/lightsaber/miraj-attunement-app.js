/**
 * Miraj Attunement Dialog
 *
 * Holographic AI guide for lightsaber attunement
 * Displayed immediately after successful construction
 *
 * Orchestration layer:
 * - UI renders decision point
 * - Routes to WeaponsEngine for attunement
 * - No cross-engine calls
 * - No duplicate eligibility checks
 */

import { BaseSWSEAppV2 } from "/systems/foundryvtt-swse/scripts/apps/base/base-swse-appv2.js";
import { WeaponsEngine } from "/systems/foundryvtt-swse/scripts/engine/combat/weapons-engine.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/core/logger.js";

export class MirajAttunementApp extends BaseSWSEAppV2 {
  constructor(actor, weapon, options = {}) {
    super(options);
    this.actor = actor;
    this.weapon = weapon;
  }

  static DEFAULT_OPTIONS = foundry.utils.mergeObject(foundry.utils.deepClone(super.DEFAULT_OPTIONS ?? {}), {
    id: "miraj-attunement",
    classes: ["swse", "miraj-attunement", "swse-theme-holo"],
    window: {
      icon: "fas fa-jedi",
      title: "⚡ Miraj — The Force Resonates",
      resizable: false,
      minimizable: false,
      draggable: true
    },
    position: {
      width: 480,
      height: "auto"
    }
  });

  static PARTS = {
    form: {
      template: "systems/foundryvtt-swse/templates/applications/lightsaber/miraj-attunement.hbs"
    }
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    return {
      ...context,
      actor: this.actor,
      weapon: this.weapon,
      weaponName: this.weapon.name,
      hasForcePoint: (this.actor.system?.resources?.forcePoints?.value ?? 0) >= 1,
      bladeColor: this.weapon.flags?.swse?.bladeColor || "blue"
    };
  }

  _onRender(context, options) {
    super._onRender(context, options);

    const root = this.element;
    if (!root) return;

    // Attune button
    root.querySelector(".attune-yes")?.addEventListener("click", (e) => {
      e.preventDefault();
      this.#onAttuneYes();
    });

    // Decline button
    root.querySelector(".attune-no")?.addEventListener("click", (e) => {
      e.preventDefault();
      this.#onAttuneNo();
    });
  }

  async #onAttuneYes() {
    try {
      // Route to WeaponsEngine (pure attunement logic)
      const result = await WeaponsEngine.attuneLightsaber(this.actor, this.weapon);

      if (!result.success) {
        ui.notifications.warn(`Attunement failed: ${result.reason}`);
        return;
      }

      // Success — close and celebrate
      ui.notifications.info("✨ The Force binds you to your lightsaber.");
      this.close();
    } catch (err) {
      SWSELogger.error("Attunement failed:", err);
      ui.notifications.error("Unexpected error during attunement.");
    }
  }

  #onAttuneNo() {
    // Decline attunement — close dialog
    this.close();
    ui.notifications.info("The blade awaits your decision. You can attune later from your sheet.");
  }
}
