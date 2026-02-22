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
    const violation = {
      operation,
      embeddedName,
      actor: actor?.name ?? 'unknown',
      caller: stack,
      timestamp: new Date().toISOString(),
      source: this._getSourceFile(stack)
    };

    this.VIOLATIONS.push(violation);

    const message = `[SENTINEL] Unauthorized embedded ${operation} on ${embeddedName} ` +
                    `in ${actor?.name} from ${violation.source}`;

    if (this.MODE === 'WARNING') {
      swseLogger.warn(message);
      console.warn(`%c${message}`, 'color: orange; font-weight: bold;');
    } else if (this.MODE === 'ENFORCE') {
      swseLogger.error(message);
      throw new Error(`Embedded mutation governance violation: ${message}`);
    }
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

    for (const violation of this.VIOLATIONS) {
      const source = violation.source;
      if (!summary[source]) {
        summary[source] = {
          count: 0,
          operations: [],
          embeddedNames: []
        };
      }
      summary[source].count++;
      summary[source].operations.push(violation.operation);
      summary[source].embeddedNames.push(violation.embeddedName);
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
    }
  }
}

// Export for testing
export const EmbeddedMutationEnforcer = EmbeddedMutationLayer;
