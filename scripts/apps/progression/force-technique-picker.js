/**
 * force-technique-picker.js
 * Force Technique picker UI using FormApplication + HBS template.
 */
import SWSEFormApplicationV2 from '../../apps/base/swse-form-application-v2.js';

export class ForceTechniquePicker extends SWSEFormApplicationV2 {
  /**
   * Helper: open a picker and return the selected techniques.
   */
  static select(techniques, count, actor = null) {
    return new Promise(resolve => {
      const app = new ForceTechniquePicker(techniques, { count, resolve, actor });
      app.render(true);
    });
  }

  constructor(techniques, opts = {}) {
    super({});

    this.techniques = techniques || [];
    this.limit = opts.count || 1;
    this.resolve = opts.resolve || (() => {});
    this.actor = opts.actor || null;
    this.selectedSet = new Set();
  }

  static DEFAULT_OPTIONS = foundry.utils.mergeObject(
    SWSEFormApplicationV2.DEFAULT_OPTIONS ?? {},
    {
      id: 'force-technique-picker',
      classes: ['swse-app', 'force-technique-picker'],
      template: 'systems/foundryvtt-swse/scripts/progression/ui/templates/force-technique-picker.hbs',
      position: { width: 720, height: 620 },
      resizable: true
    }
  );


  /**
   * AppV2 contract: Foundry reads options from `defaultOptions`, not `DEFAULT_OPTIONS`.
   * This bridges legacy apps to the V2 accessor.
   * @returns {object}
   */
  static get defaultOptions() {
    const base = super.defaultOptions ?? super.DEFAULT_OPTIONS ?? {};
    const legacy = this.DEFAULT_OPTIONS ?? {};
    const clone = foundry.utils?.deepClone?.(base)
      ?? foundry.utils?.duplicate?.(base)
      ?? { ...base };
    return foundry.utils.mergeObject(clone, legacy);
  }
async _prepareContext(options) {
    return {
      techniques: this.techniques.map(t => {
        const id = t.id || t._id || t.name;
        return {
          id,
          name: t.name || id,
          img: t.img || (t.document?.img) || 'icons/svg/mystery-man.svg',
          description: t.system?.description || t.document?.system?.description || '',
          prerequisites: t.system?.prerequisites || t.document?.system?.prerequisites || [],
          selected: this.selectedSet.has(id)
        };
      }),
      limit: this.limit,
      current: this.selectedSet.size
    };
  }

  async _onRender(context, options) {
    const root = this.element;
    if (!(root instanceof HTMLElement)) {return;}

    root.querySelectorAll('.technique-card').forEach(card => {
      card.addEventListener('click', ev => {
        const id = ev.currentTarget.dataset.id;
        if (!id) {return;}

        if (this.selectedSet.has(id)) {
          this.selectedSet.delete(id);
        } else if (this.selectedSet.size < this.limit) {
          this.selectedSet.add(id);
        }

        this.render();
      });
    });

    const mentorBtn = root.querySelector('.ask-mentor-force-technique-suggestion');
    if (mentorBtn) {
      mentorBtn.addEventListener('click', () => this._askMentor());
    }

    const confirmBtn = root.querySelector('.confirm');
    if (confirmBtn) {
      confirmBtn.addEventListener('click', ev => {
        const result = [];
        const sel = new Set(this.selectedSet);

        for (const t of this.techniques) {
          const id = t.id || t._id || t.name;
          if (sel.has(id)) {result.push(t);}
        }

        this.resolve(result);
        this.close();
      });
    }

    const cancelBtn = root.querySelector('.cancel');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', ev => {
        this.resolve([]);
        this.close();
      });
    }
  }

  async _askMentor() {
    try {
      const { ForceTechniqueSuggestionEngine } = await import('../../progression/engine/force-technique-suggestion-engine.js');

      if (!this.actor) {return;}

      const suggestion = await ForceTechniqueSuggestionEngine.suggestTechnique(this.actor, this.techniques, this.selectedSet);
      if (suggestion && suggestion.id) {
        this.selectedSet.clear();
        this.selectedSet.add(suggestion.id);
        this.render();
      }
    } catch (e) {
      console.warn('Mentor suggestion failed:', e);
    }
  }
}
