/**
 * UIStateManager
 *
 * Preserves interactive UI state across sheet rerenders.
 * Keeps track of:
 * - Active tabs/subtabs
 * - Expanded/collapsed sections
 * - Focused form fields
 * - Scroll positions
 * - Filter/sort preferences
 *
 * This prevents the frustrating experience of the sheet "resetting" everything
 * the user was doing when data changes trigger a rerender.
 */

export class UIStateManager {
  constructor(sheetInstance) {
    this.sheet = sheetInstance;

    // Sheet-local state storage (cleared on sheet close)
    this.state = {
      // Active tabs: tab group name → active tab ID
      activeTabs: {},

      // Expanded rows: row element ID → boolean
      expandedRows: new Set(),

      // Focused field: field name that had focus
      focusedField: null,

      // Scroll positions: scroll container ID → scroll position
      scrollPositions: {},

      // Filter/search state: panel name → filter state
      filters: {},

      // Custom state: arbitrary per-panel state
      panelState: {}
    };
  }

  /**
   * Resolve the actual DOM root for ApplicationV2 sheets.
   * In this codebase, this.sheet.element is sometimes a control element rather
   * than the form wrapping the sheet content, so we normalize it here.
   * @returns {HTMLElement|null}
   */
  _getRoot() {
    let root = this.sheet?.element?.[0] ?? this.sheet?.element ?? null;
    if (!root) return null;

    if (root.tagName !== "FORM") {
      const formViaClosest = typeof root.closest === "function" ? root.closest("form") : null;
      if (formViaClosest) return formViaClosest;

      const formViaQuery = typeof root.querySelector === "function" ? root.querySelector("form") : null;
      if (formViaQuery) return formViaQuery;
    }

    return root;
  }

  /**
   * Get the logical tab group for a button. Some templates store the group on
   * the button, others only on the nav/panel layer, so default to "primary".
   * @param {HTMLElement} tabButton
   * @returns {string}
   */
  _getTabGroup(tabButton) {
    return tabButton?.dataset?.tabGroup || tabButton?.dataset?.group || "primary";
  }

  /**
   * Find all tab buttons for a group.
   * Supports both explicit per-button grouping and older ungrouped markup.
   * @param {HTMLElement} root
   * @param {string} tabGroup
   * @returns {HTMLElement[]}
   */
  _getGroupButtons(root, tabGroup) {
    if (!root) return [];

    const explicitButtons = Array.from(
      root.querySelectorAll(
        `[data-action="tab"][data-tab-group="${tabGroup}"], [data-action="tab"][data-group="${tabGroup}"]`
      )
    );
    if (explicitButtons.length > 0) return explicitButtons;

    return Array.from(root.querySelectorAll('[data-action="tab"]'));
  }

  /**
   * Find all tab panels for a group.
   * @param {HTMLElement} root
   * @param {string} tabGroup
   * @returns {HTMLElement[]}
   */
  _getGroupPanels(root, tabGroup) {
    if (!root) return [];

    const explicitPanels = Array.from(
      root.querySelectorAll(
        `.tab[data-tab-group="${tabGroup}"], .tab[data-group="${tabGroup}"]`
      )
    );
    if (explicitPanels.length > 0) return explicitPanels;

    return Array.from(root.querySelectorAll('.tab[data-tab]'));
  }

  /**
   * Find the content panel for a tab name + group.
   * @param {HTMLElement} root
   * @param {string} tabGroup
   * @param {string} tabName
   * @returns {HTMLElement|null}
   */
  _findPanelForTab(root, tabGroup, tabName) {
    if (!root || !tabName) return null;

    return (
      root.querySelector(`.tab[data-tab="${tabName}"][data-tab-group="${tabGroup}"]`) ||
      root.querySelector(`.tab[data-tab="${tabName}"][data-group="${tabGroup}"]`) ||
      root.querySelector(`.tab[data-tab="${tabName}"]`)
    );
  }

  /**
   * Find a tab button from stored state.
   * @param {HTMLElement} root
   * @param {string} tabGroup
   * @param {string} tabName
   * @returns {HTMLElement|null}
   */
  _findButtonForTab(root, tabGroup, tabName) {
    if (!root || !tabName) return null;

    return (
      root.querySelector(`[data-action="tab"][data-tab="${tabName}"][data-tab-group="${tabGroup}"]`) ||
      root.querySelector(`[data-action="tab"][data-tab="${tabName}"][data-group="${tabGroup}"]`) ||
      root.querySelector(`[data-action="tab"][data-tab="${tabName}"]`)
    );
  }

  /**
   * Mark a tab button inactive.
   * @param {HTMLElement} button
   */
  _deactivateButton(button) {
    button.classList.remove('active');
    button.setAttribute('aria-selected', 'false');
  }

  /**
   * Mark a tab button active.
   * @param {HTMLElement} button
   */
  _activateButton(button) {
    button.classList.add('active');
    button.setAttribute('aria-selected', 'true');
  }

  /**
   * Hide a tab panel.
   * @param {HTMLElement} panel
   */
  _hidePanel(panel) {
    panel.classList.remove('active');
    panel.hidden = true;
    panel.style.display = 'none';
  }

  /**
   * Show a tab panel.
   * @param {HTMLElement} panel
   */
  _showPanel(panel) {
    panel.classList.add('active');
    panel.hidden = false;
    panel.style.removeProperty('display');
  }

  /**
   * Save current interactive state from the DOM.
   * Called before rerender.
   */
  captureState() {
    const root = this._getRoot();
    if (!root) return;

    // Capture active tabs
    const tabButtons = root.querySelectorAll('[data-action="tab"]');
    for (const button of tabButtons) {
      const tabName = button.dataset.tab;
      if (!tabName) continue;

      const tabGroup = this._getTabGroup(button);
      const isActive =
        button.classList.contains('active') ||
        button.parentElement?.classList.contains('active');

      if (isActive) {
        this.state.activeTabs[tabGroup] = tabName;
      }
    }

    // Capture expanded rows
    const expandableRows = root.querySelectorAll('[data-expandable="true"]');
    this.state.expandedRows.clear();
    for (const row of expandableRows) {
      if (row.classList.contains('expanded') || row.dataset.expanded === 'true') {
        const rowId = row.id || row.dataset.itemId;
        if (rowId) this.state.expandedRows.add(rowId);
      }
    }

    // Capture focused field
    const focusedElement = root.querySelector(':focus');
    if (focusedElement && focusedElement.name) {
      this.state.focusedField = focusedElement.name;
    } else {
      this.state.focusedField = null;
    }

    // Capture scroll positions for major containers
    const scrollContainers = root.querySelectorAll('[data-scroll-container]');
    for (const container of scrollContainers) {
      const containerId = container.id || container.dataset.scrollContainer;
      if (containerId) {
        this.state.scrollPositions[containerId] = {
          top: container.scrollTop,
          left: container.scrollLeft
        };
      }
    }
  }

  /**
   * Restore interactive state to the DOM after rerender.
   * Called after rerender completes.
   */
  restoreState() {
    const root = this._getRoot();
    if (!root) return;

    // Restore active tabs
    if (Object.keys(this.state.activeTabs).length > 0) {
      for (const [tabGroup, tabName] of Object.entries(this.state.activeTabs)) {
        const activeButton = this._findButtonForTab(root, tabGroup, tabName);
        if (activeButton) {
          this._activateTab(activeButton);
        }
      }
    }

    // Restore expanded rows
    if (this.state.expandedRows.size > 0) {
      const expandableRows = root.querySelectorAll('[data-expandable="true"]');
      for (const row of expandableRows) {
        const rowId = row.id || row.dataset.itemId;
        if (rowId && this.state.expandedRows.has(rowId)) {
          row.classList.add('expanded');
          row.dataset.expanded = 'true';
        } else {
          row.classList.remove('expanded');
          row.dataset.expanded = 'false';
        }
      }
    }

    // Restore focus (avoid hidden elements)
    if (this.state.focusedField) {
      const focusTarget = root.querySelector(`[name="${this.state.focusedField}"]`);
      if (focusTarget && focusTarget.offsetParent !== null) {
        try {
          focusTarget.focus();
        } catch (_err) {
          // Silently fail if focus cannot be restored.
        }
      }
    }

    // Restore scroll positions
    if (Object.keys(this.state.scrollPositions).length > 0) {
      for (const [containerId, position] of Object.entries(this.state.scrollPositions)) {
        const container = root.querySelector(`#${containerId}, [data-scroll-container="${containerId}"]`);
        if (container) {
          container.scrollTop = position.top;
          container.scrollLeft = position.left;
        }
      }
    }

    // PHASE 2: Ensure valid tab state after restoration
    // This handles cases where the stored tab is now unavailable (e.g., force tab hidden when not force-sensitive)
    this._ensureValidActiveTab(root);
  }

  /**
   * Manually set active tab (helper for tab click handlers)
   * @param {HTMLElement} tabButton - The tab button that was clicked
   */
  _activateTab(tabButton) {
    const root = this._getRoot();
    if (!root || !tabButton) return;

    const tabName = tabButton.dataset.tab;
    if (!tabName) return;

    const tabGroup = this._getTabGroup(tabButton);
    const groupButtons = this._getGroupButtons(root, tabGroup);
    const groupPanels = this._getGroupPanels(root, tabGroup);

    // Deactivate all buttons and panels in the group.
    for (const button of groupButtons) {
      this._deactivateButton(button);
    }
    for (const panel of groupPanels) {
      this._hidePanel(panel);
    }

    // Activate the requested button and matching panel.
    this._activateButton(tabButton);
    const panel = this._findPanelForTab(root, tabGroup, tabName);
    if (panel) this._showPanel(panel);

    // Remember this tab is active.
    this.state.activeTabs[tabGroup] = tabName;
  }

  /**
   * PHASE 2: Ensure exactly one valid tab is active after restoration.
   * Fallback to overview if restoration failed or invalid state detected.
   * This handles cases where the stored tab is now unavailable (e.g., force tab hidden when actor not force-sensitive).
   * @param {HTMLElement} root - Sheet root element
   * @returns {string|null} - Name of finally-active tab
   * @private
   */
  _ensureValidActiveTab(root) {
    if (!root) return null;

    // Count active tabs in primary group
    const activeTabs = root.querySelectorAll('.tab.active[data-group="primary"], .tab.active[data-tab-group="primary"]');

    if (activeTabs.length === 1) {
      // Exactly one active tab: extract name and verify stored state matches
      const activeTab = activeTabs[0];
      const tabName = activeTab.dataset.tab;
      // Ensure stored state reflects the active tab
      this.state.activeTabs['primary'] = tabName;
      console.log(`[TAB INVARIANT] ✓ Exactly one active tab found: ${tabName}`);
      return tabName;
    }

    if (activeTabs.length === 0) {
      // No active tabs: default to overview
      console.warn(`[TAB INVARIANT] ⚠ No active tab found; defaulting to overview`);
      const overviewButton = root.querySelector('[data-action="tab"][data-tab="overview"]');
      if (overviewButton) {
        this._activateTab(overviewButton);
        return 'overview';
      }
      // If overview doesn't exist, try to activate any available tab as fallback
      const anyTabButton = root.querySelector('[data-action="tab"]');
      if (anyTabButton) {
        this._activateTab(anyTabButton);
        return anyTabButton.dataset.tab;
      }
      return null;
    }

    if (activeTabs.length > 1) {
      // Multiple active tabs: this should never happen, but fix it
      console.warn(`[TAB INVARIANT] ⚠ Multiple active tabs found (${activeTabs.length}); resetting to overview`);
      const buttons = root.querySelectorAll('[data-action="tab"][data-group="primary"], [data-action="tab"][data-tab-group="primary"]');
      buttons.forEach(btn => this._deactivateButton(btn));
      const panels = root.querySelectorAll('.tab[data-group="primary"], .tab[data-tab-group="primary"]');
      panels.forEach(pnl => this._hidePanel(pnl));

      const overviewButton = root.querySelector('[data-action="tab"][data-tab="overview"]');
      if (overviewButton) {
        this._activateTab(overviewButton);
        return 'overview';
      }
      return null;
    }

    return null;
  }

  /**
   * Toggle row expansion
   * @param {string} rowId - ID of the row
   * @param {boolean} expanded - Whether expanded
   */
  setRowExpanded(rowId, expanded) {
    if (expanded) {
      this.state.expandedRows.add(rowId);
    } else {
      this.state.expandedRows.delete(rowId);
    }
  }

  /**
   * Check if a row is expanded
   * @param {string} rowId - ID of the row
   * @returns {boolean}
   */
  isRowExpanded(rowId) {
    return this.state.expandedRows.has(rowId);
  }

  /**
   * Set filter state for a panel
   * @param {string} panelName - Name of panel
   * @param {object} filterState - Filter configuration
   */
  setFilter(panelName, filterState) {
    this.state.filters[panelName] = filterState;
  }

  /**
   * Get filter state for a panel
   * @param {string} panelName - Name of panel
   * @returns {object|null}
   */
  getFilter(panelName) {
    return this.state.filters[panelName] || null;
  }

  /**
   * Set arbitrary panel state
   * @param {string} panelName - Name of panel
   * @param {object} stateData - Arbitrary state object
   */
  setPanelState(panelName, stateData) {
    this.state.panelState[panelName] = stateData;
  }

  /**
   * Get arbitrary panel state
   * @param {string} panelName - Name of panel
   * @returns {object|null}
   */
  getPanelState(panelName) {
    return this.state.panelState[panelName] || null;
  }

  /**
   * Clear all state (called on sheet close)
   */
  clear() {
    this.state.activeTabs = {};
    this.state.expandedRows.clear();
    this.state.focusedField = null;
    this.state.scrollPositions = {};
    this.state.filters = {};
    this.state.panelState = {};
  }

  /**
   * Get current state (for debugging)
   * @returns {object}
   */
  getState() {
    return {
      activeTabs: this.state.activeTabs,
      expandedRows: Array.from(this.state.expandedRows),
      focusedField: this.state.focusedField,
      scrollPositions: this.state.scrollPositions,
      filters: this.state.filters,
      panelState: this.state.panelState
    };
  }
}
