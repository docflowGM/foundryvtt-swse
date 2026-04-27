import { ActorEngine } from '/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js';
import { LedgerService } from '/systems/foundryvtt-swse/scripts/engine/store/ledger-service.js';
import { UPGRADE_CATALOG } from '/systems/foundryvtt-swse/scripts/engine/customization/upgrade-catalog.js';
import { EffectResolver } from '/systems/foundryvtt-swse/scripts/engine/customization/effect-resolver.js';
import { SafetyEngine } from '/systems/foundryvtt-swse/scripts/engine/customization/safety-engine.js';

function clone(data) { return foundry.utils.deepClone(data); }

function installDifficulty(slotCost, installSource = 'commercial') {
  const commercial = installSource !== 'scratch';
  if ((slotCost ?? 0) === 0) {
    return commercial ? { dc: 10, timeHours: 1 / 6 } : { dc: 15, timeHours: 1 };
  }
  if ((slotCost ?? 0) === 1) {
    return commercial ? { dc: 20, timeHours: 1 } : { dc: 25, timeHours: 8 };
  }
  return commercial ? { dc: 30, timeHours: 8 } : { dc: 35, timeHours: 40 };
}

export class InstallRemoveEngine {
  constructor(profileResolver, slotEngine, costEngine, eligibilityEngine) {
    this.profileResolver = profileResolver;
    this.slotEngine = slotEngine;
    this.costEngine = costEngine;
    this.eligibilityEngine = eligibilityEngine;
  }

  previewInstall(actor, item, upgradeKey, installSource = 'commercial') {
    const upgrade = UPGRADE_CATALOG[upgradeKey];
    if (!upgrade) return { success: false, reason: 'unknown_upgrade' };
    const eligibility = this.eligibilityEngine.canInstallUpgrade(item, upgradeKey);
    if (!eligibility.allowed) return { success: false, reason: eligibility.reason };
    const cost = installSource === 'scratch' ? upgrade.cost * 2 : upgrade.cost;
    const funds = LedgerService.validateFunds(actor, cost);
    const difficulty = installDifficulty(upgrade.slotCost ?? 0, installSource);

    // Resolve effect payload to preview what will actually change on the item
    // Effect meaning belongs in the engine, not in UI templates
    const effectResolution = EffectResolver.resolveUpgradeEffects(item, upgrade, { actor, source: installSource });

    return {
      success: funds.ok,
      reason: funds.ok ? null : funds.reason,
      upgrade,
      cost,
      mechanicsDC: difficulty.dc,
      timeHours: difficulty.timeHours,
      installSource,
      resultingSlotState: this.slotEngine.getSlotAccounting(item),
      // Include effect preview for UI rendering
      effectPreview: effectResolution.success ? effectResolution.preview : null,
      effectWarnings: effectResolution.warnings
    };
  }

  async applyInstall(actor, item, upgradeKey, { installSource = 'commercial', mechanicsTotal = null } = {}) {
    // Guard against duplicate apply from double-click or network race
    const operationKey = `install_${upgradeKey}`;
    const dupeGuard = SafetyEngine.guardAgainstDuplicateApply(item.id, operationKey);
    if (!dupeGuard.allowed) {
      return {
        success: false,
        reason: 'operation_in_flight',
        blockingReason: dupeGuard.reason
      };
    }

    const preview = this.previewInstall(actor, item, upgradeKey, installSource);
    if (!preview.success) return preview;
    if ((Number(mechanicsTotal) || 0) < preview.mechanicsDC) {
      return {
        success: false,
        reason: 'mechanics_check_failed',
        failureData: {
          retryCost: this.costEngine.getRetryOperationCost(preview.cost),
          retryTimeHours: preview.timeHours,
          requiredDC: preview.mechanicsDC
        }
      };
    }

    // Revalidate at apply time (state may have changed since preview)
    const validation = SafetyEngine.validateCustomizationApply(item, { type: 'install', upgradeKey, slotCost: preview.upgrade.slotCost ?? 0 });
    if (!validation.success) {
      return {
        success: false,
        reason: 'validation_failed',
        validationErrors: validation.validationErrors,
        blockingReason: validation.blockingReason
      };
    }

    SafetyEngine.markOperationInFlight(item.id, operationKey);

    try {
      // Resolve effects to get actual item mutations
      // ActorEngine is the sole mutation authority
      const upgrade = UPGRADE_CATALOG[upgradeKey];
      const effectResolution = EffectResolver.resolveUpgradeEffects(item, upgrade, { actor, source: installSource });

      const customization = clone(this.slotEngine.getCustomizationState(item));
      customization.installedUpgrades = Array.isArray(customization.installedUpgrades) ? customization.installedUpgrades : [];
      customization.operationLog = Array.isArray(customization.operationLog) ? customization.operationLog : [];
      const instance = {
        instanceId: foundry.utils.randomID(),
        upgradeKey,
        slotCost: preview.upgrade.slotCost ?? 0,
        operationCost: preview.cost,
        restriction: preview.upgrade.restriction,
        installedAt: Date.now(),
        installSource,
        appliedEffects: effectResolution.mutations || {}
      };
      customization.installedUpgrades.push(instance);
      customization.operationLog.push({
        id: foundry.utils.randomID(),
        type: 'install',
        timestamp: Date.now(),
        appliedBy: actor.id,
        details: { upgradeKey, instanceId: instance.instanceId, cost: preview.cost, mechanicsDC: preview.mechanicsDC }
      });

      const legacyInstalled = Array.isArray(item.system?.installedUpgrades) ? foundry.utils.deepClone(item.system.installedUpgrades) : [];
      legacyInstalled.push({
        id: instance.instanceId,
        name: preview.upgrade.name,
        cost: preview.cost,
        slotsUsed: preview.upgrade.slotCost ?? 0,
        description: preview.upgrade.description,
        restriction: preview.upgrade.restriction
      });

      const delta = LedgerService.buildCreditDelta(actor, preview.cost);
      const mutationPlan = {
        set: {
          ...delta.set,
          'flags.foundryvtt-swse.customization': customization,
          'system.installedUpgrades': legacyInstalled
        }
      };

      // Apply effect mutations to the item state
      if (effectResolution.mutations) {
        const expandedEffects = foundry.utils.expandObject(effectResolution.mutations);
        mutationPlan.set = {
          ...mutationPlan.set,
          ...foundry.utils.flattenObject(expandedEffects)
        };
      }

      // MUTATION AUTHORITY: ActorEngine is the sole path for committing state changes
      // This is the only point where item/actor data is written
      // UI must never bypass this through direct update() calls
      await ActorEngine.applyMutationPlan(actor, mutationPlan, item);
      return {
        success: true,
        instanceId: instance.instanceId,
        cost: preview.cost,
        appliedEffects: effectResolution.mutations ? Object.keys(effectResolution.mutations) : []
      };
    } finally {
      SafetyEngine.clearOperationInFlight(item.id, operationKey);
    }
  }

  previewRemove(item, instanceId, { destructive = false } = {}) {
    const customization = this.slotEngine.getCustomizationState(item);
    const instance = (customization.installedUpgrades ?? []).find(upg => upg.instanceId === instanceId);
    if (!instance) return { success: false, reason: 'unknown_upgrade_instance' };
    const installBaseline = installDifficulty(instance.slotCost ?? 0, instance.installSource === 'scratch' ? 'scratch' : 'commercial');
    const difficulty = installBaseline.dc - 5;
    const timeHours = Math.max(1 / 6, installBaseline.timeHours);
    return {
      success: true,
      instance,
      mechanicsDC: Math.max(5, difficulty),
      timeHours: destructive ? Math.max(1 / 6, timeHours / 8) : timeHours,
      cost: destructive ? 0 : this.costEngine.getRemovalCost(instance),
      destructive
    };
  }

  async applyRemove(actor, item, instanceId, { mechanicsTotal = null, destructive = false } = {}) {
    // Guard against duplicate apply from double-click or network race
    const operationKey = `remove_${instanceId}`;
    const dupeGuard = SafetyEngine.guardAgainstDuplicateApply(item.id, operationKey);
    if (!dupeGuard.allowed) {
      return {
        success: false,
        reason: 'operation_in_flight',
        blockingReason: dupeGuard.reason
      };
    }

    const preview = this.previewRemove(item, instanceId, { destructive });
    if (!preview.success) return preview;
    if ((Number(mechanicsTotal) || 0) < preview.mechanicsDC) {
      return {
        success: false,
        reason: 'mechanics_check_failed',
        failureData: {
          retryCost: 0,
          retryTimeHours: preview.timeHours,
          requiredDC: preview.mechanicsDC,
          deactivatedButNotRemoved: !destructive
        }
      };
    }

    // Revalidate at apply time (state may have changed since preview)
    const validation = SafetyEngine.validateCustomizationApply(item, { type: 'remove', instanceId });
    if (!validation.success) {
      return {
        success: false,
        reason: 'validation_failed',
        validationErrors: validation.validationErrors,
        blockingReason: validation.blockingReason
      };
    }

    SafetyEngine.markOperationInFlight(item.id, operationKey);

    try {
      const customization = clone(this.slotEngine.getCustomizationState(item));
      customization.installedUpgrades = (customization.installedUpgrades ?? []).filter(upg => upg.instanceId !== instanceId);
      customization.operationLog = Array.isArray(customization.operationLog) ? customization.operationLog : [];
      customization.operationLog.push({
        id: foundry.utils.randomID(),
        type: 'remove',
        timestamp: Date.now(),
        appliedBy: actor.id,
        details: { instanceId, cost: preview.cost, mechanicsDC: preview.mechanicsDC, destructive }
      });

      const legacyInstalled = (Array.isArray(item.system?.installedUpgrades) ? foundry.utils.deepClone(item.system.installedUpgrades) : [])
        .filter(upg => upg.id !== instanceId);

      const mutation = { set: { 'flags.foundryvtt-swse.customization': customization, 'system.installedUpgrades': legacyInstalled } };
      if (!destructive && preview.cost > 0) {
        const delta = LedgerService.buildCreditDelta(actor, preview.cost);
        mutation.set = { ...delta.set, ...mutation.set };
      }
      // MUTATION AUTHORITY: ActorEngine is the sole path for committing state changes
      // This is the only point where item/actor data is written
      // UI must never bypass this through direct update() calls
      await ActorEngine.applyMutationPlan(actor, mutation, item);
      return { success: true, removedInstanceId: instanceId, cost: preview.cost };
    } finally {
      SafetyEngine.clearOperationInFlight(item.id, operationKey);
    }
  }
}
