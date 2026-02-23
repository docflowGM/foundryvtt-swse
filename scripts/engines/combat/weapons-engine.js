/**
 * Weapons Engine — Centralized Weapon Calculations
 *
 * Consolidates all weapon math and registers modifiers with ModifierEngine.
 * Fixes V2 compliance violations:
 * - Removes direct damage/attack calculations
 * - Registers all weapon effects as structured modifiers
 * - Replaces name-based detection with structured flags
 * - Handles conditional weapon properties through modifiers
 *
 * Architecture:
 * - getWeaponModifiers() → returns modifier objects
 * - Registered to ModifierEngine as weapon domain modifiers
 * - ModifierEngine handles stacking and application
 * - No direct math outside this engine
 */

import { SWSELogger as swseLogger } from '../../utils/logging.js';
import { ModifierSource, ModifierType, createModifier } from '../effects/modifiers/ModifierTypes.js';
import { getEffectiveHalfLevel } from '../../actors/derived/level-split.js';

export class WeaponsEngine {
  /**
   * Check if weapon has required talent for damage modifier
   * Uses structured flags instead of name-based detection
   * @param {Actor} actor - Actor with weapon talents
   * @param {string} talentKey - Structured talent key (e.g., 'dexterousDamage')
   * @returns {boolean}
   */
  static hasWeaponTalent(actor, talentKey) {
    // Check structured flags (Phase 3 pattern)
    const talentFlags = actor.system?.weaponTalentFlags || {};
    return talentFlags[talentKey] === true;
  }

  /**
   * Get weapon property (light, two-handed, etc.)
   * Uses structured flags instead of name-based detection
   * @param {Item} weapon - Weapon to check
   * @param {string} property - Property key (light, twoHanded, etc.)
   * @returns {boolean}
   */
  static getWeaponProperty(weapon, property) {
    // Check explicit flags first
    if (weapon.system?.[property] === true) {
      return true;
    }

    // Check structured property flags
    const props = weapon.system?.weaponProperties || {};
    return props[property] === true;
  }

  /**
   * Determine if weapon is melee
   * @param {Item} weapon - Weapon to check
   * @returns {boolean}
   */
  static isMeleeWeapon(weapon) {
    const meleeOrRanged = weapon.system?.meleeOrRanged || 'melee';
    return meleeOrRanged.toLowerCase() === 'melee';
  }

  /**
   * Check if weapon is light
   * Uses structured flag instead of name detection
   * @param {Item} weapon - Weapon to check
   * @returns {boolean}
   */
  static isLightWeapon(weapon) {
    return this.getWeaponProperty(weapon, 'isLight');
  }

  /**
   * Check if weapon is two-handed
   * Uses structured flag instead of name detection
   * @param {Item} weapon - Weapon to check
   * @returns {boolean}
   */
  static isTwoHandedWeapon(weapon) {
    return this.getWeaponProperty(weapon, 'isTwoHanded');
  }

  /**
   * Get all weapon modifiers for an actor
   * Replaces direct damage/attack calculations
   * @param {Actor} actor - Actor wielding weapons
   * @returns {Modifier[]} Array of weapon-related modifiers
   */
  static getWeaponModifiers(actor) {
    const modifiers = [];

    try {
      const weapons = actor.items?.filter(i => i.type === 'weapon') || [];

      for (const weapon of weapons) {
        if (!weapon.system?.equipped) continue; // Only equipped weapons apply modifiers

        // ================================================================
        // WEAPON ENHANCEMENT BONUS
        // ================================================================
        const enhancementBonus = weapon.system?.attackBonus ?? 0;
        if (enhancementBonus !== 0) {
          // Applies to both attack and damage
          try {
            modifiers.push(createModifier({
              source: ModifierSource.ITEM,
              sourceId: weapon.id,
              sourceName: `${weapon.name} (Enhancement)`,
              target: 'attack.bonus',
              type: ModifierType.ENHANCEMENT,
              value: enhancementBonus,
              enabled: true,
              priority: 50,
              description: `${weapon.name} enhancement bonus`
            }));

            modifiers.push(createModifier({
              source: ModifierSource.ITEM,
              sourceId: weapon.id,
              sourceName: `${weapon.name} (Enhancement)`,
              target: 'damage.melee',
              type: ModifierType.ENHANCEMENT,
              value: enhancementBonus,
              enabled: true,
              priority: 50,
              description: `${weapon.name} enhancement bonus`
            }));
          } catch (err) {
            swseLogger.warn(`Failed to create enhancement modifier for ${weapon.name}:`, err);
          }
        }

        // ================================================================
        // WEAPON PROFICIENCY PENALTY
        // ================================================================
        const proficient = weapon.system?.proficient ?? true;
        if (!proficient) {
          try {
            modifiers.push(createModifier({
              source: ModifierSource.ITEM,
              sourceId: weapon.id,
              sourceName: `${weapon.name} (Unproficient)`,
              target: 'attack.bonus',
              type: ModifierType.PENALTY,
              value: -5,
              enabled: true,
              priority: 10,
              description: 'Weapon proficiency penalty (unproficient)'
            }));
          } catch (err) {
            swseLogger.warn(`Failed to create proficiency penalty for ${weapon.name}:`, err);
          }
        }

        // ================================================================
        // TWO-HANDED BONUS (Melee only)
        // ================================================================
        if (this.isMeleeWeapon(weapon) && this.isTwoHandedWeapon(weapon) && !this.isLightWeapon(weapon)) {
          try {
            const strMod = actor.system.attributes?.str?.mod ?? 0;
            const twoHandedBonus = strMod; // Additional STR for two-handed

            modifiers.push(createModifier({
              source: ModifierSource.ITEM,
              sourceId: weapon.id,
              sourceName: `${weapon.name} (Two-Handed)`,
              target: 'damage.melee',
              type: ModifierType.UNTYPED,
              value: twoHandedBonus,
              enabled: true,
              priority: 40,
              description: 'Two-handed weapon bonus (+1 STR mod)'
            }));
          } catch (err) {
            swseLogger.warn(`Failed to create two-handed modifier for ${weapon.name}:`, err);
          }
        }

        // ================================================================
        // DEXTEROUS DAMAGE TALENT (Structured flag check)
        // ================================================================
        if (this.isMeleeWeapon(weapon) && this.hasWeaponTalent(actor, 'dexterousDamage')) {
          try {
            const strMod = actor.system.attributes?.str?.mod ?? 0;
            const dexMod = actor.system.attributes?.dex?.mod ?? 0;

            // Only apply if DEX > STR
            if (dexMod > strMod) {
              const dexBonus = dexMod - strMod; // Additional DEX over STR

              modifiers.push(createModifier({
                source: ModifierSource.TALENT,
                sourceId: 'dexterousDamage',
                sourceName: 'Dexterous Damage',
                target: 'damage.melee',
                type: ModifierType.UNTYPED,
                value: dexBonus,
                enabled: true,
                priority: 35,
                description: 'Dexterous Damage talent (+DEX when better than STR)'
              }));
            }
          } catch (err) {
            swseLogger.warn(`Failed to create dexterous damage modifier:`, err);
          }
        }

        // ================================================================
        // WEAPON PROPERTIES AS CONDITIONAL MODIFIERS
        // ================================================================
        const props = weapon.system?.weaponProperties || {};
        if (props.keen === true) {
          try {
            modifiers.push(createModifier({
              source: ModifierSource.ITEM,
              sourceId: weapon.id,
              sourceName: `${weapon.name} (Keen)`,
              target: 'crit.range',
              type: ModifierType.UNTYPED,
              value: 1, // Expands crit range by 1
              enabled: true,
              priority: 30,
              description: 'Keen weapon: crit range expanded by 1'
            }));
          } catch (err) {
            swseLogger.warn(`Failed to create keen modifier for ${weapon.name}:`, err);
          }
        }

        if (props.flaming === true) {
          try {
            modifiers.push(createModifier({
              source: ModifierSource.ITEM,
              sourceId: weapon.id,
              sourceName: `${weapon.name} (Flaming)`,
              target: 'damage.melee',
              type: ModifierType.UNTYPED,
              value: 1, // +1d6 flaming (represented as +1 bonus for now)
              enabled: true,
              priority: 25,
              description: 'Flaming weapon: +1d6 fire damage'
            }));
          } catch (err) {
            swseLogger.warn(`Failed to create flaming modifier for ${weapon.name}:`, err);
          }
        }

      }
    } catch (err) {
      swseLogger.error('[WeaponsEngine] Error collecting weapon modifiers:', err);
    }

    return modifiers;
  }

  /**
   * Calculate base weapon damage (without modifiers)
   * Returns the dice expression only, modifiers applied by ModifierEngine
   * @param {Item} weapon - Weapon to get damage for
   * @returns {Object} { dice, type } or null
   */
  static getBaseDamage(weapon) {
    if (!weapon || weapon.type !== 'weapon') {
      return null;
    }

    const damageDice = weapon.system?.damageDice || 1;
    const damageDiceType = weapon.system?.damageDiceType || 'd6';
    const damageType = weapon.system?.damageType || 'kinetic';

    return {
      dice: `${damageDice}${damageDiceType}`,
      type: damageType,
      expression: `${damageDice}${damageDiceType}`
    };
  }

  /**
   * Get attack bonus components (for debugging/display)
   * Should NOT be used for actual attack rolls - ModifierEngine handles that
   * @param {Actor} actor - Actor making attack
   * @param {Item} weapon - Weapon being used
   * @returns {Object} Breakdown of attack bonus sources
   */
  static getAttackBonusBreakdown(actor, weapon) {
    const bab = actor.system.bab ?? 0;
    const halfLvl = getEffectiveHalfLevel(actor);
    const attr = weapon?.system?.attackAttribute ?? 'str';
    const abilityMod = actor.system.attributes?.[attr]?.mod ?? 0;
    const enhancement = weapon?.system?.attackBonus ?? 0;
    const proficient = weapon?.system?.proficient ?? true;
    const proficiencyPenalty = proficient ? 0 : -5;

    return {
      bab,
      halfLevel: halfLvl,
      abilityMod,
      enhancement,
      proficiencyPenalty,
      total: bab + halfLvl + abilityMod + enhancement + proficiencyPenalty,
      components: {
        'BAB': bab,
        '½ Level': halfLvl,
        `Ability (${attr})`: abilityMod,
        'Enhancement': enhancement,
        'Proficiency': proficiencyPenalty
      }
    };
  }

  /**
   * Get damage bonus components (for debugging/display)
   * Should NOT be used for actual damage calculations - ModifierEngine handles that
   * @param {Actor} actor - Actor dealing damage
   * @param {Item} weapon - Weapon being used
   * @returns {Object} Breakdown of damage bonus sources
   */
  static getDamageBonusBreakdown(actor, weapon) {
    const halfLvl = getEffectiveHalfLevel(actor);
    const strMod = actor.system.attributes?.str?.mod ?? 0;
    const dexMod = actor.system.attributes?.dex?.mod ?? 0;
    const enhancement = weapon?.system?.attackBonus ?? 0;
    const isMelee = this.isMeleeWeapon(weapon);
    const isTwoHanded = this.isTwoHandedWeapon(weapon);
    const isLight = this.isLightWeapon(weapon);
    const hasDexTalent = this.hasWeaponTalent(actor, 'dexterousDamage');

    let components = {
      '½ Level': halfLvl,
      'Enhancement': enhancement
    };

    if (isMelee) {
      if (hasDexTalent && dexMod > strMod) {
        components['Ability (DEX)'] = dexMod;
        if (isTwoHanded && !isLight) {
          components['Two-Handed (DEX)'] = dexMod;
        }
      } else {
        components['Ability (STR)'] = strMod;
        if (isTwoHanded && !isLight) {
          components['Two-Handed (STR)'] = strMod;
        }
      }
    }
    // Ranged weapons get no ability mod in RAW SWSE

    const total = Object.values(components).reduce((a, b) => a + b, 0);

    return { components, total };
  }

  /**
   * Validate weapon configuration
   * @param {Item} weapon - Weapon to validate
   * @returns {Object} { valid, issues }
   */
  static validateWeaponConfig(weapon) {
    const issues = [];

    if (!weapon || weapon.type !== 'weapon') {
      return { valid: false, issues: ['Not a weapon item'] };
    }

    // Check ranged weapons have required properties
    if (weapon.system?.meleeOrRanged === 'ranged') {
      if (!weapon.system?.range) {
        issues.push('Ranged weapon missing range');
      }
      if (!weapon.system?.ammunition?.max) {
        issues.push('Ranged weapon missing ammunition configuration');
      }
    }

    // Check melee weapons
    if (weapon.system?.meleeOrRanged === 'melee' || !weapon.system?.meleeOrRanged) {
      if (!weapon.system?.damageDice) {
        issues.push('Melee weapon missing damage dice');
      }
    }

    // Check damage type is valid
    const validDamageTypes = ['kinetic', 'energy', 'fire', 'cold', 'acid', 'sonic', 'force'];
    if (!validDamageTypes.includes(weapon.system?.damageType)) {
      issues.push(`Unknown damage type: ${weapon.system?.damageType}`);
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }
}

export default WeaponsEngine;
