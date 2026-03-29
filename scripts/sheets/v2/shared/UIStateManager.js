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
   * Save current interactive state from the DOM
   * Called before rerender
   */
  captureState() {
    // Capture active tabs
    const tabButtons = this.sheet.element?.querySelectorAll('[data-action="tab"]');
    if (tabButtons) {
      for (const button of tabButtons) {
        const tabGroup = button.dataset.tabGroup;
        const tabName = button.dataset.tab;

        // Check if this button looks active (parent has 'active' class or similar)
        if (button.classList.contains('active') || button.parentElement?.classList.contains('active')) {
          this.state.activeTabs[tabGroup] = tabName;
        }
      }
    }

    // Capture expanded rows
    const expandableRows = this.sheet.element?.querySelectorAll('[data-expandable="true"]');
    if (expandableRows) {
      this.state.expandedRows.clear();
      for (const row of expandableRows) {
        if (row.classList.contains('expanded') || row.dataset.expanded === 'true') {
          const rowId = row.id || row.dataset.itemId;
          if (rowId) this.state.expandedRows.add(rowId);
        }
      }
    }

    // Capture focused field
    const focusedElement = this.sheet.element?.querySelector(':focus');
    if (focusedElement && focusedElement.name) {
      this.state.focusedField = focusedElement.name;
    }

    // Capture scroll positions for major containers
    const scrollContainers = this.sheet.element?.querySelectorAll('[data-scroll-container]');
    if (scrollContainers) {
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
  }

  /**
   * Restore interactive state to the DOM after rerender
   * Called after rerender completes
   */
  restoreState() {
    // Restore active tabs
    if (Object.keys(this.state.activeTabs).length > 0) {
      for (const [tabGroup, tabName] of Object.entries(this.state.activeTabs)) {
        const activeButton = this.sheet.element?.querySelector(
          `[data-action="tab"][data-tab="${tabName}"][data-tab-group="${tabGroup}"]`
        );
        if (activeButton) {
          this._activateTab(activeButton);
        }
      }
    }

    // Restore expanded rows
    if (this.state.expandedRows.size > 0) {
      const expandableRows = this.sheet.element?.querySelectorAll('[data-expandable="true"]');
      if (expandableRows) {
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
    }

    // Restore focus (be careful not to focus hidden elements)
    if (this.state.focusedField) {
      const focusTarget = this.sheet.element?.querySelector(`[name="${this.state.focusedField}"]`);
      if (focusTarget && focusTarget.offsetParent !== null) { // offsetParent null = hidden
        try {
          focusTarget.focus();
        } catch (e) {
          // Silently fail if focus cannot be set
        }
      }
    }

    // Restore scroll positions
    if (Object.keys(this.state.scrollPositions).length > 0) {
      for (const [containerId, position] of Object.entries(this.state.scrollPositions)) {
        const container = this.sheet.element?.querySelector(`#${containerId}, [data-scroll-container="${containerId}"]`);
        if (container) {
          container.scrollTop = position.top;
          container.scrollLeft = position.left;
        }
      }
    }
  }

  /**
   * Manually set active tab (helper for tab click handlers)
   * @param {HTMLElement} tabButton - The tab button that was clicked
   */
  _activateTab(tabButton) {
    const tabGroup = tabButton.dataset.tabGroup;

    // Deactivate all tabs in this group
    const groupButtons = this.sheet.element?.querySelectorAll(`[data-tab-group="${tabGroup}"]`);
    if (groupButtons) {
      for (const btn of groupButtons) {
        btn.classList.remove('active');
        const content = this.sheet.element?.querySelector(`[data-tab-content="${btn.dataset.tab}"][data-group="${tabGroup}"]`);
        if (content) content.style.display = 'none';
      }
    }

    // Activate clicked tab
    tabButton.classList.add('active');
    const content = this.sheet.element?.querySelector(
      `[data-tab-content="${tabButton.dataset.tab}"][data-group="${tabGroup}"]`
    );
    if (content) content.style.display = 'block';

    // Remember this tab is active
    this.state.activeTabs[tabGroup] = tabButton.dataset.tab;
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
