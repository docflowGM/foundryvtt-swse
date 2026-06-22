/**
 * Armor Suggestion Engine
 *
 * Evaluates armor using a dual-axis model:
 * - Axis A: Survivability Gain (armor bonus relative to Heroic Level + talents)
 * - Axis B: Mobility & Skill Cost (penalties modified by talents)
 *
 * Armor is NOT a pure upgrade — it's a tradeoff.
 * Talents change evaluation rules, not raw stats.
 *
 * Scoring Pipeline:
 * 1. Extract character context (role, talents, proficiencies, level)
 * 2. Score Axis A (Survivability)
 * 3. Score Axis B (Mobility Cost)
 * 4. Apply Role Alignment
 * 5. Apply Category Normalization
 * 6. Generate explanations
 * 7. Rank and return
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { ArmorAxisAEngine } from "/systems/foundryvtt-swse/scripts/engine/suggestion/equipment/scoring/armor-axis-a-engine.js";
import { ArmorAxisBEngine } from "/systems/foundryvtt-swse/scripts/engine/suggestion/equipment/scoring/armor-axis-b-engine.js";
import { ArmorRoleAlignmentEngine } from "/systems/foundryvtt-swse/scripts/engine/suggestion/equipment/scoring/armor-role-alignment-engine.js";
import { ArmorExplainabilityGenerator } from "/systems/foundryvtt-swse/scripts/engine/suggestion/equipment/scoring/armor-explainability-generator.js";
import { evaluateArmorBenefit } from "/systems/foundryvtt-swse/scripts/engine/suggestion/equipment/scoring/armor-benefit-simulator.js";
import { actorHasArmorProficiencyForType, resolveArmorData } from "/systems/foundryvtt-swse/scripts/items/armor-data-resolver.js";
import { scoreStoreItemContextFit } from "/systems/foundryvtt-swse/scripts/engine/suggestion/equipment/store-suggestion-context.js";
import { assignTier, clampScore } from "/systems/foundryvtt-swse/scripts/engine/suggestion/equipment/shared-scoring-utils.js";

export class ArmorScoringEngine {
  /**
   * Score a single armor piece in character context
   * @param {Object} armor - The armor item
   * @param {Object} character - The character actor
   * @param {Object} options - Scoring options
   * @returns {Object} Scoring result with axes, score, and explanations
   */
  static scoreArmor(armor, character, options = {}) {
    try {
      // Validate inputs
      if (!armor || !armor.system) {
        return this._invalidScore('Armor data missing');
      }

      if (!character || !character.system) {
        return this._invalidScore('Character data missing');
      }

      // Extract character context
      const charContext = this._extractCharacterContext(character);

      // Base Relevance (gatekeeper)
      const baseRelevance = this._scoreBaseRelevance(armor, charContext);

      // Score Axis A: Survivability Gain
      const axisA = ArmorAxisAEngine.computeSurvivabilityAxis(armor, charContext);

      // Score Axis B: Mobility & Skill Cost
      const axisB = ArmorAxisBEngine.computeMobilityCostAxis(armor, charContext);

      // Score Role Alignment (most important)
      const roleAlignment = ArmorRoleAlignmentEngine.computeRoleAlignment(armor, charContext);

      // Category Normalization (light touch)
      const categoryNorm = this._scoreCategoryNormalization(armor, charContext);

      // Price Bias (minor)
      const priceBias = this._scorePriceBias(armor);

      // Practical armor benefit simulation: net Reflex/Fortitude change,
      // max-Dex cost, proficiency-gated armor check penalty, and value vs peers.
      const armorBenefit = evaluateArmorBenefit(armor, character, options);

      // Sum components (additive, not multiplicative)
      let finalScore = baseRelevance +
        roleAlignment +
        axisA.score +
        axisB.score +
        categoryNorm +
        priceBias +
        (armorBenefit?.scoreAdjustment || 0);

      const storeContextFit = options.storeContext ? scoreStoreItemContextFit(armor, options.storeContext, options) : null;
      if (storeContextFit) finalScore += storeContextFit.cappedAdjustment;

      // NaN protection
      if (!Number.isFinite(finalScore)) finalScore = 0;

      // Clamp to 0-100
      finalScore = clampScore(finalScore, 0, 100);

      // Assign tier (canonical)
      const tier = assignTier(finalScore);

      // Generate explanations
      const explanations = ArmorExplainabilityGenerator.generateExplanations(
        armor,
        charContext,
        axisA,
        axisB,
        roleAlignment,
        finalScore,
        { ...options, armorBenefit }
      );
      if (storeContextFit?.explanations?.length) {
        explanations.push(...storeContextFit.explanations);
      }

      const result = {
        armorId: armor.id,
        armorName: armor.name,
        armorType: armor.type,

        // Component breakdown
        components: {
          baseRelevance,
          roleAlignment,
          axisA: axisA.score,
          axisB: axisB.score,
          categoryNorm,
          priceBias,
          armorBenefit: armorBenefit?.scoreAdjustment || 0,
          storeContextFit: storeContextFit?.cappedAdjustment || 0
        },

        // Axis details
        axisA: {
          label: 'Survivability Gain',
          score: axisA.score,
          band: axisA.band,
          withTalents: axisA.withTalents,
          details: axisA
        },

        axisB: {
          label: 'Mobility & Skill Cost',
          score: axisB.score,
          category: axisB.category,
          withArmorMastery: axisB.withArmorMastery,
          details: axisB
        },

        // Combined evaluation
        combined: {
          finalScore,
          tier,
          categoryNorm
        },

        // Practical wear simulation
        armorBenefit,

        // Explainability
        explanations,

        // Metadata
        storeContextFit,

        meta: {
          computedAt: Date.now(),
          engineVersion: '1.0.0',
          characterLevel: charContext.level,
          characterRole: charContext.primaryRole,
          talentsPresent: charContext.talents
        }
      };

      if (!options?.silent && !options?.suppressLogs) {
        SWSELogger.log(`[ArmorScoringEngine] Scored ${armor.name}`, {
          axisAScore: axisA.score.toFixed(2),
          axisBScore: axisB.score.toFixed(2),
          roleAlignment: roleAlignment.toFixed(2),
          finalScore: finalScore.toFixed(2),
          armorBenefit: armorBenefit?.scoreAdjustment?.toFixed?.(2) ?? 0,
          tier
        });
      }

      return result;
    } catch (err) {
      SWSELogger.error('[ArmorScoringEngine] Scoring failed:', err);
      return this._invalidScore(err.message);
    }
  }

  /**
   * Score multiple armor options and rank them
   * @param {Array} armorOptions - Array of armor items (include "no armor" as option)
   * @param {Object} character - The character actor
   * @param {Object} options - Scoring options
   * @returns {Array} Sorted array of scored armor options
   */
  static scoreArmorOptions(armorOptions, character, options = {}) {
    const scored = armorOptions
      .map(armor => this.scoreArmor(armor, character, options))
      .filter(result => result.combined); // Filter out invalid scores

    // Sort by final score (descending)
    scored.sort((a, b) => b.combined.finalScore - a.combined.finalScore);

    return scored;
  }

  /**
   * Score Base Relevance (gatekeeper: 8-14 points)
   * @private
   */
  static _scoreBaseRelevance(armor, charContext) {
    let score = 8; // Minimum base

    // Proficiency check
    const armorStats = resolveArmorData(armor);
    const category = armorStats.isEnergyShield ? 'shield' : (armorStats.armorType || 'light');
    const { proficiencies } = charContext;

    if (category === 'shield') {
      score += 2;
    } else if (category === 'light' && proficiencies.light) {
      score += 4;
    } else if (category === 'medium' && proficiencies.medium) {
      score += 4;
    } else if (category === 'heavy' && proficiencies.heavy) {
      score += 4;
    } else if (category === 'light') {
      // Not proficient but can use light
      score += 2;
    } else {
      // Heavy or specialized, not proficient
      score += 0;
    }

    // Role alignment signal (early check)
    if (charContext.primaryRole?.includes('defender') || charContext.primaryRole?.includes('tank')) {
      score += 2; // Armor is relevant to role
    }

    return Math.min(14, score);
  }

  /**
   * Score Category Normalization (-4 to +3 points)
   * Light touch: suppress overpriced/strictly inferior armor
   * @private
   */
  static _scoreCategoryNormalization(armor, charContext) {
    // Placeholder: compare within armor category
    // For now, neutral adjustment
    return 0;
  }

  /**
   * Score Price Bias (-6 to +4 points, minor)
   * @private
   */
  static _scorePriceBias(armor) {
    const armorStats = resolveArmorData(armor);
    const price = armor.finalCost || armorStats.cost || armor.system?.cost || armor.system?.price || armor.system?.value || 0;

    if (price < 100) {
      return 2; // Cheap
    } else if (price < 500) {
      return 0; // Standard
    } else if (price < 1000) {
      return -2; // Expensive
    } else {
      return -4; // Very expensive
    }
  }


  /**
   * Extract character context needed for armor scoring
   * @private
   */
  static _extractCharacterContext(character) {
    const system = character.system || {};
    const abilities = system.abilities || {};
    const attributes = system.attributes || {};
    const abilityMod = (key) => {
      const attr = attributes?.[key];
      const ability = abilities?.[key];
      const direct = attr?.mod ?? attr?.modifier ?? attr?.totalMod ?? ability?.mod ?? ability?.modifier;
      if (Number.isFinite(Number(direct))) return Number(direct);
      const score = attr?.total ?? attr?.value ?? ability?.value;
      if (Number.isFinite(Number(score))) return Math.floor((Number(score) - 10) / 2);
      return 0;
    };

    return {
      characterId: character.id,
      characterName: character.name,

      // Attributes
      attributes: {
        str: abilityMod('str'),
        dex: abilityMod('dex'),
        con: abilityMod('con')
      },

      // Proficiencies
      proficiencies: {
        light: actorHasArmorProficiencyForType(character, 'light'),
        medium: actorHasArmorProficiencyForType(character, 'medium'),
        heavy: actorHasArmorProficiencyForType(character, 'heavy')
      },

      // Armor talents (critical for evaluation)
      talents: {
        armoredDefense: this._hasTalent(character, 'armored-defense'),
        improvedArmoredDefense: this._hasTalent(character, 'improved-armored-defense'),
        armorMastery: this._hasTalent(character, 'armor-mastery')
      },

      // Current equipment state
      currentArmor: system.armor?.equipped || null,
      armorCategory: this._getArmorCategory(system.armor),

      // Combat context
      primaryRole: this._inferPrimaryRole(character),
      combatRoles: this._inferCombatRoles(character),
      playstyleHints: this._inferPlaystyle(character),

      // Level
      level: system.level?.value ?? 1,
      heroicLevelBonus: (system.level?.value ?? 1)
    };
  }

  /**
   * Check if character has a talent
   * @private
   */
  static _hasTalent(character, talentName) {
    const normalize = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    const wanted = normalize(talentName);
    const talents = character.items?.filter(i => i.type === 'talent') || [];
    return talents.some(t => normalize(t.name).includes(wanted));
  }

  /**
   * Get armor category
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
   * Infer primary role
   * @private
   */
  static _inferPrimaryRole(character) {
    const className = character.system?.class?.name || '';

    if (className.includes('Soldier')) return 'defender';
    if (className.includes('Scout')) return 'striker';
    if (className.includes('Scoundrel')) return 'striker';
    if (className.includes('Jedi')) return 'generalist';

    return 'generalist';
  }

  /**
   * Infer combat roles
   * @private
   */
  static _inferCombatRoles(character) {
    const roles = new Set();
    const primary = this._inferPrimaryRole(character);
    roles.add(primary);

    return Array.from(roles);
  }

  /**
   * Infer playstyle
   * @private
   */
  static _inferPlaystyle(character) {
    const hints = new Set();
    const readMod = (key) => {
      const system = character.system || {};
      const attr = system.attributes?.[key];
      const ability = system.abilities?.[key];
      const direct = attr?.mod ?? attr?.modifier ?? attr?.totalMod ?? ability?.mod ?? ability?.modifier;
      if (Number.isFinite(Number(direct))) return Number(direct);
      const score = attr?.total ?? attr?.value ?? ability?.value;
      if (Number.isFinite(Number(score))) return Math.floor((Number(score) - 10) / 2);
      return 0;
    };
    const dex = readMod('dex');
    const str = readMod('str');

    if (dex > str + 1) {
      hints.add('mobile');
    } else if (str > dex + 1) {
      hints.add('stationary');
    }

    return Array.from(hints);
  }

  /**
   * Return standardized invalid score
   * @private
   */
  static _invalidScore(reason) {
    return {
      valid: false,
      reason,
      combined: { finalScore: 0, tier: 'invalid' },
      explanations: [`Error: ${reason}`],
      meta: { computedAt: Date.now(), engineVersion: '1.0.0' }
    };
  }
}

export default ArmorScoringEngine;
