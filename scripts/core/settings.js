/**
 * System Settings Registration
 */

export function registerSystemSettings() {
  
  // ===== AUTOMATION SETTINGS =====
  
  game.settings.register('swse', 'autoDamageThreshold', {
    name: 'Automatic Damage Threshold',
    hint: 'Automatically check damage threshold and move condition track',
    scope: 'world',
    config: true,
    type: Boolean,
    default: true
  });
  
  game.settings.register('swse', 'autoConditionRecovery', {
    name: 'Auto Condition Recovery Prompts',
    hint: 'Prompt for condition recovery at start of turn',
    scope: 'world',
    config: true,
    type: Boolean,
    default: true
  });
  
  game.settings.register('swse', 'autoSecondWindReset', {
    name: 'Auto-Reset Second Wind',
    hint: 'Reset Second Wind at start of encounter',
    scope: 'world',
    config: true,
    type: Boolean,
    default: true
  });
  
  // ===== DISPLAY SETTINGS =====
  
  game.settings.register('swse', 'showCalculationBreakdown', {
    name: 'Show Calculation Breakdown',
    hint: 'Display detailed breakdowns in tooltips',
    scope: 'client',
    config: true,
    type: Boolean,
    default: true
  });
  
  game.settings.register('swse', 'compactMode', {
    name: 'Compact Sheet Mode',
    hint: 'Use more compact layout',
    scope: 'client',
    config: true,
    type: Boolean,
    default: false
  });
  
  game.settings.register('swse', 'holoThemeIntensity', {
    name: 'Holo Theme Intensity',
    hint: 'Adjust holo effect intensity (0-100)',
    scope: 'client',
    config: true,
    type: Number,
    range: { min: 0, max: 100, step: 10 },
    default: 70
  });
  
  // ===== COMBAT SETTINGS =====
  
  game.settings.register('swse', 'autoRollInitiative', {
    name: 'Auto-Roll Initiative',
    hint: 'Automatically roll initiative when combat starts',
    scope: 'world',
    config: true,
    type: Boolean,
    default: false
  });
  
  // ===== FORCE SETTINGS =====
  
  game.settings.register('swse', 'forcePointBonus', {
    name: 'Force Point Reroll Bonus',
    hint: 'Number of d6 to add when spending Force Point',
    scope: 'world',
    config: true,
    type: Number,
    range: { min: 1, max: 4, step: 1 },
    default: 2
  });
  
  // ===== GM TOOLS =====
  
  game.settings.register('swse', 'enableHomebrewTools', {
    name: 'Enable Homebrew Tools',
    hint: 'Allow GMs to create custom content',
    scope: 'world',
    config: true,
    type: Boolean,
    default: true
  });
  
  // ===== INTERNAL SETTINGS =====
  
  game.settings.register('swse', 'systemVersion', {
    scope: 'world',
    config: false,
    type: String,
    default: '0.0.0'
  });
}
