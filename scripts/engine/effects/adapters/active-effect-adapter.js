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
  normalizeName,
  effectDurationText,
  summarizeEffectChanges
} from "./effect-card-utils.js";
import { EffectStateFlags } from "../effect-state-flags.js";

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

    return actorEffects(actor)
      .filter(effect => includeInactiveEffects || effect?.disabled !== true)
      .map(effect => {
        // Try to read metadata (Phase 6)
        let metadata = null;
        try {
          metadata = EffectStateFlags.read(effect);
        } catch (err) {
          console.warn("SWSE | ActiveEffectAdapter: metadata read failed", effect?.name, err);
        }

        // Fallback: compute existing data
        const effectChanges = summarizeEffectChanges(effect);
        const duration = effectDurationText(effect);

        // Build card with metadata preference, fallback to existing behavior
        // Helper: humanize sourceType for display (e.g., "forcePower" → "Force Power")
        const humanizeSourceType = (type) => {
          if (!type) return null;
          return String(type)
            .replace(/([A-Z])/g, ' $1')  // Add space before capitals
            .replace(/^./, c => c.toUpperCase()) // Capitalize first letter
            .trim();
        };

        const card = {
          id: `effect-${effect.id ?? normalizeName(effect.name)}`,
          label: metadata?.sourceName ?? effect.name ?? effect.label ?? "Active Effect",
          type: "activeEffect", // MUST remain "activeEffect" for activeEffectCount stability
          severity: metadata?.severity ?? effect?.flags?.swse?.severity ?? "info",
          source: metadata?.sourceName ?? (metadata?.sourceType ? humanizeSourceType(metadata.sourceType) : (effect?.origin ?? effect?.flags?.swse?.sourceName ?? "Active Effect")),
          text: metadata?.summary ?? (effectChanges.length ? effectChanges.join("; ") : duration),
          gmEnforced: false,
          mechanical: true,
          icon: metadata?.icon ?? effect.icon ?? effect.img ?? null
        };

        // Build details array, avoiding duplication
        const detailsSet = new Set();

        // Add metadata details if available
        if (metadata?.details && Array.isArray(metadata.details)) {
          metadata.details.forEach(d => detailsSet.add(d));
        }

        // Add duration unless already in metadata details
        if (duration && !detailsSet.has(`Duration: ${duration}`)) {
          detailsSet.add(`Duration: ${duration}`);
        }

        // Add effect changes unless already in metadata details
        if (effectChanges && Array.isArray(effectChanges)) {
          effectChanges.forEach(d => {
            if (!detailsSet.has(d)) {
              detailsSet.add(d);
            }
          });
        }

        card.details = Array.from(detailsSet);

        // Merge tags if metadata present
        if (metadata?.tags && Array.isArray(metadata.tags)) {
          const baseTags = ["activeEffect"];
          const allTags = new Set([...baseTags, ...metadata.tags]);
          card.tags = Array.from(allTags);
        } else {
          card.tags = ["activeEffect"];
        }

        // Add metadata fields if present (additive, not replacing)
        if (metadata?.family) card.family = metadata.family;
        if (metadata?.effectType) card.effectType = metadata.effectType;

        // Phase 7: Add remove-active-effect action if appropriate
        // Only emit for removable effects with valid effect id
        if (effect?.id && metadata?.removable !== false) {
          card.actions = [
            {
              id: "remove-active-effect",
              label: "Remove",
              dataAction: "remove-active-effect",
              actorId: actor?.id ?? "",
              effectId: effect.id,
              gmOnly: false
            }
          ];
        }

        return card;
      });
  }
}

export default ActiveEffectAdapter;
