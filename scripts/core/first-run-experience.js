/**
 * First-Run Experience - GM Onboarding
 * ApplicationV2-safe implementation
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { initializeTooltipDiscovery } from "/systems/foundryvtt-swse/scripts/core/tooltip-discovery.js";
import { BaseSWSEAppV2 } from "/systems/foundryvtt-swse/scripts/apps/base/base-swse-appv2.js";
import { SettingsHelper } from "/systems/foundryvtt-swse/scripts/utils/settings-helper.js";
import { HouseRuleService } from "/systems/foundryvtt-swse/scripts/engine/system/HouseRuleService.js";
import { ThemeResolutionService } from "/systems/foundryvtt-swse/scripts/ui/theme/theme-resolution-service.js";

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

async function openGmDatapad() {
  try {
    const { GMDatapad } = await import('/systems/foundryvtt-swse/scripts/apps/gm-datapad.js');
    GMDatapad.open?.('home');
  } catch (err) {
    SWSELogger.error('[FirstRunExperience] Failed to open GM Datapad:', err);
    ui?.notifications?.error?.(`Failed to open GM Datapad: ${err.message}`);
  }
}

/* -------------------------------------------- */
/* Welcome Dialog */
/* -------------------------------------------- */

class WelcomeDialog extends BaseSWSEAppV2 {

  static DEFAULT_OPTIONS = {
    id: 'swse-welcome-dialog',
    classes: ['swse-app', 'swse-first-run-window', 'swse-datapad-container'],
    position: {
      width: 900,
      height: 740
    },
    window: {
      icon: 'fa-solid fa-star',
      title: 'Welcome to SWSE for Foundry VTT',
      resizable: true
    }
  };

  static PARTS = {
    content: {
      template: 'systems/foundryvtt-swse/templates/dialogs/welcome-dialog.hbs'
    }
  };

  async _prepareContext() {
    const themeContext = ThemeResolutionService.buildSurfaceContext({ preferActor: false });
    return {
      ...themeContext,
      shellSurface: 'first-run',
      gmName: game?.user?.name || 'Game Master',
      welcomeFeatures: [
        {
          icon: 'fa-solid fa-user-astronaut',
          title: 'Guided character creation',
          text: 'New heroes can register through the datapad, move step by step through chargen, and see the system explain what matters as choices come up.'
        },
        {
          icon: 'fa-solid fa-route',
          title: 'Full progression engine',
          text: 'Level-ups, class features, talents, feats, skills, Force options, and summary review are presented as one guided advancement flow.'
        },
        {
          icon: 'fa-solid fa-jedi',
          title: 'Mentors with personality',
          text: 'Mentors give flavor, context, and advice so advancement feels like part of the character\'s story instead of a spreadsheet.'
        },
        {
          icon: 'fa-solid fa-lightbulb',
          title: 'Suggestion engine',
          text: 'Surveys across a character\'s life help the engine understand the character, but the player\'s actual choices have the greatest impact.'
        },
        {
          icon: 'fa-solid fa-tablet-screen-button',
          title: 'Holopad applications',
          text: 'Players can reach training, stores, games, allies, messaging, settings, and other campaign tools from an in-world datapad shell.'
        },
        {
          icon: 'fa-solid fa-dice-d20',
          title: 'Table support tools',
          text: 'Combat actions, Force powers, droids, vehicles, ships, followers, jobs, factions, and GM operations are being brought into one cohesive play space.'
        }
      ]
    };
  }

  _onRender(context, options) {
    super._onRender(context, options);

    const root = this.element;
    if (!root) return;

    root.querySelector('[data-action="got-it"]')?.addEventListener('click', async () => {
      const checkbox = root.querySelector('#swse-no-welcome-again');
      const noAgain = checkbox?.checked ?? false;

      if (noAgain) {
        await markWelcomeShown();
      }

      await initializeTooltipDiscovery();
      this.close();
    });

    root.querySelectorAll('[data-action="open-gm-window"], [data-action="tablet-home"]').forEach(button => {
      button.addEventListener('click', async ev => {
        ev.preventDefault();
        await openGmDatapad();
      });
    });

    root.querySelectorAll('[data-action="first-run-close"], [data-action="tablet-close"]').forEach(button => {
      button.addEventListener('click', ev => {
        ev.preventDefault();
        this.close();
      });
    });

    root.querySelectorAll('[data-action="first-run-expand"], [data-action="tablet-expand"]').forEach(button => {
      button.addEventListener('click', ev => {
        ev.preventDefault();
        this._toggleExpanded();
      });
    });
  }

  _toggleExpanded() {
    const width = Math.min(window.innerWidth - 80, 1180);
    const height = Math.min(window.innerHeight - 80, 860);
    const current = this.position ?? {};
    const isExpanded = current.width >= width - 8 && current.height >= height - 8;

    if (isExpanded) {
      this.setPosition({ width: 900, height: 740 });
      return;
    }

    this.setPosition({
      width,
      height,
      left: Math.max(24, Math.round((window.innerWidth - width) / 2)),
      top: Math.max(24, Math.round((window.innerHeight - height) / 2))
    });
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
