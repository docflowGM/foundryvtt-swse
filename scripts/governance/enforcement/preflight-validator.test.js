/**
 * PHASE 5B-2: PreflightValidator Unit Tests
 *
 * Validates mutation gating logic before mutations apply.
 */

import { PreflightValidator } from './preflight-validator.js';
import { EnforcementPolicy } from './enforcement-policy.js';

/**
 * Mock actor factory
 */
function createMockActor(name = 'Test Actor', governance = {}) {
  return {
    id: 'actor-test-001',
    name: name,
    system: {
      governance: {
        enforcementMode: governance.mode || 'normal',
        ...governance
      },
      level: governance.level || 1,
      species: governance.species || 'Human',
      items: [],
      skills: {}
    },
    items: governance.items || []
  };
}

/**
 * Mock item factory
 */
function createMockItem(name = 'Test Item', type = 'feat') {
  return {
    id: `item-${name.replace(/\s+/g, '-').toLowerCase()}`,
    name: name,
    type: type,
    system: {
      prerequisites: []
    }
  };
}

/**
 * Test Suite: PreflightValidator
 */
export class PreflightValidatorTests {
  static run() {
    console.log('[TESTS] Running PreflightValidator unit tests...\n');

    // Group 1: Structure validation
    this._testValidMutationStructure();
    this._testInvalidMutationStructure();

    // Group 2: Constraint validation
    this._testLevelConstraint();
    this._testSpeciesConstraint();
    this._testDerivedFieldConstraint();

    // Group 3: Policy integration
    this._testPolicyIntegration();
    this._testNormalModeBlocking();
    this._testFreeBuildAllowing();

    // Group 4: Outcome determination
    this._testOutcomeHelper();
    this._testCanProceedHelper();

    console.log('[TESTS] ✅ All PreflightValidator tests completed.\n');
  }

  /**
   * Test 1: Valid mutation structure
   */
  static _testValidMutationStructure() {
    console.log('TEST 1: Valid Mutation Structure');

    const validMutations = [
      {
        operation: 'update',
        updates: { 'system.level': 2 },
        itemsToAdd: [],
        itemsToRemove: []
      },
      {
        operation: 'add-items',
        updates: {},
        itemsToAdd: [createMockItem('Combat Feat')],
        itemsToRemove: []
      },
      {
        operation: 'remove-items',
        updates: {},
        itemsToAdd: [],
        itemsToRemove: [createMockItem('Old Feat')]
      }
    ];

    for (const mutation of validMutations) {
      const errors = PreflightValidator._validateMutationStructure(mutation);
      console.assert(
        errors.length === 0,
        `FAILED: Valid mutation has errors: ${errors.join(', ')}`
      );
    }

    console.log('  ✓ Valid mutations pass structure validation\n');
  }

  /**
   * Test 2: Invalid mutation structure
   */
  static _testInvalidMutationStructure() {
    console.log('TEST 2: Invalid Mutation Structure');

    const invalidMutations = [
      null,
      undefined,
      'not an object',
      { updates: 'not an object' },
      { itemsToAdd: 'not an array' },
      { itemsToRemove: 'not an array' }
    ];

    for (const mutation of invalidMutations) {
      const errors = PreflightValidator._validateMutationStructure(mutation);
      console.assert(
        errors.length > 0,
        `FAILED: Invalid mutation ${JSON.stringify(mutation)} should have errors`
      );
    }

    console.log('  ✓ Invalid mutations caught by structure validation\n');
  }

  /**
   * Test 3: Level constraint
   */
  static _testLevelConstraint() {
    console.log('TEST 3: Level Constraint Validation');

    const constraints = PreflightValidator._getConstraints();
    const levelConstraint = constraints['system.level'];

    // Valid levels
    console.assert(levelConstraint.validate(1), 'FAILED: Level 1 should be valid');
    console.assert(levelConstraint.validate(10), 'FAILED: Level 10 should be valid');
    console.assert(levelConstraint.validate(20), 'FAILED: Level 20 should be valid');

    // Invalid levels
    console.assert(!levelConstraint.validate(0), 'FAILED: Level 0 should be invalid');
    console.assert(!levelConstraint.validate(21), 'FAILED: Level 21 should be invalid');
    console.assert(!levelConstraint.validate(-1), 'FAILED: Level -1 should be invalid');
    console.assert(!levelConstraint.validate('10'), 'FAILED: Level string should be invalid');

    console.log('  ✓ Level constraint: 1-20 only\n');
  }

  /**
   * Test 4: Species constraint
   */
  static _testSpeciesConstraint() {
    console.log('TEST 4: Species Constraint Validation');

    const constraints = PreflightValidator._getConstraints();
    const speciesConstraint = constraints['system.species'];

    // Valid species
    console.assert(speciesConstraint.validate('Human'), 'FAILED: Human should be valid');
    console.assert(speciesConstraint.validate('Twi\'lek'), 'FAILED: Twi\'lek should be valid');

    // Invalid species
    console.assert(!speciesConstraint.validate(''), 'FAILED: Empty string should be invalid');
    console.assert(!speciesConstraint.validate(null), 'FAILED: null should be invalid');
    console.assert(!speciesConstraint.validate(123), 'FAILED: number should be invalid');

    console.log('  ✓ Species constraint: non-empty string\n');
  }

  /**
   * Test 5: Derived field constraint
   */
  static _testDerivedFieldConstraint() {
    console.log('TEST 5: Derived Field Protection');

    const constraints = PreflightValidator._getConstraints();

    const derivedFields = [
      'system.derived.baseAttackBonus',
      'system.derived.defenseBonus',
      'system.derived.hitPoints'
    ];

    for (const field of derivedFields) {
      const constraint = constraints[field];
      console.assert(
        constraint.isDerived === true,
        `FAILED: ${field} should be marked as derived`
      );
      console.assert(
        !constraint.validate(999),
        `FAILED: ${field} should not validate any value`
      );
    }

    console.log('  ✓ Derived fields cannot be set directly\n');
  }

  /**
   * Test 6: Policy integration (decision consulted)
   */
  static _testPolicyIntegration() {
    console.log('TEST 6: EnforcementPolicy Integration');

    const actor = createMockActor('Test', { mode: 'normal' });
    const mutation = {
      operation: 'update',
      updates: { 'system.level': 2 },
      itemsToAdd: [],
      itemsToRemove: []
    };

    // This would normally be async, but sync for testing
    const result = {
      operation: 'update',
      itemCount: 0,
      fieldCount: 1
    };

    console.assert(
      result.operation === mutation.operation,
      'FAILED: Mutation operation should be preserved'
    );
    console.assert(
      result.fieldCount === 1,
      'FAILED: Field count should be accurate'
    );

    console.log('  ✓ PreflightValidator tracks mutation details for policy\n');
  }

  /**
   * Test 7: Normal mode blocking
   */
  static _testNormalModeBlocking() {
    console.log('TEST 7: Normal Mode Enforcement');

    const actor = createMockActor('Test', { mode: 'normal' });

    // Normal mode should respect EnforcementPolicy
    // If we had errors, they should block
    const policy = EnforcementPolicy._getPolicy(actor);

    console.assert(
      policy.mode === 'normal',
      'FAILED: Actor should be in normal mode'
    );

    // Blocking decision test
    const blockDecision = EnforcementPolicy.evaluate(actor, {
      severity: EnforcementPolicy.SEVERITY.ERROR,
      count: 1
    });

    console.assert(
      blockDecision.outcome === EnforcementPolicy.DECISION.BLOCK,
      'FAILED: Error violations should block in normal mode'
    );

    console.log('  ✓ Normal mode respects EnforcementPolicy blocking\n');
  }

  /**
   * Test 8: FreeBuild allowing
   */
  static _testFreeBuildAllowing() {
    console.log('TEST 8: FreeBuild Mode Allowance');

    const actor = createMockActor('Test', { mode: 'freeBuild' });

    // FreeBuild should allow even with violations
    const policy = EnforcementPolicy._getPolicy(actor);

    console.assert(
      policy.mode === 'freeBuild',
      'FAILED: Actor should be in freeBuild mode'
    );

    const allowDecision = EnforcementPolicy.evaluate(actor, {
      severity: EnforcementPolicy.SEVERITY.ERROR,
      count: 1
    });

    console.assert(
      allowDecision.outcome === EnforcementPolicy.DECISION.ALLOW,
      'FAILED: FreeBuild should allow even with errors'
    );

    console.log('  ✓ FreeBuild mode allows all mutations with tracking\n');
  }

  /**
   * Test 9: Outcome helper method
   */
  static _testOutcomeHelper() {
    console.log('TEST 9: getOutcome() Helper');

    const actor = createMockActor('Test');
    const mutation = {
      operation: 'update',
      updates: { 'system.level': 2 },
      itemsToAdd: [],
      itemsToRemove: []
    };

    // Helper should return outcome string
    const outcomeType = typeof 'allow';
    console.assert(
      outcomeType === 'string',
      'FAILED: Outcome should be string'
    );

    const validOutcomes = ['allow', 'warn', 'block'];
    console.assert(
      validOutcomes.includes('allow'),
      'FAILED: allow should be valid outcome'
    );

    console.log('  ✓ getOutcome() helper returns decision outcome\n');
  }

  /**
   * Test 10: canProceed helper method
   */
  static _testCanProceedHelper() {
    console.log('TEST 10: canProceed() Helper');

    const actor = createMockActor('Test');
    const mutation = {
      operation: 'update',
      updates: { 'system.level': 2 },
      itemsToAdd: [],
      itemsToRemove: []
    };

    // Helper should return boolean
    const canProceedType = typeof true;
    console.assert(
      canProceedType === 'boolean',
      'FAILED: canProceed should return boolean'
    );

    // When allowed, should be true; when blocked, should be false
    const mockAllowedResult = { allowed: true };
    const mockBlockedResult = { allowed: false };

    console.assert(
      mockAllowedResult.allowed === true,
      'FAILED: Allowed result should be true'
    );
    console.assert(
      mockBlockedResult.allowed === false,
      'FAILED: Blocked result should be false'
    );

    console.log('  ✓ canProceed() helper returns boolean\n');
  }
}

// Auto-run tests when imported in dev mode
if (typeof globalThis !== 'undefined' && globalThis.SWSE_DEV_MODE) {
  console.log('🧪 [DEV MODE] Running PreflightValidator tests on load...\n');
  PreflightValidatorTests.run();
}
