import { BaseSWSEAppV2 } from "/systems/foundryvtt-swse/scripts/apps/base/base-swse-appv2.js";
import { SettingsHelper } from "/systems/foundryvtt-swse/scripts/utils/settings-helper.js";
import { HouseRuleService } from "/systems/foundryvtt-swse/scripts/engine/system/HouseRuleService.js";

export class UIManager {

  static init() {
    Hooks.once("ready", () => this._onReady());
  }

  static _onReady() {
    const theme = this.getTheme();
    const motionStyle = this.getMotionStyle();
    this.applyTheme(theme);
    this.applyMotionStyle(motionStyle);
    this._watchThemeSetting();
    this._watchMotionSetting();
    this._handleFirstRun();
    console.log("[SWSE UI] UIManager initialized");
  }

  static getTheme() {
    try {
      return SettingsHelper.getString('sheetTheme', 'holo');
    } catch {
      return "holo";
    }
  }

  static getMotionStyle() {
    try {
      return SettingsHelper.getString('sheetMotionStyle', 'standard');
    } catch {
      return "standard";
    }
  }

  static applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    console.log(`[SWSE UI] Theme applied: ${theme}`);
    // DISABLED: Forcing re-render during ready hook was collapsing Foundry core windows
    // CSS theme variables are applied via data-theme attribute - no re-render needed
    // this._rerenderSWSESheets();
  }

  static applyMotionStyle(motionStyle) {
    document.documentElement.dataset.motionStyle = motionStyle;
    console.log(`[SWSE UI] Motion style applied: ${motionStyle}`);
  }

  static async setTheme(theme) {
    await game.settings.set('foundryvtt-swse', 'sheetTheme', theme);
    this.applyTheme(theme);
  }

  static async setMotionStyle(motionStyle) {
    await game.settings.set('foundryvtt-swse', 'sheetMotionStyle', motionStyle);
    this.applyMotionStyle(motionStyle);
  }

  static _watchThemeSetting() {
    Hooks.on("updateSetting", (setting) => {
      if (setting.key === "foundryvtt-swse.sheetTheme") {
        this.applyTheme(setting.value);
      }
    });
  }

  static _watchMotionSetting() {
    Hooks.on("updateSetting", (setting) => {
      if (setting.key === "foundryvtt-swse.sheetMotionStyle") {
        this.applyMotionStyle(setting.value);
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
      const shown = SettingsHelper.getBoolean('themePromptShown', false);
      if (!shown) {
        new ThemePickerDialog().render(true);
        await HouseRuleService.set("themePromptShown", true);
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
