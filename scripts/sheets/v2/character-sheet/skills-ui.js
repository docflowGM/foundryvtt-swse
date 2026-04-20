/**
 * Skills panel UI activation for SWSEV2CharacterSheet
 *
 * Handles skill filtering, sorting, expansion, and rolling
 */

import { SWSERoll } from "/systems/foundryvtt-swse/scripts/combat/rolls/enhanced-rolls.js";

/**
 * Activate skills panel UI listeners
 * @param {SWSEV2CharacterSheet} sheet - The character sheet instance
 * @param {HTMLElement} html - The rendered sheet element
 * @param {AbortSignal} signal - Abort signal for cleanup
 */
export function activateSkillsUI(sheet, html, { signal } = {}) {
  const skillsList = html.querySelector('.skills-list');
  const getRows = () => Array.from(html.querySelectorAll('.skill-row-container'));
  const filterControls = Array.from(html.querySelectorAll('[data-action="filter-skills"]'));
  const sortControls = Array.from(html.querySelectorAll('[data-action="sort-skills"]'));

  const applyFiltersAndSort = () => {
    const activeFilter = filterControls[0]?.value || 'all';
    const activeSort = sortControls[0]?.value || 'name';
    const skillRows = getRows();
    const visibleRows = [];

    for (const row of skillRows) {
      const trained = row.dataset.trained === 'true';
      const favorite = row.dataset.favorite === 'true';
      const focused = row.dataset.focused === 'true';
      let matches = true;
      if (activeFilter === 'trained') matches = trained;
      else if (activeFilter === 'favorited') matches = favorite;
      else if (activeFilter === 'focused') matches = focused;

      row.style.display = matches ? '' : 'none';
      let extraUsesSection = row.nextElementSibling;
      while (extraUsesSection && !extraUsesSection.classList.contains('skill-extra-uses')) {
        extraUsesSection = extraUsesSection.nextElementSibling;
      }
      if (extraUsesSection?.classList.contains('skill-extra-uses')) {
        extraUsesSection.style.display = matches ? '' : 'none';
      }
      if (matches) visibleRows.push(row);
    }

    if (!skillsList) return;
    visibleRows.sort((a, b) => {
      switch (activeSort) {
        case 'ability':
          return (a.dataset.ability || '').localeCompare(b.dataset.ability || '') || (a.dataset.label || '').localeCompare(b.dataset.label || '');
        case 'total-desc':
          return Number(b.dataset.total || 0) - Number(a.dataset.total || 0) || (a.dataset.label || '').localeCompare(b.dataset.label || '');
        case 'total-asc':
          return Number(a.dataset.total || 0) - Number(b.dataset.total || 0) || (a.dataset.label || '').localeCompare(b.dataset.label || '');
        case 'name':
        default:
          return (a.dataset.label || '').localeCompare(b.dataset.label || '');
      }
    });

    for (const row of visibleRows) {
      skillsList.appendChild(row);
      let extraUsesSection = row.nextElementSibling;
      while (extraUsesSection && !extraUsesSection.classList.contains('skill-extra-uses')) {
        extraUsesSection = extraUsesSection.nextElementSibling;
      }
      if (extraUsesSection?.classList.contains('skill-extra-uses')) {
        skillsList.appendChild(extraUsesSection);
      }
    }
  };

  filterControls.forEach(select => {
    select.addEventListener('change', applyFiltersAndSort, { signal });
  });

  sortControls.forEach(select => {
    select.addEventListener('change', applyFiltersAndSort, { signal });
  });

  html.querySelectorAll('[data-action="reset-skills-tools"]').forEach(button => {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      filterControls.forEach(select => { select.value = 'all'; });
      sortControls.forEach(select => { select.value = 'name'; });
      applyFiltersAndSort();
    }, { signal });
  });

  html.querySelectorAll('[data-action="roll-skill"]').forEach(button => {
    button.addEventListener('click', async (event) => {
      event.preventDefault();
      const skillKey = button.dataset.skill;
      if (!skillKey) return;
      try {
        await SWSERoll.rollSkill(sheet.actor, skillKey);
      } catch (err) {
        ui?.notifications?.error?.(`Skill roll failed: ${err.message}`);
      }
    }, { signal });
  });

  html.querySelectorAll('[data-action="toggle-skill-expand"]').forEach(button => {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      const skillKey = button.dataset.skill;
      if (!skillKey) return;

      const skillRow = button.closest('.skills-grid-row');
      if (!skillRow) return;
      let extraUsesSection = skillRow.nextElementSibling;
      while (extraUsesSection && !extraUsesSection.classList.contains('skill-extra-uses')) {
        extraUsesSection = extraUsesSection.nextElementSibling;
      }
      if (!extraUsesSection?.classList.contains('skill-extra-uses')) return;

      const isExpanded = button.getAttribute('aria-expanded') === 'true';
      button.setAttribute('aria-expanded', String(!isExpanded));
      const countBadge = button.querySelector('.expand-count');
      if (!countBadge) button.textContent = isExpanded ? '▶' : '▼';

      if (isExpanded) {
        extraUsesSection.classList.remove('skill-extra-uses--expanded');
        extraUsesSection.classList.add('skill-extra-uses--collapsed');
        const filterBar = extraUsesSection.querySelector('.extra-uses-filter-bar');
        if (filterBar) filterBar.classList.add('skill-extra-uses-hidden');
      } else {
        extraUsesSection.classList.remove('skill-extra-uses--collapsed');
        extraUsesSection.classList.add('skill-extra-uses--expanded');
        const filterBar = extraUsesSection.querySelector('.extra-uses-filter-bar');
        if (filterBar) filterBar.classList.remove('skill-extra-uses-hidden');
      }
    }, { signal });
  });

  html.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', (event) => {
      event.preventDefault();
      const filterType = btn.dataset.filter;
      const filterBar = btn.closest('.extra-uses-filter-bar');
      if (!filterBar) return;

      filterBar.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('filter-btn--active'));
      btn.classList.add('filter-btn--active');

      const extrasSection = filterBar.closest('.skill-extra-uses');
      const useRows = extrasSection?.querySelectorAll('.extra-use-row') ?? [];
      useRows.forEach(row => {
        if (filterType === 'all') row.style.display = '';
        else if (filterType === 'available') row.style.display = row.classList.contains('use-blocked') ? 'none' : '';
        else if (filterType === 'combat') row.style.display = (row.dataset.category === 'Combat' || row.dataset.category === 'Defensive') ? '' : 'none';
      });
    }, { signal });
  });

  applyFiltersAndSort();
}
