/**
 * Upgrade Rules Engine - Contract Restoration
 *
 * Pure validation and rules engine for item upgrades.
 * No UI side-effects. No implicit mutations.
 * Returns structured validation objects only.
 *
 * NOTE: Full implementation pending. Currently provides safe stubs.
 */

export class UpgradeRulesEngine {
  /**
   * Get the base number of upgrade slots available for an item
   * @param {Object} item - The item to check
   * @returns {number} Number of upgrade slots (default: 0)
   */
  static getBaseUpgradeSlots(item) {
    if (!item || !item.system) {
      return 0;
    }

    // Check for explicit slot definition
    const explicit = Number(item.system.upgradeSlots ?? 0);
    if (explicit > 0) {
      return explicit;
    }

    // Check for item type defaults
    const type = item.type;
    switch (type) {
      case 'weapon':
        // Most weapons have at least 1-2 slots
        return 2;
      case 'armor':
        // Armor typically has 3-4 slots
        return 3;
      default:
        return 0;
    }
  }

  /**
   * Check if armor is of powered type
   * PHASE 3: Uses structured flag (isPowered) instead of name-based detection
   * @param {Object} item - The item to check
   * @returns {boolean} True if armor is powered
   */
  static isPoweredArmor(item) {
    if (!item || item.type !== 'armor' || !item.system) {
      return false;
    }

    // PHASE 3: Structured isPowered flag is authoritative
    if (item.system.isPowered === true) {
      return true;
    }

    // FALLBACK: Maintain backward compatibility with legacy name-based detection (temporary bridge)
    // This fallback can be removed in Phase 4 when all items are migrated
    const name = (item.name || '').toLowerCase();
    const powerKeywords = ['power', 'powered', 'motorized', 'reinforced'];
    return powerKeywords.some((kw) => name.includes(kw));
  }

  /**
   * Get effective upgrade restrictions for an item
   * @param {Object} item - The item to check
   * @returns {Object} Restriction info: { hasRestriction, restrictionType, description }
   */
  static getEffectiveRestriction(item) {
    if (!item || !item.system) {
      return { hasRestriction: false, restrictionType: null, description: null };
    }

    const restriction = item.system.restriction || item.system.upgradeRestriction;

    if (restriction) {
      return {
        hasRestriction: true,
        restrictionType: restriction,
        description: this.#describeRestriction(restriction)
      };
    }

    return { hasRestriction: false, restrictionType: null, description: null };
  }

  /**
   * Validate upgrade installation
   * @param {Object} item - The item to upgrade
   * @param {Object} upgrade - The upgrade to install
   * @param {Object} actor - The actor performing the upgrade (if owned)
   * @returns {Object} Validation result: { valid, reason, cost, slotsNeeded }
   */
  static validateUpgradeInstallation(item, upgrade, actor) {
    // Basic contract: always return structured validation result
    const baseResult = {
      valid: true,
      reason: '',
      cost: 0,
      slotsNeeded: 1
    };

    // Null/missing checks
    if (!item || !upgrade) {
      return {
        ...baseResult,
        valid: false,
        reason: 'Item or upgrade missing'
      };
    }

    // Extract values
    const upgradeCost = Number(upgrade.system?.cost ?? 0);
    const slotsNeeded = Number(upgrade.system?.upgradeSlots ?? 1);
    const totalSlots = this.getBaseUpgradeSlots(item);
    const usedSlots = this.#getUsedSlots(item);
    const availableSlots = totalSlots - usedSlots;

    // Check slot availability
    if (slotsNeeded > availableSlots) {
      return {
        ...baseResult,
        valid: false,
        reason: `Not enough upgrade slots. Need ${slotsNeeded}, have ${availableSlots}.`,
        cost: upgradeCost,
        slotsNeeded
      };
    }

    // Check actor credits if actor provided
    if (actor && actor.system) {
      const credits = Number(actor.system.credits ?? 0);
      if (upgradeCost > credits) {
        return {
          ...baseResult,
          valid: false,
          reason: `Insufficient credits. Need ${upgradeCost}, have ${credits}.`,
          cost: upgradeCost,
          slotsNeeded
        };
      }
    }

    // TODO: Implement upgrade restriction checking when rules are finalized
    // This would check things like: weapon type compatibility, armor class compatibility, etc.

    return {
      valid: true,
      reason: '',
      cost: upgradeCost,
      slotsNeeded
    };
  }

  /**
   * Get the number of upgrade slots currently used
   * @private
   */
  static #getUsedSlots(item) {
    if (!item || !item.system) {
      return 0;
    }

    const installed = item.system.installedUpgrades ?? [];
    return installed.reduce((sum, upgrade) => sum + Number(upgrade.slotsUsed ?? 1), 0);
  }

  /**
   * Describe a restriction type in human-readable form
   * @private
   */
  static #describeRestriction(restrictionType) {
    const descriptions = {
      stunOrIon: 'Requires Stun or Ion setting',
      stun: 'Requires Stun setting',
      advancedMeleeOrSimpleMelee: 'Advanced Melee or Simple Melee only',
      preLegacyPowered: 'Pre-Legacy powered weapons only',
      blaster: 'Blaster weapons only',
      simpleMelee: 'Simple Melee weapons only',
      fortBonus: 'Requires Fortitude bonus',
      rangedEnergy: 'Ranged Energy weapons only',
      meleeSlashingPiercing: 'Melee Slashing/Piercing only',
      meleeNonEnergy: 'Melee non-Energy only',
      rangedStun: 'Ranged with Stun only'
    };

    return descriptions[restrictionType] || restrictionType;
  }
}
