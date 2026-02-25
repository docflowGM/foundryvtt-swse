/**
 * StructuredRuleEvaluator.js
 *
 * Evaluates structured rule elements from species, talents, feats, and class features.
 * Converts rule elements to canonical Modifier objects.
 *
 * Rule elements follow the unified schema:
 * - Deterministic activation conditions (skillTrained, levelReached, etc.)
 * - Canonical skill IDs and feat IDs
 * - Explicit bonus types for stacking rules
 * - Optional context conditions for conditional modifiers
 */

import { ModifierType, ModifierSource, createModifier } from './ModifierTypes.js';
import { swseLogger } from '../../../utils/logger.js';

export class StructuredRuleEvaluator {
  /**
   * Evaluate all structured rules from species traits and convert to modifiers
   * @param {Actor} actor - The actor to evaluate rules for
   * @param {Array} speciesTraits - Array of species traits (structuralTraits, bonusFeats, conditionalTraits)
   * @param {string} speciesName - Name of the species for provenance
   * @returns {Modifier[]} Array of modifiers from rule evaluation
   */
  static evaluateSpeciesRules(actor, speciesTraits, speciesName) {
    if (!speciesTraits || !Array.isArray(speciesTraits)) {
      return [];
    }

    const modifiers = [];

    for (const trait of speciesTraits) {
      if (!trait.rules || !Array.isArray(trait.rules)) {
        continue;
      }

      for (const rule of trait.rules) {
        try {
          // Check if rule's activation condition is met
          if (!this._checkActivationCondition(rule.when, actor)) {
            continue;
          }

          // Convert rule to modifiers based on type
          const ruleModifiers = this._ruleToModifiers(rule, actor, speciesName, trait.id);
          modifiers.push(...ruleModifiers);
        } catch (err) {
          swseLogger.warn(
            `[StructuredRuleEvaluator] Error evaluating rule in trait ${trait.id}:`,
            err
          );
        }
      }
    }

    return modifiers;
  }

  /**
   * Convert a single rule element to modifier(s)
   * @private
   * @param {RuleElement} rule
   * @param {Actor} actor
   * @param {string} speciesName
   * @param {string} traitId - Parent trait ID for tracking
   * @returns {Modifier[]}
   */
  static _ruleToModifiers(rule, actor, speciesName, traitId) {
    const modifiers = [];
    const baseSourceId = `species.${speciesName}.${traitId}`;

    switch (rule.type) {
      case 'skillModifier':
        modifiers.push(
          ...this._evaluateSkillModifierRule(rule, baseSourceId, speciesName)
        );
        break;

      case 'defenseModifier':
        modifiers.push(
          ...this._evaluateDefenseModifierRule(rule, baseSourceId, speciesName)
        );
        break;

      case 'damageModifier':
        modifiers.push(...this._evaluateDamageModifierRule(rule, baseSourceId, speciesName));
        break;

      case 'featGrant':
        // Feat grants are handled separately (not as modifiers)
        break;

      default:
        swseLogger.debug(`[StructuredRuleEvaluator] Unknown rule type: ${rule.type}`);
    }

    return modifiers;
  }

  /**
   * Evaluate skillModifier rule
   * @private
   */
  static _evaluateSkillModifierRule(rule, sourceId, speciesName) {
    const modifiers = [];

    if (!rule.skillId || typeof rule.value !== 'number') {
      return modifiers;
    }

    // Determine modifier type from bonusType
    const modifierType = this._mapBonusTypeToModifierType(rule.bonusType);

    // Create base modifier
    const modifier = createModifier({
      source: ModifierSource.SPECIES,
      sourceId: sourceId,
      sourceName: `${speciesName} (Species)`,
      target: `skill.${rule.skillId}`,
      type: modifierType,
      value: rule.value,
      enabled: true,
      description: `${speciesName} skill modifier`,
      priority: 50
    });

    modifiers.push(modifier);

    // If there's a context condition, create additional metadata
    if (rule.context) {
      modifier.context = rule.context;
      modifier.description = `${speciesName} skill modifier (${rule.context.description || rule.context.type})`;
    }

    return modifiers;
  }

  /**
   * Evaluate defenseModifier rule
   * @private
   */
  static _evaluateDefenseModifierRule(rule, sourceId, speciesName) {
    const modifiers = [];

    if (!rule.defense || typeof rule.value !== 'number') {
      return modifiers;
    }

    // Normalize defense name
    const defenseKey = rule.defense.toLowerCase();
    const validDefenses = ['fortitude', 'reflex', 'will'];

    if (!validDefenses.includes(defenseKey)) {
      swseLogger.warn(`[StructuredRuleEvaluator] Invalid defense: ${rule.defense}`);
      return modifiers;
    }

    const modifierType = this._mapBonusTypeToModifierType(rule.bonusType);

    const modifier = createModifier({
      source: ModifierSource.SPECIES,
      sourceId: sourceId,
      sourceName: `${speciesName} (Species)`,
      target: `defense.${defenseKey}`,
      type: modifierType,
      value: rule.value,
      enabled: true,
      description: `${speciesName} defense modifier`,
      priority: 50
    });

    modifiers.push(modifier);
    return modifiers;
  }

  /**
   * Evaluate damageModifier rule
   * @private
   */
  static _evaluateDamageModifierRule(rule, sourceId, speciesName) {
    const modifiers = [];

    if (typeof rule.value !== 'number') {
      return modifiers;
    }

    // attackType: melee, ranged, unarmed, natural-weapon, all
    // target: attackRoll, damageRoll, both

    const modifierType = this._mapBonusTypeToModifierType(rule.bonusType);

    // For now, create modifiers for both attack and damage if target is 'both'
    // In the future, this can be more granular

    if (rule.target === 'attackRoll' || rule.target === 'both') {
      if (rule.attackType === 'melee' || rule.attackType === 'all') {
        modifiers.push(
          createModifier({
            source: ModifierSource.SPECIES,
            sourceId: sourceId,
            sourceName: `${speciesName} (Species)`,
            target: 'global.attack', // Placeholder - may need refinement
            type: modifierType,
            value: rule.value,
            enabled: true,
            description: `${speciesName} ${rule.attackType} attack modifier`,
            priority: 50
          })
        );
      }
    }

    if (rule.target === 'damageRoll' || rule.target === 'both') {
      if (rule.attackType === 'melee' || rule.attackType === 'all') {
        modifiers.push(
          createModifier({
            source: ModifierSource.SPECIES,
            sourceId: sourceId,
            sourceName: `${speciesName} (Species)`,
            target: 'global.damage', // Placeholder - may need refinement
            type: modifierType,
            value: rule.value,
            enabled: true,
            description: `${speciesName} ${rule.attackType} damage modifier`,
            priority: 50
          })
        );
      }
    }

    return modifiers;
  }

  /**
   * Check if an activation condition is met
   * @private
   * @param {ActivationCondition} condition
   * @param {Actor} actor
   * @returns {boolean}
   */
  static _checkActivationCondition(condition, actor) {
    if (!condition) {
      return true; // Always-on
    }

    if (condition.type === 'always') {
      return true;
    }

    if (condition.type === 'skillTrained') {
      return this._checkSkillTrained(actor, condition.skillId);
    }

    if (condition.type === 'skillUntrained') {
      return !this._checkSkillTrained(actor, condition.skillId);
    }

    if (condition.type === 'featOwned') {
      return this._checkFeatOwned(actor, condition.featId);
    }

    if (condition.type === 'levelReached') {
      const level = actor.system?.level || 1;
      return level >= condition.minLevel;
    }

    if (condition.type === 'OR') {
      return condition.conditions.some(c => this._checkActivationCondition(c, actor));
    }

    if (condition.type === 'AND') {
      return condition.conditions.every(c => this._checkActivationCondition(c, actor));
    }

    return false;
  }

  /**
   * Check if actor has a skill trained
   * @private
   */
  static _checkSkillTrained(actor, skillId) {
    if (!actor?.system?.skills) {
      return false;
    }

    const skill = actor.system.skills[skillId];
    if (!skill) {
      return false;
    }

    // Check trained flag (varies by system, but typically 'trained' or 'rank' > 0)
    return skill.trained === true || skill.rank > 0;
  }

  /**
   * Check if actor owns a feat by canonical ID
   * @private
   */
  static _checkFeatOwned(actor, featId) {
    if (!actor?.items) {
      return false;
    }

    // Find feat with matching ID
    return actor.items.some(
      item =>
        item.type === 'feat' &&
        (item.system?.id === featId || item.name === featId || item.id === featId)
    );
  }

  /**
   * Map bonusType to ModifierType for stacking rules
   * @private
   */
  static _mapBonusTypeToModifierType(bonusType) {
    const typeMap = {
      species: ModifierType.UNTYPED, // Species bonuses stack per Saga rules
      insight: ModifierType.INSIGHT,
      morale: ModifierType.MORALE,
      competence: ModifierType.COMPETENCE,
      circumstance: ModifierType.CIRCUMSTANCE,
      force: ModifierType.ENHANCEMENT, // Temp: map Force to Enhancement
      synergy: ModifierType.INSIGHT // Temp: map Synergy to Insight
    };

    return typeMap[bonusType] || ModifierType.UNTYPED;
  }

  /**
   * Extract feat grants from structured rules
   * Returns array of feat IDs to grant
   * @param {Array} speciesTraits
   * @param {Actor} actor - Used to check activation conditions
   * @returns {Array} Array of feat IDs to grant
   */
  static extractFeatGrants(speciesTraits, actor) {
    const grants = [];

    if (!speciesTraits || !Array.isArray(speciesTraits)) {
      return grants;
    }

    for (const trait of speciesTraits) {
      if (!trait.rules || !Array.isArray(trait.rules)) {
        continue;
      }

      for (const rule of trait.rules) {
        if (rule.type !== 'featGrant') {
          continue;
        }

        // Check if activation condition is met
        if (!this._checkActivationCondition(rule.when, actor)) {
          continue;
        }

        if (rule.featId) {
          grants.push({
            featId: rule.featId,
            sourceId: trait.id,
            allowMultiple: rule.allowMultiple || false
          });
        }
      }
    }

    return grants;
  }

  /**
   * Extract natural weapon rules from structured rules
   * Returns array of natural weapon specifications to generate as embedded items
   * @param {Array} speciesTraits
   * @param {Actor} actor - Used to check activation conditions
   * @param {string} speciesId - For provenance tracking
   * @returns {Array} Array of natural weapon specs
   */
  static extractNaturalWeapons(speciesTraits, actor, speciesId) {
    const weapons = [];

    if (!speciesTraits || !Array.isArray(speciesTraits)) {
      return weapons;
    }

    for (const trait of speciesTraits) {
      if (!trait.rules || !Array.isArray(trait.rules)) {
        continue;
      }

      for (const rule of trait.rules) {
        if (rule.type !== 'naturalWeapon') {
          continue;
        }

        // Check if activation condition is met
        if (!this._checkActivationCondition(rule.when, actor)) {
          continue;
        }

        weapons.push({
          ruleId: rule.id,
          traitId: trait.id,
          speciesId: speciesId,
          name: rule.name || 'Natural Weapon',
          weaponCategory: rule.weaponCategory || 'melee',
          attackAbility: rule.attackAbility || 'str',
          damage: rule.damage || { formula: '1d4', damageType: 'slashing' },
          critical: rule.critical || { range: 20, multiplier: 2 },
          proficiency: rule.proficiency || { type: 'natural', isProficient: true },
          traits: rule.traits || {
            alwaysArmed: true,
            countsAsWeapon: true,
            finesse: false,
            light: false,
            twoHanded: false
          },
          scaling: rule.scaling || { bySize: false },
          generatedItemData: rule.generatedItemData || null
        });
      }
    }

    return weapons;
  }
}

export default StructuredRuleEvaluator;
