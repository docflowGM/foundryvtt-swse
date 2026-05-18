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
    this._focusState = null;
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
    if (searchEl) searchEl.value = this._searchQuery;

    // Restore sort dropdown value
    const sortEl = regionEl.querySelector('[data-utility-sort]');
    if (sortEl && this._sortValue) sortEl.value = this._sortValue;

    // Restore stat dropdowns (bonus-stat, penalty-stat)
    regionEl.querySelectorAll('[data-utility-select]').forEach(dropdown => {
      const id = dropdown.dataset.utilitySelect;
      const value = this._filterState[id];
      if (value !== undefined && value !== null && value !== '') dropdown.value = value;
    });

    if (searchEl && this._focusState?.control === 'search') {
      searchEl.focus({ preventScroll: true });
      if (typeof this._focusState.start === 'number' && typeof searchEl.setSelectionRange === 'function') {
        try {
          searchEl.setSelectionRange(this._focusState.start, this._focusState.end ?? this._focusState.start);
        } catch (_) {}
      }
    }
  }



  /**
   * Notify the active step plugin directly when utility controls change.
   *
   * The utility bar lives in a shell region that can be replaced during inline
   * chargen renders. Bubbling CustomEvents are still emitted for legacy step
   * plugins, but direct notification gives embedded steps a reliable path even
   * when the region/root relationship is unusual.
   *
   * @param {string} type
   * @param {object} detail
   * @returns {boolean}
   * @private
   */
  _notifyActiveStepUtilityChange(type, detail = {}) {
    const shell = this.shell;
    const descriptor = shell?.steps?.[shell?.currentStepIndex] ?? null;
    const plugin = descriptor ? shell?.stepPlugins?.get?.(descriptor.stepId) : null;
    if (!plugin || typeof plugin.onUtilityChange !== 'function') return false;

    try {
      const result = plugin.onUtilityChange({
        type,
        detail: { ...detail },
        utilityBar: this,
        shell,
      });
      if (result && typeof result.catch === 'function') {
        result.catch(err => console.warn('[SWSE UtilityBar] Active step utility change failed', err));
      }
      return true;
    } catch (err) {
      console.warn('[SWSE UtilityBar] Active step utility change failed', err);
      return false;
    }
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

    const rememberSearchFocus = (el) => {
      this._focusState = {
        control: 'search',
        start: el.selectionStart ?? null,
        end: el.selectionEnd ?? null
      };
    };

    // Search input
    const searchEl = regionEl.querySelector('[data-utility-search]');
    if (searchEl) {
      track(searchEl, 'input', e => {
        this._searchQuery = e.target.value;
        rememberSearchFocus(e.target);
        const detail = { query: this._searchQuery };
        const handledByStepHook = this._notifyActiveStepUtilityChange('search', detail);
        regionEl.dispatchEvent(new CustomEvent('prog:utility:search',
          { bubbles: true, detail: { ...detail, handledByStepHook } }));
      });
      track(searchEl, 'focus', e => rememberSearchFocus(e.target));
    }

    // Filter chips
    regionEl.querySelectorAll('[data-utility-filter]').forEach(chip => {
      track(chip, 'click', () => {
        const id = chip.dataset.utilityFilter;
        this._filterState[id] = !(this._filterState[id] ?? false);
        chip.dataset.active = String(this._filterState[id]);
        chip.classList.toggle('prog-utility-bar__filter-chip--active', this._filterState[id]);
        const detail = { filterId: id, value: this._filterState[id] };
        const handledByStepHook = this._notifyActiveStepUtilityChange('filter', detail);
        regionEl.dispatchEvent(new CustomEvent('prog:utility:filter',
          { bubbles: true, detail: { ...detail, handledByStepHook } }));
      });
    });

    // Sort dropdown
    const sortEl = regionEl.querySelector('[data-utility-sort]');
    if (sortEl) {
      track(sortEl, 'change', e => {
        this._sortValue = e.target.value;
        const detail = { sortId: this._sortValue };
        const handledByStepHook = this._notifyActiveStepUtilityChange('sort', detail);
        regionEl.dispatchEvent(new CustomEvent('prog:utility:sort',
          { bubbles: true, detail: { ...detail, handledByStepHook } }));
      });
    }

    // Stat dropdowns (bonus/penalty)
    regionEl.querySelectorAll('[data-utility-select]').forEach(dropdown => {
      track(dropdown, 'change', e => {
        const id = dropdown.dataset.utilitySelect;
        const value = e.target.value;
        this._filterState[id] = value;
        const detail = { filterId: id, value: value };
        const handledByStepHook = this._notifyActiveStepUtilityChange('filter', detail);
        regionEl.dispatchEvent(new CustomEvent('prog:utility:filter',
          { bubbles: true, detail: { ...detail, handledByStepHook } }));
      });
    });

    regionEl.querySelectorAll('[data-action="reset-utility-filters"]').forEach(button => {
      track(button, 'click', () => {
        this._searchQuery = '';
        Object.keys(this._filterState).forEach(key => {
          this._filterState[key] = typeof this._filterState[key] === 'boolean' ? false : '';
        });

        const searchInput = regionEl.querySelector('[data-utility-search]');
        if (searchInput) {
          searchInput.value = '';
          this._focusState = { control: 'search', start: 0, end: 0 };
        }

        regionEl.querySelectorAll('[data-utility-filter]').forEach(chip => {
          chip.dataset.active = 'false';
          chip.classList.remove('prog-utility-bar__filter-chip--active');
        });
        const sortInput = regionEl.querySelector('[data-utility-sort]');
        if (sortInput) {
          sortInput.selectedIndex = 0;
          this._sortValue = sortInput.value || '';
        } else {
          this._sortValue = '';
        }
        regionEl.querySelectorAll('[data-utility-select]').forEach(dropdown => {
          dropdown.selectedIndex = 0;
          const id = dropdown.dataset.utilitySelect;
          this._filterState[id] = dropdown.value;
        });

        {
          const detail = { query: '' };
          const handledByStepHook = this._notifyActiveStepUtilityChange('search', detail);
          regionEl.dispatchEvent(new CustomEvent('prog:utility:search', { bubbles: true, detail: { ...detail, handledByStepHook } }));
        }
        for (const [id, value] of Object.entries(this._filterState)) {
          const detail = { filterId: id, value };
          const handledByStepHook = this._notifyActiveStepUtilityChange('filter', detail);
          regionEl.dispatchEvent(new CustomEvent('prog:utility:filter', { bubbles: true, detail: { ...detail, handledByStepHook } }));
        }
        {
          const detail = { sortId: this._sortValue };
          const handledByStepHook = this._notifyActiveStepUtilityChange('sort', detail);
          regionEl.dispatchEvent(new CustomEvent('prog:utility:sort', { bubbles: true, detail: { ...detail, handledByStepHook } }));
        }
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
