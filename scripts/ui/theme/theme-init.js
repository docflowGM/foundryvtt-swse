/* ============================================================================
   THEME INITIALIZATION — LEGACY ADAPTER
   ============================================================================

   DEPRECATED AS A SETTINGS OWNER.
   registerSystemSettings() owns player-facing sheetTheme/sheetMotionStyle.
   This file only preserves the hidden uiTheme compatibility object for older
   controls that still import ThemeManager directly.
*/

import { ThemeManager } from './ThemeManager.js';

const NS = 'foundryvtt-swse';

Hooks.once('init', () => {
  if (!game.settings.settings.has(`${NS}.uiTheme`)) {
    game.settings.register(NS, 'uiTheme', {
      name: 'Deprecated UI Theme Compatibility Settings',
      hint: 'Legacy adapter object. Palettes are resolved through sheetTheme and the actor-sheet theme registry.',
      scope: 'client',
      config: false,
      type: Object,
      default: ThemeManager.defaults
    });
  }
});

Hooks.once('ready', () => {
  ThemeManager.loadFromSettings();
});
