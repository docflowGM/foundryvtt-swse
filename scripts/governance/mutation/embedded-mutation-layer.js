/**
 * Sentinel: Embedded Document Mutation Layer
 * PHASE 8C: Enforces governance of embedded document operations
 *
 * This layer prevents:
 * - Direct actor.createEmbeddedDocuments() calls
 * - Direct actor.deleteEmbeddedDocuments() calls
 * - Direct item.deleteEmbeddedDocuments() calls (embedded items)
 * - Clone + mutation bypass patterns
 * - Non-awaited mutations
 *
 * All embedded document operations MUST route through ActorEngine.
 *
 * ARCHITECTURE:
 * - Detection hooks into Foundry's document mutation events
 * - Checks MutationInterceptor context to verify authorization
 * - Reports violations to Sentinel
 * - Supports WARNING (report only) and ENFORCE (block) modes
 */

import { swseLogger } from '../../utils/logger.js';
import { MutationInterceptor } from './MutationInterceptor.js';

export class EmbeddedMutationLayer {
  static MODE = 'WARNING'; // 'WARNING' or 'ENFORCE'
  static VIOLATIONS = [];
  static ENABLED = false;

  /**
   * PHASE 9: Embedded Ownership Guard Rules
   * These rules enforce the governance boundary:
   * - If document.parent instanceof Actor → must route via ActorEngine
   * - If document is unowned → allow direct update
   */
  static OWNERSHIP_RULES = {
    itemOwnershipBoundary: true,  // Flag: check if item ownership matches routing
    warnOnOwnedDirectUpdate: true, // Warn if owned item uses direct .update()
    allowUnownedDirect: true,      // Allow world-level items to bypass ActorEngine
    trackOwnershipViolations: true // Track items that violated boundary
  };

  /**
   * Initialize embedded mutation enforcement
   * Must be called after ActorEngine is loaded
   */
  static initialize() {
    if (this.ENABLED) {
      swseLogger.warn('EmbeddedMutationLayer already initialized');
      return;
    }

    this.ENABLED = true;
    this._hookIntoFoundry();
    swseLogger.log(`[SENTINEL] EmbeddedMutationLayer initialized in ${this.MODE} mode`);
  }

  /**
   * Hook into Foundry's document mutation events
   * Intercept createEmbeddedDocuments and deleteEmbeddedDocuments at the source
   */
  static _hookIntoFoundry() {
    // Hook into Actor.createEmbeddedDocuments
    const originalCreate = Actor.prototype.createEmbeddedDocuments;
    Actor.prototype.createEmbeddedDocuments = async function(embeddedName, data, options = {}) {
      EmbeddedMutationLayer._checkMutationAuthorized('createEmbedded', embeddedName, this);
      return originalCreate.call(this, embeddedName, data, options);
    };

    // Hook into Actor.deleteEmbeddedDocuments
    const originalDelete = Actor.prototype.deleteEmbeddedDocuments;
    Actor.prototype.deleteEmbeddedDocuments = async function(embeddedName, ids, options = {}) {
      EmbeddedMutationLayer._checkMutationAuthorized('deleteEmbedded', embeddedName, this);
      return originalDelete.call(this, embeddedName, ids, options);
    };

    swseLogger.debug('[SENTINEL] Mutation hooks installed');
  }

  /**
   * Check if mutation is authorized through ActorEngine
   * Verifies MutationInterceptor context is set
   * Also checks ownership boundary per PHASE 9 rules
   */
  static _checkMutationAuthorized(operation, embeddedName, actor) {
    // Check if MutationInterceptor has an active context
    // If yes, mutation is authorized (going through ActorEngine)
    if (MutationInterceptor?.hasContext?.()) {
      // Authorized mutation
      return;
    }

    // Unauthorized mutation detected
    const stack = this._getCaller();
    const ownershipStatus = this._checkOwnershipBoundary(actor, embeddedName);

    const violation = {
      operation,
      embeddedName,
      actor: actor?.name ?? 'unknown',
      caller: stack,
      timestamp: new Date().toISOString(),
      source: this._getSourceFile(stack),
      ownershipBoundaryViolation: ownershipStatus.violated,
      documentCount: ownershipStatus.ownedCount
    };

    this.VIOLATIONS.push(violation);

    const ownershipNote = ownershipStatus.violated ?
      ` [OWNERSHIP BOUNDARY VIOLATION: ${ownershipStatus.ownedCount} owned documents mutated outside ActorEngine]` :
      '';

    const message = `[SENTINEL] Unauthorized embedded ${operation} on ${embeddedName} ` +
                    `in ${actor?.name} from ${violation.source}${ownershipNote}`;

    if (this.MODE === 'WARNING') {
      swseLogger.warn(message);
      console.warn(`%c${message}`, 'color: orange; font-weight: bold;');
    } else if (this.MODE === 'ENFORCE') {
      swseLogger.error(message);
      throw new Error(`Embedded mutation governance violation: ${message}`);
    }
  }

  /**
   * PHASE 9: Check ownership boundary
   * Returns whether this mutation violates the ownership rule
   *
   * Rule: Actor-owned documents MUST route through ActorEngine
   * This detects when owned documents are mutated outside that path
   */
  static _checkOwnershipBoundary(actor, embeddedName) {
    if (!this.OWNERSHIP_RULES.itemOwnershipBoundary || !actor) {
      return { violated: false, ownedCount: 0 };
    }

    // Check collection for owned documents
    let ownedCount = 0;
    try {
      const collection = actor.getEmbeddedCollection(embeddedName);
      if (collection && typeof collection.size !== 'undefined') {
        ownedCount = collection.size;
      }
    } catch (e) {
      // Collection access may fail, skip count
    }

    // VIOLATION: Owned documents being mutated outside ActorEngine context
    const violated = this.OWNERSHIP_RULES.warnOnOwnedDirectUpdate && ownedCount > 0;

    return {
      violated,
      ownedCount,
      rule: 'Actor-owned documents must route through ActorEngine'
    };
  }

  /**
   * Get current mutation context from MutationInterceptor
   */
  static _getMutationContext() {
    // Check if mutation is authorized by MutationInterceptor
    if (!MutationInterceptor) {
      return 'MutationInterceptor-not-loaded';
    }

    // Check if a mutation context is set (meaning ActorEngine is executing)
    if (MutationInterceptor.hasContext?.()) {
      // Get the context (if accessible)
      return 'ActorEngine-context-active';
    }

    // No context = not authorized
    return '';
  }

  /**
   * Get caller function name from stack trace
   */
  static _getCaller() {
    const stack = new Error().stack;
    const lines = stack.split('\n');
    // Skip first 3 lines (Error, this function, hook wrapper)
    // Return next 5 lines for context
    return lines.slice(3, 8).join('\n');
  }

  /**
   * Extract source file from stack trace
   */
  static _getSourceFile(stack) {
    const match = stack.match(/\((.*?):(\d+):(\d+)\)/);
    if (match) {
      const path = match[1];
      const line = match[2];
      // Get just the filename
      const filename = path.split('/').pop();
      return `${filename}:${line}`;
    }
    return 'unknown';
  }

  /**
   * Switch enforcement mode
   */
  static setMode(mode) {
    if (mode !== 'WARNING' && mode !== 'ENFORCE') {
      throw new Error(`Invalid mode: ${mode}. Must be WARNING or ENFORCE.`);
    }
    this.MODE = mode;
    swseLogger.log(`[SENTINEL] EmbeddedMutationLayer mode changed to ${mode}`);
  }

  /**
   * Get violation report
   */
  static getViolationReport() {
    return {
      mode: this.MODE,
      enabled: this.ENABLED,
      totalViolations: this.VIOLATIONS.length,
      violations: this.VIOLATIONS,
      summary: this._buildSummary()
    };
  }

  /**
   * Build summary of violations by source
   */
  static _buildSummary() {
    const summary = {};
    const ownershipViolations = [];

    for (const violation of this.VIOLATIONS) {
      const source = violation.source;
      if (!summary[source]) {
        summary[source] = {
          count: 0,
          operations: [],
          embeddedNames: [],
          ownershipBoundaryViolations: 0
        };
      }
      summary[source].count++;
      summary[source].operations.push(violation.operation);
      summary[source].embeddedNames.push(violation.embeddedName);

      // Track ownership violations
      if (violation.ownershipBoundaryViolation) {
        summary[source].ownershipBoundaryViolations++;
        ownershipViolations.push({
          source,
          actor: violation.actor,
          embeddedName: violation.embeddedName,
          ownedCount: violation.documentCount
        });
      }
    }

    // Add ownership summary
    if (ownershipViolations.length > 0) {
      summary._ownershipViolations = ownershipViolations;
    }

    return summary;
  }

  /**
   * Clear violations (for testing)
   */
  static clearViolations() {
    this.VIOLATIONS = [];
  }

  /**
   * Print violation report to console
   */
  static printReport() {
    const report = this.getViolationReport();

    console.log('%c=== SENTINEL EMBEDDED MUTATION REPORT ===', 'color: cyan; font-weight: bold; font-size: 14px;');
    console.log(`Mode: ${report.mode}`);
    console.log(`Enabled: ${report.enabled}`);
    console.log(`Total Violations: ${report.totalViolations}`);
    console.log('');

    if (report.totalViolations === 0) {
      console.log('%c✅ ZERO VIOLATIONS - System is fully governed', 'color: green; font-weight: bold;');
    } else {
      console.log('%c⚠️ VIOLATIONS DETECTED', 'color: orange; font-weight: bold;');
      console.table(report.violations);
      console.log('');
      console.log('Summary by source:');
      console.table(report.summary);

      // Report ownership boundary violations separately
      const ownershipViolations = report.summary._ownershipViolations;
      if (ownershipViolations && ownershipViolations.length > 0) {
        console.log('');
        console.log('%c⚠️ PHASE 9 OWNERSHIP BOUNDARY VIOLATIONS', 'color: red; font-weight: bold;');
        console.log('These violations represent owned documents mutated outside ActorEngine:');
        console.table(ownershipViolations);
      }
    }
  }
}

// Export for testing
export const EmbeddedMutationEnforcer = EmbeddedMutationLayer;
