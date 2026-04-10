/**
 * scripts/sheets/v2/droid/DroidSheet.js
 * Droid Sheet V2 (Panelized Architecture - Phase 7c)
 */

import { DroidPanelVisibilityManager } from './DroidPanelVisibilityManager.js';
import { DroidPanelContextBuilder } from './DroidPanelContextBuilder.js';
import { DroidPanelValidators } from './DroidPanelValidators.js';
import { PANEL_REGISTRY } from './PANEL_REGISTRY.js';
import { UIStateManager } from '../shared/UIStateManager.js';
import { PanelDiagnostics } from '../shared/PanelDiagnostics.js';

const { HandlebarsApplicationMixin } = foundry.applications.api;

export class DroidSheet extends HandlebarsApplicationMixin(foundry.applications.sheets.ActorSheetV2) {
  static PARTS = {
    ...super.PARTS,
    header: { template: 'systems/foundryvtt-swse/templates/v2/droid/droid-sheet-header.hbs' },
    tabs: { template: 'systems/foundryvtt-swse/templates/v2/droid/droid-sheet-tabs.hbs' },
    body: { template: 'systems/foundryvtt-swse/templates/v2/droid/droid-sheet-body.hbs' }
  };

  static DEFAULT_OPTIONS = {
    ...super.DEFAULT_OPTIONS,
    classes: ['swse', 'sheet', 'actor', 'droid', 'swse-sheet', 'swse-droid-sheet', 'v2'],
    width: 820,
    height: 920
  };

  get actor() {
    return this.document;
  }

  async _prepareContext(options) {
    if (this.document.type !== 'droid') {
      throw new Error(`DroidSheet requires actor type "droid", got "${this.document.type}"`);
    }

    if (!this.visibilityManager) {
      this.visibilityManager = new DroidPanelVisibilityManager(this);
      this.uiStateManager = new UIStateManager(this);
      this.panelDiagnostics = new PanelDiagnostics();
    }

    this.uiStateManager.captureState();

    const baseContext = await super._prepareContext(options);

    const panelsToBuild = this.visibilityManager.getPanelsToBuild(this.actor);

    const builder = new DroidPanelContextBuilder(this.actor);
    const panelContexts = {};

    for (const panelName of panelsToBuild) {
      this.panelDiagnostics.recordPanelBuild(panelName);
      const startTime = performance.now();

      try {
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

        if (CONFIG?.SWSE?.sheets?.v2?.strictMode) {
          throw error;
        }
      }
    }

    const panelsSkipped = this.visibilityManager.getPanelsSkipped(this.actor);
    for (const panelName of panelsSkipped) {
      this.panelDiagnostics.recordPanelSkipped(panelName, 'not visible or condition not met');
    }

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
      ...panelContexts
    };

    return renderContext;
  }

  async _onRender(context, options) {
    await super._onRender(context, options);

    if (this.uiStateManager) {
      this.uiStateManager.restoreState();
    }

    const root = this.element;
    if (!(root instanceof HTMLElement)) {
      throw new Error('DroidSheet: element not HTMLElement');
    }

    this._runPostRenderAssertions(root);

    if (CONFIG?.SWSE?.sheets?.v2?.strictMode) {
      this.panelDiagnostics.logDiagnostics();
    }

    this._bindEventHandlers(root);
  }

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
        if (CONFIG?.SWSE?.sheets?.v2?.strictMode) {
          console.log(`Assertion ${assertionName} on ${registryEntry.panelName}`);
        }
      }
    }
  }

  _bindEventHandlers(root) {
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

Actors.registerSheet('foundryvtt-swse', DroidSheet, { types: ['droid'], makeDefault: false });
