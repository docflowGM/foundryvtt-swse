/**
 * Active Effect Adapter
 *
 * Collects Foundry ActiveEffect entries for the effects display.
 * Preserves exact behavior: filtering disabled effects, duration parsing, change summarization.
 */

import {
  actorEffects,
  normalizeName,
  effectDurationText,
  summarizeEffectChanges
} from "./effect-card-utils.js";

export class ActiveEffectAdapter {
  /**
   * Collect Foundry ActiveEffect entries.
   * @param {Actor} actor - The actor
   * @param {Object} context - Aggregator context (contains options)
   * @returns {Array} Array of ActiveEffect cards
   */
  static collect(actor, context = {}) {
    const { options = {} } = context;
    const { includeInactiveEffects = false } = options;

    return actorEffects(actor)
      .filter(effect => includeInactiveEffects || effect?.disabled !== true)
      .map(effect => {
        const details = summarizeEffectChanges(effect);
        const duration = effectDurationText(effect);
        return {
          id: `effect-${effect.id ?? normalizeName(effect.name)}`,
          label: effect.name ?? effect.label ?? "Active Effect",
          type: "activeEffect",
          severity: effect?.flags?.swse?.severity ?? "info",
          source: effect?.origin ?? effect?.flags?.swse?.sourceName ?? "Active Effect",
          text: details.length ? details.join("; ") : duration,
          details: duration ? [`Duration: ${duration}`, ...details] : details,
          gmEnforced: false,
          mechanical: true,
          icon: effect.icon ?? effect.img ?? null
        };
      });
  }
}

export default ActiveEffectAdapter;
