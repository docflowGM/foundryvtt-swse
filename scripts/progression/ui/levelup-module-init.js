/**
 * Enhanced Level-Up UI Module Initialization
 *
 * This module coordinates the loading and initialization of:
 * - ProgressionEngine (instance-based)
 * - Suggestion Engines (SuggestionEngine, ClassSuggestionEngine, BuildIntent)
 * - Registries (Skill, Feat, Talent, Force)
 * - Sheet integration hooks
 * - Prerequisite API
 */

import { SWSELogger } from "../../utils/logger.js";
import { SkillRegistry } from "../skills/skill-registry-ui.js";
import { FeatRegistry } from "../feats/feat-registry-ui.js";
import { TalentRegistry } from "../talents/talent-registry-ui.js";
import { ForceRegistry } from "../force/force-registry-ui.js";
import { registerLevelUpSheetHooks } from "../../hooks/levelup-sheet-hooks.js";
import { PrerequisiteValidator } from "../../utils/prerequisite-validator.js";
import { SuggestionEngineCoordinator } from "../../engine/SuggestionEngineCoordinator.js";

/**
 * Initialize the Enhanced Level-Up UI system
 */
export async function initializeLevelUpUI() {
  try {
    SWSELogger.log("=== Initializing Enhanced Level-Up UI ===");

    // Step 1: Register sheet integration hooks
    SWSELogger.log("Step 1: Registering sheet hooks...");
    registerLevelUpSheetHooks();

    // Step 2: Build all registries
    SWSELogger.log("Step 2: Building registries...");
    await SkillRegistry.build();
    await FeatRegistry.build();
    await TalentRegistry.build();
    await ForceRegistry.build();

    // Step 3: Initialize suggestion engines
    SWSELogger.log("Step 3: Initializing suggestion engines...");
    const suggestionsInitialized = await SuggestionEngineCoordinator.initialize();
    if (!suggestionsInitialized) {
      SWSELogger.warn("Suggestion engines failed to initialize, but level-up UI will continue");
    }

    // Step 4: Set up the global prerequisite API (if not already done)
    if (!game.swse?.prereq) {
      SWSELogger.log("Step 4: Setting up prerequisite API...");
      game.swse = game.swse || {};
      game.swse.prereq = {
        checkFeatPrereq: (featDoc, actor, pending) => {
          return PrerequisiteValidator.checkFeatPrerequisites(featDoc, actor, pending);
        },
        checkTalentPrereq: (talentDoc, actor, pending) => {
          return PrerequisiteValidator.checkTalentPrerequisites(talentDoc, actor, pending);
        }
      };
    }

    // Emit hook for other systems
    Hooks.call("swse:levelup:initialized");

    SWSELogger.log("=== Enhanced Level-Up UI initialized successfully ===");

    return true;

  } catch (err) {
    SWSELogger.error("Failed to initialize Enhanced Level-Up UI:", err);
    ui.notifications.error("Failed to initialize level-up UI system");
    return false;
  }
}

/**
 * Register the initialization hook
 */
Hooks.once("ready", async () => {
  await initializeLevelUpUI();
});

SWSELogger.log("Level-Up UI module initialization registered");
