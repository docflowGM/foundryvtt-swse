/**
 * Force Power Effects Engine
 *
 * Applies and manages ActiveEffect documents for Force Powers
 * Handles duration tracking and effect expiration
 *
 * Provenance tracking:
 * - Each created ActiveEffect gets flags.swse.forcePowerEffect = { powerItemId, powerName, rollTotal }
 * - On power deletion, only effects with matching provenance are removed
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

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
          swse: {
            ...(e.flags?.swse || {}),
            forcePowerEffect: {
              powerItemId: powerItem.id,
              powerName: powerName,
              rollTotal: rollTotal
            }
          }
        }
      }));

      // Create the effects on the actor
      const createdEffects = await actor.createEmbeddedDocuments('ActiveEffect', effectsWithProvenance);

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

    // Check for specific power handlers
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

    // Generic handler for other defense/control powers
    if (system.tags?.includes('defense') || system.tags?.includes('control')) {
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
   * Generic defense effect builder for other powers
   * @private
   */
  static _buildGenericDefenseEffect(actor, powerItem, rollTotal) {
    // For now, return empty - can be extended with more powers
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
      .filter(e => e.getFlag?.('swse', 'forcePowerEffect')?.powerItemId === powerItem.id)
      .map(e => e.id);

    if (!ids.length) {
      return [];
    }

    try {
      await actor.deleteEmbeddedDocuments('ActiveEffect', ids);
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
      e.getFlag?.('swse', 'forcePowerEffect')?.powerItemId === powerItem.id
    );
  }
}
