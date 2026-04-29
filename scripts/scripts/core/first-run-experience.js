/**
 * First-Run Experience - GM Onboarding
 * ApplicationV2-safe implementation
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { initializeTooltipDiscovery } from "/systems/foundryvtt-swse/scripts/core/tooltip-discovery.js";
import { BaseSWSEAppV2 } from "/systems/foundryvtt-swse/scripts/apps/base/base-swse-appv2.js";
import { SettingsHelper } from "/systems/foundryvtt-swse/scripts/utils/settings-helper.js";
import { HouseRuleService } from "/systems/foundryvtt-swse/scripts/engine/system/HouseRuleService.js";

const SYSTEM_ID = 'foundryvtt-swse';
const SETTING_KEY = 'welcomeShown';

// Guard flag to prevent duplicate launch within same initialization
let welcomeDialogShown = false;

/* -------------------------------------------- */
/* Settings Helpers */
/* -------------------------------------------- */

async function shouldShowWelcome() {
  if (!game?.user?.isGM) return false;

  try {
    const shown = SettingsHelper.getBoolean(SETTING_KEY, false);
    return !shown;
  } catch {
    return true;
  }
}

async function markWelcomeShown() {
  try {
    await HouseRuleService.set(SETTING_KEY, true);
  } catch (err) {
    SWSELogger.warn('Failed to mark welcome as shown:', err.message);
  }
}

export async function resetWelcome() {
  if (!game?.user?.isGM) return false;

  try {
    await HouseRuleService.set(SETTING_KEY, false);
    SWSELogger.log('Welcome dialog will show on next page load');
    return true;
  } catch (err) {
    SWSELogger.error('Failed to reset welcome:', err.message);
    return false;
  }
}

/* -------------------------------------------- */
/* Welcome Dialog */
/* -------------------------------------------- */

class WelcomeDialog extends BaseSWSEAppV2 {

  static DEFAULT_OPTIONS = {
    id: 'swse-welcome-dialog',
    classes: ['swse-app'],
    window: {
      icon: 'fa-solid fa-star',
      title: '⭐ Welcome to SWSE for Foundry VTT',
      resizable: true
    },
    position: {
      width: 600,
      height: 500
    }
  };

  static PARTS = {
    content: {
      template: 'systems/foundryvtt-swse/templates/dialogs/welcome-dialog.hbs'
    }
  };

  async _prepareContext() {
    return {};
  }

  _onRender(context, options) {
    super._onRender(context, options);

    const root = this.element;
    if (!root) return;

    const button = root.querySelector('[data-action="got-it"]');
    if (button) {
      button.addEventListener('click', async () => {
        const checkbox = root.querySelector('#swse-no-welcome-again');
        const noAgain = checkbox?.checked ?? false;

        if (noAgain) {
          await markWelcomeShown();
        }

        await initializeTooltipDiscovery();
        this.close();
      });
    }
  }
}

/* -------------------------------------------- */
/* Safe Show Logic */
/* -------------------------------------------- */

async function showWelcomeDialog() {
  const dialog = new WelcomeDialog();
  await dialog.render(true);
}

/* -------------------------------------------- */
/* Initialization */
/* -------------------------------------------- */

export function initializeFirstRunExperience() {
  if (!game?.user?.isGM) return;

  async function showWelcome() {
    // Guard: prevent duplicate launch within same initialization
    if (welcomeDialogShown) return;

    try {
      const show = await shouldShowWelcome();
      if (!show) return;

      welcomeDialogShown = true;
      SWSELogger.log('Showing first-run welcome dialog');

      // Allow layout cycle to complete
      await new Promise(resolve => requestAnimationFrame(resolve));

      await showWelcomeDialog();

    } catch (err) {
      welcomeDialogShown = false;  // Reset on error so can retry
      SWSELogger.error('First-run experience error:', err);
    }
  }

  // If canvas is already ready, show immediately; otherwise register hook
  if (canvas?.ready) {
    showWelcome();
  } else {
    Hooks.once('canvasReady', showWelcome);
  }
}

/* -------------------------------------------- */
/* Register Setting */
/* -------------------------------------------- */

export function registerFirstRunSettings() {
  game.settings.register(SYSTEM_ID, SETTING_KEY, {
    name: 'Welcome Dialog Shown',
    hint: 'Whether the first-run welcome dialog has been shown to this GM',
    scope: 'world',
    config: false,
    type: Boolean,
    default: false
  });
}

/* -------------------------------------------- */
/* Console Helpers */
/* -------------------------------------------- */

export function registerFirstRunConsoleHelpers() {
  if (typeof window !== 'undefined') {
    window.SWSEFirstRun = {
      resetWelcome,
      showWelcome: showWelcomeDialog
    };
  }
}
