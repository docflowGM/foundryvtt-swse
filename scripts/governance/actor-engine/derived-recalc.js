/**
 * Derived recalculation, derived-write guard, open-app refresh and integrity/loop checks (3N-AE.7, extracted verbatim from ActorEngine).
 *
 * ActorEngine keeps every method name as a thin delegate and remains the only mutation gateway; derived MATH stays in DerivedCalculator (3N-DC).
 * DerivedCalculator and PrerequisiteIntegrityChecker are injected by ActorEngine (configureDerivedRecalc) so this module does not join the static import
 * cycle those two belong to. `recalc:false` semantics, the nested-context stack and the derived-generation stamps are unchanged.
 */
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/core/logger.js";
import { MutationInterceptor } from "/systems/foundryvtt-swse/scripts/governance/mutation/MutationInterceptor.js";
import { stampDerivedGeneration, applyDerivedSnapshot, announceDerivedApplied } from "/systems/foundryvtt-swse/scripts/actors/derived/derived-generation.js";

// Injected by ActorEngine (configureDerivedRecalc): both belong to the DerivedCalculator/ModifierEngine/ActorEngine static import cycle.
let DerivedCalculator = null;
let PrerequisiteIntegrityChecker = null;
export function configureDerivedRecalc(deps = {}) {
  if (deps.DerivedCalculator) DerivedCalculator = deps.DerivedCalculator;
  if (deps.PrerequisiteIntegrityChecker) PrerequisiteIntegrityChecker = deps.PrerequisiteIntegrityChecker;
}

export function applyDerivedUpdates(engine, actor, updates, signature = null) {
    if (!actor?.system || !updates || typeof updates !== 'object') return;

    actor.system.derived ??= {};
    applyDerivedSnapshot(actor.system.derived, updates);

    // Stamp the same runtime-only derived-generation authority
    // SWSEV2BaseActor._computeDerivedAsync() uses (see derived-generation.js)
    // so panel/view-model caches invalidate correctly regardless of which of
    // the two derived-write paths actually applied the update. A single
    // shared stamp keeps both paths on one coherent invalidation authority
    // instead of two counters that could drift out of sync.
    stampDerivedGeneration(actor, actor.system, signature);
    announceDerivedApplied(actor, signature);
  }

export function refreshOpenActorApps(engine, actor, options = {}) {
    if (options?.suppressAppRefresh) {
      SWSELogger.debug(`[RENDER REFRESH] Suppressed open-app refresh for ${actor?.name ?? 'unknown actor'}`, {
        actorId: actor?.id,
        source: options?.source ?? null
      });
      return;
    }

    const apps = Object.values(actor?.apps ?? {});
    if (!apps.length) return;

    queueMicrotask(() => {
      for (const app of apps) {
        const surfaceId = app?._shellSurface ?? app?.shellSurface ?? app?.currentPage ?? 'sheet';
        try {
          if (typeof app?.requestSurfaceRender === 'function') {
            app.requestSurfaceRender({
              reason: options?.source ?? 'actor-engine-refresh',
              surfaceId,
              preserveUi: true
            });
            continue;
          }
          if (typeof app?.render === 'function') {
            import('/systems/foundryvtt-swse/scripts/ui/shell/request-shell-render.js')
              .then(({ requestShellRender }) => requestShellRender(app, {
                reason: options?.source ?? 'actor-engine-refresh',
                surfaceId,
                preserveUi: true
              }))
              .catch(() => app.render(false));
          }
        } catch (err) {
          SWSELogger.warn(`[RENDER REFRESH] Failed to refresh app for ${actor?.name ?? 'unknown actor'}`, {
            actorId: actor?.id,
            appId: app?.id,
            error: err?.message
          });
        }
      }
    });
  }

export async function recalcAllImpl(engine, actor) {
    if (!actor) throw new Error('recalcAll() called with no actor');

    // PHASE 3: Recomputation observability
    const recomputeStart = performance.now();
    const enforcementLevel = MutationInterceptor.getEnforcementLevel();
    const isDevEnvironment = (
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1'
    );
    const observabilityEnabled = (enforcementLevel === 'strict' || isDevEnvironment);

    try {
      if (observabilityEnabled) {
        SWSELogger.debug(`[RECOMPUTE START] ${actor.name}`, {
          stage: 'begin',
          enforceLevel: enforcementLevel,
          timestamp: new Date().toISOString()
        });
      }

      // ========================================
      // PHASE 1: Mark that we're in derived calc cycle
      // ========================================
      actor._isDerivedCalcCycle = true;
      try {
        // ========================================
        // PHASE 2: Compute base derived values
        // ========================================
        if (observabilityEnabled) {
          SWSELogger.debug(`[RECOMPUTE] DerivedCalculator.computeAll() starting...`, { actor: actor.name });
        }
        const recalcAllSignature = DerivedCalculator.getActorComputeSignature(actor);
        const derivedUpdates = await DerivedCalculator.computeAll(actor, { signature: recalcAllSignature });
        engine._applyDerivedUpdates(actor, derivedUpdates, recalcAllSignature);
        if (observabilityEnabled) {
          SWSELogger.debug(`[RECOMPUTE] DerivedCalculator.computeAll() completed`, {
            actor: actor.name,
            derivedHP: actor.system?.derived?.hp?.total,
            derivedBAB: actor.system?.derived?.bab,
            defensesFort: actor.system?.derived?.defenses?.fortitude?.total
          });
        }

        // ========================================
        // Modifier bundle legacy pass removed
        // ========================================
        // DerivedCalculator.computeAll() already applies static/passive modifiers
        // and writes system.derived.modifiers for UI breakdown. The old
        // ModifierEngine bundle pass that ran here has been removed: it was
        // non-idempotent and double-counted static modifiers such as Skill Focus.
      } finally {
        actor._isDerivedCalcCycle = false;
      }

      // ========================================
      // PHASE 4: Check prerequisite integrity
      // ========================================
      // PHASE 3: In strict mode, reject skip flags (S2 hardening)
      if (actor._skipIntegrityCheck && enforcementLevel === 'strict') {
        const message = (
          `[INTEGRITY SKIP REJECTED] Attempted to skip integrity checks in strict mode\n` +
          `_skipIntegrityCheck is only allowed for legitimate recursion prevention\n` +
          `In strict mode, all mutations must include integrity validation`
        );
        throw new Error(message);
      }

      // Skip if flagged as integrity check (prevent recursion)
      if (!actor._skipIntegrityCheck) {
        if (observabilityEnabled) {
          SWSELogger.debug(`[RECOMPUTE] Integrity checks starting...`, { actor: actor.name });
        }
        await engine._checkIntegrity(actor);
        if (observabilityEnabled) {
          SWSELogger.debug(`[RECOMPUTE] Integrity checks completed`, { actor: actor.name });
        }
      } else {
        // PHASE 3: In normal mode, still warn about skip flag
        if (enforcementLevel !== 'silent') {
          SWSELogger.warn(`[INTEGRITY SKIP] Integrity checks skipped for ${actor.name} due to _skipIntegrityCheck flag`);
        }
      }

      // ========================================
      // PHASE 5: Recomputation complete
      // ========================================
      const recomputeEnd = performance.now();
      const duration = (recomputeEnd - recomputeStart).toFixed(2);
      if (observabilityEnabled) {
        SWSELogger.debug(`[RECOMPUTE END] ${actor.name} — Pipeline completed`, {
          stage: 'complete',
          durationMs: duration,
          enforceLevel: enforcementLevel,
          timestamp: new Date().toISOString()
        });
      }
    } catch (err) {
      const recomputeEnd = performance.now();
      const duration = (recomputeEnd - recomputeStart).toFixed(2);
      SWSELogger.error(`[RECOMPUTE FAILED] ${actor.name} — Pipeline error after ${duration}ms:`, err);
      throw err; // Re-throw in strict mode
    }
  }

export function validateDerivedWriteAuthority(engine, changes, actor, options = {}) {
    const derivedPaths = [];

    const checkObject = (obj, prefix = '') => {
      if (!obj || typeof obj !== 'object') return;
      for (const [key, value] of Object.entries(obj)) {
        const path = prefix ? `${prefix}.${key}` : key;
        if (path.startsWith('system.derived.')) {
          derivedPaths.push(path);
        }
        if (typeof value === 'object' && value !== null) {
          checkObject(value, path);
        }
      }
    };

    checkObject(changes);

    // Enforce derived write authority
    if (derivedPaths.length > 0 &&
        !actor._isDerivedCalcCycle &&
        !options.isDerivedCalculatorCall) {
      const violationList = derivedPaths.slice(0, 5).join(', ');
      const enforcementLevel = MutationInterceptor.getEnforcementLevel();
      const message = (
        `[SSOT VIOLATION] Attempted direct write to derived paths: ${violationList}${derivedPaths.length > 5 ? '...' : ''}\n` +
        `Only DerivedCalculator may write system.derived.*\n` +
        `Caller: ${new Error().stack.split('\n')[2]}`
      );

      if (enforcementLevel === 'strict') {
        // PHASE 3: Hard enforcement in strict mode
        throw new Error(message);
      } else {
        // PHASE 3: Warning-only in normal/log-only mode
        SWSELogger.warn(message);
      }
    }
  }

export async function checkIntegrity(engine, actor) {
    try {
      const report = await PrerequisiteIntegrityChecker.evaluate(actor);
      if (Object.keys(report.violations).length > 0) {
        SWSELogger.warn(`[INTEGRITY] Prerequisite violations detected for ${actor.name}:`, report.violations);
      }
    } catch (err) {
      SWSELogger.error('[INTEGRITY] Failed to check prerequisites:', err);
      // Don't throw — integrity check failure shouldn't block gameplay
    }
  }

export function detectUpdateLoop(engine, actor, source) {
    const key = actor.id;
    const now = performance.now();

    if (!engine._updateStack.has(key)) {
      engine._updateStack.set(key, { count: 0, timestamp: now, sources: [] });
    }

    const state = engine._updateStack.get(key);

    // Reset if > 50ms has passed (new mutation cycle)
    if (now - state.timestamp > 50) {
      state.count = 0;
      state.sources = [];
      state.timestamp = now;
    }

    state.count++;
    state.sources.push(source);

    // WARN if same actor updated >5 times in 50ms
    if (state.count > 5 && globalThis.SWSE?.SentinelEngine) {
      globalThis.SWSE.SentinelEngine.report('actor-update-loop',
        globalThis.SWSE.SentinelEngine.SEVERITY?.WARN ?? 'warn',
        `Possible update loop: ${actor.name} updated ${state.count}x in 50ms`,
        {
          actorId: actor.id,
          actorName: actor.name,
          count: state.count,
          sources: state.sources
        }
      );
    }
  }
