import { RenderAssertions } from "/systems/foundryvtt-swse/scripts/core/render-assertions.js";
import { ActorPerfDiagnostics } from "/systems/foundryvtt-swse/scripts/utils/actor-perf-diagnostics.js";
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { HouseRuleService } from "/systems/foundryvtt-swse/scripts/engine/system/HouseRuleService.js";
import { getActorSheetThemeGroups } from "/systems/foundryvtt-swse/scripts/theme/actor-sheet-theme-registry.js";
import { ShellRouter } from "/systems/foundryvtt-swse/scripts/ui/shell/ShellRouter.js";
import { ShellSurfaceRegistry } from "/systems/foundryvtt-swse/scripts/ui/shell/ShellSurfaceRegistry.js";
import { ThemeResolutionService } from "/systems/foundryvtt-swse/scripts/ui/theme/theme-resolution-service.js";
import { buildVehicleSheetContext } from "/systems/foundryvtt-swse/scripts/sheets/v2/vehicle-sheet/vehicle-context-builder.js";
import { VehicleRulesAdapter } from "/systems/foundryvtt-swse/scripts/sheets/v2/vehicle-sheet/vehicle-rules-adapter.js";
import { bindVehicleCrewAssignmentControls } from "/systems/foundryvtt-swse/scripts/sheets/v2/vehicle-sheet/vehicle-crew-assignment-controls.js";
// Imported for its module-load side effect only: registers the GM-only,
// non-mutating SWSE.debug.vehicleCrew.inspect(vehicleUuid) diagnostics
// command (Phase 7). Not otherwise referenced from this file.
import "/systems/foundryvtt-swse/scripts/engine/crew/vehicle-crew-diagnostics.js";
import { StarshipManeuversEngine } from "/systems/foundryvtt-swse/scripts/engine/StarshipManeuversEngine.js";
import { SubsystemEngine } from "/systems/foundryvtt-swse/scripts/engine/combat/starship/subsystem-engine.js";
import { EnhancedShields } from "/systems/foundryvtt-swse/scripts/engine/combat/starship/enhanced-shields.js";
import { EnhancedEngineer } from "/systems/foundryvtt-swse/scripts/engine/combat/starship/enhanced-engineer.js";
import { EnhancedPilot } from "/systems/foundryvtt-swse/scripts/engine/combat/starship/enhanced-pilot.js";
import { EnhancedCommander } from "/systems/foundryvtt-swse/scripts/engine/combat/starship/enhanced-commander.js";
import { VehicleTurnController } from "/systems/foundryvtt-swse/scripts/engine/combat/starship/vehicle-turn-controller.js";
import { SWSEV2ActorSheetBase } from "/systems/foundryvtt-swse/scripts/sheets/v2/actor-sheet-base.js";
import { SWSERoll } from "/systems/foundryvtt-swse/scripts/combat/rolls/enhanced-rolls.js";

/**
 * The following three small pure-function groups (action-economy view-model
 * builder and render-context sanitizer) are duplicated verbatim from
 * character-sheet.js rather than imported from it or hoisted onto
 * SWSEV2ActorSheetBase. They are used by both this file's
 * _prepareVehicleActorSheetContext and by character-sheet.js's own
 * (character/npc/droid-only) context assembly, but they are pure,
 * self-contained utility functions with no actor-type-specific behavior and
 * no shared state -- not "universal shell/application behavior" in the sense
 * SWSEV2ActorSheetBase is meant to hold, and importing them from
 * character-sheet.js would create an unwanted reverse dependency (Vehicle ->
 * Character). See the Phase 4 handoff notes for this deliberate, disclosed
 * duplication.
 */
function toActionStateLabel(state, fallback = 'Available') {
  const key = String(state || '').toLowerCase();
  if (key === 'used' || key === 'spent' || key === 'unavailable') return 'Spent';
  if (key === 'degraded') return 'Degraded';
  if (key === 'readonly') return 'Read Only';
  if (key === 'reference') return 'Reference';
  return fallback;
}

function buildActionPips(count = 1, current = count) {
  const max = Math.max(1, Number(count) || 1);
  const onCount = Math.max(0, Math.min(max, Number(current) || 0));
  return Array.from({ length: max }, (_unused, index) => ({ on: index < onCount }));
}

function buildSheetActionEconomyContext({ turnState = null, state = null, breakdown = [], enforcementMode = 'loose', active = false } = {}) {
  const visual = state ?? {
    full: 'available',
    standard: 'available',
    move: 'available',
    swift: 'available'
  };
  const remaining = turnState?.remaining ?? {};
  const reactions = turnState?.reactions ?? {};
  const reactionMax = Math.max(1, Number(reactions.max ?? 1) || 1);
  const reactionCurrent = active ? Math.max(0, Math.min(reactionMax, Number(reactions.current ?? reactionMax) || 0)) : reactionMax;
  const freeStep = {
    key: 'free',
    label: 'Free',
    cssClass: 'is-free is-available',
    state: 'always',
    stateLabel: 'Always',
    canSpend: false,
    infinite: true,
    pips: [],
    tooltip: 'Free actions are unlimited, subject to GM discretion.'
  };

  const actionSteps = [
    { key: 'full-round', stateKey: 'full', label: 'Full-Round', fallbackAvailable: active ? ((remaining.standard ?? 1) > 0 && (remaining.move ?? 1) > 0) : true },
    { key: 'standard', stateKey: 'standard', label: 'Standard', fallbackAvailable: active ? (remaining.standard ?? 1) > 0 : true },
    { key: 'move', stateKey: 'move', label: 'Move', fallbackAvailable: active ? (remaining.move ?? 1) > 0 : true },
    { key: 'swift', stateKey: 'swift', label: 'Swift', fallbackAvailable: active ? (remaining.swift ?? 1) > 0 : true }
  ].map((step) => {
    const stateValue = active ? (visual[step.stateKey] || (step.fallbackAvailable ? 'available' : 'used')) : 'reference';
    const available = stateValue === 'available' || stateValue === 'degraded';
    return {
      key: step.key,
      label: step.label,
      state: stateValue,
      cssClass: `is-${stateValue}${available ? ' is-available' : ' is-spent'}`,
      stateLabel: active ? toActionStateLabel(stateValue) : 'Available',
      canSpend: active && available,
      infinite: false,
      pips: buildActionPips(1, available ? 1 : 0),
      tooltip: active ? `${step.label} action is ${toActionStateLabel(stateValue).toLowerCase()}.` : `${step.label} action is normally available on your turn.`
    };
  });

  const reactionStep = {
    key: 'reaction',
    label: 'Reactions',
    state: reactionCurrent > 0 ? 'available' : 'used',
    cssClass: `is-reaction ${reactionCurrent > 0 ? 'is-available' : 'is-spent'}`,
    stateLabel: active ? `${reactionCurrent} Left` : `${reactionMax} Left`,
    canSpend: active && reactionCurrent > 0,
    infinite: false,
    pips: buildActionPips(reactionMax, reactionCurrent),
    tooltip: active ? `${reactionCurrent} reaction(s) remaining this round.` : 'Reactions refresh on your turn.'
  };

  const summaryParts = [];
  for (const step of actionSteps) {
    if (!active || step.canSpend) summaryParts.push(step.label.replace('-Round', ''));
  }
  summaryParts.push('Free');
  if (!active || reactionCurrent > 0) summaryParts.push(`RX ${reactionCurrent}`);

  return {
    active,
    state: visual,
    turnState,
    breakdown: Array.isArray(breakdown) ? breakdown : [],
    enforcementMode,
    enforcementModeLabel: String(enforcementMode || 'loose').toUpperCase(),
    steps: [...actionSteps, freeStep, reactionStep],
    summary: summaryParts.length ? summaryParts.join(' · ') : 'No actions remaining',
    canUndo: active && Array.isArray(turnState?.history) && turnState.history.length > 0,
    canReset: active,
    reactionCurrent,
    reactionMax,
    readOnlyReason: active ? '' : 'Reference mode: add this actor to the current combat tracker to spend actions.'
  };
}

function duplicateDataForContext(value, fallback = {}) {
  if (value == null) return value;
  try {
    return foundry?.utils?.duplicate?.(value) ?? structuredClone(value);
  } catch (_err) {
    try {
      return structuredClone(value);
    } catch (_cloneErr) {
      try {
        return JSON.parse(JSON.stringify(value));
      } catch (_jsonErr) {
        return fallback;
      }
    }
  }
}

function documentToTemplateData(doc) {
  if (!doc || typeof doc !== 'object') return doc;
  const type = doc.type ?? doc.documentName ?? doc.constructor?.documentName ?? '';
  const system = duplicateDataForContext(doc.system ?? {}, {});
  const flags = duplicateDataForContext(doc.flags ?? {}, {});
  const ownership = duplicateDataForContext(doc.ownership ?? {}, {});
  const out = {
    id: doc.id ?? doc._id ?? null,
    _id: doc.id ?? doc._id ?? null,
    uuid: doc.uuid ?? null,
    name: doc.name ?? '',
    type,
    img: doc.img ?? '',
    system,
    flags,
    ownership,
    isOwner: doc.isOwner === true,
    limited: doc.limited === true
  };

  // Some legacy/partial templates still read actor.items directly. Provide a
  // safe item list instead of the live Collection/Document graph.
  if ((doc.documentName === 'Actor' || doc.constructor?.documentName === 'Actor' || doc.items) && doc.items) {
    try {
      out.items = Array.from(doc.items ?? []).map(item => documentToTemplateData(item));
    } catch (_err) {
      out.items = [];
    }
  }

  if ((doc.documentName === 'Actor' || doc.constructor?.documentName === 'Actor' || doc.effects) && doc.effects) {
    try {
      out.effects = Array.from(doc.effects ?? []).map(effect => documentToTemplateData(effect));
    } catch (_err) {
      out.effects = [];
    }
  }

  return out;
}

function sanitizeSheetRenderContext(value, options = {}) {
  const seen = new WeakSet();
  const rootKey = options.rootKey || 'context';

  const sanitize = (entry, key = rootKey) => {
    if (entry == null) return entry;

    const type = typeof entry;
    if (type === 'string' || type === 'number' || type === 'boolean') return entry;
    if (type === 'bigint') return String(entry);
    if (type === 'function' || type === 'symbol') return undefined;

    if (entry instanceof Date) return entry.toISOString();
    if (typeof window !== 'undefined' && entry === window) return undefined;
    if (typeof globalThis !== 'undefined' && entry === globalThis) return undefined;
    if (typeof Window !== 'undefined' && entry instanceof Window) return undefined;
    if (typeof Document !== 'undefined' && entry instanceof Document) return undefined;
    if (typeof HTMLElement !== 'undefined' && entry instanceof HTMLElement) return undefined;
    if (typeof Node !== 'undefined' && entry instanceof Node) return undefined;
    if (typeof AbortController !== 'undefined' && entry instanceof AbortController) return undefined;
    if (typeof AbortSignal !== 'undefined' && entry instanceof AbortSignal) return undefined;

    if (entry?.documentName || entry?.constructor?.documentName) {
      return sanitize(documentToTemplateData(entry), key);
    }

    if (seen.has(entry)) return undefined;
    seen.add(entry);

    if (Array.isArray(entry)) {
      return entry.map((child, index) => sanitize(child, `${key}[${index}]`)).filter(child => child !== undefined);
    }

    if (entry instanceof Map) {
      return Object.fromEntries(
        Array.from(entry.entries())
          .map(([mapKey, mapValue]) => [String(mapKey), sanitize(mapValue, String(mapKey))])
          .filter(([, mapValue]) => mapValue !== undefined)
      );
    }

    if (entry instanceof Set) {
      return Array.from(entry.values()).map((child, index) => sanitize(child, `${key}<${index}>`)).filter(child => child !== undefined);
    }

    const out = {};
    for (const [entryKey, entryValue] of Object.entries(entry)) {
      if (entryKey === 'app' || entryKey === 'document' || entryKey === 'shellHost') continue;
      if (entryKey === 'window' || entryKey === 'ownerDocument' || entryKey === 'defaultView' || entryKey === 'view') continue;
      if (entryKey === 'element' || entryKey === 'html' || entryKey === 'form' || entryKey === 'listeners') continue;
      if (entryKey.startsWith('_') && entryKey !== '_id') continue;
      const clean = sanitize(entryValue, entryKey);
      if (clean !== undefined) out[entryKey] = clean;
    }
    return out;
  };

  return sanitize(value, rootKey);
}

/**
 * SWSEV2VehicleSheet
 *
 * Phase 4 sheet-architecture separation: all vehicle-only context building,
 * event wiring, and form submission for the SWSE V2 vehicle actor sheet.
 * Extracted verbatim from the former monolithic SWSEV2CharacterSheet
 * (scripts/sheets/v2/character-sheet.js), which previously served all four
 * actor types (character, npc, droid, vehicle) from one class. Registered
 * in index.js for the "vehicle" actor type only.
 */
export class SWSEV2VehicleSheet extends SWSEV2ActorSheetBase {

  /**
   * Vehicle-specific render wiring, called by SWSEV2ActorSheetBase._onRender
   * after its shared preamble. Mirrors the original _onRender vehicle branch
   * verbatim: vehicles never call activateListeners(), so DropResolutionEngine
   * never binds for them -- bindVehicleCrewAssignmentControls, invoked from
   * _wireVehicleActorModeEvents, is this sheet's own independent drop stack.
   */
  _onRenderActorSheet(root, signal) {
    this._wireVehicleActorModeEvents(root, signal);

    if (this.actor?.id && !this._shellRouterRegistered) {
      ShellRouter.register(this.actor.id, this);
      this._shellRouterRegistered = true;
    }
    this._wireShellEvents(root, signal);
  }

  async _prepareContextForActorSheet({ useVehicleSheet, actor, rawContext, context, actorModeContext, derived, contextTimer }) {
    if (useVehicleSheet) {
      const vehicleContext = await this._prepareVehicleActorSheetContext({
        actor,
        rawContext,
        context,
        actorModeContext,
        derived
      });
      contextTimer.end({ mode: 'vehicle' });
      return vehicleContext;
    }

    // SWSEV2VehicleSheet is only ever registered for actor.type === 'vehicle'
    // (see index.js), so useVehicleSheet -- which mirrors actor.type -- is
    // always true here in practice. This branch mirrors the original guard
    // clause verbatim as a defensive fallback rather than assuming that
    // invariant unconditionally.
    contextTimer.end({ mode: 'vehicle-unexpected' });
    return context;
  }

  async _prepareVehicleActorSheetContext({ actor, context = {}, actorModeContext, derived = {} } = {}) {
    if (actor?.type !== 'vehicle') {
      throw new Error(`SWSEV2VehicleSheet requires actor type "vehicle", got "${actor?.type}"`);
    }

    const system = actor.system ?? {};
    const cargoCapacity = Number(system?.cargo?.capacity ?? 500) || 500;
    let totalCargoWeight = 0;
    const cargoItems = Array.from(actor.items ?? []).filter(item => item.type === 'equipment');
    for (const item of cargoItems) {
      const weight = Number(item.system?.weight ?? 0) || 0;
      const quantity = Number(item.system?.quantity ?? 1) || 1;
      totalCargoWeight += weight * quantity;
    }
    const cargoState = totalCargoWeight > cargoCapacity * 1.1 ? 'over' : totalCargoWeight > cargoCapacity * 0.8 ? 'near' : 'normal';

    const ruleContexts = VehicleRulesAdapter.buildAllRuleContexts(actor);
    const panelContext = ActorPerfDiagnostics.time(
      ms => ActorPerfDiagnostics.recordSheetContext('vehicle', ms),
      () => buildVehicleSheetContext(actor, context, {
        subsystemData: ruleContexts.subsystemData,
        subsystemPenalties: ruleContexts.subsystemPenalties,
        shieldZones: ruleContexts.shieldZones,
        powerData: ruleContexts.powerData,
        pilotData: ruleContexts.pilotData,
        commanderData: ruleContexts.commanderData,
        turnPhaseData: ruleContexts.turnPhaseData,
        totalCargoWeight,
        cargoState
      })
    );

    let actionEconomy = buildSheetActionEconomyContext({ active: false });
    if (game.combat && game.combat.combatants.some(c => c.actor?.id === actor.id)) {
      try {
        const combatId = game.combat.id;
        const { ActionEconomyPersistence } = await import('/systems/foundryvtt-swse/scripts/engine/combat/action/action-economy-persistence.js');
        const { ActionEngine } = await import('/systems/foundryvtt-swse/scripts/engine/combat/action/action-engine-v2.js');
        const turnState = ActionEconomyPersistence.getTurnState(actor, combatId);
        const state = ActionEngine.getVisualState(turnState);
        const breakdown = ActionEngine.getTooltipBreakdown(turnState);
        const enforcementMode = HouseRuleService.getString('actionEconomyMode', 'loose');
        actionEconomy = buildSheetActionEconomyContext({
          turnState,
          state,
          breakdown,
          enforcementMode,
          active: true
        });
      } catch (err) {
        swseLogger.warn('[SWSEV2CharacterSheet] Vehicle action economy context failed', {
          actorId: actor?.id,
          actorName: actor?.name,
          error: err?.message
        });
      }
    }

    let shellSurfaceVm = null;
    let shellOverlayVm = null;
    let shellDrawerVm = null;
    const _safeCloneVm = (value) => {
      try {
        return foundry.utils.deepClone(value);
      } catch (_err) {
        return value;
      }
    };

    if (this._shellSurface && this._shellSurface !== 'sheet') {
      try {
        const raw = await ShellSurfaceRegistry.buildSurfaceVm({
          actor,
          surfaceId: this._shellSurface,
          surfaceOptions: this._shellSurfaceOptions,
          shellHost: this
        });
        shellSurfaceVm = _safeCloneVm(raw);
      } catch (err) {
        swseLogger.error('[ShellHost] Vehicle surface VM build failed:', err);
        shellSurfaceVm = { error: err.message, surfaceId: this._shellSurface };
      }
    }

    if (this._shellOverlay) {
      try {
        const raw = await ShellSurfaceRegistry.buildOverlayVm({
          actor,
          overlayId: this._shellOverlay.overlayId,
          overlayOptions: this._shellOverlay.options,
          shellHost: this
        });
        shellOverlayVm = _safeCloneVm(raw);
      } catch (err) {
        swseLogger.error('[ShellHost] Vehicle overlay VM build failed:', err);
        shellOverlayVm = { error: err.message };
      }
    }

    if (this._shellDrawer) {
      try {
        const raw = await ShellSurfaceRegistry.buildDrawerVm({
          actor,
          drawerId: this._shellDrawer.drawerId,
          drawerOptions: this._shellDrawer.options,
          shellHost: this
        });
        shellDrawerVm = _safeCloneVm(raw);
      } catch (err) {
        swseLogger.error('[ShellHost] Vehicle drawer VM build failed:', err);
        shellDrawerVm = { error: err.message };
      }
    }

    const equipment = Array.from(actor.items ?? []).filter(item => item.type === 'equipment').map(item => ({
      id: item.id,
      name: item.name,
      type: item.type,
      img: item.img,
      system: foundry.utils.duplicate(item.system ?? {})
    }));
    const weapons = Array.from(actor.items ?? []).filter(item => item.type === 'weapon').map(item => ({
      id: item.id,
      name: item.name,
      type: item.type,
      img: item.img,
      system: foundry.utils.duplicate(item.system ?? {})
    }));
    const ownedActorMap = {};
    for (const entry of system.ownedActors || []) {
      const ownedActor = game.actors?.get?.(entry.id);
      if (ownedActor) {
        ownedActorMap[entry.id] = {
          id: ownedActor.id,
          name: ownedActor.name,
          type: ownedActor.type,
          img: ownedActor.img
        };
      }
    }

    const hp = derived.hp ?? { value: 0, max: 1, percent: 0, warning: false, critical: false };
    const sheetThemeContext = ThemeResolutionService.buildSurfaceContext({ actor });
    const safeShellSurfaceOptions = sanitizeSheetRenderContext(this._shellSurfaceOptions, { rootKey: 'vehicleShellSurfaceOptions' }) || {};
    const safeShellOverlay = sanitizeSheetRenderContext(this._shellOverlay, { rootKey: 'vehicleShellOverlay' }) || null;
    const safeShellDrawer = sanitizeSheetRenderContext(this._shellDrawer, { rootKey: 'vehicleShellDrawer' }) || null;
    const finalContext = {
      ...context,
      _sheetContractVersion: 1,
      actor: {
        id: actor.id,
        uuid: actor.uuid,
        name: actor.name,
        type: actor.type,
        img: actor.img
      },
      document: {
        id: actor.id,
        uuid: actor.uuid,
        name: actor.name,
        type: actor.type,
        img: actor.img
      },
      system: foundry.utils.duplicate(system),
      derived,
      ...actorModeContext,
      isVehicleActor: true,
      useVehicleSheet: true,
      actorSheetModeLabel: actorModeContext.actorSheetMode?.label ?? 'Vehicle Actor',
      sheetTheme: sheetThemeContext.themeKey,
      sheetThemeGroups: getActorSheetThemeGroups(sheetThemeContext.themeKey),
      sheetMotionStyle: sheetThemeContext.motionStyle,
      sheetMotionOptions: ThemeResolutionService.getMotionOptions(),
      sheetThemeStyleInline: sheetThemeContext.themeStyleInline,
      sheetMotionStyleInline: sheetThemeContext.motionStyleInline,
      sheetSurfaceStyleInline: sheetThemeContext.surfaceStyleInline,
      editable: this.isEditable,
      user: {
        id: game.user.id,
        name: game.user.name,
        role: game.user.role
      },
      actionEconomy,
      hpPercent: Math.max(0, Math.min(100, Number(hp.percent ?? 0) || 0)),
      hpWarning: hp.warning ?? false,
      hpCritical: hp.critical ?? false,
      ctWarning: Number(system?.conditionTrack?.current ?? 0) > 0,
      cargoCapacity: Math.round(cargoCapacity * 100) / 100,
      totalCargoWeight: Math.round(totalCargoWeight * 100) / 100,
      cargoState,
      items: Array.from(actor.items ?? []).map(item => ({
        id: item.id,
        name: item.name,
        type: item.type,
        img: item.img,
        system: foundry.utils.duplicate(item.system ?? {})
      })),
      equipment,
      weapons,
      ownedActorMap,
      ...panelContext,
      houseRuleContexts: {
        subsystemPanel: ruleContexts.subsystemData ? {
          subsystemData: ruleContexts.subsystemData,
          subsystemPenalties: ruleContexts.subsystemPenalties
        } : null,
        shieldPanel: ruleContexts.shieldZones ? { shieldZones: ruleContexts.shieldZones } : null,
        powerPanel: ruleContexts.powerData || null,
        pilotPanel: ruleContexts.pilotData || null,
        commanderPanel: ruleContexts.commanderData || null,
        turnPhasePanel: ruleContexts.turnPhaseData || null
      },
      starshipManeuvers: StarshipManeuversEngine.getManeuversForActor(actor),
      shellSurface: this._shellSurface,
      shellSurfaceOptions: safeShellSurfaceOptions,
      shellOverlay: safeShellOverlay,
      shellDrawer: safeShellDrawer,
      shellIsSheet: this._shellSurface === 'sheet',
      shellSurfaceVm,
      shellOverlayVm,
      shellDrawerVm
    };

    const serializableContext = sanitizeSheetRenderContext(finalContext, { rootKey: 'vehicleContext' });
    RenderAssertions.assertContextSerializable(serializableContext, 'SWSEV2VehicleSheet');
    this._currentContext = serializableContext;
    return serializableContext;
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

  _wireVehicleActorModeEvents(root, signal) {
    if (!(root instanceof HTMLElement)) return;

    this._activateVehicleTab(root, this._requestedVehicleTab());

    // Crew-assignment buttons (assign/open/remove), station drag-and-drop,
    // the weapon-mount/crew-skill Fire buttons, and generic weapon/cargo
    // drop routing. This is the vehicle sheet's actual listener path
    // (_onRender returns early for vehicles before activateListeners()), so
    // it is bound here rather than in the character-mode listener path.
    bindVehicleCrewAssignmentControls(this, root, { signal });

    root.querySelectorAll('.sheet-tabs .item').forEach(tabBtn => {
      tabBtn.addEventListener('click', (ev) => {
        ev.preventDefault();
        const tabName = ev.currentTarget?.dataset?.tab;
        if (!tabName) return;
        this._activateVehicleTab(root, tabName);
      }, { signal });
    });

    root.querySelectorAll('.swse-v2-condition-step').forEach(el => {
      el.addEventListener('click', async (ev) => {
        ev.preventDefault();
        const step = Number(ev.currentTarget?.dataset?.step);
        if (!Number.isFinite(step)) return;
        if (typeof this.actor?.setConditionTrackStep === 'function') {
          await this.actor.setConditionTrackStep(step);
        } else if (this.actor) {
          await ActorEngine.updateActor(this.actor, { 'system.conditionTrack.current': step });
        }
      }, { signal });
    });

    const improveBtn = root.querySelector('.swse-v2-condition-improve');
    improveBtn?.addEventListener('click', async (ev) => {
      ev.preventDefault();
      await this.actor?.improveConditionTrack?.();
    }, { signal });

    const worsenBtn = root.querySelector('.swse-v2-condition-worsen');
    worsenBtn?.addEventListener('click', async (ev) => {
      ev.preventDefault();
      await this.actor?.worsenConditionTrack?.();
    }, { signal });

    root.querySelectorAll('.swse-v2-open-item').forEach(el => {
      el.addEventListener('click', (ev) => {
        ev.preventDefault();
        const itemId = ev.currentTarget?.dataset?.itemId ?? ev.currentTarget?.dataset?.weaponId;
        const item = this.actor?.items?.get?.(itemId);
        item?.sheet?.render?.(true);
      }, { signal });
    });

    root.querySelectorAll('[data-action="open-owned"]').forEach(btn => {
      btn.addEventListener('click', (ev) => {
        ev.preventDefault();
        const actorId = ev.currentTarget?.dataset?.actorId;
        const ownedActor = actorId ? game.actors?.get?.(actorId) : null;
        ownedActor?.sheet?.render?.(true);
      }, { signal });
    });

    root.querySelectorAll('[data-action="remove-owned"]').forEach(btn => {
      btn.addEventListener('click', async (ev) => {
        ev.preventDefault();
        const actorId = ev.currentTarget?.dataset?.actorId;
        if (!actorId || !this.actor) return;
        const owned = this.actor.system?.ownedActors?.filter(o => o.id !== actorId) || [];
        await ActorEngine.updateActor(this.actor, { 'system.ownedActors': owned }, { source: 'vehicle-actor-shell-owned-actors' });
      }, { signal });
    });

    root.querySelectorAll('[data-action="roll-weapon"], [data-action="roll-weapon-attack"]').forEach(el => {
      el.addEventListener('click', async (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        ev.stopImmediatePropagation?.();
        const itemId = ev.currentTarget?.dataset?.itemId ?? ev.currentTarget?.dataset?.weaponId;
        if (!itemId || !this.actor) return;
        const item = this.actor.items?.get?.(itemId);
        if (!item) return;
        await this._runCanonicalAttackWithPreroll(item, {
          source: 'weapon-roll-button',
          sourceElement: ev.currentTarget,
          companionSource: ev.currentTarget,
          sheet: this
        });
      }, { signal });
    });

    // Phase 5A fix: these render on the Pilot/Engineering starship-maneuver
    // list (vehicle-sheet-content.hbs) with data-item-id/data-actor-id/
    // data-item-uuid already shaped to match StarshipManeuversEngine's ref
    // argument, but had no listener anywhere. The engine method names match
    // the action names exactly (useManeuver/regainManeuver) — this was clearly
    // built for these buttons and simply never wired.
    root.querySelectorAll('[data-action="useManeuver"]').forEach(btn => {
      btn.addEventListener('click', async (ev) => {
        ev.preventDefault();
        const { itemId, actorId, itemUuid } = ev.currentTarget?.dataset ?? {};
        await StarshipManeuversEngine.useManeuver(this.actor, { itemId, actorId, uuid: itemUuid });
        this.render?.(false);
      }, { signal });
    });

    root.querySelectorAll('[data-action="regainManeuver"]').forEach(btn => {
      btn.addEventListener('click', async (ev) => {
        ev.preventDefault();
        const { itemId, actorId, itemUuid } = ev.currentTarget?.dataset ?? {};
        await StarshipManeuversEngine.regainManeuver(this.actor, { itemId, actorId, uuid: itemUuid });
        this.render?.(false);
      }, { signal });
    });

    // Phase 5A: "Import Vehicle" has no authoritative implementation anywhere
    // in the codebase (verified: no importVehicle-style function exists in any
    // engine/subsystem). Per fix policy C, this control is disabled with an
    // explanation rather than inventing an import mechanic.
    root.querySelectorAll('[data-action="import-vehicle"]').forEach(btn => {
      btn.setAttribute('disabled', 'disabled');
      btn.title = 'Vehicle import is not implemented yet.';
      btn.setAttribute('aria-disabled', 'true');
    });

    // Phase 5A fix: the shared Ability Matrix panel (abilities-panel.hbs,
    // used by Character/Droid tabs and this Vehicle sheet alike — vehicles
    // carry ability scores for e.g. computer/pilot-relevant checks) renders
    // [data-action="toggle-abilities"] and [data-action="roll-ability"] for
    // every actor type that includes it, but Vehicle never inherited the
    // Character-like sheet's handlers for them (Vehicle extends
    // SWSEV2ActorSheetBase directly, not the Character/NPC/Droid chain).
    // "Roll for Attributes" is template-gated to actor.type === "character"
    // already and is correctly absent here; these two are not gated and were
    // genuinely unreachable. Reuses the exact same DOM toggle / SWSERoll call
    // as the Character-like implementation.
    root.querySelectorAll('[data-action="toggle-abilities"]').forEach(button => {
      button.addEventListener('click', (ev) => {
        ev.preventDefault();
        const panel = button.closest('.abilities-panel');
        if (!panel) return;
        const isExpanded = panel.classList.toggle('abilities-expanded');
        panel.querySelectorAll('.ability-row').forEach(row => {
          const collapsed = row.querySelector('.ability-collapsed');
          const expanded = row.querySelector('.ability-expanded');
          if (collapsed) collapsed.style.display = isExpanded ? 'none' : 'flex';
          if (expanded) expanded.style.display = isExpanded ? (expanded.dataset?.expandedDisplay || 'flex') : 'none';
        });
        button.setAttribute('aria-expanded', String(isExpanded));
        button.textContent = isExpanded ? 'Collapse' : (button.dataset?.collapsedLabel || 'Edit Defenses');
      }, { signal });
    });

    root.querySelectorAll('[data-action="roll-ability"]').forEach(button => {
      button.addEventListener('click', async (ev) => {
        ev.preventDefault();
        const abilityKey = button.dataset.ability;
        if (!abilityKey) return;
        try {
          await SWSERoll.rollAbility(this.actor, abilityKey, { sourceElement: button, companionSource: button, sheet: this, showRollCompanion: true });
        } catch (err) {
          ui?.notifications?.error?.(`Ability roll failed: ${err.message}`);
        }
      }, { signal });
    });

    root.querySelectorAll('[data-action="repair-subsystem"]').forEach(btn => {
      btn.addEventListener('click', async (ev) => {
        ev.preventDefault();
        const subsystem = ev.currentTarget?.dataset?.subsystem;
        if (!subsystem || !this.actor) return;
        await SubsystemEngine.repairSubsystem(this.actor, subsystem);
      }, { signal });
    });

    root.querySelectorAll('[data-action="shield-focus"]').forEach(btn => {
      btn.addEventListener('click', async (ev) => {
        ev.preventDefault();
        const zone = ev.currentTarget?.dataset?.zone;
        if (!zone || !this.actor) return;
        await EnhancedShields.focusShields(this.actor, zone);
      }, { signal });
    });

    root.querySelector('[data-action="shield-equalize"]')?.addEventListener('click', async (ev) => {
      ev.preventDefault();
      if (!this.actor) return;
      await EnhancedShields.equalizeShields(this.actor);
    }, { signal });

    root.querySelectorAll('[data-action="power-adjust"]').forEach(btn => {
      btn.addEventListener('click', async (ev) => {
        ev.preventDefault();
        const system = ev.currentTarget?.dataset?.system;
        const direction = ev.currentTarget?.dataset?.direction;
        if (!system || !direction || !this.actor) return;
        const allocation = EnhancedEngineer.getPowerAllocation(this.actor);
        const current = allocation?.[system] ?? 2;
        allocation[system] = direction === 'up' ? Math.min(4, current + 1) : Math.max(0, current - 1);
        await EnhancedEngineer.allocatePower(this.actor, allocation);
      }, { signal });
    });

    root.querySelectorAll('[data-action="set-maneuver"]').forEach(btn => {
      btn.addEventListener('click', async (ev) => {
        ev.preventDefault();
        const maneuver = ev.currentTarget?.dataset?.maneuver;
        if (!maneuver || !this.actor) return;
        await EnhancedPilot.setManeuver(this.actor, maneuver);
      }, { signal });
    });

    root.querySelectorAll('[data-action="set-order"]').forEach(btn => {
      btn.addEventListener('click', async (ev) => {
        ev.preventDefault();
        const order = ev.currentTarget?.dataset?.order;
        if (!order || !this.actor) return;
        await EnhancedCommander.issueOrder(this.actor, order);
      }, { signal });
    });

    root.querySelector('[data-action="advance-phase"]')?.addEventListener('click', async (ev) => {
      ev.preventDefault();
      if (!this.actor) return;
      await VehicleTurnController.advancePhase(this.actor);
    }, { signal });

    root.querySelector('[data-action="reset-turn"]')?.addEventListener('click', async (ev) => {
      ev.preventDefault();
      if (!this.actor) return;
      await VehicleTurnController.startTurn(this.actor);
    }, { signal });

    root.querySelectorAll('[data-action="save-vehicle"]').forEach(btn => {
      btn.addEventListener('click', async (ev) => {
        ev.preventDefault();
        await this._onSubmitVehicleActorForm(ev);
      }, { signal });
    });

    root.querySelectorAll('[data-action="customize-vehicle"]').forEach(btn => {
      btn.addEventListener('click', async (ev) => {
        ev.preventDefault();
        if (!this.actor) return;
        await this.setSurface('customization', {
          source: 'vehicle-actor-sheet',
          bayMode: 'shipyard',
          mode: 'shipyard',
          contextMode: 'modifyExisting',
          targetActorId: this.actor.id
        });
        await this.requestSurfaceRender({
          reason: 'vehicle-actor-sheet-shipyard-launch',
          surfaceId: 'customization'
        });
      }, { signal });
    });
  }

  /**
   * GOVERNANCE OVERRIDE: Form submission through ActorEngine
   *
   * ⚠️ CRITICAL: This method COMPLETELY BYPASSES Foundry's default form submission.
   *
   * WHY THIS IS NECESSARY:
   * - Foundry's default path: _onSubmitForm → _prepareSubmitData → actor.update()
   * - Our system: All actor.update() calls must go through ActorEngine.updateActor()
   * - Reason: MutationInterceptor blocks unauthorized writes to system.derived.* and system.hp.max
   * - Those fields are SSOT (Single Source of Truth), computed by DerivedCalculator and ActorEngine
   *
   * IMPLEMENTATION:
   * - This override intercepts the form event before it reaches Foundry's submission pipeline
   * - Collects FormData, coerces types, filters protected fields
   * - Routes updates through ActorEngine.apply() governance layer
   * - Returns early to prevent Foundry's default _processSubmitData from running
   *
   * VERSION CONSTRAINTS:
   * - Requires Foundry V13+ (AppV2 architecture)
   * - If Foundry significantly changes AppV2.render() or form handling, this must be reviewed
   * - Not compatible with V11 or earlier (they use Application API, not ApplicationV2)
   *
   * WHAT WOULD BREAK:
   * - Removing this: actor.update() calls would be blocked by MutationInterceptor
   * - Direct actor.update() in templates/items/etc would silently fail
   * - Sheet would appear to accept input but changes wouldn't persist
   *
   * @param {Event} event - Form submission event
   * @returns {Promise<void>}
   */

  async _onSubmitVehicleActorForm(event) {
    event?.preventDefault?.();
    const writableExact = new Set([
      'name',
      'img',
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
      'system.damageThreshold',
      'system.armorBonus',
      'system.speed',
      'system.maxVelocity',
      'system.maneuver',
      'system.hyperdrive',
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
    const writablePatterns = [
      /^system\.weapons\.\d+\.(name|arc|attackBonus|damage|range|fireControl|notes)$/,
      /^system\.attributes\.(str|dex|int|wis|cha)\.(base|racial|temp)$/
    ];
    const isWritable = (path) => writableExact.has(path) || writablePatterns.some(pattern => pattern.test(path));
    const root = this.element instanceof HTMLElement ? this.element : null;
    const source = event?.target?.closest?.('form') || root;
    if (!source) return;

    const allowed = {};
    source.querySelectorAll?.('[name]')?.forEach((field) => {
      const path = field.getAttribute('name');
      if (!path || !isWritable(path)) return;
      if (field.type === 'checkbox') allowed[path] = field.checked;
      else allowed[path] = field.value;
    });

    if (!Object.keys(allowed).length) return;
    // `allowed` is already a flat map of leaf dot-paths. Pass it straight through
    // rather than expandObject()-ing it into a nested {system:{...}} object:
    // ActorEngine flattens internally, and a nested system object trips the
    // Phase 2 broad-replacement boundary guard.
    await ActorEngine.updateActor(this.actor, allowed, {
      source: 'vehicle-actor-shell-form-submit'
    });
  }
}
