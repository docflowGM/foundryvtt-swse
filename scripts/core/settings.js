/**
 * System settings for SWSE
 */
export function registerSystemSettings() {
  console.log("SWSE | Registering settings...");
  
  game.settings.register("swse", "autoDamageThreshold", {
    name: "Auto Damage Threshold",
    hint: "Automatically move condition track when damage exceeds threshold",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });
  
  game.settings.register("swse", "autoConditionRecovery", {
    name: "Auto Condition Recovery",
    hint: "Prompt for condition recovery at start of turn",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register("swse", "resetResourcesOnCombat", {
    name: "Reset Resources on Combat Start",
    hint: "Automatically reset temporary resources (like Second Wind) when combat begins",
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });

  game.settings.register("swse", "welcomeShown", {
    name: "Welcome Message Shown",
    hint: "Tracks if the welcome message has been displayed",
    scope: "world",
    config: false,
    type: Boolean,
    default: false
  });

  game.settings.register("swse", "devMode", {
    name: "Developer Mode",
    hint: "Enable detailed error logging and stack traces",
    scope: "client",
    config: true,
    type: Boolean,
    default: false
  });

  console.log("SWSE | Settings registered");
}
