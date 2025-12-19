
// ======================================================================
// TalentTreeRegistry.js
// Backend registry that builds enriched talent trees using:
//  - TalentTreeGraph
//  - PrerequisiteEnricher
// ======================================================================

import { TalentTreeGraph } from "./TalentTreeGraph.js";
import { PrerequisiteEnricher } from "../utils/PrerequisiteEnricher.js";

export class TalentTreeRegistry {
  static trees = new Map(); // treeName → TalentTreeGraph

  // ------------------------------------------------------------
  // Build registry from compendium
  // ------------------------------------------------------------
  static async build() {
    const pack = game.packs.get("foundryvtt-swse.talents");
    if (!pack) {
      console.warn("[TalentTreeRegistry] Compendium not found.");
      this.trees = new Map();
      return;
    }

    const docs = await pack.getDocuments();
    this.trees = new Map();

    // Group by tree name
    const grouped = {};
    for (const d of docs) {
      const tree = d.system?.talent_tree ?? "Unknown";
      if (!grouped[tree]) grouped[tree] = [];
      grouped[tree].push(d);
    }

    // Build graph per tree
    for (const treeName of Object.keys(grouped)) {
      const graph = new TalentTreeGraph(treeName);

      // 1. Add nodes
      for (const doc of grouped[treeName]) {
        const node = graph.addTalent(doc);
        PrerequisiteEnricher.enrich(node);
      }

      // 2. Link talent → required talent edges
      for (const node of graph.nodes.values()) {
        for (const req of node.prereq) {
          if (req.type === "talent") {
            const targetName = req.name.toLowerCase();
            const requiredNode = [...graph.nodes.values()]
              .find(n => n.name.toLowerCase() === targetName);
            if (requiredNode) {
              graph.linkRequirement(node.id, requiredNode.id);
            }
          }
        }
      }

      this.trees.set(treeName, graph);
    }

    console.log(
      `[TalentTreeRegistry] Loaded ${this.trees.size} trees from compendium.`
    );
  }

  // ------------------------------------------------------------
  // Accessors
  // ------------------------------------------------------------

  static getTreeNames() {
    return [...this.trees.keys()];
  }

  static getTree(name) {
    return this.trees.get(name);
  }

  static getTalentByName(name) {
    const lower = name.toLowerCase();
    for (const graph of this.trees.values()) {
      for (const node of graph.nodes.values()) {
        if (node.name.toLowerCase() === lower) return node;
      }
    }
    return null;
  }
}
