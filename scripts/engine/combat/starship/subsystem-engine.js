/**
 * SubsystemEngine (SWES) — Star Wars Enhanced Subsystem damage tracking.
 *
 * Vehicles have subsystems that can be individually damaged, disabled, or destroyed.
 * Subsystem damage triggers based on HP/DT interactions, NOT CT shifts.
 *
 * Subsystem Types:
 *   - engines    (propulsion, hyperdrive)
 *   - weapons    (weapon batteries, turrets)
 *   - shields    (shield generators)
 *   - sensors    (sensors, comms)
 *   - comms      (communications array)
 *   - lifeSupport (life support systems)
 *
 * Damage Tiers:
 *   - normal     (fully operational)
 *   - damaged    (functional with penalties)
 *   - disabled   (non-functional, repairable)
 *   - destroyed  (non-functional, not field-repairable)
 *
 * Escalation: When DT is exceeded, a random or targeted subsystem takes damage.
 *
 * Gated behind enableSWES world setting.
 * Runs AFTER ThresholdEngine in damage resolution order.
 */

import { SWSELogger } from '../../../utils/logger.js';

export class SubsystemEngine {

  static SUBSYSTEMS = Object.freeze([
    'engines', 'weapons', 'shields', 'sensors', 'comms', 'lifeSupport'
  ]);

  static TIERS = Object.freeze({
    NORMAL: 'normal',
    DAMAGED: 'damaged',
    DISABLED: 'disabled',
    DESTROYED: 'destroyed'
  });

  static TIER_ORDER = Object.freeze(['normal', 'damaged', 'disabled', 'destroyed']);

  /** Penalties applied per subsystem at each damage tier */
  static TIER_PENALTIES = Object.freeze({
    engines: {
      damaged: { speedMultiplier: 0.5, description: 'Speed halved' },
      disabled: { speedMultiplier: 0, description: 'No movement' },
      destroyed: { speedMultiplier: 0, description: 'No movement, no hyperdrive' }
    },
    weapons: {
      damaged: { attackPenalty: -2, description: '-2 to attack rolls' },
      disabled: { attackPenalty: -999, description: 'Weapons offline' },
      destroyed: { attackPenalty: -999, description: 'Weapons destroyed' }
    },
    shields: {
      damaged: { shieldMultiplier: 0.5, description: 'Shield rating halved' },
      disabled: { shieldMultiplier: 0, description: 'Shields offline' },
      destroyed: { shieldMultiplier: 0, description: 'Shields destroyed' }
    },
    sensors: {
      damaged: { perceptionPenalty: -5, description: '-5 Perception' },
      disabled: { perceptionPenalty: -10, description: 'Sensors offline, -10 Perception' },
      destroyed: { perceptionPenalty: -20, description: 'Sensors destroyed, blind' }
    },
    comms: {
      damaged: { description: 'Comms degraded, short range only' },
      disabled: { description: 'Comms offline' },
      destroyed: { description: 'Comms destroyed' }
    },
    lifeSupport: {
      damaged: { description: 'Life support failing (1 hour reserve)' },
      disabled: { description: 'Life support offline (10 minutes reserve)' },
      destroyed: { description: 'Life support destroyed (immediate evacuation needed)' }
    }
  });

  /* -------------------------------------------------------------------------- */
  /*  SETTINGS                                                                  */
  /* -------------------------------------------------------------------------- */

  static get enabled() {
    try {
      return game.settings?.get('foundryvtt-swse', 'enableSWES') ?? false;
    } catch {
      return false;
    }
  }

  /* -------------------------------------------------------------------------- */
  /*  SUBSYSTEM STATE                                                           */
  /* -------------------------------------------------------------------------- */

  /**
   * Get current subsystem states for a vehicle.
   *
   * @param {Actor} vehicle
   * @returns {Object<string, string>} Map of subsystem name to tier
   */
  static getSubsystems(vehicle) {
    if (!vehicle || vehicle.type !== 'vehicle') return {};

    const subsystems = vehicle.system.subsystems ?? {};
    const result = {};

    for (const name of this.SUBSYSTEMS) {
      result[name] = subsystems[name] ?? this.TIERS.NORMAL;
    }

    return result;
  }

  /**
   * Get a single subsystem's current tier.
   *
   * @param {Actor} vehicle
   * @param {string} subsystem
   * @returns {string}
   */
  static getSubsystemTier(vehicle, subsystem) {
    return vehicle?.system?.subsystems?.[subsystem] ?? this.TIERS.NORMAL;
  }

  /**
   * Get penalties for a subsystem at its current tier.
   *
   * @param {string} subsystem
   * @param {string} tier
   * @returns {Object}
   */
  static getTierPenalties(subsystem, tier) {
    return this.TIER_PENALTIES[subsystem]?.[tier] ?? {};
  }

  /* -------------------------------------------------------------------------- */
  /*  ESCALATION                                                                */
  /* -------------------------------------------------------------------------- */

  /**
   * Trigger subsystem escalation when DT is exceeded.
   * Called by ThresholdEngine AFTER CT shifts are applied.
   *
   * @param {Actor} vehicle
   * @param {number} damage - Damage that exceeded DT
   * @param {Object} [options]
   * @param {string} [options.targetSubsystem] - Specific subsystem to damage (GM choice)
   * @param {boolean} [options.isIon=false] - Ion damage targets shields/sensors first
   * @returns {Promise<{subsystem: string, oldTier: string, newTier: string}|null>}
   */
  static async escalate(vehicle, damage, options = {}) {
    if (!this.enabled) return null;
    if (!vehicle || vehicle.type !== 'vehicle') return null;

    let target = options.targetSubsystem;

    // If no specific target, determine which subsystem takes damage
    if (!target) {
      target = this._selectSubsystem(vehicle, options.isIon);
    }

    if (!target) return null;

    const currentTier = this.getSubsystemTier(vehicle, target);
    const currentIdx = this.TIER_ORDER.indexOf(currentTier);

    // Already destroyed, can't escalate further
    if (currentIdx >= this.TIER_ORDER.length - 1) {
      // Try another subsystem
      target = this._selectSubsystem(vehicle, options.isIon, [target]);
      if (!target) return null;
    }

    const newTier = this._getNextTier(currentTier);
    if (newTier === currentTier) return null;

    // Apply the subsystem damage
    await this._setSubsystemTier(vehicle, target, newTier);

    // Post chat message
    const penalties = this.getTierPenalties(target, newTier);
    await this._postEscalationMessage(vehicle, target, currentTier, newTier, penalties);

    return { subsystem: target, oldTier: currentTier, newTier };
  }

  /**
   * Repair a subsystem by one tier.
   *
   * @param {Actor} vehicle
   * @param {string} subsystem
   * @returns {Promise<{oldTier: string, newTier: string}|null>}
   */
  static async repairSubsystem(vehicle, subsystem) {
    if (!vehicle || vehicle.type !== 'vehicle') return null;

    const currentTier = this.getSubsystemTier(vehicle, subsystem);

    // Can't repair destroyed in combat (needs dry dock)
    if (currentTier === this.TIERS.DESTROYED) return null;

    const newTier = this._getPreviousTier(currentTier);
    if (newTier === currentTier) return null;

    await this._setSubsystemTier(vehicle, subsystem, newTier);

    await ChatMessage.create({
      content: `<div class="swse-subsystem-msg">
        <strong>Subsystem Repaired — ${vehicle.name}</strong><br>
        ${this._formatSubsystemName(subsystem)}: ${currentTier} → ${newTier}
      </div>`,
      speaker: ChatMessage.getSpeaker({ actor: vehicle })
    });

    return { oldTier: currentTier, newTier };
  }

  /* -------------------------------------------------------------------------- */
  /*  AGGREGATE PENALTIES                                                      */
  /* -------------------------------------------------------------------------- */

  /**
   * Get all active subsystem penalties for a vehicle.
   * Used by other engines to factor in subsystem damage.
   *
   * @param {Actor} vehicle
   * @returns {Object}
   */
  static getAggregatePenalties(vehicle) {
    const result = {
      speedMultiplier: 1,
      attackPenalty: 0,
      shieldMultiplier: 1,
      perceptionPenalty: 0,
      weaponsOffline: false,
      shieldsOffline: false,
      enginesOffline: false,
      sensorsOffline: false,
      commsOffline: false,
      lifeSupportOffline: false
    };

    if (!this.enabled || !vehicle || vehicle.type !== 'vehicle') return result;

    for (const subsystem of this.SUBSYSTEMS) {
      const tier = this.getSubsystemTier(vehicle, subsystem);
      if (tier === this.TIERS.NORMAL) continue;

      const penalties = this.getTierPenalties(subsystem, tier);

      if (penalties.speedMultiplier !== undefined) {
        result.speedMultiplier = Math.min(result.speedMultiplier, penalties.speedMultiplier);
      }
      if (penalties.attackPenalty !== undefined) {
        if (penalties.attackPenalty <= -999) {
          result.weaponsOffline = true;
        } else {
          result.attackPenalty += penalties.attackPenalty;
        }
      }
      if (penalties.shieldMultiplier !== undefined) {
        result.shieldMultiplier = Math.min(result.shieldMultiplier, penalties.shieldMultiplier);
      }
      if (penalties.perceptionPenalty !== undefined) {
        result.perceptionPenalty += penalties.perceptionPenalty;
      }

      // Track offline states
      if (tier === this.TIERS.DISABLED || tier === this.TIERS.DESTROYED) {
        if (subsystem === 'engines') result.enginesOffline = true;
        if (subsystem === 'shields') result.shieldsOffline = true;
        if (subsystem === 'sensors') result.sensorsOffline = true;
        if (subsystem === 'comms') result.commsOffline = true;
        if (subsystem === 'lifeSupport') result.lifeSupportOffline = true;
      }
    }

    return result;
  }

  /* -------------------------------------------------------------------------- */
  /*  INTERNALS                                                                 */
  /* -------------------------------------------------------------------------- */

  /** @private Select a random damageable subsystem */
  static _selectSubsystem(vehicle, isIon = false, exclude = []) {
    const candidates = this.SUBSYSTEMS.filter(s => {
      if (exclude.includes(s)) return false;
      const tier = this.getSubsystemTier(vehicle, s);
      return tier !== this.TIERS.DESTROYED;
    });

    if (candidates.length === 0) return null;

    // Ion damage prioritizes shields, then sensors
    if (isIon) {
      if (candidates.includes('shields')) return 'shields';
      if (candidates.includes('sensors')) return 'sensors';
    }

    // Random selection
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  /** @private */
  static _getNextTier(tier) {
    const idx = this.TIER_ORDER.indexOf(tier);
    return idx < this.TIER_ORDER.length - 1 ? this.TIER_ORDER[idx + 1] : tier;
  }

  /** @private */
  static _getPreviousTier(tier) {
    const idx = this.TIER_ORDER.indexOf(tier);
    return idx > 0 ? this.TIER_ORDER[idx - 1] : tier;
  }

  /** @private */
  static async _setSubsystemTier(vehicle, subsystem, tier) {
    await vehicle.update({
      [`system.subsystems.${subsystem}`]: tier
    });
  }

  /** @private */
  static _formatSubsystemName(name) {
    const names = {
      engines: 'Engines',
      weapons: 'Weapons',
      shields: 'Shields',
      sensors: 'Sensors',
      comms: 'Communications',
      lifeSupport: 'Life Support'
    };
    return names[name] ?? name;
  }

  /** @private */
  static async _postEscalationMessage(vehicle, subsystem, oldTier, newTier, penalties) {
    const desc = penalties.description ?? '';
    await ChatMessage.create({
      content: `<div class="swse-subsystem-msg">
        <strong>Subsystem Damaged — ${vehicle.name}</strong><br>
        ${this._formatSubsystemName(subsystem)}: ${oldTier} → <strong>${newTier}</strong>
        ${desc ? `<br><em>${desc}</em>` : ''}
      </div>`,
      speaker: ChatMessage.getSpeaker({ actor: vehicle })
    });
  }
}
