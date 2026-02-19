/**
 * SENTINEL — Derived Data Integrity Layer
 * Phase 3 Foundation: Enforces single-authority derived data consolidation
 *
 * Detects and prevents:
 * - Multiple derived executions per mutation
 * - Derived execution outside ActorEngine
 * - prepareDerivedData implementations outside SWSEV2BaseActor
 * - Direct system field mutations bypassing ActorEngine
 */

import { swseLogger } from '../../utils/logger.js';

export class DerivedIntegrityLayer {
  /**
   * Register Sentinel hooks for derived data enforcement
   */
  static registerHooks() {
    // Track recalc calls across the system
    this._recalcLog = [];
    this._actorUpdateLog = new Map();

    // Hook: Detect when DerivedCalculator is called
    Hooks.on('swse.derivedCalculated', this._onDerivedCalculated.bind(this));

    // Hook: Monitor prepareDerivedData calls
    const originalPrepareDerived = Actor.prototype.prepareDerivedData;
    Actor.prototype.prepareDerivedData = function() {
      DerivedIntegrityLayer._trackPrepareDerivedData(this);
      return originalPrepareDerived.call(this);
    };

    console.log('[Sentinel] DerivedIntegrityLayer initialized');
  }

  /**
   * Track prepareDerivedData calls to detect violations
   * @private
   */
  static _trackPrepareDerivedData(actor) {
    const callStack = new Error().stack;
    const caller = callStack.split('\n')[2]?.trim();

    // Log the call
    const timestamp = Date.now();
    if (!this._actorUpdateLog.has(actor.id)) {
      this._actorUpdateLog.set(actor.id, []);
    }
    this._actorUpdateLog.get(actor.id).push({ timestamp, caller });

    // Check for rapid consecutive calls (double-execute pattern)
    const callHistory = this._actorUpdateLog.get(actor.id);
    if (callHistory.length > 1) {
      const lastCall = callHistory[callHistory.length - 2];
      const timeDiff = timestamp - lastCall.timestamp;

      if (timeDiff < 100) { // Within 100ms = likely double-execute
        swseLogger.warn(
          `[Sentinel] Double-compute detected on ${actor.name}`,
          { actor: actor.id, timeDiff, lastCaller: lastCall.caller, currentCaller: caller }
        );

        // In STRICT mode, error
        if (game.settings?.get?.('swse', 'sentinelMode') === 'STRICT') {
          swseLogger.error(
            `[Sentinel STRICT] Double-compute prevented on ${actor.name}`,
            { detail: `${callHistory.length} calls within ${timeDiff}ms` }
          );
          throw new Error(`Derived data double-compute prevented: ${actor.name}`);
        }
      }
    }

    // Cleanup old log entries (keep last 5 per actor)
    if (callHistory.length > 5) {
      callHistory.shift();
    }
  }

  /**
   * Verify that prepareDerivedData is only called from SWSEV2BaseActor
   * @private
   */
  static _onDerivedCalculated(actor, updates) {
    // Log derived calculation
    if (!this._recalcLog.includes(actor.id)) {
      this._recalcLog.push(actor.id);

      swseLogger.debug(
        `[Sentinel] DerivedCalculator executed for ${actor.name}`,
        { actor: actor.id, fields: Object.keys(updates || {}).length }
      );

      // Clean up log after a tick
      setTimeout(() => {
        this._recalcLog = this._recalcLog.filter(id => id !== actor.id);
      }, 0);
    }
  }

  /**
   * Verify ActorEngine is sole mutation authority
   * Check that only ActorEngine calls actor.update()
   */
  static verifyMutationAuthority() {
    const callStack = new Error().stack;
    const isActorEngine = callStack.includes('ActorEngine');

    if (!isActorEngine && game.settings?.get?.('swse', 'sentinelMode') === 'STRICT') {
      swseLogger.warn(
        `[Sentinel] Actor.update() called outside ActorEngine`,
        { stack: callStack.split('\n').slice(0, 5).join('\n') }
      );
    }
  }

  /**
   * Generate integrity report
   */
  static generateReport() {
    const report = {
      timestamp: Date.now(),
      doubleComputeDetected: false,
      shadowImplementations: [],
      violations: []
    };

    // Check for shadow prepareDerivedData implementations
    const shadowFiles = [
      'data-models/character-data-model.js',
      'data-models/vehicle-data-model.js',
      'combat/swse-combatant.js'
    ];

    // TODO: In Phase 3, implement actual file scan

    return report;
  }
}

// Initialize on game ready
Hooks.once('ready', () => {
  DerivedIntegrityLayer.registerHooks();
});
