/**
 * PHASE 5: Governance Diagnostics & Runtime Verification
 *
 * Sentinel helper for verifying governance compliance at runtime.
 * Provides observational checks and diagnostics without enforcement.
 *
 * Used in dev/test to catch governance violations early:
 * - Helper routing verification
 * - Authorization path verification
 * - Mutation origin tracking
 * - Bypass pattern detection
 */

import { SWSELogger } from '/systems/foundryvtt-swse/scripts/core/logger.js';
import { MutationInterceptor } from '/systems/foundryvtt-swse/scripts/governance/mutation/MutationInterceptor.js';

/**
 * Runtime diagnostics for governance compliance
 *
 * @governance DIAGNOSTIC_OBSERVATIONAL
 * @authority None (read-only, no enforcement)
 */
export class GovernanceDiagnostics {
  /**
   * Verify helper routing to ActorEngine
   *
   * Call this in tests to verify helpers route correctly:
   * ```
   * const spy = jest.spyOn(ActorEngine, 'updateActor');
   * await actor.spendForcePoint(...);
   * GovernanceDiagnostics.verifyActorEngineRouting(spy, actor);
   * ```
   *
   * @param {jest.SpyInstance} spy - Jest spy on ActorEngine method
   * @param {Actor} actor - Actor that was mutated
   * @param {string} [description] - Test description
   * @returns {boolean} True if routed correctly
   */
  static verifyActorEngineRouting(spy, actor, description = 'Helper') {
    if (!spy.mock.calls.length) {
      console.warn(`❌ ${description}: ActorEngine not called`);
      return false;
    }

    const lastCall = spy.mock.calls[spy.mock.calls.length - 1];
    const callActor = lastCall[0];

    if (callActor.id === actor.id) {
      console.log(`✅ ${description}: Correctly routed through ActorEngine`);
      return true;
    } else {
      console.warn(`❌ ${description}: Routed to wrong actor`);
      return false;
    }
  }

  /**
   * Verify no fallback patterns in helper code
   *
   * Scans source code for try/catch fallback patterns:
   * ```
   * try { ActorEngine... }
   * catch { actor.update(...) }  // ← FALLBACK DETECTED
   * ```
   *
   * @param {string} functionSource - Function source code (via toString())
   * @param {string} helperName - Name of helper for logging
   * @returns {boolean} True if no fallback found
   */
  static verifyNoFallbackPattern(functionSource, helperName = 'Helper') {
    const hasTryCatch = /try\s*\{[\s\S]*?await\s+ActorEngine[\s\S]*?\}\s*catch\s*\{[\s\S]*?await\s+(this\.)?update/i.test(functionSource);

    if (hasTryCatch) {
      console.warn(`❌ ${helperName}: Try/catch fallback pattern detected`);
      return false;
    } else {
      console.log(`✅ ${helperName}: No fallback pattern found`);
      return true;
    }
  }

  /**
   * Verify mutation context is set during ActorEngine call
   *
   * Use in tests to verify MutationInterceptor context is active:
   * ```
   * const contextSpy = jest.spyOn(MutationInterceptor, 'setContext');
   * await ActorEngine.updateActor(actor, {...});
   * GovernanceDiagnostics.verifyMutationContext(contextSpy);
   * ```
   *
   * @param {jest.SpyInstance} contextSpy - Spy on MutationInterceptor.setContext()
   * @returns {boolean} True if context was set
   */
  static verifyMutationContext(contextSpy) {
    const setCalls = contextSpy.mock.calls.filter(call => call[0] && !call[0].includes('clear'));

    if (setCalls.length > 0) {
      console.log(`✅ Mutation context set: ${setCalls[0][0]}`);
      return true;
    } else {
      console.warn(`❌ Mutation context not set`);
      return false;
    }
  }

  /**
   * Verify mutation triggers recomputation
   *
   * Check that recalcAll() is called after mutation:
   * ```
   * const recalcSpy = jest.spyOn(actor, 'recalcAll');
   * await ActorEngine.updateActor(actor, {...});
   * GovernanceDiagnostics.verifyRecomputation(recalcSpy);
   * ```
   *
   * @param {jest.SpyInstance} recalcSpy - Spy on recalcAll()
   * @returns {boolean} True if recompute was called
   */
  static verifyRecomputation(recalcSpy) {
    if (recalcSpy.mock.calls.length > 0) {
      console.log(`✅ Recomputation triggered (${recalcSpy.mock.calls.length} calls)`);
      return true;
    } else {
      console.warn(`❌ Recomputation not triggered`);
      return false;
    }
  }

  /**
   * Verify STRICT mode enforcement
   *
   * Test that unauthorized mutations throw in STRICT mode:
   * ```
   * MutationInterceptor.setEnforcementLevel('STRICT');
   * GovernanceDiagnostics.expectUnauthorizedThrow(
   *   () => actor.update({...}),  // Should throw
   *   'Direct mutation without context'
   * );
   * ```
   *
   * @param {Function} fn - Async function to call
   * @param {string} description - What this test verifies
   * @returns {Promise<boolean>} True if threw as expected
   */
  static async expectUnauthorizedThrow(fn, description = 'Test') {
    try {
      await fn();
      console.warn(`❌ ${description}: Should have thrown but didn't`);
      return false;
    } catch (err) {
      if (err.message.includes('Unauthorized') || err.message.includes('mutation')) {
        console.log(`✅ ${description}: Correctly threw on unauthorized mutation`);
        return true;
      } else {
        console.warn(`⚠️  ${description}: Threw but with unexpected error: ${err.message}`);
        return false;
      }
    }
  }

  /**
   * Verify NORMAL mode logging (no throw)
   *
   * Test that unauthorized mutations log but don't throw:
   * ```
   * MutationInterceptor.setEnforcementLevel('NORMAL');
   * const logSpy = jest.spyOn(SWSELogger, 'warn');
   * const result = await actor.update({...});  // Should succeed
   * GovernanceDiagnostics.verifyNormalModeLogging(logSpy);
   * ```
   *
   * @param {jest.SpyInstance} logSpy - Spy on SWSELogger.warn()
   * @returns {boolean} True if logged warning
   */
  static verifyNormalModeLogging(logSpy) {
    const violations = logSpy.mock.calls.filter(call =>
      call[0]?.includes?.('Unauthorized') || call[0]?.includes?.('mutation')
    );

    if (violations.length > 0) {
      console.log(`✅ NORMAL mode: Logged ${violations.length} unauthorized mutation(s)`);
      return true;
    } else {
      console.warn(`⚠️  NORMAL mode: No warnings logged (expected at least one)`);
      return false;
    }
  }

  /**
   * Generate governance compliance report
   *
   * Comprehensive verification of all governance properties:
   * ```
   * const report = GovernanceDiagnostics.generateComplianceReport(actor);
   * console.log(report);
   * ```
   *
   * @param {Actor} actor - Actor to verify
   * @returns {Object} Compliance report
   */
  static generateComplianceReport(actor) {
    return {
      actor: actor.name,
      timestamp: new Date().toISOString(),
      enforcement: {
        level: MutationInterceptor.getEnforcementLevel?.(),
        isStrict: MutationInterceptor.getEnforcementLevel?.() === 'STRICT',
        isNormal: MutationInterceptor.getEnforcementLevel?.() === 'NORMAL'
      },
      mutations: {
        totalAttempts: actor._mutationCount ?? 0,
        lastMutation: actor._lastMutationTime ?? null,
        lastContext: actor._lastMutationContext ?? null
      },
      derived: {
        hasProtectedFields: !!actor.system?.derived,
        hpMaxProtected: !!actor.system?.hp?.max,
        lastRecompute: actor._lastRecomputeTime ?? null
      },
      integrity: {
        lastValidation: actor._lastIntegrityCheck ?? null,
        violations: actor._integrityViolations ?? []
      }
    };
  }

  /**
   * Verify all governance guardrails are in place
   *
   * Comprehensive check of enforcement infrastructure:
   * ```
   * const allOK = GovernanceDiagnostics.verifyGuardrails();
   * console.log(allOK ? '✅ All guardrails active' : '❌ Missing guardrails');
   * ```
   *
   * @returns {Object} Guardrail verification results
   */
  static verifyGuardrails() {
    const results = {
      mutationInterceptor: typeof MutationInterceptor?.setContext === 'function',
      enforcementLevel: MutationInterceptor.getEnforcementLevel?.() !== null,
      actorEngineAvailable: typeof ActorEngine !== 'undefined',
      loggerAvailable: typeof SWSELogger !== 'undefined',
      timestamp: new Date().toISOString()
    };

    const allOK = Object.values(results).every(v => v === true);
    console.log(allOK
      ? '✅ All governance guardrails active'
      : '❌ Some guardrails missing'
    );

    return {
      ...results,
      allActive: allOK
    };
  }

  /**
   * Create a governance test fixture
   *
   * Helper for creating test actors with controlled mutations:
   * ```
   * const actor = GovernanceDiagnostics.createTestFixture({
   *   type: 'character',
   *   forcePoints: {value: 10, max: 20}
   * });
   * // actor is ready for governance testing
   * ```
   *
   * @param {Object} overrides - Property overrides
   * @returns {Actor} Test actor
   */
  static createTestFixture(overrides = {}) {
    // Mock actor for testing
    return {
      id: 'test-' + Math.random(),
      name: 'Test Actor',
      type: overrides.type || 'character',
      system: {
        level: 1,
        forcePoints: {value: 10, max: 20},
        destinyPoints: {value: 3},
        derived: {},
        ...overrides
      },
      isOwner: true,
      items: {
        contents: []
      },
      _mutationCount: 0,
      _lastMutationTime: null,
      _lastMutationContext: null,
      _lastRecomputeTime: null,
      _lastIntegrityCheck: null,
      _integrityViolations: []
    };
  }
}

/**
 * Test utility: Assert governance compliance
 *
 * Use in test suites:
 * ```
 * import { assertGovernanceCompliance } from 'governance-diagnostics.js';
 *
 * describe('Helper Compliance', () => {
 *   it('should route through ActorEngine', async () => {
 *     assertGovernanceCompliance.helperRoutesCorrectly(spy, actor, 'spendForcePoint');
 *   });
 * });
 * ```
 *
 * @governance DIAGNOSTIC_TESTING
 * @authority None (test utilities only)
 */
export const assertGovernanceCompliance = {
  /**
   * Assert helper routes through ActorEngine
   *
   * @param {jest.SpyInstance} spy
   * @param {Actor} actor
   * @param {string} helperName
   * @throws {AssertionError} If not routed correctly
   */
  helperRoutesCorrectly(spy, actor, helperName) {
    if (!GovernanceDiagnostics.verifyActorEngineRouting(spy, actor, helperName)) {
      throw new Error(`${helperName} did not route through ActorEngine`);
    }
  },

  /**
   * Assert mutation caused recomputation
   *
   * @param {jest.SpyInstance} recalcSpy
   * @throws {AssertionError} If not recomputed
   */
  mutationTriggeredRecomputation(recalcSpy) {
    if (!GovernanceDiagnostics.verifyRecomputation(recalcSpy)) {
      throw new Error('Mutation did not trigger recomputation');
    }
  },

  /**
   * Assert STRICT mode enforcement
   *
   * @param {Function} fn
   * @throws {AssertionError} If not enforced
   */
  async strictModeEnforced(fn) {
    if (!await GovernanceDiagnostics.expectUnauthorizedThrow(fn)) {
      throw new Error('STRICT mode did not enforce mutation');
    }
  },

  /**
   * Assert no fallback pattern
   *
   * @param {string} source
   * @param {string} name
   * @throws {AssertionError} If fallback found
   */
  noFallbackPattern(source, name) {
    if (!GovernanceDiagnostics.verifyNoFallbackPattern(source, name)) {
      throw new Error(`${name} contains fallback pattern`);
    }
  }
};

export default GovernanceDiagnostics;
