/* ============================================================================
   THEME INITIALIZATION
   Loads theme settings on game ready
   ============================================================================ */

import { ThemeManager } from './ThemeManager.js';

Hooks.once('ready', () => {
  ThemeManager.loadFromSettings();
});
