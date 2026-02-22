/**
 * DerivedCalculator — Derived Layer Orchestrator
 *
 * PHASE 2 COMPLETION: The ONLY place in the system where ANY derived values are computed.
 * This is the SOLE authority for all derived calculations.
 *
 * Computes:
 * - Ability modifiers (from base attributes)
 * - HP max, base, and totals
 * - BAB (base attack bonus)
 * - Defense totals (fortitude, reflex, will)
 * - Initiative derived
 * - Force/Destiny points derived
 * - Modifier breakdown for UI
 *
 * Called from actor.prepareDerivedData() after all mutations complete.
 *
 * Contract:
 * - Reads from: actor.system.* (base actor fields) + actor.system.progression.*
 * - Writes ONLY to: actor.system.derived.* (derived outputs, V2 authority)
 * - No mutations, no side effects beyond setting derived values
 * - Pure input → output transformer
 */

import { HPCalculator } from './hp-calculator.js';
import { BABCalculator } from './bab-calculator.js';
import { DefenseCalculator } from './defense-calculator.js';
import { ModifierEngine } from '../../engines/effects/modifiers/ModifierEngine.js';
import { swseLogger } from '../../utils/logger.js';
import { MutationIntegrityLayer } from '../../core/sentinel/mutation-integrity-layer.js';

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
      // PHASE 3 AUDITING: Record derived recalculation
      MutationIntegrityLayer.recordDerivedRecalc();

      const prog = actor.system.progression || {};
      const classLevels = prog.classLevels || [];

      // ========================================
      // PHASE 0: Modifier Pipeline Integration
      // ========================================
      // Collect all modifiers from every source
      const allModifiers = await ModifierEngine.getAllModifiers(actor);

      // Aggregate modifiers: group by target, apply stacking rules
      const modifierMap = await ModifierEngine.aggregateAll(actor);

      // Extract specific adjustments for calculators
      const hpAdjustment = modifierMap['hp.max'] || 0;
      const defenseAdjustments = {
        fort: modifierMap['defense.fort'] || 0,
        ref: modifierMap['defense.reflex'] || 0,
        will: modifierMap['defense.will'] || 0
      };
      const babAdjustment = modifierMap['bab.total'] || 0;

      swseLogger.debug(`[DerivedCalculator] Modifier adjustments: HP=${hpAdjustment}, Fort=${defenseAdjustments.fort}, Ref=${defenseAdjustments.ref}, Will=${defenseAdjustments.will}, BAB=${babAdjustment}`);

      // ========================================
      // Compute all derived values (base only)
      // ========================================
      const hp = HPCalculator.calculate(actor, classLevels, { adjustment: hpAdjustment });
      const bab = await BABCalculator.calculate(classLevels, { adjustment: babAdjustment });
      const defenses = await DefenseCalculator.calculate(actor, classLevels, { adjustments: defenseAdjustments });

      // Build update object (all writes go to system.derived.*)
      const updates = {};

      // ========================================
      // Ability Modifiers (Phase 2: moved from DataModel)
      // ========================================
      updates['system.derived.attributes'] = {};
      const attributes = actor.system.attributes || {};
      for (const [key, ability] of Object.entries(attributes)) {
        const total = (ability.base || 10) + (ability.racial || 0) + (ability.enhancement || 0) + (ability.temp || 0);
        const mod = Math.floor((total - 10) / 2);
        updates['system.derived.attributes'][key] = {
          base: ability.base || 10,
          racial: ability.racial || 0,
          enhancement: ability.enhancement || 0,
          temp: ability.temp || 0,
          total: total,
          mod: mod
        };
      }

      // ========================================
      // Initiative Derived (Phase 2: moved from DataModel)
      // ========================================
      const dexMod = (updates['system.derived.attributes']?.dex?.mod) || 0;
      const initiativeAdjustment = modifierMap['initiative.total'] || 0;
      updates['system.derived.initiative'] = {
        dexModifier: dexMod,
        adjustment: initiativeAdjustment,
        total: dexMod + initiativeAdjustment
      };

      // ========================================
      // Force/Destiny Points Derived (Phase 2: moved from DataModel)
      // ========================================
      // Force points: WIS modifier + class levels + bonuses
      const wisMod = (updates['system.derived.attributes']?.wis?.mod) || 0;
      const forceClassBonus = actor.system.forcePoints?.classBonus || 0;
      updates['system.derived.forcePoints'] = {
        wisdom: wisMod,
        classBonus: forceClassBonus,
        total: wisMod + forceClassBonus + (actor.system.forcePoints?.bonus || 0)
      };

      // Destiny points: CHA modifier + class levels + bonuses
      const chaMod = (updates['system.derived.attributes']?.cha?.mod) || 0;
      const destinyClassBonus = actor.system.destinyPoints?.classBonus || 0;
      updates['system.derived.destinyPoints'] = {
        charisma: chaMod,
        classBonus: destinyClassBonus,
        total: chaMod + destinyClassBonus + (actor.system.destinyPoints?.bonus || 0)
      };

      // HP
      if (hp.max > 0) {
        updates['system.derived.hp'] = {
          base: hp.base || hp.max,  // Store base for reference
          max: hp.max,
          total: hp.max,
          value: actor.system.hp?.value || hp.value, // Preserve current HP if set
          adjustment: hpAdjustment
        };
      }

      // BAB
      if (bab >= 0) {
        updates['system.derived.bab'] = bab;
        updates['system.derived.babAdjustment'] = babAdjustment;
      }

      // Defenses
      if (defenses.fortitude) {
        updates['system.derived.defenses'] = updates['system.derived.defenses'] || {};
        updates['system.derived.defenses'].fortitude = {
          base: defenses.fortitude.base,
          total: defenses.fortitude.total,
          adjustment: defenseAdjustments.fort
        };
      }
      if (defenses.reflex) {
        updates['system.derived.defenses'] = updates['system.derived.defenses'] || {};
        updates['system.derived.defenses'].reflex = {
          base: defenses.reflex.base,
          total: defenses.reflex.total,
          adjustment: defenseAdjustments.ref
        };
      }
      if (defenses.will) {
        updates['system.derived.defenses'] = updates['system.derived.defenses'] || {};
        updates['system.derived.defenses'].will = {
          base: defenses.will.base,
          total: defenses.will.total,
          adjustment: defenseAdjustments.will
        };
      }

      // ========================================
      // Store modifier breakdown for UI
      // ========================================
      const skillTargets = Object.keys(actor?.system?.skills || {})
        .map(key => `skill.${key}`);
      const allTargets = [
        ...skillTargets,
        'defense.fort', 'defense.reflex', 'defense.will',
        'hp.max', 'bab.total', 'initiative.total'
      ];
      const modifierBreakdown = await ModifierEngine.buildModifierBreakdown(actor, allTargets);

      updates['system.derived.modifiers'] = {
        all: allModifiers,
        breakdown: modifierBreakdown
      };

      swseLogger.debug(`DerivedCalculator computed for ${actor.name}`, { updates });

      return updates;
    } catch (err) {
      swseLogger.error(`DerivedCalculator.computeAll failed for ${actor?.name ?? 'unknown'}`, err);
      throw err;
    }
  }
}
