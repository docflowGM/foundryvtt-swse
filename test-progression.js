/**
 * Test Script: Sample Character Through Progression Engine
 *
 * This script creates a sample character and runs it through the progression engine,
 * logging all processes and any issues encountered along the way.
 *
 * Usage: Run this in FoundryVTT's console or as a macro
 */

(async () => {
  console.log("==========================================");
  console.log("SWSE PROGRESSION ENGINE TEST");
  console.log("==========================================\n");

  const testLog = [];

  function log(message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, message, data };
    testLog.push(logEntry);

    console.log(`[${timestamp}] ${message}`);
    if (data) {
      console.log(data);
    }
  }

  function logError(message, error) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      message,
      error: error.message,
      stack: error.stack
    };
    testLog.push(logEntry);

    console.error(`[${timestamp}] ERROR: ${message}`);
    console.error(error);
  }

  try {
    // Step 1: Create a test actor
    log("STEP 1: Creating test actor");

    const actorData = {
      name: "Test Character - Progression Engine",
      type: "character",
      system: {
        progression: {
          species: null,
          background: null,
          abilities: {},
          classLevels: [],
          feats: [],
          talents: [],
          skills: []
        }
      }
    };

    log("Creating actor with data:", actorData);
    const actor = await Actor.create(actorData);

    if (!actor) {
      throw new Error("Failed to create actor");
    }

    log(`✓ Actor created successfully: ${actor.id}`, {
      name: actor.name,
      id: actor.id,
      type: actor.type
    });

    // Step 2: Initialize the progression engine
    log("\nSTEP 2: Initializing Progression Engine");

    // Import the engine (it should be available globally, but let's check)
    if (typeof SWSEProgressionEngine === 'undefined') {
      throw new Error("SWSEProgressionEngine is not available. The system may not be properly initialized.");
    }

    const engine = new SWSEProgressionEngine(actor, "chargen");
    log("✓ Engine initialized", {
      mode: engine.mode,
      currentStep: engine.current,
      completedSteps: engine.completedSteps
    });

    // Step 3: Get available steps
    log("\nSTEP 3: Analyzing available steps");
    const steps = engine.getSteps();
    log(`Found ${steps.length} steps:`, steps.map(s => ({
      id: s.id,
      label: s.label,
      locked: s.locked,
      completed: s.completed,
      current: s.current
    })));

    // Step 4: Apply Species
    log("\nSTEP 4: Selecting Species (Human)");
    try {
      await engine.doAction("confirmSpecies", { speciesId: "Human" });
      log("✓ Species selection successful");
      log("Engine state after species:", {
        completedSteps: engine.completedSteps,
        currentStep: engine.current,
        data: engine.data
      });
    } catch (error) {
      logError("Species selection failed", error);
    }

    // Step 5: Apply Background
    log("\nSTEP 5: Selecting Background (Spacer)");
    try {
      await engine.doAction("confirmBackground", { backgroundId: "Spacer" });
      log("✓ Background selection successful");
      log("Engine state after background:", {
        completedSteps: engine.completedSteps,
        currentStep: engine.current,
        data: engine.data
      });
    } catch (error) {
      logError("Background selection failed", error);
    }

    // Step 6: Set Abilities
    log("\nSTEP 6: Setting Ability Scores (Point Buy)");
    try {
      const abilities = {
        str: { value: 14 },
        dex: { value: 13 },
        con: { value: 12 },
        int: { value: 10 },
        wis: { value: 8 },
        cha: { value: 8 }
      };

      await engine.doAction("confirmAbilities", {
        method: "pointBuy",
        values: abilities
      });
      log("✓ Abilities set successfully");
      log("Engine state after abilities:", {
        completedSteps: engine.completedSteps,
        currentStep: engine.current,
        data: engine.data
      });
      log("Actor abilities:", actor.system.abilities);
    } catch (error) {
      logError("Ability score assignment failed", error);
    }

    // Step 7: Select Class
    log("\nSTEP 7: Selecting Class (Soldier)");
    try {
      await engine.doAction("confirmClass", { classId: "Soldier" });
      log("✓ Class selection successful");
      log("Engine state after class:", {
        completedSteps: engine.completedSteps,
        currentStep: engine.current,
        data: engine.data
      });
      log("Actor class levels:", actor.system.progression.classLevels);
    } catch (error) {
      logError("Class selection failed", error);
    }

    // Step 8: Allocate Skills
    log("\nSTEP 8: Allocating Skills");
    try {
      const skills = ["Pilot", "Mechanics", "Perception", "Initiative"];

      await engine.doAction("confirmSkills", { skills });
      log("✓ Skills allocated successfully");
      log("Engine state after skills:", {
        completedSteps: engine.completedSteps,
        currentStep: engine.current,
        data: engine.data
      });
      log("Actor skills:", actor.system.progression.skills);
    } catch (error) {
      logError("Skill allocation failed", error);
    }

    // Step 9: Select Feats
    log("\nSTEP 9: Selecting Feats");
    try {
      const feats = ["Weapon Proficiency (Pistols)", "Armor Proficiency (Light)"];

      await engine.doAction("confirmFeats", { featIds: feats });
      log("✓ Feats selected successfully");
      log("Engine state after feats:", {
        completedSteps: engine.completedSteps,
        currentStep: engine.current,
        data: engine.data
      });
      log("Actor feats:", actor.system.progression.feats);
    } catch (error) {
      logError("Feat selection failed", error);
    }

    // Step 10: Select Talents
    log("\nSTEP 10: Selecting Talents");
    try {
      const talents = ["Quick Draw"];

      await engine.doAction("confirmTalents", { talentIds: talents });
      log("✓ Talents selected successfully");
      log("Engine state after talents:", {
        completedSteps: engine.completedSteps,
        currentStep: engine.current,
        data: engine.data
      });
      log("Actor talents:", actor.system.progression.talents);
    } catch (error) {
      logError("Talent selection failed", error);
    }

    // Step 11: Finalize
    log("\nSTEP 11: Finalizing Character");
    try {
      await engine.finalize();
      log("✓ Character finalized successfully");
      log("Final engine state:", {
        completedSteps: engine.completedSteps,
        currentStep: engine.current,
        mode: engine.mode
      });
    } catch (error) {
      logError("Finalization failed", error);
    }

    // Step 12: Inspect final actor state
    log("\nSTEP 12: Final Actor Inspection");
    log("Final actor state:", {
      name: actor.name,
      level: actor.system.level,
      progression: actor.system.progression,
      abilities: actor.system.abilities,
      hp: actor.system.attributes?.hp,
      defenses: actor.system.defenses
    });

    // Step 13: Check for hooks being called
    log("\nSTEP 13: Verifying Hook System");
    log("Checking if progression hooks were triggered...");
    log("Note: Hook verification requires manual inspection of console output");

    // Summary
    log("\n==========================================");
    log("TEST SUMMARY");
    log("==========================================");

    const errors = testLog.filter(entry => entry.error);
    const successes = testLog.filter(entry => entry.message.includes("✓"));

    log(`Total steps: ${testLog.length}`);
    log(`Successful operations: ${successes.length}`);
    log(`Errors encountered: ${errors.length}`);

    if (errors.length > 0) {
      log("\nERRORS ENCOUNTERED:");
      errors.forEach((err, idx) => {
        log(`  ${idx + 1}. ${err.message}: ${err.error}`);
      });
    } else {
      log("\n✓ ALL TESTS PASSED - No errors encountered!");
    }

    // Save test log to actor flags
    await actor.setFlag('swse', 'progressionTest', {
      timestamp: new Date().toISOString(),
      log: testLog,
      summary: {
        totalSteps: testLog.length,
        successes: successes.length,
        errors: errors.length
      }
    });

    log("\nTest log saved to actor flags: swse.progressionTest");
    log(`Actor ID: ${actor.id}`);
    log("\n==========================================");
    log("TEST COMPLETE");
    log("==========================================");

    return {
      success: errors.length === 0,
      actor,
      engine,
      log: testLog,
      summary: {
        totalSteps: testLog.length,
        successes: successes.length,
        errors: errors.length
      }
    };

  } catch (error) {
    logError("CRITICAL ERROR - Test aborted", error);

    log("\n==========================================");
    log("TEST FAILED");
    log("==========================================");

    return {
      success: false,
      error: error.message,
      stack: error.stack,
      log: testLog
    };
  }
})();
