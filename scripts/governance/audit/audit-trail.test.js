/**
 * PHASE 5B-5: Audit Trail Unit Tests
 */

import { AuditTrail } from './audit-trail.js';

function createMockActor(name = 'Test') {
  return {
    id: `actor-${name.toLowerCase()}`,
    name: name,
    type: 'character',
    system: { auditLog: [] }
  };
}

export class AuditTrailTests {
  static run() {
    console.log('[TESTS] Running AuditTrail unit tests...\n');

    this._testLogEvent();
    this._testViolationLogging();
    this._testGovernanceLogging();
    this._testTimeline();
    this._testSummary();

    console.log('[TESTS] ✅ All AuditTrail tests completed.\n');
  }

  static _testLogEvent() {
    console.log('TEST 1: Log Event');

    const actor = createMockActor('Logger');
    const entry = AuditTrail.logEvent(actor, 'test-event', { detail: 'value' });

    console.assert(entry !== null, 'FAILED: Entry should be returned');
    console.assert(entry.eventType === 'test-event', 'FAILED: Event type mismatch');
    console.assert(actor.system.auditLog.length === 1, 'FAILED: Entry should be logged');

    console.log('  ✓ Event logged successfully\n');
  }

  static _testViolationLogging() {
    console.log('TEST 2: Violation Logging');

    const actor = createMockActor('Violation Logger');

    const violation = {
      itemId: 'item-001',
      itemName: 'Combat Feat',
      itemType: 'feat',
      severity: 'warning',
      missingPrereqs: ['Base Attack Bonus'],
      permanentlyBlocked: false
    };

    AuditTrail.logViolationDetected(actor, violation);
    AuditTrail.logViolationResolved(actor, violation);

    console.assert(
      actor.system.auditLog.length === 2,
      'FAILED: Both events should be logged'
    );
    console.assert(
      actor.system.auditLog[0].eventType === 'violation-detected',
      'FAILED: First should be detected'
    );
    console.assert(
      actor.system.auditLog[1].eventType === 'violation-resolved',
      'FAILED: Second should be resolved'
    );

    console.log('  ✓ Violations logged\n');
  }

  static _testGovernanceLogging() {
    console.log('TEST 3: Governance Logging');

    const actor = createMockActor('Governance Logger');

    AuditTrail.logGovernanceModeChange(actor, 'normal', 'override', 'Test override');
    AuditTrail.logFreeBuildActivation(actor, 'Test free build');

    console.assert(
      actor.system.auditLog.length === 2,
      'FAILED: Both events should be logged'
    );
    console.assert(
      actor.system.auditLog.some(e => e.eventType === 'governance-mode-changed'),
      'FAILED: Mode change should be logged'
    );
    console.assert(
      actor.system.auditLog.some(e => e.eventType === 'freebuild-activated'),
      'FAILED: Free build should be logged'
    );

    console.log('  ✓ Governance events logged\n');
  }

  static _testTimeline() {
    console.log('TEST 4: Timeline Filtering');

    const actor = createMockActor('Timeline');

    AuditTrail.logEvent(actor, 'violation-detected', {});
    AuditTrail.logEvent(actor, 'governance-mode-changed', {});
    AuditTrail.logEvent(actor, 'violation-detected', {});

    // Get all events
    const all = AuditTrail.getTimeline(actor);
    console.assert(all.length === 3, 'FAILED: Should have 3 events');

    // Filter by type
    const violations = AuditTrail.getTimeline(actor, { eventType: 'violation-detected' });
    console.assert(violations.length === 2, 'FAILED: Should have 2 violations');

    // Limit
    const limited = AuditTrail.getTimeline(actor, { limit: 1 });
    console.assert(limited.length === 1, 'FAILED: Should be limited to 1');

    console.log('  ✓ Timeline filtering works\n');
  }

  static _testSummary() {
    console.log('TEST 5: Summary Statistics');

    const actor = createMockActor('Summary');

    AuditTrail.logEvent(actor, 'violation-detected', {});
    AuditTrail.logEvent(actor, 'violation-resolved', {});
    AuditTrail.logEvent(actor, 'governance-mode-changed', {});

    const summary = AuditTrail.getSummary(actor);

    console.assert(summary.totalEvents === 3, 'FAILED: Total events count');
    console.assert(summary.violationsDetected === 1, 'FAILED: Detected count');
    console.assert(summary.violationsResolved === 1, 'FAILED: Resolved count');
    console.assert(summary.governanceModeChanges === 1, 'FAILED: Mode change count');
    console.assert(summary.lastEvent !== null, 'FAILED: Last event should exist');

    console.log('  ✓ Summary statistics correct\n');
  }
}

// Auto-run tests in dev mode
if (typeof globalThis !== 'undefined' && globalThis.SWSE_DEV_MODE) {
  console.log('🧪 [DEV MODE] Running AuditTrail tests on load...\n');
  AuditTrailTests.run();
}
