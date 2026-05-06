/**
 * Defense Calculator — Derived Layer (HARDENED)
 *
 * Calculates Fortitude, Reflex, and Will defense bonuses.
 * PHASE 4: Includes PASSIVE/STATE predicate evaluation
 *
 * Formula (SWSE):
 *   Defense = 10 + heroic level + class bonus + ability mod + [state modifiers]
 *
 * NONHEROIC:
 *   Only heroic levels contribute.
 *
 * DROID EXCEPTION:
 *   Fortitude = STR only
 */

import { swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { getHeroicLevel } from "/systems/foundryvtt-swse/scripts/actors/derived/level-split.js";
import { getClassData } from "/systems/foundryvtt-swse/scripts/engine/progression/utils/class-data-loader.js"; // STATIC import (no dynamic)
import { evaluateStatePredicates } from "/systems/foundryvtt-swse/scripts/engine/abilities/passive/passive-state.js";
import { getReflexSizeModifier } from "/systems/foundryvtt-swse/scripts/engine/combat/combat-stat-rules.js";

export class DefenseCalculator {

  /**
   * Calculate defense bonuses.
   * PHASE 4: Includes state-dependent modifiers
   *
   * @param {Actor} actor
   * @param {Array} classLevels
   * @param {Object} options
   * @param {Object} context - Optional context for state predicates (attackType, attacker, etc.)
   */
  static async calculate(actor, classLevels = [], options = {}, context = {}) {

    if (!actor?.system) {
      swseLogger.error('DefenseCalculator: Invalid actor provided');
      return this._emptyResult();
    }

    const heroicLevel = getHeroicLevel(actor) ?? 0;
    const safeClassLevels = Array.isArray(classLevels) ? classLevels : [];
    const defensesState = actor.system?.defenses ?? {};
    const abilitiesState = actor.system?.abilities ?? {};
    const isDroidActor = actor.type === 'droid' || actor.system?.isDroid === true;

    const [computedFortClassBonus, computedRefClassBonus, computedWillClassBonus] = await Promise.all([
      this._getSaveBonus(safeClassLevels, 'fort'),
      this._getSaveBonus(safeClassLevels, 'ref'),
      this._getSaveBonus(safeClassLevels, 'will')
    ]);

    const adjustments = options?.adjustments ?? {};
    const fortAdjust = Number(adjustments.fort ?? 0) || 0;
    const refAdjust = Number(adjustments.ref ?? 0) || 0;
    const willAdjust = Number(adjustments.will ?? 0) || 0;

    const fortStateBonus = await this._getStateModifiers(actor, 'fortitude', context);
    const refStateBonus = await this._getStateModifiers(actor, 'reflex', context);
    const willStateBonus = await this._getStateModifiers(actor, 'will', context);

    const equippedArmor = actor.items?.find(item => item.type === 'armor' && item.system?.equipped) ?? null;
    const hasArmoredDefense = actor.items?.some(item => item.name === 'Armored Defense') ?? false;
    const hasImprovedArmoredDefense = actor.items?.some(item => item.name === 'Improved Armored Defense') ?? false;

    const getAbilityMod = (abilityKey, fallback = 0) => {
      const key = String(abilityKey || '').toLowerCase();
      const derivedMod = actor.system?.derived?.attributes?.[key]?.mod;
      if (Number.isFinite(Number(derivedMod))) return Number(derivedMod);

      const ability = abilitiesState?.[key] ?? {};
      const total = Number(ability.total ?? ((ability.base ?? 10) + (ability.racial ?? 0) + (ability.enhancement ?? 0) + (ability.temp ?? 0)));
      if (!Number.isFinite(total)) return fallback;
      return Math.floor((total - 10) / 2);
    };

    const getMiscBonus = (defenseState) => {
      let total = 0;
      if (defenseState?.misc?.auto && typeof defenseState.misc.auto === 'object') {
        for (const value of Object.values(defenseState.misc.auto)) {
          total += Number(value || 0);
        }
      }
      total += Number(defenseState?.misc?.user?.extra ?? 0) || 0;
      return total;
    };

    const getConditionPenalty = () => {
      const derivedPenalty = actor.system?.derived?.damage?.conditionPenalty;
      if (Number.isFinite(Number(derivedPenalty))) return Number(derivedPenalty);
      const step = Number(actor.system?.conditionTrack?.current ?? 0) || 0;
      const penalties = [0, -1, -2, -5, -10, 0];
      return penalties[step] ?? 0;
    };

    const conditionPenalty = getConditionPenalty();
    const reflexSizeModifier = getReflexSizeModifier(actor);

    const reflexState = defensesState?.reflex ?? {};
    const fortitudeState = defensesState?.fortitude ?? {};
    const willState = defensesState?.will ?? {};

    const reflexAbilityKey = String(reflexState.ability || 'dex').toLowerCase();
    let reflexAbilityMod = getAbilityMod(reflexAbilityKey, 0);
    const reflexClassBonus = Number(reflexState.classBonus ?? computedRefClassBonus) || 0;
    const reflexMiscBonus = getMiscBonus(reflexState);
    const reflexArmorBonus = Number(reflexState.armor ?? equippedArmor?.system?.defenseBonus ?? equippedArmor?.system?.armorBonus ?? 0) || 0;
    if (equippedArmor) {
      const maxAbilityBonus = Number(equippedArmor.system?.maxDexBonus);
      if (Number.isFinite(maxAbilityBonus)) {
        reflexAbilityMod = Math.min(reflexAbilityMod, maxAbilityBonus);
      }
    }
    let reflexLevelTerm = heroicLevel;
    if (equippedArmor) {
      if (hasImprovedArmoredDefense) {
        reflexLevelTerm = Math.max(heroicLevel + Math.floor(reflexArmorBonus / 2), reflexArmorBonus);
      } else if (hasArmoredDefense) {
        reflexLevelTerm = Math.max(heroicLevel, reflexArmorBonus);
      } else {
        reflexLevelTerm = reflexArmorBonus;
      }
    }
    const reflexBase = 10 + reflexLevelTerm + reflexClassBonus + reflexSizeModifier;
    const reflexTotal = Math.max(1, reflexBase + reflexAbilityMod + reflexMiscBonus + refStateBonus + refAdjust + conditionPenalty);

    const fortDefaultAbility = isDroidActor ? 'str' : 'con';
    // SWSE RAW: nonliving targets without Constitution, including Droids, add STR to Fortitude.
    // Do not allow stale legacy data (system.defenses.fortitude.ability = 'con') to override this.
    const fortAbilityKey = isDroidActor ? 'str' : String(fortitudeState.ability || fortDefaultAbility).toLowerCase();
    const fortAbilityMod = getAbilityMod(fortAbilityKey, 0);
    const fortClassBonus = Number(fortitudeState.classBonus ?? computedFortClassBonus) || 0;
    const fortMiscBonus = getMiscBonus(fortitudeState);
    const fortArmorBonus = Number(equippedArmor?.system?.equipmentBonus ?? equippedArmor?.system?.fortBonus ?? 0) || 0;
    const fortBase = 10 + heroicLevel + fortClassBonus + fortAbilityMod + fortArmorBonus;
    const fortTotal = Math.max(1, fortBase + fortMiscBonus + fortStateBonus + fortAdjust + conditionPenalty);

    const willAbilityKey = String(willState.ability || 'wis').toLowerCase();
    const willAbilityMod = getAbilityMod(willAbilityKey, 0);
    const willClassBonus = Number(willState.classBonus ?? computedWillClassBonus) || 0;
    const willMiscBonus = getMiscBonus(willState);
    const willBase = 10 + heroicLevel + willClassBonus + willAbilityMod;
    const willTotal = Math.max(1, willBase + willMiscBonus + willStateBonus + willAdjust + conditionPenalty);

    const flatFootedBase = reflexBase;
    // Flat-footed removes a positive Dexterity bonus, but never removes a
    // Dexterity penalty. SWSE RAW: lose Dex bonus, not Dex penalty.
    const flatFootedTotal = Math.max(1, reflexTotal - Math.max(0, reflexAbilityMod));

    return {
      fortitude: {
        base: fortBase,
        total: fortTotal,
        adjustment: fortAdjust,
        stateBonus: fortStateBonus,
        classBonus: fortClassBonus,
        miscBonus: fortMiscBonus,
        armorBonus: fortArmorBonus,
        abilityKey: fortAbilityKey,
        abilityMod: fortAbilityMod,
        conditionPenalty
      },
      reflex: {
        base: reflexBase,
        total: reflexTotal,
        adjustment: refAdjust,
        stateBonus: refStateBonus,
        classBonus: reflexClassBonus,
        miscBonus: reflexMiscBonus,
        armorBonus: reflexArmorBonus,
        armorContribution: reflexLevelTerm,
        sizeModifier: reflexSizeModifier,
        abilityKey: reflexAbilityKey,
        abilityMod: reflexAbilityMod,
        conditionPenalty
      },
      will: {
        base: willBase,
        total: willTotal,
        adjustment: willAdjust,
        stateBonus: willStateBonus,
        classBonus: willClassBonus,
        miscBonus: willMiscBonus,
        armorBonus: 0,
        abilityKey: willAbilityKey,
        abilityMod: willAbilityMod,
        conditionPenalty
      },
      flatFooted: {
        base: flatFootedBase,
        total: flatFootedTotal,
        adjustment: refAdjust,
        stateBonus: refStateBonus,
        classBonus: reflexClassBonus,
        miscBonus: reflexMiscBonus,
        armorBonus: reflexArmorBonus,
        armorContribution: reflexLevelTerm,
        sizeModifier: reflexSizeModifier,
        abilityKey: reflexAbilityKey,
        abilityMod: 0,
        conditionPenalty
      }
    };
  }

  /**
   * Get state-dependent modifiers from PASSIVE/STATE abilities.
   * PHASE 4: Evaluates predicates and sums applicable modifiers.
   *
   * @param {Actor} actor
   * @param {string} defenseType - 'fortitude', 'reflex', or 'will'
   * @param {Object} context - Attack context with attackType, etc.
   * @returns {Promise<number>} - Sum of state-dependent modifiers
   */
  static async _getStateModifiers(actor, defenseType, context = {}) {
    try {
      if (!actor?.items) return 0;

      let stateBonus = 0;

      // Check all items for PASSIVE/STATE abilities
      for (const item of actor.items) {
        if (item.system?.executionModel !== 'PASSIVE' || item.system?.subType !== 'STATE') {
          continue;
        }

        const meta = item.system?.abilityMeta;
        if (!meta?.modifiers || !Array.isArray(meta.modifiers)) {
          continue;
        }

        // Apply each modifier in the PASSIVE/STATE item
        for (const modifier of meta.modifiers) {
          // Check if this modifier applies to the current defense type
          const targets = Array.isArray(modifier.target) ? modifier.target : [modifier.target];
          const appliesToDefense = targets.some(t => t === `defense.${defenseType}` || t === 'defense');

          if (!appliesToDefense) continue;

          // Evaluate predicates (all must be true)
          const predicates = modifier.predicates || [];
          const predicatesMatch = evaluateStatePredicates(actor, predicates, context);

          if (predicatesMatch && modifier.value) {
            stateBonus += modifier.value;
          }
        }
      }

      return stateBonus;
    } catch (err) {
      swseLogger.error('DefenseCalculator._getStateModifiers:', err);
      return 0;
    }
  }

  /**
   * Determine highest class defense bonus.
   */
  static async _getSaveBonus(classLevels, saveType) {

    if (!Array.isArray(classLevels) || classLevels.length === 0) {
      return 0;
    }

    const saveKey =
      saveType === 'fort' ? 'fortitude' :
      saveType === 'ref' ? 'reflex' :
      'will';

    const uniqueClasses = [
      ...new Set(
        classLevels
          .map(cl => cl?.class)
          .filter(Boolean)
      )
    ];

    if (uniqueClasses.length === 0) {
      return 0;
    }

    const classDataList = await Promise.all(
      uniqueClasses.map(className => getClassData(className))
    );

    let maxBonus = 0;

    for (let i = 0; i < uniqueClasses.length; i++) {
      const className = uniqueClasses[i];
      const classData = classDataList[i];

      if (!classData) {
        swseLogger.warn(`DefenseCalculator: Unknown class "${className}"`);
        continue;
      }

      const classBonus = classData.defenses?.[saveKey] ?? 0;
      maxBonus = Math.max(maxBonus, classBonus);
    }

    return maxBonus;
  }

  static _emptyResult() {
    return {
      fortitude: { base: 0, total: 0, adjustment: 0 },
      reflex: { base: 0, total: 0, adjustment: 0 },
      will: { base: 0, total: 0, adjustment: 0 }
    };
  }
}