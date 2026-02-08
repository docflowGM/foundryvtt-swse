// scripts/hooks/suggestion-hooks.js
/**
 * Suggestion system hooks (AppV2-safe)
 *
 * - Cache invalidation on actor/item changes
 * - Mentor Notes access via ActorSheetV2 header control (no DOM injection)
 * - Proactive suggestion triggers for decision steps
 */
import { HooksRegistry } from './hooks-registry.js';
import { SuggestionService } from '../engine/SuggestionService.js';
import { SuggestionEngineCoordinator } from '../engine/SuggestionEngineCoordinator.js';
import { SWSELogger } from '../utils/logger.js';
import MentorNotesApp from '../apps/mentor-notes/mentor-notes-app.js';

function safeGetActorId(doc) {
  return doc?.actor?.id || doc?.parent?.id || doc?.id || null;
}

function isMentorNotesEnabled() {
  try {
    return game.settings.get('foundryvtt-swse', 'enableMentorNotesPanel') ?? true;
  } catch {
    return true;
  }
}

export function registerSuggestionHooks() {
  HooksRegistry.register('updateActor', 'swse-sugs-invalidate', (actor) => {
    SuggestionService.invalidate(actor.id);
  });

  HooksRegistry.register('createItem', 'swse-sugs-invalidate', (item) => {
    const actorId = safeGetActorId(item);
    if (actorId) SuggestionService.invalidate(actorId);
  });

  HooksRegistry.register('updateItem', 'swse-sugs-invalidate', (item) => {
    const actorId = safeGetActorId(item);
    if (actorId) SuggestionService.invalidate(actorId);
  });

  HooksRegistry.register('deleteItem', 'swse-sugs-invalidate', (item) => {
    const actorId = safeGetActorId(item);
    if (actorId) SuggestionService.invalidate(actorId);
  });

  // Mentor Notes header control (AppV2)
  HooksRegistry.register('getHeaderControlsApplicationV2', 'swse-mentor-notes', (app, controls) => {
    if (!isMentorNotesEnabled()) return;
    const actor = app?.actor ?? app?.document;
    if (!actor || actor.documentName !== 'Actor') return;

    if (Array.isArray(controls) && controls.some(c => c?.action === 'swse-mentor-notes')) return;

    controls.push({
      action: 'swse-mentor-notes',
      icon: 'fa-solid fa-lightbulb',
      label: 'Mentor Notes',
      ownership: CONST?.DOCUMENT_OWNERSHIP_LEVELS?.LIMITED ?? 1,
      visible: () => true,
      onClick: () => MentorNotesApp.openForActor(actor)
    });
  });

  HooksRegistry.register('swse:decision-step-entered', 'swse-sugs-step', async ({ actor, step, pendingData, callback }) => {
    try {
      if (!actor) return;

      const stepToDomain = {
        feats: 'feats',
        talents: 'talents',
        class: 'classes',
        skills: 'skills_l1',
        forcepowers: 'forcepowers',
        attributes: 'attributes'
      };

      const domain = stepToDomain[step];
      if (!domain) return;

      const suggestions = await SuggestionService.getSuggestions(actor, 'decision-step', {
        domain,
        pendingData: pendingData || {}
      });

      const strong = (suggestions || []).filter(s => (s?.suggestion?.tier ?? s?.tier ?? 0) >= 4);
      if (!strong.length) return;

      if (typeof callback === 'function') callback(strong);

      Hooks.callAll('swse:strong-suggestions-available', {
        actor,
        step,
        suggestions: strong
      });
    } catch (err) {
      SWSELogger.error('[SuggestionHooks] Decision step handler failed:', err);
    }
  });

  HooksRegistry.register('swse:pending-selection-changed', 'swse-sugs-pending', ({ actorId }) => {
    if (!actorId) return;
    SuggestionService.invalidate(actorId);
    SuggestionEngineCoordinator.clearBuildIntentCache(actorId);
  });

  SWSELogger.log('[SuggestionHooks] Registered (V2-safe)');
}

export default registerSuggestionHooks;
