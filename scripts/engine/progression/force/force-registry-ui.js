/**
 * Force Registry - UI facade over canonical ForceRegistry.
 */
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { AbilityEngine } from "/systems/foundryvtt-swse/scripts/engine/abilities/AbilityEngine.js";
import { ForceRegistry as RootForceRegistry } from "/systems/foundryvtt-swse/scripts/engine/registries/force-registry.js";

export const ForceRegistry = {
  async build() {
    return RootForceRegistry.initialize?.();
  },

  listPowersForActor(actor) {
    return (RootForceRegistry.getByType?.('power') || []).map((power) => {
      let qualified = true;
      try {
        const assessment = AbilityEngine.evaluateAcquisition(actor, power, {});
        qualified = assessment.legal;
      } catch (err) {
        SWSELogger.warn(`Prerequisite check failed for ${power.name}:`, err);
      }
      return { name: power.name, id: power.id, isQualified: qualified, data: power };
    });
  },

  listSecretsForActor(actor) {
    return (RootForceRegistry.getByType?.('secret') || []).map((secret) => ({ name: secret.name, id: secret.id, isQualified: true, data: secret }));
  },

  listTechniquesForActor(actor) {
    return (RootForceRegistry.getByType?.('technique') || []).map((technique) => ({ name: technique.name, id: technique.id, isQualified: true, data: technique }));
  },

  getPower(name) { return RootForceRegistry.getByName?.(name); },
  getSecret(name) { const entry = RootForceRegistry.getByName?.(name); return entry?.type === 'secret' ? entry : null; },
  getTechnique(name) { const entry = RootForceRegistry.getByName?.(name); return entry?.type === 'technique' ? entry : null; },
  getPowers() { return RootForceRegistry.getByType?.('power') || []; },
  getSecrets() { return RootForceRegistry.getByType?.('secret') || []; },
  getTechniques() { return RootForceRegistry.getByType?.('technique') || []; },
  clear() { RootForceRegistry._entries = []; RootForceRegistry._byId = new Map(); RootForceRegistry._byName = new Map(); RootForceRegistry._byType = new Map(); RootForceRegistry._byCategory = new Map(); RootForceRegistry._byTag = new Map(); RootForceRegistry._initialized = false; }
};

SWSELogger.log('ForceRegistry (UI facade) module loaded');
