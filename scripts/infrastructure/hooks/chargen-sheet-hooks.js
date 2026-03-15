// scripts/hooks/chargen-sheet-hooks.js
/**
 * Actor Sheet Integration for Chargen UI (ApplicationV2)
 *
 * Adds a "Chargen" header control to ActorSheetV2 instances for characters.
 * Allows players/GMs to open the character generator for editing existing characters.
 */
import { HooksRegistry } from "/systems/foundryvtt-swse/scripts/infrastructure/hooks/hooks-registry.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import CharacterGenerator from "/systems/foundryvtt-swse/scripts/apps/chargen/chargen-main.js";

async function onClickChargen(app) {
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
  const chargen = new CharacterGenerator(actor);
  chargen.render(true);
}

export function registerChargenSheetHooks() {
  HooksRegistry.register('getHeaderControlsApplicationV2', (app, controls) => {
    const actor = app?.actor ?? app?.document;
    if (!actor || actor.documentName !== 'Actor') {return;}
    if (actor.type !== 'character') {return;}

    if (Array.isArray(controls) && controls.some(c => c?.action === 'swse-chargen')) {return;}

    controls.push({
      action: 'swse-chargen',
      icon: 'fa-solid fa-dice-d20',
      label: 'Chargen',
      ownership: CONST?.DOCUMENT_OWNERSHIP_LEVELS?.OWNER ?? 3,
      visible: () => true,
      onClick: () => onClickChargen(app)
    });
  }, { id: 'swse-chargen-sheet' });

  SWSELogger.log('Chargen header controls registered (V2)');
}

export default registerChargenSheetHooks;
