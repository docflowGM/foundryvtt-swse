/**
 * starship-maneuver-picker.js
 * Starship Maneuver picker UI using FormApplication + HBS template.
 */
import SWSEFormApplicationV2 from "/systems/foundryvtt-swse/scripts/apps/base/swse-form-application-v2.js";

export class StarshipManeuverPicker extends SWSEFormApplicationV2 {
  /**
   * Helper: open a picker and return the selected maneuvers.
   */
  static select(maneuvers, count, actor = null) {
    return new Promise(resolve => {
      const app = new StarshipManeuverPicker(maneuvers, { count, resolve, actor });
      app.render(true);
    });
  }

  constructor(maneuvers, opts = {}) {
    super({});

    this.maneuvers = maneuvers || [];
    this.limit = opts.count || 1;
    this.resolve = opts.resolve || (() => {});
    this.actor = opts.actor || null;
    this.selectedSet = new Set();
  }

  static DEFAULT_OPTIONS = foundry.utils.mergeObject(
    SWSEFormApplicationV2.DEFAULT_OPTIONS ?? {},
    {
      id: 'starship-maneuver-picker',
      classes: ['swse-app', 'starship-maneuver-picker'],
      template: 'systems/foundryvtt-swse/scripts/engine/progression/ui/templates/starship-maneuver-picker.hbs',
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
      maneuvers: this.maneuvers.map(m => {
        const id = m.id || m._id || m.name;
        return {
          id,
          name: m.name || id,
          img: m.img || (m.document?.img) || 'icons/svg/mystery-man.svg',
          description: m.system?.description || m.document?.system?.description || '',
          prerequisites: m.system?.prerequisites || m.document?.system?.prerequisites || [],
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

    root.querySelectorAll('.maneuver-card').forEach(card => {
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

    const mentorBtn = root.querySelector('.ask-mentor-starship-maneuver-suggestion');
    if (mentorBtn) {
      mentorBtn.addEventListener('click', () => this._askMentor());
    }

    const confirmBtn = root.querySelector('.confirm');
    if (confirmBtn) {
      confirmBtn.addEventListener('click', ev => {
        const result = [];
        const sel = new Set(this.selectedSet);

        for (const m of this.maneuvers) {
          const id = m.id || m._id || m.name;
          if (sel.has(id)) {result.push(m);}
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
      const { StarshipManeuverSuggestionEngine } = await import('../../../starship-maneuver-suggestion-engine.js');

      if (!this.actor) {return;}

      const suggestion = await StarshipManeuverSuggestionEngine.suggestManeuver(this.actor, this.maneuvers, this.selectedSet);
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
