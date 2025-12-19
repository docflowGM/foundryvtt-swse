/**
 * SWSE Theme Loader
 * Handles lazy loading of theme CSS files
 * Only loads the active theme to improve performance
 */

import { SWSELogger } from './utils/logger.js';

export class ThemeLoader {
  /**
   * Currently loaded theme stylesheet element
   * @type {HTMLLinkElement|null}
   */
  static currentThemeLink = null;

  /**
   * Available themes
   * @type {string[]}
   */
  static themes = [
    'holo',
    'high-contrast'
  ];

  /**
   * Map theme names to their actual CSS filenames
   * @type {Object<string, string>}
   */
  static themeFileMapping = {
    'holo': 'holo-default',
    'high-contrast': 'high-contrast'
  };

  /**
   * Load a theme CSS file
   * @param {string} themeName - Name of the theme to load
   * @returns {Promise<void>}
   */
  static async loadTheme(themeName) {
    // Validate theme name
    if (!this.themes.includes(themeName)) {
      SWSELogger.warn(`[SWSE Theme] Unknown theme: ${themeName}. Falling back to holo.`);
      themeName = 'holo';
    }

    // Set data-theme attribute on document element
    // All theme styles are now in swse-system.css using [data-theme] selectors
    document.documentElement.setAttribute('data-theme', themeName);

    SWSELogger.log(`[SWSE Theme] Applied theme: ${themeName}`);
    return Promise.resolve();
  }

  /**
   * Apply theme and re-render SWSE sheets
   * @param {string} themeName - Name of the theme to apply
   * @returns {Promise<void>}
   */
  static async applyTheme(themeName) {
    try {
      // Load the theme stylesheet
      await this.loadTheme(themeName);

      // Re-render all SWSE actor and item sheets
      this.rerenderSWSESheets();

    } catch (error) {
      SWSELogger.error('[SWSE Theme] Error applying theme:', error);
      ui.notifications?.error?.(`Failed to apply theme: ${themeName}`);
    }
  }

  /**
   * Re-render all open SWSE sheets
   * Only re-renders sheets that belong to the SWSE system
   */
  static rerenderSWSESheets() {
    let renderedCount = 0;

    for (const app of Object.values(ui.windows)) {
      // Check if this is a SWSE sheet
      const isSWSESheet =
        app.actor?.system?.constructor?.name?.startsWith?.('SWSE') ||
        app.item?.system?.constructor?.name?.startsWith?.('SWSE') ||
        app.element?.[0]?.classList?.contains?.('swse') ||
        app.options?.classes?.includes?.('swse');

      if (isSWSESheet && app.render) {
        app.render(false);
        renderedCount++;
      }
    }

    SWSELogger.log(`[SWSE Theme] Re-rendered ${renderedCount} SWSE sheets`);
  }

  /**
   * Initialize theme system
   * Called during Foundry ready hook
   */
  static initialize() {
    SWSELogger.log('[SWSE Theme] Theme loader initialized');

    // Load initial theme from settings
    const themeName = game.settings.get('foundryvtt-swse', 'sheetTheme') || 'holo';
    this.applyTheme(themeName);
  }
}

