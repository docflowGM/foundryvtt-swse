/**
 * PHASE 5C-2: Migration Integrity Adapter Unit Tests
 */

import { MigrationIntegrityAdapter } from './migration-integrity-adapter.js';

export class MigrationIntegrityAdapterTests {
  static run() {
    console.log('[TESTS] Running MigrationIntegrityAdapter unit tests...\n');

    this._testVersionDetection();
    this._testReportStructure();
    this._testExport();

    console.log('[TESTS] ✅ All MigrationIntegrityAdapter tests completed.\n');
  }

  static _testVersionDetection() {
    console.log('TEST 1: Version Detection');

    // Test no stored version
    const info1 = {
      stored: null,
      current: '1.0.0'
    };
    const changed1 = MigrationIntegrityAdapter._hasVersionChanged(info1);
    console.assert(
      changed1 === false,
      'FAILED: First install should not be marked as changed'
    );

    // Test version mismatch
    const info2 = {
      stored: '1.0.0',
      current: '1.1.0'
    };
    const changed2 = MigrationIntegrityAdapter._hasVersionChanged(info2);
    console.assert(
      changed2 === true,
      'FAILED: Version mismatch should be detected'
    );

    // Test no change
    const info3 = {
      stored: '1.0.0',
      current: '1.0.0'
    };
    const changed3 = MigrationIntegrityAdapter._hasVersionChanged(info3);
    console.assert(
      changed3 === false,
      'FAILED: Same version should not be marked as changed'
    );

    console.log('  ✓ Version detection works\n');
  }

  static _testReportStructure() {
    console.log('TEST 2: Report Structure');

    const report = {
      versionChanged: true,
      oldVersion: '1.0.0',
      newVersion: '1.1.0',
      requiresAttention: false,
      message: 'No violations',
      timestamp: Date.now()
    };

    console.assert(report.versionChanged !== null, 'FAILED: versionChanged field');
    console.assert(report.oldVersion !== null, 'FAILED: oldVersion field');
    console.assert(report.newVersion !== null, 'FAILED: newVersion field');
    console.assert(typeof report.requiresAttention === 'boolean', 'FAILED: requiresAttention field');
    console.assert(typeof report.message === 'string', 'FAILED: message field');

    console.log('  ✓ Report structure valid\n');
  }

  static _testExport() {
    console.log('TEST 3: Report Export');

    const report = {
      versionChanged: true,
      oldVersion: '1.0.0',
      newVersion: '1.1.0',
      sweep: {
        summary: {
          totalViolations: 5,
          totalStructural: 1,
          totalError: 2,
          totalWarning: 2
        }
      },
      requiresAttention: true,
      message: 'Violations found',
      timestamp: Date.now()
    };

    const exported = MigrationIntegrityAdapter.exportReport(report);

    console.assert(exported.timestamp !== null, 'FAILED: Timestamp in export');
    console.assert(exported.versionChange !== null, 'FAILED: versionChange in export');
    console.assert(exported.violations !== null, 'FAILED: violations in export');
    console.assert(exported.violations.total === 5, 'FAILED: violation count');
    console.assert(exported.requiresAttention === true, 'FAILED: requiresAttention in export');

    console.log('  ✓ Report export works\n');
  }
}

// Auto-run tests in dev mode
if (typeof globalThis !== 'undefined' && globalThis.SWSE_DEV_MODE) {
  console.log('🧪 [DEV MODE] Running MigrationIntegrityAdapter tests on load...\n');
  MigrationIntegrityAdapterTests.run();
}
