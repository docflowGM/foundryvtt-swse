/**
 * Condition Penalty Regression Test
 *
 * Verifies that condition track penalties are correctly applied to attack rolls.
 * Regression guard to prevent condition penalty source mismatch bugs.
 *
 * Usage (in browser console):
 * SWSE.debug.testConditionPenalty(actor)
 */

export async function testConditionPenalty(actor) {
  if (!actor) {
    console.error('[SWSE] testConditionPenalty: no actor provided');
    return false;
  }

  console.log(`[SWSE] Testing condition penalty for ${actor.name}...`);

  try {
    // Save original state
    const originalStep = actor.system?.conditionTrack?.current ?? 0;

    // Test cases: step → expected penalty
    const testCases = [
      { step: 0, expectedPenalty: 0 },
      { step: 1, expectedPenalty: -1 },
      { step: 2, expectedPenalty: -2 },
      { step: 3, expectedPenalty: -5 },
      { step: 4, expectedPenalty: -10 },
      { step: 5, expectedPenalty: 0 }  // Helpless = no numeric penalty
    ];

    let passed = 0;
    let failed = 0;

    for (const testCase of testCases) {
      // Set condition track to test step
      const { ActorEngine } = await import("/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js");
      await ActorEngine.updateActor(actor, {
        "system.conditionTrack.current": testCase.step
      });

      // Get the derived penalty (authoritative source)
      const derivedPenalty = actor.system?.derived?.damage?.conditionPenalty;

      // Verify it matches expected
      if (derivedPenalty === testCase.expectedPenalty) {
        console.log(`✓ Step ${testCase.step}: penalty = ${derivedPenalty} (correct)`);
        passed++;
      } else {
        console.error(
          `✗ Step ${testCase.step}: expected penalty ${testCase.expectedPenalty}, ` +
          `got ${derivedPenalty}`
        );
        failed++;
      }
    }

    // Restore original state
    await ActorEngine.updateActor(actor, {
      "system.conditionTrack.current": originalStep
    });

    // Report results
    console.log(`\n[SWSE] Condition Penalty Test Results: ${passed}/${testCases.length} passed`);

    if (failed === 0) {
      console.log('✓ All condition penalty tests PASSED');
      return true;
    } else {
      console.error(`✗ ${failed} test(s) FAILED`);
      return false;
    }
  } catch (err) {
    console.error('[SWSE] Condition penalty test error:', err);
    return false;
  }
}

export default testConditionPenalty;
