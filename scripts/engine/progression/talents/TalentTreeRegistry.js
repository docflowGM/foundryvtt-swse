async function loadJSON(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load JSON: ${url}`);
  }
  return response.json();
}

import { TalentTreeGraph } from "/systems/foundryvtt-swse/scripts/engine/progression/talents/TalentTreeGraph.js";
import { PrerequisiteEnricher } from "/systems/foundryvtt-swse/scripts/engine/progression/utils/PrerequisiteEnricher.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { TalentTreeDB } from "/systems/foundryvtt-swse/scripts/data/talent-tree-db.js";
import { TalentDB } from "/systems/foundryvtt-swse/scripts/data/talent-db.js";

export class TalentTreeRegistry {
  static trees = new Map();

  static async build() {
    SWSELogger.log(`[TALENT-TREE-REGISTRY] build: START - Building talent tree registry`);

    if (!TalentTreeDB.isBuilt) {
      await TalentTreeDB.build();
    }
    if (!TalentDB.isBuilt) {
      await TalentDB.build(TalentTreeDB);
    }

    const talentById = new Map((TalentDB.all?.() || []).map((t) => [t.id, t]));
    const normalizeName = (s) => String(s || '').toLowerCase().replace(/['’`]/g, '').replace(/\s+/g, ' ').trim();
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
      }
      return names;
    };

    this.trees = new Map();
    for (const tree of TalentTreeDB.all?.() || []) {
      const graph = new TalentTreeGraph(tree.name);
      for (const talentId of tree.talentIds || []) {
        const talent = talentById.get(talentId);
        if (!talent) continue;
        const docLike = {
          ...talent,
          id: talent.id,
          _id: talent.id,
          name: talent.name,
          system: talent.system || {},
        };
        const node = graph.addTalent(docLike);
        PrerequisiteEnricher.enrich(node);
      }

      const idByName = new Map();
      for (const n of graph.nodes.values()) idByName.set(normalizeName(n.name), n.id);
      for (const n of graph.nodes.values()) {
        const prereqNames = extractTalentNamesFromPrereq(n.prereq);
        for (const prereqName of prereqNames) {
          const reqId = idByName.get(normalizeName(prereqName));
          if (reqId) graph.linkRequirement(n.id, reqId);
        }
      }
      this.trees.set(tree.name, graph);
    }

    SWSELogger.log(`[TALENT-TREE-REGISTRY] build: Built ${this.trees.size} graphs from canonical talent tree data`);
  }

  static getTreeNames() { return [...this.trees.keys()]; }
  static getTree(name) { return this.trees.get(name); }
  static getTalentByName(name) {
    const lower = String(name || '').toLowerCase();
    for (const graph of this.trees.values()) {
      for (const node of graph.nodes.values()) {
        if (String(node.name || '').toLowerCase() === lower) return node;
      }
    }
    return null;
  }
}

const generatedTalentTrees = await loadJSON('../../../systems/foundryvtt-swse/data/generated/talent-trees.registry.json');

export function loadGeneratedTalentTrees(registry) {
  if (!Array.isArray(generatedTalentTrees)) return false;
  for (const tree of generatedTalentTrees) {
    registry.registerTree(tree.id, tree);
  }
  console.log(`[SWSE] Loaded generated talent trees: ${generatedTalentTrees.length}`);
  return true;
}
