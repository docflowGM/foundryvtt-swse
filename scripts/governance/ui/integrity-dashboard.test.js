/**
 * PHASE 5B-4: Integrity Dashboard Unit Tests
 */

import { IntegrityDashboard } from './integrity-dashboard.js';

function createMockActor(name = 'Test', violations = []) {
  return {
    id: `actor-${name.toLowerCase()}`,
    name: name,
    type: 'character',
    system: {
      governance: {
        enforcementMode: 'normal',
        visibilityMode: 'banner',
        approvedBy: null,
        reason: null
      },
      missingPrerequisites: Object.fromEntries(
        violations.map((v, i) => [
          `item-${i}`,
          {
            itemId: `item-${i}`,
            itemName: v.name,
            itemType: v.type,
            missingPrereqs: v.missingPrereqs || [],
            severity: v.severity || 'warning'
          }
        ])
      )
    }
  };
}

export class IntegrityDashboardTests {
  static run() {
    console.log('[TESTS] Running IntegrityDashboard unit tests...\n');

    this._testEmptyState();
    this._testCompliantActor();
    this._testViolatedActor();
    this._testSeverityBreakdown();
    this._testRecommendations();
    this._testExport();

    console.log('[TESTS] ✅ All IntegrityDashboard tests completed.\n');
  }

  static _testEmptyState() {
    console.log('TEST 1: Empty State');

    const state = IntegrityDashboard._emptyState();

    console.assert(state.actor !== null, 'FAILED: Actor should exist');
    console.assert(state.compliance !== null, 'FAILED: Compliance should exist');
    console.assert(Array.isArray(state.violations), 'FAILED: Violations should be array');

    console.log('  ✓ Empty state structure valid\n');
  }

  static _testCompliantActor() {
    console.log('TEST 2: Compliant Actor (No Violations)');

    const actor = createMockActor('Compliant Character', []);
    const state = IntegrityDashboard.getState(actor);

    console.assert(state.actor.name === 'Compliant Character', 'FAILED: Actor name');
    console.assert(state.compliance.isCompliant === true, 'FAILED: Should be compliant');
    console.assert(state.compliance.totalViolations === 0, 'FAILED: Should have no violations');

    console.log('  ✓ Compliant actor state correct\n');
  }

  static _testViolatedActor() {
    console.log('TEST 3: Violated Actor');

    const violations = [
      { name: 'Combat Feat', type: 'feat', severity: 'warning', missingPrereqs: ['Base Attack Bonus'] }
    ];
    const actor = createMockActor('Violated Character', violations);
    const state = IntegrityDashboard.getState(actor);

    console.assert(state.compliance.isCompliant === false, 'FAILED: Should not be compliant');
    console.assert(state.compliance.totalViolations > 0, 'FAILED: Should have violations');

    console.log('  ✓ Violated actor state correct\n');
  }

  static _testSeverityBreakdown() {
    console.log('TEST 4: Severity Breakdown');

    const violations = [
      { name: 'Item 1', type: 'feat', severity: 'warning', missingPrereqs: ['Prereq'] },
      { name: 'Item 2', type: 'feat', severity: 'error', missingPrereqs: ['A', 'B', 'C'] }
    ];
    const actor = createMockActor('Mixed Violations', violations);
    const state = IntegrityDashboard.getState(actor);

    console.assert(state.severity.overall !== null, 'FAILED: Overall severity');
    console.assert(typeof state.severity.structural === 'number', 'FAILED: Structural count');
    console.assert(typeof state.severity.error === 'number', 'FAILED: Error count');
    console.assert(typeof state.severity.warning === 'number', 'FAILED: Warning count');

    console.log('  ✓ Severity breakdown tracked\n');
  }

  static _testRecommendations() {
    console.log('TEST 5: Recommendations');

    const violations = [
      { name: 'Incompatible Item', type: 'feat', severity: 'structural', permanentlyBlocked: true }
    ];
    const actor = createMockActor('Broken Build', violations);
    const state = IntegrityDashboard.getState(actor);

    console.assert(Array.isArray(state.recommendations), 'FAILED: Recommendations should be array');
    console.assert(state.recommendations.length > 0, 'FAILED: Should have recommendations');

    console.log('  ✓ Recommendations generated\n');
  }

  static _testExport() {
    console.log('TEST 6: State Export');

    const actor = createMockActor('Export Test');
    const exported = IntegrityDashboard.exportState(actor);

    console.assert(exported.actor !== null, 'FAILED: Actor in export');
    console.assert(exported.compliance !== null, 'FAILED: Compliance in export');
    console.assert(typeof exported.exportedAt === 'string', 'FAILED: Timestamp in export');

    console.log('  ✓ State export structure valid\n');
  }
}

// Auto-run tests in dev mode
if (typeof globalThis !== 'undefined' && globalThis.SWSE_DEV_MODE) {
  console.log('🧪 [DEV MODE] Running IntegrityDashboard tests on load...\n');
  IntegrityDashboardTests.run();
}
