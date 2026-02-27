/**
 * ModifierDomainResolver
 *
 * Orchestrates modifier resolution across multiple domains.
 * Provides complete modifier context for attacks, defenses, skills, etc.
 *
 * Owns:
 * - Multi-domain modifier orchestration
 * - Context-aware modifier selection
 * - Modifier interaction resolution
 *
 * Delegates to: ModifierEngineExtensions (domain lookup)
 * Never owns: Direct state writes, mutations
 *
 * Contract:
 * - Returns modifier resolution context, not mutations
 * - No direct actor.system writes
 */

import { swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { ModifierEngineExtensions, MODIFIER_DOMAINS } from "/systems/foundryvtt-swse/scripts/engine/effects/modifiers/ModifierEngineExtensions.js";

export class ModifierDomainResolver {
  /**
   * Resolve complete modifier context for an attack.
   *
   * Gathers:
   * - Attack roll bonuses
   * - Damage bonuses
   * - Relevant penalties (condition, encumbrance, fatigue)
   * - All modifier sources
   *
   * @param {Actor} attacker - Attacking actor
   * @param {Object} options - Attack context
   * @returns {Promise<Object>} Complete attack modifier context
   */
  static async resolveAttackModifiers(attacker, options = {}) {
    try {
      swseLogger.debug(`[ModifierDomainResolver] Resolving attack modifiers for ${attacker?.name ?? 'unknown'}`, {
        options
      });

      if (!attacker) {
        throw new Error('resolveAttackModifiers() requires attacker');
      }

      // Get attack-related domain modifiers
      const attackBonus = await ModifierEngineExtensions.getModifiersForDomain(attacker, 'attack');
      const damageBonus = await ModifierEngineExtensions.getModifiersForDomain(attacker, 'damage');
      const initiativeBonus = await ModifierEngineExtensions.getModifiersForDomain(attacker, 'initiative');

      // Get penalties
      const conditionPenalty = await ModifierEngineExtensions.getPenaltyForCategory(attacker, 'condition');
      const encumbrancePenalty = await ModifierEngineExtensions.getPenaltyForCategory(attacker, 'encumbrance');
      const fatiguePenalty = await ModifierEngineExtensions.getPenaltyForCategory(attacker, 'fatigue');

      // Calculate net modifiers
      const netAttackBonus = attackBonus.total + conditionPenalty.total + encumbrancePenalty.total + fatiguePenalty.total;
      const netDamageBonus = damageBonus.total;

      swseLogger.log(`[ModifierDomainResolver] Attack modifiers resolved`, {
        actor: attacker.name,
        attackBonus: attackBonus.total,
        damageBonus: damageBonus.total,
        penalties: conditionPenalty.total + encumbrancePenalty.total + fatiguePenalty.total,
        netAttack: netAttackBonus,
        netDamage: netDamageBonus
      });

      return {
        actor: attacker.name,
        attack: {
          bonus: attackBonus.total,
          modifiers: attackBonus.breakdown,
          penalties: [
            ...(conditionPenalty.breakdown || []),
            ...(encumbrancePenalty.breakdown || []),
            ...(fatiguePenalty.breakdown || [])
          ],
          net: netAttackBonus
        },
        damage: {
          bonus: damageBonus.total,
          modifiers: damageBonus.breakdown,
          net: netDamageBonus
        },
        initiative: {
          bonus: initiativeBonus.total,
          modifiers: initiativeBonus.breakdown
        },
        summary: {
          attackRoll: netAttackBonus,
          damageRoll: netDamageBonus,
          initiativeRoll: initiativeBonus.total
        }
      };

    } catch (err) {
      swseLogger.error(`[ModifierDomainResolver] resolveAttackModifiers failed for ${attacker?.name ?? 'unknown'}`, {
        error: err
      });

      return {
        error: err.message,
        summary: { attackRoll: 0, damageRoll: 0, initiativeRoll: 0 }
      };
    }
  }

  /**
   * Resolve complete modifier context for a skill check.
   *
   * Gathers:
   * - Skill bonuses
   * - Ability modifier
   * - All relevant penalties
   * - Armor check penalties
   *
   * @param {Actor} actor - Actor making skill check
   * @param {string} skillKey - Skill key (e.g., 'acrobatics')
   * @param {Object} options - Context
   * @returns {Promise<Object>} Complete skill modifier context
   */
  static async resolveSkillModifiers(actor, skillKey, options = {}) {
    try {
      swseLogger.debug(`[ModifierDomainResolver] Resolving skill modifiers for ${actor?.name ?? 'unknown'}`, {
        skill: skillKey,
        options
      });

      if (!actor) {
        throw new Error('resolveSkillModifiers() requires actor');
      }

      // Get skill domain bonus
      const skillBonus = await ModifierEngineExtensions.getModifiersForDomain(actor, 'skill');

      // Get penalties
      const conditionPenalty = await ModifierEngineExtensions.getPenaltyForCategory(actor, 'condition');
      const encumbrancePenalty = await ModifierEngineExtensions.getPenaltyForCategory(actor, 'encumbrance');
      const fatiguePenalty = await ModifierEngineExtensions.getPenaltyForCategory(actor, 'fatigue');

      // Get ability modifier (if applicable)
      const skillData = actor.system.skills?.[skillKey];
      const abilityMod = skillData?.ability_mod ?? 0;

      // Calculate net modifier
      const netBonus = abilityMod + skillBonus.total + conditionPenalty.total + encumbrancePenalty.total + fatiguePenalty.total;

      swseLogger.log(`[ModifierDomainResolver] Skill modifiers resolved`, {
        actor: actor.name,
        skill: skillKey,
        abilityMod,
        skillBonus: skillBonus.total,
        penalties: conditionPenalty.total + encumbrancePenalty.total + fatiguePenalty.total,
        net: netBonus
      });

      return {
        actor: actor.name,
        skill: skillKey,
        ability: {
          modifier: abilityMod,
          description: 'Ability modifier for this skill'
        },
        skillBonus: {
          bonus: skillBonus.total,
          modifiers: skillBonus.breakdown,
          bonusCap: skillBonus.bonusCap
        },
        penalties: {
          condition: conditionPenalty.breakdown,
          encumbrance: encumbrancePenalty.breakdown,
          fatigue: fatiguePenalty.breakdown,
          total: conditionPenalty.total + encumbrancePenalty.total + fatiguePenalty.total
        },
        summary: {
          abilityMod,
          skillBonus: skillBonus.total,
          penalties: conditionPenalty.total + encumbrancePenalty.total + fatiguePenalty.total,
          net: netBonus
        }
      };

    } catch (err) {
      swseLogger.error(`[ModifierDomainResolver] resolveSkillModifiers failed for ${actor?.name ?? 'unknown'}`, {
        error: err,
        skill: skillKey
      });

      return {
        error: err.message,
        skill: skillKey,
        summary: { net: 0 }
      };
    }
  }

  /**
   * Resolve complete modifier context for a defense.
   *
   * Gathers:
   * - Defense bonuses
   * - Armor class bonuses
   * - Cover bonuses
   * - Shield bonuses
   * - Relevant penalties
   *
   * @param {Actor} actor - Actor defending
   * @param {string} defenseType - Defense type (fortitude, reflex, will)
   * @param {Object} options - Context
   * @returns {Promise<Object>} Complete defense modifier context
   */
  static async resolveDefenseModifiers(actor, defenseType, options = {}) {
    try {
      swseLogger.debug(`[ModifierDomainResolver] Resolving defense modifiers for ${actor?.name ?? 'unknown'}`, {
        defense: defenseType,
        options
      });

      if (!actor) {
        throw new Error('resolveDefenseModifiers() requires actor');
      }

      // Get defense domain bonus
      const domainKey = `defense.${defenseType}`;
      const defenseBonus = await ModifierEngineExtensions.getModifiersForDomain(actor, domainKey);

      // Get penalties
      const conditionPenalty = await ModifierEngineExtensions.getPenaltyForCategory(actor, 'condition');

      // Get base defense from actor
      const baseDefense = actor.system.derived?.defenses?.[defenseType]?.base ?? 10;

      // Calculate final defense
      const netDefense = baseDefense + defenseBonus.total + conditionPenalty.total;

      swseLogger.log(`[ModifierDomainResolver] Defense modifiers resolved`, {
        actor: actor.name,
        defense: defenseType,
        baseDefense,
        defenseBonus: defenseBonus.total,
        penalties: conditionPenalty.total,
        net: netDefense
      });

      return {
        actor: actor.name,
        defense: defenseType,
        base: {
          value: baseDefense,
          description: `Base ${defenseType} defense`
        },
        bonuses: {
          total: defenseBonus.total,
          modifiers: defenseBonus.breakdown,
          stackingRule: defenseBonus.stackingRule
        },
        penalties: {
          condition: conditionPenalty.breakdown,
          total: conditionPenalty.total
        },
        summary: {
          base: baseDefense,
          bonuses: defenseBonus.total,
          penalties: conditionPenalty.total,
          net: netDefense
        }
      };

    } catch (err) {
      swseLogger.error(`[ModifierDomainResolver] resolveDefenseModifiers failed for ${actor?.name ?? 'unknown'}`, {
        error: err,
        defense: defenseType
      });

      return {
        error: err.message,
        defense: defenseType,
        summary: { net: 10 } // Default defense if calculation fails
      };
    }
  }

  /**
   * Build comprehensive modifier summary for entire actor.
   *
   * Includes all domains with their bonuses and relevant penalties.
   * Useful for character sheets, status displays, etc.
   *
   * @param {Actor} actor - Target actor
   * @returns {Promise<Object>} Complete modifier audit
   */
  static async buildCompleteModifierAudit(actor) {
    try {
      swseLogger.debug(`[ModifierDomainResolver] Building complete modifier audit for ${actor?.name ?? 'unknown'}`);

      if (!actor) {
        throw new Error('buildCompleteModifierAudit() requires actor');
      }

      // Get all domain modifiers
      const allDomainModifiers = await ModifierEngineExtensions.getAllDomainModifiers(actor);

      // Get all penalties
      const conditionPenalty = await ModifierEngineExtensions.getPenaltyForCategory(actor, 'condition');
      const encumbrancePenalty = await ModifierEngineExtensions.getPenaltyForCategory(actor, 'encumbrance');
      const woundPenalty = await ModifierEngineExtensions.getPenaltyForCategory(actor, 'wound');
      const fatiguePenalty = await ModifierEngineExtensions.getPenaltyForCategory(actor, 'fatigue');

      const audit = {
        actor: actor.name,
        timestamp: new Date().toISOString(),
        domains: allDomainModifiers,
        penalties: {
          condition: conditionPenalty,
          encumbrance: encumbrancePenalty,
          wound: woundPenalty,
          fatigue: fatiguePenalty
        },
        summary: {
          domainCount: Object.keys(allDomainModifiers).length,
          totalBonuses: Object.values(allDomainModifiers).reduce((sum, d) => sum + (d.total ?? 0), 0),
          totalPenalties: conditionPenalty.total + encumbrancePenalty.total + woundPenalty.total + fatiguePenalty.total,
          affectedDomains: Object.keys(allDomainModifiers).filter(d => allDomainModifiers[d].total !== 0)
        }
      };

      swseLogger.log(`[ModifierDomainResolver] Modifier audit complete`, {
        actor: actor.name,
        domainsWithModifiers: audit.summary.domainCount,
        totalBonuses: audit.summary.totalBonuses,
        totalPenalties: audit.summary.totalPenalties
      });

      return audit;

    } catch (err) {
      swseLogger.error(`[ModifierDomainResolver] buildCompleteModifierAudit failed for ${actor?.name ?? 'unknown'}`, {
        error: err
      });

      return {
        error: err.message,
        actor: actor?.name ?? 'unknown',
        summary: { domainCount: 0, totalBonuses: 0, totalPenalties: 0 }
      };
    }
  }
}
