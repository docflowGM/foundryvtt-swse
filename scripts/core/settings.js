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
  
  console.log("SWSE | Settings registered");
}
