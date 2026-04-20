// scripts/sheets/v2/vehicle-sheet.js

const { HandlebarsApplicationMixin, DocumentSheetV2 } = foundry.applications.api;

import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { DropService } from "/systems/foundryvtt-swse/scripts/services/drop-service.js";
import { RenderAssertions } from "/systems/foundryvtt-swse/scripts/core/render-assertions.js";
import { initiateItemSale } from "/systems/foundryvtt-swse/scripts/apps/item-selling-system.js";
import { SWSELevelUp } from "/systems/foundryvtt-swse/scripts/apps/swse-levelup.js";
import { rollAttack } from "/systems/foundryvtt-swse/scripts/combat/rolls/attacks.js";
import { SWSERoll } from "/systems/foundryvtt-swse/scripts/combat/rolls/enhanced-rolls.js";
import { VehicleDropEngine } from "/systems/foundryvtt-swse/scripts/engine/interactions/vehicle-drop-engine.js";
import { AdoptionEngine } from "/systems/foundryvtt-swse/scripts/engine/interactions/adoption-engine.js";
import { AdoptOrAddDialog } from "/systems/foundryvtt-swse/scripts/apps/adopt-or-add-dialog.js";
import { StarshipManeuversEngine } from "/systems/foundryvtt-swse/scripts/engine/StarshipManeuversEngine.js";
import { computeCenteredPosition, getApplicationTargetSize } from "/systems/foundryvtt-swse/scripts/utils/sheet-position.js";
// PHASE 1: Import prepared context builders instead of direct engine access
import { buildVehicleSheetContext } from "/systems/foundryvtt-swse/scripts/sheets/v2/vehicle-sheet/vehicle-context-builder.js";
import { VehicleRulesAdapter } from "/systems/foundryvtt-swse/scripts/sheets/v2/vehicle-sheet/vehicle-rules-adapter.js";

function markActiveConditionStep(root, actor) {
  if (!(root instanceof HTMLElement)) return;
  const current = Number(actor?.system?.conditionTrack?.current ?? 0);
  for (const el of root.querySelectorAll('.swse-v2-condition-step')) {
    const s = Number(el.dataset?.step);
    if (Number.isFinite(s) && s === current) el.classList.add('active');
  }
}

export class SWSEV2VehicleSheet extends
  HandlebarsApplicationMixin(DocumentSheetV2) {

  static PARTS = {
    ...super.PARTS,
    body: {
      template: "systems/foundryvtt-swse/templates/actors/vehicle/v2/vehicle-sheet.hbs"
    }
  };

  static DEFAULT_OPTIONS = {
    ...super.DEFAULT_OPTIONS,
    classes: ["swse", "sheet", "actor", "vehicle", "swse-sheet", "swse-vehicle-sheet", "v2"],
    width: 820,
    height: 920,
    window: {
      resizable: true
    },
    form: {
      closeOnSubmit: false,
      submitOnChange: false
    },
    tabs: [
      {
        navSelector: ".sheet-tabs",
        contentSelector: ".sheet-content",
        initial: "overview"
      }
    ]
  };

  /**
   * Convenience getter for accessing the actor document
   * Used throughout the sheet as this.actor instead of this.document
   */
  get actor() {
    return this.document;
  }

  constructor(document, options = {}) {
    super(document, options);
  }

  async _prepareContext(options) {

    const actor = this.document;

    if (actor.type !== "vehicle") {
      throw new Error(
        `SWSEV2VehicleSheet requires actor type "vehicle", got "${actor.type}"`
      );
    }

    RenderAssertions.assertActorValid(actor, "SWSEV2VehicleSheet");

    const baseContext = await super._prepareContext(options);

    // ════════════════════════════════════════════════════════════════════════════
    // PHASE 1: Build prepared panel contexts using builders (not raw data)
    // ════════════════════════════════════════════════════════════════════════════

    // DATAPAD HEADER: HP state (from prepared derived data)
    const derived = actor.system?.derived ?? {};
    const hp = derived.hp ?? { value: 0, max: 1, percent: 0, warning: false, critical: false };
    const hpPercent = Math.max(0, Math.min(100, hp.percent ?? 0));
    const hpWarning = hp.warning ?? false;
    const hpCritical = hp.critical ?? false;

    // Condition Track state
    const conditionStep = actor.system?.conditionTrack?.current ?? 0;
    const ctWarning = conditionStep > 0;

    // Build owned actors map (crew members, serializable: no Document references)
    const ownedActorMap = {};
    for (const entry of actor.system.ownedActors || []) {
      const ownedActor = game.actors.get(entry.id);
      if (ownedActor) {
        ownedActorMap[entry.id] = {
          id: ownedActor.id,
          name: ownedActor.name,
          type: ownedActor.type,
          img: ownedActor.img
        };
      }
    }

    // Build equipment and weapon lists
    const equipment = actor.items.filter(item => item.type === "equipment").map(item => ({
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

    // ════════════════════════════════════════════════════════════════════════════
    // PHASE 1: Calculate cargo state for summary panel
    // ════════════════════════════════════════════════════════════════════════════
    const cargoCapacity = actor.system?.cargo?.capacity ?? 500;
    let totalCargoWeight = 0;
    const cargoItems = actor.items.filter(item => item.type === "equipment");
    for (const item of cargoItems) {
      const weight = item.system?.weight ?? 0;
      const quantity = item.system?.quantity ?? 1;
      totalCargoWeight += weight * quantity;
    }
    const cargoState = totalCargoWeight > cargoCapacity * 1.1 ? 'over' : totalCargoWeight > cargoCapacity * 0.8 ? 'near' : 'normal';

    // ════════════════════════════════════════════════════════════════════════════
    // PHASE 1: Build all house rule contexts through adapter (no direct reads)
    // ════════════════════════════════════════════════════════════════════════════
    const ruleContexts = VehicleRulesAdapter.buildAllRuleContexts(actor);

    // ════════════════════════════════════════════════════════════════════════════
    // PHASE 3: Build prepared panel contexts for template rendering
    // ════════════════════════════════════════════════════════════════════════════
    const panelContext = buildVehicleSheetContext(actor, baseContext, {
      subsystemData: ruleContexts.subsystemData,
      subsystemPenalties: ruleContexts.subsystemPenalties,
      shieldZones: ruleContexts.shieldZones,
      powerData: ruleContexts.powerData,
      pilotData: ruleContexts.pilotData,
      commanderData: ruleContexts.commanderData,
      turnPhaseData: ruleContexts.turnPhaseData,
      totalCargoWeight,
      cargoState
    });

    // Starship Maneuvers (for pilot/crew positions)
    const starshipManeuvers = StarshipManeuversEngine.getManeuversForActor(actor);

    const overrides = {
      // Core document and system data
      system: actor.system,
      derived: derived,  // Now properly normalized by buildVehicleDerived
      items: actor.items.map(item => ({
        id: item.id,
        name: item.name,
        type: item.type,
        img: item.img,
        system: item.system
      })),
      equipment,
      weapons,
      ownedActorMap,
      editable: this.isEditable,
      user: {
        id: game.user.id,
        name: game.user.name,
        role: game.user.role
      },
      // PHASE 1: DATAPAD HEADER STATES
      hpPercent,
      hpWarning,
      hpCritical,
      ctWarning,
      // PHASE 1: CARGO SYSTEM
      cargoCapacity: Math.round(cargoCapacity * 100) / 100,
      totalCargoWeight: Math.round(totalCargoWeight * 100) / 100,
      cargoState,
      // PHASE 1: Prepared panel contexts (not raw data)
      ...panelContext,
      // PHASE 1: House rule contexts (null if rule disabled)
      houseRuleContexts: {
        subsystemPanel: ruleContexts.subsystemData ? {
          subsystemData: ruleContexts.subsystemData,
          subsystemPenalties: ruleContexts.subsystemPenalties
        } : null,
        shieldPanel: ruleContexts.shieldZones ? {
          shieldZones: ruleContexts.shieldZones
        } : null,
        powerPanel: ruleContexts.powerData || null,
        pilotPanel: ruleContexts.pilotData || null,
        commanderPanel: ruleContexts.commanderData || null,
        turnPhasePanel: ruleContexts.turnPhaseData || null
      },
      // PHASE 1: Starship Maneuvers
      starshipManeuvers
    };

    RenderAssertions.assertContextSerializable(
      overrides,
      "SWSEV2VehicleSheet"
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
    // ═══ FIX: Center on initial render (first time ever or after close/reopen) ═══
    // Use dynamic dimensions instead of hardcoding 820x920
    const isFirstRenderEver = !this.rendered;
    if (isFirstRenderEver) {
      this._hasBeenRendered = true;
      this._shouldCenterOnRender = true;
    }

    const shouldCenter = this._shouldCenterOnRender;
    if (shouldCenter) {
      const { width: targetWidth, height: targetHeight } = getApplicationTargetSize(this);
      const pos = computeCenteredPosition(targetWidth, targetHeight);
      this.setPosition({ left: pos.left, top: pos.top });
      this._shouldCenterOnRender = false;
    }

    // Phase 3: Enforce super._onRender call (AppV2 contract)
    await super._onRender(context, options);

    const root = this.element;
    if (!(root instanceof HTMLElement)) {
      throw new Error("VehicleSheet: element not HTMLElement");
    }

    // Abort previous render's listeners to prevent duplicate event handlers
    this._renderAbort?.abort();
    this._renderAbort = new AbortController();
    const { signal } = this._renderAbort;

    RenderAssertions.assertDOMElements(
      root,
      [".sheet-tabs", ".sheet-body"],
      "SWSEV2VehicleSheet"
    );

    markActiveConditionStep(root, this.actor);

    /* ---------------- TAB HANDLING ---------------- */

    try {
      for (const tabBtn of root.querySelectorAll(".sheet-tabs .item")) {
        tabBtn.addEventListener("click", (ev) => {
          try {
            const tabName = ev.currentTarget.dataset.tab;
            if (!tabName) return;

            root.querySelectorAll(".sheet-tabs .item")
              .forEach(b => b.classList.remove("active"));

            ev.currentTarget.classList.add("active");

            root.querySelectorAll(".tab")
              .forEach(t => t.classList.remove("active"));

            root.querySelector(`.tab[data-tab="${tabName}"]`)
              ?.classList.add("active");
          } catch (err) {
            console.error("Error handling tab click:", err);
          }
        }, { signal });
      }
    } catch (err) {
      console.error("Error binding tab handlers:", err);
    }

    /* ---------------- CONDITION STEP HANDLING ---------------- */

    try {
      for (const el of root.querySelectorAll(".swse-v2-condition-step")) {
        el.addEventListener("click", async (ev) => {
          try {
            ev.preventDefault();
            const step = Number(ev.currentTarget?.dataset?.step);
            if (!Number.isFinite(step)) return;
            if (typeof this.actor?.setConditionTrackStep === "function") {
              await this.actor?.setConditionTrackStep(step);
            } else if (this.actor) {
              await ActorEngine.updateActor(this.actor, { 'system.conditionTrack.current': step });
            }
          } catch (err) {
            console.error("Error handling condition step click:", err);
          }
        }, { signal });
      }
    } catch (err) {
      console.error("Error binding condition step handlers:", err);
    }

    const improveBtn = root.querySelector(".swse-v2-condition-improve");
    if (improveBtn) {
      improveBtn.addEventListener("click", async (ev) => {
        ev.preventDefault();
        if (typeof this.actor?.improveConditionTrack === "function") {
          await this.actor?.improveConditionTrack();
        }
      }, { signal });
    }

    const worsenBtn = root.querySelector(".swse-v2-condition-worsen");
    if (worsenBtn) {
      worsenBtn.addEventListener("click", async (ev) => {
        ev.preventDefault();
        if (typeof this.actor?.worsenConditionTrack === "function") {
          await this.actor?.worsenConditionTrack();
        }
      }, { signal });
    }

    const persistentCheckbox = root.querySelector(".swse-v2-condition-persistent");
    if (persistentCheckbox) {
      persistentCheckbox.addEventListener("change", async (ev) => {
        const flag = ev.currentTarget?.checked === true;
        if (typeof this.actor?.setConditionTrackPersistent === "function") {
          await this.actor?.setConditionTrackPersistent(flag);
        }
      }, { signal });
    }

    /* ---------------- ITEM OPEN ---------------- */

    for (const el of root.querySelectorAll(".swse-v2-open-item")) {
      el.addEventListener("click", (ev) => {
        ev.preventDefault();
        const itemId = ev.currentTarget?.dataset?.itemId ?? ev.currentTarget?.dataset?.weaponId;
        const item = this.actor?.items?.get(itemId);
        item?.sheet?.render(true);
      }, { signal });
    }

    /* ---- EQUIPMENT: SELL & DELETE ---- */

    for (const btn of root.querySelectorAll('[data-action="sell-item"]')) {
      btn.addEventListener("click", async (ev) => {
        ev.preventDefault();
        const itemId = ev.currentTarget?.dataset?.itemId ?? ev.currentTarget?.dataset?.weaponId;
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
      }, { signal });
    }

    for (const btn of root.querySelectorAll('[data-action="delete-item"]')) {
      btn.addEventListener("click", async (ev) => {
        ev.preventDefault();
        const itemId = ev.currentTarget?.dataset?.itemId ?? ev.currentTarget?.dataset?.weaponId;
        if (!itemId) return;
        // PHASE 8: Use ActorEngine
        await ActorEngine.deleteEmbeddedDocuments(this.document, "Item", [itemId]);
      }, { signal });
    }

    /* ---- CREW MANAGEMENT ---- */

    for (const btn of root.querySelectorAll('[data-action="remove-owned"]')) {
      btn.addEventListener("click", async (ev) => {
        ev.preventDefault();
        const actorId = ev.currentTarget?.dataset?.actorId;
        if (!actorId) return;
        const owned = this.document.system.ownedActors?.filter(o => o.id !== actorId) || [];
        await this.document.update({ "system.ownedActors": owned });
      }, { signal });
    }

    for (const btn of root.querySelectorAll('[data-action="open-owned"]')) {
      btn.addEventListener("click", (ev) => {
        ev.preventDefault();
        const actorId = ev.currentTarget?.dataset?.actorId;
        if (!actorId) return;
        const actor = game.actors.get(actorId);
        actor?.sheet?.render(true);
      }, { signal });
    }

    /* ---------------- WEAPON ROLLING ---------------- */

    for (const el of root.querySelectorAll('[data-action="roll-weapon"], [data-action="roll-weapon-attack"]')) {
      el.addEventListener("click", async (ev) => {
        ev.preventDefault();
        const itemId = ev.currentTarget?.dataset?.itemId ?? ev.currentTarget?.dataset?.weaponId;
        if (!itemId || !this.actor) return;
        const item = this.actor.items?.get(itemId);
        if (!item) return;
        if (typeof item.roll === "function") {
          await item.roll();
        } else {
          await SWSERoll.rollAttack(this.actor, item, { showDialog: true });
}
      }, { signal });
    }

    /* ---------------- ACTION USE ---------------- */

    for (const el of root.querySelectorAll(".swse-v2-use-action")) {
      el.addEventListener("click", async (ev) => {
        ev.preventDefault();
        const actionId = ev.currentTarget?.dataset?.actionId;
        if (typeof this.actor?.useAction === "function") {
          await this.actor?.useAction(actionId);
        }
      }, { signal });
    }

    /* ---------------- PROGRESSION BUTTONS (VEHICLE-SPECIFIC) ---------------- */

    const levelUpBtn = root.querySelector('[data-action="level-up"]');
    if (levelUpBtn) {
      levelUpBtn.addEventListener("click", async (ev) => {
        ev.preventDefault();
        if (this.actor) {
          await SWSELevelUp.openEnhanced(this.actor);
        }
      }, { signal });
    }

    /* ---- SUBSYSTEM REPAIR ---- */

    for (const btn of root.querySelectorAll('[data-action="repair-subsystem"]')) {
      btn.addEventListener("click", async (ev) => {
        ev.preventDefault();
        const subsystem = ev.currentTarget?.dataset?.subsystem;
        if (!subsystem || !this.actor) return;
        await SubsystemEngine.repairSubsystem(this.actor, subsystem);
      }, { signal });
    }

    /* ---- ENHANCED SHIELDS ---- */

    for (const btn of root.querySelectorAll('[data-action="shield-focus"]')) {
      btn.addEventListener("click", async (ev) => {
        ev.preventDefault();
        const zone = ev.currentTarget?.dataset?.zone;
        if (!zone || !this.actor) return;
        await EnhancedShields.focusShields(this.actor, zone);
      }, { signal });
    }

    const equalizeBtn = root.querySelector('[data-action="shield-equalize"]');
    if (equalizeBtn) {
      equalizeBtn.addEventListener("click", async (ev) => {
        ev.preventDefault();
        if (!this.actor) return;
        await EnhancedShields.equalizeShields(this.actor);
      }, { signal });
    }

    /* ---- POWER ALLOCATION ---- */

    for (const btn of root.querySelectorAll('[data-action="power-adjust"]')) {
      btn.addEventListener("click", async (ev) => {
        ev.preventDefault();
        const system = ev.currentTarget?.dataset?.system;
        const direction = ev.currentTarget?.dataset?.direction;
        if (!system || !direction || !this.actor) return;
        const current = this.actor.system?.powerAllocation?.[system] ?? 2;
        const newVal = direction === 'up' ? Math.min(4, current + 1) : Math.max(0, current - 1);
        await ActorEngine.updateActor(this.actor, { [`system.powerAllocation.${system}`]: newVal });
      }, { signal });
    }

    /* ---- PILOT MANEUVER ---- */

    for (const btn of root.querySelectorAll('[data-action="set-maneuver"]')) {
      btn.addEventListener("click", async (ev) => {
        ev.preventDefault();
        const maneuver = ev.currentTarget?.dataset?.maneuver;
        if (!maneuver || !this.actor) return;
        await EnhancedPilot.setManeuver(this.actor, maneuver);
      }, { signal });
    }

    /* ---- COMMANDER ORDER ---- */

    for (const btn of root.querySelectorAll('[data-action="set-order"]')) {
      btn.addEventListener("click", async (ev) => {
        ev.preventDefault();
        const order = ev.currentTarget?.dataset?.order;
        if (!order || !this.actor) return;
        await EnhancedCommander.issueOrder(this.actor, order);
      }, { signal });
    }

    /* ---- TURN CONTROLLER ---- */

    const advancePhaseBtn = root.querySelector('[data-action="advance-phase"]');
    if (advancePhaseBtn) {
      advancePhaseBtn.addEventListener("click", async (ev) => {
        ev.preventDefault();
        if (!this.actor) return;
        await VehicleTurnController.advancePhase(this.actor);
      }, { signal });
    }

    const resetTurnBtn = root.querySelector('[data-action="reset-turn"]');
    if (resetTurnBtn) {
      resetTurnBtn.addEventListener("click", async (ev) => {
        ev.preventDefault();
        if (!this.actor) return;
        await VehicleTurnController.startTurn(this.actor);
      }, { signal });
    }

    /* ---- STARSHIP MANEUVERS ---- */

    for (const btn of root.querySelectorAll('[data-action="useManeuver"]')) {
      btn.addEventListener("click", async (ev) => {
        ev.preventDefault();
        const itemId = ev.currentTarget?.dataset?.itemId ?? ev.currentTarget?.dataset?.weaponId;
        if (!itemId || !this.actor) return;
        const item = this.actor.items?.get(itemId);
        if (!item) return;
        await ActorEngine.updateActor(this.actor, { [`items.${itemId}.system.spent`]: true });
      }, { signal });
    }

    for (const btn of root.querySelectorAll('[data-action="regainManeuver"]')) {
      btn.addEventListener("click", async (ev) => {
        ev.preventDefault();
        const itemId = ev.currentTarget?.dataset?.itemId ?? ev.currentTarget?.dataset?.weaponId;
        if (!itemId || !this.actor) return;
        const item = this.actor.items?.get(itemId);
        if (!item) return;
        await ActorEngine.updateActor(this.actor, { [`items.${itemId}.system.spent`]: false });
      }, { signal });
    }

    /* ---- DRAG & DROP VISUAL FEEDBACK ---- */

    try {
      DropService.bindDragFeedback(root);
    } catch (err) {
      console.error("Error binding drag feedback:", err);
    }

    /* ---- DRAG & DROP HANDLING — V2 CANONICAL PATH ---- */
    // Bind dragover to allow drop events to fire (default browser behavior prevents drops)
    root.addEventListener("dragover", (e) => {
      e.preventDefault();
    });

    // Bind drop event to authoritative _onDrop handler
    // This routes drops through appropriate engine for unified item/actor handling
    root.addEventListener("drop", (e) => {
      this._onDrop(e);
    });

    RenderAssertions.assertRenderComplete(
      this,
      "SWSEV2VehicleSheet"
    );
  }

  /* -------- -------- -------- -------- -------- -------- -------- -------- */
  /* DRAG & DROP HANDLING                                                     */
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

    // SPECIAL VEHICLE HANDLING:
    // Vehicle-to-vehicle: show modal for hangar vs adopt
    if (droppedDocument && droppedDocument.documentName === 'Actor' && droppedDocument.type === 'vehicle') {
      return this._handleVehicleAdoption(droppedDocument);
    }

    // Regular drops (items, non-vehicle actors)
    const result = await VehicleDropEngine.resolve({
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

  /**
   * Handle vehicle-to-vehicle drop: show modal for hangar vs adopt
   *
   * @private
   * @param {Actor} droppedVehicle
   */
  async _handleVehicleAdoption(droppedVehicle) {
    if (!game.user.isGM) {
      ui?.notifications?.warn?.('Only GMs can manage vehicle hangar');
      return;
    }

    new AdoptOrAddDialog(droppedVehicle, async (choice) => {
      if (choice === "add") {
        // TODO: Implement add to hangar (store as reference in system.hangar array)
        ui?.notifications?.info?.('Add to hangar (not yet implemented)');
      } else if (choice === "adopt") {
        await this._adoptVehicle(droppedVehicle);
      }
    }).render(true);
  }

  /**
   * Adopt vehicle stat block
   *
   * @private
   * @param {Actor} sourceVehicle
   */
  async _adoptVehicle(sourceVehicle) {
    const mutationPlan = AdoptionEngine.buildAdoptionPlan({
      targetActor: this.actor,
      sourceActor: sourceVehicle
    });

    if (!mutationPlan) {
      ui?.notifications?.warn?.(`Cannot adopt from ${sourceVehicle.name}`);
      return;
    }

    try {
      await ActorEngine.apply(this.actor, mutationPlan);
      ui?.notifications?.info?.(`${this.actor.name} adopted stat block from ${sourceVehicle.name}`);
    } catch (err) {
      console.error('Vehicle adoption failed:', err);
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

  async _onSubmitForm(event) {
    event.preventDefault();

    const form = event.target;
    const formData = new FormData(form);
    const formDataObj = Object.fromEntries(formData.entries());
    const expanded = foundry.utils.expandObject(formDataObj);

    if (!expanded) return;

    try {
      // Route directly through governance layer
      await ActorEngine.updateActor(this.actor, expanded);
    } catch (err) {
      console.error('Sheet submission failed:', err);
      ui.notifications.error(`Failed to update actor: ${err.message}`);
    }
  }
}
