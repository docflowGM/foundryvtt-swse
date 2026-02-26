/**
 * Missing Prerequisites Tracker
 * PHASE 3: Tracks which items have unmet prerequisites
 *
 * Maintains actor.system.missingPrerequisites:
 * {
 *   itemId: {
 *     itemName: string,
 *     itemType: string,
 *     missingPrereqs: string[],
 *     severity: 'warning' | 'error',
 *     detectedAt: timestamp
 *   }
 * }
 *
 * This allows:
 * - Quick lookup of which items are broken
 * - Persistence across saves
 * - Easy detection of when an ability becomes/stops being broken
 * - Rendering of broken item indicators in UI
 */

import { SWSELogger } from '../../utils/logger.js';

export class MissingPrereqsTracker {

  /**
   * Update an actor's missingPrerequisites tracking data.
   * Called whenever integrity evaluation detects violations.
   *
   * @param {Actor} actor - Actor to update
   * @param {Object} violations - From PrerequisiteIntegrityChecker.evaluate()
   * @returns {Promise<void>}
   */
  static async updateTracking(actor, violations = {}) {
    if (!actor || !actor.system) {
      SWSELogger.warn('[MISSING-PREREQS] updateTracking() called with invalid actor');
      return;
    }

    try {
      // Build new tracking data from violations
      const newTracking = this._buildTrackingData(violations);

      // Check if data actually changed
      const oldTracking = actor.system.missingPrerequisites || {};
      if (JSON.stringify(oldTracking) === JSON.stringify(newTracking)) {
        // No change, skip update
        return;
      }

      // Update actor system data
      await actor.update({
        'system.missingPrerequisites': newTracking
      });

      SWSELogger.debug(`[MISSING-PREREQS] Updated tracking for ${actor.name}`, {
        itemsTracked: Object.keys(newTracking).length
      });

    } catch (err) {
      SWSELogger.error('[MISSING-PREREQS] Failed to update tracking:', err);
    }
  }

  /**
   * Build tracking data structure from violations.
   * @private
   */
  static _buildTrackingData(violations) {
    const tracking = {};

    for (const [itemId, violation] of Object.entries(violations)) {
      tracking[itemId] = {
        itemName: violation.itemName,
        itemType: violation.itemType,
        missingPrereqs: violation.missingPrereqs || [],
        severity: violation.severity || 'warning',
        detectedAt: violation.detectionContext?.evaluatedAt || Date.now()
      };
    }

    return tracking;
  }

  /**
   * Get missing prerequisites for a specific item.
   * @static
   */
  static getMissingPrereqs(actor, itemId) {
    if (!actor?.system?.missingPrerequisites) {
      return null;
    }

    const tracking = actor.system.missingPrerequisites[itemId];
    return tracking ? tracking.missingPrereqs : null;
  }

  /**
   * Check if a specific item is broken (has missing prerequisites).
   * @static
   */
  static isBroken(actor, itemId) {
    const missing = this.getMissingPrereqs(actor, itemId);
    return missing && missing.length > 0;
  }

  /**
   * Get all broken items on an actor.
   * @static
   */
  static getBrokenItems(actor) {
    if (!actor?.system?.missingPrerequisites) {
      return [];
    }

    return Object.entries(actor.system.missingPrerequisites)
      .map(([itemId, tracking]) => ({
        itemId,
        ...tracking
      }));
  }

  /**
   * Get count of broken items by severity.
   * @static
   */
  static getSummary(actor) {
    const broken = this.getBrokenItems(actor);
    const errors = broken.filter(b => b.severity === 'error').length;
    const warnings = broken.filter(b => b.severity === 'warning').length;

    return {
      totalBroken: broken.length,
      errors,
      warnings
    };
  }

  /**
   * Clear all tracking data (used for testing).
   * @static
   */
  static async clearTracking(actor) {
    if (!actor) return;
    try {
      await actor.update({
        'system.missingPrerequisites': {}
      });
    } catch (err) {
      SWSELogger.error('[MISSING-PREREQS] Failed to clear tracking:', err);
    }
  }

  /**
   * Export tracking data for debugging/analysis.
   * @static
   */
  static exportTracking(actor) {
    return {
      actorId: actor?.id,
      actorName: actor?.name,
      timestamp: new Date().toISOString(),
      tracking: actor?.system?.missingPrerequisites || {}
    };
  }
}
