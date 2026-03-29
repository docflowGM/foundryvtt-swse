/**
 * PanelVisibilityManager
 *
 * Tracks which panels are currently visible and skips building hidden panels.
 * Reduces render time by avoiding expensive builders for off-screen content.
 *
 * Implements a lazy-loading pattern:
 * - Visible panels: always build
 * - Hidden panels: skip until user navigates to them
 * - Conditional panels: check conditions before building
 */

export class PanelVisibilityManager {
  constructor(sheetInstance) {
    this.sheet = sheetInstance;

    // Panel visibility state: panelName → { visible, lastBuilt, cacheValid }
    this.panelState = {};

    // Tab mappings: tabName → [panelNames]
    this.tabPanels = {
      primary: ['portraitPanel', 'biographyPanel', 'healthPanel', 'defensePanel'],
      gear: ['inventoryPanel', 'armorSummaryPanel', 'equipmentLedgerPanel'],
      talents: ['talentPanel', 'featPanel'],
      combat: ['maneuverPanel', 'secondWindPanel', 'darkSidePanel'],
      force: ['forcePowersPanel'],
      starship: ['starshipManeuversPanel'],
      social: ['relationshipsPanel', 'languagesPanel', 'racialAbilitiesPanel'],
      notes: ['combatNotesPanel'] // If there are dedicated note tabs
    };

    // Conditional panels: panelName → { condition: (actor) => boolean }
    // Panels only build if condition returns true
    this.conditionalPanels = {
      forcePowersPanel: {
        condition: (actor) => actor.system?.forceSensitive === true,
        reason: 'not force sensitive'
      },
      starshipManeuversPanel: {
        condition: (actor) => actor.type === 'vehicle' || actor.system?.isVehicle === true,
        reason: 'not a vehicle'
      }
    };

    // Current active tab
    this.currentTab = 'primary';

    // Initialize panel state
    this._initializePanelState();
  }

  /**
   * Initialize visibility state for all panels
   * @private
   */
  _initializePanelState() {
    const allPanels = Object.values(this.tabPanels).flat();
    const uniquePanels = [...new Set(allPanels)];

    for (const panelName of uniquePanels) {
      this.panelState[panelName] = {
        visible: false,
        lastBuilt: null,
        cacheValid: false
      };
    }
  }

  /**
   * Set which tab is currently active
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
   * @param {string} panelName - Name of panel to check
   * @param {Actor} actor - Actor instance
   * @returns {boolean}
   */
  shouldBuildPanel(panelName, actor) {
    const state = this.panelState[panelName];

    if (!state) {
      // Unknown panel, build it anyway
      return true;
    }

    // Skip if not visible and cache is valid
    if (!state.visible && state.cacheValid) {
      return false;
    }

    // Check conditional panels
    if (this.conditionalPanels[panelName]) {
      const { condition } = this.conditionalPanels[panelName];
      if (!condition(actor)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Mark a panel as built
   * @param {string} panelName - Name of panel
   */
  markPanelBuilt(panelName) {
    if (this.panelState[panelName]) {
      this.panelState[panelName].lastBuilt = new Date();
      this.panelState[panelName].cacheValid = true;
    }
  }

  /**
   * Invalidate a panel's cache (when its data changes)
   * @param {string} panelName - Name of panel to invalidate
   */
  invalidatePanel(panelName) {
    if (this.panelState[panelName]) {
      this.panelState[panelName].cacheValid = false;
    }
  }

  /**
   * Invalidate multiple panels by type
   * @param {string} type - Type of change (item, talent, feat, etc.)
   */
  invalidateByType(type) {
    // Map change types to affected panels
    const invalidationMap = {
      item: ['inventoryPanel', 'armorSummaryPanel', 'equipmentLedgerPanel'],
      talent: ['talentPanel'],
      feat: ['featPanel'],
      maneuver: ['maneuverPanel', 'starshipManeuversPanel'],
      force: ['forcePowersPanel'],
      relationship: ['relationshipsPanel'],
      language: ['languagesPanel'],
      ability: ['racialAbilitiesPanel'],
      combat: ['darkSidePanel', 'secondWindPanel'],
      health: ['healthPanel'],
      defense: ['defensePanel'],
      biography: ['biographyPanel'],
      portrait: ['portraitPanel']
    };

    const panelsToInvalidate = invalidationMap[type] || [];
    for (const panelName of panelsToInvalidate) {
      this.invalidatePanel(panelName);
    }
  }

  /**
   * Get list of panels that need building
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
