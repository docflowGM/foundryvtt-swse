/**
 * Legacy Prerequisite Engine (compatibility shim)
 *
 * This module provides backward compatibility for code that references
 * PrerequisiteRequirements. It was consolidated into PrerequisiteChecker
 * but maintained here as a re-export for existing imports.
 */

import { PrerequisiteChecker } from "/systems/foundryvtt-swse/scripts/data/prerequisite-checker.js";

/**
 * PrerequisiteRequirements - Legacy alias for PrerequisiteChecker
 * Maintained for backward compatibility with existing imports
 */
export class PrerequisiteRequirements extends PrerequisiteChecker {
  // All methods inherited from PrerequisiteChecker
}

export default PrerequisiteRequirements;
