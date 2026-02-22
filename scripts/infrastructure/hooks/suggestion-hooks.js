// scripts/hooks/suggestion-hooks.js

import { HooksRegistry } from './hooks-registry.js';
import { SuggestionService } from '../engines/suggestion/SuggestionService.js';
import { SuggestionEngineCoordinator } from '../engines/suggestion/SuggestionEngineCoordinator.js';
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

  HooksRegistry.register('updateActor', (actor) => {
    SuggestionService.invalidate(actor.id);
  }, { id: 'swse-sugs-invalidate' });

  HooksRegistry.register('createItem', (item) => {
    const actorId = safeGetActorId(item);
    if (actorId) SuggestionService.invalidate(actorId);
  }, { id: 'swse-sugs-invalidate-create' });

  HooksRegistry.register('updateItem', (item) => {
    const actorId = safeGetActorId(item);
    if (actorId) SuggestionService.invalidate(actorId);
  }, { id: 'swse-sugs-invalidate-update' });

  HooksRegistry.register('deleteItem', (item) => {
    const actorId = safeGetActorId(item);
    if (actorId) SuggestionService.invalidate(actorId);
  }, { id: 'swse-sugs-invalidate-delete' });

  HooksRegistry.register('getHeaderControlsApplicationV2', (app, controls) => {
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
  }, { id: 'swse-mentor-notes' });

  HooksRegistry.register('swse:decision-step-entered', async ({ actor, step, pendingData, callback }) => {
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
  }, { id: 'swse-sugs-step' });

  HooksRegistry.register('swse:pending-selection-changed', ({ actorId }) => {
    if (!actorId) return;
    SuggestionService.invalidate(actorId);
    SuggestionEngineCoordinator.clearBuildIntentCache(actorId);
  }, { id: 'swse-sugs-pending' });

  SWSELogger.log('[SuggestionHooks] Registered (V2-safe)');
}

export default registerSuggestionHooks;