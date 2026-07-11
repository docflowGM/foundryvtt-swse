/**
 * ProgressionMetadataPlanBuilder
 *
 * Domain compiler for final progression receipts/completion bookkeeping.
 *
 * This module is side-effect free. It only returns mutation-plan set fragments.
 */

// Canonical receipt builder. This is the SAME function ProgressionFinalizer uses
// on its inline metadata path, which is what makes this builder behavior-equivalent
// to that inline code. (Previously this imported a non-existent
// levelup-finalization-receipt.js, which is why the builder could never load.)
import { buildLevelUpFinalizationReceipt } from '/systems/foundryvtt-swse/scripts/engine/progression/utils/levelup-finalization-audit.js';

function completedSessionId(sessionState = {}) {
  return sessionState.sessionId || sessionState.progressionSession?.sessionId || 'unknown';
}

export class ProgressionMetadataPlanBuilder {
  static buildSet({ actor, sessionState = {}, levelUpManifest = null } = {}) {
    const set = {};
    const completedId = completedSessionId(sessionState);
    const completedAt = new Date().toISOString();

    if (sessionState.mode === 'levelup' && levelUpManifest) {
      set['flags.swse.levelUpEntitlementManifest'] = levelUpManifest;
      set['flags.swse.levelUpFinalizationReceipt'] = buildLevelUpFinalizationReceipt(levelUpManifest, sessionState.progressionSession);
    }

    set[`flags.foundryvtt-swse.progression.${sessionState.mode}.completed`] = {
      completed: true,
      mode: sessionState.mode,
      sessionId: completedId,
      currentStepId: sessionState.progressionSession?.currentStepId || null,
      completedAt,
      source: 'progression-finalizer',
    };
    set['system.progression.lastCompletedMode'] = sessionState.mode;
    set['system.progression.completedSessionId'] = completedId;
    set['system.progression.completedAt'] = completedAt;

    if (sessionState.mode === 'chargen') {
      set['system.progression.chargenComplete'] = true;
      set['flags.foundryvtt-swse.progression.chargen.completedAt'] = completedAt;
    }

    return set;
  }
}
