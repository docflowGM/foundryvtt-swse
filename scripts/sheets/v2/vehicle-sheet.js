// scripts/sheets/v2/vehicle-sheet.js

const { HandlebarsApplicationMixin } = foundry.applications.api;

import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { DropService } from "/systems/foundryvtt-swse/scripts/services/drop-service.js";
import { RenderAssertions } from "/systems/foundryvtt-swse/scripts/core/render-assertions.js";
import { initiateItemSale } from "/systems/foundryvtt-swse/scripts/apps/item-selling-system.js";
import { launchProgression } from "/systems/foundryvtt-swse/scripts/apps/progression-framework/progression-entry.js";
import { rollAttack } from "/systems/foundryvtt-swse/scripts/combat/rolls/attacks.js";
import { SWSERoll } from "/systems/foundryvtt-swse/scripts/combat/rolls/enhanced-rolls.js";
import { VehicleDropEngine } from "/systems/foundryvtt-swse/scripts/engine/interactions/vehicle-drop-engine.js";
import { VehicleCrewAssignmentService } from "/systems/foundryvtt-swse/scripts/engine/crew/vehicle-crew-assignment-service.js";
import { AdoptionEngine } from "/systems/foundryvtt-swse/scripts/engine/interactions/adoption-engine.js";
import { AdoptOrAddDialog } from "/systems/foundryvtt-swse/scripts/apps/adopt-or-add-dialog.js";
import { StarshipManeuversEngine } from "/systems/foundryvtt-swse/scripts/engine/StarshipManeuversEngine.js";
import { computeCenteredPosition, getApplicationTargetSize } from "/systems/foundryvtt-swse/scripts/utils/sheet-position.js";
// PHASE 1: Import prepared context builders instead of direct engine access
import { buildVehicleSheetContext, parseCargoString } from "/systems/foundryvtt-swse/scripts/sheets/v2/vehicle-sheet/vehicle-context-builder.js";
import { VehicleRulesAdapter } from "/systems/foundryvtt-swse/scripts/sheets/v2/vehicle-sheet/vehicle-rules-adapter.js";
import { SubsystemEngine } from "/systems/foundryvtt-swse/scripts/engine/combat/starship/subsystem-engine.js";
import { EnhancedShields } from "/systems/foundryvtt-swse/scripts/engine/combat/starship/enhanced-shields.js";
import { EnhancedEngineer } from "/systems/foundryvtt-swse/scripts/engine/combat/starship/enhanced-engineer.js";
import { EnhancedPilot } from "/systems/foundryvtt-swse/scripts/engine/combat/starship/enhanced-pilot.js";
import { EnhancedCommander } from "/systems/foundryvtt-swse/scripts/engine/combat/starship/enhanced-commander.js";
import { VehicleTurnController } from "/systems/foundryvtt-swse/scripts/engine/combat/starship/vehicle-turn-controller.js";
import { HouseRuleService } from "/systems/foundryvtt-swse/scripts/engine/system/HouseRuleService.js";
import { VehicleImportWizard } from "/systems/foundryvtt-swse/scripts/apps/vehicle-import-wizard.js";
import { rollVehicleCrewSkill } from "/systems/foundryvtt-swse/scripts/sheets/v2/vehicle-sheet/crew-skill-router.js";
import { ShellHostMixin } from "/systems/foundryvtt-swse/scripts/ui/shell/ShellHost.js";
import { ShellUiStatePreserver } from "/systems/foundryvtt-swse/scripts/ui/shell/ShellUiStatePreserver.js";

const VEHICLE_SHEET_WRITABLE_EXACT_PATHS = new Set([
  'name',
  'img',
  'system.model',
  'system.category',
  'system.type',
  'system.size',
  'system.challengeLevel',
  'system.cost',
  'system.availability',
  'system.hull.value',
  'system.hull.max',
  'system.shields.value',
  'system.shields.max',
  'system.shieldRating',
  'system.damageReduction',
  'system.reflexDefense',
  'system.fortitudeDefense',
  'system.willDefense',
  'system.flatFooted',
  'system.damageThreshold',
  'system.armorBonus',
  'system.speed',
  'system.maxVelocity',
  'system.maneuver',
  'system.initiative',
  'system.baseAttackBonus',
  'system.hyperdrive',
  'system.hyperdrive_class',
  'system.backupHyperdrive',
  'system.backup_class',
  'system.crew',
  'system.crewQuality',
  'system.passengers',
  'system.cargo',
  'system.payload',
  'system.cover',
  'system.notes',
  'system.description',
  'system.details.notes'
]);

const VEHICLE_SHEET_WRITABLE_PATTERNS = [
  /^system\.weapons\.\d+\.(name|arc|bonus|attackBonus|damage|range|fireControl|notes)$/,
  /^system\.attributes\.(str|dex|int|wis|cha)\.(base|racial|temp)$/
];


const VEHICLE_QUIET_FIELD_PATHS = new Set([
  'name',
  'img',
  'system.model',
  'system.category',
  'system.type',
  'system.size',
  'system.challengeLevel',
  'system.cost',
  'system.availability',
  'system.crew',
  'system.crewQuality',
  'system.passengers',
  'system.cargo',
  'system.payload',
  'system.cover',
  'system.notes',
  'system.description',
  'system.details.notes'
]);

function isQuietVehicleSheetPath(path) {
  if (!path || typeof path !== 'string') return false;
  if (VEHICLE_QUIET_FIELD_PATHS.has(path)) return true;
  return path.startsWith('system.notes.')
    || path.startsWith('system.description.')
    || path.startsWith('system.details.notes.');
}

function isQuietVehicleSheetUpdate(flatUpdateData) {
  const entries = Object.entries(flatUpdateData || {});
  return entries.length > 0 && entries.every(([path]) => isQuietVehicleSheetPath(path));
}

const VEHICLE_SHEET_BLOCKED_PREFIXES = [
  'items.',
  'system.derived.',
  'system.vehiclePanels.',
  'system.houseRuleContexts.',
  'system.actionEconomy.',
  'system.subsystems.',
  'system.power.',
  'system.powerRouting.',
  'system.shieldZones.',
  'system.turnState.',
  'system.customization.',
  'system.shipyard.'
];

function isVehicleSheetWritablePath(path) {
  if (!path || typeof path !== 'string') return false;
  if (VEHICLE_SHEET_BLOCKED_PREFIXES.some(prefix => path.startsWith(prefix))) return false;
  if (VEHICLE_SHEET_WRITABLE_EXACT_PATHS.has(path)) return true;
  return VEHICLE_SHEET_WRITABLE_PATTERNS.some(pattern => pattern.test(path));
}


function numericBonus(value, fallback = 0) {
  if (value === null || value === undefined || value === '') return fallback;
  const n = Number(String(value).replace(/[^0-9+\-.]/g, ''));
  return Number.isFinite(n) ? n : fallback;
}

function signedBonus(value, fallback = '+0') {
  const n = numericBonus(value, null);
  if (n === null) return fallback;
  return n >= 0 ? `+${n}` : `${n}`;
}

function formulaWithBonus(baseDie, bonus) {
  const n = numericBonus(bonus, 0);
  if (!n) return baseDie;
  return `${baseDie} ${n >= 0 ? '+' : '-'} ${Math.abs(n)}`;
}

function getSystemVehicleWeapon(actor, weaponId) {
  const match = String(weaponId || '').match(/^system-weapons-(\d+)$/);
  if (!match) return null;
  const index = Number(match[1]);
  const weapon = actor?.system?.weapons?.[index];
  if (!weapon) return null;
  return { ...weapon, id: weaponId, _systemWeaponIndex: index };
}

function getVehicleWeaponForAction(actor, weaponId) {
  if (!actor || !weaponId) return null;
  const item = actor.items?.get?.(weaponId);
  if (item) {
    const system = item.system ?? {};
    return {
      id: item.id,
      name: item.name,
      bonus: system.bonus ?? system.attackBonus ?? system.attack?.bonus ?? system.combat?.attack?.bonus ?? '+0',
      damage: system.damage ?? system.damageFormula ?? system.combat?.damage?.dice ?? '1d10',
      range: system.range ?? system.rangeProfile ?? '',
      source: 'item'
    };
  }
  return getSystemVehicleWeapon(actor, weaponId);
}

async function rollVehicleStatblockAttack(actor, weapon) {
  const bonus = signedBonus(weapon?.bonus ?? weapon?.attackBonus ?? '+0');
  const formula = formulaWithBonus('1d20', bonus);
  const roll = await (globalThis.SWSE?.RollEngine?.safeRoll?.(formula) ?? new Roll(formula).evaluate());
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    flavor: `${actor.name} fires ${weapon?.name || 'Vehicle Weapon'} (${bonus})`,
    rolls: [roll]
  });
  return roll;
}

async function rollVehicleStatblockDamage(actor, weapon) {
  const formula = String(weapon?.damage ?? weapon?.damageFormula ?? '1d10').trim() || '1d10';
  const roll = await (globalThis.SWSE?.RollEngine?.safeRoll?.(formula) ?? new Roll(formula).evaluate());
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    flavor: `${actor.name} damage: ${weapon?.name || 'Vehicle Weapon'} (${formula})`,
    rolls: [roll]
  });
  return roll;
}


async function resolveVehicleSourceModelName(actor) {
  const explicit = String(actor?.system?.model || actor?.system?.vehicleModel || '').trim();
  if (explicit) return explicit;

  const sourceUuid = actor?._stats?.compendiumSource || actor?.flags?.core?.sourceId || actor?.flags?.['foundryvtt-swse']?.sourceUuid || '';
  if (!sourceUuid || typeof sourceUuid !== 'string') return '';

  try {
    const doc = await fromUuid(sourceUuid);
    if (doc?.name) return doc.name;
  } catch (_err) {
    // Fall through to manual compendium source parsing below.
  }

  const match = sourceUuid.match(/^Compendium\.([^.]+)\.([^.]+)\.(?:Actor\.)?([^.]+)$/);
  if (!match) return '';
  try {
    const pack = game.packs?.get?.(`${match[1]}.${match[2]}`);
    const doc = await pack?.getDocument?.(match[3]);
    return doc?.name || '';
  } catch (_err) {
    return '';
  }
}

function filterVehicleSheetUpdate(formDataObj) {
  const allowed = {};
  for (const [path, value] of Object.entries(formDataObj || {})) {
    if (isVehicleSheetWritablePath(path)) allowed[path] = value;
  }
  return allowed;
}

export class SWSEV2VehicleSheet extends
  ShellHostMixin(HandlebarsApplicationMixin(foundry.applications.sheets.ActorSheetV2)) {

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
      resizable: true,
      draggable: true,
      frame: false
    },
    form: {
      closeOnSubmit: false,
      submitOnChange: false
    },
    // The shared holopad shell owns the window frame. Vehicle tabs are wired
    // by this sheet so Foundry does not try to bind classic framed tabs inside
    // the frameless tablet surface.
    tabs: []
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
    // Vehicles are first-class datapad actors: open to Holopad Home first,
    // then launch Vehicle Sheet / Shipyard / stations inside the shared shell.
    this._shellSurface = 'home';
    this._shellSurfaceOptions = {};
    ShellUiStatePreserver.install(this);
  }

  render(...args) {
    this._shellUiStatePreserver?.capture?.(this.element, { surfaceId: this._shellSurface });
    return super.render(...args);
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
    const parsedCargoCapacity = parseCargoString(actor.system?.cargo);
    const cargoCapacity = parsedCargoCapacity.kilograms ?? 0;
    let totalCargoWeight = 0;
    const cargoItems = actor.items.filter(item => item.type === "equipment");
    for (const item of cargoItems) {
      const weight = Number(item.system?.weight ?? 0) || 0;
      const quantity = Number(item.system?.quantity ?? 1) || 1;
      totalCargoWeight += weight * quantity;
    }
    const cargoState = cargoCapacity > 0
      ? totalCargoWeight > cargoCapacity * 1.1 ? 'over' : totalCargoWeight > cargoCapacity * 0.8 ? 'near' : 'normal'
      : 'unknown';

    // ════════════════════════════════════════════════════════════════════════════
    // PHASE 1: Build all house rule contexts through adapter (no direct reads)
    // ════════════════════════════════════════════════════════════════════════════
    const ruleContexts = VehicleRulesAdapter.buildAllRuleContexts(actor);

    // ════════════════════════════════════════════════════════════════════════════
    // PHASE 3: Build prepared panel contexts for template rendering
    // ════════════════════════════════════════════════════════════════════════════
    const sourceModelName = await resolveVehicleSourceModelName(actor);
    const panelContext = buildVehicleSheetContext(actor, baseContext, {
      sourceModelName,
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

    // Action Economy Context (for combat tab)
    let actionEconomy = null;
    if (game.combat && game.combat.combatants.some(c => c.actor?.id === actor.id)) {
      // Only show action economy if actor is in active combat
      const combatId = game.combat.id;
      const { ActionEconomyPersistence } = await import("/systems/foundryvtt-swse/scripts/engine/combat/action/action-economy-persistence.js");
      const { ActionEngine } = await import("/systems/foundryvtt-swse/scripts/engine/combat/action/action-engine-v2.js");

      const turnState = ActionEconomyPersistence.getTurnState(actor, combatId);
      const state = ActionEngine.getVisualState(turnState);
      const breakdown = ActionEngine.getTooltipBreakdown(turnState);
      const enforcementMode = HouseRuleService.getString('actionEconomyMode', 'loose');

      actionEconomy = {
        state,
        breakdown,
        enforcementMode
      };
    }

    // Starship Maneuvers (for pilot/crew positions)
    const starshipManeuvers = StarshipManeuversEngine.getManeuversForActor(actor);

    const overrides = {
      actionEconomy,
      sheetTheme: actor.getFlag?.("foundryvtt-swse", "sheetTheme") ?? "default",
      sheetMotionStyle: actor.getFlag?.("foundryvtt-swse", "sheetMotionStyle") ?? "normal",
      sheetSurfaceStyleInline: "",
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
   * Post-render hook. Actor/system data must remain context-owned; this method
   * only wires event listeners and updates transient shell/tab chrome state.
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

    // Restore scroll, focus, and form-control values preserved before this render.
    this._shellUiStatePreserver?.restore?.(this.element, { surfaceId: this._shellSurface });

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

    this._wireVehicleShellChromeEvents(root, signal);

    this._activateVehicleTab(root, this._requestedVehicleTab());

    /* ---------------- TAB HANDLING ---------------- */

    try {
      for (const tabBtn of root.querySelectorAll(".sheet-tabs .item")) {
        tabBtn.addEventListener("click", (ev) => {
          try {
            const tabName = ev.currentTarget.dataset.tab;
            if (!tabName) return;

            this._activateVehicleTab(root, tabName);
          } catch (err) {
            console.error("Error handling tab click:", err);
          }
        }, { signal });
      }
    } catch (err) {
      console.error("Error binding tab handlers:", err);
    }

    this._wireConceptAbilityPanelControls(root, signal);

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

        await ActorEngine.updateActor(this.document, {
          "system.credits": currentCredits + price
        }, { source: 'vehicle-sheet-sell-item' });

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
        await ActorEngine.updateActor(this.document, { "system.ownedActors": owned }, { source: 'vehicle-sheet-owned-actors' });
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
          await launchProgression(this.actor, { source: "sheet.level-up" });
        }
      }, { signal });
    }

    /* ---- SUBSYSTEM REPAIR ---- */

    for (const btn of root.querySelectorAll('[data-action="repair-subsystem"]')) {
      btn.addEventListener("click", async (ev) => {
        ev.preventDefault();
        const subsystem = ev.currentTarget?.dataset?.subsystem;
        if (!subsystem || !this.actor) return;
        const repaired = await SubsystemEngine.repairSubsystem(this.actor, subsystem);
        if (!repaired) ui?.notifications?.info?.('No field repair was applied to that subsystem.');
      }, { signal });
    }

    /* ---- ENHANCED SHIELDS ---- */

    for (const btn of root.querySelectorAll('[data-action="shield-focus"]')) {
      btn.addEventListener("click", async (ev) => {
        ev.preventDefault();
        const zone = ev.currentTarget?.dataset?.zone;
        if (!zone || !this.actor) return;
        const changed = await EnhancedShields.focusShields(this.actor, zone);
        if (!changed) ui?.notifications?.warn?.('Enhanced Shields is disabled or that shield focus could not be applied.');
      }, { signal });
    }

    const equalizeBtn = root.querySelector('[data-action="shield-equalize"]');
    if (equalizeBtn) {
      equalizeBtn.addEventListener("click", async (ev) => {
        ev.preventDefault();
        if (!this.actor) return;
        const changed = await EnhancedShields.equalizeShields(this.actor);
        if (!changed) ui?.notifications?.warn?.('Enhanced Shields is disabled or shields could not be equalized.');
      }, { signal });
    }

    /* ---- POWER ALLOCATION ---- */

    for (const btn of root.querySelectorAll('[data-action="power-adjust"]')) {
      btn.addEventListener("click", async (ev) => {
        ev.preventDefault();
        const system = ev.currentTarget?.dataset?.system;
        const direction = ev.currentTarget?.dataset?.direction;
        if (!system || !direction || !this.actor) return;

        const allocation = EnhancedEngineer.getPowerAllocation(this.actor);
        const current = allocation?.[system] ?? 2;
        allocation[system] = direction === 'up'
          ? Math.min(4, current + 1)
          : Math.max(0, current - 1);

        const changed = await EnhancedEngineer.allocatePower(this.actor, allocation);
        if (!changed) ui?.notifications?.warn?.('Enhanced Engineer is disabled or that power allocation is invalid.');
      }, { signal });
    }

    /* ---- PILOT MANEUVER ---- */

    for (const btn of root.querySelectorAll('[data-action="set-maneuver"]')) {
      btn.addEventListener("click", async (ev) => {
        ev.preventDefault();
        const maneuver = ev.currentTarget?.dataset?.maneuver;
        if (!maneuver || !this.actor) return;
        const changed = await EnhancedPilot.setManeuver(this.actor, maneuver);
        if (!changed) ui?.notifications?.warn?.('Enhanced Pilot is disabled or that maneuver could not be set.');
      }, { signal });
    }

    /* ---- COMMANDER ORDER ---- */

    for (const btn of root.querySelectorAll('[data-action="set-order"]')) {
      btn.addEventListener("click", async (ev) => {
        ev.preventDefault();
        const order = ev.currentTarget?.dataset?.order;
        if (!order || !this.actor) return;
        const changed = await EnhancedCommander.issueOrder(this.actor, order);
        if (!changed) ui?.notifications?.warn?.('Enhanced Commander is disabled or that order could not be issued.');
      }, { signal });
    }

    /* ---- TURN CONTROLLER ---- */

    const advancePhaseBtn = root.querySelector('[data-action="advance-phase"]');
    if (advancePhaseBtn) {
      advancePhaseBtn.addEventListener("click", async (ev) => {
        ev.preventDefault();
        if (!this.actor) return;
        const changed = await VehicleTurnController.advancePhase(this.actor);
        if (changed === null) ui?.notifications?.info?.('Vehicle turn phase did not advance. Turn controller may be disabled or the turn may be complete.');
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
        if (!this.actor) return;
        const ref = {
          itemId: ev.currentTarget?.dataset?.itemId ?? null,
          actorId: ev.currentTarget?.dataset?.actorId ?? null,
          uuid: ev.currentTarget?.dataset?.itemUuid ?? null
        };
        await StarshipManeuversEngine.useManeuver(this.actor, ref);
        await this.render();
      }, { signal });
    }

    for (const btn of root.querySelectorAll('[data-action="regainManeuver"]')) {
      btn.addEventListener("click", async (ev) => {
        ev.preventDefault();
        if (!this.actor) return;
        const ref = {
          itemId: ev.currentTarget?.dataset?.itemId ?? null,
          actorId: ev.currentTarget?.dataset?.actorId ?? null,
          uuid: ev.currentTarget?.dataset?.itemUuid ?? null
        };
        await StarshipManeuversEngine.regainManeuver(this.actor, ref);
        await this.render();
      }, { signal });
    }

    /* ---- CREW ASSIGNMENT ---- */

    for (const btn of root.querySelectorAll('[data-action="vehicle-assign-crew"]')) {
      btn.addEventListener("click", async (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const station = ev.currentTarget?.dataset?.station;
        if (!station || !this.actor) return;
        await VehicleCrewAssignmentService.openCrewPicker(this.actor, station);
        await this.render();
      }, { signal });
    }

    for (const btn of root.querySelectorAll('[data-action="vehicle-remove-crew"]')) {
      btn.addEventListener("click", async (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const station = ev.currentTarget?.dataset?.station;
        if (!station || !this.actor) return;
        await VehicleCrewAssignmentService.removeCrew(this.actor, station, { source: 'vehicle-sheet-remove-crew' });
        await this.render();
      }, { signal });
    }

    for (const btn of root.querySelectorAll('[data-action="vehicle-open-crew"]')) {
      btn.addEventListener("click", async (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const station = ev.currentTarget?.dataset?.station;
        if (!station || !this.actor) return;
        await VehicleCrewAssignmentService.openCrewSheet(this.actor, station);
      }, { signal });
    }

    for (const stationRow of root.querySelectorAll('[data-drop-zone="crew-station"][data-crew-station]')) {
      stationRow.addEventListener("dragover", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        stationRow.classList.add('swse-vehicle-station-row--drop-hover');
      }, { signal });
      stationRow.addEventListener("dragleave", () => {
        stationRow.classList.remove('swse-vehicle-station-row--drop-hover');
      }, { signal });
      stationRow.addEventListener("drop", async (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        ev.stopImmediatePropagation?.();
        stationRow.classList.remove('swse-vehicle-station-row--drop-hover');
        await this._handleCrewStationDrop(ev, stationRow.dataset.crewStation);
      }, { signal, capture: true });
    }

    /* ---- CREW STATION SKILLS ---- */

    for (const btn of root.querySelectorAll('[data-action="vehicle-crew-skill"]')) {
      btn.addEventListener("click", async (ev) => {
        ev.preventDefault();
        const station = ev.currentTarget?.dataset?.station;
        const skill = ev.currentTarget?.dataset?.skill;
        const weaponId = ev.currentTarget?.dataset?.weaponId;
        if (!station || !skill || !this.actor) return;
        await rollVehicleCrewSkill(this.actor, station, skill, {
          weaponId,
          skillUse: ev.currentTarget?.dataset?.use || undefined,
          skillLabel: ev.currentTarget?.dataset?.label || undefined
        });
      }, { signal });
    }

    /* ---- VEHICLE WEAPON ROLLS ---- */

    for (const btn of root.querySelectorAll('[data-action="vehicle-weapon-attack"]')) {
      btn.addEventListener("click", async (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const weaponId = ev.currentTarget?.dataset?.weaponId;
        const weapon = getVehicleWeaponForAction(this.actor, weaponId);
        if (!weapon) {
          ui?.notifications?.warn?.('No vehicle weapon found for this attack.');
          return;
        }
        await rollVehicleStatblockAttack(this.actor, weapon);
      }, { signal });
    }

    for (const btn of root.querySelectorAll('[data-action="vehicle-weapon-damage"]')) {
      btn.addEventListener("click", async (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const weaponId = ev.currentTarget?.dataset?.weaponId;
        const weapon = getVehicleWeaponForAction(this.actor, weaponId);
        if (!weapon) {
          ui?.notifications?.warn?.('No vehicle weapon found for this damage roll.');
          return;
        }
        await rollVehicleStatblockDamage(this.actor, weapon);
      }, { signal });
    }

    /* ---- VEHICLE IMPORT WIZARD ---- */

    for (const btn of root.querySelectorAll('[data-action="import-vehicle"]')) {
      btn.addEventListener("click", async (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        await this._openVehicleImportWizard();
      }, { signal });
    }

    /* ---- VEHICLE CUSTOMIZATION ---- */

    for (const btn of root.querySelectorAll('[data-action="customize-vehicle"]')) {
      btn.addEventListener("click", async (ev) => {
        ev.preventDefault();
        if (!this.actor) return;
        await this.setSurface('customization', {
          source: 'vehicle-sheet',
          bayMode: 'shipyard',
          contextMode: 'modifyExisting'
        });
        await this.requestSurfaceRender({
          reason: 'vehicle-sheet-shipyard-launch',
          surfaceId: 'customization'
        });
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
      if (e.target?.closest?.('[data-drop-zone="crew-station"][data-crew-station]')) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation?.();
      this._onDrop(e);
    }, { signal, capture: true });

    RenderAssertions.assertRenderComplete(
      this,
      "SWSEV2VehicleSheet"
    );
  }

  /* -------- -------- -------- -------- -------- -------- -------- -------- */
  /* DRAG & DROP HANDLING                                                     */
  /* -------- -------- -------- -------- -------- -------- -------- -------- */

  async _handleCrewStationDrop(event, station) {
    if (!this.actor) return;
    const data = VehicleCrewAssignmentService.getDropDataFromEvent(event);
    if (!data) return;

    const crewActor = await VehicleCrewAssignmentService.resolveCrewActorFromDropData(data);
    if (!crewActor) {
      ui?.notifications?.warn?.('Drop a character, NPC, or droid actor onto a crew station.');
      return;
    }

    await VehicleCrewAssignmentService.assignCrew(this.actor, station, crewActor, {
      source: 'vehicle-sheet-crew-drop'
    });
    await this.render();
  }

  async _onDrop(event) {
    event.preventDefault();

    // Extract drag data
    const data = VehicleCrewAssignmentService.getDropDataFromEvent(event);
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

    const targetedStation = event.target?.closest?.('[data-crew-station]')?.dataset?.crewStation
      || event.target?.closest?.('[data-station]')?.dataset?.station
      || null;

    // Regular drops (items, non-vehicle actors)
    const result = await VehicleDropEngine.resolve({
      actor: this.actor,
      dropData: data,
      station: targetedStation
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
        // planned: Implement add to hangar (store as reference in system.hangar array)
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


  _wireConceptAbilityPanelControls(root, signal) {
    if (!(root instanceof HTMLElement)) return;

    root.addEventListener("click", async (ev) => {
      const toggle = ev.target?.closest?.('[data-action="toggle-abilities"]');
      if (toggle) {
        ev.preventDefault();
        const panel = toggle.closest(".abilities-panel");
        if (!panel) return;
        const isExpanded = panel.classList.toggle("abilities-expanded");
        for (const row of panel.querySelectorAll(".ability-row")) {
          const collapsed = row.querySelector(".ability-collapsed");
          const expanded = row.querySelector(".ability-expanded");
          if (collapsed instanceof HTMLElement) collapsed.style.display = isExpanded ? "none" : "flex";
          if (expanded instanceof HTMLElement) expanded.style.display = isExpanded ? (expanded.dataset?.expandedDisplay || "grid") : "none";
        }
        toggle.setAttribute("aria-expanded", String(isExpanded));
        toggle.textContent = isExpanded ? "Collapse" : (toggle.dataset?.collapsedLabel || "Edit Stats");
        return;
      }

      const rollButton = ev.target?.closest?.('[data-action="roll-ability"]');
      if (!rollButton) return;
      ev.preventDefault();
      const abilityKey = rollButton.dataset?.ability;
      if (!abilityKey || abilityKey === 'con') return;

      try {
        await SWSERoll.rollAbility(this.actor, abilityKey, {
          sourceElement: rollButton,
          companionSource: rollButton,
          sheet: this,
          showRollCompanion: true,
          showDialog: true
        });
      } catch (err) {
        console.error("Vehicle ability roll failed:", err);
        ui?.notifications?.error?.(`Ability roll failed: ${err.message}`);
      }
    }, { signal });

    root.addEventListener("input", (ev) => {
      const input = ev.target?.closest?.(".ability-expanded input");
      if (!input) return;
      const row = input.closest(".ability-row");
      if (!row) return;
      this._previewConceptAbilityRow(row);
    }, { signal });
  }

  _previewConceptAbilityRow(row) {
    const read = (field, fallback = 0) => {
      const input = row.querySelector(`input[data-field="${field}"]`);
      const value = Number(input?.value);
      return Number.isFinite(value) ? value : fallback;
    };
    const base = read("base", 10);
    const racial = read("racial", 0);
    const temp = read("temp", 0);
    const total = base + racial + temp;
    const mod = Math.floor((total - 10) / 2);
    const sign = mod > 0 ? `+${mod}` : String(mod);
    row.querySelectorAll(".math-result, .swse-concept-ability-card__score").forEach((el) => { el.textContent = String(total); });
    row.querySelectorAll(".math-mod, .swse-concept-ability-card__mod").forEach((el) => {
      el.textContent = sign;
      el.classList.toggle("mod--positive", mod > 0);
      el.classList.toggle("mod--negative", mod < 0);
      el.classList.toggle("mod--zero", mod === 0);
    });
  }

  async _openVehicleImportWizard() {
    if (!this.actor) return null;
    try {
      return VehicleImportWizard.create({
        actor: this.actor,
        callback: () => this.render({ force: true })
      });
    } catch (err) {
      console.error('[SWSEV2VehicleSheet] Failed to open vehicle import wizard:', err);
      ui?.notifications?.error?.(`Failed to open vehicle import wizard: ${err.message}`);
      return null;
    }
  }


  _requestedVehicleTab() {
    const requested = this._shellSurfaceOptions?.tab || this.shellSurfaceOptions?.tab;
    return typeof requested === 'string' && requested.trim() ? requested.trim() : 'overview';
  }

  _activateVehicleTab(root, tabName = 'overview') {
    if (!(root instanceof HTMLElement)) return;
    const requested = String(tabName || 'overview');
    const hasRequestedTab = [...root.querySelectorAll('.sheet-content .tab')]
      .some(tab => tab.dataset?.tab === requested);
    const target = hasRequestedTab ? requested : 'overview';

    root.querySelectorAll('.sheet-tabs .item').forEach(button => {
      button.classList.toggle('active', button.dataset?.tab === target);
    });

    root.querySelectorAll('.sheet-content .tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset?.tab === target);
    });
  }


  /**
   * Wire vehicle-only tablet chrome events that are not part of the generic
   * ShellHost route/overlay/drawer contract. Generic shell events stay owned
   * by ShellHostMixin.
   *
   * @private
   * @param {HTMLElement} root
   * @param {AbortSignal} signal
   */
  _wireVehicleShellChromeEvents(root, signal) {
    if (!(root instanceof HTMLElement)) return;
    this._shieldTabletWindowControls(root, signal);
    this._wireTabletWindowControlHitboxFallback(root, signal);

    root.querySelectorAll('[data-action="tablet-close"]').forEach(el => {
      el.addEventListener('click', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        this.close();
      }, { signal });
    });

    root.querySelectorAll('[data-action="tablet-minimize"]').forEach(el => {
      el.addEventListener('click', async (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        await this._minimizeTabletWindow?.();
      }, { signal });
    });

    root.querySelectorAll('[data-shell-chrome="top"], [data-action="tablet-drag"], .swse-sheet-v2-shell--concept').forEach(el => {
      el.addEventListener('dblclick', async (ev) => {
        if (ev.target?.closest?.('button, input, select, textarea, a, [contenteditable="true"], [data-route-id], [data-shell-action], [data-shell-window-control], [data-no-drag="true"], .swse-tablet-no-drag, .swse-tablet-hardware-rail, .swse-tablet-top-right-rail')) return;
        const target = ev.target instanceof Element ? ev.target : null;
        if (target?.closest?.('.swse-v2-screen--concept')) return;
        ev.preventDefault();
        ev.stopPropagation();
        await this._minimizeTabletWindow?.();
      }, { signal });
    });

    root.querySelectorAll('[data-action="tablet-home"]').forEach(el => {
      el.addEventListener('click', async (ev) => {
        ev.preventDefault();
        await this.setSurface('home');
        await this.requestSurfaceRender({ reason: 'vehicle-tablet-home', surfaceId: 'home' });
      }, { signal });
    });

    root.querySelectorAll('[data-action="tablet-expand"]').forEach(el => {
      el.addEventListener('click', (ev) => {
        ev.preventDefault();
        root.classList.toggle('swse-tablet-expanded');
      }, { signal });
    });
  }






  _wireTabletWindowControlHitboxFallback(root, signal) {
    if (!(root instanceof HTMLElement)) return;

    const controlSelector = '[data-action="tablet-close"], [data-action="tablet-expand"], [data-action="tablet-minimize"], [data-action="tablet-home"]';
    const findControlAtPoint = (ev) => {
      const x = Number(ev.clientX);
      const y = Number(ev.clientY);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return null;

      let best = null;
      let bestScore = Number.POSITIVE_INFINITY;
      const controls = Array.from(root.querySelectorAll(controlSelector))
        .filter((el) => el instanceof HTMLElement && el.offsetParent !== null);

      for (const control of controls) {
        const rect = control.getBoundingClientRect();
        if (!rect.width || !rect.height) continue;
        const padX = Math.max(16, Math.min(24, rect.width * 0.75));
        const padY = Math.max(14, Math.min(22, rect.height * 0.75));
        if (x < rect.left - padX || x > rect.right + padX || y < rect.top - padY || y > rect.bottom + padY) continue;
        const score = Math.hypot(x - (rect.left + rect.width / 2), y - (rect.top + rect.height / 2));
        if (score < bestScore) {
          best = control;
          bestScore = score;
        }
      }
      return best;
    };

    root.addEventListener('pointerdown', (ev) => {
      if (ev.button !== 0) return;
      const target = ev.target instanceof Element ? ev.target : null;
      if (target?.closest?.('button.swse-tablet-control')) return;
      const control = findControlAtPoint(ev);
      if (!control) return;
      ev.preventDefault();
      ev.stopImmediatePropagation();
      control.click();
    }, { signal, capture: true });
  }

  _shieldTabletWindowControls(root, signal) {
    const controls = root?.querySelectorAll?.('[data-shell-window-control], [data-no-drag="true"], .swse-tablet-no-drag, .swse-tablet-hardware-rail, .swse-tablet-top-right-rail') || [];
    controls.forEach((control) => {
      const stopWindowDrag = (ev) => {
        ev.stopPropagation();
      };
      control.addEventListener('pointerdown', stopWindowDrag, { signal, capture: true });
      control.addEventListener('mousedown', stopWindowDrag, { signal, capture: true });
      control.addEventListener('dblclick', stopWindowDrag, { signal, capture: true });
      control.addEventListener('dragstart', stopWindowDrag, { signal, capture: true });
    });
  }

  async _minimizeTabletWindow() {
    try {
      if (typeof this.minimize === 'function') {
        await this.minimize();
        return;
      }
      const appRoot = this.element?.closest?.('.application') || this.element;
      const nativeMinimize = appRoot?.querySelector?.('[data-action="minimize"], .window-header .header-button.minimize');
      if (nativeMinimize) nativeMinimize.click();
    } catch (err) {
      console.warn('[SWSEVehicleSheet] Failed to minimize datapad shell.', err);
    }
  }

  /* ------------------------------------------------------------------------ */
  /* FORM UPDATE ROUTING                                                      */
  /* ------------------------------------------------------------------------ */

  async _onSubmitForm(event) {
    event.preventDefault();

    const form = event.target;
    const formData = new FormData(form);
    const formDataObj = Object.fromEntries(formData.entries());
    const allowedFlat = filterVehicleSheetUpdate(formDataObj);
    const expanded = foundry.utils.expandObject(allowedFlat);

    if (!expanded || Object.keys(allowedFlat).length === 0) return;

    try {
      // Route safe source-field edits through governance. Derived, Shipyard,
      // subsystem, and embedded-item ownership stays with their canonical engines.
      const quiet = isQuietVehicleSheetUpdate(allowedFlat);
      await ActorEngine.updateActor(this.actor, expanded, {
        source: quiet ? 'vehicle-sheet-form-submit-quiet' : 'vehicle-sheet-form-submit',
        render: quiet ? false : undefined,
        suppressAppRefresh: quiet
      });
    } catch (err) {
      console.error('Sheet submission failed:', err);
      ui.notifications.error(`Failed to update actor: ${err.message}`);
    }
  }
}
