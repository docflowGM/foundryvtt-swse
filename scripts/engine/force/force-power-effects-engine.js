/**
 * Force Power Effects Engine
 *
 * Applies and manages ActiveEffect documents for Force Powers
 * Handles duration tracking and effect expiration
 *
 * Provenance tracking:
 * - Each created ActiveEffect gets flags['foundryvtt-swse'].forcePowerEffect = { powerItemId, powerName, rollTotal }
 * - On power deletion, only effects with matching provenance are removed
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { getSwseFlag } from "/systems/foundryvtt-swse/scripts/utils/flags/swse-flags.js";
import { targetSuppressesForceEffect } from "/systems/foundryvtt-swse/scripts/engine/combat/damage-type-rules.js";

export class ForcePowerEffectsEngine {
  /**
   * Apply effects for a force power based on roll result
   * @param {Actor} actor - The actor using the force power
   * @param {Item} powerItem - The force power item
   * @param {number} rollTotal - The total of the Use the Force roll
   * @param {Object} [options] - Optional effect context
   * @param {Actor} [options.target] - Target actor when the effect applies to someone other than the caster
   * @returns {Promise<Array>} Created ActiveEffect IDs
   */
  static async applyPowerEffect(actor, powerItem, rollTotal, options = {}) {
    if (!actor || !powerItem) {
      return [];
    }

    const powerName = powerItem.name;
    const target = options.target ?? options.targetActor ?? actor;
    const forceSuppression = targetSuppressesForceEffect({
      target,
      sourceItem: powerItem,
      context: {
        forcePower: true,
        powerId: powerItem.id,
        powerName,
        tags: powerItem.system?.tags ?? powerItem.system?.descriptors ?? []
      }
    });
    if (forceSuppression?.suppressed) {
      ui?.notifications?.info?.(forceSuppression.reason);
      SWSELogger.log(`SWSE | Force Power Effects | Suppressed ${powerName}: ${forceSuppression.reason}`);
      return [];
    }

    try {
      // Determine what effect to apply based on the power
      const effectData = this._buildEffectDataForPower(actor, powerItem, rollTotal);

      if (!effectData || effectData.length === 0) {
        SWSELogger.log(`SWSE | Force Power Effects | No effects to apply for ${powerName}`);
        return [];
      }

      // Add provenance to each effect
      const effectsWithProvenance = effectData.map(e => ({
        ...e,
        flags: {
          ...e.flags,
          'foundryvtt-swse': {
            ...(e.flags?.['foundryvtt-swse'] || {}),
            forcePowerEffect: {
              powerItemId: powerItem.id,
              powerName: powerName,
              rollTotal: rollTotal
            }
          }
        }
      }));

      // Create the effects on the actor via ActorEngine (SOVEREIGNTY)
      const createdEffects = await ActorEngine.createActiveEffects(actor, effectsWithProvenance, { source: 'force-power-effects' });

      SWSELogger.log(`SWSE | Force Power Effects | Applied ${createdEffects.length} effect(s) for ${powerName}`);
      return createdEffects.map(e => e.id);
    } catch (err) {
      SWSELogger.warn(`SWSE | Force Power Effects | Failed to apply effects for ${powerName}:`, err);
      return [];
    }
  }

  /**
   * Build ActiveEffect data for a specific force power
   * @private
   */
  static _buildEffectDataForPower(actor, powerItem, rollTotal) {
    const powerName = powerItem.name.toLowerCase();
    const system = powerItem.system;
    const tags = system.tags || [];

    // === DEFENSE POWERS ===
    if (powerName.includes('force shield')) {
      return this._buildForceShieldEffect(actor, powerItem, rollTotal);
    }

    if (powerName.includes('energy resistance')) {
      return this._buildEnergyResistanceEffect(actor, powerItem, rollTotal);
    }

    if (powerName.includes('crucitorn')) {
      return this._buildCrucitornEffect(actor, powerItem, rollTotal);
    }

    if (powerName.includes('resist force')) {
      return this._buildResistForceEffect(actor, powerItem, rollTotal);
    }

    if (powerName.includes('force defense')) {
      return this._buildForceDefenseEffect(actor, powerItem, rollTotal);
    }

    if (powerName.includes('force body')) {
      return this._buildForceBodyEffect(actor, powerItem, rollTotal);
    }

    if (powerName.includes('negate energy')) {
      return this._buildNegateEnergyEffect(actor, powerItem, rollTotal);
    }

    // === ATTACK/DAMAGE POWERS ===
    if (tags.includes('damage') && !tags.includes('healing')) {
      return this._buildDamagePowerEffect(actor, powerItem, rollTotal);
    }

    // === ENHANCEMENT POWERS ===
    if (powerName.includes('prescience') || powerName.includes('surge')) {
      return this._buildEnhancementEffect(actor, powerItem, rollTotal);
    }

    if (powerName.includes('battlemind')) {
      return this._buildBattlemindEffect(actor, powerItem, rollTotal);
    }

    if (powerName.includes('force weapon')) {
      return this._buildForceWeaponEffect(actor, powerItem, rollTotal);
    }

    if (powerName.includes('force strike')) {
      return this._buildForceStrikeEffect(actor, powerItem, rollTotal);
    }

    if (powerName.includes('valor')) {
      return this._buildValorEffect(actor, powerItem, rollTotal);
    }

    // === DEBUFF POWERS ===
    if (powerName.includes('blind') || powerName.includes('fear') ||
        powerName.includes('slow') || powerName.includes('stagger') ||
        powerName.includes('malacia')) {
      return this._buildDebuffEffect(actor, powerItem, rollTotal);
    }

    if (powerName.includes('force grip') || powerName.includes('force thrust')) {
      return this._buildImmobilizeEffect(actor, powerItem, rollTotal);
    }

    // === UTILITY/CONTROL POWERS ===
    if (powerName.includes('cloak')) {
      return this._buildCloakEffect(actor, powerItem, rollTotal);
    }

    if (powerName.includes('levitate')) {
      return this._buildLevitateEffect(actor, powerItem, rollTotal);
    }

    if (powerName.includes('move object')) {
      return this._buildMoveObjectEffect(actor, powerItem, rollTotal);
    }

    // === HEALING POWERS ===
    if (tags.includes('healing')) {
      return this._buildHealingEffect(actor, powerItem, rollTotal);
    }

    // === SENSE POWERS ===
    if (powerName.includes('force sense') || powerName.includes('force track') ||
        powerName.includes('farseeing') || powerName.includes('prescience')) {
      return this._buildSenseEffect(actor, powerItem, rollTotal);
    }

    // === GENERIC HANDLERS ===
    if (tags.includes('defense') || tags.includes('control')) {
      return this._buildGenericDefenseEffect(actor, powerItem, rollTotal);
    }

    return [];
  }

  /**
   * Build a single intent-bearing ActiveEffect (Phase 3A).
   *
   * Numeric caster self-buffs route through the ModifierEngine effect-intent
   * domains instead of writing dead system.derived.* fields. origin is the ACTOR
   * (not the power item) because the ModifierEngine intent collectors skip
   * actor.effects whose origin matches /\bItem\b/ (the item-transfer dedup);
   * these are independently-created actor buffs, not transferred item effects.
   * Removal still keys off the forcePowerEffect provenance flag, not origin.
   *
   * @private
   */
  static _buildIntentEffect(actor, powerItem, { labelSuffix, icon, duration, category, target, amount, effectType }) {
    return {
      label: `${powerItem.name}${labelSuffix ? ` ${labelSuffix}` : ''}`,
      icon: icon || powerItem.img || 'icons/svg/aura.svg',
      origin: actor.uuid,
      disabled: false,
      transfer: false,
      duration: duration || {},
      changes: [],
      flags: {
        swse: { effectType: effectType || 'forcePowerIntent' },
        'foundryvtt-swse': {
          effectIntent: {
            category,
            target,
            operation: 'increase',
            amount,
            bonusType: 'untyped',
            application: 'always',
            scope: 'self',
            transfer: true
          }
        }
      }
    };
  }

  /**
   * Build one intent effect per defense (reflex/fortitude/will) for "+X to all
   * defenses" powers. A single effectIntent carries one target, so all-defense
   * bonuses fan out into three effects.
   * @private
   */
  static _buildAllDefensesIntentEffects(actor, powerItem, { icon, duration, amount }) {
    return ['reflex', 'fortitude', 'will'].map(def =>
      this._buildIntentEffect(actor, powerItem, {
        labelSuffix: `(+${amount} ${def})`,
        icon,
        duration,
        category: 'defense',
        target: def,
        amount,
        effectType: 'defenseBonus'
      })
    );
  }

  /**
   * Build Force Shield effect (grants Shield Rating)
   * @private
   */
  static _buildForceShieldEffect(actor, powerItem, rollTotal) {
    const srValue = this._extractShieldRatingFromChart(powerItem.system.dcChart, rollTotal);

    if (srValue <= 0) {
      return [];
    }

    const duration = this._parseDuration(powerItem.system.duration);

    return [{
      label: `${powerItem.name} (SR ${srValue})`,
      icon: powerItem.img || 'icons/svg/shield.svg',
      origin: powerItem.uuid,
      disabled: false,
      transfer: false,
      duration: duration,
      changes: [
        {
          key: 'system.derived.shield.current',
          mode: 2, // Override
          value: srValue.toString(),
          priority: 20
        }
      ],
      flags: {
        swse: {
          effectType: 'shieldRating',
          shieldValue: srValue
        }
      }
    }];
  }

  /**
   * Build Energy Resistance effect (grants DR against energy types)
   * @private
   */
  static _buildEnergyResistanceEffect(actor, powerItem, rollTotal) {
    const drValue = this._extractDRFromChart(powerItem.system.dcChart, rollTotal);

    if (drValue <= 0) {
      return [];
    }

    const duration = this._parseDuration(powerItem.system.duration);

    return [{
      label: `${powerItem.name} (DR ${drValue})`,
      icon: powerItem.img || 'icons/svg/shield.svg',
      origin: powerItem.uuid,
      disabled: false,
      transfer: false,
      duration: duration,
      // D4: Energy Resistance's mitigation comes from the swse flag below
      // (effectType:'damageReduction' + drType/drValue), which collectDamageProtections
      // reads as a canonical typed RESISTANCE entry and the typed-resistance mitigation
      // stage applies after DR. The former `system.derived.damageReduction.energy`
      // change was a dead raw write (no reader) and violated the "AEs never write
      // system.derived.*" rule, so it has been removed.
      changes: [],
      flags: {
        swse: {
          effectType: 'damageReduction',
          drValue: drValue,
          drType: 'energy'
        }
      }
    }];
  }

  /**
   * Build Crucitorn effect (increases Damage Threshold)
   * @private
   */
  static _buildCrucitornEffect(actor, powerItem, rollTotal) {
    const dtBonus = this._extractValueFromChart(powerItem.system.dcChart, rollTotal, 'DT');

    if (dtBonus <= 0) {
      return [];
    }

    // Phase 3A: +X Damage Threshold via the ModifierEngine threshold intent
    // (defense.damageThreshold), read by DerivedCalculator's damageThresholdAdjustment.
    return [
      this._buildIntentEffect(actor, powerItem, {
        labelSuffix: `(+${dtBonus} DT)`,
        icon: powerItem.img || 'icons/svg/shield.svg',
        duration: { type: 'turns', duration: 1 }, // Instantaneous = 1 turn in Foundry
        category: 'threshold',
        target: 'damageThreshold',
        amount: dtBonus,
        effectType: 'damageThreshold'
      })
    ];
  }

  /**
   * Build Resist Force effect (grants defense bonus against Force Powers)
   * @private
   */
  static _buildResistForceEffect(actor, powerItem, rollTotal) {
    const defenseBonus = this._extractDefenseBonusFromChart(powerItem.system.dcChart, rollTotal);

    if (defenseBonus <= 0) {
      return [];
    }

    const duration = this._parseDuration(powerItem.system.duration);

    // Phase 3A: +X to all defenses via ModifierEngine defense intents
    // (was a dead system.derived.defense.all write).
    return this._buildAllDefensesIntentEffects(actor, powerItem, {
      icon: powerItem.img || 'icons/svg/shield.svg',
      duration,
      amount: defenseBonus
    });
  }

  /**
   * Build Force Defense effect
   * @private
   */
  static _buildForceDefenseEffect(actor, powerItem, rollTotal) {
    const defenseBonus = this._extractDefenseBonusFromChart(powerItem.system.dcChart, rollTotal);

    if (defenseBonus <= 0) {
      return [];
    }

    const duration = this._parseDuration(powerItem.system.duration);

    // Phase 3A: +X to all defenses via ModifierEngine defense intents.
    return this._buildAllDefensesIntentEffects(actor, powerItem, {
      icon: powerItem.img || 'icons/svg/shield.svg',
      duration,
      amount: defenseBonus
    });
  }

  /**
   * Build Force Body effect (reduces damage taken)
   * @private
   */
  static _buildForceBodyEffect(actor, powerItem, rollTotal) {
    const reduction = this._extractDRFromChart(powerItem.system.dcChart, rollTotal);

    if (reduction <= 0) {
      return [];
    }

    return [{
      label: `${powerItem.name} (${reduction} DR)`,
      icon: powerItem.img || 'icons/svg/shield.svg',
      origin: powerItem.uuid,
      disabled: false,
      transfer: false,
      duration: { type: 'turns', duration: 1 },
      changes: [
        {
          key: 'system.derived.damageReduction.all',
          mode: 2,
          value: reduction.toString(),
          priority: 20
        }
      ],
      flags: {
        swse: {
          effectType: 'damageReduction'
        }
      }
    }];
  }

  /**
   * Build Negate Energy effect
   * @private
   */
  static _buildNegateEnergyEffect(actor, powerItem, rollTotal) {
    const drValue = this._extractDRFromChart(powerItem.system.dcChart, rollTotal);

    if (drValue <= 0) {
      return [];
    }

    const duration = this._parseDuration(powerItem.system.duration);

    return [{
      label: `${powerItem.name} (${drValue})`,
      icon: powerItem.img || 'icons/svg/shield.svg',
      origin: powerItem.uuid,
      disabled: false,
      transfer: false,
      duration: duration,
      // D4: the former `system.derived.damageReduction.energy` change was a dead raw
      // write (no reader) and violated the "AEs never write system.derived.*" rule, so
      // it has been removed. Negate Energy carries no drType/drValue resistance flag
      // today, so it is currently unwired to the mitigation pipeline (it was already a
      // no-op). Wiring it through the canonical resistance layer (drType:'energy') is a
      // deliberate behavior change deferred to a follow-up, not this slice.
      changes: [],
      flags: {
        swse: {
          effectType: 'energyNegation',
          drValue: drValue
        }
      }
    }];
  }

  /**
   * Build effects for damage powers
   * @private
   */
  static _buildDamagePowerEffect(actor, powerItem, rollTotal) {
    // Damage powers typically don't apply persistent effects on the caster
    // They affect targets through damage rolls in combat
    // Could track damage bonus if the power grants +damage to attacks
    return [];
  }

  /**
   * Build enhancement effect for prescience, surge, etc.
   * @private
   */
  static _buildEnhancementEffect(actor, powerItem, rollTotal) {
    const bonus = this._extractBonusValue(powerItem.system.dcChart, rollTotal);

    if (bonus <= 0) {
      return [];
    }

    const powerName = powerItem.name.toLowerCase();
    const duration = this._parseDuration(powerItem.system.duration);

    if (powerName.includes('surge')) {
      // Phase 3A: Surge damage bonus via the ModifierEngine damage intent.
      return [
        this._buildIntentEffect(actor, powerItem, {
          labelSuffix: `(+${bonus} damage)`,
          icon: powerItem.img || 'icons/svg/magic.svg',
          duration,
          category: 'damage',
          target: 'all',
          amount: bonus,
          effectType: 'damageBonus'
        })
      ];
    }

    if (powerName.includes('prescience')) {
      // DEFERRED (rules): Prescience grants an insight bonus, but the exact target
      // (Perception vs Initiative vs defenses) needs the source text. Left on the
      // legacy system.derived.insight write until resolved — do not guess it into
      // a skill/defense intent.
      return [{
        label: `${powerItem.name} (+${bonus} insight)`,
        icon: powerItem.img || 'icons/svg/magic.svg',
        origin: powerItem.uuid,
        disabled: false,
        transfer: false,
        duration: duration,
        changes: [
          { key: 'system.derived.insight', mode: 2, value: bonus.toString(), priority: 20 }
        ],
        flags: { swse: { effectType: 'enhancement' } }
      }];
    }

    // Generic enhancement fallback previously wrote a meaningless
    // system.derived.bonus with no reader — deleted as unsupported (Phase 3A).
    return [];
  }

  /**
   * Build Battlemind effect (bonus to defenses and damage)
   * @private
   */
  static _buildBattlemindEffect(actor, powerItem, rollTotal) {
    // Battlemind grants +1/2 level bonus to defenses and damage
    const bonus = Math.floor((actor.system.derived?.heroicLevel || 1) / 2);

    if (bonus <= 0) {
      return [];
    }

    const duration = this._parseDuration(powerItem.system.duration);
    const icon = powerItem.img || 'icons/svg/combat.svg';

    // Phase 3A: +1/2 level to all defenses (defense intents) and to attacks
    // (attack intent). Was dead defense.all + meleeBonus derived writes.
    return [
      ...this._buildAllDefensesIntentEffects(actor, powerItem, { icon, duration, amount: bonus }),
      this._buildIntentEffect(actor, powerItem, {
        labelSuffix: `(+${bonus} attack)`,
        icon,
        duration,
        category: 'attack',
        target: 'all',
        amount: bonus,
        effectType: 'enhancement'
      })
    ];
  }

  /**
   * Build Force Weapon effect (bonus to weapon attacks)
   * @private
   */
  static _buildForceWeaponEffect(actor, powerItem, rollTotal) {
    const bonus = this._extractBonusValue(powerItem.system.dcChart, rollTotal);

    if (bonus <= 0) {
      return [];
    }

    const duration = this._parseDuration(powerItem.system.duration);

    // DEFERRED (Phase 3A, pending source verification): the canonical Force Weapon
    // rules text is not present in the available sourcebooks, so mapping it to
    // attack-only, damage-only, or attack+damage would be speculative. Left on its
    // original (nonfunctional) system.derived.weaponBonus write — which no reader
    // consumes — until the originating sourcebook is available. Do NOT infer a
    // mapping. See docs/audits/effects-modifier-derived-audit.md.
    return [{
      label: `${powerItem.name} (+${bonus})`,
      icon: powerItem.img || 'icons/svg/melee.svg',
      origin: powerItem.uuid,
      disabled: false,
      transfer: false,
      duration: duration,
      changes: [
        {
          key: 'system.derived.weaponBonus',
          mode: 2,
          value: bonus.toString(),
          priority: 20
        }
      ],
      flags: {
        swse: {
          effectType: 'weaponEnhancement'
        }
      }
    }];
  }

  /**
   * Build Force Strike effect
   * @private
   */
  static _buildForceStrikeEffect(actor, powerItem, rollTotal) {
    const bonus = this._extractBonusValue(powerItem.system.dcChart, rollTotal);

    if (bonus <= 0) {
      return [];
    }

    // Phase 3A: Force Strike damage bonus via the ModifierEngine damage intent.
    return [
      this._buildIntentEffect(actor, powerItem, {
        labelSuffix: `(+${bonus} damage)`,
        icon: powerItem.img || 'icons/svg/melee.svg',
        duration: { type: 'turns', duration: 1 },
        category: 'damage',
        target: 'all',
        amount: bonus,
        effectType: 'damageBonus'
      })
    ];
  }

  /**
   * Build Valor effect (increases defense and attack rolls)
   * @private
   */
  static _buildValorEffect(actor, powerItem, rollTotal) {
    const bonus = this._extractBonusValue(powerItem.system.dcChart, rollTotal);

    if (bonus <= 0) {
      return [];
    }

    const duration = this._parseDuration(powerItem.system.duration);
    const icon = powerItem.img || 'icons/svg/aura.svg';

    // Phase 3A: +X to all defenses (defense intents) and to attacks (attack intent).
    // Was dead defense.all + attackBonus derived writes.
    return [
      ...this._buildAllDefensesIntentEffects(actor, powerItem, { icon, duration, amount: bonus }),
      this._buildIntentEffect(actor, powerItem, {
        labelSuffix: `(+${bonus} attack)`,
        icon,
        duration,
        category: 'attack',
        target: 'all',
        amount: bonus,
        effectType: 'enhancement'
      })
    ];
  }

  /**
   * Build debuff effect (blind, fear, slow, stagger, malacia)
   * @private
   */
  static _buildDebuffEffect(actor, powerItem, rollTotal) {
    // Debuff effects typically target enemies, not the caster
    // Could track debuff immunity if the power grants it
    return [];
  }

  /**
   * Build immobilize effect (force grip, force thrust)
   * @private
   */
  static _buildImmobilizeEffect(actor, powerItem, rollTotal) {
    // Immobilize effects typically target enemies
    // Could apply to caster if they're using it on themselves
    return [];
  }

  /**
   * Build Cloak effect (stealth bonus)
   * @private
   */
  static _buildCloakEffect(actor, powerItem, rollTotal) {
    const bonus = this._extractBonusValue(powerItem.system.dcChart, rollTotal);

    if (bonus <= 0) {
      return [];
    }

    const duration = this._parseDuration(powerItem.system.duration);

    // Phase 3A: Cloak stealth bonus via the ModifierEngine skill intent (skill.stealth).
    return [
      this._buildIntentEffect(actor, powerItem, {
        labelSuffix: `(+${bonus} stealth)`,
        icon: powerItem.img || 'icons/svg/invisibility.svg',
        duration,
        category: 'skill',
        target: 'stealth',
        amount: bonus,
        effectType: 'stealth'
      })
    ];
  }

  /**
   * Build Levitate effect (movement bonus)
   * @private
   */
  static _buildLevitateEffect(actor, powerItem, rollTotal) {
    // Levitate grants movement capability, hard to model as numeric effect
    // Could track as a movement modifier if needed
    return [];
  }

  /**
   * Build Move Object effect
   * @private
   */
  static _buildMoveObjectEffect(actor, powerItem, rollTotal) {
    // Move Object is telekinesis, not a persistent effect on caster
    return [];
  }

  /**
   * Build healing effect
   * @private
   */
  static _buildHealingEffect(actor, powerItem, rollTotal) {
    // Healing powers don't apply persistent effects
    // They heal HP when used
    return [];
  }

  /**
   * Build sense effect (force sense, force track, farseeing)
   * @private
   */
  static _buildSenseEffect(actor, powerItem, rollTotal) {
    // Sense powers grant awareness, not mechanical bonuses
    // Could apply a visual indicator or modifier flag
    const duration = this._parseDuration(powerItem.system.duration);

    return [{
      label: `${powerItem.name} (active)`,
      icon: powerItem.img || 'icons/svg/vision.svg',
      origin: powerItem.uuid,
      disabled: false,
      transfer: false,
      duration: duration,
      changes: [],
      flags: {
        swse: {
          effectType: 'senseAbility',
          powerName: powerItem.name
        }
      }
    }];
  }

  /**
   * Generic defense effect builder for other powers
   * @private
   */
  static _buildGenericDefenseEffect(actor, powerItem, rollTotal) {
    // For powers without specific handlers
    return [];
  }

  /**
   * Extract Shield Rating value from dcChart
   * @private
   */
  static _extractShieldRatingFromChart(dcChart, rollTotal) {
    if (!Array.isArray(dcChart)) {
      return 0;
    }

    let bestValue = 0;
    for (const entry of dcChart) {
      if (rollTotal >= entry.dc) {
        // Extract SR value from description like "You gain a Shield Rating (SR) of 5"
        const match = entry.description?.match(/SR\) of (\d+)/);
        if (match) {
          bestValue = parseInt(match[1], 10);
        }
      }
    }
    return bestValue;
  }

  /**
   * Extract DR value from dcChart
   * @private
   */
  static _extractDRFromChart(dcChart, rollTotal) {
    if (!Array.isArray(dcChart)) {
      return 0;
    }

    let bestValue = 0;
    for (const entry of dcChart) {
      if (rollTotal >= entry.dc) {
        // Extract DR value like "DR 5", "DR 10", etc
        const match = entry.description?.match(/DR (\d+)/);
        if (match) {
          bestValue = parseInt(match[1], 10);
        }
      }
    }
    return bestValue;
  }

  /**
   * Extract a numeric value from chart description
   * @private
   */
  static _extractValueFromChart(dcChart, rollTotal, pattern) {
    if (!Array.isArray(dcChart)) {
      return 0;
    }

    let bestValue = 0;
    for (const entry of dcChart) {
      if (rollTotal >= entry.dc) {
        // Try to extract +X value
        const match = entry.description?.match(/\+(\d+)/);
        if (match) {
          bestValue = parseInt(match[1], 10);
        }
      }
    }
    return bestValue;
  }

  /**
   * Extract bonus value from dcChart (generic numeric bonus)
   * @private
   */
  static _extractBonusValue(dcChart, rollTotal) {
    if (!Array.isArray(dcChart)) {
      return 0;
    }

    let bestValue = 0;
    for (const entry of dcChart) {
      if (rollTotal >= entry.dc) {
        // Try various patterns: +X, X points, X bonus, etc
        let match = entry.description?.match(/\+(\d+)/);
        if (match) {
          bestValue = parseInt(match[1], 10);
          continue;
        }

        // Try "Xd" pattern (like in damage)
        match = entry.description?.match(/(\d+)d\d+/);
        if (match) {
          bestValue = parseInt(match[1], 10);
          continue;
        }

        // Try "X damage" or "X bonus"
        match = entry.description?.match(/(\d+)\s+(damage|bonus|penalty)/i);
        if (match) {
          bestValue = parseInt(match[1], 10);
        }
      }
    }
    return bestValue;
  }

  /**
   * Extract defense bonus from dcChart
   * @private
   */
  static _extractDefenseBonusFromChart(dcChart, rollTotal) {
    if (!Array.isArray(dcChart)) {
      return 0;
    }

    let bestValue = 0;
    for (const entry of dcChart) {
      if (rollTotal >= entry.dc) {
        // Extract +X Defense from description
        const match = entry.description?.match(/\+(\d+) to one Defense/);
        if (match) {
          bestValue = parseInt(match[1], 10);
        }
      }
    }
    return bestValue;
  }

  /**
   * Parse duration string into Foundry duration format
   * @private
   */
  static _parseDuration(durationStr) {
    if (!durationStr) {
      return {};
    }

    const lower = durationStr.toLowerCase();

    // Instantaneous effects
    if (lower.includes('instantaneous') || lower.includes('one action')) {
      return { type: 'turns', duration: 1 };
    }

    // Until beginning of next turn
    if (lower.includes('until beginning of next turn')) {
      return { type: 'turns', duration: 1 };
    }

    // Until end of next turn
    if (lower.includes('until end of next turn') || lower.includes('until end of your next turn')) {
      return { type: 'turns', duration: 2 };
    }

    // Concentration (maintainable)
    if (lower.includes('concentration') || lower.includes('maintain')) {
      return { type: 'turns', duration: 1 }; // Starts at 1, can be maintained
    }

    // Default to 1 round
    return { type: 'turns', duration: 1 };
  }

  /**
   * Remove effects for a force power when it ends
   * @param {Actor} actor - The actor
   * @param {Item} powerItem - The force power item
   * @returns {Promise<Array>} Deleted effect IDs
   */
  static async removePowerEffects(actor, powerItem) {
    if (!actor || !powerItem) {
      return [];
    }

    const ids = actor.effects
      .filter(e => getSwseFlag(e, 'forcePowerEffect')?.powerItemId === powerItem.id)
      .map(e => e.id);

    if (!ids.length) {
      return [];
    }

    try {
      // Delete effects via ActorEngine (SOVEREIGNTY)
      await ActorEngine.deleteActiveEffects(actor, ids, { source: 'force-power-effects' });
      SWSELogger.log(`SWSE | Force Power Effects | Removed ${ids.length} effect(s) for ${powerItem.name}`);
      return ids;
    } catch (err) {
      SWSELogger.warn(`SWSE | Force Power Effects | Failed to remove effects for ${powerItem.name}:`, err);
      return [];
    }
  }

  /**
   * Check if a power has active effects
   * @param {Actor} actor - The actor
   * @param {Item} powerItem - The force power item
   * @returns {Array} Active effects for this power
   */
  static getPowerActiveEffects(actor, powerItem) {
    if (!actor || !powerItem) {
      return [];
    }

    return actor.effects.filter(e =>
      getSwseFlag(e, 'forcePowerEffect')?.powerItemId === powerItem.id
    );
  }
}
