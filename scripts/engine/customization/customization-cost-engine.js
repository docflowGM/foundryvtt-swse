export class CustomizationCostEngine {
  constructor(profileResolver) {
    this.profileResolver = profileResolver;
  }

  getBaseCost(item) {
    return this.profileResolver.getNormalizedProfile(item).baseCost ?? 0;
  }

  getSizeIncreaseOperationCost(item) {
    return this.getBaseCost(item);
  }

  getStripOperationCost(item) {
    return Math.ceil(this.getBaseCost(item) * 0.5);
  }

  getRetryOperationCost(originalOperationCost) {
    return Math.ceil(Math.max(0, Number(originalOperationCost) || 0) * 0.5);
  }

  getRemovalCost(upgradeInstance) {
    // RAW removal specifies time and reduced DC, but not an additional credit fee.
    return 0;
  }

  getSizeIncreasedItemValue(item) {
    return this.getBaseCost(item) * 2;
  }

  getEffectiveItemValueAfterUpgrades(item) {
    const base = this.getBaseCost(item);
    const upgrades = item.flags?.['foundryvtt-swse']?.customization?.installedUpgrades ?? [];
    return base + upgrades.reduce((sum, upg) => sum + (Number(upg?.operationCost) || 0), 0);
  }

  getTotalEffectiveItemValue(item) {
    const custom = item.flags?.['foundryvtt-swse']?.customization ?? {};
    let value = this.getBaseCost(item);
    if (custom.structural?.sizeIncreaseApplied) value *= 2;
    value += (custom.installedUpgrades ?? []).reduce((sum, upg) => sum + (Number(upg?.operationCost) || 0), 0);
    value += (custom.appliedTemplates ?? []).reduce((sum, tmpl) => sum + (Number(tmpl?.operationCost) || 0), 0);
    return value;
  }
}
