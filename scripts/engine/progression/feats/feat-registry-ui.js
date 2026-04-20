/**
 * Feat Registry - UI facade over canonical FeatRegistry.
 */
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { AbilityEngine } from "/systems/foundryvtt-swse/scripts/engine/abilities/AbilityEngine.js";
import BaseFeatRegistry from "/systems/foundryvtt-swse/scripts/engine/progression/feats/feat-registry.js";

export const FeatRegistry = {
  async build() {
    return BaseFeatRegistry.build?.();
  },

  async listAvailable(actor, pending = {}) {
    return (BaseFeatRegistry.list?.() || []).map((feat) => {
      let valid = true;
      try {
        const assessment = AbilityEngine.evaluateAcquisition(actor, feat, pending);
        valid = assessment.legal;
      } catch (err) {
        SWSELogger.warn(`Prerequisite check failed for ${feat.name}:`, err);
        valid = false;
      }

      return {
        name: feat.name,
        id: feat.id,
        isQualified: valid,
        data: feat,
      };
    });
  },

  get(name) {
    return BaseFeatRegistry.get?.(name) || null;
  },

  list() {
    return BaseFeatRegistry.list?.() || [];
  },

  getBonusFeats() {
    return BaseFeatRegistry.getBonusFeats?.() || [];
  },

  canBeBonusFeatFor(featName, className) {
    const feat = typeof featName === 'string' ? this.get(featName) : featName;
    return BaseFeatRegistry.canBeBonusFeatFor?.(feat, className) ?? false;
  },

  clear() {
    BaseFeatRegistry.feats?.clear?.();
    BaseFeatRegistry._byKey?.clear?.();
    BaseFeatRegistry.isBuilt = false;
  }
};

SWSELogger.log('FeatRegistry (UI facade) module loaded');
