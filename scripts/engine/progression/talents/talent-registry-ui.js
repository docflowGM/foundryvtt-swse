/**
 * Talent Registry - UI version
 * Loads and organizes talents by tree
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { AbilityEngine } from "/systems/foundryvtt-swse/scripts/engine/abilities/AbilityEngine.js";

export const TalentRegistry = {
  _trees: {},

  /**
   * Build the registry from compendium
   */
  async build() {
    try {
      const pack = game.packs.get('foundryvtt-swse.talents');
      if (!pack) {
        SWSELogger.warn("Talents compendium 'foundryvtt-swse.talents' not found");
        this._trees = {};
        return;
      }

      const docs = await pack.getDocuments();
      this._trees = {};

      docs.forEach(t => {
        const tree = t.system.talent_tree || 'Unknown';
        if (!this._trees[tree]) {
          this._trees[tree] = [];
        }
        this._trees[tree].push(t);
      });

      const totalTalents = Object.values(this._trees).reduce((sum, arr) => sum + arr.length, 0);
      SWSELogger.log(`TalentRegistry built: ${Object.keys(this._trees).length} trees, ${totalTalents} talents`);
    } catch (err) {
      SWSELogger.error('Failed to build TalentRegistry:', err);
      this._trees = {};
    }
  },

  /**
   * Get all talent trees for an actor, with qualification status
   */
  async listTreesForActor(actor, pending = {}) {
    const list = [];

    for (const tree in this._trees) {
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

        talents.push({
          name: talent.name,
          id: talent.id,
          isQualified: qualified,
          data: talent
        });
      }

      if (talents.length > 0) {
        list.push({
          treeName: tree,
          talents: talents
        });
      }
    }

    return list;
  },

  /**
   * Get a specific talent by name
   */
  get(name) {
    const lower = name.toLowerCase();
    for (const tree in this._trees) {
      const found = this._trees[tree].find(t => t.name.toLowerCase() === lower);
      if (found) {return found;}
    }
    return null;
  },

  /**
   * Get all talents in a specific tree
   */
  getTree(treeName) {
    return this._trees[treeName] || [];
  },

  /**
   * Get all talent tree names
   */
  getTreeNames() {
    return Object.keys(this._trees);
  },

  /**
   * Clear the registry
   */
  clear() {
    this._trees = {};
  }
};

SWSELogger.log('TalentRegistry (UI) module loaded');
