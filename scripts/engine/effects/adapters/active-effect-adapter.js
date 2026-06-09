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

  /**
   * Build a card object for a standalone ActiveEffect on the actor.
   * @param {ActiveEffect} effect
   * @param {Object} opts
   * @param {Actor} opts.actor
   * @param {Item|null} opts.item
   * @param {boolean} opts.includeRemoveAction
   * @returns {Object} Card object
   */
  static #buildEffectCard(effect, { actor, item, includeRemoveAction }) {
    const meta = EffectStateFlags.read(effect);
    const changes = summarizeEffectChanges(effect);

    const label = meta?.summary ?? effect?.name ?? effect?.label ?? 'Active Effect';
    const source = meta?.sourceName ?? effect?.sourceName ?? item?.name ?? 'Active Effect';
    const severity = meta?.severity ?? 'info';
    const details = meta?.details?.length ? meta.details : changes;
    const tags = meta?.tags?.length ? meta.tags : ['activeEffect'];
    const duration = meta?.durationLabel ?? effectDurationText(effect);

    const actions = [];
    if (includeRemoveAction && (meta?.removable !== false)) {
      actions.push({
        id: `remove-effect-${effect.id ?? normalizeName(label)}`,
        label: 'Remove',
        dataAction: 'remove-active-effect',
        actorId: actor?.id ?? '',
        effectId: effect.id ?? null,
        gmOnly: false
      });
    }

    return {
      id: `active-effect-${effect.id ?? normalizeName(label)}`,
      label,
      type: meta?.effectType ?? 'activeEffect',
      severity,
      source,
      text: duration,
      details,
      gmEnforced: false,
      mechanical: true,
      tags,
      actions
    };
  }

  /**
   * Build a card object for an ActiveEffect owned by an item.
   * @param {ActiveEffect} effect
   * @param {Object} opts
   * @param {Actor} opts.actor
   * @param {Item} opts.item
   * @returns {Object|null} Card object, or null to skip
   */
  static #buildOwnedItemEffectCard(effect, { actor, item }) {
    if (!effect) return null;
    const meta = EffectStateFlags.read(effect);
    const changes = summarizeEffectChanges(effect);

    const label = meta?.summary ?? effect?.name ?? effect?.label ?? item?.name ?? 'Item Effect';
    const source = item?.name ?? meta?.sourceName ?? 'Item';
    const severity = meta?.severity ?? 'info';
    const details = meta?.details?.length ? meta.details : changes;
    const tags = meta?.tags?.length ? meta.tags : ['activeEffect', 'itemEffect'];
    const duration = meta?.durationLabel ?? effectDurationText(effect);

    return {
      id: `item-effect-${item?.id ?? 'unknown'}-${effect.id ?? normalizeName(label)}`,
      label,
      type: meta?.effectType ?? 'activeEffect',
      severity,
      source,
      text: duration,
      details,
      gmEnforced: false,
      mechanical: true,
      tags,
      actions: []
    };
  }
}

export default ActiveEffectAdapter;
