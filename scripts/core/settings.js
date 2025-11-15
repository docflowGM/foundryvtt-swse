/**
 * System settings for SWSE
 */
export function registerSystemSettings() {
  console.log("SWSE | Registering settings...");

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

  console.log("SWSE | Settings registered");
}
