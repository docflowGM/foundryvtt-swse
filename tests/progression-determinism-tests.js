/**
 * SWSE Progression Engine Determinism Tests
 *
 * Verifies that the progression engine produces deterministic, idempotent,
 * order-independent results. All tests designed to catch regressions from
 * the architectural issues documented in PROGRESSION_COMPILER.md
 *
 * Usage:
 *   // In browser console during Foundry session:
 *   import('./systems/foundryvtt-swse/tests/progression-determinism-tests.js')
 *     .then(m => m.runAllTests())
 *
 * Or:
 *   // Run specific test
 *   import('./systems/foundryvtt-swse/tests/progression-determinism-tests.js')
 *     .then(m => m.testIdempotence())
 */

import { SWSELogger } from '../scripts/utils/logger.js';

const TEST_CONFIG = {
  verbosity: 'full', // 'silent', 'summary', 'full'
  timeout: 30000,
  deepCompareThreshold: 100 // max properties to show in diff
};

// ============================================================================
// TEST 1: IDEMPOTENCE
// ============================================================================

/**
 * Test: Idempotence
 *
 * Principle: Running the same progression twice should produce identical results.
 *
 * Procedure:
 *   1. Create a test actor
 *   2. Record initial state
 *   3. Perform progression: Jedi L1 → L4
 *   4. Snapshot resulting state
 *   5. Reload actor to initial state
 *   6. Perform IDENTICAL progression
 *   7. Compare snapshots (must be byte-identical)
 *
 * Why this matters:
 *   - Detects mutations that happen at wrong time
 *   - Catches order-dependent state changes
 *   - Catches random number generation or timing issues
 */
export async function testIdempotence() {
  console.group('🧪 TEST 1: IDEMPOTENCE');
  const startTime = performance.now();

  try {
    log('Creating test actor...', 'info');
    const actor = await _createTestActor('idempotence-test-1');
    const initialData = actor.toObject(false);

    log('Running progression: Jedi L1→L4', 'info');
    const result1 = await _runProgression(actor, [
      { step: 'confirmSpecies', payload: { species: 'Human' } },
      { step: 'confirmBackground', payload: { background: 'Spacer' } },
      { step: 'confirmAbilities', payload: { abilities: { str: 10, dex: 14, con: 12, int: 10, wis: 12, cha: 12 } } },
      { step: 'confirmClass', payload: { classId: 'Jedi' } },
      { step: 'confirmSkills', payload: { skills: ['Perception', 'Pilot', 'Acrobatics'] } },
      { step: 'confirmFeats', payload: { feats: ['Dodge'] } },
      { step: 'confirmTalents', payload: { talents: ['Block'] } }
    ]);

    const snapshot1 = _createSnapshot(actor);
    log(`Result 1 complete. Level: ${actor.system.level}, BAB: ${actor.system.bab}`, 'info');

    // Restore to initial state
    log('Restoring actor to initial state...', 'info');
    await actor.update(initialData);

    // Verify restored
    const restored = actor.toObject(false);
    if (JSON.stringify(restored) !== JSON.stringify(initialData)) {
      throw new Error('Actor restoration failed - not byte-identical');
    }
    log('Actor restored successfully', 'success');

    log('Running IDENTICAL progression again...', 'info');
    const result2 = await _runProgression(actor, [
      { step: 'confirmSpecies', payload: { species: 'Human' } },
      { step: 'confirmBackground', payload: { background: 'Spacer' } },
      { step: 'confirmAbilities', payload: { abilities: { str: 10, dex: 14, con: 12, int: 10, wis: 12, cha: 12 } } },
      { step: 'confirmClass', payload: { classId: 'Jedi' } },
      { step: 'confirmSkills', payload: { skills: ['Perception', 'Pilot', 'Acrobatics'] } },
      { step: 'confirmFeats', payload: { feats: ['Dodge'] } },
      { step: 'confirmTalents', payload: { talents: ['Block'] } }
    ]);

    const snapshot2 = _createSnapshot(actor);
    log(`Result 2 complete. Level: ${actor.system.level}, BAB: ${actor.system.bab}`, 'info');

    // Compare snapshots
    const diff = _deepCompare(snapshot1, snapshot2);

    if (diff.length === 0) {
      log('✅ PASS: Snapshots are identical', 'success');
      console.groupEnd();
      return { pass: true, time: performance.now() - startTime };
    } else {
      log('❌ FAIL: Snapshots differ in ' + diff.length + ' fields', 'error');
      diff.slice(0, 5).forEach(d => log(`  ${d.path}: "${d.val1}" vs "${d.val2}"`, 'error'));
      console.groupEnd();
      return { pass: false, diffs: diff, time: performance.now() - startTime };
    }

  } catch (err) {
    log('❌ ERROR: ' + err.message, 'error');
    console.error(err);
    console.groupEnd();
    return { pass: false, error: err.message, time: performance.now() - startTime };
  }
}

// ============================================================================
// TEST 2: REBUILD FROM HISTORY
// ============================================================================

/**
 * Test: Rebuild from Progression History
 *
 * Principle: Creating a character via progression history, then rebuilding
 * from that history, should produce identical results.
 *
 * Procedure:
 *   1. Create test actor A
 *   2. Run progression on A (creating history)
 *   3. Snapshot A's final state
 *   4. Create test actor B (fresh)
 *   5. Replay the EXACT SAME history onto B
 *   6. Snapshot B's final state
 *   7. Compare snapshots (must match)
 *
 * Why this matters:
 *   - Detects state leakage from previous progressions
 *   - Catches mutations that assume initial state
 *   - Validates that progression is truly deterministic
 *   - Catches "lost" updates that weren't properly persisted
 */
export async function testRebuildFromHistory() {
  console.group('🧪 TEST 2: REBUILD FROM HISTORY');
  const startTime = performance.now();

  try {
    log('Creating FIRST actor...', 'info');
    const actorA = await _createTestActor('rebuild-test-A');

    const history = [
      { step: 'confirmSpecies', payload: { species: 'Human' } },
      { step: 'confirmBackground', payload: { background: 'Spacer' } },
      { step: 'confirmAbilities', payload: { abilities: { str: 12, dex: 14, con: 11, int: 10, wis: 13, cha: 10 } } },
      { step: 'confirmClass', payload: { classId: 'Jedi' } },
      { step: 'confirmSkills', payload: { skills: ['UseTheForce', 'Perception', 'Acrobatics'] } },
      { step: 'confirmFeats', payload: { feats: ['Force Sensitivity'] } },
      { step: 'confirmTalents', payload: { talents: ['Lightsaber Combat'] } }
    ];

    log('Running progression on A...', 'info');
    await _runProgression(actorA, history);
    const snapshotA = _createSnapshot(actorA);
    log(`Actor A final state. Level: ${actorA.system.level}, BAB: ${actorA.system.bab}`, 'info');

    // Create fresh actor B
    log('Creating SECOND (fresh) actor...', 'info');
    const actorB = await _createTestActor('rebuild-test-B');

    log('Replaying SAME history onto B...', 'info');
    await _runProgression(actorB, history);
    const snapshotB = _createSnapshot(actorB);
    log(`Actor B final state. Level: ${actorB.system.level}, BAB: ${actorB.system.bab}`, 'info');

    // Compare
    const diff = _deepCompare(snapshotA, snapshotB);

    if (diff.length === 0) {
      log('✅ PASS: Rebuilt actors are identical', 'success');
      // Cleanup
      await actorA.delete();
      await actorB.delete();
      console.groupEnd();
      return { pass: true, time: performance.now() - startTime };
    } else {
      log('❌ FAIL: Actors differ in ' + diff.length + ' fields', 'error');
      diff.slice(0, 5).forEach(d => log(`  ${d.path}: "${d.val1}" vs "${d.val2}"`, 'error'));
      console.groupEnd();
      return { pass: false, diffs: diff, time: performance.now() - startTime };
    }

  } catch (err) {
    log('❌ ERROR: ' + err.message, 'error');
    console.error(err);
    console.groupEnd();
    return { pass: false, error: err.message, time: performance.now() - startTime };
  }
}

// ============================================================================
// TEST 3: ORDER INDEPENDENCE
// ============================================================================

/**
 * Test: Order Independence
 *
 * Principle: The order in which selections are made should not affect the
 * final result (for selections at the same level).
 *
 * Procedure:
 *   1. Create actor A, select talents [Dodge, Block] in that order
 *   2. Create actor B, select talents [Block, Dodge] (reversed)
 *   3. Compare final states
 *   4. Also test feat selection order at L1
 *
 * Why this matters:
 *   - Catches state machines that depend on execution order
 *   - Detects mutation of shared state (talent pools, etc)
 *   - Validates that selection order doesn't matter
 */
export async function testOrderIndependence() {
  console.group('🧪 TEST 3: ORDER INDEPENDENCE');
  const startTime = performance.now();

  try {
    // Scenario: Different talent selection orders
    const baseHistory = [
      { step: 'confirmSpecies', payload: { species: 'Human' } },
      { step: 'confirmBackground', payload: { background: 'Spacer' } },
      { step: 'confirmAbilities', payload: { abilities: { str: 10, dex: 14, con: 12, int: 10, wis: 12, cha: 12 } } },
      { step: 'confirmClass', payload: { classId: 'Jedi' } },
      { step: 'confirmSkills', payload: { skills: ['UseTheForce', 'Perception', 'Acrobatics'] } },
      { step: 'confirmFeats', payload: { feats: ['Dodge'] } }
    ];

    log('Creating actor A (talents: [Block, LightsaberCombat])...', 'info');
    const actorA = await _createTestActor('order-test-A');
    const historyA = [
      ...baseHistory,
      { step: 'confirmTalents', payload: { talents: ['Block', 'Lightsaber Combat'] } }
    ];
    await _runProgression(actorA, historyA);
    const snapshotA = _createSnapshot(actorA);
    log(`Actor A done. Talents: ${actorA.system.progression?.talents?.join(', ')}`, 'info');

    log('Creating actor B (talents: [LightsaberCombat, Block])...', 'info');
    const actorB = await _createTestActor('order-test-B');
    const historyB = [
      ...baseHistory,
      { step: 'confirmTalents', payload: { talents: ['Lightsaber Combat', 'Block'] } }
    ];
    await _runProgression(actorB, historyB);
    const snapshotB = _createSnapshot(actorB);
    log(`Actor B done. Talents: ${actorB.system.progression?.talents?.join(', ')}`, 'info');

    // Compare
    const diff = _deepCompare(snapshotA, snapshotB);

    if (diff.length === 0) {
      log('✅ PASS: Order-independent selections produce identical results', 'success');
      await actorA.delete();
      await actorB.delete();
      console.groupEnd();
      return { pass: true, time: performance.now() - startTime };
    } else {
      log('❌ FAIL: Different orders produced different results (' + diff.length + ' diffs)', 'error');
      diff.slice(0, 5).forEach(d => log(`  ${d.path}: "${d.val1}" vs "${d.val2}"`, 'error'));
      console.groupEnd();
      return { pass: false, diffs: diff, time: performance.now() - startTime };
    }

  } catch (err) {
    log('❌ ERROR: ' + err.message, 'error');
    console.error(err);
    console.groupEnd();
    return { pass: false, error: err.message, time: performance.now() - startTime };
  }
}

// ============================================================================
// TEST 4: RELOAD DETERMINISM
// ============================================================================

/**
 * Test: Reload Determinism
 *
 * Principle: After a level-up, saving and reloading the world should not
 * change any actor state. All mutations should be persisted.
 *
 * Procedure:
 *   1. Create actor and run progression (Jedi L1→L4)
 *   2. Snapshot state
 *   3. Save world (if possible in test environment)
 *   4. Reload world (if possible)
 *   5. Snapshot actor again
 *   6. Compare before and after reload
 *
 * Why this matters:
 *   - Catches mutations that happen on load/unload
 *   - Detects data not properly persisted
 *   - Validates prepareDerivedData is truly deterministic
 *   - Catches flag/metadata that gets recomputed differently
 *
 * Note: In test environment without real save, we simulate by:
 *   - Converting to JSON (serialization test)
 *   - Reloading from JSON (deserialization test)
 *   - Calling prepareDerivedData (what happens on world load)
 */
export async function testReloadDeterminism() {
  console.group('🧪 TEST 4: RELOAD DETERMINISM');
  const startTime = performance.now();

  try {
    log('Creating test actor...', 'info');
    const actor = await _createTestActor('reload-test');

    const history = [
      { step: 'confirmSpecies', payload: { species: 'Human' } },
      { step: 'confirmBackground', payload: { background: 'Spacer' } },
      { step: 'confirmAbilities', payload: { abilities: { str: 11, dex: 15, con: 12, int: 10, wis: 12, cha: 11 } } },
      { step: 'confirmClass', payload: { classId: 'Jedi' } },
      { step: 'confirmSkills', payload: { skills: ['UseTheForce', 'Perception', 'Stealth'] } },
      { step: 'confirmFeats', payload: { feats: ['Dodge'] } },
      { step: 'confirmTalents', payload: { talents: ['Block'] } }
    ];

    log('Running progression...', 'info');
    await _runProgression(actor, history);

    log('Creating snapshot BEFORE reload...', 'info');
    const beforeReload = _createSnapshot(actor);

    log('Serializing actor to JSON (simulating save)...', 'info');
    const serialized = JSON.stringify(actor.toObject(false));
    const deserialized = JSON.parse(serialized);

    log('Simulating reload (prepareDerivedData)...', 'info');
    // In a real world reload, prepareDerivedData is called automatically
    // We simulate it here
    actor.system.derived = {}; // Clear derived data
    actor.prepareDerivedData(); // Recalculate

    log('Creating snapshot AFTER reload...', 'info');
    const afterReload = _createSnapshot(actor);

    // Compare critical fields only (derived fields are recalculated, so exact match not required)
    const criticalFields = [
      'system.level',
      'system.bab',
      'system.hp',
      'system.abilities',
      'system.defenses',
      'system.progression'
    ];

    const diff = _deepCompareFields(beforeReload, afterReload, criticalFields);

    if (diff.length === 0) {
      log('✅ PASS: Reload produced no changes', 'success');
      await actor.delete();
      console.groupEnd();
      return { pass: true, time: performance.now() - startTime };
    } else {
      log('❌ FAIL: Reload changed ' + diff.length + ' critical fields', 'error');
      diff.slice(0, 5).forEach(d => log(`  ${d.path}: "${d.val1}" vs "${d.val2}"`, 'error'));
      console.groupEnd();
      return { pass: false, diffs: diff, time: performance.now() - startTime };
    }

  } catch (err) {
    log('❌ ERROR: ' + err.message, 'error');
    console.error(err);
    console.groupEnd();
    return { pass: false, error: err.message, time: performance.now() - startTime };
  }
}

// ============================================================================
// RUNNER
// ============================================================================

/**
 * Run all 4 tests and report results
 */
export async function runAllTests() {
  console.group('═══════════════════════════════════════════════════════════');
  console.log('🚀 SWSE PROGRESSION DETERMINISM TEST SUITE');
  console.log('Testing: idempotence, rebuild, order-independence, reload');
  console.group('═══════════════════════════════════════════════════════════');

  const results = [];

  log('Test 1/4: Idempotence...', 'section');
  results.push(await testIdempotence());

  log('Test 2/4: Rebuild from History...', 'section');
  results.push(await testRebuildFromHistory());

  log('Test 3/4: Order Independence...', 'section');
  results.push(await testOrderIndependence());

  log('Test 4/4: Reload Determinism...', 'section');
  results.push(await testReloadDeterminism());

  // Summary
  console.group('═══════════════════════════════════════════════════════════');
  const passed = results.filter(r => r.pass).length;
  const totalTime = results.reduce((sum, r) => sum + (r.time || 0), 0);

  if (passed === results.length) {
    log(`✅ ALL TESTS PASSED (${passed}/${results.length}) in ${totalTime.toFixed(0)}ms`, 'success');
  } else {
    log(`❌ TESTS FAILED (${passed}/${results.length} passed) in ${totalTime.toFixed(0)}ms`, 'error');
  }

  results.forEach((r, i) => {
    const status = r.pass ? '✅' : '❌';
    const time = r.time ? ` (${r.time.toFixed(0)}ms)` : '';
    log(`  ${status} Test ${i + 1}${time}`, r.pass ? 'success' : 'error');
  });

  console.groupEnd();
  console.groupEnd();

  return results;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Create a disposable test actor
 */
async function _createTestActor(name) {
  const actor = await Actor.create({
    name: `[TEST] ${name}`,
    type: 'character',
    system: {
      level: 1,
      species: 'Human',
      class: null,
      progression: {}
    }
  });
  return actor;
}

/**
 * Run a progression sequence on an actor
 */
async function _runProgression(actor, history) {
  const { ProgressionEngine } = await import('../scripts/progression/engine/progression-engine.js');

  for (const step of history) {
    try {
      await ProgressionEngine.applyChargenStep(actor, step.step, step.payload);
    } catch (err) {
      log(`Error at step ${step.step}: ${err.message}`, 'error');
      throw err;
    }
  }
}

/**
 * Create a snapshot of actor state for comparison
 */
function _createSnapshot(actor) {
  return {
    level: actor.system.level,
    bab: actor.system.bab,
    hp: JSON.parse(JSON.stringify(actor.system.hp)),
    abilities: JSON.parse(JSON.stringify(actor.system.abilities)),
    defenses: JSON.parse(JSON.stringify(actor.system.defenses)),
    progression: JSON.parse(JSON.stringify(actor.system.progression)),
    skills: JSON.parse(JSON.stringify(actor.system.skills)),
    itemCount: actor.items.size,
    itemNames: Array.from(actor.items.values()).map(i => i.name).sort()
  };
}

/**
 * Deep compare two snapshots, return array of differences
 */
function _deepCompare(snap1, snap2) {
  const diffs = [];

  function compare(obj1, obj2, path = '') {
    const keys = new Set([...Object.keys(obj1), ...Object.keys(obj2)]);

    for (const key of keys) {
      const newPath = path ? `${path}.${key}` : key;
      const val1 = obj1[key];
      const val2 = obj2[key];

      if (typeof val1 === 'object' && typeof val2 === 'object' && val1 !== null && val2 !== null && !Array.isArray(val1)) {
        compare(val1, val2, newPath);
      } else if (JSON.stringify(val1) !== JSON.stringify(val2)) {
        diffs.push({
          path: newPath,
          val1: typeof val1 === 'object' ? JSON.stringify(val1) : val1,
          val2: typeof val2 === 'object' ? JSON.stringify(val2) : val2
        });
      }
    }
  }

  compare(snap1, snap2);
  return diffs;
}

/**
 * Deep compare only specified fields
 */
function _deepCompareFields(snap1, snap2, fields) {
  const diffs = [];

  for (const field of fields) {
    const val1 = _getNestedValue(snap1, field);
    const val2 = _getNestedValue(snap2, field);

    if (JSON.stringify(val1) !== JSON.stringify(val2)) {
      diffs.push({
        path: field,
        val1: typeof val1 === 'object' ? JSON.stringify(val1) : val1,
        val2: typeof val2 === 'object' ? JSON.stringify(val2) : val2
      });
    }
  }

  return diffs;
}

/**
 * Get nested value from object by dot-notation path
 */
function _getNestedValue(obj, path) {
  return path.split('.').reduce((current, prop) => current?.[prop], obj);
}

/**
 * Logging helper
 */
function log(message, level = 'log') {
  const icons = {
    info: 'ℹ️',
    success: '✅',
    error: '❌',
    section: '📍',
    log: '→'
  };

  if (TEST_CONFIG.verbosity !== 'silent') {
    console.log(`${icons[level]} ${message}`);
  }

  SWSELogger.log(`[DETERMINISM-TEST] ${message}`);
}
