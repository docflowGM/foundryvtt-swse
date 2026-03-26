import { getMentorGuidance, MENTORS } from '../../../engine/mentor/mentor-dialogues.js';
import { MentorTranslationIntegration } from '../../../mentor/mentor-translation-integration.js';

/**
 * Maps step ID to mentor guidance choice type for getMentorGuidance().
 * @type {Object<string, string>}
 */
const STEP_CHOICE_TYPE = {
  'species': 'species',
  'class': 'class',
  'attribute': 'ability',
  'skills': 'skill',
  'general-feat': 'feat',
  'class-feat': 'feat',
  'general-talent': 'talent',
  'class-talent': 'talent',
  'force-powers': 'force',
  'background': 'background',
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
    if (mood) this.setMood(mood);

    const shell = this.shell;
    shell.mentor.currentDialogue = text;
    shell.mentor.animationState = 'typing';
    shell.mentor.isAnimating = true;

    // Abort any in-flight animation
    if (this._animationAbort) this._animationAbort.abort();
    this._animationAbort = new AbortController();
    const { signal } = this._animationAbort;

    // Find dialogue container in live DOM
    const container = shell.element?.querySelector('[data-mentor-dialogue]');
    if (!container || signal.aborted) return;

    try {
      await MentorTranslationIntegration.render({
        text,
        container: container.querySelector('[data-mentor-text]') ?? container,
        mentor: shell.mentor.mentorId,
        onComplete: () => {
          if (!signal.aborted) {
            shell.mentor.animationState = 'complete';
            shell.mentor.isAnimating = false;
          }
        },
      });
    } catch (e) {
      if (!signal.aborted) console.warn('[MentorRail] speak error', e);
    }
  }

  /**
   * Speak step-appropriate guidance for the given descriptor.
   * @param {StepDescriptor} descriptor
   * @returns {Promise<void>}
   */
  async speakForStep(descriptor) {
    if (!descriptor) return;
    const mentorObj = this._getMentorObject();
    if (!mentorObj) return;

    const choiceType = STEP_CHOICE_TYPE[descriptor.stepId];
    const text = choiceType
      ? getMentorGuidance(mentorObj, choiceType)
      : `You are at the ${descriptor.label} step.`;

    if (text) await this.speak(text);
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
  setMentor(mentorId) {
    const data = Object.values(MENTORS).find(m => m.id === mentorId)
               ?? Object.values(MENTORS).find(m => m.id === 'ol-salty');
    if (!data) return;

    Object.assign(this.shell.mentor, {
      mentorId: data.id,
      name: data.name,
      title: data.title,
      portrait: data.portrait ?? null,
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
    return Object.values(MENTORS).find(m => m.id === this.shell.mentor.mentorId) ?? null;
  }
}
