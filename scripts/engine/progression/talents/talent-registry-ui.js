/**
 * Talent Registry - UI facade over canonical TalentRegistry.
 */
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { AbilityEngine } from "/systems/foundryvtt-swse/scripts/engine/abilities/AbilityEngine.js";
import { TalentRegistry as RootTalentRegistry } from "/systems/foundryvtt-swse/scripts/registries/talent-registry.js";

export const TalentRegistry = {
  _trees: {},

  async build() {
    await RootTalentRegistry.initialize?.();
    this._trees = {};
    for (const talent of RootTalentRegistry.getAll?.() || []) {
      const tree = talent.talentTree || talent.category || 'Unknown';
      if (!this._trees[tree]) this._trees[tree] = [];
      this._trees[tree].push(talent);
    }
    const total = Object.values(this._trees).reduce((sum, arr) => sum + arr.length, 0);
    SWSELogger.log(`TalentRegistry built: ${Object.keys(this._trees).length} trees, ${total} talents`);
  },

  async listTreesForActor(actor, pending = {}) {
    const list = [];
    for (const tree of Object.keys(this._trees)) {
      const talents = [];
      for (const talent of this._trees[tree]) {
        let qualified = true;
        try {
          const assessment = AbilityEngine.evaluateAcquisition(actor, talent, pending);
          qualified = assessment.legal;
        } catch (err) {
          SWSELogger.warn(`Prerequisite check failed for ${talent.name}:`, err);
          qualified = false;
        }
        talents.push({ name: talent.name, id: talent.id, isQualified: qualified, data: talent });
      }
      if (talents.length > 0) list.push({ treeName: tree, talents });
    }
    return list;
  },

  get(name) {
    return RootTalentRegistry.getByName?.(name) || null;
  },

  getTree(treeName) {
    return this._trees[treeName] || [];
  },

  getTreeNames() {
    return Object.keys(this._trees);
  },

  clear() {
    this._trees = {};
  }
};

SWSELogger.log('TalentRegistry (UI facade) module loaded');
