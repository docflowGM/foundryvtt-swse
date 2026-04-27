import { ItemProfileResolver } from '/systems/foundryvtt-swse/scripts/engine/customization/item-profile-resolver.js';
import { UpgradeSlotEngine } from '/systems/foundryvtt-swse/scripts/engine/customization/upgrade-slot-engine.js';
import { CustomizationCostEngine } from '/systems/foundryvtt-swse/scripts/engine/customization/customization-cost-engine.js';
import { UpgradeEligibilityEngine } from '/systems/foundryvtt-swse/scripts/engine/customization/upgrade-eligibility-engine.js';
import { StructuralChangeEngine } from '/systems/foundryvtt-swse/scripts/engine/customization/structural-change-engine.js';
import { InstallRemoveEngine } from '/systems/foundryvtt-swse/scripts/engine/customization/install-remove-engine.js';
import { TemplateEngine } from '/systems/foundryvtt-swse/scripts/engine/customization/template-engine.js';
import { getMostRestrictive, normalizeRestriction } from '/systems/foundryvtt-swse/scripts/engine/customization/restriction-model.js';
import { SafetyEngine } from '/systems/foundryvtt-swse/scripts/engine/customization/safety-engine.js';

function isActorLike(value) {
  return !!value && typeof value === 'object' && (
    value.documentName === 'Actor' ||
    value.type === 'character' ||
    Array.isArray(value.items?.contents) ||
    typeof value.items?.get === 'function'
  );
}

function normalizeActorItem(first, second) {
  if (isActorLike(first) && second) return { actor: first, item: second };
  if (isActorLike(second) && first) return { actor: second, item: first };
  return { actor: first, item: second };
}

export class CustomizationWorkflow {
  constructor() {
    this.profileResolver = new ItemProfileResolver();
    this.slotEngine = new UpgradeSlotEngine(this.profileResolver);
    this.costEngine = new CustomizationCostEngine(this.profileResolver);
    this.eligibilityEngine = new UpgradeEligibilityEngine(this.profileResolver, this.slotEngine);
    this.structuralEngine = new StructuralChangeEngine(this.profileResolver, this.slotEngine, this.costEngine);
    this.installRemoveEngine = new InstallRemoveEngine(this.profileResolver, this.slotEngine, this.costEngine, this.eligibilityEngine);
    this.templateEngine = new TemplateEngine(this.profileResolver, this.slotEngine, this.eligibilityEngine);
  }

  getFullCustomizationState(item) {
    // Validate category support early to prevent unsupported categories from leaking in
    const categoryValidation = SafetyEngine.validateCategory(item);
    if (!categoryValidation.allowed) {
      return {
        error: categoryValidation.blockingReason,
        success: false,
        reason: categoryValidation.reason
      };
    }

    const profile = this.profileResolver.getNormalizedProfile(item);
    const slotState = this.slotEngine.getFullSlotState(item);
    const customization = this.slotEngine.getCustomizationState(item);
    const availableUpgrades = this.eligibilityEngine.getEligibleUpgrades(item);
    const availableTemplates = this.templateEngine.getEligibleTemplates(item);
    const restriction = {
      effectiveRestriction: this.getEffectiveRestriction(item),
      isRare: (customization.appliedTemplates ?? []).some((inst) => Boolean(inst?.rare)) || Boolean(profile.traits?.rare)
    };
    return {
      profile,
      slotState,
      slots: slotState.slots,
      strippable: slotState.strippable,
      customState: customization,
      installedUpgrades: customization.installedUpgrades ?? [],
      appliedTemplates: customization.appliedTemplates ?? [],
      availableUpgrades,
      availableTemplates,
      restriction,
      effectiveRestriction: restriction.effectiveRestriction,
      effectiveValue: this.costEngine.getTotalEffectiveItemValue(item)
    };
  }

  getSummaryView(item) {
    const state = this.getFullCustomizationState(item);
    return {
      customized: Boolean((state.installedUpgrades?.length || 0) || (state.appliedTemplates?.length || 0) || (state.customState?.structural?.strippedAreas?.length || 0) || state.customState?.structural?.sizeIncreaseApplied),
      cost: {
        base: this.costEngine.getBaseCost(item),
        effective: this.costEngine.getTotalEffectiveItemValue(item)
      },
      slots: {
        free: state.slots?.freeSlots ?? 0,
        total: state.slots?.totalAvailable ?? 0,
        used: state.slots?.usedSlots ?? 0
      },
      summary: {
        upgrades: state.installedUpgrades?.length || 0,
        templates: state.appliedTemplates?.length || 0
      },
      restriction: {
        effective: state.restriction.effectiveRestriction,
        rare: state.restriction.isRare
      }
    };
  }

  getUpgradeEligibilityReport(item) {
    return { upgrades: this.eligibilityEngine.getEligibleUpgrades(item) };
  }

  canApplyTemplate(item, templateKey) {
    const eligible = this.templateEngine.getEligibleTemplates(item).find((entry) => entry.key === templateKey);
    return { eligible: Boolean(eligible?.allowed), reason: eligible?.reason || null };
  }

  getEffectiveRestriction(item) {
    const customization = this.slotEngine.getCustomizationState(item);
    return getMostRestrictive(
      normalizeRestriction(item?.system?.restriction),
      ...(customization.installedUpgrades ?? []).map((inst) => normalizeRestriction(inst.restriction)),
      ...(customization.appliedTemplates ?? []).map((inst) => normalizeRestriction(inst.effectiveRestriction))
    );
  }

  previewSizeIncrease(first, second) {
    const { actor, item } = normalizeActorItem(first, second);
    const raw = this.structuralEngine.previewSizeIncrease(actor, item);
    if (!raw.success) return raw;
    return {
      success: true,
      preview: {
        operationCost: raw.cost,
        resultingItemValue: this.costEngine.getSizeIncreasedItemValue(item),
        mechanics: { dc: raw.mechanicsDC, timeHours: raw.timeHours },
        slots: raw.resultingSlotState,
        notes: raw.notes
      }
    };
  }

  applySizeIncrease(first, second, options = {}) {
    const { actor, item } = normalizeActorItem(first, second);
    // Validate category support at workflow boundary
    const categoryValidation = SafetyEngine.validateCategory(item);
    if (!categoryValidation.allowed) {
      return { success: false, reason: categoryValidation.reason, blockingReason: categoryValidation.blockingReason };
    }
    const mechanicsTotal = options?.total ?? options?.mechanicsTotal ?? options?.mechanics?.total ?? null;
    return this.structuralEngine.applySizeIncrease(actor, item, { mechanicsTotal });
  }

  previewStrip(first, second, areaKey) {
    const { actor, item } = normalizeActorItem(first, second);
    const raw = this.structuralEngine.previewStrip(actor, item, areaKey);
    if (!raw.success) return raw;
    return {
      success: true,
      preview: {
        operationCost: raw.cost,
        mechanics: { dc: raw.mechanicsDC, timeHours: raw.timeHours },
        downgrade: raw.notes,
        areaKey
      }
    };
  }

  applyStrip(first, second, areaKey, options = {}) {
    const { actor, item } = normalizeActorItem(first, second);
    // Validate category support at workflow boundary
    const categoryValidation = SafetyEngine.validateCategory(item);
    if (!categoryValidation.allowed) {
      return { success: false, reason: categoryValidation.reason, blockingReason: categoryValidation.blockingReason };
    }
    const mechanicsTotal = options?.total ?? options?.mechanicsTotal ?? options?.mechanics?.total ?? null;
    return this.structuralEngine.applyStrip(actor, item, areaKey, { mechanicsTotal });
  }

  previewInstall(first, second, upgradeKey, installSource = 'commercial') {
    const { actor, item } = normalizeActorItem(first, second);
    const raw = this.installRemoveEngine.previewInstall(actor, item, upgradeKey, installSource);
    if (!raw.success) return raw;
    const slotState = this.slotEngine.getSlotAccounting(item);
    return {
      success: true,
      preview: {
        actor: { canAfford: true },
        upgrade: {
          key: raw.upgrade.key,
          name: raw.upgrade.name,
          slotCost: raw.upgrade.slotCost ?? 0,
          installCost: raw.cost,
          description: raw.upgrade.description
        },
        mechanics: { dc: raw.mechanicsDC, timeHours: raw.timeHours },
        slots: {
          freeBefore: slotState.freeSlots,
          freeAfter: slotState.freeSlots - (raw.upgrade.slotCost ?? 0)
        }
      }
    };
  }

  applyInstall(first, second, upgradeKey, options = {}) {
    const { actor, item } = normalizeActorItem(first, second);
    // Validate category support at workflow boundary
    const categoryValidation = SafetyEngine.validateCategory(item);
    if (!categoryValidation.allowed) {
      return { success: false, reason: categoryValidation.reason, blockingReason: categoryValidation.blockingReason };
    }
    const mechanicsTotal = options?.total ?? options?.mechanicsTotal ?? options?.mechanics?.total ?? null;
    const installSource = options?.installSource ?? options?.source ?? 'commercial';
    return this.installRemoveEngine.applyInstall(actor, item, upgradeKey, { mechanicsTotal, installSource });
  }

  previewRemove(item, actorOrInstanceId, maybeInstanceId, options = {}) {
    const instanceId = typeof maybeInstanceId === 'string' ? maybeInstanceId : actorOrInstanceId;
    const raw = this.installRemoveEngine.previewRemove(item, instanceId, options);
    if (!raw.success) return raw;
    return {
      success: true,
      preview: {
        upgrade: {
          name: raw.instance.upgradeKey.replaceAll('_', ' ')
        },
        removalCost: raw.cost,
        mechanics: { dc: raw.mechanicsDC, timeHours: raw.timeHours }
      }
    };
  }

  applyRemove(first, second, instanceId, options = {}) {
    const { actor, item } = normalizeActorItem(first, second);
    // Validate category support at workflow boundary
    const categoryValidation = SafetyEngine.validateCategory(item);
    if (!categoryValidation.allowed) {
      return { success: false, reason: categoryValidation.reason, blockingReason: categoryValidation.blockingReason };
    }
    const mechanicsTotal = options?.total ?? options?.mechanicsTotal ?? options?.mechanics?.total ?? null;
    const destructive = Boolean(options?.destructive);
    return this.installRemoveEngine.applyRemove(actor, item, instanceId, { mechanicsTotal, destructive });
  }

  previewTemplate(item, templateKey) {
    const raw = this.templateEngine.previewApplyTemplate(item, templateKey);
    if (!raw.success) return raw;
    const currentRestriction = this.getEffectiveRestriction(item);
    const newRestriction = getMostRestrictive(currentRestriction, raw.template.restriction);
    return {
      success: true,
      preview: {
        template: raw.template,
        cost: { costImpact: Number(raw.template.operationCost ?? 0) || 0 },
        legality: {
          currentRestriction,
          newRestriction
        },
        rarity: Boolean(raw.template.rarity)
      }
    };
  }

  applyTemplate(first, second, templateKey) {
    const { actor, item } = normalizeActorItem(first, second);
    // Validate category support at workflow boundary
    const categoryValidation = SafetyEngine.validateCategory(item);
    if (!categoryValidation.allowed) {
      return { success: false, reason: categoryValidation.reason, blockingReason: categoryValidation.blockingReason };
    }
    return this.templateEngine.applyTemplate(actor, item, templateKey);
  }
}
