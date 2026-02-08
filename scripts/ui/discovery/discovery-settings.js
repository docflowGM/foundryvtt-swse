/**
 * Discovery Settings Registration
 *
 * Opt-out toggles for discovery features.
 */

const SYSTEM_ID = 'foundryvtt-swse';

export function registerDiscoverySettings() {
  game.settings.register(SYSTEM_ID, 'disableCallouts', {
    name: 'SWSE.Discovery.Settings.DisableCallouts.Name',
    hint: 'SWSE.Discovery.Settings.DisableCallouts.Hint',
    scope: 'client',
    config: true,
    type: Boolean,
    default: false
  });

  game.settings.register(SYSTEM_ID, 'disableTour', {
    name: 'SWSE.Discovery.Settings.DisableTour.Name',
    hint: 'SWSE.Discovery.Settings.DisableTour.Hint',
    scope: 'client',
    config: true,
    type: Boolean,
    default: false
  });

  game.settings.register(SYSTEM_ID, 'disableTooltips', {
    name: 'SWSE.Discovery.Settings.DisableTooltips.Name',
    hint: 'SWSE.Discovery.Settings.DisableTooltips.Hint',
    scope: 'client',
    config: true,
    type: Boolean,
    default: false
  });
}
