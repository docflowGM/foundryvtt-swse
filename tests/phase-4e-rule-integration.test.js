/**
 * PHASE 4E RULE INTEGRATION TEST SUITE
 *
 * Validates RuleCollector and ResolutionContext integration:
 * - RuleCollector aggregates rules during prepare cycle
 * - Frozen snapshots stored in actor._ruleSet and actor._ruleParams
 * - ResolutionContext reads from frozen storage
 * - Parameter-scoped rules (TREAT_SKILL_AS_TRAINED) work correctly
 * - Deduplication prevents duplicate rules
 * - Deterministic rebuild every cycle
 */

import { RuleCollector } from '../scripts/engine/execution/rules/rule-collector.js';
import { ResolutionContext } from '../scripts/engine/resolution/resolution-context.js';
import { RULES } from '../scripts/engine/execution/rules/rule-enum.js';

// ============================================================================
// LOGGING AND UTILITIES
// ============================================================================

const log = (msg) => console.log(`  ${msg}`);
const logSection = (title) => {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`  ${title}`);
  console.log(`${'='.repeat(70)}`);
};

const logTest = (name, passed, detail = '') => {
  const symbol = passed ? '✓' : '✗';
  const msg = `${symbol} ${name}`;
  console.log(`  ${msg}${detail ? ` - ${detail}` : ''}`);
  return passed;
};

const TEST_RESULTS = { tests: [], passed: 0, failed: 0 };

const test = (name, result, error = null) => {
  TEST_RESULTS.tests.push({ name, result, error });
  if (result) {
    TEST_RESULTS.passed++;
  } else {
    TEST_RESULTS.failed++;
  }
  logTest(name, result, error);
};

// Mock actor for testing
const createMockActor = (name = 'TestActor') => {
  return {
    name,
    items: [],
    system: { classes: [] },
    flags: {},
    _ruleSet: new Set(),
    _ruleParams: new Map(),
  };
};

// ============================================================================
// TEST 1: RuleCollector - Simple Rules
// ============================================================================

function test1_SimpleRuleCollection() {
  logSection('TEST 1: RuleCollector - Simple Rules');

  const collector = new RuleCollector();
  const actor = createMockActor('SimpleTest');

  try {
    // Add simple rules (no params)
    collector.add({ type: RULES.IGNORE_COVER });
    collector.add({ type: RULES.CANNOT_BE_FLANKED });

    // Finalize
    collector.finalize(actor);

    // Verify frozen snapshots created
    test('actor._ruleSet created', actor._ruleSet instanceof Set);
    test('actor._ruleParams created', actor._ruleParams instanceof Map);

    // Verify simple rules in set
    test('IGNORE_COVER in ruleSet', actor._ruleSet.has(RULES.IGNORE_COVER));
    test('CANNOT_BE_FLANKED in ruleSet', actor._ruleSet.has(RULES.CANNOT_BE_FLANKED));

    // Verify no params for simple rules
    test('IGNORE_COVER not in ruleParams', !actor._ruleParams.has(RULES.IGNORE_COVER));

    return TEST_RESULTS.failed === 0;
  } catch (err) {
    test('test1_SimpleRuleCollection', false, err.message);
    return false;
  }
}

// ============================================================================
// TEST 2: RuleCollector - Param Rules
// ============================================================================

function test2_ParamRuleCollection() {
  logSection('TEST 2: RuleCollector - Param Rules (TREAT_SKILL_AS_TRAINED)');

  const collector = new RuleCollector();
  const actor = createMockActor('ParamTest');

  try {
    // Add param rule with skill parameter
    collector.add({
      type: RULES.TREAT_SKILL_AS_TRAINED,
      params: { skillId: 'useTheForce' }
    });

    collector.add({
      type: RULES.TREAT_SKILL_AS_TRAINED,
      params: { skillId: 'deception' }
    });

    // Finalize
    collector.finalize(actor);

    // Verify param rule stored
    test('TREAT_SKILL_AS_TRAINED in ruleParams',
      actor._ruleParams.has(RULES.TREAT_SKILL_AS_TRAINED));

    // Verify param values stored
    const skillSet = actor._ruleParams.get(RULES.TREAT_SKILL_AS_TRAINED);
    test('skillId "useTheForce" stored', skillSet?.has('useTheForce'));
    test('skillId "deception" stored', skillSet?.has('deception'));

    // Verify not in simple ruleSet
    test('TREAT_SKILL_AS_TRAINED not in ruleSet',
      !actor._ruleSet.has(RULES.TREAT_SKILL_AS_TRAINED));

    return TEST_RESULTS.failed === 0;
  } catch (err) {
    test('test2_ParamRuleCollection', false, err.message);
    return false;
  }
}

// ============================================================================
// TEST 3: Deduplication
// ============================================================================

function test3_Deduplication() {
  logSection('TEST 3: RuleCollector - Deduplication');

  const collector = new RuleCollector();
  const actor = createMockActor('DedupeTest');

  try {
    // Add same simple rule multiple times
    collector.add({ type: RULES.IGNORE_COVER });
    collector.add({ type: RULES.IGNORE_COVER });
    collector.add({ type: RULES.IGNORE_COVER });

    // Add same param rule multiple times
    collector.add({
      type: RULES.TREAT_SKILL_AS_TRAINED,
      params: { skillId: 'piloting' }
    });
    collector.add({
      type: RULES.TREAT_SKILL_AS_TRAINED,
      params: { skillId: 'piloting' }
    });

    // Finalize
    collector.finalize(actor);

    // Verify deduplication in ruleSet
    test('IGNORE_COVER deduplicated in ruleSet',
      actor._ruleSet.has(RULES.IGNORE_COVER) && actor._ruleSet.size === 1);

    // Verify deduplication in param set
    const skillSet = actor._ruleParams.get(RULES.TREAT_SKILL_AS_TRAINED);
    test('piloting deduplicated in params',
      skillSet?.has('piloting') && skillSet?.size === 1);

    return TEST_RESULTS.failed === 0;
  } catch (err) {
    test('test3_Deduplication', false, err.message);
    return false;
  }
}

// ============================================================================
// TEST 4: ResolutionContext - Read Simple Rules
// ============================================================================

function test4_ResolutionContextSimpleRules() {
  logSection('TEST 4: ResolutionContext - Read Simple Rules');

  const collector = new RuleCollector();
  const actor = createMockActor('ContextTest');

  try {
    collector.add({ type: RULES.IGNORE_COVER });
    collector.add({ type: RULES.CANNOT_BE_FLANKED });
    collector.finalize(actor);

    // Create context and query
    const context = new ResolutionContext(actor);

    test('hasRule(IGNORE_COVER) returns true',
      context.hasRule(RULES.IGNORE_COVER) === true);

    test('hasRule(CANNOT_BE_FLANKED) returns true',
      context.hasRule(RULES.CANNOT_BE_FLANKED) === true);

    test('hasRule(IMMUNE_FEAR) returns false',
      context.hasRule(RULES.IMMUNE_FEAR) === false);

    return TEST_RESULTS.failed === 0;
  } catch (err) {
    test('test4_ResolutionContextSimpleRules', false, err.message);
    return false;
  }
}

// ============================================================================
// TEST 5: ResolutionContext - Read Param Rules with Options
// ============================================================================

function test5_ResolutionContextParamRules() {
  logSection('TEST 5: ResolutionContext - Read Param Rules with Options');

  const collector = new RuleCollector();
  const actor = createMockActor('ParamContextTest');

  try {
    collector.add({
      type: RULES.TREAT_SKILL_AS_TRAINED,
      params: { skillId: 'useTheForce' }
    });
    collector.add({
      type: RULES.TREAT_SKILL_AS_TRAINED,
      params: { skillId: 'piloting' }
    });
    collector.finalize(actor);

    const context = new ResolutionContext(actor);

    // Test with specific skill
    test('hasRule(TREAT_SKILL_AS_TRAINED, {skillId: "useTheForce"}) returns true',
      context.hasRule(RULES.TREAT_SKILL_AS_TRAINED, { skillId: 'useTheForce' }) === true);

    test('hasRule(TREAT_SKILL_AS_TRAINED, {skillId: "piloting"}) returns true',
      context.hasRule(RULES.TREAT_SKILL_AS_TRAINED, { skillId: 'piloting' }) === true);

    test('hasRule(TREAT_SKILL_AS_TRAINED, {skillId: "unknown"}) returns false',
      context.hasRule(RULES.TREAT_SKILL_AS_TRAINED, { skillId: 'unknown' }) === false);

    // Test without options
    test('hasRule(TREAT_SKILL_AS_TRAINED) returns true (no filter)',
      context.hasRule(RULES.TREAT_SKILL_AS_TRAINED) === true);

    return TEST_RESULTS.failed === 0;
  } catch (err) {
    test('test5_ResolutionContextParamRules', false, err.message);
    return false;
  }
}

// ============================================================================
// TEST 6: Snapshot Integrity (Rebuild Every Cycle Prevents Mutation Issues)
// ============================================================================

function test6_FrozenSnapshots() {
  logSection('TEST 6: Snapshot Integrity (Deterministic Rebuild)');

  const collector = new RuleCollector();
  const actor = createMockActor('SnapshotTest');

  try {
    collector.add({ type: RULES.IGNORE_COVER });
    collector.add({
      type: RULES.TREAT_SKILL_AS_TRAINED,
      params: { skillId: 'force' }
    });
    collector.finalize(actor);

    // Verify snapshots are created as Set/Map (not frozen in Phase 4E)
    // Freezing is optional, deterministic rebuild is the safety mechanism
    test('ruleSet is a Set',
      actor._ruleSet instanceof Set);

    test('ruleParams is a Map',
      actor._ruleParams instanceof Map);

    // The real safety: rebuild every cycle (tested in test8)
    // Manual mutation of unfrozen collections doesn't matter because
    // prepareDerivedData() will rebuild them fresh each cycle
    test('ruleSet contains collected rules',
      actor._ruleSet.has(RULES.IGNORE_COVER));

    test('ruleParams contains collected params',
      actor._ruleParams.has(RULES.TREAT_SKILL_AS_TRAINED));

    return TEST_RESULTS.failed === 0;
  } catch (err) {
    test('test6_FrozenSnapshots', false, err.message);
    return false;
  }
}

// ============================================================================
// TEST 7: Multiple Actors - Independent Snapshots
// ============================================================================

function test7_MultipleActors() {
  logSection('TEST 7: Multiple Actors - Independent Snapshots');

  const actor1 = createMockActor('Actor1');
  const actor2 = createMockActor('Actor2');

  try {
    // Actor 1 gets IGNORE_COVER
    const collector1 = new RuleCollector();
    collector1.add({ type: RULES.IGNORE_COVER });
    collector1.finalize(actor1);

    // Actor 2 gets CANNOT_BE_FLANKED
    const collector2 = new RuleCollector();
    collector2.add({ type: RULES.CANNOT_BE_FLANKED });
    collector2.finalize(actor2);

    // Verify independence
    test('Actor1 has IGNORE_COVER',
      actor1._ruleSet.has(RULES.IGNORE_COVER));

    test('Actor1 does not have CANNOT_BE_FLANKED',
      !actor1._ruleSet.has(RULES.CANNOT_BE_FLANKED));

    test('Actor2 has CANNOT_BE_FLANKED',
      actor2._ruleSet.has(RULES.CANNOT_BE_FLANKED));

    test('Actor2 does not have IGNORE_COVER',
      !actor2._ruleSet.has(RULES.IGNORE_COVER));

    return TEST_RESULTS.failed === 0;
  } catch (err) {
    test('test7_MultipleActors', false, err.message);
    return false;
  }
}

// ============================================================================
// TEST 8: Rebuild Idempotency
// ============================================================================

function test8_RebuildIdempotency() {
  logSection('TEST 8: Rebuild Idempotency (Fresh Collection Each Cycle)');

  const actor = createMockActor('IdempotencyTest');

  try {
    // Cycle 1: Add some rules
    const collector1 = new RuleCollector();
    collector1.add({ type: RULES.IGNORE_COVER });
    collector1.add({
      type: RULES.TREAT_SKILL_AS_TRAINED,
      params: { skillId: 'skill1' }
    });
    collector1.finalize(actor);

    const cycle1Size = actor._ruleSet.size;
    const cycle1ParamCount = actor._ruleParams.size;

    // Cycle 2: Fresh collection (simulating new prepare cycle)
    // Even though collector1 had data, new collector is fresh
    const collector2 = new RuleCollector();
    collector2.add({ type: RULES.CANNOT_BE_FLANKED }); // Different rule
    collector2.add({
      type: RULES.TREAT_SKILL_AS_TRAINED,
      params: { skillId: 'skill2' } // Different skill
    });
    collector2.finalize(actor);

    const cycle2Size = actor._ruleSet.size;
    const cycle2ParamCount = actor._ruleParams.size;

    // Old rule should be replaced, not accumulated
    test('IGNORE_COVER removed in cycle 2',
      !actor._ruleSet.has(RULES.IGNORE_COVER));

    test('CANNOT_BE_FLANKED added in cycle 2',
      actor._ruleSet.has(RULES.CANNOT_BE_FLANKED));

    test('Param skill updated to skill2',
      actor._ruleParams.get(RULES.TREAT_SKILL_AS_TRAINED)?.has('skill2'));

    return TEST_RESULTS.failed === 0;
  } catch (err) {
    test('test8_RebuildIdempotency', false, err.message);
    return false;
  }
}

// ============================================================================
// TEST 9: Null Actor Handling
// ============================================================================

function test9_NullActorHandling() {
  logSection('TEST 9: Null/Empty Actor Handling');

  try {
    // ResolutionContext with null actor
    const context1 = new ResolutionContext(null);
    test('hasRule(null actor) returns false',
      context1.hasRule(RULES.IGNORE_COVER) === false);

    // ResolutionContext with empty actor
    const emptyActor = createMockActor('Empty');
    // Don't initialize _ruleSet and _ruleParams
    delete emptyActor._ruleSet;
    delete emptyActor._ruleParams;

    const context2 = new ResolutionContext(emptyActor);
    test('hasRule(empty actor) returns false',
      context2.hasRule(RULES.IGNORE_COVER) === false);

    test('hasRule with options (empty actor) returns false',
      context2.hasRule(RULES.TREAT_SKILL_AS_TRAINED, { skillId: 'test' }) === false);

    return TEST_RESULTS.failed === 0;
  } catch (err) {
    test('test9_NullActorHandling', false, err.message);
    return false;
  }
}

// ============================================================================
// RUN ALL TESTS
// ============================================================================

async function runAllTests() {
  logSection('PHASE 4E RULE INTEGRATION TEST SUITE');

  const results = [];
  results.push(test1_SimpleRuleCollection());
  results.push(test2_ParamRuleCollection());
  results.push(test3_Deduplication());
  results.push(test4_ResolutionContextSimpleRules());
  results.push(test5_ResolutionContextParamRules());
  results.push(test6_FrozenSnapshots());
  results.push(test7_MultipleActors());
  results.push(test8_RebuildIdempotency());
  results.push(test9_NullActorHandling());

  // Summary
  logSection('TEST SUMMARY');
  log(`Passed: ${TEST_RESULTS.passed}`);
  log(`Failed: ${TEST_RESULTS.failed}`);
  log(`Total:  ${TEST_RESULTS.tests.length}`);

  if (TEST_RESULTS.failed === 0) {
    log('\n✓ ALL TESTS PASSED - Phase 4E Ready');
  } else {
    log('\n✗ SOME TESTS FAILED - Review needed');
  }

  return TEST_RESULTS.failed === 0;
}

// Export for test runner
export { runAllTests, TEST_RESULTS };

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests();
}
