/**
 * Armor Upgrade System — Phase 5 Integration
 *
 * Defines armor upgrade types and their modifier effects.
 * Upgrades are installed on armor items and register modifiers via ModifierEngine.
 *
 * Architecture:
 * - Upgrades are stored in armor.system.installedUpgrades[]
 * - Each upgrade has a modifiers object defining its effects
 * - ModifierEngine._getItemModifiers() reads installedUpgrades and registers modifiers
 * - Modifiers flow through the standard V2 pipeline
 */

export class ArmorUpgradeSystem {
  /**
   * Upgrade type definitions with their typical modifier profiles
   * These are templates; actual upgrades should match this structure
   */
  static UPGRADE_TYPES = {
    // Defensive upgrades
    'reinforced-plating': {
      name: 'Reinforced Plating',
      description: 'Additional layered armor plating',
      slotsRequired: 1,
      modifiers: {
        reflexBonus: 1,
        fortBonus: 0,
        acpModifier: -1, // Slightly increases ACP
        speedModifier: 0
      }
    },

    'articulated-frame': {
      name: 'Articulated Frame',
      description: 'Improved joint articulation',
      slotsRequired: 1,
      modifiers: {
        reflexBonus: 0,
        fortBonus: 0,
        acpModifier: 1, // Reduces ACP penalty
        speedModifier: 1 // Improves speed
      }
    },

    'energy-dampening': {
      name: 'Energy Dampening',
      description: 'Energy absorption system',
      slotsRequired: 2,
      modifiers: {
        reflexBonus: 2,
        fortBonus: 1,
        acpModifier: 0,
        speedModifier: -1 // Slight speed penalty
      }
    },

    'mobility-enhancement': {
      name: 'Mobility Enhancement',
      description: 'Actuator upgrades for movement',
      slotsRequired: 1,
      modifiers: {
        reflexBonus: 0,
        fortBonus: 0,
        acpModifier: 2, // Significantly reduces ACP
        speedModifier: 2 // Improves speed
      }
    },

    'fortified-structure': {
      name: 'Fortified Structure',
      description: 'Reinforced structural integrity',
      slotsRequired: 1,
      modifiers: {
        reflexBonus: 0,
        fortBonus: 2,
        acpModifier: 0,
        speedModifier: -1
      }
    }
  };

  /**
   * Validate an upgrade object structure
   * @param {Object} upgrade - Upgrade to validate
   * @returns {Object} { valid: boolean, errors: string[] }
   */
  static validateUpgrade(upgrade) {
    const errors = [];

    if (!upgrade || typeof upgrade !== 'object') {
      errors.push('Upgrade must be an object');
      return { valid: false, errors };
    }

    // Required fields
    if (!upgrade.id || typeof upgrade.id !== 'string') {
      errors.push('Upgrade must have a valid id (string)');
    }

    if (!upgrade.name || typeof upgrade.name !== 'string') {
      errors.push('Upgrade must have a name (string)');
    }

    // Modifiers object
    if (upgrade.modifiers) {
      if (typeof upgrade.modifiers !== 'object') {
        errors.push('Upgrade.modifiers must be an object');
      } else {
        const validModifiers = ['reflexBonus', 'fortBonus', 'acpModifier', 'speedModifier'];
        for (const key of Object.keys(upgrade.modifiers)) {
          if (!validModifiers.includes(key)) {
            errors.push(`Unknown modifier type: ${key}`);
          }
          if (typeof upgrade.modifiers[key] !== 'number') {
            errors.push(`Modifier ${key} must be a number`);
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Calculate total upgrade slot requirements for an armor
   * @param {Item} armorItem - Armor item with installed upgrades
   * @returns {number} Total slots used
   */
  static calculateSlotsUsed(armorItem) {
    const upgrades = armorItem?.system?.installedUpgrades || [];
    if (!Array.isArray(upgrades)) return 0;

    return upgrades.reduce((total, upgrade) => {
      return total + (upgrade.slotsUsed || 1);
    }, 0);
  }

  /**
   * Get available upgrade slots for an armor
   * @param {Item} armorItem - Armor item
   * @returns {number} Available slots
   */
  static getAvailableSlots(armorItem) {
    const totalSlots = armorItem?.system?.upgradeSlots || 0;
    const usedSlots = this.calculateSlotsUsed(armorItem);
    return Math.max(0, totalSlots - usedSlots);
  }

  /**
   * Install an upgrade on armor
   * @param {Item} armorItem - Armor to upgrade
   * @param {Object} upgradeDef - Upgrade definition
   * @returns {Promise<Object>} { success: boolean, reason?: string }
   */
  static async installUpgrade(armorItem, upgradeDef) {
    // Validate upgrade
    const validation = this.validateUpgrade(upgradeDef);
    if (!validation.valid) {
      return {
        success: false,
        reason: `Invalid upgrade: ${validation.errors.join(', ')}`
      };
    }

    // Check slot availability
    const availableSlots = this.getAvailableSlots(armorItem);
    const slotsNeeded = upgradeDef.slotsUsed || 1;

    if (availableSlots < slotsNeeded) {
      return {
        success: false,
        reason: `Insufficient upgrade slots (need ${slotsNeeded}, have ${availableSlots})`
      };
    }

    // Add upgrade to installed list
    try {
      const installed = armorItem.system.installedUpgrades || [];
      const updated = [...installed, upgradeDef];
      await armorItem.update({ 'system.installedUpgrades': updated });
      return { success: true };
    } catch (err) {
      return {
        success: false,
        reason: `Failed to install upgrade: ${err.message}`
      };
    }
  }

  /**
   * Remove an upgrade from armor
   * @param {Item} armorItem - Armor to modify
   * @param {string} upgradeId - ID of upgrade to remove
   * @returns {Promise<Object>} { success: boolean, reason?: string }
   */
  static async removeUpgrade(armorItem, upgradeId) {
    try {
      const installed = armorItem.system.installedUpgrades || [];
      const updated = installed.filter(u => u.id !== upgradeId);
      await armorItem.update({ 'system.installedUpgrades': updated });
      return { success: true };
    } catch (err) {
      return {
        success: false,
        reason: `Failed to remove upgrade: ${err.message}`
      };
    }
  }

  /**
   * Get all installed upgrades on an armor
   * @param {Item} armorItem - Armor item
   * @returns {Object[]} Array of installed upgrades
   */
  static getInstalledUpgrades(armorItem) {
    return armorItem?.system?.installedUpgrades || [];
  }

  /**
   * Calculate cumulative modifier effects from all upgrades
   * @param {Item} armorItem - Armor item
   * @returns {Object} Cumulative modifiers
   */
  static calculateCumulativeModifiers(armorItem) {
    const upgrades = this.getInstalledUpgrades(armorItem);
    const cumulative = {
      reflexBonus: 0,
      fortBonus: 0,
      acpModifier: 0,
      speedModifier: 0
    };

    for (const upgrade of upgrades) {
      if (!upgrade.modifiers) continue;
      cumulative.reflexBonus += upgrade.modifiers.reflexBonus || 0;
      cumulative.fortBonus += upgrade.modifiers.fortBonus || 0;
      cumulative.acpModifier += upgrade.modifiers.acpModifier || 0;
      cumulative.speedModifier += upgrade.modifiers.speedModifier || 0;
    }

    return cumulative;
  }

  /**
   * Generate a summary of armor upgrades
   * @param {Item} armorItem - Armor item
   * @returns {string} Formatted summary
   */
  static generateUpgradeSummary(armorItem) {
    const upgrades = this.getInstalledUpgrades(armorItem);
    const cumulative = this.calculateCumulativeModifiers(armorItem);
    const available = this.getAvailableSlots(armorItem);

    const summary = [];
    summary.push(`=== ${armorItem.name} Upgrades ===`);
    summary.push(`Slots Used: ${this.calculateSlotsUsed(armorItem)}/${armorItem.system.upgradeSlots}`);
    summary.push(`Available: ${available}`);
    summary.push('');

    if (upgrades.length === 0) {
      summary.push('No upgrades installed');
    } else {
      summary.push('Installed Upgrades:');
      for (const upgrade of upgrades) {
        summary.push(`  - ${upgrade.name} (${upgrade.slotsUsed || 1} slot${(upgrade.slotsUsed || 1) > 1 ? 's' : ''})`);
        if (upgrade.modifiers) {
          for (const [key, value] of Object.entries(upgrade.modifiers)) {
            if (value !== 0) {
              summary.push(`    ${key}: ${value > 0 ? '+' : ''}${value}`);
            }
          }
        }
      }
    }

    summary.push('');
    summary.push('Cumulative Upgrade Effects:');
    summary.push(`  Reflex Bonus: ${cumulative.reflexBonus > 0 ? '+' : ''}${cumulative.reflexBonus}`);
    summary.push(`  Fort Bonus: ${cumulative.fortBonus > 0 ? '+' : ''}${cumulative.fortBonus}`);
    summary.push(`  ACP Modifier: ${cumulative.acpModifier > 0 ? '+' : ''}${cumulative.acpModifier}`);
    summary.push(`  Speed Modifier: ${cumulative.speedModifier > 0 ? '+' : ''}${cumulative.speedModifier}`);

    return summary.join('\n');
  }
}

export default ArmorUpgradeSystem;
