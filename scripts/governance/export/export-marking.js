/**
 * PHASE 4: Export Marking
 * Marks actors with non-normal governance modes on export
 *
 * When exporting an actor:
 * - If governance.enforcementMode !== 'normal':
 *   Append badge (OM or FB) to actor name in export view
 * - Include governance object in export data
 * - On import, governance state persists
 * - Sentinel logs governance state in DEV mode
 */

import { SWSELogger } from '../../utils/logger.js';
import { GovernanceSystem } from '../governance-system.js';

export class ExportMarking {

  /**
   * Mark actor export with governance badge if needed.
   * @static
   */
  static markExportedActor(actor, exportData = {}) {
    if (!actor) return exportData;

    GovernanceSystem.initializeGovernance(actor);

    const mode = actor.system.governance.enforcementMode;
    const badge = this._getBadgeForMode(mode);

    // Add badge to exported name
    if (badge) {
      exportData.name = `${actor.name} [${badge}]`;
      SWSELogger.log('[EXPORT] Actor marked with governance badge:', {
        actor: actor.name,
        badge: badge,
        mode: mode
      });
    }

    // Always include governance data in export
    exportData.system = exportData.system || {};
    exportData.system.governance = actor.system.governance;

    return exportData;
  }

  /**
   * Get badge for governance mode.
   * @private
   */
  static _getBadgeForMode(mode) {
    if (mode === GovernanceSystem.ENFORCEMENT_MODES.FREEBUILD) {
      return 'FB';
    }
    if (mode === GovernanceSystem.ENFORCEMENT_MODES.OVERRIDE) {
      return 'OM';
    }
    return null; // No badge for normal mode
  }

  /**
   * Handle imported actor with governance state.
   * @static
   */
  static handleImportedActor(actor) {
    if (!actor) return;

    GovernanceSystem.initializeGovernance(actor);

    const mode = actor.system.governance.enforcementMode;
    const badge = this._getBadgeForMode(mode);

    SWSELogger.log('[IMPORT] Actor imported with governance state:', {
      actor: actor.name,
      governance: {
        mode: mode,
        badge: badge,
        approvedBy: actor.system.governance.approvedBy,
        timestamp: actor.system.governance.timestamp
      }
    });

    // In DEV mode, log full governance details
    if (SWSELogger.isDev()) {
      SWSELogger.log('[IMPORT] Full governance state:', actor.system.governance);
    }
  }

  /**
   * Get display name for exported actor.
   * @static
   */
  static getExportDisplayName(actor) {
    if (!actor) return '';

    GovernanceSystem.initializeGovernance(actor);

    const mode = actor.system.governance.enforcementMode;
    const badge = this._getBadgeForMode(mode);

    if (badge) {
      return `${actor.name} [${badge}]`;
    }

    return actor.name;
  }

  /**
   * Check if exported actor has special governance.
   * @static
   */
  static isExportedAsSpecial(actor) {
    if (!actor) return false;

    GovernanceSystem.initializeGovernance(actor);
    const mode = actor.system.governance.enforcementMode;

    return mode !== GovernanceSystem.ENFORCEMENT_MODES.NORMAL;
  }

  /**
   * Generate export metadata for actor.
   * @static
   */
  static generateExportMetadata(actor) {
    if (!actor) return {};

    GovernanceSystem.initializeGovernance(actor);

    return {
      exportedAt: new Date().toISOString(),
      actor: actor.name,
      governance: {
        mode: actor.system.governance.enforcementMode,
        approvedBy: actor.system.governance.approvedBy,
        reason: actor.system.governance.reason,
        timestamp: actor.system.governance.timestamp
      },
      badge: this._getBadgeForMode(actor.system.governance.enforcementMode)
    };
  }

  /**
   * Validate imported governance state.
   * Ensures data is well-formed.
   * @static
   */
  static validateImportedGovernance(governanceData) {
    if (!governanceData) return true; // No governance data is fine

    const validModes = Object.values(GovernanceSystem.ENFORCEMENT_MODES);
    if (!validModes.includes(governanceData.enforcementMode)) {
      SWSELogger.warn('[IMPORT-VALIDATION] Invalid governance mode:', governanceData.enforcementMode);
      return false;
    }

    return true;
  }
}

// Export for debugging
if (typeof window !== 'undefined') {
  window.ExportMarking = ExportMarking;
}
