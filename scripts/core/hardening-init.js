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

import { validateCoreData, registerSafetyDiagnostics } from './runtime-safety.js';
import { registerMutationSafety } from './mutation-safety.js';
import { registerDiagnosticsCommand } from './v1-api-scanner.js';
import { log } from './foundry-env.js';

// Phase 6: Product-Grade Finish
import {
  initializeFirstRunExperience,
  registerFirstRunSettings,
  registerFirstRunConsoleHelpers
} from './first-run-experience.js';
import {
  registerFeatureSettings,
  registerFeatureFlagsConsole
} from './feature-flags.js';
import {
  registerTooltipSettings,
  registerTooltipDiscoveryConsole
} from './tooltip-discovery.js';

const SYSTEM_ID = 'foundryvtt-swse';

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
 */
export function showHardeningStatus() {
  if (!game.user.isGM) {
    ui?.notifications?.warn?.('Only GMs can view hardening status');
    return;
  }

  const status = window.game.swse?.hardening || {};
  const html = `
    <div class="swse-hardening-status">
      <h2>SWSE v13 Hardening Status</h2>

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
    </div>
  `;

  const dialog = new Dialog({
    title: 'SWSE v13 Hardening Status',
    content: html,
    buttons: {
      diagnostics: {
        icon: '<i class="fas fa-stethoscope"></i>',
        label: 'Run Diagnostics',
        callback: async () => {
          await window.SWSEDiagnostics.run();
        }
      },
      close: {
        icon: '<i class="fas fa-times"></i>',
        label: 'Close',
        callback: () => {}
      }
    },
    default: 'close'
  });

  dialog.render(true);
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
  });

  // GM can open status panel
  if (game.user.isGM) {
    // Make command available via button or console
    window.game.swse = window.game.swse || {};
    window.game.swse.showStatus = showHardeningStatus;
  }
}
