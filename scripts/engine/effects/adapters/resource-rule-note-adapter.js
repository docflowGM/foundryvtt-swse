/**
 * Resource Rule Note Adapter
 *
 * Collects item abilityMeta.resourceRules display notes.
 * Preserves exact behavior: filtering disabled items, resource organization, display note filtering.
 */

import {
  actorItems,
  buildRuleNote
} from "./effect-card-utils.js";

export class ResourceRuleNoteAdapter {
  /**
   * Collect resource rule display notes from items.
   * @param {Actor} actor - The actor
   * @param {Object} context - Aggregator context (unused in this adapter)
   * @returns {Array} Array of rule note cards from resource rules
   */
  static collect(actor, context = {}) {
    const entries = [];

    for (const item of actorItems(actor)) {
      if (!item || item.system?.disabled === true) continue;
      const resourceRules = item.system?.abilityMeta?.resourceRules;
      if (!resourceRules || typeof resourceRules !== "object") continue;

      for (const [resource, rules] of Object.entries(resourceRules)) {
        if (!Array.isArray(rules)) continue;
        rules
          .filter(rule => rule?.displayAsCondition === true || rule?.displayNote || rule?.type === "DISPLAY_NOTE")
          .forEach((rule, index) => entries.push(buildRuleNote(item, {
            ...rule,
            id: rule.id ?? `${resource}-${rule.type ?? index}`,
            label: rule.displayLabel ?? rule.label ?? item.name,
            note: rule.displayNote ?? rule.note ?? rule.description,
            conditionType: resource,
            gmEnforced: rule.gmEnforced !== false
          }, index)));
      }
    }

    return entries;
  }
}

export default ResourceRuleNoteAdapter;
