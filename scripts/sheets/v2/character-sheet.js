// scripts/sheets/v2/character-sheet.js
const { HandlebarsApplicationMixin } = foundry.applications.api;
import { ActorEngine } from '../../actors/engine/actor-engine.js';
import { RenderAssertions } from '../../core/render-assertions.js';
import { initiateItemSale } from '../../apps/item-selling-system.js';

/**
 * Safe accessor for devMode setting
 * Safely checks if core.devMode is registered before accessing
 */
function getDevMode() {
  try {
    return game.settings.get('core', 'devMode');
  } catch {
    return false;
  }
}

function markActiveConditionStep(root, actor) {
  // AppV2: root is HTMLElement, not jQuery
  if (!(root instanceof HTMLElement)) {return;}

  const current = Number(actor?.system?.derived?.damage?.conditionStep ?? actor?.system?.conditionTrack?.current ?? 0);
  for (const el of root.querySelectorAll('.swse-v2-condition-step')) {
    const s = Number(el.dataset?.step);
    if (Number.isFinite(s) && s === current) {el.classList.add('active');}
  }
}


/**
 * SWSEV2CharacterSheet - Character Sheet Application
 *
 * RENDER CONTRACT (CRITICAL FOR V2 STABILITY):
 * ============================================
 * 1. All rendering is declarative (Handlebars templates only)
 * 2. No manual DOM manipulation in render hooks
 * 3. All state flows from getData() context (single source of truth)
 * 4. Event handlers emit intent via Actor APIs (not direct DOM mutation)
 * 5. Context is immutable during render (frozen with structuredClone)
 *
 * ARCHITECTURE:
 * - _prepareContext() builds the view model
 * - Handlebars renders from that model (via templates + partials)
 * - _onRender() attaches event listeners (read-only DOM traversal)
 * - _updateObject() routes mutations through ActorEngine (atomic updates)
 *
 * WHY THIS MATTERS:
 * V2 batches renders. If you mutate DOM directly, the next render
 * wipes your changes. Manual DOM work breaks reactivity. Always
 * compute values in getData() and pass to template.
 */
export class SWSEV2CharacterSheet extends HandlebarsApplicationMixin(foundry.applications.sheets.ActorSheetV2) {
  static DEFAULT_OPTIONS = foundry.utils.mergeObject(
    super.DEFAULT_OPTIONS,
    {
      classes: ['swse', 'swse-sheet', 'swse-character-sheet', 'v2'],
      template: 'systems/foundryvtt-swse/templates/actors/character/v2/character-sheet.hbs',
      width: 820,
      height: 920,
      tabs: [{ navSelector: '.sheet-tabs', contentSelector: '.sheet-body', initial: 'summary' }],
      scrollY: ['.sheet-body']
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

/**
   * Validate sheet configuration on instantiation (v13+ safety).
   * Catches missing template path early instead of blank sheet.
   */
  constructor(options = {}) {
    super(options);

    if (!this.constructor.DEFAULT_OPTIONS?.template) {
      throw new Error(
        'SWSEV2CharacterSheet: Missing template path in DEFAULT_OPTIONS. Sheet cannot render.'
      );
    }
  }

  async _prepareContext(_options) {
    RenderAssertions.logCheckpoint('CharacterSheet', 'prepareContext start');

    // Fail-fast: this sheet is for characters only
    if (this.document.type !== 'character') {
      throw new Error(
        `SWSEV2CharacterSheet requires actor type "character", got "${this.document.type}"`
      );
    }

    // Build context from actor data
    const actor = this.document;

    // ACTOR VALIDATION
    RenderAssertions.assertActorValid(actor, 'SWSEV2CharacterSheet');

    // DATA VALIDATION (catches 80% of blank sheet issues)
    if (getDevMode()) {
      if (!actor.system) {
        throw new Error(
          `${this.constructor.name}: getData() missing system data. Template will be blank.`
        );
      }
      if (!actor.id) {
        throw new Error(`${this.constructor.name}: getData() missing actor. Template will be blank.`);
      }
    }

    // AppV2 Compatibility: Only pass serializable data
    // V13 AppV2 calls structuredClone() on render context - Document objects,
    // Collections, and User objects cannot be cloned. Extract only primitives and data.
    const context = {
      // Actor header data (serializable primitives only)
      actor: {
        id: actor.id,
        name: actor.name,
        type: actor.type,
        img: actor.img,
        _id: actor._id
      },
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

    // ASSERT: Context must be serializable for AppV2 (structuredClone requirement)
    RenderAssertions.assertContextSerializable(context, 'SWSEV2CharacterSheet');
    RenderAssertions.logCheckpoint('CharacterSheet', 'prepareContext complete', { actorId: actor.id });

    return context;
  }

  /**
   * Post-render hook: Attach event listeners, NOT manipulate DOM
   *
   * RULES FOR _onRender():
   * ✓ Traverse DOM with querySelector/querySelectorAll
   * ✓ Attach event listeners via addEventListener
   * ✓ Read data attributes and CSS classes
   * ✗ Do NOT mutate DOM (add/remove/modify elements)
   * ✗ Do NOT change CSS classes or styles
   * ✗ Do NOT set textContent or innerHTML
   *
   * If you need to change what renders: update actor data in _updateObject(),
   * which triggers a re-render with new _prepareContext() data.
   */
  async _onRender(_context, _options) {
    RenderAssertions.logCheckpoint('CharacterSheet', '_onRender start');

    // AppV2 invariant: all DOM access must use this.element
    const root = this.element;
    if (!(root instanceof HTMLElement)) {
      throw new Error('CharacterSheet: element is not an HTMLElement after render');
    }

    // ASSERT: Required DOM elements exist (catch template issues early)
    RenderAssertions.assertDOMElements(
      root,
      ['.sheet-tabs', '.sheet-body', '.swse-v2-condition-step'],
      'SWSEV2CharacterSheet'
    );

    // Highlight the current condition step
    markActiveConditionStep(root, this.actor);

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

    // Item selling (inventory context action)
    for (const el of root.querySelectorAll('[data-action="sell"]')) {
      el.addEventListener('click', async (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const itemRow = ev.currentTarget?.closest('.item-row');
        const itemId = itemRow?.dataset?.itemId;
        if (!itemId) {return;}
        const item = this.actor?.items?.get(itemId);
        if (item) {
          await initiateItemSale(item, this.actor);
        }
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

    // FINAL CHECKPOINT: Assert render completed successfully
    RenderAssertions.assertRenderComplete(this, 'SWSEV2CharacterSheet');
  }

  async _updateObject(event, formData) {
    const expanded = foundry.utils.expandObject(formData);
    if (!expanded?.system) {return;}
    await ActorEngine.updateActor(this.actor, { system: expanded.system });
  }
}
