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

/** Register the helpers on the SWSE debug namespace. */
export function registerProgressionRenderStats() {
  const root = globalThis;
  root.SWSE ??= {};
  root.SWSE.debug ??= {};
  root.SWSE.debug.progressionRenderStats = progressionRenderStats;
  root.SWSE.debug.mentorRecommendationStats = mentorRecommendationStats;
}

registerProgressionRenderStats();

export default progressionRenderStats;
