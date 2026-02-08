// scripts/apps/mentor-notes/mentor-notes-app.js
import SWSEApplicationV2 from '../base/swse-application-v2.js';
import { SuggestionService } from '../../engine/SuggestionService.js';
import { qs } from '../../utils/dom-utils.js';

export class MentorNotesApp extends SWSEApplicationV2 {
  static _instances = new Map();

  static DEFAULT_OPTIONS = foundry.utils.mergeObject(super.DEFAULT_OPTIONS, {
    id: 'swse-mentor-notes',
    classes: ['swse', 'mentor-notes-app'],
    template: 'systems/foundryvtt-swse/templates/apps/mentor-notes.hbs',
    position: { width: 420, height: 'auto' },
    window: { title: 'Mentor Notes', resizable: true, draggable: true, frame: true }
  });

  static openForActor(actor, options = {}) {
    if (!actor?.id) return null;
    const existing = this._instances.get(actor.id);
    if (existing) {
      existing.render({ force: true });
      return existing;
    }
    const app = new MentorNotesApp(actor, options);
    this._instances.set(actor.id, app);
    app.render({ force: true });
    return app;
  }

  constructor(actor, options = {}) {
    super(options);
    this.actor = actor;
  }

  async close(options = {}) {
    if (this.actor?.id) MentorNotesApp._instances.delete(this.actor.id);
    return super.close(options);
  }

  async _prepareContext() {
    const actor = this.actor;
    const suggestions = await SuggestionService.getSuggestions(actor, 'sheet', { persist: true });

    const top = (suggestions ?? [])
      .slice(0, 10)
      .map(s => ({
        name: s?.name || s?.label || s?.targetRef?.name || 'Suggestion',
        why: s?.explanation?.short || s?.suggestion?.reason || '',
        pack: s?.targetRef?.pack || '',
        id: s?.targetRef?.id || '',
        tier: s?.suggestion?.tier ?? s?.tier ?? 0,
        epicAdvisory: s?.epicAdvisory ?? false
      }));

    return {
      actorName: actor?.name ?? 'Actor',
      suggestions: top
    };
  }

  async _onRender(context, options) {
    await super._onRender(context, options);

    const root = this.element;
    qs(root, '.refresh-btn')?.addEventListener('click', () => this.render({ force: true }));

    qs(root, '.swse-mentor-notes-app__list')?.addEventListener('click', async (ev) => {
      const row = ev.target.closest?.('.swse-mentor-notes-app__row');
      if (!row) return;

      const packName = row.dataset.pack;
      const docId = row.dataset.id;
      if (!packName || !docId) return;

      try {
        const pack = game.packs.get(packName);
        const doc = await pack?.getDocument?.(docId);
        doc?.sheet?.render?.(true);
      } catch (err) {
        console.warn('SWSE | Mentor Notes open failed', err);
      }
    });
  }
}

export default MentorNotesApp;
