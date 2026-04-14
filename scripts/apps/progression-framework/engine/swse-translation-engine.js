/**
 * SWSE Translation Engine
 *
 * Unified orchestration layer for all diegetic UI text presentation.
 * Manages presentation state, DOM binding, and translation animation
 * across chargen intro, mentor dialogue, and store splash.
 *
 * Architecture:
 * - Session-based: Each run creates a TranslationSession
 * - Profile-driven: Chargen/Mentor/Store profiles define behavior
 * - Stable DOM: Binds to persistent DOM nodes, not shell state
 * - Direct mutation: Updates target elements without shell rerender
 * - Rebindable: Survives shell rerenders by rebinding to new DOM
 *
 * Usage:
 *   const engine = new SWSETranslationEngine();
 *   const session = engine.createSession({
 *     profile: 'chargenIntro',
 *     target: this._workSurfaceEl,
 *     sourceText: 'AURABESH TEXT',
 *     translatedText: 'ENGLISH TEXT',
 *     onComplete: () => {}
 *   });
 *   await session.run();
 */

import { swseLogger } from '../../../utils/logger.js';

function escapeHTML(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ============================================================================
// TRANSLATION PROFILES — Define behavior for each UI context
// ============================================================================

export const TRANSLATION_PROFILES = {
  chargenIntro: {
    mode: 'masked-reveal',                // Left-to-right masked character reveal with cursor
    speed: 60,                             // ms per character position
    maskCharacter: '●',                    // Masked placeholder (●●●●●)
    cursorCharacter: '◆',                  // Cursor symbol
    preserveSpaces: true,                  // Keep spaces visible
    enableSkip: true,                      // Allow click to reveal all
    finalHoldMs: 800,                      // Hold final state before fading
    stateClasses: {
      processing: 'translating-processing',
      success: 'translating-success',
      waiting: 'translating-waiting'
    }
  },

  chargenBootLine: {
    mode: 'boot-line',
    typingSpeed: 42,
    decodeSpeed: 34,
    cursorCharacter: '█',
    preserveSpaces: true,
    enableSkip: true
  },

  mentorDialogue: {
    mode: 'decrypt',                      // Aurebesh → English reveal
    speed: 30,
    animationClass: 'translation-decrypt',
    preset: 'mentor',
    showSourceText: false,
    enableSkip: true,
    stateClasses: {
      processing: 'mentor-processing',
      success: 'mentor-complete',
      waiting: 'mentor-waiting'
    }
  },

  storeSplash: {
    mode: 'fade-in',                      // Smooth fade reveal
    speed: 25,
    animationClass: 'translation-fade',
    preset: 'droid',
    showSourceText: false,
    enableSkip: true,
    stateClasses: {
      processing: 'store-processing',
      success: 'store-complete',
      waiting: 'store-waiting'
    }
  }
};

// ============================================================================
// DOM BINDING SYSTEM — Manage stable references to target elements
// ============================================================================

export class DOMBinding {
  constructor(target, selectors) {
    /**
     * target: Container element (work-surface, mentor-panel, etc)
     * selectors: Map of binding names to data-* attribute queries
     *
     * Example:
     *   {
     *     'translationText': '[data-role="translation-text"]',
     *     'sourceText': '[data-role="source-text"]',
     *     'progressFill': '[data-role="progress-fill"]'
     *   }
     */
    this._target = target;
    this._selectors = selectors;
    this._refs = new Map();  // Cache of bound elements
    this._sessionToken = 0;  // Invalidates stale references on rebind

    this.rebind();
  }

  /**
   * Rebind all selectors (call after shell rerender)
   */
  rebind() {
    this._sessionToken++;
    this._refs.clear();

    const foundElements = {};
    for (const [name, selector] of Object.entries(this._selectors)) {
      const el = this._target?.querySelector(selector);
      if (el) {
        this._refs.set(name, el);
        foundElements[name] = true;
      } else {
        foundElements[name] = false;
        swseLogger.warn(`[DOMBinding] Element not found for selector: ${selector}`);
      }
    }

    swseLogger.debug(`[DOMBinding.rebind] Session token: ${this._sessionToken}, Found elements:`, foundElements);
  }

  /**
   * Get a bound element by name
   */
  get(name) {
    return this._refs.get(name) ?? null;
  }

  /**
   * Set text content on bound element
   */
  setText(name, text) {
    const el = this.get(name);
    if (el) {
      el.textContent = text;
      return true;
    }
    return false;
  }

  /**
   * Set HTML content on bound element
   */
  setHTML(name, html) {
    const el = this.get(name);
    if (el) {
      el.innerHTML = html;
      return true;
    }
    return false;
  }

  /**
   * Set class on bound element
   */
  setClass(name, className, active = true) {
    const el = this.get(name);
    if (el) {
      if (active) {
        el.classList.add(className);
      } else {
        el.classList.remove(className);
      }
      return true;
    }
    return false;
  }

  /**
   * Get current session token (for validating old timers)
   */
  getSessionToken() {
    return this._sessionToken;
  }
}

// ============================================================================
// TRANSLATION SESSION — Manages a single translation run
// ============================================================================

export class TranslationSession {
  constructor(options = {}) {
    /**
     * Options:
     * - profile: Profile name (chargenIntro, mentorDialogue, storeSplash)
     * - target: Container element (work-surface, etc)
     * - sourceText: Aurabesh text
     * - translatedText: English text
     * - binding: DOMBinding instance for stable DOM refs
     * - onComplete: Callback when animation completes
     * - onCancel: Callback if user cancels
     */
    this._options = options;
    this._profile = TRANSLATION_PROFILES[options.profile] || TRANSLATION_PROFILES.chargenIntro;
    this._binding = options.binding;
    this._state = 'idle';  // idle, running, complete, cancelled
    this._timer = null;
    this._charIndex = 0;
    this._sessionToken = 0;
  }

  /**
   * Run the translation animation (blocking until complete)
   */
  async run() {
    this._state = 'running';
    this._sessionToken++;
    const myToken = this._sessionToken;

    try {
      swseLogger.debug(`[TranslationSession] Starting with profile: ${this._options.profile}`);

      // Run animation based on mode
      switch (this._profile.mode) {
        case 'masked-reveal':
        case 'typewriter-target':
          await this._animateTypewriterTarget(myToken);
          break;
        case 'boot-line':
          await this._animateBootLine(myToken);
          break;
        case 'decrypt':
          await this._animateDecrypt(myToken);
          break;
        case 'fade-in':
          await this._animateFadeIn(myToken);
          break;
        default:
          swseLogger.warn(`[TranslationSession] Unknown mode: ${this._profile.mode}, falling back to typewriter-target`);
          await this._animateTypewriterTarget(myToken);
      }

      if (this._sessionToken === myToken) {
        this._state = 'complete';
        this._options.onComplete?.();
      }
    } catch (err) {
      swseLogger.error('[TranslationSession] Animation error:', err);
      this._state = 'error';
    }
  }

  /**
   * Cancel ongoing animation
   */
  cancel() {
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }
    this._state = 'cancelled';
  }

  /**
   * Masked-reveal mode: Left-to-right character reveal with cursor
   * Shows: "Jedi Knight" masked first as "●●●● ●●●●●"
   * Then progressively reveals left-to-right:
   *   ◆●●●● ●●●●●
   *   J◆●●● ●●●●●
   *   Je◆●● ●●●●●
   *   Jedi◆ ●●●●●
   *   Jedi ◆●●●●●
   *   etc...
   * @private
   */
  async _animateTypewriterTarget(sessionToken) {
    const text = this._options.translatedText || '';
    const binding = this._binding;

    if (!binding) {
      swseLogger.error('[TranslationSession] No DOM binding provided');
      return;
    }

    const mask = this._profile.maskCharacter || '●';
    const cursor = this._profile.cursorCharacter || '◆';
    const preserveSpaces = this._profile.preserveSpaces !== false;
    const speed = this._profile.speed || 60;

    return new Promise((resolve) => {
      // Build initial fully-masked display
      const maskedText = [...text].map(ch => {
        if (ch === ' ' && preserveSpaces) return ' ';
        return mask;
      }).join('');

      // Show initial masked state without cursor
      binding.setText('translationText', maskedText);

      let cursorPos = 0;
      const totalPositions = text.length + 1; // +1 for final cursor position after all text

      const animateFrame = () => {
        if (this._sessionToken !== sessionToken) {
          swseLogger.debug('[TranslationSession] Session token mismatch - animation aborted');
          resolve();
          return;
        }

        if (cursorPos >= totalPositions) {
          // Final state: show fully revealed text with cursor at end
          const finalFrame = text + cursor;
          binding.setText('translationText', finalFrame);
          swseLogger.debug('[TranslationSession] Masked-reveal animation complete', {
            totalFrames: totalPositions,
            finalText: text
          });
          resolve();
          return;
        }

        // Build frame: revealed | cursor | masked
        const revealed = text.slice(0, cursorPos);
        const remaining = [...text.slice(cursorPos)].map(ch => {
          if (ch === ' ' && preserveSpaces) return ' ';
          return mask;
        }).join('');

        const frame = revealed + cursor + remaining;
        binding.setText('translationText', frame);

        if (cursorPos % 5 === 0) {  // Log every 5th frame to reduce spam
          swseLogger.debug(`[TranslationSession] Frame ${cursorPos}/${totalPositions}`, { frame });
        }

        cursorPos++;
        this._timer = setTimeout(animateFrame, speed);
      };

      animateFrame();
    });
  }

  async _animateBootLine(sessionToken) {
    const binding = this._binding;
    if (!binding) return;

    const container = binding.get('lineText') || binding.get('aurabeshText') || binding.get('translationText');
    if (!container) {
      swseLogger.error('[TranslationSession] No boot line container found');
      return;
    }

    const sourceText = this._options.sourceText || this._options.translatedText || '';
    const translatedText = this._options.translatedText || sourceText;
    const cursor = escapeHTML(this._profile.cursorCharacter || '█');
    const typingSpeed = this._profile.typingSpeed || 42;
    const decodeSpeed = this._profile.decodeSpeed || 34;
    const keepFinalCursor = this._options.keepFinalCursor === true;
    const cursorMode = this._options.cursorMode || 'translating';

    const renderFrame = (typedCount, decodeCount, showCursor = true) => {
      const typedSource = sourceText.slice(0, typedCount);
      const decodedPrefix = translatedText.slice(0, decodeCount);
      const undecodedSuffix = typedSource.slice(decodeCount);

      const basic = decodedPrefix
        ? `<span class="prog-intro-boot-fragment prog-intro-boot-fragment--basic">${escapeHTML(decodedPrefix)}</span>`
        : '';
      const aurabesh = undecodedSuffix
        ? `<span class="prog-intro-boot-fragment prog-intro-boot-fragment--aurabesh">${escapeHTML(undecodedSuffix)}</span>`
        : '';
      const cursorClass = cursorMode === 'blink'
        ? 'is-blinking'
        : (cursorMode === 'error' ? 'is-error is-translating' : 'is-translating');
      const cursorHTML = showCursor
        ? `<span class="prog-intro-cursor ${cursorClass}">${cursor}</span>`
        : '';

      binding.setHTML('lineText', `${basic}${cursorHTML}${aurabesh}`);
    };

    const wait = (ms) => new Promise((resolve) => {
      this._timer = setTimeout(resolve, ms);
    });

    for (let typedCount = 0; typedCount <= sourceText.length; typedCount += 1) {
      if (this._sessionToken !== sessionToken || this._state === 'cancelled') return;
      renderFrame(typedCount, 0, true);
      await wait(typingSpeed);
    }

    for (let decodeCount = 0; decodeCount <= translatedText.length; decodeCount += 1) {
      if (this._sessionToken !== sessionToken || this._state === 'cancelled') return;
      renderFrame(sourceText.length, decodeCount, true);
      await wait(decodeSpeed);
    }

    const finalCursorClass = cursorMode === 'blink' ? 'is-blinking' : 'is-translating';
    const finalCursor = keepFinalCursor
      ? `<span class="prog-intro-cursor ${finalCursorClass}">${cursor}</span>`
      : '';
    binding.setHTML(
      'lineText',
      `<span class="prog-intro-boot-fragment prog-intro-boot-fragment--basic">${escapeHTML(translatedText)}</span>${finalCursor}`
    );
  }

  /**
   * Decrypt mode: Use AurebeshTranslator for animated reveal
   * @private
   */
  async _animateDecrypt(sessionToken) {
    const { AurebeshTranslator } = await import('/systems/foundryvtt-swse/scripts/ui/dialogue/aurebesh-translator.js');

    const binding = this._binding;
    if (!binding) return;

    const container = binding.get('translationText');
    if (!container) return;

    return new Promise((resolve) => {
      AurebeshTranslator.render({
        text: this._options.translatedText || '',
        container: container,
        preset: this._profile.preset,
        enableSkip: this._profile.enableSkip,
        onComplete: () => {
          if (this._sessionToken === sessionToken) {
            resolve();
          }
        }
      }).catch((err) => {
        swseLogger.error('[TranslationSession] AurebeshTranslator error:', err);
        resolve();
      });
    });
  }

  /**
   * Fade-in mode: Smooth fade reveal
   * @private
   */
  async _animateFadeIn(sessionToken) {
    const binding = this._binding;
    if (!binding) return;

    const container = binding.get('translationText');
    if (!container) return;

    container.style.opacity = '0';
    binding.setText('translationText', this._options.translatedText || '');

    return new Promise((resolve) => {
      const duration = 1000;  // 1 second fade
      const startTime = Date.now();

      const animateFade = () => {
        if (this._sessionToken !== sessionToken) {
          resolve();
          return;
        }

        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        container.style.opacity = String(progress);

        if (progress < 1) {
          this._timer = requestAnimationFrame(animateFade);
        } else {
          resolve();
        }
      };

      animateFade();
    });
  }
}

// ============================================================================
// SWSE TRANSLATION ENGINE — Main orchestration
// ============================================================================

export class SWSETranslationEngine {
  constructor() {
    this._activeSession = null;
    swseLogger.log('[SWSETranslationEngine] Initialized');
  }

  /**
   * Create a new translation session
   */
  createSession(options = {}) {
    if (!options.target) {
      swseLogger.error('[SWSETranslationEngine] No target provided');
      return null;
    }

    // Create or reuse DOM binding
    const binding = new DOMBinding(options.target, options.selectors || {
      'translationText': '[data-role="intro-translation-text"]',
      'sourceText': '[data-role="intro-source-text"]',
      'progressFill': '[data-role="intro-progress-fill"]',
      'progressLabel': '[data-role="intro-progress-label"]',
      'aurabeshText': '[data-role="intro-aurabesh"]',
      'statusIcon': '[data-role="intro-status-icon"]'
    });

    const session = new TranslationSession({
      ...options,
      binding: binding
    });

    return session;
  }

  /**
   * Run a translation session (cancels any active session)
   */
  async runSession(session) {
    if (this._activeSession) {
      this._activeSession.cancel();
    }

    this._activeSession = session;
    await session.run();

    if (this._activeSession === session) {
      this._activeSession = null;
    }
  }

  /**
   * Cancel active session
   */
  cancel() {
    if (this._activeSession) {
      this._activeSession.cancel();
      this._activeSession = null;
    }
  }

  /**
   * Rebind DOM references (call after shell rerender)
   */
  rebindSession(session, target) {
    if (session._binding) {
      session._binding._target = target;
      session._binding.rebind();
    }
  }
}

export default SWSETranslationEngine;
