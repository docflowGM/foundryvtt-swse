// scripts/sheets/v2/droid-sheet.js
const { HandlebarsApplicationMixin } = foundry.applications.api;
import { ActorEngine } from '../../actors/engine/actor-engine.js';
import { RenderAssertions } from '../../core/render-assertions.js';
import { initiateItemSale } from '../../apps/item-selling-system.js';
import { DroidBuilderApp } from '../../apps/droid-builder-app.js';

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
 * SWSEV2DroidSheet - Droid Sheet Application
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
export class SWSEV2DroidSheet extends HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {
  static PARTS = {
    ...super.PARTS,
    body: {
      template: 'systems/foundryvtt-swse/templates/actors/droid/v2/droid-sheet.hbs'
    }
  };

  static DEFAULT_OPTIONS = foundry.utils.mergeObject(
    super.DEFAULT_OPTIONS,
    {
      classes: ['swse', 'swse-sheet', 'swse-droid-sheet', 'v2'],
      template: 'systems/foundryvtt-swse/templates/actors/droid/v2/droid-sheet.hbs',
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

  /**
   * Validate sheet configuration on instantiation (v13+ safety).
   * Catches missing template path early instead of blank sheet.
   */
  constructor(document, options = {}) {
    super(options);
    this.document = document;
    this.actor = document;

    if (!this.constructor.DEFAULT_OPTIONS?.template) {
      throw new Error(
        'SWSEV2DroidSheet: Missing template path in DEFAULT_OPTIONS. Sheet cannot render.'
      );
    }
  }

  async _prepareContext(options) {
    RenderAssertions.logCheckpoint('DroidSheet', 'prepareContext start');

    // Fail-fast: this sheet is for droids only
    if (this.document.type !== 'droid') {
      throw new Error(
        `SWSEV2DroidSheet requires actor type "droid", got "${this.document.type}"`
      );
    }

    // Build context from actor data
    const actor = this.document;

    // ACTOR VALIDATION
    RenderAssertions.assertActorValid(actor, 'SWSEV2DroidSheet');

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

    // Restore inherited context from super (includes cssClass, owner, limited, etc.)
    const context = await super._prepareContext(options);

    // AppV2 Compatibility: Extend inherited context with SWSE-specific fields
    // V13 AppV2 calls structuredClone() on render context - Document objects,
    // Collections, and User objects cannot be cloned. Extract only primitives and data.
    const overrides = {
      // Full actor object (serializable after structuredClone)
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

    // ASSERT: Context must be serializable for AppV2 (structuredClone requirement)
    RenderAssertions.assertContextSerializable(overrides, 'SWSEV2DroidSheet');
    RenderAssertions.logCheckpoint('DroidSheet', 'prepareContext complete', { actorId: actor.id });

    return { ...context, ...overrides };
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
    RenderAssertions.logCheckpoint('DroidSheet', '_onRender start');

    // AppV2 invariant: all DOM access must use this.element
    const root = this.element;
    if (!(root instanceof HTMLElement)) {
      throw new Error('DroidSheet: element is not an HTMLElement after render');
    }

    // V2 PARTS TIMING: Only assert when full sheet DOM is assembled.
    // If sheet-body doesn't exist, we're in a partial render pass (e.g., header-only).
    // Skip assertion and let _onRender proceed; assertion will run on final PARTS assembly.
    if (!root.querySelector('.sheet-body')) {
      RenderAssertions.logCheckpoint('DroidSheet', '_onRender: skipping assertion (partial PARTS render)');
      return;
    }

    // Prevent duplicate event binding
    if (root.dataset.bound === "true") return;
    root.dataset.bound = "true";

    // ASSERT: Required DOM elements exist (catch template issues early)
    RenderAssertions.assertDOMElements(
      root,
      ['.sheet-tabs', '.sheet-body', '.swse-v2-condition-step'],
      'SWSEV2DroidSheet'
    );

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

    // Phase 3c: Edit droid systems (droid-specific handler)
    const editDroidBtn = root.querySelector('.edit-droid-systems');
    if (editDroidBtn) {
      editDroidBtn.addEventListener('click', async (ev) => {
        ev.preventDefault();
        ev.stopPropagation();

        // Builder mode reads primary droid configuration state (not derived).
        // This is intentional: builder determines NEW vs EDIT mode by checking if
        // configuration exists in system.droidSystems, which is the source of truth.
        const hasConfig = !!this.actor?.system?.droidSystems?.degree;
        const mode = hasConfig ? 'EDIT' : 'NEW';

        try {
          // Launch builder in appropriate mode
          await DroidBuilderApp.open(this.actor, {
            mode: mode,
            sourceActor: hasConfig ? this.actor : null,
            requireApproval: game.settings.get('foundryvtt-swse', 'store.requireGMApproval') ?? false
          });
        } catch (err) {
          console.error('Failed to open droid builder:', err);
          ui.notifications.error('Failed to open droid builder.');
        }
      });
    }

    // FINAL CHECKPOINT: Assert render completed successfully
    RenderAssertions.assertRenderComplete(this, 'SWSEV2DroidSheet');
  }

  async _updateObject(event, formData) {
    const expanded = foundry.utils.expandObject(formData);
    if (!expanded?.system) {return;}
    await ActorEngine.updateActor(this.actor, { system: expanded.system });
  }
}
