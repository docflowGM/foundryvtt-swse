// scripts/hooks/store-sheet-hooks.js
/**
 * Actor Sheet Integration for Store UI (ApplicationV2)
 *
 * Adds a "Store" header control to ActorSheetV2 instances for characters.
 * Allows players/GMs to open the equipment store for purchasing items.
 */
import { HooksRegistry } from "/systems/foundryvtt-swse/scripts/infrastructure/hooks/hooks-registry.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { SWSEStore } from "/systems/foundryvtt-swse/scripts/apps/store/store-main.js";
import { ShellRouter } from "/systems/foundryvtt-swse/scripts/ui/shell/ShellRouter.js";

function onClickStore(app) {
  const actor = app?.actor ?? app?.document;

  if (actor && actor.type === 'character') {
    SWSELogger.log(`[Store Header] Opening Store for: ${actor.name}`);
    // Route through shell when available, fall back to standalone
    ShellRouter.openSurface(actor, 'store').catch(err => {
      SWSELogger.error('[Store Header] Error opening store:', err);
      ui?.notifications?.error?.(`Failed to open store: ${err.message}`);
    });
    return;
  }

  // Fallback to generic store if no character
  SWSELogger.log('[Store Header] Opening Store (generic)');
  SWSEStore.open().catch(err => {
    SWSELogger.error('[Store Header] Error opening generic store:', err);
    ui?.notifications?.error?.(`Failed to open store: ${err.message}`);
  });
}

export function registerStoreSheetHooks() {
  HooksRegistry.register('getHeaderControlsApplicationV2', (app, controls) => {
    const actor = app?.actor ?? app?.document;
    if (!actor || actor.documentName !== 'Actor') {return;}
    if (actor.type !== 'character') {return;}

    if (Array.isArray(controls) && controls.some(c => c?.action === 'swse-store')) {return;}

    controls.push({
      action: 'swse-store',
      icon: 'fa-solid fa-store',
      label: 'Store',
      ownership: CONST?.DOCUMENT_OWNERSHIP_LEVELS?.OWNER ?? 3,
      visible: () => true,
      handler: () => onClickStore(app)
    });
  }, { id: 'swse-store-sheet' });

  SWSELogger.log('Store header controls registered (V2)');
}

export default registerStoreSheetHooks;
