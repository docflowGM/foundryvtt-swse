/**
 * Item Note Adapter
 *
 * Collects item abilityMeta.conditionNotes and displayAsCondition rules.
 * Preserves exact behavior: filtering disabled items, building rule notes with proper fallbacks.
 */

import {
  actorItems,
  buildRuleNote
} from "./effect-card-utils.js";

export class ItemNoteAdapter {
  /**
   * Collect item condition notes and display rules.
   * @param {Actor} actor - The actor
   * @param {Object} context - Aggregator context (unused in this adapter)
   * @returns {Array} Array of rule note cards from items
   */
  static collect(actor, context = {}) {
    const entries = [];

    for (const item of actorItems(actor)) {
      if (!item || item.system?.disabled === true) continue;
      const meta = item.system?.abilityMeta ?? {};

      // Collect conditionNotes
      const notes = Array.isArray(meta.conditionNotes) ? meta.conditionNotes : [];
      notes.forEach((note, index) => entries.push(buildRuleNote(item, note, index)));

      // Collect rules marked as displayAsCondition or displayNote
      const rules = Array.isArray(meta.rules) ? meta.rules : [];
      rules
        .filter(rule => rule?.displayAsCondition === true || rule?.displayNote)
        .forEach((rule, index) => entries.push(buildRuleNote(item, {
          ...rule,
          note: rule.displayNote ?? rule.note ?? rule.description,
          label: rule.displayLabel ?? rule.label ?? item.name,
          gmEnforced: rule.gmEnforced !== false
        }, index)));
    }

    return entries;
  }
}

export default ItemNoteAdapter;
