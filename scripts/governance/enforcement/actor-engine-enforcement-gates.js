/**
 * PHASE 4: ActorEngine Enforcement Gates
 * Governance-aware enforcement for ActorEngine mutations
 *
 * These gates check governance mode before allowing mutations:
 * - NORMAL mode: Full enforcement, block if violations exist
 * - OVERRIDE/FREEBUILD: Allow mutations, keep tracking active
 *
 * These are advisory gates - they log but don't block mutations
 * (blocking is handled by integrity checker and level-up gate).
 */

import { SWSELogger } from '../utils/logger.js';
import { GovernanceSystem } from '../governance-system.js';
import { MissingPrereqsTracker } from '../integrity/missing-prereqs-tracker.js';

export class ActorEngineEnforcementGates {

  /**
   * Check if a finalization action is allowed for the actor.
   * Finalization actions are level-up, class change, species change, etc.
   * @static
   */
  static canFinalize(actor) {
    if (!actor) return true;

    GovernanceSystem.initializeGovernance(actor);

    // If enforcement is not active, allow
    if (!GovernanceSystem.isEnforcementActive(actor)) {
      return true;
    }

    // Check for violations
    const tracking = MissingPrereqsTracker.getMissingPrerequisites(actor);
    const brokenItems = tracking.brokenItems || [];

    // If no violations, allow
    if (brokenItems.length === 0) {
      return true;
    }

    // Violations exist and enforcement is active - block
    return false;
  }

  /**
   * Log finalization gate check.
   * @static
   */
  static logFinalizeCheck(actor, action, result) {
    if (!actor) return;

    SWSELogger.log('[FINALIZE-GATE] Finalization check', {
      actor: actor.name,
      action: action,
      allowed: result,
      enforcement: GovernanceSystem.isEnforcementActive(actor) ? 'active' : 'inactive',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Check if actor has violated prerequisites.
   * Used for displaying status badges and warnings.
   * @static
   */
  static hasViolations(actor) {
    if (!actor) return false;

    const tracking = MissingPrereqsTracker.getMissingPrerequisites(actor);
    return (tracking.brokenItems || []).length > 0;
  }

  /**
   * Get violation summary for an actor.
   * Returns count and breakdown by type.
   * @static
   */
  static getViolationSummary(actor) {
    if (!actor) return { total: 0, byType: {} };

    const tracking = MissingPrereqsTracker.getMissingPrerequisites(actor);
    const summary = tracking.summary || { count: 0, byType: {} };

    return {
      total: (tracking.brokenItems || []).length,
      byType: summary.byType || {},
      items: tracking.brokenItems || []
    };
  }

  /**
   * Check if an item violates prerequisites.
   * @static
   */
  static itemIsViolated(actor, itemId) {
    if (!actor) return false;

    const tracking = MissingPrereqsTracker.getMissingPrerequisites(actor);
    const brokenItems = tracking.brokenItems || [];

    return brokenItems.some(item => item.itemId === itemId);
  }

  /**
   * Get violations for a specific item.
   * @static
   */
  static getItemViolations(actor, itemId) {
    if (!actor) return null;

    const tracking = MissingPrereqsTracker.getMissingPrerequisites(actor);
    const brokenItems = tracking.brokenItems || [];

    return brokenItems.find(item => item.itemId === itemId) || null;
  }

  /**
   * Validate mutation is routed correctly.
   * Logs warnings if mutations bypass ActorEngine.
   * @static
   */
  static validateMutationRoute(actor, routeSource) {
    // This is for diagnostic logging
    // Actual enforcement is in MutationInterceptor
    if (!routeSource.includes('ActorEngine')) {
      SWSELogger.warn('[MUTATION-ROUTE] Mutation not from ActorEngine:', {
        actor: actor?.name,
        source: routeSource
      });
    }
  }

  /**
   * Check if actor is in a valid state for progression.
   * @static
   */
  static isValidForProgression(actor) {
    if (!actor) return true;

    GovernanceSystem.initializeGovernance(actor);

    // If enforcement is active and there are violations, invalid for progression
    if (GovernanceSystem.isEnforcementActive(actor)) {
      return !this.hasViolations(actor);
    }

    // In override/freebuild modes, progression is allowed
    return true;
  }

  /**
   * Log enforcement status.
   * Called during system ready checks.
   * @static
   */
  static logEnforcementStatus(actor) {
    if (!actor) return;

    GovernanceSystem.initializeGovernance(actor);

    const enforcement = GovernanceSystem.isEnforcementActive(actor) ? 'ACTIVE' : 'INACTIVE';
    const violations = this.getViolationSummary(actor);
    const valid = this.isValidForProgression(actor);

    SWSELogger.log('[ENFORCEMENT-STATUS]', {
      actor: actor.name,
      governance: actor.system.governance.enforcementMode,
      enforcement: enforcement,
      violations: violations.total,
      validForProgression: valid
    });
  }
}

// Export for debugging
if (typeof window !== 'undefined') {
  window.ActorEngineEnforcementGates = ActorEngineEnforcementGates;
}
