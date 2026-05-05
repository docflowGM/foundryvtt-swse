/**
 * progression-entry.js — Unified Progression Entry Point
 *
 * SINGLE AUTHORITY for all character progression (chargen + level-up).
 * All progression must flow through this module:
 *   1. Play splash screen (blocking, V2 ApplicationV2)
 *   2. Open ProgressionShell
 *
 * Rules:
 * - No legacy chargen direct calls
 * - No legacy level-up direct calls
 * - No V1 Application, Dialog, or jQuery event binding
 * - Splash runs BEFORE shell every time
 * - Splash cannot be bypassed
 * - Splash does NOT mutate actor data
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { computeCenteredPosition } from "/systems/foundryvtt-swse/scripts/utils/sheet-position.js";
import { ProgressionDocumentTargetPolicy } from "./policies/progression-document-target-policy.js";
import { ActorAbilityBridge } from "/systems/foundryvtt-swse/scripts/adapters/ActorAbilityBridge.js";
import { ShellRouter } from "/systems/foundryvtt-swse/scripts/ui/shell/ShellRouter.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * Detect if an actor is incomplete (missing required progression data).
 * This is the canonical routing check for chargen vs level-up.
 *
 * Supports all progression-eligible actor types:
 * - character (heroic), droid, npc (nonheroic/beast/follower)
 *
 * @param {Actor} actor - The actor to check
 * @returns {boolean} - True if actor is incomplete and needs chargen
 * @private
 */
function _isChargenIncomplete(actor) {
  if (!actor) {
    return false;
  }

  // Check if this actor type is supported for progression
  const supportedTypes = ProgressionDocumentTargetPolicy.getSupportedActorTypes();
  if (!supportedTypes.includes(actor.type)) {
    return false; // Not a progression-eligible type
  }

  const system = actor.system;

  // Brand-new actor — no level assigned yet
  if ((system.level || 0) === 0) {
    return true;
  }

  // Missing or placeholder name
  if (!actor.name || actor.name.trim() === '' || actor.name === 'New Character') {
    return true;
  }

  // No class item yet — chargen was not completed
  const hasClass = ActorAbilityBridge.getClasses(actor).length > 0;
  if (!hasClass) {
    return true;
  }

  return false; // Actor progression is complete
}


function _createTransientProgressionActor({ actorType = 'character', subtype = null, isDroid = false, name = null, system = {} } = {}) {
  const ActorClass = CONFIG?.Actor?.documentClass;
  if (!ActorClass) {
    throw new Error('Foundry Actor document class is not available.');
  }

  const resolvedIsDroid = isDroid || subtype === 'droid';
  const resolvedActorType = resolvedIsDroid ? 'character' : actorType;
  const defaultName = name || (resolvedActorType === 'npc'
    ? 'New NPC'
    : resolvedIsDroid
      ? 'New Droid'
      : 'New Character');

  const baseSystem = foundry.utils.mergeObject({
    level: 0,
    swse: {
      mentorSurveyCompleted: false,
      progressionSubtype: subtype || null,
    },
  }, system || {}, { inplace: false, recursive: true });

  if (resolvedIsDroid) {
    baseSystem.isDroid = true;
  }

  return new ActorClass({
    name: defaultName,
    type: resolvedActorType,
    system: baseSystem,
  }, { parent: null });
}

export async function launchNewProgression(options = {}) {
  const actor = _createTransientProgressionActor(options);
  const launchOptions = { ...options };
  delete launchOptions.actorType;
  delete launchOptions.isDroid;
  delete launchOptions.name;
  delete launchOptions.system;
  return launchProgression(actor, launchOptions);
}

/**
 * Unified entry point for all progression.
 * BLOCKING: Does not return until progression is complete or user cancels.
 *
 * @param {Actor} actor - The actor to progress
 * @param {Object} options - Options to pass to ProgressionShell
 * @returns {Promise<void>}
 */
export async function launchProgression(actor, options = {}) {
  // DIAGNOSTICS: Log entry point with full context
  SWSELogger.debug('[PROGRESSION] ═══════════════════════════════════════════');
  SWSELogger.debug('[PROGRESSION] launchProgression() ENTRY');
  SWSELogger.debug('[PROGRESSION] actor.name:', actor?.name);
  SWSELogger.debug('[PROGRESSION] actor.type:', actor?.type);
  SWSELogger.debug('[PROGRESSION] actor.system.level:', actor?.system?.level);
  SWSELogger.debug('[PROGRESSION] actor.items.size:', actor?.items?.size);
  const hasClass = Array.from(actor?.items ?? []).some(item => item.type === 'class');
  SWSELogger.debug('[PROGRESSION] hasClass:', hasClass);
  SWSELogger.debug('[PROGRESSION] ═══════════════════════════════════════════');

  if (!actor) {
    ui?.notifications?.error?.('No actor provided to progression launcher.');
    SWSELogger.error('[Progression Entry] No actor provided');
    return;
  }

  SWSELogger.log(`[Progression Entry] Launching for actor: ${actor.name} (${actor.type})`);

  // PHASE 2.X (Document Targeting): Check if actor type is supported for progression
  const supportedTypes = ProgressionDocumentTargetPolicy.getSupportedActorTypes();
  if (!supportedTypes.includes(actor.type)) {
    const msg = `Progression does not support actor type "${actor.type}". Supported types: ${supportedTypes.join(', ')}`;
    ui?.notifications?.error?.(msg);
    SWSELogger.error('[Progression Entry] ' + msg);
    return;
  }

  // ROUTING LOGIC: Route to ChargenShell (new actors) or LevelupShell (existing actors)
  const isChargenIncomplete = _isChargenIncomplete(actor);

  SWSELogger.debug('[PROGRESSION] ───────────────────────────────');
  SWSELogger.debug('[PROGRESSION] ROUTING DECISION');
  SWSELogger.debug('[PROGRESSION] actor.type:', actor.type);
  SWSELogger.debug('[PROGRESSION] isChargenIncomplete:', isChargenIncomplete);
  SWSELogger.debug('[PROGRESSION] ───────────────────────────────');

  // ─── Phase 11: Shell Host routing ─────────────────────────────────────────
  // Notify the actor's shell host that a progression surface is active.
  // This ensures the shell tracks state even though ProgressionShell renders
  // as a positioned-overlay above the character sheet (same position/size).
  const surfaceId = isChargenIncomplete ? 'chargen' : 'progression';
  const shell = ShellRouter.getShell(actor.id);
  if (shell) {
    shell.setSurface(surfaceId, { source: options.source ?? 'sheet', stepId: options.currentStep ?? null })
      .then(() => shell.render(false))
      .catch(() => {});
  }

  // WINDOW AUTHORITY: preserve the datapad shell when a shell host is open.
  // Only minimize as a legacy fallback when no shell host is available.
  if (!shell && actor.sheet?.rendered) {
    try {
      const pos = computeCenteredPosition(900, 950);
      actor.sheet.setPosition(pos);
      SWSELogger.log('[Progression Entry] Actor sheet centered before minimize →', pos);
    } catch (posErr) {
      SWSELogger.warn('[Progression Entry] Could not center actor sheet before minimize:', posErr);
    }

    actor.sheet.minimize().catch(() => {});
    SWSELogger.log('[Progression Entry] Actor sheet minimized → clearing viewport for chargen');
  }

  // WINDOW AUTHORITY: Close any open mentor-notes window for this actor.
  try {
    const { MentorNotesApp } = await import('/systems/foundryvtt-swse/scripts/apps/mentor-notes/mentor-notes-app.js');
    const existingNotes = MentorNotesApp._instances?.get(actor.id);
    if (existingNotes) {
      existingNotes.close().catch(() => {});
      SWSELogger.log('[Progression Entry] Mentor-notes app closed → clearing viewport for chargen');
    }
  } catch {
    // mentor-notes is optional — fail silently
  }

  try {
    let progressionShell;

    if (isChargenIncomplete) {
      SWSELogger.log(`[Progression Entry] Actor is incomplete → routing to ChargenShell`);
      try {
        const { ChargenShell } = await import('./chargen-shell.js');
        progressionShell = await ChargenShell.open(actor, options);
      } catch (importErr) {
        console.error('[PROGRESSION] ❌ ChargenShell import failed:', importErr);
        SWSELogger.error('[Progression Entry] ChargenShell import error:', importErr);
        throw importErr;
      }
    } else {
      SWSELogger.log(`[Progression Entry] Actor is complete → routing to LevelupShell`);
      const { LevelupShell } = await import('./levelup-shell.js');
      progressionShell = await LevelupShell.open(actor, options);
    }

    // When the progression shell closes, return the actor's shell to 'sheet' mode
    if (progressionShell) {
      const originalClose = progressionShell.close?.bind(progressionShell);
      progressionShell.close = async (...args) => {
        ShellRouter.notifySurfaceClosed(actor.id);
        return originalClose?.(...args);
      };
    }

    return progressionShell;
  } catch (err) {
    console.error('[PROGRESSION] ❌ EXCEPTION CAUGHT:', err);
    console.error('[PROGRESSION] Stack:', err.stack);
    SWSELogger.error('[Progression Entry] Exception during progression launch:', err);
    ui?.notifications?.error?.(`Progression failed: ${err.message}`);
    // On error, return shell to sheet mode
    ShellRouter.notifySurfaceClosed(actor.id);
  }
}

/**
 * Launch follower progression for an owner actor.
 * Creates a dependent participant follower through the canonical spine.
 *
 * @param {Actor} ownerActor - The owner character
 * @param {Object} options - Options including slotId if needed
 * @returns {Promise<void>}
 */
export async function launchFollowerProgression(ownerActor, options = {}) {
  SWSELogger.log(`[Follower Progression] Launching follower path for: ${ownerActor.name}`);

  if (!ownerActor) {
    ui?.notifications?.error?.('No owner provided to follower progression launcher.');
    SWSELogger.error('[Follower Progression] No owner actor provided');
    return;
  }

  if (ownerActor.type !== 'character') {
    ui?.notifications?.error?.('Followers can only be created for character actors.');
    SWSELogger.error('[Follower Progression] Non-character owner');
    return;
  }

  try {
    // Import follower helpers
    const { getAvailableFollowerSlots } = await import(
      './adapters/follower-session-seeder.js'
    );

    // Check for available slots
    const availableSlots = getAvailableFollowerSlots(ownerActor);
    if (!availableSlots || availableSlots.length === 0) {
      ui?.notifications?.warn?.(
        `${ownerActor.name} has no available follower slots. Gain a follower-granting talent first.`
      );
      SWSELogger.warn('[Follower Progression] No available slots for owner');
      return;
    }

    SWSELogger.log(
      `[Follower Progression] Found ${availableSlots.length} available follower slots`
    );

    // Notify shell host that progression is active for follower creation
    const ownerShell = ShellRouter.getShell(ownerActor.id);
    if (ownerShell) {
      ownerShell.setSurface('progression', { source: 'follower-progression' })
        .then(() => ownerShell.render(false))
        .catch(() => {});
    }

    // Minimize owner sheet
    if (ownerActor.sheet?.rendered) {
      try {
        const pos = computeCenteredPosition(900, 950);
        ownerActor.sheet.setPosition(pos);
        SWSELogger.log('[Follower Progression] Owner sheet centered before minimize');
      } catch (posErr) {
        SWSELogger.warn('[Follower Progression] Could not center owner sheet:', posErr);
      }
      ownerActor.sheet.minimize().catch(() => {});
      SWSELogger.log('[Follower Progression] Owner sheet minimized');
    }

    // Set up dependency context for follower progression
    const dependencyContext = {
      ownerActorId: ownerActor.id,
      slotId: options.slotId || availableSlots[0].id,
      existingFollowerId: options.existingFollowerId || null
    };

    SWSELogger.log('[Follower Progression] Dependency context prepared', dependencyContext);

    // Open FollowerShell for follower creation
    // FollowerShell extends ProgressionShell and handles the 7-step follower creation flow
    const { FollowerShell } = await import('./follower-shell.js');
    const result = await FollowerShell.open(
      null, // follower actor is null (will be created/advanced)
      'follower', // mode: 'follower'
      {
        ...options,
        dependencyContext, // Pass dependency context to shell
        owner: ownerActor // Pass owner reference for convenience
      }
    );

    SWSELogger.log('[Follower Progression] Follower progression completed');
    // Return owner shell to sheet mode when follower progression completes
    ShellRouter.notifySurfaceClosed(ownerActor.id);
    return result;
  } catch (err) {
    console.error('[FOLLOWER-PROGRESSION] ❌ EXCEPTION:', err);
    console.error('[FOLLOWER-PROGRESSION] Stack:', err.stack);
    SWSELogger.error('[Follower Progression] Exception during launch:', err);
    ui?.notifications?.error?.(`Follower progression failed: ${err.message}`);
    ShellRouter.notifySurfaceClosed(ownerActor.id);
  }
}

/**
 * SWSEProgressionSplashV2 — Pre-shell blocking screen (V2 ApplicationV2)
 *
 * NOT a progression step.
 * NOT part of the step registry.
 * Plays BEFORE ProgressionShell and BLOCKS until user continues.
 *
 * Does NOT:
 * - Mutate actor data
 * - Interact with step system
 * - Use suggestion engine
 * - Perform validation
 *
 * Only purpose: Atmospheric flavor / immersion.
 * Uses Foundry V2-native ApplicationV2, not V1 Application.
 */
export class SWSEProgressionSplashV2 extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: 'swse-progression-splash',
    classes: ['swse', 'progression-splash'],
    window: {
      title: 'Character Progression Initialized',
      icon: 'fas fa-database',
      resizable: true,
      minimizable: false,
      draggable: true,
    },
    position: {
      width: 900,
      height: 600,
      top: 'center',
      left: 'center',
    },
  };

  static PARTS = {
    splash: {
      template: 'systems/foundryvtt-swse/templates/apps/progression-framework/splash.hbs',
    },
  };

  constructor(options = {}) {
    super(options);
    this.actor = options.actor;
    this.progressionOptions = options.progressionOptions || {};
  }

  async _prepareContext(options) {
    return {
      actor: this.actor,
      message: `Preparing progression for ${this.actor.name}...`,
    };
  }

  /**
   * Show splash screen and block until user continues.
   *
   * @param {Actor} actor - The actor to progress
   * @param {Object} options - Options (unused, reserved for future)
   * @returns {Promise<void>}
   */
  static async prompt(actor, options = {}) {
    return new Promise((resolve, reject) => {
      try {
        const app = new this({ actor, progressionOptions: options });
        app._resolve = resolve;
        app.render(true);
      } catch (err) {
        SWSELogger.error('[SWSEProgressionSplashV2] ERROR rendering splash:', err);
        reject(err);
      }
    });
  }

  /**
   * Render hook — trigger boot sequence.
   */
  async _onRender(context, options) {
    await super._onRender(context, options);

    // Update clock
    this._updateSystemTime();

    // Start boot sequence after brief delay (tracked so close/skip can cancel it)
    if (!this._bootStarted) {
      clearTimeout(this._bootKickoffTimeout);
      this._bootKickoffTimeout = setTimeout(() => this._startBootSequence(), 400);
    }
  }

  /**
   * Start the boot sequence animation with continuous loading bar fill.
   * Bar fills from 0→100 once across the entire sequence (not reset per stage).
   */
  _startBootSequence() {
    if (this._bootStarted) return;
    this._bootStarted = true;

    const surface = this.element.querySelector('.prog-intro-surface');
    if (!surface) return;

    // Fade in surface
    surface.style.opacity = '0';
    surface.style.transition = 'opacity 400ms ease-out';
    surface.offsetHeight;
    surface.style.opacity = '1';

    this._bootTimeouts ??= [];

    // Boot sequence with continuous progress bar targets
    // Format: [English source text, state, targetPercent]
    // Pacing: each stage advances bar smoothly, reaching target by stage end
    const bootSequence = [
      ['Loading Versafunction Datapad...', 'processing', 15],   // 0→15%
      ['Initializing...', 'processing', 35],                    // 15→35%
      ['New User Detected...', 'processing', 55],               // 35→55%
      ['Creating Profile...', 'processing', 72],                // 55→72%
      ['⚠ Non-Basic Language Detected...', 'warning', 88],      // 72→88%
      ['Translating...', 'processing', 100],                    // 88→100%
    ];

    // Track all timeouts
    const setTimeout_ = (fn, delay) => {
      const id = setTimeout(fn, delay);
      this._bootTimeouts.push(id);
      return id;
    };

    // Play boot sequence with continuous progress bar
    bootSequence.forEach((stage, idx) => {
      const [message, state, targetPercent] = stage;
      setTimeout_(() => this._showBootMessage(message, state, targetPercent), 600 + (idx * 1800));
    });

    // After all boot messages complete + brief hold, handle translation
    // 6 stages * 1800ms = 10800ms, plus initial 600ms delay = 11400ms total
    setTimeout_(() => this._handleTranslationMoment(), 11400);
  }

  /**
   * Show a single boot message and continue animating loading bar toward target.
   * Bar continuously fills from current position to target position (never resets).
   */
  _showBootMessage(aurabeshText, stateClass, targetPercent) {
    const messageElem = this.element.querySelector('#current-message');
    const loadingFill = this.element.querySelector('#loading-fill');
    const loadingPercent = this.element.querySelector('#loading-percent');

    if (!messageElem || !loadingFill || !loadingPercent) return;

    // Update message
    messageElem.textContent = aurabeshText;
    messageElem.classList.remove('boot-message-current--processing', 'boot-message-current--warning', 'boot-message-current--success');
    messageElem.classList.add('boot-message-current--' + stateClass, 'visible');

    // Get current bar progress
    const currentWidth = loadingFill.style.width;
    const currentPercent = currentWidth ? parseFloat(currentWidth) : 0;

    // Animate bar from current position to target position over this stage duration
    const duration = 1800; // Match boot sequence stage spacing
    const startTime = Date.now();
    const progressDelta = targetPercent - currentPercent;

    const animateProgress = () => {
      const elapsed = Date.now() - startTime;
      const ratio = Math.min(elapsed / duration, 1);
      const newProgress = currentPercent + (progressDelta * ratio);

      loadingFill.style.width = newProgress + '%';
      loadingPercent.textContent = Math.floor(newProgress) + '%';

      if (ratio < 1) {
        this._bootTimeouts.push(requestAnimationFrame(animateProgress));
      } else {
        // Ensure exact target is set
        loadingFill.style.width = targetPercent + '%';
        loadingPercent.textContent = targetPercent + '%';
      }
    };

    animateProgress();

    // Update signal bars based on target progress
    const stageProgress = targetPercent / 100;
    this._updateSignalProgress(stageProgress);
  }

  /**
   * Update signal bar visualization.
   */
  _updateSignalProgress(progress) {
    const signalBars = this.element.querySelectorAll('#signal-bars .prog-intro-signal__bar');
    const activeBars = Math.ceil(signalBars.length * progress);
    signalBars.forEach((bar, idx) => {
      if (idx < activeBars) {
        bar.classList.add('signal-bar-active');
      } else {
        bar.classList.remove('signal-bar-active');
      }
    });
  }

  /**
   * Handle the translation moment — Aurabesh glitches into readable English.
   */
  async _handleTranslationMoment() {
    const messageElem = this.element.querySelector('#current-message');
    const loadingFill = this.element.querySelector('#loading-fill');
    const loadingPercent = this.element.querySelector('#loading-percent');
    const translationResult = this.element.querySelector('#translation-result');
    const finalState = this.element.querySelector('#final-state');
    const footerArea = this.element.querySelector('#footer-area');

    if (!messageElem || !loadingFill) return;

    // Brief pause before translation glitch
    await new Promise(resolve => this._bootTimeouts.push(setTimeout(resolve, 400)));

    // Trigger glitch effect on current message
    messageElem.classList.add('translation-glitch');

    // Wait for glitch to settle
    await new Promise(resolve => this._bootTimeouts.push(setTimeout(resolve, 400)));

    // Hide message area, show translation result
    messageElem.parentElement.style.opacity = '0';
    messageElem.parentElement.style.transition = 'opacity 300ms ease-out';

    await new Promise(resolve => this._bootTimeouts.push(setTimeout(resolve, 300)));

    // Finish loading bar
    loadingFill.style.width = '100%';
    loadingPercent.textContent = '100%';

    // Show translation result in English with character-by-character reveal
    if (translationResult) {
      translationResult.style.display = 'block';
      translationResult.innerHTML = `
        <div class="translation-glitch" style="text-align: center;">
          <div class="prog-intro-label prog-intro-label--success" style="margin-bottom: 8px;">
            <span id="translation-label-text"></span>
          </div>
          <div style="font-size: 13px; color: rgba(100, 220, 255, 0.95); font-family: 'Courier New', monospace;">
            <span id="translation-detail-text"></span>
          </div>
        </div>
      `;
      translationResult.style.opacity = '1';

      // Character-by-character reveal from left to right
      const labelText = '✓ TRANSLATION COMPLETE';
      const detailText = 'Classification System Initialized';
      const labelSpan = translationResult.querySelector('#translation-label-text');
      const detailSpan = translationResult.querySelector('#translation-detail-text');

      // Reveal label first
      for (let i = 0; i < labelText.length; i++) {
        await new Promise(resolve => this._bootTimeouts.push(setTimeout(() => {
          labelSpan.textContent += labelText[i];
          resolve();
        }, 30)));
      }

      // Brief pause between lines
      await new Promise(resolve => this._bootTimeouts.push(setTimeout(resolve, 100)));

      // Reveal detail text
      for (let i = 0; i < detailText.length; i++) {
        await new Promise(resolve => this._bootTimeouts.push(setTimeout(() => {
          detailSpan.textContent += detailText[i];
          resolve();
        }, 20)));
      }
    }

    // Wait for translation to settle
    await new Promise(resolve => this._bootTimeouts.push(setTimeout(resolve, 400)));

    // Show final state with identity block
    if (finalState) {
      finalState.style.display = 'block';
      finalState.style.opacity = '0';
      finalState.style.transition = 'opacity 400ms ease-out';
      finalState.offsetHeight;
      finalState.style.opacity = '1';
    }

    // Attempt to load mentor presence if available
    this._tryLoadMentorPresence();

    // Wait for identity to settle
    await new Promise(resolve => this._bootTimeouts.push(setTimeout(resolve, 400)));

    // Show continue button
    if (footerArea) {
      footerArea.style.display = 'flex';
      footerArea.style.opacity = '0';
      footerArea.style.transition = 'opacity 400ms ease-out, transform 400ms ease-out';
      footerArea.style.transform = 'scale(0.95)';
      footerArea.offsetHeight;
      footerArea.style.opacity = '1';
      footerArea.style.transform = 'scale(1)';

      // Attach button click handler when it becomes visible
      const continueBtn = footerArea.querySelector('[data-action="continue"]');
      if (continueBtn) {
        // Remove any existing listeners (in case)
        const clonedBtn = continueBtn.cloneNode(true);
        continueBtn.parentNode.replaceChild(clonedBtn, continueBtn);

        // Attach new listener
        clonedBtn.addEventListener('click', async (e) => {
          e.preventDefault();
          e.stopPropagation();
          await this._proceedToSpecies();
        });
      }
    }
  }

  /**
   * Try to load mentor presence/guidance if system is available.
   * Falls back gracefully if not.
   */
  _tryLoadMentorPresence() {
    const mentorStatus = this.element.querySelector('#mentor-status');
    if (!mentorStatus) return;

    try {
      // Check if mentor system is available
      // This is a light touch — just checking if the system exists, not building one
      if (window.game && window.game.swse && window.game.swse.mentorSystem) {
        // Mentor system exists, mark as connected
        mentorStatus.textContent = 'Mentor Link: ACTIVE';
        mentorStatus.style.color = 'rgba(100, 255, 140, 0.8)';
      } else {
        // Mentor not available, keep default
        mentorStatus.textContent = 'Mentor Link: AVAILABLE';
        mentorStatus.style.opacity = '0.7';
      }
    } catch (err) {
      // Fail gracefully — mentor presence is optional flavor
      SWSELogger.debug('[SWSEProgressionSplashV2] Mentor system check skipped:', err.message);
      mentorStatus.textContent = 'Mentor Link: STANDBY';
      mentorStatus.style.opacity = '0.5';
    }
  }

  /**
   * Update system time display in header.
   */
  _updateSystemTime() {
    const timeElem = this.element.querySelector('#sys-time');
    if (timeElem) {
      const updateClock = () => {
        const now = new Date();
        const time = [
          String(now.getHours()).padStart(2, '0'),
          String(now.getMinutes()).padStart(2, '0'),
          String(now.getSeconds()).padStart(2, '0'),
        ].join(':');
        timeElem.textContent = time;
      };
      updateClock();
      clearInterval(this._clockInterval);
      this._clockInterval = setInterval(updateClock, 1000);
    }
  }

  /**
   * Attach event listeners using V2-native patterns.
   * Foundry V2 ApplicationV2 passes the raw DOM element, not jQuery.
   */
  _attachFrameListeners() {
    super._attachFrameListeners();

    // Click anywhere on splash panel during boot to skip to continue button
    const splashPanel = this.element.querySelector('.prog-intro-panel');
    if (splashPanel) {
      splashPanel.addEventListener('click', async (e) => {
        // Ignore clicks on buttons or interactive elements
        if (e.target.closest('button') || e.target.closest('[data-action]')) {
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        SWSELogger.log('[SWSEProgressionSplashV2] Splash clicked → skipping boot animation');
        await this._skipBootAnimation();
      });
      splashPanel.style.cursor = 'pointer';
    }

    // Continue button — advances to Species selection (fallback listener)
    const continueBtn = this.element.querySelector('[data-action="continue"]');
    if (continueBtn) {
      continueBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        SWSELogger.log('[SWSEProgressionSplashV2] Continue button clicked');
        await this._proceedToSpecies();
      });
    } else {
      SWSELogger.warn('[SWSEProgressionSplashV2] Continue button not found in initial render');
    }

    // Escape to skip boot animation
    this.element.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        this._skipBootAnimation();
      }
    });
  }

  /**
   * Skip boot animation and jump to continue button.
   * Called when user clicks splash panel or presses Escape during boot.
   */
  async _skipBootAnimation() {
    try {
      SWSELogger.log('[SWSEProgressionSplashV2] Skipping boot animation → showing continue button');

      // Cancel all pending boot animations/timeouts
      if (this._bootTimeouts && Array.isArray(this._bootTimeouts)) {
        for (const timeoutId of this._bootTimeouts) {
          clearTimeout(timeoutId);
          cancelAnimationFrame(timeoutId);
        }
        this._bootTimeouts ??= [];
      }

      // Jump progress bar to 100%
      const loadingFill = this.element.querySelector('#loading-fill');
      const loadingPercent = this.element.querySelector('#loading-percent');
      if (loadingFill) loadingFill.style.width = '100%';
      if (loadingPercent) loadingPercent.textContent = '100%';

      // Show translation result (completion text)
      const translationResult = this.element.querySelector('#translation-result');
      if (translationResult) {
        translationResult.style.display = 'block';
        translationResult.innerHTML = `
          <div class="translation-glitch" style="text-align: center;">
            <div class="prog-intro-label prog-intro-label--success" style="margin-bottom: 8px;">
              ✓ TRANSLATION COMPLETE
            </div>
            <div style="font-size: 13px; color: rgba(100, 220, 255, 0.95); font-family: 'Courier New', monospace;">
              Classification System Initialized
            </div>
          </div>
        `;
        translationResult.style.opacity = '1';
      }

      // Show final state (identity block)
      const finalState = this.element.querySelector('#final-state');
      if (finalState) {
        finalState.style.display = 'block';
        finalState.style.opacity = '1';
      }

      // Show continue button
      const footerArea = this.element.querySelector('#footer-area');
      if (footerArea) {
        footerArea.style.display = 'flex';
        footerArea.style.opacity = '1';
      }

      // Hide boot message area
      const messageArea = this.element.querySelector('#boot-message-area');
      if (messageArea) {
        messageArea.style.opacity = '0';
      }
    } catch (err) {
      SWSELogger.error('[SWSEProgressionSplashV2] Error skipping boot animation:', err);
    }
  }

  /**
   * Proceed to Species selection by opening the progression shell at the species step.
   * This opens the shell in a way that preserves continuous experience.
   */
  async _proceedToSpecies() {
    try {
      SWSELogger.log('[SWSEProgressionSplashV2] User clicked Continue → opening Species step');

      // Open ChargenShell at intro (step 0) — single-shell architecture, no step skip.
      // NOTE: SWSEProgressionSplashV2 is no longer the primary entry path (see launchProgression).
      // This method is retained for backward compatibility only.
      if (this.actor) {
        const { ChargenShell } = await import('./chargen-shell.js');
        const shell = await ChargenShell.open(this.actor);
        SWSELogger.log('[SWSEProgressionSplashV2] ChargenShell opened at intro step');

        // WINDOW AUTHORITY: Bring shell to front so it is never behind other windows
        // Foundry v13+ uses bringToFront() instead of bringToTop()
        if (typeof shell?.bringToFront === 'function') {
          shell.bringToFront();
        } else if (typeof shell?.bringToTop === 'function') {
          shell.bringToTop();
        }

        // Now close the splash — shell is already open and ready
        // Closing after shell opens ensures visual continuity
        this.close();

        // Resolve the promise with flag indicating shell was opened
        // This prevents the entry point from opening a duplicate shell
        if (this._resolve) this._resolve({ shellOpened: true });
      } else {
        SWSELogger.warn('[SWSEProgressionSplashV2] No actor available to open shell');
        if (this._resolve) this._resolve({ shellOpened: false });
      }
    } catch (err) {
      SWSELogger.error('[SWSEProgressionSplashV2] Error proceeding to species:', err);
      // Resolve anyway so entry point can handle fallback
      if (this._resolve) this._resolve({ shellOpened: false });
    }
  }

  /**
   * On close, cleanup all timers/intervals and ensure resolve is called.
   */
  async _onClose(options) {
    // Clean up clock interval
    if (this._clockInterval) clearInterval(this._clockInterval);
    if (this._bootKickoffTimeout) clearTimeout(this._bootKickoffTimeout);

    // Clean up boot sequence timeouts and animation frames
    if (this._bootTimeouts && Array.isArray(this._bootTimeouts)) {
      this._bootTimeouts.forEach(id => {
        // Could be either setTimeout, setInterval, or requestAnimationFrame ID
        clearTimeout(id);
        clearInterval(id);
        cancelAnimationFrame(id);
      });
    }

    await super._onClose(options);
    if (this._resolve) this._resolve();
  }
}
