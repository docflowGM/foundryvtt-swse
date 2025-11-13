/**
 * Tab Handler Mixin
 * Provides tab switching functionality for SWSE sheets
 * Compatible with both V1 and V2 sheet APIs
 */

export const TabHandler = {
  /**
   * Activate tab listeners on the sheet HTML
   * Call this from activateListeners in your sheet
   */
  activateTabListeners(html) {
    // Find all tab navigation elements
    const tabGroups = html.find('[data-group="primary"]');

    if (tabGroups.length === 0) {
      console.warn('SWSE | No tab groups found on sheet');
      return;
    }

    // Handle tab clicks
    html.on('click', '.sheet-tabs a.item[data-tab]', (event) => {
      event.preventDefault();
      const tab = event.currentTarget.dataset.tab;
      const group = event.currentTarget.closest('[data-group]')?.dataset.group || 'primary';

      this._onChangeTab(event, tab, group);
    });

    // Initialize - show the first active tab or default tab
    this._initializeTabs(html);
  },

  /**
   * Initialize tabs on sheet render
   */
  _initializeTabs(html) {
    const activeTab = html.find('.sheet-tabs a.item.active[data-tab]').first();

    if (activeTab.length > 0) {
      const tab = activeTab.data('tab');
      const group = activeTab.closest('[data-group]')?.dataset?.group || 'primary';
      this._activateTab(html, tab, group);
    } else {
      // If no tab is marked active, activate the first one
      const firstTab = html.find('.sheet-tabs a.item[data-tab]').first();
      if (firstTab.length > 0) {
        const tab = firstTab.data('tab');
        const group = firstTab.closest('[data-group]')?.dataset?.group || 'primary';
        firstTab.addClass('active');
        this._activateTab(html, tab, group);
      }
    }
  },

  /**
   * Handle tab change
   */
  _onChangeTab(event, tab, group) {
    event.preventDefault();
    const html = $(event.currentTarget).closest('form');
    this._activateTab(html, tab, group);
  },

  /**
   * Activate a specific tab
   */
  _activateTab(html, tabName, groupName = 'primary') {
    // Deactivate all tabs in this group
    html.find(`.sheet-tabs[data-group="${groupName}"] a.item`).removeClass('active');
    html.find(`.tab[data-group="${groupName}"]`).removeClass('active');

    // Activate the selected tab
    html.find(`.sheet-tabs[data-group="${groupName}"] a.item[data-tab="${tabName}"]`).addClass('active');
    html.find(`.tab[data-group="${groupName}"][data-tab="${tabName}"]`).addClass('active');

    // Store the active tab in a flag for persistence
    if (this.actor) {
      this._lastTab = this._lastTab || {};
      this._lastTab[groupName] = tabName;
    }

    console.log(`SWSE | Activated tab: ${tabName} in group: ${groupName}`);
  }
};
