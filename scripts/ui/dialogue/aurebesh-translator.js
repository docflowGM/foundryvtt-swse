/**
 * SWSE Aurebesh Dialogue Translator
 * Standalone renderer: Aurebesh text → character-by-character English reveal
 * Supports click-to-reveal (skip animation), multiple presets, accessibility
 */

import { TRANSLATION_PRESETS } from "/systems/foundryvtt-swse/scripts/ui/dialogue/translation-presets.js";

export class AurebeshTranslator {
  /**
   * Container -> current reveal generation. A WeakMap so detached dialogue
   * nodes do not keep entries alive after a shell render replaces them.
   * @type {WeakMap<HTMLElement, number>}
   * @private
   */
  static _generations = new WeakMap();

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
      enableSkip = true,
      signal = null
    } = options;

    if (!text || !container) {
      console.warn('AurebeshTranslator: missing text or container');
      return;
    }

    if (signal?.aborted) return;

    // Generation token. Clearing the container was never enough to stop an
    // in-flight reveal: the old loop kept ticking and kept writing into its own
    // wrapper, so two lines could animate over each other. Every render claims
    // the container, and any loop whose claim has been taken over stops.
    const generation = (this._generations.get(container) ?? 0) + 1;
    this._generations.set(container, generation);

    const config = TRANSLATION_PRESETS[preset] || TRANSLATION_PRESETS.mentor;

    // Create wrapper with unique ID for styling/cleanup
    const wrapperId = `aurebesh-${Date.now()}`;
    const wrapperTag = container.tagName === 'P' ? 'span' : 'div';
    const wrapper = document.createElement(wrapperTag);
    wrapper.id = wrapperId;
    wrapper.className = 'aurebesh-dialogue-wrapper';
    if (wrapperTag === 'span') wrapper.style.display = 'inline';
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
      // Run animation (returns promise). The animation starts as full Aurebesh,
      // then sweeps into Basic. After completion, replace the source entirely
      // so stale Aurebesh never remains beside the translated text.
      animationPromise = this._animateReveal(wrapper, text, config, isSkippedRef, {
        signal,
        generation,
        container,
      });
      await animationPromise;

      // Superseded while revealing: leave the DOM to whoever owns it now.
      if (this._isSuperseded(container, generation, signal)) {
        wrapper.remove();
        return wrapper;
      }

      wrapper.innerHTML = this._buildFinalMarkup(text, config);
      wrapper.classList.add('aurebesh-dialogue-wrapper--complete');

      onComplete();
      return wrapper;
    } catch (err) {
      console.error('AurebeshTranslator error:', err);
      if (this._isSuperseded(container, generation, signal)) return wrapper;
      wrapper.innerHTML = text; // Fallback to plain text
      onComplete();
      return wrapper;
    }
  }

  /**
   * Animate character-by-character reveal
   * @private
   */
  static async _animateReveal(container, text, config, skipRef, cancellation = {}) {
    const { signal = null, generation = null, container: owner = null } = cancellation;
    const speed = config.speed || 25; // ms per character
    const chars = text.split('');

    const superseded = () => this._isSuperseded(owner, generation, signal);

    if (superseded()) return;

    // First frame: pure Aurebesh/source text. This avoids the old behavior where
    // the first rendered frame already contained English.
    container.innerHTML = this._buildMarkup('', text, config);
    await this._delay(Math.max(140, speed * 6));

    for (let i = 0; i < chars.length; i++) {
      // Stop the moment a newer line claims this container or the caller aborts.
      // Checked before writing so a superseded loop never touches the DOM again.
      if (superseded()) return;

      // If skipped, stop animating and let parent handle reveal
      if (skipRef?.value) {break;}

      const revealed = chars.slice(0, i + 1).join('');

      // Build markup: unrevealed in Aurebesh, revealed in English
      container.innerHTML = this._buildMarkup(revealed, chars.slice(i + 1).join(''), config);

      // Wait for animation frame + speed interval
      await this._delay(speed);
    }
  }

  /**
   * True when this reveal no longer owns its container, or the caller aborted.
   * @param {HTMLElement|null} container
   * @param {number|null} generation
   * @param {AbortSignal|null} signal
   * @returns {boolean}
   * @private
   */
  static _isSuperseded(container, generation, signal) {
    if (signal?.aborted) return true;
    if (!container || generation == null) return false;
    return this._generations.get(container) !== generation;
  }

  static _delay(ms) {
    return new Promise(resolve => {
      setTimeout(() => {
        requestAnimationFrame(resolve);
      }, ms);
    });
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
    if (!container) return;
    // Invalidate the current generation first: clearing innerHTML alone never
    // stopped the reveal loop, it just removed what the loop had written so far.
    this._generations.set(container, (this._generations.get(container) ?? 0) + 1);
    container.innerHTML = '';
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
