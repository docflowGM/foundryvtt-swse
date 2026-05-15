/**
 * ActorEffectsAggregator
 *
 * Orchestrates adapter collection and normalization of actor effect state into display cards.
 * Phase 4: Includes poison, recurring damage, and weapon state visibility. Behavior preserved from Phase 1/2/3.
 *
 * Each adapter collects a specific class of effects:
 * - Condition track, Poison, Recurring damage, Weapon state, Rage, Foundry ActiveEffects, system effects, item notes, resource notes, actions
 *
 * The aggregator combines, deduplicates, sorts, and returns results in the expected format.
 */

import { ConditionTrackAdapter } from "./adapters/condition-track-adapter.js";
import { PoisonEffectAdapter } from "./adapters/poison-effect-adapter.js";
import { RecurringDamageAdapter } from "./adapters/recurring-damage-adapter.js";
import { WeaponStateAdapter } from "./adapters/weapon-state-adapter.js";
import { RageEffectAdapter } from "./adapters/rage-effect-adapter.js";
import { ActiveEffectAdapter } from "./adapters/active-effect-adapter.js";
import { SystemActiveEffectAdapter } from "./adapters/system-active-effect-adapter.js";
import { ItemNoteAdapter } from "./adapters/item-note-adapter.js";
import { ResourceRuleNoteAdapter } from "./adapters/resource-rule-note-adapter.js";
import { ResourceActionAdapter } from "./adapters/resource-action-adapter.js";
import { normalizeName } from "./adapters/effect-card-utils.js";

// Adapter registry in collection order
const ADAPTERS = [
  ConditionTrackAdapter,
  PoisonEffectAdapter,
  RecurringDamageAdapter,
  WeaponStateAdapter,
  RageEffectAdapter,
  ActiveEffectAdapter,
  SystemActiveEffectAdapter,
  ItemNoteAdapter,
  ResourceRuleNoteAdapter,
  ResourceActionAdapter
];

export class ActorEffectsAggregator {
  /**
   * Collect and normalize all effect cards for the actor.
   * @param {Actor} actor - The actor to collect effects from
   * @param {Object} options - Collection options (includeInactiveEffects, etc.)
   * @returns {Object} Normalized collection: { cards, notes, hasCards, hasWarnings, activeEffectCount }
   */
  static collect(actor, { includeInactiveEffects = false } = {}) {
    const context = { options: { includeInactiveEffects } };
    const entries = [];

    // Collect entries from all adapters
    for (const adapter of ADAPTERS) {
      try {
        const adapterEntries = adapter.collect(actor, context) ?? [];
        entries.push(...adapterEntries);
      } catch (err) {
        console.warn("SWSE | ActorEffectsAggregator: adapter failed", adapter?.name, err);
      }
    }

    // Deduplicate by id (preserve first occurrence)
    const byId = new Map();
    for (const entry of entries.filter(Boolean)) {
      const id = entry.id ?? normalizeName(`${entry.type}-${entry.label}-${entry.text}`);
      if (!byId.has(id)) byId.set(id, { ...entry, id });
    }

    // Sort: severity rank, then alphabetically by label
    const cards = Array.from(byId.values()).sort((a, b) => {
      const rank = { danger: 0, warning: 1, info: 2, positive: 3 };
      return (rank[a.severity] ?? 2) - (rank[b.severity] ?? 2) || String(a.label).localeCompare(String(b.label));
    });

    // Return exact Phase 1 shape
    return {
      cards,
      notes: cards,
      hasCards: cards.length > 0,
      hasWarnings: cards.some(card => card.severity === "warning" || card.severity === "danger"),
      activeEffectCount: cards.filter(card => card.type === "activeEffect").length
    };
  }
}

export default ActorEffectsAggregator;
