// scripts/sheets/v2/vehicle-sheet.js
import { ActorEngine } from '../../actors/engine/actor-engine.js';

function markActiveConditionStep(root, actor) {
  // AppV2: root is HTMLElement, not jQuery
  if (!(root instanceof HTMLElement)) {return;}

  const current = Number(actor?.system?.conditionTrack?.current ?? 0);
  for (const el of root.querySelectorAll('.swse-v2-condition-step')) {
    const s = Number(el.dataset?.step);
    if (Number.isFinite(s) && s === current) {el.classList.add('active');}
  }
}


/**
 * SWSEV2VehicleSheet
 * v2 sheets are dumb views:
 * - Read actor.system.derived only
 * - Emit intent via Actor APIs (which route through ActorEngine)
 * - _updateObject routes through ActorEngine
 */
const { HandlebarsApplicationMixin } = foundry.applications.api;
export class SWSEV2VehicleSheet extends HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {
  static PARTS = {
    ...super.PARTS,
    body: {
      template: 'systems/foundryvtt-swse/templates/actors/vehicle/v2/vehicle-sheet.hbs'
    }
  };

  static DEFAULT_OPTIONS = foundry.utils.mergeObject(
    super.DEFAULT_OPTIONS,
    {
      classes: ['swse', 'swse-sheet', 'swse-vehicle-sheet', 'v2'],
      template: 'systems/foundryvtt-swse/templates/actors/vehicle/v2/vehicle-sheet.hbs',
      width: 820,
      height: 920,
      form: {
        closeOnSubmit: false,
        submitOnChange: false
      }
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

  constructor(document, options = {}) {
    super(options);
    this.document = document;
    this.actor = document;
  }

  async _prepareContext(options) {
    // Fail-fast: this sheet is for vehicles only
    if (this.document.type !== 'vehicle') {
      throw new Error(
        `SWSEV2VehicleSheet requires actor type "vehicle", got "${this.document.type}"`
      );
    }

    // Restore inherited context from super (includes cssClass, owner, limited, etc.)
    const context = await super._prepareContext(options);

    // AppV2 Compatibility: Extend inherited context with SWSE-specific fields
    // V13 AppV2 calls structuredClone() on render context - Document objects,
    // Collections, and User objects cannot be cloned. Extract only primitives and data.
    const actor = this.document;
    const overrides = {
      // Full actor object
      actor,
      system: actor.system,
      derived: actor.system?.derived ?? {},
      // Items: map to plain objects to avoid Collection serialization issues
      items: actor.items.map(item => ({
        id: item.id,
        name: item.name,
        type: item.type,
        img: item.img,
        system: item.system
      })),
      editable: this.isEditable,
      // User data (serializable primitives only)
      user: {
        id: game.user.id,
        name: game.user.name,
        role: game.user.role
      },
      config: CONFIG.SWSE
    };

    return { ...context, ...overrides };
  }

  async _onRender(context, options) {
    // AppV2 invariant: all DOM access must use this.element
    const root = this.element;
    if (!(root instanceof HTMLElement)) {return;}

    // Prevent duplicate event binding
    if (root.dataset.bound === "true") return;
    root.dataset.bound = "true";

    // Highlight the current condition step
    markActiveConditionStep(root, this.actor);

    // Prevent duplicate tab wiring
    if (root.dataset.tabsBound === "true") return;
    root.dataset.tabsBound = "true";

    // Activate default tab
    const defaultTab = root.querySelector('.tab[data-tab="summary"]');
    if (defaultTab) defaultTab.classList.add('active');

    // Tab click handling
    for (const tabBtn of root.querySelectorAll('.sheet-tabs .item')) {
      tabBtn.addEventListener('click', (ev) => {
        const tabName = ev.currentTarget.dataset.tab;
        if (!tabName) return;

        root.querySelectorAll('.sheet-tabs .item').forEach(b => b.classList.remove('active'));
        ev.currentTarget.classList.add('active');

        root.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        root.querySelector(`.tab[data-tab="${tabName}"]`)?.classList.add('active');
      });
    }

    // Condition step clicking
    for (const el of root.querySelectorAll('.swse-v2-condition-step')) {
      el.addEventListener('click', async (ev) => {
        ev.preventDefault();
        const step = Number(ev.currentTarget?.dataset?.step);
        if (!Number.isFinite(step)) {return;}
        if (typeof this.actor.setConditionTrackStep === 'function') {
          await this.actor.setConditionTrackStep(step);
        } else {
          await ActorEngine.updateActor(this.actor, { 'system.conditionTrack.current': step });
        }
      });
    }

    // Condition track improvements
    const improveBtn = root.querySelector('.swse-v2-condition-improve');
    if (improveBtn) {
      improveBtn.addEventListener('click', async (ev) => {
        ev.preventDefault();
        if (typeof this.actor.improveConditionTrack === 'function') {
          await this.actor.improveConditionTrack();
        }
      });
    }

    // Condition track worsening
    const worsenBtn = root.querySelector('.swse-v2-condition-worsen');
    if (worsenBtn) {
      worsenBtn.addEventListener('click', async (ev) => {
        ev.preventDefault();
        if (typeof this.actor.worsenConditionTrack === 'function') {
          await this.actor.worsenConditionTrack();
        }
      });
    }

    // Condition track persistence toggle
    const persistentCheckbox = root.querySelector('.swse-v2-condition-persistent');
    if (persistentCheckbox) {
      persistentCheckbox.addEventListener('change', async (ev) => {
        const flag = ev.currentTarget?.checked === true;
        if (typeof this.actor.setConditionTrackPersistent === 'function') {
          await this.actor.setConditionTrackPersistent(flag);
        }
      });
    }

    // Item sheet opening
    for (const el of root.querySelectorAll('.swse-v2-open-item')) {
      el.addEventListener('click', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const itemId = ev.currentTarget?.dataset?.itemId;
        if (!itemId) {return;}
        const item = this.actor?.items?.get(itemId);
        item?.sheet?.render(true);
      });
    }

    // Action execution
    for (const el of root.querySelectorAll('.swse-v2-use-action')) {
      el.addEventListener('click', async (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const actionId = ev.currentTarget?.dataset?.actionId;
        if (!actionId) {return;}
        if (typeof this.actor.useAction === 'function') {
          await this.actor.useAction(actionId);
        }
      });
    }
  }

  async _updateObject(event, formData) {
    const expanded = foundry.utils.expandObject(formData);
    if (!expanded?.system) {return;}
    await ActorEngine.updateActor(this.actor, { system: expanded.system });
  }
}
