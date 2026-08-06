import { getMentorGuidance, MENTORS, resolveMentorData, resolveMentorPortraitPath, getMentorKey } from '../../../engine/mentor/mentor-dialogues.js';
import { MentorTranslationIntegration } from '../../../mentor/mentor-translation-integration.js';
import { ProgressionDebugCapture } from '../debug/progression-debug-capture.js';
import { getStepMentorObject, resolveStepMentorContext, resolveStepMentorGuidance, setSessionMentorContext } from '../steps/mentor-step-integration.js';
import { isArbitratedMessage } from './mentor-recommendation-controller.js';

/**
 * Maps step ID to mentor guidance choice type for getMentorGuidance().
 * @type {Object<string, string>}
 */
const STEP_CHOICE_TYPE = {
  'species': 'species',
  'class': 'class',
  'profile-class': 'class',
  'profile-archetype': 'class',
  'profile-review': 'summary',
  'attribute': 'ability',
  'ability': 'ability',
  'ability-scores': 'ability',
  'l1-survey': 'survey',
  'base-class-survey': 'survey',
  'background': 'background',
  'skills': 'skill',
  'languages': 'language',
  'general-feat': 'feat',
  'class-feat': 'feat',
  'general-talent': 'talent',
  'class-talent': 'talent',
  'force-powers': 'force_power',
  'starship-maneuver': 'starship_maneuver',
  'starship-maneuvers': 'starship_maneuver',
  'summary': 'summary',
  'confirm': 'summary',
};

/**
 * Mentor Rail — manages mentor portrait, dialogue with AurebeshTranslator,
 * mood, and collapse state.
 */
function mentorTrace(...args) {
  if (globalThis.SWSE_MENTOR_TRACE === true) {
    try { console.debug(...args); } catch (_err) {}
  }
}

export class MentorRail {
  constructor(shell) {
    this.shell = shell;
    this._animationAbort = null; // AbortController for in-flight animations
  }

  /**
   * Find the live mentor dialogue element across standalone and embedded shell modes.
   * @returns {HTMLElement|null}
   * @private
   */
  _resolveDialogueContainer() {
    const documentRef = typeof document !== 'undefined' ? document : null;
    const roots = [
      this.shell.getRootElement?.(),
      this.shell.element,
      this.shell._inlineElement,
      documentRef?.querySelector?.('.progression-shell'),
      documentRef,
    ].filter(Boolean);

    for (const root of roots) {
      const container = root?.querySelector?.('[data-mentor-dialogue]');
      if (container instanceof HTMLElement) return container;
    }

    return null;
  }

  /**
   * Queue dialogue until the mentor rail exists in the DOM. This avoids the
   * blank rail state caused when a step asks the mentor to speak during
   * onStepEnter or while a render is replacing the rail node.
   * @param {string} text
   * @param {string|null} mood
   * @private
   */
  _queuePendingDialogue(text, mood = null) {
    if (!text) return;
    // Plain-text fallback only. This records what the template should show if it
    // renders before the animation runs; it is NOT a replay queue. The
    // controller owns replay, so nothing here re-reveals a message on its own.
    this.shell.mentor.currentDialogue = text;
    this.shell.mentor.pendingDialogue = null;
    this.shell.mentor.animationState = 'pending';
    this.shell.mentor.isAnimating = false;
  }

  /**
   * Speak text via AurebeshTranslator. Updates shell state, targets live DOM directly.
   * Does NOT trigger shell re-render (animation runs on existing DOM).
   * @param {string} text — text to speak
   * @param {string|null} mood — optional mood to set
   * @param {Object} options
   * @param {boolean} options.bypassSuppression - true for central router/queued rail speech
   * @returns {Promise<void>}
   */
  async speak(text, mood = null, options = {}) {
    const dialogueText = String(text || '').trim();
    if (!dialogueText) return;

    if (this.shell?._suppressLegacyMentorSpeech && options?.bypassSuppression !== true) {
      // Legacy step-local chatter is intentionally ignored while the central
      // MentorChoiceReactionRouter owns this click. Do not mutate
      // currentDialogue here; doing so caused old per-step fallback lines to
      // overwrite the rail state before the routed mentor reaction could speak.
      this.shell.progressionSession?._recordMentorDiagnostic?.('skippedReactions', {
        reason: 'legacy-mentor-speech-suppressed',
        textPreview: dialogueText.slice(0, 80),
        source: options?.source || 'legacy-step',
      });
      return;
    }

    // [DEBUG] Sequence tracking
    const speakNum = ProgressionDebugCapture?.nextMentorSpeak?.() ?? 0;
    mentorTrace(`[SWSE Mentor Debug] [Speak #${speakNum}] speak() called`, {
      text_length: dialogueText.length,
      text_first_40: dialogueText.slice(0, 40),
      mood: mood,
      isAnimating_before: this.shell.mentor?.isAnimating ?? '(null)',
      currentDialogue_before: this.shell.mentor?.currentDialogue?.slice?.(0, 30) ?? '(null)',
      has_prior_abort: !!this._animationAbort,
    });

    if (mood) this.setMood(mood);

    const shell = this.shell;
    const container = this._resolveDialogueContainer();

    // Keep a plain-text fallback in state immediately, but do not mark the
    // mentor as typing until there is a live DOM target. Otherwise a pre-render
    // speak call leaves the template with currentDialogue truthy and no text.
    shell.mentor.currentDialogue = dialogueText;

    // Abort any in-flight animation before starting or queuing a replacement.
    if (this._animationAbort) {
      mentorTrace(`[SWSE Mentor Debug] [Speak #${speakNum}] Aborting prior animation`, {
        prior_signal_aborted: this._animationAbort.signal?.aborted ?? '(unknown)',
      });
      this._animationAbort.abort();
      this._animationAbort = null;
    }

    if (!(container instanceof HTMLElement)) {
      mentorTrace(`[SWSE Mentor Debug] [Speak #${speakNum}] No live mentor dialogue container; queueing pending dialogue`);
      this._queuePendingDialogue(dialogueText, mood);
      return;
    }

    shell.mentor.pendingDialogue = null;
    shell.mentor.animationState = 'typing';
    shell.mentor.isAnimating = true;

    // Dialogue is DOM state, never render state: from here on the line is
    // written straight into the live rail and never schedules a shell update.
    shell.renderScheduler?.noteDomOnlyMentorUpdate?.();

    this._animationAbort = new AbortController();
    const { signal } = this._animationAbort;

    mentorTrace(`[SWSE Mentor Debug] [Speak #${speakNum}] New AbortController created`, {
      signal_aborted: signal.aborted,
    });

    // [DEBUG] DOM search logging
    mentorTrace(`[SWSE Mentor Debug] [Speak #${speakNum}] DOM container search`, {
      shell_element_exists: !!shell.element,
      mentor_dialogue_found: !!container,
      container_tag: container?.tagName ?? '(null)',
    });

    if (signal.aborted) {
      this._queuePendingDialogue(dialogueText, mood);
      return;
    }

    try {
      // [DEBUG] Pre-render logging
      const mentorTextNode = container.querySelector('[data-mentor-text]');
      mentorTrace(`[SWSE Mentor Debug] [Speak #${speakNum}] About to call MentorTranslationIntegration.render()`, {
        mentor_text_element: !!mentorTextNode,
        mentor_text_tag: mentorTextNode?.tagName ?? '(null)',
      });

      await MentorTranslationIntegration.render({
        text: dialogueText,
        container: container.querySelector('[data-mentor-text]') ?? container,
        mentor: shell.mentor.name || shell.mentor.mentorId,
        // The abort signal now reaches the reveal loop itself, so a superseded
        // line stops animating instead of merely having its completion ignored.
        signal,
        onComplete: () => {
          // [DEBUG] Callback execution logging
          mentorTrace(`[SWSE Mentor Debug] [Speak #${speakNum}] onComplete callback fired`, {
            signal_aborted: signal.aborted,
            isAnimating_before_cleanup: this.shell.mentor?.isAnimating ?? '(null)',
          });

          if (!signal.aborted) {
            mentorTrace(`[SWSE Mentor Debug] [Speak #${speakNum}] Signal NOT aborted, executing cleanup`);
            this.shell.mentor.currentDialogue = dialogueText;
            this.shell.mentor.animationState = 'complete';
            this.shell.mentor.isAnimating = false;
          } else {
            mentorTrace(`[SWSE Mentor Debug] [Speak #${speakNum}] Signal WAS aborted, skipping cleanup`);
          }
        },
      });
    } catch (e) {
      console.error(`[SWSE Mentor Debug] [Speak #${speakNum}] MentorTranslationIntegration.render() threw:`, {
        error_message: e.message,
        error_type: e.constructor.name,
        stack_first_5_lines: e.stack?.split('\n').slice(0, 5).join(' | '),
        signal_aborted: signal.aborted,
      });
      if (!signal.aborted) {
        console.warn('[MentorRail] speak error', e);
        this.shell.mentor.currentDialogue = dialogueText;
        this.shell.mentor.animationState = 'complete';
        this.shell.mentor.isAnimating = false;
        const textEl = this._resolveDialogueContainer()?.querySelector?.('[data-mentor-text]');
        if (textEl instanceof HTMLElement) textEl.textContent = dialogueText;
      }
    }

    // [DEBUG] Final state logging
    mentorTrace(`[SWSE Mentor Debug] [Speak #${speakNum}] speak() completed`, {
      final_isAnimating: this.shell.mentor?.isAnimating ?? '(null)',
      final_currentDialogue: this.shell.mentor?.currentDialogue?.slice?.(0, 30) ?? '(null)',
      signal_aborted: signal.aborted,
    });
  }

  /**
   * Queue mentor speech without making the caller wait for the typewriter or
   * Aurebesh animation. Navigation, selection, survey answers, and filters must
   * remain player-driven even when a mentor line is still animating.
   * @param {string} text
   * @param {string|null} mood
   * @param {Object} options
   * @returns {void}
   */
  queueSpeak(text, mood = null, options = {}) {
    try {
      const promise = this.speak(text, mood, options);
      if (promise && typeof promise.catch === 'function') {
        promise.catch(err => console.warn('[MentorRail] queued speak error', err));
      }
    } catch (err) {
      console.warn('[MentorRail] queued speak failed', err);
    }
  }

  /**
   * The one presentation path for a build recommendation.
   *
   * Touches only nodes inside the mounted mentor rail: the mood attribute and
   * the dialogue container. It never renders, never asks the shell to render,
   * and never blocks the caller on the typewriter animation.
   *
   * Equality suppression happens upstream in MentorRecommendationController, so
   * reaching this method already means the advice genuinely changed.
   *
   * @param {Object} recommendation - Normalized recommendation DTO.
   * @param {Object} [options]
   * @param {boolean} [options.replay] - Re-presenting after a structural render.
   * @returns {boolean} false when the rail is not mounted (queued instead).
   */
  presentRecommendation(recommendation, { replay = false } = {}) {
    // Kept for callers that still hold a recommendation DTO. It builds an
    // unauthorized message on purpose: the arbiter is the only thing that can
    // authorize one, so this now fails closed like any other direct write.
    return this.presentMessage({
      source: replay ? 'recommendation-replay' : 'recommendation',
      text: recommendation?.dialogue,
      mood: recommendation?.mood ?? 'neutral',
      targetId: recommendation?.targetId ?? null,
    });
  }

  /**
   * The single DOM write for any arbitrated mentor message.
   *
   * Whatever the source — step guidance, a reaction, a recommendation, Ask
   * Mentor — it lands here, and only here. Touches the mood attribute and the
   * dialogue container; never renders, never blocks on the typewriter.
   *
   * @param {Object} message
   * @param {string} message.text
   * @param {string} [message.mood]
   * @param {string} [message.source]
   * @returns {boolean} false when the rail is not mounted (queued instead).
   */
  presentMessage(message) {
    const text = String(message?.text ?? '').trim();
    if (!text) return false;

    // Ownership is proven, not trusted.
    //
    // Everything the player sees here must have been ordered by
    // MentorRecommendationController, which stamps an unforgeable token. A
    // message without it reached the sink some other way — that is the exact
    // regression this split exists to prevent, so it is counted and reported
    // rather than quietly rendered.
    if (!isArbitratedMessage(message)) {
      this.shell?.mentorRecommendations?.noteDirectBypass?.({
        source: message?.source ?? 'unknown',
        textPreview: text.slice(0, 60),
      });
      console.warn('[MentorRail] a mentor message reached the rail without passing through '
        + 'MentorRecommendationController; it skipped priority, staleness and equality checks.',
      { source: message?.source ?? 'unknown' });
      // Fail closed. The first version counted the violation and then rendered
      // the message anyway, which detected the intruder and opened the door.
      // Nothing is queued, animated, or written to shell state.
      return 'unauthorized';
    }

    const mood = message?.mood ?? 'neutral';
    const container = this._resolveDialogueContainer();

    if (!(container instanceof HTMLElement)) {
      // Not mounted yet (pre-render, or mid step transition). Queue it; the
      // rail replays queued dialogue from afterRender().
      this._queuePendingDialogue(text, mood);
      return false;
    }

    // Mood is a paint-only attribute swap on the mounted rail.
    this.setMood(mood);

    // queueSpeak aborts the previous reveal — now all the way into the
    // translator's animation loop — and returns immediately, so a new line
    // cleanly supersedes the old one and the player never waits on narration.
    this.queueSpeak(text, mood, {
      bypassSuppression: true,
      source: message?.source ?? 'mentor-message',
    });

    return true;
  }

  /**
   * Resolve step-appropriate guidance for the given descriptor, and sync the
   * mentor identity it implies.
   *
   * This deliberately does NOT speak. Step guidance used to call queueSpeak()
   * straight from here, which meant it never passed through priority, revision,
   * or step-identity checks — a slow step-entry lookup could land after the
   * player had already moved on, or overwrite a live recommendation. The caller
   * routes the returned text through MentorRecommendationController instead.
   *
   * @param {StepDescriptor} descriptor
   * @returns {Promise<{text: string, mood: string|null, stepId: string}|null>}
   */
  async resolveStepGuidance(descriptor) {
    if (!descriptor) return null;

    // [DEBUG] speakForStep entry
    mentorTrace('[SWSE Translation Debug] resolveStepGuidance() called', {
      descriptor_stepId: descriptor.stepId,
      descriptor_label: descriptor.label,
    });

    const guidance = resolveStepMentorGuidance(
      this.shell?.actor ?? null,
      descriptor.stepId,
      this.shell,
      { stepId: descriptor.stepId }
    );
    const mentorObj = guidance?.mentor || getStepMentorObject(this.shell?.actor ?? null, this.shell) || this._getMentorObject();
    if (!mentorObj) {
      mentorTrace('[SWSE Translation Debug] resolveStepGuidance() early return — no mentor object');
      return null;
    }

    const mentorKey = guidance?.mentorContext?.mentorKey || guidance?.mentorContext?.mentorId || getMentorKey(mentorObj);
    Object.assign(this.shell.mentor, {
      id: mentorKey,
      mentorId: mentorKey,
      name: mentorObj.name || this.shell.mentor.name,
      title: mentorObj.title || this.shell.mentor.title,
      portrait: resolveMentorPortraitPath(mentorObj.portrait || this.shell.mentor.portrait),
    });

    const text = guidance?.text
      || (guidance?.choiceType ? getMentorGuidance(mentorObj, guidance.choiceType) : '')
      || `You are at the ${descriptor.label} step.`;

    // [DEBUG] Text resolution
    mentorTrace('[SWSE Translation Debug] resolveStepGuidance() resolved text', {
      choiceType: guidance?.choiceType,
      textSource: guidance?.textSource,
      mentorId: mentorKey,
      mentorSource: guidance?.mentorContext?.source,
      mentorConfidence: guidance?.mentorContext?.confidence,
      text_length: text?.length ?? 0,
      text_first_50: text?.slice?.(0, 50) ?? '(null)',
      will_call_speak: !!text,
    });

    if (!text) {
      mentorTrace('[SWSE Translation Debug] resolveStepGuidance() produced no text');
      return null;
    }

    return { text, mood: null, stepId: descriptor.stepId };
  }

  /**
   * Update mentor mood visual accent on live DOM (no re-render).
   * @param {string} mood
   */
  setMood(mood) {
    this.shell.mentor.mood = mood;
    const region = this.shell.element?.querySelector('[data-region="mentor-rail"]');
    if (region) {
      region.setAttribute('data-mood', mood);
      region.querySelector('.prog-mentor-rail')?.setAttribute('data-mood', mood);
    }
  }

  /**
   * Swap mentor identity; triggers partial re-render of mentor-rail PART only.
   * @param {string} mentorId
   */
  setMentor(mentorRef) {
    const data = resolveMentorData(mentorRef);
    if (!data) return;

    const mentorKey = getMentorKey(mentorRef);
    setSessionMentorContext(this.shell, {
      mentor: data,
      mentorId: mentorKey,
      mentorKey,
      className: this.shell?.progressionSession?.getSelection?.('class')?.className || null,
      stepId: this.shell?.steps?.[this.shell?.currentStepIndex]?.stepId || null,
      source: 'manual',
      confidence: 1,
      reason: 'mentorRail.setMentor',
      fallback: false,
    }, { force: true });

    Object.assign(this.shell.mentor, {
      mentorId: mentorKey,
      id: mentorKey,
      name: data.name,
      title: data.title,
      portrait: resolveMentorPortraitPath(data.portrait),
    });

    // Identity/portrait changes patch the mounted rail directly. Mentor code is
    // never a render owner — not even for a region-scoped update.
    return this._applyIdentityToDom();
  }

  /**
   * Write the current mentor identity into the mounted rail without rendering.
   * @returns {boolean} false when the rail is not mounted.
   * @private
   */
  _applyIdentityToDom() {
    const region = this.shell.getRootElement?.()?.querySelector?.('[data-region="mentor-rail"]')
      ?? this.shell.element?.querySelector?.('[data-region="mentor-rail"]');
    if (!(region instanceof HTMLElement)) return false;

    const root = region.querySelector('.prog-mentor-rail') || region;
    const nameEl = root.querySelector('.prog-mentor__name');
    if (nameEl?.lastChild) nameEl.lastChild.textContent = this.shell.mentor.name || 'Mentor';
    const titleEl = root.querySelector('.prog-mentor__title');
    if (titleEl) titleEl.textContent = this.shell.mentor.title || '';

    const portraitWrap = root.querySelector('[data-mentor-portrait]');
    if (portraitWrap) portraitWrap.setAttribute('data-mentor-portrait', this.shell.mentor.mentorId || '');
    const img = root.querySelector('.prog-mentor__portrait-image');
    const portrait = this.shell.mentor.portrait;
    if (img instanceof HTMLImageElement && portrait && img.getAttribute('src') !== portrait) {
      img.setAttribute('src', portrait);
      img.setAttribute('title', this.shell.mentor.name || 'Mentor');
    }

    this.shell.renderScheduler?.noteDomOnlyMentorUpdate?.();
    return true;
  }

  /**
   * Toggle collapse. Applies the collapsed state to the live DOM and only asks
   * for a mentor-region update — collapsing the rail must not rebuild the work
   * surface, details rail, or footer.
   * @returns {Promise<void>}
   */
  async toggle() {
    const shell = this.shell;
    shell.mentorCollapsed = !shell.mentorCollapsed;
    shell.mentor.collapsed = shell.mentorCollapsed;

    // Collapse is expressed entirely through the data-collapsed attribute the
    // stylesheet already keys off, so this needs no render of any kind.
    const region = shell.getRootElement?.()?.querySelector?.('[data-region="mentor-rail"]')
      ?? shell.element?.querySelector?.('[data-region="mentor-rail"]');
    let applied = false;
    if (region instanceof HTMLElement) {
      region.setAttribute('data-collapsed', String(shell.mentorCollapsed));
      shell.renderScheduler?.noteDomOnlyMentorUpdate?.();
      applied = true;
    }

    await game.user.setFlag('foundryvtt-swse', 'mentorRailCollapsed', shell.mentorCollapsed);
    return applied;
  }

  /**
   * Sync the rendered identity block with the canonical session mentor context.
   * This is a DOM/state repair pass only; it does not trigger a shell render.
   * It prevents stale shell.mentor values from surviving a render when the
   * session already knows the correct high-confidence mentor.
   * @param {HTMLElement|null} regionEl
   * @returns {Object|null}
   * @private
   */
  _syncIdentityFromSessionContext(regionEl = null) {
    const descriptor = this.shell?.steps?.[this.shell?.currentStepIndex] || this.shell?.currentDescriptor || null;
    const context = resolveStepMentorContext(this.shell?.actor ?? null, this.shell, {
      stepId: descriptor?.stepId || null,
      validateRegistry: false,
    });
    const mentorObj = context?.mentor;
    if (!mentorObj) return context || null;

    const mentorKey = context?.mentorKey || context?.mentorId || getMentorKey(mentorObj);
    const portrait = resolveMentorPortraitPath(mentorObj.portrait || this.shell.mentor?.portrait);
    Object.assign(this.shell.mentor, {
      id: mentorKey,
      mentorId: mentorKey,
      name: mentorObj.name || this.shell.mentor?.name,
      title: mentorObj.title || this.shell.mentor?.title,
      portrait,
    });

    const root = regionEl?.querySelector?.('.prog-mentor-rail') || regionEl;
    root?.querySelector?.('.prog-mentor__name')?.lastChild && (root.querySelector('.prog-mentor__name').lastChild.textContent = this.shell.mentor.name || 'Mentor');
    const titleEl = root?.querySelector?.('.prog-mentor__title');
    if (titleEl) titleEl.textContent = this.shell.mentor.title || '';
    const portraitWrap = root?.querySelector?.('[data-mentor-portrait]');
    if (portraitWrap) portraitWrap.setAttribute('data-mentor-portrait', mentorKey);
    const img = root?.querySelector?.('.prog-mentor__portrait-image');
    if (img instanceof HTMLImageElement && portrait && img.getAttribute('src') !== portrait) {
      img.setAttribute('src', portrait);
      img.setAttribute('title', this.shell.mentor.name || 'Mentor');
    }

    return context;
  }

  /**
   * Called by shell._onRender() after every render.
   * Restores static dialogue text if animation was complete before re-render.
   * Applies message-length classes for responsive text scaling.
   * @param {HTMLElement} regionEl
   */
  afterRender(regionEl) {
    if (!regionEl) return;

    this._syncIdentityFromSessionContext(regionEl);

    const { currentDialogue, animationState } = this.shell.mentor;
    const textEl = regionEl.querySelector('[data-mentor-text]');

    // Restore static text if animation was already complete (avoids re-animation).
    // If a render replaced the rail while an animation was pending/typing, the
    // template now has a plain-text fallback; immediately replay the queued
    // animation against the live DOM instead of leaving the panel blank.
    if (textEl && currentDialogue && animationState === 'complete') {
      textEl.textContent = currentDialogue;
    }

    // Replay is NOT done here.
    //
    // The rail used to keep its own pendingDialogue and flush it from a
    // microtask, while MentorRecommendationController separately replayed its
    // accepted message from reconnect(). Two owners meant one message could be
    // revealed twice, or restart mid-animation. The controller is the single
    // owner: ProgressionShell calls reconnect() immediately after this, and the
    // controller performs exactly one authorized write per new mount.

    // Apply message-length class for responsive text scaling
    if (textEl && currentDialogue) {
      textEl.classList.remove('is-short', 'is-medium', 'is-long');
      const charCount = currentDialogue.length;
      if (charCount <= 50) {
        textEl.classList.add('is-short');
      } else if (charCount <= 150) {
        textEl.classList.add('is-medium');
      } else {
        textEl.classList.add('is-long');
      }
    }

    // Sync mood data attribute
    regionEl.querySelector('.prog-mentor-rail')
      ?.setAttribute('data-mood', this.shell.mentor.mood);
  }

  /**
   * Get mentor object from MENTORS constant by ID.
   * @returns {Object|null}
   * @private
   */
  _getMentorObject() {
    return resolveMentorData(this.shell.mentor?.mentorId || this.shell.mentor?.name || 'Scoundrel') ?? null;
  }
}
