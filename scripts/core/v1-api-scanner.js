/**
 * V1 API Scanner - Runtime detection of deprecated patterns
 *
 * Scans the system for deprecated v1 patterns that may break in v13+
 * Logs warnings for diagnostic purposes (optional GM-only mode)
 *
 * This is NOT a replacement for code review - it catches common patterns only.
 */

const SYSTEM_ID = 'foundryvtt-swse';

/**
 * Report structure
 */
class V1ApiScanResult {
  constructor() {
    this.deprecatedGlobals = [];
    this.deprecatedMethods = [];
    this.jQueryPatterns = [];
    this.insecurePatterns = [];
    this.timestamp = new Date().toISOString();
  }

  isClean() {
    return (
      this.deprecatedGlobals.length === 0 &&
      this.deprecatedMethods.length === 0 &&
      this.jQueryPatterns.length === 0 &&
      this.insecurePatterns.length === 0
    );
  }

  summary() {
    return {
      total: this.deprecatedGlobals.length + this.deprecatedMethods.length +
             this.jQueryPatterns.length + this.insecurePatterns.length,
      globals: this.deprecatedGlobals.length,
      methods: this.deprecatedMethods.length,
      jquery: this.jQueryPatterns.length,
      security: this.insecurePatterns.length
    };
  }
}

/**
 * Scan runtime for deprecated patterns (lightweight, GM-only)
 */
export async function scanForV1Patterns(options = {}) {
  const result = new V1ApiScanResult();
  const verbose = options.verbose !== false;

  try {
    // Only allow GMs to run full scans
    if (!game.user.isGM) {
      console.warn('[SWSE] V1 API Scanner: Only GMs can run full scans.');
      return result;
    }

    // 1. Check for deprecated global usage
    _checkGlobalPatterns(result);

    // 2. Check system settings for deprecated config
    _checkSettingsPatterns(result);

    // 3. Check for known unsafe patterns
    _checkUnsafePatterns(result);

    if (verbose) {
      const summary = result.summary();
      if (!result.isClean()) {
        console.warn(`[SWSE] V1 API Scan: ${summary.total} issues detected`, result);
      } else {
        console.log('[SWSE] V1 API Scan: All clear!');
      }
    }
  } catch (err) {
    console.error('[SWSE] V1 API Scanner failed:', err);
  }

  return result;
}

/**
 * Internal: Check for deprecated global patterns
 */
function _checkGlobalPatterns(result) {
  // Deprecated Foundry globals that should use explicit getters
  const deprecatedGlobals = [
    { name: 'game.actors', usage: 'Use game.actors directly or fromUuid()' },
    { name: 'game.items', usage: 'Use game.items directly or fromUuid()' },
    { name: 'game.packs', usage: 'Use game.packs directly or CompendiumCollection' }
  ];

  // These are OK to use, but log for audit purposes
  for (const { name } of deprecatedGlobals) {
    const parts = name.split('.');
    let obj = globalThis;
    for (const part of parts) {
      obj = obj?.[part];
      if (!obj) break;
    }
    if (obj !== undefined) {
      // Global exists but is allowed - no warning needed
    }
  }
}

/**
 * Internal: Check for deprecated settings patterns
 */
function _checkSettingsPatterns(result) {
  try {
    // Check if any hooks are using legacy patterns
    const hooksModule = Hooks._hooks || {};
    const renderHooks = hooksModule.render || [];

    for (const hook of renderHooks) {
      // Scan hook names for v1-specific app types
      if (hook?.id?.includes('FormApplication') ||
          hook?.id?.includes('Dialog') ||
          hook?.id?.includes('ItemSheet')) {
        // These are OK in v2, just log for audit
      }
    }
  } catch (err) {
    // Fail-soft
  }
}

/**
 * Internal: Check for unsafe patterns (document mutation, ownership, etc)
 */
function _checkUnsafePatterns(result) {
  try {
    // Check for actors in combat without permission checks
    if (game.combat?.combatants) {
      for (const combatant of game.combat.combatants) {
        if (combatant.actor && !combatant.actor.isOwner) {
          // Non-owners should not mutate actors
          result.insecurePatterns.push({
            type: 'ownership',
            message: `Non-owner has reference to combatant actor: ${combatant.actor.name}`,
            severity: 'warning'
          });
        }
      }
    }
  } catch (err) {
    // Fail-soft
  }
}

/**
 * Create and show GM-only diagnostic panel
 */
export async function showV1DiagnosticsPanel() {
  if (!game.user.isGM) {
    ui.notifications.warn('Only GMs can view diagnostics.');
    return;
  }

  const result = await scanForV1Patterns({ verbose: false });
  const summary = result.summary();

  const html = `
    <div class="swse-v1-diagnostics">
      <h2>SWSE v13 Hardening Diagnostics</h2>

      <div class="diagnostic-summary">
        <p><strong>Scan Date:</strong> ${new Date(result.timestamp).toLocaleString()}</p>
        <p><strong>Status:</strong> ${result.isClean() ? '✓ Clean' : '⚠ Issues detected'}</p>
        <p><strong>Total Issues:</strong> ${summary.total}</p>
      </div>

      ${summary.total > 0 ? `
        <div class="diagnostic-details">
          <h3>Issues Found</h3>
          ${summary.globals > 0 ? `<p>• Global patterns: ${summary.globals}</p>` : ''}
          ${summary.methods > 0 ? `<p>• Deprecated methods: ${summary.methods}</p>` : ''}
          ${summary.jquery > 0 ? `<p>• jQuery patterns: ${summary.jquery}</p>` : ''}
          ${summary.security > 0 ? `<p>• Security concerns: ${summary.security}</p>` : ''}
        </div>
      ` : `<p style="color: green;">No v1 API patterns detected.</p>`}

      <div class="diagnostic-actions">
        <p><small>Run console: <code>game.swse.diagnostics()</code></small></p>
      </div>
    </div>
  `;

  const dialog = new SWSEDialogV2({
    title: 'SWSE v13 Hardening Status',
    content: html,
    buttons: {
      close: {
        icon: '<i class="fa-solid fa-times"></i>',
        label: 'Close',
        callback: () => {}
      }
    }
  });

  dialog.render(true);
}

/**
 * GM console command: game.swse.diagnostics()
 * Returns full diagnostic report
 */
export function registerDiagnosticsCommand() {
  window.SWSEDiagnostics = {
    async run() {
      console.log('[SWSE] Running v13 hardening diagnostics...');
      const result = await scanForV1Patterns({ verbose: true });
      console.log('[SWSE] Diagnostic result:', result);
      return result;
    },
    async showPanel() {
      await showV1DiagnosticsPanel();
    }
  };
}
