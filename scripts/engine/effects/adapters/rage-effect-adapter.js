/**
 * Rage Effect Adapter
 *
 * Collects Rage engine entries for the effects display.
 * Delegates to RageEngine.getCurrentRageConditionNotes() and enriches with missing fields.
 */

import { RageEngine } from "/systems/foundryvtt-swse/scripts/engine/species/rage-engine.js";

export class RageEffectAdapter {
  /**
   * Collect Rage effect entries.
   * @param {Actor} actor - The actor
   * @param {Object} context - Aggregator context (unused in this adapter)
   * @returns {Array} Array of Rage condition cards
   */
  static collect(actor, context = {}) {
    return RageEngine.getCurrentRageConditionNotes(actor).map(note => ({
      ...note,
      source: note.source ?? "Rage",
      details: Array.isArray(note.details) ? note.details : [],
      gmEnforced: /GM-enforced/i.test(note.text ?? ""),
      mechanical: true
    }));
  }
}

export default RageEffectAdapter;
