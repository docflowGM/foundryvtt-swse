/**
 * MentorRecommendationController
 *
 * Single owner of the mentor's *currently displayed build recommendation*.
 *
 * Why this exists: mentor advice had no owner. Each interaction independently
 * looked up suggestions and spoke whatever came back, so a slow earlier lookup
 * could overwrite a newer one, an unchanged recommendation re-ran the typewriter
 * from scratch, and the dialogue text was part of the shell's template context —
 * which made "the mentor said something" a reason to repaint the whole shell.
 *
 * The model here is deliberately narrow:
 *
 *   meaningful selection change
 *     -> immutable context snapshot
 *     -> one ranked evaluation, one winner
 *     -> stale/duplicate results discarded
 *     -> unchanged recommendation does nothing at all
 *     -> changed recommendation updates ONLY the mentor dialogue DOM
 *
 * This controller never renders. It has no reference to the shell's render
 * pipeline and calls exactly one presentation method on MentorRail.
 */

import { SWSELogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';
import { SuggestionService } from '/systems/foundryvtt-swse/scripts/engine/suggestion/SuggestionService.js';
import { SnapshotBuilder } from '/systems/foundryvtt-swse/scripts/engine/suggestion/SnapshotBuilder.js';

/**
 * Progression steps that have build advice, mapped to their suggestion domain.
 * Steps absent from this map produce no recommendation at all rather than a
 * generic fallback line.
 * @type {Readonly<Object<string,string>>}
 */
export const STEP_RECOMMENDATION_DOMAIN = Object.freeze({
  species: 'species',
  class: 'classes',
  attribute: 'attributes',
  ability: 'attributes',
  'ability-scores': 'attributes',
  background: 'backgrounds',
  skills: 'skills_l1',
  'general-feat': 'feats',
  'class-feat': 'feats',
  'nonheroic-starting-feats': 'feats',
  'general-talent': 'talents',
  'class-talent': 'talents',
  'force-powers': 'forcepowers',
  'force-secrets': 'force-secrets',
  'force-techniques': 'force-techniques',
  'starship-maneuver': 'starship-maneuvers',
  'starship-maneuvers': 'starship-maneuvers',
});

/**
 * Stable fingerprint of a context snapshot.
 *
 * The rules-relevant part is delegated to SnapshotBuilder, which already
 * captures actor + pending progression state, sorts collections deterministically,
 * hashes stably, and deliberately excludes UI state. Only the identity the
 * mentor adds on top — which step is open, which domain it maps to, and which
 * options are legal right now — is appended here.
 */
export function createContextSignature(context) {
  if (!context) return 'none';
  return [
    context.mode ?? '',
    context.stepId ?? '',
    context.domain ?? '',
    context.actorId ?? '',
    context.snapshotHash ?? '',
    (context.availableIds || []).join(','),
  ].join('::');
}

/** Stable fingerprint of a recommendation, used to suppress re-presentation. */
export function createRecommendationSignature(recommendation) {
  if (!recommendation) return 'none';
  const dialogue = String(recommendation.dialogue ?? '').replace(/\s+/g, ' ').trim().toLowerCase();
  return JSON.stringify({
    id: recommendation.id ?? null,
    targetId: recommendation.targetId ?? null,
    dialogue,
    mood: recommendation.mood ?? 'neutral',
  });
}

/**
 * Build the immutable context the recommendation is evaluated against.
 *
 * This is intentionally thin. The rules-relevant state already has a canonical
 * home in SnapshotBuilder, so this adds only what the mentor needs on top of it:
 * the open step, its suggestion domain, and the identity of the options that are
 * currently legal — because the same character state can yield different advice
 * when the candidate pool changes.
 *
 * Nothing cosmetic is included, so scroll, hover, filtering, rail resizing, and
 * translator frames cannot produce a new signature.
 *
 * @param {Object} shell - ProgressionShell
 * @param {Object} [options]
 * @param {Array} [options.available] - Currently legal options for the step.
 * @returns {Object} frozen snapshot
 */
export function buildMentorContext(shell, { available = null } = {}) {
  const session = shell?.progressionSession ?? null;
  const draft = session?.draftSelections ?? {};
  const stepId = shell?.steps?.[shell?.currentStepIndex]?.stepId ?? session?.currentStepId ?? null;
  const domain = STEP_RECOMMENDATION_DOMAIN[stepId] ?? null;

  let snapshotHash = '';
  try {
    snapshotHash = shell?.actor
      ? SnapshotBuilder.hashFromActor(shell.actor, domain, draft)
      : '';
  } catch (err) {
    SWSELogger.debug('[MentorRecommendation] snapshot hash failed', { error: err?.message });
    snapshotHash = '';
  }

  const availableIds = Array.isArray(available)
    ? [...new Set(available.map(entry => String(entry?.id ?? entry?._id ?? entry?.name ?? '')).filter(Boolean))].sort()
    : [];

  return Object.freeze({
    mode: shell?.mode ?? 'chargen',
    stepId,
    domain,
    actorId: shell?.actor?.id ?? null,
    snapshotHash,
    availableIds: Object.freeze(availableIds),
  });
}

/**
 * Who wins the dialogue box when two sources want it at once.
 *
 * Several systems legitimately write to the same box — step guidance on entry,
 * focus and commit reactions, the build recommendation, Ask Mentor. They each
 * had throttling of their own but no traffic control between them, so the last
 * writer won regardless of importance or age.
 *
 * The absolute numbers do not matter; the ordering does.
 * @type {Readonly<Object<string, number>>}
 */
export const MESSAGE_PRIORITY = Object.freeze({
  stepGuidance: 10,
  focusReaction: 20,
  commitReaction: 30,
  recommendation: 40,
  askMentor: 50,
});

/** Stable fingerprint of any mentor message, whatever its source. */
export function createMessageSignature(message) {
  if (!message) return 'none';
  return JSON.stringify({
    source: message.source ?? null,
    targetId: message.targetId ?? null,
    text: String(message.text ?? '').replace(/\s+/g, ' ').trim().toLowerCase(),
    mood: message.mood ?? 'neutral',
  });
}

export class MentorRecommendationController {
  /**
   * @param {Object} shell - ProgressionShell. Used only to read state and to
   *   reach MentorRail; never to render.
   */
  constructor(shell) {
    this.shell = shell;

    this.currentRevision = 0;
    this.pendingRequest = null;
    this.lastContextSignature = null;
    this.lastRecommendationSignature = null;
    this.currentRecommendation = null;

    // Arbiter state: what is on screen right now, from any source, and the
    // last non-temporary message (the advice a bark is covering up).
    this.activeMessage = null;
    this.activeSignature = null;
    this.persistentRecommendation = null;

    this._inFlightByContext = new Map();

    this._stats = {
      contextRequests: 0,
      deduplicatedRequests: 0,
      abortedRequests: 0,
      staleResultsDiscarded: 0,
      unchangedRecommendationsSkipped: 0,
      recommendationsDisplayed: 0,
      mentorDomUpdates: 0,
      fullShellRendersCausedByMentor: 0,
    };
    this._lastTrace = null;
  }

  /**
   * Ask for a recommendation for the given context snapshot.
   *
   * Fire-and-forget by design: callers must not await this before returning
   * control to the player. Returns a promise only so tests can settle it.
   *
   * @param {Object} context - Snapshot from buildMentorContext().
   * @returns {Promise<void>}
   */
  async requestRecommendation(context) {
    const revision = ++this.currentRevision;
    const contextSignature = createContextSignature(context);

    // Nothing relevant to advice changed.
    if (contextSignature === this.lastContextSignature) {
      this._stats.deduplicatedRequests += 1;
      this._trace({ revision, contextSignature, result: 'context-unchanged' });
      return;
    }

    // Steps without build advice are a no-op, not a generic fallback line.
    if (!context?.domain) {
      this.lastContextSignature = contextSignature;
      this._trace({ revision, contextSignature, result: 'no-domain' });
      return;
    }

    this.lastContextSignature = contextSignature;
    this._stats.contextRequests += 1;

    // Collapse identical concurrent work.
    const inFlight = this._inFlightByContext.get(contextSignature);
    if (inFlight) {
      this._stats.deduplicatedRequests += 1;
      this._trace({ revision, contextSignature, result: 'deduplicated' });
      return inFlight.then(() => undefined, () => undefined);
    }

    this._abortPending();
    const request = this._createRequest();
    this.pendingRequest = request;

    const work = (async () => {
      let result = null;
      try {
        // Prefer the ranking the step already hydrated and sorted. Asking the
        // service to rediscover the same winner is slower and lets the rail
        // disagree with the cards on screen.
        const local = this._localTopSuggestion(context);
        result = local
          ? SuggestionService.normalizeRecommendation(local, { context, domain: context.domain })
          : await SuggestionService.getBestRecommendation(context, {
            actor: this.shell?.actor ?? null,
            domain: context.domain,
            pendingData: this.shell?.progressionSession?.draftSelections ?? {},
            signal: request.signal,
          });
      } catch (error) {
        if (this._isAbortError(error)) {
          this._stats.abortedRequests += 1;
          this._trace({ revision, contextSignature, result: 'aborted' });
          return;
        }
        SWSELogger.debug('[MentorRecommendation] evaluation failed', {
          stepId: context.stepId,
          error: error?.message || String(error),
        });
        return;
      } finally {
        this._inFlightByContext.delete(contextSignature);
      }

      // Revision guard is mandatory even when the service cannot be aborted:
      // a slow earlier evaluation must never overwrite a newer one.
      if (revision !== this.currentRevision) {
        this._stats.staleResultsDiscarded += 1;
        this._trace({ revision, contextSignature, result: 'stale-revision' });
        return;
      }
      if (request !== this.pendingRequest) {
        this._stats.staleResultsDiscarded += 1;
        this._trace({ revision, contextSignature, result: 'stale-request' });
        return;
      }

      this.applyRecommendation(result, { revision, contextSignature });
    })();

    this._inFlightByContext.set(contextSignature, work);
    return work;
  }

  /**
   * Top suggestion from the current step, if it has one hydrated.
   * @param {Object} context
   * @returns {Object|null}
   * @private
   */
  _localTopSuggestion(context) {
    const plugin = this.shell?.stepPlugins?.get?.(context.stepId);
    if (!plugin) return null;
    try {
      const top = plugin.getTopSuggestion?.(this.shell);
      if (top) return top;
      const ranked = plugin.getRankedSuggestions?.(this.shell);
      return Array.isArray(ranked) && ranked.length ? ranked[0] : null;
    } catch (err) {
      SWSELogger.debug('[MentorRecommendation] local suggestion lookup failed', { error: err?.message });
      return null;
    }
  }

  /**
   * The one arbiter for the dialogue box.
   *
   * Every mentor message source routes through here. A message is dropped when
   * it is stale (older than the current revision), identical to what is already
   * showing, or lower priority than a message of the same or newer age.
   *
   * @param {Object} message
   * @param {string} message.source - Key from MESSAGE_PRIORITY.
   * @param {string} message.text
   * @param {string} [message.mood]
   * @param {number} [message.priority]
   * @param {number} [message.revision] - Defaults to the current revision.
   * @param {string} [message.targetId]
   * @returns {boolean} true when the message reached the rail.
   */
  present(message) {
    if (!message?.text) return false;

    const priority = message.priority ?? MESSAGE_PRIORITY[message.source] ?? 0;
    const revision = message.revision ?? this.currentRevision;

    if (this._isStale({ ...message, revision })) {
      this._stats.staleResultsDiscarded += 1;
      this._trace({ result: 'discarded-stale', source: message.source, revision, stepId: message.stepId });
      return false;
    }

    const signature = createMessageSignature(message);
    if (signature === this.activeSignature) {
      this._stats.unchangedRecommendationsSkipped += 1;
      this._trace({ result: 'discarded-unchanged', source: message.source });
      return false;
    }

    // A less important message cannot displace a more important one unless it
    // belongs to a newer context — that is what lets a fresh recommendation
    // replace a stale Ask Mentor line, while a focus bark cannot.
    if (this.activeMessage
      && priority < this.activeMessage.priority
      && revision <= this.activeMessage.revision) {
      this._trace({ result: 'discarded-lower-priority', source: message.source, priority });
      return false;
    }

    // A temporary line (a focus or commit bark) borrows the rail; it must not
    // become the thing we consider "the current advice", or restoring after it
    // would replay the bark instead of the recommendation.
    if (message.temporary !== true) {
      this.persistentRecommendation = { ...message, priority, revision };
    }

    this.activeMessage = { ...message, priority, revision };
    this.activeSignature = signature;

    const presented = this.shell?.mentorRail?.presentMessage?.(this.activeMessage);
    if (presented !== false) this._stats.mentorDomUpdates += 1;

    this._trace({ result: 'presented', source: message.source, priority, revision });
    return presented !== false;
  }

  /**
   * Present a recommendation, unless it is the one already on screen.
   *
   * Called two ways:
   *  - from requestRecommendation(), carrying the revision it was evaluated for;
   *  - out of band, with no revision, when something else (a reaction bark, a
   *    direct display) wants to own the rail right now.
   *
   * The out-of-band form advances the revision and aborts any evaluation still
   * running, so a slower earlier evaluation can never come back and overwrite
   * what the player was just shown.
   *
   * @param {Object|null} recommendation
   * @param {Object} [trace]
   * @param {number} [trace.revision] - Omit for out-of-band display.
   */
  applyRecommendation(recommendation, trace = {}) {
    if (trace.revision === undefined) {
      this.currentRevision += 1;
      this._abortPending();
    }

    const signature = createRecommendationSignature(recommendation);

    // Identical advice must not restart typing, reflash the mood, re-announce,
    // move scroll, or touch the DOM at all.
    if (signature === this.lastRecommendationSignature) {
      this._stats.unchangedRecommendationsSkipped += 1;
      this._trace({ ...trace, result: 'unchanged' });
      return;
    }

    this.lastRecommendationSignature = signature;
    this.currentRecommendation = recommendation;

    if (!recommendation) {
      this._trace({ ...trace, result: 'cleared' });
      return;
    }

    this._stats.recommendationsDisplayed += 1;
    this.present({
      source: 'recommendation',
      text: recommendation.dialogue,
      mood: recommendation.mood ?? 'neutral',
      targetId: recommendation.targetId ?? recommendation.id ?? null,
      revision: trace.revision ?? this.currentRevision,
    });

    this._trace({ ...trace, result: 'displayed', winner: recommendation.targetId ?? recommendation.id });
  }

  /**
   * Public entry points, one per message kind.
   *
   * These accept already-composed text — composition stays in
   * MentorChoiceLineComposer and the voice overlay. Their only job is to stamp
   * the source, priority, revision, and step identity that the arbiter needs,
   * so no caller has to remember the policy.
   */

  /** Step-entry guidance. Temporary: a recommendation supersedes it. */
  presentStepGuidance({ text, mood = 'neutral', stepId, revision = this.currentRevision } = {}) {
    return this.present({
      source: 'stepGuidance', priority: MESSAGE_PRIORITY.stepGuidance,
      revision, stepId, targetId: null, text, mood, temporary: true,
    });
  }

  /** Brief reaction to a focused option. */
  presentFocusReaction({ text, mood = 'neutral', stepId, targetId = null, revision = this.currentRevision } = {}) {
    return this.present({
      source: 'focusReaction', priority: MESSAGE_PRIORITY.focusReaction,
      revision, stepId, targetId, text, mood, temporary: true,
    });
  }

  /** Acknowledgement of a committed (or uncommitted) choice. */
  presentCommitReaction({ text, mood = 'encouraging', stepId, targetId = null, revision = this.currentRevision } = {}) {
    return this.present({
      source: 'commitReaction', priority: MESSAGE_PRIORITY.commitReaction,
      revision, stepId, targetId, text, mood, temporary: true,
    });
  }

  /** Ask Mentor rail text. Outranks everything for the current context. */
  presentAskMentor({ text, mood = 'encouraging', stepId, targetId = null, revision = this.currentRevision } = {}) {
    return this.present({
      source: 'askMentor', priority: MESSAGE_PRIORITY.askMentor,
      revision, stepId, targetId, text, mood, temporary: true,
    });
  }

  /**
   * Generic step-local guidance that is not tied to step entry — survey
   * clarifications, per-option flavour. Treated as step guidance so it cannot
   * displace a recommendation or an Ask Mentor line.
   */
  presentGuidance({ text, mood = 'neutral', stepId = null, targetId = null, revision = this.currentRevision } = {}) {
    return this.present({
      source: 'stepGuidance', priority: MESSAGE_PRIORITY.stepGuidance,
      revision, stepId: stepId ?? this._currentStepId(), targetId, text, mood, temporary: true,
    });
  }

  /** The step id the shell is actually on right now. */
  _currentStepId() {
    return this.shell?.progressionSession?.currentStepId
      ?? this.shell?.steps?.[this.shell?.currentStepIndex]?.stepId
      ?? null;
  }

  /**
   * A message is stale when it belongs to an older revision *or* to a step the
   * player has already left. Priority must not rescue a message from the
   * previous step — an Ask Mentor line for step A speaking on step B is exactly
   * the failure a priority-only check would allow.
   * @private
   */
  _isStale(message) {
    if (Number.isFinite(message.revision) && message.revision < this.currentRevision) return true;
    const currentStepId = this._currentStepId();
    if (message.stepId && currentStepId && message.stepId !== currentStepId) return true;
    return false;
  }

  /**
   * Tell the controller that something else has taken over the rail — a
   * reaction bark, an Ask Mentor line, step guidance.
   *
   * This is the arbiter seam between the two message kinds. The build
   * recommendation is no longer what is on screen, so its equality signature
   * must be cleared; otherwise the next evaluation would compute the same
   * recommendation, match the stale signature, and suppress itself, leaving the
   * bark on screen permanently.
   *
   * @param {string} [reason]
   */
  noteExternalDisplay(reason = 'external') {
    this.lastRecommendationSignature = null;
    this.activeSignature = null;
    this.activeMessage = null;
    this._trace({ result: 'superseded-by-external', reason });
  }

  /**
   * Re-attach after a legitimate structural render replaced the mentor rail.
   * Presents the current recommendation once; never starts a new evaluation,
   * so a render can never feed back into more work.
   */
  reconnect() {
    if (!this.currentRecommendation) return;
    // The rail node was destroyed by a structural render, so what is on screen
    // is nothing. Clear the arbiter's signature or the replay would be dropped
    // as "unchanged" against a message that no longer exists in the DOM.
    this.activeSignature = null;
    const presented = this.shell?.mentorRail?.presentRecommendation?.(this.currentRecommendation, { replay: true });
    if (presented !== false) this._stats.mentorDomUpdates += 1;
    this._trace({ result: 'reconnected' });
  }

  /** Drop cached state when the step or actor changes materially. */
  reset() {
    this._abortPending();
    this.lastContextSignature = null;
    this.lastRecommendationSignature = null;
    this.currentRecommendation = null;
    this._inFlightByContext.clear();
  }

  dispose() {
    this._abortPending();
    this._inFlightByContext.clear();
  }

  _abortPending() {
    try {
      this.pendingRequest?.abort?.();
    } catch (_err) {
      // Aborting a settled request is not an error worth surfacing.
    }
    this.pendingRequest = null;
  }

  _createRequest() {
    if (typeof AbortController === 'function') {
      const controller = new AbortController();
      return { signal: controller.signal, abort: () => controller.abort() };
    }
    return { signal: null, abort: () => {} };
  }

  _isAbortError(error) {
    return error?.name === 'AbortError' || error?.code === 'ABORT_ERR';
  }

  _trace(entry) {
    this._lastTrace = { at: Date.now(), ...entry };
  }

  /** Diagnostics snapshot backing SWSE.debug.mentorRecommendationStats(). */
  stats() {
    return {
      ...this._stats,
      contextRevision: this.currentRevision,
      contextSignature: this.lastContextSignature,
      currentRecommendation: this.currentRecommendation?.targetId ?? null,
      lastTrace: this._lastTrace,
    };
  }

  resetStats() {
    for (const key of Object.keys(this._stats)) this._stats[key] = 0;
    this._lastTrace = null;
  }
}

export default MentorRecommendationController;
