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
  // Load CSS with proper scoping (v13 ApplicationV2 handles containment)
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'systems/foundryvtt-swse/scripts/ui/action-palette/action-palette.css';
  document.head.appendChild(link);

  // Create the application
  actionPaletteApp = new ActionPaletteApp();

  // Register ready hook to add scene control button
  Hooks.once('ready', () => {
    _registerSceneControl();
    _loadUserPreferences();
  });
}

/**
 * Register Action Palette as a Foundry v13 scene control button
 * Uses proper Foundry UI API instead of direct DOM mutation
 * @private
 */
function _registerSceneControl() {
  // Hook into scene controls rendering
  Hooks.on('getSceneControlButtons', (controls) => {
    const groups = Array.isArray(controls) ? controls : controls?.controls || controls?.groups || [];
    if (!Array.isArray(groups)) {
      console.warn('[Action Palette] Unexpected getSceneControlButtons payload', controls);
      return;
    }

    // Find or create token controls group
    let tokenControls = groups.find(c => c?.name === 'token');
    if (!tokenControls) {
      tokenControls = {
        name: 'token',
        title: 'Token Controls',
        icon: 'fas fa-circle-dot',
        layer: 'TokenLayer',
        visible: true,
        tools: []
      };
      groups.push(tokenControls);
    }

    tokenControls.tools ??= [];
    if (tokenControls.tools.some(tool => tool?.name === 'actionPalette')) return;

    // Add Action Palette as a tool
    tokenControls.tools.push({
      name: 'actionPalette',
      title: 'Action Palette',
      icon: 'fas fa-circle-dot',
      visible: true,
      onClick: () => toggleActionPalette(),
      button: true
    });
  });
}

/**
 * DEPRECATED: This function directly manipulated the sidebar DOM using appendChild(),
 * which broke Foundry's tab activation system during boot.
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
