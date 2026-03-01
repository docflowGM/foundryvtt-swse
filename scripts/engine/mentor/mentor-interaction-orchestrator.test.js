/**
 * MENTOR INTERACTION ORCHESTRATOR - Test Suite
 *
 * Tests three interaction modes and ensures:
 * 1. Selection mode returns same format as before (no regression)
 * 2. Reflection mode produces valid BuildAnalysisEngine output
 * 3. Hybrid mode combines both correctly
 * 4. Determinism: same input → same output
 * 5. No mutation of actor
 * 6. All mentors respond correctly
 */

import { MentorInteractionOrchestrator } from "/systems/foundryvtt-swse/scripts/engine/mentor/mentor-interaction-orchestrator.js";

/**
 * TEST HARNESS
 * Run with: node test-mentor-orchestrator.js
 */

async function runTests() {
  const results = {
    passed: 0,
    failed: 0,
    errors: []
  };

  // Test 1: Valid context validation
  try {
    await testContextValidation(results);
  } catch (e) {
    results.errors.push(`Context validation: ${e.message}`);
    results.failed++;
  }

  // Test 2: Selection mode with valid suggestion
  try {
    await testSelectionMode(results);
  } catch (e) {
    results.errors.push(`Selection mode: ${e.message}`);
    results.failed++;
  }

  // Test 3: Reflection mode
  try {
    await testReflectionMode(results);
  } catch (e) {
    results.errors.push(`Reflection mode: ${e.message}`);
    results.failed++;
  }

  // Test 4: Hybrid mode
  try {
    await testHybridMode(results);
  } catch (e) {
    results.errors.push(`Hybrid mode: ${e.message}`);
    results.failed++;
  }

  // Test 5: Determinism
  try {
    await testDeterminism(results);
  } catch (e) {
    results.errors.push(`Determinism: ${e.message}`);
    results.failed++;
  }

  // Test 6: No actor mutation
  try {
    await testNoActorMutation(results);
  } catch (e) {
    results.errors.push(`No mutation: ${e.message}`);
    results.failed++;
  }

  // Test 7: Multiple mentors
  try {
    await testMultipleMentors(results);
  } catch (e) {
    results.errors.push(`Multiple mentors: ${e.message}`);
    results.failed++;
  }

  // Print results
  console.log("\n=== MENTOR INTERACTION ORCHESTRATOR TEST RESULTS ===\n");
  console.log(`Passed: ${results.passed}`);
  console.log(`Failed: ${results.failed}`);

  if (results.errors.length > 0) {
    console.log("\nErrors:");
    results.errors.forEach(err => console.log(`  - ${err}`));
  }

  process.exit(results.failed > 0 ? 1 : 0);
}

// ──────────────────────────────────────────────────────────────
// TEST UTILITIES
// ──────────────────────────────────────────────────────────────

function createMockActor() {
  return {
    id: "actor-001",
    name: "Test Character",
    type: "character",
    system: {
      swse: {},
      archetypeId: null
    },
    items: [],
    async getEmbeddedDocument() {
      return null;
    },
    async getEmbeddedCollection() {
      return [];
    }
  };
}

function createMockSuggestion(tier = 3, reasonCode = "CLASS_SYNERGY") {
  return {
    tier: tier,
    reasonCode: reasonCode,
    sourceId: "test-source",
    confidence: 0.6,
    reasonSignals: [],
    reason: {
      tierAssignedBy: reasonCode,
      matchingRules: [],
      atoms: ["synergy_present"]
    }
  };
}

function createMockItem() {
  return {
    id: "item-001",
    name: "Resilience",
    type: "feat"
  };
}

function assertTruthy(value, message) {
  if (!value) throw new Error(message);
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${expected}, got ${actual}`);
  }
}

function assertExists(value, message) {
  if (value === undefined || value === null) {
    throw new Error(message);
  }
}

function recordPass(results, testName) {
  console.log(`✓ ${testName}`);
  results.passed++;
}

function recordFail(results, testName, error) {
  console.log(`✗ ${testName}`);
  results.failed++;
  results.errors.push(`${testName}: ${error.message}`);
}

// ──────────────────────────────────────────────────────────────
// TESTS
// ──────────────────────────────────────────────────────────────

async function testContextValidation(results) {
  // Missing actor
  try {
    await MentorInteractionOrchestrator.handle({
      mode: "selection",
      mentorId: "miraj"
    });
    recordPass(results, "Handles missing actor gracefully");
  } catch (e) {
    recordFail(results, "Handles missing actor gracefully", e);
  }

  // Invalid mode
  try {
    const actor = createMockActor();
    const result = await MentorInteractionOrchestrator.handle({
      mode: "invalid",
      actor: actor,
      mentorId: "miraj"
    });
    assertExists(result.error, "Should include error in result");
    recordPass(results, "Rejects invalid mode");
  } catch (e) {
    recordFail(results, "Rejects invalid mode", e);
  }

  // Missing mentorId
  try {
    const actor = createMockActor();
    const result = await MentorInteractionOrchestrator.handle({
      mode: "selection",
      actor: actor
    });
    assertExists(result.error, "Should include error in result");
    recordPass(results, "Requires mentorId");
  } catch (e) {
    recordFail(results, "Requires mentorId", e);
  }
}

async function testSelectionMode(results) {
  const actor = createMockActor();
  const suggestion = createMockSuggestion(4, "CHAIN_CONTINUATION");
  const item = createMockItem();

  try {
    const result = await MentorInteractionOrchestrator.handle({
      mode: "selection",
      actor: actor,
      mentorId: "lead",
      suggestion: suggestion,
      item: item
    });

    assertTruthy(result.mode === "selection", "Mode should be selection");
    assertExists(result.primaryAdvice, "Should have primaryAdvice");
    assertTruthy(result.deterministic === true, "Should be deterministic");
    assertExists(result.suggestionTier, "Should include suggestionTier");

    recordPass(results, "Selection mode returns correct structure");
  } catch (e) {
    recordFail(results, "Selection mode returns correct structure", e);
  }

  // Test selection mode without suggestion
  try {
    const resultNoSuggestion = await MentorInteractionOrchestrator.handle({
      mode: "selection",
      actor: actor,
      mentorId: "miraj"
    });

    assertTruthy(resultNoSuggestion.mode === "selection", "Mode should be selection");
    assertExists(resultNoSuggestion.primaryAdvice, "Should have primaryAdvice even without suggestion");

    recordPass(results, "Selection mode handles missing suggestion");
  } catch (e) {
    recordFail(results, "Selection mode handles missing suggestion", e);
  }
}

async function testReflectionMode(results) {
  const actor = createMockActor();

  try {
    const result = await MentorInteractionOrchestrator.handle({
      mode: "reflection",
      actor: actor,
      mentorId: "breach"
    });

    assertTruthy(result.mode === "reflection", "Mode should be reflection");
    assertExists(result.primaryAdvice, "Should have primaryAdvice");
    assertTruthy(result.deterministic === true, "Should be deterministic");
    assertExists(result.metrics, "Should include metrics");

    recordPass(results, "Reflection mode returns correct structure");
  } catch (e) {
    recordFail(results, "Reflection mode returns correct structure", e);
  }

  // Verify metrics structure
  try {
    const result = await MentorInteractionOrchestrator.handle({
      mode: "reflection",
      actor: actor,
      mentorId: "lead"
    });

    assertExists(result.metrics.coherenceRating, "Should include coherenceRating");
    assertExists(result.metrics.buildBalance, "Should include buildBalance");
    assertExists(result.metrics.specialization, "Should include specialization");

    recordPass(results, "Reflection mode includes valid metrics");
  } catch (e) {
    recordFail(results, "Reflection mode includes valid metrics", e);
  }
}

async function testHybridMode(results) {
  const actor = createMockActor();
  const suggestion = createMockSuggestion(5, "META_SYNERGY");
  const item = createMockItem();

  try {
    const result = await MentorInteractionOrchestrator.handle({
      mode: "hybrid",
      actor: actor,
      mentorId: "axiom",
      suggestion: suggestion,
      item: item
    });

    assertTruthy(result.mode === "hybrid", "Mode should be hybrid");
    assertExists(result.primaryAdvice, "Should have primaryAdvice");
    assertTruthy(result.deterministic === true, "Should be deterministic");
    assertEqual(result.suggestedItem, "Resilience", "Should include suggested item");

    recordPass(results, "Hybrid mode returns correct structure");
  } catch (e) {
    recordFail(results, "Hybrid mode returns correct structure", e);
  }

  // Verify hybrid includes both layers when appropriate
  try {
    const result = await MentorInteractionOrchestrator.handle({
      mode: "hybrid",
      actor: actor,
      mentorId: "lead",
      suggestion: suggestion,
      item: item
    });

    // Should have either primaryAdvice or strategicContext
    assertTruthy(
      result.primaryAdvice || result.strategicContext,
      "Should have advice at some level"
    );

    recordPass(results, "Hybrid mode merges layers correctly");
  } catch (e) {
    recordFail(results, "Hybrid mode merges layers correctly", e);
  }
}

async function testDeterminism(results) {
  const actor = createMockActor();
  const suggestion = createMockSuggestion(3, "SKILL_PREREQ_MATCH");

  try {
    // Call twice with identical input
    const result1 = await MentorInteractionOrchestrator.handle({
      mode: "selection",
      actor: actor,
      mentorId: "lead",
      suggestion: suggestion
    });

    const result2 = await MentorInteractionOrchestrator.handle({
      mode: "selection",
      actor: actor,
      mentorId: "lead",
      suggestion: suggestion
    });

    assertEqual(
      result1.primaryAdvice,
      result2.primaryAdvice,
      "Same input should produce same output"
    );

    recordPass(results, "Selection mode is deterministic");
  } catch (e) {
    recordFail(results, "Selection mode is deterministic", e);
  }

  // Test reflection mode determinism
  try {
    const result1 = await MentorInteractionOrchestrator.handle({
      mode: "reflection",
      actor: actor,
      mentorId: "miraj"
    });

    const result2 = await MentorInteractionOrchestrator.handle({
      mode: "reflection",
      actor: actor,
      mentorId: "miraj"
    });

    assertEqual(
      result1.metrics.coherenceRating,
      result2.metrics.coherenceRating,
      "Same actor should produce same metrics"
    );

    recordPass(results, "Reflection mode is deterministic");
  } catch (e) {
    recordFail(results, "Reflection mode is deterministic", e);
  }
}

async function testNoActorMutation(results) {
  const actor = createMockActor();
  const originalJSON = JSON.stringify(actor);

  try {
    await MentorInteractionOrchestrator.handle({
      mode: "selection",
      actor: actor,
      mentorId: "lead",
      suggestion: createMockSuggestion()
    });

    await MentorInteractionOrchestrator.handle({
      mode: "reflection",
      actor: actor,
      mentorId: "breach"
    });

    const afterJSON = JSON.stringify(actor);
    assertEqual(originalJSON, afterJSON, "Actor should not be mutated");

    recordPass(results, "No actor mutation in selection or reflection");
  } catch (e) {
    recordFail(results, "No actor mutation in selection or reflection", e);
  }
}

async function testMultipleMentors(results) {
  const actor = createMockActor();
  const suggestion = createMockSuggestion(3, "ABILITY_PREREQ_MATCH");
  const mentors = ["miraj", "lead", "breach"];

  try {
    for (const mentorId of mentors) {
      const result = await MentorInteractionOrchestrator.handle({
        mode: "selection",
        actor: actor,
        mentorId: mentorId,
        suggestion: suggestion
      });

      assertExists(result.primaryAdvice, `Mentor ${mentorId} should respond`);
    }

    recordPass(results, "All mentors respond in selection mode");
  } catch (e) {
    recordFail(results, "All mentors respond in selection mode", e);
  }

  try {
    for (const mentorId of mentors) {
      const result = await MentorInteractionOrchestrator.handle({
        mode: "reflection",
        actor: actor,
        mentorId: mentorId
      });

      assertExists(result.primaryAdvice, `Mentor ${mentorId} should respond in reflection`);
    }

    recordPass(results, "All mentors respond in reflection mode");
  } catch (e) {
    recordFail(results, "All mentors respond in reflection mode", e);
  }
}

// ──────────────────────────────────────────────────────────────
// RUN TESTS
// ──────────────────────────────────────────────────────────────

if (typeof module !== 'undefined' && module.main === require.main) {
  runTests().catch(error => {
    console.error("Test runner error:", error);
    process.exit(1);
  });
}

export { MentorInteractionOrchestrator };
