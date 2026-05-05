/**
 * Action Palette initialization
 * Creates and manages the radial menu application instance.
 *
 * Scene control access is registered through SceneControlRegistry, not through
 * direct DOM mutation or a local getSceneControlButtons hook.
 */

import { ActionPaletteApp } from "/systems/foundryvtt-swse/scripts/ui/action-palette/action-palette.js";
import { safeRender } from "/systems/foundryvtt-swse/scripts/utils/render-guard.js";
import { sceneControlRegistry } from "/systems/foundryvtt-swse/scripts/scene-controls/api.js";

let actionPaletteApp = null;
let cssLoaded = false;
let preferencesLoaded = false;

/**
 * Initialize the Action Palette.
 */
export function initializeActionPalette() {
  ensureActionPaletteApp();
  registerActionPaletteSceneTool();

  if (globalThis.game?.ready) {
    loadUserPreferencesOnce();
  } else {
    Hooks.once('ready', () => loadUserPreferencesOnce());
  }
}

export function ensureActionPaletteApp() {
  if (!cssLoaded) {
    const href = 'systems/foundryvtt-swse/scripts/ui/action-palette/action-palette.css';
    if (!document.querySelector(`link[href="${href}"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      document.head.appendChild(link);
    }
    cssLoaded = true;
  }

  if (!actionPaletteApp) actionPaletteApp = new ActionPaletteApp();
  return actionPaletteApp;
}

export function registerActionPaletteSceneTool() {
  sceneControlRegistry.registerHostTool('token', 'actionPalette', {
    title: 'Action Palette',
    icon: 'swse-scene-control swse-scene-control-action-palette',
    visible: true,
    enabled: () => (globalThis.canvas?.tokens?.controlled?.length ?? 0) > 0,
    onClick: () => {
      ensureActionPaletteApp();
      toggleActionPalette();
    },
    button: true,
    order: 90
  });
}

/**
 * DEPRECATED: Direct scene-control hook registration used to live here.
 * Scene controls now flow through SceneControlRegistry only.
 * @deprecated Use registerActionPaletteSceneTool() instead.
 * @private
 */
function _registerSceneControl() {
  registerActionPaletteSceneTool();
}

/**
 * DEPRECATED: This function directly manipulated the sidebar DOM using appendChild(),
 * which broke Foundry's tab activation system during boot.
 *
 * @deprecated Use SceneControlRegistry registration instead.
 * @private
 */
function _createSidebarButton() {
  // Intentionally disabled. Do not mutate #sidebar-tabs.
}

function loadUserPreferencesOnce() {
  if (preferencesLoaded) return;
  preferencesLoaded = true;
  _loadUserPreferences();
}

/**
 * Load user preferences and restore state.
 * @private
 */
function _loadUserPreferences() {
  const app = ensureActionPaletteApp();
  const prefs = game.user?.getFlag?.('foundryvtt-swse', 'actionPaletteState') || {};

  if (prefs.position) app.position = prefs.position;
  if (prefs.mode && game.user?.isGM) app.mode = prefs.mode;

  const autoOpen = game.user?.getFlag?.('foundryvtt-swse', 'actionPaletteAutoOpen') ?? false;
  if (autoOpen) safeRender(app, true);
}

/**
 * Get the action palette app instance.
 */
export function getActionPaletteApp() {
  return actionPaletteApp;
}

/**
 * Toggle the Action Palette visibility.
 */
export function toggleActionPalette() {
  const app = ensureActionPaletteApp();

  if (app.rendered) {
    app.close();
  } else {
    safeRender(app, true);
  }
}
