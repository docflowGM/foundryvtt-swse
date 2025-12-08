// scripts/themes/theme-engine.js
import { swseLogger } from "../utils/logger.js";

export const ThemeEngine = {
  listThemes() {
    // read styles/sheets/themes directory clientside is tricky; instead list from system.json styles entries
    const sys = game?.swse?.systemData || null;
    // fallback list of known themes; you can expand this list manually
    return ["holo-default", "high-contrast"];
  },

  applyThemeToElement(el, themeName) {
    try {
      if (!el) return;
      // remove existing swse-theme-* classes
      el.removeClass?.((i, css) => (css.match(/swse-theme-[^\s]+/g) || []).join(" ")) ;
      el.addClass?.(`swse-theme-${themeName}`);
    } catch (e) {
      swseLogger.warn("ThemeEngine.applyThemeToElement failed", e);
    }
  }
};
