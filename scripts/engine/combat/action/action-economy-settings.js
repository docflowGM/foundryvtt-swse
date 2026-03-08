/**
 * Action Economy Settings
 *
 * Registers game settings for combat action economy enforcement modes.
 * Called during system ready hook.
 */

export function registerActionEconomySettings() {
  game.settings.register('foundryvtt-swse', 'actionEconomyMode', {
    name: 'Action Economy Enforcement Mode',
    hint: 'How strictly should the system enforce action economy rules? STRICT blocks illegal actions, LOOSE warns GM only, NONE tracks without enforcement.',
    scope: 'world',
    config: true,
    type: String,
    choices: {
      strict: 'Strict (Block illegal actions, grey buttons)',
      loose: 'Loose (Allow with GM warning) - Recommended',
      none: 'None (Track only, no enforcement)'
    },
    default: 'loose',
    onChange: (value) => {
      console.log(`[SWSE] Action Economy mode set to: ${value}`);
    }
  });
}

export default registerActionEconomySettings;
