/**
 * ActorProgressionUpdater.finalize(actor)
 * Converts canonical system.progression data into derived actor.system.* fields used by sheets.
 * Keep all derived-field writes here to avoid scattered writes across the codebase.
 */

import { PROGRESSION_RULES, calculateBAB, calculateSaveBonus } from '../data/progression-data.js';
import { swseLogger } from '../../utils/logger.js';

export class ActorProgressionUpdater {
  static async finalize(actor) {
    const prog = actor.system.progression || {};
    const updates = {};

    try {
      // Calculate total level
      const classLevels = prog.classLevels || [];
      const totalLevel = classLevels.reduce((sum, cl) => sum + (cl.level || 0), 0);

      if (totalLevel > 0) {
        updates["system.level"] = totalLevel;
      }

      // Calculate HP from class levels
      const hp = this._calculateHP(actor, classLevels);
      if (hp.max > 0) {
        updates["system.hp.max"] = hp.max;
        // Only update current HP if it's 0 (new character)
        if ((actor.system.hp?.value || 0) === 0) {
          updates["system.hp.value"] = hp.max;
        }
      }

      // Calculate Base Attack Bonus
      const bab = calculateBAB(classLevels);
      updates["system.bab"] = bab;

      // Calculate defenses
      const defenses = this._calculateDefenses(actor, classLevels);
      if (defenses.fortitude) {
        updates["system.defenses.fortitude.class"] = defenses.fortitude.class;
        updates["system.defenses.fortitude.ability"] = defenses.fortitude.ability;
      }
      if (defenses.reflex) {
        updates["system.defenses.reflex.class"] = defenses.reflex.class;
        updates["system.defenses.reflex.ability"] = defenses.reflex.ability;
      }
      if (defenses.will) {
        updates["system.defenses.will.class"] = defenses.will.class;
        updates["system.defenses.will.ability"] = defenses.will.ability;
      }

      // Apply species data
      if (prog.species) {
        const speciesData = PROGRESSION_RULES.species[prog.species];
        if (speciesData) {
          updates["system.race"] = prog.species;
          if (speciesData.size) updates["system.size"] = speciesData.size;
          if (speciesData.speed !== undefined) updates["system.speed"] = speciesData.speed;

          // Mark force sensitivity
          if (classLevels.some(cl => {
            const classData = PROGRESSION_RULES.classes[cl.class];
            return classData?.forceSensitive;
          })) {
            updates["system.forceSensitive"] = true;
          }
        }
      }

      // Keep applied feats/talents as flags for tracking
      updates["flags.swse.appliedFeats"] = prog.feats || [];
      updates["flags.swse.appliedTalents"] = prog.talents || [];
      updates["flags.swse.progressionSkills"] = prog.skills || [];

      // Apply updates if any
      if (Object.keys(updates).length > 0) {
        await globalThis.SWSE.ActorEngine.updateActor(actor, updates);
        swseLogger.log(`ActorProgressionUpdater: Applied ${Object.keys(updates).length} updates to ${actor.name}`);
      }

    } catch (err) {
      swseLogger.error('ActorProgressionUpdater.finalize failed:', err);
      throw err;
    }
  }

  /**
   * Calculate max HP from class levels
   * @private
   */
  static _calculateHP(actor, classLevels) {
    let maxHP = 0;
    const conMod = actor.system.abilities?.con?.mod || 0;

    for (let i = 0; i < classLevels.length; i++) {
      const classLevel = classLevels[i];
      const classData = PROGRESSION_RULES.classes[classLevel.class];
      if (!classData) continue;

      const hitDie = classData.hitDie || 6;
      const levels = classLevel.level || 1;

      // First level of first class: max HP
      if (i === 0) {
        maxHP += hitDie + conMod;
        // Additional levels in this class
        if (levels > 1) {
          maxHP += (levels - 1) * (Math.floor(hitDie / 2) + 1 + conMod);
        }
      } else {
        // Multiclass: average HP for all levels
        maxHP += levels * (Math.floor(hitDie / 2) + 1 + conMod);
      }
    }

    return {
      max: Math.max(1, maxHP), // Minimum 1 HP
      value: Math.max(1, maxHP)
    };
  }

  /**
   * Calculate defense bonuses from classes
   * @private
   */
  static _calculateDefenses(actor, classLevels) {
    const abilities = actor.system.abilities || {};

    // Get ability modifiers
    const strMod = abilities.str?.mod || 0;
    const dexMod = abilities.dex?.mod || 0;
    const conMod = abilities.con?.mod || 0;
    const wisMod = abilities.wis?.mod || 0;

    // Calculate class bonuses for each save
    const fortBonus = calculateSaveBonus(classLevels, 'fort');
    const refBonus = calculateSaveBonus(classLevels, 'ref');
    const willBonus = calculateSaveBonus(classLevels, 'will');

    // Fortitude uses STR or CON (whichever is higher)
    const fortAbility = Math.max(strMod, conMod);

    return {
      fortitude: {
        class: fortBonus,
        ability: fortAbility
      },
      reflex: {
        class: refBonus,
        ability: dexMod
      },
      will: {
        class: willBonus,
        ability: wisMod
      }
    };
  }
}
