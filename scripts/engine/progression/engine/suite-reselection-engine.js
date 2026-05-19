/**
 * suite-reselection-engine.js
 *
 * Canonical suite maintenance router.
 *
 * Legacy clear-then-popup flows are retired. Reselection is handled by the V2
 * progression steps, where owned entries can be removed with '-' to open
 * replacement slots and '+' can restore or add selections before finalization.
 */

import { swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { ForceProvenanceEngine } from "/systems/foundryvtt-swse/scripts/engine/progression/engine/force-provenance-engine.js";
import { canReselectSuite } from "/systems/foundryvtt-swse/scripts/engine/progression/utils/suite-reselection-utils.js";
import { launchProgressionSuiteStep } from "/systems/foundryvtt-swse/scripts/apps/progression-framework/progression-suite-launcher.js";

export class SuiteReselectionEngine {
  static async clearAndReselectForcePowers(actor, context) {
    if (!actor) return { success: false, error: 'No actor provided' };
    if (!canReselectSuite(context)) {
      return { success: false, error: 'Force Power reselection not allowed in this context' };
    }

    swseLogger.log('[SUITE RESELECTION] Routing Force Power reselection to canonical V2 step', {
      actor: actor.name,
      context,
    });

    const shell = await launchProgressionSuiteStep(actor, 'force-powers', {
      reason: 'force-power-reselection',
      source: 'suite-reselection-engine',
      context,
    });

    return shell
      ? { success: true, appliedCount: 0, message: 'Force Power reselection opened in the canonical progression step.' }
      : { success: false, error: 'Unable to open Force Power reselection step.' };
  }

  static async clearAndReselectManeuvers(actor, context) {
    if (!actor) return { success: false, error: 'No actor provided' };
    if (!canReselectSuite(context)) {
      return { success: false, error: 'Maneuver reselection not allowed in this context' };
    }

    swseLogger.log('[SUITE RESELECTION] Routing Starship Maneuver reselection to canonical V2 step', {
      actor: actor.name,
      context,
    });

    const shell = await launchProgressionSuiteStep(actor, 'starship-maneuvers', {
      reason: 'starship-maneuver-reselection',
      source: 'suite-reselection-engine',
      context,
    });

    return shell
      ? { success: true, appliedCount: 0, message: 'Starship Maneuver reselection opened in the canonical progression step.' }
      : { success: false, error: 'Unable to open Starship Maneuver reselection step.' };
  }

  static async allocateOwnedForcePowers(actor, context = 'ability-increase') {
    if (!actor) return { success: false, error: 'No actor provided' };

    try {
      const ledger = await ForceProvenanceEngine.reconcileForceGrants(actor, context);
      const totalOwed = ForceProvenanceEngine.getTotalOwed(ledger);
      if (totalOwed <= 0) {
        return { success: true, appliedCount: 0, message: 'No additional Force powers needed' };
      }

      swseLogger.log('[SUITE RESELECTION] Routing owed Force Power allocation to canonical V2 step', {
        actor: actor.name,
        context,
        totalOwed,
        totalEntitled: ForceProvenanceEngine.getTotalEntitled(ledger),
        totalOwned: ForceProvenanceEngine.getTotalOwned(ledger),
      });

      const shell = await launchProgressionSuiteStep(actor, 'force-powers', {
        reason: 'force-power-delta-allocation',
        source: 'suite-reselection-engine',
        requestedCount: totalOwed,
        context,
      });

      return shell
        ? { success: true, appliedCount: 0, message: `Opened Force Power training for ${totalOwed} owed power(s).` }
        : { success: false, error: 'Unable to open Force Power allocation step.' };
    } catch (err) {
      swseLogger.error('[SUITE RESELECTION] Force Power delta allocation failed', err);
      return { success: false, error: 'Delta allocation failed: ' + err.message };
    }
  }
}
