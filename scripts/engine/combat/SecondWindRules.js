/**
 * SecondWindRules
 *
 * Pure calculation helpers for Second Wind mechanics.
 * No actor mutations, no ActorEngine imports, no side effects.
 * All methods accept plain values (or read-only actor for data access)
 * and return plain values. ActorEngine owns all write authority.
 */

import { HouseRuleService } from "/systems/foundryvtt-swse/scripts/engine/system/HouseRuleService.js";
import { ConditionTrackRules } from "/systems/foundryvtt-swse/scripts/engine/combat/ConditionTrackRules.js";
import { SchemaAdapters } from "/systems/foundryvtt-swse/scripts/utils/schema-adapters.js";

export class SecondWindRules {
  /**
   * Determine whether an actor is eligible to use Second Wind right now.
   * Returns { allowed: bool, reason: string }.
   * Does NOT check uses remaining — that is a separate concern.
   *
   * @param {Actor} actor - read-only actor reference
   * @param {Object} [options={}] - optional flags (validateCombat)
   * @param {Object} featRules - result of MetaResourceFeatResolver.getSecondWindRules(actor)
   * @returns {{ allowed: boolean, reason: string }}
   */
  static canUseSecondWind(actor, options = {}, featRules) {
    const heroicLevel = Number(actor.system?.heroicLevel ?? actor.system?.level ?? 0);
    const isHeroic = actor.type === 'character' || heroicLevel > 0;
    const canNonHeroicSecondWind = featRules.extraUseMultiplier > 0;

    if (!isHeroic && !canNonHeroicSecondWind) {
      return { allowed: false, reason: `${actor.name} is not eligible to use Second Wind` };
    }

    const currentHP = SchemaAdapters.getHP(actor);
    const maxHP = SchemaAdapters.getMaxHP(actor);
    if (currentHP > Math.floor(maxHP / 2) && !featRules.allowAboveHalfHp) {
      return { allowed: false, reason: 'Second Wind may only be used at half Hit Points or lower' };
    }

    const activeCombatId = game.combat?.started ? game.combat.id : null;
    const encounterFlag = actor.getFlag?.('foundryvtt-swse', 'secondWindEncounterUsed') ?? null;
    if (activeCombatId && encounterFlag === activeCombatId && !featRules.ignoreEncounterCap) {
      return { allowed: false, reason: 'Second Wind can only be used once per encounter' };
    }

    if (options.validateCombat !== false) {
      const inCombat = game.combat?.combatants.some(c => c.actor?.id === actor.id);
      if (inCombat) {
        const combatant = game.combat.combatants.find(c => c.actor?.id === actor.id);
        if (!featRules.freeAction && !combatant?.resources?.swift) {
          return { allowed: false, reason: 'Cannot use Second Wind: no swift action available' };
        }
      }
    }

    return { allowed: true, reason: '' };
  }

  /**
   * Calculate the HP healed by catching a Second Wind.
   * RAW: max(floor(maxHP / 4), conScore).
   *
   * @param {number} maxHP - actor's maximum hit points
   * @param {number} conScore - actor's Constitution score (0 for droids)
   * @returns {number}
   */
  static calculateHealingAmount(maxHP, conScore) {
    return Math.max(Math.floor(maxHP / 4), conScore);
  }

  /**
   * Calculate the maximum number of Second Wind uses per day/encounter.
   * Respects the secondWindWebEnhancement houserule and feat multipliers.
   *
   * @param {number} conMod - Constitution modifier (0 for droids)
   * @param {number} fortClassBonus - class bonus to Fortitude Defense
   * @param {Object} featRules - result of MetaResourceFeatResolver.getSecondWindRules(actor)
   * @param {boolean} hasToughAsNails - whether actor has the Tough as Nails talent
   * @returns {number}
   */
  static calculateMaxUses(conMod, fortClassBonus, featRules, hasToughAsNails) {
    const baseDailyUses = HouseRuleService.isEnabled('secondWindWebEnhancement')
      ? Math.max(1, 1 + fortClassBonus + conMod)
      : 1;
    const extraUseMultiplier = Number(featRules.extraUseMultiplier || 0) + (hasToughAsNails ? 1 : 0);
    return Math.max(1, baseDailyUses + (baseDailyUses * extraUseMultiplier));
  }

  /**
   * Calculate the number of condition track steps recovered when catching a Second Wind.
   * Combines the improved-second-wind houserule (+1) and any feat-granted steps.
   *
   * @param {Object} featRules - result of MetaResourceFeatResolver.getSecondWindRules(actor)
   * @param {boolean} [improvedHouseRule] - whether the secondWindImproved houserule is active
   * @returns {number} total steps to move up the condition track (0 = no recovery)
   */
  static calculateConditionRecovery(featRules, improvedHouseRule) {
    const houseRuleSteps = improvedHouseRule ? 1 : 0;
    const featSteps = Math.max(0, Number(featRules.conditionRecoverySteps || 0));
    return houseRuleSteps + featSteps;
  }

  /**
   * Determine whether an actor may use the Edge of Exhaustion variant rule
   * (trade a condition step for 1 Second Wind use).
   * Returns { allowed: bool, reason: string }.
   *
   * @param {Actor} actor - read-only actor reference
   * @returns {{ allowed: boolean, reason: string }}
   */
  static canUseEdgeOfExhaustion(actor) {
    const uses = actor.system.secondWind?.uses ?? 0;
    if (uses > 0) {
      return { allowed: false, reason: 'Second Wind uses still available (not at edge of exhaustion)' };
    }

    const isHeroic = actor.type === 'character' ||
                     (actor.type === 'npc' && actor.system.class);
    if (!isHeroic) {
      return { allowed: false, reason: `${actor.name} is not heroic and cannot use Edge of Exhaustion` };
    }

    const inCombat = game.combat?.combatants.some(c => c.actor?.id === actor.id);
    if (!inCombat) {
      return { allowed: false, reason: 'Edge of Exhaustion can only be used in active combat' };
    }

    const currentCT = Number(actor.system.conditionTrack?.current ?? 0);
    const conditionStepCap = ConditionTrackRules.getConditionStepCap();
    if (currentCT >= conditionStepCap) {
      return { allowed: false, reason: 'Cannot accept condition penalty when already at helpless' };
    }

    return { allowed: true, reason: '' };
  }
}
