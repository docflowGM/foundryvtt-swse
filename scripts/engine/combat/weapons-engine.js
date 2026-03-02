/**
 * Weapons Engine — Centralized Weapon Calculations (V2)
 *
 * Fully aligned to structured item schema.
 * No legacy field usage.
 * No direct rule math outside ModifierEngine.
 */

import { SWSELogger as swseLogger } from "../../utils/logger.js";
import { ModifierSource, ModifierType, createModifier } from "../../engine/effects/modifiers/ModifierTypes.js";
import { getEffectiveHalfLevel } from "../../actors/derived/level-split.js";

export class WeaponsEngine {

  /* ============================================================
     TALENT & PROPERTY HELPERS
  ============================================================ */

  static hasWeaponTalent(actor, talentKey) {
    return actor?.system?.weaponTalentFlags?.[talentKey] === true;
  }

  static getWeaponProperty(weapon, property) {
    return weapon?.system?.traits?.includes(property) === true;
  }

  static isMeleeWeapon(weapon) {
    return weapon?.system?.combat?.range?.type === 'melee';
  }

  static isLightWeapon(weapon) {
    return this.getWeaponProperty(weapon, 'light');
  }

  static isTwoHandedWeapon(weapon) {
    return this.getWeaponProperty(weapon, 'two-handed');
  }

  /* ============================================================
     WEAPON MODIFIERS (STRUCTURED)
  ============================================================ */

  static getWeaponModifiers(actor) {
    const modifiers = [];

    try {
      const weapons = actor.items?.filter(i => i.type === 'weapon') ?? [];

      for (const weapon of weapons) {
        if (!weapon?.system?.equippable?.equipped) continue;

        const combat = weapon.system?.combat ?? {};

        /* ---------------- Enhancement Bonus ---------------- */

        const enhancementAttack = combat?.attack?.bonus ?? 0;
        const enhancementDamage = combat?.damage?.bonus ?? 0;

        if (enhancementAttack !== 0) {
          modifiers.push(createModifier({
            source: ModifierSource.ITEM,
            sourceId: weapon.id,
            sourceName: `${weapon.name} (Enhancement)`,
            target: 'attack.bonus',
            type: ModifierType.ENHANCEMENT,
            value: enhancementAttack,
            enabled: true,
            priority: 50,
            description: `${weapon.name} enhancement bonus`
          }));
        }

        if (enhancementDamage !== 0) {
          modifiers.push(createModifier({
            source: ModifierSource.ITEM,
            sourceId: weapon.id,
            sourceName: `${weapon.name} (Enhancement)`,
            target: 'damage.melee',
            type: ModifierType.ENHANCEMENT,
            value: enhancementDamage,
            enabled: true,
            priority: 50,
            description: `${weapon.name} enhancement bonus`
          }));
        }

        /* ---------------- Attuned Lightsaber Bonus (+1) ---------------- */

        if (weapon.system?.subtype === 'lightsaber' &&
            weapon.flags?.swse?.builtBy === actor.id &&
            weapon.flags?.swse?.attunedBy === actor.id) {

          modifiers.push(createModifier({
            source: ModifierSource.WEAPON,
            sourceId: weapon.id,
            sourceName: `${weapon.name} (Attuned)`,
            target: 'attack.bonus',
            type: ModifierType.UNTYPED,
            value: 1,
            enabled: true,
            priority: 45,
            description: 'Attuned lightsaber bonus'
          }));
        }

        /* ---------------- Proficiency ---------------- */

        const proficient = weapon.system?.proficient ?? true;

        if (!proficient) {
          modifiers.push(createModifier({
            source: ModifierSource.ITEM,
            sourceId: weapon.id,
            sourceName: `${weapon.name} (Unproficient)`,
            target: 'attack.bonus',
            type: ModifierType.PENALTY,
            value: -5,
            enabled: true,
            priority: 10,
            description: 'Weapon proficiency penalty'
          }));
        }

        /* ---------------- Two-Handed Bonus ---------------- */

        if (this.isMeleeWeapon(weapon) &&
            this.isTwoHandedWeapon(weapon) &&
            !this.isLightWeapon(weapon)) {

          const strMod =
            actor.system?.derived?.abilities?.str?.mod ?? 0;

          modifiers.push(createModifier({
            source: ModifierSource.ITEM,
            sourceId: weapon.id,
            sourceName: `${weapon.name} (Two-Handed)`,
            target: 'damage.melee',
            type: ModifierType.UNTYPED,
            value: strMod,
            enabled: true,
            priority: 40,
            description: 'Two-handed weapon bonus'
          }));
        }

        /* ---------------- Dexterous Damage ---------------- */

        if (this.isMeleeWeapon(weapon) &&
            this.hasWeaponTalent(actor, 'dexterousDamage')) {

          const strMod =
            actor.system?.derived?.abilities?.str?.mod ?? 0;

          const dexMod =
            actor.system?.derived?.abilities?.dex?.mod ?? 0;

          if (dexMod > strMod) {
            const bonus = dexMod - strMod;

            modifiers.push(createModifier({
              source: ModifierSource.TALENT,
              sourceId: 'dexterousDamage',
              sourceName: 'Dexterous Damage',
              target: 'damage.melee',
              type: ModifierType.UNTYPED,
              value: bonus,
              enabled: true,
              priority: 35,
              description: 'Dexterous Damage talent'
            }));
          }
        }

        /* ---------------- Structured Traits ---------------- */

        if (this.getWeaponProperty(weapon, 'keen')) {
          modifiers.push(createModifier({
            source: ModifierSource.ITEM,
            sourceId: weapon.id,
            sourceName: `${weapon.name} (Keen)`,
            target: 'crit.range',
            type: ModifierType.UNTYPED,
            value: 1,
            enabled: true,
            priority: 30,
            description: 'Keen weapon'
          }));
        }

        if (this.getWeaponProperty(weapon, 'flaming')) {
          modifiers.push(createModifier({
            source: ModifierSource.ITEM,
            sourceId: weapon.id,
            sourceName: `${weapon.name} (Flaming)`,
            target: 'damage.melee',
            type: ModifierType.UNTYPED,
            value: 1,
            enabled: true,
            priority: 25,
            description: 'Flaming weapon'
          }));
        }
      }

    } catch (err) {
      swseLogger.error('[WeaponsEngine] Error collecting weapon modifiers:', err);
    }

    return modifiers;
  }

  /* ============================================================
     BASE DAMAGE (STRUCTURED)
  ============================================================ */

  static getBaseDamage(weapon) {
    if (!weapon || weapon.type !== 'weapon') {
      return null;
    }

    const dice = weapon.system?.combat?.damage?.dice ?? null;
    const type = weapon.system?.combat?.damage?.type ?? 'kinetic';

    if (!dice) return null;

    return {
      dice,
      type,
      expression: dice
    };
  }

  /* ============================================================
     DEBUG BREAKDOWN (STRUCTURED)
  ============================================================ */

  static getAttackBonusBreakdown(actor, weapon) {
    if (!actor || !weapon || weapon.type !== 'weapon') {
      return { total: 0, components: {} };
    }

    const bab = actor.system?.bab ?? 0;
    const halfLvl = getEffectiveHalfLevel(actor);

    const abilityKey =
      weapon.system?.combat?.attack?.ability ?? 'str';

    const abilityMod =
      actor.system?.derived?.abilities?.[abilityKey]?.mod ?? 0;

    const enhancement =
      weapon.system?.combat?.attack?.bonus ?? 0;

    const proficient =
      weapon.system?.proficient ?? true;

    const proficiencyPenalty = proficient ? 0 : -5;

    const total =
      bab +
      halfLvl +
      abilityMod +
      enhancement +
      proficiencyPenalty;

    return {
      total,
      components: {
        'BAB': bab,
        '½ Level': halfLvl,
        [`Ability (${abilityKey.toUpperCase()})`]: abilityMod,
        'Enhancement': enhancement,
        'Proficiency': proficiencyPenalty
      }
    };
  }

  static getDamageBonusBreakdown(actor, weapon) {
    if (!actor || !weapon || weapon.type !== 'weapon') {
      return { total: 0, components: {} };
    }

    const halfLvl = getEffectiveHalfLevel(actor);

    const abilityKey =
      weapon.system?.combat?.damage?.ability ??
      weapon.system?.combat?.attack?.ability ??
      'str';

    const abilityMod =
      actor.system?.derived?.abilities?.[abilityKey]?.mod ?? 0;

    const enhancement =
      weapon.system?.combat?.damage?.bonus ?? 0;

    const components = {
      '½ Level': halfLvl,
      [`Ability (${abilityKey.toUpperCase()})`]: abilityMod,
      'Enhancement': enhancement
    };

    const total =
      halfLvl + abilityMod + enhancement;

    return { total, components };
  }

  /* ============================================================
     ATTUNEMENT (LIGHTSABERS)
  ============================================================ */

  /**
   * Attempt to attune a self-built lightsaber
   * - Verifies builder ownership
   * - Verifies not already attuned
   * - Verifies actor has Force Point
   * - Deducts Force Point via ActorEngine
   * - Sets flags.swse.attunedBy
   *
   * @param {Actor} actor - Actor attempting attunement
   * @param {Item} weapon - The lightsaber to attune
   * @returns {Promise<Object>} { success, reason? }
   */
  static async attuneLightsaber(actor, weapon) {
    if (!weapon || weapon.type !== 'weapon') {
      return { success: false, reason: 'invalid_weapon' };
    }

    if (weapon.system?.subtype !== 'lightsaber') {
      return { success: false, reason: 'not_lightsaber' };
    }

    const flags = weapon.flags?.swse ?? {};

    if (flags.builtBy !== actor.id) {
      return { success: false, reason: 'not_builder' };
    }

    if (flags.attunedBy) {
      return { success: false, reason: 'already_attuned' };
    }

    try {
      // Import ActorEngine dynamically to avoid circular dependencies
      const { ActorEngine } = await import('../../governance/actor-engine/actor-engine.js');

      const currentFP = actor.system?.resources?.forcePoints?.value ?? 0;
      if (currentFP < 1) {
        return { success: false, reason: 'no_force_points' };
      }

      // Step 1: Deduct Force Point via ActorEngine mutation plan
      await ActorEngine.applyMutationPlan(actor, {
        set: {
          'system.resources.forcePoints.value': currentFP - 1
        }
      });

      // Step 2: Set attunedBy flag on weapon via ActorEngine
      await ActorEngine.updateEmbeddedDocuments(actor, 'Item', [{
        _id: weapon.id,
        'flags.swse.attunedBy': actor.id
      }]);

      return { success: true };

    } catch (err) {
      swseLogger.error('[WeaponsEngine] Attunement failed:', err);
      return { success: false, reason: 'attunement_error', error: err.message };
    }
  }

  /* ============================================================
     VALIDATION (STRUCTURED)
  ============================================================ */

  static validateWeaponConfig(weapon) {
    const issues = [];

    if (!weapon || weapon.type !== 'weapon') {
      return { valid: false, issues: ['Not a weapon item'] };
    }

    const combat = weapon.system?.combat ?? {};

    if (!combat.attack?.ability) {
      issues.push('Missing combat.attack.ability');
    }

    if (!combat.damage?.dice) {
      issues.push('Missing combat.damage.dice');
    }

    if (!weapon.system?.rangeProfile) {
      issues.push('Missing rangeProfile');
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }
}

export default WeaponsEngine;