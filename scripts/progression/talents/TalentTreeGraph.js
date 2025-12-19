
// ======================================================================
// TalentTreeGraph.js
// Constructs a directed acyclic graph (DAG) of TalentNodes for each tree.
// ======================================================================

import { TalentNode } from "./TalentNode.js";

export class TalentTreeGraph {
  constructor(treeName) {
    this.treeName = treeName;
    this.nodes = new Map(); // id → TalentNode
  }

  addTalent(doc) {
    const node = new TalentNode(doc);
    this.nodes.set(node.id, node);
    return node;
  }

  /**
   * Establish directional edges:
   * If Talent A requires Talent B → B.unlocks.add(A), A.requires.add(B)
   */
  linkRequirement(talentId, requiredTalentId) {
    const a = this.nodes.get(talentId);
    const b = this.nodes.get(requiredTalentId);
    if (!a || !b) return;

    a.addRequirement(b.id);
    b.addUnlock(a.id);
  }

  /**
   * Produce an ordered list (topological sort)
   * Useful for UI layout, debugging, rule evaluation.
   */
  topologicalSort() {
    const inDegree = new Map();
    const result = [];
    const queue = [];

    // Count in-degrees
    for (const [id, node] of this.nodes) {
      inDegree.set(id, node.requires.size);
    }

    // Zero in-degree → queue
    for (const [id, deg] of inDegree) {
      if (deg === 0) queue.push(id);
    }

    while (queue.length > 0) {
      const id = queue.shift();
      result.push(id);

      const node = this.nodes.get(id);
      for (const childId of node.unlocks) {
        inDegree.set(childId, inDegree.get(childId) - 1);
        if (inDegree.get(childId) === 0) {
          queue.push(childId);
        }
      }
    }

    return result;
  }

  toJSON() {
    const obj = {};
    for (const [id, node] of this.nodes) {
      obj[id] = node.toJSON();
    }
    return obj;
  }
}
