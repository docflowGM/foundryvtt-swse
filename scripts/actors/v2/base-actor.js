// scripts/actors/v2/base-actor.js
import { SWSEActorBase } from '../base/swse-actor-base.js';
import { ActorEngine } from '../engine/actor-engine.js';
import { DerivedCalculator } from '../derived/derived-calculator.js';
import { ModifierEngine } from '../../engines/effects/modifiers/ModifierEngine.js';
import { computeCharacterDerived } from './character-actor.js';
import { computeNpcDerived } from './npc-actor.js';
import { computeDroidDerived } from './droid-actor.js';
import { computeVehicleDerived } from './vehicle-actor.js';
import { shouldSkipDerivedData } from '../../utils/hardening.js';
import { computeXpDerived } from '../../engines/progression/xp-engine.js';
import { SWSEInitiative } from '../../engines/combat/SWSEInitiative.js';

/**
 * SWSE V2 Base Actor
 *
 * V2 contract:
 * - All derived values live in actor.system.derived
 * - UI reads derived data only (no math in sheets)
 * - Actor owns rules APIs (Condition Track v2 contract)
 * - All mutations route through ActorEngine
 *
 * Bridge behavior (Phase 2):
 * - Calls legacy SWSEActorBase.prepareDerivedData() to preserve existing mechanics
 * - Mirrors minimal derived fields into system.derived
 */
export class SWSEV2BaseActor extends SWSEActorBase {
  prepareDerivedData() {
    // ============================================================================
    // PHASE 3: MUTATION CONTEXT SUPPRESSION
    // Skip derived calculation if in progression or other transaction context
    // ============================================================================
    if (this.__skipPreparedDerivedData === true) {
      console.log(`[DERIVED] Skipping prepareDerivedData (mutation context active) on ${this.name}`);
      return;
    }

    super.prepareDerivedData();

    const system = this.system ?? {};
    system.derived ??= {};
    system.derived.meta ??= {};

    // ============================================================================
    // PHASE 3 FOUNDATION: RECALC GUARD
    // Prevent double-execution within same update cycle
    // ============================================================================
    if (this._derivedRecalcInProgress) {
      console.warn(`[SWSE] Nested prepareDerivedData() call prevented on ${this.name}. Use ActorEngine.updateActor() instead.`);
      return;
    }
    this._derivedRecalcInProgress = true;
    try {
      this._performDerivedCalculation(system);
    } finally {
      this._derivedRecalcInProgress = false;
    }
  }

  /**
   * Isolated derived calculation phase (prevents re-entry)
   * @private
   */
  _performDerivedCalculation(system) {
    // v2: Compute HP, BAB, and defenses from progression data
    // Statblock NPCs must NOT be re-derived during AppV2 renders.
    // This is async but we fire-and-forget since Foundry doesn't await prepareDerivedData
    if (!shouldSkipDerivedData(this)) {this._computeDerivedAsync(system);}

    switch (this.type) {
      case 'character':
        computeCharacterDerived(this, system);
        break;
      case 'npc':
        computeNpcDerived(this, system);
        break;
      case 'droid':
        computeDroidDerived(this, system);
        break;
      case 'vehicle':
        computeVehicleDerived(this, system);
        break;
      default:
        computeCharacterDerived(this, system);
        break;
    }

    this._applyV2ConditionTrackDerived(system);

    // XP derived data — engine-level, no UI coupling
    if (this.type !== 'vehicle') {
      computeXpDerived(this, system);
    }

    system.derived.meta.lastRecalcMs = Date.now();
  }

  /**
   * Async computation of HP, BAB, defenses, and modifier application.
   * Runs after prepareDerivedData completes.
   *
   * Phase 0: Applies modifiers to skills, defenses, and HP
   * @private
   */
  async _computeDerivedAsync(system) {
    try {
      const updates = await DerivedCalculator.computeAll(this);

      // Merge computed values into system.derived
      if (updates) {
        for (const [path, value] of Object.entries(updates)) {
          const parts = path.split('.');
          if (parts.length === 3 && parts[0] === 'system' && parts[1] === 'derived') {
            // system.derived.field → system.derived[field]
            const field = parts[2];
            system.derived[field] = value;
          }
        }
      }

      // Phase 0: Apply modifiers to derived data
      // Get all modifiers and aggregated map
      const allModifiers = await ModifierEngine.getAllModifiers(this);
      const modifierMap = await ModifierEngine.aggregateAll(this);

      // Apply modifiers to skills, defenses, HP, and other values
      await ModifierEngine.applyAll(this, modifierMap, allModifiers);
    } catch (err) {
      // Log but don't throw - derived computation is non-critical
      console.warn(`Failed to compute derived values for ${this.name}:`, err);
    }
  }

  /* ------------------------------------------------------------------------ */
  /* Action Execution v2 Contract                                              */
  /* ------------------------------------------------------------------------ */

  /**
   * Execute a derived action by id.
   *
   * v2 rule: the sheet emits intent only.
   * Execution is resolved by the Actor (and its engines), never the UI.
   *
   * @param {string} actionId
   * @param {object} [options]
   */
  async useAction(actionId, options = {}) {
    const id = String(actionId ?? '').trim();
    if (!id) {return null;}

    const action = this.system?.derived?.actions?.map?.[id];
    if (!action || action.executable !== true) {return null;}

    const exec = action.execute ?? {};
    const kind = String(exec.kind ?? '');

    if (kind === 'item') {
      const item = this.items?.get(exec.itemId);
      return this.useItem(item, { ...options, actionId: id });
    }

    if (kind === 'itemToggleActivated') {
      const item = this.items?.get(exec.itemId);
      return this.toggleItemActivated(item, { ...options, actionId: id });
    }

    if (kind === 'featActionToggle') {
      const mod = await import('../../utils/feat-actions-mapper.js');
      return mod.FeatActionsMapper.toggleAction(this, exec.actionKey);
    }

    return null;
  }

  /* ------------------------------------------------------------------------ */
  /* Condition Track v2 Contract                                               */
  /* ------------------------------------------------------------------------ */

  getConditionTrackState() {
    const ct = this.system?.conditionTrack ?? {};
    const step = Number(ct.current ?? 0);
    const max = Number(ct.max ?? 5);
    const persistent = ct.persistent === true;

    return {
      step: Number.isFinite(step) ? step : 0,
      max: Number.isFinite(max) ? max : 5,
      persistent,
      helpless: (Number.isFinite(step) ? step : 0) >= 5
    };
  }

  getConditionPenalty(step = undefined) {
    const s = step === undefined ? this.getConditionTrackState().step : Number(step);
    const stepNum = Number.isFinite(s) ? s : 0;
    // Official SWSE: Normal(0), -1(1), -2(2), -5(3), -10(4), Helpless(5)
    const penalties = [0, -1, -2, -5, -10, 0]; // helpless = no numeric penalty
    return penalties[stepNum] ?? 0;
  }

  async setConditionTrackStep(step, { force = false } = {}) {
    const next = clampInt(step, 0, 5);
    const ct = this.system?.conditionTrack ?? {};
    const current = clampInt(ct.current ?? 0, 0, 5);
    const persistent = ct.persistent === true;

    // If persistent and improving (lowering step), block unless forced.
    if (!force && persistent && next < current) {return false;}

    await ActorEngine.updateActor(this, {
      'system.conditionTrack.current': next
    });

    return true;
  }

  async moveConditionTrack(delta, { force = false } = {}) {
    const ct = this.system?.conditionTrack ?? {};
    const current = clampInt(ct.current ?? 0, 0, 5);
    return this.setConditionTrackStep(current + Number(delta || 0), { force });
  }

  async worsenConditionTrack() {
    return this.moveConditionTrack(1, { force: true });
  }

  async improveConditionTrack({ force = false } = {}) {
    // improvement respects persistent unless forced
    return this.moveConditionTrack(-1, { force });
  }

  async setConditionTrackPersistent(flag) {
    await ActorEngine.updateActor(this, {
      'system.conditionTrack.persistent': flag === true
    });
    return true;
  }

  _applyV2ConditionTrackDerived(system) {
    system.derived ??= {};
    system.derived.damage ??= {};

    const { step, max, persistent, helpless } = this.getConditionTrackState();

    system.derived.damage.conditionStep = step;
    system.derived.damage.conditionMax = max;
    system.derived.damage.conditionPersistent = persistent;
    system.derived.damage.conditionHelpless = helpless;
    system.derived.damage.conditionPenalty = this.getConditionPenalty(step);
  }

  /* ------------------------------------------------------------------------ */
  /* Initiative (SWSE Rules-Accurate)                                         */
  /* ------------------------------------------------------------------------ */

  /**
   * Roll initiative (1d20 + modifier) and apply to Combat Tracker.
   * PHASE 1 CONSOLIDATION: Routes through CombatEngine for unified orchestration.
   * @param {object} [options]
   * @param {boolean} [options.useForce=false] Spend a Force Point for bonus die.
   */
  async swseRollInitiative(options = {}) {
    const { CombatEngine } = await import('../../engines/combat/CombatEngine.js');
    return CombatEngine.rollInitiative(this, options);
  }

  /**
   * Take 10 on initiative (10 + modifier) and apply to Combat Tracker.
   */
  async swseTake10Initiative() {
    return SWSEInitiative.take10Initiative(this);
  }
}

function clampInt(value, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) {return min;}
  const i = Math.trunc(n);
  return Math.max(min, Math.min(max, i));
}
