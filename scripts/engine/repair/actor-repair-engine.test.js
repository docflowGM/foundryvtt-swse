/**
 * PHASE 5C-3: Actor Repair Engine Unit Tests
 */

import { ActorRepairEngine } from './actor-repair-engine.js';

function createMockActor(name, violations = []) {
  return {
    id: `actor-${name.toLowerCase()}`,
    name: name,
    type: 'character',
    system: {
      class: 'Jedi',
      missingPrerequisites: Object.fromEntries(
        violations.map((v, i) => [
          `item-${i}`,
          {
            itemId: `item-${i}`,
            itemName: v.name,
            severity: v.severity || 'warning',
            missingPrereqs: v.missingPrereqs || [],
            blockingReasons: v.blockingReasons || [],
            permanentlyBlocked: v.permanentlyBlocked || false
          }
        ])
      )
    },
    items: []
  };
}

export class ActorRepairEngineTests {
  static run() {
    console.log('[TESTS] Running ActorRepairEngine unit tests...\n');

    this._testEmptyAnalysis();
    this._testCompliantActor();
    this._testStructuralViolation();
    this._testMissingPrerequisites();
    this._testExport();

    console.log('[TESTS] ✅ All ActorRepairEngine tests completed.\n');
  }

  static _testEmptyAnalysis() {
    console.log('TEST 1: Empty Analysis');

    const analysis = ActorRepairEngine._emptyAnalysis();

    console.assert(analysis.violations !== null, 'FAILED: Violations array');
    console.assert(analysis.proposals !== null, 'FAILED: Proposals array');
    console.assert(analysis.summary !== null, 'FAILED: Summary object');

    console.log('  ✓ Empty analysis structure valid\n');
  }

  static _testCompliantActor() {
    console.log('TEST 2: Compliant Actor');

    const actor = createMockActor('Clean Actor', []);
    const analysis = ActorRepairEngine.analyze(actor);

    console.assert(analysis.violations.length === 0, 'FAILED: Should have no violations');
    console.assert(analysis.proposals.length === 0, 'FAILED: Should have no proposals');
    console.assert(analysis.summary.totalViolations === 0, 'FAILED: Total violations 0');

    console.log('  ✓ Compliant actor analyzed correctly\n');
  }

  static _testStructuralViolation() {
    console.log('TEST 3: Structural Violations');

    const actor = createMockActor('Broken Actor', [
      {
        name: 'Incompatible Item',
        severity: 'structural',
        permanentlyBlocked: true
      }
    ]);

    const analysis = ActorRepairEngine.analyze(actor);

    console.assert(analysis.violations.length === 1, 'FAILED: Should have 1 violation');
    console.assert(analysis.proposals.length > 0, 'FAILED: Should propose removal');
    console.assert(analysis.proposals[0].type === 'removeItem', 'FAILED: Should propose remove');

    console.log('  ✓ Structural violations analyzed\n');
  }

  static _testMissingPrerequisites() {
    console.log('TEST 4: Missing Prerequisites');

    const actor = createMockActor('Incomplete Actor', [
      {
        name: 'Advanced Feat',
        severity: 'error',
        missingPrereqs: ['Basic Feat', 'Skill Rank']
      }
    ]);

    const analysis = ActorRepairEngine.analyze(actor);

    console.assert(analysis.violations.length === 1, 'FAILED: Should have 1 violation');
    console.assert(analysis.violations[0].missingPrereqs.length === 2, 'FAILED: Should have 2 missing');
    console.assert(analysis.summary.totalViolations === 1, 'FAILED: Total violations 1');

    console.log('  ✓ Missing prerequisites analyzed\n');
  }

  static _testExport() {
    console.log('TEST 5: Analysis Export');

    const actor = createMockActor('Test', [
      { name: 'Item A', severity: 'warning' }
    ]);

    const analysis = ActorRepairEngine.analyze(actor);
    const exported = ActorRepairEngine.exportAnalysis(analysis);

    console.assert(exported.timestamp !== null, 'FAILED: Timestamp in export');
    console.assert(exported.actor !== null, 'FAILED: Actor in export');
    console.assert(exported.violations !== null, 'FAILED: Violations in export');
    console.assert(exported.proposals !== null, 'FAILED: Proposals in export');

    console.log('  ✓ Analysis exported correctly\n');
  }
}

// Auto-run tests in dev mode
if (typeof globalThis !== 'undefined' && globalThis.SWSE_DEV_MODE) {
  console.log('🧪 [DEV MODE] Running ActorRepairEngine tests on load...\n');
  ActorRepairEngineTests.run();
}
