/**
 * ProgressionEngineV2
 *
 * Owns: Talent cadence, skill advancement, ability increases, multiclass bonus logic
 * Delegates to: HPGeneratorEngine, ModifierEngine, ActorEngine
 * Never owns: Combat penalties, condition effects, armor math
 *
 * Contract:
 * - Returns structured advancement plan, not mutations
 * - Reads HouseRuleService for configuration
 * - Delegates all mutations to ActorEngine
 * - Delegates HP calculation to HPGeneratorEngine
 * - No direct actor.system writes
 * - No game.settings.get() calls
 *
 * Governance enforcement:
 * - Violates architecture if: writes to actor.system directly
 * - Violates architecture if: calls game.settings.get()
 * - Violates architecture if: imports sheets or UI
 * - Violates architecture if: duplicates HP formula logic
 */

import { swseLogger } from '../../utils/logger.js';
import { HouseRuleService } from '../system/HouseRuleService.js';
import { HPGeneratorEngine } from '../HP/HPGeneratorEngine.js';
import { ActorEngine } from '../../governance/actor-engine/actor-engine.js';
import { determineLevelFromXP } from '../shared/xp-system.js';

export class ProgressionEngineV2 {
  /**
   * Compute level advancement for an actor gaining XP.
   *
   * Entry point for progression system.
   * Coordinates talent acquisition, skill advancement, ability increases, HP gains.
   * Returns structured plan for ActorEngine to apply.
   *
   * @param {Actor} actor - The actor advancing
   * @param {number} xpGain - XP to add
   * @param {Object} options - Advancement options
   * @returns {Promise<Object>} Advancement plan { success, plan }
   */
  static async computeAdvancement(actor, xpGain, options = {}) {
    try {
      swseLogger.debug(`[ProgressionEngine] Computing advancement for ${actor?.name ?? 'unknown'}`, {
        xpGain,
        currentLevel: actor?.system?.level || 1
      });

      if (!actor) {
        throw new Error('computeAdvancement() requires actor');
      }

      if (typeof xpGain !== 'number' || xpGain < 0) {
        throw new Error(`Invalid XP gain: ${xpGain}`);
      }

      // ====================================================================
      // PHASE 1: Read house rules once at start
      // ====================================================================
      const houseRules = HouseRuleService.getAll();
      swseLogger.debug(`[ProgressionEngine] Loaded ${Object.keys(houseRules).length} house rules`);

      // ====================================================================
      // PHASE 2: Calculate new level
      // ====================================================================
      const currentXP = actor.system.xp?.total || 0;
      const newXPTotal = currentXP + xpGain;
      const oldLevel = determineLevelFromXP(currentXP);
      const newLevel = determineLevelFromXP(newXPTotal);
      const leveledUp = newLevel > oldLevel;

      swseLogger.debug(`[ProgressionEngine] Level computation`, {
        oldLevel,
        newLevel,
        leveledUp,
        xpTotal: newXPTotal
      });

      // ====================================================================
      // PHASE 3: Delegate HP calculation to HPGeneratorEngine
      // ====================================================================
      let totalHP = actor.system.attributes?.hp?.max || 0;
      let hpGains = [];

      if (leveledUp) {
        for (let lv = oldLevel + 1; lv <= newLevel; lv++) {
          const hitDie = this.#getHitDie(actor);
          const hpGain = HPGeneratorEngine.calculateHPGain(actor, lv, hitDie, {
            context: 'progression'
          });
          hpGains.push({ level: lv, gain: hpGain });
          totalHP += hpGain;
        }
        swseLogger.debug(`[ProgressionEngine] HP gains delegated to HPGeneratorEngine`, {
          gains: hpGains,
          totalHP
        });
      }

      // ====================================================================
      // PHASE 4: Compute talent acquisition cadence
      // ====================================================================
      const talentAcquisition = this.#getTalentAcquisition(actor, oldLevel, newLevel, houseRules);
      swseLogger.debug(`[ProgressionEngine] Talent acquisition gated by class cadence`, {
        talentsToAdd: talentAcquisition.length,
        cadence: talentAcquisition.map(t => `L${t.level}`)
      });

      // ====================================================================
      // PHASE 5: Compute skill advancement
      // ====================================================================
      const skillAdvancement = this.#getSkillAdvancement(actor, newLevel, houseRules);
      swseLogger.debug(`[ProgressionEngine] Skill advancement computed`, {
        skillCount: Object.keys(skillAdvancement).length
      });

      // ====================================================================
      // PHASE 6: Compute ability increases
      // ====================================================================
      const abilityIncreases = this.#getAbilityIncreases(actor, oldLevel, newLevel, houseRules);
      swseLogger.debug(`[ProgressionEngine] Ability increases gated by progression rules`, {
        increases: Object.keys(abilityIncreases).length,
        atLevels: Object.keys(abilityIncreases).map(k => `L${abilityIncreases[k].level}`)
      });

      // ====================================================================
      // PHASE 7: Compute multiclass bonus logic
      // ====================================================================
      const multiclassBonus = this.#computeMulticlassBonus(actor, newLevel, houseRules);
      swseLogger.debug(`[ProgressionEngine] Multiclass bonus computed`, {
        hasMulticlass: !!actor.system.secondaryClass,
        bonusValue: multiclassBonus
      });

      // ====================================================================
      // PHASE 8: Build structured advancement plan
      // ====================================================================
      const advancementPlan = {
        level: {
          from: oldLevel,
          to: newLevel,
          leveledUp
        },
        xp: {
          current: currentXP,
          gained: xpGain,
          total: newXPTotal
        },
        hitPoints: {
          gains: hpGains,
          newMax: totalHP
        },
        talents: talentAcquisition,
        skills: skillAdvancement,
        abilities: abilityIncreases,
        multiclass: multiclassBonus,
        // Structured updates (not mutations yet)
        updates: {
          'system.xp.total': newXPTotal,
          'system.level': newLevel,
          'system.attributes.hp.max': totalHP
        }
      };

      // Add computed updates
      if (Object.keys(skillAdvancement).length > 0) {
        for (const [skillKey, skillData] of Object.entries(skillAdvancement)) {
          advancementPlan.updates[`system.skills.${skillKey}`] = skillData.ranks;
        }
      }

      if (Object.keys(abilityIncreases).length > 0) {
        for (const [abilityKey, abilityData] of Object.entries(abilityIncreases)) {
          advancementPlan.updates[`system.abilities.${abilityKey}.total`] = abilityData.newTotal;
        }
      }

      if (multiclassBonus.applies) {
        advancementPlan.updates['system.multiclass.bonus'] = multiclassBonus.value;
      }

      swseLogger.log(`[ProgressionEngine] Advancement plan complete`, {
        actor: actor.name,
        leveledUp: leveledUp ? `${oldLevel} → ${newLevel}` : 'no level',
        totalHP,
        talentsGained: talentAcquisition.length,
        skillsAdvanced: Object.keys(skillAdvancement).length,
        abilitiesIncreased: Object.keys(abilityIncreases).length
      });

      return {
        success: true,
        plan: advancementPlan
      };

    } catch (err) {
      swseLogger.error(`[ProgressionEngine] computeAdvancement failed for ${actor?.name ?? 'unknown'}`, {
        error: err,
        xpGain
      });

      return {
        success: false,
        reason: err.message
      };
    }
  }

  /**
   * Apply an advancement plan to an actor.
   * Delegates all mutations to ActorEngine.
   *
   * @param {Actor} actor - Target actor
   * @param {Object} plan - Plan from computeAdvancement()
   * @returns {Promise<Object>} Result { success, actor, plan }
   */
  static async applyAdvancementPlan(actor, plan) {
    try {
      if (!actor) {
        throw new Error('applyAdvancementPlan() requires actor');
      }

      if (!plan || !plan.updates) {
        throw new Error('applyAdvancementPlan() requires valid plan');
      }

      swseLogger.debug(`[ProgressionEngine] Applying advancement plan to ${actor.name}`, {
        level: plan.level.leveledUp ? `${plan.level.from} → ${plan.level.to}` : 'no change',
        updateCount: Object.keys(plan.updates).length,
        talentsGained: plan.talents?.length || 0
      });

      // ====================================================================
      // PHASE 1: Apply all actor updates through ActorEngine
      // ====================================================================
      await ActorEngine.updateActor(actor, plan.updates);
      swseLogger.debug(`[ProgressionEngine] Applied ${Object.keys(plan.updates).length} root updates`);

      // ====================================================================
      // PHASE 2: Create new talent items
      // ====================================================================
      if (plan.talents && plan.talents.length > 0) {
        const talentItems = plan.talents.map(talent => ({
          type: 'talent',
          name: talent.id,
          system: {
            ssotId: talent.id,
            gainedAtLevel: talent.level
          }
        }));

        await ActorEngine.createEmbeddedDocuments(actor, 'Item', talentItems);
        swseLogger.debug(`[ProgressionEngine] Created ${talentItems.length} talent items`);
      }

      swseLogger.log(`[ProgressionEngine] Advancement plan applied to ${actor.name}`, {
        newLevel: plan.level.to,
        newHP: plan.hitPoints.newMax,
        talentsGained: plan.talents?.length || 0,
        skillsAdvanced: Object.keys(plan.skills || {}).length,
        abilitiesIncreased: Object.keys(plan.abilities || {}).length
      });

      return {
        success: true,
        actor,
        plan
      };

    } catch (err) {
      swseLogger.error(`[ProgressionEngine] applyAdvancementPlan failed for ${actor?.name ?? 'unknown'}`, {
        error: err,
        plan
      });

      return {
        success: false,
        reason: err.message
      };
    }
  }

  /**
   * Determine talent acquisition for level range.
   * Gated by class cadence rules.
   *
   * @private
   */
  static #getTalentAcquisition(actor, oldLevel, newLevel, houseRules) {
    const talents = [];
    const classId = actor.system.class?.id || 'soldier';

    // Talent cadence by class (when talents are gained)
    const talentCadenceByClass = {
      soldier: [1, 3, 6, 9, 12, 15, 18, 20],
      scout: [1, 2, 4, 7, 10, 13, 16, 19],
      scoundrel: [1, 2, 4, 7, 10, 13, 16, 19],
      jedi: [1, 2, 4, 7, 10, 13, 16, 19],
      noble: [1, 3, 6, 9, 12, 15, 18, 20],
      force_adept: [1, 2, 4, 7, 10, 13, 16, 19],
      engineer: [1, 3, 6, 9, 12, 15, 18, 20],
      commando: [1, 3, 6, 9, 12, 15, 18, 20],
      gunslinger: [1, 3, 6, 9, 12, 15, 18, 20]
    };

    const cadence = talentCadenceByClass[classId] || [1, 3, 6, 9, 12, 15, 18, 20];

    for (let lv = oldLevel + 1; lv <= newLevel; lv++) {
      if (cadence.includes(lv)) {
        talents.push({
          level: lv,
          id: `talent_${lv}_${classId}` // Placeholder ID
        });
      }
    }

    return talents;
  }

  /**
   * Compute skill advancement for new level.
   *
   * @private
   */
  static #getSkillAdvancement(actor, newLevel, houseRules) {
    const skillAdvancement = {};

    // Skills gain a rank every level (simplified)
    const skills = actor.system.skills || {};

    for (const [skillKey, skillData] of Object.entries(skills)) {
      const currentRanks = skillData.ranks || 0;
      const newRanks = currentRanks + 1; // Gain 1 rank per level

      skillAdvancement[skillKey] = {
        old: currentRanks,
        ranks: newRanks,
        gain: 1
      };
    }

    return skillAdvancement;
  }

  /**
   * Compute ability score increases.
   * Applies at levels 4, 8, 12, 16, 20.
   *
   * @private
   */
  static #getAbilityIncreases(actor, oldLevel, newLevel, houseRules) {
    const abilityIncreases = {};
    const increaseAtLevels = [4, 8, 12, 16, 20];

    for (let lv = oldLevel + 1; lv <= newLevel; lv++) {
      if (increaseAtLevels.includes(lv)) {
        // Ability score increase available at this level
        // Actual selection is done by player (return as available choice)
        abilityIncreases[`level_${lv}`] = {
          level: lv,
          available: true,
          abilityChoices: ['str', 'dex', 'con', 'int', 'wis', 'cha']
        };
      }
    }

    return abilityIncreases;
  }

  /**
   * Compute multiclass bonus if applicable.
   *
   * @private
   */
  static #computeMulticlassBonus(actor, newLevel, houseRules) {
    const hasSecondaryClass = !!actor.system.secondaryClass;

    if (!hasSecondaryClass) {
      return { applies: false };
    }

    // Multiclass bonus = 1/2 secondary class level (rounded down)
    const secondaryLevel = actor.system.secondaryClass?.level || 1;
    const bonus = Math.floor(secondaryLevel / 2);

    return {
      applies: true,
      value: bonus,
      secondaryLevel
    };
  }

  /**
   * Get hit die for character's class.
   *
   * @private
   */
  static #getHitDie(actor) {
    const classId = actor.system.class?.id || 'soldier';

    const hitDieByClass = {
      soldier: 8,
      scout: 6,
      scoundrel: 6,
      jedi: 6,
      noble: 6,
      force_adept: 4,
      engineer: 6,
      commando: 8,
      gunslinger: 6
    };

    return hitDieByClass[classId] || 6;
  }
}
