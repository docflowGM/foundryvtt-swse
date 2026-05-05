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
import { ActorAbilityBridge } from "/systems/foundryvtt-swse/scripts/adapters/ActorAbilityBridge.js";

function onClickChargen(app) {
  // TEMP AUDIT: Log handler entry
  console.log('[TEMP AUDIT] onClickChargen called', app?.constructor?.name);

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
  // TEMP AUDIT: Log before calling launchProgression
  console.log('[TEMP AUDIT] Calling launchProgression from onClickChargen');

  // Launch progression asynchronously without await
  // The handler should not block the UI
  launchProgression(actor).catch(err => {
    console.log('[TEMP AUDIT] launchProgression rejected with error:', err);
    SWSELogger.error('[Chargen Header] Error launching progression:', err);
    ui?.notifications?.error?.(`Failed to open chargen: ${err.message}`);
  });
}

/**
 * Check whether a character is incomplete (missing required chargen data).
 * Returns true if chargen needs to be completed.
 */
function isChargenIncomplete(actor) {
  const system = actor.system;

  // Brand-new actor — no level assigned yet
  if ((system.level || 0) === 0) {
    return true;
  }

  // Missing or placeholder name
  if (!actor.name || actor.name.trim() === '' || actor.name === 'New Character') {
    return true;
  }

  // No class item yet — chargen was not completed
  const hasClass = ActorAbilityBridge.getClasses(actor).length > 0;
  if (!hasClass) {
    return true;
  }

  return false; // Character has completed chargen
}

export function registerChargenSheetHooks() {
  HooksRegistry.register('getHeaderControlsApplicationV2', (app, controls) => {
    // TEMP AUDIT: Log hook execution
    console.log('[TEMP AUDIT] getHeaderControlsApplicationV2 fired for chargen');
    console.log('[TEMP AUDIT] App class:', app?.constructor?.name);
    console.log('[TEMP AUDIT] Controls array before mutation:', controls?.length || 0, controls);

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
      // Show chargen button ONLY if character is incomplete (hasn't finished chargen yet)
      visible: () => isChargenIncomplete(actor),
      handler: () => {
        // TEMP AUDIT: Log handler execution
        console.log('[TEMP AUDIT] Chargen handler fired for actor:', actor.name, actor.type);
        onClickChargen(app);
      }
    });

    // TEMP AUDIT: Log after mutation
    console.log('[TEMP AUDIT] Controls array after mutation:', controls?.length || 0, controls);
    console.log('[TEMP AUDIT] Chargen button pushed to controls for:', actor.name);
  }, { id: 'swse-chargen-sheet' });

  SWSELogger.log('Chargen header controls registered (V2)');
}

export default registerChargenSheetHooks;
