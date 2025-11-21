/**
 * Main Vehicle Combat System for SWSE
 * Implements complete SWSE vehicle combat rules including:
 * - Proper attack/damage calculations with vehicle stats
 * - Crew quality system (Untrained to Ace)
 * - Weapon range bands with penalties
 * - Damage multipliers for vehicle weapons
 * - Dogfight system for starfighters
 * - Collision mechanics
 * - Missiles/Torpedoes with lock-on
 * - Weapon batteries (narrow salvo, proximity spread)
 * - Fighter groups
 * - Two combat scales (Character Scale vs Starship Scale)
 */

import { SWSELogger } from '../../../utils/logger.js';
import { getDefaultGunner, getDefaultPilot, getTargetReflexDefense, getVehicleDamageThreshold, CONDITION_TRACK_LABELS } from './vehicle-shared.js';
import { calculateAttackBonus, calculateDamage } from './vehicle-calculations.js';
import * as Dogfighting from './vehicle-dogfighting.js';
import * as Collisions from './vehicle-collisions.js';
import * as Weapons from './vehicle-weapons.js';

export class SWSEVehicleCombat {

  /**
   * Roll vehicle weapon attack
   * Formula: 1d20 + Gunner BAB + Vehicle INT mod + Range Modifier
   * @param {Actor} vehicle - The vehicle actor
   * @param {Object} weapon - The weapon being fired
   * @param {Actor} target - The target vehicle/actor
   * @param {Object} options - Additional options (gunner, range, etc.)
   * @returns {Promise<Object>} Attack result
   */
  static async rollAttack(vehicle, weapon, target = null, options = {}) {
    const gunner = options.gunner || getDefaultGunner(vehicle);
    const range = options.range || 'short'; // point-blank, short, medium, long

    // Calculate attack bonus
    const attackData = calculateAttackBonus(vehicle, weapon, gunner, range);

    // Roll attack
    const roll = await new Roll(`1d20 + ${attackData.bonus}`).evaluate({async: true});
    const d20Result = roll.terms[0].results[0].result;

    // Determine if it's a natural 1 or 20
    const isNat1 = d20Result === 1;
    const isNat20 = d20Result === 20;

    const result = {
      vehicle,
      weapon,
      target,
      gunner,
      roll,
      total: roll.total,
      d20: d20Result,
      bonus: attackData.bonus,
      breakdown: attackData.breakdown,
      range,
      isNat1,
      isNat20,
      hits: false,
      isCrit: false
    };

    // Check if attack hits
    if (target) {
      const targetReflex = getTargetReflexDefense(target);
      result.targetDefense = targetReflex;

      // Natural 1 always misses, natural 20 always hits and crits
      if (isNat1) {
        result.hits = false;
      } else if (isNat20) {
        result.hits = true;
        result.isCrit = true;
      } else {
        result.hits = roll.total >= targetReflex;
      }
    }

    // Create chat message
    await this._createAttackMessage(result);

    return result;
  }

  /**
   * Roll vehicle weapon damage
   * Formula: (Weapon Damage + ½ Pilot Heroic Level + Misc) × Damage Multiplier
   * @param {Actor} vehicle - The vehicle actor
   * @param {Object} weapon - The weapon being fired
   * @param {Actor} target - The target vehicle/actor
   * @param {Object} options - Additional options (pilot, isCrit, etc.)
   * @returns {Promise<Object>} Damage result
   */
  static async rollDamage(vehicle, weapon, target = null, options = {}) {
    const pilot = options.pilot || getDefaultPilot(vehicle);
    const isCrit = options.isCrit || false;

    const damageData = calculateDamage(vehicle, weapon, pilot, isCrit);

    // Roll base damage
    const baseRoll = await new Roll(damageData.baseDamage).evaluate({async: true});

    // Add modifiers before multiplying
    const modifiedDamage = baseRoll.total + damageData.modifier;

    // Apply damage multiplier
    const finalDamage = modifiedDamage * damageData.multiplier;

    const result = {
      vehicle,
      weapon,
      target,
      pilot,
      baseRoll,
      baseDamage: baseRoll.total,
      modifier: damageData.modifier,
      multiplier: damageData.multiplier,
      finalDamage: Math.floor(finalDamage),
      breakdown: damageData.breakdown,
      isCrit,
      applied: false
    };

    // Apply damage if target selected
    if (target) {
      const damageApplied = await this.applyDamageToVehicle(target, result.finalDamage);
      result.applied = true;
      result.damageApplied = damageApplied;
    }

    // Create chat message
    await this._createDamageMessage(result);

    return result;
  }

  /**
   * Apply damage to vehicle (with shields, DR, and damage threshold check)
   * Sequence: Shields → DR → Hull → Damage Threshold Check
   * @param {Actor} vehicle - The target vehicle
   * @param {number} damage - Raw damage amount
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Damage application result
   */
  static async applyDamageToVehicle(vehicle, damage, options = {}) {
    let remainingDamage = damage;
    const result = {
      totalDamage: damage,
      shieldDamage: 0,
      drReduced: 0,
      hullDamage: 0,
      thresholdExceeded: false,
      conditionMoved: false
    };

    // 1. Apply to shields first (if vehicle has shield system)
    const shields = vehicle.system.shields?.value || 0;
    if (shields > 0) {
      const shieldDamage = Math.min(remainingDamage, shields);
      result.shieldDamage = shieldDamage;
      remainingDamage -= shieldDamage;

      await vehicle.update({'system.shields.value': shields - shieldDamage});

      if (shieldDamage > 0) {
        ui.notifications.info(`${vehicle.name}'s shields absorb ${shieldDamage} damage! (${shields - shieldDamage} remaining)`);
      }
    }

    // 2. Apply damage reduction (DR)
    const dr = vehicle.system.damageReduction || 0;
    if (dr > 0 && remainingDamage > 0) {
      const drReduction = Math.min(remainingDamage, dr);
      result.drReduced = drReduction;
      remainingDamage -= drReduction;

      if (drReduction > 0) {
        ui.notifications.info(`${vehicle.name}'s armor reduces damage by ${drReduction}!`);
      }
    }

    // 3. Apply remaining damage to hull
    if (remainingDamage > 0) {
      result.hullDamage = remainingDamage;
      const currentHull = vehicle.system.hull?.value || 0;
      const newHull = Math.max(0, currentHull - remainingDamage);

      await vehicle.update({'system.hull.value': newHull});

      // Check if damage exceeded threshold
      const threshold = getVehicleDamageThreshold(vehicle);
      result.thresholdExceeded = damage >= threshold;

      if (result.thresholdExceeded) {
        // Move down condition track
        await this._moveVehicleConditionTrack(vehicle, 1);
        result.conditionMoved = true;
        ui.notifications.warn(`${vehicle.name} takes a hit! Damage threshold exceeded!`);
      }

      // Check if vehicle is destroyed
      if (newHull === 0 && result.thresholdExceeded) {
        ui.notifications.error(`${vehicle.name} is DESTROYED!`);
        // Deal damage to occupants (half the damage that exceeded threshold)
        const occupantDamage = Math.floor((damage - threshold) / 2);
        if (occupantDamage > 0) {
          ui.notifications.warn(`Occupants take ${occupantDamage} damage from vehicle destruction!`);
        }
      }
    }

    return result;
  }

  /**
   * Initiate dogfight between two starfighters/airspeeders
   * @param {Actor} initiator - The initiating vehicle
   * @param {Actor} target - The target vehicle
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Dogfight result
   */
  static async initiateDogfight(initiator, target, options = {}) {
    return await Dogfighting.initiateDogfight(initiator, target, options);
  }

  /**
   * Attack within a dogfight (requires opposed Pilot check first)
   * @param {Actor} attacker - The attacking vehicle in dogfight
   * @param {Actor} defender - The defending vehicle in dogfight
   * @param {Object} weapon - The weapon to use
   * @returns {Promise<Object>} Dogfight attack result
   */
  static async attackInDogfight(attacker, defender, weapon) {
    return await Dogfighting.attackInDogfight(attacker, defender, weapon, this.rollAttack.bind(this));
  }

  /**
   * Disengage from dogfight
   * @param {Actor} vehicle - The vehicle attempting to disengage
   * @param {Actor} opponent - The opponent in the dogfight
   * @returns {Promise<boolean>} Success status
   */
  static async disengageFromDogfight(vehicle, opponent) {
    return await Dogfighting.disengageFromDogfight(vehicle, opponent);
  }

  /**
   * Handle collision between vehicle and object
   * @param {Actor} vehicle - The colliding vehicle
   * @param {Object} object - The object being collided with (vehicle, structure, etc.)
   * @param {Object} options - Additional options (allOutMovement, etc.)
   * @returns {Promise<Object>} Collision result
   */
  static async handleCollision(vehicle, object, options = {}) {
    return await Collisions.handleCollision(vehicle, object, options, this.applyDamageToVehicle.bind(this));
  }

  /**
   * Fire missile or torpedo (with lock-on capability)
   * @param {Actor} vehicle - The firing vehicle
   * @param {Object} weapon - The missile/torpedo weapon
   * @param {Actor} target - The target vehicle
   * @param {Object} options - Additional options (aimed, etc.)
   * @returns {Promise<Object>} Missile attack result
   */
  static async fireMissile(vehicle, weapon, target, options = {}) {
    return await Weapons.fireMissile(vehicle, weapon, target, options, this.rollAttack.bind(this));
  }

  /**
   * Second attack for locked-on missile (automatic on next turn)
   * @param {Actor} vehicle - The firing vehicle
   * @param {Object} missileState - The stored missile state
   * @returns {Promise<Object>} Second attack result
   */
  static async missileSecondAttack(vehicle, missileState) {
    return await Weapons.missileSecondAttack(vehicle, missileState, this.rollDamage.bind(this));
  }

  /**
   * Fire weapon battery (narrow salvo or proximity spread)
   * @param {Actor} vehicle - The firing vehicle
   * @param {Array} weapons - Array of identical weapons in battery (up to 6)
   * @param {Actor} target - The target
   * @param {Object} options - Additional options (mode: 'narrow' or 'proximity')
   * @returns {Promise<Object>} Battery attack result
   */
  static async fireWeaponBattery(vehicle, weapons, target, options = {}) {
    return await Weapons.fireWeaponBattery(vehicle, weapons, target, options, this.rollAttack.bind(this), this.rollDamage.bind(this));
  }

  // ========== Helper Methods ==========

  /**
   * Move vehicle down condition track
   * @private
   */
  static async _moveVehicleConditionTrack(vehicle, steps) {
    const current = vehicle.system.conditionTrack?.current || 0;
    const newPosition = Math.min(5, current + steps);

    if (newPosition !== current) {
      await vehicle.update({'system.conditionTrack.current': newPosition});
      ui.notifications.warn(`${vehicle.name} condition: ${CONDITION_TRACK_LABELS[newPosition]}`);
    }
  }

  // ========== Chat Messages ==========

  /**
   * Create attack chat message
   * @private
   */
  static async _createAttackMessage(result) {
    const { vehicle, weapon, target, roll, total, hits, breakdown, range } = result;

    let content = `
      <div class="swse-vehicle-attack-roll">
        <div class="attack-header">
          <h3><i class="fas fa-crosshairs"></i> ${weapon.name} Attack</h3>
          <div class="vehicle-name">${vehicle.name}</div>
        </div>
        <div class="dice-roll">
          <div class="dice-result">
            <div class="dice-formula">${roll.formula}</div>
            <div class="dice-total">${total}</div>
          </div>
        </div>
        <div class="attack-breakdown">
          <strong>Breakdown:</strong>
          Gunner BAB ${breakdown.gunnerBAB >= 0 ? '+' : ''}${breakdown.gunnerBAB},
          Vehicle INT ${breakdown.vehicleInt >= 0 ? '+' : ''}${breakdown.vehicleInt},
          Range (${range}) ${breakdown.rangeModifier >= 0 ? '+' : ''}${breakdown.rangeModifier}
          ${breakdown.weaponBonus !== 0 ? `, Weapon ${breakdown.weaponBonus >= 0 ? '+' : ''}${breakdown.weaponBonus}` : ''}
        </div>
    `;

    if (target) {
      content += `
        <div class="attack-result">
          <strong>vs ${target.name}'s Reflex Defense (${result.targetDefense})</strong>
          <div class="result-text ${hits ? 'hit' : 'miss'}">
            ${hits ? '<i class="fas fa-check-circle"></i> HIT!' : '<i class="fas fa-times-circle"></i> MISS!'}
          </div>
        </div>
      `;
    }

    content += `</div>`;

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({actor: vehicle}),
      content,
      type: CONST.CHAT_MESSAGE_TYPES.ROLL,
      roll
    });
  }

  /**
   * Create damage chat message
   * @private
   */
  static async _createDamageMessage(result) {
    const { vehicle, weapon, target, baseRoll, modifier, multiplier, finalDamage, damageApplied } = result;

    let content = `
      <div class="swse-vehicle-damage-roll">
        <div class="damage-header">
          <h3><i class="fas fa-burst"></i> ${weapon.name} Damage</h3>
        </div>
        <div class="dice-roll">
          <div class="dice-result">
            <div class="dice-formula">${baseRoll.formula}</div>
            <div class="dice-total">Base: ${baseRoll.total}</div>
          </div>
        </div>
        <div class="damage-calculation">
          <strong>Calculation:</strong>
          (${baseRoll.total} + ${modifier}) × ${multiplier} = <strong>${finalDamage}</strong>
        </div>
    `;

    if (damageApplied && target) {
      content += `
        <div class="damage-applied">
          <strong>Damage Applied to ${target.name}:</strong>
          ${damageApplied.shieldDamage > 0 ? `<div>⚡ Shields: ${damageApplied.shieldDamage}</div>` : ''}
          ${damageApplied.drReduced > 0 ? `<div>🛡️ DR: ${damageApplied.drReduced}</div>` : ''}
          ${damageApplied.hullDamage > 0 ? `<div>🚀 Hull: ${damageApplied.hullDamage}</div>` : ''}
          ${damageApplied.thresholdExceeded ? `<div class="threshold-warning">⚠️ Damage Threshold Exceeded!</div>` : ''}
        </div>
      `;
    }

    content += `</div>`;

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({actor: vehicle}),
      content,
      type: CONST.CHAT_MESSAGE_TYPES.ROLL,
      roll: baseRoll
    });
  }

  /**
   * Initialize vehicle combat system
   */
  static init() {
    SWSELogger.log('SWSE | Vehicle Combat System initialized');
  }
}

// Make available globally
window.SWSEVehicleCombat = SWSEVehicleCombat;
