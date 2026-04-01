/**
 * MUTATION PATH GUARD
 * Permanent startup verification against wrapper re-introduction
 *
 * Detects if anyone reintroduces wrappers on critical Foundry mutation methods.
 * Runs automatically at system initialization.
 *
 * This guard exists to prevent repeat of the Actor.prototype.update
 * wrapper-stack corruption bug.
 *
 * @module mutation-path-guard
 */

import { swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

export class MutationPathGuard {
  /**
   * Suspicious markers that indicate wrapping/patching
   * @private
   */
  static SUSPICIOUS_MARKERS = [
    "SWSE",
    "Reflect.apply",
    ".call(",
    ".apply(",
    "origActorUpdate",
    "wrapped",
    "wrapper",
    "MutationInterceptor",
    "Debugger",
    "Trace",
    "interceptor",
    "patch",
    "const original"
  ];

  /**
   * Critical mutation methods that must never be wrapped
   * @private
   */
  static CRITICAL_METHODS = [
    { label: "Actor.prototype.update", fn: () => Actor?.prototype?.update },
    { label: "Document.prototype.update", fn: () => foundry?.abstract?.Document?.prototype?.update },
    { label: "Actor.updateDocuments", fn: () => Actor?.updateDocuments },
    { label: "Item.prototype.update", fn: () => Item?.prototype?.update },
    { label: "Actor.prototype.createEmbeddedDocuments", fn: () => Actor?.prototype?.createEmbeddedDocuments },
    { label: "Actor.prototype.updateEmbeddedDocuments", fn: () => Actor?.prototype?.updateEmbeddedDocuments },
    { label: "Actor.prototype.deleteEmbeddedDocuments", fn: () => Actor?.prototype?.deleteEmbeddedDocuments },
  ];

  /**
   * Inspect a single method for wrapper markers
   * @private
   * @param {string} label - Method label for reporting
   * @param {Function} fn - The function to inspect
   * @returns {Object} { isClean: boolean, hits: string[], preview: string }
   */
  static _inspectMethod(label, fn) {
    try {
      const src = String(fn ?? "");

      // Check for suspicious markers
      const hits = this.SUSPICIOUS_MARKERS.filter(marker => src.includes(marker));

      // Check if source is suspiciously short or long (likely wrapped)
      const isNormalLength = src.length > 100 && src.length < 3000;
      const hasNormalStructure = src.includes("return") || src.includes("=>") || src.length < 100;

      const isClean = hits.length === 0 && (isNormalLength || hasNormalStructure);

      return {
        label,
        isClean,
        hits,
        preview: src.slice(0, 200),
        sourceLength: src.length
      };
    } catch (err) {
      swseLogger.warn(`[MutationPathGuard] Error inspecting ${label}:`, err);
      return {
        label,
        isClean: false,
        hits: ["inspection-error"],
        preview: "Error: Could not inspect method",
        error: err
      };
    }
  }

  /**
   * Run startup inspection of all critical mutation methods
   * @returns {Object} { allClean: boolean, results: Array }
   */
  static inspect() {
    const results = this.CRITICAL_METHODS
      .map(({ label, fn }) => this._inspectMethod(label, fn()))
      .filter(result => result.label); // Only methods that exist

    const allClean = results.every(r => r.isClean);

    return { allClean, results };
  }

  /**
   * Generate inspection report
   * @private
   * @param {Object} inspection - Results from inspect()
   * @returns {string} Formatted report
   */
  static _formatReport(inspection) {
    const { allClean, results } = inspection;

    if (allClean) {
      return (
        `[WRAPPER GUARD] ✅ Startup inspection complete — all critical methods CLEAN\n` +
        results.map(r => `  ✅ ${r.label}`).join("\n")
      );
    }

    // Format violations
    const violations = results.filter(r => !r.isClean);
    const clean = results.filter(r => r.isClean);

    let report = `[WRAPPER GUARD] ⚠️  CRITICAL: Wrapped mutation methods detected\n`;

    violations.forEach(v => {
      report += `\n  ❌ ${v.label}`;
      if (v.hits.length > 0) {
        report += ` (markers: ${v.hits.slice(0, 3).join(", ")})`;
      }
      if (v.error) {
        report += ` [Error during inspection]`;
      }
      report += `\n    Source length: ${v.sourceLength} chars`;
    });

    if (clean.length > 0) {
      report += `\n\n  Clean methods:\n`;
      clean.forEach(r => {
        report += `    ✅ ${r.label}\n`;
      });
    }

    return report;
  }

  /**
   * Initialize and run the guard at startup
   * Called during system initialization
   *
   * In dev mode: Reports results to console
   * In strict mode: Throws if wrappers detected
   * In production: Logs warnings only
   */
  static initialize() {
    try {
      const inspection = this.inspect();
      const report = this._formatReport(inspection);

      if (inspection.allClean) {
        // All methods clean
        console.log(report);
        swseLogger.info("[MutationPathGuard] Mutation path verified clean at startup");
        return true;
      }

      // Violations detected
      console.error(report);
      swseLogger.error("[MutationPathGuard] ❌ Wrapped mutation methods detected at startup", {
        violations: inspection.results.filter(r => !r.isClean).map(r => r.label)
      });

      // In STRICT mode, fail hard
      const enforcementLevel = game?.settings?.get?.('foundryvtt-swse', 'dev-strict-enforcement');
      if (enforcementLevel === true || window.location.hostname === 'localhost') {
        const devMode = game?.settings?.get?.('foundryvtt-swse', 'devMode');
        if (devMode) {
          throw new Error(
            `[MUTATION PATH GUARD] Critical wrapper violation detected.\n` +
            `Actor.prototype.update and other core mutation methods are wrapped.\n` +
            `This violates permanent SWSE architecture.\n` +
            `See console for details.`
          );
        }
      }

      return false;
    } catch (err) {
      console.error("[MutationPathGuard] Initialization failed:", err);
      swseLogger.error("[MutationPathGuard] Guard initialization error", err);
      return false;
    }
  }

  /**
   * Public API: Run manual verification (for diagnostics)
   * @returns {Object} Inspection results
   */
  static verify() {
    return this.inspect();
  }

  /**
   * Public API: Get formatted report
   * @returns {string} Human-readable report
   */
  static getReport() {
    const inspection = this.inspect();
    return this._formatReport(inspection);
  }
}
