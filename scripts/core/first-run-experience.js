/**
 * First-Run Experience - GM Onboarding
 * Phase 6: Product-grade finish
 *
 * Triggers on first GM login with system-specific guidance,
 * feature explanations, and dismissible tooltips.
 *
 * Usage:
 *   Called automatically from hardening-init.js in ready hook
 */

import { SWSELogger } from '../utils/logger.js';
import { initializeTooltipDiscovery } from './tooltip-discovery.js';

const SYSTEM_ID = 'foundryvtt-swse';
const SETTING_KEY = 'welcomeShown';

/**
 * Check if welcome dialog should show
 */
async function shouldShowWelcome() {
  if (!game?.user?.isGM) return false;

  try {
    const shown = await game.settings.get(SYSTEM_ID, SETTING_KEY);
    return !shown;
  } catch {
    return true; // Default to showing if setting doesn't exist
  }
}

/**
 * Mark welcome as shown
 */
async function markWelcomeShown() {
  try {
    await game.settings.set(SYSTEM_ID, SETTING_KEY, true);
  } catch (err) {
    SWSELogger.warn('Failed to mark welcome as shown:', err.message);
  }
}

/**
 * Reset welcome (for testing or re-onboarding)
 */
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

/**
 * Welcome Dialog - ApplicationV2 Template-Driven Implementation with Sentinel Diagnostics
 */
class WelcomeDialog extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: 'swse-welcome-dialog',
    window: { icon: 'fa-solid fa-star', title: '⭐ Welcome to SWSE for Foundry VTT' },
    position: { width: 800, height: 600 },
    resizable: true
  };

  static PARTS = {
    content: {
      template: 'systems/foundryvtt-swse/templates/dialogs/welcome-dialog.hbs'
    }
  };

  // Sentinel Mode: Track render lifecycle
  static _sentinelRenderCount = 0;

  constructor(options = {}) {
    super(options);
    this.resolveDialog = null;
    // Ensure position is initialized from DEFAULT_OPTIONS
    if (!this.position) {
      this.position = { ...this.constructor.DEFAULT_OPTIONS.position };
    }
  }

  async _prepareContext() {
    return {};
  }

  _updatePosition() {
    // Skip positioning if element doesn't have valid dimensions yet
    if (!this.element) return;

    // Ensure position object exists before proceeding
    if (!this.position) {
      this.position = { ...this.constructor.DEFAULT_OPTIONS.position };
    }

    const rect = this.element.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      // Defer positioning to next frame when element has dimensions
      requestAnimationFrame(() => {
        if (this.position) super._updatePosition();
      });
      return;
    }
    super._updatePosition();
  }

  async _onRender(context, options) {
    const root = this.element;

    // --- SENTINEL CHECK 1: HTMLElement contract ---
    if (!(root instanceof HTMLElement)) {
      console.error('SWSE Sentinel: WelcomeDialog root is not HTMLElement.');
      return;
    }

    // --- SENTINEL CHECK 2: Render counter ---
    this.constructor._sentinelRenderCount++;
    const renderCount = this.constructor._sentinelRenderCount;

    const isDevMode = game?.settings?.get?.(SYSTEM_ID, 'devMode');
    if (isDevMode) {
      console.debug(`SWSE Sentinel: WelcomeDialog render #${renderCount}`);
    }

    // --- SENTINEL CHECK 3: DOM stability ---
    const rect = root.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      console.warn('SWSE Sentinel: WelcomeDialog rendered with zero dimensions.', {
        width: rect.width,
        height: rect.height
      });
    }

    // --- SENTINEL CHECK 4: Duplicate listener detection ---
    if (root.dataset.sentinelAttached === 'true') {
      console.warn('SWSE Sentinel: Duplicate _onRender execution detected.');
    }
    root.dataset.sentinelAttached = 'true';

    // --- SENTINEL CHECK 5: Header presence ---
    const header = root.querySelector('.window-header');
    if (!header) {
      console.warn('SWSE Sentinel: No window-header found.');
    }

    if (isDevMode) {
      console.debug('SWSE Sentinel: WelcomeDialog lifecycle healthy.');
    }

    // --- EVENT LISTENER ATTACHMENT ---
    const button = root.querySelector('[data-action="got-it"]');
    if (button) {
      button.addEventListener('click', async () => {
        const checkbox = root.querySelector('#swse-no-welcome-again');
        const noAgain = checkbox?.checked || false;

        if (noAgain) {
          await markWelcomeShown();
        }

        // Start tooltip discovery after welcome closes
        await initializeTooltipDiscovery();

        if (this.resolveDialog) {
          this.resolveDialog(true);
        }

        this.close();
      });
    }
  }
}

/**
 * Show welcome dialog
 */
async function showWelcomeDialog() {
  return new Promise((resolve) => {
    const dialog = new WelcomeDialog();
    dialog.resolveDialog = resolve;
    requestAnimationFrame(() => {
      dialog.render(true);
    });
  });
}

/**
 * Initialize first-run experience
 * Called from hardening-init.js ready hook
 */
export async function initializeFirstRunExperience() {
  if (!game?.ready || !game?.user?.isGM) {
    return;
  }

  try {
    const show = await shouldShowWelcome();
    if (show) {
      SWSELogger.log('Showing first-run welcome dialog');
      await showWelcomeDialog();
    }
  } catch (err) {
    SWSELogger.error('First-run experience error:', err.message);
  }
}

/**
 * Register settings
 */
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

/**
 * Make available to console for re-onboarding
 */
export function registerFirstRunConsoleHelpers() {
  if (typeof window !== 'undefined') {
    window.SWSEFirstRun = {
      resetWelcome,
      showWelcome: showWelcomeDialog
    };
  }
}
