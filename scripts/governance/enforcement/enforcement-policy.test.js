/**
 * PHASE 5B-1: Enforcement Policy Unit Tests
 *
 * Validates all decision paths for the pure policy engine.
 * Each test verifies deterministic behavior.
 */

import { EnforcementPolicy } from "/systems/foundryvtt-swse/scripts/governance/enforcement/enforcement-policy.js";
import { GovernanceSystem } from "/systems/foundryvtt-swse/scripts/governance/governance-system.js";

/**
 * Mock actor factory
 */
function createMockActor(enforcementMode = 'normal', strictEnforcement = false) {
  return {
    name: 'Test Actor',
    system: {
      governance: {
        enforcementMode: enforcementMode,
        approvedBy: null,
        reason: null,
        timestamp: null,
        visibilityMode: 'banner'
      }
    }
  };
}

/**
 * Test Suite: EnforcementPolicy Decision Matrix
 */
export class EnforcementPolicyTests {
  static run() {
    console.log('[TESTS] Running EnforcementPolicy unit tests...\n');

    // Group 1: No violations (should always allow)
    this._testNoViolations();

    // Group 2: Governance mode logic
    this._testFreeBuildMode();
    this._testOverrideMode();
    this._testNormalModeWithoutStrictEnforcement();
    this._testNormalModeWithStrictEnforcement();

    // Group 3: Severity handling
    this._testWarningViolations();
    this._testErrorViolations();
    this._testStructuralViolations();

    // Group 4: Decision consistency
    this._testDecisionConsistency();

    // Group 5: Reason generation
    this._testReasonGeneration();

    console.log('[TESTS] ✅ All EnforcementPolicy tests completed.\n');
  }

  /**
   * Test 1: No violations should always allow
   */
  static _testNoViolations() {
    console.log('TEST 1: No Violations');

    const actor = createMockActor('normal', false);
    const violations = { severity: EnforcementPolicy.SEVERITY.NONE, count: 0 };

    const decision = EnforcementPolicy.evaluate(actor, violations);

    console.assert(
      decision.outcome === EnforcementPolicy.DECISION.ALLOW,
      'FAILED: No violations should always ALLOW'
    );
    console.assert(
      decision.violations.severity === EnforcementPolicy.SEVERITY.NONE,
      'FAILED: Severity should be NONE'
    );
    console.log('  ✓ No violations → ALLOW\n');
  }

  /**
   * Test 2: FreeBuild mode always allows
   */
  static _testFreeBuildMode() {
    console.log('TEST 2: FreeBuild Mode');

    const actor = createMockActor(GovernanceSystem.ENFORCEMENT_MODES.FREEBUILD, false);

    // Test with errors
    const errorViolations = { severity: EnforcementPolicy.SEVERITY.ERROR, count: 3 };
    const errorDecision = EnforcementPolicy.evaluate(actor, errorViolations);

    console.assert(
      errorDecision.outcome === EnforcementPolicy.DECISION.ALLOW,
      'FAILED: FreeBuild with errors should ALLOW'
    );
    console.assert(
      errorDecision.policy.mode === GovernanceSystem.ENFORCEMENT_MODES.FREEBUILD,
      'FAILED: Mode should be freeBuild'
    );

    // Test with structural
    const structuralViolations = { severity: EnforcementPolicy.SEVERITY.STRUCTURAL, count: 2 };
    const structuralDecision = EnforcementPolicy.evaluate(actor, structuralViolations);

    console.assert(
      structuralDecision.outcome === EnforcementPolicy.DECISION.ALLOW,
      'FAILED: FreeBuild with structural should ALLOW'
    );

    console.log('  ✓ FreeBuild mode: errors → ALLOW');
    console.log('  ✓ FreeBuild mode: structural → ALLOW\n');
  }

  /**
   * Test 3: Override mode always allows
   */
  static _testOverrideMode() {
    console.log('TEST 3: Override Mode');

    const actor = createMockActor(GovernanceSystem.ENFORCEMENT_MODES.OVERRIDE, false);

    // Test with errors
    const errorViolations = { severity: EnforcementPolicy.SEVERITY.ERROR, count: 2 };
    const errorDecision = EnforcementPolicy.evaluate(actor, errorViolations);

    console.assert(
      errorDecision.outcome === EnforcementPolicy.DECISION.ALLOW,
      'FAILED: Override with errors should ALLOW'
    );

    // Test with warnings
    const warningViolations = { severity: EnforcementPolicy.SEVERITY.WARNING, count: 1 };
    const warningDecision = EnforcementPolicy.evaluate(actor, warningViolations);

    console.assert(
      warningDecision.outcome === EnforcementPolicy.DECISION.ALLOW,
      'FAILED: Override with warnings should ALLOW'
    );

    console.log('  ✓ Override mode: errors → ALLOW');
    console.log('  ✓ Override mode: warnings → ALLOW\n');
  }

  /**
   * Test 4: Normal mode without strict enforcement
   */
  static _testNormalModeWithoutStrictEnforcement() {
    console.log('TEST 4: Normal Mode (Strict OFF)');

    const actor = createMockActor(GovernanceSystem.ENFORCEMENT_MODES.NORMAL, false);

    // Warnings should warn
    const warningViolations = { severity: EnforcementPolicy.SEVERITY.WARNING, count: 1 };
    const warningDecision = EnforcementPolicy.evaluate(actor, warningViolations);

    console.assert(
      warningDecision.outcome === EnforcementPolicy.DECISION.WARN,
      'FAILED: Normal mode with warnings should WARN'
    );

    // Errors should block
    const errorViolations = { severity: EnforcementPolicy.SEVERITY.ERROR, count: 2 };
    const errorDecision = EnforcementPolicy.evaluate(actor, errorViolations);

    console.assert(
      errorDecision.outcome === EnforcementPolicy.DECISION.BLOCK,
      'FAILED: Normal mode with errors should BLOCK'
    );

    // Structural should block
    const structuralViolations = { severity: EnforcementPolicy.SEVERITY.STRUCTURAL, count: 1 };
    const structuralDecision = EnforcementPolicy.evaluate(actor, structuralViolations);

    console.assert(
      structuralDecision.outcome === EnforcementPolicy.DECISION.BLOCK,
      'FAILED: Normal mode with structural should BLOCK'
    );

    console.log('  ✓ Normal (Strict OFF): warnings → WARN');
    console.log('  ✓ Normal (Strict OFF): errors → BLOCK');
    console.log('  ✓ Normal (Strict OFF): structural → BLOCK\n');
  }

  /**
   * Test 5: Normal mode with strict enforcement
   */
  static _testNormalModeWithStrictEnforcement() {
    console.log('TEST 5: Normal Mode (Strict ON)');

    const actor = createMockActor(GovernanceSystem.ENFORCEMENT_MODES.NORMAL, true);

    // Even warnings should block
    const warningViolations = { severity: EnforcementPolicy.SEVERITY.WARNING, count: 1 };
    const warningDecision = EnforcementPolicy.evaluate(actor, warningViolations);

    console.assert(
      warningDecision.outcome === EnforcementPolicy.DECISION.BLOCK,
      'FAILED: Normal mode (Strict ON) with warnings should BLOCK'
    );

    // Errors definitely block
    const errorViolations = { severity: EnforcementPolicy.SEVERITY.ERROR, count: 2 };
    const errorDecision = EnforcementPolicy.evaluate(actor, errorViolations);

    console.assert(
      errorDecision.outcome === EnforcementPolicy.DECISION.BLOCK,
      'FAILED: Normal mode (Strict ON) with errors should BLOCK'
    );

    console.log('  ✓ Normal (Strict ON): warnings → BLOCK');
    console.log('  ✓ Normal (Strict ON): errors → BLOCK\n');
  }

  /**
   * Test 6: Warning violations
   */
  static _testWarningViolations() {
    console.log('TEST 6: Warning Violations');

    const actor = createMockActor('normal', false);
    const violations = { severity: EnforcementPolicy.SEVERITY.WARNING, count: 2 };

    const decision = EnforcementPolicy.evaluate(actor, violations);

    console.assert(
      decision.outcome === EnforcementPolicy.DECISION.WARN,
      'FAILED: Warning violations should WARN'
    );
    console.assert(
      decision.violations.count === 2,
      'FAILED: Violation count should be preserved'
    );

    console.log('  ✓ Warning severity → WARN\n');
  }

  /**
   * Test 7: Error violations
   */
  static _testErrorViolations() {
    console.log('TEST 7: Error Violations');

    const actor = createMockActor('normal', false);
    const violations = { severity: EnforcementPolicy.SEVERITY.ERROR, count: 3 };

    const decision = EnforcementPolicy.evaluate(actor, violations);

    console.assert(
      decision.outcome === EnforcementPolicy.DECISION.BLOCK,
      'FAILED: Error violations should BLOCK'
    );
    console.assert(
      decision.violations.count === 3,
      'FAILED: Violation count should be preserved'
    );

    console.log('  ✓ Error severity → BLOCK\n');
  }

  /**
   * Test 8: Structural violations
   */
  static _testStructuralViolations() {
    console.log('TEST 8: Structural Violations');

    const actor = createMockActor('normal', false);
    const violations = { severity: EnforcementPolicy.SEVERITY.STRUCTURAL, count: 1 };

    const decision = EnforcementPolicy.evaluate(actor, violations);

    console.assert(
      decision.outcome === EnforcementPolicy.DECISION.BLOCK,
      'FAILED: Structural violations should BLOCK'
    );

    console.log('  ✓ Structural severity → BLOCK\n');
  }

  /**
   * Test 9: Decision consistency (deterministic)
   */
  static _testDecisionConsistency() {
    console.log('TEST 9: Decision Consistency (Deterministic)');

    const actor = createMockActor('normal', false);
    const violations = { severity: EnforcementPolicy.SEVERITY.ERROR, count: 2 };

    // Same input → same output (10 times)
    const decisions = [];
    for (let i = 0; i < 10; i++) {
      decisions.push(EnforcementPolicy.evaluate(actor, violations).outcome);
    }

    const allSame = decisions.every(d => d === decisions[0]);

    console.assert(
      allSame,
      'FAILED: Same inputs should produce same output (determinism violated)'
    );
    console.assert(
      decisions[0] === EnforcementPolicy.DECISION.BLOCK,
      'FAILED: Expected BLOCK outcome'
    );

    console.log('  ✓ 10 identical calls → 10 identical outputs (BLOCK)\n');
  }

  /**
   * Test 10: Reason generation
   */
  static _testReasonGeneration() {
    console.log('TEST 10: Reason Generation');

    const actor = createMockActor('normal', false);

    // Test ALLOW reason
    const allowViolations = { severity: EnforcementPolicy.SEVERITY.NONE, count: 0 };
    const allowDecision = EnforcementPolicy.evaluate(actor, allowViolations);
    console.assert(
      allowDecision.reason.length > 0,
      'FAILED: ALLOW decision should have reason'
    );

    // Test WARN reason
    const warnViolations = { severity: EnforcementPolicy.SEVERITY.WARNING, count: 2 };
    const warnDecision = EnforcementPolicy.evaluate(actor, warnViolations);
    console.assert(
      warnDecision.reason.includes('2'),
      'FAILED: WARN reason should include violation count'
    );

    // Test BLOCK reason
    const blockViolations = { severity: EnforcementPolicy.SEVERITY.ERROR, count: 3 };
    const blockDecision = EnforcementPolicy.evaluate(actor, blockViolations);
    console.assert(
      blockDecision.reason.includes('3'),
      'FAILED: BLOCK reason should include violation count'
    );

    console.log('  ✓ ALLOW reason generated');
    console.log('  ✓ WARN reason includes violation count');
    console.log('  ✓ BLOCK reason includes violation count\n');
  }

  /**
   * Test helper: shouldBlock()
   */
  static _testShouldBlockHelper() {
    console.log('TEST 11: shouldBlock() Helper');

    const actor = createMockActor('normal', false);

    // Should block on errors
    const shouldBlockErrors = EnforcementPolicy.shouldBlock(
      actor,
      { severity: EnforcementPolicy.SEVERITY.ERROR, count: 1 }
    );
    console.assert(shouldBlockErrors, 'FAILED: shouldBlock should return true for errors');

    // Should not block on warnings
    const shouldBlockWarnings = EnforcementPolicy.shouldBlock(
      actor,
      { severity: EnforcementPolicy.SEVERITY.WARNING, count: 1 }
    );
    console.assert(!shouldBlockWarnings, 'FAILED: shouldBlock should return false for warnings');

    console.log('  ✓ shouldBlock() helper works correctly\n');
  }

  /**
   * Test helper: shouldWarn()
   */
  static _testShouldWarnHelper() {
    console.log('TEST 12: shouldWarn() Helper');

    const actor = createMockActor('normal', false);

    // Should warn on warnings
    const shouldWarnWarnings = EnforcementPolicy.shouldWarn(
      actor,
      { severity: EnforcementPolicy.SEVERITY.WARNING, count: 1 }
    );
    console.assert(shouldWarnWarnings, 'FAILED: shouldWarn should return true for warnings');

    // Should not warn on errors
    const shouldWarnErrors = EnforcementPolicy.shouldWarn(
      actor,
      { severity: EnforcementPolicy.SEVERITY.ERROR, count: 1 }
    );
    console.assert(!shouldWarnErrors, 'FAILED: shouldWarn should return false for errors');

    console.log('  ✓ shouldWarn() helper works correctly\n');
  }
}

// Auto-run tests when imported in dev mode
if (typeof globalThis !== 'undefined' && globalThis.SWSE_DEV_MODE) {
  console.log('🧪 [DEV MODE] Running EnforcementPolicy tests on load...\n');
  EnforcementPolicyTests.run();
}
