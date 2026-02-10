/**
 * Epic override (Level 21+) — policy setting
 *
 * Core supports 1–20.
 * Epic override is technical permissiveness only (no balance promises).
 */

export function registerEpicOverrideSetting() {
  game.settings.register('foundryvtt-swse', 'epicOverride', {
    name: 'Epic Override (Allow Level 21+)',
    hint: 'Allows the level-up UI to proceed beyond 20. Rules/balance are not guaranteed.',
    scope: 'world',
    config: true,
    type: Boolean,
    default: false
  });
}

export function isEpicOverrideEnabled() {
  return game.settings.get('foundryvtt-swse', 'epicOverride') === true;
}
