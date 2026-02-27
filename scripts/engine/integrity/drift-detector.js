/**
 * PHASE 5C-6: Drift Detector (Optional)
 *
 * Detects mutations outside ActorEngine.
 *
 * Strategy:
 *   - Compute signature of actor state
 *   - Store after authorized mutations
 *   - Check on actor access
 *   - Log if mismatch detected
 *
 * No auto-correction (advisory only).
 */

import { AuditTrail } from '../../governance/audit/audit-trail.js';
import { SWSELogger } from '../../utils/logger.js';

export class DriftDetector {
  /**
   * Compute mutation signature for actor
   * Hash of: items, level, class, feat count, talent count
   *
   * @param {Actor} actor
   * @returns {string} - SHA-1 hash signature
   */
  static computeSignature(actor) {
    if (!actor) return null;

    const data = {
      items: (actor.items || [])
        .map(i => ({ id: i.id, name: i.name, type: i.type }))
        .sort((a, b) => a.id.localeCompare(b.id)),
      level: actor.system?.level || 0,
      class: actor.system?.class || '',
      species: actor.system?.species || '',
      featCount: (actor.items || []).filter(i => i.type === 'feat').length,
      talentCount: (actor.items || []).filter(i => i.type === 'talent').length
    };

    // Simple hash (in real use, could use crypto.subtle.digest)
    return this._hashObject(data);
  }

  /**
   * Store signature after authorized mutation
   *
   * @param {Actor} actor
   */
  static storeSignature(actor) {
    if (!actor) return;

    const signature = this.computeSignature(actor);

    if (!actor.system.integrity) {
      actor.system.integrity = {};
    }

    actor.system.integrity.lastSignature = signature;
    actor.system.integrity.lastSignatureAt = Date.now();
  }

  /**
   * Check for drift on actor access
   *
   * @param {Actor} actor
   * @returns {Object} { isDrift: boolean, stored, current }
   */
  static checkDrift(actor) {
    if (!actor) {
      return { isDrift: false, error: 'No actor' };
    }

    const stored = actor.system?.integrity?.lastSignature;
    const current = this.computeSignature(actor);

    // No stored signature = first check
    if (!stored) {
      this.storeSignature(actor);
      return { isDrift: false, reason: 'First check - signature stored' };
    }

    // Signature mismatch
    if (stored !== current) {
      SWSELogger.warn(`[5C-6] Drift detected on ${actor.name}`, {
        actor: actor.name,
        stored: stored.substring(0, 8),
        current: current.substring(0, 8)
      });

      // Log to audit trail
      if (AuditTrail) {
        AuditTrail.logEvent(actor, 'drift-detected', {
          storedSignature: stored.substring(0, 16),
          currentSignature: current.substring(0, 16),
          itemCount: actor.items?.length || 0
        });
      }

      return {
        isDrift: true,
        reason: 'Signature mismatch - unauthorized mutation suspected',
        stored: stored.substring(0, 8),
        current: current.substring(0, 8)
      };
    }

    return { isDrift: false, reason: 'Signature match - no drift' };
  }

  /**
   * Simple hash function (not cryptographic)
   * @private
   */
  static _hashObject(obj) {
    const str = JSON.stringify(obj);
    let hash = 0;

    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return Math.abs(hash).toString(16);
  }

  /**
   * Initialize drift detection on actor
   *
   * Call after each authorized mutation.
   *
   * @param {Actor} actor
   */
  static initialize(actor) {
    if (!actor || !actor.system) return;

    // Store initial signature
    if (!actor.system.integrity?.lastSignature) {
      this.storeSignature(actor);
      SWSELogger.debug('[5C-6] Drift detection initialized for', actor.name);
    }
  }

  /**
   * Export drift status
   *
   * @param {Actor} actor
   * @returns {Object}
   */
  static exportStatus(actor) {
    if (!actor) {
      return { error: 'No actor' };
    }

    const drift = this.checkDrift(actor);

    return {
      actor: actor.name,
      isDrift: drift.isDrift,
      reason: drift.reason,
      signature: {
        stored: actor.system?.integrity?.lastSignature?.substring(0, 16),
        current: this.computeSignature(actor).substring(0, 16),
        lastUpdate: new Date(actor.system?.integrity?.lastSignatureAt).toISOString()
      },
      itemCount: actor.items?.length || 0
    };
  }
}

// Export for global access
if (typeof window !== 'undefined') {
  window.DriftDetector = DriftDetector;
}
