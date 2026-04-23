import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { registerMetaTuningSettings } from "/systems/foundryvtt-swse/scripts/engine/MetaTuning.js";
import { registerEpicOverrideSetting } from "/systems/foundryvtt-swse/scripts/settings/epic-override.js";
import { registerActionEconomySettings } from "/systems/foundryvtt-swse/scripts/engine/combat/action/action-economy-settings.js";

/**
 * System settings for SWSE
 */
export async function registerSystemSettings() {

game.settings.register('foundryvtt-swse', 'debugMode', {
  name: 'Debug Mode',
  hint: 'Enable verbose logging for SWSE system',
  scope: 'client',
  config: true,
  type: Boolean,
  default: false
});

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

  game.settings.register("foundryvtt-swse", "sithApprenticeMinimumDSP", {
    name: "Sith Apprentice Minimum DSP Requirement",
    hint: "Determines the Dark Side Score requirement to qualify for Sith Apprentice prestige class.",
    scope: "world",
    config: true,
    type: String,
    choices: {
      "minimum": "At least 1 DSP",
      "10percent": "10% of Wisdom",
      "25percent": "25% of Wisdom",
      "50percent": "50% of Wisdom",
      "75percent": "75% of Wisdom",
      "100percent": "100% of Wisdom (Default - DSP = Wisdom)"
    },
    default: "100percent"
  });

  game.settings.register("foundryvtt-swse", "sithLordMinimumDSP", {
    name: "Sith Lord Minimum DSP Requirement",
    hint: "Determines the Dark Side Score requirement to qualify for Sith Lord prestige class.",
    scope: "world",
    config: true,
    type: String,
    choices: {
      "100percent": "100% of Wisdom (Default - DSP = Wisdom, RAW)",
      "75percent": "75% of Wisdom",
      "50percent": "50% of Wisdom",
      "25percent": "25% of Wisdom",
      "10percent": "10% of Wisdom",
      "minimum": "At least 1 DSP"
    },
    default: "100percent"
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

  // Phase 3: AppV2 Strict Mode (dev-only enforcement)
  game.settings.register('foundryvtt-swse', 'sentinelAppv2Strict', {
    name: 'AppV2 Strict Enforcement Mode',
    hint: 'When enabled (dev mode only): Missing super._onRender() in SWSE-owned apps becomes ERROR immediately. Foundry core apps remain WARN. Helps catch regressions during sheet migration.',
    scope: 'client',
    config: true,
    type: Boolean,
    default: false
  });

  // Sheet Guardrails monitoring
  game.settings.register('foundryvtt-swse', 'sentinelSheetGuardrails', {
    name: 'Sheet Guardrails Monitoring',
    hint: 'Enable Sentinel sheet guardrails to monitor context hydration and listener accumulation.',
    scope: 'client',
    config: true,
    type: Boolean,
    default: true
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
        const { UIManager } = await import("/systems/foundryvtt-swse/scripts/ui/ui-manager.js");
        await UIManager.setTheme(value);
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

  // Pending Custom Purchases Queue (for GM approval)
  game.settings.register('foundryvtt-swse', 'pendingCustomPurchases', {
    name: 'Pending Custom Purchases',
    hint: 'Queue of custom droid/vehicle builds awaiting GM approval (internal use)',
    scope: 'world',
    config: false,  // Hidden from config UI, managed by Store GM Dashboard
    type: Object,
    default: []
  });

  // GM Store Dashboard Menu (Primary Entry Point - V2 Safe)
  // This is the cleanest entry point: no DOM mutation, no sidebar hacks, native Foundry pattern
  try {
    const { GMStoreDashboard } = await import('/systems/foundryvtt-swse/scripts/apps/gm-store-dashboard.js');
    game.settings.registerMenu('foundryvtt-swse', 'gmStoreDashboard', {
      name: 'Store Dashboard',
      label: 'Open Store Dashboard',
      hint: 'Manage store policies, approval queues, and inventory filters',
      icon: 'fas fa-store',
      type: GMStoreDashboard,
      restricted: true  // GM-only
    });
  } catch (err) {
    console.warn('[SWSE] Failed to register GM Store Dashboard menu:', err);
  }

  // Register MetaTuning settings for suggestion engine
  registerMetaTuningSettings();

  // Action Economy Enforcement Settings
  registerActionEconomySettings();

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

  // Multiclass Policy: Granular feature flags for enhanced multiclass behavior
  // All flags disabled = RAW (Standard Saga Rules)
  // Individual flags enable specific enhanced features

  game.settings.register('foundryvtt-swse', 'multiclassEnhancedEnabled', {
    name: 'Enable Enhanced Multiclass Mode',
    hint: 'Master toggle for enhanced multiclass features. When enabled, individual feature flags below control behavior.',
    scope: 'world',
    config: true,
    type: Boolean,
    default: false
  });

  game.settings.register('foundryvtt-swse', 'multiclassRetraining', {
    name: 'Allow Skill Retraining on Multiclass',
    hint: 'When enabled (and Enhanced Mode ON), players may retrain skills when multiclassing to a new base class.',
    scope: 'world',
    config: true,
    type: Boolean,
    default: false
  });

  game.settings.register('foundryvtt-swse', 'multiclassExtraStartingFeats', {
    name: 'Grant Full Starting Feats on Multiclass',
    hint: 'When enabled (and Enhanced Mode ON), grant the new class\'s full starting feat list instead of just 1.',
    scope: 'world',
    config: true,
    type: Boolean,
    default: false
  });

  game.settings.register('foundryvtt-swse', 'multiclassBonusSkillDelta', {
    name: 'Grant Bonus Skill Trainings (Delta Rule)',
    hint: 'When enabled (and Enhanced Mode ON), grant bonus skill trainings equal to the delta between new class and original base class.',
    scope: 'world',
    config: true,
    type: Boolean,
    default: false
  });

  // Combat Visual Effects Settings
  game.settings.register('foundryvtt-swse', 'enableCinematicEffects', {
    name: 'Enable Cinematic Combat Effects',
    hint: 'When enabled, displays projectiles, impact flashes, screen shake, and other visual effects during combat. Disable for performance or preference.',
    scope: 'world',
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register('foundryvtt-swse', 'enableCinematicShields', {
    name: 'Enable Cinematic Shield Visuals',
    hint: 'When enabled, displays energy shield aura around tokens with active shields.',
    scope: 'world',
    config: true,
    type: Boolean,
    default: true
  });

  // Store: Aurebesh font for loading overlay glyphs
  game.settings.register('foundryvtt-swse', 'useAurebesh', {
    name: 'Use Aurebesh Font in Store',
    hint: 'When enabled, the Store loading overlay and item glyphs display in Aurebesh (the Star Wars alphabet). Disable for standard Latin characters.',
    scope: 'client',
    config: true,
    type: Boolean,
    default: true
  });

  // Store: Skip loading overlay animation
  game.settings.register('foundryvtt-swse', 'storeSkipLoadingOverlay', {
    name: 'Skip Store Loading Overlay',
    hint: 'When enabled, the Store skips the animated loading overlay and opens immediately. Useful for slower machines or accessibility preferences.',
    scope: 'client',
    config: true,
    type: Boolean,
    default: false
  });

  // Lightsaber Construction Mode
  game.settings.register('foundryvtt-swse', 'lightsaberConstructionMode', {
    name: 'Lightsaber Construction Mode',
    hint: 'Controls how lightsaber construction validation is enforced: raw (no restrictions) or standard (with level gating).',
    scope: 'world',
    config: true,
    type: String,
    choices: {
      raw: 'Raw (No Restrictions)',
      standard: 'Standard (With Level Gating)'
    },
    default: 'raw'
  });

  // PHASE 1: Mutation Enforcement Level
  game.settings.register('foundryvtt-swse', 'dev-strict-enforcement', {
    name: 'Enable Strict Mutation Enforcement (Dev)',
    hint: 'When enabled, unauthorized mutations THROW immediately (dev/test environments). Disable to allow legacy code paths during migration.',
    scope: 'world',
    config: true,
    type: Boolean,
    default: false
  });
game.settings.register('foundryvtt-swse', 'themePromptShown', {
  name: 'Theme Prompt Shown',
  hint: 'Tracks whether the first-run theme selection prompt has already been shown to this user.',
  scope: 'client',
  config: false,
  type: Boolean,
  default: false
});
  SWSELogger.log('SWSE | Settings registered');
}
