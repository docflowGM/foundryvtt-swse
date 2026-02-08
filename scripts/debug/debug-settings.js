// scripts/debug/debug-settings.js

export const DEBUG_SETTINGS = {
  NPC_RENDER_PROBE: 'enableNpcRenderProbe'
};

export function registerDebugSettings() {
  game.settings.register('foundryvtt-swse', DEBUG_SETTINGS.NPC_RENDER_PROBE, {
    name: 'NPC Render Probe',
    hint: 'When enabled, logs NPC render state (mode, heroic/nonheroic levels, effectiveHalfLevel) on every ActorSheetV2 render.',
    scope: 'client',
    config: true,
    type: Boolean,
    default: false
  });
}
