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

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { SkillRegistry } from "/systems/foundryvtt-swse/scripts/engine/progression/skills/skill-registry-ui.js";
import { FeatRegistry } from "/systems/foundryvtt-swse/scripts/engine/progression/feats/feat-registry-ui.js";
import { TalentRegistry } from "/systems/foundryvtt-swse/scripts/engine/progression/talents/talent-registry-ui.js";
import { ForceRegistry } from "/systems/foundryvtt-swse/scripts/engine/progression/force/force-registry-ui.js";
import { PrerequisiteChecker } from "/systems/foundryvtt-swse/scripts/data/prerequisite-checker.js";
import { enforcePrerequisiteConsolidation } from "/systems/foundryvtt-swse/scripts/data/prerequisite-checker-regression-guard.js";
import { SuggestionEngineCoordinator } from "/systems/foundryvtt-swse/scripts/engine/suggestion/SuggestionEngineCoordinator.js";

/**
 * Initialize the Enhanced Level-Up UI system
 */
export async function initializeLevelUpUI() {
  try {
    SWSELogger.log('=== Initializing Enhanced Level-Up UI ===');

    // Step 1: Build all registries
    SWSELogger.log('[LEVELUP-INIT] Step 1: Building registries...');
    try {
      SWSELogger.log('[LEVELUP-INIT] - Building SkillRegistry...');
      await SkillRegistry.build();
      SWSELogger.log('[LEVELUP-INIT] - SkillRegistry built successfully');
    } catch (err) {
      SWSELogger.error('[LEVELUP-INIT] ERROR building SkillRegistry:', err);
      throw err;
    }

    try {
      SWSELogger.log('[LEVELUP-INIT] - Building FeatRegistry...');
      await FeatRegistry.build();
      SWSELogger.log('[LEVELUP-INIT] - FeatRegistry built successfully');
    } catch (err) {
      SWSELogger.error('[LEVELUP-INIT] ERROR building FeatRegistry:', err);
      throw err;
    }

    try {
      SWSELogger.log('[LEVELUP-INIT] - Building TalentRegistry...');
      await TalentRegistry.build();
      SWSELogger.log('[LEVELUP-INIT] - TalentRegistry built successfully');
    } catch (err) {
      SWSELogger.error('[LEVELUP-INIT] ERROR building TalentRegistry:', err);
      throw err;
    }

    try {
      SWSELogger.log('[LEVELUP-INIT] - Building ForceRegistry...');
      await ForceRegistry.build();
      SWSELogger.log('[LEVELUP-INIT] - ForceRegistry built successfully');
    } catch (err) {
      SWSELogger.error('[LEVELUP-INIT] ERROR building ForceRegistry:', err);
      throw err;
    }

    // Step 2: Initialize suggestion engines
    SWSELogger.log('[LEVELUP-INIT] Step 2: Initializing suggestion engines...');
    SWSELogger.log('[LEVELUP-INIT] - Calling SuggestionEngineCoordinator.initialize()...');
    const suggestionsInitialized = await SuggestionEngineCoordinator.initialize();
    SWSELogger.log(`[LEVELUP-INIT] - SuggestionEngineCoordinator.initialize() returned: ${suggestionsInitialized}`);

    if (!suggestionsInitialized) {
      SWSELogger.warn('[LEVELUP-INIT] WARNING: Suggestion engines failed to initialize, but level-up UI will continue');
    } else {
      SWSELogger.log('[LEVELUP-INIT] - Suggestion engines initialized successfully');
      SWSELogger.log('[LEVELUP-INIT] - Verifying game.swse.suggestions API:');
      if (game.swse?.suggestions) {
        SWSELogger.log('[LEVELUP-INIT] - game.swse.suggestions API available:', {
          hasSuggestFeats: !!game.swse.suggestions.suggestFeats,
          hasSuggestTalents: !!game.swse.suggestions.suggestTalents,
          hasSuggestClasses: !!game.swse.suggestions.suggestClasses,
          hasAnalyzeBuildIntent: !!game.swse.suggestions.analyzeBuildIntent
        });
      } else {
        SWSELogger.warn('[LEVELUP-INIT] WARNING: game.swse.suggestions is not available after init!');
      }
    }

    // Step 3: Set up the global prerequisite API (if not already done)
    if (!game.swse?.prereq) {
      SWSELogger.log('[LEVELUP-INIT] Step 3: Setting up prerequisite API...');
      game.swse = game.swse || {};
      game.swse.prereq = {
        checkFeatPrereq: (featDoc, actor, pending) => {
          return PrerequisiteChecker.checkFeatPrerequisites(actor, featDoc, pending);
        },
        checkTalentPrereq: (talentDoc, actor, pending) => {
          return PrerequisiteChecker.checkTalentPrerequisites(actor, talentDoc, pending);
        }
      };
      SWSELogger.log('[LEVELUP-INIT] - Prerequisite API set up successfully');
    } else {
      SWSELogger.log('[LEVELUP-INIT] - Prerequisite API already exists, skipping setup');
    }

    // Emit hook for other systems
    SWSELogger.log('[LEVELUP-INIT] - Calling swse:levelup:initialized hook...');
    Hooks.call('swse:levelup:initialized');

    SWSELogger.log('=== Enhanced Level-Up UI initialized successfully ===');

    return true;

  } catch (err) {
    SWSELogger.error('[LEVELUP-INIT] ERROR - Failed to initialize Enhanced Level-Up UI:', err);
    ui.notifications.error('Failed to initialize level-up UI system');
    return false;
  }
}

SWSELogger.log('Level-Up UI module loaded');
