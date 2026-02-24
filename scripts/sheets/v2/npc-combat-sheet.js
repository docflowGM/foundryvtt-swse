// scripts/sheets/v2/npc-combat-sheet.js

const { HandlebarsApplicationMixin, DocumentSheetV2 } = foundry.applications.api;

import { ActorEngine } from '../../governance/actor-engine/actor-engine.js';
import { RenderAssertions } from '../../core/render-assertions.js';
import { SWSELevelUp } from '../../apps/swse-levelup.js';
import { rollSkill } from '../../rolls/skills.js';
import { rollAttack } from '../../combat/rolls/attacks.js';
import { DropResolutionEngine } from '../../engines/interactions/drop-resolution-engine.js';

function markActiveConditionStep(root, actor) {
  if (!(root instanceof HTMLElement)) return;
  const current = Number(actor?.system?.derived?.damage?.conditionStep ?? actor?.system?.conditionTrack?.current ?? 0);
  for (const el of root.querySelectorAll('.swse-v2-condition-step')) {
    const s = Number(el.dataset?.step);
    if (Number.isFinite(s) && s === current) el.classList.add('active');
  }
}

export class SWSEV2CombatNpcSheet extends
  HandlebarsApplicationMixin(DocumentSheetV2) {

  static PARTS = {
    ...super.PARTS,
    body: {
      template: "systems/foundryvtt-swse/templates/actors/npc/v2/npc-combat-sheet.hbs"
    }
  };

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["swse", "swse-app", "swse-sheet", "swse-npc-sheet", "swse-npc-combat-sheet", "v2"],
      width: 800,
      height: 700,
      resizable: true,
      form: {
        closeOnSubmit: false,
        submitOnChange: false
      }
    });
  }

  constructor(document, options = {}) {
    super(document, options);
  }

  async _prepareContext(options) {

    const actor = this.document;

    if (actor.type !== "npc") {
      throw new Error(
        `SWSEV2CombatNpcSheet requires actor type "npc", got "${actor.type}"`
      );
    }

    RenderAssertions.assertActorValid(actor, "SWSEV2CombatNpcSheet");

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
      "SWSEV2CombatNpcSheet"
    );

    return { ...baseContext, ...overrides };
  }

  async _onRender(context, options) {

    const root = this.element;
    if (!(root instanceof HTMLElement)) {
      throw new Error("CombatNpcSheet: element not HTMLElement");
    }

    if (root.dataset.bound === "true") return;
    root.dataset.bound = "true";

    markActiveConditionStep(root, this.actor);

    /* ---- CONDITION STEP HANDLING ---- */

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

    /* ---- INITIATIVE CONTROLS ---- */

    root.querySelector(".roll-initiative")?.addEventListener("click", async (ev) => {
      ev.preventDefault();
      await this.actor.swseRollInitiative();
    });

    root.querySelector(".take10-initiative")?.addEventListener("click", async (ev) => {
      ev.preventDefault();
      await this.actor.swseTake10Initiative();
    });

    /* ---- SKILL ROLLING ---- */

    for (const el of root.querySelectorAll('[data-action="roll-skill"]')) {
      el.addEventListener("click", async (ev) => {
        ev.preventDefault();
        const skillKey = ev.currentTarget?.dataset?.skill;
        if (skillKey && this.actor) {
          await rollSkill(this.actor, skillKey);
        }
      });
    }

    /* ---- DEFENSE ROLLING ---- */

    for (const el of root.querySelectorAll('[data-action="roll-defense"]')) {
      el.addEventListener("click", async (ev) => {
        ev.preventDefault();
        const defenseType = ev.currentTarget?.dataset?.defense;
        if (defenseType && this.actor) {
          if (typeof game.swse?.rolls?.defenses?.rollDefense === "function") {
            await game.swse.rolls.defenses.rollDefense(this.document, defenseType);
          }
        }
      });
    }

    /* ---- WEAPON ROLLING ---- */

    for (const el of root.querySelectorAll('[data-action="roll-weapon"]')) {
      el.addEventListener("click", async (ev) => {
        ev.preventDefault();
        const itemId = ev.currentTarget?.dataset?.itemId;
        if (!itemId || !this.actor) return;
        const item = this.actor.items?.get(itemId);
        if (!item) return;
        if (typeof item.roll === "function") {
          await item.roll();
        } else {
          await rollAttack(this.actor, item);
        }
      });
    }

    /* ---- LEVEL UP ---- */

    const levelUpBtn = root.querySelector('[data-action="level-up"]');
    if (levelUpBtn) {
      levelUpBtn.addEventListener("click", async (ev) => {
        ev.preventDefault();
        if (this.actor) {
          await SWSELevelUp.openEnhanced(this.actor);
        }
      });
    }

    /* ---- ITEM OPEN ---- */

    for (const el of root.querySelectorAll(".swse-v2-open-item")) {
      el.addEventListener("click", (ev) => {
        ev.preventDefault();
        const itemId = ev.currentTarget?.dataset?.itemId;
        const item = this.actor?.items?.get(itemId);
        item?.sheet?.render(true);
      });
    }

    /* ---- SWITCH TO FULL MODE ---- */

    const switchFullBtn = root.querySelector('[data-action="switch-full-mode"]');
    if (switchFullBtn) {
      switchFullBtn.addEventListener("click", async (ev) => {
        ev.preventDefault();
        await ActorEngine.updateActor(this.actor, { "system.sheetMode": "full" });
      });
    }

    /* ---- DRAG & DROP VISUAL FEEDBACK ---- */

    DropService.bindDragFeedback(root);

    RenderAssertions.assertRenderComplete(
      this,
      "SWSEV2CombatNpcSheet"
    );
  }

  async _onDrop(event) {
    event.preventDefault();

    // Extract drag data
    const data = TextEditor.getDragEventData(event);
    if (!data) return;

    // Resolve drop to mutationPlan (pure classification)
    const mutationPlan = await DropResolutionEngine.resolve({
      actor: this.actor,
      dropData: data
    });

    // If no plan (duplicate or invalid), silently skip
    if (!mutationPlan) return;

    // Apply mutations via sovereign ActorEngine
    try {
      await ActorEngine.apply(this.actor, mutationPlan);
    } catch (err) {
      console.error('Drop application failed:', err);
      ui?.notifications?.error?.(`Failed to add dropped item: ${err.message}`);
    }
  }

  async _updateObject(event, formData) {
    const expanded = foundry.utils.expandObject(formData);
    if (!expanded?.system) {return;}
    await ActorEngine.updateActor(this.actor, { system: expanded.system });
  }
}
