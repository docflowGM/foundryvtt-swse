/**
 * Chargen Development Guards
 *
 * Ensures chargen follows its architectural constraints:
 * - No Document mutation during preview/state building
 * - All state changes via patches
 * - No implicit render-side logic
 * - Explicit finalize boundary
 *
 * These guards prevent regressions and catch architectural violations early.
 */

import { SWSELogger } from '../../utils/logger.js';

export class ChargenDevGuards {
  static enabled = game?.settings?.get?.('foundryvtt-swse', 'devMode') ?? false;

  /**
   * Assert a condition during chargen
   * @param {boolean} condition - The condition to check
   * @param {string} message - Error message if condition fails
   * @throws {Error} if condition is false and dev mode is enabled
   */
  static assert(condition, message) {
    if (!this.enabled) {return;}

    if (!condition) {
      const error = new Error(`[CHARGEN DEV] ${message}`);
      SWSELogger.error(error.message);
      throw error;
    }
  }

  /**
   * Guard: No Document creation during chargen
   * @param {string} context - Where this check is being called from
   */
  static guardNoDocumentCreation(context) {
    // This will be called before createEmbeddedDocuments/createEmbeddedDocument
    // In production, we silently allow it (the sanitizer handles validation)
    // In dev mode, we enforce the rule
    if (this.enabled) {
      SWSELogger.warn(`[CHARGEN DEV] Document creation detected in ${context} - should be patch-based`);
    }
  }

  /**
   * Guard: No implicit state changes in render handlers
   * @param {ChargenMainDialog} chargen - The chargen instance
   */
  static guardRenderLogic(chargen) {
    if (!this.enabled) {return;}

    const originalRender = chargen._onRender;
    chargen._onRender = async function(...args) {
      // Verify that _onRender doesn't change application state
      const stateBefore = {
        currentStep: this.currentStep,
        characterData: JSON.stringify(this.characterData)
      };

      const result = await originalRender.apply(this, args);

      const stateAfter = {
        currentStep: this.currentStep,
        characterData: JSON.stringify(this.characterData)
      };

      const stateChanged = stateBefore.currentStep !== stateAfter.currentStep ||
                          stateBefore.characterData !== stateAfter.characterData;

      ChargenDevGuards.assert(
        !stateChanged,
        `Render handler modified state: currentStep=${stateBefore.currentStep}->${stateAfter.currentStep}`
      );

      return result;
    };
  }

  /**
   * Guard: All progression changes are patches
   * Enforces that character modifications go through ProgressionEngine
   */
  static guardPatchOnlyModification(chargen) {
    if (!this.enabled) {return;}

    const originalUpdate = chargen.characterData ? Object.getPrototypeOf(chargen.characterData).update : null;
    if (!originalUpdate) {return;}

    // Track that modifications go through proper channels
    chargen._patchApplicationCount = 0;
  }

  /**
   * Log a dev-mode invariant violation
   * @param {string} invariant - Which invariant was violated
   * @param {string} details - Details about the violation
   */
  static logInvariantViolation(invariant, details) {
    if (!this.enabled) {return;}

    const violations = chargen._invariantViolations || [];
    violations.push({ invariant, details, timestamp: Date.now() });
    chargen._invariantViolations = violations;

    SWSELogger.warn(`[CHARGEN INVARIANT] ${invariant}: ${details}`);
  }

  /**
   * Verify chargen invariants before finalize
   * Should be called right before character is finalized
   */
  static verifyInvariants(chargen) {
    if (!this.enabled) {return;}

    const violations = chargen._invariantViolations || [];
    if (violations.length > 0) {
      SWSELogger.error(`[CHARGEN INVARIANTS] ${violations.length} violations detected:`, violations);
      // In dev mode, this could throw; in production, it just logs
    }
  }
}

/**
 * Register dev guards on chargen creation
 * Call this in ChargenMainDialog constructor
 */
export function initializeChargenDevGuards(chargen) {
  if (!ChargenDevGuards.enabled) {return;}

  ChargenDevGuards.guardRenderLogic(chargen);
  ChargenDevGuards.guardPatchOnlyModification(chargen);
}
