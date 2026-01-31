/**
 * DerivedCalculator — Derived Layer Orchestrator
 *
 * The ONLY place in the system where HP, BAB, and defenses are computed.
 * Called from actor.prepareDerivedData() after all mutations complete.
 *
 * Contract:
 * - Reads from: actor.system.progression.* (progression-owned inputs)
 * - Writes to: actor.system.derived.* (derived outputs)
 * - No mutations, no side effects beyond setting derived values
 */

import { HPCalculator } from './hp-calculator.js';
import { BABCalculator } from './bab-calculator.js';
import { DefenseCalculator } from './defense-calculator.js';
import { swseLogger } from '../../utils/logger.js';

export class DerivedCalculator {
  /**
   * Compute all derived values for an actor.
   * Called from prepareDerivedData() during recalculation pass.
   *
   * @param {Actor} actor - the actor being recalculated
   * @returns {Promise<Object>} update object to apply to derived system fields
   */
  static async computeAll(actor) {
    try {
      const prog = actor.system.progression || {};
      const classLevels = prog.classLevels || [];

      // Compute all derived values
      const hp = HPCalculator.calculate(actor, classLevels);
      const bab = await BABCalculator.calculate(classLevels);
      const defenses = await DefenseCalculator.calculate(actor, classLevels);

      // Build update object (all writes go to system.derived.*)
      const updates = {};

      // HP
      if (hp.max > 0) {
        updates['system.derived.hp'] = {
          max: hp.max,
          value: actor.system.hp?.value || hp.value // Preserve current HP if set
        };
      }

      // BAB
      if (bab >= 0) {
        updates['system.derived.bab'] = bab;
      }

      // Defenses
      if (defenses.fortitude) {
        updates['system.derived.defenses'] = updates['system.derived.defenses'] || {};
        updates['system.derived.defenses'].fortitude = defenses.fortitude;
      }
      if (defenses.reflex) {
        updates['system.derived.defenses'] = updates['system.derived.defenses'] || {};
        updates['system.derived.defenses'].reflex = defenses.reflex;
      }
      if (defenses.will) {
        updates['system.derived.defenses'] = updates['system.derived.defenses'] || {};
        updates['system.derived.defenses'].will = defenses.will;
      }

      swseLogger.debug(`DerivedCalculator computed for ${actor.name}`, { updates });

      return updates;
    } catch (err) {
      swseLogger.error(`DerivedCalculator.computeAll failed for ${actor?.name ?? 'unknown'}`, err);
      throw err;
    }
  }
}
