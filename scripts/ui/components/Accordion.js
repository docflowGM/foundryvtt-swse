/* ============================================================================
   ACCORDION COMPONENT
   Expandable/collapsible sections for details and extra content
   ============================================================================ */

export class Accordion {
  static attachListeners(html) {
    html.querySelectorAll('[data-toggle="accordion"]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this._toggle(el);
      });
    });
  }

  static _toggle(el) {
    const target = el.dataset.target;
    if (!target) return;

    const body = document.querySelector(target);
    if (!body) return;

    el.classList.toggle('open');
    body.classList.toggle('open');
  }
}
