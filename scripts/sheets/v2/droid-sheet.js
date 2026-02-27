// scripts/sheets/v2/droid-sheet.js

const { HandlebarsApplicationMixin, DocumentSheetV2 } = foundry.applications.api;

import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { RenderAssertions } from "/systems/foundryvtt-swse/scripts/core/render-assertions.js";
import { initiateItemSale } from "/systems/foundryvtt-swse/scripts/apps/item-selling-system.js";
import { DroidBuilderApp } from "/systems/foundryvtt-swse/scripts/apps/droid-builder-app.js";
import { SWSELevelUp } from "/systems/foundryvtt-swse/scripts/apps/swse-levelup.js";
import { rollSkill } from "/systems/foundryvtt-swse/scripts/rolls/skills.js";
import { rollAttack } from "/systems/foundryvtt-swse/scripts/combat/rolls/attacks.js";
import { DropResolutionEngine } from "/systems/foundryvtt-swse/scripts/engine/interactions/drop-resolution-engine.js";
import { AdoptionEngine } from "/systems/foundryvtt-swse/scripts/engine/interactions/adoption-engine.js";
import { AdoptOrAddDialog } from "/systems/foundryvtt-swse/scripts/apps/adopt-or-add-dialog.js";
import { isXPEnabled } from "/systems/foundryvtt-swse/scripts/engine/progression/xp-engine.js";
import { AbilityEngine } from "/systems/foundryvtt-swse/scripts/engine/abilities/AbilityEngine.js";

function markActiveConditionStep(root, actor) {
  if (!(root instanceof HTMLElement)) return;
  const current = Number(actor?.system?.derived?.damage?.conditionStep ?? actor?.system?.conditionTrack?.current ?? 0);
  for (const el of root.querySelectorAll('.swse-v2-condition-step')) {
    const s = Number(el.dataset?.step);
    if (Number.isFinite(s) && s === current) el.classList.add('active');
  }
}

export class SWSEV2DroidSheet extends
  HandlebarsApplicationMixin(DocumentSheetV2) {

  static PARTS = {
    ...super.PARTS,
    body: {
      template: "systems/foundryvtt-swse/templates/actors/droid/v2/droid-sheet.hbs"
    }
  };

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["swse", "swse-app", "swse-sheet", "swse-droid-sheet", "v2"],
      width: 820,
      height: 920,
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

    if (actor.type !== "droid") {
      throw new Error(
        `SWSEV2DroidSheet requires actor type "droid", got "${actor.type}"`
      );
    }

    RenderAssertions.assertActorValid(actor, "SWSEV2DroidSheet");

    const baseContext = await super._prepareContext(options);

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

    // XP display data
    const xpEnabled = isXPEnabled();
    const xpData = actor.system?.derived?.xp ?? null;
    const xpPercent = xpData?.progressPercent ?? 0;
    const isGM = game.user?.isGM === true;

    // Abilities panel data (Phase 3)
    let feats = [];
    let talents = [];
    let racialAbilities = [];
    try {
      const abilityPanel = AbilityEngine.getCardPanelModelForActor(actor);
      feats = abilityPanel.all?.filter(a => a.type === "feat") ?? [];
      talents = abilityPanel.all?.filter(a => a.type === "talent") ?? [];
      racialAbilities = abilityPanel.all?.filter(a => a.type === "racialAbility") ?? [];
    } catch (err) {
      console.error('Error preparing abilities panel for Droid sheet:', err);
    }

    const overrides = {
      actor,
      system: actor.system,
      derived: actor.system?.derived ?? {},
      xpEnabled,
      xpData,
      xpPercent,
      isGM,
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
      feats,
      talents,
      racialAbilities,
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
      "SWSEV2DroidSheet"
    );

    return { ...baseContext, ...overrides };
  }

  /**
   * Post-render hook: Attach event listeners, NOT manipulate DOM
   *
   * RULES FOR _onRender():
   * ✓ Traverse DOM with querySelector/querySelectorAll
   * ✓ Attach event listeners via addEventListener
   * ✓ Read data attributes and CSS classes
   * ✗ Do NOT mutate DOM (add/remove/modify elements)
   * ✗ Do NOT change CSS classes or styles
   * ✗ Do NOT set textContent or innerHTML
   *
   * If you need to change what renders: update actor data in _updateObject(),
   * which triggers a re-render with new _prepareContext() data.
   */
  async _onRender(context, options) {

    const root = this.element;
    if (!(root instanceof HTMLElement)) {
      throw new Error("DroidSheet: element not HTMLElement");
    }

    if (root.dataset.bound === "true") return;
    root.dataset.bound = "true";

    RenderAssertions.assertDOMElements(
      root,
      [".sheet-tabs", ".sheet-body"],
      "SWSEV2DroidSheet"
    );

    markActiveConditionStep(root, this.actor);

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

    /* ---------------- INITIATIVE CONTROLS ---------------- */

    root.querySelector(".roll-initiative")?.addEventListener("click", async (ev) => {
      ev.preventDefault();
      await this.actor.swseRollInitiative();
    });

    root.querySelector(".take10-initiative")?.addEventListener("click", async (ev) => {
      ev.preventDefault();
      await this.actor.swseTake10Initiative();
    });

    /* ---------------- ITEM OPEN ---------------- */

    for (const el of root.querySelectorAll(".swse-v2-open-item")) {
      el.addEventListener("click", (ev) => {
        ev.preventDefault();
        const itemId = ev.currentTarget?.dataset?.itemId;
        const item = this.actor?.items?.get(itemId);
        item?.sheet?.render(true);
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

        // PHASE 8: Use ActorEngine
        await ActorEngine.deleteEmbeddedDocuments(this.document, "Item", [itemId]);
        ui.notifications.info(`Sold ${item.name} for ${price} credits`);
      });
    }

    for (const btn of root.querySelectorAll('[data-action="delete-item"]')) {
      btn.addEventListener("click", async (ev) => {
        ev.preventDefault();
        const itemId = ev.currentTarget?.dataset?.itemId;
        if (!itemId) return;
        // PHASE 8: Use ActorEngine
        await ActorEngine.deleteEmbeddedDocuments(this.document, "Item", [itemId]);
      });
    }

    /* ---- ARMOR EQUIP TOGGLE ---- */

    for (const checkbox of root.querySelectorAll('[data-action="toggle-equip-armor"]')) {
      checkbox.addEventListener("change", async (ev) => {
        const itemId = ev.currentTarget?.dataset?.itemId;
        if (!itemId) return;
        const item = this.document.items.get(itemId);
        if (!item) return;
        await item.update({ "system.equipped": ev.currentTarget.checked });
      });
    }

    /* ---- FEAT/TALENT BUTTONS ---- */

    for (const btn of root.querySelectorAll('[data-action="add-feat"]')) {
      btn.addEventListener("click", async (ev) => {
        ev.preventDefault();
        game.swse.progression?.openFeatSelector?.(this.document);
      });
    }

    for (const btn of root.querySelectorAll('[data-action="add-talent"]')) {
      btn.addEventListener("click", async (ev) => {
        ev.preventDefault();
        game.swse.progression?.openTalentSelector?.(this.document);
      });
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

    /* ---------------- SKILL ROLLING ---------------- */

    for (const el of root.querySelectorAll('[data-action="roll-skill"]')) {
      el.addEventListener("click", async (ev) => {
        ev.preventDefault();
        const skillKey = ev.currentTarget?.dataset?.skill;
        if (skillKey && this.actor) {
          await rollSkill(this.actor, skillKey);
        }
      });
    }

    /* ---------------- DEFENSE ROLLING ---------------- */

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

    /* ---------------- WEAPON ROLLING ---------------- */

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

    /* ---------------- EDIT DROID SYSTEMS (DROID-SPECIFIC) ---------------- */

    const editDroidBtn = root.querySelector(".edit-droid-systems");
    if (editDroidBtn) {
      editDroidBtn.addEventListener("click", async (ev) => {
        ev.preventDefault();
        const hasConfig = !!this.actor?.system?.droidSystems?.degree;
        const mode = hasConfig ? "EDIT" : "NEW";

        try {
          await DroidBuilderApp.open(this.actor, {
            mode: mode,
            sourceActor: hasConfig ? this.actor : null,
            requireApproval: game.settings.get('foundryvtt-swse', 'store.requireGMApproval') ?? false
          });
        } catch (err) {
          console.error('Failed to open droid builder:', err);
          ui.notifications.error('Failed to open droid builder.');
        }
      });
    }

    /* ---------------- PROGRESSION BUTTONS (DROID-SPECIFIC) ---------------- */

    const levelUpBtn = root.querySelector('[data-action="level-up"]');
    if (levelUpBtn) {
      levelUpBtn.addEventListener("click", async (ev) => {
        ev.preventDefault();
        if (this.actor) {
          await SWSELevelUp.openEnhanced(this.actor);
        }
      });
    }

    /* ---- ABILITIES TAB HANDLERS (Phase 3) ---- */

    this._bindAbilityCardHandlers(root);

    /* ---- DRAG & DROP VISUAL FEEDBACK ---- */

    DropService.bindDragFeedback(root);

    RenderAssertions.assertRenderComplete(
      this,
      "SWSEV2DroidSheet"
    );
  }

  _bindAbilityCardHandlers(root) {
    // Ability card chat button
    root.querySelectorAll('.ability-chat-btn').forEach((btn) => {
      btn.addEventListener('click', async (ev) => {
        ev.preventDefault();
        const abilityId = ev.currentTarget?.dataset?.abilityId;
        if (!abilityId) return;

        try {
          const { ActionChatEngine } = await import('../../chat/action-chat-engine.js');
          await ActionChatEngine.emote(this.document, `uses ability: ${abilityId}`);
        } catch (err) {
          console.error('Error posting ability chat:', err);
        }
      });
    });

    // Ability card roll button
    root.querySelectorAll('.ability-roll-btn').forEach((btn) => {
      btn.addEventListener('click', async (ev) => {
        ev.preventDefault();
        const abilityId = ev.currentTarget?.dataset?.abilityId;
        if (!abilityId) return;

        try {
          const ability = this.document.items?.get(abilityId);
          if (ability) {
            await rollAttack(this.document, ability);
          }
        } catch (err) {
          console.error('Error rolling ability:', err);
        }
      });
    });

    // Ability card use button
    root.querySelectorAll('.ability-use-btn').forEach((btn) => {
      btn.addEventListener('click', async (ev) => {
        ev.preventDefault();
        const abilityId = ev.currentTarget?.dataset?.abilityId;
        if (!abilityId) return;

        try {
          const ability = this.document.items?.get(abilityId);
          if (ability) {
            // Mark as used
            const { AbilityUsage } = await import('../../../engine/abilities/ability-usage.js');
            await AbilityUsage.markUsed(this.document, abilityId);
            this.render();
          }
        } catch (err) {
          console.error('Error using ability:', err);
        }
      });
    });
  }

  /* -------- -------- -------- -------- -------- -------- -------- -------- */
  /* DRAG & DROP HANDLING (Sovereign via DropResolutionEngine)                 */
  /* -------- -------- -------- -------- -------- -------- -------- -------- */

  async _onDrop(event) {
    event.preventDefault();

    // Extract drag data
    const data = TextEditor.getDragEventData(event);
    if (!data) return;

    // Check if this is an actor drop
    let droppedDocument = null;
    if (data.uuid) {
      try {
        droppedDocument = await fromUuid(data.uuid);
      } catch (err) {
        // Not a valid UUID, treat as item drop
      }
    }

    // ACTOR DROP: Check if GM can adopt
    if (droppedDocument && droppedDocument.documentName === 'Actor') {
      return this._handleActorDrop(droppedDocument);
    }

    // ITEM DROP: Use standard resolution
    const result = await DropResolutionEngine.resolve({
      actor: this.actor,
      dropData: data
    });

    // If no plan (duplicate or invalid), silently skip
    if (!result || !result.mutationPlan) return;

    // Apply mutations via sovereign ActorEngine
    try {
      await ActorEngine.apply(this.actor, result.mutationPlan);
      // UI feedback: pulse the target tab
      if (result.uiTargetTab) {
        this._pulseTab(result.uiTargetTab);
      }
    } catch (err) {
      console.error('Drop application failed:', err);
      ui?.notifications?.error?.(`Failed to add dropped item: ${err.message}`);
    }
  }

  async _handleActorDrop(droppedActor) {
    if (droppedActor.type !== this.actor.type || !game.user.isGM) {
      return this._addActorRelationship(droppedActor);
    }
    new AdoptOrAddDialog(droppedActor, async (choice) => {
      if (choice === "add") {
        await this._addActorRelationship(droppedActor);
      } else if (choice === "adopt") {
        await this._adoptActor(droppedActor);
      }
    }).render(true);
  }

  async _addActorRelationship(actor) {
    const relationships = this.actor.system?.relationships ?? [];
    const alreadyLinked = relationships.some(r => r.uuid === actor.uuid);
    if (alreadyLinked) {
      console.debug(`Already linked: ${actor.name}`);
      return;
    }
    const mutationPlan = {
      update: {
        'system.relationships': [...relationships, { uuid: actor.uuid, name: actor.name, type: actor.type }]
      }
    };
    try {
      await ActorEngine.apply(this.actor, mutationPlan);
    } catch (err) {
      console.error('Failed to add actor relationship:', err);
      ui?.notifications?.error?.(`Failed to add relationship: ${err.message}`);
    }
  }

  async _adoptActor(sourceActor) {
    const mutationPlan = AdoptionEngine.buildAdoptionPlan({
      targetActor: this.actor,
      sourceActor: sourceActor
    });
    if (!mutationPlan) {
      ui?.notifications?.warn?.(`Cannot adopt from ${sourceActor.name}`);
      return;
    }
    try {
      await ActorEngine.apply(this.actor, mutationPlan);
      ui?.notifications?.info?.(`${this.actor.name} adopted stat block from ${sourceActor.name}`);
    } catch (err) {
      console.error('Adoption failed:', err);
      ui?.notifications?.error?.(`Adoption failed: ${err.message}`);
    }
  }

  /**
   * Pulse tab for UI feedback on drop success
   *
   * @private
   * @param {string} tabName - tab identifier to pulse
   */
  _pulseTab(tabName) {
    if (!tabName) return;

    const tabButton = this.element?.querySelector(`[data-tab="${tabName}"]`);
    if (!tabButton) return;

    tabButton.classList.add('tab-pulse');

    setTimeout(() => {
      tabButton.classList.remove('tab-pulse');
    }, 800);
  }

  /* ------------------------------------------------------------------------ */
  /* FORM UPDATE ROUTING                                                      */
  /* ------------------------------------------------------------------------ */

  async _updateObject(event, formData) {
    const expanded = foundry.utils.expandObject(formData);
    if (!expanded?.system) {return;}
    await ActorEngine.updateActor(this.actor, { system: expanded.system });
  }
}
