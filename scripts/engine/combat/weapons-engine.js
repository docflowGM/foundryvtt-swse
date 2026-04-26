/**
 * Weapons Engine — Centralized Weapon Calculations (V2)
 *
 * Fully aligned to structured item schema.
 * No legacy field usage.
 * No direct rule math outside ModifierEngine.
 */

import { SWSELogger as swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { ModifierSource, ModifierType, createModifier } from "/systems/foundryvtt-swse/scripts/engine/effects/modifiers/ModifierTypes.js";
import { getEffectiveHalfLevel } from "/systems/foundryvtt-swse/scripts/actors/derived/level-split.js";

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

        /* ================ LIGHTSABER UPGRADES (Phase 1) ================ */

        // Phase 1: Safe, data-driven crystal modifiers
        // Type A: Standard modifiers array
        // Type B: Damage type override
        // No conditional logic, no hardcoded crystal names

        this.#gatherLightsaberUpgradeModifiers(weapon, actor, modifiers);
      }

    } catch (err) {
      swseLogger.error('[WeaponsEngine] Error collecting weapon modifiers:', err);
    }

    return modifiers;
  }

  /**
   * Phase 1 Crystal Mechanics
   * Gather and interpret lightsaber upgrade modifiers
   *
   * Supports:
   * - Type A: Standard modifier objects (flat bonuses)
   * - Type B: Damage type override
   *
   * Does NOT support (Phase 2+):
   * - Conditional triggers
   * - Crit-only effects
   * - Force Point interactions
   *
   * @private
   */
  static #gatherLightsaberUpgradeModifiers(weapon, actor, modifiers) {
    // Only process lightsabers with upgrades
    if (weapon.system?.subtype !== 'lightsaber') return;

    const installedUpgrades = weapon.system?.installedUpgrades ?? [];
    if (!installedUpgrades.length) return;

    // Gather all upgrade items
    const upgrades = installedUpgrades
      .map(id => actor.items?.get(id))
      .filter(u => u !== undefined && u.type === 'weaponUpgrade');

    for (const upgrade of upgrades) {
      const lightsaberData = upgrade.system?.lightsaber;
      if (!lightsaberData) continue;

      // ========== TYPE A: Standard Modifiers ==========
      // Crystals like Ilum, Synthetic, Sigil use standard modifiers array
      if (Array.isArray(upgrade.system.modifiers)) {
        for (const mod of upgrade.system.modifiers) {
          modifiers.push(createModifier({
            source: ModifierSource.WEAPON,
            sourceId: upgrade.id,
            sourceName: `${weapon.name} (${upgrade.name})`,
            target: this.#mapModifierTarget(mod.domain),
            type: mod.bonusType ? this.#mapBonusType(mod.bonusType) : ModifierType.UNTYPED,
            value: mod.value ?? 0,
            enabled: true,
            priority: 55, // Crystal modifiers priority
            description: `${upgrade.name} modifier`
          }));
        }
      }

      // ========== TYPE B: Damage Type Override ==========
      // Crystals like Barab Ingot, Firkraan override damage type
      // Note: Damage type override is handled separately in damage resolution,
      // not as a modifier. This documents the intent.
      if (lightsaberData.damageOverride) {
        // Damage type is applied during roll evaluation, not as a modifier
        // This is a structural note only.
      }

      // ========== TYPE B Basic: Damage Bonus ==========
      // Some crystals may specify direct damage bonus
      if (lightsaberData.damageBonus && lightsaberData.damageBonus > 0) {
        modifiers.push(createModifier({
          source: ModifierSource.WEAPON,
          sourceId: upgrade.id,
          sourceName: `${weapon.name} (${upgrade.name})`,
          target: 'damage.melee',
          type: ModifierType.UNTYPED,
          value: lightsaberData.damageBonus,
          enabled: true,
          priority: 55,
          description: `${upgrade.name} damage bonus`
        }));
      }
    }
  }

  /**
   * Map modifier domain strings to modifier targets
   * @private
   */
  static #mapModifierTarget(domain) {
    const domainMap = {
      'attack': 'attack.bonus',
      'damage': 'damage.melee',
      'defense': 'defense.ref',
      'skill': 'skill.general', // Generic fallback
      'force': 'force.bonus' // If applicable
    };
    return domainMap[domain] ?? 'attack.bonus';
  }

  /**
   * Map bonus type strings to ModifierType enum
   * @private
   */
  static #mapBonusType(bonusType) {
    const typeMap = {
      'force': ModifierType.FORCE,
      'enhancement': ModifierType.ENHANCEMENT,
      'untyped': ModifierType.UNTYPED,
      'equipment': ModifierType.EQUIPMENT
    };
    return typeMap[bonusType] ?? ModifierType.UNTYPED;
  }

  /* ============================================================
     BASE DAMAGE (STRUCTURED)
  ============================================================ */

  /**
   * Get base damage formula and type
   * Includes lightsaber crystal damage type overrides
   *
   * Phase 1: Damage type override from crystals (Barab, Firkraan, etc.)
   */
  static getBaseDamage(weapon, actor = null) {
    if (!weapon || weapon.type !== 'weapon') {
      return null;
    }

    const dice = weapon.system?.combat?.damage?.dice ?? null;
    let type = weapon.system?.combat?.damage?.type ?? 'kinetic';

    if (!dice) return null;

    // ========== LIGHTSABER CRYSTAL DAMAGE OVERRIDE ==========
    // Phase 1: Check for damage type override from installed upgrades
    if (weapon.system?.subtype === 'lightsaber' && actor) {
      const override = this.#resolveDamageTypeOverride(weapon, actor);
      if (override) {
        type = override;
      }
    }

    return {
      dice,
      type,
      expression: dice
    };
  }

  /**
   * Resolve damage type override from lightsaber upgrades
   * Checks installed upgrades for damageOverride field
   * @private
   */
  static #resolveDamageTypeOverride(weapon, actor) {
    const installedUpgrades = weapon.system?.installedUpgrades ?? [];
    if (!installedUpgrades.length) return null;

    // Check all installed upgrades for damage override
    for (const upgradeId of installedUpgrades) {
      const upgrade = actor.items?.get(upgradeId);
      if (!upgrade || !upgrade.system?.lightsaber) continue;

      const override = upgrade.system.lightsaber.damageOverride;
      if (override) {
        return override; // Return first override found
      }
    }

    return null;
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
      const { ActorEngine } = await import("/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js");

      const currentFP = actor.system?.forcePoints?.value ?? actor.system?.resources?.forcePoints?.value ?? 0;
      if (currentFP < 1) {
        return { success: false, reason: 'no_force_points' };
      }

      // Step 1: Deduct Force Point via ActorEngine mutation plan
      await ActorEngine.applyMutationPlan(actor, {
        set: {
          'system.forcePoints.value': currentFP - 1,
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
     PHASE 2: CONDITIONAL CRYSTAL EFFECTS
  ============================================================ */

  /**
   * Evaluate conditional crystal effects (Phase 2)
   *
   * Supports:
   * - Extra dice on critical hits
   * - Extra dice vs shields
   * - Extra dice vs damage reduction
   * - Extra dice vs armored targets
   * - Conditional damage bonuses
   *
   * Context-driven, not hardcoded. No crystal names checked.
   *
   * @param {Item} weapon - Lightsaber with upgrades
   * @param {Actor} actor - Weapon wielder
   * @param {Object} context - Combat context { isCritical, targetHasShield, targetHasDR, targetIsArmored }
   * @returns {Object} { extraDice: [], flatBonus: 0, appliedEffects: [] }
   */
  static evaluateConditionalCrystalEffects(weapon, actor, context = {}) {
    const result = {
      extraDice: [],
      flatBonus: 0,
      appliedEffects: []
    };

    // Only process lightsabers with upgrades
    if (weapon.system?.subtype !== 'lightsaber') return result;
    if (!weapon.system?.equippable?.equipped) return result;

    const installedUpgrades = weapon.system?.installedUpgrades ?? [];
    if (!installedUpgrades.length) return result;

    // Gather all upgrade items
    const upgrades = installedUpgrades
      .map(id => actor.items?.get(id))
      .filter(u => u !== undefined && u.type === 'weaponUpgrade');

    for (const upgrade of upgrades) {
      const ls = upgrade.system?.lightsaber;
      if (!ls) continue;

      // ========== DAMAGE MODIFIERS (Conditional) ==========
      if (Array.isArray(ls.damageModifiers)) {
        for (const mod of ls.damageModifiers) {
          if (this.#evaluateTrigger(mod.trigger, context)) {
            this.#applyConditionalEffect(mod.effect, result, upgrade.name);
          }
        }
      }

      // ========== CONDITIONAL EFFECTS ==========
      if (Array.isArray(ls.conditionalEffects)) {
        for (const cond of ls.conditionalEffects) {
          if (this.#evaluateTrigger(cond.trigger, context)) {
            this.#applyConditionalEffect(cond.effect, result, upgrade.name);
          }
        }
      }
    }

    return result;
  }

  /**
   * Evaluate a trigger against combat context
   * Generic, no hardcoded crystal logic, no crystal name checks
   * @private
   */
  static #evaluateTrigger(trigger, context) {
    // Normalize trigger
    const t = (trigger ?? '').toLowerCase().trim();

    switch (t) {
      case 'critical':
      case 'iscritical':
      case 'crit':
        return context.isCritical === true;

      case 'targethasshield':
      case 'vs_shield':
      case 'vsshield':
      case 'vs shield':
        return context.targetHasShield === true;

      case 'targethasdr':
      case 'vs_dr':
      case 'vsdr':
      case 'vs damage reduction':
        return context.targetHasDR === true;

      case 'targetisarmored':
      case 'vs_armor':
      case 'vsarmor':
      case 'vs armored':
        return context.targetIsArmored === true;

      case 'always':
      case 'unconditional':
      case 'true':
        return true;

      default:
        return false;
    }
  }

  /**
   * Apply a conditional effect to the result
   * Supports: extraDice, bonusDamage (flatBonus)
   * @private
   */
  static #applyConditionalEffect(effect, result, sourceName) {
    if (!effect) return;

    const type = (effect.type ?? '').toLowerCase().trim();

    switch (type) {
      case 'extradice':
        if (effect.value) {
          result.extraDice.push(effect.value);
          result.appliedEffects.push({
            source: sourceName,
            type: 'extraDice',
            value: effect.value
          });
        }
        break;

      case 'bonusdamage':
      case 'flatbonus':
      case 'bonus':
        if (typeof effect.value === 'number') {
          result.flatBonus += effect.value;
          result.appliedEffects.push({
            source: sourceName,
            type: 'bonusDamage',
            value: effect.value
          });
        }
        break;

      default:
        // Unknown effect type — log and ignore
        swseLogger.warn(
          `[WeaponsEngine Phase 2] Unknown conditional effect type: ${effect.type}`
        );
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