/**
 * Suggestion system hooks
 *
 * - Cache invalidation on actor changes
 * - Character sheet Mentor Notes panel
 * - Proactive suggestion triggers for decision steps
 */
import { SuggestionService } from '../engine/SuggestionService.js';
import { SWSELogger } from '../utils/logger.js';
import { SuggestionEngineCoordinator } from '../engine/SuggestionEngineCoordinator.js';

function _safeGetActorId(doc) {
  return doc?.actor?.id || doc?.parent?.id || doc?.id || null;
}

export function registerSuggestionHooks() {
  Hooks.on('updateActor', (actor) => {
    SuggestionService.invalidate(actor.id);
  });

  Hooks.on('createItem', (item) => {
    const actorId = _safeGetActorId(item);
    if (actorId) SuggestionService.invalidate(actorId);
  });

  Hooks.on('updateItem', (item) => {
    const actorId = _safeGetActorId(item);
    if (actorId) SuggestionService.invalidate(actorId);
  });

  Hooks.on('deleteItem', (item) => {
    const actorId = _safeGetActorId(item);
    if (actorId) SuggestionService.invalidate(actorId);
  });

  Hooks.on('renderActorSheet', async (app, html) => {
    try {
      const enabled = game.settings.get('foundryvtt-swse', 'enableMentorNotesPanel') ?? true;
      if (!enabled) return;

      const actor = app?.actor;
      if (!actor) return;

      const container = html.find('.sheet-body, .tab[data-tab="main"], form');
      if (!container?.length) return;

      const panelId = `swse-mentor-notes-${actor.id}`;
      if (html.find(`#${panelId}`).length) return;

      const wrapper = $(`<section id="${panelId}" class="swse-mentor-notes">
        <header class="swse-mentor-notes__header">
          <h3>Mentor Notes</h3>
          <a class="swse-mentor-notes__toggle">toggle</a>
        </header>
        <div class="swse-mentor-notes__body" style="display:none;">
          <div class="swse-mentor-notes__loading">Loading suggestions…</div>
        </div>
      </section>`);

      container.prepend(wrapper);

      wrapper.find('.swse-mentor-notes__toggle').on('click', () => {
        const body = wrapper.find('.swse-mentor-notes__body');
        body.toggle();
      });

      const sugs = await SuggestionService.getSuggestions(actor, 'sheet', { persist: true });
      const top = (sugs ?? []).slice(0, 6);

      const body = wrapper.find('.swse-mentor-notes__body');
      body.empty();

      if (!top.length) {
        body.append(`<div class="swse-mentor-notes__empty">No suggestions right now.</div>`);
        return;
      }

      for (const s of top) {
        const name = s?.name || s?.label || s?.targetRef?.name || 'Suggestion';
        const why = s?.explanation?.short || s?.suggestion?.reason || '';
        const pack = s?.targetRef?.pack || '';
        const id = s?.targetRef?.id || '';
        body.append(`<div class="swse-mentor-notes__row" data-pack="${pack}" data-id="${id}">
          <div class="swse-mentor-notes__name">${name}</div>
          <div class="swse-mentor-notes__why">${why}</div>
        </div>`);
      }

      // Open suggested item on click when a compendium reference exists
      body.off('click.swseMentorNotes').on('click.swseMentorNotes', '.swse-mentor-notes__row', async (ev) => {
        try {
          const el = ev.currentTarget;
          const packName = el.dataset.pack;
          const docId = el.dataset.id;
          if (!packName || !docId) return;
          const pack = game.packs.get(packName);
          if (!pack) return;
          const doc = await pack.getDocument(docId);
          if (doc?.sheet) doc.sheet.render(true);
        } catch (err) {
          console.warn('SWSE | Mentor Notes open failed:', err);
        }
      });
    } catch (err) {
      SWSELogger.error('[SuggestionHooks] Mentor Notes failed:', err);
    }
  });

  // Hook for proactive suggestion triggers when entering decision steps
  // UI components can call: Hooks.callAll('swse:decision-step-entered', { actor, step, pendingData })
  Hooks.on('swse:decision-step-entered', async ({ actor, step, pendingData, callback }) => {
    try {
      if (!actor) return;

      // Determine domain based on step
      const stepToDomain = {
        'feats': 'feats',
        'talents': 'talents',
        'class': 'classes',
        'skills': 'skills_l1',
        'forcepowers': 'forcepowers',
        'attributes': 'attributes'
      };

      const domain = stepToDomain[step];
      if (!domain) return;

      SWSELogger.log(`[SuggestionHooks] Decision step entered: ${step}, fetching proactive suggestions`);

      // Get suggestions for this step
      const suggestions = await SuggestionService.getSuggestions(actor, 'decision-step', {
        domain,
        pendingData: pendingData || {}
      });

      // Find strong suggestions (tier 4+)
      const strongSuggestions = (suggestions || []).filter(s => {
        const tier = s?.suggestion?.tier ?? s?.tier ?? 0;
        return tier >= 4;
      });

      // If we have strong suggestions, notify the callback or emit an event
      if (strongSuggestions.length > 0) {
        SWSELogger.log(`[SuggestionHooks] Found ${strongSuggestions.length} strong suggestions for ${step}`);

        if (typeof callback === 'function') {
          callback(strongSuggestions);
        }

        // Also emit hook for UI to react
        Hooks.callAll('swse:strong-suggestions-available', {
          actor,
          step,
          suggestions: strongSuggestions
        });
      }
    } catch (err) {
      SWSELogger.error('[SuggestionHooks] Decision step handler failed:', err);
    }
  });

  // Hook for invalidating suggestions when pending data changes
  Hooks.on('swse:pending-selection-changed', ({ actorId }) => {
    if (actorId) {
      SuggestionService.invalidate(actorId);
      SuggestionEngineCoordinator.clearBuildIntentCache(actorId);
      SWSELogger.log(`[SuggestionHooks] Invalidated caches for actor ${actorId} due to pending selection change`);
    }
  });

  SWSELogger.log('[SuggestionHooks] Registered');
}
