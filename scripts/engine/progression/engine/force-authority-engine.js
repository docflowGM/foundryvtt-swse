/**
 * force-authority-engine.js
 */

import { swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { SelectionModifierHookRegistry } from "/systems/foundryvtt-swse/scripts/engine/progression/engine/selection-modifier-hook-registry.js";
import { ForceProvenanceEngine } from "/systems/foundryvtt-swse/scripts/engine/progression/engine/force-provenance-engine.js";
import { HouseRuleService } from "/systems/foundryvtt-swse/scripts/engine/system/HouseRuleService.js";
import { resolveForceSecretEntitlements, resolveForceTechniqueEntitlements } from "/systems/foundryvtt-swse/scripts/engine/progression/utils/force-suite-resolution.js";

export class ForceAuthorityEngine {
  static _hasFeatLike(actor, fragment) {
    const needle = String(fragment || '').toLowerCase();
    return (actor?.items || []).some((item) => item.type === 'feat' && String(item.name || '').toLowerCase().includes(needle));
  }

  static _getForceAbilityKey() {
    const configured = HouseRuleService.get('forceTrainingAttribute', 'wisdom');
    return configured === 'charisma' ? 'cha' : 'wis';
  }

  static async getForceCapacity(actor) {
    if (!actor) return 0;
    try {
      let capacity = 0;
      const hasForceSensitivity = this._hasFeatLike(actor, 'force sensitivity');
      if (hasForceSensitivity) capacity += 1;

      const forceTrainingFeats = (actor.items || []).filter((i) => i.type === 'feat' && String(i.name || '').toLowerCase().includes('force training'));
      if (forceTrainingFeats.length > 0) {
        const abilityKey = this._getForceAbilityKey();
        const abilityMod = actor.system?.abilities?.[abilityKey]?.mod ?? actor.system?.attributes?.[abilityKey]?.mod ?? 0;
        capacity += forceTrainingFeats.length * (1 + Math.max(0, abilityMod));
      }

      return capacity;
    } catch (e) {
      swseLogger.error('[FORCE CAPACITY] Error calculating capacity', e);
      return 0;
    }
  }

  static async getSelectionContext(actor) {
    const baseCapacity = await this.getForceCapacity(actor);
    const context = { baseCapacity, conditionalBonusSlots: [], totalCapacity: baseCapacity };
    if (actor) SelectionModifierHookRegistry.applyAll(actor, context);
    return context;
  }

  static async getProvenanceContext(actor) {
    const ledger = await ForceProvenanceEngine.reconcileForceGrants(actor, 'query');
    return {
      ledger,
      totalEntitled: ForceProvenanceEngine.getTotalEntitled(ledger),
      totalOwned: ForceProvenanceEngine.getTotalOwned(ledger),
      totalOwed: ForceProvenanceEngine.getTotalOwed(ledger),
      hasLegacyIssues: ForceProvenanceEngine.hasLegacyIssues(ledger),
      legacyIssues: ForceProvenanceEngine.getLegacyIssues(ledger),
      getGrant: (grantSourceId) => ForceProvenanceEngine.getGrantDetails(ledger, grantSourceId),
      formatGrantName: (grantSourceId) => ForceProvenanceEngine.formatGrantSourceName(grantSourceId),
      isUnderEntitled: () => ForceProvenanceEngine.getTotalOwed(ledger) > 0,
    };
  }

  static _powerMatchesSlotRestriction(power, slot) {
    if (!power) return false;
    if (!slot.descriptorRestrictions || slot.descriptorRestrictions.length === 0) return true;
    const powerName = power.name?.toLowerCase() ?? '';
    if (slot.powerNameHint?.length > 0 && slot.powerNameHint.some((hint) => powerName.includes(hint.toLowerCase()))) return true;
    const rawDescriptors = power.system?.descriptors ?? power.system?.descriptor ?? [];
    const descriptorArray = Array.isArray(rawDescriptors) ? rawDescriptors.map((d) => String(d).toLowerCase()) : [String(rawDescriptors).toLowerCase()];
    return slot.descriptorRestrictions.some((restriction) => descriptorArray.includes(restriction.toLowerCase()));
  }

  static async validateForceAccess(actor) {
    if (!actor) return { valid: false, reason: 'No actor provided' };
    try {
      const hasForceSensitivity = this._hasFeatLike(actor, 'force sensitivity');
      const hasForceTraining = this._hasFeatLike(actor, 'force training');
      if (!hasForceSensitivity && !hasForceTraining) return { valid: false, reason: 'Force capability required' };
      const unlockedDomains = actor.system?.progression?.unlockedDomains || [];
      if (!unlockedDomains.includes('force') && !hasForceSensitivity && !hasForceTraining) return { valid: false, reason: 'Force domain not unlocked' };
      return { valid: true };
    } catch (e) {
      swseLogger.error('[FORCE ACCESS] Validation error', e);
      return { valid: false, reason: 'Access validation failed' };
    }
  }

  static async getSelectionState(actor, { shell = null } = {}) {
    const access = await this.validateForceAccess(actor);
    const selectionContext = await this.getSelectionContext(actor);
    const ownedPowers = actor?.items?.filter((item) => item.type === 'force-power')?.length ?? 0;
    const powerRemaining = Math.max(0, selectionContext.totalCapacity - ownedPowers);

    const secrets = shell ? resolveForceSecretEntitlements(shell, null, actor) : { total: 0, selected: 0, remaining: 0, reasons: [] };
    const techniques = shell ? resolveForceTechniqueEntitlements(shell, null, actor) : { total: 0, selected: 0, remaining: 0, reasons: [] };

    return {
      access,
      powers: {
        totalCapacity: selectionContext.totalCapacity,
        owned: ownedPowers,
        remaining: powerRemaining,
        reason: powerRemaining > 0 ? 'Outstanding force power selections' : null,
      },
      secrets,
      techniques,
    };
  }

  static async validateForceSelection(actor, powerIds = []) {
    if (!actor) return { valid: false, reason: 'No actor provided' };
    if (!Array.isArray(powerIds)) return { valid: false, reason: 'powerIds must be an array' };
    try {
      const selectionContext = await this.getSelectionContext(actor);
      const uniqueIds = new Set(powerIds);
      if (uniqueIds.size !== powerIds.length) return { valid: false, reason: 'Duplicate force power selection' };
      if (powerIds.length > selectionContext.totalCapacity) return { valid: false, reason: `Over capacity: ${powerIds.length} > ${selectionContext.totalCapacity}` };
      return { valid: true, capacityUsed: powerIds.length };
    } catch (e) {
      swseLogger.error('[FORCE SELECTION] Validation error', e);
      return { valid: false, reason: 'Selection validation failed' };
    }
  }
}
