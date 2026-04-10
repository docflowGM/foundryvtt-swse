/**
 * scripts/sheets/v2/npc/NPCSheet.js
 *
 * NPC Sheet V2 (Panelized Architecture)
 * Uses shared panel infrastructure for:
 * - Visibility management (lazy loading, tab-based visibility)
 * - UI state preservation (tabs, scroll, focus)
 * - Performance diagnostics (render time tracking)
 *
 * NPC-specific components:
 * - NPCPanelVisibilityManager (tab/panel mappings)
 * - NPCPanelContextBuilder (panel builders with game logic)
 * - NPCPanelValidators (panel contract enforcement)
 * - PANEL_REGISTRY (panel metadata)
 */

import { NPCPanelVisibilityManager } from './NPCPanelVisibilityManager.js';
import { NPCPanelContextBuilder } from './NPCPanelContextBuilder.js';
import { NPCPanelValidators } from './NPCPanelValidators.js';
import { PANEL_REGISTRY } from './PANEL_REGISTRY.js';
import { UIStateManager } from '../shared/UIStateManager.js';
import { PanelDiagnostics } from '../shared/PanelDiagnostics.js';

const { HandlebarsApplicationMixin } = foundry.applications.api;

export class NPCSheet extends HandlebarsApplicationMixin(foundry.applications.sheets.ActorSheetV2) {
  static PARTS = {
    ...super.PARTS,
    header: {
      template: 'systems/foundryvtt-swse/templates/v2/npc/npc-sheet-header.hbs'
    },
    tabs: {
      template: 'systems/foundryvtt-swse/templates/v2/npc/npc-sheet-tabs.hbs'
    },
    body: {
      template: 'systems/foundryvtt-swse/templates/v2/npc/npc-sheet-body.hbs'
    }
  };

  static DEFAULT_OPTIONS = {
    ...super.DEFAULT_OPTIONS,
    classes: ['swse', 'sheet', 'actor', 'npc', 'swse-sheet', 'swse-npc-sheet', 'v2'],
    width: 820,
    height: 920
  };

  get actor() {
    return this.document;
  }

  /**
   * PREPARE CONTEXT
   * Builds normalized panel contexts for rendering
   * Uses lazy loading: only visible panels build
   */
  async _prepareContext(options) {
    // Type check
    if (this.document.type !== 'npc') {
      throw new Error(`NPCSheet requires actor type "npc", got "${this.document.type}"`);
    }

    // Initialize managers on first render
    if (!this.visibilityManager) {
      this.visibilityManager = new NPCPanelVisibilityManager(this);
      this.uiStateManager = new UIStateManager(this);
      this.panelDiagnostics = new PanelDiagnostics();
    }

    // Capture UI state before rendering
    this.uiStateManager.captureState();

    // Get base context from parent
    const baseContext = await super._prepareContext(options);

    // Determine which panels to build
    const panelsToBuild = this.visibilityManager.getPanelsToBuild(this.actor);

    // Build panel contexts
    const builder = new NPCPanelContextBuilder(this.actor);
    const panelContexts = {};

    for (const panelName of panelsToBuild) {
      this.panelDiagnostics.recordPanelBuild(panelName);
      const startTime = performance.now();

      try {
        // Convert camelCase panelName to methodName: portraitPanel -> buildPortraitPanel
        const methodName = `build${panelName.charAt(0).toUpperCase() + panelName.slice(1)}`;
        const method = builder[methodName];

        if (!method) {
          console.warn(`No builder method ${methodName} for panel ${panelName}`);
          continue;
        }

        panelContexts[panelName] = method.call(builder);
        this.visibilityManager.markPanelBuilt(panelName);

        const buildTime = performance.now() - startTime;
        this.panelDiagnostics.recordPanelBuildTime(panelName, buildTime);
      } catch (error) {
        console.error(`Failed to build panel ${panelName}:`, error);
        this.panelDiagnostics.recordError(panelName, error);

        // In strict mode, throw; otherwise warn and continue
        if (CONFIG?.SWSE?.sheets?.v2?.strictMode) {
          throw error;
        }
      }
    }

    // Record skipped panels for diagnostics
    const panelsSkipped = this.visibilityManager.getPanelsSkipped(this.actor);
    for (const panelName of panelsSkipped) {
      this.panelDiagnostics.recordPanelSkipped(panelName, 'not visible or condition not met');
    }

    // Prepare actor data for template (serializable primitives only)
    const renderContext = {
      ...baseContext,
      actor: {
        id: this.actor.id,
        name: this.actor.name,
        type: this.actor.type,
        img: this.actor.img,
        _id: this.actor._id
      },
      system: this.actor.system,
      derived: this.actor.system?.derived ?? {},
      items: this.actor.items.map(item => ({
        id: item.id,
        name: item.name,
        type: item.type,
        img: item.img,
        system: item.system
      })),
      editable: this.isEditable,
      currentTab: this.visibilityManager.currentTab,
      tabPanels: this.visibilityManager.tabPanels,

      // Panel contexts (all normalized data)
      ...panelContexts
    };

    return renderContext;
  }

  /**
   * ON RENDER
   * Called after template renders
   * Restores UI state, runs assertions, logs diagnostics
   */
  async _onRender(context, options) {
    // Call parent render (AppV2 contract)
    await super._onRender(context, options);

    // Restore UI state after render
    if (this.uiStateManager) {
      this.uiStateManager.restoreState();
    }

    // Get DOM root
    const root = this.element;
    if (!(root instanceof HTMLElement)) {
      throw new Error('NPCSheet: element not HTMLElement');
    }

    // Run post-render assertions
    this._runPostRenderAssertions(root);

    // Log diagnostics if verbose mode
    if (CONFIG?.SWSE?.sheets?.v2?.strictMode) {
      this.panelDiagnostics.logDiagnostics();
    }

    // Wire up event handlers
    this._bindEventHandlers(root);
  }

  /**
   * RUN POST-RENDER ASSERTIONS
   * Validates DOM structure matches panel contracts
   * @private
   */
  _runPostRenderAssertions(root) {
    for (const registryEntry of PANEL_REGISTRY) {
      const panelElement = root.querySelector(registryEntry.rootSelector);
      if (!panelElement) {
        console.warn(`Panel element not found for ${registryEntry.panelName}`);
        continue;
      }

      if (!registryEntry.postRenderAssertions) {
        continue;
      }

      for (const assertionName of registryEntry.postRenderAssertions) {
        // Would validate DOM structure here
        // For now, just log
        if (CONFIG?.SWSE?.sheets?.v2?.strictMode) {
          console.log(`Assertion ${assertionName} on ${registryEntry.panelName}`);
        }
      }
    }
  }

  /**
   * BIND EVENT HANDLERS
   * Wires up interactions after render
   * @private
   */
  _bindEventHandlers(root) {
    // Tab change handler
    for (const tabButton of root.querySelectorAll('.sheet-tabs button')) {
      tabButton.addEventListener('click', (ev) => {
        ev.preventDefault();
        const tabName = tabButton.dataset.tab;
        if (tabName) {
          this.visibilityManager.setActiveTab(tabName);
          this.render();
        }
      });
    }

    // Item sheet opening
    for (const el of root.querySelectorAll('.swse-v2-open-item')) {
      el.addEventListener('click', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const itemId = ev.currentTarget?.dataset?.itemId;
        if (!itemId) return;
        const item = this.actor?.items?.get(itemId);
        item?.sheet?.render(true);
      });
    }
  }

  /**
   * ON CLOSE
   * Cleanup on sheet close
   */
  async _onClose(options) {
    if (this.uiStateManager) {
      this.uiStateManager.clearState();
    }
    if (this.visibilityManager) {
      this.visibilityManager.clearCache();
    }
    return super._onClose(options);
  }
}

// Register NPC sheet
Actors.registerSheet('foundryvtt-swse', NPCSheet, { types: ['npc'], makeDefault: false });
