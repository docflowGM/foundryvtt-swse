import { FeatGrantEntitlementResolver } from "/systems/foundryvtt-swse/scripts/engine/progression/feats/feat-grant-entitlement-resolver.js";
import { ForcePointFeatRules } from "/systems/foundryvtt-swse/scripts/engine/feats/force-point-feat-rules.js";

let registered = false;

export function registerForceTrainingEntitlementRuntimePatches() {
  if (registered) return;
  registered = true;

  const originalGetForceTrainingSlotsPerInstance = FeatGrantEntitlementResolver.getForceTrainingSlotsPerInstance?.bind(FeatGrantEntitlementResolver);
  if (typeof originalGetForceTrainingSlotsPerInstance === 'function') {
    FeatGrantEntitlementResolver.getForceTrainingSlotsPerInstance = function swseForceTrainingSlotsWithJediHeritage(actor, shell = null) {
      const base = Math.max(1, Number(originalGetForceTrainingSlotsPerInstance(actor, shell)) || 1);
      const bonus = Math.max(0, Number(ForcePointFeatRules.getForceTrainingPowerBonusPerInstance(actor)) || 0);
      return base + bonus;
    };
  }

  const originalResolveForFeat = FeatGrantEntitlementResolver.resolveForFeat?.bind(FeatGrantEntitlementResolver);
  if (typeof originalResolveForFeat === 'function') {
    FeatGrantEntitlementResolver.resolveForFeat = function swseResolveForceTrainingJediHeritage(actor, featEntry, index = 0, options = {}) {
      const entries = originalResolveForFeat(actor, featEntry, index, options);
      for (const entry of entries) {
        if (entry?.grantType !== 'forcePowerSlots') continue;
        const bonus = Math.max(0, Number(ForcePointFeatRules.getForceTrainingPowerBonusPerInstance(actor)) || 0);
        if (!bonus) continue;
        entry.jediHeritageBonus = bonus;
        entry.countFormula = `${entry.countFormula ?? 'forceTrainingBase'} + Jedi Heritage ${bonus}`;
        entry.notes = [...(Array.isArray(entry.notes) ? entry.notes : []), `Jedi Heritage: +${bonus} Force Powers per Force Training feat.`];
      }
      return entries;
    };
  }

  globalThis.SWSE ??= {};
  globalThis.SWSE.ForceTrainingEntitlementRuntime = { patched: true };
}

export default registerForceTrainingEntitlementRuntimePatches;
