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
import { requestShellRender } from '/systems/foundryvtt-swse/scripts/ui/shell/request-shell-render.js';
import { mutateShellOnly } from '/systems/foundryvtt-swse/scripts/ui/shell/mutate-and-repaint.js';

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
          this._render('settings-return-home');
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
          await this._mutate(async () => {
            await ThemeManager.setTheme({ theme: themeKey });
            if (this.persistActorTheme && this.actor?.setFlag) {
              await this.actor.setFlag(NS, 'sheetTheme', themeKey);
            }
          }, { reason: 'settings-theme-preset' });

          this._applyThemeToRenderedShell(root, { themeKey });
          this._patchSettingsState({ theme: themeKey, pendingControls: {} });
          settingsRoot.querySelectorAll('[data-theme-preset]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.themePreset === themeKey);
          });
          this._render('settings-theme-preset');
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
          await this._mutate(() => ThemeManager.setTheme({ shellColor }), { reason: 'settings-shell-color' });
          this._patchSettingsState({ shellColor });
          settingsRoot.querySelectorAll('[data-shell-color]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.shellColor === shellColor);
          });
          this._render('settings-shell-color');
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
          await this._mutate(async () => {
            await ThemeManager.setTheme({ motionStyle, reducedMotion: motionStyle === 'off' });
            if (this.persistActorTheme && this.actor?.setFlag) {
              await this.actor.setFlag(NS, 'sheetMotionStyle', motionStyle);
            }
          }, { reason: 'settings-motion-style' });

          this._applyThemeToRenderedShell(root, { motionStyle });
          this._patchSettingsState({ motionStyle, reducedMotion: motionStyle === 'off', pendingControls: {} });
          settingsRoot.querySelectorAll('[data-motion-style]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.motionStyle === motionStyle);
          });
          this._render('settings-motion-style');
        } catch (err) {
          this.logger.error?.('[SettingsSurfaceController] Error setting motion style:', err);
          ui.notifications?.error?.(`Failed to set motion style: ${err.message}`);
        }
      }, { signal });
    });
  }

  _wireDisplayControls(settingsRoot, signal) {
    settingsRoot.querySelectorAll('[data-theme-control]').forEach(el => {
      const preview = ev => {
        const key = el.dataset.themeControl;
        if (!key) return null;
        const value = Number(ev.currentTarget?.value ?? el.value);
        if (!Number.isFinite(value)) return null;
        this._updateControlLabel(el, value);
        this._patchPendingControl(key, value);
        ThemeManager.applyTheme({ [key]: value });
        return { key, value };
      };

      el.addEventListener('input', ev => {
        preview(ev);
      }, { signal });

      el.addEventListener('change', async ev => {
        const result = preview(ev);
        if (!result) return;
        try {
          await this._mutate(() => ThemeManager.setTheme({ [result.key]: result.value }), { reason: 'settings-display-control-commit' });
          this._clearPendingControl(result.key);
          this._render('settings-display-control-commit');
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
          const nextValue = !current[key];
          await this._mutate(() => ThemeManager.setTheme({ [key]: nextValue }), { reason: 'settings-toggle' });
          this._patchSettingsState({ [key]: nextValue });
          el.classList.toggle('on', nextValue);
          this._render('settings-toggle');
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
          await this._mutate(() => ThemeManager.setTheme({ language }), { reason: 'settings-language' });
          this._patchSettingsState({ language });
          settingsRoot.querySelectorAll('[data-language-setting], [data-language-mode]').forEach(btn => {
            const btnLanguage = btn.dataset.languageSetting || btn.dataset.languageMode;
            btn.classList.toggle('active', btnLanguage === language);
          });
          this._render('settings-language');
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
        await this._mutate(async () => {
          await ThemeManager.setTheme(ThemeManager.defaults);
          if (this.persistActorTheme && this.actor?.unsetFlag) {
            await this.actor.unsetFlag(NS, 'sheetTheme');
            await this.actor.unsetFlag(NS, 'sheetMotionStyle');
          }
        }, { reason: 'settings-reset-defaults' });
        this._patchSettingsState({ ...ThemeManager.defaults, pendingControls: {} });
        this._render('settings-reset-defaults');
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

  _updateControlLabel(input, value) {
    const label = input?.closest?.('.swse-settings-control')?.querySelector?.('label span');
    if (label) label.textContent = String(value);
  }

  _settingsState() {
    return this.host?.getSurfaceState?.('settings') ?? this.host?.shellSurfaceOptions ?? {};
  }

  _patchPendingControl(key, value) {
    const current = this._settingsState();
    this._patchSettingsState({
      pendingControls: {
        ...(current.pendingControls && typeof current.pendingControls === 'object' ? current.pendingControls : {}),
        [key]: value
      }
    });
  }

  _clearPendingControl(key) {
    const current = this._settingsState();
    const pending = { ...(current.pendingControls && typeof current.pendingControls === 'object' ? current.pendingControls : {}) };
    delete pending[key];
    this._patchSettingsState({ pendingControls: pending });
  }

  _patchSettingsState(patch = {}, options = {}) {
    if (typeof this.host?.patchSurfaceState === 'function') {
      return this.host.patchSurfaceState('settings', patch, options);
    }
    if (typeof this.host?.patchSurfaceOptions === 'function') {
      return this.host.patchSurfaceOptions(patch, options);
    }
    return patch;
  }

  _mutate(mutation, { reason = 'settings-mutation' } = {}) {
    return mutateShellOnly(this.host, mutation, { reason, surfaceId: 'settings' });
  }

  _render(reason = 'settings-surface-render') {
    if (typeof this.host?.requestSurfaceRender === 'function') {
      return this.host.requestSurfaceRender({ reason, surfaceId: 'settings' });
    }
    if (typeof this.host?.render === 'function') {
      return requestShellRender(this.host, { reason, surfaceId: 'settings' });
    }
    return undefined;
  }
}

export default SettingsSurfaceController;
