/**
 * Action Palette initialization
 * Creates and manages the radial menu application instance
 */

import { ActionPaletteApp } from './action-palette.js';

let actionPaletteApp = null;

/**
 * Initialize the Action Palette
 * - Create the application
 * - Add sidebar button
 * - Register event handlers
 */
export function initializeActionPalette() {
  // Load CSS
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'systems/swse/scripts/ui/action-palette/action-palette.css';
  document.head.appendChild(link);

  // Create the application
  actionPaletteApp = new ActionPaletteApp();

  // Register ready hook to inject sidebar button
  Hooks.once('ready', () => {
    _createSidebarButton();
    _loadUserPreferences();
  });
}

/**
 * Create and inject the sidebar toggle button
 * @private
 */
function _createSidebarButton() {
  // Find the controls bar or create UI element
  const sidebarControls = document.getElementById('sidebar-tabs');
  if (!sidebarControls) return;

  // Check if button already exists
  if (document.getElementById('action-palette-toggle')) return;

  const button = document.createElement('button');
  button.id = 'action-palette-toggle';
  button.className = 'action-palette-toggle';
  button.title = 'Toggle Action Palette';
  button.innerHTML = '<i class="fa-solid fa-circle-dot"></i>';

  button.addEventListener('click', () => {
    if (actionPaletteApp.rendered) {
      actionPaletteApp.close();
    } else {
      actionPaletteApp.render(true);
    }
  });

  sidebarControls.appendChild(button);
}

/**
 * Load user preferences and restore state
 * @private
 */
function _loadUserPreferences() {
  const prefs = game.user.getFlag('swse', 'actionPaletteState') || {};

  if (prefs.position) {
    actionPaletteApp.position = prefs.position;
  }

  if (prefs.mode && game.user.isGM) {
    actionPaletteApp.mode = prefs.mode;
  }

  // Auto-open if user had it open before (optional)
  const autoOpen = game.user.getFlag('swse', 'actionPaletteAutoOpen') ?? false;
  if (autoOpen) {
    actionPaletteApp.render(true);
  }
}

/**
 * Get the action palette app instance
 */
export function getActionPaletteApp() {
  return actionPaletteApp;
}
