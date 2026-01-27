/**
 * Suggestion system settings
 *
 * These are UI/diagnostic toggles only. No gameplay behavior changes.
 */
export function registerSuggestionSettings() {
  game.settings.register('foundryvtt-swse', 'enableSuggestionTrace', {
    name: 'Enable Suggestion Trace Logging',
    hint: 'Logs suggestion engine diagnostics to the console (dev only).',
    scope: 'client',
    config: true,
    type: Boolean,
    default: false
  });

  game.settings.register('foundryvtt-swse', 'enableMentorNotesPanel', {
    name: 'Enable Mentor Notes panel on character sheets',
    hint: 'Shows a collapsible Mentor Notes panel with top suggestions and brief explanations.',
    scope: 'client',
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register('foundryvtt-swse', 'showSuggestionDiffOnLevelUp', {
    name: 'Show suggestion changes on level-up',
    hint: 'Shows what recommendations changed since last time (dev / learning aid).',
    scope: 'client',
    config: true,
    type: Boolean,
    default: false
  });
}
