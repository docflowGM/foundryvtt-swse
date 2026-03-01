/**
 * VALIDATE MENTOR INTEGRATION
 *
 * Startup validation for mentor atom selection and judgment mapping.
 * Ensures all components of the mentor integration are properly configured.
 *
 * Called during system initialization to catch configuration errors early.
 */

import { SWSELogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';
import { validateAtomMappings } from '/systems/foundryvtt-swse/scripts/engine/suggestion/selectReasonAtoms.js';
import { validateMentorRules } from '/systems/foundryvtt-swse/scripts/engine/mentor/mentor-reason-judgment-map.js';

/**
 * Run all validation checks for mentor integration
 * @returns {Object} { valid: boolean, errors: string[] }
 */
export function validateMentorIntegration() {
  const errors = [];

  SWSELogger.log('[validateMentorIntegration] Starting validation...');

  // Check 1: Validate reason atom mappings
  const atomValidation = validateAtomMappings();
  if (!atomValidation.valid) {
    errors.push(...atomValidation.errors.map(e => `[Atoms] ${e}`));
  } else {
    SWSELogger.log('[validateMentorIntegration] ✓ Reason atom mappings valid');
  }

  // Check 2: Validate mentor judgment rules
  const rulesValidation = validateMentorRules();
  if (!rulesValidation.isValid) {
    errors.push(...rulesValidation.errors.map(e => `[Rules] ${e}`));
  } else {
    SWSELogger.log('[validateMentorIntegration] ✓ Mentor judgment rules valid');
  }

  // Report results
  if (errors.length === 0) {
    SWSELogger.log('[validateMentorIntegration] ✓ All mentor integration checks passed');
    return { valid: true, errors: [] };
  } else {
    SWSELogger.error('[validateMentorIntegration] Found configuration errors:');
    errors.forEach(e => SWSELogger.error(`  - ${e}`));
    return { valid: false, errors };
  }
}

/**
 * Log integration status for debugging
 */
export function logMentorIntegrationStatus() {
  SWSELogger.log('='.repeat(60));
  SWSELogger.log('MENTOR SYSTEM INTEGRATION STATUS');
  SWSELogger.log('='.repeat(60));

  const validation = validateMentorIntegration();

  SWSELogger.log(`Integration Status: ${validation.valid ? '✓ VALID' : '✗ INVALID'}`);

  if (!validation.valid) {
    SWSELogger.error('Configuration Issues:');
    validation.errors.forEach(e => {
      SWSELogger.error(`  ${e}`);
    });
  }

  SWSELogger.log('='.repeat(60));
}
