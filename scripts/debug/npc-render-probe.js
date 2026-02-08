// scripts/debug/npc-render-probe.js
import { HooksRegistry } from '../hooks/hooks-registry.js';
import { DEBUG_SETTINGS } from './debug-settings.js';
import { getLevelSplit } from '../actors/derived/level-split.js';
import { getEffectiveHalfLevel } from '../actors/derived/level-split.js';

function isEnabled() {
  try {
    return !!game.settings.get('foundryvtt-swse', DEBUG_SETTINGS.NPC_RENDER_PROBE);
  } catch {
    return false;
  }
}

export function registerNpcRenderProbeHooks() {
  HooksRegistry.register('renderApplicationV2', 'swse-npc-render-probe', (app) => {
    if (!isEnabled()) return;
    const actor = app?.actor ?? app?.document;
    if (!actor || actor.type !== 'npc') return;

    const mode = actor.getFlag('swse', 'npcLevelUp.mode') ?? 'statblock';
    const { heroicLevel, nonheroicLevel, totalLevel } = getLevelSplit(actor);
    const effectiveHalfLevel = getEffectiveHalfLevel(actor);

    // eslint-disable-next-line no-console
    console.info(`SWSE NPC Render Probe | ${actor.name} (${actor.id})`, {
      mode,
      heroicLevel,
      nonheroicLevel,
      totalLevel: Number(actor.system?.level) || totalLevel,
      effectiveHalfLevel
    });
  });
}
