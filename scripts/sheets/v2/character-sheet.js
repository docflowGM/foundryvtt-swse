// scripts/sheets/v2/character-sheet.js

const { HandlebarsApplicationMixin, DocumentSheetV2 } = foundry.applications.api;

import { ActorEngine } from "../../actors/engine/actor-engine.js";
import { RenderAssertions } from "../../core/render-assertions.js";
import { initiateItemSale } from "../../apps/item-selling-system.js";

/* ========================================================================== */
/* SWSEV2CharacterSheet                                                       */
/* V13 DocumentSheetV2 implementation                                         */
/* ========================================================================== */

export class SWSEV2CharacterSheet extends
  HandlebarsApplicationMixin(DocumentSheetV2) {


  /* ------------------------------------------------------------------------ */
  /* PARTS                                                                    */
  /* ------------------------------------------------------------------------ */

  static PARTS = {
    ...super.PARTS,
    body: {
      template: "systems/foundryvtt-swse/templates/actors/character/v2/character-sheet.hbs"
    }
  };

  /* ------------------------------------------------------------------------ */
  /* DEFAULT OPTIONS                                                          */
  /* ------------------------------------------------------------------------ */

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["swse", "swse-app", "swse-sheet", "swse-character-sheet", "v2"],
      width: 820,
      height: 920,
      form: {
        closeOnSubmit: false,
        submitOnChange: false
      }
    });
  }

  /* ------------------------------------------------------------------------ */
  /* CONSTRUCTOR                                                              */
  /* ------------------------------------------------------------------------ */

  constructor(document, options = {}) {
    super(document, options);
  }

  /* ------------------------------------------------------------------------ */
  /* CONTEXT PREPARATION                                                      */
  /* ------------------------------------------------------------------------ */

  async _prepareContext(options) {

    const actor = this.document;

    if (actor.type !== "character") {
      throw new Error(
        `SWSEV2CharacterSheet requires actor type "character", got "${actor.type}"`
      );
    }

    RenderAssertions.assertActorValid(actor, "SWSEV2CharacterSheet");

    const baseContext = await super._prepareContext(options);

    const overrides = {
      actor,
      system: actor.system,
      derived: actor.system?.derived ?? {},
      items: actor.items.map(item => ({
        id: item.id,
        name: item.name,
        type: item.type,
        img: item.img,
        system: item.system
      })),
      editable: this.isEditable,
      user: {
        id: game.user.id,
        name: game.user.name,
        role: game.user.role
      },
      config: CONFIG.SWSE
    };

    RenderAssertions.assertContextSerializable(
      overrides,
      "SWSEV2CharacterSheet"
    );

    return { ...baseContext, ...overrides };
  }

  /* ------------------------------------------------------------------------ */
  /* POST-RENDER EVENT BINDING                                                */
  /* ------------------------------------------------------------------------ */

  async _onRender(context, options) {

    const root = this.element;
    if (!(root instanceof HTMLElement)) {
      throw new Error("CharacterSheet: element not HTMLElement");
    }

    if (root.dataset.bound === "true") return;
    root.dataset.bound = "true";

    RenderAssertions.assertDOMElements(
      root,
      [".sheet-tabs", ".sheet-body"],
      "SWSEV2CharacterSheet"
    );

    /* ---------------- TAB HANDLING ---------------- */

    for (const tabBtn of root.querySelectorAll(".sheet-tabs .item")) {
      tabBtn.addEventListener("click", (ev) => {
        const tabName = ev.currentTarget.dataset.tab;
        if (!tabName) return;

        root.querySelectorAll(".sheet-tabs .item")
          .forEach(b => b.classList.remove("active"));

        ev.currentTarget.classList.add("active");

        root.querySelectorAll(".tab")
          .forEach(t => t.classList.remove("active"));

        root.querySelector(`.tab[data-tab="${tabName}"]`)
          ?.classList.add("active");
      });
    }

    /* ---------------- ITEM OPEN ---------------- */

    for (const el of root.querySelectorAll(".swse-v2-open-item")) {
      el.addEventListener("click", (ev) => {
        ev.preventDefault();
        const itemId = ev.currentTarget?.dataset?.itemId;
        const item = this.actor?.items?.get(itemId);
        item?.sheet?.render(true);
      });
    }

    /* ---------------- ITEM SELL ---------------- */

    for (const el of root.querySelectorAll('[data-action="sell"]')) {
      el.addEventListener("click", async (ev) => {
        ev.preventDefault();
        const row = ev.currentTarget.closest(".item-row");
        const itemId = row?.dataset?.itemId;
        const item = this.actor?.items?.get(itemId);
        if (item && this.actor) {
          await initiateItemSale(item, this.actor);
        }
      });
    }

    /* ---------------- ACTION USE ---------------- */

    for (const el of root.querySelectorAll(".swse-v2-use-action")) {
      el.addEventListener("click", async (ev) => {
        ev.preventDefault();
        const actionId = ev.currentTarget?.dataset?.actionId;
        if (typeof this.actor?.useAction === "function") {
          await this.actor?.useAction(actionId);
        }
      });
    }

    RenderAssertions.assertRenderComplete(
      this,
      "SWSEV2CharacterSheet"
    );
  }

  /* ------------------------------------------------------------------------ */
  /* FORM UPDATE ROUTING                                                      */
  /* ------------------------------------------------------------------------ */

  async _updateObject(event, formData) {
    const expanded = foundry.utils.expandObject(formData);
    if (!expanded?.system) return;

    await ActorEngine.updateActor(this.actor, {
      system: expanded.system
    });
  }
}
