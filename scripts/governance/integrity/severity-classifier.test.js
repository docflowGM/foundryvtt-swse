/**
 * PHASE 5B-3: Severity Classifier Unit Tests
 */

import { SeverityClassifier } from './severity-classifier.js';
import { EnforcementPolicy } from '../enforcement/enforcement-policy.js';

export class SeverityClassifierTests {
  static run() {
    console.log('[TESTS] Running SeverityClassifier unit tests...\n');

    this._testNoViolations();
    this._testWarningViolations();
    this._testErrorViolations();
    this._testStructuralViolations();
    this._testOverallSeverity();
    this._testShouldBlock();
    this._testDescriptions();

    console.log('[TESTS] ✅ All SeverityClassifier tests completed.\n');
  }

  static _testNoViolations() {
    console.log('TEST 1: No Violations');

    const assessment = { legal: true, permanentlyBlocked: false, missingPrereqs: [] };
    const severity = SeverityClassifier.classifyViolation(assessment);

    console.assert(
      severity === EnforcementPolicy.SEVERITY.NONE,
      'FAILED: Legal assessment should be NONE'
    );
    console.log('  ✓ No violations → NONE\n');
  }

  static _testWarningViolations() {
    console.log('TEST 2: Warning Violations');

    // 1 missing prerequisite
    const assessment1 = {
      legal: false,
      permanentlyBlocked: false,
      missingPrereqs: ['Feat A']
    };
    const severity1 = SeverityClassifier.classifyViolation(assessment1);
    console.assert(
      severity1 === EnforcementPolicy.SEVERITY.WARNING,
      'FAILED: 1 missing prereq should be WARNING'
    );

    // 2 missing prerequisites
    const assessment2 = {
      legal: false,
      permanentlyBlocked: false,
      missingPrereqs: ['Feat A', 'Feat B']
    };
    const severity2 = SeverityClassifier.classifyViolation(assessment2);
    console.assert(
      severity2 === EnforcementPolicy.SEVERITY.WARNING,
      'FAILED: 2 missing prereqs should be WARNING'
    );

    console.log('  ✓ 1-2 missing prerequisites → WARNING\n');
  }

  static _testErrorViolations() {
    console.log('TEST 3: Error Violations');

    // 3 missing prerequisites
    const assessment3 = {
      legal: false,
      permanentlyBlocked: false,
      missingPrereqs: ['Feat A', 'Feat B', 'Feat C']
    };
    const severity3 = SeverityClassifier.classifyViolation(assessment3);
    console.assert(
      severity3 === EnforcementPolicy.SEVERITY.ERROR,
      'FAILED: 3+ missing prereqs should be ERROR'
    );

    console.log('  ✓ 3+ missing prerequisites → ERROR\n');
  }

  static _testStructuralViolations() {
    console.log('TEST 4: Structural Violations');

    const assessment = {
      legal: false,
      permanentlyBlocked: true,
      missingPrereqs: []
    };
    const severity = SeverityClassifier.classifyViolation(assessment);

    console.assert(
      severity === EnforcementPolicy.SEVERITY.STRUCTURAL,
      'FAILED: Permanently blocked should be STRUCTURAL'
    );

    console.log('  ✓ Permanent incompatibility → STRUCTURAL\n');
  }

  static _testOverallSeverity() {
    console.log('TEST 5: Overall Severity Calculation');

    const violations = {
      item1: { severity: EnforcementPolicy.SEVERITY.WARNING },
      item2: { severity: EnforcementPolicy.SEVERITY.WARNING },
      item3: { severity: EnforcementPolicy.SEVERITY.ERROR }
    };

    const overall = SeverityClassifier.getOverallSeverity(violations);
    console.assert(
      overall === EnforcementPolicy.SEVERITY.ERROR,
      'FAILED: Highest severity should be ERROR'
    );

    const structuralViolations = {
      item1: { severity: EnforcementPolicy.SEVERITY.STRUCTURAL }
    };
    const overallStructural = SeverityClassifier.getOverallSeverity(structuralViolations);
    console.assert(
      overallStructural === EnforcementPolicy.SEVERITY.STRUCTURAL,
      'FAILED: Structural should be highest'
    );

    console.log('  ✓ Overall severity = max severity\n');
  }

  static _testShouldBlock() {
    console.log('TEST 6: Should Block Decision');

    // Normal enforcement (strict off)
    console.assert(
      !SeverityClassifier.shouldBlock(EnforcementPolicy.SEVERITY.WARNING, false),
      'FAILED: WARNING should not block (strict off)'
    );
    console.assert(
      SeverityClassifier.shouldBlock(EnforcementPolicy.SEVERITY.ERROR, false),
      'FAILED: ERROR should block (strict off)'
    );
    console.assert(
      SeverityClassifier.shouldBlock(EnforcementPolicy.SEVERITY.STRUCTURAL, false),
      'FAILED: STRUCTURAL should block (strict off)'
    );

    // Strict enforcement (strict on)
    console.assert(
      SeverityClassifier.shouldBlock(EnforcementPolicy.SEVERITY.WARNING, true),
      'FAILED: WARNING should block (strict on)'
    );
    console.assert(
      SeverityClassifier.shouldBlock(EnforcementPolicy.SEVERITY.ERROR, true),
      'FAILED: ERROR should block (strict on)'
    );

    console.log('  ✓ shouldBlock respects strictEnforcement\n');
  }

  static _testDescriptions() {
    console.log('TEST 7: Human-Readable Descriptions');

    const desc1 = SeverityClassifier.describe(EnforcementPolicy.SEVERITY.NONE);
    console.assert(desc1.length > 0, 'FAILED: NONE should have description');

    const desc2 = SeverityClassifier.describe(EnforcementPolicy.SEVERITY.WARNING);
    console.assert(desc2.includes('fixable'), 'FAILED: WARNING should mention fixable');

    const desc3 = SeverityClassifier.describe(EnforcementPolicy.SEVERITY.ERROR);
    console.assert(desc3.includes('Blocking'), 'FAILED: ERROR should mention blocking');

    const desc4 = SeverityClassifier.describe(EnforcementPolicy.SEVERITY.STRUCTURAL);
    console.assert(desc4.includes('Permanent'), 'FAILED: STRUCTURAL should mention permanent');

    console.log('  ✓ Descriptions generated correctly\n');
  }
}

// Auto-run tests in dev mode
if (typeof globalThis !== 'undefined' && globalThis.SWSE_DEV_MODE) {
  console.log('🧪 [DEV MODE] Running SeverityClassifier tests on load...\n');
  SeverityClassifierTests.run();
}
