
async function loadJSON(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load JSON: ${url}`);
  }
  return response.json();
}



// ======================================================================
// TalentTreeRegistry.js
// Backend registry that builds enriched talent trees using:
//  - TalentTreeGraph
//  - PrerequisiteEnricher
// ======================================================================

import { TalentTreeGraph } from "./TalentTreeGraph.js";
import { PrerequisiteEnricher } from "../utils/PrerequisiteEnricher.js";
import { SWSELogger } from "../../utils/logger.js";

export class TalentTreeRegistry {
  static trees = new Map(); // treeName → TalentTreeGraph

  // ------------------------------------------------------------
  // Build registry from compendium
  // ------------------------------------------------------------
  static async build() {
    SWSELogger.log(`[TALENT-TREE-REGISTRY] build: START - Building talent tree registry`);

    const pack = game.packs.get("foundryvtt-swse.talents");
    if (!pack) {
      SWSELogger.error(`[TALENT-TREE-REGISTRY] ERROR: Talents compendium pack not found`);
      this.trees = new Map();
      return;
    }
    SWSELogger.log(`[TALENT-TREE-REGISTRY] build: Talents pack located`);

    const docs = await pack.getDocuments();
    SWSELogger.log(`[TALENT-TREE-REGISTRY] build: Retrieved ${docs.length} talent documents from compendium`);
    this.trees = new Map();

    // Group by tree name
    const grouped = {};
    for (const d of docs) {
      const tree = d.system?.talent_tree ?? "Unknown";
      if (!grouped[tree]) grouped[tree] = [];
      grouped[tree].push(d);
    }
    SWSELogger.log(`[TALENT-TREE-REGISTRY] build: Grouped talents into ${Object.keys(grouped).length} unique trees:`, Object.keys(grouped));

    // Build graph per tree
    for (const treeName of Object.keys(grouped)) {
      SWSELogger.log(`[TALENT-TREE-REGISTRY] build: Building graph for tree "${treeName}" with ${grouped[treeName].length} talents`);
      const graph = new TalentTreeGraph(treeName);

      // 1. Add nodes
      let nodeCount = 0;
      for (const doc of grouped[treeName]) {
        const node = graph.addTalent(doc);
        PrerequisiteEnricher.enrich(node);
        nodeCount++;
      }
      SWSELogger.log(`[TALENT-TREE-REGISTRY] build: Added ${nodeCount} nodes to tree "${treeName}"`);

      // 2. Link talent → required talent edges
      let linkedCount = 0;
      for (const node of graph.nodes.values()) {
        for (const req of node.prereq) {
          if (req.type === "talent") {
            const targetName = req.name.toLowerCase();
            const requiredNode = [...graph.nodes.values()]
              .find(n => n.name.toLowerCase() === targetName);
            if (requiredNode) {
              graph.linkRequirement(node.id, requiredNode.id);
              linkedCount++;
              SWSELogger.log(`[TALENT-TREE-REGISTRY] build: Linked prerequisite - "${node.name}" requires "${requiredNode.name}"`);
            } else {
              SWSELogger.warn(`[TALENT-TREE-REGISTRY] build: WARNING - Prerequisite talent not found: "${req.name}" required by "${node.name}"`);
            }
          }
        }
      }
      SWSELogger.log(`[TALENT-TREE-REGISTRY] build: Created ${linkedCount} talent prerequisite links for tree "${treeName}"`);

      this.trees.set(treeName, graph);
    }

    SWSELogger.log(
      `[TALENT-TREE-REGISTRY] build: COMPLETE - Loaded ${this.trees.size} talent trees from compendium`
    );
  }

  // ------------------------------------------------------------
  // Accessors
  // ------------------------------------------------------------

  static getTreeNames() {
    const names = [...this.trees.keys()];
    SWSELogger.log(`[TALENT-TREE-REGISTRY] getTreeNames: Retrieved ${names.length} tree names:`, names);
    return names;
  }

  static getTree(name) {
    SWSELogger.log(`[TALENT-TREE-REGISTRY] getTree: Looking up tree "${name}"`);
    const tree = this.trees.get(name);
    if (tree) {
      SWSELogger.log(`[TALENT-TREE-REGISTRY] getTree: Tree "${name}" FOUND with ${tree.nodes.size} nodes`);
    } else {
      SWSELogger.warn(`[TALENT-TREE-REGISTRY] getTree: Tree "${name}" NOT FOUND. Available trees:`, [...this.trees.keys()]);
    }
    return tree;
  }

  static getTalentByName(name) {
    SWSELogger.log(`[TALENT-TREE-REGISTRY] getTalentByName: Searching for talent "${name}" across ${this.trees.size} trees`);
    const lower = name.toLowerCase();
    for (const graphName of this.trees.keys()) {
      const graph = this.trees.get(graphName);
      for (const node of graph.nodes.values()) {
        if (node.name.toLowerCase() === lower) {
          SWSELogger.log(`[TALENT-TREE-REGISTRY] getTalentByName: Found talent "${name}" in tree "${graphName}"`);
          return node;
        }
      }
    }
    SWSELogger.warn(`[TALENT-TREE-REGISTRY] getTalentByName: Talent "${name}" NOT FOUND in any tree`);
    return null;
  }
}



// ============================================================
// GENERATED TALENT TREE REGISTRY INTEGRATION
// ============================================================

let generatedTalentTrees = await loadJSON('../../../systems/foundryvtt-swse/data/generated/talent-trees.registry.json');

export function loadGeneratedTalentTrees(registry) {
  if (!Array.isArray(generatedTalentTrees)) return false;

  for (const tree of generatedTalentTrees) {
    registry.registerTree(tree.id, tree);
  }

  console.log(`[SWSE] Loaded generated talent trees: ${generatedTalentTrees.length}`);
  return true;
}
