/**
 * FeatEffectApplier + feat-effect lifecycle hooks
 *
 * Runtime reconciliation layer that turns FeatEffectRegistry definitions into
 * generated ActiveEffects on an actor when that actor owns the corresponding
 * feat. Mirrors the existing talent-effects-hooks pattern and routes all
 * ActiveEffect mutation through ActorEngine (mutation sovereignty).
 *
 * Behavior preservation:
 *   Before this migration, only embedded effects with `transfer: true` were
 *   applied to the actor by Foundry. To avoid changing meaning, the applier
 *   only generates actor effects for definitions whose template has
 *   `transfer === true`. All other definitions remain stored in the registry
 *   (provenance/future use) but are NOT auto-applied, exactly as before.
 *
 * Provenance: every generated effect carries
 *   flags['foundryvtt-swse'].featEffect = {
 *     source: 'feat-effect-registry', generated: true,
 *     featItemId, featId, featKey, featName, sourceEffectId
 *   }
 * Only effects with that provenance are ever removed/reconciled by this system;
 * manually-created ActiveEffects are never touched.
 */

import { FeatEffectRegistry } from "/systems/foundryvtt-swse/scripts/engine/features/feat-effect-registry.js";
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { getSwseFlag } from "/systems/foundryvtt-swse/scripts/utils/flags/swse-flags.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

const PROVENANCE_FLAG = 'featEffect';

function _provenance(featItem, def, eff) {
    return {
        source: 'feat-effect-registry',
        generated: true,
        featItemId: featItem.id,
        featId: def.featId ?? null,
        featKey: def.featKey ?? null,
        featName: def.featName ?? featItem.name,
        sourceEffectId: eff._id ?? null
    };
}

function _buildEffectData(featItem, def, eff) {
    return {
        name: eff.name || def.featName || featItem.name,
        icon: eff.icon || featItem.img,
        origin: featItem.uuid,
        disabled: eff.disabled ?? false,
        // Created directly on the actor as a generated effect, so it must not
        // itself transfer further.
        transfer: false,
        duration: eff.duration || {},
        changes: (eff.changes || []).map(c => ({
            key: c.key,
            mode: c.mode,
            value: c.value,
            priority: c.priority ?? 20
        })),
        flags: {
            ...(eff.flags || {}),
            'foundryvtt-swse': {
                ...(eff.flags?.['foundryvtt-swse'] || {}),
                [PROVENANCE_FLAG]: _provenance(featItem, def, eff)
            }
        }
    };
}

export class FeatEffectApplier {
    /**
     * Effects this applier is responsible for applying to actors. Preserves
     * Foundry's prior transfer behavior (only transfer:true was active).
     * @private
     */
    static _applicable(def) {
        return (def?.effects || []).filter(e => e?.transfer === true);
    }

    /**
     * Generated effects already present on the actor for a given feat item.
     * @private
     */
    static _existingFor(actor, featItemId) {
        return actor.effects.filter(
            e => getSwseFlag(e, PROVENANCE_FLAG)?.featItemId === featItemId
        );
    }

    /**
     * Apply (idempotently) the generated effects for a feat item the actor owns.
     * @param {Item} featItem
     */
    static async apply(featItem) {
        const actor = featItem?.actor;
        if (!actor || featItem.type !== 'feat') return;

        const def = FeatEffectRegistry.getForFeat(featItem);
        const applicable = this._applicable(def);
        if (!applicable.length) return;

        // De-dupe: never stack on re-create / import / re-prepare.
        if (this._existingFor(actor, featItem.id).length) return;

        const data = applicable.map(e => _buildEffectData(featItem, def, e));
        try {
            await ActorEngine.createActiveEffects(actor, data, { source: 'feat-effect-applier' });
        } catch (err) {
            SWSELogger.warn(`[FeatEffectApplier] Failed to apply feat effects for "${featItem.name}":`, err);
        }
    }

    /**
     * Remove only the generated effects that originated from this feat item.
     * @param {Item} featItem
     */
    static async remove(featItem) {
        const actor = featItem?.actor;
        if (!actor || featItem.type !== 'feat') return;

        const ids = this._existingFor(actor, featItem.id).map(e => e.id);
        if (!ids.length) return;

        try {
            await ActorEngine.deleteActiveEffects(actor, ids, { source: 'feat-effect-applier' });
        } catch (err) {
            SWSELogger.warn(`[FeatEffectApplier] Failed to remove feat effects for "${featItem.name}":`, err);
        }
    }

    /**
     * Reconcile every feat the actor owns: create missing generated effects and
     * prune generated effects whose source feat is no longer present.
     * @param {Actor} actor
     */
    static async reconcile(actor) {
        if (!actor) return;
        const featItems = actor.items.filter(i => i.type === 'feat');
        const liveFeatIds = new Set(featItems.map(i => i.id));

        // Prune stale generated effects (source feat removed).
        const staleIds = actor.effects
            .filter(e => {
                const p = getSwseFlag(e, PROVENANCE_FLAG);
                return p?.generated && p?.featItemId && !liveFeatIds.has(p.featItemId);
            })
            .map(e => e.id);
        if (staleIds.length) {
            try {
                await ActorEngine.deleteActiveEffects(actor, staleIds, { source: 'feat-effect-applier:reconcile' });
            } catch (err) {
                SWSELogger.warn('[FeatEffectApplier] Failed to prune stale feat effects:', err);
            }
        }

        // Ensure current feats have their generated effects.
        for (const featItem of featItems) {
            await this.apply(featItem);
        }
    }
}

/**
 * Wire feat-effect reconciliation into the item lifecycle. The author of the
 * change applies/removes (game.user.id === userId) to avoid duplicate work
 * across connected clients.
 */
export function initializeFeatEffectsHooks() {
    Hooks.on('createItem', async (item, options, userId) => {
        if (game.user?.id !== userId) return;
        if (item?.type !== 'feat') return;
        await FeatEffectApplier.apply(item);
    });

    Hooks.on('deleteItem', async (item, options, userId) => {
        if (game.user?.id !== userId) return;
        if (item?.type !== 'feat') return;
        await FeatEffectApplier.remove(item);
    });

    SWSELogger.log('[FeatEffectApplier] Feat-effect lifecycle hooks registered.');
}
