/**
 * Active Effect Adapter
 *
 * Collects Foundry ActiveEffect entries for the effects display.
 * Phase 6: Supports normalized effect metadata when available.
 * Preserves exact behavior: filtering disabled effects, duration parsing, change summarization.
 * Graceful fallback when metadata is missing or malformed.
 */

import {
  actorEffects,
  actorItems,
  normalizeName,
  effectDurationText,
  summarizeEffectChanges
} from "./effect-card-utils.js";
import { EffectStateFlags } from "../effect-state-flags.js";
import { EffectIntentEngine } from "/systems/foundryvtt-swse/scripts/dialogs/entity-dialog/effect-intent-engine.js";

export class ActiveEffectAdapter {
  /**
   * Collect Foundry ActiveEffect entries.
   * Phase 6: Reads metadata through EffectStateFlags when available.
   * @param {Actor} actor - The actor
   * @param {Object} context - Aggregator context (contains options)
   * @returns {Array} Array of ActiveEffect cards
   */
  static collect(actor, context = {}) {
    const { options = {} } = context;
    const { includeInactiveEffects = false } = options;

    const cards = [];
    const items = actorItems(actor);
    const ownedItemEffectNames = new Set();
    for (const item of items) {
      for (const effect of Array.from(item?.effects ?? [])) {
        if (effect?.name) ownedItemEffectNames.add(String(effect.name));
      }
    }

    for (const effect of actorEffects(actor).filter(effect => includeInactiveEffects || effect?.disabled !== true)) {
      const origin = String(effect?.origin ?? effect?.sourceName ?? '');
      if (/\bItem\b/.test(origin) && effect?.name && ownedItemEffectNames.has(String(effect.name))) continue;
      cards.push(this.#buildEffectCard(effect, { actor, item: null, includeRemoveAction: true }));
    }

    for (const item of items) {
      for (const effect of Array.from(item?.effects ?? [])) {
        if (!includeInactiveEffects && effect?.disabled === true) continue;
        const card = this.#buildOwnedItemEffectCard(effect, { actor, item });
        if (card) cards.push(card);
      }
    }

    return cards.filter(Boolean);
  }
}

export default ActiveEffectAdapter;
