import SWSEFormApplicationV2 from "../base/swse-form-application-v2.js";
import { CombatEngine } from "../../engines/combat/CombatEngine.js";

export class CombatRollConfigDialog extends SWSEFormApplicationV2 {

  static DEFAULT_OPTIONS = foundry.utils.mergeObject(
    super.DEFAULT_OPTIONS,
    {
      id: "swse-combat-roll-config",
      classes: ["swse", "holo-console"],
      template: "systems/foundryvtt-swse/templates/apps/combat/combat-roll-config-dialog.hbs",
      width: 520,
      height: "auto",
      title: "Tactical Targeting Console"
    }
  );

  constructor(actor, actionData, options = {}) {
    super(options);
    this.actor = actor;
    this.actionData = actionData;
    this.optionsData = {
      range: "normal",
      cover: "none",
      concealment: "none",
      aim: false,
      force: false,
      misc: 0
    };
  }

  async getData() {
    let preview;

    if (this.actionData?.domain === "initiative") {
      preview = await CombatEngine.previewInitiative(
        this.actor,
        this.optionsData
      );
    } else {
      preview = await CombatEngine.previewAttack(
        this.actor,
        this.actionData.key,
        this.optionsData
      );
    }

    return {
      action: this.actionData,
      options: this.optionsData,
      preview
    };
  }

  _onRender(context, options) {
    super._onRender(context, options);

    const root = this.element;
    if (!root) return;

    // Change listeners (no jQuery)
    root.querySelectorAll("input, select").forEach(el => {
      el.addEventListener("change", async (event) => {
        const field = event.currentTarget.name;
        const value = event.currentTarget.type === "checkbox"
          ? event.currentTarget.checked
          : event.currentTarget.value;

        this.optionsData[field] = value;
        this.render();
      });
    });

    // Roll button
    root.querySelector(".roll-attack")?.addEventListener("click", async () => {
      if (this.actionData?.domain === "initiative") {
        await CombatEngine.rollInitiative(this.actor, this.optionsData);
      } else {
        await CombatEngine.rollAttack(
          this.actor,
          this.actionData.key,
          this.optionsData
        );
      }
      this.close();
    });
  }
}