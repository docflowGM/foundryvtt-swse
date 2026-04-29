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

import { BaseSWSEAppV2 } from "/systems/foundryvtt-swse/scripts/apps/base/base-swse-appv2.js";
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

  // Remove leaked app classes from the sidebar root itself.
  const swseInjected = ['swse', 'vehicle-modification-app', 'swse-app', 'swse-theme-holo'];
  const rootClassesToRemove = Array.from(sidebar.classList).filter(cls => swseInjected.includes(cls));
  rootClassesToRemove.forEach(cls => sidebar.classList.remove(cls));

  if (rootClassesToRemove.length > 0) {
    log.warn(`SWSE | Removed ${rootClassesToRemove.length} injected classes from sidebar root:`, rootClassesToRemove);
  }

  // Defensive normalization: native Foundry sidebar panels should never inherit
  // custom SWSE app classes from DEFAULT_OPTIONS leakage.
  const nativePanelAllowlist = new Set([
    'tab', 'sidebar-tab', 'directory', 'flexcol', 'active',
    'chat-sidebar', 'combat-sidebar', 'scenes-sidebar', 'actors-sidebar',
    'items-sidebar', 'journal-sidebar', 'tables-sidebar', 'cards-sidebar',
    'macros-sidebar', 'playlists-sidebar', 'compendium-sidebar', 'settings-sidebar'
  ]);

  const nativeSidebarPanels = sidebar.querySelectorAll([
    '#chat', '#combat', '#scenes', '#actors', '#items', '#journal',
    '#tables', '#cards', '#macros', '#playlists', '#compendium', '#settings'
  ].join(','));

  nativeSidebarPanels.forEach((panel) => {
    const removed = [];
    for (const cls of Array.from(panel.classList)) {
      const isFontAwesome = cls.startsWith('fa-');
      const isSwseLeak = cls === 'swse' || cls === 'swse-app' || cls.includes('dialog') || cls.endsWith('-app') || cls.startsWith('swse-');
      const isAllowed = nativePanelAllowlist.has(cls);
      if (!isAllowed && !isFontAwesome && isSwseLeak) {
        panel.classList.remove(cls);
        removed.push(cls);
      }
    }

    if (removed.length > 0) {
      log.warn(`SWSE | Stripped leaked classes from native sidebar panel #${panel.id}:`, removed);
    }

    // Foundry controls visibility via active state; clear stale inline display
    // without forcing non-active panels visible.
    panel.style.removeProperty('display');
  });
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
    registerConsoleLogExport();

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

    // Ensure sidebar tab visibility is guaranteed during ready phase
    _ensureSidebarTabsVisible();

    log.info('SWSE | v13 hardening systems initialized');
    log.info('SWSE | Phase 6 (First-run, Feature Flags, Tooltip Discovery) ready');
    return true;
  } catch (err) {
    log.error('Failed to initialize hardening systems:', err.message);
    return false;
  }
}

/**
 * Ensure sidebar tabs are visible and active tab is initialized
 * Called from ready hook to fix sidebar display issues
 * @private
 */
function registerConsoleLogExport() {
  globalThis.SWSE = globalThis.SWSE || {};
  globalThis.SWSE.consolelog = globalThis.SWSE.consolelog || {};
  globalThis.swse = globalThis.swse || {};
  globalThis.swse.consolelog = globalThis.swse.consolelog || {};

  const bufferKey = '__swseConsoleBuffer';
  if (!globalThis[bufferKey]) {
    globalThis[bufferKey] = [];
    for (const level of ['log', 'info', 'warn', 'error', 'debug']) {
      const original = console[level].bind(console);
      if (console[level].__swseWrapped) continue;
      const wrapped = (...args) => {
        try {
          const rendered = args.map(arg => {
            if (typeof arg === 'string') return arg;
            try { return JSON.stringify(arg, null, 2); } catch (_err) { return String(arg); }
          }).join(' ');
          globalThis[bufferKey].push(`[${new Date().toISOString()}] [${level.toUpperCase()}] ${rendered}`);
          if (globalThis[bufferKey].length > 10000) globalThis[bufferKey].shift();
        } catch (_err) {}
        return original(...args);
      };
      wrapped.__swseWrapped = true;
      console[level] = wrapped;
    }
  }

  const exportConsoleLog = async (filename = null) => {
    const lines = globalThis[bufferKey] || [];
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const safeName = filename || `console-log-${stamp}.txt`;
    const contents = lines.join('\n');
    const blob = new Blob([contents], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = safeName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 0);
    ui.notifications?.info?.(`SWSE console log exported as ${safeName}`);
    return { filename: safeName, lineCount: lines.length };
  };

  globalThis.SWSE.consolelog.export = exportConsoleLog;
  globalThis.swse.consolelog.export = exportConsoleLog;
}

function _ensureSidebarTabsVisible() {
  // Register to run AFTER ready hook completes and modules are loaded
  Hooks.on('ready', () => {
    // Defer execution to ensure Foundry initialization is complete
    setTimeout(() => {
      try {
        // FIXED: Only select sidebar panels that are INSIDE #sidebar container
        // This prevents confusion with SWSE app elements that might have the same ID
        const sidebar = document.querySelector('#sidebar');
        if (!sidebar) {
          log.warn('SWSE | Sidebar container not found in DOM');
          return;
        }

        const scenes = sidebar.querySelector('#scenes');
        const combat = sidebar.querySelector('#combat');

        if (!scenes || !combat) {
          log.warn('SWSE | Sidebar tabs not found in DOM');
          return;
        }

        // Normalize sidebar after all apps/modules load. Do NOT force display on
        // native panels; that can make inactive panels visible simultaneously.
        _restoreSidebarDefaults();

        // Do not synthesize sidebar clicks here. Foundry v13 owns sidebar tab state,
        // and forcing button clicks during boot can leave the native sidebar
        // controller in an inconsistent collapsed/no-content state.
        log.info('SWSE | Sidebar tab visibility normalization complete');
      } catch (err) {
        log.warn('SWSE | Sidebar tab visibility restoration failed:', err.message);
      }
    }, 500); // Wait 500ms after ready for full initialization
  });
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
class HardeningStatusPanel extends BaseSWSEAppV2 {
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

  // GUARANTEED SIDEBAR FIX: Run after all other ready hooks complete
  // FIXED: Only affect actual Foundry sidebar elements, not app windows with same IDs
  Hooks.once('ready', () => {
    setTimeout(() => {
      try {
        // FIXED: Ensure we're selecting elements INSIDE #sidebar container only
        const sidebar = document.querySelector('#sidebar');
        if (!sidebar) {
          return; // Sidebar doesn't exist, nothing to fix
        }

        const scenes = sidebar.querySelector('#scenes');
        const combat = sidebar.querySelector('#combat');

        if (scenes && combat) {
          _restoreSidebarDefaults();

          // Do not force sidebar activation via DOM clicks. Foundry should restore
          // its own tab state; SWSE only clears leaked classes and stale inline styles.
        }
      } catch (err) {
        log.warn('SWSE | Guaranteed sidebar fix failed:', err.message);
      }
    }, 1000); // Run 1 second after ready
  });
}
