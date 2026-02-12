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
 * Welcome Dialog - AppV2 Implementation
 */
class WelcomeDialog extends foundry.applications.api.ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: 'swse-welcome-dialog',
    tag: 'div',
    window: { icon: 'fas fa-star', title: '⭐ Welcome to SWSE for Foundry VTT' },
    position: { width: 600, height: 'auto' }
  };

  constructor(options = {}) {
    super(options);
    this.resolveDialog = null;
  }

  async _renderHTML(context, options) {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = `

      <div class="swse-welcome">
        <h2>⭐ Welcome to Star Wars Saga Edition!</h2>

        <div class="section">
          <p>This system provides comprehensive support for SWSE gameplay on Foundry VTT v13+. Here's what you need to know:</p>
        </div>

        <div class="section">
          <h3>🎭 Character Generation</h3>
          <ul>
            <li><strong>Guided Chargen:</strong> Use the Character Generation tool to build characters step-by-step</li>
            <li><strong>Auto-Calculation:</strong> Attributes, skills, defenses, and BAB calculate automatically</li>
            <li><strong>Mentor System:</strong> Get explanations and recommendations as you build</li>
            <li><strong>Templates:</strong> Pre-built species, classes, and prestige classes available</li>
          </ul>
        </div>

        <div class="tip">
          <strong>Tip:</strong> First-time GMs should read the Mentor system explanations—they explain SWSE rules in context.
        </div>

        <div class="section">
          <h3>🎲 Combat & Progression</h3>
          <ul>
            <li><strong>Combat Resolution:</strong> Roll attacks and damage with automatic skill/feat calculations</li>
            <li><strong>Level-Up System:</strong> Guided advancement with class feature recommendations</li>
            <li><strong>Force Powers:</strong> Full Force power system with resource tracking</li>
            <li><strong>Vehicles:</strong> Starship and vehicle rules with crew positions</li>
          </ul>
        </div>

        <div class="tip">
          <strong>Tip:</strong> Hover over buttons and icons to see tooltips explaining each feature.
        </div>

        <div class="section">
          <h3>📚 Core Concepts</h3>
          <ul>
            <li><strong>System Settings:</strong> Configure rules variants and house rules in System Settings</li>
            <li><strong>Compendium Packs:</strong> All weapons, armor, feats, and talents are in compendium packs (searchable)</li>
            <li><strong>Actions & Automation:</strong> Many combat actions are automated—click action buttons for quick resolution</li>
            <li><strong>Destiny Points:</strong> Tracked per character; spend in combat for bonuses or rerolls</li>
          </ul>
        </div>

        <div class="section">
          <h3>🔗 Get Help</h3>
          <ul>
            <li>Hover over UI elements for tooltips</li>
            <li>Read the <a href="https://github.com/docflowGM/foundryvtt-swse" target="_blank">system documentation</a></li>
            <li>Join the <a href="https://discord.gg/Sdwd7CgmaJ" target="_blank">community Discord</a></li>
          </ul>
        </div>

        <div class="checkbox-group">
          <label>
            <input type="checkbox" id="swse-no-welcome-again" />
            Don't show this again
          </label>
        </div>

        <div class="dialog-buttons">
          <button class="btn btn-primary" data-action="got-it">
            <i class="fas fa-check"></i> Got It!
          </button>
        </div>
      </div>
    `;
    return wrapper;
  }

  _replaceHTML(result, content, options) {
    result.innerHTML = '';
    result.appendChild(content);
  }

  _onRender(context, options) {
    super._onRender(context, options);
    this.activateListeners();
  }

  activateListeners() {
    this.element?.querySelector('[data-action="got-it"]')?.addEventListener('click', async () => {
      const checkbox = this.element?.querySelector('#swse-no-welcome-again');
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

/**
 * Show welcome dialog
 */
async function showWelcomeDialog() {
  return new Promise((resolve) => {
    const dialog = new WelcomeDialog();
    dialog.resolveDialog = resolve;
    dialog.render(true);
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
