/**
 * SWSE Upgrade Rules Engine
 * Comprehensive implementation of all upgrade slot rules from SWSE.
 * Handles:
 * - Basic upgrade slot allocation
 * - Powered Armor detection
 * - Stripping mechanics for weapons and armor
 * - Equipment size increases
 * - Installation time and Mechanics DC calculations
 * - Upgrade restrictions and conflicts
 */

export class UpgradeRulesEngine {

  /**
   * Equipment size categories with their progression order.
   * Used for equipment size calculations.
   */
  static EQUIPMENT_SIZES = [
    "fine",
    "diminutive",
    "tiny",
    "small",
    "medium",
    "large",
    "huge",
    "gargantuan",
    "colossal"
  ];

  /**
   * Weapon sizes represent how bulky a weapon is compared to others.
   * A weapon is two categories smaller than its Object Size.
   */
  static WEAPON_SIZES = [
    "tiny",
    "small",
    "medium",
    "large",
    "huge"
  ];

  /**
   * Armor weight categories.
   * Armor doesn't increase in size but in weight class when enlarged.
   */
  static ARMOR_WEIGHTS = [
    "light",
    "medium",
    "heavy"
  ];

  /**
   * Damage dice progression for weapon stripping.
   * When a weapon is stripped of damage, its dice reduce one step.
   */
  static DAMAGE_DICE_PROGRESSION = [
    "d2",
    "d3",
    "d4",
    "d6",
    "d8",
    "d10",
    "d12"
  ];

  /**
   * Range progression for weapon stripping.
   * When a weapon is stripped of range, it reduces one step.
   */
  static RANGE_PROGRESSION = [
    "melee",
    "thrown",
    "pistol",
    "rifle",
    "heavy"
  ];

  /**
   * Restriction levels for equipment and upgrades.
   */
  static RESTRICTIONS = {
    COMMON: "common",
    LICENSED: "licensed",
    RESTRICTED: "restricted",
    MILITARY: "military",
    ILLEGAL: "illegal"
  };

  /* ============================================================== */
  /* BASIC UPGRADE SLOTS                                            */
  /* ============================================================== */

  /**
   * Get the base number of upgrade slots for an equipment item.
   *
   * Rules:
   * - Most equipment has 1 upgrade slot
   * - Powered armor has 2 upgrade slots
   * - Some specific items may have more (rare)
   *
   * @param {Item} item - The equipment item
   * @returns {number} Base upgrade slots
   */
  static getBaseUpgradeSlots(item) {
    const system = item.system;

    // If explicitly set, use that value
    if (system.upgradeSlots !== undefined && system.upgradeSlots > 0) {
      return Number(system.upgradeSlots);
    }

    // Check if item is Powered Armor
    if (item.type === "armor" && this.isPoweredArmor(item)) {
      return 2;
    }

    // Default to 1 slot for all equipment
    return 1;
  }

  /**
   * Determine if armor is "Powered Armor".
   *
   * Rules:
   * - Armor is "Powered Armor" if it's specifically described as such
   * - OR if the word "power" (or variant) appears in the armor's name
   *
   * @param {Item} armor - The armor item
   * @returns {boolean} True if this is powered armor
   */
  static isPoweredArmor(armor) {
    if (armor.type !== "armor") return false;

    // Check name for "power" variant
    const name = (armor.name || "").toLowerCase();
    const isPoweredByName = /power(ed)?/i.test(name);

    // Check for explicit powered armor flag
    const isPoweredExplicit = armor.system.isPoweredArmor === true;

    // Check description for "powered armor" text
    const description = (armor.system.description || "").toLowerCase();
    const isPoweredInDesc = description.includes("powered armor");

    return isPoweredByName || isPoweredExplicit || isPoweredInDesc;
  }

  /* ============================================================== */
  /* EQUIPMENT SIZE SYSTEM                                          */
  /* ============================================================== */

  /**
   * Determine the size category of an equipment item.
   * Different calculation for General Equipment, Weapons, and Armor.
   *
   * @param {Item} item - The equipment item
   * @returns {string} Size category
   */
  static getEquipmentSize(item) {
    if (item.type === "weapon") {
      return this.getWeaponSize(item);
    } else if (item.type === "armor") {
      return this.getArmorSize(item);
    } else {
      return this.getGeneralEquipmentSize(item);
    }
  }

  /**
   * Get weapon size based on its listed size property.
   * Weapon size represents how bulky it is compared to other weapons.
   * A weapon is two categories smaller than its Object Size.
   *
   * @param {Item} weapon - The weapon item
   * @returns {string} Weapon size
   */
  static getWeaponSize(weapon) {
    if (weapon.system.size) {
      return weapon.system.size.toLowerCase();
    }
    // Default weapon size
    return "small";
  }

  /**
   * Get armor size.
   * Armor is the same size as the creature it protects.
   * Default: Medium (human-sized)
   *
   * @param {Item} armor - The armor item
   * @returns {string} Armor size
   */
  static getArmorSize(armor) {
    if (armor.system.size) {
      return armor.system.size.toLowerCase();
    }
    // Default to Medium for human-sized armor
    return "medium";
  }

  /**
   * Get general equipment size based on weight.
   *
   * Weight-to-Size mapping:
   * - Less than 1 kg: Fine
   * - 1.0-1.9 kg: Diminutive
   * - 2.0-4.9 kg: Tiny
   * - 5.0-49 kg: Small
   * - 50-499 kg: Medium
   * - 500-4,999 kg: Large
   * - 5,000-49,999 kg: Huge
   * - 50,000-499,999 kg: Gargantuan
   * - 500,000 kg or more: Colossal
   *
   * @param {Item} equipment - The equipment item
   * @returns {string} Size category
   */
  static getGeneralEquipmentSize(equipment) {
    // Check for explicit size first
    if (equipment.system.size) {
      return equipment.system.size.toLowerCase();
    }

    const weight = Number(equipment.system.weight ?? 0);

    if (weight < 1) return "fine";
    if (weight < 2) return "diminutive";
    if (weight < 5) return "tiny";
    if (weight < 50) return "small";
    if (weight < 500) return "medium";
    if (weight < 5000) return "large";
    if (weight < 50000) return "huge";
    if (weight < 500000) return "gargantuan";
    return "colossal";
  }

  /**
   * Increase equipment size by one step to gain an upgrade slot.
   *
   * Rules:
   * - Increases size by one step, doubles cost
   * - No effect on equipment effectiveness
   * - For armor: increases weight class instead (Light->Medium->Heavy)
   * - Can only be done once per item
   *
   * @param {Item} item - The equipment item
   * @returns {Object} Object with: canIncrease {boolean}, newSize {string}, newCost {number}, newWeight {string (armor only)}
   */
  static calculateSizeIncrease(item) {
    // Check if already increased
    if (item.system.sizeIncreaseApplied === true) {
      return {
        canIncrease: false,
        reason: "This item has already had its size increased."
      };
    }

    const currentCost = Number(item.system.cost ?? 0);
    const newCost = currentCost * 2;

    if (item.type === "armor") {
      // Armor increases in weight class, not size
      const weights = this.ARMOR_WEIGHTS;
      const currentWeight = item.system.armorType?.toLowerCase() ?? "light";
      const currentIndex = weights.indexOf(currentWeight);

      if (currentIndex === -1 || currentIndex >= weights.length - 1) {
        return {
          canIncrease: false,
          reason: "Heavy armor cannot be enlarged further."
        };
      }

      return {
        canIncrease: true,
        newWeight: weights[currentIndex + 1],
        newCost,
        newSlots: 1
      };
    } else {
      // Weapons and general equipment increase in size
      const sizes = this.EQUIPMENT_SIZES;
      const currentSize = this.getEquipmentSize(item);
      const currentIndex = sizes.indexOf(currentSize.toLowerCase());

      if (currentIndex === -1 || currentIndex >= sizes.length - 1) {
        return {
          canIncrease: false,
          reason: "This item cannot be enlarged further."
        };
      }

      return {
        canIncrease: true,
        newSize: sizes[currentIndex + 1],
        newCost,
        newSlots: 1
      };
    }
  }

  /* ============================================================== */
  /* STRIPPING MECHANICS                                            */
  /* ============================================================== */

  /**
   * Strip a weapon to gain an upgrade slot.
   *
   * Rules:
   * - Takes 8 hours of work, DC 20 Mechanics check, 50% cost of base item
   * - On failure: item broken, must fix before stripping again
   * - Five stripping options for weapons: Damage, Range, Design, Stun, Autofire
   * - Can't use upgrade slots to enhance stripped areas
   *
   * @param {Item} weapon - The weapon item
   * @param {string} stripType - Type of strip: "damage", "range", "design", "stun", "autofire"
   * @returns {Object} Validation result with: valid {boolean}, newSlots {number}, effects {Object}, dc {number}, cost {number}, hoursRequired {number}
   */
  static stripWeapon(weapon, stripType) {
    if (weapon.type !== "weapon") {
      return {
        valid: false,
        reason: "Only weapons can be stripped."
      };
    }

    // Check what's already been stripped
    const stripped = weapon.system.strippedFeatures ?? {};

    const stripTypes = {
      damage: {
        label: "Damage",
        check: () => {
          if (stripped.damage) return "Damage already stripped from this weapon.";
          return null;
        },
        effect: () => this._stripWeaponDamage(weapon)
      },
      range: {
        label: "Range",
        check: () => {
          if (stripped.range) return "Range already stripped from this weapon.";
          const range = weapon.system.range?.toLowerCase() ?? "melee";
          if (range === "melee") return "Melee weapons cannot have range stripped.";
          return null;
        },
        effect: () => this._stripWeaponRange(weapon)
      },
      design: {
        label: "Design (Exotic)",
        check: () => {
          if (stripped.design) return "Design already stripped from this weapon.";
          // Check if already exotic
          if (weapon.system.properties?.includes("exotic")) {
            return "Weapon is already Exotic.";
          }
          return null;
        },
        effect: () => ({ exoticWeapon: true })
      },
      stun: {
        label: "Stun Setting",
        check: () => {
          if (stripped.stun) return "Stun setting already stripped.";
          if (!weapon.system.properties?.includes("stun")) {
            return "Weapon does not have a Stun setting.";
          }
          return null;
        },
        effect: () => ({ stunSettingRemoved: true })
      },
      autofire: {
        label: "Autofire",
        check: () => {
          if (stripped.autofire) return "Autofire already stripped.";
          if (!weapon.system.properties?.includes("autofire")) {
            return "Weapon does not have Autofire.";
          }
          return null;
        },
        effect: () => ({ autofireRemoved: true })
      }
    };

    const stripDef = stripTypes[stripType?.toLowerCase()];
    if (!stripDef) {
      return {
        valid: false,
        reason: `Unknown strip type: ${stripType}`
      };
    }

    // Validate the strip
    const error = stripDef.check();
    if (error) {
      return { valid: false, reason: error };
    }

    // Calculate costs
    const baseCost = Number(weapon.system.cost ?? 0);
    const stripCost = Math.ceil(baseCost * 0.5);

    return {
      valid: true,
      stripType,
      label: stripDef.label,
      effects: stripDef.effect(),
      dc: 20,
      cost: stripCost,
      hoursRequired: 8,
      newSlots: 1,
      note: "On failure, weapon is broken and must be repaired before attempting again."
    };
  }

  /**
   * Reduce weapon damage by one step.
   * d12->d10->d8->d6->d4->d3->d2
   *
   * @private
   * @param {Item} weapon - The weapon
   * @returns {Object} Effect details
   */
  static _stripWeaponDamage(weapon) {
    const damage = weapon.system.damage ?? "1d8";
    // Extract dice type from damage string (e.g., "3d10" -> "d10")
    const diceMatch = damage.match(/d(\d+)/);
    if (!diceMatch) {
      return { error: "Could not parse damage dice" };
    }

    const currentDice = Number(diceMatch[1]);
    const progression = [2, 3, 4, 6, 8, 10, 12];
    const currentIndex = progression.indexOf(currentDice);

    if (currentIndex <= 0) {
      return { error: "Damage cannot be stripped further." };
    }

    const newDice = progression[currentIndex - 1];
    const diceCount = damage.match(/^(\d+)d/)?.[1] ?? "1";

    return {
      newDamage: `${diceCount}d${newDice}`,
      oldDamage: damage,
      restriction: "Cannot use upgrade slots to enhance damage once stripped."
    };
  }

  /**
   * Reduce weapon range by one step.
   * Heavy->Rifle->Pistol->Thrown->Melee
   *
   * @private
   * @param {Item} weapon - The weapon
   * @returns {Object} Effect details
   */
  static _stripWeaponRange(weapon) {
    const range = weapon.system.range?.toLowerCase() ?? "melee";
    const progression = ["melee", "thrown", "pistol", "rifle", "heavy"];
    const currentIndex = progression.indexOf(range);

    if (currentIndex <= 0) {
      return { error: "Range cannot be stripped further." };
    }

    const newRange = progression[currentIndex - 1];
    return {
      newRange,
      oldRange: range,
      restriction: "Cannot use upgrade slots to enhance range once stripped."
    };
  }

  /**
   * Strip armor to gain an upgrade slot.
   *
   * Rules:
   * - Defensive Material: Lowers armor/equipment bonuses by 1 (min +0)
   * - Joint Protection: Doubles weight, decreases Max Dex by 1
   * - Same time/cost requirements as weapon stripping
   *
   * @param {Item} armor - The armor item
   * @param {string} stripType - Type of strip: "defensiveMaterial" or "jointProtection"
   * @returns {Object} Validation result
   */
  static stripArmor(armor, stripType) {
    if (armor.type !== "armor") {
      return {
        valid: false,
        reason: "Only armor can be stripped."
      };
    }

    const stripped = armor.system.strippedFeatures ?? {};

    const stripTypes = {
      defensiveMaterial: {
        label: "Defensive Material",
        check: () => {
          if (stripped.defensiveMaterial) {
            return "Defensive material already stripped.";
          }
          const defBonus = Number(armor.system.defenseBonus ?? 0);
          if (defBonus <= 0) {
            return "Cannot strip defensive material further.";
          }
          return null;
        },
        effect: () => ({
          defenseBonus: Math.max(0, Number(armor.system.defenseBonus ?? 0) - 1),
          equipmentBonus: Math.max(0, Number(armor.system.equipmentBonus ?? 0) - 1)
        })
      },
      jointProtection: {
        label: "Joint Protection",
        check: () => {
          if (stripped.jointProtection) {
            return "Joint protection already stripped.";
          }
          return null;
        },
        effect: () => ({
          weightDoubled: true,
          maxDexBonusDecreased: true,
          maxDexChange: Number(armor.system.maxDexBonus ?? 999) - 1
        })
      }
    };

    const stripDef = stripTypes[stripType?.toLowerCase()];
    if (!stripDef) {
      return {
        valid: false,
        reason: `Unknown strip type: ${stripType}`
      };
    }

    const error = stripDef.check();
    if (error) {
      return { valid: false, reason: error };
    }

    const baseCost = Number(armor.system.cost ?? 0);
    const stripCost = Math.ceil(baseCost * 0.5);

    return {
      valid: true,
      stripType,
      label: stripDef.label,
      effects: stripDef.effect(),
      dc: 20,
      cost: stripCost,
      hoursRequired: 8,
      newSlots: 1
    };
  }

  /* ============================================================== */
  /* INSTALLATION MECHANICS                                         */
  /* ============================================================== */

  /**
   * Calculate installation time and Mechanics DC for an upgrade.
   *
   * Rules:
   * - 0 slots: DC 10 (10 min commercial), DC 15 (1 hour scratch-built)
   * - 1 slot: DC 20 (1 hour commercial), DC 25 (1 day/8 hours scratch-built)
   * - 2+ slots: DC 30 (1 day/8 hours commercial), DC 35 (1 week/5 days scratch-built)
   *
   * @param {number} slotsRequired - Number of upgrade slots required
   * @param {boolean} scratchBuilt - Whether this is a scratch-built upgrade
   * @returns {Object} Details: dc, minutesRequired, label
   */
  static calculateInstallationTime(slotsRequired, scratchBuilt = false) {
    const slots = Number(slotsRequired ?? 1);

    if (slots === 0) {
      return {
        dc: scratchBuilt ? 15 : 10,
        minutesRequired: scratchBuilt ? 60 : 10,
        hoursRequired: scratchBuilt ? 1 : 0.167,
        label: scratchBuilt ? "1 Hour" : "10 Minutes"
      };
    }

    if (slots === 1) {
      return {
        dc: scratchBuilt ? 25 : 20,
        minutesRequired: scratchBuilt ? 8 * 60 : 60,
        hoursRequired: scratchBuilt ? 8 : 1,
        label: scratchBuilt ? "1 Day (8 Hours)" : "1 Hour"
      };
    }

    // 2 or more slots
    return {
      dc: scratchBuilt ? 35 : 30,
      minutesRequired: scratchBuilt ? 5 * 8 * 60 : 8 * 60,
      hoursRequired: scratchBuilt ? 40 : 8,
      label: scratchBuilt ? "1 Week (5 Days)" : "1 Day (8 Hours)"
    };
  }

  /**
   * Calculate upgrade installation cost.
   * Scratch-built upgrades cost twice as much as commercially bought.
   *
   * @param {number} baseCost - Base cost of upgrade
   * @param {boolean} scratchBuilt - Whether this is scratch-built
   * @returns {number} Total installation cost
   */
  static calculateUpgradeCost(baseCost, scratchBuilt = false) {
    const cost = Number(baseCost ?? 0);
    return scratchBuilt ? cost * 2 : cost;
  }

  /**
   * Calculate removal cost (same as installation but DC reduced by 5).
   *
   * @param {number} slotsRequired - Number of upgrade slots the upgrade uses
   * @param {boolean} scratchBuilt - Whether this is scratch-built
   * @param {boolean} destructive - Whether removing without care (faster but destroys upgrade)
   * @returns {Object} Details: dc, minutesRequired, hoursRequired, label, destructive
   */
  static calculateRemovalTime(slotsRequired, scratchBuilt = false, destructive = false) {
    const slots = Number(slotsRequired ?? 1);
    let timeMultiplier = destructive ? 0.5 : 1;

    if (slots === 0) {
      return {
        dc: destructive ? -1 : (scratchBuilt ? 10 : 5),
        minutesRequired: destructive ? 5 : (scratchBuilt ? 60 : 10),
        hoursRequired: destructive ? 0.083 : (scratchBuilt ? 1 : 0.167),
        label: destructive ? "5 Minutes (Destroyed)" : (scratchBuilt ? "1 Hour" : "10 Minutes"),
        destructive
      };
    }

    if (slots === 1) {
      return {
        dc: destructive ? -1 : (scratchBuilt ? 20 : 15),
        minutesRequired: destructive ? 30 : (scratchBuilt ? 8 * 60 : 60),
        hoursRequired: destructive ? 0.5 : (scratchBuilt ? 8 : 1),
        label: destructive ? "30 Minutes (Destroyed)" : (scratchBuilt ? "1 Day (8 Hours)" : "1 Hour"),
        destructive
      };
    }

    // 2 or more slots
    return {
      dc: destructive ? -1 : (scratchBuilt ? 30 : 25),
      minutesRequired: destructive ? 4 * 60 : (scratchBuilt ? 5 * 8 * 60 : 8 * 60),
      hoursRequired: destructive ? 4 : (scratchBuilt ? 40 : 8),
      label: destructive ? "4 Hours (Destroyed)" : (scratchBuilt ? "1 Week (5 Days)" : "1 Day (8 Hours)"),
      destructive
    };
  }

  /* ============================================================== */
  /* VALIDATION & CONFLICT DETECTION                                */
  /* ============================================================== */

  /**
   * Validate if an upgrade can be installed on an item.
   * Checks:
   * - Upgrade type matches item type
   * - Enough upgrade slots available
   * - Upgrade requirements met
   * - No conflicts with existing upgrades
   *
   * @param {Item} item - The equipment to upgrade
   * @param {Item} upgrade - The upgrade to install
   * @param {Actor} actor - The actor installing the upgrade (for credits check)
   * @returns {Object} Validation result: valid {boolean}, reason {string}, availableSlots {number}
   */
  static validateUpgradeInstallation(item, upgrade, actor = null) {
    // Check upgrade type matches item
    if (!this._typeMatches(item, upgrade)) {
      return {
        valid: false,
        reason: "This upgrade is not compatible with this item type."
      };
    }

    // Calculate current slot usage
    const totalSlots = this.getBaseUpgradeSlots(item);
    const installedUpgrades = item.system.installedUpgrades ?? [];
    const usedSlots = installedUpgrades.reduce((sum, u) => sum + (u.slotsUsed ?? 1), 0);
    const availableSlots = totalSlots - usedSlots;

    const slotsNeeded = Number(upgrade.system.upgradeSlots ?? 1);

    if (slotsNeeded > availableSlots) {
      return {
        valid: false,
        reason: `Not enough upgrade slots. Need ${slotsNeeded}, have ${availableSlots} available.`,
        availableSlots
      };
    }

    // Check for upgrade restrictions (can add more checks as needed)
    if (actor) {
      const cost = Number(upgrade.system.cost ?? 0);
      const credits = Number(actor.system.credits ?? 0);
      if (credits < cost) {
        return {
          valid: false,
          reason: `Insufficient credits. Need ${cost}, have ${credits}.`,
          availableSlots
        };
      }
    }

    // Check for stripped area conflicts
    const strippedConflict = this._checkStrippedAreaConflict(item, upgrade);
    if (strippedConflict) {
      return {
        valid: false,
        reason: strippedConflict,
        availableSlots
      };
    }

    return {
      valid: true,
      availableSlots,
      slotsNeeded,
      cost: Number(upgrade.system.cost ?? 0)
    };
  }

  /**
   * Check if upgrade conflicts with stripped equipment areas.
   * @private
   */
  static _checkStrippedAreaConflict(item, upgrade) {
    const stripped = item.system.strippedFeatures ?? {};
    const upgradeName = upgrade.name?.toLowerCase() ?? "";

    // Check for damage enhancements on stripped damage
    if (stripped.damage && this._isUpgradeType(upgradeName, "damage")) {
      return "Cannot install damage upgrades on equipment with stripped damage.";
    }

    // Check for range enhancements on stripped range
    if (stripped.range && this._isUpgradeType(upgradeName, "range")) {
      return "Cannot install range upgrades on equipment with stripped range.";
    }

    // More conflict checks can be added as needed
    return null;
  }

  /**
   * Check if upgrade name matches a type.
   * @private
   */
  static _isUpgradeType(name, type) {
    const patterns = {
      damage: /damage|cannon|projector|power/i,
      range: /range|scope|sight|extension/i,
      defense: /armor|plating|reinforcement/i
    };
    return patterns[type]?.test(name) ?? false;
  }

  /**
   * Check if upgrade type matches item type.
   * @private
   */
  static _typeMatches(item, upgrade) {
    const upgradeType = upgrade.system.upgradeType?.toLowerCase() ?? "";

    if (upgradeType.includes("universal")) return true;
    if (item.type === "weapon" && upgradeType.includes("weapon")) return true;
    if (item.type === "armor" && upgradeType.includes("armor")) return true;
    if (item.type === "equipment" && upgradeType.includes("equipment")) return true;

    return false;
  }

  /* ============================================================== */
  /* RESTRICTION HANDLING                                           */
  /* ============================================================== */

  /**
   * Determine the effective restriction level of equipment
   * based on its own restriction and its upgrades' restrictions.
   * Equipment inherits the most restrictive of all components.
   *
   * @param {Item} item - The equipment item
   * @returns {string} Effective restriction level
   */
  static getEffectiveRestriction(item) {
    const restrictions = [];

    // Add item's own restriction
    if (item.system.restriction) {
      restrictions.push(item.system.restriction);
    }

    // Add restrictions from installed upgrades
    const installed = item.system.installedUpgrades ?? [];
    for (const upgrade of installed) {
      if (upgrade.restriction) {
        restrictions.push(upgrade.restriction);
      }
    }

    // Return most restrictive (ordered by restrictiveness)
    const order = ["illegal", "military", "restricted", "licensed", "common"];
    for (const level of order) {
      if (restrictions.includes(level)) {
        return level;
      }
    }

    return "common";
  }
}
