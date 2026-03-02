/**
 * SWSE Vehicle Weapons System
 *
 * Includes:
 *  - Missile / Torpedo lock-on
 *  - Homing (Pilot opposed vs Point Defense)
 *  - Fire arcs
 *  - Weapon batteries (multiple shots as one attack)
 */

import { measureDistance, facingTowards } from "/systems/foundryvtt-swse/scripts/engine/combat/vehicles/utils/vehicle-shared.js";
import { createChatMessage } from "/systems/foundryvtt-swse/scripts/core/document-api-v13.js";
import { SWSERoll } from "/systems/foundryvtt-swse/scripts/combat/rolls/enhanced-rolls.js";

export class SWSEVehicleWeapons {

  /**
   * RAW: Missile Lock-On requires an attack roll vs DC 15 (or target Pilot roll).
   */
  static async missileLock(attacker, weapon, target) {
    const roll = await SWSERoll.rollSkill(attacker, 'mechanics');
    const dc = weapon.system?.lockDC ?? 15;

    const success = roll.roll.total >= dc;

    const html = `
      <div class="swse-missile-lock">
        <h3>${weapon.name} — Lock-On Attempt</h3>
        <div>Roll: ${roll.roll.total} vs DC ${dc}</div>
        <div class="${success ? 'success' : 'failure'}">
          ${success ? 'Lock Acquired!' : 'Lock Failed'}
        </div>
      </div>
    `;

    await createChatMessage({
      speaker: ChatMessage.getSpeaker({ actor: attacker }),
      content: html,
      roll: roll.roll
    });

    return success;
  }

  /**
   * Fire Arc Check (forward, aft, port, starboard)
   */
  static inFireArc(attacker, target, arc = 'forward', tolerance = 75) {
    const atkTok = attacker.getActiveTokens()[0];
    const tgtTok = target.getActiveTokens()[0];
    if (!atkTok || !tgtTok) {return false;}

    const facing = atkTok.document.rotation * (Math.PI / 180);
    const angleToTarget = Math.atan2(
      tgtTok.center.y - atkTok.center.y,
      tgtTok.center.x - atkTok.center.x
    );

    const deg = ((angleToTarget - facing) * 180) / Math.PI;

    switch (arc) {
      case 'forward': return Math.abs(deg) <= tolerance;
      case 'aft': return Math.abs(deg) >= 180 - tolerance;
      case 'port': return deg > tolerance && deg < 180 - tolerance;
      case 'starboard': return deg < -tolerance && deg > -(180 - tolerance);
    }

    return true;
  }

  /**
   * Weapon Battery Attack (multiple shots, single roll)
   */
  static async fireBattery(attacker, weaponGroup, target) {
    const weapons = attacker.items.filter(
      w => w.type === 'vehicle-weapon' && w.system?.batteryGroup === weaponGroup
    );

    if (!weapons.length) {
      ui.notifications.warn('No weapons found in this battery.');
      return null;
    }

    const attackRoll = await SWSERoll.rollAttack(attacker, weapons[0], target);
    // PHASE 2: Read defense from authoritative source (system.derived.*)
    const hits = attackRoll.roll.total >= (target.system?.derived?.defenses?.reflex?.total ?? 10);

    const html = `
      <div class="swse-vehicle-battery">
        <h3>Battery Fire — ${weaponGroup}</h3>
        <div>Weapons Fired: ${weapons.length}</div>
        <div>Attack Total: ${attackRoll.roll.total}</div>
        <div class="${hits ? 'success' : 'failure'}">${hits ? 'HIT!' : 'MISS'}</div>
      </div>
    `;

    await createChatMessage({
      speaker: ChatMessage.getSpeaker({ actor: attacker }),
      content: html,
      roll: attackRoll.roll
    });

    return { attackRoll, hits, weapons };
  }
}

window.SWSEVehicleWeapons = SWSEVehicleWeapons;

/**
 * Fire missile or torpedo (with lock-on capability)
 * @param {Actor} vehicle - The firing vehicle
 * @param {Object} weapon - The missile/torpedo weapon
 * @param {Actor} target - The target vehicle
 * @param {Object} options - Additional options (aimed, etc.)
 * @param {Function} rollAttack - Attack roll function from main combat system
 * @returns {Promise<Object>} Missile attack result
 */
export async function fireMissile(vehicle, weapon, target, options = {}, rollAttack) {
  const aimed = options.aimed || false;
  const gunner = options.gunner || getDefaultGunner(vehicle);

  // First attack roll
  const attackResult = await rollAttack(vehicle, weapon, target, { gunner, ...options });

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
    await storeMissileState(vehicle, weapon, target, attackResult.bonus);
  } else if (!attackResult.hits) {
    ui.notifications.info(`${weapon.name} missed and self-destructs.`);
  }

  return result;
}

/**
 * Second attack for locked-on missile (automatic on next turn)
 * @param {Actor} vehicle - The firing vehicle
 * @param {Object} missileState - The stored missile state
 * @param {Function} rollDamage - Damage roll function from main combat system
 * @returns {Promise<Object>} Second attack result
 */
export async function missileSecondAttack(vehicle, missileState, rollDamage) {
  const { weapon, target, attackBonus } = missileState;

  // Roll with -5 penalty
  const roll = await globalThis.SWSE.RollEngine.safeRoll(`1d20 + ${attackBonus - 5}`).evaluate({ async: true });

  const targetReflex = getTargetReflexDefense(target);
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
    await rollDamage(vehicle, weapon, target);
  } else {
    ui.notifications.info(`${weapon.name} misses again and self-destructs.`);
  }

  // Clear missile state
  await clearMissileState(vehicle, weapon);

  return result;
}

/**
 * Fire weapon battery (narrow salvo or proximity spread)
 * @param {Actor} vehicle - The firing vehicle
 * @param {Array} weapons - Array of identical weapons in battery (up to 6)
 * @param {Actor} target - The target
 * @param {Object} options - Additional options (mode: 'narrow' or 'proximity')
 * @param {Function} rollAttack - Attack roll function from main combat system
 * @param {Function} rollDamage - Damage roll function from main combat system
 * @returns {Promise<Object>} Battery attack result
 */
export async function fireWeaponBattery(vehicle, weapons, target, options = {}, rollAttack, rollDamage) {
  const mode = options.mode || 'narrow'; // 'narrow' or 'proximity'
  const gunner = options.gunner || getDefaultGunner(vehicle);

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
    const attackResult = await rollAttack(vehicle, weapons[0], target, {
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
      const mainDamage = await rollDamage(vehicle, weapons[0], target, { gunner });
      result.totalDamage = mainDamage.finalDamage;

      // Add extra dice for extra hits (before multiplier)
      if (result.extraHits > 0) {
        const weaponDamage = weapons[0].damage || '1d10';
        const match = weaponDamage.match(/(\d+)d(\d+)/);
        if (match) {
          const extraDiceRoll = await globalThis.SWSE.RollEngine.safeRoll(`${result.extraHits}d${match[2]}`).evaluate({ async: true });
          const extraDamage = extraDiceRoll.total * (weapons[0].multiplier || 2);
          result.totalDamage += extraDamage;
          ui.notifications.info(`Battery scores ${result.extraHits} additional hits! +${extraDamage} damage!`);
        }
      }
    }
  } else if (mode === 'proximity') {
    // Proximity Spread: Area attack on 1 starship scale square, -5 penalty
    const attackResult = await rollAttack(vehicle, weapons[0], target, {
      gunner,
      areaAttack: true,
      ...options
    });

    result.mainAttack = attackResult;

    if (attackResult.hits) {
      const damage = await rollDamage(vehicle, weapons[0], target, { gunner });
      result.totalDamage = damage.finalDamage;
    }
  }

  // Create chat message
  await createBatteryMessage(result);

  return result;
}

/**
 * Store missile state for next turn attack
 * @param {Actor} vehicle - The vehicle
 * @param {Object} weapon - The missile weapon
 * @param {Actor} target - The target
 * @param {number} attackBonus - The attack bonus
 * @private
 */
export async function storeMissileState(vehicle, weapon, target, attackBonus) {
  const missileState = {
    weapon,
    target: target.id,
    attackBonus,
    turn: game.combat?.turn || 0
  };

  await vehicle.setFlag('foundryvtt-swse', 'missile', missileState);
}

/**
 * Clear missile state
 * @param {Actor} vehicle - The vehicle
 * @param {Object} weapon - The missile weapon
 * @private
 */
export async function clearMissileState(vehicle, weapon) {
  await vehicle.unsetFlag('foundryvtt-swse', 'missile');
}

/**
 * Create weapon battery chat message
 * @param {Object} result - Battery attack result
 * @private
 */
export async function createBatteryMessage(result) {
  const { vehicle, weapons, target, mode, mainAttack, extraHits, totalDamage } = result;

  const content = `
    <div class="swse-battery-roll">
      <div class="battery-header">
        <h3><i class="fa-solid fa-th"></i> Weapon Battery (${mode})</h3>
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

  await createChatMessage({
    speaker: ChatMessage.getSpeaker({ actor: vehicle }),
    content,
    style: CONST.CHAT_MESSAGE_STYLES.OTHER
  });
}
