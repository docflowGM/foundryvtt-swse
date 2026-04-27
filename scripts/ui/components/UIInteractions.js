/* ============================================================================
   UI INTERACTIONS UTILITY
   Common UX patterns: search input protection, reset buttons, state feedback
   ============================================================================ */

export class UIInteractions {
  static attachListeners(html) {
    this._protectSearchInputs(html);
    this._attachResetButtons(html);
    this._attachToggleListeners(html);
  }

  static _protectSearchInputs(html) {
    html.querySelectorAll('input[type="search"], input.search').forEach(input => {
      input.addEventListener('click', e => e.stopPropagation());
      input.addEventListener('keydown', e => e.stopPropagation());
      input.addEventListener('input', e => {
        e.stopPropagation();
      });
    });
  }

  static _attachResetButtons(html) {
    html.querySelectorAll('[data-action="reset"]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.preventDefault();
        const searchInputs = btn.closest('[data-search-container]')
          ?.querySelectorAll('input[type="search"], input.search') || [];
        searchInputs.forEach(input => {
          input.value = '';
          input.dispatchEvent(new Event('input', { bubbles: true }));
        });
      });
    });
  }

  static _attachToggleListeners(html) {
    html.querySelectorAll('[data-toggle]').forEach(el => {
      el.addEventListener('click', e => {
        const targetSelector = el.dataset.toggle;
        const target = el.closest('[data-toggle-group]')
          ?.querySelector(targetSelector) || document.querySelector(targetSelector);
        if (target) {
          target.classList.toggle('active');
          el.classList.toggle('active');
        }
      });
    });
  }
}
