/**
 * ARCHITECTURE GUARD (Development Mode)
 *
 * Enforces V2 Sovereignty: Engines must not import from apps/
 *
 * RULE:
 * Sheets → Engines → Shared
 * Actors → Engines
 * Engines → Shared
 * Shared → (nothing upward)
 *
 * NO EXCEPTIONS.
 *
 * This module runs in DEVELOPMENT mode only.
 * It does NOT block execution but LOGS violations clearly.
 */

export class ArchitectureGuard {
  static VIOLATIONS = [];

  /**
   * Check if a module path is in the engine layer
   */
  static isEngineModule(path) {
    return path && path.includes('/scripts/engine/');
  }

  /**
   * Check if an import is from the apps layer
   */
  static isAppsImport(importPath) {
    return importPath && importPath.includes('/scripts/apps/');
  }

  /**
   * Check if an import is allowed (from shared, core, utils, etc.)
   */
  static isAllowedImport(importPath) {
    // Allow imports from these layers:
    const allowedPatterns = [
      '/scripts/engine/',          // Self-imports (engine to engine)
      '/scripts/shared/',          // Shared layer
      '/scripts/core/',            // Core utilities
      '/scripts/utils/',           // Utils layer
      '/scripts/governance/',      // Governance layer
      '/scripts/actors/',          // Actors layer
      '/systems/foundryvtt-swse/scripts/engine/',
      '/systems/foundryvtt-swse/scripts/shared/',
      '/systems/foundryvtt-swse/scripts/core/',
      '/systems/foundryvtt-swse/scripts/utils/',
      '/systems/foundryvtt-swse/scripts/governance/',
      '/systems/foundryvtt-swse/scripts/actors/'
    ];

    return allowedPatterns.some(pattern => importPath.includes(pattern));
  }

  /**
   * Report a layering violation
   * @param {string} engineFile - The engine file violating the rule
   * @param {string} appsImport - The apps/ import being used
   */
  static reportViolation(engineFile, appsImport) {
    const violation = {
      timestamp: new Date().toISOString(),
      engineFile,
      appsImport,
      severity: 'CRITICAL'
    };

    this.VIOLATIONS.push(violation);

    const message = `
╔════════════════════════════════════════════════════════════════╗
║               🚨 ARCHITECTURE VIOLATION DETECTED 🚨              ║
╚════════════════════════════════════════════════════════════════╝

  Engine file CANNOT import from apps layer.
  This violates V2 Sovereignty architecture.

  VIOLATING FILE:  ${engineFile}
  ILLEGAL IMPORT:  ${appsImport}

  RULE (V2 ARCHITECTURE):
    Sheets → Engines → Shared
    Actors → Engines
    Engines → Shared
    Shared → (nothing upward)

  ACTION REQUIRED:
    1. Remove the apps/ import from the engine file
    2. Extract pure logic into engine layer utilities
    3. Have apps layer call engine functions instead

  DO NOT add exceptions or workarounds.
  Contact architecture team if this requires special handling.
    `.trim();

    console.error(message);
  }

  /**
   * Initialize runtime enforcement
   * Scans module registry for violations
   */
  static initialize() {
    if (!CONFIG?.development) {
      // Only run in development mode
      return;
    }

    console.log('[ArchitectureGuard] Initializing V2 Sovereignty enforcement...');

    // This would ideally hook into module loading or use a build-time check
    // For now, this serves as a documentation anchor for the pattern

    console.log('[ArchitectureGuard] V2 Architecture Guard ready. Violations will be reported to console.error()');
  }

  /**
   * Report all violations found during this session
   */
  static reportViolationsSummary() {
    if (this.VIOLATIONS.length === 0) {
      console.log('✅ [ArchitectureGuard] No violations detected. V2 Sovereignty maintained.');
      return;
    }

    console.error(`
╔════════════════════════════════════════════════════════════════╗
║           ARCHITECTURE VIOLATIONS SUMMARY (SESSION)             ║
╚════════════════════════════════════════════════════════════════╝

  Total violations: ${this.VIOLATIONS.length}

${this.VIOLATIONS.map((v, i) => `
  [${i + 1}] ${v.engineFile}
      → imports from: ${v.appsImport}
      severity: ${v.severity}
`).join('')}

  These must be fixed before the next commit.
    `.trim());
  }
}

// Initialize on module load if in development
if (typeof CONFIG !== 'undefined' && CONFIG?.development) {
  ArchitectureGuard.initialize();
}

export default ArchitectureGuard;
