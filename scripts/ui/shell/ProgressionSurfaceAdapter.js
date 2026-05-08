/**
 * ProgressionSurfaceAdapter — Thin adapter for inline Progression/Chargen rendering
 *
 * Bridges ProgressionShell/ChargenShell logic to the holopad shell surface system.
 * The app logic stays intact; only rendering is redirected.
 *
 * Pattern:
 *   1. Create app instance without calling render() (never opens a window)
 *   2. Override render() to call shell.render() instead
 *   3. Call _prepareContext() to get VM with pre-rendered HTML parts
 *   4. Surface template renders those HTML strings inline
 *   5. Event delegation forwards actions back to instance methods
 *
 * One adapter instance per actor-mode pair, stored in shell surface options.
 */

import { SWSELogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';

export class ProgressionSurfaceAdapter {
  /** @type {Map<string, ProgressionSurfaceAdapter>} Registry per actor id */
  static _registry = new Map();

  /** @type {object} ProgressionShell or ChargenShell instance (never rendered as window) */
  _app = null;

  /** @type {string} 'chargen' | 'levelup' */
  mode = null;

  /** @type {object} The character sheet that hosts this surface */
  _shellHost = null;

  /** @type {string} Actor id */
  _actorId = null;

  /** @type {boolean} Initialization complete flag */
  _ready = false;

  constructor(shellHost, actorId, mode) {
    this._shellHost = shellHost;
    this._actorId = actorId;
    this.mode = mode;
  }

  /**
   * Get or create an adapter for the given actor and mode.
   * Reuses existing if already initialized for same actor+mode.
   *
   * @param {object} shellHost - The character sheet instance
   * @param {Actor} actor
   * @param {string} mode - 'chargen' | 'levelup'
   * @param {object} [options]
   * @returns {Promise<ProgressionSurfaceAdapter>}
   */
  static async getOrCreate(shellHost, actor, mode, options = {}) {
    const key = `${actor.id}-${mode}`;

    const existing = this._registry.get(key);
    if (existing?._ready) {
      existing._shellHost = shellHost;
      return existing;
    }

    const adapter = new ProgressionSurfaceAdapter(shellHost, actor.id, mode);
    await adapter._initialize(actor, mode, options);
    this._registry.set(key, adapter);
    return adapter;
  }

  /**
   * Destroy and cleanup adapter for an actor when they close their sheet.
   * @param {string} actorId
   */
  static destroy(actorId) {
    for (const [key, adapter] of this._registry) {
      if (key.startsWith(actorId + '-')) {
        adapter._destroy();
        this._registry.delete(key);
      }
    }
  }

  /**
   * Build the view model for this surface by calling _prepareContext().
   * Returns the full VM including pre-rendered HTML strings.
   *
   * @returns {Promise<object>}
   */
  async buildViewModel() {
    const id = this.mode === 'chargen' ? 'chargen' : 'progression';
    const title = this.mode === 'chargen' ? 'Character Creation' : 'Level Up';

    if (!this._app || !this._ready) {
      return { id, title, isLoading: true };
    }

    try {
      let context = await this._app._prepareContext({});

      // Fail-open guard: an intro/splash that renders blank must never soft-lock the player.
      // This can happen if a template/partial fails after the inline shell intercepts rendering.
      if (this._isBlankOrErroredIntroContext(context)) {
        SWSELogger.warn('[ProgressionSurfaceAdapter] Intro surface rendered blank/error; advancing to next step', {
          actorId: this._actorId,
          mode: this.mode,
          stepId: context?.currentDescriptor?.stepId
        });
        const advanced = await this.advancePastIntro('blank-or-error-intro-render');
        if (advanced) context = await this._app._prepareContext({});
      }

      return {
        id,
        title,
        mode: this.mode,
        vm: context,
        isReady: true
      };
    } catch (err) {
      SWSELogger.error('[ProgressionSurfaceAdapter] buildViewModel failed:', err);

      // If context building itself failed on intro, try to keep the player moving rather
      // than leaving a blank holopad.
      if (this._getCurrentStepId() === 'intro') {
        const advanced = await this.advancePastIntro('intro-context-build-failed');
        if (advanced) {
          try {
            const context = await this._app._prepareContext({});
            return { id, title, mode: this.mode, vm: context, isReady: true, recoveredFromIntroError: true };
          } catch (secondErr) {
            SWSELogger.error('[ProgressionSurfaceAdapter] Context rebuild after intro recovery failed:', secondErr);
          }
        }
      }

      return { id, title, error: err.message };
    }
  }

  /**
   * Run after the holopad shell has rendered this inline progression surface.
   * Mirrors ProgressionShell._onRender enough to hydrate step plugins, especially
   * the intro splash animation, without opening a standalone ApplicationV2 window.
   *
   * @param {HTMLElement} surfaceRoot
   * @returns {Promise<void>}
   */
  async afterInlineRender(surfaceRoot) {
    if (!this._app || !this._ready || !surfaceRoot) return;

    try {
      this._app.mentorRail?.afterRender?.(surfaceRoot.querySelector('[data-region="mentor-rail"]'));
      this._app.progressRail?.afterRender?.(surfaceRoot.querySelector('[data-region="progress-rail"]'));
      this._app.utilityBar?.afterRender?.(surfaceRoot.querySelector('[data-region="utility-bar"]'));

      const descriptor = this._app.steps?.[this._app.currentStepIndex] ?? null;
      const plugin = descriptor ? this._app.stepPlugins?.get?.(descriptor.stepId) : null;
      if (!descriptor || !plugin) return;

      await plugin.onDataReady?.(this._app).catch(err => {
        SWSELogger.error('[ProgressionSurfaceAdapter] plugin.onDataReady failed:', err);
      });

      const workSurfaceEl = surfaceRoot.querySelector('[data-region="work-surface"]');
      if (!workSurfaceEl && descriptor.stepId === 'intro') {
        await this.advancePastIntro('intro-work-surface-missing-after-inline-render');
        return;
      }

      await plugin.afterRender?.(this._app, workSurfaceEl).catch(async err => {
        SWSELogger.error('[ProgressionSurfaceAdapter] plugin.afterRender failed:', err);
        if (descriptor.stepId === 'intro') {
          await this.advancePastIntro('intro-after-render-failed');
        }
      });

      if (descriptor.stepId === 'intro') this._scheduleIntroWatchdog(plugin);
    } catch (err) {
      SWSELogger.error('[ProgressionSurfaceAdapter] afterInlineRender failed:', err);
      if (this._getCurrentStepId() === 'intro') {
        await this.advancePastIntro('intro-inline-hydration-failed');
      }
    }
  }

  /**
   * Advance past the intro/splash step if it fails to hydrate.
   * Intro is atmospheric and has no mechanical selections, so fail-open is safe.
   *
   * @param {string} reason
   * @returns {Promise<boolean>}
   */
  async advancePastIntro(reason = 'intro-recovery') {
    if (!this._app || this._getCurrentStepId() !== 'intro') return false;
    if (this._introRecoveryInProgress) return false;

    this._introRecoveryInProgress = true;
    try {
      SWSELogger.warn('[ProgressionSurfaceAdapter] Advancing past failed intro splash', {
        actorId: this._actorId,
        mode: this.mode,
        reason
      });

      const event = { preventDefault: () => {}, stopPropagation: () => {} };
      await this._app._onNextStep(event, null);
      await this._shellHost?.render?.(false);
      return true;
    } catch (err) {
      SWSELogger.error('[ProgressionSurfaceAdapter] Failed to advance past intro:', err);
      return false;
    } finally {
      this._introRecoveryInProgress = false;
    }
  }

  _getCurrentStepId() {
    return this._app?.steps?.[this._app?.currentStepIndex]?.stepId ?? null;
  }

  _isBlankOrErroredIntroContext(context) {
    if (context?.currentDescriptor?.stepId !== 'intro') return false;
    const html = String(context?.workSurfaceHtml || '').trim();
    if (!html) return true;
    if (html.includes('prog-step-error-surface') || html.includes('data-step-error="true"')) return true;
    return !html.includes('prog-intro-surface');
  }

  _scheduleIntroWatchdog(plugin) {
    clearTimeout(this._introWatchdog);
    this._introWatchdog = setTimeout(async () => {
      if (this._getCurrentStepId() !== 'intro') return;
      const state = plugin?._state;
      const complete = plugin?._complete === true;
      const started = plugin?._animationSequenceStarted === true;
      const running = plugin?._introRunning === true;

      // Do not auto-advance a healthy splash that is complete and awaiting user input.
      if (complete || state === 'complete-awaiting-click') return;

      // If it never started, was disposed, or is still spinning far past expected boot time, fail open.
      if (!started || state === 'disposed' || running) {
        await this.advancePastIntro('intro-watchdog-timeout');
      }
    }, 18000);
  }

  /**
   * Handle a user action from the progression surface.
   * Delegates to the underlying app's handler methods.
   *
   * @param {string} action - data-action value
   * @param {Event} event - Original DOM event
   * @param {Element} target - Element that triggered action
   * @returns {Promise<void>}
   */
  async handleAction(action, event, target) {
    if (!this._app) return;

    try {
      switch (action) {
        case 'continue':
        case 'next-step':
        case 'skip-intro':
          await this._app._onNextStep(event, target);
          break;
        case 'previous-step':
          await this._app._onPreviousStep(event, target);
          break;
        case 'confirm-step':
          await this._app._onConfirmStep(event, target);
          break;
        case 'jump-step':
          await this._app._onJumpStep(event, target);
          break;
        case 'focus-item':
          await this._app._onFocusItem(event, target);
          break;
        case 'commit-item':
          await this._app._onCommitItem(event, target);
          break;
        case 'ask-mentor':
          await this._app._onAskMentor(event, target);
          break;
        case 'toggle-mentor':
          await this._app._onToggleMentor(event, target);
          break;
        case 'toggle-utility-bar':
          await this._app._onToggleUtilityBar(event, target);
          break;
        case 'increment-quantity':
          await this._app._onIncrementQuantity(event, target);
          break;
        case 'decrement-quantity':
          await this._app._onDecrementQuantity?.(event, target);
          break;
        default:
          // Try calling method dynamically for step-specific actions
          const methodName = '_on' + action.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join('');
          if (typeof this._app[methodName] === 'function') {
            await this._app[methodName](event, target);
          } else {
            SWSELogger.debug(`[ProgressionSurfaceAdapter] Unhandled action: ${action}`);
          }
      }
    } catch (err) {
      SWSELogger.error(`[ProgressionSurfaceAdapter] Action "${action}" failed:`, err);
    }
  }

  // ─── Private ────────────────────────────────────────────────────────────────

  async _initialize(actor, mode, options) {
    try {
      const { ChargenShell } = await import(
        '/systems/foundryvtt-swse/scripts/apps/progression-framework/chargen-shell.js'
      );
      const { LevelupShell } = await import(
        '/systems/foundryvtt-swse/scripts/apps/progression-framework/levelup-shell.js'
      );

      const ShellClass = mode === 'chargen' ? ChargenShell : LevelupShell;
      const app = new ShellClass(actor, mode, options);

      // CRITICAL: Override render() to prevent standalone window
      // Re-render the character sheet instead
      const self = this;
      app.render = async function(...args) {
        SWSELogger.debug('[ProgressionSurfaceAdapter] Intercepted render() — redirecting to shell');
        await self._shellHost?.render?.(false);

        // After a shell-host render, immediately rebind the inline progression DOM.
        // Intro splash stages call shell.render() during the animation; without this
        // rebind, translation can target stale DOM from the previous stage.
        const region = self.mode === 'chargen' ? 'surface-chargen' : 'surface-progression';
        const root = self._shellHost?.element?.querySelector?.(`[data-shell-region="${region}"]`);
        if (root?.isConnected) await self.afterInlineRender(root);

        return app;
      };

      // Initialize steps (same as ProgressionShell.open() but without render)
      await app._attemptSessionRecovery();
      await app._initializeSteps();
      await app._initializeFirstStep().catch(err => {
        SWSELogger.error('[ProgressionSurfaceAdapter] First step init error:', err);
      });

      this._app = app;
      this._ready = true;
      SWSELogger.log(`[ProgressionSurfaceAdapter] Initialized ${mode} for actor ${actor.name}`);
    } catch (err) {
      SWSELogger.error('[ProgressionSurfaceAdapter] Initialization failed:', err);
      this._ready = false;
    }
  }

  _destroy() {
    clearTimeout(this._introWatchdog);
    if (this._app) {
      try {
        this._app.close?.({ force: true }).catch(() => {});
      } catch {}
      this._app = null;
    }
    this._ready = false;
  }
}
