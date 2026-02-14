// scripts/sheets/v2/character-sheet.js

const { HandlebarsApplicationMixin, DocumentSheetV2 } = foundry.applications.api;

import { ActorEngine } from "../../actors/engine/actor-engine.js";
import { RenderAssertions } from "../../core/render-assertions.js";
import { initiateItemSale } from "../../apps/item-selling-system.js";
import { RollEngine } from "../../engine/roll-engine.js";
import { SWSELevelUp } from "../../apps/swse-levelup.js";
import { rollSkill } from "../../rolls/skills.js";

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
      resizable: true,
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

    /* ---------------- CONDITION STEP HANDLING ---------------- */

    for (const el of root.querySelectorAll(".swse-v2-condition-step")) {
      el.addEventListener("click", async (ev) => {
        ev.preventDefault();
        const step = Number(ev.currentTarget?.dataset?.step);
        if (!Number.isFinite(step)) return;
        if (typeof this.actor?.setConditionTrackStep === "function") {
          await this.actor?.setConditionTrackStep(step);
        } else if (this.actor) {
          await ActorEngine.updateActor(this.actor, { 'system.conditionTrack.current': step });
        }
      });
    }

    const improveBtn = root.querySelector(".swse-v2-condition-improve");
    if (improveBtn) {
      improveBtn.addEventListener("click", async (ev) => {
        ev.preventDefault();
        if (typeof this.actor?.improveConditionTrack === "function") {
          await this.actor?.improveConditionTrack();
        }
      });
    }

    const worsenBtn = root.querySelector(".swse-v2-condition-worsen");
    if (worsenBtn) {
      worsenBtn.addEventListener("click", async (ev) => {
        ev.preventDefault();
        if (typeof this.actor?.worsenConditionTrack === "function") {
          await this.actor?.worsenConditionTrack();
        }
      });
    }

    const persistentCheckbox = root.querySelector(".swse-v2-condition-persistent");
    if (persistentCheckbox) {
      persistentCheckbox.addEventListener("change", async (ev) => {
        const flag = ev.currentTarget?.checked === true;
        if (typeof this.actor?.setConditionTrackPersistent === "function") {
          await this.actor?.setConditionTrackPersistent(flag);
        }
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

    /* ---------------- PROGRESSION BUTTONS ---------------- */

    const levelUpBtn = root.querySelector('[data-action="level-up"]');
    if (levelUpBtn) {
      levelUpBtn.addEventListener("click", async (ev) => {
        ev.preventDefault();
        if (this.actor) {
          await SWSELevelUp.openEnhanced(this.actor);
        }
      });
    }

    const selectClassBtn = root.querySelector('[data-action="select-class"]');
    if (selectClassBtn) {
      selectClassBtn.addEventListener("click", async (ev) => {
        ev.preventDefault();
        if (this.actor) {
          await SWSELevelUp.openEnhanced(this.actor);
        }
      });
    }

    const selectSpeciesBtn = root.querySelector('[data-action="select-species"]');
    if (selectSpeciesBtn) {
      selectSpeciesBtn.addEventListener("click", async (ev) => {
        ev.preventDefault();
        if (this.actor) {
          await SWSELevelUp.openEnhanced(this.actor);
        }
      });
    }

    const selectBackgroundBtn = root.querySelector('[data-action="select-background"]');
    if (selectBackgroundBtn) {
      selectBackgroundBtn.addEventListener("click", async (ev) => {
        ev.preventDefault();
        if (this.actor) {
          await SWSELevelUp.openEnhanced(this.actor);
        }
      });
    }

    /* ---------------- SKILLS SYSTEM (FILTER + FAVORITE + SORT) ---------------- */

    // Skill filter input
    const skillFilterInput = root.querySelector('[data-action="filter-skills"]');
    if (skillFilterInput) {
      skillFilterInput.addEventListener("input", (ev) => {
        const query = ev.target.value.toLowerCase();
        const skillRows = root.querySelectorAll(".skill-row-container");
        skillRows.forEach(row => {
          const skillName = row.dataset.skillName?.toLowerCase() || "";
          row.style.display = skillName.includes(query) ? "" : "none";
        });
      });
    }

    // Skill favorite toggle
    for (const btn of root.querySelectorAll('[data-action="toggle-favorite"]')) {
      btn.addEventListener("click", async (ev) => {
        ev.preventDefault();
        const skill = ev.currentTarget?.dataset?.skill;
        if (skill && this.actor) {
          const path = `system.skills.${skill}.favorite`;
          const current = this.actor.system?.skills?.[skill]?.favorite;
          await this.actor.update({ [path]: !current });
        }
      });
    }

    // Skill sort
    const skillSortSelect = root.querySelector('[data-action="sort-skills"]:not([data-sort])');
    if (skillSortSelect) {
      skillSortSelect.addEventListener("change", (ev) => {
        const sortBy = ev.target.value;
        const skillRows = Array.from(root.querySelectorAll(".skill-row-container"));

        const sortedRows = skillRows.sort((a, b) => {
          let aVal, bVal;

          switch (sortBy) {
            case "name":
              aVal = (a.dataset.skillName || "").toLowerCase();
              bVal = (b.dataset.skillName || "").toLowerCase();
              return aVal.localeCompare(bVal);

            case "favorite-first":
              aVal = !!a.querySelector('[data-action="toggle-favorite"].active');
              bVal = !!b.querySelector('[data-action="toggle-favorite"].active');
              return bVal - aVal; // Favorites first

            case "trained-first":
              aVal = !!a.querySelector('.skill-col-trained input:checked');
              bVal = !!b.querySelector('.skill-col-trained input:checked');
              return bVal - aVal; // Trained first

            case "trained-last":
              aVal = !!a.querySelector('.skill-col-trained input:checked');
              bVal = !!b.querySelector('.skill-col-trained input:checked');
              return aVal - bVal; // Untrained first

            case "total-desc":
              aVal = parseInt(a.querySelector('.skill-col-total')?.textContent || "0");
              bVal = parseInt(b.querySelector('.skill-col-total')?.textContent || "0");
              return bVal - aVal;

            case "total-asc":
              aVal = parseInt(a.querySelector('.skill-col-total')?.textContent || "0");
              bVal = parseInt(b.querySelector('.skill-col-total')?.textContent || "0");
              return aVal - bVal;

            default: // default order
              return skillRows.indexOf(a) - skillRows.indexOf(b);
          }
        });

        // Reorder DOM
        const skillsList = root.querySelector(".skills-list");
        if (skillsList) {
          sortedRows.forEach(row => {
            skillsList.appendChild(row);
          });
        }
      });
    }

    /* ---------------- SKILL ROLLING (CLICK ON SKILL TOTAL) ---------------- */

    for (const el of root.querySelectorAll('.skill-col-total')) {
      el.addEventListener("click", async (ev) => {
        ev.preventDefault();
        const skillContainer = ev.currentTarget.closest(".skill-row-container");
        const skillKey = skillContainer?.dataset?.skill;
        if (skillKey && this.actor) {
          await rollSkill(this.actor, skillKey);
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
