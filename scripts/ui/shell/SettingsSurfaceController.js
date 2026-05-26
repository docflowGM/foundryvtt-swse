/**
 * SettingsSurfaceController — shared DOM/event controller for the Holopad Settings surface.
 *
 * Phase 2 GM/actor parity:
 * - The settings surface markup is shared by actor holopads and the GM datapad.
 * - This controller owns the theme, shell color, motion, language, and reset controls.
 * - Hosts only provide render/navigation behavior; settings mutation remains centralized.
 */

import { ThemeManager } from '/systems/foundryvtt-swse/scripts/ui/theme/ThemeManager.js';
import { ThemeResolutionService } from '/systems/foundryvtt-swse/scripts/ui/theme/theme-resolution-service.js';
import { SWSELogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';

const NS = 'foundryvtt-swse';

function rootElements(root) {
  if (!root) return [];
  const elements = new Set();
  if (root instanceof HTMLElement) elements.add(root);
  root.querySelectorAll?.('.gm-datapad-container, .swse-sheet-v2-shell, .sheet-shell, .swse-ui-shell, .swse-datapad-container')
    ?.forEach(el => elements.add(el));
  return [...elements];
}

export class SettingsSurfaceController {
  constructor(host, options = {}) {
    this.host = host;
    this.actor = options.actor ?? host?.actor ?? host?.document ?? null;
    this.preferActor = options.preferActor ?? !!this.actor;
    this.persistActorTheme = options.persistActorTheme ?? !!this.actor;
    this.logger = options.logger ?? SWSELogger;
    this._abort = null;
  }

  attach(root, options = {}) {
    this.destroy();

    const settingsRoot = root?.querySelector?.('[data-shell-region="surface-settings"]');
    if (!settingsRoot) return;

    const externalSignal = options.signal ?? null;
    this._abort = externalSignal ? null : new AbortController();
    const signal = externalSignal ?? this._abort.signal;

    this._wireNavigation(settingsRoot, signal);
    this._wireThemePresets(root, settingsRoot, signal);
    this._wireShellColors(settingsRoot, signal);
    this._wireMotionStyles(root, settingsRoot, signal);
    this._wireDisplayControls(settingsRoot, signal);
    this._wireToggles(settingsRoot, signal);
    this._wireLanguage(settingsRoot, signal);
    this._wireReset(settingsRoot, signal);
  }

  destroy() {
    this._abort?.abort?.();
    this._abort = null;
  }

  _wireNavigation(settingsRoot, signal) {
    settingsRoot.querySelectorAll('[data-shell-action="return-to-home"], [data-settings-action="return-home"]').forEach(el => {
      el.addEventListener('click', async ev => {
        ev.preventDefault();
        if (typeof this.host?.setSurface === 'function') {
          await this.host.setSurface('home');
          this._render();
          return;
        }
        if (typeof this.host?._navigateTo === 'function') {
          await this.host._navigateTo('home');
        }
      }, { signal });
    });
  }

  _wireThemePresets(root, settingsRoot, signal) {
    settingsRoot.querySelectorAll('[data-theme-preset]').forEach(el => {
      el.addEventListener('click', async ev => {
        ev.preventDefault();
        const themeKey = ThemeResolutionService.resolveThemeKey(el.dataset.themePreset, {
          actor: this.actor,
          preferActor: this.preferActor
        });
        if (!themeKey) return;

        try {
          await ThemeManager.setTheme({ theme: themeKey });

          if (this.persistActorTheme && this.actor?.setFlag) {
            await this.actor.setFlag(NS, 'sheetTheme', themeKey);
          }

          this._applyThemeToRenderedShell(root, { themeKey });
          settingsRoot.querySelectorAll('[data-theme-preset]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.themePreset === themeKey);
          });
          this._render();
        } catch (err) {
          this.logger.error?.('[SettingsSurfaceController] Error setting theme:', err);
          ui.notifications?.error?.(`Failed to set theme: ${err.message}`);
        }
      }, { signal });
    });
  }

  _wireShellColors(settingsRoot, signal) {
    settingsRoot.querySelectorAll('[data-shell-color]').forEach(el => {
      el.addEventListener('click', async ev => {
        ev.preventDefault();
        const shellColor = el.dataset.shellColor;
        if (!shellColor) return;
        try {
          await ThemeManager.setTheme({ shellColor });
          this._render();
        } catch (err) {
          this.logger.error?.('[SettingsSurfaceController] Error setting shell color:', err);
          ui.notifications?.error?.(`Failed to set shell color: ${err.message}`);
        }
      }, { signal });
    });
  }

  _wireMotionStyles(root, settingsRoot, signal) {
    settingsRoot.querySelectorAll('[data-motion-style]').forEach(el => {
      el.addEventListener('click', async ev => {
        ev.preventDefault();
        const motionStyle = el.dataset.motionStyle;
        if (!motionStyle) return;
        try {
          await ThemeManager.setTheme({ motionStyle, reducedMotion: motionStyle === 'off' });

          if (this.persistActorTheme && this.actor?.setFlag) {
            await this.actor.setFlag(NS, 'sheetMotionStyle', motionStyle);
          }

          this._applyThemeToRenderedShell(root, { motionStyle });
          settingsRoot.querySelectorAll('[data-motion-style]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.motionStyle === motionStyle);
          });
          this._render();
        } catch (err) {
          this.logger.error?.('[SettingsSurfaceController] Error setting motion style:', err);
          ui.notifications?.error?.(`Failed to set motion style: ${err.message}`);
        }
      }, { signal });
    });
  }

  _wireDisplayControls(settingsRoot, signal) {
    settingsRoot.querySelectorAll('[data-theme-control]').forEach(el => {
      el.addEventListener('input', async ev => {
        const key = el.dataset.themeControl;
        if (!key) return;
        const value = Number(ev.currentTarget?.value ?? el.value);
        if (!Number.isFinite(value)) return;
        try {
          await ThemeManager.setTheme({ [key]: value });
          this._render();
        } catch (err) {
          this.logger.error?.('[SettingsSurfaceController] Error updating display control:', err);
        }
      }, { signal });
    });
  }

  _wireToggles(settingsRoot, signal) {
    settingsRoot.querySelectorAll('[data-theme-toggle]').forEach(el => {
      el.addEventListener('click', async ev => {
        ev.preventDefault();
        const key = el.dataset.themeToggle;
        if (!key) return;
        try {
          const current = ThemeManager.getTheme() || ThemeManager.defaults;
          await ThemeManager.setTheme({ [key]: !current[key] });
          this._render();
        } catch (err) {
          this.logger.error?.('[SettingsSurfaceController] Error toggling theme setting:', err);
        }
      }, { signal });
    });
  }

  _wireLanguage(settingsRoot, signal) {
    settingsRoot.querySelectorAll('[data-language-setting], [data-language-mode]').forEach(el => {
      el.addEventListener('click', async ev => {
        ev.preventDefault();
        const language = el.dataset.languageSetting || el.dataset.languageMode;
        if (!language) return;
        try {
          await ThemeManager.setTheme({ language });
          this._render();
        } catch (err) {
          this.logger.error?.('[SettingsSurfaceController] Error setting language:', err);
        }
      }, { signal });
    });
  }

  _wireReset(settingsRoot, signal) {
    settingsRoot.querySelector('[data-action="reset-theme-defaults"]')?.addEventListener('click', async ev => {
      ev.preventDefault();
      try {
        await ThemeManager.setTheme(ThemeManager.defaults);
        if (this.persistActorTheme && this.actor?.unsetFlag) {
          await this.actor.unsetFlag(NS, 'sheetTheme');
          await this.actor.unsetFlag(NS, 'sheetMotionStyle');
        }
        this._render();
      } catch (err) {
        this.logger.error?.('[SettingsSurfaceController] Error resetting theme defaults:', err);
        ui.notifications?.error?.(`Failed to restore defaults: ${err.message}`);
      }
    }, { signal });
  }

  _applyThemeToRenderedShell(root, { themeKey = null, motionStyle = null } = {}) {
    const context = ThemeResolutionService.buildSurfaceContext({
      actor: this.actor,
      themeKey,
      motionStyle,
      preferActor: this.preferActor
    });
    for (const element of rootElements(root)) {
      ThemeResolutionService.applyToElement(element, context);
    }
  }

  _render() {
    if (typeof this.host?.render === 'function') {
      this.host.render(false);
    }
  }
}
