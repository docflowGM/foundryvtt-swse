/* ============================================================================
   MODIFIER BREAKDOWN COMPONENT
   Attaches hover listeners to modifier values to show breakdown
   Dynamically renders breakdown panel on demand
   ============================================================================ */

export class ModifierBreakdown {
  static attachListeners(html) {
    html.querySelectorAll('.swse-mod[data-mods]').forEach(el => {
      el.addEventListener('mouseenter', (e) => this._showPanel(el, e));
      el.addEventListener('mouseleave', (e) => this._hidePanel(el, e));
    });
  }

  static _showPanel(el, e) {
    // Prevent creating multiple panels
    if (el.querySelector('.swse-mod-panel')) return;

    try {
      const data = JSON.parse(el.dataset.mods || '[]');
      const total = el.textContent.trim();

      const panel = document.createElement('div');
      panel.classList.add('swse-mod-panel');

      const rows = data.map(m => {
        const sign = m.value > 0 ? '+' : '';
        const rowClass = m.value > 0 ? 'positive' : m.value < 0 ? 'negative' : '';
        return `<div class="swse-mod-row ${rowClass}">
                  <span>${m.label}</span>
                  <span>${sign}${m.value}</span>
                </div>`;
      }).join('');

      panel.innerHTML = `
        ${rows}
        <div class="swse-mod-row total">
          <span>TOTAL</span>
          <span>${total}</span>
        </div>
      `;

      el.appendChild(panel);
    } catch (err) {
      console.warn('[ModifierBreakdown] Failed to parse modifier data', err);
    }
  }

  static _hidePanel(el, e) {
    const panel = el.querySelector('.swse-mod-panel');
    if (panel) panel.remove();
  }
}
