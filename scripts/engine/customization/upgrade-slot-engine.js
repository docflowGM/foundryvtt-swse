import { MELEE_UPGRADES } from '/systems/foundryvtt-swse/scripts/data/melee-upgrades.js';
import { GEAR_MODS } from '/systems/foundryvtt-swse/scripts/data/gear-mods.js';
import { ARMOR_UPGRADES } from '/systems/foundryvtt-swse/scripts/data/armor-upgrades.js';

export class UpgradeSlotEngine {
  constructor(profileResolver) {
    this.profileResolver = profileResolver;
  }

  getCustomizationState(item) {
    const existing = item?.flags?.['foundryvtt-swse']?.customization;
    if (existing) return existing;

    const strippedFeatures = item?.system?.strippedFeatures ?? {};
    const strippedAreas = [];
    if (strippedFeatures.damage) strippedAreas.push('damage');
    if (strippedFeatures.range) strippedAreas.push('range');
    if (strippedFeatures.design) strippedAreas.push('design');
    if (strippedFeatures.stun) strippedAreas.push('stun_setting');
    if (strippedFeatures.autofire) strippedAreas.push('autofire');
    if (strippedFeatures.defensiveMaterial) strippedAreas.push('defensive_material');
    if (strippedFeatures.jointProtection) strippedAreas.push('joint_protection');

    const legacyInstalled = Array.isArray(item?.system?.installedUpgrades) ? item.system.installedUpgrades.map((upg, index) => ({
      instanceId: upg.id || `legacy_${index}`,
      upgradeKey: upg.key || upg.name?.toLowerCase?.().replace(/[^a-z0-9]+/g, '_') || `legacy_${index}`,
      slotCost: Number(upg.slotsUsed) || 0,
      operationCost: Number(upg.cost) || 0,
      restriction: upg.restriction || 'common',
      installedAt: 0,
      installSource: 'legacy'
    })) : [];

    const legacyFlagKeys = [];
    for (const key of (item?.flags?.swse?.meleeUpgrades ?? [])) {
      const entry = MELEE_UPGRADES[key];
      legacyFlagKeys.push({
        instanceId: `legacy_flag_${key}`,
        upgradeKey: key,
        slotCost: 1,
        operationCost: Number(entry?.costCredits) || 0,
        restriction: entry?.restriction || 'common',
        installedAt: 0,
        installSource: 'legacy'
      });
    }
    for (const key of (item?.flags?.swse?.gearMods ?? [])) {
      const entry = GEAR_MODS[key];
      legacyFlagKeys.push({
        instanceId: `legacy_flag_${key}`,
        upgradeKey: key,
        slotCost: 1,
        operationCost: Number(entry?.costCredits) || 0,
        restriction: entry?.restriction || 'common',
        installedAt: 0,
        installSource: 'legacy'
      });
    }
    for (const key of (item?.flags?.swse?.armorUpgrades ?? [])) {
      const entry = ARMOR_UPGRADES[key];
      legacyFlagKeys.push({
        instanceId: `legacy_flag_${key}`,
        upgradeKey: key,
        slotCost: 1,
        operationCost: Number(entry?.costCredits) || 0,
        restriction: entry?.restriction || 'common',
        installedAt: 0,
        installSource: 'legacy'
      });
    }

    const mergedInstalled = [...legacyInstalled];
    for (const inst of legacyFlagKeys) {
      if (!mergedInstalled.some(existing => existing.upgradeKey === inst.upgradeKey)) mergedInstalled.push(inst);
    }

    return {
      structural: {
        sizeIncreaseApplied: !!item?.system?.sizeIncreaseApplied,
        strippedAreas
      },
      installedUpgrades: mergedInstalled,
      appliedTemplates: [item?.system?.gearTemplate, item?.system?.gearTemplateSecondary].filter(Boolean).map((templateKey, index) => ({
        instanceId: `legacy_template_${index}`,
        templateKey,
        source: item?.system?.restriction || 'common',
        stackOrder: index,
        effectiveRestriction: item?.system?.restriction || 'common',
        operationCost: Number(item?.system?.templateCost) || 0
      })),
      overrides: { stockSlotOverride: null },
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
