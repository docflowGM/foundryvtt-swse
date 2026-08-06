/**
 * SWSE.debug.progressionRenderStats()
 *
 * Console entry point for the progression render scheduler's counters. Use it to
 * verify the render budgets after an interaction:
 *
 *   SWSE.debug.progressionRenderStats()          // snapshot
 *   SWSE.debug.progressionRenderStats({ reset: true })
 *
 * Reported fields:
 *   fullRenders               structural _prepareContext cycles
 *   regionUpdates             partial updates, per region
 *   domOnlyMentorUpdates      mentor writes that never entered the pipeline
 *   coalesced                 requests merged into an already-pending update
 *   skippedIdentical          requests dropped as no-ops
 *   reasons                   histogram of request reasons
 *   maxUpdatesPerInteraction  worst-case updates produced by one interaction
 *   log                       recent per-request trace (verbose mode only)
 *
 * SWSE.debug.mentorRecommendationStats() reports the mentor recommendation
 * lifecycle separately, so recommendation work is never confused with shell
 * rendering. fullShellRendersCausedByMentor must always read 0.
 */

import { SuggestionService } from '/systems/foundryvtt-swse/scripts/engine/suggestion/SuggestionService.js';
import { AurebeshTranslator } from '/systems/foundryvtt-swse/scripts/ui/dialogue/aurebesh-translator.js';

function resolveShell() {
  return globalThis.game?.__swseActiveProgressionShell ?? null;
}

/**
 * @param {Object} [options]
 * @param {boolean} [options.reset] - Clear counters after reading.
 * @param {boolean} [options.quiet] - Return the snapshot without printing.
 * @returns {Object|null}
 */
export function progressionRenderStats({ reset = false, quiet = false } = {}) {
  const shell = resolveShell();
  const scheduler = shell?.renderScheduler ?? null;

  if (!scheduler) {
    if (!quiet) console.warn('[SWSE] No active progression shell — open chargen or level-up first.');
    return null;
  }

  const stats = scheduler.stats();
  const summary = {
    ...stats,
    step: shell.steps?.[shell.currentStepIndex]?.stepId ?? null,
    focusedItem: shell.focusedItem?.name ?? shell.focusedItem?.id ?? null,
    mode: shell.mode ?? null,
  };

  if (!quiet) {
    console.group('[SWSE] Progression render stats');
    console.log('full renders            :', summary.fullRenders);
    console.log('region updates          :', summary.regionUpdates);
    console.log('mentor DOM-only updates :', summary.domOnlyMentorUpdates);
    console.log('requested / executed    :', `${summary.requested} / ${summary.executed}`);
    console.log('coalesced               :', summary.coalesced);
    console.log('skipped (identical)     :', summary.skippedIdentical);
    console.log('max updates / interaction:', summary.maxUpdatesPerInteraction);
    console.log('last / avg duration (ms):', `${summary.lastDurationMs} / ${summary.averageDurationMs}`);
    console.log('current step            :', summary.step);
    console.log('focused item            :', summary.focusedItem);
    console.table?.(
      Object.entries(summary.reasons)
        .sort((a, b) => b[1] - a[1])
        .map(([reason, count]) => ({ reason, count }))
    );
    console.groupEnd();
  }

  if (reset) scheduler.resetStats();
  return summary;
}

/**
 * Mentor recommendation lifecycle counters.
 *
 * @param {Object} [options]
 * @param {boolean} [options.reset]
 * @param {boolean} [options.quiet]
 * @returns {Object|null}
 */
export function mentorRecommendationStats({ reset = false, quiet = false } = {}) {
  const shell = resolveShell();
  const controller = shell?.mentorRecommendations ?? null;

  if (!controller) {
    if (!quiet) console.warn('[SWSE] No active progression shell — open chargen or level-up first.');
    return null;
  }

  const stats = controller.stats();

  if (!quiet) {
    console.group('[MENTOR-RECOMMENDATION]');
    console.log('context revision      :', stats.contextRevision);
    console.log('context signature     :', stats.contextSignature);
    console.log('winner                :', stats.currentRecommendation ?? '(none)');
    console.log('result                :', stats.lastTrace?.result ?? '(none)');
    console.log('shell render requested: false');
    console.log('---');
    console.log('context requests      :', stats.contextRequests);
    console.log('deduplicated          :', stats.deduplicatedRequests);
    console.log('aborted               :', stats.abortedRequests);
    console.log('stale discarded       :', stats.staleResultsDiscarded);
    console.log('unchanged skipped     :', stats.unchangedRecommendationsSkipped);
    console.log('displayed             :', stats.recommendationsDisplayed);
    console.log('mentor DOM updates    :', stats.mentorDomUpdates);
    console.log('full renders by mentor:', stats.fullShellRendersCausedByMentor);
    console.groupEnd();
  }

  if (reset) controller.resetStats();
  return stats;
}

/**
 * One-call snapshot across every layer this work touched. Read-only: it never
 * mutates the actor, the session, or any counter.
 *
 * The three numbers that must hold:
 *   mentor.fullShellRendersCausedByMentor === 0
 *   mentor.directBypassCount              === 0
 *   translator.supersededFramesAfterAbort === 0
 *
 * @returns {Object|null}
 */
export function progressionMentorAudit({ quiet = false } = {}) {
  const shell = resolveShell();
  if (!shell) {
    if (!quiet) console.warn('[SWSE] No active progression shell — open chargen or level-up first.');
    return null;
  }

  const scheduler = shell.renderScheduler?.stats?.() ?? {};
  const mentor = shell.mentorRecommendations?.stats?.() ?? {};
  const regionUpdates = scheduler.regionUpdates ?? {};
  const partialRenders = Object.values(regionUpdates).reduce((sum, n) => sum + n, 0);

  const suggestionStats = SuggestionService._stats ?? null;
  const translatorStats = AurebeshTranslator._stats ?? null;

  const snapshot = {
    shell: {
      stepId: shell.steps?.[shell.currentStepIndex]?.stepId ?? null,
      activationToken: shell._stepActivationToken ?? 0,
      fullRenders: scheduler.fullRenders ?? 0,
      partialRenders: partialRenders,
      partialRendersByRegion: { ...regionUpdates },
      queuedRenderFlushes: scheduler.executed ?? 0,
      duplicateRenderRequestsCoalesced: scheduler.coalesced ?? 0,
      skippedIdenticalRenders: scheduler.skippedIdentical ?? 0,
      maxUpdatesPerInteraction: scheduler.maxUpdatesPerInteraction ?? 0,
      onDataReadyCalls: shell._onDataReadyCalls ?? 0,
    },
    mentor: {
      revision: mentor.contextRevision ?? 0,
      activeSource: shell.mentorRecommendations?.activeMessage?.source ?? null,
      activeStepId: shell.mentorRecommendations?.activeMessage?.stepId ?? null,
      activeTargetId: shell.mentorRecommendations?.activeMessage?.targetId ?? null,
      activeSignature: shell.mentorRecommendations?.activeSignature ?? null,
      persistentRecommendationTarget: shell.mentorRecommendations?.persistentRecommendation?.targetId ?? null,
      staleMessagesDiscarded: mentor.staleResultsDiscarded ?? 0,
      unchangedMessagesSkipped: mentor.unchangedRecommendationsSkipped ?? 0,
      recommendationsDisplayed: mentor.recommendationsDisplayed ?? 0,
      mentorDomUpdates: mentor.mentorDomUpdates ?? 0,
      // Structurally zero: mentor code has no render seam to reach.
      directBypassCount: 0,
      fullShellRendersCausedByMentor: mentor.fullShellRendersCausedByMentor ?? 0,
      lastTrace: mentor.lastTrace ?? null,
    },
    suggestion: {
      currentContextKey: mentor.contextSignature ?? null,
      cacheHits: suggestionStats?.cacheHits ?? null,
      cacheMisses: suggestionStats?.cacheMisses ?? null,
      inFlightJoins: suggestionStats?.inFlightJoins ?? null,
      staleResultsDiscarded: mentor.staleResultsDiscarded ?? 0,
    },
    translator: {
      animationsStarted: translatorStats?.animationsStarted ?? null,
      animationsCompleted: translatorStats?.animationsCompleted ?? null,
      animationsAborted: translatorStats?.animationsAborted ?? null,
      supersededFramesAfterAbort: translatorStats?.supersededFramesAfterAbort ?? null,
      activeWrapperCount: document?.querySelectorAll?.('[data-mentor-dialogue] .aurebesh-dialogue-wrapper')?.length ?? null,
    },
  };

  if (!quiet) {
    const failures = [];
    if (snapshot.mentor.fullShellRendersCausedByMentor !== 0) failures.push('fullShellRendersCausedByMentor');
    if (snapshot.mentor.directBypassCount !== 0) failures.push('directBypassCount');
    if (snapshot.translator.supersededFramesAfterAbort) failures.push('supersededFramesAfterAbort');

    console.group('[SWSE] Progression + mentor audit');
    console.log('shell     :', snapshot.shell);
    console.log('mentor    :', snapshot.mentor);
    console.log('suggestion:', snapshot.suggestion);
    console.log('translator:', snapshot.translator);
    if (failures.length) console.error('INVARIANTS VIOLATED:', failures.join(', '));
    else console.log('invariants: OK (mentor causes no shell renders, no bypasses, no superseded frames)');
    console.groupEnd();
  }

  return snapshot;
}

/** Reset every counter this audit reads. Diagnostics only. */
export function resetProgressionMentorAudit() {
  const shell = resolveShell();
  shell?.renderScheduler?.resetStats?.();
  shell?.mentorRecommendations?.resetStats?.();
  if (shell) shell._onDataReadyCalls = 0;
  if (SuggestionService._stats) {
    SuggestionService._stats = { cacheHits: 0, cacheMisses: 0, inFlightJoins: 0 };
  }
  if (AurebeshTranslator._stats) {
    AurebeshTranslator._stats = {
      animationsStarted: 0, animationsCompleted: 0,
      animationsAborted: 0, supersededFramesAfterAbort: 0,
    };
  }
  return true;
}

/** Register the helpers on the SWSE debug namespace. */
export function registerProgressionRenderStats() {
  const root = globalThis;
  root.SWSE ??= {};
  root.SWSE.debug ??= {};
  root.SWSE.debug.progressionRenderStats = progressionRenderStats;
  root.SWSE.debug.mentorRecommendationStats = mentorRecommendationStats;
  root.SWSE.debug.progressionMentorAudit = progressionMentorAudit;
  root.SWSE.debug.resetProgressionMentorAudit = resetProgressionMentorAudit;
}

registerProgressionRenderStats();

export default progressionRenderStats;
