
// ======================================================================
// PrerequisiteEnricher.js
// Converts prerequisite strings into structured prerequisite objects.
// Integrates the existing prerequisite-normalizer.js
// ======================================================================

import { normalizePrerequisiteString } from "/systems/foundryvtt-swse/scripts/engine/progression/utils/prerequisite-normalizer.js";

export class PrerequisiteEnricher {
  /**
   * Accepts a Foundry Document and enriches its TalentNode prereq array.
   */
  static enrich(node) {
    if (!node || !node.rawPrereq) {
      node.prereq = [];
      return node;
    }

    try {
      const normalized = normalizePrerequisiteString(node.rawPrereq);
      node.prereq = normalized.parsed ?? [];
    } catch (err) {
      console.warn(`[PrerequisiteEnricher] Failed to normalize ${node.name}`, err);
      node.prereq = [];
    }

    return node;
  }
}
