/**
 * immutability-hook.js
 * Enforce immutability rules for Force power items
 *
 * Rules:
 * - Force Sensitivity-granted powers (isLocked: true) cannot be deleted while FS feat exists
 * - Prevents accidental power loss while maintaining game balance
 */

import { swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

/**
 * Register immutability enforcement hooks
 * Call from index.js during system initialization
 */
export function registerImmutabilityHooks() {
  // Hook 1: Prevent deletion of locked powers
  Hooks.on('preDeleteItem', (item, options, userId) => {
    if (!item || item.type !== 'force-power') {
      return true; // Allow deletion of non-force-power items
    }

    const actor = item.parent;
    if (!actor) {
      return true; // Item not on actor, allow deletion
    }

    // Check if this power is locked
    const isLocked = item.system?.provenance?.isLocked;
    if (!isLocked) {
      return true; // Not locked, allow deletion
    }

    // Power is locked - check if grant source still exists
    const grantSourceId = item.system?.provenance?.grantSourceId;

    if (grantSourceId === 'fs-chargen') {
      // Check if actor still has Force Sensitivity feat
      const hasFS = actor.items.some(f =>
        f.type === 'feat' && f.name?.toLowerCase().includes('force sensitivity')
      );

      if (hasFS) {
        // Force Sensitivity feat exists, power is immutable
        ui.notifications.error(
          `"${item.name}" is granted by Force Sensitivity and cannot be removed while you have the Force Sensitivity feat.`
        );
        swseLogger.warn('[IMMUTABILITY] Blocked deletion of Force Sensitivity-granted power', {
          power: item.name,
          actor: actor.name,
          grantSourceId
        });
        return false; // Prevent deletion
      }
    }

    // Grant source no longer exists, allow deletion
    return true;
  });

  // Hook 2: Prevent modification of immutability flags on locked powers
  Hooks.on('preUpdateItem', (item, updates, options, userId) => {
    if (!item || item.type !== 'force-power') {
      return true; // Allow updates to non-force-power items
    }

    // Check if attempting to modify provenance metadata
    if (!updates.system?.provenance) {
      return true; // Not modifying provenance, allow update
    }

    // Check if power is currently locked
    const currentlyLocked = item.system?.provenance?.isLocked;
    if (!currentlyLocked) {
      return true; // Not locked, allow modification
    }

    // Power is locked - prevent disabling immutability
    const attemptingToUnlock = updates.system.provenance.isLocked === false;
    if (attemptingToUnlock) {
      ui.notifications.error('Cannot modify immutability of locked Force powers');
      swseLogger.warn('[IMMUTABILITY] Blocked modification of locked power immutability flag', {
        power: item.name,
        actor: item.parent?.name,
        attemptedChange: 'isLocked: true → false'
      });
      return false; // Prevent modification
    }

    return true; // Allow other provenance modifications
  });
}

/**
 * Check if a force power is immutable (cannot be deleted)
 * Used for UI display (show lock icons, disable delete buttons, etc.)
 *
 * @param {Item} powerItem - The force power item
 * @returns {boolean} true if power cannot be deleted
 */
export function isForcePowerImmutable(powerItem) {
  if (!powerItem || powerItem.type !== 'force-power') {
    return false;
  }

  const isLocked = powerItem.system?.provenance?.isLocked;
  if (!isLocked) {
    return false;
  }

  const actor = powerItem.parent;
  if (!actor) {
    return true; // Locked, no actor context = immutable
  }

  const grantSourceId = powerItem.system?.provenance?.grantSourceId;

  if (grantSourceId === 'fs-chargen') {
    const hasFS = actor.items.some(f =>
      f.type === 'feat' && f.name?.toLowerCase().includes('force sensitivity')
    );
    return hasFS;
  }

  // Other locked sources - conservatively treat as immutable
  return isLocked;
}

/**
 * Get human-readable reason why a power is immutable
 *
 * @param {Item} powerItem - The force power item
 * @returns {string|null} Reason or null if not immutable
 */
export function getImmutabilityReason(powerItem) {
  if (!isForcePowerImmutable(powerItem)) {
    return null;
  }

  const grantSourceId = powerItem.system?.provenance?.grantSourceId;

  if (grantSourceId === 'fs-chargen') {
    return 'Granted by Force Sensitivity feat (immutable)';
  }

  return 'Immutable grant source';
}
