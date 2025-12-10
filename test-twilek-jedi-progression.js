/**
 * Test Script: Twi'lek Jedi Character Progression to Level 8
 *
 * This script creates a Twi'lek Jedi and levels them up to level 8,
 * taking Jedi levels 1-6, then Jedi Knight levels 7-8.
 * It monitors and logs all issues encountered during the progression.
 *
 * Usage: Run this in FoundryVTT's console or as a macro
 */

(async () => {
  console.log("==========================================");
  console.log("TWIL'EK JEDI PROGRESSION TEST");
  console.log("==========================================\n");

  const testLog = [];
  const issues = [];

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
    issues.push({ step: message, error: error.message, stack: error.stack });

    console.error(`[${timestamp}] ERROR: ${message}`);
    console.error(error);
  }

  function logIssue(title, description, severity = "medium") {
    const issue = { title, description, severity, timestamp: new Date().toISOString() };
    issues.push(issue);
    console.warn(`⚠️  ISSUE [${severity.toUpperCase()}]: ${title}`);
    console.warn(`    ${description}`);
  }

  try {
    // ===========================================
    // PHASE 1: CHARACTER CREATION
    // ===========================================
    log("\n========== PHASE 1: CHARACTER CREATION ==========\n");

    // Step 1: Create a test actor
    log("STEP 1: Creating Twi'lek Jedi test actor");

    const actorData = {
      name: "Lyn'ara Secura - Test Twi'lek Jedi",
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
    log("\nSTEP 2: Initializing Progression Engine for Character Generation");

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

    // Step 3: Apply Species - Twi'lek
    log("\nSTEP 3: Selecting Species (Twi'lek)");
    log("Twi'lek bonuses: +2 DEX, -2 CHA");
    try {
      await engine.doAction("confirmSpecies", {
        speciesId: "Twi'lek"
      });
      log("✓ Species selection successful");
      log("Actor racial ability mods:", {
        str: actor.system.abilities.str?.racial || 0,
        dex: actor.system.abilities.dex?.racial || 0,
        con: actor.system.abilities.con?.racial || 0,
        int: actor.system.abilities.int?.racial || 0,
        wis: actor.system.abilities.wis?.racial || 0,
        cha: actor.system.abilities.cha?.racial || 0
      });
    } catch (error) {
      logError("Species selection failed", error);
    }

    // Step 4: Apply Background
    log("\nSTEP 4: Selecting Background (Outer Rim Colonist)");
    try {
      await engine.doAction("confirmBackground", { backgroundId: "Outer Rim Colonist" });
      log("✓ Background selection successful");
    } catch (error) {
      logError("Background selection failed", error);
    }

    // Step 5: Set Abilities
    log("\nSTEP 5: Setting Ability Scores (Point Buy)");
    log("Target: High WIS and DEX for Jedi, moderate CHA for Force powers");
    try {
      const abilities = {
        str: { value: 10 },  // Average
        dex: { value: 14 },  // +2 racial = 16 total
        con: { value: 12 },  // Good HP
        int: { value: 10 },  // Average
        wis: { value: 15 },  // Primary for Jedi
        cha: { value: 13 }   // -2 racial = 11 total
      };

      await engine.doAction("confirmAbilities", {
        method: "pointBuy",
        values: abilities
      });
      log("✓ Abilities set successfully");
      log("Actor abilities (with racial mods):", {
        str: actor.system.abilities.str?.total || actor.system.abilities.str?.value,
        dex: actor.system.abilities.dex?.total || actor.system.abilities.dex?.value,
        con: actor.system.abilities.con?.total || actor.system.abilities.con?.value,
        int: actor.system.abilities.int?.total || actor.system.abilities.int?.value,
        wis: actor.system.abilities.wis?.total || actor.system.abilities.wis?.value,
        cha: actor.system.abilities.cha?.total || actor.system.abilities.cha?.value
      });
    } catch (error) {
      logError("Ability score assignment failed", error);
    }

    // Step 6: Select Class
    log("\nSTEP 6: Selecting Class (Jedi)");
    try {
      await engine.doAction("confirmClass", { classId: "Jedi" });
      log("✓ Class selection successful");
      log("Actor class levels:", actor.system.progression.classLevels);
      log("Starting feats (automatic):", actor.system.progression.startingFeats);
    } catch (error) {
      logError("Class selection failed", error);
    }

    // Step 7: Allocate Skills
    log("\nSTEP 7: Selecting Skill Trainings");
    log("SWSE uses TRAININGS (not ranks): Pick skills to be 'trained' for +5 bonus");
    try {
      // Jedi gets 4 + INT mod = 4 + 0 = 4 TRAININGS at character creation
      // Background (Outer Rim Colonist) gives 2 automatic trainings
      // Select 4 class trainings:
      const skills = [
        "Acrobatics",
        "Perception",
        "Use the Force",
        "Initiative"
      ];

      await engine.doAction("confirmSkills", { skills });
      log("✓ Skill trainings selected successfully");
      log("Trained skills:", actor.system.progression.trainedSkills);
      log("Background trainings:", actor.system.progression.backgroundTrainedSkills);
    } catch (error) {
      logError("Skill allocation failed", error);
    }

    // Step 8: Select Feats
    log("\nSTEP 8: Selecting Feats");
    try {
      // Twi'lek gets 1 feat at level 1 (no bonus feat like humans)
      // Jedi class grants: Force Sensitivity, Weapon Proficiency (Lightsabers), Weapon Proficiency (Simple)
      const feats = ["Weapon Finesse"];

      await engine.doAction("confirmFeats", { featIds: feats });
      log("✓ Feats selected successfully");
      log("Actor feats (chosen):", actor.system.progression.feats);
      log("Actor feats (starting/automatic):", actor.system.progression.startingFeats);
    } catch (error) {
      logError("Feat selection failed", error);
    }

    // Step 9: Select Talents
    log("\nSTEP 9: Selecting Talents");
    try {
      // All classes get 1 talent at level 1
      const talents = ["Deflect"];

      await engine.doAction("confirmTalents", { talentIds: talents });
      log("✓ Talents selected successfully");
      log("Actor talents:", actor.system.progression.talents);
    } catch (error) {
      logError("Talent selection failed", error);
    }

    // Step 10: Finalize Character Creation
    log("\nSTEP 10: Finalizing Level 1 Character");
    try {
      await engine.finalize();
      log("✓ Character finalized successfully");

      // Check finalization results
      log("Character after finalization:", {
        level: actor.system.level,
        hp: actor.system.hp,
        bab: actor.system.bab,
        defenses: actor.system.defenses,
        items: actor.items.map(i => ({ name: i.name, type: i.type }))
      });
    } catch (error) {
      logError("Finalization failed", error);
    }

    // ===========================================
    // PHASE 2: LEVEL UP 2-6 (JEDI)
    // ===========================================
    log("\n========== PHASE 2: LEVEL UP 2-6 (JEDI) ==========\n");

    // Level up function
    async function levelUpJedi(targetLevel) {
      log(`\n--- Leveling up to ${targetLevel} (Jedi) ---`);

      try {
        // Create new engine for level up
        const lvlEngine = new SWSEProgressionEngine(actor, "levelup");

        // Select class
        await lvlEngine.doAction("confirmClass", { classId: "Jedi" });
        log(`✓ Class selected: Jedi`);

        // Roll HP (we'll take average for consistency)
        const hpValue = 4; // Average of d6 (rounded up)
        await lvlEngine.doAction("rollHP", { roll: "average", value: hpValue });
        log(`✓ HP rolled: ${hpValue}`);

        // Skills: No new trainings at level-up (SWSE only grants trainings at chargen)
        // Just skip the skills step
        await lvlEngine.completeStep("skills");
        log(`✓ Skills step completed (no new trainings at level-up)`);

        // Feats (every 3 levels: 3, 6, 9, etc.)
        if (targetLevel % 3 === 0) {
          const featChoices = {
            3: ["Force Training"],
            6: ["Skill Focus (Use the Force)"],
            9: ["Force Training"]
          };
          const feats = featChoices[targetLevel] || [];
          if (feats.length > 0) {
            await lvlEngine.doAction("confirmFeats", { featIds: feats });
            log(`✓ Feats selected: ${feats.join(", ")}`);
          }
        } else {
          // Skip feats step
          await lvlEngine.completeStep("feats");
        }

        // Talents (every odd level: 1, 3, 5, 7, etc.)
        if (targetLevel % 2 === 1) {
          const talentChoices = {
            3: ["Block"],
            5: ["Redirect Shot"],
            7: ["Ataru"]
          };
          const talents = talentChoices[targetLevel] || [];
          if (talents.length > 0) {
            await lvlEngine.doAction("confirmTalents", { talentIds: talents });
            log(`✓ Talents selected: ${talents.join(", ")}`);
          }
        } else {
          // Skip talents step
          await lvlEngine.completeStep("talents");
        }

        // Ability increase (every 4 levels: 4, 8, 12, etc.)
        if (targetLevel % 4 === 0) {
          await lvlEngine.doAction("increaseAbility", { ability: "wis" });
          log(`✓ Ability increased: WIS`);
        } else {
          // Skip abilities step
          await lvlEngine.completeStep("abilities");
        }

        // Finalize
        await lvlEngine.finalize();
        log(`✓ Level ${targetLevel} finalized`);

        // Log current state
        log(`Character state at level ${targetLevel}:`, {
          level: actor.system.level,
          classLevels: actor.system.progression.classLevels,
          hp: actor.system.hp?.max,
          bab: actor.system.bab
        });

      } catch (error) {
        logError(`Level ${targetLevel} progression failed`, error);
      }
    }

    // Level up 2-6
    for (let level = 2; level <= 6; level++) {
      await levelUpJedi(level);
    }

    // ===========================================
    // PHASE 3: LEVEL UP 7-8 (JEDI KNIGHT)
    // ===========================================
    log("\n========== PHASE 3: LEVEL UP 7-8 (JEDI KNIGHT) ==========\n");

    // Check prerequisites for Jedi Knight
    log("\nChecking Jedi Knight Prerequisites:");
    log("Required: BAB +7, Trained in Use the Force, Force Sensitivity, Weapon Proficiency (Lightsabers)");

    const currentBAB = actor.system.bab || 0;
    const hasForceSkill = actor.system.progression.skills.some(s =>
      (typeof s === 'string' ? s : s.key) === "Use the Force"
    );
    const hasForceFeats = actor.system.progression.startingFeats?.includes("Force Sensitivity");
    const hasLightsaberProf = actor.system.progression.startingFeats?.includes("Weapon Proficiency (Lightsabers)");

    log("Prerequisites check:", {
      bab: currentBAB,
      needsBAB7: currentBAB >= 7,
      hasForceSkill,
      hasForceSensitivity: hasForceFeats,
      hasLightsaberProf
    });

    if (currentBAB < 7) {
      logIssue(
        "BAB Prerequisite Not Met",
        `Character has BAB +${currentBAB}, but Jedi Knight requires BAB +7. Jedi class has medium BAB (+3/4 per level), so at level 6 should have BAB +4 or +5.`,
        "high"
      );
    }

    // Level up to 7 and 8 with Jedi Knight
    async function levelUpJediKnight(targetLevel) {
      log(`\n--- Leveling up to ${targetLevel} (Jedi Knight) ---`);

      try {
        // Create new engine for level up
        const lvlEngine = new SWSEProgressionEngine(actor, "levelup");

        // Select class - JEDI KNIGHT (prestige class)
        log("Attempting to select Jedi Knight prestige class...");
        await lvlEngine.doAction("confirmClass", { classId: "Jedi Knight" });
        log(`✓ Class selected: Jedi Knight`);

        // Roll HP - Jedi Knight uses d10
        const hpValue = 6; // Average of d10 (rounded up)
        await lvlEngine.doAction("rollHP", { roll: "average", value: hpValue });
        log(`✓ HP rolled: ${hpValue}`);

        // Skills: No new trainings at level-up (SWSE only grants trainings at chargen)
        // Just skip the skills step
        await lvlEngine.completeStep("skills");
        log(`✓ Skills step completed (no new trainings at level-up)`);

        // Feats (every 3 levels overall: 3, 6, 9)
        if (targetLevel % 3 === 0) {
          const feats = ["Improved Defenses"];
          await lvlEngine.doAction("confirmFeats", { featIds: feats });
          log(`✓ Feats selected: ${feats.join(", ")}`);
        } else {
          await lvlEngine.completeStep("feats");
        }

        // Talents (every odd level: 7, 9, 11)
        if (targetLevel % 2 === 1) {
          const talents = ["Soresu"];
          await lvlEngine.doAction("confirmTalents", { talentIds: talents });
          log(`✓ Talents selected: ${talents.join(", ")}`);
        } else {
          await lvlEngine.completeStep("talents");
        }

        // Ability increase (every 4 levels: 4, 8, 12)
        if (targetLevel % 4 === 0) {
          await lvlEngine.doAction("increaseAbility", { ability: "wis" });
          log(`✓ Ability increased: WIS`);
        } else {
          await lvlEngine.completeStep("abilities");
        }

        // Finalize
        await lvlEngine.finalize();
        log(`✓ Level ${targetLevel} finalized`);

        // Log current state
        log(`Character state at level ${targetLevel}:`, {
          level: actor.system.level,
          classLevels: actor.system.progression.classLevels,
          hp: actor.system.hp?.max,
          bab: actor.system.bab,
          defenses: actor.system.defenses
        });

      } catch (error) {
        logError(`Level ${targetLevel} progression (Jedi Knight) failed`, error);
      }
    }

    // Level up to 7 and 8
    await levelUpJediKnight(7);
    await levelUpJediKnight(8);

    // ===========================================
    // PHASE 4: VALIDATION & ANALYSIS
    // ===========================================
    log("\n========== PHASE 4: VALIDATION & ANALYSIS ==========\n");

    log("Final Character State:");
    log("Basic Info:", {
      name: actor.name,
      level: actor.system.level,
      species: actor.system.progression.species,
      background: actor.system.progression.background
    });

    log("Class Levels:", actor.system.progression.classLevels);

    log("Abilities:", {
      str: actor.system.abilities.str,
      dex: actor.system.abilities.dex,
      con: actor.system.abilities.con,
      int: actor.system.abilities.int,
      wis: actor.system.abilities.wis,
      cha: actor.system.abilities.cha
    });

    log("Combat Stats:", {
      hp: actor.system.hp,
      bab: actor.system.bab,
      fortitude: actor.system.defenses?.fortitude,
      reflex: actor.system.defenses?.reflex,
      will: actor.system.defenses?.will
    });

    log("Skills:", actor.system.progression.skills);
    log("Feats (chosen):", actor.system.progression.feats);
    log("Feats (starting):", actor.system.progression.startingFeats);
    log("Talents:", actor.system.progression.talents);
    log("Items:", actor.items.map(i => ({ name: i.name, type: i.type })));

    // Expected values validation
    log("\n--- EXPECTED VALUES VALIDATION ---");

    // Calculate expected BAB
    // 6 levels Jedi (medium BAB = 3/4): 6 * 0.75 = 4.5 → 4 (floored)
    // 2 levels Jedi Knight (high BAB = 1/1): 2 * 1 = 2
    // Total expected: 4 + 2 = 6
    const expectedBAB = 6;
    const actualBAB = actor.system.bab || 0;

    if (actualBAB !== expectedBAB) {
      logIssue(
        "BAB Calculation Error",
        `Expected BAB ${expectedBAB} (6 Jedi levels = +4, 2 Jedi Knight = +2), but got ${actualBAB}`,
        "high"
      );
    } else {
      log(`✓ BAB correct: ${actualBAB}`);
    }

    // Calculate expected HP
    // Level 1 Jedi: 6 (max)
    // Levels 2-6 Jedi: 5 * 4 (average) = 20
    // Levels 7-8 Jedi Knight: 2 * 6 (average d10) = 12
    // CON bonus: 12 CON = +1, * 8 levels = +8
    // Total expected: 6 + 20 + 12 + 8 = 46
    const expectedHP = 46;
    const actualHP = actor.system.hp?.max || 0;

    if (actualHP !== expectedHP) {
      logIssue(
        "HP Calculation Error",
        `Expected HP ${expectedHP}, but got ${actualHP}`,
        "medium"
      );
    } else {
      log(`✓ HP correct: ${actualHP}`);
    }

    // Check class levels structure
    const classLevels = actor.system.progression.classLevels || [];
    const jediLevels = classLevels.filter(cl => cl.class === "Jedi");
    const jediKnightLevels = classLevels.filter(cl => cl.class === "Jedi Knight");

    log(`Class level breakdown: ${jediLevels.length} Jedi, ${jediKnightLevels.length} Jedi Knight`);

    if (jediLevels.length !== 6) {
      logIssue(
        "Jedi Level Count Error",
        `Expected 6 Jedi levels, but found ${jediLevels.length}`,
        "high"
      );
    }

    if (jediKnightLevels.length !== 2) {
      logIssue(
        "Jedi Knight Level Count Error",
        `Expected 2 Jedi Knight levels, but found ${jediKnightLevels.length}`,
        "high"
      );
    }

    // ===========================================
    // SUMMARY
    // ===========================================
    log("\n==========================================");
    log("TEST SUMMARY");
    log("==========================================");

    const errors = testLog.filter(entry => entry.error);
    const successes = testLog.filter(entry => entry.message.includes("✓"));

    log(`Total steps: ${testLog.length}`);
    log(`Successful operations: ${successes.length}`);
    log(`Errors encountered: ${errors.length}`);
    log(`Issues identified: ${issues.length}`);

    if (issues.length > 0) {
      log("\n--- ISSUES IDENTIFIED ---");
      issues.forEach((issue, idx) => {
        log(`${idx + 1}. [${issue.severity?.toUpperCase() || 'ERROR'}] ${issue.title || issue.step}`);
        log(`   ${issue.description || issue.error}`);
      });
    }

    if (errors.length > 0) {
      log("\n--- ERRORS ENCOUNTERED ---");
      errors.forEach((err, idx) => {
        log(`${idx + 1}. ${err.message}: ${err.error}`);
      });
    }

    if (errors.length === 0 && issues.length === 0) {
      log("\n✓ ALL TESTS PASSED - No errors or issues!");
    }

    // Save test results to actor flags
    await actor.setFlag('swse', 'progressionTest', {
      timestamp: new Date().toISOString(),
      testType: "twilek-jedi-to-level-8",
      log: testLog,
      issues: issues,
      summary: {
        totalSteps: testLog.length,
        successes: successes.length,
        errors: errors.length,
        issuesFound: issues.length
      }
    });

    log("\nTest log saved to actor flags: swse.progressionTest");
    log(`Actor ID: ${actor.id}`);
    log("\n==========================================");
    log("TEST COMPLETE");
    log("==========================================");

    return {
      success: errors.length === 0 && issues.filter(i => i.severity === 'high').length === 0,
      actor,
      log: testLog,
      issues: issues,
      summary: {
        totalSteps: testLog.length,
        successes: successes.length,
        errors: errors.length,
        issuesFound: issues.length
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
      log: testLog,
      issues: issues
    };
  }
})();
