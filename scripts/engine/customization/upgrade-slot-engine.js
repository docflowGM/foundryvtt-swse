import { SafetyEngine } from '/systems/foundryvtt-swse/scripts/engine/customization/safety-engine.js';
import { MELEE_UPGRADES } from '/systems/foundryvtt-swse/scripts/data/melee-upgrades.js';
import { GEAR_MODS } from '/systems/foundryvtt-swse/scripts/data/gear-mods.js';
import { ARMOR_UPGRADES } from '/systems/foundryvtt-swse/scripts/data/armor-upgrades.js';

export class UpgradeSlotEngine {
  constructor(profileResolver) {
    this.profileResolver = profileResolver;
  }

  getCustomizationState(item) {
    // Normalize customization state defensively to handle legacy and malformed data
    const normalization = SafetyEngine.normalizeCustomizationState(item);
    if (normalization.success) {
      return normalization.normalizedState;
    }

    // Fallback (SafetyEngine should always succeed, but be defensive)
    return {
      structural: { sizeIncreaseApplied: false, strippedAreas: [] },
      installedUpgrades: [],
      appliedTemplates: [],
      operationLog: []
    };
  }

  getStockBaseSlots(item) {
    try {
      const profile = this.profileResolver.getNormalizedProfile(item);
      if (profile.stockSlotOverride !== null && profile.stockSlotOverride !== undefined) {
        const override = Number(profile.stockSlotOverride);
        if (Number.isFinite(override) && override >= 0) return override;
      }
      if (profile.traits?.isPoweredArmor) return 2;
      return 1;
    } catch {
      return 1;
    }
  }

  getStrippableAreas(item) {
    const profile = this.profileResolver.getNormalizedProfile(item);
    if (!profile.customizable) return [];
    const areas = [];
    if (['weapon', 'blaster'].includes(profile.category)) {
      if (profile.traits.hasDamage) areas.push('damage');
      if (profile.traits.hasRange) areas.push('range');
      if (profile.traits.hasDesign && !profile.traits.isExotic) areas.push('design');
      if (profile.traits.hasStunSetting) areas.push('stun_setting');
      if (profile.traits.hasAutofire) areas.push('autofire');
    }
    if (profile.category === 'armor') {
      areas.push('defensive_material');
      areas.push('joint_protection');
    }
    return areas;
  }

  getSlotAccounting(item) {
    const custom = this.getCustomizationState(item);
    const stockBase = this.getStockBaseSlots(item);
    const sizeIncreaseApplied = !!custom.structural?.sizeIncreaseApplied;
    const strippedAreas = Array.isArray(custom.structural?.strippedAreas) ? custom.structural.strippedAreas : [];
    const installedUpgrades = Array.isArray(custom.installedUpgrades) ? custom.installedUpgrades : [];
    const usedSlots = installedUpgrades.reduce((sum, upg) => sum + ((Number(upg?.slotCost) ?? 0) || 0), 0);
    const totalAvailable = stockBase + (sizeIncreaseApplied ? 1 : 0) + strippedAreas.length;
    const freeSlots = totalAvailable - usedSlots;
    const isOverflowing = freeSlots < 0;
    return {
      stockBase,
      bonusFromSizeIncrease: sizeIncreaseApplied ? 1 : 0,
      bonusFromStripping: strippedAreas.length,
      totalAvailable,
      usedSlots,
      freeSlots,
      isOverflowing,
      // Future validation can expand corruption checks to malformed arrays,
      // duplicate ids, invalid stripped areas, and invalid overrides.
      isCorruptState: isOverflowing,
      canAccommodate: (count = 0) => freeSlots >= count
    };
  }

  canApplySizeIncrease(item) {
    const profile = this.profileResolver.getNormalizedProfile(item);
    const custom = this.getCustomizationState(item);
    if (!profile.customizable) {
      return { allowed: false, reason: `not yet customizable in generic phase-a flow: ${profile.category}` };
    }
    if (custom.structural?.sizeIncreaseApplied) return { allowed: false, reason: 'size increase already applied' };
    if (profile.category === 'armor' && profile.armorWeightClass === 'heavy') {
      return { allowed: false, reason: 'heavy armor cannot increase in weight class' };
    }
    return { allowed: true };
  }

  canStripArea(item, areaKey) {
    const custom = this.getCustomizationState(item);
    const available = this.getStrippableAreas(item);
    if (!available.includes(areaKey)) return { allowed: false, reason: `${areaKey} cannot be stripped from this item` };
    if ((custom.structural?.strippedAreas ?? []).includes(areaKey)) return { allowed: false, reason: `${areaKey} already stripped` };
    return { allowed: true };
  }

  getFullSlotState(item) {
    const profile = this.profileResolver.getNormalizedProfile(item);
    const slots = this.getSlotAccounting(item);
    const sizeCheck = this.canApplySizeIncrease(item);
    return {
      profile,
      slots,
      strippable: this.getStrippableAreas(item),
      sizeIncreaseAllowed: sizeCheck.allowed,
      sizeIncreaseBlocked: sizeCheck.reason ?? null,
      customState: this.getCustomizationState(item),
      error: profile.error ?? null
    };
  }
}
