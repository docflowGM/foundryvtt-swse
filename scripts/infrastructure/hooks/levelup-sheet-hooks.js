// scripts/hooks/levelup-sheet-hooks.js
/**
 * Actor Sheet Integration for Level-Up UI (ApplicationV2)
 *
 * Adds a "Level Up" header control to ActorSheetV2 instances.
 * Routes ALL progression through unified progression entry point (launchProgression).
 *
 * Single path:
 * - Characters (Incomplete) -> launchProgression -> ChargenShell
 * - Characters (Complete)   -> launchProgression -> ChargenShell
 * - NPCs                    -> Disabled (NPC progression not yet implemented)
 */
import { HooksRegistry } from "/systems/foundryvtt-swse/scripts/infrastructure/hooks/hooks-registry.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { isEpicOverrideEnabled } from "/systems/foundryvtt-swse/scripts/settings/epic-override.js";
import { launchProgression } from "/systems/foundryvtt-swse/scripts/apps/progression-framework/progression-entry.js";
import { ActorAbilityBridge } from "/systems/foundryvtt-swse/scripts/adapters/ActorAbilityBridge.js";
// NOTE: SWSENpcLevelUpEntry is defined but not used - NPC level-up is disabled (see line 95)

function isEpicBlocked(actor) {
  const level = Number(actor?.system?.level) || 0;
  return level >= 20 && !isEpicOverrideEnabled();
}

/**
 * Check whether a character is incomplete (missing required chargen data).
 * Returns a descriptive reason string if incomplete, or null if ready for level-up.
 *
 * This is the canonical routing check — it lives here at the entry point so that
 * level-up UI never silently swaps itself for chargen.
 */
function detectIncompleteCharacter(actor) {
  const system = actor.system;

  // Brand-new actor — no level assigned yet
  if ((system.level || 0) === 0) {
    return 'character has no level (brand new)';
  }

  // Missing or placeholder name
  if (!actor.name || actor.name.trim() === '' || actor.name === 'New Character') {
    return 'character has no name';
  }

  // No class item yet — chargen was not completed
  const hasClass = actor.items.some(item => item.type === 'class');
  if (!hasClass) {
    return 'character has no class';
  }

  return null; // Character is complete enough for level-up
}

function onClickLevelUp(app) {
  // TEMP AUDIT: Log handler entry
  console.log('[TEMP AUDIT] onClickLevelUp called', app?.constructor?.name);

  const actor = app?.actor ?? app?.document;
  if (!actor) {
    console.warn('[SWSE LevelUp] No actor found in app:', app);
    return;
  }

  SWSELogger.log(`[LevelUp Routing] Actor type: "${actor.type}", Name: "${actor.name}"`);

  if (actor.type === 'character') {
    // Check epic level blocking
    if (isEpicBlocked(actor)) {
      ui?.notifications?.warn?.('Epic Override required to proceed beyond level 20 (System Settings → Epic Override).');
      return;
    }

    // --- UNIFIED ENTRY: ALL character progression routes through launchProgression ---
    // Both incomplete and complete characters go through the same path
    // ChargenShell/LevelupShell internally routes based on completeness
    const incompleteReason = detectIncompleteCharacter(actor);
    if (incompleteReason) {
      SWSELogger.log(`[LevelUp Routing] Character is incomplete (${incompleteReason}) → unified progression entry`);
      ui?.notifications?.info?.(`Character setup is incomplete (${incompleteReason}). Opening Character Progression...`);
    } else {
      SWSELogger.log(`[LevelUp Routing] Character is complete → unified progression entry`);
    }

    // TEMP AUDIT: Log before calling launchProgression
    console.log('[TEMP AUDIT] Calling launchProgression from onClickLevelUp');

    // Launch progression asynchronously without await
    launchProgression(actor).catch(err => {
      console.log('[TEMP AUDIT] launchProgression rejected with error:', err);
      SWSELogger.error(`[LevelUp Routing] ERROR in progression:`, err);
      ui?.notifications?.error?.(`Failed to open progression: ${err.message}`);
    });
    return;
  }

  if (actor.type === 'npc') {
    SWSELogger.log(`[LevelUp Routing] NPC level-up is currently disabled`);
    ui?.notifications?.info?.('NPC level-up is currently disabled. Please use the character level-up system.');
    return;
  }

  SWSELogger.warn(`[LevelUp Routing] Unknown actor type: "${actor.type}" for ${actor.name}`);
}

export function registerLevelUpSheetHooks() {
  HooksRegistry.register('getHeaderControlsApplicationV2', (app, controls) => {
    // TEMP AUDIT: Log hook execution
    console.log('[TEMP AUDIT] getHeaderControlsApplicationV2 fired for levelup');
    console.log('[TEMP AUDIT] App class:', app?.constructor?.name);
    console.log('[TEMP AUDIT] Controls array before mutation:', controls?.length || 0);

    const actor = app?.actor ?? app?.document;
    if (!actor || actor.documentName !== 'Actor') {
      SWSELogger.log(`[LevelUp Hook] Skipping - actor invalid or not a document`);
      return;
    }
    // Currently only support character level-up (NPC level-up disabled)
    if (actor.type !== 'character') {
      SWSELogger.log(`[LevelUp Hook] Skipping - level-up only available for character type (requested: "${actor.type}")`);
      return;
    }

    if (Array.isArray(controls) && controls.some(c => c?.action === 'swse-levelup')) {
      SWSELogger.log(`[LevelUp Hook] Level-up button already registered for ${actor.name}`);
      return;
    }

    SWSELogger.log(`[LevelUp Hook] Adding level-up button to ${actor.type} "${actor.name}"`);

    controls.push({
      action: 'swse-levelup',
      icon: 'fa-solid fa-level-up-alt',
      label: 'Level Up',
      ownership: CONST?.DOCUMENT_OWNERSHIP_LEVELS?.OWNER ?? 3,
      // Show level-up button ONLY if character is complete (has finished chargen)
      visible: () => {
        const incomplete = detectIncompleteCharacter(actor);
        return !incomplete; // Show if character is NOT incomplete (i.e., is complete)
      },
      handler: () => {
        // TEMP AUDIT: Log handler execution
        console.log('[TEMP AUDIT] LevelUp handler fired for actor:', actor.name, actor.type);
        onClickLevelUp(app);
      }
    });

    // TEMP AUDIT: Log after mutation
    console.log('[TEMP AUDIT] Controls array after mutation:', controls?.length || 0);
    console.log('[TEMP AUDIT] LevelUp button pushed to controls for:', actor.name);
  }, { id: 'swse-levelup' });

  SWSELogger.log('Level-up header controls registered (V2)');
}

export default registerLevelUpSheetHooks;
