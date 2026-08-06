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

function idsOf(value) {
  if (!value) return [];
  const list = Array.isArray(value) ? value : [value];
  return list
    .map(entry => (typeof entry === 'string' ? entry : entry?.id ?? entry?._id ?? entry?.name ?? null))
    .filter(Boolean)
    .map(String)
    .sort();
}

function idOf(value) {
  if (!value) return null;
  if (typeof value === 'string') return value;
  return value.id ?? value._id ?? value.name ?? null;
}

/** Stable, order-independent fingerprint of a context snapshot. */
export function createContextSignature(context) {
  if (!context) return 'none';
  return [
    `mode:${context.mode ?? ''}`,
    `step:${context.stepId ?? ''}`,
    `actor:${context.actorId ?? ''}`,
    `species:${context.speciesId ?? ''}`,
    `background:${context.backgroundId ?? ''}`,
    `classes:${(context.classIds || []).join(',')}`,
    `skills:${(context.trainedSkillIds || []).join(',')}`,
    `feats:${(context.selectedFeatIds || []).join(',')}`,
    `talents:${(context.selectedTalentIds || []).join(',')}`,
    `powers:${(context.selectedPowerIds || []).join(',')}`,
    `attrs:${context.attributeSignature ?? ''}`,
    `rev:${context.progressionRevision ?? 0}`,
  ].join('|');
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
 * Build the immutable snapshot the suggestion engine evaluates.
 *
 * Deliberately does NOT pass the shell, the plugin, the actor document, or live
 * session state into async work — the snapshot must not mutate mid-evaluation.
 *
 * @param {Object} shell - ProgressionShell
 * @returns {Object} frozen snapshot
 */
export function buildMentorContext(shell) {
  const session = shell?.progressionSession ?? null;
  const draft = session?.draftSelections ?? {};
  const stepId = shell?.steps?.[shell?.currentStepIndex]?.stepId ?? session?.currentStepId ?? null;

  const attributes = draft.attributes ?? null;
  let attributeSignature = '';
  try {
    attributeSignature = attributes ? JSON.stringify(attributes) : '';
  } catch (_err) {
    attributeSignature = '';
  }

  return Object.freeze({
    mode: shell?.mode ?? 'chargen',
    stepId,
    domain: STEP_RECOMMENDATION_DOMAIN[stepId] ?? null,
    actorId: shell?.actor?.id ?? null,
    speciesId: idOf(draft.species),
    backgroundId: idOf(draft.background),
    classIds: idsOf(draft.class),
    trainedSkillIds: idsOf(draft.skills),
    selectedFeatIds: idsOf(draft.feats),
    selectedTalentIds: idsOf(draft.talents),
    selectedPowerIds: idsOf(draft.forcePowers),
    attributeSignature,
    progressionRevision: session?.getSelectionRevision?.() ?? 0,
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
        result = await SuggestionService.getBestRecommendation(context, {
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
    const presented = this.shell?.mentorRail?.presentRecommendation?.(recommendation);
    if (presented !== false) this._stats.mentorDomUpdates += 1;

    this._trace({ ...trace, result: 'displayed', winner: recommendation.targetId ?? recommendation.id });
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
    this._trace({ result: 'superseded-by-external', reason });
  }

  /**
   * Re-attach after a legitimate structural render replaced the mentor rail.
   * Presents the current recommendation once; never starts a new evaluation,
   * so a render can never feed back into more work.
   */
  reconnect() {
    if (!this.currentRecommendation) return;
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
