// scripts/hooks/levelup-sheet-hooks.js
/**
 * Actor Sheet Integration for Level-Up UI (ApplicationV2)
 *
 * Adds a "Level Up" header control to ActorSheetV2 instances.
 *
 * Characters -> SWSELevelUpEnhanced (system shim)
 * NPCs        -> SWSENpcLevelUpEntry
 */
import { HooksRegistry } from './hooks-registry.js';
import { SWSELogger } from '../utils/logger.js';
import { isEpicOverrideEnabled } from '../settings/epic-override.js';
import { SWSELevelUpEnhanced } from '../apps/swse-levelup-enhanced.js';
import { SWSENpcLevelUpEntry } from '../apps/levelup/npc-levelup-entry.js';

function isEpicBlocked(actor) {
  const level = Number(actor?.system?.level) || 0;
  return level >= 20 && !isEpicOverrideEnabled();
}

async function onClickLevelUp(app) {
  const actor = app?.actor ?? app?.document;
  if (!actor) {return;}

  if (actor.type === 'character') {
    if (isEpicBlocked(actor)) {
      ui?.notifications?.warn?.('Epic Override required to proceed beyond level 20 (System Settings → Epic Override).');
      return;
    }
    new SWSELevelUpEnhanced(actor).render(true);
    return;
  }

  if (actor.type === 'npc') {
    if (!game.user?.isGM) {return ui?.notifications?.warn?.('GM only.');}
    new SWSENpcLevelUpEntry(actor).render(true);
  }
}

export function registerLevelUpSheetHooks() {
  HooksRegistry.register('getHeaderControlsApplicationV2', 'swse-levelup', (app, controls) => {
    const actor = app?.actor ?? app?.document;
    if (!actor || actor.documentName !== 'Actor') {return;}
    if (actor.type !== 'character' && actor.type !== 'npc') {return;}

    if (Array.isArray(controls) && controls.some(c => c?.action === 'swse-levelup')) {return;}

    controls.push({
      action: 'swse-levelup',
      icon: 'fa-solid fa-level-up-alt',
      label: 'Level Up',
      ownership: CONST?.DOCUMENT_OWNERSHIP_LEVELS?.OWNER ?? 3,
      visible: () => (actor.type === 'npc' ? (game.user?.isGM ?? false) : true),
      onClick: () => onClickLevelUp(app)
    });
  });

  SWSELogger.log('Level-up header controls registered (V2)');
}

export default registerLevelUpSheetHooks;
