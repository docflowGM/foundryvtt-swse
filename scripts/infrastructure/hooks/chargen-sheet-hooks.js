// scripts/hooks/chargen-sheet-hooks.js
/**
 * Actor Sheet Integration for Chargen UI (ApplicationV2)
 *
 * Adds a "Chargen" header control to ActorSheetV2 instances for characters.
 * Routes through unified progression entry point (launchProgression).
 */
import { HooksRegistry } from "/systems/foundryvtt-swse/scripts/infrastructure/hooks/hooks-registry.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { launchProgression } from "/systems/foundryvtt-swse/scripts/apps/progression-framework/progression-entry.js";

function onClickChargen(app) {
  const actor = app?.actor ?? app?.document;
  if (!actor) {
    console.warn('[SWSE Chargen] No actor found in app:', app);
    return;
  }

  if (actor.type !== 'character') {
    ui?.notifications?.warn?.('Chargen is for characters only.');
    return;
  }

  SWSELogger.log(`[Chargen Header] Opening Chargen for: ${actor.name}`);
  // Launch progression asynchronously without await
  // The handler should not block the UI
  launchProgression(actor).catch(err => {
    SWSELogger.error('[Chargen Header] Error launching progression:', err);
    ui?.notifications?.error?.(`Failed to open chargen: ${err.message}`);
  });
}

export function registerChargenSheetHooks() {
  HooksRegistry.register('getHeaderControlsApplicationV2', (app, controls) => {
    const actor = app?.actor ?? app?.document;
    if (!actor || actor.documentName !== 'Actor') {
      SWSELogger.debug('[Chargen Hook] Skipping - actor invalid or not a document');
      return;
    }
    if (actor.type !== 'character') {
      SWSELogger.debug(`[Chargen Hook] Skipping - only characters supported (requested: "${actor.type}")`);
      return;
    }

    if (Array.isArray(controls) && controls.some(c => c?.action === 'swse-chargen')) {
      SWSELogger.debug(`[Chargen Hook] Chargen button already registered for ${actor.name}`);
      return;
    }

    SWSELogger.log(`[Chargen Hook] Adding chargen button to character "${actor.name}"`);

    controls.push({
      action: 'swse-chargen',
      icon: 'fa-solid fa-dice-d20',
      label: 'Chargen',
      ownership: CONST?.DOCUMENT_OWNERSHIP_LEVELS?.OWNER ?? 3,
      visible: () => true,
      onClick: () => onClickChargen(app)
    });

    SWSELogger.debug(`[Chargen Hook] Chargen button pushed to controls for "${actor.name}"`);
  }, { id: 'swse-chargen-sheet' });

  SWSELogger.log('Chargen header controls registered (V2)');
}

export default registerChargenSheetHooks;
