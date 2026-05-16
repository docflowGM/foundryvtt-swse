import { getMentorGuidance, MENTORS, resolveMentorData, resolveMentorPortraitPath, getMentorKey } from '../../../engine/mentor/mentor-dialogues.js';
import { MentorTranslationIntegration } from '../../../mentor/mentor-translation-integration.js';
import { ProgressionDebugCapture } from '../debug/progression-debug-capture.js';

/**
 * Maps step ID to mentor guidance choice type for getMentorGuidance().
 * @type {Object<string, string>}
 */
const STEP_CHOICE_TYPE = {
  'species': 'species',
  'class': 'class',
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
export class MentorRail {
  constructor(shell) {
    this.shell = shell;
    this._animationAbort = null; // AbortController for in-flight animations
  }

  /**
   * Speak text via AurebeshTranslator. Updates shell state, targets live DOM directly.
   * Does NOT trigger shell re-render (animation runs on existing DOM).
   * @param {string} text — text to speak
   * @param {string|null} mood — optional mood to set
   * @returns {Promise<void>}
   */
  async speak(text, mood = null) {
    if (!text) return;

    // [DEBUG] Sequence tracking
    const speakNum = ProgressionDebugCapture?.nextMentorSpeak?.() ?? 0;
    console.log(`[SWSE Mentor Debug] [Speak #${speakNum}] speak() called`, {
      text_length: text.length,
      text_first_40: text.slice(0, 40),
      mood: mood,
      isAnimating_before: this.shell.mentor?.isAnimating ?? '(null)',
      currentDialogue_before: this.shell.mentor?.currentDialogue?.slice?.(0, 30) ?? '(null)',
      has_prior_abort: !!this._animationAbort,
    });

    if (mood) this.setMood(mood);

    const shell = this.shell;
    shell.mentor.currentDialogue = text;
    shell.mentor.animationState = 'typing';
    shell.mentor.isAnimating = true;

    // Abort any in-flight animation
    if (this._animationAbort) {
      console.log(`[SWSE Mentor Debug] [Speak #${speakNum}] Aborting prior animation`, {
        prior_signal_aborted: this._animationAbort.signal?.aborted ?? '(unknown)',
      });
      this._animationAbort.abort();
    }

    this._animationAbort = new AbortController();
    const { signal } = this._animationAbort;

    console.log(`[SWSE Mentor Debug] [Speak #${speakNum}] New AbortController created`, {
      signal_aborted: signal.aborted,
    });

    // Find dialogue container in live DOM (supports both standalone and embedded modes)
    const root = shell.getRootElement?.() ?? shell.element;
    const container = root?.querySelector('[data-mentor-dialogue]');

    // [DEBUG] DOM search logging
    console.log(`[SWSE Mentor Debug] [Speak #${speakNum}] DOM container search`, {
      shell_element_exists: !!shell.element,
      mentor_dialogue_found: !!container,
      container_tag: container?.tagName ?? '(null)',
    });

    if (!container || signal.aborted) {
      console.log(`[SWSE Mentor Debug] [Speak #${speakNum}] Early return`, {
        container: !!container,
        signal_aborted: signal.aborted,
      });
      return;
    }

    try {
      // [DEBUG] Pre-render logging
      const mentorTextNode = container.querySelector('[data-mentor-text]');
      console.log(`[SWSE Mentor Debug] [Speak #${speakNum}] About to call MentorTranslationIntegration.render()`, {
        mentor_text_element: !!mentorTextNode,
        mentor_text_tag: mentorTextNode?.tagName ?? '(null)',
      });

      await MentorTranslationIntegration.render({
        text,
        container: container.querySelector('[data-mentor-text]') ?? container,
        mentor: shell.mentor.name || shell.mentor.mentorId,
        onComplete: () => {
          // [DEBUG] Callback execution logging
          console.log(`[SWSE Mentor Debug] [Speak #${speakNum}] onComplete callback fired`, {
            signal_aborted: signal.aborted,
            isAnimating_before_cleanup: this.shell.mentor?.isAnimating ?? '(null)',
          });

          if (!signal.aborted) {
            console.log(`[SWSE Mentor Debug] [Speak #${speakNum}] Signal NOT aborted, executing cleanup`);
            this.shell.mentor.animationState = 'complete';
            this.shell.mentor.isAnimating = false;
          } else {
            console.log(`[SWSE Mentor Debug] [Speak #${speakNum}] Signal WAS aborted, skipping cleanup`);
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
      if (!signal.aborted) console.warn('[MentorRail] speak error', e);
    }

    // [DEBUG] Final state logging
    console.log(`[SWSE Mentor Debug] [Speak #${speakNum}] speak() completed`, {
      final_isAnimating: this.shell.mentor?.isAnimating ?? '(null)',
      final_currentDialogue: this.shell.mentor?.currentDialogue?.slice?.(0, 30) ?? '(null)',
      signal_aborted: signal.aborted,
    });
  }

  /**
   * Speak step-appropriate guidance for the given descriptor.
   * @param {StepDescriptor} descriptor
   * @returns {Promise<void>}
   */
  async speakForStep(descriptor) {
    if (!descriptor) return;

    // [DEBUG] speakForStep entry
    console.log('[SWSE Translation Debug] speakForStep() called', {
      descriptor_stepId: descriptor.stepId,
      descriptor_label: descriptor.label,
    });

    const mentorObj = this._getMentorObject();
    if (!mentorObj) {
      console.log('[SWSE Translation Debug] speakForStep() early return — no mentor object');
      return;
    }

    const mentorKey = getMentorKey(mentorObj);
    Object.assign(this.shell.mentor, {
      id: mentorKey,
      mentorId: mentorKey,
      name: mentorObj.name || this.shell.mentor.name,
      title: mentorObj.title || this.shell.mentor.title,
      portrait: resolveMentorPortraitPath(mentorObj.portrait || this.shell.mentor.portrait),
    });

    const choiceType = STEP_CHOICE_TYPE[descriptor.stepId];
    const text = choiceType
      ? getMentorGuidance(mentorObj, choiceType)
      : `You are at the ${descriptor.label} step.`;

    // [DEBUG] Text resolution
    console.log('[SWSE Translation Debug] speakForStep() resolved text', {
      choiceType,
      text_length: text?.length ?? 0,
      text_first_50: text?.slice?.(0, 50) ?? '(null)',
      will_call_speak: !!text,
    });

    if (text) {
      console.log('[SWSE Translation Debug] speakForStep() calling speak() with text');
      await this.speak(text);
      console.log('[SWSE Translation Debug] speakForStep() speak() completed');
    } else {
      console.log('[SWSE Translation Debug] speakForStep() skipping speak() — no text');
    }
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

    Object.assign(this.shell.mentor, {
      mentorId: getMentorKey(mentorRef),
      name: data.name,
      title: data.title,
      portrait: resolveMentorPortraitPath(data.portrait),
    });

    this.shell.render({ parts: ['mentorRail'] });
  }

  /**
   * Toggle collapse. Updates DOM data-collapsed directly (no re-render).
   * @returns {Promise<void>}
   */
  async toggle() {
    const shell = this.shell;
    shell.mentorCollapsed = !shell.mentorCollapsed;
    shell.mentor.collapsed = shell.mentorCollapsed;
    await game.user.setFlag('foundryvtt-swse', 'mentorRailCollapsed', shell.mentorCollapsed);

    const region = shell.element?.querySelector('[data-region="mentor-rail"]');
    if (region) region.setAttribute('data-collapsed', String(shell.mentorCollapsed));
  }

  /**
   * Called by shell._onRender() after every render.
   * Restores static dialogue text if animation was complete before re-render.
   * Applies message-length classes for responsive text scaling.
   * @param {HTMLElement} regionEl
   */
  afterRender(regionEl) {
    if (!regionEl) return;

    const { currentDialogue, animationState } = this.shell.mentor;
    const textEl = regionEl.querySelector('[data-mentor-text]');

    // Restore static text if animation was already complete (avoids re-animation)
    if (textEl && currentDialogue && animationState === 'complete') {
      textEl.textContent = currentDialogue;
    }

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
