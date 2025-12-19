
// ======================================================================
// talent-registry-ui.js
//
// UI wrapper over TalentTreeRegistry + RuleEngine
// Provides:
//   listTreesForActor(actor)
//   get(treeName)
//   getTreeNames()
// ======================================================================

import { TalentTreeRegistry } from "../progression/talents/TalentTreeRegistry.js";
import { RuleEngine } from "../progression/RuleEngine.js";

export const TalentRegistryUI = {

  /**
   * Returns [{ treeName, talents: [{name, id, isQualified}] }]
   */
  listTreesForActor(actor, pending = {}) {
    const result = [];

    for (const treeName of TalentTreeRegistry.getTreeNames()) {
      const graph = TalentTreeRegistry.getTree(treeName);
      if (!graph) continue;

      const ruleEngine = new RuleEngine(actor, pending);
      const talents = [];

      for (const node of graph.nodes.values()) {
        const qualified = ruleEngine.qualifies(node);
        talents.push({
          name: node.name,
          id: node.id,
          isQualified: qualified,
          prereq: node.prereq,
          requires: [...node.requires],
          unlocks: [...node.unlocks]
        });
      }

      result.push({ treeName, talents });
    }

    return result;
  },

  /**
   * Get a specific talent node by name
   */
  get(name) {
    return TalentTreeRegistry.getTalentByName(name);
  },

  getTree(name) {
    const graph = TalentTreeRegistry.getTree(name);
    if (!graph) return [];
    return [...graph.nodes.values()];
  },

  getTreeNames() {
    return TalentTreeRegistry.getTreeNames();
  }
};

console.log("[TalentRegistryUI] Module loaded.");
