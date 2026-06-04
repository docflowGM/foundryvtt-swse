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

    pageElement.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
      checkbox.addEventListener('change', async (event) => {
        const key = event.target.dataset.ruleKey;
        const checked = event.target.checked;
        if (!key) return;

        try {
          await mutateAndRepaint(this.host, () => HouseRuleService.set(key, checked), {
            reason: 'gm-house-rule-toggle',
            surfaceId: 'house-rules'
          });
          SWSELogger.info(`[GMDatapad House Rules] Updated ${key} = ${checked}`);
        } catch (err) {
          SWSELogger.error(`[GMDatapad House Rules] Failed to update ${key}:`, err);
          event.target.checked = !checked;
        }
      }, { signal });
    });

    pageElement.querySelectorAll('.rule-category, .gm-phase7-rule-category').forEach((category) => {
      category.addEventListener('mouseenter', (event) => {
        event.currentTarget.classList.add('hovered');
      }, { signal });
      category.addEventListener('mouseleave', (event) => {
        event.currentTarget.classList.remove('hovered');
      }, { signal });
    });

    this._wireRuleFiltering(pageElement, signal);
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
