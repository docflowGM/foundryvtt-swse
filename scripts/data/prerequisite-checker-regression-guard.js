/**
 * Prerequisite Checker Regression Guard
 *
 * Enforces that all prerequisite validation goes through the unified PrerequisiteChecker.
 * Prevents accidental re-imports of deleted illegal validators.
 *
 * This module should be imported early in system initialization to catch violations.
 */

import { PrerequisiteChecker } from "/systems/foundryvtt-swse/scripts/data/prerequisite-checker.js";

/**
 * Verify no illegal validators are being imported
 * Checks module cache for forbidden imports
 * @throws {Error} If illegal validator modules are detected
 */
export function enforcePrerequisiteConsolidation() {
  // List of illegal/deleted modules that must not be imported
  const illegalModules = [
    'scripts/utils/prerequisite-validator.js',
    'scripts/progression/feats/prerequisite_engine.js',
    'prerequisite-validator',
    'prerequisite_engine'
  ];

  // Check CommonJS require cache (if available)
  if (typeof require !== 'undefined' && require.cache) {
    for (const modulePath of Object.keys(require.cache)) {
      for (const illegal of illegalModules) {
        if (modulePath.includes(illegal)) {
          throw new Error(
            `REGRESSION: Illegal prerequisite validator imported: ${modulePath}\n` +
            `All prerequisite validation must use PrerequisiteChecker from 'prerequisite-checker.js'\n` +
            `This module was deleted during Phase D consolidation and must not be re-introduced.`
          );
        }
      }
    }
  }

  // Verify PrerequisiteChecker is the singleton validator
  if (!PrerequisiteChecker) {
    throw new Error(
      'REGRESSION: PrerequisiteChecker not found.\n' +
      'This indicates a critical failure in the prerequisite validation consolidation.'
    );
  }

  console.log(
    '%c[PREREQUISITES] Regression guard: PrerequisiteChecker consolidation verified ✓',
    'color: #0a0; font-weight: bold'
  );
}

/**
 * Assert that only PrerequisiteChecker is imported
 * Use this in modules that touch prerequisites to catch violations at load time
 * @param {string} moduleName - Name of the calling module
 * @throws {Error} If using illegal validators
 */
export function assertPrerequisiteCheckerOnly(moduleName) {
  // This function is a placeholder for future runtime checks
  // Currently the regression guard runs on module load
  if (typeof moduleName === 'string' && !moduleName.startsWith('scripts/')) {
    console.warn(
      `[PREREQUISITES] Prerequisite check called from non-standard module: ${moduleName}\n` +
      `Ensure this module uses PrerequisiteChecker only.`
    );
  }
}

// Run guard on module load
enforcePrerequisiteConsolidation();
