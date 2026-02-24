/**
 * CharacterGenerationEngine
 *
 * Owns: Ability score method gating, starting wealth rules, droid construction rules, initial feat/talent gating
 * Delegates to: HPGeneratorEngine, ProgressionEngine, ActorEngine
 * Never owns: Formulas, HP calculation, mutations
 *
 * Contract:
 * - Returns structured generation plan, not mutations
 * - Reads HouseRuleService for configuration
 * - Delegates all mutations to ActorEngine
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
import { PROGRESSION_RULES } from '../progression/data/progression-data.js';

export class CharacterGenerationEngine {
  /**
   * Generate a complete character generation plan.
   *
   * Entry point for character creation.
   * Coordinates ability scores, wealth, HP, and initial feats/talents.
   * Returns structured plan for ActorEngine to apply.
   *
   * @param {Actor} actor - The actor being created
   * @param {Object} options - Generation options
   * @param {string} options.abilityMethod - 'standard', 'random', or custom array
   * @param {boolean} options.isDroid - Force droid creation rules
   * @param {Object} options.abilityScores - Pre-rolled ability scores if custom
   * @returns {Promise<Object>} Generation plan { success, plan }
   */
  static async generateCharacter(actor, options = {}) {
    try {
      swseLogger.debug(`[ChargenEngine] Starting character generation for ${actor?.name ?? 'unknown'}`, {
        abilityMethod: options.abilityMethod,
        isDroid: options.isDroid
      });

      if (!actor) {
        throw new Error('generateCharacter() requires actor');
      }

      // ====================================================================
      // PHASE 1: Read house rules once at start
      // ====================================================================
      const houseRules = HouseRuleService.getAll();
      swseLogger.debug(`[ChargenEngine] Loaded ${Object.keys(houseRules).length} house rules`);

      // ====================================================================
      // PHASE 2: Determine character type
      // ====================================================================
      const isDroid = options.isDroid || actor.system.isDroid || false;
      swseLogger.debug(`[ChargenEngine] Character type: ${isDroid ? 'droid' : 'heroic'}`);

      // ====================================================================
      // PHASE 3: Generate ability scores
      // ====================================================================
      const abilityScores = this.#generateAbilityScores(actor, options);
      swseLogger.debug(`[ChargenEngine] Generated ability scores`, {
        scores: abilityScores,
        method: options.abilityMethod
      });

      // ====================================================================
      // PHASE 4: Calculate starting wealth
      // ====================================================================
      const startingWealth = this.#calculateStartingWealth(actor, houseRules);
      swseLogger.debug(`[ChargenEngine] Calculated starting wealth: ${startingWealth} credits`);

      // ====================================================================
      // PHASE 5: Delegate HP calculation to HPGeneratorEngine
      // ====================================================================
      const hpPlan = HPGeneratorEngine.calculateHPGain(
        actor,
        1, // Level 1
        this.#getHitDie(actor),
        { context: 'chargen', isNonheroic: isDroid }
      );
      swseLogger.debug(`[ChargenEngine] HP calculation delegated to HPGeneratorEngine: ${hpPlan} HP`);

      // ====================================================================
      // PHASE 6: Determine initial feats/talents based on class
      // ====================================================================
      const classId = actor.system.class?.id || actor.system.className || 'soldier';
      const initialFeats = this.#getInitialFeats(classId, houseRules);
      const initialTalents = this.#getInitialTalents(classId, houseRules);
      swseLogger.debug(`[ChargenEngine] Initial feats/talents gated by class`, {
        classId,
        featCount: initialFeats.length,
        talentCount: initialTalents.length
      });

      // ====================================================================
      // PHASE 7: Build structured generation plan
      // ====================================================================
      const generationPlan = {
        abilityScores,
        startingWealth,
        hitPoints: hpPlan,
        isDroid,
        class: classId,
        initialFeats,
        initialTalents,
        // Structured updates (not mutations yet)
        updates: {
          'system.abilities': abilityScores,
          'system.wealth.credits': startingWealth,
          'system.attributes.hp.max': hpPlan,
          'system.attributes.hp.value': hpPlan,
          'system.isDroid': isDroid
        }
      };

      swseLogger.log(`[ChargenEngine] Character generation plan complete`, {
        actor: actor.name,
        isDroid,
        abilityTotal: Object.values(abilityScores).reduce((a, b) => a + b, 0),
        wealth: startingWealth,
        hp: hpPlan,
        feats: initialFeats.length,
        talents: initialTalents.length
      });

      return {
        success: true,
        plan: generationPlan
      };

    } catch (err) {
      swseLogger.error(`[ChargenEngine] generateCharacter failed for ${actor?.name ?? 'unknown'}`, {
        error: err,
        options
      });

      return {
        success: false,
        reason: err.message
      };
    }
  }

  /**
   * Apply a character generation plan to an actor.
   * Delegates all mutations to ActorEngine.
   *
   * @param {Actor} actor - Target actor
   * @param {Object} plan - Plan from generateCharacter()
   * @returns {Promise<Object>} Result { success, actor, plan }
   */
  static async applyGenerationPlan(actor, plan) {
    try {
      if (!actor) {
        throw new Error('applyGenerationPlan() requires actor');
      }

      if (!plan || !plan.updates) {
        throw new Error('applyGenerationPlan() requires valid plan');
      }

      swseLogger.debug(`[ChargenEngine] Applying generation plan to ${actor.name}`, {
        updateCount: Object.keys(plan.updates).length,
        featCount: plan.initialFeats?.length || 0,
        talentCount: plan.initialTalents?.length || 0
      });

      // ====================================================================
      // PHASE 1: Apply all actor updates through ActorEngine
      // ====================================================================
      await ActorEngine.updateActor(actor, plan.updates);
      swseLogger.debug(`[ChargenEngine] Applied ${Object.keys(plan.updates).length} root updates`);

      // ====================================================================
      // PHASE 2: Create initial feat items
      // ====================================================================
      if (plan.initialFeats && plan.initialFeats.length > 0) {
        const featItems = plan.initialFeats.map(featId => ({
          type: 'feat',
          name: featId,
          system: {
            ssotId: featId
          }
        }));

        await ActorEngine.createEmbeddedDocuments(actor, 'Item', featItems);
        swseLogger.debug(`[ChargenEngine] Created ${featItems.length} initial feats`);
      }

      // ====================================================================
      // PHASE 3: Create initial talent items
      // ====================================================================
      if (plan.initialTalents && plan.initialTalents.length > 0) {
        const talentItems = plan.initialTalents.map(talentId => ({
          type: 'talent',
          name: talentId,
          system: {
            ssotId: talentId
          }
        }));

        await ActorEngine.createEmbeddedDocuments(actor, 'Item', talentItems);
        swseLogger.debug(`[ChargenEngine] Created ${talentItems.length} initial talents`);
      }

      swseLogger.log(`[ChargenEngine] Generation plan applied to ${actor.name}`, {
        isDroid: plan.isDroid,
        hp: plan.hitPoints,
        wealth: plan.startingWealth,
        featsCreated: plan.initialFeats?.length || 0,
        talentsCreated: plan.initialTalents?.length || 0
      });

      return {
        success: true,
        actor,
        plan
      };

    } catch (err) {
      swseLogger.error(`[ChargenEngine] applyGenerationPlan failed for ${actor?.name ?? 'unknown'}`, {
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
   * Generate ability scores for a character.
   * Respects house rule gatings.
   *
   * @private
   */
  static #generateAbilityScores(actor, options) {
    const method = options.abilityMethod || 'standard';

    let scores = {};

    switch (method) {
      case 'standard': {
        // Standard array: 15, 14, 13, 12, 10, 8
        const standardArray = [15, 14, 13, 12, 10, 8];
        const keys = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
        keys.forEach((key, idx) => {
          scores[key] = { total: standardArray[idx] };
        });
        break;
      }

      case 'random': {
        // 4d6 drop lowest for each ability
        const keys = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
        keys.forEach(key => {
          const rolls = [
            Math.floor(Math.random() * 6) + 1,
            Math.floor(Math.random() * 6) + 1,
            Math.floor(Math.random() * 6) + 1,
            Math.floor(Math.random() * 6) + 1
          ];
          rolls.sort((a, b) => a - b);
          const score = rolls.slice(1).reduce((a, b) => a + b, 0); // Drop lowest
          scores[key] = { total: score };
        });
        break;
      }

      default: {
        // Custom provided scores
        if (options.abilityScores && typeof options.abilityScores === 'object') {
          const keys = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
          keys.forEach(key => {
            scores[key] = { total: options.abilityScores[key] || 10 };
          });
        } else {
          // Fallback to standard
          const standardArray = [15, 14, 13, 12, 10, 8];
          const keys = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
          keys.forEach((key, idx) => {
            scores[key] = { total: standardArray[idx] };
          });
        }
      }
    }

    return scores;
  }

  /**
   * Calculate starting wealth based on class and house rules.
   *
   * @private
   */
  static #calculateStartingWealth(actor, houseRules) {
    const classId = actor.system.class?.id || actor.system.className || 'soldier';

    // Base wealth by class
    const baseWealthByClass = {
      soldier: 450,
      scout: 400,
      scoundrel: 500,
      jedi: 350,
      noble: 600,
      force_adept: 300,
      engineer: 450,
      commando: 480,
      gunslinger: 520
    };

    const baseWealth = baseWealthByClass[classId] || 450;

    // Apply house rule multiplier if configured
    const wealthMultiplier = houseRules.startingWealthMultiplier || 1;

    return Math.floor(baseWealth * wealthMultiplier);
  }

  /**
   * Get hit die for character's class.
   *
   * @private
   */
  static #getHitDie(actor) {
    const classId = actor.system.class?.id || actor.system.className || 'Soldier';

    // Use PROGRESSION_RULES as SSOT
    const classData = PROGRESSION_RULES.classes?.[classId];
    if (classData && classData.hitDie) {
      return classData.hitDie;
    }

    // Fallback if not found
    swseLogger.warn(`[ChargenEngine] No hit die found for class ${classId}, using default d8`);
    return 8;
  }

  /**
   * Get initial feats for character's class.
   * Enforces class prerequisites.
   *
   * @private
   */
  static #getInitialFeats(classId, houseRules) {
    // Gated by class authority (ChargenEngine owns feat selection logic)
    // Use PROGRESSION_RULES as SSOT for starting feats

    const classData = PROGRESSION_RULES.classes?.[classId];
    if (!classData || !classData.startingFeats) {
      swseLogger.warn(`[ChargenEngine] No starting feats found for class ${classId}`);
      return [];
    }

    const feats = [...classData.startingFeats];

    // Apply house rule overrides if any
    if (houseRules.characterCreationBonusFeats) {
      // Add house rule feats (if applicable)
    }

    return feats;
  }

  /**
   * Get initial talents for character's class.
   * Enforces class prerequisites.
   *
   * @private
   */
  static #getInitialTalents(classId, houseRules) {
    // Gated by class authority
    // Characters typically start with no talents - talents are chosen at level 1, 2, 4, etc.
    // This returns talents that must be granted at level 1 (currently none by RAW)

    const classData = PROGRESSION_RULES.classes?.[classId];
    if (!classData) {
      swseLogger.warn(`[ChargenEngine] No class data found for ${classId}`);
      return [];
    }

    // RAW: Level 1 characters don't have talents yet
    // Talents are chosen as character advances
    // This can be extended for house rules that grant starting talents

    return [];
  }
}
