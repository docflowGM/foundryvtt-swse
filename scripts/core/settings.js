import { SWSELogger } from '../utils/logger.js';

/**
 * System settings for SWSE
 */
export function registerSystemSettings() {
  SWSELogger.log("SWSE | Registering settings...");

  game.settings.register("swse", "autoDamageThreshold", {
    name: "SWSE.Settings.AutoDamageThreshold.Name",
    hint: "SWSE.Settings.AutoDamageThreshold.Hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register("swse", "autoConditionRecovery", {
    name: "SWSE.Settings.AutoConditionRecovery.Name",
    hint: "SWSE.Settings.AutoConditionRecovery.Hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register("swse", "resetResourcesOnCombat", {
    name: "SWSE.Settings.ResetResourcesOnCombat.Name",
    hint: "SWSE.Settings.ResetResourcesOnCombat.Hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });

  game.settings.register("swse", "welcomeShown", {
    name: "SWSE.Settings.WelcomeShown.Name",
    hint: "SWSE.Settings.WelcomeShown.Hint",
    scope: "world",
    config: false,
    type: Boolean,
    default: false
  });

  game.settings.register("swse", "devMode", {
    name: "SWSE.Settings.DevMode.Name",
    hint: "SWSE.Settings.DevMode.Hint",
    scope: "client",
    config: true,
    type: Boolean,
    default: false
  });

  game.settings.register("swse", "dailyForcePoints", {
    name: "SWSE.Settings.DailyForcePoints.Name",
    hint: "SWSE.Settings.DailyForcePoints.Hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });

  game.settings.register("swse", "darkSideTemptation", {
    name: "SWSE.Settings.DarkSideTemptation.Name",
    hint: "SWSE.Settings.DarkSideTemptation.Hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });

  // Theme Settings
  game.settings.register("swse", "sheetTheme", {
    name: 'Sheet Theme',
    hint: 'Select the visual theme for character sheets and UI elements',
    scope: "client",
    config: true,
    type: String,
    choices: {
      "holo": "Default (Holo)",
      "high-contrast": "High Contrast",
      "starship": "Starship",
      "sand-people": "Sand People",
      "jedi": "Jedi",
      "high-republic": "High Republic"
    },
    default: "holo",
    onChange: async (value) => {
      if (game.ready) {
        const { ThemeLoader } = await import('../theme-loader.js');
        ThemeLoader.applyTheme(value);
      }
    }
  });

  // Migration tracking setting (hidden from config UI)
  game.settings.register("swse", "actorValidationMigration", {
    name: "Actor Validation Migration Version",
    hint: "Tracks the version of the actor validation migration that has been run",
    scope: "world",
    config: false,
    type: String,
    default: ""
  });

  // Item validation migration tracking setting
  game.settings.register("swse", "itemValidationMigration", {
    name: "Item Validation Migration Version",
    hint: "Tracks the version of the item validation migration that has been run",
    scope: "world",
    config: false,
    type: String,
    default: ""
  });

  // Force compendiums population migration tracking
  game.settings.register("swse", "forceCompendiumsPopulation", {
    name: "Force Compendiums Population Version",
    hint: "Tracks the version of the force compendiums population migration that has been run",
    scope: "world",
    config: false,
    type: String,
    default: ""
  });

  // World data loader tracking
  game.settings.register("swse", "dataLoaded", {
    name: "World Data Loaded",
    hint: "Tracks whether world data has been loaded",
    scope: "world",
    config: false,
    type: Boolean,
    default: false
  });

  SWSELogger.log("SWSE | Settings registered");
}
