/**
 * SWSE Vehicle Collision System (Engine Domain)
 *
 * PHASE 2c MIGRATION: Collision mechanics moved from legacy domain
 *
 * Implements RAW collision & ramming rules:
 *  - Collision damage = speed-based + size-based modifier
 *  - Ramming attacks (intentional collisions)
 *  - Integration with DamageEngine and ThresholdEngine
 *
 * Integrated with:
 *  - DamageEngine (damage application)
 *  - ThresholdEngine (CT shifts on massive damage)
 *  - SubsystemEngine (subsystem escalation on threshold exceeded)
 *  - ActorEngine (Active Effect mutations)
 *  - Chat messaging
 */

import { DamageEngine } from '../../damage-engine.js';
import { ThresholdEngine } from '../../threshold-engine.js';
import { SubsystemEngine } from '../vehicle/subsystem-engine.js';
import { ActorEngine } from '../../../governance/actor-engine/actor-engine.js';
import { createChatMessage } from '../../../core/document-api-v13.js';

export class VehicleCollisions {

  /* -------------------------------------------- */
  /* RAMMING ATTACK                               */
  /* -------------------------------------------- */

  /**
   * Perform a ramming attack.
   * Automatic damage based on attacker speed and size.
   * Damage flows through full resolution pipeline:
   * 1. Apply damage to HP
   * 2. Check threshold
   * 3. Apply CT shifts
   * 4. Escalate subsystems if threshold exceeded
   *
   * @param {Actor} attacker - Ramming vehicle
   * @param {Actor} target - Target vehicle
   * @returns {Promise<Object|null>} Damage result or null if invalid
   */
  static async ram(attacker, target) {
    if (!attacker || !target) { return null; }

    const atkTok = attacker.getActiveTokens()[0];
    const tgtTok = target.getActiveTokens()[0];
    if (!atkTok || !tgtTok) {
      ui.notifications.warn('Tokens must be present on the scene.');
      return null;
    }

    const speed = attacker.system.vehicle?.speed ?? 0;
    const sizeMod = this._sizeCollisionModifier(attacker.system.size);
    const damage = Math.max(1, Math.floor(speed / 2) + sizeMod);

    /* POST COLLISION NOTICE */
    const html = `
      <div class="swse-collision-card">
        <h3>${attacker.name} RAMS ${target.name}!</h3>
        <div>Speed: ${speed}</div>
        <div>Size Modifier: ${sizeMod > 0 ? '+' : ''}${sizeMod}</div>
        <div>Collision Damage: <strong>${damage}</strong></div>
      </div>
    `;

    await createChatMessage({
      speaker: ChatMessage.getSpeaker({ actor: attacker }),
      content: html
    });

    /* ROUTE THROUGH DAMAGE ENGINE */
    const damageResult = await DamageEngine.applyDamage(target, damage);

    /* CHECK THRESHOLD */
    const thresholdResult = ThresholdEngine.evaluateThreshold({
      target,
      damage
    });

    /* APPLY THRESHOLD RESULT */
    await ThresholdEngine.applyResult(thresholdResult);

    /* ESCALATE SUBSYSTEMS IF THRESHOLD EXCEEDED */
    if (target.type === "vehicle" && thresholdResult.thresholdExceeded) {
      await SubsystemEngine.escalate(target, damage);
    }

    return damageResult;
  }

  /* -------------------------------------------- */
  /* COLLISION DAMAGE CALCULATION                 */
  /* -------------------------------------------- */

  /**
   * Calculate collision damage from impact velocity.
   * Formula: max(1, floor(velocity / 2) + size_modifier)
   *
   * Pure calculation, no mutations.
   *
   * @param {Actor} vehicleActor - Vehicle actor
   * @param {number} impactVelocity - Collision velocity
   * @returns {number} Collision damage
   */
  static computeCollisionDamage(vehicleActor, impactVelocity) {
    const sizeMod = this._sizeCollisionModifier(vehicleActor.system.size);
    return Math.max(1, Math.floor(impactVelocity / 2) + sizeMod);
  }

  /* -------------------------------------------- */
  /* SIZE MODIFIERS                               */
  /* -------------------------------------------- */

  /**
   * Get size-based collision damage modifier.
   * Larger vehicles deal more collision damage.
   *
   * @param {string} size - Vehicle size
   * @returns {number} Size modifier for collision damage
   */
  static _sizeCollisionModifier(size) {
    const table = {
      fine: 1,
      diminutive: 2,
      tiny: 4,
      small: 6,
      medium: 8,
      large: 10,
      huge: 12,
      gargantuan: 16,
      colossal: 20,
      colossal2: 24
    };
    return table[size?.toLowerCase()] ?? 8;
  }
}
