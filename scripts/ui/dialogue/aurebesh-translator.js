/**
 * SWSE Aurebesh Dialogue Translator
 * Standalone renderer: Aurebesh text → character-by-character English reveal
 * Supports click-to-reveal (skip animation), multiple presets, accessibility
 */

import { TRANSLATION_PRESETS } from './translation-presets.js';

export class AurebeshTranslator {
  /**
   * Render translated dialogue with Aurebesh → English animation
   * @param {Object} options
   * @param {string} options.text - English text to reveal
   * @param {HTMLElement} options.container - Element to render into
   * @param {string} options.preset - Preset style (mentor, sith, droid, holocron)
   * @param {Function} options.onComplete - Callback when animation finishes
   * @param {boolean} options.enableSkip - Allow click to reveal all (default: true)
   * @returns {Promise} Resolves when animation complete or skipped
   */
  static async render(options) {
    const {
      text,
      container,
      preset = 'mentor',
      onComplete = () => {},
      enableSkip = true
    } = options;

    if (!text || !container) {
      console.warn('AurebeshTranslator: missing text or container');
      return;
    }

    const config = TRANSLATION_PRESETS[preset] || TRANSLATION_PRESETS.mentor;

    // Create wrapper with unique ID for styling/cleanup
    const wrapperId = `aurebesh-${Date.now()}`;
    const wrapper = document.createElement('div');
    wrapper.id = wrapperId;
    wrapper.className = 'aurebesh-dialogue-wrapper';
    wrapper.innerHTML = '';
    container.appendChild(wrapper);

    // Initialize state
    const isSkippedRef = { value: false };
    let animationPromise;

    // Create skip handler
    const skipHandler = () => {
      isSkippedRef.value = true;
      if (enableSkip) {wrapper.removeEventListener('click', skipHandler);}
    };

    if (enableSkip) {
      wrapper.style.cursor = 'pointer';
      wrapper.addEventListener('click', skipHandler);
    }

    try {
      // Run animation (returns promise)
      animationPromise = this._animateReveal(wrapper, text, config, isSkippedRef);
      await animationPromise;

      // If skipped, reveal all remaining text instantly
      if (isSkippedRef.value) {
        wrapper.innerHTML = this._buildFinalMarkup(text, config);
      }

      onComplete();
      return wrapper;
    } catch (err) {
      console.error('AurebeshTranslator error:', err);
      wrapper.innerHTML = text; // Fallback to plain text
      onComplete();
      return wrapper;
    }
  }

  /**
   * Animate character-by-character reveal
   * @private
   */
  static async _animateReveal(container, text, config, skipRef) {
    const speed = config.speed || 25; // ms per character
    const chars = text.split('');

    for (let i = 0; i < chars.length; i++) {
      // If skipped, stop animating and let parent handle reveal
      if (skipRef?.value) {break;}

      const char = chars[i];
      const revealed = chars.slice(0, i + 1).join('');

      // Build markup: unrevealed in Aurebesh, revealed in English
      container.innerHTML = this._buildMarkup(revealed, chars.slice(i + 1).join(''), config);

      // Wait for animation frame + speed interval
      await new Promise(resolve => {
        setTimeout(() => {
          requestAnimationFrame(resolve);
        }, speed);
      });
    }
  }

  /**
   * Build HTML markup with Aurebesh (unrevealed) + English (revealed)
   * @private
   */
  static _buildMarkup(revealedText, unrevealed, config) {
    const aurebeshClass = config.aurebeshClass || 'aurebesh-font';
    const revealedClass = config.revealedClass || 'revealed-text';
    const cursorStyle = config.cursorStyle || 'block';

    let html = '';

    // Revealed text in English
    if (revealedText) {
      html += `<span class="${revealedClass}">${this._escapeHtml(revealedText)}</span>`;
    }

    // Unrevealed text in Aurebesh font
    if (unrevealed) {
      html += `<span class="${aurebeshClass}">${this._escapeHtml(unrevealed)}</span>`;
    }

    // Cursor indicator
    if (config.showCursor !== false) {
      html += `<span class="aurebesh-cursor cursor-${cursorStyle}"></span>`;
    }

    return html;
  }

  /**
   * Build final markup (all revealed)
   * @private
   */
  static _buildFinalMarkup(text, config) {
    const revealedClass = config.revealedClass || 'revealed-text';
    return `<span class="${revealedClass}">${this._escapeHtml(text)}</span>`;
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
   * Cancel ongoing animation
   * @param {HTMLElement} container - Container with animation
   */
  static cancel(container) {
    if (container) {
      container.innerHTML = ''; // Clear to stop animation
    }
  }

  /**
   * Check if browser supports required features
   */
  static isSupported() {
    return (
      typeof document !== 'undefined' &&
      typeof requestAnimationFrame !== 'undefined'
    );
  }
}
