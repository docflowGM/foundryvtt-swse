/* ============================================================================
   THEME CONTROL COMPONENT
   Attaches listeners to theme control sliders
   Updates ThemeManager and persists to Foundry settings
   ============================================================================ */

import { ThemeManager } from '../theme/ThemeManager.js';

export class ThemeControl {
  static attachListeners(html) {
    const sliders = html.querySelectorAll('[data-theme]');
    const resetBtn = html.querySelector('[data-action="reset-theme"]');

    // Attach slider listeners
    sliders.forEach(slider => {
      slider.addEventListener('input', (e) => this._onThemeChange(e, html));
    });

    // Attach reset button
    if (resetBtn) {
      resetBtn.addEventListener('click', (e) => this._onResetTheme(e, html));
    }
  }

  static _onThemeChange(e, html) {
    const slider = e.target;
    const key = slider.dataset.theme;
    const value = parseFloat(slider.value);

    // Update label display
    const labelValue = html.querySelector(`#theme-${key.toLowerCase()}-value`);
    if (labelValue) {
      if (key === 'accentHue') {
        labelValue.textContent = `${value}°`;
      } else if (key === 'density' || key === 'glow') {
        labelValue.textContent = `${value.toFixed(2)}x`;
      } else {
        labelValue.textContent = `${value.toFixed(3)}`;
      }
    }

    // Get current theme settings
    const current = ThemeManager.getTheme();
    current[key] = value;

    // Apply and persist
    ThemeManager.setTheme(current);
  }

  static _onResetTheme(e, html) {
    e.preventDefault();

    // Reset to defaults
    ThemeManager.setTheme(ThemeManager.defaults);

    // Update all sliders
    const sliders = html.querySelectorAll('[data-theme]');
    sliders.forEach(slider => {
      const key = slider.dataset.theme;
      slider.value = ThemeManager.defaults[key];
      slider.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }
}
