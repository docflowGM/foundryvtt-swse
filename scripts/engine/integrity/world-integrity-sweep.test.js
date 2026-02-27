/**
 * PHASE 5C-1: World Integrity Sweep Unit Tests
 */

import { WorldIntegritySweep } from './world-integrity-sweep.js';

function createMockActor(name, violations = []) {
  return {
    id: `actor-${name.toLowerCase()}`,
    name: name,
    type: 'character',
    system: {
      missingPrerequisites: Object.fromEntries(
        violations.map((v, i) => [
          `item-${i}`,
          {
            itemId: `item-${i}`,
            itemName: v.name,
            severity: v.severity || 'warning',
            missingPrereqs: v.missingPrereqs || [],
            blockingReasons: v.blockingReasons || []
          }
        ])
      )
    }
  };
}

function createMockGameActors(actors) {
  return {
    contents: actors,
    get: (id) => actors.find(a => a.id === id)
  };
}

export class WorldIntegritySweepTests {
  static run() {
    console.log('[TESTS] Running WorldIntegritySweep unit tests...\n');

    this._testEmptySweep();
    this._testSingleActorScan();
    this._testMultipleActorsScan();
    this._testSeverityAggregation();
    this._testExport();

    console.log('[TESTS] ✅ All WorldIntegritySweep tests completed.\n');
  }

  static async _testEmptySweep() {
    console.log('TEST 1: Empty World Sweep');

    // Mock empty world
    const originalActors = globalThis.game?.actors;
    globalThis.game = { actors: { contents: [] } };

    try {
      const report = await WorldIntegritySweep.run();

      console.assert(report.actorsScanned === 0, 'FAILED: Should scan 0 actors');
      console.assert(report.actorsWithViolations === 0, 'FAILED: Should have 0 violations');
      console.assert(report.summary.totalViolations === 0, 'FAILED: Total violations 0');

      console.log('  ✓ Empty sweep handled correctly\n');
    } finally {
      globalThis.game.actors = originalActors;
    }
  }

  static async _testSingleActorScan() {
    console.log('TEST 2: Single Actor Scan');

    const actor = createMockActor('Test Actor', [
      { name: 'Item 1', severity: 'warning', missingPrereqs: ['Prereq A'] }
    ]);

    const originalActors = globalThis.game?.actors;
    globalThis.game = { actors: createMockGameActors([actor]) };

    try {
      const report = await WorldIntegritySweep.run({ verbose: false });

      console.assert(report.actorsScanned === 1, 'FAILED: Should scan 1 actor');
      console.assert(report.actorsWithViolations === 1, 'FAILED: Should have 1 actor with violations');
      console.assert(report.summary.totalViolations === 1, 'FAILED: Total violations 1');

      console.log('  ✓ Single actor scanned correctly\n');
    } finally {
      globalThis.game.actors = originalActors;
    }
  }

  static async _testMultipleActorsScan() {
    console.log('TEST 3: Multiple Actors Scan');

    const actors = [
      createMockActor('Actor 1', [
        { name: 'Item A', severity: 'warning' }
      ]),
      createMockActor('Actor 2', [
        { name: 'Item B', severity: 'error' },
        { name: 'Item C', severity: 'error' }
      ]),
      createMockActor('Actor 3', []) // No violations
    ];

    const originalActors = globalThis.game?.actors;
    globalThis.game = { actors: createMockGameActors(actors) };

    try {
      const report = await WorldIntegritySweep.run({ verbose: false });

      console.assert(report.actorsScanned === 3, 'FAILED: Should scan 3 actors');
      console.assert(report.actorsWithViolations === 2, 'FAILED: Should have 2 actors with violations');
      console.assert(report.summary.totalViolations === 3, 'FAILED: Total violations 3');

      console.log('  ✓ Multiple actors scanned correctly\n');
    } finally {
      globalThis.game.actors = originalActors;
    }
  }

  static async _testSeverityAggregation() {
    console.log('TEST 4: Severity Aggregation');

    const actor = createMockActor('Test', [
      { name: 'W1', severity: 'warning' },
      { name: 'W2', severity: 'warning' },
      { name: 'E1', severity: 'error' },
      { name: 'S1', severity: 'structural' }
    ]);

    const originalActors = globalThis.game?.actors;
    globalThis.game = { actors: createMockGameActors([actor]) };

    try {
      const report = await WorldIntegritySweep.run({ verbose: false });

      const summary = report.summary;
      console.assert(summary.totalWarning === 2, 'FAILED: Warning count');
      console.assert(summary.totalError === 1, 'FAILED: Error count');
      console.assert(summary.totalStructural === 1, 'FAILED: Structural count');

      console.log('  ✓ Severity aggregation correct\n');
    } finally {
      globalThis.game.actors = originalActors;
    }
  }

  static _testExport() {
    console.log('TEST 5: Report Export');

    const report = {
      actorCount: 10,
      actorsScanned: 10,
      actorsWithViolations: 3,
      violations: [
        { actorName: 'A1', violationCount: 5 },
        { actorName: 'A2', violationCount: 3 }
      ],
      summary: {
        totalViolations: 8,
        totalStructural: 1,
        totalError: 4,
        totalWarning: 3,
        violationsByType: { character: 8 }
      },
      timestamp: Date.now(),
      elapsedMs: 100
    };

    const exported = WorldIntegritySweep.exportReport(report);

    console.assert(exported.timestamp !== null, 'FAILED: Timestamp in export');
    console.assert(exported.summary !== null, 'FAILED: Summary in export');
    console.assert(typeof exported.elapsedMs === 'string' || typeof exported.elapsedMs === 'number',
      'FAILED: ElapsedMs in export');

    console.log('  ✓ Report exported correctly\n');
  }
}

// Auto-run tests in dev mode
if (typeof globalThis !== 'undefined' && globalThis.SWSE_DEV_MODE) {
  console.log('🧪 [DEV MODE] Running WorldIntegritySweep tests on load...\n');
  WorldIntegritySweepTests.run();
}
