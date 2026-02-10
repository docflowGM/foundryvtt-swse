/**
 * Mentor Dialogue Aurebesh Translation Integration
 * Hooks AurebeshTranslator into the mentor dialogue rendering pipeline
 *
 * Usage:
 *   // In mentor-chat-dialog.js rendering:
 *   const translated = await MentorTranslationIntegration.render({
 *     text: mentorResponse.advice,
 *     container: messageElement,
 *     mentor: mentorName,
 *     topic: topicKey
 *   });
 */

import { AurebeshTranslator } from './aurebesh-translator.js';
import { TRANSLATION_PRESETS } from './translation-presets.js';

export class MentorTranslationIntegration {
  /**
   * Settings for Aurebesh translation
   */
  static settings = {
    enabled: true,
    enabledByDefault: true,
    skipOnClick: true,
    preserveText: true // Keep original text for copy/paste
  };

  /**
   * Mentor → preset mapping
   * Customize which mentor uses which Aurebesh style
   */
  static mentorPresets = {
    'jedi-master': 'mentor',      // Wise, measured
    'sith-lord': 'sith',           // Aggressive, dangerous
    'protocol-droid': 'droid',     // Clinical, precise
    'holocron': 'holocron',        // Ancient, mystical
    'force-vision': 'forcevision', // Ethereal, fragmented
    // Add more mappings as needed
    default: 'mentor'
  };

  /**
   * Render mentor dialogue with optional Aurebesh translation
   * @param {Object} options
   * @param {string} options.text - English dialogue text
   * @param {HTMLElement} options.container - Element to render into
   * @param {string} options.mentor - Mentor name/key
   * @param {string} options.topic - Dialogue topic key
   * @param {Function} options.onComplete - Callback when complete
   * @param {boolean} options.force - Force enable translation (ignores settings)
   * @returns {Promise<HTMLElement>} Rendered element
   */
  static async render(options) {
    const {
      text,
      container,
      mentor = 'default',
      topic = 'default',
      onComplete = () => {},
      force = false
    } = options;

    if (!text || !container) {
      console.warn('MentorTranslationIntegration: missing text or container');
      return container;
    }

    // Check if translation is enabled
    const enabled = force || (
      this.settings.enabled &&
      game.user?.getFlag?.('swse', 'mentorTranslationEnabled') !== false
    );

    if (!enabled) {
      // Just render plain text
      container.innerHTML = this._escapeHtml(text);
      onComplete();
      return container;
    }

    // Get preset for this mentor
    const preset = this._getPresetForMentor(mentor);

    // Load CSS if not already loaded
    await this._ensureCSSLoaded();

    // Render with translation
    return AurebeshTranslator.render({
      text,
      container,
      preset,
      onComplete: () => {
        // Add data attributes for tracking
        container.dataset.mentor = mentor;
        container.dataset.topic = topic;
        container.dataset.preset = preset;
        onComplete();
      },
      enableSkip: this.settings.skipOnClick
    });
  }

  /**
   * Render without translation (plain text)
   */
  static renderPlain(text, container, onComplete = () => {}) {
    if (!text || !container) {return container;}
    container.innerHTML = this._escapeHtml(text);
    onComplete();
    return container;
  }

  /**
   * Get preset for mentor
   * @private
   */
  static _getPresetForMentor(mentor) {
    // Normalize mentor name
    const key = mentor?.toLowerCase?.()?.trim() || 'default';

    // Direct match
    if (this.mentorPresets[key]) {
      return this.mentorPresets[key];
    }

    // Fuzzy match (check if key contains mentor name)
    for (const [mentorKey, preset] of Object.entries(this.mentorPresets)) {
      if (mentorKey !== 'default' && key.includes(mentorKey)) {
        return preset;
      }
    }

    // Fallback
    return this.mentorPresets.default;
  }

  /**
   * Ensure dialogue CSS is loaded
   * @private
   */
  static async _ensureCSSLoaded() {
    if (document.getElementById('swse-dialogue-effects-css')) {
      return; // Already loaded
    }

    const link = document.createElement('link');
    link.id = 'swse-dialogue-effects-css';
    link.rel = 'stylesheet';
    link.href = 'systems/foundryvtt-swse/scripts/ui/dialogue/dialogue-effects.css';
    document.head.appendChild(link);

    // Wait for CSS to load
    return new Promise(resolve => {
      link.onload = resolve;
      link.onerror = resolve; // Resolve even if it fails
      setTimeout(resolve, 100); // Fallback timeout
    });
  }

  /**
   * Escape HTML special characters
   * @private
   */
  static _escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }

  /**
   * Toggle translation on/off for current user
   */
  static async toggleTranslation(enabled) {
    await game.user.setFlag('swse', 'mentorTranslationEnabled', enabled);
  }

  /**
   * Get translation enabled state
   */
  static isEnabled() {
    return (
      this.settings.enabled &&
      game.user?.getFlag?.('swse', 'mentorTranslationEnabled') !== false
    );
  }

  /**
   * Register a custom mentor preset
   */
  static registerMentorPreset(mentorKey, preset) {
    this.mentorPresets[mentorKey.toLowerCase()] = preset;
  }

  /**
   * Register multiple mentor presets
   */
  static registerMentorPresets(presetMap) {
    for (const [key, preset] of Object.entries(presetMap)) {
      this.registerMentorPreset(key, preset);
    }
  }

  /**
   * Cancel ongoing translation animation
   */
  static cancel(container) {
    if (container) {
      AurebeshTranslator.cancel(container);
    }
  }
}

// Export for convenience
export { AurebeshTranslator } from './aurebesh-translator.js';
export { TRANSLATION_PRESETS } from './translation-presets.js';
