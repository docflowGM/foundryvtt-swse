/**
 * ProgressionRenderScheduler
 *
 * Single owner of *when* the progression shell repaints.
 *
 * Before this existed, `ProgressionShell.requestRender()` called `render()`
 * synchronously and the render guard only rejected calls made while another
 * render was already running. Sequential async requests — a plugin rendering
 * inside `onItemFocused()`, the shell rendering again after the same callback,
 * a suggestion resolving later, a registry retry — each produced their own full
 * `_prepareContext` cycle. A handful of clicks produced dozens of repaints.
 *
 * This scheduler coalesces every request that arrives before the next animation
 * frame into ONE render, merging their reasons and dirty regions, and hands all
 * callers the same promise. It also:
 *
 * - drops opted-in requests whose state signature matches what is on screen,
 * - keeps the strongest requested update (structural beats region-scoped),
 * - stamps each render with an epoch so stale async work can detect supersession,
 * - records per-request diagnostics for `SWSE.debug.progressionRenderStats()`.
 *
 * It deliberately does NOT know how to paint. The shell supplies an executor;
 * the scheduler only decides whether, when, and at what scope to call it.
 */

/**
 * Canonical update scopes. `structural` is the full-shell repaint.
 *
 * `mentor` is deliberately NOT a region. The mentor rail is written straight to
 * the DOM by MentorRail and owns no render seam, so a mentor-scoped request had
 * nowhere to land — it fell through to a structural repaint, which is precisely
 * the "mentor dialogue repaints the shell" behaviour this work exists to stop.
 * Requesting it is an ownership violation, handled in `request()`.
 *
 * @type {ReadonlySet<string>}
 */
export const RENDER_REGIONS = Object.freeze(new Set([
  'details',
  'work-surface',
  'summary',
  'utility',
  'footer',
  'progress',
  'structural',
]));

/**
 * Regions the shell can genuinely update on their own. Anything outside this
 * set has no independent seam yet and must be satisfied structurally, decided
 * up front rather than discovered halfway through a partial update.
 *
 * Phase 2: work-surface, summary, utility, footer, and progress joined
 * 'details' once ProgressionShell grew a real updater + lifecycle rehydration
 * for each (see _updateWorkSurfaceRegion / _updateSummaryRegion /
 * _updateUtilityRegion / _updateProgressRegion / _updateFooterRegion in
 * progression-shell.js). Do not add a region here before its updater exists —
 * this set is what lets a scoped request skip the preflight-to-structural
 * fallback, so listing one prematurely would silently corrupt that region's
 * DOM instead of safely falling back.
 * @type {ReadonlySet<string>}
 */
export const INDEPENDENT_REGIONS = Object.freeze(new Set([
  'details',
  'work-surface',
  'summary',
  'utility',
  'footer',
  'progress',
]));

/** Regions that are never valid to request. Requesting one is a bug, not a repaint. */
export const FORBIDDEN_REGIONS = Object.freeze(new Set(['mentor']));

const STRUCTURAL = 'structural';

function normalizeRegions(regions) {
  const list = Array.isArray(regions) ? regions : (regions ? [regions] : []);
  const out = new Set();
  const forbidden = [];
  for (const region of list) {
    const key = String(region ?? '').trim().toLowerCase();
    if (!key) continue;
    if (FORBIDDEN_REGIONS.has(key)) { forbidden.push(key); continue; }
    out.add(RENDER_REGIONS.has(key) ? key : STRUCTURAL);
  }
  return { regions: out, forbidden };
}

export class ProgressionRenderScheduler {
  /**
   * @param {Object} host - The shell.
   * @param {Function} host.executeRender - async ({ regions, structural, reasons, preserveScroll, epoch }) => any
   * @param {Function} [host.computeStateSignature] - () => string
   * @param {Function} [host.isDebugEnabled] - () => boolean
   */
  constructor(host) {
    this.host = host;

    this._pending = null;              // { promise, resolve, reject, regions, reasons, structural, preserveScroll, force }
    this._frameHandle = null;
    this._running = null;              // in-flight execution promise

    this._epoch = 0;                   // increments per executed render; stale-result token
    this._revision = 0;                // increments per accepted request
    this._lastSignature = null;

    this._stats = {
      requested: 0,
      executed: 0,
      coalesced: 0,
      skippedIdentical: 0,
      fullRenders: 0,
      regionUpdates: {},
      domOnlyMentorUpdates: 0,
      reasons: {},
      maxUpdatesPerInteraction: 0,
      lastDurationMs: 0,
      totalDurationMs: 0,
      forbiddenRegionRequests: 0,
      structuralFallbacks: 0,
    };
    this._interactionUpdateCount = 0;
    this._log = [];
    this._logLimit = 200;
  }

  /** Current render epoch. Async work can capture this and compare later. */
  get epoch() {
    return this._epoch;
  }

  /** True when the captured epoch is still the newest one. */
  isCurrentEpoch(epoch) {
    return epoch === this._epoch;
  }

  /**
   * Mark the start of a fresh user interaction so per-interaction update counts
   * are attributable in the stats summary.
   * @param {string} [label]
   */
  beginInteraction(label = 'interaction') {
    this._stats.maxUpdatesPerInteraction = Math.max(
      this._stats.maxUpdatesPerInteraction,
      this._interactionUpdateCount
    );
    this._interactionUpdateCount = 0;
    this._interactionLabel = label;
  }

  /**
   * Request a repaint. Requests arriving before the next frame are merged.
   *
   * @param {Object} options
   * @param {string} [options.reason]
   * @param {string[]|string} [options.regions] - Dirty regions; omitted means structural.
   * @param {boolean} [options.structural] - Force the full-shell path.
   * @param {boolean} [options.preserveScroll]
   * @param {boolean} [options.force] - Bypass the identical-signature skip.
   * @param {boolean} [options.dedupe] - Opt in to skipping when shell state is
   *   unchanged. Only safe for requests whose inputs are fully described by the
   *   shell state signature.
   * @returns {Promise<*>} Resolves when the coalesced render completes.
   */
  request({
    reason = 'unspecified',
    regions = null,
    structural = false,
    preserveScroll = true,
    force = false,
    dedupe = false,
  } = {}) {
    const { regions: requested, forbidden } = normalizeRegions(regions);

    // A forbidden region has no seam to paint. Falling through to structural is
    // what let mentor dialogue repaint the whole shell, so this is reported as
    // the ownership violation it is and the request is dropped, not upgraded.
    if (forbidden.length) {
      this._stats.forbiddenRegionRequests += forbidden.length;
      this._record({ reason, outcome: 'forbidden-region', regions: forbidden, structural: false });
      const message = `[ProgressionRenderScheduler] "${forbidden.join(', ')}" is not a shell render region — `
        + 'that surface owns its own DOM. Requesting it would force a structural repaint.';
      if (this.host.isStrictMode?.()) throw new Error(message);
      // eslint-disable-next-line no-console
      console.warn(message, { reason });
      if (requested.size === 0 && !structural) return Promise.resolve(undefined);
    }

    this._stats.requested += 1;
    this._stats.reasons[reason] = (this._stats.reasons[reason] || 0) + 1;
    this._revision += 1;

    // No declared regions means the caller does not know what changed, so the
    // only safe interpretation is a full repaint.
    const isStructural = structural || requested.size === 0 || requested.has(STRUCTURAL);

    if (this._pending) {
      this._stats.coalesced += 1;
      this._pending.reasons.push(reason);
      this._pending.structural = this._pending.structural || isStructural;
      this._pending.force = this._pending.force || force;
      // A merged batch may only be skipped as identical if every contributor
      // agreed it was safe to skip.
      this._pending.dedupe = this._pending.dedupe && dedupe;
      this._pending.preserveScroll = this._pending.preserveScroll || preserveScroll;
      for (const region of requested) this._pending.regions.add(region);
      this._record({ reason, outcome: 'coalesced', regions: [...requested], structural: isStructural });
      return this._pending.promise;
    }

    let resolve;
    let reject;
    const promise = new Promise((res, rej) => { resolve = res; reject = rej; });

    this._pending = {
      promise,
      resolve,
      reject,
      reasons: [reason],
      regions: requested,
      structural: isStructural,
      preserveScroll,
      force,
      dedupe,
      revision: this._revision,
    };

    this._scheduleFlush();
    return promise;
  }

  _scheduleFlush() {
    const runner = () => {
      this._frameHandle = null;
      void this._flushPending();
    };

    // requestAnimationFrame merges everything produced by one interaction
    // (plugin state update + shell follow-up + mentor reaction) into one paint.
    // Fall back to a microtask in non-DOM environments (tests).
    if (typeof requestAnimationFrame === 'function') {
      this._frameHandle = requestAnimationFrame(runner);
    } else {
      this._frameHandle = -1;
      queueMicrotask(runner);
    }
  }

  _cancelFrame() {
    if (this._frameHandle !== null && this._frameHandle !== -1 && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(this._frameHandle);
    }
    this._frameHandle = null;
  }

  async _flushPending() {
    const pending = this._pending;
    if (!pending) return;

    // A render is already running. Keep the request pending and re-arm so the
    // latest state wins instead of interleaving two paints.
    if (this._running) {
      this._scheduleFlush();
      return;
    }

    this._pending = null;

    const reasons = [...new Set(pending.reasons)];
    const regions = pending.structural ? [STRUCTURAL] : [...pending.regions];

    // Identical-state skip.
    //
    // Deliberately opt-in (`dedupe: true`). The shell-level signature only sees
    // shell state — step, focus, selection revision, mentor, processing. Plenty
    // of legitimate repaints are driven by step-local state the signature cannot
    // see (an attribute pool assignment, a follower ability choice), so skipping
    // by default would silently swallow real UI updates. Callers that know their
    // request is idempotent ask for the skip explicitly.
    if (!pending.force && pending.structural && pending.dedupe) {
      const signature = this._signature();
      if (signature !== null && signature === this._lastSignature) {
        this._stats.skippedIdentical += 1;
        this._record({ reason: reasons.join(','), outcome: 'skipped-identical', regions, structural: true });
        pending.resolve(undefined);
        return;
      }
    }

    const epoch = ++this._epoch;
    const started = this._now();

    // Scroll state belongs to the job that actually renders.
    //
    // Capturing at request time meant a request that was then skipped as
    // identical, or dropped as a forbidden region, still left a snapshot behind
    // for whichever render came next — restoring scroll positions belonging to
    // an interaction that never repainted. Both of those decisions are already
    // made by the time we get here, so this snapshot has exactly one owner: the
    // accepted job below.
    const scrollSnapshots = pending.preserveScroll
      ? (this.host.captureScrollSnapshots?.() ?? null)
      : null;

    this._running = (async () => {
      try {
        const result = await this.host.executeRender({
          regions,
          structural: pending.structural,
          reasons,
          preserveScroll: pending.preserveScroll,
          scrollSnapshots,
          force: pending.force,
          epoch,
        });

        const duration = this._now() - started;
        this._stats.executed += 1;
        this._stats.lastDurationMs = duration;
        this._stats.totalDurationMs += duration;
        this._interactionUpdateCount += 1;
        this._stats.maxUpdatesPerInteraction = Math.max(
          this._stats.maxUpdatesPerInteraction,
          this._interactionUpdateCount
        );

        // Account for what the executor DID, not what the caller asked for.
        //
        // A region-scoped request whose regions have no independent seam is
        // satisfied by a full repaint. Counting it as a region update made the
        // diagnostics claim partial renders that never happened — precisely the
        // number this work exists to drive down. The executor reports its own
        // outcome; the requested scope is only a fallback for an executor that
        // does not.
        const outcome = this._normalizeOutcome(result, { regions, structural: pending.structural });

        if (outcome.kind === 'structural') {
          this._stats.fullRenders += 1;
          if (outcome.fallbackReason) this._stats.structuralFallbacks += 1;
          this._lastSignature = this._signature();
        } else {
          for (const region of outcome.appliedRegions) {
            this._stats.regionUpdates[region] = (this._stats.regionUpdates[region] || 0) + 1;
          }
        }

        this._record({
          reason: reasons.join(','),
          outcome: 'executed',
          kind: outcome.kind,
          regions,
          appliedRegions: outcome.appliedRegions,
          fallbackReason: outcome.fallbackReason,
          structural: outcome.kind === 'structural',
          requestedStructural: pending.structural,
          durationMs: Math.round(duration * 100) / 100,
          epoch,
        });

        pending.resolve(result);
        return result;
      } catch (err) {
        this._record({ reason: reasons.join(','), outcome: 'error', regions, structural: pending.structural, error: err?.message });
        pending.reject(err);
        throw err;
      } finally {
        this._running = null;
      }
    })();

    try {
      await this._running;
    } catch (_err) {
      // Already surfaced to the caller through pending.reject.
    }
  }

  /**
   * Interpret an executor result as a render outcome.
   *
   * A conforming executor returns a `RenderOutcome`
   * (`{ kind, requestedRegions, appliedRegions, fallbackReason, structuralReason }`).
   * Anything else — including the shell itself, which ApplicationV2's render
   * returns — is accounted at the requested scope, which is the old behaviour
   * and the best that can be said about a result that reports nothing.
   *
   * @param {*} result
   * @param {{regions: string[], structural: boolean}} requested
   * @returns {{kind: string, appliedRegions: string[], fallbackReason: string|null}}
   * @private
   */
  _normalizeOutcome(result, requested) {
    const kind = result?.kind;
    if (kind === 'structural' || kind === 'partial') {
      const applied = Array.isArray(result.appliedRegions) ? result.appliedRegions : [];
      return {
        kind: kind === 'partial' ? 'partial' : 'structural',
        appliedRegions: kind === 'partial' ? applied : [],
        fallbackReason: result.fallbackReason ?? null,
      };
    }
    return {
      kind: requested.structural ? 'structural' : 'partial',
      appliedRegions: requested.structural ? [] : requested.regions,
      fallbackReason: null,
    };
  }

  /** Count a mentor update that never touched the render pipeline at all. */
  noteDomOnlyMentorUpdate() {
    this._stats.domOnlyMentorUpdates += 1;
  }

  _signature() {
    try {
      const value = this.host.computeStateSignature?.();
      return typeof value === 'string' ? value : null;
    } catch (_err) {
      return null;
    }
  }

  _now() {
    return (typeof performance !== 'undefined' && typeof performance.now === 'function')
      ? performance.now()
      : Date.now();
  }

  _record(entry) {
    if (!this.host.isDebugEnabled?.()) return;
    this._log.push({ seq: this._log.length + 1, at: Date.now(), ...entry });
    if (this._log.length > this._logLimit) this._log.shift();
  }

  /** Diagnostics snapshot backing SWSE.debug.progressionRenderStats(). */
  stats() {
    return {
      fullRenders: this._stats.fullRenders,
      regionUpdates: { ...this._stats.regionUpdates },
      domOnlyMentorUpdates: this._stats.domOnlyMentorUpdates,
      requested: this._stats.requested,
      executed: this._stats.executed,
      coalesced: this._stats.coalesced,
      skippedIdentical: this._stats.skippedIdentical,
      forbiddenRegionRequests: this._stats.forbiddenRegionRequests,
      // Region-scoped jobs that had to be satisfied by a full repaint. Counted
      // as full renders above; surfaced separately so the gap between what was
      // requested and what happened is visible rather than inferred.
      structuralFallbacks: this._stats.structuralFallbacks,
      reasons: { ...this._stats.reasons },
      maxUpdatesPerInteraction: Math.max(this._stats.maxUpdatesPerInteraction, this._interactionUpdateCount),
      lastDurationMs: Math.round(this._stats.lastDurationMs * 100) / 100,
      averageDurationMs: this._stats.executed
        ? Math.round((this._stats.totalDurationMs / this._stats.executed) * 100) / 100
        : 0,
      epoch: this._epoch,
      log: [...this._log],
    };
  }

  resetStats() {
    this._stats = {
      requested: 0,
      executed: 0,
      coalesced: 0,
      skippedIdentical: 0,
      fullRenders: 0,
      regionUpdates: {},
      domOnlyMentorUpdates: 0,
      reasons: {},
      maxUpdatesPerInteraction: 0,
      lastDurationMs: 0,
      totalDurationMs: 0,
      forbiddenRegionRequests: 0,
      structuralFallbacks: 0,
    };
    this._interactionUpdateCount = 0;
    this._log = [];
  }

  /** Drop any pending work; used on shell close. */
  dispose() {
    this._cancelFrame();
    if (this._pending) {
      this._pending.resolve(undefined);
      this._pending = null;
    }
  }
}
