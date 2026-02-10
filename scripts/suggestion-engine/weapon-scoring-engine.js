/**
 * Weapon Scoring Engine
 *
 * Evaluates weapons using a dual-axis model:
 * - Axis A: Damage-on-hit (raw average dice damage)
 * - Axis B: Hit-likelihood bias (contextual to character attributes)
 *
 * This is NOT a DPR engine. It does NOT compute:
 * - Rate of fire effects
 * - Critical multipliers
 * - Feat/talent interactions
 *
 * The engine produces:
 * - Independent axis scores
 * - Combined relevance score
 * - Human-readable explanations
 * - Tag-driven reasoning
 */

import { SWSELogger } from '../utils/logger.js';
import { AxisAEngine } from './scoring/axis-a-engine.js';
import { AxisBEngine } from './scoring/axis-b-engine.js';
import { TradeoffResolver } from './scoring/tradeoff-resolver.js';
import { ExplainabilityGenerator } from './scoring/explainability-generator.js';

export class WeaponScoringEngine {
  /**
   * Score a single weapon in character context
   * @param {Object} weapon - The weapon item
   * @param {Object} character - The character actor
   * @param {Object} options - Scoring options
   * @returns {Object} Scoring result with axes, score, and explanations
   */
  static scoreWeapon(weapon, character, options = {}) {
    try {
      // Validate inputs
      if (!weapon || !weapon.system) {
        return this._invalidScore('Weapon data missing');
      }

      if (!character || !character.system) {
        return this._invalidScore('Character data missing');
      }

      // Extract character context
      const charContext = this._extractCharacterContext(character);

      // Score Axis A: Damage-on-hit
      const axisA = AxisAEngine.computeDamageAxis(weapon);

      // Score Axis B: Hit-likelihood bias
      const axisB = AxisBEngine.computeHitLikelihoodAxis(weapon, charContext);

      // Resolve tradeoffs and compute final score
      const combined = TradeoffResolver.resolveTradeoff(axisA, axisB, charContext);

      // Generate explanations
      const explanations = ExplainabilityGenerator.generateExplanations(
        weapon,
        charContext,
        axisA,
        axisB,
        combined,
        options
      );

      const result = {
        weaponId: weapon.id,
        weaponName: weapon.name,
        weaponType: weapon.type,

        // Axis scores (0-1 normalized)
        axisA: {
          label: 'Damage-on-Hit',
          score: axisA.normalizedScore,
          band: axisA.band,
          rawDamage: axisA.averageDamage,
          details: axisA
        },

        axisB: {
          label: 'Hit-Likelihood Bias',
          score: axisB.normalizedScore,
          factor: axisB.factor,
          bias: axisB.biasDirection,
          details: axisB
        },

        // Combined evaluation
        combined: {
          finalScore: combined.finalScore,
          tier: combined.tier,
          tradeoffType: combined.tradeoffType
        },

        // Explainability
        explanations,

        // Metadata for debugging/auditing
        meta: {
          computedAt: Date.now(),
          engineVersion: '1.0.0',
          characterLevel: charContext.level,
          characterRole: charContext.primaryRole
        }
      };

      SWSELogger.log(`[WeaponScoringEngine] Scored ${weapon.name}`, {
        axisAScore: axisA.normalizedScore.toFixed(2),
        axisBScore: axisB.normalizedScore.toFixed(2),
        finalScore: combined.finalScore.toFixed(2),
        tier: combined.tier
      });

      return result;
    } catch (err) {
      SWSELogger.error('[WeaponScoringEngine] Scoring failed:', err);
      return this._invalidScore(err.message);
    }
  }

  /**
   * Score multiple weapons and rank them
   * @param {Array} weapons - Array of weapon items
   * @param {Object} character - The character actor
   * @param {Object} options - Scoring options
   * @returns {Array} Sorted array of scored weapons
   */
  static scoreWeapons(weapons, character, options = {}) {
    const scored = weapons
      .map(weapon => this.scoreWeapon(weapon, character, options))
      .filter(result => result.combined); // Filter out invalid scores

    // Sort by final score (descending)
    scored.sort((a, b) => b.combined.finalScore - a.combined.finalScore);

    return scored;
  }

  /**
   * Extract character context needed for scoring
   * @private
   */
  static _extractCharacterContext(character) {
    const system = character.system || {};
    const abilities = system.abilities || {};

    return {
      characterId: character.id,
      characterName: character.name,

      // Attributes (raw ability modifiers)
      attributes: {
        str: abilities.str?.mod ?? 0,
        dex: abilities.dex?.mod ?? 0,
        con: abilities.con?.mod ?? 0,
        int: abilities.int?.mod ?? 0,
        wis: abilities.wis?.mod ?? 0,
        cha: abilities.cha?.mod ?? 0
      },

      // Proficiencies (soft penalty if missing, not exclusion)
      proficiencies: {
        simple: system.proficiencies?.simple ?? false,
        advanced: system.proficiencies?.advanced ?? false,
        armor: system.proficiencies?.armor ?? false
      },

      // Current equipment state
      currentArmor: system.armor?.equipped || null,
      armorCategory: this._getArmorCategory(system.armor),

      // Combat role(s) if known
      primaryRole: this._inferPrimaryRole(character),
      combatRoles: this._inferCombatRoles(character),

      // Level for context
      level: system.level?.value ?? 1,

      // Playstyle hints (inferred from abilities and class)
      playstyleHints: this._inferPlaystyle(character),

      // Archetype (if available)
      archetype: this._getArchetype(system)
    };
  }

  /**
   * Get armor category (light/medium/heavy)
   * @private
   */
  static _getArmorCategory(armor) {
    if (!armor) return 'none';
    const category = armor.category || armor.type;
    if (category === 'light') return 'light';
    if (category === 'medium') return 'medium';
    if (category === 'heavy') return 'heavy';
    return 'unknown';
  }

  /**
   * Infer primary combat role from character data
   * @private
   */
  static _inferPrimaryRole(character) {
    // This would ideally come from explicit role tags on the character
    // For now, infer from class if available
    const className = character.system?.class?.name || '';
    const prestigeClass = character.system?.prestigeClass?.name || '';

    // Simple heuristic based on class names
    if (prestigeClass) {
      if (prestigeClass.includes('Jedi Guardian') || prestigeClass.includes('Marauder')) {
        return 'melee-striker';
      }
      if (prestigeClass.includes('Jedi Sentinel') || prestigeClass.includes('Assassin')) {
        return 'ranged-striker';
      }
      if (prestigeClass.includes('Consular') || prestigeClass.includes('Sage')) {
        return 'caster';
      }
    }

    if (className) {
      if (className === 'Soldier') return 'melee-striker';
      if (className === 'Scout') return 'ranged-striker';
      if (className === 'Jedi') return 'caster';
    }

    return 'generalist';
  }

  /**
   * Infer all combat roles
   * @private
   */
  static _inferCombatRoles(character) {
    const roles = new Set();
    const primary = this._inferPrimaryRole(character);
    roles.add(primary);

    // High DEX suggests ranged capability
    if ((character.system?.abilities?.dex?.mod ?? 0) >= 2) {
      roles.add('ranged-capable');
    }

    // High STR suggests melee capability
    if ((character.system?.abilities?.str?.mod ?? 0) >= 2) {
      roles.add('melee-capable');
    }

    return Array.from(roles);
  }

  /**
   * Infer playstyle from character attributes
   * @private
   */
  static _inferPlaystyle(character) {
    const hints = new Set();
    const dex = character.system?.abilities?.dex?.mod ?? 0;
    const str = character.system?.abilities?.str?.mod ?? 0;

    if (dex > str + 1) {
      hints.add('mobile');
      hints.add('ranged-preferred');
    } else if (str > dex + 1) {
      hints.add('stationary');
      hints.add('melee-preferred');
    }

    // Heavy armor suggests tank playstyle
    const armorCategory = this._getArmorCategory(character.system?.armor);
    if (armorCategory === 'heavy') {
      hints.add('tank');
    } else if (armorCategory === 'light') {
      hints.add('mobile');
    }

    return Array.from(hints);
  }

  /**
   * Get character archetype if available
   * @private
   */
  static _getArchetype(system) {
    return system.archetype?.name || system.swse?.archetype || 'unspecified';
  }

  /**
   * Return a standardized invalid score
   * @private
   */
  static _invalidScore(reason) {
    return {
      valid: false,
      reason,
      axisA: { score: 0, band: 'invalid' },
      axisB: { score: 0, bias: 'unknown' },
      combined: { finalScore: 0, tier: 'invalid' },
      explanations: [`Error: ${reason}`],
      meta: { computedAt: Date.now(), engineVersion: '1.0.0' }
    };
  }
}

export default WeaponScoringEngine;
