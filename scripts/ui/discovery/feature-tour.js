/**
 * Feature Tour Application (AppV2)
 *
 * First-launch modal using datapad shell and theme system.
 * Separate content for players vs GMs. Entirely skippable.
 *
 * Renders as a themed modal dialog with unified SWSE appearance.
 */

import { BaseSWSEAppV2 } from "/systems/foundryvtt-swse/scripts/apps/base/base-swse-appv2.js";
import { DiscoveryUserState } from "/systems/foundryvtt-swse/scripts/ui/discovery/user-state.js";
import { SettingsHelper } from "/systems/foundryvtt-swse/scripts/utils/settings-helper.js";
import { GMDatapad } from "/systems/foundryvtt-swse/scripts/apps/gm-datapad.js";

const SYSTEM_ID = 'foundryvtt-swse';

class FeatureTourApp extends BaseSWSEAppV2 {

  static DEFAULT_OPTIONS = {
    id: 'swse-feature-tour',
    tag: 'section',
    window: {
      title: 'Welcome to Star Wars Saga Edition',
      width: 600,
      height: 'auto',
      resizable: false
    },
    classes: ['swse', 'swse-datapad-container', 'feature-tour-app'],
    position: {
      top: 'center',
      left: 'center'
    }
  };

  static PARTS = {
    body: {
      template: "systems/foundryvtt-swse/templates/apps/feature-tour.hbs"
    }
  };

  /**
   * Prepare context with tour content and user role
   */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const isGM = game.user.isGM;
    const prefix = isGM ? 'SWSE.Discovery.Tour.GM' : 'SWSE.Discovery.Tour.Player';

    // Gather feature items (up to 5)
    const items = [];
    for (let i = 1; i <= 5; i++) {
      const key = `${prefix}.Item${i}`;
      const text = game.i18n.localize(key);
      // If the key returns itself, the entry doesn't exist
      if (text !== key) {
        items.push(text);
      }
    }

    return foundry.utils.mergeObject(context, {
      title: game.i18n.localize(`${prefix}.Title`),
      subtitle: game.i18n.localize(`${prefix}.Subtitle`),
      items,
      skipLabel: game.i18n.localize('SWSE.Discovery.Tour.Skip'),
      gmHolopadLabel: game.i18n.localize('SWSE.Discovery.Tour.GMHolopad') || 'Open GM Holopad',
      isGM
    });
  }

  /**
   * Wire up button events after render
   */
  wireEvents() {
    const root = this.element;

    // Skip/close button
    root.querySelector('.feature-tour__skip')?.addEventListener('click', () => {
      this._closeTour();
    });

    // GM holopad button (if GM)
    if (game.user?.isGM) {
      root.querySelector('.feature-tour__gm-holopad')?.addEventListener('click', () => {
        new GMDatapad().render(true);
        this._closeTour();
      });
    }

    // Close on Escape
    this._keyHandler = (ev) => {
      if (ev.key === 'Escape') {
        this._closeTour();
      }
    };
    document.addEventListener('keydown', this._keyHandler);
  }

  /**
   * Clean up tour and mark as completed
   */
  async _closeTour() {
    if (this._keyHandler) {
      document.removeEventListener('keydown', this._keyHandler);
    }
    await DiscoveryUserState.completeTour();
    this.close();
  }

  /**
   * Clean up on close
   */
  async close(options = {}) {
    if (this._keyHandler) {
      document.removeEventListener('keydown', this._keyHandler);
    }
    return super.close(options);
  }
}

export const FeatureTour = {
  _instance: null,

  /**
   * Show the tour if this is the user's first launch and the setting allows it.
   * Call once on 'ready' hook.
   */
  async show() {
    // Check disabled setting
    try {
      if (SettingsHelper.getBoolean('disableTour', false)) {return;}
    } catch { /* setting not registered yet, continue */ }

    if (DiscoveryUserState.isTourCompleted()) {return;}

    // Close any existing instance
    if (this._instance) {
      await this._instance.close();
    }

    // Create and show the tour app
    this._instance = new FeatureTourApp();
    this._instance.render(true);
  }
};
