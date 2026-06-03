/**
 * WorkbenchSurfaceAdapter — Thin adapter for inline Workbench rendering
 *
 * Bridges ItemCustomizationWorkbench logic to the holopad shell surface system.
 * The workbench app logic stays intact; only rendering is redirected.
 *
 * Pattern:
 *   1. Create workbench instance without calling render() (never opens a window)
 *   2. Override _renderPreservingUi() to call shell.render() instead
 *   3. Call _prepareContext() to get VM with all item/upgrade/template data
 *   4. Surface template renders that VM inline inside the holopad
 *   5. Event delegation forwards actions back to instance methods
 *
 * One adapter instance per actor, stored in shell surface options.
 */

import { ItemCustomizationWorkbench } from '/systems/foundryvtt-swse/scripts/apps/customization/item-customization-workbench.js';
import { MentorTranslationIntegration } from '/systems/foundryvtt-swse/scripts/mentor/mentor-translation-integration.js';
import { SWSELogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';
import { requestShellRender } from '/systems/foundryvtt-swse/scripts/ui/shell/request-shell-render.js';

export class WorkbenchSurfaceAdapter {
  /** @type {Map<string, WorkbenchSurfaceAdapter>} Registry per actor id */
  static _registry = new Map();

  /** @type {ItemCustomizationWorkbench} The workbench instance (never rendered as window) */
  _workbench = null;

  /** @type {object} The character sheet that hosts this surface */
  _shellHost = null;

  /** @type {string} Actor id */
  _actorId = null;

  constructor(shellHost, actorId) {
    this._shellHost = shellHost;
    this._actorId = actorId;
  }

  /**
   * Get or create an adapter for the given actor.
   * Re-creates the workbench instance if category/itemId changed.
   *
   * @param {object} shellHost - The character sheet instance
   * @param {Actor} actor
   * @param {object} options - { itemId, category, mode }
   * @returns {WorkbenchSurfaceAdapter}
   */
  static getOrCreate(shellHost, actor, options = {}) {
    let adapter = this._registry.get(actor.id);
    if (!adapter) {
      adapter = new WorkbenchSurfaceAdapter(shellHost, actor.id);
      this._registry.set(actor.id, adapter);
    }

    adapter._shellHost = shellHost;
    const state = adapter._getSurfaceState(options);
    adapter._ensureWorkbench(actor, state);
    return adapter;
  }

  /**
   * Destroy adapter for an actor when they close their sheet.
   * @param {string} actorId
   */
  static destroy(actorId) {
    const adapter = this._registry.get(actorId);
    if (adapter) {
      adapter._workbench = null;
      this._registry.delete(actorId);
    }
  }

  /**
   * Build the view model for this surface by rendering the full workbench template.
   * Mirrors the pattern used by CustomizationSurfaceAdapter.
   *
   * @returns {Promise<object>}
   */
  async buildViewModel() {
    if (!this._workbench) {
      return { id: 'workbench', title: 'Armory // Customization', error: 'No workbench initialized' };
    }

    try {
      const context = await this._workbench._prepareContext({});
      const contentHtml = await foundry.applications.handlebars.renderTemplate(
        'systems/foundryvtt-swse/templates/apps/customization/item-customization-workbench.hbs',
        context
      );

      return {
        id: 'workbench',
        title: 'Armory // Customization',
        contentHtml,
        vm: context,
        isReady: true
      };
    } catch (err) {
      SWSELogger.error('[WorkbenchSurfaceAdapter] buildViewModel failed:', err);
      return { id: 'workbench', title: 'Armory // Customization', error: err.message };
    }
  }


  /**
   * Hydrate DOM-only affordances after the inline shell injects the workbench.
   * Keeps AppV2 rendering pure while letting the hosted surface use the same
   * mentor translation pipeline as progression/mentor panels.
   *
   * @param {Element} surfaceRoot
   * @returns {Promise<void>}
   */
  async afterInlineRender(surfaceRoot) {
    this._installScrollBridge(surfaceRoot);

    const mentorNode = surfaceRoot?.querySelector?.('[data-workbench-mentor-text]');
    if (!mentorNode || mentorNode.dataset.translationHydrated === 'true') return;

    const text = mentorNode.dataset.workbenchMentorText || mentorNode.textContent || '';
    const mentor = mentorNode.dataset.mentor || 'delta';
    mentorNode.dataset.translationHydrated = 'true';

    try {
      await MentorTranslationIntegration.render({
        text,
        container: mentorNode,
        mentor,
        topic: 'workbench',
        force: true
      });
    } catch (err) {
      SWSELogger.error('[WorkbenchSurfaceAdapter] Mentor translation failed:', err);
      mentorNode.textContent = text;
    }
  }

  _installScrollBridge(surfaceRoot) {
    const root = surfaceRoot?.querySelector?.('.swse-customization-stage') || surfaceRoot;
    const body = root?.querySelector?.('.workbench-detail > .detail-grid, .workbench-detail > .lightsaber-workspace, .workbench-detail');
    if (!root || !body || root.dataset.workbenchScrollBridge === 'true') return;
    root.dataset.workbenchScrollBridge = 'true';

    root.addEventListener('wheel', event => {
      const delta = event.deltaY || 0;
      if (!delta) return;
      const explicitScroller = event.target?.closest?.('.inventory-list, .card-list, .detail-rail-scroll');
      if (explicitScroller) {
        const canScrollDown = explicitScroller.scrollTop + explicitScroller.clientHeight < explicitScroller.scrollHeight - 1;
        const canScrollUp = explicitScroller.scrollTop > 0;
        if ((delta > 0 && canScrollDown) || (delta < 0 && canScrollUp)) return;
      }
      if (body.scrollHeight <= body.clientHeight + 1) return;
      body.scrollTop += delta;
      event.preventDefault();
    }, { passive: false });
  }

  /**
   * Update workbench selection state from surface options without full reconstruction.
   * Called when the character sheet re-renders to preserve selection between renders.
   *
   * @param {Actor} actor
   * @param {object} options - Updated surface options from shell host
   */
  updateState(actor, options) {
    const state = this._getSurfaceState(options);
    if (!this._workbench) {
      this._ensureWorkbench(actor, state);
      return;
    }

    this._applySurfaceStateToWorkbench(state);
  }

  /**
   * Handle a user action from the workbench surface.
   * Delegates to the underlying workbench's internal methods by directly
   * updating state and triggering a shell re-render.
   *
   * @param {string} action - data-action value
   * @param {Element} target - Element that triggered action
   * @returns {Promise<void>}
   */
  async handleAction(action, target) {
    if (!this._workbench) return;

    try {
      if (typeof this._workbench.handleSurfaceAction === 'function') {
        await this._workbench.handleSurfaceAction(action, target);
        this._syncStateFromWorkbench({ render: false });
        return;
      }
      SWSELogger.warn(`[WorkbenchSurfaceAdapter] Workbench is missing handleSurfaceAction for ${action}`);
    } catch (err) {
      SWSELogger.error(`[WorkbenchSurfaceAdapter] Action "${action}" failed:`, err);
    }
  }

  // ─── Private ────────────────────────────────────────────────────────────────

  _getSurfaceState(options = {}) {
    const stored = this._shellHost?.getSurfaceState?.('workbench') ?? {};
    return { ...stored, ...(options ?? {}) };
  }

  _applySurfaceStateToWorkbench(options = {}) {
    const workbench = this._workbench;
    if (!workbench) return;

    const requestedCategory = options.category ?? options.initialCategory;
    if (requestedCategory !== undefined && requestedCategory !== null) {
      workbench.selectedCategory = requestedCategory;
      workbench.initialCategory = options.initialCategory || requestedCategory;
    }
    if (options.mode !== undefined && options.mode !== null) {
      workbench.mode = options.mode;
    }
    if (options.routeIntent !== undefined) workbench.routeIntent = options.routeIntent || null;
    if (options.entryPoint !== undefined) workbench.entryPoint = options.entryPoint || null;
    if (options.itemId !== undefined) {
      workbench.selectedItemId = options.itemId || null;
      if (workbench.selectedCategory === 'lightsaber') workbench._lightsaber.selectedOwnedSaberId = options.itemId || null;
    }
    if (workbench.selectedCategory === 'lightsaber' && (workbench.mode === 'construct' || workbench.routeIntent === 'lightsaber-construction')) {
      workbench.selectedItemId = null;
      workbench._lightsaber.selectedOwnedSaberId = null;
      workbench._lightsaber.activeTab ||= 'chassis';
    }

    const selectedByCategory = options.selectedByCategory;
    if (selectedByCategory && typeof selectedByCategory === 'object') {
      workbench._selectedByCategory = new Map(Object.entries(selectedByCategory).filter(([, value]) => value));
    }

    const searchByCategory = options.searchByCategory;
    if (searchByCategory && typeof searchByCategory === 'object') {
      workbench._searchByCategory = new Map(Object.entries(searchByCategory));
    }

    if (options.search !== undefined) {
      workbench._setSearchForCategory?.(workbench.selectedCategory, options.search);
    }
  }

  _syncStateFromWorkbench({ render = false, reason = 'workbench-state-sync' } = {}) {
    const workbench = this._workbench;
    if (!workbench || typeof this._shellHost?.patchSurfaceState !== 'function') return null;

    const searchByCategory = workbench._searchByCategory instanceof Map
      ? Object.fromEntries(workbench._searchByCategory.entries())
      : {};
    const selectedByCategory = workbench._selectedByCategory instanceof Map
      ? Object.fromEntries(workbench._selectedByCategory.entries())
      : {};

    return this._shellHost.patchSurfaceState('workbench', {
      category: workbench.selectedCategory ?? null,
      initialCategory: workbench.initialCategory ?? workbench.selectedCategory ?? null,
      itemId: workbench.selectedItemId ?? null,
      mode: workbench.mode ?? 'owned',
      routeIntent: workbench.routeIntent ?? null,
      entryPoint: workbench.entryPoint ?? null,
      search: workbench.search ?? '',
      searchByCategory,
      selectedByCategory
    }, { render, reason });
  }

  async _requestShellRender(reason = 'workbench-render') {
    await (requestShellRender(this._shellHost, { reason, surfaceId: 'workbench' }));
  }

  _ensureWorkbench(actor, options) {
    const category = options.category || options.initialCategory || 'weapons';
    const initialCategory = options.initialCategory || category;
    const itemId = options.itemId || null;
    const mode = options.mode || 'owned';

    // Re-create only if actor, category, or mode has changed
    const existing = this._workbench;
    const actorChanged = existing?.actor?.id !== actor.id;
    const modeChanged = existing?.mode !== mode;

    if (!existing || actorChanged || modeChanged) {
      this._workbench = new ItemCustomizationWorkbench(actor, {
        itemId,
        category,
        initialCategory,
        mode,
        sourceItem: options.sourceItem ?? null,
        applyMode: options.applyMode ?? null,
        onStage: options.onStage ?? null,
        routeIntent: options.routeIntent ?? null,
        entryPoint: options.entryPoint ?? null
      });

      // CRITICAL: Override _renderPreservingUi to redirect to shell re-render.
      // The workbench instance is hosted inline; it must never open or close its
      // own ApplicationV2 window while operating inside the holopad.
      const self = this;
      this._workbench._renderPreservingUi = async function() {
        SWSELogger.debug('[WorkbenchSurfaceAdapter] Intercepted _renderPreservingUi — syncing state and redirecting to shell');
        self._syncStateFromWorkbench({ render: false });
        await self._requestShellRender('workbench-inline-render');
      };
      this._workbench.close = async function() {
        await self._shellHost?.setSurface?.('sheet');
        await self._requestShellRender('workbench-close');
        return this;
      };

      this._applySurfaceStateToWorkbench(options);
      this._syncStateFromWorkbench({ render: false });
      SWSELogger.log(`[WorkbenchSurfaceAdapter] Initialized workbench for actor ${actor.name}`);
    } else {
      this._applySurfaceStateToWorkbench({ category, itemId, mode, ...options });
      this._syncStateFromWorkbench({ render: false });
    }
  }
}
