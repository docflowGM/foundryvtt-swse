/**
 * Action Palette initialization
 * Creates and manages the radial menu application instance
 */

import { ActionPaletteApp } from "/systems/foundryvtt-swse/scripts/ui/action-palette/action-palette.js";
import { safeRender } from "/systems/foundryvtt-swse/scripts/utils/render-guard.js";

let actionPaletteApp = null;

/**
 * Initialize the Action Palette
 * - Create the application
 * - Add sidebar button
 * - Register event handlers
 */
export function initializeActionPalette() {
  // DISABLED: Action palette CSS was globally injecting .action-palette-wrapper with height: 100% and display: flex,
  // causing containment mutations that affected Foundry's sidebar layout and app rendering.
  // This created zero-dimension renders and sidebar tab deactivation during boot.
  // CSS will be removed/rebuilt when action palette is refactored as ApplicationV2.
  /*
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'systems/foundryvtt-swse/scripts/ui/action-palette/action-palette.css';
  document.head.appendChild(link);
  */

  // Create the application
  actionPaletteApp = new ActionPaletteApp();

  // Register ready hook to inject sidebar button
  Hooks.once('ready', () => {
    // DISABLED: The _createSidebarButton() method was appending directly to #sidebar-tabs using appendChild(),
    // which created ChildList mutations during boot that broke Foundry's sidebar tab activation system.
    // Similar issue to combat-action-browser.js - direct DOM manipulation of sidebar structure breaks
    // Foundry's internal tab registry, causing ui.sidebar.activeTab to become undefined.
    // _createSidebarButton();

    _loadUserPreferences();
  });
}

/**
 * DEPRECATED: This function directly manipulated the sidebar DOM using appendChild(),
 * which broke Foundry's tab activation system during boot.
 *
 * The function should be replaced with a proper sidebar button registration approach
 * that doesn't mutate the sidebar structure directly.
 *
 * @deprecated Use proper Foundry UI registration instead
 * @private
 */
function _createSidebarButton() {
  // DISABLED CODE BELOW - DO NOT USE
  /*
  // Find the controls bar or create UI element
  const sidebarControls = document.getElementById('sidebar-tabs');
  if (!sidebarControls) {return;}

  // Check if button already exists
  if (document.getElementById('action-palette-toggle')) {return;}

  const button = document.createElement('button');
  button.id = 'action-palette-toggle';
  button.className = 'action-palette-toggle';
  button.title = 'Toggle Action Palette';
  button.innerHTML = '<i class="fa-solid fa-circle-dot"></i>';

  button.addEventListener('click', () => {
    if (actionPaletteApp.rendered) {
      actionPaletteApp.close();
    } else {
      safeRender(actionPaletteApp, true);
    }
  });

  sidebarControls.appendChild(button);
  */
}

/**
 * Load user preferences and restore state
 * @private
 */
function _loadUserPreferences() {
  const prefs = game.user.getFlag('foundryvtt-swse', 'actionPaletteState') || {};

  if (prefs.position) {
    actionPaletteApp.position = prefs.position;
  }

  if (prefs.mode && game.user.isGM) {
    actionPaletteApp.mode = prefs.mode;
  }

  // Auto-open if user had it open before (optional)
  const autoOpen = game.user.getFlag('foundryvtt-swse', 'actionPaletteAutoOpen') ?? false;
  if (autoOpen) {
    safeRender(actionPaletteApp, true);
  }
}

/**
 * Get the action palette app instance
 */
export function getActionPaletteApp() {
  return actionPaletteApp;
}

/**
 * Toggle the Action Palette visibility
 * Safe public API for opening/closing the palette
 * Used by keybindings and UI controls
 */
export function toggleActionPalette() {
  if (!actionPaletteApp) {
    console.warn('[Action Palette] App not initialized');
    return;
  }

  if (actionPaletteApp.rendered) {
    actionPaletteApp.close();
  } else {
    safeRender(actionPaletteApp, true);
  }
}
