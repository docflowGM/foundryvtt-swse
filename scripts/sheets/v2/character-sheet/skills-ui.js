/**
 * Skills panel UI activation for SWSEV2CharacterSheet
 *
 * Handles skill filtering, sorting, expansion, and rolling
 */

/**
 * Activate skills panel UI listeners
 * @param {SWSEV2CharacterSheet} sheet - The character sheet instance
 * @param {HTMLElement} html - The rendered sheet element
 * @param {AbortSignal} signal - Abort signal for cleanup
 */
export function activateSkillsUI(sheet, html, { signal } = {}) {
  const skillsList = html.querySelector('.skills-list');
  const customSkillsPanel = html.querySelector('.swse-concept-custom-skills');
  const getRows = () => Array.from(html.querySelectorAll('.skill-row-container'));
  const filterControls = Array.from(html.querySelectorAll('[data-action="filter-skills"]'));
  const sortControls = Array.from(html.querySelectorAll('[data-action="sort-skills"]'));
  const escapeSkillKey = (value) => {
    if (globalThis.CSS?.escape) return globalThis.CSS.escape(String(value));
    return String(value);
  };
  const findExtraUsesSection = (skillKey) => {
    if (!skillKey) return null;
    return html.querySelector(`.skill-extra-uses[data-skill="${escapeSkillKey(skillKey)}"]`);
  };

  const applyFiltersAndSort = () => {
    const activeFilter = filterControls[0]?.value || 'all';
    const activeSort = sortControls[0]?.value || 'name';
    const rowPairs = getRows().map(row => ({
      row,
      extraUsesSection: findExtraUsesSection(row.dataset.skill)
    }));
    const visiblePairs = [];

    for (const pair of rowPairs) {
      const { row, extraUsesSection } = pair;
      const trained = row.dataset.trained === 'true';
      const favorite = row.dataset.favorite === 'true';
      const focused = row.dataset.focused === 'true';
      let matches = true;
      if (activeFilter === 'trained') matches = trained;
      else if (activeFilter === 'favorited') matches = favorite;
      else if (activeFilter === 'focused') matches = focused;
      else if (activeFilter === 'custom') matches = false;

      row.style.display = matches ? '' : 'none';
      if (extraUsesSection) {
        extraUsesSection.style.display = matches ? '' : 'none';
      }
      if (matches) visiblePairs.push(pair);
    }

    if (customSkillsPanel) {
      customSkillsPanel.style.display = activeFilter === 'custom' || activeFilter === 'all' ? '' : 'none';
      customSkillsPanel.classList.toggle('swse-concept-custom-skills--spotlight', activeFilter === 'custom');
    }

    html.querySelectorAll('.swse-concept-segmented--skills [data-action="set-skills-filter"]').forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.filter === activeFilter);
    });

    if (!skillsList) return;
    visiblePairs.sort((a, b) => {
      const rowA = a.row;
      const rowB = b.row;
      switch (activeSort) {
        case 'ability':
          return (rowA.dataset.ability || '').localeCompare(rowB.dataset.ability || '') || (rowA.dataset.label || '').localeCompare(rowB.dataset.label || '');
        case 'total-desc':
          return Number(rowB.dataset.total || 0) - Number(rowA.dataset.total || 0) || (rowA.dataset.label || '').localeCompare(rowB.dataset.label || '');
        case 'total-asc':
          return Number(rowA.dataset.total || 0) - Number(rowB.dataset.total || 0) || (rowA.dataset.label || '').localeCompare(rowB.dataset.label || '');
        case 'name':
        default:
          return (rowA.dataset.label || '').localeCompare(rowB.dataset.label || '');
      }
    });

    for (const { row, extraUsesSection } of visiblePairs) {
      skillsList.appendChild(row);
      if (extraUsesSection) {
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

  html.querySelectorAll('[data-action="set-skills-filter"]').forEach(button => {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      const filterValue = button.dataset.filter || 'all';
      filterControls.forEach(select => { select.value = filterValue; });
      applyFiltersAndSort();
    }, { signal });
  });

  html.querySelectorAll('[data-action="reset-skills-tools"]').forEach(button => {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      filterControls.forEach(select => { select.value = 'all'; });
      sortControls.forEach(select => { select.value = 'name'; });
      applyFiltersAndSort();
    }, { signal });
  });



  html.querySelectorAll('[data-action="toggle-skill-expand"]').forEach(button => {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      const skillKey = button.dataset.skill;
      if (!skillKey) return;

      const extraUsesSection = findExtraUsesSection(skillKey);
      if (!extraUsesSection?.classList.contains('skill-extra-uses')) {
        console.warn('[SWSE Skills UI] Extra skill uses section not found for toggle', {
          actorId: sheet?.actor?.id,
          actorName: sheet?.actor?.name,
          skillKey
        });
        return;
      }

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
