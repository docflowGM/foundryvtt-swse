/**
 * SWSE Migration Auditor - v1 → v2 Ghost Detection
 *
 * Catches architectural assumptions from v1 that quietly break in v2:
 * - Render lifecycle assumptions
 * - Hook signature mismatches
 * - Template context shape changes
 * - Async ordering violations
 * - Compendium access patterns
 *
 * All loggers respect window.SWSE.strictV2 mode:
 * - false (default): Log warnings, allow graceful degradation
 * - true: Throw errors, fail fast during migration testing
 */

/**
 * Safe accessor for devMode setting
 * Safely checks if core.devMode is registered before accessing
 */
function getDevMode() {
  try {
    return getDevMode();
  } catch {
    return false;
  }
}

/**
 * Initialize migration auditor
 * Call this during system init to set up listeners
 */
export function initMigrationAuditor() {
  if (!getDevMode()) {return;}

  // Hook signature validator
  validateHookSignatures();

  // Strict mode flag
  if (window.SWSE && !('strictV2' in window.SWSE)) {
    window.SWSE.strictV2 = false;
  }

  console.log('[SWSE Migration Auditor] Initialized (dev mode)');
}

/**
 * Assert v2 compliance - use this throughout codebase
 * @param {boolean} condition - Assertion to check
 * @param {string} code - Error code (e.g., "RENDER.LIFECYCLE")
 * @param {string} message - Error message
 * @param {Object} context - Additional context for debugging
 */
export function v2Assert(condition, code, message, context = {}) {
  if (condition) {return;}

  const fullMessage = `[${code}] ${message}`;

  if (window.SWSE?.strictV2) {
    throw new Error(fullMessage);
  } else {
    console.error(fullMessage, context);
  }
}

/**
 * LOGGER 1: Render Lifecycle Logger
 * Catches code assuming v1 render order (element exists before render, etc.)
 */
export function logRenderLifecycle(app, phase) {
  if (!getDevMode()) {return;}

  const info = {
    app: app.constructor.name,
    phase,
    rendered: app.rendered,
    elementType: app.element?.constructor?.name || 'null',
    elementSize: app.element ? {
      width: app.element.offsetWidth,
      height: app.element.offsetHeight
    } : null
  };

  if (phase === 'before' && app.element && !app.rendered) {
    console.warn('[RENDER.LIFECYCLE.WARNING] Element exists before render', info);
  }

  if (phase === 'after' && !app.element) {
    v2Assert(false, 'RENDER.LIFECYCLE.NO_ELEMENT', 'Element missing after render', info);
  }

  if (window.SWSE?.strictV2) {
    console.log(`[RENDER.LIFECYCLE] ${app.constructor.name} ${phase}`, info);
  }
}

/**
 * LOGGER 2: Hook Signature Validator
 * Catches hooks still expecting jQuery instead of HTMLElement
 */
function validateHookSignatures() {
  // renderApplication hook
  const originalRenderApp = Hooks.on;
  let hooked = false;

  if (!hooked) {
    Hooks.on('renderApplication', (app, html, options) => {
      v2Assert(
        html instanceof HTMLElement,
        'HOOK.SIGNATURE.INVALID',
        `renderApplication received ${html?.constructor?.name || typeof html} instead of HTMLElement`,
        { html, app: app.constructor.name }
      );
    });
    hooked = true;
  }
}

/**
 * LOGGER 3: Template Context Shape Logger
 * Catches templates expecting data.field instead of system.field, removed fields, etc.
 */
export function validateContextShape(context, requiredKeys, label) {
  if (!getDevMode()) {return;}

  const missing = [];
  const null_values = [];

  for (const key of requiredKeys) {
    if (!(key in context)) {
      missing.push(key);
    } else if (context[key] === null || context[key] === undefined) {
      null_values.push(key);
    }
  }

  if (missing.length > 0) {
    v2Assert(
      false,
      'TEMPLATE.CONTEXT.MISSING',
      `${label} missing context keys: ${missing.join(', ')}`,
      { missing, context }
    );
  }

  if (null_values.length > 0) {
    console.warn(
      `[TEMPLATE.CONTEXT.NULL] ${label} has null/undefined values: ${null_values.join(', ')}`
    );
  }
}

/**
 * LOGGER 4: Async Order Violation Logger
 * Catches async operations resolving after render (causes stale UI)
 */
export function logAsyncOrderViolation(label, resolvedAt) {
  if (!getDevMode()) {return;}

  const now = performance.now();
  if (resolvedAt < now - 100) { // 100ms is our "post-render" threshold
    v2Assert(
      false,
      'ASYNC.LATE_WRITE',
      `${label} resolved ${Math.round(now - resolvedAt)}ms after render start`,
      { delayMs: now - resolvedAt }
    );
  }
}

/**
 * LOGGER 5: Compendium Access Logger
 * Catches eager-load patterns that kill v13+ performance (use index instead)
 */
export class CompendiumAccessAuditor {
  static audit(pack, method) {
    if (!getDevMode()) {return;}

    // getDocuments() is v1 pattern - should use index
    if (method === 'getDocuments') {
      v2Assert(
        false,
        'COMPENDIUM.EAGER_LOAD',
        `getDocuments called on compendium ${pack.collection} - use index instead`,
        { pack: pack.collection, method }
      );
    }

    // Direct iteration is v1 pattern
    if (method === 'forEach') {
      console.warn(
        `[COMPENDIUM.ITERATION] Direct iteration on ${pack.collection} - consider using index for performance`
      );
    }
  }

  /**
   * Wrap a compendium access for auditing
   * @param {CompendiumCollection} pack - The compendium to wrap
   * @returns {Proxy} Wrapped with audit logging
   */
  static wrap(pack) {
    return new Proxy(pack, {
      get: (target, prop) => {
        if (['getDocuments', 'forEach', 'map', 'filter'].includes(prop)) {
          this.audit(target, prop);
        }
        return Reflect.get(target, prop);
      }
    });
  }
}

/**
 * BONUS: DOM Ownership Violation Logger
 * Catches one app mutating another app's DOM
 */
export function validateDOMOwnership(el, app, label) {
  if (!getDevMode()) {return;}

  // Check if element is within app root
  if (app.element && !app.element.contains(el)) {
    v2Assert(
      false,
      'DOM.OWNERSHIP.VIOLATION',
      `${label} attempted to mutate DOM outside app root`,
      { el, app: app.constructor.name }
    );
  }
}

/**
 * BONUS: Layout Assumption Logger
 * Catches JS assuming CSS layout state that might not be ready
 */
export function validateLayoutState(el, label) {
  if (!getDevMode()) {return;}

  const rect = el.getBoundingClientRect();

  if (rect.height === 0 && el.children.length > 0) {
    console.warn(
      `[LAYOUT.ASSUMPTION.INVALID] ${label} has zero height but contains children - layout may not be ready`
    );
  }

  if (rect.width === 0 && el.children.length > 0) {
    console.warn(
      `[LAYOUT.ASSUMPTION.INVALID] ${label} has zero width but contains children - layout may not be ready`
    );
  }
}

/**
 * State Drift Logger
 * Catches rendering from live actor instead of snapshot (v2 batching hides this)
 */
export function validateStateDrift(snapshot, liveActor, label) {
  if (!getDevMode()) {return;}

  if (snapshot._id !== liveActor.id) {
    v2Assert(
      false,
      'STATE.DRIFT',
      `${label} snapshot does not match live actor (render batching desync)`,
      { snapshotId: snapshot._id, liveId: liveActor.id }
    );
  }

  // Check for field divergence
  if (snapshot.system && liveActor.system) {
    const snapshotKeys = Object.keys(snapshot.system);
    const liveKeys = Object.keys(liveActor.system);

    if (snapshotKeys.length !== liveKeys.length) {
      console.warn(
        `[STATE.DRIFT.KEYS] ${label} snapshot and live actor have different field counts`,
        { snapshot: snapshotKeys.length, live: liveKeys.length }
      );
    }
  }
}

/**
 * Migration Audit Report
 * Run this after migrating code to v2 to check for common patterns
 * @returns {Object} Audit results
 */
export function generateMigrationReport() {
  if (!getDevMode()) {
    console.warn('[MIGRATION AUDIT] Skipped (dev mode disabled)');
    return { skipped: true };
  }

  console.group('%c[SWSE Migration Audit Report]', 'color: #ff9900; font-weight: bold;');

  const checks = {
    'Strict V2 Mode': window.SWSE?.strictV2 ? '✓ ENABLED' : '○ disabled',
    'Dev Mode': getDevMode() ? '✓ enabled' : '✗ DISABLED',
    'CSS Auditor': typeof window.SWSE?.cssHealth === 'function' ? '✓ available' : '✗ missing',
    'Smoke Tests': typeof window.SWSE?.smokeTest === 'function' ? '✓ available' : '✗ missing',
    'Character Sheets': CONFIG.Actor.sheetClasses.character ? '✓ registered' : '✗ missing',
    'Handlebars Helpers': Handlebars.helpers.getIconClass ? '✓ registered' : '✗ missing'
  };

  console.table(checks);

  const report = {
    strictV2Mode: window.SWSE?.strictV2 || false,
    timestamp: new Date().toISOString(),
    checks
  };

  console.groupEnd();
  return report;
}

/**
 * Enable strict V2 mode for migration testing
 * Usage: window.SWSE.enableStrictV2()
 * All v2 assertions will throw instead of warn
 */
export function enableStrictV2() {
  if (!window.SWSE) {window.SWSE = {};}
  window.SWSE.strictV2 = true;
  console.log('%c⚡ STRICT V2 MODE ENABLED', 'color: red; font-weight: bold;');
  console.warn('All v2 assertion failures will now throw. Disable with: window.SWSE.strictV2 = false');
}

/**
 * Disable strict V2 mode for normal play
 * Usage: window.SWSE.disableStrictV2()
 */
export function disableStrictV2() {
  if (!window.SWSE) {window.SWSE = {};}
  window.SWSE.strictV2 = false;
  console.log('%c○ Strict V2 mode disabled', 'color: gray;');
}

// ============================================
// PIPELINE-LEVEL LOGGERS (End-to-End Context)
// ============================================

/** Session ID for correlating all logs from this session */
const SESSION_ID = crypto.randomUUID();

export function getSessionId() {
  return SESSION_ID;
}

/**
 * LOGGER 6: Pipeline Phase Logger
 * Tracks progress through chargen and sheet loading pipelines
 * Helps identify exactly where a blank UI pipeline broke
 */
export function logPhase(surface, phase, context = {}) {
  if (!getDevMode()) {return;}

  const entry = {
    surface,
    phase,
    session: SESSION_ID,
    timestamp: new Date().toISOString(),
    ...context
  };

  console.log(`[${surface}.PHASE.${phase}]`, entry);
}

/**
 * LOGGER 7: Compendium Integrity Logger
 * Detects half-migrated compendiums, broken JSON, schema drift
 */
export function validateCompendiumIntegrity(name, items, requiredFields) {
  if (!getDevMode()) {return;}

  if (!items || items.length === 0) {
    v2Assert(
      false,
      'COMPENDIUM.EMPTY',
      `${name} compendium loaded zero items`,
      { name, itemCount: items?.length || 0 }
    );
    return;
  }

  const missing = [];
  for (const field of requiredFields) {
    if (!items.some(i => i[field] !== undefined)) {
      missing.push(field);
    }
  }

  if (missing.length > 0) {
    console.warn(
      `[COMPENDIUM.FIELD.MISSING] ${name} missing fields: ${missing.join(', ')}`,
      { name, missing, itemCount: items.length }
    );
  }
}

/**
 * LOGGER 8: Context Completeness Logger
 * Catches incomplete context before template rendering
 */
export function validateContextComplete(surface, context, requiredKeys) {
  if (!getDevMode()) {return;}

  const missing = requiredKeys.filter(k => context[k] === undefined);

  if (missing.length > 0) {
    v2Assert(
      false,
      'CONTEXT.INCOMPLETE',
      `${surface} missing required context keys: ${missing.join(', ')}`,
      { surface, missing, providedKeys: Object.keys(context) }
    );
  }
}

/**
 * LOGGER 9: Template Dependency Logger
 * Detects partials that were used but not preloaded
 */
export function validateTemplateDependencies(templatePath, partialsUsed) {
  if (!getDevMode()) {return;}

  const missing = [];
  for (const partial of partialsUsed) {
    if (!Handlebars.partials[partial]) {
      missing.push(partial);
      console.error(
        `[TEMPLATE.DEPENDENCY.MISSING] ${templatePath} requires unloaded partial: ${partial}`
      );
    }
  }

  if (missing.length > 0) {
    v2Assert(
      false,
      'TEMPLATE.DEPENDENCY.MISSING',
      `${templatePath} has ${missing.length} missing partials`,
      { templatePath, missing }
    );
  }
}

/**
 * LOGGER 10: Render Outcome Classifier
 * Distinguishes between: completely blank, text-only, fully interactive
 */
export function classifyRenderOutcome(root, surface) {
  if (!getDevMode()) {return;}

  const text = root.innerText?.trim() || '';
  const hasControls = root.querySelectorAll('input, button, select').length > 0;
  const childCount = root.children.length;

  if (!text && !hasControls && childCount === 0) {
    v2Assert(
      false,
      'RENDER.COMPLETELY_EMPTY',
      `${surface} rendered with no content, controls, or children`,
      { surface, text: text.length, controls: hasControls, children: childCount }
    );
  } else if (!text && !hasControls) {
    console.warn(
      `[RENDER.EMPTY_STRUCTURE] ${surface} has structure but no visible content`,
      { children: childCount }
    );
  } else if (!hasControls) {
    console.warn(
      `[RENDER.PARTIAL] ${surface} has content but no interactive controls`,
      { textLength: text.length, children: childCount }
    );
  }
}

/**
 * LOGGER 11: Cross-Surface Consistency Logger
 * Catches data mismatches when transitioning between surfaces (chargen → sheet)
 */
export function validateSurfaceTransition(fromSurface, toSurface, actor) {
  if (!getDevMode()) {return;}

  if (!actor) {
    v2Assert(
      false,
      'SURFACE.TRANSITION.NO_ACTOR',
      `Transition ${fromSurface} → ${toSurface} has no actor`,
      { from: fromSurface, to: toSurface }
    );
    return;
  }

  if (!actor.system) {
    v2Assert(
      false,
      'SURFACE.TRANSITION.INVALID_DATA',
      `Transition ${fromSurface} → ${toSurface} actor missing system data`,
      { from: fromSurface, to: toSurface, actorType: actor.type }
    );
    return;
  }

  console.log(
    `[SURFACE.TRANSITION] ${fromSurface} → ${toSurface}`,
    { actor: actor.name, type: actor.type, system: actor.system }
  );
}

/**
 * LOGGER 12: "Nothing Loaded" Sentinel
 * Failsafe that catches catastrophic silent failures after startup
 */
export function setupNoWindowSentinel() {
  if (!getDevMode()) {return;}

  setTimeout(() => {
    // Only check if we're past initial load and at least one app should be open
    if (game.ready && !Object.values(ui.windows || {}).length) {
      console.error(
        '[UI.STARTUP.FAILED] No UI windows opened after system initialization',
        { session: SESSION_ID }
      );
    }
  }, 5000);
}

/**
 * Full UI Failure Report
 * Correlate failures across all systems using session ID
 */
export function generateUIFailureReport() {
  if (!getDevMode()) {
    console.warn('[UI FAILURE REPORT] Skipped (dev mode disabled)');
    return null;
  }

  console.group('%c[SWSE UI Failure Analysis]', 'color: #ff3333; font-weight: bold;');

  const diagnostics = {
    session: SESSION_ID,
    timestamp: new Date().toISOString(),
    systems: {
      chargen: {
        available: typeof CONFIG.chargen !== 'undefined',
        templates: !!Handlebars.partials['systems/foundryvtt-swse/templates/apps/chargen.hbs']
      },
      sheets: {
        character: !!CONFIG.Actor?.sheetClasses?.character,
        droid: !!CONFIG.Actor?.sheetClasses?.droid,
        npc: !!CONFIG.Actor?.sheetClasses?.npc,
        vehicle: !!CONFIG.Actor?.sheetClasses?.vehicle
      },
      compendiums: {
        species: !!game.packs.get('systems.foundryvtt-swse.species'),
        classes: !!game.packs.get('systems.foundryvtt-swse.classes'),
        talents: !!game.packs.get('systems.foundryvtt-swse.talents'),
        feats: !!game.packs.get('systems.foundryvtt-swse.feats')
      }
    }
  };

  console.table(diagnostics.systems);
  console.groupEnd();

  return diagnostics;
}

