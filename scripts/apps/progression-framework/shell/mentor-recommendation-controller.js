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

/**
 * What happened to a message handed to the arbiter.
 *
 * `present()` used to return a bare boolean, which conflated two very different
 * outcomes: "arbitration rejected this" and "the rail is not mounted yet, so it
 * is queued and will appear". Callers could not tell a discarded message from a
 * deferred one, and the displayed counter counted both as failures.
 * @readonly
 */
export const PRESENTATION = Object.freeze({
  DISPLAYED: 'displayed',
  QUEUED: 'queued',
  REJECTED_STALE: 'rejected-stale',
  REJECTED_PRIORITY: 'rejected-priority',
  REJECTED_DUPLICATE: 'rejected-duplicate',
  UNAVAILABLE: 'unavailable',
});

/** Outcomes where the message did reach the player, now or shortly. */
const ACCEPTED = new Set([PRESENTATION.DISPLAYED, PRESENTATION.QUEUED]);

/**
 * Token proving a message came through this arbiter.
 *
 * MentorRail refuses — and counts — any message arriving at its sink without
 * it. A string like `source: 'recommendation'` would be trivially forgeable by
 * the very call sites this is meant to catch, so ownership is carried by an
 * unexported symbol instead.
 */
export const ARBITER_TOKEN = Symbol('swse.mentor.arbitrated');

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

    // Depth rather than a boolean: presentation can nest through a queued replay.
    this._presentDepth = 0;
    // Monotonic id of the mounted mentor DOM node the rail last replayed onto,
    // so a remount replays once and a repeated reconnect() does nothing.
    this._replayedMountId = null;

    this._stats = {
      contextRequests: 0,
      deduplicatedRequests: 0,
      abortedRequests: 0,
      staleResultsDiscarded: 0,
      unchangedRecommendationsSkipped: 0,
      recommendationsDisplayed: 0,
      mentorDomUpdates: 0,
      fullShellRendersCausedByMentor: 0,
      directBypassCount: 0,
      reconnectReplays: 0,
      reconnectsSkipped: 0,
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
    const contextSignature = createContextSignature(context);

    // The revision is deliberately NOT advanced yet.
    //
    // It used to be bumped on entry, before the unchanged/in-flight checks. Two
    // identical concurrent requests then raced: A started at revision 1, B bumped
    // to 2 and returned early as a duplicate, and A's result was discarded as
    // stale — so the evaluation ran and nothing was ever displayed. A revision is
    // a statement that the context genuinely changed, so only a genuinely changed
    // context may create one.

    // Nothing relevant to advice changed.
    if (contextSignature === this.lastContextSignature) {
      this._stats.deduplicatedRequests += 1;
      this._trace({ revision: this.currentRevision, contextSignature, result: 'context-unchanged' });
      // Join the evaluation already running for this same context, if any, so
      // callers still settle when it does.
      return this._inFlightByContext.get(contextSignature)?.then(() => undefined, () => undefined);
    }

    // Steps without build advice are a no-op, not a generic fallback line.
    if (!context?.domain) {
      this.lastContextSignature = contextSignature;
      this._trace({ revision: this.currentRevision, contextSignature, result: 'no-domain' });
      return;
    }

    // Collapse identical concurrent work before minting a revision.
    const inFlight = this._inFlightByContext.get(contextSignature);
    if (inFlight) {
      this.lastContextSignature = contextSignature;
      this._stats.deduplicatedRequests += 1;
      this._trace({ revision: this.currentRevision, contextSignature, result: 'deduplicated' });
      return inFlight.then(() => undefined, () => undefined);
    }

    // Genuinely new context: now supersede whatever came before.
    const revision = ++this.currentRevision;
    this.lastContextSignature = contextSignature;
    this._stats.contextRequests += 1;

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
    if (!message?.text) return PRESENTATION.UNAVAILABLE;

    const priority = message.priority ?? MESSAGE_PRIORITY[message.source] ?? 0;
    const revision = message.revision ?? this.currentRevision;

    if (this._isStale({ ...message, revision })) {
      this._stats.staleResultsDiscarded += 1;
      this._trace({ result: 'discarded-stale', source: message.source, revision, stepId: message.stepId });
      return PRESENTATION.REJECTED_STALE;
    }

    const signature = createMessageSignature(message);
    if (signature === this.activeSignature) {
      this._stats.unchangedRecommendationsSkipped += 1;
      this._trace({ result: 'discarded-unchanged', source: message.source });
      return PRESENTATION.REJECTED_DUPLICATE;
    }

    // A less important message cannot displace a more important one unless it
    // belongs to a newer context — that is what lets a fresh recommendation
    // replace a stale Ask Mentor line, while a focus bark cannot.
    if (this.activeMessage
      && priority < this.activeMessage.priority
      && revision <= this.activeMessage.revision) {
      this._trace({ result: 'discarded-lower-priority', source: message.source, priority });
      return PRESENTATION.REJECTED_PRIORITY;
    }

    // A temporary line (a focus or commit bark) borrows the rail; it must not
    // become the thing we consider "the current advice", or restoring after it
    // would replay the bark instead of the recommendation.
    if (message.temporary !== true) {
      this.persistentRecommendation = { ...message, priority, revision };
    }

    const accepted = { ...message, priority, revision };
    this.activeMessage = accepted;
    this.activeSignature = signature;

    const outcome = this._writeToRail(accepted);
    if (outcome === PRESENTATION.DISPLAYED) this._stats.mentorDomUpdates += 1;

    this._trace({ result: outcome, source: message.source, priority, revision });
    return outcome;
  }

  /**
   * The only place that touches MentorRail's message sink.
   *
   * The arbitration token is attached here and nowhere else, so any other route
   * into the rail is observable rather than merely discouraged. Presentation is
   * also bracketed with an ownership flag: if mentor code manages to request a
   * shell repaint while this is on the stack, the shell attributes that render
   * to the mentor instead of leaving the counter at a hardcoded zero.
   *
   * @param {Object} accepted
   * @returns {string} PRESENTATION outcome
   * @private
   */
  _writeToRail(accepted) {
    this._presentDepth += 1;
    try {
      const presented = this.shell?.mentorRail?.presentMessage?.({ ...accepted, [ARBITER_TOKEN]: true });
      if (presented === undefined) return PRESENTATION.UNAVAILABLE;
      // false means "rail not mounted; queued and replayed on mount", which is
      // a deferral, not a rejection.
      return presented === false ? PRESENTATION.QUEUED : PRESENTATION.DISPLAYED;
    } finally {
      this._presentDepth -= 1;
    }
  }

  /** True while a mentor message is being written to the rail. */
  isPresenting() {
    return this._presentDepth > 0;
  }

  /**
   * Record that a shell repaint was requested while the mentor held the stack.
   * Called by ProgressionShell.requestRender(); expected never to fire.
   * @param {string} reason
   */
  noteShellRenderAttempt(reason = 'unknown') {
    this._stats.fullShellRendersCausedByMentor += 1;
    this._trace({ result: 'mentor-caused-shell-render', reason });
    SWSELogger.warn('[MentorRecommendation] mentor presentation requested a shell render', { reason });
  }

  /**
   * Record a message that reached MentorRail without passing through here.
   * Called by MentorRail itself; expected never to fire.
   * @param {Object} info
   */
  noteDirectBypass(info = {}) {
    this._stats.directBypassCount += 1;
    this._trace({ result: 'direct-bypass', ...info });
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

    this.currentRecommendation = recommendation;

    if (!recommendation) {
      this.lastRecommendationSignature = signature;
      this._trace({ ...trace, result: 'cleared' });
      return PRESENTATION.UNAVAILABLE;
    }

    const outcome = this.present({
      source: 'recommendation',
      text: recommendation.dialogue,
      mood: recommendation.mood ?? 'neutral',
      targetId: recommendation.targetId ?? recommendation.id ?? null,
      revision: trace.revision ?? this.currentRevision,
    });

    // Only what the player actually got counts, and only what is actually on
    // screen may claim the equality signature. Setting either before asking the
    // arbiter meant a recommendation rejected behind an Ask Mentor line was
    // counted as displayed AND suppressed itself forever after.
    if (ACCEPTED.has(outcome)) {
      this.lastRecommendationSignature = signature;
      this._stats.recommendationsDisplayed += 1;
      this._trace({ ...trace, result: outcome, winner: recommendation.targetId ?? recommendation.id });
      return outcome;
    }

    // Rejected behind a higher-priority temporary message. The advice itself is
    // still valid and stays available as the persistent candidate, so it can be
    // restored later without re-evaluating anything.
    this.persistentRecommendation = {
      source: 'recommendation',
      priority: MESSAGE_PRIORITY.recommendation,
      revision: trace.revision ?? this.currentRevision,
      text: recommendation.dialogue,
      mood: recommendation.mood ?? 'neutral',
      targetId: recommendation.targetId ?? recommendation.id ?? null,
    };
    this._trace({ ...trace, result: outcome });
    return outcome;
  }

  /**
   * Put the persistent build recommendation back on the rail after a temporary
   * message (a bark, an Ask Mentor line) has had its turn.
   *
   * Never evaluates: it replays advice that was already computed.
   * @returns {string} PRESENTATION outcome
   */
  restorePersistentRecommendation() {
    const candidate = this.persistentRecommendation;
    if (!candidate?.text) return PRESENTATION.UNAVAILABLE;

    this.activeMessage = null;
    this.activeSignature = null;
    const outcome = this.present({ ...candidate, revision: this.currentRevision });
    if (ACCEPTED.has(outcome)) this._stats.recommendationsDisplayed += 1;
    return outcome;
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
   *
   * Restores whatever legitimately owned the rail before the remount — the
   * accepted active message if it is still current, otherwise the persistent
   * recommendation — and does so at most once per mounted node. The old version
   * called `mentorRail.presentRecommendation(..., { replay: true })` directly,
   * which bypassed arbitration entirely: every reconnect restarted the
   * typewriter, and a structural render during an Ask Mentor line silently
   * replaced it with the lower-priority recommendation.
   *
   * Never evaluates suggestions, so a render can never feed back into more work.
   *
   * @returns {string} PRESENTATION outcome
   */
  reconnect() {
    const mountId = this._currentMountId();
    if (mountId !== null && mountId === this._replayedMountId) {
      this._stats.reconnectsSkipped += 1;
      this._trace({ result: 'reconnect-already-replayed' });
      return PRESENTATION.REJECTED_DUPLICATE;
    }

    // Prefer the message that was actually on screen; fall back to the advice
    // it was covering. Both go back through the arbiter, so a stale message for
    // a step the player has left is dropped rather than restored.
    const candidate = this.activeMessage ?? this.persistentRecommendation;
    if (!candidate?.text) {
      this._trace({ result: 'reconnect-nothing-to-restore' });
      return PRESENTATION.UNAVAILABLE;
    }

    // The rail node was destroyed, so nothing is on screen: clear the equality
    // signature or the replay would be dropped as "unchanged" against a message
    // that no longer exists in the DOM.
    this.activeSignature = null;
    this.activeMessage = null;

    const outcome = this.present({ ...candidate, revision: this.currentRevision });
    if (ACCEPTED.has(outcome)) {
      this._replayedMountId = mountId;
      this._stats.reconnectReplays += 1;
    }
    this._trace({ result: `reconnect:${outcome}`, source: candidate.source });
    return outcome;
  }

  /**
   * Identity of the currently mounted mentor dialogue node.
   *
   * A replay is "once per new DOM node", not "once per call", so the node itself
   * carries the marker. Returns null when nothing is mounted, which keeps the
   * pre-mount queueing path working.
   * @returns {number|null}
   * @private
   */
  _currentMountId() {
    const node = this.shell?.mentorRail?._resolveDialogueContainer?.();
    if (!node) return null;
    if (!node.__swseMentorMountId) {
      MentorRecommendationController._mountSeq = (MentorRecommendationController._mountSeq ?? 0) + 1;
      node.__swseMentorMountId = MentorRecommendationController._mountSeq;
    }
    return node.__swseMentorMountId;
  }

  /** Drop cached state when the step or actor changes materially. */
  reset() {
    this._abortPending();
    this._replayedMountId = null;
    this.persistentRecommendation = null;
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

  /** Monotonic source for mentor DOM mount ids. @private */
  static _mountSeq = 0;
}

export default MentorRecommendationController;
