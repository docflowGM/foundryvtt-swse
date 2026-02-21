/**
 * First-Run Experience - GM Onboarding
 * ApplicationV2-safe implementation
 */

import { SWSELogger } from '../utils/logger.js';
import { initializeTooltipDiscovery } from './tooltip-discovery.js';

const SYSTEM_ID = 'foundryvtt-swse';
const SETTING_KEY = 'welcomeShown';

/* -------------------------------------------- */
/* Settings Helpers */
/* -------------------------------------------- */

async function shouldShowWelcome() {
  if (!game?.user?.isGM) return false;

  try {
    const shown = await game.settings.get(SYSTEM_ID, SETTING_KEY);
    return !shown;
  } catch {
    return true;
  }
}

async function markWelcomeShown() {
  try {
    await game.settings.set(SYSTEM_ID, SETTING_KEY, true);
  } catch (err) {
    SWSELogger.warn('Failed to mark welcome as shown:', err.message);
  }
}

export async function resetWelcome() {
  if (!game?.user?.isGM) return false;

  try {
    await game.settings.set(SYSTEM_ID, SETTING_KEY, false);
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

class WelcomeDialog extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2
) {

  static DEFAULT_OPTIONS = {
    ...foundry.applications.api.ApplicationV2.DEFAULT_OPTIONS,
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
  dialog.render(true);
}

/* -------------------------------------------- */
/* Initialization */
/* -------------------------------------------- */

export function initializeFirstRunExperience() {
  if (!game?.user?.isGM) return;

  // Delay until UI is fully mounted
  Hooks.once('canvasReady', async () => {
    try {
      const show = await shouldShowWelcome();
      if (!show) return;

      SWSELogger.log('Showing first-run welcome dialog');

      // Allow layout cycle to complete
      await new Promise(resolve => requestAnimationFrame(resolve));

      await showWelcomeDialog();

    } catch (err) {
      SWSELogger.error('First-run experience error:', err);
    }
  });
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
