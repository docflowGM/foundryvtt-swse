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

  game.settings.register("swse", "dailyForcePoints", {
    name: "Daily Force Points",
    hint: "Use daily Force Points instead of per-level (1-5th: 1 FP, 6-10th: 2 FP, 11-15th: 3 FP, 16+: 4 FP per day)",
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });

  game.settings.register("swse", "darkSideTemptation", {
    name: "Dark Side Temptation",
    hint: "Allow characters to call upon the Dark Side when spending Force Points (requires Dark Side Score ≤ half Wisdom)",
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });

  console.log("SWSE | Settings registered");
}
