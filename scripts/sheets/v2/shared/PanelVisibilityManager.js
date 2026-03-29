/**
 * PanelVisibilityManager (Shared Base)
 *
 * Generic base class for managing panel visibility and lazy loading.
 * Sheets subclass this to define their specific tab/panel mappings and conditions.
 *
 * Shared Platform Layer - Reusable across all sheet types.
 */

export class PanelVisibilityManager {
  constructor(sheetInstance) {
    this.sheet = sheetInstance;

    // Panel visibility state: panelName → { visible, lastBuilt, cacheValid }
    this.panelState = {};

    // Tab mappings (override in subclass): tabName → [panelNames]
    // Example: { primary: ['healthPanel', 'defensePanel'], ... }
    this.tabPanels = {};

    // Conditional panels (override in subclass): panelName → { condition, reason }
    this.conditionalPanels = {};

    // Current active tab (set by sheet)
    this.currentTab = null;

    // Initialize panel state
    this._initializePanelState();
  }

  /**
   * Initialize visibility state for all panels
   * Call after tabPanels and conditionalPanels are set by subclass
   * @protected
   */
  _initializePanelState() {
    // Get all unique panels from tab mappings
    const allPanels = new Set();
    for (const panelList of Object.values(this.tabPanels)) {
      if (Array.isArray(panelList)) {
        panelList.forEach(p => allPanels.add(p));
      }
    }

    // Also include conditional panels
    for (const panelName of Object.keys(this.conditionalPanels)) {
      allPanels.add(panelName);
    }

    // Initialize state for each panel
    for (const panelName of allPanels) {
      this.panelState[panelName] = {
        visible: false,
        lastBuilt: null,
        cacheValid: false
      };
    }
  }

  /**
   * Set which tab is currently active
   * Called by sheet when tab changes
   * @param {string} tabName - Name of active tab
   */
  setActiveTab(tabName) {
    this.currentTab = tabName;
    this._updateVisibility();
  }

  /**
   * Update visibility based on current active tab
   * @private
   */
  _updateVisibility() {
    const visiblePanels = this.tabPanels[this.currentTab] || [];

    for (const [panelName, state] of Object.entries(this.panelState)) {
      state.visible = visiblePanels.includes(panelName);
    }
  }

  /**
   * Check if a panel should be built
   * Considers: visibility, cache validity, conditions
   * @param {string} panelName - Name of panel to check
   * @param {Actor} actor - Actor instance
   * @returns {boolean}
   */
  shouldBuildPanel(panelName, actor) {
    const state = this.panelState[panelName];

    if (!state) {
      // Unknown panel, build it anyway (safety fallback)
      return true;
    }

    // Skip if not visible and cache is valid
    if (!state.visible && state.cacheValid) {
      return false;
    }

    // Check conditional panels (override in subclass)
    if (this.conditionalPanels[panelName]) {
      const { condition } = this.conditionalPanels[panelName];
      if (!condition(actor)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Mark a panel as built (called after builder runs)
   * @param {string} panelName - Name of panel
   */
  markPanelBuilt(panelName) {
    if (this.panelState[panelName]) {
      this.panelState[panelName].lastBuilt = new Date();
      this.panelState[panelName].cacheValid = true;
    }
  }

  /**
   * Invalidate a panel's cache when its data changes
   * @param {string} panelName - Name of panel to invalidate
   */
  invalidatePanel(panelName) {
    if (this.panelState[panelName]) {
      this.panelState[panelName].cacheValid = false;
    }
  }

  /**
   * Invalidate multiple panels by data type change
   * Subclasses override this to map change types to panels
   * @param {string} type - Type of change (item, talent, feat, etc.)
   */
  invalidateByType(type) {
    // Override in subclass to implement type-based invalidation
    // Example: if type === 'item', invalidate inventory panels
  }

  /**
   * Get list of panels that need building this render
   * @param {Actor} actor - Actor instance
   * @returns {string[]}
   */
  getPanelsToBuild(actor) {
    return Object.keys(this.panelState)
      .filter(panelName => this.shouldBuildPanel(panelName, actor));
  }

  /**
   * Get panels that were skipped (for diagnostics)
   * @param {Actor} actor - Actor instance
   * @returns {string[]}
   */
  getPanelsSkipped(actor) {
    return Object.keys(this.panelState)
      .filter(panelName => !this.shouldBuildPanel(panelName, actor));
  }

  /**
   * Clear all cached data (on sheet close or reset)
   */
  clearCache() {
    for (const state of Object.values(this.panelState)) {
      state.cacheValid = false;
      state.lastBuilt = null;
    }
  }

  /**
   * Get visibility state (for debugging)
   * @returns {object}
   */
  getState() {
    return {
      currentTab: this.currentTab,
      panelState: { ...this.panelState }
    };
  }
}
