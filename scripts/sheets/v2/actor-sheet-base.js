import { RenderAssertions } from "/systems/foundryvtt-swse/scripts/core/render-assertions.js";
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { SWSEDialogV2 } from "/systems/foundryvtt-swse/scripts/apps/dialogs/swse-dialog-v2.js";
import { SentinelSheetGuardrails } from "/systems/foundryvtt-swse/scripts/governance/sentinel/sentinel-sheet-guardrails.js";
import { StoreSurfaceController } from "/systems/foundryvtt-swse/scripts/ui/shell/StoreSurfaceController.js";
import { SettingsSurfaceController } from "/systems/foundryvtt-swse/scripts/ui/shell/SettingsSurfaceController.js";
import { GamesSurfaceController } from "/systems/foundryvtt-swse/scripts/ui/shell/GamesSurfaceController.js";
import { HomeSurfaceController } from "/systems/foundryvtt-swse/scripts/ui/shell/HomeSurfaceController.js";
import { AlliesSurfaceController } from "/systems/foundryvtt-swse/scripts/ui/shell/AlliesSurfaceController.js";
import { MessengerSurfaceController } from "/systems/foundryvtt-swse/scripts/ui/shell/MessengerSurfaceController.js";
import { HelpModeManager } from "/systems/foundryvtt-swse/scripts/sheets/v2/HelpModeManager.js";
import { SWSERoll } from "/systems/foundryvtt-swse/scripts/combat/rolls/enhanced-rolls.js";
import { GrappleStateEngine } from "/systems/foundryvtt-swse/scripts/engine/combat/grapple-state-engine.js";
import { showRollModifiersDialog } from "/systems/foundryvtt-swse/scripts/rolls/roll-config.js";
import { SWSEActiveEffectsManager } from "/systems/foundryvtt-swse/scripts/combat/active-effects-manager.js";
import { computeCenteredPosition, getApplicationTargetSize } from "/systems/foundryvtt-swse/scripts/utils/sheet-position.js";
import { applyActorSheetModeClasses, buildActorSheetModeContext } from "/systems/foundryvtt-swse/scripts/sheets/v2/character-sheet/actor-sheet-mode.js";
import { UIStateManager } from "/systems/foundryvtt-swse/scripts/sheets/v2/shared/UIStateManager.js";
import { PanelDiagnostics } from "/systems/foundryvtt-swse/scripts/sheets/v2/shared/PanelDiagnostics.js";
import { PanelVisibilityManager } from "/systems/foundryvtt-swse/scripts/sheets/v2/PanelVisibilityManager.js";
import { SWSEPerf } from "/systems/foundryvtt-swse/scripts/utils/performance-utils.js";
import { captureHydrationSnapshot, emitHydrationWarning, getRecentHydrationMutation } from "/systems/foundryvtt-swse/scripts/utils/hydration-diagnostics.js";
import { characterSheetDiagnostics } from "/systems/foundryvtt-swse/scripts/sheets/v2/character-sheet-diagnostics.js";
import { ShellHostMixin } from "/systems/foundryvtt-swse/scripts/ui/shell/ShellHost.js";
import { ShellSurfaceState } from "/systems/foundryvtt-swse/scripts/ui/shell/ShellSurfaceState.js";
import { ShellMutationGuard } from "/systems/foundryvtt-swse/scripts/ui/shell/ShellMutationGuard.js";
import { ShellUiStatePreserver } from "/systems/foundryvtt-swse/scripts/ui/shell/ShellUiStatePreserver.js";
import { mutateAndRepaint } from "/systems/foundryvtt-swse/scripts/ui/shell/mutate-and-repaint.js";
import { ShellRouter } from "/systems/foundryvtt-swse/scripts/ui/shell/ShellRouter.js";
import { ThemeResolutionService } from "/systems/foundryvtt-swse/scripts/ui/theme/theme-resolution-service.js";

const { HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * Tablet shell scaling constants
 * Design the holopad at full concept size, then scale proportionally to fit viewport
 */
const TABLET_BASE_WIDTH = 1440;
const TABLET_BASE_HEIGHT = 900;
const TABLET_MARGIN = 24;
const TABLET_MIN_SCALE = 0.55;
const TABLET_MAX_SCALE = 1.0;
const TABLET_MIN_WIDTH = Math.round(TABLET_BASE_WIDTH * TABLET_MIN_SCALE);
const TABLET_MIN_HEIGHT = Math.round(TABLET_BASE_HEIGHT * TABLET_MIN_SCALE);

/**
 * Debounce utility: delays function execution until N ms have passed without new calls
 * Used to prevent keystroke spam in form submissions
 */
function debounce(fn, ms = 500) {
  let timer = null;
  return function debounced(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(this, args);
    }, ms);
  };
}

const SHEET_MODE_STORAGE_PREFIX = 'swse.sheetMode';

function getSheetModeStorageKey(actor) {
  return `${SHEET_MODE_STORAGE_PREFIX}.${actor?.id || actor?.uuid || 'unknown'}`;
}

function getStoredSheetMode(actor) {
  try {
    const stored = globalThis.localStorage?.getItem?.(getSheetModeStorageKey(actor));
    return stored === 'edit' ? 'edit' : 'play';
  } catch (_err) {
    return 'play';
  }
}

/**
 * Exported so character-sheet.js (SWSEV2CharacterSheet) can persist the
 * play/edit toggle from its own non-vehicle listener wiring; vehicles do not
 * currently expose this toggle, matching pre-split behavior.
 */
export function setStoredSheetMode(actor, mode) {
  try {
    globalThis.localStorage?.setItem?.(getSheetModeStorageKey(actor), mode === 'edit' ? 'edit' : 'play');
  } catch (_err) {
    // localStorage may be unavailable in some embedded contexts; mode still works for this render.
  }
}

/**
 * Exported for reuse by character-sheet.js, which also calls this directly
 * from non-shared (character/npc/droid-only) listener-wiring code.
 */
export function canUseActorSheetEditControls(sheet, actor) {
  return game?.user?.isGM === true
    || actor?.isOwner === true
    || actor?.testUserPermission?.(game?.user, 'OWNER') === true
    || sheet?.isEditable !== false;
}

/**
 * Exported for reuse by character-sheet.js, which also calls this directly
 * from its own (non-shared) sheet-mode toggle listener.
 */
export function applySheetInteractionMode(root, mode = 'play') {
  if (!root) return;
  const normalizedMode = mode === 'edit' ? 'edit' : 'play';
  root.classList.toggle('swse-sheet-mode--edit', normalizedMode === 'edit');
  root.classList.toggle('swse-sheet-mode--play', normalizedMode !== 'edit');
  root.dataset.sheetInteractionMode = normalizedMode;

  root.querySelectorAll('[data-action="toggle-sheet-mode"]').forEach((button) => {
    button.dataset.mode = normalizedMode;
    button.setAttribute('aria-pressed', normalizedMode === 'edit' ? 'true' : 'false');
    const label = button.querySelector('.swse-sheet-mode-toggle__label') || button;
    label.textContent = normalizedMode === 'edit' ? 'Edit Mode' : 'Play Mode';
    button.title = normalizedMode === 'edit'
      ? 'Edit Mode is active. Click to return to Play Mode.'
      : 'Play Mode is active. Click to expose editable datapad controls.';
  });
}

/**
 * SWSEV2ActorSheetBase
 *
 * Phase 4 sheet-architecture separation: this class holds the ApplicationV2
 * lifecycle plumbing, Shell Host surface-routing API, tablet/window chrome,
 * and action-economy chain shared by every SWSE V2 actor sheet (character,
 * npc, droid, vehicle). It was extracted verbatim from the former monolithic
 * SWSEV2CharacterSheet (scripts/sheets/v2/character-sheet.js) -- method
 * bodies were moved as-is, not rewritten. See that file's SWSEV2CharacterSheet
 * class and the new SWSEV2VehicleSheet class (vehicle-actor-sheet.js) for the
 * actor-type-specific behavior that plugs into this base via the
 * _onRenderActorSheet / _prepareContextForActorSheet overridable hooks.
 */
export class SWSEV2ActorSheetBase extends
  ShellHostMixin(HandlebarsApplicationMixin(foundry.applications.sheets.ActorSheetV2)) {

  static DEFAULT_OPTIONS = {
    ...super.DEFAULT_OPTIONS,
    classes: ["application", "swse", "sheet", "actor", "character", "swse-character-sheet", "swse-character-sheet-form-root", "swse-sheet", "swse-sheet-ui", "swse-sheet--concept", "v2"],
    // Foundry V13 ApplicationV2 seals its internal position object and only
    // accepts core position keys here.  Legacy minWidth/minHeight keys crash
    // during ApplicationV2 construction, so minimum sizing is applied in
    // _applyTabletMinimumSize() after the element exists.
    position: {
      width: TABLET_BASE_WIDTH,
      height: TABLET_BASE_HEIGHT
    },
    window: {
      resizable: true,
      draggable: true,
      frame: false
    },
    form: {
      closeOnSubmit: false,
      submitOnChange: false
    },
    // The concept sheet owns tab switching through UIStateManager. Foundry's
    // native ApplicationV2 tab binder expects a classic .window-content frame,
    // which this frameless datapad deliberately does not render. Leaving this
    // empty prevents native _onClickTab from throwing "No matching tab" while
    // preserving the custom data-action="sheet-tab" behavior.
    tabs: []
  };

  static PARTS = {
    ...super.PARTS,
    body: {
      template: "systems/foundryvtt-swse/templates/actors/character/v2-concept/character-sheet.hbs"
    }
  };

  static _sanitizeApplicationV2Options(options = {}) {
    const position = options?.position;
    if (!position || !("minWidth" in position || "minHeight" in position)) {
      return options;
    }

    const { minWidth, minHeight, ...safePosition } = position;
    return {
      ...options,
      position: safePosition
    };
  }

  constructor(document, options = {}) {
    super(document, SWSEV2ActorSheetBase._sanitizeApplicationV2Options(options));
    // Track sheet instance for Sentinel monitoring. Uses the concrete
    // subclass name (e.g. "SWSEV2CharacterSheet" or "SWSEV2VehicleSheet") so
    // Sentinel diagnostics group instances by their actual sheet class,
    // rather than every actor type reporting under a single hardcoded label.
    SentinelSheetGuardrails.trackSheetInstance(this.constructor.name);

    // Render loop prevention guard (same pattern as ProgressionShell)
    // Hardening: do not drop legitimate mutation-triggered renders; queue one follow-up render.
    this._isRendering = false;
    this._renderCount = 0;
    this._pendingRenderArgs = null;
    this._hasQueuedRender = false;

    // Position centering tracking — initialize EARLY so first render knows this is a new open
    this._openedAt = Date.now();
    this._centerTimer = null;
    this._tabletInitialPositionApplied = false;

    // Create debounced form submission to prevent keystroke spam
    // 500ms delay: ensures multiple rapid changes batch into one update
    this._debouncedSubmit = debounce(
      (ev) => this._onSubmitForm(ev),
      500
    );

    // ═══ Phase 6: Operational Hardening ═══
    // Initialize UI state manager for preserving interactive state across rerenders
    this.uiStateManager = new UIStateManager(this);

    // Initialize panel diagnostics for performance tracking and debugging
    this.panelDiagnostics = new PanelDiagnostics();

    // Initialize visibility manager for lazy panel building
    this.visibilityManager = new PanelVisibilityManager(this);

    // Display-only panel view-model cache.  This caches normalized render
    // contexts, never authoritative actor/item data.  It is invalidated by
    // compact actor/item revision signatures so repeated UI-only renders can
    // reuse heavy panel rows without changing gameplay state.
    this._panelViewModelCache = new Map();
    this._panelViewModelCacheOrder = [];

    // Phase 9: Tier-aware help system (per-character, persisted)
    // Initialize from actor flags or default to CORE
    this._helpLevel = HelpModeManager.initializeForActor(document);

    // ─── Phase 11: Shell Host State ────────────────────────────────────────
    // Active surface: 'sheet' | 'home' | 'progression' | 'chargen' | 'upgrade' | 'settings' | 'mentor'
    this._shellSurface = 'home';
    this._shellSurfaceOptions = {};
    this._homeRenderGuard = {
      starts: [],
      suppressUntil: 0,
      delayedRender: null,
      lastRequestKey: '',
      lastRequestAt: 0,
      warnedAt: 0
    };
    // Same reasoning as the Sentinel tracking call above: label by the
    // concrete subclass so guard diagnostics identify the real sheet class.
    ShellMutationGuard.install(this, { label: this.constructor.name, logger: swseLogger });
    this._shellUiStatePreserver = ShellUiStatePreserver.install(this, { logger: swseLogger });
    this._shellSurfaceState = new ShellSurfaceState({ home: this._shellSurfaceOptions });
    this._shellRenderPromise = null;
    this._shellOverlay = null;
    this._shellDrawer = null;
    this._shellModal = null;
    this._shellRouterRegistered = false; // Guard to register only once per session

    // ─── Alpha v1: Force Power Execution Disabled ────────────────────────────
    // Force power execution is live. Buttons route through ForceExecutor.
    this.forcePowerExecutionEnabled = true;
  }

  _shouldSuppressHomeRender(args = []) {
    if (this._shellSurface !== 'home') return false;
    const isSoftRender = args.length === 0 || args[0] === false || args[0] == null;
    if (!isSoftRender) return false;

    const guard = this._homeRenderGuard ??= { starts: [], suppressUntil: 0, delayedRender: null, lastRequestKey: '', lastRequestAt: 0, warnedAt: 0 };
    const now = Date.now();
    guard.starts = (guard.starts || []).filter(ts => now - ts < 1800);

    if (now < Number(guard.suppressUntil || 0)) {
      if (!guard.delayedRender) {
        guard.delayedRender = window.setTimeout(() => {
          guard.delayedRender = null;
          if (this.rendered && this._shellSurface === 'home') {
            void this.requestSurfaceRender({ reason: 'home-render-storm-recovery', surfaceId: 'home' });
          }
        }, Math.max(120, Number(guard.suppressUntil || 0) - now));
      }
      return true;
    }

    if (guard.starts.length >= 12) {
      guard.suppressUntil = now + 900;
      if (now - Number(guard.warnedAt || 0) > 5000) {
        guard.warnedAt = now;
        swseLogger.warn('[SWSEV2CharacterSheet] Suppressed a home-surface render storm; a recovery render will run after the storm window.', {
          actorId: this.actor?.id,
          actorName: this.actor?.name,
          recentHomeRenders: guard.starts.length
        });
      }
      return true;
    }

    return false;
  }

  // ═══ AUDIT INSTRUMENTATION + RENDER GUARD ═══
  async render(...args) {
    if (this._shouldSuppressHomeRender(args)) return this;

    // Render loop prevention: queue one follow-up render instead of dropping
    // legitimate mutation-driven rerenders while the sheet is still painting.
    if (this._isRendering) {
      this._pendingRenderArgs = args;
      this._hasQueuedRender = true;
      SWSEPerf.mark('CharacterSheet.render queued while rendering', {
        actorId: this.actor?.id,
        actorName: this.actor?.name,
        shellSurface: this._shellSurface,
        args
      });
      if (SWSEPerf.enabled()) {
        console.warn("[SWSEV2CharacterSheet] ⚠️ Render called while already rendering — QUEUED follow-up render");
      }
      const recentHydrationMutation = getRecentHydrationMutation(this);
      if (recentHydrationMutation) {
        emitHydrationWarning('SHEET_RENDER_QUEUED', {
          actorId: this.actor?.id,
          actorName: this.actor?.name,
          mutation: recentHydrationMutation,
          snapshot: captureHydrationSnapshot(this.actor)
        });
      }
      return this;
    }

    this._isRendering = true;
    this._renderCount++;
    const renderReason = this.__swseShellRenderReason || this.__swseRenderReason || (args?.[0] === true ? 'forced-render' : 'render');
    const renderTimer = SWSEPerf.start('CharacterSheet.render', {
      actorId: this.actor?.id,
      actorName: this.actor?.name,
      actorType: this.actor?.type,
      surface: this._shellSurface,
      reason: renderReason,
      renderCount: this._renderCount
    });

    try {
      // Phase 6: Capture UI state before rerender so it can be restored after
      this.uiStateManager.captureState();
      this._shellUiStatePreserver?.capture?.(this.element, {
        surfaceId: this._shellSurface,
        reason: this.__swseShellRenderReason || 'character-sheet-render'
      });

      // swseLogger.debug(`[SWSEV2CharacterSheet] RENDER START (#${this._renderCount}) position:`, this.position);
      return await super.render(...args);
      // swseLogger.debug(`[SWSEV2CharacterSheet] RENDER COMPLETE (#${this._renderCount}) position:`, this.position);
    } finally {
      renderTimer.end({ queuedFollowup: this._hasQueuedRender === true });
      this._isRendering = false;

      if (this._hasQueuedRender) {
        const queuedArgs = this._pendingRenderArgs ?? args;
        this._hasQueuedRender = false;
        this._pendingRenderArgs = null;
        queueMicrotask(() => this.render(...queuedArgs));
      }
    }
  }

  // ─── Phase 11: Shell Host API ─────────────────────────────────────────────

  /** @returns {string} Active surface ID */
  get shellSurface() { return this._shellSurface; }
  get shellSurfaceOptions() { return this._shellSurfaceOptions; }

  _ensureShellSurfaceState() {
    if (!this._shellSurfaceState) {
      this._shellSurfaceState = new ShellSurfaceState({
        [this._shellSurface || 'home']: this._shellSurfaceOptions || {}
      });
    }
    return this._shellSurfaceState;
  }

  getSurfaceState(surfaceId = this._shellSurface) {
    return this._ensureShellSurfaceState().get(surfaceId);
  }

  patchSurfaceState(surfaceId = this._shellSurface, patch = {}, { render = false, reason = 'surface-state-patch' } = {}) {
    const next = this._ensureShellSurfaceState().patch(surfaceId, patch);
    if (surfaceId === this._shellSurface) {
      ShellMutationGuard.withSurfaceOptionsMutation(this, () => { this._shellSurfaceOptions = next; });
    }
    if (render) void this.requestSurfaceRender({ reason, surfaceId });
    return next;
  }

  patchSurfaceOptions(patch = {}, options = {}) {
    return this.patchSurfaceState(this._shellSurface, patch, options);
  }

  requestSurfaceRender({ reason = 'surface-render', surfaceId = this._shellSurface, preserveUi = true } = {}) {
    const guard = this._homeRenderGuard ??= { starts: [], suppressUntil: 0, delayedRender: null, lastRequestKey: '', lastRequestAt: 0, warnedAt: 0 };
    const now = Date.now();
    const requestKey = `${surfaceId || this._shellSurface}:${reason || 'surface-render'}`;
    if ((surfaceId || this._shellSurface) === 'home' && guard.lastRequestKey === requestKey && now - Number(guard.lastRequestAt || 0) < 80) {
      return this._shellRenderPromise || Promise.resolve(this);
    }
    guard.lastRequestKey = requestKey;
    guard.lastRequestAt = now;

    if (this._shellRenderPromise) {
      if (preserveUi) this._shellUiStatePreserver?.capture?.(this.element, { surfaceId, reason: `${reason}:coalesced-before-render` });
      return this._shellRenderPromise;
    }
    this._shellRenderPromise = Promise.resolve().then(async () => {
      swseLogger.debug(`[ShellHost] requestSurfaceRender: ${surfaceId} (${reason})`);
      if (preserveUi) this._shellUiStatePreserver?.capture?.(this.element, { surfaceId, reason: `${reason}:before-render` });
      // Do not call render(false) while the sheet render guard is active; that
      // path queues a follow-up render but returns before the repaint completes.
      while (this._isRendering) {
        await new Promise(resolve => window.setTimeout(resolve, 0));
      }
      return ShellMutationGuard.withSurfaceRender(this, () => this.render(false), { reason, surfaceId });
    }).finally(() => {
      this._shellRenderPromise = null;
    });
    return this._shellRenderPromise;
  }

  /**
   * Switch to a route surface (progression | chargen | upgrade | settings | mentor | sheet).
   * Clears any active overlay/drawer.
   */
  async setSurface(surfaceId, options = {}) {
    const normalizedSurfaceId = surfaceId === 'upgrade' ? 'workbench' : surfaceId;
    const previousSurfaceId = this._shellSurface;
    swseLogger.debug(`[ShellHost] setSurface: ${this._shellSurface} → ${normalizedSurfaceId}`);
    if (previousSurfaceId === 'home' && normalizedSurfaceId !== 'home') {
      this._homeController?.destroy?.();
      this._homeController = null;
    }
    this._shellSurface = normalizedSurfaceId;
    const nextOptions = this._ensureShellSurfaceState().patch(normalizedSurfaceId, options ?? {});
    ShellMutationGuard.withSurfaceOptionsMutation(this, () => { this._shellSurfaceOptions = nextOptions; });
    this._shellOverlay = null;
    this._shellDrawer = null;
  }

  /** Return to the primary sheet surface. */
  async returnToSheet() {
    await this.setSurface('sheet');
    await this.requestSurfaceRender({ reason: 'return-to-sheet', surfaceId: 'sheet' });
  }

  /** Open an overlay above the current surface. */
  async openOverlay(overlayId, options = {}) {
    this._shellOverlay = { overlayId, options };
  }

  /** Close the current overlay. */
  async closeOverlay() {
    this._shellOverlay = null;
  }

  /** Open a drawer alongside the current surface. */
  async openDrawer(drawerId, options = {}) {
    this._shellDrawer = { drawerId, options };
  }

  /** Close the current drawer. */
  async closeDrawer() {
    this._shellDrawer = null;
  }

  /**
   * Wire shell-level navigation events after every render.
   * Handles back-to-sheet, open-home, close-overlay, close-drawer, and surface-specific events.
   */
  // signal is the render-cycle AbortController signal — all listeners are torn down on next render.
  _wireShellEvents(root, signal) {
    if (!root) return;

    // ─── Tablet Hardware Controls ──────────────────────────────────────────
    root.querySelector('[data-action="tablet-close"]')?.addEventListener('click', (ev) => {
      ev.preventDefault();
      this.close();
    }, { signal });

    root.querySelectorAll('[data-action="tablet-home"]').forEach(el => {
      el.addEventListener('click', async (ev) => {
        ev.preventDefault();
        if (this._shellSurface !== 'home') {
          await this.setSurface('home');
          await this.requestSurfaceRender({ reason: 'tablet-home', surfaceId: 'home' });
        }
      }, { signal });
    });

    root.querySelector('[data-shell-chrome="top"]')?.addEventListener('dblclick', async (ev) => {
      if (ev.target?.closest?.('button, input, select, textarea, a, [contenteditable="true"]')) return;
      ev.preventDefault();
      ev.stopPropagation();
      await this._minimizeTabletWindow();
    }, { signal });

    root.querySelectorAll('[data-action="tablet-minimize"]').forEach(el => {
      el.addEventListener('click', async (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        await this._minimizeTabletWindow();
      }, { signal });
    });

    this._wireTabletWindowDrag(root, signal);
    this._wireTabletWindowResize(root, signal);
    this._wireTabletScrollFallback(root, signal);


    root.querySelectorAll('[data-action="tablet-expand"]').forEach(el => {
      el.addEventListener('click', async (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        await this._toggleTabletExpanded();
      }, { signal });
    });

    root.querySelectorAll('[data-shell-action="return-to-sheet"]').forEach(el => {
      el.addEventListener('click', async (ev) => {
        ev.preventDefault();
        await this.returnToSheet();
      }, { signal });
    });

    root.querySelectorAll('[data-shell-action="return-to-home"]').forEach(el => {
      el.addEventListener('click', async (ev) => {
        ev.preventDefault();
        await this.setSurface('home');
        await this.requestSurfaceRender({ reason: 'return-to-home', surfaceId: 'home' });
      }, { signal });
    });

    root.querySelectorAll('[data-shell-action="close-overlay"]').forEach(el => {
      el.addEventListener('click', async (ev) => {
        ev.preventDefault();
        await this.closeOverlay();
        await this.requestSurfaceRender({ reason: 'close-overlay', surfaceId: this._shellSurface });
      }, { signal });
    });

    root.querySelectorAll('[data-shell-action="close-drawer"]').forEach(el => {
      el.addEventListener('click', async (ev) => {
        ev.preventDefault();
        await this.closeDrawer();
        await this.requestSurfaceRender({ reason: 'close-drawer', surfaceId: this._shellSurface });
      }, { signal });
    });

    // Overlay confirm/cancel callbacks
    const overlayRoot = root.querySelector('[data-shell-region="overlay"]');
    if (overlayRoot) {
      overlayRoot.querySelector('[data-shell-overlay-action="confirm"]')?.addEventListener('click', async () => {
        const onConfirm = this._shellOverlay?.options?.onConfirm;
        if (typeof onConfirm === 'function') await onConfirm().catch(() => {});
        await this.closeOverlay();
        await this.requestSurfaceRender({ reason: 'close-overlay', surfaceId: this._shellSurface });
      }, { signal });

      overlayRoot.querySelector('[data-shell-overlay-action="cancel"]')?.addEventListener('click', async () => {
        const onCancel = this._shellOverlay?.options?.onCancel;
        if (typeof onCancel === 'function') await onCancel().catch(() => {});
        await this.closeOverlay();
        await this.requestSurfaceRender({ reason: 'close-overlay', surfaceId: this._shellSurface });
      }, { signal });
    }

    root.querySelectorAll('[data-action="open-settings-app"]').forEach(el => {
      el.addEventListener('click', async (ev) => {
        ev.preventDefault();
        await this.setSurface('settings', { source: 'sheet' });
        await this.requestSurfaceRender({ reason: 'open-settings', surfaceId: 'settings' });
      }, { signal });
    });

    // Reset Character — destructive, requires confirmation
    root.querySelectorAll('[data-action="reset-character"]').forEach(el => {
      el.addEventListener('click', async (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const confirmed = await SWSEDialogV2.confirm({
          title: '⚠ Reset Character',
          content: `
            <div style="text-align:center;padding:8px 0 4px;">
              <p style="font-size:14px;font-weight:700;color:#ff6b6b;margin:0 0 8px;">
                This will reset <strong>${this.actor.name}</strong> to a blank slate.
              </p>
              <p style="font-size:12px;color:rgba(255,255,255,.65);margin:0;">
                All items, progression, skills, and history will be permanently deleted.<br>
                <strong>This cannot be undone.</strong>
              </p>
            </div>`,
          yes: () => true,
          no: () => false,
          defaultYes: false,
          options: { width: 420 }
        });
        if (!confirmed) return;
        await this._resetCharacterToBlank();
      }, { signal });
    });

    root.querySelectorAll('[data-shell-action="open-home"]').forEach(el => {
      el.addEventListener('click', async (ev) => {
        ev.preventDefault();
        await this.setSurface('home');
        await this.requestSurfaceRender({ reason: 'return-to-home', surfaceId: 'home' });
      }, { signal });
    });

    // Store splash recovery: keep this at the shell-host level as a final
    // capture-phase escape hatch. The store surface controller also owns these
    // actions, but if splash initialization races a render or stale AppV2
    // handlers miss the CTA, the shell must still be able to enter the store or
    // return home instead of trapping the user on the splash screen.
    root.addEventListener('click', async (ev) => {
      if (this._shellSurface !== 'store') return;
      const target = ev.target instanceof Element ? ev.target : null;
      if (!target) return;

      const homeTarget = target.closest('[data-action="tablet-home"], [data-shell-action="open-home"], [data-shell-action="return-to-home"]');
      if (homeTarget) {
        ev.preventDefault();
        ev.stopImmediatePropagation?.();
        await this.setSurface('home');
        await this.requestSurfaceRender({ reason: 'return-to-home', surfaceId: 'home' });
        return;
      }

      const enterTarget = target.closest('[data-action="store-splash-continue"], [data-store-splash-enter]');
      if (enterTarget) {
        ev.preventDefault();
        ev.stopImmediatePropagation?.();
        this.patchSurfaceOptions({
          enteredStore: true,
          splashComplete: true,
          currentView: 'browse',
          currentCategory: '',
          currentSubcategory: null,
          currentFamily: null,
          selectedProductId: null,
          search: '',
          availability: 'all',
          sort: 'default'
        });
        this.requestSurfaceRender({ reason: 'store-splash-enter' });
      }
    }, { signal, capture: true });

    if (this._shellSurface === 'home') {
      this._wireHomeSurfaceEvents(root, signal);
    }
    if (this._shellSurface === 'upgrade') {
      this._wireUpgradeSurfaceEvents(root, signal);
    }
    if (this._shellSurface === 'store') {
      this._storeSurfaceController ??= new StoreSurfaceController(this, this.actor);
      this._storeSurfaceController.attach(root);
    } else {
      this._storeSurfaceController?.destroy?.();
    }
    if (this._shellSurface === 'settings') {
      this._wireSettingsSurfaceEvents(root, signal);
    }
    if (this._shellSurface === 'mentor') {
      this._wireMentorSurfaceEvents(root, signal);
    }
    if (this._shellSurface === 'progression' || this._shellSurface === 'chargen') {
      this._wireProgressionSurfaceEvents(root, signal);
    }
    if (this._shellSurface === 'workbench') {
      this._wireWorkbenchSurfaceEvents(root, signal);
    }
    if (this._shellSurface === 'games') {
      this._gamesSurfaceController ??= new GamesSurfaceController(this, this.actor);
      this._gamesSurfaceController.attach(root);
    } else {
      this._gamesSurfaceController?.destroy?.();
    }
    if (this._shellSurface === 'messenger') {
      this._messengerSurfaceController ??= new MessengerSurfaceController(this, this.actor);
      this._messengerSurfaceController.setActor?.(this.actor);
      void this._messengerSurfaceController.attach(root, signal).catch((err) => {
        swseLogger.warn('[SWSEV2CharacterSheet] Messenger surface wiring failed.', err);
      });
    } else {
      this._messengerSurfaceController?.destroy?.();
    }
    if (this._shellSurface === 'allies') {
      this._alliesSurfaceController ??= new AlliesSurfaceController(this, this.actor);
      this._alliesSurfaceController.attach(root);
    } else {
      this._alliesSurfaceController?.destroy?.();
    }
    if (this._shellOverlay?.overlayId === 'upgrade-single-item') {
      this._wireUpgradeOverlayEvents(root, signal);
    }
  }

  /** Toggle the frameless datapad between its current size and the largest safe viewport fit. */
  async _toggleTabletExpanded() {
    try {
      const root = this.element;
      const appRoot = root?.closest?.('.application') || root;

      if (this._tabletExpanded) {
        const saved = this._preExpandRect;
        if (saved) {
          this.setPosition({ left: saved.left, top: saved.top, width: saved.width, height: saved.height });
          const scale = Math.max(TABLET_MIN_SCALE, Math.min(TABLET_MAX_SCALE, saved.width / TABLET_BASE_WIDTH));
          this._applyTabletSizingVars(root, scale, saved.width, saved.height);
          this._preExpandRect = null;
        } else {
          this._tabletInitialPositionApplied = false;
          this._applyTabletViewportFit();
        }
        this._tabletExpanded = false;
      } else {
        const rect = root?.getBoundingClientRect?.();
        this._preExpandRect = {
          left: Number(this.position?.left) || Math.max(0, Math.round(rect?.left || 0)),
          top: Number(this.position?.top) || Math.max(0, Math.round(rect?.top || 0)),
          width: Number(this.position?.width) || Math.max(TABLET_MIN_WIDTH, Math.round(rect?.width || TABLET_BASE_WIDTH)),
          height: Number(this.position?.height) || Math.max(TABLET_MIN_HEIGHT, Math.round(rect?.height || TABLET_BASE_HEIGHT))
        };

        const availableWidth = Math.max(TABLET_MIN_WIDTH, window.innerWidth - TABLET_MARGIN);
        const availableHeight = Math.max(TABLET_MIN_HEIGHT, window.innerHeight - TABLET_MARGIN);
        const scale = Math.max(TABLET_MIN_SCALE, Math.min(
          TABLET_MAX_SCALE,
          availableWidth / TABLET_BASE_WIDTH,
          availableHeight / TABLET_BASE_HEIGHT
        ));
        const width = Math.round(TABLET_BASE_WIDTH * scale);
        const height = Math.round(TABLET_BASE_HEIGHT * scale);
        const left = Math.max(0, Math.round((window.innerWidth - width) / 2));
        const top = Math.max(0, Math.round((window.innerHeight - height) / 2));

        this.setPosition({ width, height, left, top });
        this._applyTabletSizingVars(root, scale, width, height);
        this._tabletExpanded = true;
      }

      root?.classList?.toggle?.('swse-tablet-expanded', Boolean(this._tabletExpanded));
      appRoot?.classList?.toggle?.('swse-tablet-expanded', Boolean(this._tabletExpanded));
      root?.querySelectorAll?.('[data-action="tablet-expand"]')?.forEach(button => {
        button.setAttribute('aria-pressed', String(Boolean(this._tabletExpanded)));
        button.setAttribute('title', this._tabletExpanded ? 'Restore' : 'Expand');
        button.setAttribute('aria-label', this._tabletExpanded ? 'Restore' : 'Expand');
      });
    } catch (err) {
      swseLogger.warn('[SWSEV2CharacterSheet] Failed to toggle datapad expansion.', err);
    }
  }

  _applyTabletSizingVars(root = this.element, scale, width, height) {
    if (!root) return;
    this._applyTabletMinimumSize(root);
    root.style.setProperty('--swse-tablet-scale', String(scale));
    root.style.setProperty('--swse-tablet-base-width', TABLET_BASE_WIDTH + 'px');
    root.style.setProperty('--swse-tablet-base-height', TABLET_BASE_HEIGHT + 'px');
    root.style.setProperty('--swse-tablet-scaled-width', `${width}px`);
    root.style.setProperty('--swse-tablet-scaled-height', `${height}px`);
  }

  /** Minimize the frameless datapad from its custom top bezel. */
  async _minimizeTabletWindow() {
    try {
      if (typeof this.minimize === 'function') {
        await this.minimize();
        return;
      }

      const appRoot = this.element?.closest?.('.application') || this.element;
      const nativeMinimize = appRoot?.querySelector?.('[data-action="minimize"], .window-header .header-button.minimize');
      if (nativeMinimize) {
        nativeMinimize.click();
        return;
      }

      swseLogger.warn('[SWSEV2CharacterSheet] Minimize requested, but no ApplicationV2 minimize handler was available.');
    } catch (err) {
      swseLogger.warn('[SWSEV2CharacterSheet] Failed to minimize datapad shell.', err);
    }
  }

  /**
   * Frameless tablet drag support.
   *
   * Foundry can only drag by its native header; this sheet hides that chrome.
   * Drag must therefore be owned by the metal bezel itself, not by the screen
   * content.  The listener is delegated from the shell so it still works if the
   * visual drag rail is covered or the tablet skin changes.
   */
  _wireTabletWindowDrag(root, signal) {
    const shell = root.querySelector('.swse-sheet-v2-shell--concept');
    if (!shell) return;

    const isInteractiveTarget = (target) => !!target?.closest?.(
      'button, input, select, textarea, a, [contenteditable="true"], [data-route-id], [data-shell-action], [data-upgrade-action], [data-action]:not([data-action="tablet-drag"])'
    );

    const isBezelDragTarget = (target) => {
      if (!target?.closest) return false;
      if (target.closest('[data-action="tablet-drag"]')) return true;
      if (!target.closest('.swse-sheet-v2-shell--concept')) return false;
      // The screen owns clicks and scroll. Only the exposed metal shell/bezel moves the window.
      return !target.closest('.swse-v2-screen--concept');
    };

    shell.addEventListener('pointerdown', (ev) => {
      if (ev.button !== 0) return;
      if (isInteractiveTarget(ev.target)) return;
      if (!isBezelDragTarget(ev.target)) return;

      if (ev.detail >= 2) {
        ev.preventDefault();
        void this._minimizeTabletWindow();
        return;
      }

      ev.preventDefault();
      shell.setPointerCapture?.(ev.pointerId);
      shell.classList.add('is-window-dragging');

      const startX = ev.clientX;
      const startY = ev.clientY;
      const rect = root.getBoundingClientRect();
      const startLeft = Number.isFinite(Number(this.position?.left)) ? Number(this.position.left) : rect.left;
      const startTop = Number.isFinite(Number(this.position?.top)) ? Number(this.position.top) : rect.top;

      const onMove = (moveEv) => {
        moveEv.preventDefault();
        this.setPosition({
          left: startLeft + moveEv.clientX - startX,
          top: startTop + moveEv.clientY - startY
        });
      };

      const onEnd = (upEv) => {
        shell.releasePointerCapture?.(upEv.pointerId);
        shell.classList.remove('is-window-dragging');
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onEnd);
        window.removeEventListener('pointercancel', onEnd);
      };

      window.addEventListener('pointermove', onMove, { signal });
      window.addEventListener('pointerup', onEnd, { once: true, signal });
      window.addEventListener('pointercancel', onEnd, { once: true, signal });
    }, { signal });
  }


  /**
   * Frameless tablet resize support.
   *
   * Foundry's native resize grip is not rendered when this ActorSheetV2 runs
   * frame:false.  The metallic shell therefore exposes its own lower-right grip
   * and forwards pointer movement to ApplicationV2#setPosition().
   */
  _wireTabletWindowResize(root, signal) {
    const handles = root.querySelectorAll('[data-action="tablet-resize"]');
    if (!handles.length) return;

    const clamp = (value, min, max) => Math.min(Math.max(value, min), Math.max(min, max));

    const beginResize = (ev, handle) => {
      if (ev.button !== 0) return;
      ev.preventDefault();
      ev.stopPropagation();

      const dir = String(handle.dataset.resizeDir || 'se').toLowerCase();
      const resizeWest = dir.includes('w');
      const resizeEast = dir.includes('e') || (!resizeWest && !dir.includes('n') && !dir.includes('s'));
      const resizeNorth = dir.includes('n');
      const resizeSouth = dir.includes('s') || (!resizeNorth && !dir.includes('e') && !dir.includes('w'));

      handle.setPointerCapture?.(ev.pointerId);
      root.classList.add('is-window-resizing', `is-window-resizing--${dir}`);

      const startX = ev.clientX;
      const startY = ev.clientY;
      const rect = root.getBoundingClientRect();
      const startWidth = rect.width || Number(this.position?.width) || TABLET_BASE_WIDTH;
      const startHeight = rect.height || Number(this.position?.height) || TABLET_BASE_HEIGHT;
      const startLeft = Number.isFinite(Number(this.position?.left)) ? Number(this.position.left) : rect.left;
      const startTop = Number.isFinite(Number(this.position?.top)) ? Number(this.position.top) : rect.top;
      const startRight = startLeft + startWidth;
      const startBottom = startTop + startHeight;

      const minWidth = TABLET_MIN_WIDTH;
      const minHeight = TABLET_MIN_HEIGHT;
      const viewportInset = 8;

      const onMove = (moveEv) => {
        moveEv.preventDefault();

        const dx = moveEv.clientX - startX;
        const dy = moveEv.clientY - startY;
        let left = startLeft;
        let top = startTop;
        let width = startWidth;
        let height = startHeight;

        if (resizeEast) {
          const maxWidth = Math.max(minWidth, window.innerWidth - startLeft - viewportInset);
          width = clamp(startWidth + dx, minWidth, maxWidth);
        }

        if (resizeSouth) {
          const maxHeight = Math.max(minHeight, window.innerHeight - startTop - viewportInset);
          height = clamp(startHeight + dy, minHeight, maxHeight);
        }

        if (resizeWest) {
          const proposedLeft = clamp(startLeft + dx, viewportInset, startRight - minWidth);
          left = proposedLeft;
          width = clamp(startRight - proposedLeft, minWidth, Math.max(minWidth, startRight - viewportInset));
        }

        if (resizeNorth) {
          const proposedTop = clamp(startTop + dy, viewportInset, startBottom - minHeight);
          top = proposedTop;
          height = clamp(startBottom - proposedTop, minHeight, Math.max(minHeight, startBottom - viewportInset));
        }

        this._tabletExpanded = false;
        this.setPosition({ left, top, width, height });
        root.style.setProperty('--swse-tablet-scaled-width', `${Math.round(width)}px`);
        root.style.setProperty('--swse-tablet-scaled-height', `${Math.round(height)}px`);
      };

      const onEnd = (upEv) => {
        handle.releasePointerCapture?.(upEv.pointerId);
        root.classList.remove('is-window-resizing', `is-window-resizing--${dir}`);
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onEnd);
        window.removeEventListener('pointercancel', onEnd);
      };

      window.addEventListener('pointermove', onMove, { signal });
      window.addEventListener('pointerup', onEnd, { once: true, signal });
      window.addEventListener('pointercancel', onEnd, { once: true, signal });
    };

    handles.forEach(handle => {
      handle.addEventListener('pointerdown', (ev) => beginResize(ev, handle), { signal });
    });
  }


  /**
   * Wheel fallback for the frameless tablet display.
   *
   * Foundry's game body is fixed/overflow-hidden, and this sheet has no native
   * .window-content scroller. The actual scroll owner is the datapad screen.
   * Some nested panes mark themselves overflow-hidden, so wheel events can feel
   * dead even when the screen should scroll. Route wheel deltas to the nearest
   * scrollable shell surface, then to the screen itself.
   */
  _wireTabletScrollFallback(root, signal) {
    const screen = root.querySelector('.swse-v2-screen--concept');
    if (!screen) return;

    const scrollSelectors = [
      '.swse-v2-screen--concept',
      '.swse-shell-surface__body',
      '.swse-settings-body',
      '.swse-home-surface',
      '.swse-progression-surface',
      '.swse-customization-surface',
      '.swse-concept-main.sheet-body > .tab.active'
    ];

    const findScrollOwner = (target) => {
      for (const selector of scrollSelectors) {
        const candidate = target?.closest?.(selector);
        if (candidate && candidate.scrollHeight > candidate.clientHeight + 2) return candidate;
      }
      return screen.scrollHeight > screen.clientHeight + 2 ? screen : null;
    };

    screen.addEventListener('wheel', (ev) => {
      const owner = findScrollOwner(ev.target);
      if (!owner) return;

      const before = owner.scrollTop;
      owner.scrollTop += ev.deltaY;
      if (owner.scrollTop !== before) ev.preventDefault();
    }, { signal, passive: false });
  }

  /** Wire home surface tile click → setSurface(routeId). */
  _wireHomeSurfaceEvents(root, signal) {
    const homeRoot = root.querySelector('[data-shell-region="surface-home"]');
    if (!homeRoot) return;

    homeRoot.querySelectorAll('[data-route-id]').forEach(el => {
      el.addEventListener('click', async (ev) => {
        ev.preventDefault();
        if (el.disabled) return;
        const routeId = el.dataset.routeId;
        if (!routeId) return;
        const surfaceOptions = { source: 'home' };
        if (routeId === 'progression') surfaceOptions.skipIntro = true;
        if (routeId === 'chargen') surfaceOptions.skipIntro = false;
        if (el.dataset.bayMode) surfaceOptions.bayMode = el.dataset.bayMode;
        if (el.dataset.contextMode) surfaceOptions.contextMode = el.dataset.contextMode;
        homeRoot.querySelectorAll('.swse-app-tile--launching').forEach(tile => tile.classList.remove('swse-app-tile--launching'));
        el.classList.add('swse-app-tile--launching');
        await new Promise(resolve => setTimeout(resolve, 150));

        // Progression and chargen are first-class shell surfaces on the character
        // holopad. Do not call launchProgression() from the Home tile here: if the
        // ShellRouter registration is not yet visible for this render tick, that path
        // can fall back to a standalone empty ApplicationV2 popup. Routing directly
        // lets ShellSurfaceRegistry/ProgressionSurfaceAdapter build the inline VM.
        await this.setSurface(routeId, surfaceOptions);
        await this.requestSurfaceRender({ reason: 'home-route-launch', surfaceId: this._shellSurface });
      }, { signal });
    });

    // Initialize home surface controller (compass needle, tile aiming)
    // Destroy previous controller instance to prevent duplicate RAF loops
    if (this._homeController) {
      this._homeController.destroy();
    }
    this._homeController = new HomeSurfaceController({
      root: homeRoot,
      host: this
    });
    this._homeController.attach();
  }

  /** Wire store surface events (browse/cart/history tabs, add to cart, checkout). */
  _wireStoreSurfaceEvents(root, signal) {
    const storeRoot = root.querySelector('[data-shell-region="surface-store"]');
    if (!storeRoot) return;

    // Wire tab switches
    storeRoot.querySelectorAll('[data-shell-action*="store-"]').forEach(el => {
      el.addEventListener('click', async (ev) => {
        ev.preventDefault();
        const action = el.dataset.shellAction;
        if (!action) return;

        // Update surface options to track current view/category
        const view = action.replace('store-', '');
        this.patchSurfaceOptions({ currentView: view });
        this.requestSurfaceRender({ reason: 'store-view-change' });
      }, { signal });
    });

    // Wire category navigation
    storeRoot.querySelectorAll('[data-action="category-nav"]').forEach(el => {
      el.addEventListener('click', async (ev) => {
        ev.preventDefault();
        const category = el.dataset.category || '';
        this.patchSurfaceOptions({ currentCategory: category });
        this.requestSurfaceRender({ reason: 'store-category-change' });
      }, { signal });
    });
  }

  /** Wire actor-wide upgrade surface events (category/item selection + apply/remove). */
  _wireUpgradeSurfaceEvents(root, signal) {
    const upgradeRoot = root.querySelector('[data-shell-region="surface-upgrade"]');
    if (!upgradeRoot) return;

    const actor = this.actor;

    upgradeRoot.querySelectorAll('[data-category-id]').forEach(el => {
      el.addEventListener('click', () => {
        const newCat = el.dataset.categoryId;
        if (this._shellSurfaceOptions.selectedCategoryId === newCat) return;
        this.patchSurfaceOptions({ selectedCategoryId: newCat, selectedItemId: null });
        this.requestSurfaceRender({ reason: 'upgrade-category-change' });
      }, { signal });
    });

    upgradeRoot.querySelectorAll('[data-item-id]').forEach(el => {
      el.addEventListener('click', () => {
        const newItem = el.dataset.itemId;
        if (this._shellSurfaceOptions.selectedItemId === newItem) return;
        this.patchSurfaceOptions({ selectedItemId: newItem });
        this.requestSurfaceRender({ reason: 'upgrade-item-change' });
      }, { signal });
    });

    upgradeRoot.querySelectorAll('[data-upgrade-action="apply-upgrade"]').forEach(el => {
      el.addEventListener('click', async (ev) => {
        ev.stopPropagation();
        const { selectedItemId } = this._shellSurfaceOptions;
        if (!actor || !selectedItemId) return;
        try {
          const { CommandBus } = await import('/systems/foundryvtt-swse/scripts/engine/core/CommandBus.js');
          await CommandBus.execute('APPLY_ITEM_UPGRADE', { actor, itemId: selectedItemId, upgradeId: el.dataset.upgradeId });
          await this.requestSurfaceRender({ reason: 'upgrade-apply' });
        } catch (err) { ui.notifications?.error?.(`Failed to apply upgrade: ${err.message}`); }
      }, { signal });
    });

    upgradeRoot.querySelectorAll('[data-upgrade-action="remove-upgrade"]').forEach(el => {
      el.addEventListener('click', async (ev) => {
        ev.stopPropagation();
        const { selectedItemId } = this._shellSurfaceOptions;
        if (!actor || !selectedItemId) return;
        try {
          const { CommandBus } = await import('/systems/foundryvtt-swse/scripts/engine/core/CommandBus.js');
          await CommandBus.execute('REMOVE_ITEM_UPGRADE', { actor, itemId: selectedItemId, upgradeIndex: Number(el.dataset.upgradeIndex) });
          await this.requestSurfaceRender({ reason: 'upgrade-remove' });
        } catch (err) { ui.notifications?.error?.(`Failed to remove upgrade: ${err.message}`); }
      }, { signal });
    });

    upgradeRoot.querySelector('[data-action="finalize-upgrades"]')?.addEventListener('click', async () => {
      const { selectedItemId } = this._shellSurfaceOptions;
      if (!actor || !selectedItemId) return;
      try {
        const { CommandBus } = await import('/systems/foundryvtt-swse/scripts/engine/core/CommandBus.js');
        await CommandBus.execute('FINALIZE_ITEM_UPGRADES', { actor, itemId: selectedItemId });
        ui.notifications?.info?.('Upgrades finalized.');
        await this.requestSurfaceRender({ reason: 'upgrade-finalize' });
      } catch (err) { ui.notifications?.error?.(`Failed to finalize: ${err.message}`); }
    }, { signal });
  }

  /** Wire upgrade single-item overlay events. */
  _wireUpgradeOverlayEvents(root, signal) {
    const overlayRoot = root.querySelector('[data-shell-region="overlay"]');
    if (!overlayRoot) return;

    const actor = this.actor;
    const focusedItemId = this._shellOverlay?.options?.focusedItemId;

    overlayRoot.querySelectorAll('[data-upgrade-action="apply-upgrade"]').forEach(el => {
      el.addEventListener('click', async (ev) => {
        ev.stopPropagation();
        if (!actor || !focusedItemId) return;
        try {
          const { CommandBus } = await import('/systems/foundryvtt-swse/scripts/engine/core/CommandBus.js');
          await CommandBus.execute('APPLY_ITEM_UPGRADE', { actor, itemId: focusedItemId, upgradeId: el.dataset.upgradeId });
          await this.requestSurfaceRender({ reason: 'upgrade-overlay-apply' });
        } catch (err) { ui.notifications?.error?.(`Failed to apply upgrade: ${err.message}`); }
      }, { signal });
    });

    overlayRoot.querySelectorAll('[data-upgrade-action="remove-upgrade"]').forEach(el => {
      el.addEventListener('click', async (ev) => {
        ev.stopPropagation();
        if (!actor || !focusedItemId) return;
        try {
          const { CommandBus } = await import('/systems/foundryvtt-swse/scripts/engine/core/CommandBus.js');
          await CommandBus.execute('REMOVE_ITEM_UPGRADE', { actor, itemId: focusedItemId, upgradeIndex: Number(el.dataset.upgradeIndex) });
          await this.requestSurfaceRender({ reason: 'upgrade-overlay-remove' });
        } catch (err) { ui.notifications?.error?.(`Failed to remove upgrade: ${err.message}`); }
      }, { signal });
    });
  }

  /** Wire settings surface: theme presets, shell color, controls, toggles, language, reset. */
  _wireSettingsSurfaceEvents(root, signal) {
    this._settingsSurfaceController ??= new SettingsSurfaceController(this, {
      actor: this.actor ?? this.document,
      preferActor: true,
      persistActorTheme: true,
      logger: swseLogger
    });
    this._settingsSurfaceController.actor = this.actor ?? this.document;
    this._settingsSurfaceController.attach(root, { signal });
  }

  /** Wire mentor surface: key selection, topic selection, path commitment with mentor-memory. */
  _wireMentorSurfaceEvents(root, signal) {
    const mentorRoot = root.querySelector('[data-shell-region="surface-mentor"]');
    if (!mentorRoot) return;

    mentorRoot.querySelectorAll('[data-mentor-key]').forEach(el => {
      el.addEventListener('click', async (ev) => {
        ev.preventDefault();
        this.patchSurfaceOptions({ selectedMentorKey: el.dataset.mentorKey, topicKey: null });
        this.requestSurfaceRender({ reason: 'mentor-selection-change' });
      }, { signal });
    });

    mentorRoot.querySelectorAll('[data-mentor-topic]').forEach(el => {
      el.addEventListener('click', async (ev) => {
        ev.preventDefault();
        this.patchSurfaceOptions({
          topicKey: el.dataset.mentorTopic
        });
        this.requestSurfaceRender({ reason: 'mentor-topic-change' });
      }, { signal });
    });

    mentorRoot.querySelectorAll('[data-mentor-path]').forEach(el => {
      el.addEventListener('click', async (ev) => {
        ev.preventDefault();
        const pathName = el.dataset.mentorPath;
        const mentorKey = this._shellSurfaceOptions?.selectedMentorKey;
        if (!pathName || !mentorKey) return;
        try {
          const { getMentorMemory, setCommittedPath, setMentorMemory } = await import('/systems/foundryvtt-swse/scripts/engine/mentor/mentor-memory.js');
          const mentorId = String(mentorKey).toLowerCase();
          const memory = getMentorMemory(this.actor, mentorId);
          const updatedMemory = setCommittedPath(memory, pathName);
          await setMentorMemory(this.actor, mentorId, updatedMemory);
          ui.notifications?.info?.(`Committed to ${pathName}.`);
        } catch (err) {
          ui.notifications?.error?.(`Failed to commit mentor path: ${err.message}`);
        }
      }, { signal });
    });
  }

  _getInlineProgressionAdapterMode() {
    if (this._shellSurface === 'chargen') return 'chargen';
    if (this._shellSurfaceOptions?.progressionMode === 'follower' || this._shellSurfaceOptions?.mode === 'follower') return 'follower';
    return 'levelup';
  }

  /**
   * Wire delegated events for progression/chargen inline surface.
   * Forwards data-action clicks to ProgressionSurfaceAdapter.handleAction().
   */
  _wireProgressionSurfaceEvents(root, signal) {
    const regionAttr = this._shellSurface === 'chargen' ? 'surface-chargen' : 'surface-progression';
    const surfaceRoot = root.querySelector(`[data-shell-region="${regionAttr}"]`);
    if (!surfaceRoot) return;

    // Hydrate inline progression content after the character-sheet render.
    // This replaces ProgressionShell._onRender for shell-hosted mode and is
    // required for splash/intro animations to start inside the holopad viewport.
    void this._hydrateInlineProgressionSurface(surfaceRoot);

    surfaceRoot.addEventListener('click', async (ev) => {
      const btn = ev.target.closest('[data-action]');
      if (!btn) return;

      const action = btn.dataset.action;
      if (!action) return;

      // Change events (input) handled separately — clicks only here
      ev.preventDefault();

      try {
        const { ProgressionSurfaceAdapter } = await import(
          '/systems/foundryvtt-swse/scripts/ui/shell/ProgressionSurfaceAdapter.js'
        );
        const key = `${this.actor.id}-${this._getInlineProgressionAdapterMode()}`;
        const adapter = ProgressionSurfaceAdapter._registry.get(key);
        if (adapter) {
          await adapter.handleAction(action, ev, btn);
        }
      } catch (err) {
        swseLogger.error(`[CharacterSheet] Progression surface action "${action}" failed:`, err);
      }
    }, { signal });
  }

  async _hydrateInlineProgressionSurface(surfaceRoot) {
    try {
      const { ProgressionSurfaceAdapter } = await import(
        '/systems/foundryvtt-swse/scripts/ui/shell/ProgressionSurfaceAdapter.js'
      );
      const key = `${this.actor.id}-${this._getInlineProgressionAdapterMode()}`;
      const adapter = ProgressionSurfaceAdapter._registry.get(key);
      await adapter?.afterInlineRender?.(surfaceRoot);
    } catch (err) {
      swseLogger.error('[CharacterSheet] Inline progression hydration failed:', err);
    }
  }

  /**
   * Wire delegated events for workbench inline surface.
   * Forwards data-action clicks/inputs to WorkbenchSurfaceAdapter.handleAction().
   */
  _wireWorkbenchSurfaceEvents(root, signal) {
    const surfaceRoot = root.querySelector('[data-shell-region="surface-workbench"]');
    if (!surfaceRoot) return;

    void this._hydrateInlineWorkbenchSurface(surfaceRoot);

    // Click delegation for button actions
    surfaceRoot.addEventListener('click', async (ev) => {
      const btn = ev.target.closest('[data-action]');
      if (!btn) return;

      const action = btn.dataset.action;
      if (!action || action === 'search-items') return; // search handled by input event

      ev.preventDefault();

      try {
        const { WorkbenchSurfaceAdapter } = await import(
          '/systems/foundryvtt-swse/scripts/ui/shell/WorkbenchSurfaceAdapter.js'
        );
        const adapter = WorkbenchSurfaceAdapter._registry.get(this.actor.id);
        if (adapter) {
          await adapter.handleAction(action, btn);
        }
      } catch (err) {
        swseLogger.error(`[CharacterSheet] Workbench surface action "${action}" failed:`, err);
      }
    }, { signal });

    // Input delegation for search field
    surfaceRoot.addEventListener('input', async (ev) => {
      const input = ev.target.closest('[data-action="search-items"]');
      if (!input) return;

      try {
        const { WorkbenchSurfaceAdapter } = await import(
          '/systems/foundryvtt-swse/scripts/ui/shell/WorkbenchSurfaceAdapter.js'
        );
        const adapter = WorkbenchSurfaceAdapter._registry.get(this.actor.id);
        if (adapter) {
          await adapter.handleAction('search-items', input);
        }
      } catch (err) {
        swseLogger.error('[CharacterSheet] Workbench search failed:', err);
      }
    }, { signal });
  }


  async _hydrateInlineWorkbenchSurface(surfaceRoot) {
    try {
      const { WorkbenchSurfaceAdapter } = await import(
        '/systems/foundryvtt-swse/scripts/ui/shell/WorkbenchSurfaceAdapter.js'
      );
      const adapter = WorkbenchSurfaceAdapter._registry.get(this.actor.id);
      await adapter?.afterInlineRender?.(surfaceRoot);
    } catch (err) {
      swseLogger.error('[CharacterSheet] Inline workbench hydration failed:', err);
    }
  }

  /**
   * Wire delegated events for customization inline surface.
   * Forwards data-action clicks to CustomizationSurfaceAdapter.handleAction().
   */
  _wireCustomizationSurfaceEvents(root, signal) {
    const surfaceRoot = root.querySelector('[data-shell-region="surface-customization"]');
    if (!surfaceRoot) return;

    void this._hydrateInlineCustomizationSurface(surfaceRoot);

    surfaceRoot.addEventListener('click', async (ev) => {
      const target = ev.target.closest('[data-action]');
      if (!target) return;

      const action = target.dataset.action;
      if (!action) return;
      ev.preventDefault();

      try {
        const { CustomizationSurfaceAdapter } = await import(
          '/systems/foundryvtt-swse/scripts/ui/shell/CustomizationSurfaceAdapter.js'
        );
        const mode = surfaceRoot.dataset.bayMode
          || this._shellSurfaceOptions?.bayMode
          || this._shellSurfaceOptions?.mode
          || (this.actor?.type === 'vehicle' ? 'shipyard' : 'garage');
        const targetActorId = surfaceRoot.dataset.actorId
          || this._shellSurfaceOptions?.targetActorId
          || this.actor?.id;
        const adapter = CustomizationSurfaceAdapter.getForActor?.(this, targetActorId, mode)
          || CustomizationSurfaceAdapter.get?.(this, targetActorId, mode);
        if (!adapter) {
          swseLogger.warn(`[CharacterSheet] No customization adapter found for ${targetActorId}/${mode}`);
          return;
        }
        await adapter.handleAction(action, target);
      } catch (err) {
        swseLogger.error(`[CharacterSheet] Customization surface action "${action}" failed:`, err);
      }
    }, { signal });
  }

  /**
   * PART 25 — invoke CustomizationSurfaceAdapter.afterInlineRender() the same
   * way _hydrateInlineWorkbenchSurface()/_hydrateInlineProgressionSurface()
   * already invoke their adapters' hydration seam (this is the method that
   * actually runs for Garage/Shipyard's shell surface — ShellHostMixin's own
   * _wireCustomizationSurfaceEvents is shadowed by this class's override of
   * the same name and never executes for SWSEV2CharacterSheet instances).
   */
  async _hydrateInlineCustomizationSurface(surfaceRoot) {
    try {
      const { CustomizationSurfaceAdapter } = await import(
        '/systems/foundryvtt-swse/scripts/ui/shell/CustomizationSurfaceAdapter.js'
      );
      const mode = surfaceRoot.dataset.bayMode
        || this._shellSurfaceOptions?.bayMode
        || this._shellSurfaceOptions?.mode
        || (this.actor?.type === 'vehicle' ? 'shipyard' : 'garage');
      const targetActorId = surfaceRoot.dataset.actorId
        || this._shellSurfaceOptions?.targetActorId
        || this.actor?.id;
      const adapter = CustomizationSurfaceAdapter.getForActor?.(this, targetActorId, mode)
        || CustomizationSurfaceAdapter.get?.(this, targetActorId, mode);
      await adapter?.afterInlineRender?.(surfaceRoot);
    } catch (err) {
      swseLogger.error('[CharacterSheet] Inline customization hydration failed:', err);
    }
  }

  setPosition(options = {}) {
    // CRITICAL: ApplicationV2 element resolution
    // this.element is already an HTMLElement in Foundry v13, NOT a jQuery object.
    const el = this.element instanceof HTMLElement ? this.element : this.element?.[0];

    if (!el) {
      return super.setPosition(options);
    }

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const rect = el.getBoundingClientRect();

    // Use actual dimensions if element is rendered, otherwise fall back to position defaults.
    let width = Number(options.width) || rect.width;
    let height = Number(options.height) || rect.height;

    // Guard against unmeasured/mini elements (like 26x24 measurements).
    if (width < 100 || height < 100) {
      width = this.position?.width || this.constructor.DEFAULT_OPTIONS?.position?.width || 800;
      height = this.position?.height || this.constructor.DEFAULT_OPTIONS?.position?.height || 600;
    }

    const hasExplicitLeft = Number.isFinite(Number(options.left));
    const hasExplicitTop = Number.isFinite(Number(options.top));
    const fallbackLeft = Math.max((vw - width) / 2, 0);
    const fallbackTop = Math.max((vh - height) / 2, 0);
    const currentLeft = Number.isFinite(Number(this.position?.left))
      ? Number(this.position.left)
      : (Number.isFinite(rect.left) && rect.width > 0 ? rect.left : fallbackLeft);
    const currentTop = Number.isFinite(Number(this.position?.top))
      ? Number(this.position.top)
      : (Number.isFinite(rect.top) && rect.height > 0 ? rect.top : fallbackTop);
    const keepVisiblePadding = 32;
    const maxLeft = Math.max(vw - keepVisiblePadding, keepVisiblePadding - width);
    const maxTop = Math.max(vh - keepVisiblePadding, keepVisiblePadding - height);

    // Respect explicit left/top from Foundry drag, custom tablet drag, restore, and setPosition calls.
    // If AppV2 calls setPosition with only size changes, preserve the current position instead
    // of re-centering. Re-centering here made the frameless tablet feel locked in place.
    const newLeft = hasExplicitLeft
      ? Math.min(Math.max(Number(options.left), keepVisiblePadding - width), maxLeft)
      : Math.min(Math.max(currentLeft, keepVisiblePadding - width), maxLeft);
    const newTop = hasExplicitTop
      ? Math.min(Math.max(Number(options.top), 0), maxTop)
      : Math.min(Math.max(currentTop, 0), maxTop);

    // Log diagnostic once per render cycle (not every drag frame).
    if (this._lastPositionDiagnosticRender !== this.rendered) {
      this._lastPositionDiagnosticRender = this.rendered;
      console.log(`[SWSE Sheet Position Debug] ${this.actor?.name}`, {
        viewport: { width: vw, height: vh },
        elementRect: { width: rect.width, height: rect.height, fallback: width !== rect.width },
        explicitPosition: { left: hasExplicitLeft, top: hasExplicitTop },
        computed: { left: newLeft, top: newTop, width, height }
      });
    }

    const position = Object.assign({}, options, { left: newLeft, top: newTop, width, height });
    const result = super.setPosition(position);

    // In frameless ActorSheetV2, the application element is the sheet form itself.
    // Foundry may set top/left on it without giving it an ApplicationV2 frame or
    // .window-content wrapper, so force the root to be a positioned viewport.
    el.style.position = 'absolute';
    el.style.left = `${Math.round(newLeft)}px`;
    el.style.top = `${Math.round(newTop)}px`;
    el.style.width = `${Math.round(width)}px`;
    el.style.height = `${Math.round(height)}px`;
    el.style.maxWidth = 'none';
    el.style.maxHeight = 'none';
    el.style.overflow = 'hidden';

    return result;
  }

  // ---------------------------------------------------------------
  // NOTE: _getInitialPosition() was the V1 Application API.
  // Foundry V13 ApplicationV2 does NOT call this method.
  // Position is controlled via DEFAULT_OPTIONS.position and the V13
  // persistent-position system (user flags).  The centering logic has
  // been moved to _onRender (isFirstRender) below so it actually runs.
  // ---------------------------------------------------------------

  /**
   * Calculate the scale factor for the tablet shell based on available viewport.
   * Ensures the full holopad remains visible on smaller screens by scaling proportionally.
   * @returns {number} Scale factor between TABLET_MIN_SCALE and TABLET_MAX_SCALE
   */
  _getTabletViewportScale() {
    const availableWidth = Math.max(320, window.innerWidth - TABLET_MARGIN);
    const availableHeight = Math.max(320, window.innerHeight - TABLET_MARGIN);

    const scale = Math.min(
      TABLET_MAX_SCALE,
      availableWidth / TABLET_BASE_WIDTH,
      availableHeight / TABLET_BASE_HEIGHT
    );

    return Math.max(TABLET_MIN_SCALE, scale);
  }

  /**
   * Apply the sheet minimum size through the rendered HTMLElement instead of
   * DEFAULT_OPTIONS.position. Foundry V13 ApplicationV2 rejects non-core
   * position keys such as minWidth/minHeight during construction.
   * @param {HTMLElement} [root]
   */
  _applyTabletMinimumSize(root = this.element) {
    const el = root instanceof HTMLElement ? root : root?.[0];
    if (!el) return;

    el.style.setProperty('--swse-tablet-min-width', `${TABLET_MIN_WIDTH}px`);
    el.style.setProperty('--swse-tablet-min-height', `${TABLET_MIN_HEIGHT}px`);
    el.style.setProperty('min-width', `${TABLET_MIN_WIDTH}px`);
    el.style.setProperty('min-height', `${TABLET_MIN_HEIGHT}px`);
  }

  /**
   * Apply viewport-fit scaling to the tablet shell.
   * Scales the entire holopad proportionally so all UI elements remain visible.
   * Called once on first render and when user maximizes/expands.
   */
  _applyTabletViewportFit() {
    if (this._tabletInitialPositionApplied) return;

    const scale = this._getTabletViewportScale();
    const width = Math.round(TABLET_BASE_WIDTH * scale);
    const height = Math.round(TABLET_BASE_HEIGHT * scale);
    const left = Math.max(0, Math.round((window.innerWidth - width) / 2));
    const top = Math.max(0, Math.round((window.innerHeight - height) / 2));

    this.setPosition({ width, height, left, top });

    const root = this.element;
    if (root) {
      this._applyTabletSizingVars(root, scale, width, height);
    }

    this._tabletInitialPositionApplied = true;
  }

  /**
   * Override Foundry's native _onClickTab to prevent it from calling changeTab
   * without a tab group, which throws "You must pass both the tab and tab group
   * identifier". Tab switching is handled entirely by UIStateManager via the
   * delegated data-action="sheet-tab" listener wired in _onRender.
   */
  _onClickTab(event) {
    // Intentional no-op: UIStateManager owns all tab switching for this sheet.
  }

  async _onRender(context, options) {
    if (this._shellSurface === 'home') {
      const guard = this._homeRenderGuard ??= { starts: [], suppressUntil: 0, delayedRender: null, lastRequestKey: '', lastRequestAt: 0, warnedAt: 0 };
      const now = Date.now();
      guard.starts = (guard.starts || []).filter(ts => now - ts < 1800);
      guard.starts.push(now);
    }

    // ═══ DIAGNOSTICS: Capture state at render start ═══
    characterSheetDiagnostics.snapshot('_onRender START (before positioning)', this);

    // ═══ FIX: Center on initial render (first time ever or after close/reopen) ═══
    // PROBLEM: Previous code called setPosition repeatedly during a 5-second window,
    // creating a fight loop with Foundry's persistent-position system.
    // SOLUTION: Center only once per open session, then let Foundry manage position normally.

    // Track whether this is the very first render of this app instance
    const isFirstRenderEver = !this.rendered;

    // On very first render, apply scale-to-fit so the full tablet UI is visible on smaller screens
    if (isFirstRenderEver) {
      this._applyTabletViewportFit();
    }

    // Track whether this is the first render after a close/reopen cycle
    // (allows re-centering if user reopens the sheet)
    if (!this._hasBeenRendered) {
      this._hasBeenRendered = true;
      this._shouldCenterOnRender = true;
    }

    const shouldCenter = this._shouldCenterOnRender;

    if (shouldCenter && !this._tabletInitialPositionApplied) {
      // Center once per open session, then let AppV2 own future drag/resize state
      // Use dynamic dimensions from DEFAULT_OPTIONS instead of hardcoded 900x950
      const { width: targetWidth, height: targetHeight } = getApplicationTargetSize(this);
      const pos = computeCenteredPosition(targetWidth, targetHeight);
      // swseLogger.debug("[SheetPosition] FIRST RENDER THIS SESSION: Setting centered position", pos);
      // FIX: Only set position (left, top). Do NOT force width/height to prevent user resizing
      // The persistent-position system will restore user's saved dimensions, or use defaults
      this.setPosition({ left: pos.left, top: pos.top });
      this._shouldCenterOnRender = false;

      // ═══ DIAGNOSTICS: After centering ═══
      characterSheetDiagnostics.snapshot('_onRender AFTER setPosition', this);
    }

    await super._onRender(context, options);

    // ═══ DIAGNOSTICS: After Foundry render ═══
    characterSheetDiagnostics.snapshot('_onRender AFTER super._onRender', this);

    // ── Phase 6: Restore UI state after rerender ──
    // This ensures expanded sections, active tabs, focused fields, and scroll position
    // are preserved across rerenders triggered by actor/item updates
    if (this._shellSurface === 'sheet') {
      this.uiStateManager.restoreState();
    }
    this._shellUiStatePreserver?.restore?.(this.element, { surfaceId: this._shellSurface });

    // ── Phase 11: Initialize HOME surface on first render ──
    // If this is the very first render and we're in sheet mode, trigger HOME display
    // CRITICAL: Schedule render for next microtask to avoid re-entrancy during _onRender
    if (isFirstRenderEver && this._shellSurface === 'sheet') {
      await this.setSurface('home');
      queueMicrotask(() => { void this.requestSurfaceRender({ reason: 'initial-home-surface', surfaceId: 'home' }); });
      return;
    }

    // ── DIAGNOSTIC: Log that render completed ──
    // swseLogger.debug(
    //   "[SheetPosition] _onRender complete | shouldCenter =", shouldCenter,
    //   "| position.left =", this.position?.left
    // );

    // Abort previous render's listeners to prevent duplicate event handlers
    this._renderAbort?.abort();
    this._renderAbort = new AbortController();
    const { signal } = this._renderAbort;

    // V13 AppV2: this.element is always an HTMLElement
    const root = this.element;

    if (!root || !(root instanceof HTMLElement)) {
      // console.error('[LIFECYCLE] _onRender: No valid root element found');
      return;
    }

    this._applyTabletMinimumSize(root);

    // Phase 9: Apply help level CSS class to root for tier-aware affordance visibility
    HelpModeManager.getLevels().forEach(level => {
      root.classList.remove(`help-level--${level.toLowerCase()}`);
    });
    root.classList.add(`help-level--${this._helpLevel.toLowerCase()}`);

    // Phase 11: Apply theme and motion data attributes to the frameless root and shell.
    // This sheet has no Foundry .window-content wrapper, so the root FORM and the
    // tablet shell both need the concept variables emitted inline for exact palette fidelity.
    root.classList.add('swse-character-sheet-form-root', 'swse-sheet--concept', 'swse-sheet-ui');
    applyActorSheetModeClasses(root, this.document);
    const sheetThemeContext = ThemeResolutionService.applyToElement(root, { actor: this.document });
    const sheetShell = root.querySelector('.sheet-shell');
    if (sheetShell) {
      applyActorSheetModeClasses(root, this.document);
      ThemeResolutionService.applyToElement(sheetShell, {
        actor: this.document,
        themeKey: sheetThemeContext.themeKey,
        motionStyle: sheetThemeContext.motionStyle,
        surfaceStyleInline: sheetThemeContext.surfaceStyleInline,
        themeStyleInline: sheetThemeContext.themeStyleInline,
        motionStyleInline: sheetThemeContext.motionStyleInline
      });
    }

    const forceNpcEditableInteraction = root.dataset.actorSheetMode === 'npc' || root.classList.contains('swse-sheet-actor-mode--npc');
    applySheetInteractionMode(root, forceNpcEditableInteraction ? 'edit' : getStoredSheetMode(this.document));

    await this._onRenderActorSheet(root, signal);
  }

  /**
   * Actor-type-specific render wiring. SWSEV2VehicleSheet and
   * SWSEV2CharacterSheet each provide their own implementation; this base
   * implementation should never run because both concrete sheet classes
   * override it.
   */
  _onRenderActorSheet(_root, _signal) {
    throw new Error('SWSEV2ActorSheetBase._onRenderActorSheet must be implemented by a subclass.');
  }

  /**
   * Comprehensive DOM visibility dump for debugging sheet rendering issues
   * Logs actual computed styles and layout metrics to understand why content might not be visible
   */
  _logVisibilityDump(rootEl) {
    if (!rootEl || !(rootEl instanceof HTMLElement)) return;

    const getComputedCSS = (el) => {
      const cs = getComputedStyle(el);
      return {
        display: cs.display,
        visibility: cs.visibility,
        opacity: cs.opacity,
        position: cs.position,
        left: cs.left,
        top: cs.top,
        width: cs.width,
        height: cs.height,
        zIndex: cs.zIndex,
        transform: cs.transform,
        pointerEvents: cs.pointerEvents,
        overflow: cs.overflow
      };
    };

    swseLogger.log(`[SWSE Sheet Visibility Debug] ════════════════════════════════════`);
    swseLogger.log(`[SWSE Sheet Visibility Debug] Actor: ${this.actor?.name}`);
    swseLogger.log(`[SWSE Sheet Visibility Debug] Root Element: ${rootEl.tagName}#${rootEl.id}.${rootEl.className}`);

    // Log root element
    const rootRect = rootEl.getBoundingClientRect();
    swseLogger.log(`[SWSE Sheet Visibility Debug] Root Rect:`, {
      left: rootRect.left,
      top: rootRect.top,
      width: rootRect.width,
      height: rootRect.height,
      inViewport: rootRect.right > 0 && rootRect.left < window.innerWidth && rootRect.bottom > 0 && rootRect.top < window.innerHeight
    });
    swseLogger.log(`[SWSE Sheet Visibility Debug] Root Computed CSS:`, getComputedCSS(rootEl));
    swseLogger.log(`[SWSE Sheet Visibility Debug] Root in DOM:`, document.body.contains(rootEl));

    // Log ancestors up to body
    swseLogger.log(`[SWSE Sheet Visibility Debug] ──── ANCESTOR CHAIN ────`);
    let parent = rootEl.parentElement;
    let depth = 0;
    while (parent && parent !== document.body && depth < 10) {
      const rect = parent.getBoundingClientRect();
      swseLogger.log(`[SWSE Sheet Visibility Debug] Ancestor[${depth}]: ${parent.tagName}#${parent.id}.${parent.className}`, {
        rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
        css: getComputedCSS(parent)
      });
      parent = parent.parentElement;
      depth++;
    }

    // Log key child elements
    swseLogger.log(`[SWSE Sheet Visibility Debug] ──── KEY CHILD ELEMENTS ────`);
    const selectors = [
      '.window-content',
      '.swse-character-sheet-wrapper',
      '.sheet-shell',
      '.swse-sheet-body',
      '.sheet-body',
      '.tab',
      '.tab.active',
      'section.tab',
      'section.tab.active',
      'form'
    ];

    for (const selector of selectors) {
      const els = rootEl.querySelectorAll(selector);
      for (const el of els) {
        const rect = el.getBoundingClientRect();
        const cs = getComputedCSS(el);
        swseLogger.log(`[SWSE Sheet Visibility Debug] Found: ${selector}`, {
          tag: el.tagName,
          className: el.className,
          rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
          css: cs
        });
      }
    }

    swseLogger.log(`[SWSE Sheet Visibility Debug] ════════════════════════════════════`);
  }

  async _onClose(options) {
    // Cleanup all event listeners on close
    this._renderAbort?.abort();
    this._homeController?.destroy?.();
    this._homeController = null;
    if (this._homeRenderGuard?.delayedRender) {
      window.clearTimeout(this._homeRenderGuard.delayedRender);
      this._homeRenderGuard.delayedRender = null;
    }

    // Phase 6: Clear UI state on close (will be fresh on next open)
    this.uiStateManager.clear();
    this.visibilityManager.clearCache();
    this._clearPanelViewModelCache?.();

    // Reset centering state so the next open re-centers cleanly
    this._shouldCenterOnRender = true; // Enable re-centering on next open
    this._openedAt = null;
    clearTimeout(this._centerTimer);

    // Phase 11: Unregister from ShellRouter
    if (this.actor?.id) {
      ShellRouter.unregister(this.actor.id);

      // Cleanup inline surface adapters
      import('/systems/foundryvtt-swse/scripts/ui/shell/ProgressionSurfaceAdapter.js')
        .then(({ ProgressionSurfaceAdapter }) => ProgressionSurfaceAdapter.destroy(this.actor.id))
        .catch(() => {});
      import('/systems/foundryvtt-swse/scripts/ui/shell/WorkbenchSurfaceAdapter.js')
        .then(({ WorkbenchSurfaceAdapter }) => WorkbenchSurfaceAdapter.destroy(this.actor.id))
        .catch(() => {});
      // Host-scoped cleanup (PR #946 correction): destroyForHost only tears
      // down adapters registered under THIS closing shell, regardless of
      // which target actor they're keyed by (an owner's Holopad can host an
      // adapter keyed to a droid/vehicle's id via Asset Bay) — it must never
      // reach into another still-open shell's adapters for the same actor.
      import('/systems/foundryvtt-swse/scripts/ui/shell/CustomizationSurfaceAdapter.js')
        .then(({ CustomizationSurfaceAdapter }) => CustomizationSurfaceAdapter.destroyForHost(this))
        .catch(() => {});
    }

    this._alliesSurfaceController?.destroy?.();

    return super._onClose(options);
  }

  /* ============================================================
     PREPARE CONTEXT (PURE ORCHESTRATION)
  ============================================================ */
  async _prepareContext(options) {
    const contextTimer = SWSEPerf.start('CharacterSheet.prepareContext', {
      actorId: this.document?.id,
      actorName: this.document?.name,
      actorType: this.document?.type,
      surface: this._shellSurface
    });
    const actor = this.document;
    const system = actor.system;
    const sheetEditable = canUseActorSheetEditControls(this, actor);
    const actorModeContext = buildActorSheetModeContext({ actor, editable: sheetEditable });
    const isDroidActor = actorModeContext.isDroidActor;
    const isNpcActor = actorModeContext.isNpcActor;
    const isVehicleActor = actorModeContext.isVehicleActor;
    const isNpcActorDocument = actorModeContext.isNpcActorDocument;
    const isPromotedHeroicNpcActor = actorModeContext.isPromotedHeroicNpcActor;
    const useNpcConceptSheet = actorModeContext.useNpcConceptSheet;
    const useVehicleSheet = actorModeContext.useVehicleSheet;

    // Hoisted here so references earlier in _prepareContext (e.g. equippedWeapon
    // checks at ~line 2741) can safely access it before the panel-build phase.
    let panelContexts = {};

    // Sanity check: actor must be valid
    RenderAssertions.assertActorValid(actor, "SWSEV2CharacterSheet");

    const rawContext = await super._prepareContext(options);
    const SKIP_KEYS = new Set(['actor', 'document', 'system', 'fields']);
    const stripFunctions = (val, depth = 0) => {
      if (depth > 10) return val;
      if (typeof val === 'function') return undefined;
      if (Array.isArray(val)) return val.map(v => stripFunctions(v, depth + 1));
      if (val && typeof val === 'object' && val.constructor === Object) {
        return Object.fromEntries(
          Object.entries(val)
            .map(([k, v]) => [k, stripFunctions(v, depth + 1)])
            .filter(([, v]) => v !== undefined)
        );
      }
      return val;
    };
    const context = Object.fromEntries(
      Object.entries(rawContext)
        .filter(([k]) => !SKIP_KEYS.has(k))
        .map(([k, v]) => [k, stripFunctions(v)])
        .filter(([, v]) => v !== undefined)
    );

    // Authoritative derived state (populated by character-actor.js computeCharacterDerived)
    // SAFEGUARD: Ensure all expected nested properties exist with empty defaults
    const derived = foundry.utils.duplicate(actor.system?.derived ?? {});


    return this._prepareContextForActorSheet({
      actor,
      system,
      sheetEditable,
      actorModeContext,
      isDroidActor,
      isNpcActor,
      isVehicleActor,
      isNpcActorDocument,
      isPromotedHeroicNpcActor,
      useNpcConceptSheet,
      useVehicleSheet,
      rawContext,
      context,
      derived,
      contextTimer
    });
  }

  /**
   * Actor-type-specific context assembly. SWSEV2VehicleSheet and
   * SWSEV2CharacterSheet each provide their own implementation; this base
   * implementation should never run because both concrete sheet classes
   * override it.
   */
  _prepareContextForActorSheet(_bag) {
    throw new Error('SWSEV2ActorSheetBase._prepareContextForActorSheet must be implemented by a subclass.');
  }

  /* ============================================================
     DESTRUCTIVE RESET (shared: wired from _wireShellEvents, which every
     actor-type subclass inherits unchanged)
  ============================================================ */

  /**
   * Wipe all items and reset system data to a blank-slate character.
   * Called only after the user confirms the destructive reset dialog.
   */
  async _resetCharacterToBlank() {
    const actor = this.actor;
    try {
      // Delete all embedded items
      const itemIds = actor.items.map(i => i.id);
      if (itemIds.length) {
        await ActorEngine.deleteEmbeddedDocuments(actor, 'Item', itemIds, {
          source: 'reset-character-items',
          meta: { guardKey: 'reset-character-items' }
        });
      }

      // Reset system fields to blank defaults. Do not write system.hp.max here:
      // ActorEngine.recomputeHP() is the sole HP-max writer and will restore the
      // blank actor to its minimum legal max after class/items are removed.
      await mutateAndRepaint(this, async () => {
        await ActorEngine.updateActor(actor, {
          'system.level': 1,
          'system.race': '',
          'system.class': '',
          'system.classes': [],
          'system.xp.value': 0,
          'system.hp.value': 0,
          'system.credits': 0,
          'system.forcePoints.value': 0,
          'system.forcePoints.max': 0,
          'system.progression': {},
          'system.skills': {},
          'system.attributes': {},
          'system.abilities': {},
          'system.languages': [],
          'system.languageIds': [],
          'flags.foundryvtt-swse': {}
        }, {
          source: 'reset-character',
          meta: { guardKey: 'reset-character' },
          render: false,
          suppressAppRefresh: true
        });

        await ActorEngine.recomputeHP(actor, {
          source: 'reset-character-hp',
          meta: { guardKey: 'reset-character-hp' },
          render: false,
          suppressAppRefresh: true
        });
      }, {
        reason: 'character-reset',
        surfaceId: this._shellSurface ?? 'sheet',
        preserveUi: true
      });

      // Return to chargen surface
      await this.setSurface('chargen', { source: 'reset', skipIntro: false });
      await this.requestSurfaceRender({ reason: 'character-reset', surfaceId: 'chargen' });

      ui?.notifications?.info?.(`${actor.name} has been reset.`);
    } catch (err) {
      swseLogger.error('[CharacterSheet] Reset failed:', err);
      ui?.notifications?.error?.(`Reset failed: ${err.message}`);
    }
  }

  /* ============================================================
     CANONICAL ROLL EXECUTION (shared: reachable from both the vehicle's
     own weapon-roll wiring and the character-like combat UI)
  ============================================================ */

  async _runCanonicalAttackWithPreroll(weapon, options = {}) {
    if (!weapon) return null;

    const modResult = await showRollModifiersDialog({
      title: `${weapon.name} Attack`,
      rollType: 'attack',
      actor: this.actor,
      weapon,
      sourceElement: options?.sourceElement ?? null,
      sheet: this
    });
    if (modResult === null) return null;

    if (modResult.fightingDefensively) {
      try {
        if (game.settings.get('foundryvtt-swse', 'fightDefensivelyActionMode') === 'swift') {
          const swiftAllowed = await this._applyActionEconomy('swift', {
            source: 'fighting-defensively',
            weaponId: weapon?.id ?? null,
            weaponName: weapon?.name ?? null
          });
          if (!swiftAllowed) return null;
        }
      } catch (_err) {}
      await SWSEActiveEffectsManager.applyCombatActionEffect(this.actor, 'fighting-defensively');
    }

    return this._runCanonicalAttack(weapon, {
      ...options,
      ...modResult,
      showDialog: false,
      skipModifierDialog: true,
      sourceElement: options?.sourceElement ?? null,
      companionSource: options?.companionSource ?? options?.sourceElement ?? null,
      sheet: this,
      showRollCompanion: options?.showRollCompanion !== false
    });
  }

  async _runCanonicalAttack(weapon, options = {}) {
    if (!weapon) return null;

    const grappleActionAllowed = await GrappleStateEngine.confirmAction(this.actor, {
      id: options?.actionId ?? 'weapon-attack',
      name: weapon?.name ?? 'Attack',
      resolutionMode: 'attack',
      isAttack: true,
      itemId: weapon?.id ?? null,
      weapon
    }, { title: 'Confirm Grappled Attack' });
    if (!grappleActionAllowed) return null;

    const allowed = await this._applyActionEconomy("standard", {
      source: options?.source ?? "attack",
      weaponId: weapon?.id ?? null,
      weaponName: weapon?.name ?? null
    });
    if (!allowed) return null;

    return await SWSERoll.rollAttack(this.actor, weapon, {
      ...options,
      showDialog: false,
      skipModifierDialog: true
    });
  }

  /* ============================================================
     ACTION ECONOMY (shared)
  ============================================================ */

  async _resolveActionEconomyModules() {
    let Persistence = null;
    let Engine = null;
    let Policy = null;

    try {
      const mod = await import("/systems/foundryvtt-swse/scripts/engine/combat/action/action-economy-persistence.js");
      Persistence = mod.ActionEconomyPersistence ?? null;
    } catch (err) {
      console.warn("[PHASE F] Could not load ActionEconomyPersistence:", err);
    }

    try {
      const mod = await import("/systems/foundryvtt-swse/scripts/engine/combat/action/action-engine-v2.js");
      Engine = mod.ActionEngine ?? null;
    } catch (_errV2) {
      try {
        const mod = await import("/systems/foundryvtt-swse/scripts/engine/combat/action/action-engine.js");
        Engine = mod.ActionEngine ?? null;
      } catch (err) {
        console.warn("[PHASE F] Could not load ActionEngine:", err);
      }
    }

    try {
      const mod = await import("/systems/foundryvtt-swse/scripts/engine/combat/action/action-policy-controller.js");
      Policy = mod.ActionPolicyController ?? null;
    } catch (_errController) {
      try {
        const mod = await import("/systems/foundryvtt-swse/scripts/engine/combat/action/action-policy.js");
        Policy = mod.ActionPolicyController ?? null;
      } catch (err) {
        console.warn("[PHASE F] Could not load ActionPolicyController:", err);
      }
    }

    return { Persistence, Engine, Policy };
  }


  _buildPanelViewModelCacheSignature(actor) {
    if (!actor) return null;
    const actorRevision = actor?._stats?.modifiedTime
      ?? actor?._source?._stats?.modifiedTime
      ?? actor?.system?._version
      ?? null;
    if (!actorRevision) return null;

    const itemSignature = Array.from(actor?.items ?? [])
      .map(item => [
        item?.id ?? item?._id ?? 'no-id',
        item?.type ?? 'unknown',
        item?._stats?.modifiedTime ?? item?._source?._stats?.modifiedTime ?? item?.system?._version ?? '',
        item?.system?.equipped ?? '',
        item?.system?.quantity ?? '',
        item?.system?.uses?.value ?? '',
        item?.system?.ammo?.value ?? item?.system?.ammunition?.value ?? ''
      ].join(':'))
      .join('|');

    return [
      actor?.id ?? 'no-actor',
      actor?.type ?? 'unknown',
      actorRevision,
      actor?.items?.size ?? 0,
      this.isEditable === true ? 'editable' : 'readonly',
      this._helpLevel ?? '',
      this._shellSurface ?? 'sheet',
      itemSignature
    ].join('::');
  }

  _getCachedPanelViewModel(panelName, cacheKey) {
    if (!panelName || !cacheKey) return null;
    const cache = this._panelViewModelCache;
    const entry = cache?.get?.(panelName);
    if (!entry || entry.key !== cacheKey) return null;
    try {
      return foundry.utils.duplicate(entry.value ?? {});
    } catch (_err) {
      cache.delete(panelName);
      return null;
    }
  }

  _setCachedPanelViewModel(panelName, cacheKey, value) {
    if (!panelName || !cacheKey || value === undefined) return;
    const cache = this._panelViewModelCache ??= new Map();
    const order = this._panelViewModelCacheOrder ??= [];
    try {
      cache.set(panelName, {
        key: cacheKey,
        value: foundry.utils.duplicate(value ?? {})
      });
      const existing = order.indexOf(panelName);
      if (existing >= 0) order.splice(existing, 1);
      order.push(panelName);
      while (order.length > 24) {
        const stale = order.shift();
        if (stale) cache.delete(stale);
      }
    } catch (_err) {
      cache.delete(panelName);
    }
  }

  _clearPanelViewModelCache() {
    this._panelViewModelCache?.clear?.();
    if (Array.isArray(this._panelViewModelCacheOrder)) this._panelViewModelCacheOrder.length = 0;
  }

  _buildCombatActionCacheKey({ actor, actionEconomyTurnState } = {}) {
    const itemSignature = Array.from(actor?.items ?? [])
      .map(item => `${item.id}:${item.type}:${item._stats?.modifiedTime ?? item.system?._version ?? ''}`)
      .join('|');
    const economySignature = actionEconomyTurnState
      ? JSON.stringify({
          standard: actionEconomyTurnState.standard,
          move: actionEconomyTurnState.move,
          swift: actionEconomyTurnState.swift,
          reactions: actionEconomyTurnState.reactions,
          fullRound: actionEconomyTurnState.fullRound,
          combatId: game?.combat?.id ?? null,
          turn: game?.combat?.turn ?? null,
          round: game?.combat?.round ?? null
        })
      : 'no-combat';
    return [
      actor?.id ?? 'no-actor',
      actor?._stats?.modifiedTime ?? actor?.system?._version ?? '',
      actor?.items?.size ?? 0,
      itemSignature,
      economySignature
    ].join('::');
  }

  _getCachedCombatActionContext(cacheKey) {
    if (!cacheKey) return null;
    const cache = this._combatActionContextCache;
    if (!cache || cache.key !== cacheKey) return null;
    return cache.value ?? null;
  }

  _setCachedCombatActionContext(cacheKey, value) {
    if (!cacheKey || !value) return;
    this._combatActionContextCache = {
      key: cacheKey,
      value: foundry.utils.duplicate(value)
    };
  }

  _normalizeActionEconomyType(value) {
    const raw = String(value ?? "").toLowerCase().trim();
    if (!raw) return "standard";
    if (raw.includes("full")) return "full-round";
    if (raw.includes("swift")) return "swift";
    if (raw.includes("move")) return "move";
    if (raw.includes("free")) return "free";
    if (raw.includes("reaction")) return "reaction";
    if (raw.includes("standard")) return "standard";
    return raw;
  }

  _labelActionEconomyType(value) {
    const normalized = this._normalizeActionEconomyType(value);
    const labels = {
      'full-round': 'Full-Round',
      standard: 'Standard',
      move: 'Move',
      swift: 'Swift',
      reaction: 'Reaction',
      free: 'Free',
      passive: 'Passive'
    };
    return labels[normalized] ?? String(value ?? 'Action');
  }

  _deriveCombatActionEconomyType(actionData = {}) {
    return this._normalizeActionEconomyType(
      actionData?.actionType ??
      actionData?.action?.type ??
      actionData?.type ??
      actionData?.actionCost ??
      actionData?.costType ??
      (typeof actionData?.cost === 'string' ? actionData.cost : null) ??
      "standard"
    );
  }

  _actionEconomyCostForType(actionType, Engine = null) {
    const normalized = this._normalizeActionEconomyType(actionType);
    if (Engine?.costForActionType) return Engine.costForActionType(normalized);
    if (normalized === 'full-round') return { fullRound: true, standard: 1, move: 1, swift: 1 };
    if (normalized === 'move') return { move: 1 };
    if (normalized === 'swift') return { swift: 1 };
    if (normalized === 'free' || normalized === 'reaction' || normalized === 'passive') return {};
    return { standard: 1 };
  }

  _isActionEconomyPermitted(policyResult, engineResult) {
    if (!policyResult) return engineResult?.allowed !== false;
    if (policyResult === false) return false;
    if (policyResult?.permitted === false) return false;
    return true;
  }

  _notifyActionEconomyPolicy(policyResult, engineResult, actionType) {
    const tooltip = policyResult?.uiState?.tooltip
      ?? policyResult?.uiState?.message
      ?? policyResult?.reason
      ?? (Array.isArray(engineResult?.violations) && engineResult.violations.length ? engineResult.violations.join(', ') : null);
    if (!tooltip) return;

    const mode = policyResult?.mode ?? game?.settings?.get?.('foundryvtt-swse', 'actionEconomyMode') ?? 'loose';
    if (policyResult?.permitted === false || mode === 'strict') {
      ui?.notifications?.warn?.(tooltip);
    } else if (engineResult?.allowed === false) {
      ui?.notifications?.info?.(`${this._labelActionEconomyType(actionType)} economy warning: ${tooltip}`);
    }
  }

  async _applyActionEconomyPolicy({ Policy, actor, result, actionType, metadata = {} } = {}) {
    if (!Policy || !result) return result?.allowed !== false ? { permitted: true } : { permitted: false };

    const actionName = metadata?.actionName ?? metadata?.sourceName ?? metadata?.source ?? actionType ?? 'action';

    try {
      // Phase 1D: canonical controller signature. The newer controller
      // exposes MODE on the class and accepts a single options object.
      if (Policy.MODE) {
        return Policy.handle({
          actor,
          result,
          actionName,
          context: metadata,
          gmOverride: metadata?.gmOverride === true
        });
      }

      // Legacy controller signature.
      return Policy.handle(result, {
        actor,
        actionType,
        actionName,
        metadata,
        gmOverride: metadata?.gmOverride === true
      });
    } catch (err) {
      console.warn('[SWSEV2CharacterSheet] Action policy check failed, continuing cautiously:', err);
      return result?.allowed !== false ? { permitted: true } : { permitted: false, reason: err?.message ?? 'Action policy failed' };
    }
  }

  async _applyActionEconomy(actionType, metadata = {}) {
    if (!game?.combat) return true;

    const combatant = game.combat.combatants?.find?.(c => c.actor?.id === this.actor?.id);
    if (!combatant) return true;

    const { Persistence, Engine, Policy } = await this._resolveActionEconomyModules();
    if (!Persistence || !Engine) return true;

    const normalizedType = this._normalizeActionEconomyType(actionType);
    if (normalizedType === 'free' || normalizedType === 'passive') return true;

    const combatId = game.combat.id;
    const turnState = Persistence.getTurnState?.(this.actor, combatId) ?? Persistence.startTurn?.(this.actor) ?? {};

    // Reactions are tracked separately from Standard/Move/Swift because SWSE
    // reaction windows are not paid by degrading turn actions.
    if (normalizedType === 'reaction') {
      const current = Number(turnState?.reactions?.current ?? Persistence.getReactionMax?.(this.actor) ?? 1) || 0;
      const reactionResult = current > 0
        ? { allowed: true, turnState, consumed: { reaction: 1 }, violations: [] }
        : { allowed: false, turnState, consumed: { reaction: 0 }, violations: ['INSUFFICIENT_REACTION'] };
      const policyResult = await this._applyActionEconomyPolicy({
        Policy,
        actor: this.actor,
        result: reactionResult,
        actionType: normalizedType,
        metadata
      });
      this._notifyActionEconomyPolicy(policyResult, reactionResult, normalizedType);
      if (!this._isActionEconomyPermitted(policyResult, reactionResult)) return false;

      if (reactionResult.allowed && typeof Persistence.spendReaction === 'function') {
        await Persistence.spendReaction(this.actor, combatId, { ...metadata, actionType: normalizedType });
        await this.requestSurfaceRender({ reason: 'action-economy-persist' });
      }
      return true;
    }

    const cost = this._actionEconomyCostForType(normalizedType, Engine);
    const result = typeof Engine.consume === 'function'
      ? Engine.consume(turnState, cost)
      : await Engine.consumeAction?.(turnState, { actionType: normalizedType, metadata, cost });

    if (result === false) return false;
    const engineResult = result?.allowed === undefined && result?.updatedTurnState
      ? {
          allowed: result.allowed !== false,
          turnState: result.updatedTurnState,
          violations: result.reason ? [result.reason] : [],
          consumed: result.consumedCost ?? cost
        }
      : result;

    const policyResult = await this._applyActionEconomyPolicy({
      Policy,
      actor: this.actor,
      result: engineResult,
      actionType: normalizedType,
      metadata
    });
    this._notifyActionEconomyPolicy(policyResult, engineResult, normalizedType);
    if (!this._isActionEconomyPermitted(policyResult, engineResult)) return false;

    // In loose/none enforcement modes an over-spend can be permitted for table
    // flow, but it must not corrupt the tracked turn state. Only commit legal
    // consumption results.
    if (engineResult?.allowed !== false) {
      try {
        if (typeof Persistence.commitConsumption === 'function') {
          await Persistence.commitConsumption(this.actor, combatId, engineResult, {
            ...metadata,
            actionType: normalizedType,
            cost
          });
        } else if (typeof Persistence.setTurnState === 'function') {
          await Persistence.setTurnState(this.actor, combatId, engineResult.turnState ?? engineResult);
        } else if (typeof Persistence.saveTurnState === 'function') {
          await Persistence.saveTurnState(this.actor, combatId, engineResult.turnState ?? engineResult);
        } else if (typeof Persistence.updateTurnState === 'function') {
          await Persistence.updateTurnState(this.actor, combatId, engineResult.turnState ?? engineResult);
        }
        await this.requestSurfaceRender({ reason: 'action-economy-persist' });
      } catch (err) {
        console.warn('[SWSEV2CharacterSheet] Failed to persist action economy state:', err);
      }
    }

    return true;
  }
}
