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

export class ForcePowerEffectsEngine {
  /**
   * Apply effects for a force power based on roll result
   * @param {Actor} actor - The actor using the force power
   * @param {Item} powerItem - The force power item
   * @param {number} rollTotal - The total of the Use the Force roll
   * @returns {Promise<Array>} Created ActiveEffect IDs
   */
  static async applyPowerEffect(actor, powerItem, rollTotal) {
    if (!actor || !powerItem) {
      return [];
    }

    const powerName = powerItem.name;

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
      changes: [
        {
          key: 'system.derived.damageReduction.energy',
          mode: 2, // Override
          value: drValue.toString(),
          priority: 20
        }
      ],
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

    return [{
      label: `${powerItem.name} (+${dtBonus} DT)`,
      icon: powerItem.img || 'icons/svg/shield.svg',
      origin: powerItem.uuid,
      disabled: false,
      transfer: false,
      duration: { type: 'turns', duration: 1 }, // Instantaneous = 1 turn in Foundry
      changes: [
        {
          key: 'system.derived.damageThreshold',
          mode: 2, // Add
          value: dtBonus.toString(),
          priority: 20
        }
      ],
      flags: {
        swse: {
          effectType: 'damageThreshold',
          dtBonus: dtBonus
        }
      }
    }];
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

    return [{
      label: `${powerItem.name} (+${defenseBonus} Defense)`,
      icon: powerItem.img || 'icons/svg/shield.svg',
      origin: powerItem.uuid,
      disabled: false,
      transfer: false,
      duration: duration,
      changes: [
        {
          key: 'system.derived.defense.all',
          mode: 2, // Add
          value: defenseBonus.toString(),
          priority: 20
        }
      ],
      flags: {
        swse: {
          effectType: 'defenseBonus',
          bonusValue: defenseBonus
        }
      }
    }];
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

    return [{
      label: `${powerItem.name} (+${defenseBonus})`,
      icon: powerItem.img || 'icons/svg/shield.svg',
      origin: powerItem.uuid,
      disabled: false,
      transfer: false,
      duration: duration,
      changes: [
        {
          key: 'system.derived.defense.all',
          mode: 2, // Add
          value: defenseBonus.toString(),
          priority: 20
        }
      ],
      flags: {
        swse: {
          effectType: 'defenseBonus'
        }
      }
    }];
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
      changes: [
        {
          key: 'system.derived.damageReduction.energy',
          mode: 2,
          value: drValue.toString(),
          priority: 20
        }
      ],
      flags: {
        swse: {
          effectType: 'energyNegation'
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
    let label, effectKey;

    if (powerName.includes('prescience')) {
      label = `${powerItem.name} (+${bonus} insight)`;
      effectKey = 'system.derived.insight';
    } else if (powerName.includes('surge')) {
      label = `${powerItem.name} (+${bonus} damage)`;
      effectKey = 'system.derived.damageBonus';
    } else {
      label = `${powerItem.name} (+${bonus})`;
      effectKey = 'system.derived.bonus';
    }

    return [{
      label: label,
      icon: powerItem.img || 'icons/svg/magic.svg',
      origin: powerItem.uuid,
      disabled: false,
      transfer: false,
      duration: duration,
      changes: [
        {
          key: effectKey,
          mode: 2, // Add
          value: bonus.toString(),
          priority: 20
        }
      ],
      flags: {
        swse: {
          effectType: 'enhancement'
        }
      }
    }];
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

    return [{
      label: `${powerItem.name} (+${bonus})`,
      icon: powerItem.img || 'icons/svg/combat.svg',
      origin: powerItem.uuid,
      disabled: false,
      transfer: false,
      duration: duration,
      changes: [
        {
          key: 'system.derived.defense.all',
          mode: 2,
          value: bonus.toString(),
          priority: 20
        },
        {
          key: 'system.derived.meleeBonus',
          mode: 2,
          value: bonus.toString(),
          priority: 20
        }
      ],
      flags: {
        swse: {
          effectType: 'enhancement'
        }
      }
    }];
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

    return [{
      label: `${powerItem.name} (+${bonus} damage)`,
      icon: powerItem.img || 'icons/svg/melee.svg',
      origin: powerItem.uuid,
      disabled: false,
      transfer: false,
      duration: { type: 'turns', duration: 1 },
      changes: [
        {
          key: 'system.derived.damageBonus',
          mode: 2,
          value: bonus.toString(),
          priority: 20
        }
      ],
      flags: {
        swse: {
          effectType: 'damageBonus'
        }
      }
    }];
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

    return [{
      label: `${powerItem.name} (+${bonus})`,
      icon: powerItem.img || 'icons/svg/aura.svg',
      origin: powerItem.uuid,
      disabled: false,
      transfer: false,
      duration: duration,
      changes: [
        {
          key: 'system.derived.defense.all',
          mode: 2,
          value: bonus.toString(),
          priority: 20
        },
        {
          key: 'system.derived.attackBonus',
          mode: 2,
          value: bonus.toString(),
          priority: 20
        }
      ],
      flags: {
        swse: {
          effectType: 'enhancement'
        }
      }
    }];
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

    return [{
      label: `${powerItem.name} (+${bonus} stealth)`,
      icon: powerItem.img || 'icons/svg/invisibility.svg',
      origin: powerItem.uuid,
      disabled: false,
      transfer: false,
      duration: duration,
      changes: [
        {
          key: 'system.derived.stealthBonus',
          mode: 2,
          value: bonus.toString(),
          priority: 20
        }
      ],
      flags: {
        swse: {
          effectType: 'stealth'
        }
      }
    }];
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
