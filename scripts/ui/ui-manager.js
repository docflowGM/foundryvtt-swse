
export class UIManager {

  static init() {
    Hooks.once("ready", () => this._onReady());
  }

  static _onReady() {
    const theme = this.getTheme();
    this.applyTheme(theme);
    this._watchThemeSetting();
    this._handleFirstRun();
    console.log("[SWSE UI] UIManager initialized");
  }

  static getTheme() {
    try {
      return game.settings.get("foundryvtt-swse", "activeTheme") || "holo";
    } catch {
      return "holo";
    }
  }

  static applyTheme(theme) {
    document.body.dataset.theme = theme;
    console.log(`[SWSE UI] Theme applied: ${theme}`);
    this._rerenderSWSESheets();
  }

  static async setTheme(theme) {
    await game.settings.set("foundryvtt-swse", "activeTheme", theme);
    this.applyTheme(theme);
  }

  static _watchThemeSetting() {
    Hooks.on("updateSetting", (setting) => {
      if (setting.key === "foundryvtt-swse.activeTheme") {
        this.applyTheme(setting.value);
      }
    });
  }

  static _rerenderSWSESheets() {
    for (const app of Object.values(ui.windows)) {
      if (app.constructor?.name?.startsWith("SWSE")) {
        app.render(false);
      }
    }
  }

  static async _handleFirstRun() {
    try {
      const shown = game.settings.get("foundryvtt-swse", "themePromptShown");
      if (!shown) {
        new ThemePickerDialog().render(true);
        await game.settings.set("foundryvtt-swse", "themePromptShown", true);
      }
    } catch {}
  }
}

class ThemePickerDialog extends foundry.applications.api.ApplicationV2 {

  static DEFAULT_OPTIONS = {
    id: "swse-theme-picker",
    window: { title: "Choose Your Theme" }
  };

  async _renderHTML(context, options) {
    const themes = ["holo","high-contrast","starship","sand-people","jedi","high-republic"];
    return `
      <div class="swse-theme-picker">
        <h2>Select Your Theme</h2>
        <div class="theme-options">
          ${themes.map(t => `<button data-theme="${t}">${t}</button>`).join("")}
        </div>
      </div>
    `;
  }

  activateListeners(html) {
    html.querySelectorAll("button[data-theme]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const theme = btn.dataset.theme;
        await UIManager.setTheme(theme);
        this.close();
      });
    });
  }
}
