import { ActorEngine } from '/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js';
import { LedgerService } from '/systems/foundryvtt-swse/scripts/engine/store/ledger-service.js';
import { resolveArmorData } from '/systems/foundryvtt-swse/scripts/items/armor-data-resolver.js';

function clone(data) { return foundry.utils.deepClone(data); }

function stepDieDown(formula) {
  if (!formula) return formula;
  const map = { d12: 'd10', d10: 'd8', d8: 'd6', d6: 'd4', d4: 'd3', d3: 'd2' };
  return String(formula).replace(/d12|d10|d8|d6|d4|d3/i, (match) => map[match.toLowerCase()] ?? match);
}

const RANGE_ORDER = ['heavy weapon', 'rifle', 'pistol', 'simple weapon (ranged)', 'thrown weapon', 'melee'];
function stepRangeDown(range) {
  const normalized = String(range ?? '').trim().toLowerCase();
  const idx = RANGE_ORDER.indexOf(normalized);
  if (idx === -1 || idx === RANGE_ORDER.length - 1) return range;
  return RANGE_ORDER[idx + 1];
}

export class StructuralChangeEngine {
  constructor(profileResolver, slotEngine, costEngine) {
    this.profileResolver = profileResolver;
    this.slotEngine = slotEngine;
    this.costEngine = costEngine;
  }

  previewSizeIncrease(actor, item) {
    const slotCheck = this.slotEngine.canApplySizeIncrease(item);
    const profile = this.profileResolver.getNormalizedProfile(item);
    if (!slotCheck.allowed) return { success: false, reason: slotCheck.reason };
    const cost = this.costEngine.getSizeIncreaseOperationCost(item);
    const funds = LedgerService.validateFunds(actor, cost);
    return {
      success: funds.ok,
      reason: funds.ok ? null : funds.reason,
      cost,
      timeHours: 8,
      mechanicsDC: 20,
      resultingSlotState: {
        ...this.slotEngine.getSlotAccounting(item),
        bonusFromSizeIncrease: 1,
        totalAvailable: this.slotEngine.getSlotAccounting(item).totalAvailable + 1,
        freeSlots: this.slotEngine.getSlotAccounting(item).freeSlots + 1
      },
      notes: profile.category === 'armor' ? 'Armor becomes one weight class heavier.' : 'Item is enlarged one size step for upgrade purposes.'
    };
  }

  async applySizeIncrease(actor, item, { mechanicsTotal = null } = {}) {
    const preview = this.previewSizeIncrease(actor, item);
    if (!preview.success) return preview;
    if ((Number(mechanicsTotal) || 0) < preview.mechanicsDC) {
      return {
        success: false,
        reason: 'mechanics_check_failed',
        failureData: {
          retryCost: this.costEngine.getRetryOperationCost(preview.cost),
          retryTimeHours: 8,
          requiredDC: preview.mechanicsDC
        }
      };
    }

    const customization = clone(this.slotEngine.getCustomizationState(item));
    customization.structural ??= { sizeIncreaseApplied: false, strippedAreas: [] };
    customization.structural.sizeIncreaseApplied = true;
    customization.operationLog = Array.isArray(customization.operationLog) ? customization.operationLog : [];
    customization.operationLog.push({
      id: foundry.utils.randomID(),
      type: 'size_increase',
      timestamp: Date.now(),
      appliedBy: actor.id,
      details: { cost: preview.cost, mechanicsDC: preview.mechanicsDC }
    });

    const update = {
      'flags.foundryvtt-swse.customization': customization,
      'system.sizeIncreaseApplied': true,
      'system.upgradeSlots': this.slotEngine.getStockBaseSlots(item) + 1 + (customization.structural?.strippedAreas?.length ?? 0)
    };
    if (this.profileResolver.getNormalizedProfile(item).category === 'armor') {
      const current = this.profileResolver.getNormalizedProfile(item).armorWeightClass;
      const next = current === 'light' ? 'medium' : current === 'medium' ? 'heavy' : current;
      update['system.armorType'] = next;
    }

    const delta = LedgerService.buildCreditDelta(actor, preview.cost);
    // MUTATION AUTHORITY: ActorEngine is the sole path for committing state changes
    // This is the only point where item/actor data is written
    // UI must never bypass this through direct update() calls
    await ActorEngine.applyMutationPlan(actor, { set: { ...delta.set, ...update } }, item);
    return { success: true, cost: preview.cost, mechanicsDC: preview.mechanicsDC };
  }

  previewStrip(actor, item, areaKey) {
    const stripCheck = this.slotEngine.canStripArea(item, areaKey);
    if (!stripCheck.allowed) return { success: false, reason: stripCheck.reason };
    const cost = this.costEngine.getStripOperationCost(item, areaKey);
    const funds = LedgerService.validateFunds(actor, cost);
    return {
      success: funds.ok,
      reason: funds.ok ? null : funds.reason,
      cost,
      timeHours: 8,
      mechanicsDC: 20,
      areaKey,
      notes: 'Stripping permanently downgrades the selected area and grants +1 upgrade slot.'
    };
  }

  async applyStrip(actor, item, areaKey, { mechanicsTotal = null } = {}) {
    const preview = this.previewStrip(actor, item, areaKey);
    if (!preview.success) return preview;
    if ((Number(mechanicsTotal) || 0) < preview.mechanicsDC) {
      return {
        success: false,
        reason: 'mechanics_check_failed',
        failureData: {
          retryCost: this.costEngine.getRetryOperationCost(preview.cost),
          retryTimeHours: 1,
          requiredDC: preview.mechanicsDC,
          itemDisabledUntilFixed: true
        }
      };
    }

    const profile = this.profileResolver.getNormalizedProfile(item);
    const customization = clone(this.slotEngine.getCustomizationState(item));
    customization.structural ??= { sizeIncreaseApplied: false, strippedAreas: [] };
    customization.structural.strippedAreas = Array.isArray(customization.structural.strippedAreas) ? customization.structural.strippedAreas : [];
    customization.structural.strippedAreas.push(areaKey);
    customization.operationLog = Array.isArray(customization.operationLog) ? customization.operationLog : [];
    customization.operationLog.push({
      id: foundry.utils.randomID(),
      type: 'strip',
      timestamp: Date.now(),
      appliedBy: actor.id,
      details: { areaKey, cost: preview.cost, mechanicsDC: preview.mechanicsDC }
    });

    const update = {
      'flags.foundryvtt-swse.customization': customization,
      'system.upgradeSlots': this.slotEngine.getStockBaseSlots(item) + (customization.structural.sizeIncreaseApplied ? 1 : 0) + customization.structural.strippedAreas.length
    };

    if (profile.category === 'armor') {
      const armor = resolveArmorData(item);
      if (areaKey === 'defensive_material') {
        const nextReflex = Math.max(0, (Number(armor.reflexBonus) || 0) - 1);
        const nextFortitude = Math.max(0, (Number(armor.fortitudeBonus) || 0) - 1);
        update['system.defenseBonus'] = nextReflex;
        update['system.reflexBonus'] = nextReflex;
        update['system.armorBonus'] = nextReflex;
        update['system.fortitudeBonus'] = nextFortitude;
        update['system.fortBonus'] = nextFortitude;
        update['system.strippedFeatures.defensiveMaterial'] = true;
      }
      if (areaKey === 'joint_protection') {
        const currentMaxDex = armor.maxDexBonus ?? 0;
        const nextMaxDex = currentMaxDex - 1;
        update['system.weight'] = (Number(item.system?.weight) || 0) * 2;
        update['system.maxDexBonus'] = nextMaxDex;
        update['system.maxDex'] = nextMaxDex === null ? 999 : nextMaxDex;
        update['system.strippedFeatures.jointProtection'] = true;
      }
    } else {
      if (areaKey === 'damage') {
        update['system.baseDamageStripped'] = item.system?.baseDamageStripped || item.system?.damage || '';
        update['system.damage'] = stepDieDown(item.system?.damage);
        update['system.strippedFeatures.damage'] = true;
      }
      if (areaKey === 'range') {
        update['system.baseRangeStripped'] = item.system?.baseRangeStripped || item.system?.range || '';
        update['system.range'] = stepRangeDown(item.system?.range);
        update['system.strippedFeatures.range'] = true;
      }
      if (areaKey === 'design') {
        update['system.isExotic'] = true;
        update['system.strippedFeatures.design'] = true;
      }
      if (areaKey === 'stun_setting') {
        update['system.stun'] = false;
        update['system.strippedFeatures.stun'] = true;
      }
      if (areaKey === 'autofire') {
        update['system.autofire'] = false;
        update['system.strippedFeatures.autofire'] = true;
      }
    }

    const delta = LedgerService.buildCreditDelta(actor, preview.cost);
    // MUTATION AUTHORITY: ActorEngine is the sole path for committing state changes
    // This is the only point where item/actor data is written
    // UI must never bypass this through direct update() calls
    await ActorEngine.applyMutationPlan(actor, { set: { ...delta.set, ...update } }, item);
    return { success: true, areaKey, cost: preview.cost, mechanicsDC: preview.mechanicsDC };
  }
}
