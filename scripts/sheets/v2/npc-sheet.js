// scripts/sheets/v2/npc-sheet.js
import { ActorEngine } from "../../actors/engine/actor-engine.js";

function markActiveConditionStep(html, actor) {
  const current = Number(actor?.system?.derived?.damage?.conditionStep ?? actor?.system?.conditionTrack?.current ?? 0);
  html.find('.swse-v2-condition-step').each((_, el) => {
    const s = Number(el.dataset?.step);
    if (Number.isFinite(s) && s === current) el.classList.add('active');
  });
}


/**
 * SWSEV2NpcSheet
 * v2 sheets are dumb views:
 * - Read actor.system.derived only
 * - Emit intent via Actor APIs (which route through ActorEngine)
 * - _updateObject routes through ActorEngine
 */
export class SWSEV2NpcSheet extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.sheets.ActorSheet) {
  static DEFAULT_OPTIONS = foundry.utils.mergeObject(
    super.DEFAULT_OPTIONS,
    {
      classes: ['swse', 'swse-sheet', 'swse-npc-sheet', 'v2'],
      template: "systems/foundryvtt-swse/templates/actors/npc/v2/npc-sheet.hbs",
      width: 820,
      height: 920,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "summary" }],
      scrollY: [".sheet-body"]
    }
  );

  async _prepareContext(options) {
    // Fail-fast: this sheet is for NPCs only
    if (this.document.type !== "npc") {
      throw new Error(
        `SWSEV2NpcSheet requires actor type "npc", got "${this.document.type}"`
      );
    }
    return super._prepareContext(options);
  }

  async getData(options = {}) {
    const data = await super.getData(options);
    data.system = this.actor.system;
    data.derived = this.actor.system?.derived ?? {};
    return data;
  }

  activateListeners(html) {
    super.activateListeners(html);

    // Highlight the current condition step (no template helpers required)
    markActiveConditionStep(html, this.actor);

    html.find(".swse-v2-condition-step").on("click", async (ev) => {
      ev.preventDefault();
      const step = Number(ev.currentTarget?.dataset?.step);
      if (!Number.isFinite(step)) return;
      if (typeof this.actor.setConditionTrackStep === "function") {
        await this.actor.setConditionTrackStep(step);
      } else {
        // Fallback (should not happen once v2 spine is active)
        await ActorEngine.updateActor(this.actor, { "system.conditionTrack.current": step });
      }
    });

    html.find(".swse-v2-condition-improve").on("click", async (ev) => {
      ev.preventDefault();
      if (typeof this.actor.improveConditionTrack === "function") await this.actor.improveConditionTrack();
    });

    html.find(".swse-v2-condition-worsen").on("click", async (ev) => {
      ev.preventDefault();
      if (typeof this.actor.worsenConditionTrack === "function") await this.actor.worsenConditionTrack();
    });

    html.find(".swse-v2-condition-persistent").on("change", async (ev) => {
      const flag = ev.currentTarget?.checked === true;
      if (typeof this.actor.setConditionTrackPersistent === "function") await this.actor.setConditionTrackPersistent(flag);
    });

    // Read-only item inspection: click entries open the owned Item sheet.
    html.find(".swse-v2-open-item").on("click", (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      const itemId = ev.currentTarget?.dataset?.itemId;
      if (!itemId) return;
      const item = this.actor?.items?.get(itemId);
      item?.sheet?.render(true);
    });

    html.find(".swse-v2-use-action").on("click", async (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      const actionId = ev.currentTarget?.dataset?.actionId;
      if (!actionId) return;
      if (typeof this.actor.useAction === "function") {
        await this.actor.useAction(actionId);
      }
    });
  }

  async _updateObject(event, formData) {
    const expanded = foundry.utils.expandObject(formData);
    if (!expanded?.system) return;
    await ActorEngine.updateActor(this.actor, { system: expanded.system });
  }
}
