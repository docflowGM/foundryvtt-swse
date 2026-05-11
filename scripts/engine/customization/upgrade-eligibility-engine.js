import { UPGRADE_CATALOG, TEMPLATE_CATALOG } from '/systems/foundryvtt-swse/scripts/engine/customization/upgrade-catalog.js';
import { MetaResourceFeatResolver } from '/systems/foundryvtt-swse/scripts/engine/feats/meta-resource-feat-resolver.js';

export class UpgradeEligibilityEngine {
  constructor(profileResolver, slotEngine, actor = null) {
    this.profileResolver = profileResolver;
    this.slotEngine = slotEngine;
    this.actor = actor;
  }

  getEligibleUpgrades(item) {
    const profile = this.profileResolver.getNormalizedProfile(item);
    const slotState = this.slotEngine.getFullSlotState(item);
    const installedKeys = new Set((slotState.customState.installedUpgrades ?? []).map(u => u.upgradeKey));
    return Object.values(UPGRADE_CATALOG)
      .map((upgrade) => ({ upgrade, eligibility: this.canInstallUpgrade(item, upgrade.key) }))
      .filter(entry => entry.eligibility.allowed || entry.eligibility.visible !== false)
      .map(entry => ({
        ...entry.upgrade,
        allowed: entry.eligibility.allowed,
        reason: entry.eligibility.reason,
        alreadyInstalled: installedKeys.has(entry.upgrade.key)
      }));
  }

  canInstallUpgrade(item, upgradeKey) {
    const upgrade = UPGRADE_CATALOG[upgradeKey];
    if (!upgrade) return { allowed: false, reason: 'unknown_upgrade', visible: false };

    if (upgrade.enabled === false) return { allowed: false, reason: 'upgrade_disabled', visible: true };

    if (upgrade.source === 'tech-specialist') {
      if (!this.actor) return { allowed: false, reason: 'actor_required' };
      if (!MetaResourceFeatResolver.canActorPerformTechSpecialistModifications(this.actor)) {
        return { allowed: false, reason: 'missing_tech_specialist_feat' };
      }

      const customState = this.slotEngine.getCustomizationState(item);
      const installedTechSpecs = (customState.installedUpgrades ?? [])
        .filter(u => UPGRADE_CATALOG[u.upgradeKey]?.source === 'tech-specialist');
      if (installedTechSpecs.length > 0) {
        return { allowed: false, reason: 'tech_specialist_benefit_already_applied' };
      }
    }

    const profile = this.profileResolver.getNormalizedProfile(item);
    if (!profile.customizable) return { allowed: false, reason: `unsupported_category:${profile.category}` };
    const categorySet = new Set(upgrade.appliesTo ?? []);
    const itemCategory = profile.category === 'blaster' ? 'blaster' : profile.category;
    const matchesCategory = categorySet.has(itemCategory) || (itemCategory === 'blaster' && categorySet.has('weapon'));
    if (!matchesCategory) return { allowed: false, reason: 'category_mismatch', visible: false };

    const slotAccounting = this.slotEngine.getSlotAccounting(item);
    if (!slotAccounting.canAccommodate(upgrade.slotCost ?? 0)) return { allowed: false, reason: 'insufficient_slots' };

    const strippedAreas = new Set(this.slotEngine.getCustomizationState(item).structural?.strippedAreas ?? []);
    if ((upgrade.affectedAreas ?? []).some(area => strippedAreas.has(area) || strippedAreas.has(this.#normalizeAreaAlias(area)))) {
      return { allowed: false, reason: 'affected_area_stripped' };
    }

    if ((upgrade.requires ?? []).includes('ranged') && !profile.traits.hasRange) return { allowed: false, reason: 'requires_ranged' };
    if ((upgrade.requires ?? []).includes('ranged_energy') && !String(profile.weaponSubtype ?? '').includes('ranged')) return { allowed: false, reason: 'requires_ranged_energy' };
    if ((upgrade.requires ?? []).includes('stun_setting') && !profile.traits.hasStunSetting) return { allowed: false, reason: 'requires_stun_setting' };
    if ((upgrade.requires ?? []).includes('autofire') && !profile.traits.hasAutofire) return { allowed: false, reason: 'requires_autofire' };

    return { allowed: true };
  }

  getEligibleTemplates(item) {
    const profile = this.profileResolver.getNormalizedProfile(item);
    const custom = this.slotEngine.getCustomizationState(item);
    return Object.values(TEMPLATE_CATALOG).map((template) => {
      const applied = custom.appliedTemplates ?? [];
      if (!template.appliesTo.includes(profile.category) && !(profile.category === 'blaster' && template.appliesTo.includes('weapon'))) {
        return null;
      }
      if (!template.stackable && applied.some(t => t.templateKey === template.key)) {
        return { ...template, allowed: false, reason: 'already_applied' };
      }
      if (!template.stackable && applied.length > 0 && !applied.some(t => this.#isTemplateExceptionPair(t.templateKey, template.key))) {
        return { ...template, allowed: false, reason: 'template_stack_blocked' };
      }
      return { ...template, allowed: true };
    }).filter(Boolean);
  }

  #normalizeAreaAlias(area) {
    if (area === 'damage_type') return 'damage';
    return area;
  }

  #isTemplateExceptionPair(existing, incoming) {
    const pair = new Set([existing, incoming]);
    return pair.has('prototype_general') && (pair.has('cortosis_weave_general') || pair.has('phrik_alloy_general'));
  }
}
