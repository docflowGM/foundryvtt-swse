/**
 * DamageMitigationManager — Damage Mitigation Orchestrator
 *
 * CENTRAL AUTHORITY for all damage mitigation logic.
 *
 * Responsibility:
 * - Orchestrate mitigation in locked order (SR → DR → Temp HP → HP)
 * - Coordinate all resolvers (pure, stateless)
 * - Return structured result for ActorEngine
 * - Enforce V2 architecture compliance
 *
 * Contract:
 * - Pure calculation: No mutations
 * - Locked order: Non-negotiable
 * - Resolver integration: All damage rules go through resolvers
 * - ActorEngine delegation: Caller applies mutations
 *
 * Locked Damage Order (NON-NEGOTIABLE):
 * 1. Roll damage (caller responsibility)
 * 2. Apply SR (ShieldMitigationResolver)
 * 3. Apply DR (DamageReductionResolver)
 * 4. Apply Temp HP (TempHPResolver)
 * 5. Apply real HP damage (caller responsibility)
 * 6. Apply threshold/condition logic (caller responsibility)
 * 7. Commit mutation via ActorEngine (caller responsibility)
 *
 * Integration:
 * - Called AFTER RollCore, BEFORE ActorEngine
 * - Returns result; caller handles mutations
 * - Used by: DamageEngine, CombatEngine, Talent effects
 */

import { ShieldMitigationResolver } from './resolvers/shield-mitigation-resolver.js';
import { DamageReductionResolver } from './resolvers/damage-reduction-resolver.js';
import { TempHPResolver } from './resolvers/temp-hp-resolver.js';

export class DamageMitigationManager {
  /**
   * Resolve all damage mitigation in strict order.
   *
   * @param {Object} params
   * @param {number} params.damage - Rolled damage amount
   * @param {Actor} params.actor - Target actor (read-only)
   * @param {string} [params.damageType] - Damage type (energy, kinetic, etc.)
   * @param {Item} [params.weapon] - Attacking weapon (for bypass checks)
   * @returns {{
   *   originalDamage: number,
   *   afterShield: number,
   *   afterDR: number,
   *   afterTempHP: number,
   *   hpDamage: number,
   *
   *   shield: { applied, degraded, remaining, source },
   *   damageReduction: { applied, source, bypassed },
   *   tempHP: { absorbed, remaining },
   *
   *   breakdown: Array<{stage, input, output, mitigation, details}>
   * }}
   */
  static resolve({
    damage,
    actor,
    damageType = 'normal',
    weapon = null
  }) {
    if (!actor || typeof damage !== 'number' || damage < 0) {
      throw new Error('DamageMitigationManager: invalid damage params');
    }

    const context = {
      weapon,
      damageType,
      damageType
    };

    const breakdown = [];
    let currentDamage = damage;

    // ========================================================================
    // STAGE 1: SHIELD RATING
    // ========================================================================

    const shieldResult = ShieldMitigationResolver.resolve({
      damage: currentDamage,
      actor,
      context
    });

    breakdown.push({
      stage: 'Shield Rating (SR)',
      input: currentDamage,
      output: shieldResult.damageAfter,
      mitigation: shieldResult.srApplied,
      details: {
        srCurrent: shieldResult.srRemaining + shieldResult.srDegraded,
        srRemaining: shieldResult.srRemaining,
        srDegraded: shieldResult.srDegraded,
        source: 'ShieldMitigationResolver'
      }
    });

    currentDamage = shieldResult.damageAfter;

    // ========================================================================
    // STAGE 2: DAMAGE REDUCTION
    // ========================================================================

    const drResult = DamageReductionResolver.resolve({
      damage: currentDamage,
      actor,
      context
    });

    breakdown.push({
      stage: 'Damage Reduction (DR)',
      input: currentDamage,
      output: drResult.damageAfter,
      mitigation: drResult.drApplied,
      details: {
        drValue: drResult.drApplied > 0 ? drResult.drSource : 'None',
        bypassed: drResult.bypassed,
        source: 'DamageReductionResolver'
      }
    });

    currentDamage = drResult.damageAfter;

    // ========================================================================
    // STAGE 3: TEMPORARY HP
    // ========================================================================

    const tempResult = TempHPResolver.resolve({
      damage: currentDamage,
      actor
    });

    breakdown.push({
      stage: 'Temporary HP',
      input: currentDamage,
      output: tempResult.damageAfter,
      mitigation: tempResult.tempAbsorbed,
      details: {
        tempBefore: tempResult.tempBefore,
        tempAfter: tempResult.tempAfter,
        source: 'TempHPResolver'
      }
    });

    currentDamage = tempResult.damageAfter;

    // ========================================================================
    // FINAL RESULT
    // ========================================================================

    const finalResult = {
      // Damage flow
      originalDamage: damage,
      afterShield: shieldResult.damageAfter,
      afterDR: drResult.damageAfter,
      afterTempHP: tempResult.damageAfter,
      hpDamage: currentDamage,

      // Component results
      shield: {
        applied: shieldResult.srApplied,
        degraded: shieldResult.srDegraded,
        remaining: shieldResult.srRemaining,
        source: ShieldMitigationResolver.getSRSource(actor) || 'None'
      },

      damageReduction: {
        applied: drResult.drApplied,
        source: drResult.drSource,
        bypassed: drResult.bypassed
      },

      tempHP: {
        absorbed: tempResult.tempAbsorbed,
        before: tempResult.tempBefore,
        after: tempResult.tempAfter
      },

      // Audit trail
      breakdown: breakdown,

      // Convenience flags
      mitigated: damage > currentDamage,
      totalMitigation: damage - currentDamage,
      mitigationPercent: damage > 0 ? Math.round(((damage - currentDamage) / damage) * 100) : 0
    };

    return finalResult;
  }

  /**
   * Get a human-readable summary of mitigation.
   *
   * Example: "Damage 20 → 14 HP (6 mitigated by SR:3 + Temp:3)"
   *
   * @param {Object} result - Result from resolve()
   * @returns {string}
   */
  static getSummary(result) {
    if (!result) return 'No mitigation result';

    const parts = [];

    if (result.originalDamage !== result.afterShield) {
      parts.push(`SR:${result.shield.applied}`);
    }
    if (result.afterShield !== result.afterDR) {
      parts.push(`DR:${result.damageReduction.applied}`);
    }
    if (result.afterDR !== result.afterTempHP) {
      parts.push(`Temp:${result.tempHP.absorbed}`);
    }

    const mitigationSummary = parts.length > 0 ? ` (${parts.join('+')} mitigated)` : '';

    return `Damage ${result.originalDamage} → ${result.hpDamage} HP${mitigationSummary}`;
  }

  /**
   * Validate resolver execution (debug helper)
   *
   * @param {Object} result
   * @returns {Array<string>} Warnings/errors
   */
  static validate(result) {
    const issues = [];

    if (!result) {
      issues.push('Result is null');
      return issues;
    }

    // Verify damage flow is monotonic (never increases)
    if (result.afterShield > result.originalDamage) {
      issues.push('SR increased damage (invalid)');
    }
    if (result.afterDR > result.afterShield) {
      issues.push('DR increased damage after SR (invalid)');
    }
    if (result.afterTempHP > result.afterDR) {
      issues.push('Temp HP increased damage after DR (invalid)');
    }
    if (result.hpDamage > result.afterTempHP) {
      issues.push('Final HP damage increased after Temp HP (invalid)');
    }

    // Verify all values are non-negative
    const fields = ['originalDamage', 'afterShield', 'afterDR', 'afterTempHP', 'hpDamage'];
    for (const field of fields) {
      if (result[field] < 0) {
        issues.push(`${field} is negative (${result[field]})`);
      }
    }

    return issues;
  }
}
