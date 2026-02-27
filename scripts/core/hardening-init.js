/**
 * Foundry VTT SWSE v13 Hardening - Central Initialization
 *
 * Loads and registers all hardening utilities:
 * - Runtime safety validation
 * - Mutation safety tracking
 * - v1 API detection
 * - Safe document APIs
 * - Consolidated global accessors
 *
 * Call this from the main system initialization hook.
 */

import { validateCoreData, registerSafetyDiagnostics } from "/systems/foundryvtt-swse/scripts/core/runtime-safety.js";
import { registerMutationSafety } from "/systems/foundryvtt-swse/scripts/core/mutation-safety.js";
import { registerDiagnosticsCommand } from "/systems/foundryvtt-swse/scripts/core/v1-api-scanner.js";
import { log } from "/systems/foundryvtt-swse/scripts/core/foundry-env.js";

// Phase 6: Product-Grade Finish
import {
  initializeFirstRunExperience,
  registerFirstRunSettings,
  registerFirstRunConsoleHelpers
} from "/systems/foundryvtt-swse/scripts/core/first-run-experience.js";
import {
  registerFeatureSettings,
  registerFeatureFlagsConsole
} from "/systems/foundryvtt-swse/scripts/core/feature-flags.js";
import {
  registerTooltipSettings,
  registerTooltipDiscoveryConsole
} from "/systems/foundryvtt-swse/scripts/core/tooltip-discovery.js";

const SYSTEM_ID = 'foundryvtt-swse';

/**
 * Restore sidebar to default Foundry classes
 * Foundry's ApplicationV2 may leak app class definitions during module load.
 * This removes any non-Foundry classes that may have been injected.
 * @private
 */
function _restoreSidebarDefaults() {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;

  // Get current classes and filter to only Foundry defaults
  const currentClasses = Array.from(sidebar.classList);

  // Foundry sidebar default classes (these should always be present)
  const foundryDefaults = ['collapsed', 'app', 'window-app'];
  const swseInjected = ['swse', 'vehicle-modification-app', 'swse-app', 'swse-theme-holo'];

  // Remove any SWSE-injected classes
  const classesToRemove = currentClasses.filter(cls => swseInjected.includes(cls));
  classesToRemove.forEach(cls => sidebar.classList.remove(cls));

  // Log if we removed anything
  if (classesToRemove.length > 0) {
    log.warn(`SWSE | Removed ${classesToRemove.length} injected classes from sidebar:`, classesToRemove);
  }
}

/**
 * Initialize all hardening systems (call from init hook)
 */
export async function initializeHardeningSystem() {
  try {
    log.info('SWSE | Initializing v13 hardening systems...');

    // Register diagnostic commands in global scope
    registerSafetyDiagnostics();
    registerMutationSafety();
    registerDiagnosticsCommand();

    // Phase 6: Register settings and console helpers
    registerFirstRunSettings();
    registerFeatureSettings();
    registerTooltipSettings();
    registerFirstRunConsoleHelpers();
    registerFeatureFlagsConsole();
    registerTooltipDiscoveryConsole();

    // Create system namespace
    window.game.swse = window.game.swse || {};
    window.game.swse.hardening = {
      version: '1.0.0',
      initialized: true,
      timestamp: Date.now()
    };

    // Defensive: Remove any app classes that may have leaked into sidebar during module load
    _restoreSidebarDefaults();

    log.info('SWSE | v13 hardening systems initialized');
    log.info('SWSE | Phase 6 (First-run, Feature Flags, Tooltip Discovery) ready');
    return true;
  } catch (err) {
    log.error('Failed to initialize hardening systems:', err.message);
    return false;
  }
}

/**
 * Validate system on ready (call from ready hook)
 * Performs critical data checks and reports issues
 */
export async function validateSystemReady() {
  try {
    if (!game.user.isGM) {
      return true; // Non-GMs don't run validation
    }

    log.info('SWSE | Validating core data...');
    const validation = await validateCoreData();

    if (!validation.valid) {
      log.error('SWSE | Core data validation failed:', validation.errors);
      ui?.notifications?.error?.(`SWSE initialization issue: ${validation.errors.join('; ')}`);
      return false;
    }

    log.info('SWSE | Core data validation passed');

    // Phase 6: Show first-run experience for GMs on first login
    await initializeFirstRunExperience();

    return true;
  } catch (err) {
    log.error('System validation failed:', err.message);
    return false;
  }
}

/**
 * Show hardening status panel (GM command)
 * AppV2-based implementation
 */
class HardeningStatusPanel extends foundry.applications.api.ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: 'swse-hardening-status',
    tag: 'div',
    window: { icon: 'fa-solid fa-shield', title: 'SWSE v13 Hardening Status' },
    position: { width: 500, height: 'auto' }
  };

  _renderHTML(context, options) {
    const status = window.game.swse?.hardening || {};
    return `
      <div class="swse-hardening-status">
        <div class="status-info">
          <p><strong>Version:</strong> ${status.version || 'unknown'}</p>
          <p><strong>Initialized:</strong> ${status.initialized ? '✓ Yes' : '✗ No'}</p>
          <p><strong>Timestamp:</strong> ${new Date(status.timestamp).toLocaleString()}</p>
        </div>

        <div class="status-systems">
          <h3>Active Systems</h3>
          <ul>
            <li>✓ Runtime Safety Validation</li>
            <li>✓ Mutation Safety Tracking</li>
            <li>✓ v1 API Scanner</li>
            <li>✓ Document API v13 Compatibility</li>
            <li>✓ Global Environment Accessors</li>
          </ul>
        </div>

        <div class="status-commands">
          <h3>GM Commands</h3>
          <p><code>game.swse.diagnostics.run()</code> - Run v1 API scan</p>
          <p><code>game.swse.diagnostics.showPanel()</code> - Show diagnostic panel</p>
          <p><code>game.SWSESafety.validateCore()</code> - Validate core data</p>
          <p><code>game.SWSESafety.getErrors()</code> - View error log</p>
          <p><code>game.SWSEMutations.audit(actor)</code> - Audit actor mutations</p>
        </div>

        <div class="status-buttons">
          <button class="btn btn-primary" data-action="run-diagnostics">
            <i class="fa-solid fa-stethoscope"></i> Run Diagnostics
          </button>
          <button class="btn btn-secondary" data-action="close">
            <i class="fa-solid fa-times"></i> Close
          </button>
        </div>
      </div>
    `;
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
    this.element?.querySelector('[data-action="run-diagnostics"]')?.addEventListener('click', async () => {
      if (window.SWSEDiagnostics) {
        await window.SWSEDiagnostics.run();
      }
    });

    this.element?.querySelector('[data-action="close"]')?.addEventListener('click', () => {
      this.close();
    });
  }
}

export function showHardeningStatus() {
  if (!game.user?.isGM) {
    ui?.notifications?.warn?.('Only GMs can view hardening status');
    return;
  }

  const panel = new HardeningStatusPanel();
  panel.render(true);
}

/**
 * Register Foundry hooks for hardening system
 */
export function registerHardeningHooks() {
  // Initialize on system init
  Hooks.once('init', async () => {
    await initializeHardeningSystem();
  });

  // Validate on ready
  Hooks.once('ready', async () => {
    await validateSystemReady();

    // GM can open status panel (safe to access game.user here)
    if (game.user?.isGM) {
      // Make command available via button or console
      window.game.swse = window.game.swse || {};
      window.game.swse.showStatus = showHardeningStatus;
    }
  });
}
