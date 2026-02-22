// scripts/sheets/v2/vehicle-sheet.js

const { HandlebarsApplicationMixin, DocumentSheetV2 } = foundry.applications.api;

import { ActorEngine } from '../../actors/engine/actor-engine.js';
import { RenderAssertions } from '../../core/render-assertions.js';
import { initiateItemSale } from '../../apps/item-selling-system.js';
import { SWSELevelUp } from '../../apps/swse-levelup.js';
import { rollAttack } from '../../combat/rolls/attacks.js';
import { DropService } from '../../services/drop-service.js';
import { SubsystemEngine } from '../../engine/combat/starship/subsystem-engine.js';
import { EnhancedShields } from '../../engine/combat/starship/enhanced-shields.js';
import { EnhancedEngineer } from '../../engine/combat/starship/enhanced-engineer.js';
import { EnhancedPilot } from '../../engine/combat/starship/enhanced-pilot.js';
import { EnhancedCommander } from '../../engine/combat/starship/enhanced-commander.js';
import { VehicleTurnController } from '../../engine/combat/starship/vehicle-turn-controller.js';
import { StarshipManeuversEngine } from '../../engine/StarshipManeuversEngine.js';

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

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["swse", "swse-app", "swse-sheet", "swse-vehicle-sheet", "v2"],
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

    if (actor.type !== "vehicle") {
      throw new Error(
        `SWSEV2VehicleSheet requires actor type "vehicle", got "${actor.type}"`
      );
    }

    RenderAssertions.assertActorValid(actor, "SWSEV2VehicleSheet");

    const baseContext = await super._prepareContext(options);

    // DATAPAD HEADER: HP state
    const currentHp = actor.system?.hp?.value ?? 0;
    const maxHp = actor.system?.hp?.max ?? 1;
    const hpPercent = Math.max(0, Math.min(100, (currentHp / maxHp) * 100));
    const hpWarning = hpPercent <= 50 && hpPercent > 25;
    const hpCritical = hpPercent <= 25;

    // Condition Track state
    const conditionStep = actor.system?.conditionTrack?.current ?? 0;
    const ctWarning = conditionStep > 0;

    // Build owned actors map (crew members)
    const ownedActorMap = {};
    for (const entry of actor.system.ownedActors || []) {
      const ownedActor = game.actors.get(entry.id);
      if (ownedActor) {
        ownedActorMap[entry.id] = ownedActor;
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

    // Engine states for template
    const subsystemsEnabled = SubsystemEngine.enabled;
    const enhancedShieldsEnabled = EnhancedShields.enabled;
    const enhancedEngineerEnabled = EnhancedEngineer.enabled;
    const enhancedPilotEnabled = EnhancedPilot.enabled;
    const enhancedCommanderEnabled = EnhancedCommander.enabled;
    const turnControllerEnabled = VehicleTurnController.enabled;

    const subsystems = subsystemsEnabled ? SubsystemEngine.getSubsystems(actor) : null;
    const subsystemPenalties = subsystemsEnabled ? SubsystemEngine.getAggregatePenalties(actor) : null;
    const shieldZones = enhancedShieldsEnabled ? (actor.system.enhancedShields ?? {}) : null;
    const powerAllocation = enhancedEngineerEnabled ? (actor.system.powerAllocation ?? {}) : null;
    const pilotManeuver = enhancedPilotEnabled ? (actor.system.pilotManeuver ?? 'none') : null;
    const commanderOrder = enhancedCommanderEnabled ? (actor.system.commanderOrder ?? 'none') : null;
    const turnState = turnControllerEnabled ? (actor.system.turnState ?? {}) : null;
    const turnPhases = turnControllerEnabled
      ? ['commander', 'pilot', 'engineer', 'shields', 'gunner', 'cleanup'].map(p => ({
        name: p,
        active: turnState?.currentPhase === p
      }))
      : null;

    // Cargo weight calculation
    const cargoCapacity = actor.system?.cargo?.capacity ?? 500;
    let totalCargoWeight = 0;
    const cargoItems = actor.items.filter(item => item.type === "equipment");
    for (const item of cargoItems) {
      const weight = item.system?.weight ?? 0;
      const quantity = item.system?.quantity ?? 1;
      totalCargoWeight += weight * quantity;
    }
    const cargoState = totalCargoWeight > cargoCapacity * 1.1 ? 'over' : totalCargoWeight > cargoCapacity * 0.8 ? 'near' : 'normal';

    // Starship Maneuvers (for pilot/crew crew positions)
    const starshipManeuvers = StarshipManeuversEngine.getManeuversForActor(actor);

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
      equipment,
      weapons,
      ownedActorMap,
      editable: this.isEditable,
      user: {
        id: game.user.id,
        name: game.user.name,
        role: game.user.role
      },
      config: CONFIG.SWSE,
      // DATAPAD HEADER STATES
      hpPercent,
      hpWarning,
      hpCritical,
      ctWarning,
      // CARGO SYSTEM
      cargoCapacity: Math.round(cargoCapacity * 100) / 100,
      totalCargoWeight: Math.round(totalCargoWeight * 100) / 100,
      cargoState,
      // Starship engine states
      engines: {
        subsystemsEnabled,
        enhancedShieldsEnabled,
        enhancedEngineerEnabled,
        enhancedPilotEnabled,
        enhancedCommanderEnabled,
        turnControllerEnabled,
        subsystems,
        subsystemPenalties,
        shieldZones,
        powerAllocation,
        pilotManeuver,
        commanderOrder,
        turnState,
        turnPhases,
        powerBudget: enhancedEngineerEnabled ? EnhancedEngineer.getPowerBudget(actor) : 0
      },
      // Starship Maneuvers
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

    const root = this.element;
    if (!(root instanceof HTMLElement)) {
      throw new Error("VehicleSheet: element not HTMLElement");
    }

    if (root.dataset.bound === "true") return;
    root.dataset.bound = "true";

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
        });
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
        });
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

    /* ---- CREW MANAGEMENT ---- */

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

    /* ---------------- PROGRESSION BUTTONS (VEHICLE-SPECIFIC) ---------------- */

    const levelUpBtn = root.querySelector('[data-action="level-up"]');
    if (levelUpBtn) {
      levelUpBtn.addEventListener("click", async (ev) => {
        ev.preventDefault();
        if (this.actor) {
          await SWSELevelUp.openEnhanced(this.actor);
        }
      });
    }

    /* ---- SUBSYSTEM REPAIR ---- */

    for (const btn of root.querySelectorAll('[data-action="repair-subsystem"]')) {
      btn.addEventListener("click", async (ev) => {
        ev.preventDefault();
        const subsystem = ev.currentTarget?.dataset?.subsystem;
        if (!subsystem || !this.actor) return;
        await SubsystemEngine.repairSubsystem(this.actor, subsystem);
      });
    }

    /* ---- ENHANCED SHIELDS ---- */

    for (const btn of root.querySelectorAll('[data-action="shield-focus"]')) {
      btn.addEventListener("click", async (ev) => {
        ev.preventDefault();
        const zone = ev.currentTarget?.dataset?.zone;
        if (!zone || !this.actor) return;
        await EnhancedShields.focusShields(this.actor, zone);
      });
    }

    const equalizeBtn = root.querySelector('[data-action="shield-equalize"]');
    if (equalizeBtn) {
      equalizeBtn.addEventListener("click", async (ev) => {
        ev.preventDefault();
        if (!this.actor) return;
        await EnhancedShields.equalizeShields(this.actor);
      });
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
      });
    }

    /* ---- PILOT MANEUVER ---- */

    for (const btn of root.querySelectorAll('[data-action="set-maneuver"]')) {
      btn.addEventListener("click", async (ev) => {
        ev.preventDefault();
        const maneuver = ev.currentTarget?.dataset?.maneuver;
        if (!maneuver || !this.actor) return;
        await EnhancedPilot.setManeuver(this.actor, maneuver);
      });
    }

    /* ---- COMMANDER ORDER ---- */

    for (const btn of root.querySelectorAll('[data-action="set-order"]')) {
      btn.addEventListener("click", async (ev) => {
        ev.preventDefault();
        const order = ev.currentTarget?.dataset?.order;
        if (!order || !this.actor) return;
        await EnhancedCommander.issueOrder(this.actor, order);
      });
    }

    /* ---- TURN CONTROLLER ---- */

    const advancePhaseBtn = root.querySelector('[data-action="advance-phase"]');
    if (advancePhaseBtn) {
      advancePhaseBtn.addEventListener("click", async (ev) => {
        ev.preventDefault();
        if (!this.actor) return;
        await VehicleTurnController.advancePhase(this.actor);
      });
    }

    const resetTurnBtn = root.querySelector('[data-action="reset-turn"]');
    if (resetTurnBtn) {
      resetTurnBtn.addEventListener("click", async (ev) => {
        ev.preventDefault();
        if (!this.actor) return;
        await VehicleTurnController.startTurn(this.actor);
      });
    }

    /* ---- STARSHIP MANEUVERS ---- */

    for (const btn of root.querySelectorAll('[data-action="useManeuver"]')) {
      btn.addEventListener("click", async (ev) => {
        ev.preventDefault();
        const itemId = ev.currentTarget?.dataset?.itemId;
        if (!itemId || !this.actor) return;
        const item = this.actor.items?.get(itemId);
        if (!item) return;
        await ActorEngine.updateActor(this.actor, { [`items.${itemId}.system.spent`]: true });
      });
    }

    for (const btn of root.querySelectorAll('[data-action="regainManeuver"]')) {
      btn.addEventListener("click", async (ev) => {
        ev.preventDefault();
        const itemId = ev.currentTarget?.dataset?.itemId;
        if (!itemId || !this.actor) return;
        const item = this.actor.items?.get(itemId);
        if (!item) return;
        await ActorEngine.updateActor(this.actor, { [`items.${itemId}.system.spent`]: false });
      });
    }

    /* ---- DRAG & DROP VISUAL FEEDBACK ---- */

    try {
      DropService.bindDragFeedback(root);
    } catch (err) {
      console.error("Error binding drag feedback:", err);
    }

    RenderAssertions.assertRenderComplete(
      this,
      "SWSEV2VehicleSheet"
    );
  }

  /* -------- -------- -------- -------- -------- -------- -------- -------- */
  /* DRAG & DROP HANDLING                                                     */
  /* -------- -------- -------- -------- -------- -------- -------- -------- */

  async _onDrop(event) {
    return DropService.onDrop(event, this);
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
