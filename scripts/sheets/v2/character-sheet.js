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

    // Compute Dark Side max (WIS score × houserule multiplier)
    const wisScore = actor.system?.attributes?.wis?.total ?? 10;
    const darkSideMultiplier = game.settings?.get('foundryvtt-swse', 'darkSideMaxMultiplier') ?? 1;
    const darkSideMax = Math.floor(wisScore * darkSideMultiplier);
    const currentDarkSideScore = actor.system?.darkSideScore ?? 0;

    // Generate dark side spectrum segments
    const darkSideSegments = [];
    for (let i = 0; i < darkSideMax; i++) {
      const ratio = darkSideMax > 0 ? i / darkSideMax : 0;
      // Linear interpolation from blue (#4A90E2) to red (#E74C3C)
      const blueR = 74, blueG = 144, blueB = 226;
      const redR = 231, redG = 76, redB = 60;
      const r = Math.round(blueR + (redR - blueR) * ratio);
      const g = Math.round(blueG + (redG - blueG) * ratio);
      const b = Math.round(blueB + (redB - blueB) * ratio);
      const color = `rgb(${r}, ${g}, ${b})`;

      darkSideSegments.push({
        index: i,
        filled: i < currentDarkSideScore,
        color: color
      });
    }

    // Build owned actors map
    const ownedActorMap = {};
    for (const entry of actor.system.ownedActors || []) {
      const ownedActor = game.actors.get(entry.id);
      if (ownedActor) {
        ownedActorMap[entry.id] = ownedActor;
      }
    }

    // Build equipment, armor, and weapon lists
    const equipment = actor.items.filter(item => item.type === "equipment").map(item => ({
      id: item.id,
      name: item.name,
      type: item.type,
      img: item.img,
      system: item.system
    }));

    const armor = actor.items.filter(item => item.type === "armor").map(item => ({
      id: item.id,
      name: item.name,
      type: item.type,
      img: item.img,
      system: item.system
    }));

    const weapons = actor.items.filter(item => item.type === "weapon").map(item => ({
      id: item.id,
      name: item.name,
      type: item.type,
      img: item.img,
      system: item.system
    }));

    const overrides = {
      actor,
      system: actor.system,
      derived: actor.system?.derived ?? {},
      darkSideMax,
      darkSideSegments,
      items: actor.items.map(item => ({
        id: item.id,
        name: item.name,
        type: item.type,
        img: item.img,
        system: item.system
      })),
      equipment,
      armor,
      weapons,
      ownedActorMap,
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

    /* ---------------- SECOND WIND ACTIONS ---------------- */

    const swRecoverBtn = root.querySelector('[data-action="use-second-wind"]');
    if (swRecoverBtn) {
      swRecoverBtn.addEventListener("click", async (ev) => {
        ev.preventDefault();
        const uses = this.actor.system?.secondWind?.uses ?? 0;
        const healing = this.actor.system?.secondWind?.healing ?? 0;

        if (uses > 0 && healing > 0) {
          // Restore HP
          const currentHp = this.actor.system?.hp?.value ?? 0;
          const maxHp = this.actor.system?.hp?.max ?? 1;
          const newHp = Math.min(currentHp + healing, maxHp);

          // Decrease uses
          await ActorEngine.updateActor(this.actor, {
            'system.hp.value': newHp,
            'system.secondWind.uses': uses - 1
          });

          ui.notifications.info(`${this.actor.name} recovered ${healing} HP with Second Wind!`);
        }
      });
    }

    const swRestBtn = root.querySelector('[data-action="rest-second-wind"]');
    if (swRestBtn) {
      swRestBtn.addEventListener("click", async (ev) => {
        ev.preventDefault();
        const max = this.actor.system?.secondWind?.max ?? 1;
        await ActorEngine.updateActor(this.actor, {
          'system.secondWind.uses': max
        });
        ui.notifications.info(`${this.actor.name} rested. Second Wind uses restored!`);
      });
    }

    /* ---------------- DARK SIDE SPECTRUM CLICK ---------------- */

    const dsSpectrum = root.querySelector('.swse-v2-ds-spectrum');
    if (dsSpectrum) {
      dsSpectrum.addEventListener("click", async (ev) => {
        const segment = ev.target.closest('.ds-segment');
        if (segment) {
          const index = Number(segment.dataset.index);
          if (Number.isFinite(index)) {
            await ActorEngine.updateActor(this.actor, {
              'system.darkSideScore': index
            });
          }
        }
      });
    }

    /* ---- EQUIPMENT: SELL & DELETE ---- */

    for (const btn of root.querySelectorAll('[data-action="sell-item"]')) {
      btn.addEventListener("click", async (ev) => {
        ev.preventDefault();
        const itemId = ev.currentTarget?.dataset?.itemId;
        if (!itemId) return;
        const item = this.document.items.get(itemId);
        if (!item) return;

        const price = item.system.price ?? 0;
        const currentCredits = this.document.system.credits ?? 0;

        await this.document.update({
          "system.credits": currentCredits + price
        });

        await this.document.deleteEmbeddedDocuments("Item", [itemId]);
        ui.notifications.info(`Sold ${item.name} for ${price} credits`);
      });
    }

    for (const btn of root.querySelectorAll('[data-action="delete-item"]')) {
      btn.addEventListener("click", async (ev) => {
        ev.preventDefault();
        const itemId = ev.currentTarget?.dataset?.itemId;
        if (!itemId) return;
        await this.document.deleteEmbeddedDocuments("Item", [itemId]);
      });
    }

    RenderAssertions.assertRenderComplete(
      this,
      "SWSEV2CharacterSheet"
    );
  }

    /* ---- OWNED ACTORS MANAGEMENT ---- */

    for (const btn of root.querySelectorAll('[data-action="remove-owned"]')) {
      btn.addEventListener("click", async (ev) => {
        ev.preventDefault();
        const actorId = ev.currentTarget?.dataset?.actorId;
        if (!actorId) return;
        const owned = this.document.system.ownedActors?.filter(o => o.id !== actorId) || [];
        await this.document.update({ "system.ownedActors": owned });
      });
    }

    for (const btn of root.querySelectorAll('[data-action="open-owned"]')) {
      btn.addEventListener("click", (ev) => {
        ev.preventDefault();
        const actorId = ev.currentTarget?.dataset?.actorId;
        if (!actorId) return;
        const actor = game.actors.get(actorId);
        actor?.sheet?.render(true);
      });
    }
  }

  /* -------- -------- -------- -------- -------- -------- -------- -------- */
  /* DRAG & DROP HANDLING                                                     */
  /* -------- -------- -------- -------- -------- -------- -------- -------- */

  async _onDrop(event) {
    const data = TextEditor.getDragEventData(event);

    if (data.type !== "Actor") return;

    const actor = await fromUuid(data.uuid);
    if (!actor) return;

    const allowed = ["vehicle", "npc", "beast"];
    if (!allowed.includes(actor.type)) {
      ui.notifications.warn(`Can only add ${allowed.join(", ")} as owned actors`);
      return;
    }

    const owned = [...(this.document.system.ownedActors || [])];

    if (owned.find(o => o.id === actor.id)) {
      ui.notifications.info(`${actor.name} is already owned by this actor`);
      return;
    }

    owned.push({ id: actor.id, type: actor.type });

    await this.document.update({
      "system.ownedActors": owned
    });

    ui.notifications.info(`Added ${actor.name} as owned actor`);
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
