/**
 * ThresholdEngine — Centralized authority for Damage Threshold & Massive Damage
 *
 * House Rule Module: Enhanced Massive Damage
 * All logic gated behind enableEnhancedMassiveDamage world setting.
 *
 * Responsibilities:
 *   - Damage Threshold calculations (RAW + optional formula override)
 *   - Threshold exceed behavior
 *   - Massive damage behavior (persistent CT, double threshold, stun threshold)
 *   - CT penalty application from threshold events
 *   - Eliminate instant death logic
 *   - Glancing hit detection
 *   - Last Grasp trigger detection
 *
 * Does NOT:
 *   - Modify subsystem states
 *   - Modify power allocation
 *   - Modify pilot maneuvers
 *   - Modify commander effects
 *
 * Integration order (damage resolution):
 *   1. Roll or compute damage
 *   2. Apply shields
 *   3. Apply Glancing (if applicable)
 *   4. Apply HP damage
 *   5. ThresholdEngine logic (this engine)
 *   6. SWES subsystem logic (external)
 *   7. Check for Last Grasp
 *   8. Apply shutdown if HP <= 0
 */

import { SWSELogger } from '../../utils/logger.js';
import { ModifierEngine } from "../effects/modifiers/ModifierEngine.js";

export class ThresholdEngine {

  /* -------------------------------------------------------------------------- */
  /*  BASE THRESHOLD CALCULATION (PURE)                                         */
  /* -------------------------------------------------------------------------- */

  /**
   * Compute base damage threshold without modifiers.
   * RAW: DT = Fortitude Defense + Size Modifier
   *
   * @param {Actor} actor
   * @returns {number} Base threshold value
   */
  static computeBaseThreshold(actor) {
    if (!actor) return 0;

    const system = actor.system;
    const fort = system.defenses?.fortitude?.total ?? 10;
    const sizeMod = system.size?.thresholdBonus ?? 0;

    return fort + sizeMod;
  }

  /**
   * Get full damage threshold with ModifierEngine support.
   * Collects modifiers from "damageThreshold" domain.
   *
   * @param {Actor} actor
   * @param {Object} context - Roll context for modifiers
   * @returns {Promise<Object>} { base, modifierTotal, total, breakdown }
   */
  static async getDamageThreshold(actor, context = {}) {
    const base = this.computeBaseThreshold(actor);

    let modifiers = [];
    try {
      modifiers = await ModifierEngine.collectModifiers(actor, {
        domain: "damageThreshold",
        context
      });
    } catch {
      // ModifierEngine not available or error; use base only
    }

    const modifierTotal = modifiers.reduce((sum, m) => sum + m.value, 0);

    return {
      base,
      modifierTotal,
      total: base + modifierTotal,
      breakdown: modifiers.map(m => ({
        label: m.label,
        value: m.value
      }))
    };
  }

  /* -------------------------------------------------------------------------- */
  /*  SETTINGS HELPERS                                                          */
  /* -------------------------------------------------------------------------- */

  static get enabled() {
    return game.settings?.get('foundryvtt-swse', 'enableEnhancedMassiveDamage') ?? false;
  }

  static _setting(key) {
    try {
      return game.settings?.get('foundryvtt-swse', key);
    } catch {
      return false;
    }
  }

  /* -------------------------------------------------------------------------- */
  /*  DAMAGE THRESHOLD CALCULATION                                              */
  /* -------------------------------------------------------------------------- */

  /**
   * Calculate Damage Threshold for an actor.
   * RAW: DT = Fortitude Defense (characters) or Fortitude + Size Modifier (vehicles)
   * Optional override: DT = Fortitude + heroicLevel + sizeModifier (or half heroicLevel)
   *
   * @param {Actor} actor
   * @returns {number}
   */
  static calculateDamageThreshold(actor) {
    if (!actor) return 0;

    const system = actor.system;
    const isVehicle = actor.type === 'vehicle';

    // If enhanced massive damage is disabled, use RAW calculation
    if (!this.enabled || !this._setting('modifyDamageThresholdFormula')) {
      return system.damageThreshold ?? 0;
    }

    // Enhanced formula
    const formulaType = this._setting('damageThresholdFormulaType') ?? 'fullLevel';

    if (isVehicle) {
      const fortDefense = system.fortitudeDefense ?? 10;
      const sizeMod = this._getVehicleSizeDTModifier(system.size);
      const vehicleLevel = system.challengeLevel ?? 0;

      if (formulaType === 'halfLevel') {
        return fortDefense + Math.floor(vehicleLevel / 2) + sizeMod;
      }
      return fortDefense + vehicleLevel + sizeMod;
    }

    // Character / Droid / NPC
    const fortTotal = system.defenses?.fort?.total ?? 10;
    const heroicLevel = system.heroicLevel ?? system.level ?? 1;
    const sizeMod = this._getCharacterSizeModifier(system.size);

    if (formulaType === 'halfLevel') {
      return fortTotal + Math.floor(heroicLevel / 2) + sizeMod;
    }
    return fortTotal + heroicLevel + sizeMod;
  }

  /**
   * Vehicle size-specific DT modifier (same as RAW)
   * @private
   */
  static _getVehicleSizeDTModifier(size) {
    const modifiers = {
      'large': 5,
      'huge': 10,
      'gargantuan': 20,
      'colossal': 50,
      'colossal (frigate)': 100,
      'colossal (cruiser)': 200,
      'colossal (station)': 500
    };
    return modifiers[(size || 'colossal').toLowerCase()] ?? 0;
  }

  /**
   * Character size modifier for enhanced DT formula
   * @private
   */
  static _getCharacterSizeModifier(size) {
    const modifiers = {
      'fine': -10,
      'diminutive': -5,
      'tiny': -2,
      'small': -1,
      'medium': 0,
      'large': 1,
      'huge': 2,
      'gargantuan': 5,
      'colossal': 10
    };
    return modifiers[(size || 'medium').toLowerCase()] ?? 0;
  }

  /* -------------------------------------------------------------------------- */
  /*  THRESHOLD EVALUATION                                                      */
  /* -------------------------------------------------------------------------- */

  /**
   * Evaluate massive damage effects for a single hit.
   * Called AFTER shields and glancing are applied, AFTER HP damage.
   * Returns an array of CT shift effects to apply.
   *
   * @param {object} params
   * @param {Actor} params.target - Target actor
   * @param {number} params.damage - Final damage dealt (after shields, glancing)
   * @param {boolean} [params.isStun=false] - Whether damage is stun
   * @param {boolean} [params.isIon=false] - Whether damage is ion
   * @param {Actor} [params.attacker] - Attacker actor (for logging)
   * @returns {ThresholdResult}
   */
  static evaluateThreshold({ target, damage, isStun = false, isIon = false, attacker = null }) {
    if (!target) return ThresholdResult.empty();

    const dt = this.calculateDamageThreshold(target);
    const result = new ThresholdResult(target, damage, dt);

    // RAW threshold check (always applies)
    if (damage >= dt && dt > 0) {
      result.thresholdExceeded = true;

      // Standard: -1 CT step
      let ctShift = -1;

      // Double threshold penalty
      if (this.enabled && this._setting('doubleThresholdPenalty') && damage >= 2 * dt) {
        ctShift = -2;
        result.doubleThreshold = true;
      }

      // Stun threshold variant
      if (this.enabled && this._setting('stunThresholdRule') && isStun) {
        ctShift = -2;
        result.stunThreshold = true;

        // Stun >= 2x DT: immediately unconscious
        if (damage >= 2 * dt) {
          result.stunKnockout = true;
        }
      }

      // Determine persistence
      const isPersistent = this.enabled && this._setting('persistentDTPenalty');
      result.addCTShift(ctShift, isPersistent, 'threshold');
    }

    // Ion-specific: DT check uses original (not halved) damage
    // This is handled by the caller passing the correct damage value.

    // Eliminate instant death
    if (this.enabled && this._setting('eliminateInstantDeath')) {
      result.preventInstantDeath = true;
    }

    // Log for debugging
    if (this._setting('devMode')) {
      this.logThresholdEvent(attacker, target, damage, result);
    }

    return result;
  }

  /* -------------------------------------------------------------------------- */
  /*  APPLY THRESHOLD RESULT                                                    */
  /* -------------------------------------------------------------------------- */

  /**
   * Apply the threshold result CT shifts to the target actor.
   * CT shifts stack cleanly but do not duplicate.
   *
   * Order:
   *   1. Apply threshold CT shift
   *   2. Apply stun CT shift (if applicable)
   *   3. Apply HP=0 CT shift (handled externally)
   *   4. SWES escalation (handled externally)
   *
   * @param {ThresholdResult} result
   * @returns {Promise<void>}
   */
  static async applyResult(result) {
    if (!result || !result.target || result.ctShifts.length === 0) return;

    const target = result.target;
    const currentCT = target.system.conditionTrack?.current ?? 0;
    const currentPersistent = target.system.conditionTrack?.persistentSteps ?? 0;

    let totalShift = 0;
    let persistentShift = 0;

    for (const shift of result.ctShifts) {
      totalShift += Math.abs(shift.steps);
      if (shift.persistent) {
        persistentShift += Math.abs(shift.steps);
      }
    }

    // Cap persistent at configured max (default: 3)
    const persistentCap = this._setting('persistentDTPenaltyCap') ?? 3;
    const newPersistent = Math.min(currentPersistent + persistentShift, persistentCap);

    // Apply CT movement
    const newCT = Math.min(currentCT + totalShift, 5);

    // Stun knockout: move to bottom of CT
    if (result.stunKnockout) {
      await target.update({
        'system.conditionTrack.current': 5,
        'system.conditionTrack.persistentSteps': newPersistent
      });
      await this._postChatMessage(target, result, 5);
      return;
    }

    const updates = {
      'system.conditionTrack.current': newCT
    };

    // Only update persistentSteps if enhanced massive damage is enabled
    if (this.enabled && this._setting('persistentDTPenalty')) {
      updates['system.conditionTrack.persistentSteps'] = newPersistent;
    }

    await target.update(updates);
    await this._postChatMessage(target, result, newCT);
  }

  /* -------------------------------------------------------------------------- */
  /*  GLANCING HIT DETECTION                                                    */
  /* -------------------------------------------------------------------------- */

  /**
   * Check if an attack qualifies as a glancing hit.
   *
   * @param {number} attackTotal - Attack roll total
   * @param {number} defense - Target defense value
   * @returns {boolean}
   */
  static isGlancingHit(attackTotal, defense) {
    if (!this._setting('enableGlancingHit')) return false;
    return attackTotal >= defense && attackTotal <= defense + 1;
  }

  /**
   * Apply glancing hit damage reduction.
   * Damage is halved after shields but before HP application.
   *
   * @param {number} damage
   * @returns {number}
   */
  static applyGlancingReduction(damage) {
    return Math.floor(damage / 2);
  }

  /* -------------------------------------------------------------------------- */
  /*  LAST GRASP DETECTION                                                      */
  /* -------------------------------------------------------------------------- */

  /**
   * Check if Last Grasp should trigger for a vehicle that just hit 0 HP.
   *
   * @param {Actor} vehicle - The vehicle at 0 HP
   * @returns {{ eligible: boolean, pilot: Actor|null }}
   */
  static checkLastGrasp(vehicle) {
    if (!this._setting('enableLastGrasp')) return { eligible: false, pilot: null };
    if (vehicle.type !== 'vehicle') return { eligible: false, pilot: null };

    const pilotData = vehicle.system.crewPositions?.pilot;
    const pilotName = typeof pilotData === 'string' ? pilotData : pilotData?.name;
    if (!pilotName) return { eligible: false, pilot: null };

    const pilot = game.actors?.getName(pilotName);
    if (!pilot) return { eligible: false, pilot: null };

    // Must be a PC
    if (!pilot.hasPlayerOwner) return { eligible: false, pilot: null };

    // Must have Force Points
    const fp = pilot.system.forcePoints?.value ?? 0;
    if (fp < 1) return { eligible: false, pilot: null };

    return { eligible: true, pilot };
  }

  /**
   * Execute Last Grasp: deduct Force Point and return action info.
   *
   * @param {Actor} pilot
   * @returns {Promise<boolean>}
   */
  static async executeLastGrasp(pilot) {
    if (!pilot) return false;

    const currentFP = pilot.system.forcePoints?.value ?? 0;
    if (currentFP < 1) return false;

    await pilot.update({
      'system.forcePoints.value': currentFP - 1
    });

    // Post chat message
    await ChatMessage.create({
      content: `<div class="swse-threshold-msg">
        <strong>Last Grasp!</strong><br>
        ${pilot.name} spends a Force Point to take one final action before the vehicle is disabled.
        <br><em>One Standard Action allowed. Then vehicle enters disabled state.</em>
      </div>`,
      speaker: ChatMessage.getSpeaker({ actor: pilot })
    });

    return true;
  }

  /* -------------------------------------------------------------------------- */
  /*  EMERGENCY PATCH                                                           */
  /* -------------------------------------------------------------------------- */

  /**
   * Check if emergency patch is available for a vehicle.
   *
   * @param {Actor} vehicle
   * @returns {boolean}
   */
  static canEmergencyPatch(vehicle) {
    if (!this._setting('enableEmergencyPatch')) return false;
    if (vehicle.type !== 'vehicle') return false;

    // Check if already used this encounter
    const used = vehicle.getFlag('foundryvtt-swse', 'emergencyPatchUsed') ?? false;
    return !used;
  }

  /**
   * Attempt an emergency patch on a vehicle subsystem.
   * Requires: Standard Action, Mechanics DC 20, 1 Force Point from engineer.
   *
   * @param {Actor} vehicle
   * @param {Actor} engineer - The engineer crew member
   * @param {string} subsystem - Subsystem name to repair
   * @param {number} mechanicsCheck - Result of Mechanics check
   * @returns {Promise<{success: boolean, message: string}>}
   */
  static async attemptEmergencyPatch(vehicle, engineer, subsystem, mechanicsCheck) {
    if (!this.canEmergencyPatch(vehicle)) {
      return { success: false, message: 'Emergency Patch not available.' };
    }

    const engineerFP = engineer.system.forcePoints?.value ?? 0;
    if (engineerFP < 1) {
      return { success: false, message: `${engineer.name} has no Force Points remaining.` };
    }

    // Deduct Force Point regardless of outcome
    await engineer.update({
      'system.forcePoints.value': engineerFP - 1
    });

    // Mark as used for this encounter
    await vehicle.setFlag('foundryvtt-swse', 'emergencyPatchUsed', true);

    const dc = 20;
    if (mechanicsCheck < dc) {
      const msg = `Emergency Patch failed! ${engineer.name} rolled ${mechanicsCheck} vs DC ${dc}. Force Point spent.`;
      await ChatMessage.create({
        content: `<div class="swse-threshold-msg"><strong>Emergency Patch Failed</strong><br>${msg}</div>`,
        speaker: ChatMessage.getSpeaker({ actor: engineer })
      });
      return { success: false, message: msg };
    }

    // Success — caller handles the actual subsystem tier change
    const msg = `Emergency Patch succeeded! ${engineer.name} rolled ${mechanicsCheck} vs DC ${dc}. ${subsystem} downgraded by one damage tier.`;
    await ChatMessage.create({
      content: `<div class="swse-threshold-msg"><strong>Emergency Patch Succeeded!</strong><br>${msg}</div>`,
      speaker: ChatMessage.getSpeaker({ actor: engineer })
    });

    return { success: true, message: msg };
  }

  /* -------------------------------------------------------------------------- */
  /*  SUBSYSTEM REPAIR COST                                                     */
  /* -------------------------------------------------------------------------- */

  /**
   * Calculate repair cost for a subsystem tier.
   *
   * @param {Actor} vehicle
   * @param {number} [tiers=1] - Number of tiers to repair
   * @returns {number} Credit cost
   */
  static calculateRepairCost(vehicle, tiers = 1) {
    if (!this._setting('enableSubsystemRepairCost')) return 0;
    if (vehicle.type !== 'vehicle') return 0;

    const baseCost = vehicle.system.cost?.new ?? 0;
    return Math.floor(baseCost * 0.15) * tiers;
  }

  /* -------------------------------------------------------------------------- */
  /*  ELIMINATE INSTANT DEATH                                                   */
  /* -------------------------------------------------------------------------- */

  /**
   * Apply instant death prevention.
   * Instead of death, target drops to 0 HP and moves to bottom of CT.
   *
   * @param {Actor} target
   * @returns {Promise<void>}
   */
  static async applyDeathPrevention(target) {
    if (!this.enabled || !this._setting('eliminateInstantDeath')) return;

    const isVehicle = target.type === 'vehicle';
    const hpField = isVehicle ? 'system.hull.value' : 'system.hp.value';

    await target.update({
      [hpField]: 0,
      'system.conditionTrack.current': 5
    });

    await ChatMessage.create({
      content: `<div class="swse-threshold-msg">
        <strong>Death Prevented!</strong><br>
        ${target.name} drops to 0 HP and becomes helpless instead of dying.
        <br><em>Stabilization rules apply.</em>
      </div>`,
      speaker: ChatMessage.getSpeaker({ actor: target })
    });
  }

  /* -------------------------------------------------------------------------- */
  /*  CHAT MESSAGES                                                             */
  /* -------------------------------------------------------------------------- */

  /** @private */
  static async _postChatMessage(target, result, newCT) {
    const parts = [];

    if (result.thresholdExceeded) {
      parts.push(`Damage (${result.damage}) exceeded Damage Threshold (${result.dt}).`);
    }
    if (result.doubleThreshold) {
      parts.push('Double Threshold! -2 CT steps applied.');
    }
    if (result.stunThreshold) {
      parts.push('Stun Threshold! -2 CT steps from stun damage.');
    }
    if (result.stunKnockout) {
      parts.push('Stun Knockout! Target falls unconscious.');
    }

    const persistentNote = result.ctShifts.some(s => s.persistent)
      ? ' (Persistent — requires medical/engineering treatment to remove)'
      : '';

    const labels = ['Normal', '-1', '-2', '-5', '-10', 'Helpless'];
    parts.push(`Condition Track: ${labels[newCT] ?? 'Unknown'}${persistentNote}`);

    await ChatMessage.create({
      content: `<div class="swse-threshold-msg">
        <strong>Massive Damage — ${target.name}</strong><br>
        ${parts.join('<br>')}
      </div>`,
      speaker: ChatMessage.getSpeaker({ actor: target })
    });
  }

  /* -------------------------------------------------------------------------- */
  /*  DEBUG LOGGING                                                             */
  /* -------------------------------------------------------------------------- */

  /**
   * Log threshold event for debugging.
   * Only active when devMode is enabled.
   */
  static logThresholdEvent(attacker, target, damage, result) {
    const devMode = game.settings?.get('foundryvtt-swse', 'devMode') ?? false;
    if (!devMode) return;

    SWSELogger.info('ThresholdEngine Event', {
      attacker: attacker?.name ?? 'Unknown',
      target: target?.name ?? 'Unknown',
      damage,
      dt: result.dt,
      thresholdExceeded: result.thresholdExceeded,
      doubleThreshold: result.doubleThreshold,
      stunThreshold: result.stunThreshold,
      stunKnockout: result.stunKnockout,
      preventInstantDeath: result.preventInstantDeath,
      ctShifts: result.ctShifts
    });
  }

  /* -------------------------------------------------------------------------- */
  /*  COMBAT RESET                                                              */
  /* -------------------------------------------------------------------------- */

  /**
   * Reset encounter-specific flags (emergency patch usage).
   * Should be called when combat ends.
   *
   * @param {Combat} combat
   */
  static async onCombatEnd(combat) {
    if (!combat) return;

    for (const combatant of combat.combatants) {
      const actor = combatant.actor;
      if (!actor || actor.type !== 'vehicle') continue;

      try {
        await actor.unsetFlag('foundryvtt-swse', 'emergencyPatchUsed');
      } catch {
        // Flag might not exist; ignore
      }
    }
  }
}

/* -------------------------------------------------------------------------- */
/*  THRESHOLD RESULT DATA CLASS                                               */
/* -------------------------------------------------------------------------- */

export class ThresholdResult {
  /**
   * @param {Actor} target
   * @param {number} damage
   * @param {number} dt
   */
  constructor(target, damage, dt) {
    this.target = target;
    this.damage = damage;
    this.dt = dt;
    this.thresholdExceeded = false;
    this.doubleThreshold = false;
    this.stunThreshold = false;
    this.stunKnockout = false;
    this.preventInstantDeath = false;
    /** @type {Array<{steps: number, persistent: boolean, source: string}>} */
    this.ctShifts = [];
  }

  addCTShift(steps, persistent, source) {
    this.ctShifts.push({ steps, persistent, source });
  }

  get totalCTShift() {
    return this.ctShifts.reduce((sum, s) => sum + s.steps, 0);
  }

  static empty() {
    return new ThresholdResult(null, 0, 0);
  }
}
