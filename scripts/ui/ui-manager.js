import { BaseSWSEAppV2 } from "/systems/foundryvtt-swse/scripts/apps/base/base-swse-appv2.js";

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
    // DISABLED: Forcing re-render during ready hook was collapsing Foundry core windows
    // CSS theme variables are applied via data-theme attribute - no re-render needed
    // this._rerenderSWSESheets();
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

class ThemePickerDialog extends BaseSWSEAppV2 {

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "swse-theme-picker",
      title: "Choose Your Theme",
      template: "systems/foundryvtt-swse/templates/apps/theme-picker-dialog.hbs",
      position: {
        width: 400,
        height: "auto"
      },
      window: {
        resizable: false
      }
    });
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    return foundry.utils.mergeObject(context, {
      themes: ["holo", "high-contrast", "starship", "sand-people", "jedi", "high-republic"]
    });
  }

  wireEvents() {
    const root = this.element;
    root.querySelectorAll("button[data-theme]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const theme = btn.dataset.theme;
        await UIManager.setTheme(theme);
        this.close();
      });
    });
  }
}
