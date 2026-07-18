import { BaseSWSEAppV2 } from "/systems/foundryvtt-swse/scripts/apps/base/base-swse-appv2.js";
import { SettingsHelper } from "/systems/foundryvtt-swse/scripts/utils/settings-helper.js";
import { getActorSheetThemeGroups } from "/systems/foundryvtt-swse/scripts/theme/actor-sheet-theme-registry.js";
import { ThemeResolutionService } from "/systems/foundryvtt-swse/scripts/ui/theme/theme-resolution-service.js";

const SYSTEM_ID = 'foundryvtt-swse';

export class UIManager {

  static _themePicker = null;

  static init() {
    Hooks.once("init", () => this._registerSettings());
    Hooks.once("ready", () => this._onReady());
  }

  static _registerSettings() {
    const settingKey = `${SYSTEM_ID}.themePromptShown`;
    if (game.settings.settings.has(settingKey)) return;

    game.settings.register(SYSTEM_ID, 'themePromptShown', {
      name: 'Theme Picker Completed',
      hint: 'Tracks whether this client has completed or skipped the first-run Holopad theme picker.',
      scope: 'client',
      config: false,
      type: Boolean,
      default: false
    });
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
      await game.settings.set(SYSTEM_ID, 'sheetTheme', themeKey);
    }
    this.applyTheme(themeKey);
  }

  static async setMotionStyle(motionStyle) {
    const resolvedMotion = ThemeResolutionService.resolveMotionStyle(motionStyle, { preferActor: false });
    if (this.getMotionStyle() !== resolvedMotion) {
      await game.settings.set(SYSTEM_ID, 'sheetMotionStyle', resolvedMotion);
    }
    this.applyMotionStyle(resolvedMotion);
  }

  static _watchThemeSetting() {
    Hooks.on("updateSetting", (setting) => {
      if (setting.key === `${SYSTEM_ID}.sheetTheme`) {
        this.applyTheme(setting.value);
      }
    });
  }

  static _watchMotionSetting() {
    Hooks.on("updateSetting", (setting) => {
      if (setting.key === `${SYSTEM_ID}.sheetMotionStyle`) {
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

  static openThemePicker() {
    if (this._themePicker) {
      this._themePicker.bringToFront?.();
      return this._themePicker;
    }

    this._themePicker = new ThemePickerDialog();
    this._themePicker.render(true);
    return this._themePicker;
  }

  static async markThemePromptShown() {
    const settingKey = `${SYSTEM_ID}.themePromptShown`;
    if (!game.settings?.settings?.has?.(settingKey)) {
      console.warn(`[SWSE UI] Cannot mark theme prompt complete because ${settingKey} is not registered.`);
      return false;
    }

    await game.settings.set(SYSTEM_ID, 'themePromptShown', true);
    return true;
  }

  static async _handleFirstRun() {
    try {
      const shown = SettingsHelper.getBoolean('themePromptShown', false);
      if (!shown) this.openThemePicker();
    } catch (error) {
      console.error('[SWSE UI] Failed to open first-run theme picker', error);
    }
  }
}

class ThemePickerDialog extends BaseSWSEAppV2 {

  static DEFAULT_OPTIONS = {
    id: "swse-theme-picker",
    tag: "div",
    classes: ["swse", "swse-window", "swse-theme-picker-window"],
    window: {
      title: "Choose Your Theme",
      icon: "fa-solid fa-palette",
      resizable: true
    },
    position: {
      width: 1240,
      height: 780
    }
  };

  static PARTS = {
    content: { template: "systems/foundryvtt-swse/templates/apps/theme-picker-dialog.hbs" }
  };

  constructor(...args) {
    super(...args);
    this._selectedTheme = UIManager.getTheme();
  }

  _buildThemeView(themeKey, selected = false) {
    const key = ThemeResolutionService.resolveThemeKey(themeKey, { preferActor: false });
    const entry = ThemeResolutionService.getThemeEntry(key);

    return {
      key,
      label: entry?.label ?? key,
      description: entry?.description ?? '',
      source: entry?.source ?? 'sheet',
      sourceLabel: entry?.source === 'global' ? 'Ported' : 'Native',
      selected,
      style: ThemeResolutionService.buildThemeStyle(key)
    };
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const selectedKey = ThemeResolutionService.resolveThemeKey(this._selectedTheme, { preferActor: false });
    this._selectedTheme = selectedKey;

    const themeGroups = getActorSheetThemeGroups(selectedKey).map(group => ({
      key: group.key,
      label: group.label,
      options: group.options.map(option => this._buildThemeView(option.value, option.selected))
    }));

    return foundry.utils.mergeObject(context, {
      selectedTheme: this._buildThemeView(selectedKey, true),
      themeGroups
    });
  }

  wireEvents() {
    this._bindTrackedListeners([
      { selector: '.swse-theme-picker__tile', event: 'pointerenter', handler: this._onThemePreview },
      { selector: '.swse-theme-picker__tile', event: 'focus', handler: this._onThemePreview },
      { selector: '.swse-theme-picker__tile', event: 'click', handler: this._onThemeSelect },
      { selector: '[data-role="theme-gallery"]', event: 'pointerleave', handler: this._restoreSelectedPreview },
      { selector: '[data-action="apply-theme"]', event: 'click', handler: this._onApplyTheme },
      { selector: '[data-action="skip-theme-picker"]', event: 'click', handler: this._onSkipThemePicker }
    ]);
  }

  _onThemePreview(event) {
    this._previewTheme(event.currentTarget?.dataset?.theme);
  }

  _onThemeSelect(event) {
    event.preventDefault();
    this._selectTheme(event.currentTarget?.dataset?.theme);
  }

  _restoreSelectedPreview() {
    this._previewTheme(this._selectedTheme);
  }

  _previewTheme(themeKey) {
    const key = ThemeResolutionService.resolveThemeKey(themeKey, { preferActor: false });
    const entry = ThemeResolutionService.getThemeEntry(key);
    if (!entry) return;

    const feature = this.element?.querySelector('[data-role="feature"]');
    if (feature) {
      feature.dataset.theme = key;
      ThemeResolutionService.applyStyleText(feature, ThemeResolutionService.buildThemeStyle(key));
    }

    const name = this.element?.querySelector('[data-role="feature-name"]');
    const description = this.element?.querySelector('[data-role="feature-description"]');
    const source = this.element?.querySelector('[data-role="feature-source"]');

    if (name) name.textContent = entry.label;
    if (description) description.textContent = entry.description ?? '';
    if (source) source.textContent = entry.source === 'global' ? 'Ported' : 'Native';
  }

  _selectTheme(themeKey) {
    const key = ThemeResolutionService.resolveThemeKey(themeKey, { preferActor: false });
    const entry = ThemeResolutionService.getThemeEntry(key);
    if (!entry) return;

    this._selectedTheme = key;

    const stage = this.element?.querySelector('[data-role="theme-stage"]');
    if (stage) {
      stage.dataset.theme = key;
      ThemeResolutionService.applyStyleText(stage, ThemeResolutionService.buildThemeStyle(key));
    }

    this.element?.querySelectorAll('.swse-theme-picker__tile').forEach(tile => {
      const selected = tile.dataset.theme === key;
      tile.classList.toggle('is-selected', selected);
      tile.setAttribute('aria-pressed', selected ? 'true' : 'false');
    });

    const selectedLabel = this.element?.querySelector('[data-role="selected-label"]');
    const confirmName = this.element?.querySelector('[data-role="confirm-name"]');
    if (selectedLabel) selectedLabel.textContent = entry.label;
    if (confirmName) confirmName.textContent = `· ${entry.label}`;

    this._previewTheme(key);
  }

  async _onApplyTheme(event) {
    const button = event.currentTarget;
    button.disabled = true;

    try {
      await UIManager.setTheme(this._selectedTheme);
      await UIManager.markThemePromptShown();
      await this.close();
    } catch (error) {
      console.error('[SWSE UI] Failed to apply selected theme', error);
      ui.notifications?.error?.('The selected theme could not be applied.');
      button.disabled = false;
    }
  }

  async _onSkipThemePicker(event) {
    const button = event.currentTarget;
    button.disabled = true;

    try {
      await UIManager.markThemePromptShown();
      await this.close();
    } catch (error) {
      console.error('[SWSE UI] Failed to dismiss theme picker', error);
      ui.notifications?.error?.('The theme picker could not be dismissed.');
      button.disabled = false;
    }
  }

  async close(options) {
    if (UIManager._themePicker === this) UIManager._themePicker = null;
    return super.close(options);
  }
}
