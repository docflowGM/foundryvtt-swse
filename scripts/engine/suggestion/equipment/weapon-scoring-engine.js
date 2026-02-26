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
 * Scoring Pipeline:
 * 1. Extract character context (attributes, roles, playstyle)
 * 2. Score Axis A (damage-on-hit)
 * 3. Score Axis B (hit-likelihood bias)
 * 4. Apply TradeoffResolver OR WeightedScoreEngine for combined score
 * 5. Apply CategoryNormalization (trap item detection) - LAST
 * 6. Generate explanations
 * 7. Rank and return
 *
 * The engine produces:
 * - Independent axis scores
 * - Bounded, additive weighted score (0-100)
 * - Category-relative adjustments (-6 to +4)
 * - Human-readable explanations
 * - Tag-driven reasoning
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { AxisAEngine } from "/systems/foundryvtt-swse/scripts/engine/suggestion/equipment/scoring/axis-a-engine.js";
import { AxisBEngine } from "/systems/foundryvtt-swse/scripts/engine/suggestion/equipment/scoring/axis-b-engine.js";
import { TradeoffResolver } from "/systems/foundryvtt-swse/scripts/engine/suggestion/equipment/scoring/tradeoff-resolver.js";
import { WeightedScoreEngine } from "/systems/foundryvtt-swse/scripts/engine/suggestion/equipment/scoring/weighted-score-engine.js";
import { CategoryNormalizationEngine } from "/systems/foundryvtt-swse/scripts/engine/suggestion/equipment/scoring/category-normalization-engine.js";
import { ExplainabilityGenerator } from "/systems/foundryvtt-swse/scripts/engine/suggestion/equipment/scoring/explainability-generator.js";
import { assignTier, clampScore, scaleNormalizedTo100, buildPeerGroupIndex, getPeerGroup } from "/systems/foundryvtt-swse/scripts/engine/suggestion/equipment/shared-scoring-utils.js";

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

      // Convert to 0-100 scale (axes are 0-1, combined might be 0-1 too)
      const axisAScore100 = scaleNormalizedTo100(axisA.normalizedScore);
      const axisBScore100 = scaleNormalizedTo100(axisB.normalizedScore);
      let finalScore = scaleNormalizedTo100(combined.finalScore);

      // NaN protection
      if (!Number.isFinite(finalScore)) finalScore = 0;
      finalScore = clampScore(finalScore, 0, 100);

      // Assign tier (canonical)
      const tier = assignTier(finalScore);

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

        // Axis scores (0-100)
        axisA: {
          label: 'Damage-on-Hit',
          score: axisAScore100,
          band: axisA.band,
          rawDamage: axisA.averageDamage,
          details: axisA
        },

        axisB: {
          label: 'Hit-Likelihood Bias',
          score: axisBScore100,
          factor: axisB.factor,
          bias: axisB.biasDirection,
          details: axisB
        },

        // Combined evaluation
        combined: {
          finalScore,
          tier,
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

    // Apply category normalization (trap item detection) - O(n) via peer index
    if (options.applyCategoryNormalization !== false) {
      // Build peer index by weapon category (O(n))
      const peerIndex = buildPeerGroupIndex(weapons, (weapon) => {
        return weapon.system?.category || 'unknown';
      });

      scored.forEach(result => {
        const weaponItem = weapons.find(w => w.id === result.weaponId);
        if (weaponItem) {
          const peerGroup = getPeerGroup(weaponItem, peerIndex, (w) => w.system?.category || 'unknown');
          const categoryAdj = CategoryNormalizationEngine.computeCategoryAdjustment(
            weaponItem,
            peerGroup
          );
          result.categoryNormalization = categoryAdj;
          // Apply adjustment to final score (additive)
          if (result.combined) {
            result.combined.finalScore += categoryAdj.adjustment;
            result.combined.finalScore = clampScore(result.combined.finalScore, 0, 100);
            // Update tier based on adjusted score
            result.combined.tier = assignTier(result.combined.finalScore);
          }
        }
      });
    }

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
