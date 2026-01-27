
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
import { TalentTreeDB } from "../../data/talent-tree-db.js";
import { normalizeTalentTreeId } from "../../data/talent-tree-normalizer.js";

export class TalentTreeRegistry {
  static trees = new Map(); // treeName → TalentTreeGraph

  // ------------------------------------------------------------
  // Build registry from compendium
  // ------------------------------------------------------------
  static async build() {
    SWSELogger.log(`[TALENT-TREE-REGISTRY] build: START - Building talent tree registry`);

    const talentsPack = game.packs.get("foundryvtt-swse.talents");
    const treesPack = game.packs.get("foundryvtt-swse.talent_trees");

    if (!talentsPack) {
      SWSELogger.error(`[TALENT-TREE-REGISTRY] ERROR: Talents compendium pack not found`);
      this.trees = new Map();
      return;
    }

    const talentDocs = await talentsPack.getDocuments();
    const talentById = new Map(talentDocs.map(d => [d.id, d]));

    const normalizeName = (s) => String(s || '')
      .toLowerCase()
      .replace(/['’`]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    const extractTalentNamesFromPrereq = (pr) => {
      const names = [];
      if (!pr) return names;
      if (Array.isArray(pr)) {
        for (const p of pr) names.push(...extractTalentNamesFromPrereq(p));
        return names;
      }
      if (typeof pr !== 'object') return names;

      if (pr.type === 'talent' && pr.name) {
        names.push(pr.name);
        return names;
      }

      if (pr.type === 'or' && Array.isArray(pr.conditions)) {
        for (const c of pr.conditions) names.push(...extractTalentNamesFromPrereq(c));
        return names;
      }

      // Unknown / non-talent prereqs ignored for graph edges
      return names;
    };


    // Prefer canonical talent_trees compendium (drift-safe, SSOT)
    let treeDocs = [];
    if (treesPack) {
      treeDocs = await treesPack.getDocuments();
      SWSELogger.log(`[TALENT-TREE-REGISTRY] build: Retrieved ${treeDocs.length} talent tree documents from compendium`);
    } else {
      SWSELogger.warn(`[TALENT-TREE-REGISTRY] build: Talent trees compendium not found; falling back to talent document grouping`);
    }

    this.trees = new Map();

    // Helper: add tree from explicit talentIds
    const addTreeFromIds = async (treeName, talentIds) => {
      const graph = new TalentTreeGraph(treeName);

      for (const tid of (talentIds || [])) {
        const doc = talentById.get(tid);
        if (!doc) {
          SWSELogger.warn(`[TALENT-TREE-REGISTRY] Tree "${treeName}" references missing talent id: ${tid}`);
          continue;
        }
        const node = graph.addTalent(doc);
        PrerequisiteEnricher.enrich(node);
      }

      // Link edges for all nodes (talent prerequisites only)
      const idByName = new Map();
      for (const n of graph.nodes.values()) idByName.set(normalizeName(n.name), n.id);

      for (const n of graph.nodes.values()) {
        const prereqNames = extractTalentNamesFromPrereq(n.prereq);
        for (const prereqName of prereqNames) {
          const reqId = idByName.get(normalizeName(prereqName));
          if (reqId) graph.linkRequirement(n.id, reqId);
        }
      }
this.trees.set(treeName, graph);
      return graph;
    };

    // Build from tree docs when available
    if (treeDocs.length > 0) {
      for (const td of treeDocs) {
        const treeName = td.name;
        const talentIds = td.system?.talentIds || [];
        await addTreeFromIds(treeName, talentIds);
      }

      SWSELogger.log(`[TALENT-TREE-REGISTRY] build: Built ${this.trees.size} graphs from canonical talent trees`);
      return;
    }

    // Fallback: legacy grouping by talent.system.talent_tree (non-authoritative)
    const grouped = {};
    const unassignedTalents = [];
    for (const d of talentDocs) {
      const sys = d.system || {};
      let rawTree = sys.talent_tree || sys.tree || sys.treeId || null;
      let tree = rawTree ? String(rawTree).trim().replace(/\s+/g, ' ') : null;

      if (!tree) {
        unassignedTalents.push(d.name);
        tree = "Unassigned";
      }

      if (!grouped[tree]) grouped[tree] = [];
      grouped[tree].push(d);
    }

    if (unassignedTalents.length > 0) {
      SWSELogger.warn(`[TALENT-TREE-REGISTRY] ${unassignedTalents.length} talents have no tree assigned. First 5: ${unassignedTalents.slice(0, 5).join(', ')}`);
    }

    for (const treeName of Object.keys(grouped)) {
      const graph = new TalentTreeGraph(treeName);
      for (const doc of grouped[treeName]) {
        const node = graph.addTalent(doc);
        PrerequisiteEnricher.enrich(node);
      }
      // Link edges for all nodes (talent prerequisites only)
      const idByName = new Map();
      for (const n of graph.nodes.values()) idByName.set(normalizeName(n.name), n.id);

      for (const n of graph.nodes.values()) {
        const prereqNames = extractTalentNamesFromPrereq(n.prereq);
        for (const prereqName of prereqNames) {
          const reqId = idByName.get(normalizeName(prereqName));
          if (reqId) graph.linkRequirement(n.id, reqId);
        }
      }
      this.trees.set(treeName, graph);
    }

    SWSELogger.log(`[TALENT-TREE-REGISTRY] build: Built ${this.trees.size} graphs via legacy talent grouping`);


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
