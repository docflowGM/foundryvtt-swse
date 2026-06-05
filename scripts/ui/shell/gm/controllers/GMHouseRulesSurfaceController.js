/**
 * GMHouseRulesSurfaceController
 *
 * Owns DOM wiring for the GM House Rules surface while leaving rule mutation in
 * HouseRuleService.
 */

import { HouseRuleService } from '/systems/foundryvtt-swse/scripts/engine/system/HouseRuleService.js';
import { SWSELogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';
import { mutateAndRepaint } from '/systems/foundryvtt-swse/scripts/ui/shell/mutate-and-repaint.js';

export class GMHouseRulesSurfaceController {
  constructor(host) {
    this.host = host;
    this._abort = null;
  }

  async attach(root) {
    this.destroy();
    this._abort = new AbortController();
    const signal = this._abort.signal;
    const pageElement = root.matches?.('.gm-datapad-house-rules')
      ? root
      : root.querySelector('.gm-datapad-house-rules');
    if (!pageElement) return;

    this._wireRuleControls(pageElement, signal);

    pageElement.querySelectorAll('.rule-category, .gm-phase7-rule-category').forEach((category) => {
      category.addEventListener('mouseenter', (event) => {
        event.currentTarget.classList.add('hovered');
      }, { signal });
      category.addEventListener('mouseleave', (event) => {
        event.currentTarget.classList.remove('hovered');
      }, { signal });
    });

    this._wireRuleFiltering(pageElement, signal);
    this._wireBannedSpeciesPicker(pageElement, signal);
  }


  _coerceRuleControlValue(control) {
    const type = String(control?.dataset?.ruleType || '').toLowerCase();

    if (type === 'boolean') return control.checked === true;
    if (type === 'number') {
      const parsed = Number(control.value);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    if (type === 'array') {
      return String(control.value || '')
        .split(/[\n,]/)
        .map((entry) => entry.trim())
        .filter(Boolean);
    }
    if (type === 'object') {
      const raw = String(control.value || '').trim();
      if (!raw) return {};
      return JSON.parse(raw);
    }

    return String(control.value ?? '');
  }

  _setControlValue(control, value) {
    if (!control) return;
    const type = String(control.dataset.ruleType || '').toLowerCase();
    if (type === 'boolean') {
      control.checked = value === true;
      return;
    }
    if (type === 'array' && Array.isArray(value)) {
      control.value = value.join(', ');
      return;
    }
    if (type === 'object' && value && typeof value === 'object') {
      try {
        control.value = JSON.stringify(value, null, 2);
        return;
      } catch (_err) {
        // Fall through to string assignment.
      }
    }
    control.value = value ?? '';
  }

  _syncNumberCompanions(pageElement, source) {
    if (!source?.dataset?.ruleKey) return;
    if (String(source.dataset.ruleType || '').toLowerCase() !== 'number') return;
    const key = source.dataset.ruleKey;
    pageElement.querySelectorAll(`[data-rule-control][data-rule-key="${CSS.escape(key)}"]`).forEach((control) => {
      if (control !== source && String(control.dataset.ruleType || '').toLowerCase() === 'number') {
        control.value = source.value;
      }
    });
  }

  _wireRuleControls(pageElement, signal) {
    const controls = Array.from(pageElement.querySelectorAll('[data-rule-control][data-rule-key]'));
    const commit = async (control) => {
      const key = control?.dataset?.ruleKey;
      if (!key) return;

      const previousValue = control.type === 'checkbox' ? control.checked : control.value;
      let value;
      try {
        value = this._coerceRuleControlValue(control);
      } catch (err) {
        SWSELogger.error(`[GMDatapad House Rules] Invalid value for ${key}:`, err);
        ui.notifications?.error?.(`Invalid value for ${key}. Object rules must be valid JSON.`);
        return;
      }

      this._syncNumberCompanions(pageElement, control);

      try {
        await mutateAndRepaint(this.host, () => HouseRuleService.set(key, value), {
          reason: 'gm-house-rule-control',
          surfaceId: 'house-rules'
        });
        SWSELogger.info(`[GMDatapad House Rules] Updated ${key} =`, value);
      } catch (err) {
        SWSELogger.error(`[GMDatapad House Rules] Failed to update ${key}:`, err);
        this._setControlValue(control, previousValue);
      }
    };

    controls.forEach((control) => {
      if (control.matches?.('[data-rule-number-slider]')) {
        control.addEventListener('input', () => this._syncNumberCompanions(pageElement, control), { signal });
      }
      control.addEventListener('change', () => { void commit(control); }, { signal });
      control.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' || control.tagName === 'TEXTAREA') return;
        event.preventDefault();
        control.blur?.();
        void commit(control);
      }, { signal });
    });
  }

  _wireBannedSpeciesPicker(pageElement, signal) {
    const picker = pageElement.querySelector('[data-species-picker]');
    if (!picker) return;

    // Search/filter
    const searchInput = picker.querySelector('[data-species-search]');
    const items = Array.from(picker.querySelectorAll('[data-species-name]'));

    searchInput?.addEventListener('input', () => {
      const q = searchInput.value.trim().toLowerCase();
      items.forEach(item => {
        const name = (item.dataset.speciesName || '').toLowerCase();
        item.style.display = (!q || name.includes(q)) ? '' : 'none';
      });
    }, { signal });

    // Checkbox changes — collect all checked, save as comma-separated string
    picker.addEventListener('change', async (event) => {
      const checkbox = event.target.closest('[data-banned-species-checkbox]');
      if (!checkbox) return;

      const allChecked = Array.from(picker.querySelectorAll('[data-banned-species-checkbox]:checked'))
        .map(cb => cb.dataset.speciesName)
        .filter(Boolean);

      const value = allChecked.join(', ');
      try {
        await mutateAndRepaint(this.host, () => HouseRuleService.set('bannedSpecies', value), {
          reason: 'gm-banned-species-toggle',
          surfaceId: 'house-rules'
        });
        SWSELogger.info(`[GMDatapad House Rules] bannedSpecies = "${value}"`);
      } catch (err) {
        SWSELogger.error('[GMDatapad House Rules] Failed to update bannedSpecies:', err);
        checkbox.checked = !checkbox.checked;
      }
    }, { signal });
  }

  _wireRuleFiltering(pageElement, signal) {
    const searchInput = pageElement.querySelector('[data-house-rule-search]');
    const filterButtons = Array.from(pageElement.querySelectorAll('[data-house-rule-filter]'));
    const rows = Array.from(pageElement.querySelectorAll('[data-house-rule-row]'));
    const categories = Array.from(pageElement.querySelectorAll('[data-house-rule-category]'));
    const emptyState = pageElement.querySelector('[data-house-rule-empty]');

    if (!searchInput && !filterButtons.length) return;

    const normalize = (value) => String(value ?? '')
      .trim()
      .toLowerCase()
      .replace(/[\s_-]+/g, '');

    let activeFilter = normalize(filterButtons.find((button) => button.classList.contains('is-active'))?.dataset.houseRuleFilter) || 'all';

    const setHidden = (element, hidden) => {
      if (!element) return;
      element.hidden = hidden;
      element.classList.toggle('is-filtered-out', hidden);
      element.setAttribute('aria-hidden', hidden ? 'true' : 'false');
    };

    const applyFilters = () => {
      const query = String(searchInput?.value ?? '').trim().toLowerCase();
      let visibleCount = 0;

      rows.forEach((row) => {
        const category = normalize(row.dataset.ruleCategory);
        const haystack = String(row.dataset.ruleSearchText || row.textContent || '').toLowerCase();
        const matchesCategory = activeFilter === 'all' || category === activeFilter;
        const matchesSearch = !query || haystack.includes(query);
        const visible = matchesCategory && matchesSearch;

        setHidden(row, !visible);
        if (visible) visibleCount += 1;
      });

      categories.forEach((categoryEl) => {
        const category = normalize(categoryEl.dataset.houseRuleCategory);
        const categoryMatches = activeFilter === 'all' || category === activeFilter;
        const hasVisibleRows = Array.from(categoryEl.querySelectorAll('[data-house-rule-row]')).some((row) => !row.hidden);
        setHidden(categoryEl, !(categoryMatches && hasVisibleRows));
      });

      if (emptyState) {
        emptyState.hidden = visibleCount > 0;
        emptyState.classList.toggle('is-filtered-out', visibleCount > 0);
      }
    };

    searchInput?.addEventListener('input', applyFilters, { signal });
    searchInput?.addEventListener('search', applyFilters, { signal });

    pageElement.addEventListener('click', (event) => {
      const button = event.target.closest?.('[data-house-rule-filter]');
      if (!button || !pageElement.contains(button)) return;

      event.preventDefault();
      event.stopPropagation();

      activeFilter = normalize(button.dataset.houseRuleFilter || 'all') || 'all';
      filterButtons.forEach((candidate) => {
        const active = candidate === button;
        candidate.classList.toggle('is-active', active);
        candidate.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
      applyFilters();
    }, { signal });

    filterButtons.forEach((button) => {
      const active = normalize(button.dataset.houseRuleFilter) === activeFilter;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });

    applyFilters();
  }

  destroy() {
    this._abort?.abort?.();
    this._abort = null;
  }
}
