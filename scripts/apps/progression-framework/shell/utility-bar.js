/**
 * Utility Bar — manages search, filter, sort, and custom controls.
 * Fires bubbling CustomEvent from the region element for step plugins to listen to.
 */
export class UtilityBar {
  constructor(shell) {
    this.shell = shell;
    this._filterState = {}; // { filterId: boolean }
    this._searchQuery = '';
    this._sortValue = '';
    this._handlers = []; // { el, event, fn } — tracked for cleanup before re-render
  }

  /**
   * Initialize filter state from step plugin config.
   * Only sets defaults if not already set by user interaction.
   * @param {UtilityBarConfig} config
   */
  setConfig(config) {
    (config?.filters ?? []).forEach(f => {
      if (!(f.id in this._filterState)) this._filterState[f.id] = f.defaultOn ?? false;
    });
  }

  /**
   * Toggle collapse. Updates DOM data-collapsed directly (no re-render).
   * @returns {Promise<void>}
   */
  async toggle() {
    const shell = this.shell;
    shell.utilityBarCollapsed = !shell.utilityBarCollapsed;
    await game.user.setFlag('foundryvtt-swse', 'utilityBarCollapsed', shell.utilityBarCollapsed);

    const region = shell.element?.querySelector('[data-region="utility-bar"]');
    if (region) region.setAttribute('data-collapsed', String(shell.utilityBarCollapsed));
  }

  /**
   * Get current filter state.
   * @returns {Object<string, boolean>}
   */
  getFilterState() {
    return { ...this._filterState };
  }

  /**
   * Get current search query.
   * @returns {string}
   */
  getSearchQuery() {
    return this._searchQuery;
  }

  /**
   * Get current sort value.
   * @returns {string}
   */
  getSortValue() {
    return this._sortValue;
  }

  /**
   * Called by shell._onRender() after every render.
   * Cleans up stale handlers, re-wires event listeners, restores UI state.
   * @param {HTMLElement} regionEl — the [data-region="utility-bar"] element
   */
  afterRender(regionEl) {
    if (!regionEl) return;
    this._cleanup(); // remove stale handlers before attaching new ones
    this._wireEvents(regionEl);

    // Restore filter chip states
    regionEl.querySelectorAll('[data-utility-filter]').forEach(chip => {
      const id = chip.dataset.utilityFilter;
      const active = this._filterState[id] ?? false;
      chip.dataset.active = String(active);
      chip.classList.toggle('prog-utility-bar__filter-chip--active', active);
    });

    // Restore search query
    const searchEl = regionEl.querySelector('[data-utility-search]');
    if (searchEl && this._searchQuery) searchEl.value = this._searchQuery;

    // Restore sort dropdown value
    const sortEl = regionEl.querySelector('[data-utility-sort]');
    if (sortEl && this._sortValue) sortEl.value = this._sortValue;

    // Restore stat dropdowns (bonus-stat, penalty-stat)
    regionEl.querySelectorAll('[data-utility-select]').forEach(dropdown => {
      const id = dropdown.dataset.utilitySelect;
      const value = this._filterState[id];
      if (value) dropdown.value = value;
    });
  }

  /**
   * Wire all event handlers (search, filter chips, sort dropdown).
   * Handlers are tracked in _handlers for cleanup before re-render.
   * @param {HTMLElement} regionEl
   * @private
   */
  _wireEvents(regionEl) {
    const track = (el, event, fn) => {
      el.addEventListener(event, fn);
      this._handlers.push({ el, event, fn });
    };

    // Search input
    const searchEl = regionEl.querySelector('[data-utility-search]');
    if (searchEl) {
      track(searchEl, 'input', e => {
        this._searchQuery = e.target.value;
        regionEl.dispatchEvent(new CustomEvent('prog:utility:search',
          { bubbles: true, detail: { query: this._searchQuery } }));
      });
    }

    // Filter chips
    regionEl.querySelectorAll('[data-utility-filter]').forEach(chip => {
      track(chip, 'click', () => {
        const id = chip.dataset.utilityFilter;
        this._filterState[id] = !(this._filterState[id] ?? false);
        chip.dataset.active = String(this._filterState[id]);
        chip.classList.toggle('prog-utility-bar__filter-chip--active', this._filterState[id]);
        regionEl.dispatchEvent(new CustomEvent('prog:utility:filter',
          { bubbles: true, detail: { filterId: id, value: this._filterState[id] } }));
      });
    });

    // Sort dropdown
    const sortEl = regionEl.querySelector('[data-utility-sort]');
    if (sortEl) {
      track(sortEl, 'change', e => {
        this._sortValue = e.target.value;
        regionEl.dispatchEvent(new CustomEvent('prog:utility:sort',
          { bubbles: true, detail: { sortId: this._sortValue } }));
      });
    }

    // Stat dropdowns (bonus/penalty)
    regionEl.querySelectorAll('[data-utility-select]').forEach(dropdown => {
      track(dropdown, 'change', e => {
        const id = dropdown.dataset.utilitySelect;
        const value = e.target.value;
        this._filterState[id] = value;
        regionEl.dispatchEvent(new CustomEvent('prog:utility:filter',
          { bubbles: true, detail: { filterId: id, value: value } }));
      });
    });
  }

  /**
   * Clean up all event handlers before re-render.
   * @private
   */
  _cleanup() {
    this._handlers.forEach(({ el, event, fn }) => el.removeEventListener(event, fn));
    this._handlers = [];
  }
}
