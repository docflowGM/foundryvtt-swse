import { BaseSWSEAppV2 } from "/systems/foundryvtt-swse/scripts/apps/base/base-swse-appv2.js";
import { SettingsHelper } from "/systems/foundryvtt-swse/scripts/utils/settings-helper.js";
import { HouseRuleService } from "/systems/foundryvtt-swse/scripts/engine/system/HouseRuleService.js";
import { ThemeResolutionService } from "/systems/foundryvtt-swse/scripts/ui/theme/theme-resolution-service.js";

export class UIManager {

  static init() {
    Hooks.once("ready", () => this._onReady());
  }

  static _onReady() {
    this.applyThemeAndMotion();
    this._watchThemeSetting();
    this._watchMotionSetting();
    this._handleFirstRun();
    console.log("[SWSE UI] UIManager initialized");
  }

  static getTheme() {
    return ThemeResolutionService.resolveThemeKey(SettingsHelper.getString('sheetTheme', 'holo'), { preferActor: false });
  }

  static getMotionStyle() {
    return ThemeResolutionService.resolveMotionStyle(SettingsHelper.getString('sheetMotionStyle', 'standard'), { preferActor: false });
  }

  static applyTheme(theme) {
    const themeKey = ThemeResolutionService.resolveThemeKey(theme, { preferActor: false });
    const motionStyle = this.getMotionStyle();
    ThemeResolutionService.applyToRoot({ themeKey, motionStyle });
    console.log(`[SWSE UI] Theme applied: ${themeKey}`);
  }

  static applyMotionStyle(motionStyle) {
    const themeKey = this.getTheme();
    const resolvedMotion = ThemeResolutionService.resolveMotionStyle(motionStyle, { preferActor: false });
    ThemeResolutionService.applyToRoot({ themeKey, motionStyle: resolvedMotion });
    console.log(`[SWSE UI] Motion style applied: ${resolvedMotion}`);
  }

  static applyThemeAndMotion() {
    const context = ThemeResolutionService.applyToRoot({
      themeKey: this.getTheme(),
      motionStyle: this.getMotionStyle()
    });
    console.log(`[SWSE UI] Global datapad theme applied: ${context.themeKey} / ${context.motionStyle}`);
    return context;
  }

  static async setTheme(theme) {
    const themeKey = ThemeResolutionService.resolveThemeKey(theme, { preferActor: false });
    if (this.getTheme() !== themeKey) {
      await game.settings.set('foundryvtt-swse', 'sheetTheme', themeKey);
    }
    this.applyTheme(themeKey);
  }

  static async setMotionStyle(motionStyle) {
    const resolvedMotion = ThemeResolutionService.resolveMotionStyle(motionStyle, { preferActor: false });
    if (this.getMotionStyle() !== resolvedMotion) {
      await game.settings.set('foundryvtt-swse', 'sheetMotionStyle', resolvedMotion);
    }
    this.applyMotionStyle(resolvedMotion);
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
      themes: ThemeResolutionService.getThemeOptions().map(option => option.value)
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
