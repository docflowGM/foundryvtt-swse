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
import { TRANSLATION_PRESETS, MENTOR_PRESET_MAP } from '../ui/dialogue/translation-presets.js';

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
  static MENTOR_PRESET_MAP = {
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
      enableSkip: true
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
  static normalizeMentorKey(mentor) {
    const key = this.normalizeMentorKey(mentor);

    // Return the canonical map key if we can match it.
    if (MENTOR_PRESET_MAP[key]) return key;

    for (const name of Object.keys(MENTOR_PRESET_MAP)) {
      if (!name || name === 'default') continue;
      if (key.includes(name)) return name;
    }

    // Fall back to a stable, internal-only token.
    return 'default';
  }

  
  static _getPresetForMentor(mentor) {
    const key = this.normalizeMentorKey(mentor);
    const mapped = MENTOR_PRESET_MAP[key] ?? MENTOR_PRESET_MAP.default ?? 'mentor';
    return TRANSLATION_PRESETS[mapped] ? mapped : 'mentor';
  }


    // 3) Heuristic fallback (backwards compatible)
    if (key.includes('sith')) return 'sith';
    if (key.includes('jedi')) return 'jedi';
    if (key.includes('droid') || key.includes('protocol')) return 'droid';
    if (key.includes('holocron')) return 'holocron';
    if (key.includes('vision') || key.includes('force-vision')) return 'forcevision';

    return 'mentor';
  }


    // Fuzzy match (check if key contains mentor name)
    for (const [mentorKey, preset] of Object.entries(this.)) {
      if (mentorKey !== 'default' && key.includes(mentorKey)) {
        return preset;
      }
    }

    // Fallback
    return 'mentor';
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
    this.[mentorKey.toLowerCase()] = preset;
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