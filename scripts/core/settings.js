import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { registerMetaTuningSettings } from "/systems/foundryvtt-swse/scripts/engine/MetaTuning.js";
import { registerEpicOverrideSetting } from "/systems/foundryvtt-swse/scripts/settings/epic-override.js";

/**
 * System settings for SWSE
 */
export function registerSystemSettings() {

  game.settings.register("foundryvtt-swse", "darkSideMaxMultiplier", {
    name: "Dark Side Max Multiplier",
    hint: "Multiplier applied to Wisdom score to determine maximum Dark Side Score.",
    scope: "world",
    config: true,
    type: Number,
    default: 1,
    range: {
      min: 1,
      max: 5,
      step: 0.5
    }
  });

  SWSELogger.log('SWSE | Registering settings...');

  game.settings.register('foundryvtt-swse', 'enableAutomation', {
    name: 'SWSE.Settings.EnableAutomation.Name',
    hint: 'SWSE.Settings.EnableAutomation.Hint',
    scope: 'world',
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register('foundryvtt-swse', 'autoDamageThreshold', {
    name: 'SWSE.Settings.AutoDamageThreshold.Name',
    hint: 'SWSE.Settings.AutoDamageThreshold.Hint',
    scope: 'world',
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register('foundryvtt-swse', 'autoConditionRecovery', {
    name: 'SWSE.Settings.AutoConditionRecovery.Name',
    hint: 'SWSE.Settings.AutoConditionRecovery.Hint',
    scope: 'world',
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register('foundryvtt-swse', 'resetResourcesOnCombat', {
    name: 'SWSE.Settings.ResetResourcesOnCombat.Name',
    hint: 'SWSE.Settings.ResetResourcesOnCombat.Hint',
    scope: 'world',
    config: true,
    type: Boolean,
    default: false
  });

  game.settings.register('foundryvtt-swse', 'welcomeShown', {
    name: 'SWSE.Settings.WelcomeShown.Name',
    hint: 'SWSE.Settings.WelcomeShown.Hint',
    scope: 'world',
    config: false,
    type: Boolean,
    default: false
  });

  game.settings.register('foundryvtt-swse', 'devMode', {
    name: 'SWSE.Settings.DevMode.Name',
    hint: 'SWSE.Settings.DevMode.Hint',
    scope: 'client',
    config: true,
    type: Boolean,
    default: false
  });

  game.settings.register('foundryvtt-swse', 'safeMode', {
    name: 'SWSE.Settings.SafeMode.Name',
    hint: 'SWSE.Settings.SafeMode.Hint',
    scope: 'world',
    config: true,
    type: Boolean,
    default: false
  });

  // Sentinel Engine + Sentry + Investigator
  game.settings.register('foundryvtt-swse', 'sentinelMode', {
    name: 'System Integrity Mode',
    hint: 'Enable runtime diagnostics: OFF (disabled), DEV (verbose), STRICT (aggressive), PRODUCTION (errors only). Investigator disabled in PRODUCTION.',
    scope: 'client',
    config: true,
    type: String,
    choices: {
      'OFF': 'Disabled',
      'DEV': 'Development',
      'STRICT': 'Strict (Experimental)',
      'PRODUCTION': 'Production'
    },
    default: 'DEV'
  });

  game.settings.register('foundryvtt-swse', 'dailyForcePoints', {
    name: 'SWSE.Settings.DailyForcePoints.Name',
    hint: 'SWSE.Settings.DailyForcePoints.Hint',
    scope: 'world',
    config: true,
    type: Boolean,
    default: false
  });

  // Epic Override
  registerEpicOverrideSetting();

  // Theme Settings
  game.settings.register('foundryvtt-swse', 'sheetTheme', {
    name: 'Sheet Theme',
    hint: 'Select the visual theme for character sheets and UI elements',
    scope: 'client',
    config: true,
    type: String,
    choices: {
      'holo': 'Default (Holo)',
      'high-contrast': 'High Contrast',
      'starship': 'Starship',
      'sand-people': 'Sand People',
      'jedi': 'Jedi',
      'high-republic': 'High Republic'
    },
    default: 'holo',
    onChange: async (value) => {
      if (game.ready) {
        const { ThemeLoader } = await import('../theme-loader.js');
        ThemeLoader.applyTheme(value);
      }
    }
  });

  // Migration tracking setting (hidden from config UI)
  game.settings.register('foundryvtt-swse', 'actorValidationMigration', {
    name: 'Actor Validation Migration Version',
    hint: 'Tracks the version of the actor validation migration that has been run',
    scope: 'world',
    config: false,
    type: String,
    default: ''
  });

  // Item validation migration tracking setting
  game.settings.register('foundryvtt-swse', 'itemValidationMigration', {
    name: 'Item Validation Migration Version',
    hint: 'Tracks the version of the item validation migration that has been run',
    scope: 'world',
    config: false,
    type: String,
    default: ''
  });

  // Force compendiums population migration tracking
  game.settings.register('foundryvtt-swse', 'forceCompendiumsPopulation', {
    name: 'Force Compendiums Population Version',
    hint: 'Tracks the version of the force compendiums population migration that has been run',
    scope: 'world',
    config: false,
    type: String,
    default: ''
  });

  // Species traits update migration tracking
  game.settings.register('foundryvtt-swse', 'speciesTraitsUpdate', {
    name: 'Species Traits Update Version',
    hint: 'Tracks the version of the species traits update migration that has been run',
    scope: 'world',
    config: false,
    type: String,
    default: ''
  });

  // Item weight fix migration tracking
  game.settings.register('foundryvtt-swse', 'fixItemWeightMigration', {
    name: 'Fix Item Weight Migration Version',
    hint: 'Tracks the version of the item weight fix migration that has been run',
    scope: 'world',
    config: false,
    type: String,
    default: ''
  });

  // Talent effect validation migration tracking
  game.settings.register('foundryvtt-swse', 'talentEffectValidationMigration', {
    name: 'Talent Effect Validation Migration Version',
    hint: 'Tracks the version of the talent effect validation migration that has been run',
    scope: 'world',
    config: false,
    type: String,
    default: ''
  });

  // Talent SSOT Refactor migration tracking
  game.settings.register('foundryvtt-swse', 'talentSSOTRefactor', {
    name: 'Talent SSOT Refactor Migration Version',
    hint: 'Tracks the version of the talent SSOT refactor migration that has been run',
    scope: 'world',
    config: false,
    type: String,
    default: ''
  });

  // Class to Talent Tree ID migration tracking (Phase 3)
  game.settings.register('foundryvtt-swse', 'classToTalentTreeIdMigration', {
    name: 'Class to Talent Tree ID Migration Version',
    hint: 'Tracks the version of the class to talent tree ID migration (Phase 3) that has been run',
    scope: 'world',
    config: false,
    type: String,
    default: ''
  });

  // JSON-backed ID migration tracking (backgrounds/languages)
  game.settings.register('foundryvtt-swse', 'jsonBackedIdsMigration', {
    name: 'JSON-backed IDs Migration Version',
    hint: 'Tracks the version of the JSON-backed ID migration that has been run',
    scope: 'world',
    config: false,
    type: String,
    default: ''
  });

  // World data loader tracking
  game.settings.register('foundryvtt-swse', 'dataLoaded', {
    name: 'World Data Loaded',
    hint: 'Tracks whether world data has been loaded',
    scope: 'world',
    config: false,
    type: Boolean,
    default: false
  });
  // Skill Favorites (per-user storage of favorited skill actions)
  game.settings.register('foundryvtt-swse', 'skillFavorites', {
    name: 'Skill Favorites',
    hint: 'Stores user-marked favorite skill actions',
    scope: 'client',
    config: false,
    type: Object,
    default: {}
  });

  // Mentor Guidance Popups Setting
  game.settings.register('foundryvtt-swse', 'mentorGuidanceEnabled', {
    name: 'Enable Mentor Guidance Popups',
    hint: 'Display mentor guidance popups when choosing class, skills, feats, and talents. Disable to receive messages only in chat.',
    scope: 'client',
    config: true,
    type: Boolean,
    default: true
  });

  // Phase 3b: Store GM Approval Gate Setting
  game.settings.register('foundryvtt-swse', 'store.requireGMApproval', {
    name: 'SWSE.Settings.Store.RequireGMApproval.Name',
    hint: 'SWSE.Settings.Store.RequireGMApproval.Hint',
    scope: 'world',
    config: true,
    type: Boolean,
    default: false
  });

  // Register MetaTuning settings for suggestion engine
  registerMetaTuningSettings();

  // Phase 1: Chat narration setting
  game.settings.register('foundryvtt-swse', 'enableChatNarrationForRolls', {
    name: 'Enable Narrative Chat Supplements',
    hint: 'If enabled, rolls and actions also post short narrative lines to chat. Roll cards remain unchanged.',
    scope: 'world',
    config: true,
    type: Boolean,
    default: true,
  });

  // Phase 5: Starting credit mode setting
  game.settings.register('foundryvtt-swse', 'startingCreditMode', {
    name: 'Starting Credit Mode',
    hint: 'Determines how base class starting credits are determined during chargen: rolled, maximum, or player choice.',
    scope: 'world',
    config: true,
    type: String,
    choices: {
      roll: 'Roll',
      max: 'Take Maximum',
      playerChoice: 'Player Choice',
    },
    default: 'roll',
  });

  // Phase 3.4: Suite Reselection Houserule
  game.settings.register('foundryvtt-swse', 'allowSuiteReselection', {
    name: 'Allow Suite Reselection on Level Up',
    hint: 'When enabled, Force Powers and Starship Maneuvers may be fully reselected during level up. Suites are cleared and rebuilt with current derived capacity. GM-only setting.',
    scope: 'world',
    config: true,
    type: Boolean,
    default: false
  });

  SWSELogger.log('SWSE | Settings registered');
}
