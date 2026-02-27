/**
 * PHASE 5B-5: Audit Trail
 *
 * Tracks all governance decisions and enforcement events over time.
 *
 * Events tracked:
 *   - Violations detected/resolved
 *   - Governance mode changes
 *   - Enforcement decisions (allow/warn/block)
 *   - Overrides and approvals
 *   - Policy changes
 *
 * Storage: actor.system.auditLog (persisted to world data)
 */

import { SWSELogger } from '../../utils/logger.js';
import { GovernanceSystem } from '../governance-system.js';

export class AuditTrail {
  /**
   * Log a governance event
   *
   * @param {Actor} actor - Actor affected
   * @param {string} eventType - Type of event
   * @param {Object} details - Event details
   */
  static logEvent(actor, eventType, details = {}) {
    if (!actor) return;

    try {
      // Initialize audit log if needed
      if (!actor.system.auditLog) {
        actor.system.auditLog = [];
      }

      // Create audit entry
      const entry = {
        timestamp: Date.now(),
        date: new Date().toISOString(),
        eventType,
        actor: {
          id: actor.id,
          name: actor.name,
          type: actor.type
        },
        details: {
          ...details,
          userId: game?.user?.id,
          userName: game?.user?.name
        }
      };

      // Add to log
      actor.system.auditLog.push(entry);

      // Keep only last 1000 entries to prevent log growth
      if (actor.system.auditLog.length > 1000) {
        actor.system.auditLog = actor.system.auditLog.slice(-1000);
      }

      // Log to console in dev mode
      if (SWSELogger.isDev()) {
        SWSELogger.log(`[AUDIT] ${eventType}: ${actor.name}`, details);
      }

      return entry;

    } catch (err) {
      SWSELogger.error('[AUDIT] Failed to log event:', err);
    }
  }

  /**
   * Log violation detected
   */
  static logViolationDetected(actor, violation) {
    return this.logEvent(actor, 'violation-detected', {
      itemId: violation.itemId,
      itemName: violation.itemName,
      itemType: violation.itemType,
      severity: violation.severity,
      missingPrereqs: violation.missingPrereqs,
      permanentlyBlocked: violation.permanentlyBlocked
    });
  }

  /**
   * Log violation resolved
   */
  static logViolationResolved(actor, violation) {
    return this.logEvent(actor, 'violation-resolved', {
      itemId: violation.itemId,
      itemName: violation.itemName,
      resolution: 'removed or prerequisite acquired'
    });
  }

  /**
   * Log governance mode change
   */
  static logGovernanceModeChange(actor, oldMode, newMode, reason = null) {
    return this.logEvent(actor, 'governance-mode-changed', {
      oldMode,
      newMode,
      reason,
      approvedBy: game?.user?.name
    });
  }

  /**
   * Log enforcement decision
   */
  static logEnforcementDecision(actor, decision, context = {}) {
    return this.logEvent(actor, 'enforcement-decision', {
      decision: decision.outcome,
      reason: decision.reason,
      violations: decision.violations,
      policy: decision.policy,
      ...context
    });
  }

  /**
   * Log preflight validation
   */
  static logPreflightValidation(actor, result) {
    return this.logEvent(actor, 'preflight-validation', {
      allowed: result.allowed,
      outcome: result.outcome,
      violationCount: result.violations.count,
      severity: result.violations.severity,
      source: result.context.source,
      reason: result.context.reason
    });
  }

  /**
   * Log override approval
   */
  static logOverrideApproval(actor, reason = null) {
    return this.logEvent(actor, 'override-approved', {
      governanceMode: 'override',
      reason,
      approvedBy: game?.user?.name
    });
  }

  /**
   * Log free build activation
   */
  static logFreeBuildActivation(actor, reason = null) {
    return this.logEvent(actor, 'freebuild-activated', {
      governanceMode: 'freeBuild',
      reason,
      approvedBy: game?.user?.name
    });
  }

  /**
   * Get audit timeline for actor
   *
   * @param {Actor} actor
   * @param {Object} options - Filter options
   *   {
   *     eventType: string | string[] (filter by type)
   *     limit: number (max entries to return)
   *     startTime: number (unix timestamp)
   *     endTime: number (unix timestamp)
   *   }
   * @returns {Array} Filtered audit entries
   */
  static getTimeline(actor, options = {}) {
    if (!actor || !actor.system.auditLog) {
      return [];
    }

    let entries = [...actor.system.auditLog];

    // Filter by event type
    if (options.eventType) {
      const types = Array.isArray(options.eventType)
        ? options.eventType
        : [options.eventType];
      entries = entries.filter(e => types.includes(e.eventType));
    }

    // Filter by time range
    if (options.startTime) {
      entries = entries.filter(e => e.timestamp >= options.startTime);
    }
    if (options.endTime) {
      entries = entries.filter(e => e.timestamp <= options.endTime);
    }

    // Sort by newest first
    entries = entries.sort((a, b) => b.timestamp - a.timestamp);

    // Limit results
    if (options.limit) {
      entries = entries.slice(0, options.limit);
    }

    return entries;
  }

  /**
   * Get summary statistics for audit trail
   *
   * @param {Actor} actor
   * @returns {Object} Summary statistics
   */
  static getSummary(actor) {
    if (!actor || !actor.system.auditLog) {
      return this._emptySummary();
    }

    const entries = actor.system.auditLog;
    const summary = {
      totalEvents: entries.length,
      eventTypes: {},
      violationsDetected: 0,
      violationsResolved: 0,
      governanceModeChanges: 0,
      enforcementDecisions: 0,
      lastEvent: null,
      firstEvent: null
    };

    for (const entry of entries) {
      // Count by type
      summary.eventTypes[entry.eventType] = (summary.eventTypes[entry.eventType] || 0) + 1;

      // Specific counters
      if (entry.eventType === 'violation-detected') summary.violationsDetected++;
      if (entry.eventType === 'violation-resolved') summary.violationsResolved++;
      if (entry.eventType === 'governance-mode-changed') summary.governanceModeChanges++;
      if (entry.eventType === 'enforcement-decision') summary.enforcementDecisions++;
    }

    // Sort by timestamp
    const sorted = [...entries].sort((a, b) => b.timestamp - a.timestamp);
    summary.lastEvent = sorted[0];

    const oldest = [...entries].sort((a, b) => a.timestamp - b.timestamp);
    summary.firstEvent = oldest[0];

    return summary;
  }

  /**
   * Clear audit trail (GMs only)
   */
  static clearTrail(actor) {
    if (!game.user.isGM) {
      throw new Error('Only GMs can clear audit trail');
    }

    if (!actor) return;

    actor.system.auditLog = [];
    this.logEvent(actor, 'audit-trail-cleared', { clearedBy: game.user.name });
  }

  /**
   * Export audit trail as JSON
   */
  static exportTrail(actor) {
    if (!actor) {
      return { error: 'No actor provided' };
    }

    return {
      actor: actor.name,
      trail: actor.system.auditLog || [],
      summary: this.getSummary(actor),
      exportedAt: new Date().toISOString()
    };
  }

  /**
   * Empty summary
   * @private
   */
  static _emptySummary() {
    return {
      totalEvents: 0,
      eventTypes: {},
      violationsDetected: 0,
      violationsResolved: 0,
      governanceModeChanges: 0,
      enforcementDecisions: 0,
      lastEvent: null,
      firstEvent: null
    };
  }
}

// Export for global access
if (typeof window !== 'undefined') {
  window.AuditTrail = AuditTrail;
}
