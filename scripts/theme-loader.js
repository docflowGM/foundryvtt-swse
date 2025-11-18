/**
 * SWSE Theme Loader
 * Handles lazy loading of theme CSS files
 * Only loads the active theme to improve performance
 */

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
    'high-contrast',
    'starship',
    'sand-people',
    'jedi',
    'high-republic'
  ];

  /**
   * Load a theme CSS file
   * @param {string} themeName - Name of the theme to load
   * @returns {Promise<void>}
   */
  static async loadTheme(themeName) {
    // Validate theme name
    if (!this.themes.includes(themeName)) {
      console.warn(`[SWSE Theme] Unknown theme: ${themeName}. Falling back to holo.`);
      themeName = 'holo';
    }

    // Remove existing theme stylesheet if present
    if (this.currentThemeLink) {
      this.currentThemeLink.remove();
      this.currentThemeLink = null;
    }

    // Set data-theme attribute on document element
    document.documentElement.setAttribute('data-theme', themeName);

    // Create new link element for theme stylesheet
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.href = `systems/swse/styles/dist/swse-theme-${themeName}.css`;
    link.id = 'swse-theme-stylesheet';

    // Load the stylesheet
    return new Promise((resolve, reject) => {
      link.onload = () => {
        console.log(`[SWSE Theme] Loaded theme: ${themeName}`);
        resolve();
      };

      link.onerror = () => {
        console.error(`[SWSE Theme] Failed to load theme: ${themeName}`);
        reject(new Error(`Failed to load theme: ${themeName}`));
      };

      // Append to head
      document.head.appendChild(link);
      this.currentThemeLink = link;
    });
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
      console.error('[SWSE Theme] Error applying theme:', error);
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

    console.log(`[SWSE Theme] Re-rendered ${renderedCount} SWSE sheets`);
  }

  /**
   * Initialize theme system
   * Called during Foundry init hook
   */
  static initialize() {
    console.log('[SWSE Theme] Theme loader initialized');

    // Load initial theme from settings
    Hooks.once('ready', () => {
      const themeName = game.settings.get('swse', 'sheetTheme') || 'holo';
      this.applyTheme(themeName);
    });
  }
}

/**
 * Legacy global function for backwards compatibility
 * @param {string} themeName - Name of the theme to apply
 * @deprecated Use ThemeLoader.applyTheme() instead
 */
window.applyTheme = function(themeName) {
  console.warn('[SWSE Theme] applyTheme() is deprecated. Use ThemeLoader.applyTheme() instead.');
  ThemeLoader.applyTheme(themeName);
};
