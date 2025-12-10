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
      const totalLevel = classLevels.length; // Each entry is one level

      if (totalLevel > 0) {
        updates["system.level"] = totalLevel;
      }

      // Calculate HP from class levels
      const hp = await this._calculateHP(actor, classLevels);
      if (hp.max > 0) {
        updates["system.hp.max"] = hp.max;
        // Only update current HP if it's 0 (new character)
        if ((actor.system.hp?.value || 0) === 0) {
          updates["system.hp.value"] = hp.max;
        }
      }

      // Calculate Base Attack Bonus (now async)
      const bab = await calculateBAB(classLevels);
      updates["system.bab"] = bab;

      // Calculate defenses (now async)
      const defenses = await this._calculateDefenses(actor, classLevels);
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
   * Now supports prestige classes from compendium
   * @private
   */
  static async _calculateHP(actor, classLevels) {
    const { getClassData } = await import('../utils/class-data-loader.js');

    let maxHP = 0;
    const conMod = actor.system.abilities?.con?.mod || 0;
    let isFirstLevel = true;

    for (const classLevel of classLevels) {
      // Try hardcoded data first (faster for core classes)
      let classData = PROGRESSION_RULES.classes[classLevel.class];

      // If not found, try loading from compendium (prestige classes)
      if (!classData) {
        classData = await getClassData(classLevel.class);
      }

      if (!classData) {
        swseLogger.warn(`HP calculation: Unknown class "${classLevel.class}", skipping`);
        continue;
      }

      const hitDie = classData.hitDie || 6;

      // First level ever: max HP
      if (isFirstLevel) {
        maxHP += hitDie + conMod;
        isFirstLevel = false;
      } else {
        // All other levels: average HP (half die + 1)
        const avgRoll = Math.floor(hitDie / 2) + 1;
        maxHP += avgRoll + conMod;
      }
    }

    return {
      max: Math.max(1, maxHP), // Minimum 1 HP
      value: Math.max(1, maxHP)
    };
  }

  /**
   * Calculate defense bonuses from classes
   * Fixed: Uses HIGHEST class bonus, not sum
   * Formula: 10 + heroic level + highest class bonus + ability mod
   * @private
   */
  static async _calculateDefenses(actor, classLevels) {
    const abilities = actor.system.abilities || {};

    // Get ability modifiers
    const strMod = abilities.str?.mod || 0;
    const dexMod = abilities.dex?.mod || 0;
    const conMod = abilities.con?.mod || 0;
    const wisMod = abilities.wis?.mod || 0;

    // Calculate class bonuses for each save (now async)
    const fortBonus = await calculateSaveBonus(classLevels, 'fort');
    const refBonus = await calculateSaveBonus(classLevels, 'ref');
    const willBonus = await calculateSaveBonus(classLevels, 'will');

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
