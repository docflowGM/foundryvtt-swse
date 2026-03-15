// scripts/hooks/mentor-sheet-hooks.js
/**
 * Actor Sheet Integration for Mentor Dialog UI (ApplicationV2)
 *
 * Adds a "Mentor" header control to ActorSheetV2 instances for characters.
 * Opens the mentor chat dialog for advice and character development discussion.
 */
import { HooksRegistry } from "/systems/foundryvtt-swse/scripts/infrastructure/hooks/hooks-registry.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { MentorChatDialog } from "/systems/foundryvtt-swse/scripts/mentor/mentor-chat-dialog.js";

async function onClickMentor(app) {
  const actor = app?.actor ?? app?.document;
  if (!actor) {
    console.warn('[SWSE Mentor] No actor found in app:', app);
    return;
  }

  if (actor.type !== 'character') {
    ui?.notifications?.warn?.('Mentor dialog is for characters only.');
    return;
  }

  SWSELogger.log(`[Mentor Header] Opening Mentor Dialog for: ${actor.name}`);
  const mentorDialog = new MentorChatDialog(actor);
  mentorDialog.render(true);
}

export function registerMentorSheetHooks() {
  HooksRegistry.register('getHeaderControlsApplicationV2', (app, controls) => {
    const actor = app?.actor ?? app?.document;
    if (!actor || actor.documentName !== 'Actor') {return;}
    if (actor.type !== 'character') {return;}

    if (Array.isArray(controls) && controls.some(c => c?.action === 'swse-mentor')) {return;}

    controls.push({
      action: 'swse-mentor',
      icon: 'fa-solid fa-lightbulb',
      label: 'Mentor',
      ownership: CONST?.DOCUMENT_OWNERSHIP_LEVELS?.OWNER ?? 3,
      visible: () => true,
      onClick: () => onClickMentor(app)
    });
  }, { id: 'swse-mentor-sheet' });

  SWSELogger.log('Mentor header controls registered (V2)');
}

export default registerMentorSheetHooks;
