/**
 * System Active Effect Adapter
 *
 * Collects temporary/lightweight system-level active effects (like temporary defense bonuses).
 * Preserves exact behavior: enabled/disabled filtering, value formatting, duration parsing.
 */

import {
  systemActiveEffects,
  normalizeName
} from "./effect-card-utils.js";

export class SystemActiveEffectAdapter {
  /**
   * Collect system active effect entries.
   * @param {Actor} actor - The actor
   * @param {Object} context - Aggregator context (unused in this adapter)
   * @returns {Array} Array of system active effect cards
   */
  static collect(actor, context = {}) {
    return systemActiveEffects(actor)
      .filter(effect => effect?.enabled !== false)
      .map(effect => ({
        id: `system-effect-${effect.id ?? normalizeName(effect.name)}`,
        label: effect.name ?? effect.sourceName ?? 'Temporary Effect',
        type: 'systemActiveEffect',
        severity: effect.severity ?? 'positive',
        source: effect.sourceName ?? 'Temporary Effect',
        text: effect.description ?? `${effect.target ?? 'Effect'}: ${Number(effect.value ?? 0) >= 0 ? '+' : ''}${Number(effect.value ?? 0)}`,
        details: [
          effect.target ? `${effect.target}: ${Number(effect.value ?? 0) >= 0 ? '+' : ''}${Number(effect.value ?? 0)}` : null,
          Number.isFinite(Number(effect.roundsRemaining)) ? `Duration: ${Number(effect.roundsRemaining)} round${Number(effect.roundsRemaining) === 1 ? '' : 's'}` : null
        ].filter(Boolean),
        gmEnforced: false,
        mechanical: true
      }));
  }
}

export default SystemActiveEffectAdapter;
