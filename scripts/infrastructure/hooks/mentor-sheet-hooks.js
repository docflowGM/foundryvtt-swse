// scripts/hooks/mentor-sheet-hooks.js
/**
 * Actor Sheet Integration for Mentor Dialog UI (ApplicationV2)
 *
 * Adds a "Mentor" header control to ActorSheetV2 instances for characters.
 * Opens the mentor chat dialog for advice and character development discussion.
 *
 * Also manages mentor commitment decay on character levelup.
 */
import { HooksRegistry } from "/systems/foundryvtt-swse/scripts/infrastructure/hooks/hooks-registry.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { MentorChatDialog } from "/systems/foundryvtt-swse/scripts/mentor/mentor-chat-dialog.js";
import { decayAllMentorCommitments } from "/systems/foundryvtt-swse/scripts/engine/mentor/mentor-memory.js";

// Track actor levels for decay detection (prevents false triggers on unrelated updates)
const _actorLevelMap = new Map();

function onClickMentor(app) {
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
  try {
    const mentorDialog = new MentorChatDialog(actor);
    mentorDialog.render(true);
  } catch (err) {
    SWSELogger.error('[Mentor Header] Error opening mentor dialog:', err);
    ui?.notifications?.error?.(`Failed to open mentor dialog: ${err.message}`);
  }
}

/**
 * Handle mentor commitment decay on levelup
 * Called when an actor's system data changes
 */
async function onActorLevelup(actor) {
  if (!actor || actor.type !== 'character') {
    return;
  }

  const actorId = actor.id;
  const currentLevel = actor.system?.level || 1;
  const lastKnownLevel = _actorLevelMap.get(actorId) || currentLevel;

  // Only trigger decay if level actually increased
  if (currentLevel > lastKnownLevel) {
    SWSELogger.log(`[Mentor Decay] ${actor.name} leveled up from ${lastKnownLevel} to ${currentLevel}`);

    try {
      // Apply commitment decay (15% reduction per level)
      await decayAllMentorCommitments(actor, 0.15);
      SWSELogger.log(`[Mentor Decay] Applied decay to mentor commitments for ${actor.name}`);
    } catch (err) {
      SWSELogger.warn(`[Mentor Decay] Failed to apply commitment decay: ${err.message}`);
      // Don't break the levelup process if decay fails
    }
  }

  // Update tracked level
  _actorLevelMap.set(actorId, currentLevel);
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
      handler: () => onClickMentor(app)
    });
  }, { id: 'swse-mentor-sheet' });

  // Register levelup decay hook
  HooksRegistry.register('updateActor', (actor, changes, options, userId) => {
    // Only process if level changed
    if (changes?.system?.level !== undefined) {
      onActorLevelup(actor);
    }
  }, { id: 'swse-mentor-decay' });

  SWSELogger.log('Mentor header controls and levelup decay registered (V2)');
}

export default registerMentorSheetHooks;
