/* ============================================================================
   THEME INITIALIZATION
   Registers theme settings and loads on game ready
   ============================================================================ */

import { ThemeManager } from './ThemeManager.js';

Hooks.once('init', () => {
  // Register theme setting as the single source of truth
  game.settings.register('foundryvtt-swse', 'uiTheme', {
    name: 'UI Theme Settings',
    hint: 'Global theme configuration for all UI elements',
    scope: 'client',
    config: false,
    type: Object,
    default: ThemeManager.defaults
  });
});

Hooks.once('ready', () => {
  ThemeManager.loadFromSettings();
});

