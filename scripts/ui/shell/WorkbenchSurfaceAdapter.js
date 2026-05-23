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
    adapter._ensureWorkbench(actor, options);
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

  /**
   * Update workbench selection state from surface options without full reconstruction.
   * Called when the character sheet re-renders to preserve selection between renders.
   *
   * @param {Actor} actor
   * @param {object} options - Updated surface options from shell host
   */
  updateState(actor, options) {
    if (!this._workbench) {
      this._ensureWorkbench(actor, options);
      return;
    }

    // Update selection state without rebuilding the whole workbench
    if (options.category) {
      this._workbench.selectedCategory = options.category;
    }
    if (options.itemId !== undefined) {
      this._workbench.selectedItemId = options.itemId;
    }
    if (options.search !== undefined) {
      this._workbench._setSearchForCategory?.(this._workbench.selectedCategory, options.search);
    }
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
        return;
      }
      SWSELogger.warn(`[WorkbenchSurfaceAdapter] Workbench is missing handleSurfaceAction for ${action}`);
    } catch (err) {
      SWSELogger.error(`[WorkbenchSurfaceAdapter] Action "${action}" failed:`, err);
    }
  }

  // ─── Private ────────────────────────────────────────────────────────────────

  _ensureWorkbench(actor, options) {
    const category = options.category || 'weapons';
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
        mode,
        sourceItem: options.sourceItem ?? null,
        applyMode: options.applyMode ?? null,
        onStage: options.onStage ?? null
      });

      // CRITICAL: Override _renderPreservingUi to redirect to shell re-render.
      // The workbench instance is hosted inline; it must never open or close its
      // own ApplicationV2 window while operating inside the holopad.
      const self = this;
      this._workbench._renderPreservingUi = async function() {
        SWSELogger.debug('[WorkbenchSurfaceAdapter] Intercepted _renderPreservingUi — redirecting to shell');
        await self._shellHost?.render?.(false);
      };
      this._workbench.close = async function() {
        await self._shellHost?.setSurface?.('sheet');
        await self._shellHost?.render?.(false);
        return this;
      };

      SWSELogger.log(`[WorkbenchSurfaceAdapter] Initialized workbench for actor ${actor.name}`);
    } else {
      // Update selection without rebuilding
      if (itemId !== undefined) existing.selectedItemId = itemId;
      if (category !== existing.selectedCategory) {
        existing.selectedCategory = category;
      }
    }
  }
}
