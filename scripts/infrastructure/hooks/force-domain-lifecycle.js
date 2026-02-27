/**
 * force-domain-lifecycle.js
 * Force Domain Lifecycle Management (Phase 3.3)
 *
 * Handles force system lifecycle when Force Sensitivity and Force Training feats are added/removed
 *
 * PHASE 3.3: Domain unlock/lock and cleanup on feat changes.
 *
 * Responsibilities:
 * 1. On Force Sensitivity feat ADD: unlock force domain
 * 2. On Force Sensitivity feat REMOVE: lock domain + cleanup excess powers
 * 3. On Force Training feat ADD: recalculate capacity
 * 4. On Force Training feat REMOVE: recalculate capacity + cleanup excess powers
 * 5. NO UI-level logic - pure infrastructure
 *
 * Integration: These handlers are called from actor-hooks.js item add/remove handlers
 */

import { swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { ForceAuthorityEngine } from "/systems/foundryvtt-swse/scripts/engine/progression/engine/force-authority-engine.js";

export class ForceDomainLifecycle {
  /**
   * Handle Force Sensitivity feat addition
   * Unlocks the force domain
   *
   * @param {Actor} actor - The actor gaining the feat
   * @returns {Promise<void>}
   */
  static async handleForceSensitivityFeatAdded(actor) {
    if (!actor) {
      swseLogger.warn('[FORCE DOMAIN] handleForceSensitivityFeatAdded called with no actor');
      return;
    }

    try {
      const unlockedDomains = actor.system?.progression?.unlockedDomains || [];

      // Only add if not already present
      if (!unlockedDomains.includes('force')) {
        unlockedDomains.push('force');

        await ActorEngine.updateActor(actor, {
          'system.progression.unlockedDomains': unlockedDomains
        });

        swseLogger.log('[FORCE DOMAIN] Added force domain for Force Sensitivity addition', {
          actor: actor.name
        });
      }
    } catch (e) {
      swseLogger.error('[FORCE DOMAIN] Error handling Force Sensitivity addition', e);
    }
  }

  /**
   * Handle Force Sensitivity feat removal
   * Locks the force domain and cleans up excess powers
   *
   * @param {Actor} actor - The actor losing the feat
   * @returns {Promise<void>}
   */
  static async handleForceSensitivityFeatRemoved(actor) {
    if (!actor) {
      swseLogger.warn('[FORCE DOMAIN] handleForceSensitivityFeatRemoved called with no actor');
      return;
    }

    try {
      const unlockedDomains = actor.system?.progression?.unlockedDomains || [];

      // Remove domain if present
      if (unlockedDomains.includes('force')) {
        const filtered = unlockedDomains.filter(d => d !== 'force');

        await ActorEngine.updateActor(actor, {
          'system.progression.unlockedDomains': filtered
        });

        swseLogger.log('[FORCE DOMAIN] Removed force domain for Force Sensitivity removal', {
          actor: actor.name
        });
      }

      // CLEANUP: Check if capacity was reduced and remove excess powers
      const currentCapacity = await ForceAuthorityEngine.getForceCapacity(actor);
      const currentPowers = actor.items.filter(i => i.type === 'forcePower');

      if (currentPowers.length > currentCapacity) {
        // Remove excess powers (deterministic: oldest first by created timestamp)
        const sortedPowers = currentPowers.sort((a, b) => {
          const aTime = a.created || a.date || 0;
          const bTime = b.created || b.date || 0;
          return aTime - bTime;
        });

        const toRemove = sortedPowers.slice(currentCapacity);
        const idsToRemove = toRemove.map(p => p.id || p._id).filter(id => id);

        if (idsToRemove.length > 0) {
          await ActorEngine.deleteEmbeddedDocuments(actor, 'Item', idsToRemove);

          swseLogger.warn('[FORCE CLEANUP] Removed excess powers after Force Sensitivity removal', {
            actor: actor.name,
            removed: idsToRemove.length,
            remaining: currentCapacity,
            newCapacity: currentCapacity
          });
        }
      }
    } catch (e) {
      swseLogger.error('[FORCE DOMAIN] Error handling Force Sensitivity removal', e);
    }
  }

  /**
   * Handle Force Training feat addition
   * Recalculates capacity (no domain change needed)
   *
   * @param {Actor} actor - The actor gaining the feat
   * @returns {Promise<void>}
   */
  static async handleForceTrainingFeatAdded(actor) {
    if (!actor) {
      swseLogger.warn('[FORCE DOMAIN] handleForceTrainingFeatAdded called with no actor');
      return;
    }

    try {
      // Capacity will be recalculated on next validation
      // No domain change needed (already unlocked if Force Sensitivity present)
      const newCapacity = await ForceAuthorityEngine.getForceCapacity(actor);

      swseLogger.log('[FORCE DOMAIN] Force Training feat added, capacity recalculated', {
        actor: actor.name,
        newCapacity
      });
    } catch (e) {
      swseLogger.error('[FORCE DOMAIN] Error handling Force Training addition', e);
    }
  }

  /**
   * Handle Force Training feat removal
   * Recalculates capacity and removes excess powers if needed
   *
   * @param {Actor} actor - The actor losing the feat
   * @returns {Promise<void>}
   */
  static async handleForceTrainingFeatRemoved(actor) {
    if (!actor) {
      swseLogger.warn('[FORCE DOMAIN] handleForceTrainingFeatRemoved called with no actor');
      return;
    }

    try {
      // Recalculate capacity
      const currentCapacity = await ForceAuthorityEngine.getForceCapacity(actor);
      const currentPowers = actor.items.filter(i => i.type === 'forcePower');

      if (currentPowers.length > currentCapacity) {
        // Remove excess powers (deterministic: oldest first by created timestamp)
        const sortedPowers = currentPowers.sort((a, b) => {
          const aTime = a.created || a.date || 0;
          const bTime = b.created || b.date || 0;
          return aTime - bTime;
        });

        const toRemove = sortedPowers.slice(currentCapacity);
        const idsToRemove = toRemove.map(p => p.id || p._id).filter(id => id);

        if (idsToRemove.length > 0) {
          await ActorEngine.deleteEmbeddedDocuments(actor, 'Item', idsToRemove);

          swseLogger.warn('[FORCE CLEANUP] Removed excess powers after Force Training removal', {
            actor: actor.name,
            removed: idsToRemove.length,
            remaining: currentCapacity,
            newCapacity: currentCapacity
          });
        }
      }
    } catch (e) {
      swseLogger.error('[FORCE DOMAIN] Error handling Force Training removal', e);
    }
  }
}
