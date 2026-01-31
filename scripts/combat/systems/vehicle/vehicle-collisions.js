/**
 * SWSE Vehicle Collision System
 * Implements RAW collision & ramming rules:
 *  - Collision damage = speed-based + size-based modifier
 *  - Ramming attacks (intentional collisions)
 *  - Vehicle CT movement on major crashes
 *  - Integration with DamageSystem + Active Effects
 */

import { measureDistance, getVehicleCTPenalty, createVehicleCTEffect } from "./vehicle-shared.js";
import { DamageSystem } from "../../damage-system.js";

export class SWSEVehicleCollisions {

  /**
   * Perform a ramming attack.
   * RAW:
   *  - Attack is automatic if target cannot avoid
   *  - Damage based on vehicle speed & size category
   */
  static async ram(attacker, target) {
    if (!attacker || !target) return;

    const atkTok = attacker.getActiveTokens()[0];
    const tgtTok = target.getActiveTokens()[0];
    if (!atkTok || !tgtTok) {
      ui.notifications.warn("Tokens must be present on the scene.");
      return null;
    }

    const speed = attacker.system.vehicle?.speed ?? 0;
    const sizeMod = this._sizeCollisionModifier(attacker.system.size);

    const dmg = Math.max(1, Math.floor(speed / 2) + sizeMod);

    const html = `
      <div class="swse-collision-card">
        <h3>${attacker.name} RAMS ${target.name}!</h3>
        <div>Speed: ${speed}</div>
        <div>Collision Damage: <strong>${dmg}</strong></div>
      </div>
    `;

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: attacker }),
      content: html
    });

    await DamageSystem.applyToSelected(dmg, { checkThreshold: true });

    return dmg;
  }

  /**
   * RAW collision damage from speed vector intersection.
   */
  static computeCollisionDamage(vehicleActor, impactVelocity) {
    const sizeMod = this._sizeCollisionModifier(vehicleActor.system.size);
    return Math.max(1, Math.floor(impactVelocity / 2) + sizeMod);
  }

  /**
   * Apply a crash event and move vehicle CT accordingly.
   * RAW guideline:
   *  - Serious crashes move CT multiple steps
   */
  static async applyCrashCondition(vehicleActor, severity = 1) {
    const current = vehicleActor.system.conditionTrack?.current ?? 0;
    const next = Math.clamp(current + severity, 0, 5);

    const ae = createVehicleCTEffect(next, vehicleActor.uuid);
    await this._removeOldVCT(vehicleActor);
    await vehicleActor.createEmbeddedDocuments("ActiveEffect", [ae]);

    if (next >= 5) {
      ui.notifications.error(`${vehicleActor.name} has been DESTROYED in a crash!`);
    } else {
      ui.notifications.warn(`${vehicleActor.name} suffers crash damage (CT step ${next}).`);
    }
  }

  /**
   * Remove old Vehicle CT effects.
   */
  static async _removeOldVCT(actor) {
    const effects = actor.effects.filter(e => e.flags?.swse?.vehicleCT !== undefined);
    if (effects.length) await actor.deleteEmbeddedDocuments("ActiveEffect", effects.map(e => e.id));
  }

  /**
   * Size modifier for collisions.
   */
  static _sizeCollisionModifier(size) {
    const table = {
      fine: 1, diminutive: 2, tiny: 4, small: 6,
      medium: 8, large: 10, huge: 12, gargantuan: 16,
      colossal: 20, colossal2: 24
    };
    return table[size?.toLowerCase()] ?? 8;
  }
}

window.SWSEVehicleCollisions = SWSEVehicleCollisions;

/**
 * Handle collision between vehicle and object
 * @param {Actor} vehicle - The colliding vehicle
 * @param {Object} object - The object being collided with (vehicle, structure, etc.)
 * @param {Object} options - Additional options (allOutMovement, etc.)
 * @param {Function} applyDamage - Damage application function from main combat system
 * @returns {Promise<Object>} Collision result
 */
export async function handleCollision(vehicle, object, options = {}, applyDamage) {
  const vehicleSize = vehicle.system.size || 'medium';
  const objectSize = object.system?.size || object.size || 'medium';
  const allOutMovement = options.allOutMovement || false;

  // Calculate collision damage for both
  const vehicleDamage = calculateCollisionDamage(object, objectSize);
  const objectDamage = calculateCollisionDamage(vehicle, vehicleSize);

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
  const pilot = getDefaultPilot(vehicle);
  const pilotBonus = getPilotBonus(vehicle, pilot);
  const avoidRoll = await globalThis.SWSE.RollEngine.safeRoll(`1d20 + ${pilotBonus}`).evaluate({async: true});

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
    const vehicleThreshold = getVehicleDamageThreshold(vehicle);
    result.vehicleDamage = Math.max(0, result.vehicleDamage - vehicleThreshold);
  }

  if (result.vehicleDamage > 0) {
    await applyDamage(vehicle, result.vehicleDamage);
  }

  // Apply damage to object if it's a vehicle
  if (object.type === 'vehicle' && result.objectDamage > 0) {
    await applyDamage(object, result.objectDamage);
  }

  // Create chat message
  await createCollisionMessage(result);

  return result;
}

/**
 * Create collision chat message
 * @param {Object} result - Collision result
 * @private
 */
export async function createCollisionMessage(result) {
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
    style: CONST.CHAT_MESSAGE_STYLES.OTHER
  });
}
