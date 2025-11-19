import { SWSELogger } from '../utils/logger.js';
/**
 * Vehicle Combat System for SWSE
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
    const gunner = options.gunner || this._getDefaultGunner(vehicle);
    const range = options.range || 'short'; // point-blank, short, medium, long

    // Calculate attack bonus
    const attackData = this._calculateAttackBonus(vehicle, weapon, gunner, range);

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
      const targetReflex = this._getTargetReflexDefense(target);
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
    const pilot = options.pilot || this._getDefaultPilot(vehicle);
    const isCrit = options.isCrit || false;

    const damageData = this._calculateDamage(vehicle, weapon, pilot, isCrit);

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
      const threshold = this._getVehicleDamageThreshold(vehicle);
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
    // Both must be airspeeders or starfighters
    if (!this._isStarfighter(initiator) || !this._isStarfighter(target)) {
      ui.notifications.warn('Dogfights can only occur between Airspeeders or Starfighters!');
      return null;
    }

    const initiatorPilot = this._getDefaultPilot(initiator);
    const targetPilot = this._getDefaultPilot(target);

    // Make opposed Pilot checks (initiator has -5 penalty)
    const initiatorBonus = this._getPilotBonus(initiator, initiatorPilot) - 5;
    const targetBonus = this._getPilotBonus(target, targetPilot);

    const initiatorRoll = await new Roll(`1d20 + ${initiatorBonus}`).evaluate({async: true});
    const targetRoll = await new Roll(`1d20 + ${targetBonus}`).evaluate({async: true});

    const result = {
      initiator,
      target,
      initiatorPilot,
      targetPilot,
      initiatorRoll,
      targetRoll,
      initiatorTotal: initiatorRoll.total,
      targetTotal: targetRoll.total,
      success: initiatorRoll.total > targetRoll.total,
      dogfightEngaged: false
    };

    if (result.success) {
      // Dogfight engaged - both vehicles are now in dogfight
      result.dogfightEngaged = true;
      await this._setDogfightState(initiator, target, true);
      ui.notifications.info(`${initiator.name} engages ${target.name} in a dogfight!`);
    } else {
      ui.notifications.info(`${initiator.name} fails to engage ${target.name} in dogfight.`);
    }

    // Create chat message
    await this._createDogfightMessage(result);

    return result;
  }

  /**
   * Attack within a dogfight (requires opposed Pilot check first)
   * @param {Actor} attacker - The attacking vehicle in dogfight
   * @param {Actor} defender - The defending vehicle in dogfight
   * @param {Object} weapon - The weapon to use
   * @returns {Promise<Object>} Dogfight attack result
   */
  static async attackInDogfight(attacker, defender, weapon) {
    const attackerPilot = this._getDefaultPilot(attacker);
    const defenderPilot = this._getDefaultPilot(defender);

    // Make opposed Pilot check
    const attackerBonus = this._getPilotBonus(attacker, attackerPilot);
    const defenderBonus = this._getPilotBonus(defender, defenderPilot);

    const attackerRoll = await new Roll(`1d20 + ${attackerBonus}`).evaluate({async: true});
    const defenderRoll = await new Roll(`1d20 + ${defenderBonus}`).evaluate({async: true});

    const success = attackerRoll.total > defenderRoll.total;

    const result = {
      attacker,
      defender,
      attackerRoll,
      defenderRoll,
      success,
      weaponAttack: null
    };

    if (success) {
      // Can make a single weapon attack as swift action
      const weaponAttack = await this.rollAttack(attacker, weapon, defender, {
        gunner: attackerPilot
      });
      result.weaponAttack = weaponAttack;
    } else {
      ui.notifications.info(`${attacker.name}'s gunners take -5 penalty on attacks until next turn.`);
    }

    return result;
  }

  /**
   * Disengage from dogfight
   * @param {Actor} vehicle - The vehicle attempting to disengage
   * @param {Actor} opponent - The opponent in the dogfight
   * @returns {Promise<boolean>} Success status
   */
  static async disengageFromDogfight(vehicle, opponent) {
    const vehiclePilot = this._getDefaultPilot(vehicle);
    const opponentPilot = this._getDefaultPilot(opponent);

    const vehicleBonus = this._getPilotBonus(vehicle, vehiclePilot);
    const opponentBonus = this._getPilotBonus(opponent, opponentPilot);

    const vehicleRoll = await new Roll(`1d20 + ${vehicleBonus}`).evaluate({async: true});
    const opponentRoll = await new Roll(`1d20 + ${opponentBonus}`).evaluate({async: true});

    const success = vehicleRoll.total > opponentRoll.total;

    if (success) {
      await this._setDogfightState(vehicle, opponent, false);
      ui.notifications.info(`${vehicle.name} disengages from the dogfight!`);
      return true;
    } else {
      ui.notifications.info(`${vehicle.name} fails to disengage! Gunners take -5 penalty.`);
      return false;
    }
  }

  /**
   * Handle collision between vehicle and object
   * @param {Actor} vehicle - The colliding vehicle
   * @param {Object} object - The object being collided with (vehicle, structure, etc.)
   * @param {Object} options - Additional options (allOutMovement, etc.)
   * @returns {Promise<Object>} Collision result
   */
  static async handleCollision(vehicle, object, options = {}) {
    const vehicleSize = vehicle.system.size || 'medium';
    const objectSize = object.system?.size || object.size || 'medium';
    const allOutMovement = options.allOutMovement || false;

    // Calculate collision damage for both
    const vehicleDamage = this._calculateCollisionDamage(object, objectSize);
    const objectDamage = this._calculateCollisionDamage(vehicle, vehicleSize);

    // Double damage if using all-out movement
    const finalVehicleDamage = allOutMovement ? vehicleDamage * 2 : vehicleDamage;
    const finalObjectDamage = allOutMovement ? objectDamage * 2 : objectDamage;

    const result = {
      vehicle,
      object,
      vehicleDamage: finalVehicleDamage,
      objectDamage: finalObjectDamage,
      allOutMovement
    };

    // Pilot can attempt to avoid collision (DC 15 Pilot check)
    const pilot = this._getDefaultPilot(vehicle);
    const pilotBonus = this._getPilotBonus(vehicle, pilot);
    const avoidRoll = await new Roll(`1d20 + ${pilotBonus}`).evaluate({async: true});

    result.avoidRoll = avoidRoll;
    result.avoided = avoidRoll.total >= 15;

    if (result.avoided) {
      // Reduce or negate damage based on how well they rolled
      const reduction = Math.min(100, (avoidRoll.total - 15) * 10); // 10% per point above DC
      result.vehicleDamage = Math.floor(result.vehicleDamage * (1 - reduction / 100));
      ui.notifications.info(`${vehicle.name}'s pilot reduces collision damage by ${reduction}%!`);
    }

    // Apply damage to vehicle (reduced by damage threshold if vehicle provides cover)
    const vehicleCover = vehicle.system.cover || 'total';
    if (vehicleCover !== 'none') {
      const vehicleThreshold = this._getVehicleDamageThreshold(vehicle);
      result.vehicleDamage = Math.max(0, result.vehicleDamage - vehicleThreshold);
    }

    if (result.vehicleDamage > 0) {
      await this.applyDamageToVehicle(vehicle, result.vehicleDamage);
    }

    // Apply damage to object if it's a vehicle
    if (object.type === 'vehicle' && result.objectDamage > 0) {
      await this.applyDamageToVehicle(object, result.objectDamage);
    }

    // Create chat message
    await this._createCollisionMessage(result);

    return result;
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
    const aimed = options.aimed || false;
    const gunner = options.gunner || this._getDefaultGunner(vehicle);

    // First attack roll
    const attackResult = await this.rollAttack(vehicle, weapon, target, { gunner, ...options });

    const result = {
      vehicle,
      weapon,
      target,
      firstAttack: attackResult,
      lockedOn: aimed,
      secondAttack: null,
      hit: attackResult.hits
    };

    // If aimed (locked on) and missed, missile can attack again next turn
    if (aimed && !attackResult.hits) {
      ui.notifications.info(`${weapon.name} missed but remains locked on! Will attack again next turn.`);
      // Store missile state for next turn attack
      await this._storeMissileState(vehicle, weapon, target, attackResult.bonus);
    } else if (!attackResult.hits) {
      ui.notifications.info(`${weapon.name} missed and self-destructs.`);
    }

    return result;
  }

  /**
   * Second attack for locked-on missile (automatic on next turn)
   * @param {Actor} vehicle - The firing vehicle
   * @param {Object} missileState - The stored missile state
   * @returns {Promise<Object>} Second attack result
   */
  static async missileSecondAttack(vehicle, missileState) {
    const { weapon, target, attackBonus } = missileState;

    // Roll with -5 penalty
    const roll = await new Roll(`1d20 + ${attackBonus - 5}`).evaluate({async: true});

    const targetReflex = this._getTargetReflexDefense(target);
    const hits = roll.total >= targetReflex;

    const result = {
      vehicle,
      weapon,
      target,
      roll,
      total: roll.total,
      targetDefense: targetReflex,
      hits
    };

    if (hits) {
      ui.notifications.info(`${weapon.name} hits on second attempt!`);
      // Roll damage
      await this.rollDamage(vehicle, weapon, target);
    } else {
      ui.notifications.info(`${weapon.name} misses again and self-destructs.`);
    }

    // Clear missile state
    await this._clearMissileState(vehicle, weapon);

    return result;
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
    const mode = options.mode || 'narrow'; // 'narrow' or 'proximity'
    const gunner = options.gunner || this._getDefaultGunner(vehicle);

    if (weapons.length > 6) {
      ui.notifications.warn('Weapon batteries can only contain up to 6 weapons!');
      weapons = weapons.slice(0, 6);
    }

    const result = {
      vehicle,
      weapons,
      target,
      mode,
      mainAttack: null,
      extraHits: 0,
      totalDamage: 0
    };

    if (mode === 'narrow') {
      // Narrow Salvo: +2 per additional weapon, extra hits for every 3 points over Reflex
      const batteryBonus = (weapons.length - 1) * 2;
      const attackResult = await this.rollAttack(vehicle, weapons[0], target, {
        gunner,
        batteryBonus,
        ...options
      });

      result.mainAttack = attackResult;

      if (attackResult.hits) {
        // Check for extra hits (every 3 points over Reflex Defense)
        const margin = attackResult.total - attackResult.targetDefense;
        const extraHits = Math.floor(margin / 3);
        result.extraHits = Math.min(extraHits, weapons.length - 1);

        // Roll damage for main hit
        const mainDamage = await this.rollDamage(vehicle, weapons[0], target, { gunner });
        result.totalDamage = mainDamage.finalDamage;

        // Add extra dice for extra hits (before multiplier)
        if (result.extraHits > 0) {
          const weaponDamage = weapons[0].damage || '1d10';
          const match = weaponDamage.match(/(\d+)d(\d+)/);
          if (match) {
            const extraDiceRoll = await new Roll(`${result.extraHits}d${match[2]}`).evaluate({async: true});
            const extraDamage = extraDiceRoll.total * (weapons[0].multiplier || 2);
            result.totalDamage += extraDamage;
            ui.notifications.info(`Battery scores ${result.extraHits} additional hits! +${extraDamage} damage!`);
          }
        }
      }
    } else if (mode === 'proximity') {
      // Proximity Spread: Area attack on 1 starship scale square, -5 penalty
      const attackResult = await this.rollAttack(vehicle, weapons[0], target, {
        gunner,
        areaAttack: true,
        ...options
      });

      result.mainAttack = attackResult;

      if (attackResult.hits) {
        const damage = await this.rollDamage(vehicle, weapons[0], target, { gunner });
        result.totalDamage = damage.finalDamage;
      }
    }

    // Create chat message
    await this._createBatteryMessage(result);

    return result;
  }

  // ========== Helper Methods ==========

  /**
   * Calculate attack bonus for vehicle weapon
   * Formula: Gunner BAB + Vehicle INT mod + Range Modifier + Misc
   * @private
   */
  static _calculateAttackBonus(vehicle, weapon, gunner, range) {
    // Gunner's Base Attack Bonus
    const gunnerBAB = this._getGunnerBAB(vehicle, gunner);

    // Vehicle's Intelligence modifier (for targeting computer)
    const vehicleInt = vehicle.system.attributes?.int?.mod || 0;

    // Range modifier
    const rangeModifier = this._getRangeModifier(range);

    // Weapon-specific bonuses
    const weaponBonus = weapon.bonus || 0;

    // Battery bonus if applicable
    const batteryBonus = weapon.batteryBonus || 0;

    // Area attack penalty
    const areaAttackPenalty = weapon.areaAttack ? -5 : 0;

    // Size modifier (for vehicle attacks)
    const sizeModifier = this._getVehicleSizeModifier(vehicle);

    const bonus = gunnerBAB + vehicleInt + rangeModifier + weaponBonus + batteryBonus + areaAttackPenalty + sizeModifier;

    return {
      bonus,
      breakdown: {
        gunnerBAB,
        vehicleInt,
        rangeModifier,
        weaponBonus,
        batteryBonus,
        areaAttackPenalty,
        sizeModifier
      }
    };
  }

  /**
   * Calculate damage for vehicle weapon
   * Formula: (Weapon Damage + ½ Pilot Heroic Level + Misc) × Damage Multiplier
   * @private
   */
  static _calculateDamage(vehicle, weapon, pilot, isCrit) {
    const baseDamage = weapon.damage || '1d10';

    // Half pilot heroic level
    const pilotLevel = pilot?.system?.heroicLevel || pilot?.system?.level || 1;
    const halfPilotLevel = Math.floor(pilotLevel / 2);

    // Miscellaneous bonuses
    const misc = weapon.damageBonus || 0;

    // Total modifier (before multiplier)
    const modifier = halfPilotLevel + misc;

    // Damage multiplier (usually ×2, some weapons ×3 or ×5)
    let multiplier = weapon.multiplier || 2;

    // Critical hits double the multiplier
    if (isCrit) {
      multiplier *= 2;
    }

    return {
      baseDamage,
      modifier,
      multiplier,
      breakdown: {
        baseDamage,
        halfPilotLevel,
        misc,
        multiplier,
        isCrit
      }
    };
  }

  /**
   * Get weapon range modifier
   * @private
   */
  static _getRangeModifier(range) {
    const modifiers = {
      'point-blank': 0,
      'short': -2,
      'medium': -5,
      'long': -10
    };
    return modifiers[range] || 0;
  }

  /**
   * Get vehicle size modifier for attacks
   * @private
   */
  static _getVehicleSizeModifier(vehicle) {
    const size = (vehicle.system.size || 'medium').toLowerCase();
    const modifiers = {
      'large': -1,
      'huge': -2,
      'gargantuan': -5,
      'colossal': -10,
      'colossal (frigate)': -10,
      'colossal (cruiser)': -10,
      'colossal (station)': -10
    };
    return modifiers[size] || 0;
  }

  /**
   * Get vehicle damage threshold
   * Formula: Fortitude Defense + Size Modifier
   * @private
   */
  static _getVehicleDamageThreshold(vehicle) {
    const fortitude = vehicle.system.fortitudeDefense || 10;
    const size = (vehicle.system.size || 'medium').toLowerCase();

    const sizeModifiers = {
      'large': 5,
      'huge': 10,
      'gargantuan': 20,
      'colossal': 50,
      'colossal (frigate)': 100,
      'colossal (cruiser)': 200,
      'colossal (station)': 500
    };

    const sizeMod = sizeModifiers[size] || 0;
    return fortitude + sizeMod;
  }

  /**
   * Get gunner's Base Attack Bonus (from crew quality or actual character)
   * @private
   */
  static _getGunnerBAB(vehicle, gunner) {
    if (!gunner) {
      // Use vehicle's crew quality
      const crewQuality = vehicle.system.crewQuality || 'normal';
      return this._getCrewQualityBonus(crewQuality, 'attack');
    }

    // Use actual gunner's BAB
    return gunner.system?.baseAttack || gunner.system?.bab || 0;
  }

  /**
   * Get crew quality bonuses
   * @private
   */
  static _getCrewQualityBonus(quality, type) {
    const qualities = {
      'untrained': { attack: -5, check: 0, cl: -1 },
      'normal': { attack: 0, check: 5, cl: 0 },
      'skilled': { attack: 2, check: 6, cl: 1 },
      'expert': { attack: 5, check: 8, cl: 2 },
      'ace': { attack: 10, check: 12, cl: 4 }
    };

    return qualities[quality]?.[type] || 0;
  }

  /**
   * Get pilot bonus for Pilot checks
   * @private
   */
  static _getPilotBonus(vehicle, pilot) {
    if (!pilot) {
      const crewQuality = vehicle.system.crewQuality || 'normal';
      return this._getCrewQualityBonus(crewQuality, 'check');
    }

    // Use actual pilot's Pilot skill
    const pilotSkill = pilot.system?.skills?.pilot?.total || 0;
    const sizeModifier = this._getVehicleSizeModifier(vehicle);
    return pilotSkill + sizeModifier;
  }

  /**
   * Get target's Reflex Defense
   * @private
   */
  static _getTargetReflexDefense(target) {
    if (target.type === 'vehicle') {
      return target.system.reflexDefense || 10;
    }
    return target.system.defenses?.reflex?.total || 10;
  }

  /**
   * Calculate collision damage based on size
   * @private
   */
  static _calculateCollisionDamage(object, size) {
    const sizeStr = (size || 'medium').toLowerCase();
    const strMod = object.system?.attributes?.str?.mod || 0;

    const damageDice = {
      'large': '2d6',
      'huge': '4d6',
      'gargantuan': '6d6',
      'colossal': '8d6',
      'colossal (frigate)': '10d6',
      'colossal (cruiser)': '15d6',
      'colossal (station)': '20d6'
    };

    const dice = damageDice[sizeStr] || '1d6';
    const roll = new Roll(`${dice} + ${strMod}`);
    roll.evaluate({async: false});

    return roll.total;
  }

  /**
   * Check if vehicle is a starfighter/airspeeder
   * @private
   */
  static _isStarfighter(vehicle) {
    const size = (vehicle.system.size || 'medium').toLowerCase();
    return size === 'gargantuan' || size === 'huge';
  }

  /**
   * Get default pilot from vehicle crew
   * @private
   */
  static _getDefaultPilot(vehicle) {
    // Try to get assigned pilot
    const pilotName = vehicle.system.crewPositions?.pilot;
    if (pilotName) {
      const pilot = game.actors.getName(pilotName);
      if (pilot) return pilot;
    }

    // Use generic crew
    return null;
  }

  /**
   * Get default gunner from vehicle crew
   * @private
   */
  static _getDefaultGunner(vehicle) {
    // Try to get assigned gunner
    const gunnerName = vehicle.system.crewPositions?.gunner;
    if (gunnerName) {
      const gunner = game.actors.getName(gunnerName);
      if (gunner) return gunner;
    }

    // Use generic crew
    return null;
  }

  /**
   * Move vehicle down condition track
   * @private
   */
  static async _moveVehicleConditionTrack(vehicle, steps) {
    const current = vehicle.system.conditionTrack?.current || 0;
    const newPosition = Math.min(5, current + steps);

    if (newPosition !== current) {
      await vehicle.update({'system.conditionTrack.current': newPosition});

      const labels = ['Normal', '-1', '-2', '-5', 'Disabled', 'Disabled'];
      ui.notifications.warn(`${vehicle.name} condition: ${labels[newPosition]}`);
    }
  }

  /**
   * Set dogfight state for two vehicles
   * @private
   */
  static async _setDogfightState(vehicle1, vehicle2, engaged) {
    // Store dogfight state in flags
    if (engaged) {
      await vehicle1.setFlag('swse', 'dogfight', { opponent: vehicle2.id });
      await vehicle2.setFlag('swse', 'dogfight', { opponent: vehicle1.id });
    } else {
      await vehicle1.unsetFlag('swse', 'dogfight');
      await vehicle2.unsetFlag('swse', 'dogfight');
    }
  }

  /**
   * Store missile state for next turn attack
   * @private
   */
  static async _storeMissileState(vehicle, weapon, target, attackBonus) {
    const missileState = {
      weapon,
      target: target.id,
      attackBonus,
      turn: game.combat?.turn || 0
    };

    await vehicle.setFlag('swse', 'missile', missileState);
  }

  /**
   * Clear missile state
   * @private
   */
  static async _clearMissileState(vehicle, weapon) {
    await vehicle.unsetFlag('swse', 'missile');
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
   * Create dogfight chat message
   * @private
   */
  static async _createDogfightMessage(result) {
    const { initiator, target, initiatorRoll, targetRoll, success } = result;

    const content = `
      <div class="swse-dogfight-roll">
        <div class="dogfight-header">
          <h3><i class="fas fa-fighter-jet"></i> Dogfight!</h3>
        </div>
        <div class="opposed-rolls">
          <div class="initiator-roll">
            <strong>${initiator.name}:</strong>
            <div class="dice-total ${success ? 'winner' : ''}">${initiatorRoll.total}</div>
          </div>
          <div class="vs">VS</div>
          <div class="defender-roll">
            <strong>${target.name}:</strong>
            <div class="dice-total ${!success ? 'winner' : ''}">${targetRoll.total}</div>
          </div>
        </div>
        <div class="dogfight-result">
          ${success ? `${initiator.name} successfully engages in dogfight!` : `${initiator.name} fails to engage.`}
        </div>
      </div>
    `;

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({actor: initiator}),
      content,
      type: CONST.CHAT_MESSAGE_TYPES.OTHER
    });
  }

  /**
   * Create collision chat message
   * @private
   */
  static async _createCollisionMessage(result) {
    const { vehicle, object, vehicleDamage, objectDamage, avoided, avoidRoll } = result;

    const content = `
      <div class="swse-collision-roll">
        <div class="collision-header">
          <h3><i class="fas fa-car-crash"></i> Collision!</h3>
        </div>
        <div class="collision-info">
          <strong>${vehicle.name}</strong> collides with <strong>${object.name}</strong>
        </div>
        <div class="avoid-roll">
          <strong>Avoid Collision (DC 15):</strong> ${avoidRoll.total} ${avoided ? '✓' : '✗'}
        </div>
        <div class="collision-damage">
          <div>${vehicle.name} takes <strong>${vehicleDamage}</strong> damage</div>
          <div>${object.name} takes <strong>${objectDamage}</strong> damage</div>
        </div>
      </div>
    `;

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({actor: vehicle}),
      content,
      type: CONST.CHAT_MESSAGE_TYPES.OTHER
    });
  }

  /**
   * Create weapon battery chat message
   * @private
   */
  static async _createBatteryMessage(result) {
    const { vehicle, weapons, target, mode, mainAttack, extraHits, totalDamage } = result;

    const content = `
      <div class="swse-battery-roll">
        <div class="battery-header">
          <h3><i class="fas fa-th"></i> Weapon Battery (${mode})</h3>
          <div class="battery-info">${weapons.length} × ${weapons[0].name}</div>
        </div>
        ${mainAttack ? `
          <div class="attack-result">
            Attack: ${mainAttack.total} vs ${mainAttack.targetDefense}
            ${mainAttack.hits ? '✓ HIT' : '✗ MISS'}
          </div>
        ` : ''}
        ${extraHits > 0 ? `
          <div class="extra-hits">
            <strong>Extra Hits:</strong> ${extraHits}
          </div>
        ` : ''}
        ${totalDamage > 0 ? `
          <div class="battery-damage">
            <strong>Total Damage:</strong> ${totalDamage}
          </div>
        ` : ''}
      </div>
    `;

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({actor: vehicle}),
      content,
      type: CONST.CHAT_MESSAGE_TYPES.OTHER
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
