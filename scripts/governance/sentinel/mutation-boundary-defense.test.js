/**
 * PHASE 5B-6: Mutation Boundary Defense Unit Tests
 */

import { MutationBoundaryDefense } from './mutation-boundary-defense.js';

export class MutationBoundaryDefenseTests {
  static run() {
    console.log('[TESTS] Running MutationBoundaryDefense unit tests...\n');

    this._testInitialization();
    this._testStatusReporting();
    this._testCallerExtraction();

    console.log('[TESTS] ✅ All MutationBoundaryDefense tests completed.\n');
  }

  static _testInitialization() {
    console.log('TEST 1: Defense Initialization');

    MutationBoundaryDefense.initialize({
      blockUnauthorizedMutations: false,
      logStackTraces: true,
      warnOnMacroMutations: true
    });

    console.assert(
      MutationBoundaryDefense.config !== null,
      'FAILED: Config should be set'
    );
    console.assert(
      MutationBoundaryDefense.config.blockUnauthorizedMutations === false,
      'FAILED: Block setting should be respected'
    );

    console.log('  ✓ Defense initialized with config\n');
  }

  static _testStatusReporting() {
    console.log('TEST 2: Status Reporting');

    const status = MutationBoundaryDefense.getStatus();

    console.assert(status.initialized === true, 'FAILED: Should be initialized');
    console.assert(typeof status.blockUnauthorized === 'boolean', 'FAILED: Block status');
    console.assert(typeof status.logStackTraces === 'boolean', 'FAILED: Log traces status');
    console.assert(typeof status.mode === 'string', 'FAILED: Mode status');

    console.log('  ✓ Status reported correctly\n');
  }

  static _testCallerExtraction() {
    console.log('TEST 3: Caller Extraction');

    const stack = `Error: Test
    at Object.updateActor (actor-engine.js:100)
    at Macro.execute (macro.js:50)
    at Hooks.callAll (hooks.js:20)`;

    const caller = MutationBoundaryDefense._extractCaller(stack);

    console.assert(
      typeof caller === 'string',
      'FAILED: Caller should be string'
    );
    console.assert(
      caller.length > 0,
      'FAILED: Caller should not be empty'
    );

    console.log('  ✓ Caller extracted from stack\n');
  }
}

// Auto-run tests in dev mode
if (typeof globalThis !== 'undefined' && globalThis.SWSE_DEV_MODE) {
  console.log('🧪 [DEV MODE] Running MutationBoundaryDefense tests on load...\n');
  MutationBoundaryDefenseTests.run();
}
